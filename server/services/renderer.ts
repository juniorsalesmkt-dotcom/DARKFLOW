import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { Template, TemplateElement, Video } from '../../src/types/index.js';
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
  templateElements: TemplateElement[];
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
  error?: string;
}

export interface IVideoRenderer {
  renderVideo(job: RenderJob, onProgress?: (percent: number) => void): Promise<RenderResult>;
}

export class FFmpegVideoRenderer implements IVideoRenderer {
  async renderVideo(job: RenderJob, onProgress?: (percent: number) => void): Promise<RenderResult> {
    const { userId, pageId, productionId, itemId, originalFilePath, template, templateElements } = job;
    
    // Output path in: /users/{userId}/pages/{pageId}/productions/{productionId}/
    const prodDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'productions', productionId);
    ensureDirectory(prodDir);
    
    const outputFilename = `darkflow_render_${itemId}.mp4`;
    const outputPath = path.join(prodDir, outputFilename);
    const publicUrl = `/uploads/users/${userId}/pages/${pageId}/productions/${productionId}/${outputFilename}`;

    onProgress?.(10);

    // 1. Identify VIDEO_PLACEHOLDER element
    const placeholder = templateElements.find(el => el.type === 'video_placeholder') || {
      id: 'default_slot',
      type: 'video_placeholder' as const,
      name: 'Video Slot',
      x: Math.round(template.width * 0.05),
      y: Math.round(template.height * 0.2),
      width: Math.round(template.width * 0.9),
      height: Math.round(template.height * 0.6),
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      visible: true,
      locked: false,
      fit: 'cover' as const,
      crop: 'crop_to_fit' as const
    };

    // 2. Identify text elements
    const textElements = templateElements.filter(el => el.type === 'text' && el.visible && el.text);

    // 3. Background color hex (remove #)
    let bgColor = (template.background || '#090a0f').replace('#', '0x');
    if (!bgColor.startsWith('0x')) bgColor = '0x090a0f';

    const tWidth = template.width || 1080;
    const tHeight = template.height || 1920;
    const pX = Math.round(placeholder.x);
    const pY = Math.round(placeholder.y);
    const pW = Math.round(placeholder.width);
    const pH = Math.round(placeholder.height);

    onProgress?.(25);

    try {
      // Build complex filter for FFmpeg:
      // Base background layer
      const filterParts: string[] = [];

      // [0:v] is original video, [1:v] will be solid background color
      // Scale original video to placeholder dimensions
      // If fit == 'cover', scale and crop:
      const videoScaleFilter = `[0:v]scale=${pW}:${pH}:force_original_aspect_ratio=increase,crop=${pW}:${pH}[video_scaled]`;
      filterParts.push(videoScaleFilter);

      // Create background canvas
      const bgFilter = `color=c=${bgColor}:s=${tWidth}x${tHeight}:d=10[bg]`;
      filterParts.push(bgFilter);

      // Overlay video onto background canvas
      let currentOut = 'composed_v';
      filterParts.push(`[bg][video_scaled]overlay=${pX}:${pY}:shortest=1[${currentOut}]`);

      // Draw text overlays if any
      textElements.forEach((txt, idx) => {
        const nextOut = `txt_out_${idx}`;
        const escapedText = (txt.text || '')
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "'\\\\''")
          .replace(/:/g, '\\:')
          .replace(/%/g, '%%')
          .substring(0, 100);

        const fontSize = txt.fontSize || 36;
        const fontColor = (txt.color || '#ffffff').replace('#', '0x');
        const textX = Math.round(txt.x + (txt.alignment === 'center' ? (txt.width / 2) : 0));
        const textY = Math.round(txt.y);

        let xExpr = `${textX}`;
        if (txt.alignment === 'center') {
          xExpr = `${textX}-(text_w/2)`;
        }

        const drawText = `[${currentOut}]drawtext=text='${escapedText}':fontcolor=${fontColor}:fontsize=${fontSize}:x=${xExpr}:y=${textY}:shadowcolor=black@0.6:shadowx=2:shadowy=2[${nextOut}]`;
        filterParts.push(drawText);
        currentOut = nextOut;
      });

      const complexFilter = filterParts.join(';');

      onProgress?.(50);

      // Assemble ffmpeg command
      // Check if original video has audio
      const cmd = `ffmpeg -y -i "${originalFilePath}" -filter_complex "${complexFilter}" -map "[${currentOut}]" -map 0:a? -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "${outputPath}"`;

      await execAsync(cmd);

      onProgress?.(85);

      // Generate output thumbnail
      const thumbUrl = await StorageService.generateThumbnail(outputPath);

      onProgress?.(100);

      return {
        success: true,
        outputPath,
        outputVideoUrl: publicUrl,
        thumbnailUrl: thumbUrl,
        duration: job.originalVideo.duration || 10
      };
    } catch (err: any) {
      console.warn('FFmpeg complex render failed, attempting simplified overlay fallback:', err?.message);
      
      // Fallback: Copy video with basic scaling and pad into template aspect ratio
      try {
        const fallbackCmd = `ffmpeg -y -i "${originalFilePath}" -vf "scale=${pW}:${pH}:force_original_aspect_ratio=decrease,pad=${tWidth}:${tHeight}:(ow-iw)/2:(oh-ih)/2:${bgColor}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a copy -shortest "${outputPath}"`;
        await execAsync(fallbackCmd);

        const thumbUrl = await StorageService.generateThumbnail(outputPath);
        onProgress?.(100);

        return {
          success: true,
          outputPath,
          outputVideoUrl: publicUrl,
          thumbnailUrl: thumbUrl,
          duration: job.originalVideo.duration || 10
        };
      } catch (fallbackErr: any) {
        console.error('All FFmpeg render attempts failed:', fallbackErr);
        return {
          success: false,
          outputPath: '',
          outputVideoUrl: '',
          thumbnailUrl: '',
          duration: 0,
          error: fallbackErr?.message || 'Erro durante a renderização do vídeo.'
        };
      }
    }
  }
}

export const videoRenderer = new FFmpegVideoRenderer();
