import { 
  User, Page, Template, Video, Production, ExportBatch, 
  AppNotification, Tag, MineradorQuery, MineradorResultItem 
} from '../types/index.js';

const API_BASE = '/api';

export const api = {
  // User
  getUser: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/user`);
    return res.json();
  },
  updateUser: async (data: Partial<User>): Promise<User> => {
    const res = await fetch(`${API_BASE}/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Pages
  getPages: async (): Promise<Page[]> => {
    const res = await fetch(`${API_BASE}/pages`);
    return res.json();
  },
  createPage: async (data: Partial<Page>): Promise<Page> => {
    const res = await fetch(`${API_BASE}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updatePage: async (id: string, data: Partial<Page>): Promise<Page> => {
    const res = await fetch(`${API_BASE}/pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  duplicatePage: async (id: string): Promise<Page> => {
    const res = await fetch(`${API_BASE}/pages/${id}/duplicate`, { method: 'POST' });
    return res.json();
  },
  deletePage: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/pages/${id}`, { method: 'DELETE' });
  },

  // Videos
  getVideos: async (params?: { pageId?: string; status?: string; tag?: string; search?: string }): Promise<Video[]> => {
    const query = new URLSearchParams();
    if (params?.pageId) query.append('pageId', params.pageId);
    if (params?.status) query.append('status', params.status);
    if (params?.tag) query.append('tag', params.tag);
    if (params?.search) query.append('search', params.search);
    const res = await fetch(`${API_BASE}/videos?${query.toString()}`);
    return res.json();
  },
  uploadVideos: async (files: File[], pageId: string, tags: string[] = ['GERAL']): Promise<Video[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('videos', file));
    formData.append('pageId', pageId);
    formData.append('tags', JSON.stringify(tags));

    const res = await fetch(`${API_BASE}/videos/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro no upload');
    }
    return res.json();
  },
  generateDemoBatch: async (count: number, pageId: string): Promise<{ count: number; videos: Video[] }> => {
    const res = await fetch(`${API_BASE}/videos/generate-demo-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, pageId })
    });
    return res.json();
  },
  batchDeleteVideos: async (ids: string[]): Promise<void> => {
    await fetch(`${API_BASE}/videos/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  },
  batchTagVideos: async (ids: string[], tags: string[]): Promise<void> => {
    await fetch(`${API_BASE}/videos/batch-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, tags })
    });
  },
  batchMoveVideos: async (ids: string[], targetPageId: string): Promise<void> => {
    await fetch(`${API_BASE}/videos/batch-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, targetPageId })
    });
  },

  // Templates
  getTemplates: async (pageId?: string): Promise<Template[]> => {
    const query = pageId ? `?pageId=${pageId}` : '';
    const res = await fetch(`${API_BASE}/templates${query}`);
    return res.json();
  },
  getTemplate: async (id: string): Promise<Template> => {
    const res = await fetch(`${API_BASE}/templates/${id}`);
    return res.json();
  },
  createTemplate: async (data: Partial<Template>): Promise<Template> => {
    const res = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateTemplate: async (id: string, data: Partial<Template>): Promise<Template> => {
    const res = await fetch(`${API_BASE}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  duplicateTemplate: async (id: string): Promise<Template> => {
    const res = await fetch(`${API_BASE}/templates/${id}/duplicate`, { method: 'POST' });
    return res.json();
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
  },

  // Productions
  getProductions: async (pageId?: string): Promise<Production[]> => {
    const query = pageId ? `?pageId=${pageId}` : '';
    const res = await fetch(`${API_BASE}/productions${query}`);
    return res.json();
  },
  getProduction: async (id: string): Promise<Production> => {
    const res = await fetch(`${API_BASE}/productions/${id}`);
    return res.json();
  },
  createProduction: async (data: { pageId: string; templateId: string; videoIds: string[]; title?: string }): Promise<{ production: Production; itemsCount: number }> => {
    const res = await fetch(`${API_BASE}/productions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao iniciar produção');
    }
    return res.json();
  },
  cancelProduction: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/productions/${id}/cancel`, { method: 'POST' });
  },
  retryProduction: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/productions/${id}/retry`, { method: 'POST' });
  },

  // Exports
  getExports: async (): Promise<ExportBatch[]> => {
    const res = await fetch(`${API_BASE}/exports`);
    return res.json();
  },
  generateZip: async (productionId: string): Promise<ExportBatch> => {
    const res = await fetch(`${API_BASE}/exports/zip/${productionId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao gerar ZIP');
    }
    return res.json();
  },

  // Notifications
  getNotifications: async (): Promise<AppNotification[]> => {
    const res = await fetch(`${API_BASE}/notifications`);
    return res.json();
  },
  markAllNotificationsRead: async (): Promise<void> => {
    await fetch(`${API_BASE}/notifications/read-all`, { method: 'PUT' });
  },
  markNotificationRead: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
  },

  // Tags
  getTags: async (): Promise<Tag[]> => {
    const res = await fetch(`${API_BASE}/tags`);
    return res.json();
  },
  createTag: async (name: string, color?: string): Promise<Tag> => {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });
    return res.json();
  },

  // Minerador & URL Importer
  searchMinerador: async (query: MineradorQuery): Promise<{ configured: boolean; message?: string; items: MineradorResultItem[] }> => {
    const res = await fetch(`${API_BASE}/minerador/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    return res.json();
  },
  verifyUrl: async (url: string): Promise<{ valid: boolean; title?: string; thumbnailUrl?: string; duration?: number; platform: string; message?: string }> => {
    const res = await fetch(`${API_BASE}/minerador/verify-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  },
  importUrl: async (data: { url: string; pageId: string; name?: string }): Promise<Video> => {
    const res = await fetch(`${API_BASE}/minerador/import-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao importar URL');
    }
    return res.json();
  },

  // Diagnostics
  getDiagnostics: async () => {
    const res = await fetch(`${API_BASE}/settings/diagnostics`);
    return res.json();
  }
};
