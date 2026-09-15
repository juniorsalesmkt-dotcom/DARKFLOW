import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { db } from '../db.js';
import { ExportBatch, ProductionItem } from '../../src/types/index.js';
import { UPLOADS_DIR, ensureDirectory } from './storage.js';

export class ZipService {
  /**
   * Generates a zip file containing all completed video items for a given production
   */
  static async generateProductionZip(productionId: string): Promise<ExportBatch> {
    const prod = db.getProduction(productionId);
    if (!prod) {
      throw new Error('Produção não encontrada');
    }

    const items = db.getProductionItems(productionId).filter(i => i.status === 'completed');
    if (items.length === 0) {
      throw new Error('Nenhum vídeo concluído para exportar nesta produção');
    }

    const exportId = `export_${Date.now()}`;
    const exportBatch: ExportBatch = {
      id: exportId,
      productionId,
      productionTitle: prod.title,
      totalVideos: items.length,
      status: 'generating',
      createdAt: new Date().toISOString()
    };

    db.createExport(exportBatch);

    // Asynchronously create the zip
    this.createZipArchiveAsync(exportId, prod.title, items).catch(err => {
      console.error('Error generating zip:', err);
      db.updateExport(exportId, { status: 'failed' });
    });

    return exportBatch;
  }

  private static async createZipArchiveAsync(exportId: string, title: string, items: ProductionItem[]) {
    const zip = new JSZip();
    const exportsDir = path.join(UPLOADS_DIR, 'exports');
    ensureDirectory(exportsDir);

    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFilename = `${safeTitle}_${exportId}.zip`;
    const zipFilePath = path.join(exportsDir, zipFilename);

    let addedCount = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (item.outputPath && fs.existsSync(item.outputPath)) {
        const fileData = fs.readFileSync(item.outputPath);
        const fileNameInZip = `video_${String(idx + 1).padStart(3, '0')}_${item.videoName.replace(/[^a-zA-Z0-9._-]/g, '_')}.mp4`;
        zip.file(fileNameInZip, fileData);
        addedCount++;
      }
    }

    // If some files were virtual/missing, add a manifest.json
    const manifest = {
      productionTitle: title,
      exportedAt: new Date().toISOString(),
      totalVideos: addedCount,
      generator: 'DARKFLOW SaaS Video Production Engine'
    };
    zip.file('darkflow_manifest.json', JSON.stringify(manifest, null, 2));

    const content = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    fs.writeFileSync(zipFilePath, content);

    const sizeMb = (content.length / (1024 * 1024)).toFixed(1);

    db.updateExport(exportId, {
      status: 'ready',
      zipStoragePath: zipFilePath,
      downloadUrl: `/uploads/exports/${zipFilename}`,
      zipSizeFormatted: `${sizeMb} MB`
    });

    // Notify user
    const exp = db.getExports().find(e => e.id === exportId);
    if (exp) {
      db.addNotification({
        id: `notif_${Date.now()}`,
        userId: 'usr_darkflow_demo',
        title: 'ZIP de Exportação Pronto!',
        message: `O pacote com ${addedCount} vídeos de "${title}" está disponível para download.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
        link: exp.downloadUrl
      });
    }
  }
}
