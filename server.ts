import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import util from 'util';
import { createServer as createViteServer } from 'vite';

const execAsync = util.promisify(exec);
import { db } from './server/db.js';
import { upload, StorageService, UPLOADS_DIR } from './server/services/storage.js';
import { queueService } from './server/services/queue.js';
import { ZipService } from './server/services/zip.js';
import { AdapterManager, ContentSourceService } from './server/services/adapters.js';
import { importQueueService } from './server/services/importQueue.js';
import { Video, Page, Template, Production, ProductionItem } from './src/types/index.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Custom static handler for /uploads with Range support for video streaming
  app.use('/uploads', express.static(UPLOADS_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      }
    }
  }));

  // CORS and pre-flight handling for API endpoints
  app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-page-id, x-video-id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health & Diagnostics
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: 'DARKFLOW Full-Stack Core v1.0',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/settings/diagnostics', (req, res) => {
    let ffmpegInstalled = false;
    try {
      execSync('ffmpeg -version');
      ffmpegInstalled = true;
    } catch {
      ffmpegInstalled = false;
    }

    const adapters = AdapterManager.getAllAdapters().map(a => ({
      platform: a.platformId,
      name: a.name,
      configured: a.isConfigured()
    }));

    res.json({
      ffmpeg: ffmpegInstalled,
      nodeVersion: process.version,
      platform: process.platform,
      adapters,
      storagePath: UPLOADS_DIR
    });
  });

  // User
  app.get('/api/user', (req, res) => {
    const user = db.getUser('usr_darkflow_demo');
    res.json(user);
  });

  app.put('/api/user', (req, res) => {
    const updated = db.updateUser('usr_darkflow_demo', req.body);
    res.json(updated);
  });

  // Pages
  app.get('/api/pages', (req, res) => {
    const pages = db.getPages('usr_darkflow_demo');
    // Calculate live counts
    const enriched = pages.map(p => {
      const templates = db.getTemplates('usr_darkflow_demo', p.id);
      const videos = db.getVideos({ userId: 'usr_darkflow_demo', pageId: p.id });
      const prods = db.getProductions('usr_darkflow_demo', p.id);
      return {
        ...p,
        templatesCount: templates.length,
        videosCount: videos.length,
        productionsCount: prods.length
      };
    });
    res.json(enriched);
  });

  app.post('/api/pages', (req, res) => {
    const { name, username, platform, avatarUrl, description } = req.body;
    const newPage: Page = {
      id: `page_${Date.now()}`,
      userId: 'usr_darkflow_demo',
      name: name || 'Nova Página',
      username: username || `@pagina_${Date.now()}`,
      platform: platform || 'instagram',
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      description: description || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templatesCount: 0,
      videosCount: 0,
      productionsCount: 0
    };
    db.createPage(newPage);
    res.status(201).json(newPage);
  });

  app.put('/api/pages/:id', (req, res) => {
    const updated = db.updatePage(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Página não encontrada' });
    res.json(updated);
  });

  app.post('/api/pages/:id/duplicate', (req, res) => {
    const original = db.getPage(req.params.id);
    if (!original) return res.status(404).json({ error: 'Página não encontrada' });

    const duplicated: Page = {
      ...original,
      id: `page_${Date.now()}`,
      name: `${original.name} (Cópia)`,
      username: `${original.username}_copia`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.createPage(duplicated);
    res.status(201).json(duplicated);
  });

  app.delete('/api/pages/:id', (req, res) => {
    db.deletePage(req.params.id);
    res.json({ success: true });
  });

  // Videos
  app.get('/api/videos', (req, res) => {
    const { pageId, status, tag, search } = req.query;
    const videos = db.getVideos({
      userId: 'usr_darkflow_demo',
      pageId: pageId as string,
      status: status as string,
      tag: tag as string,
      search: search as string
    });
    res.json(videos);
  });

  app.post('/api/videos/upload', upload.array('videos', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const pageId = req.body.pageId || 'page_memorias';
      const tags = req.body.tags ? JSON.parse(req.body.tags) : ['GERAL'];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const createdVideos: Video[] = [];

      for (const file of files) {
        const metadata = await StorageService.extractMetadata(file.path);
        const thumbnailUrl = await StorageService.generateThumbnail(file.path);
        const relativeUrl = `/uploads/users/usr_darkflow_demo/pages/${pageId}/originals/${file.filename}`;

        const videoRecord: Video = {
          id: `vid_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
          userId: 'usr_darkflow_demo',
          pageId,
          name: file.originalname.replace(/\.[^/.]+$/, ''),
          originalUrl: relativeUrl,
          storagePath: file.path,
          thumbnailUrl,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          platform: 'instagram',
          source: 'upload_direto',
          status: 'original',
          tags,
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
          isDemo: false
        };

        db.createVideo(videoRecord);
        createdVideos.push(videoRecord);
      }

      db.addNotification({
        id: `notif_${Date.now()}`,
        userId: 'usr_darkflow_demo',
        title: 'Upload concluído',
        message: `${createdVideos.length} vídeo(s) importado(s) com sucesso na biblioteca.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString()
      });

      res.status(201).json(createdVideos);
    } catch (err: any) {
      console.error('Upload handler error:', err);
      res.status(500).json({ error: err?.message || 'Falha ao processar upload' });
    }
  });

  // Dedicated Storage Upload for Darkflow Multi-Page video assets
  const storageUploadHandler = [
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
      ])(req, res, (err) => {
        if (err) {
          console.error('[STORAGE UPLOAD MULTER ERROR]:', err);
          return res.status(400).json({ error: err.message || 'Erro ao processar arquivo de upload' });
        }
        next();
      });
    },
    async (req: express.Request, res: express.Response) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const videoFile = files?.['video']?.[0];
        const thumbFile = files?.['thumbnail']?.[0];
        const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'default_user';
        const pageId = (req.headers['x-page-id'] as string) || req.body.pageId || 'default_page';
        const videoId = (req.headers['x-video-id'] as string) || req.body.videoId || `vid_${Date.now()}`;

        if (!videoFile) {
          return res.status(400).json({ error: 'Nenhum arquivo de vídeo recebido' });
        }

        let duration = parseFloat(req.body.duration || '0');
        let width = parseInt(req.body.width || '1080', 10);
        let height = parseInt(req.body.height || '1920', 10);

        if (!duration || duration === 0) {
          const meta = await StorageService.extractMetadata(videoFile.path);
          duration = meta.duration;
          width = meta.width;
          height = meta.height;
        }

        let thumbnailUrl = '';
        const thumbnailPath = `users/${userId}/pages/${pageId}/thumbnails/${videoId}.jpg`;

        if (thumbFile) {
          thumbnailUrl = `/uploads/users/${userId}/pages/${pageId}/thumbnails/${videoId}.jpg`;
        } else if (videoFile.size > 1024) {
          const generatedThumbDir = path.join(UPLOADS_DIR, 'users', userId, 'pages', pageId, 'thumbnails');
          if (!fs.existsSync(generatedThumbDir)) {
            fs.mkdirSync(generatedThumbDir, { recursive: true });
          }
          const fullThumbFile = path.join(generatedThumbDir, `${videoId}.jpg`);
          try {
            const cmd = `ffmpeg -y -ss 00:00:01 -i "${videoFile.path}" -vframes 1 -q:v 2 "${fullThumbFile}"`;
            await execAsync(cmd);
            if (fs.existsSync(fullThumbFile) && fs.statSync(fullThumbFile).size > 0) {
              thumbnailUrl = `/uploads/users/${userId}/pages/${pageId}/thumbnails/${videoId}.jpg`;
            }
          } catch {
            // Graceful fallback without breaking upload
          }
        }

        const storagePath = `users/${userId}/pages/${pageId}/originals/${videoFile.filename}`;
        const downloadUrl = `/uploads/${storagePath}`;

        res.json({
          success: true,
          videoId,
          storagePath,
          downloadUrl,
          publicUrl: downloadUrl,
          thumbnailPath: thumbnailUrl ? thumbnailPath : null,
          thumbnailUrl: thumbnailUrl || '',
          originalFilename: videoFile.originalname,
          duration,
          width,
          height,
          fileSize: videoFile.size,
          mimeType: videoFile.mimetype || 'video/mp4'
        });
      } catch (err: any) {
        console.error('Storage upload route error:', err);
        res.status(500).json({ error: err?.message || 'Falha no processamento do upload' });
      }
    }
  ];

  app.post('/api/storage/upload', ...storageUploadHandler);
  app.post('/api/upload', ...storageUploadHandler);

  // Seed sample demo videos for quick testing (e.g. 10 or 100 videos)
  app.post('/api/videos/generate-demo-batch', async (req, res) => {
    try {
      const count = Math.min(parseInt(req.body.count || '10', 10), 100);
      const pageId = req.body.pageId || 'page_memorias';
      const topics = [
        'Curiosidade Cósmica', 'Fato Bizarro da Idade Média', 'O Mistério das Pirâmides',
        'Invenção Revolucionária', 'Guerra dos 100 Anos em 60s', 'Mente Humana Revelada',
        'Arquivo Secreto #04', 'Ilusão de Óptica Incrível', 'Como Era Viver em Roma',
        'O Segredo do Buraco Negro', 'Relato Arrepiante', 'Fórmula da Produtividade'
      ];

      const created: Video[] = [];

      // Generate 2 real ffmpeg sample clips to serve as base media
      const sample1 = await StorageService.generateDemoVideo('usr_darkflow_demo', pageId, 'Clip A', 4);
      const sample2 = await StorageService.generateDemoVideo('usr_darkflow_demo', pageId, 'Clip B', 5);

      const availableTags = ['HISTÓRIA', 'VIRAL', 'CURIOSIDADES', 'MISTÉRIO', 'FATOS'];

      for (let i = 1; i <= count; i++) {
        const topic = topics[(i - 1) % topics.length];
        const isA = i % 2 === 0;
        const baseSample = isA ? sample1 : sample2;
        const tag = availableTags[(i - 1) % availableTags.length];

        const video: Video = {
          id: `vid_demo_${Date.now()}_${i}`,
          userId: 'usr_darkflow_demo',
          pageId,
          name: `[DEMO] ${topic} #${String(i).padStart(3, '0')}`,
          originalUrl: baseSample.publicUrl,
          storagePath: baseSample.filePath,
          thumbnailUrl: baseSample.thumbnailUrl,
          duration: baseSample.duration,
          width: 1080,
          height: 1920,
          platform: 'instagram',
          source: 'demo_pack',
          status: 'original',
          tags: [tag, 'DEMO'],
          sizeBytes: baseSample.sizeBytes,
          createdAt: new Date(Date.now() - (count - i) * 60000).toISOString(),
          isDemo: true
        };

        db.createVideo(video);
        created.push(video);
      }

      db.addNotification({
        id: `notif_${Date.now()}`,
        userId: 'usr_darkflow_demo',
        title: 'Pacote de Demonstração Carregado',
        message: `${count} vídeos demonstrativos prontos para teste de produção em massa.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ count: created.length, videos: created });
    } catch (err: any) {
      console.error('Demo generation error:', err);
      res.status(500).json({ error: err?.message || 'Falha ao gerar vídeos demo' });
    }
  });

  app.post('/api/videos/batch-delete', (req, res) => {
    const { ids } = req.body;
    if (Array.isArray(ids)) {
      db.deleteVideos(ids);
      res.json({ success: true, count: ids.length });
    } else {
      res.status(400).json({ error: 'Lista de IDs inválida' });
    }
  });

  app.post('/api/videos/batch-tag', (req, res) => {
    const { ids, tags } = req.body;
    if (Array.isArray(ids) && Array.isArray(tags)) {
      for (const id of ids) {
        const v = db.getVideo(id);
        if (v) {
          const combined = Array.from(new Set([...v.tags, ...tags]));
          db.updateVideo(id, { tags: combined });
        }
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Parâmetros inválidos' });
    }
  });

  app.post('/api/videos/batch-move', (req, res) => {
    const { ids, targetPageId } = req.body;
    if (Array.isArray(ids) && targetPageId) {
      for (const id of ids) {
        db.updateVideo(id, { pageId: targetPageId });
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Parâmetros inválidos' });
    }
  });

  // Templates
  app.get('/api/templates', (req, res) => {
    const { pageId } = req.query;
    const templates = db.getTemplates('usr_darkflow_demo', pageId as string);
    res.json(templates);
  });

  app.get('/api/templates/:id', (req, res) => {
    const tpl = db.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(tpl);
  });

  app.post('/api/templates', (req, res) => {
    const template: Template = {
      id: `tpl_${Date.now()}`,
      userId: 'usr_darkflow_demo',
      pageId: req.body.pageId || 'page_memorias',
      name: req.body.name || 'Novo Template',
      description: req.body.description || '',
      width: req.body.width || 1080,
      height: req.body.height || 1920,
      aspectRatio: req.body.aspectRatio || '9:16',
      background: req.body.background || '#090a0f',
      thumbnailUrl: req.body.thumbnailUrl || '/assets/templates/dark_demo_thumb.svg',
      elements: req.body.elements || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.createTemplate(template);
    res.status(201).json(template);
  });

  app.put('/api/templates/:id', (req, res) => {
    const updated = db.updateTemplate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(updated);
  });

  // Requirement #11: DUPLICAR TEMPLATE
  app.post('/api/templates/:id/duplicate', (req, res) => {
    const orig = db.getTemplate(req.params.id);
    if (!orig) return res.status(404).json({ error: 'Template não encontrado' });

    const newTemplate: Template = {
      ...orig,
      id: `tpl_${Date.now()}`,
      name: `${orig.name} (Duplicado)`,
      elements: JSON.parse(JSON.stringify(orig.elements)), // deep copy of elements
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.createTemplate(newTemplate);
    res.status(201).json(newTemplate);
  });

  app.delete('/api/templates/:id', (req, res) => {
    db.deleteTemplate(req.params.id);
    res.json({ success: true });
  });

  // Productions
  app.get('/api/productions', (req, res) => {
    const { pageId } = req.query;
    const prods = db.getProductions('usr_darkflow_demo', pageId as string);
    res.json(prods);
  });

  app.get('/api/productions/:id', (req, res) => {
    const prod = db.getProduction(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Produção não encontrada' });
    res.json(prod);
  });

  // Create Batch Production & start queue
  app.post('/api/productions', async (req, res) => {
    try {
      const { 
        productionId, 
        userId = 'usr_darkflow_demo', 
        pageId, 
        templateId, 
        templateSnapshot, 
        videoIds, 
        videos: providedVideos = [], 
        title, 
        name,
        audioMode = 'ORIGINAL' 
      } = req.body;

      if (!templateId || !Array.isArray(videoIds) || videoIds.length === 0) {
        return res.status(400).json({ error: 'Selecione pelo menos um vídeo e um template' });
      }

      let template = db.getTemplate(templateId);
      if (!template && req.body.template) {
        template = req.body.template;
      }

      const prodId = productionId || `prod_${Date.now()}`;
      const prodTitle = title || name || `Produção #${String(db.getProductions(userId).length + 1).padStart(3, '0')}`;

      // Snapshot template elements if not provided
      const finalSnapshot = templateSnapshot || (template ? {
        width: template.width || 1080,
        height: template.height || 1920,
        background: template.background || '#090a0f',
        elements: template.elements || []
      } : undefined);

      const items: ProductionItem[] = [];

      for (const vidId of videoIds) {
        let vid = db.getVideo(vidId);
        if (!vid) {
          vid = providedVideos.find((v: any) => v.id === vidId);
        }
        if (!vid) {
          // Emergency mock/stub so the job can still be processed if video was uploaded client-side
          vid = {
            id: vidId,
            userId,
            pageId: pageId || 'page_memorias',
            name: `Vídeo ${vidId.slice(-6)}`,
            storagePath: '',
            platform: 'generic',
            source: 'upload',
            tags: [],
            originalUrl: `/uploads/videos/${vidId}.mp4`,
            thumbnailUrl: '',
            duration: 10,
            width: 1080,
            height: 1920,
            status: 'READY' as any,
            format: 'mp4',
            sizeBytes: 1024 * 1024,
            createdAt: new Date().toISOString()
          };
        }

        if (vid) {
          items.push({
            id: `item_${Date.now()}_${Math.round(Math.random() * 1e5)}`,
            productionId: prodId,
            userId,
            pageId: pageId || template?.pageId || 'page_memorias',
            videoId: vid.id,
            videoName: vid.name,
            originalVideoUrl: vid.originalUrl,
            thumbnailUrl: vid.thumbnailUrl,
            templateId,
            status: 'queued',
            progress: 0,
            duration: vid.duration,
            createdAt: new Date().toISOString()
          });
        }
      }

      const newProd: Production = {
        id: prodId,
        userId,
        pageId: pageId || template?.pageId || 'page_memorias',
        templateId,
        templateName: template?.name || 'Template DARKFLOW',
        templateSnapshot: finalSnapshot,
        title: prodTitle,
        name: prodTitle,
        audioMode,
        total: items.length,
        completed: 0,
        processing: 0,
        queued: items.length,
        failed: 0,
        cancelled: 0,
        totalJobs: items.length,
        completedJobs: 0,
        processingJobs: 0,
        queuedJobs: items.length,
        failedJobs: 0,
        cancelledJobs: 0,
        status: 'queued',
        progress: 0,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.createProduction(newProd, items);

      // Trigger background processing in QueueService!
      queueService.startProduction(prodId);

      res.status(201).json({ production: newProd, itemsCount: items.length });
    } catch (err: any) {
      console.error('Create production error:', err);
      res.status(500).json({ error: err?.message || 'Falha ao criar produção' });
    }
  });

  app.post('/api/productions/:id/cancel', (req, res) => {
    queueService.cancelProduction(req.params.id);
    res.json({ success: true, message: 'Produção cancelada' });
  });

  app.post('/api/productions/:id/retry', async (req, res) => {
    await queueService.retryFailed(req.params.id);
    res.json({ success: true, message: 'Itens com falha reinseridos na fila' });
  });

  app.post('/api/productions/:id/jobs/:jobId/retry', async (req, res) => {
    await queueService.retrySingleJob(req.params.id, req.params.jobId);
    res.json({ success: true, message: `Job ${req.params.jobId} reinserido na fila` });
  });

  // Direct ZIP download of completed videos
  app.get('/api/productions/:id/zip', async (req, res) => {
    try {
      const batch = await ZipService.generateProductionZip(req.params.id);
      res.json(batch);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Erro ao gerar arquivo ZIP' });
    }
  });

  // Exports & ZIP
  app.get('/api/exports', (req, res) => {
    const exportsList = db.getExports();
    res.json(exportsList);
  });

  app.post('/api/exports/zip/:productionId', async (req, res) => {
    try {
      const batch = await ZipService.generateProductionZip(req.params.productionId);
      res.status(202).json(batch);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Erro ao gerar arquivo ZIP' });
    }
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const notifs = db.getNotifications('usr_darkflow_demo');
    res.json(notifs);
  });

  app.put('/api/notifications/read-all', (req, res) => {
    db.markAllNotificationsRead('usr_darkflow_demo');
    res.json({ success: true });
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    db.markNotificationRead(req.params.id);
    res.json({ success: true });
  });

  // Tags
  app.get('/api/tags', (req, res) => {
    res.json(db.getTags());
  });

  app.post('/api/tags', (req, res) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    const tag = db.createTag(name, color || '#6366f1');
    res.status(201).json(tag);
  });

  // ==========================================
  // MINER, FONTES & IMPORT QUEUE (PROMPT 4)
  // ==========================================

  // List all available content sources & their statuses
  app.get('/api/miner/sources', (req, res) => {
    const sources = ContentSourceService.getSourcesInfo();
    res.json(sources);
  });

  // Test connection to a specific source
  app.post('/api/miner/sources/:id/test', async (req, res) => {
    const result = await ContentSourceService.testSource(req.params.id);
    res.json(result);
  });

  // Search across source(s)
  app.post('/api/miner/search', async (req, res) => {
    try {
      const result = await ContentSourceService.search(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao consultar fonte' });
    }
  });

  // Verify direct media URL
  app.post('/api/miner/verify-url', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
    const result = await ContentSourceService.verifyAnyUrl(url);
    res.json(result);
  });

  // Check duplicate in library
  app.post('/api/miner/check-duplicate', (req, res) => {
    const { userId, pageId, source, sourceContentId } = req.body;
    const targetUserId = userId || 'usr_darkflow_demo';
    const targetPageId = pageId || 'page_memorias';
    const existing = db.findExistingVideoBySource(targetUserId, targetPageId, source, sourceContentId);
    res.json({
      isDuplicate: !!existing,
      video: existing || null
    });
  });

  // Create mass import batch
  app.post('/api/miner/batches', async (req, res) => {
    try {
      const { userId, pageId, source, items, tags, authorizationConfirmed } = req.body;
      const targetUserId = userId || 'usr_darkflow_demo';
      const targetPageId = pageId || 'page_memorias';

      const batch = await importQueueService.createBatch({
        userId: targetUserId,
        pageId: targetPageId,
        source: source || 'direct_url',
        items: items || [],
        tags: tags || [],
        authorizationConfirmed: !!authorizationConfirmed
      });

      res.status(201).json(batch);
    } catch (err: any) {
      console.error('[Create Import Batch Error]:', err);
      res.status(400).json({ error: err.message || 'Erro ao criar lote de importação' });
    }
  });

  // List user import batches (Import history log)
  app.get('/api/miner/batches', (req, res) => {
    const { userId, pageId } = req.query;
    const batches = db.getImportBatches(
      (userId as string) || 'usr_darkflow_demo',
      pageId as string
    );
    res.json(batches);
  });

  // Get specific import batch with live items and progress
  app.get('/api/miner/batches/:id', (req, res) => {
    const batch = db.getImportBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Lote de importação não encontrado' });
    res.json(batch);
  });

  // Cancel import batch
  app.post('/api/miner/batches/:id/cancel', (req, res) => {
    importQueueService.cancelBatch(req.params.id);
    res.json({ success: true, message: 'Importação cancelada com sucesso' });
  });

  // Retry failed items in batch
  app.post('/api/miner/batches/:id/retry', async (req, res) => {
    await importQueueService.retryFailed(req.params.id);
    res.json({ success: true, message: 'Itens com falha reinseridos na fila de importação' });
  });

  // Retry single job
  app.post('/api/miner/batches/:id/jobs/:jobId/retry', async (req, res) => {
    await importQueueService.retryJob(req.params.id, req.params.jobId);
    res.json({ success: true, message: 'Job reinserido na fila' });
  });

  // Minerador & URL Importer (Backward compatibility)
  app.post('/api/minerador/search', async (req, res) => {
    const { platform } = req.body;
    const adapter = ContentSourceService.getAdapter(platform);

    if (!adapter) {
      return res.status(400).json({ error: 'Plataforma não suportada' });
    }

    const result = await adapter.search(req.body);
    res.json(result);
  });

  app.post('/api/minerador/verify-url', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
    const result = await ContentSourceService.verifyAnyUrl(url);
    res.json(result);
  });

  app.post('/api/minerador/import-url', async (req, res) => {
    const { url, pageId, name, tags } = req.body;
    const verification = await ContentSourceService.verifyAnyUrl(url);

    if (!verification.valid) {
      return res.status(400).json({ error: verification.message || 'URL incompatível' });
    }

    const targetPageId = pageId || 'page_memorias';
    const targetUserId = 'usr_darkflow_demo';

    // Check duplicate
    const existing = db.findExistingVideoBySource(targetUserId, targetPageId, 'importador_url', url);
    if (existing) {
      return res.json(existing);
    }

    const videoRecord: Video = {
      id: `vid_${Date.now()}`,
      userId: targetUserId,
      pageId: targetPageId,
      name: name || verification.title || 'Vídeo Importado',
      originalUrl: url,
      storagePath: url,
      downloadUrl: url,
      thumbnailUrl: verification.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      duration: verification.duration || 15,
      width: 1080,
      height: 1920,
      platform: verification.platform,
      source: 'importador_url',
      sourceContentId: url,
      sourceUrl: url,
      status: 'original',
      tags: tags || ['URL', 'IMPORTADO'],
      sizeBytes: verification.fileSize || 15 * 1024 * 1024,
      importedAt: new Date().toISOString(),
      authorizationConfirmed: true,
      createdAt: new Date().toISOString()
    };

    db.createVideo(videoRecord);

    db.addNotification({
      id: `notif_${Date.now()}`,
      userId: targetUserId,
      title: 'Importação por URL bem-sucedida',
      message: `"${videoRecord.name}" adicionado à sua biblioteca.`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json(videoRecord);
  });

  // Explicit JSON 404 handler for unhandled /api routes to prevent HTML fallbacks
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.path}` });
  });

  // Ensure all API errors return JSON rather than falling through to SPA HTML
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API ERROR MIDDLEWARE]:', err);
    res.status(err.status || 500).json({ error: err?.message || 'Erro interno no servidor de API' });
  });

  // ==========================================
  // VITE MIDDLEWARE (DEV) / STATIC FALLBACK (PROD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DARKFLOW CORE] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
