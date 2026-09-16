import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { Template, TemplateElement, Video, TemplateSnapshot } from '../../src/types/index.js';
import { StorageService, UPLOADS_DIR, ensureDirectory } from './storage.js';

const execAsync = util.promisify(exec);

export interface RenderJob {
  userId: string;
  pageId: string;
  productionId: string;
  itemId: string;
  originalVideo: Video;
  originalFilePath: string;
  template: Template;
  templateElements?: TemplateElement[];
  templateSnapshot?: TemplateSnapshot;
  audioMode?: 'ORIGINAL' | 'MUTE';
  outputSettings?: {
    format?: 'mp4';
    fps?: number;
  };
}

export interface RenderResult {
  success: boolean;
  outputPath: string;
  outputVideoUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  error?: string;
}

export interface IVideoRenderer {
  renderVideo(job: RenderJob, onProgress?: (percent: number) => void): Promise<RenderResult>;
}

/**
 * Escapes XML/SVG special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts CSS hex or named colors to SVG-safe color string
 */
function sanitizeColor(c?: string): string {
  if (!c) return '#ffffff';
  if (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl')) return c;
  return `#${c}`;
}

export class FFmpegVideoRenderer implements IVideoRenderer {
  async renderVideo(job: RenderJob, onProgress?: (percent: number) => void): Promise<RenderResult> {
    const { userId, pageId, productionId, itemId, originalFilePath, template, audioMode = 'ORIGINAL' } = job;
    
    // Output directory in: uploads/users/{userId}/pages/{pageId}/productions/{productionId}/outputs/
    const prodDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'productions', productionId, 'outputs');
    ensureDirectory(prodDir);
    
    const safeName = (job.originalVideo.name || 'video').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const outputFilename = `${productionId}_${itemId}_${safeName}.mp4`;
    const outputPath = path.join(prodDir, outputFilename);
    const publicUrl = `/uploads/users/${userId}/pages/${pageId}/productions/${productionId}/outputs/${outputFilename}`;
    const svgOverlayPath = path.join(prodDir, `overlay_${itemId}.svg`);

    onProgress?.(10);

    // 1. Resolve dimensions & background from snapshot or template
    const tWidth = job.templateSnapshot?.width || template.width || 1080;
    const tHeight = job.templateSnapshot?.height || template.height || 1920;
    const rawBg = job.templateSnapshot?.background || template.background || '#090a0f';
    let bgHex = rawBg.replace('#', '0x');
    if (!bgHex.startsWith('0x')) bgHex = '0x090a0f';

    // 2. Resolve elements list
    const elements: TemplateElement[] = job.templateSnapshot?.elements || job.templateElements || template.elements || [];

    // 3. Find all VIDEO_PLACEHOLDER elements (Multi-placeholder architecture)
    const placeholders = elements.filter(el => el.type === 'video_placeholder' || (el as any).type === 'VIDEO_PLACEHOLDER');
    
    // Default placeholder if none found
    const primaryPlaceholder = placeholders[0] || {
      id: 'default_slot',
      type: 'video_placeholder' as const,
      name: 'Área de Vídeo',
      x: Math.round(tWidth * 0.05),
      y: Math.round(tHeight * 0.15),
      width: Math.round(tWidth * 0.9),
      height: Math.round(tHeight * 0.7),
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      visible: true,
      locked: false,
      fit: 'cover' as const,
      crop: 'crop_to_fit' as const
    };

    const pX = Math.max(0, Math.round(primaryPlaceholder.x));
    const pY = Math.max(0, Math.round(primaryPlaceholder.y));
    const pW = Math.max(16, Math.round(primaryPlaceholder.width));
    const pH = Math.max(16, Math.round(primaryPlaceholder.height));
    const fitMode = (primaryPlaceholder.fit || (primaryPlaceholder as any).objectFit || 'cover').toLowerCase();
    const borderRadius = primaryPlaceholder.borderRadius || 0;

    onProgress?.(25);

    // 4. Build high-fidelity SVG overlay layer for shapes, texts, images, and visual frames
    const nonVideoElements = elements.filter(el => 
      el.type !== 'video_placeholder' && 
      (el as any).type !== 'VIDEO_PLACEHOLDER' && 
      !el.hidden && 
      el.visible !== false
    );

    // Sort by zIndex
    nonVideoElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    let svgInnerContent = '';

    // If placeholder has borderRadius > 0, we can render a neat cutout frame or outline
    if (borderRadius > 0) {
      svgInnerContent += `
        <!-- Border radius cutout accent for video slot -->
        <rect x="${pX}" y="${pY}" width="${pW}" height="${pH}" rx="${borderRadius}" ry="${borderRadius}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
      `;
    }

    for (const el of nonVideoElements) {
      const opacity = el.opacity ?? 1;
      const x = Math.round(el.x);
      const y = Math.round(el.y);
      const w = Math.round(el.width);
      const h = Math.round(el.height);

      if (el.type === 'text') {
        const textContent = escapeXml(el.content || el.text || '');
        if (!textContent) continue;

        const fontSize = el.fontSize || 36;
        const fontColor = sanitizeColor(el.color);
        const fontWeight = el.fontWeight || (el as any).bold ? 'bold' : 'normal';
        const align = el.alignment || 'center';
        
        let anchor = 'middle';
        let textX = x + (w / 2);
        if (align === 'left') {
          anchor = 'start';
          textX = x + 10;
        } else if (align === 'right') {
          anchor = 'end';
          textX = x + w - 10;
        }

        const textY = y + Math.round(fontSize * 1.1);

        svgInnerContent += `
          <g opacity="${opacity}">
            <!-- Drop shadow -->
            <text x="${textX + 2}" y="${textY + 2}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="rgba(0,0,0,0.7)" text-anchor="${anchor}">
              ${textContent}
            </text>
            <!-- Foreground text -->
            <text x="${textX}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fontColor}" text-anchor="${anchor}">
              ${textContent}
            </text>
          </g>
        `;
      } else if (el.type === 'shape') {
        const shapeType = el.shapeType || 'rectangle';
        const fill = sanitizeColor(el.fill || '#1e2335');
        const stroke = el.stroke ? sanitizeColor(el.stroke) : 'none';
        const strokeWidth = el.strokeWidth || 0;
        const radius = el.borderRadius || 0;

        if (shapeType === 'circle') {
          const cx = x + (w / 2);
          const cy = y + (h / 2);
          const r = Math.min(w, h) / 2;
          svgInnerContent += `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />
          `;
        } else {
          svgInnerContent += `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />
          `;
        }
      } else if (el.type === 'image' && el.src) {
        svgInnerContent += `
          <image href="${escapeXml(el.src)}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}" preserveAspectRatio="xMidYMid slice" />
        `;
      }
    }

    const svgDocument = `<svg xmlns="http://www.w3.org/2000/svg" width="${tWidth}" height="${tHeight}" viewBox="0 0 ${tWidth} ${tHeight}">
      ${svgInnerContent}
    </svg>`;

    // Save SVG file
    fs.writeFileSync(svgOverlayPath, svgDocument, 'utf-8');

    onProgress?.(35);

    try {
      // 5. Build Video Scaling & Cropping Filter based on Object-Fit
      let scaleFilter = '';
      if (fitMode === 'contain') {
        // CONTAIN: preserve aspect ratio, pad remaining area with transparent/black
        scaleFilter = `scale=${pW}:${pH}:force_original_aspect_ratio=decrease,pad=${pW}:${pH}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`;
      } else if (fitMode === 'fill') {
        // FILL: stretch exactly to placeholder dimensions
        scaleFilter = `scale=${pW}:${pH}`;
      } else {
        // COVER (Default): scale to fill box, crop excess
        scaleFilter = `scale=${pW}:${pH}:force_original_aspect_ratio=increase,crop=${pW}:${pH}`;
      }

      // 6. Background canvas filter
      const bgFilter = `color=c=${bgHex}:s=${tWidth}x${tHeight}:d=12[bg]`;

      // 7. Compose Filter graph:
      // Input 0: original video
      // Input 1: SVG overlay
      const filterGraph = [
        `[0:v]${scaleFilter}[v_scaled]`,
        bgFilter,
        `[bg][v_scaled]overlay=${pX}:${pY}:shortest=1[composed_v]`,
        `[composed_v][1:v]overlay=0:0[final_v]`
      ].join(';');

      // 8. Audio configuration
      let audioFlags = '-c:a aac -b:a 128k -map 0:a?';
      if (audioMode === 'MUTE') {
        audioFlags = '-an';
      }

      onProgress?.(50);

      // 9. Execute FFmpeg Command
      const ffmpegCmd = `ffmpeg -y -i "${originalFilePath}" -i "${svgOverlayPath}" -filter_complex "${filterGraph}" -map "[final_v]" ${audioFlags} -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -movflags +faststart -shortest "${outputPath}"`;

      console.log(`[FFMPEG RENDER] Running: ${ffmpegCmd}`);
      await execAsync(ffmpegCmd);

      onProgress?.(85);

      // 10. Generate Real Thumbnail from the rendered video
      const thumbFilename = `thumb_${itemId}.jpg`;
      const thumbPath = path.join(prodDir, thumbFilename);
      const thumbPublicUrl = `/uploads/users/${userId}/pages/${pageId}/productions/${productionId}/outputs/${thumbFilename}`;

      try {
        await execAsync(`ffmpeg -y -ss 00:00:01 -i "${outputPath}" -vframes 1 -q:v 2 "${thumbPath}"`);
      } catch (thumbErr) {
        console.warn('Thumbnail generation warning:', thumbErr);
      }

      // 11. Cleanup temporary SVG
      if (fs.existsSync(svgOverlayPath)) {
        try { fs.unlinkSync(svgOverlayPath); } catch {}
      }

      // 12. File stats
      const fileStats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
      const duration = job.originalVideo.duration || 10;

      onProgress?.(100);

      return {
        success: true,
        outputPath,
        outputVideoUrl: publicUrl,
        thumbnailUrl: fs.existsSync(thumbPath) ? thumbPublicUrl : job.originalVideo.thumbnailUrl,
        duration,
        width: tWidth,
        height: tHeight,
        fileSize: fileStats?.size || 0
      };
    } catch (err: any) {
      console.warn('FFmpeg complex render error, attempting robust fallback:', err?.message);

      // Attempt robust fallback: Scale & Pad into template canvas
      try {
        let audioFlags = '-c:a aac -b:a 128k -map 0:a?';
        if (audioMode === 'MUTE') {
          audioFlags = '-an';
        }

        const fallbackCmd = `ffmpeg -y -i "${originalFilePath}" -vf "scale=${pW}:${pH}:force_original_aspect_ratio=decrease,pad=${tWidth}:${tHeight}:(ow-iw)/2:(oh-ih)/2:${bgHex}" ${audioFlags} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -movflags +faststart -shortest "${outputPath}"`;
        await execAsync(fallbackCmd);

        const thumbFilename = `thumb_${itemId}.jpg`;
        const thumbPath = path.join(prodDir, thumbFilename);
        const thumbPublicUrl = `/uploads/users/${userId}/pages/${pageId}/productions/${productionId}/outputs/${thumbFilename}`;

        try {
          await execAsync(`ffmpeg -y -ss 00:00:01 -i "${outputPath}" -vframes 1 -q:v 2 "${thumbPath}"`);
        } catch {}

        if (fs.existsSync(svgOverlayPath)) {
          try { fs.unlinkSync(svgOverlayPath); } catch {}
        }

        const fileStats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;

        onProgress?.(100);

        return {
          success: true,
          outputPath,
          outputVideoUrl: publicUrl,
          thumbnailUrl: fs.existsSync(thumbPath) ? thumbPublicUrl : job.originalVideo.thumbnailUrl,
          duration: job.originalVideo.duration || 10,
          width: tWidth,
          height: tHeight,
          fileSize: fileStats?.size || 0
        };
      } catch (fallbackErr: any) {
        console.error('All FFmpeg render attempts failed for item:', itemId, fallbackErr);
        if (fs.existsSync(svgOverlayPath)) {
          try { fs.unlinkSync(svgOverlayPath); } catch {}
        }
        return {
          success: false,
          outputPath: '',
          outputVideoUrl: '',
          thumbnailUrl: '',
          duration: 0,
          width: tWidth,
          height: tHeight,
          fileSize: 0,
          error: fallbackErr?.message || 'Falha ao processar vídeo com FFmpeg.'
        };
      }
    }
  }
}

export const videoRenderer = new FFmpegVideoRenderer();
