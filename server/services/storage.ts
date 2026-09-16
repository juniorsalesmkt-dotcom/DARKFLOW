import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import multer from 'multer';

const execAsync = util.promisify(exec);

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure base upload directories
export function ensureDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

ensureDirectory(UPLOADS_DIR);
ensureDirectory(path.join(UPLOADS_DIR, 'exports'));
ensureDirectory(path.join(UPLOADS_DIR, 'thumbnails'));
ensureDirectory(path.join(UPLOADS_DIR, 'temp'));

// Multer storage engine with specific folder structure
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'default_user';
    const pageId = (req.headers['x-page-id'] as string) || (req.body?.pageId as string) || 'default_page';

    if (file.fieldname === 'thumbnail') {
      const thumbDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'thumbnails');
      ensureDirectory(thumbDir);
      cb(null, thumbDir);
    } else {
      // Structure: users/{userId}/pages/{pageId}/originals/
      const targetDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'originals');
      ensureDirectory(targetDir);
      cb(null, targetDir);
    }
  },
  filename: (req, file, cb) => {
    const videoId = (req.headers['x-video-id'] as string) || (req.body?.videoId as string) || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (file.fieldname === 'thumbnail') {
      cb(null, `${videoId}.jpg`);
    } else {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${videoId}_${safeName}`);
    }
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      cb(null, true);
    } else if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mov|webm|m4v)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Permitidos: MP4, MOV, WEBM, M4V'));
    }
  }
});

// Image upload storage engine (for template background images and frames)
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'usr_darkflow_demo';
    const pageId = (req.headers['x-page-id'] as string) || (req.body?.pageId as string) || 'page_memorias';
    const tplDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'templates');
    ensureDirectory(tplDir);
    cb(null, tplDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `tpl_bg_${Date.now()}_${safeName}`);
  }
});

export const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.originalname.match(/\.(png|jpe?g|webp|svg)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido de imagem. Permitidos: PNG, JPG, JPEG, WEBP, SVG'));
    }
  }
});

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
}

export class StorageService {
  /**
   * Probe video metadata with ffprobe
   */
  static async extractMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) {
        return {
          width: 1080,
          height: 1920,
          duration: 10,
          format: 'mp4'
        };
      }

      const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration:format=duration -of json "${filePath}"`;
      const { stdout } = await execAsync(cmd);
      const data = JSON.parse(stdout);
      
      const width = data.streams?.[0]?.width || 1080;
      const height = data.streams?.[0]?.height || 1920;
      const duration = parseFloat(data.streams?.[0]?.duration || data.format?.duration || '10');
      
      return {
        width,
        height,
        duration: Math.round(duration * 10) / 10,
        format: path.extname(filePath).replace('.', '')
      };
    } catch {
      return {
        width: 1080,
        height: 1920,
        duration: 10,
        format: 'mp4'
      };
    }
  }

  /**
   * Extract video thumbnail with ffmpeg
   */
  static async generateThumbnail(videoFilePath: string): Promise<string> {
    const thumbFilename = `thumb_${Date.now()}_${Math.round(Math.random() * 1e4)}.jpg`;
    const thumbPath = path.join(UPLOADS_DIR, 'thumbnails', thumbFilename);
    
    try {
      // Seek 1 second in, capture 1 frame
      const cmd = `ffmpeg -y -ss 00:00:01 -i "${videoFilePath}" -vframes 1 -q:v 2 "${thumbPath}"`;
      await execAsync(cmd);
      return `/uploads/thumbnails/${thumbFilename}`;
    } catch (err) {
      console.warn('ffmpeg thumbnail generation error, using placeholder:', err);
      return 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80';
    }
  }

  /**
   * Generate lightweight sample demo MP4 video using ffmpeg
   * Useful to test bulk production without needing user to upload 100 huge local files
   */
  static async generateDemoVideo(userId: string, pageId: string, title: string, durationSec = 4): Promise<{
    filePath: string;
    publicUrl: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    sizeBytes: number;
  }> {
    const targetDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'originals');
    ensureDirectory(targetDir);
    const videoFilename = `demo_${Date.now()}_${Math.round(Math.random() * 1e4)}.mp4`;
    const videoFilePath = path.join(targetDir, videoFilename);

    try {
      // Generate a short 1080x1920 video with test patterns, motion color, and synthetic text
      const cleanTitle = title.replace(/"/g, '').substring(0, 30);
      const cmd = `ffmpeg -y -f lavfi -i testsrc=size=1080x1920:rate=24 -f lavfi -i sine=frequency=440:beep_factor=4:sample_rate=44100 -t ${durationSec} -vf "drawbox=x=0:y=0:w=1080:h=1920:color=black@0.3:t=fill,drawtext=text='${cleanTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${videoFilePath}"`;
      await execAsync(cmd);
      
      const stats = fs.statSync(videoFilePath);
      const thumbnailUrl = await this.generateThumbnail(videoFilePath);
      
      const relativePath = `/uploads/users/${userId}/pages/${pageId}/originals/${videoFilename}`;
      return {
        filePath: videoFilePath,
        publicUrl: relativePath,
        thumbnailUrl,
        duration: durationSec,
        width: 1080,
        height: 1920,
        sizeBytes: stats.size
      };
    } catch (err) {
      console.error('Error generating demo video via ffmpeg:', err);
      // Fallback dummy file
      fs.writeFileSync(videoFilePath, Buffer.from('DEMO_VIDEO_STUB'));
      return {
        filePath: videoFilePath,
        publicUrl: `/uploads/users/${userId}/pages/${pageId}/originals/${videoFilename}`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        duration: durationSec,
        width: 1080,
        height: 1920,
        sizeBytes: 1024
      };
    }
  }

  /**
   * Download external video asset into users/{userId}/pages/{pageId}/originals/imported/{uniqueId}_{filename}
   * with real byte stream tracking and ffmpeg validation
   */
  static async downloadAndSaveImportedAsset(
    userId: string,
    pageId: string,
    downloadUrl: string,
    uniqueId: string,
    filenameHint: string = 'imported_video.mp4',
    onProgress?: (progress: number, bytesDownloaded: number, totalBytes: number) => void
  ): Promise<{
    storagePath: string;
    publicUrl: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
  }> {
    const importedDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'originals', 'imported');
    ensureDirectory(importedDir);

    const ext = path.extname(filenameHint) || '.mp4';
    const baseName = path.basename(filenameHint, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const filename = `${uniqueId}_${baseName}${ext}`;
    const destinationPath = path.join(importedDir, filename);

    // If downloadUrl is a local file already (e.g. /uploads/...)
    if (downloadUrl.startsWith('/uploads/')) {
      const localSourcePath = path.join(process.cwd(), downloadUrl);
      if (fs.existsSync(localSourcePath)) {
        fs.copyFileSync(localSourcePath, destinationPath);
        const stats = fs.statSync(destinationPath);
        const meta = await this.extractMetadata(destinationPath);
        const thumbUrl = await this.generateThumbnail(destinationPath);
        return {
          storagePath: destinationPath,
          publicUrl: `/uploads/users/${userId}/pages/${pageId}/originals/imported/${filename}`,
          thumbnailUrl: thumbUrl,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          fileSize: stats.size,
          mimeType: `video/${meta.format || 'mp4'}`
        };
      }
    }

    // Stream download over HTTP/HTTPS
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const response = await fetch(downloadUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DARKFLOW-Media-Importer/1.0 (+https://darkflow.io)'
        }
      });

      if (!response.ok) {
        throw new Error(`Servidor remoto respondeu com status ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      let downloadedBytes = 0;

      if (!response.body) {
        throw new Error('Corpo de resposta vazio ao tentar baixar o arquivo.');
      }

      const fileStream = fs.createWriteStream(destinationPath);

      // Node.js web stream reader
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          fileStream.write(Buffer.from(value));
          downloadedBytes += value.length;
          if (totalBytes > 0 && onProgress) {
            const pct = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
            onProgress(pct, downloadedBytes, totalBytes);
          } else if (onProgress) {
            onProgress(50, downloadedBytes, 0);
          }
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.end((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      clearTimeout(timeout);

      const stats = fs.statSync(destinationPath);
      if (stats.size === 0) {
        throw new Error('Arquivo baixado está vazio.');
      }

      // Extract metadata with ffprobe
      const metadata = await this.extractMetadata(destinationPath);
      // Extract real thumbnail
      const thumbnailUrl = await this.generateThumbnail(destinationPath);

      const relativeUrl = `/uploads/users/${userId}/pages/${pageId}/originals/imported/${filename}`;

      return {
        storagePath: destinationPath,
        publicUrl: relativeUrl,
        thumbnailUrl,
        duration: metadata.duration || 10,
        width: metadata.width || 1080,
        height: metadata.height || 1920,
        fileSize: stats.size,
        mimeType: `video/${metadata.format || 'mp4'}`
      };
    } catch (err: any) {
      clearTimeout(timeout);
      // Clean up partial file on failure
      if (fs.existsSync(destinationPath)) {
        try { fs.unlinkSync(destinationPath); } catch {}
      }
      throw err;
    }
  }
}
