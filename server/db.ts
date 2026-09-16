import fs from 'fs';
import path from 'path';
import { 
  User, Page, Template, Video, Production, 
  ProductionItem, ExportBatch, AppNotification, Tag,
  ImportBatch, ImportJob 
} from '../src/types/index.js';

interface DatabaseSchema {
  users: User[];
  pages: Page[];
  templates: Template[];
  videos: Video[];
  productions: Production[];
  productionItems: ProductionItem[];
  exports: ExportBatch[];
  notifications: AppNotification[];
  tags: Tag[];
  importBatches?: ImportBatch[];
  importJobs?: ImportJob[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'darkflow_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data
const initialUser: User = {
  id: 'usr_darkflow_demo',
  name: 'Creator Studio Pro',
  email: 'creator@darkflow.io',
  plan: 'PRO',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  createdAt: new Date().toISOString()
};

const initialPage: Page = {
  id: 'page_memorias',
  userId: initialUser.id,
  name: 'Memórias Dark',
  username: '@memorias.dark',
  platform: 'instagram',
  avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  description: 'Canal focado em narrativas épicas, curiosidades históricas e reflexões.',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templatesCount: 1,
  videosCount: 6,
  productionsCount: 1
};

const initialPage2: Page = {
  id: 'page_fatos',
  userId: initialUser.id,
  name: 'Fatos Obscuros',
  username: '@fatosobscuros_oficial',
  platform: 'tiktok',
  avatarUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=150&auto=format&fit=crop&q=80',
  description: 'Fatos intrigantes da ciência e história para formato vertical.',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templatesCount: 1,
  videosCount: 4,
  productionsCount: 0
};

// DEMO TEMPLATE as strictly requested in Requirement #25: "Dark Demo", 1080x1920, dark background,
// central video area, top text, fictive logo, fictive username.
const initialTemplate: Template = {
  id: 'tpl_dark_demo',
  userId: initialUser.id,
  pageId: initialPage.id,
  name: 'Dark Demo (Viral Reels & TikTok)',
  description: 'Template escuro de alta retenção com moldura superior de manchete e área de vídeo central dinâmica.',
  width: 1080,
  height: 1920,
  aspectRatio: '9:16',
  background: '#090a0f',
  thumbnailUrl: '/assets/templates/dark_demo_thumb.svg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  elements: [
    {
      id: 'elem_bg',
      type: 'background',
      name: 'Fundo Escuro Premium',
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      visible: true,
      locked: true,
      fill: '#090a0f'
    },
    {
      id: 'elem_header_badge',
      type: 'shape',
      name: 'Badge Superior',
      x: 140,
      y: 120,
      width: 800,
      height: 70,
      rotation: 0,
      opacity: 0.9,
      zIndex: 1,
      visible: true,
      locked: false,
      fill: '#151722',
      borderColor: '#383b52',
      borderWidth: 1.5,
      borderRadius: 35
    },
    {
      id: 'elem_page_username',
      type: 'text',
      name: 'Username da Página',
      x: 160,
      y: 135,
      width: 760,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
      visible: true,
      locked: false,
      text: '★ MEMÓRIAS DARK • SIGA PARA MAIS ★',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 24,
      fontWeight: 'bold',
      color: '#a78bfa',
      alignment: 'center',
      letterSpacing: 2
    },
    {
      id: 'elem_headline_text',
      type: 'text',
      name: 'Título Principal (Headline)',
      x: 80,
      y: 220,
      width: 920,
      height: 180,
      rotation: 0,
      opacity: 1,
      zIndex: 3,
      visible: true,
      locked: false,
      text: 'OS SEGREDOS MAIS OCULTOS DA HISTÓRIA QUE NINGUÉM CONTA',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 48,
      fontWeight: '800',
      color: '#ffffff',
      alignment: 'center',
      lineHeight: 1.25
    },
    {
      id: 'elem_video_slot',
      type: 'video_placeholder',
      name: 'Área do Vídeo (Dinâmico)',
      x: 60,
      y: 430,
      width: 960,
      height: 1180,
      rotation: 0,
      opacity: 1,
      zIndex: 4,
      visible: true,
      locked: false,
      placeholderType: 'main_video',
      crop: 'crop_to_fit',
      fit: 'cover',
      borderRadius: 32,
      borderColor: '#2e334a',
      borderWidth: 3
    },
    {
      id: 'elem_footer_cta',
      type: 'text',
      name: 'Chamada para Ação (Rodapé)',
      x: 100,
      y: 1680,
      width: 880,
      height: 100,
      rotation: 0,
      opacity: 0.95,
      zIndex: 5,
      visible: true,
      locked: false,
      text: 'Comente "PARTE 2" para continuação',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 34,
      fontWeight: 'bold',
      color: '#38bdf8',
      alignment: 'center'
    },
    {
      id: 'elem_footer_decor',
      type: 'line',
      name: 'Linha Divisória Rodapé',
      x: 340,
      y: 1810,
      width: 400,
      height: 4,
      rotation: 0,
      opacity: 0.6,
      zIndex: 6,
      visible: true,
      locked: false,
      fill: '#6366f1'
    }
  ]
};

const initialTags: Tag[] = [
  { id: 'tag_historia', name: 'HISTÓRIA', color: '#8b5cf6', count: 3 },
  { id: 'tag_curiosidades', name: 'CURIOSIDADES', color: '#3b82f6', count: 4 },
  { id: 'tag_viral', name: 'VIRAL', color: '#ec4899', count: 5 },
  { id: 'tag_misterio', name: 'MISTÉRIO', color: '#10b981', count: 2 },
  { id: 'tag_fatos', name: 'FATOS', color: '#f59e0b', count: 2 }
];

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        parsed.importBatches = parsed.importBatches || [];
        parsed.importJobs = parsed.importJobs || [];
        return parsed;
      }
    } catch (e) {
      console.error('Error loading database file, initializing defaults:', e);
    }

    const defaultData: DatabaseSchema = {
      users: [initialUser],
      pages: [initialPage, initialPage2],
      templates: [initialTemplate],
      videos: [],
      productions: [],
      productionItems: [],
      exports: [],
      notifications: [
        {
          id: 'notif_welcome',
          userId: initialUser.id,
          title: 'DARKFLOW pronto para produção',
          message: 'Sistema inicializado com arquitetura full-stack e suporte a FFmpeg.',
          type: 'info',
          read: false,
          createdAt: new Date().toISOString()
        }
      ],
      tags: initialTags,
      importBatches: [],
      importJobs: []
    };

    this.saveData(defaultData);
    return defaultData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database file:', err);
    }
  }

  public save() {
    this.saveData(this.data);
  }

  // Users
  getUser(id: string) {
    return this.data.users.find(u => u.id === id) || this.data.users[0];
  }
  updateUser(id: string, partial: Partial<User>) {
    const user = this.getUser(id);
    Object.assign(user, partial);
    this.save();
    return user;
  }

  // Pages
  getPages(userId: string) {
    return this.data.pages.filter(p => p.userId === userId);
  }
  getPage(id: string) {
    return this.data.pages.find(p => p.id === id);
  }
  createPage(page: Page) {
    this.data.pages.push(page);
    this.save();
    return page;
  }
  updatePage(id: string, partial: Partial<Page>) {
    const idx = this.data.pages.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.pages[idx] = { ...this.data.pages[idx], ...partial, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.pages[idx];
    }
    return null;
  }
  deletePage(id: string) {
    this.data.pages = this.data.pages.filter(p => p.id !== id);
    this.save();
  }

  // Templates
  getTemplates(userId: string, pageId?: string) {
    return this.data.templates.filter(t => {
      if (t.userId !== userId && t.userId !== 'global') return false;
      if (pageId && t.pageId && t.pageId !== pageId) return false;
      return true;
    });
  }
  getTemplate(id: string) {
    return this.data.templates.find(t => t.id === id);
  }
  createTemplate(template: Template) {
    this.data.templates.push(template);
    this.save();
    return template;
  }
  updateTemplate(id: string, partial: Partial<Template>) {
    const idx = this.data.templates.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.templates[idx] = { ...this.data.templates[idx], ...partial, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.templates[idx];
    }
    return null;
  }
  deleteTemplate(id: string) {
    this.data.templates = this.data.templates.filter(t => t.id !== id);
    this.save();
  }

  // Videos
  getVideos(query: { userId: string; pageId?: string; status?: string; tag?: string; search?: string }) {
    return this.data.videos.filter(v => {
      if (v.userId !== query.userId) return false;
      if (query.pageId && v.pageId !== query.pageId) return false;
      if (query.status && v.status !== query.status) return false;
      if (query.tag && !v.tags.includes(query.tag)) return false;
      if (query.search) {
        const s = query.search.toLowerCase();
        if (!v.name.toLowerCase().includes(s) && !v.tags.some(t => t.toLowerCase().includes(s))) {
          return false;
        }
      }
      return true;
    });
  }
  getVideo(id: string) {
    return this.data.videos.find(v => v.id === id);
  }
  createVideo(video: Video) {
    this.data.videos.unshift(video);
    this.save();
    return video;
  }
  createVideosBatch(videos: Video[]) {
    this.data.videos.unshift(...videos);
    this.save();
    return videos;
  }
  updateVideo(id: string, partial: Partial<Video>) {
    const idx = this.data.videos.findIndex(v => v.id === id);
    if (idx !== -1) {
      this.data.videos[idx] = { ...this.data.videos[idx], ...partial };
      this.save();
      return this.data.videos[idx];
    }
    return null;
  }
  deleteVideos(ids: string[]) {
    const set = new Set(ids);
    this.data.videos = this.data.videos.filter(v => !set.has(v.id));
    this.save();
  }

  // Productions
  getProductions(userId: string, pageId?: string) {
    return this.data.productions
      .filter(p => p.userId === userId && (!pageId || p.pageId === pageId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  getProduction(id: string) {
    const prod = this.data.productions.find(p => p.id === id);
    if (!prod) return null;
    const items = this.data.productionItems.filter(i => i.productionId === id);
    return { ...prod, items };
  }
  createProduction(prod: Production, items: ProductionItem[]) {
    this.data.productions.unshift(prod);
    this.data.productionItems.push(...items);
    this.save();
    return prod;
  }
  updateProduction(id: string, partial: Partial<Production>) {
    const idx = this.data.productions.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.productions[idx] = { ...this.data.productions[idx], ...partial, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.productions[idx];
    }
    return null;
  }
  updateProductionItem(id: string, partial: Partial<ProductionItem>) {
    const idx = this.data.productionItems.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.data.productionItems[idx] = { ...this.data.productionItems[idx], ...partial };
      this.save();
      return this.data.productionItems[idx];
    }
    return null;
  }
  getProductionItems(productionId: string) {
    return this.data.productionItems.filter(i => i.productionId === productionId);
  }
  getProductionItem(id: string) {
    return this.data.productionItems.find(i => i.id === id) || null;
  }

  // Exports
  getExports() {
    return this.data.exports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  createExport(batch: ExportBatch) {
    this.data.exports.unshift(batch);
    this.save();
    return batch;
  }
  updateExport(id: string, partial: Partial<ExportBatch>) {
    const idx = this.data.exports.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.data.exports[idx] = { ...this.data.exports[idx], ...partial };
      this.save();
      return this.data.exports[idx];
    }
    return null;
  }

  // Notifications
  getNotifications(userId: string) {
    return this.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  addNotification(notif: AppNotification) {
    this.data.notifications.unshift(notif);
    this.save();
    return notif;
  }
  markNotificationRead(id: string) {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }
  markAllNotificationsRead(userId: string) {
    this.data.notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.save();
  }

  // Tags
  getTags() {
    return this.data.tags;
  }
  createTag(name: string, color: string) {
    const tag: Tag = {
      id: `tag_${Date.now()}`,
      name: name.toUpperCase().trim(),
      color,
      count: 0
    };
    this.data.tags.push(tag);
    this.save();
    return tag;
  }

  // Import Batches & Jobs (PROMPT 4)
  getImportBatches(userId?: string, pageId?: string): ImportBatch[] {
    if (!this.data.importBatches) this.data.importBatches = [];
    return this.data.importBatches
      .filter(b => (!userId || b.userId === userId) && (!pageId || b.pageId === pageId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getImportBatch(id: string): ImportBatch | null {
    if (!this.data.importBatches) this.data.importBatches = [];
    const batch = this.data.importBatches.find(b => b.id === id);
    if (!batch) return null;
    const items = this.getImportJobs(id);
    return { ...batch, items };
  }

  createImportBatch(batch: ImportBatch, items: ImportJob[]): ImportBatch {
    if (!this.data.importBatches) this.data.importBatches = [];
    if (!this.data.importJobs) this.data.importJobs = [];
    this.data.importBatches.unshift(batch);
    this.data.importJobs.push(...items);
    this.save();
    return batch;
  }

  updateImportBatch(id: string, partial: Partial<ImportBatch>): ImportBatch | null {
    if (!this.data.importBatches) this.data.importBatches = [];
    const idx = this.data.importBatches.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.data.importBatches[idx] = { 
        ...this.data.importBatches[idx], 
        ...partial, 
        updatedAt: new Date().toISOString() 
      };
      this.save();
      return this.data.importBatches[idx];
    }
    return null;
  }

  getImportJobs(batchId: string): ImportJob[] {
    if (!this.data.importJobs) this.data.importJobs = [];
    return this.data.importJobs.filter(j => j.batchId === batchId);
  }

  getImportJob(jobId: string): ImportJob | null {
    if (!this.data.importJobs) this.data.importJobs = [];
    return this.data.importJobs.find(j => j.id === jobId) || null;
  }

  updateImportJob(jobId: string, partial: Partial<ImportJob>): ImportJob | null {
    if (!this.data.importJobs) this.data.importJobs = [];
    const idx = this.data.importJobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      this.data.importJobs[idx] = { 
        ...this.data.importJobs[idx], 
        ...partial, 
        updatedAt: new Date().toISOString() 
      };
      this.save();
      return this.data.importJobs[idx];
    }
    return null;
  }

  findExistingVideoBySource(userId: string, pageId: string, source: string, sourceContentId: string): Video | null {
    return this.data.videos.find(v => 
      v.userId === userId && 
      v.pageId === pageId && 
      v.source === source && 
      v.sourceContentId === sourceContentId
    ) || null;
  }
}

export const db = new Database();
