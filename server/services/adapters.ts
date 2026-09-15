import path from 'path';
import { PlatformType, MineradorQuery, MineradorResultItem } from '../../src/types/index.js';

export interface ContentSourceAdapter {
  platformId: PlatformType;
  platformName: string;
  isConfigured(): boolean;
  search(query: MineradorQuery): Promise<{
    configured: boolean;
    message?: string;
    items: MineradorResultItem[];
  }>;
  verifyUrl(url: string): Promise<{
    valid: boolean;
    title?: string;
    thumbnailUrl?: string;
    duration?: number;
    platform: PlatformType;
    message?: string;
  }>;
}

export class InstagramAdapter implements ContentSourceAdapter {
  platformId: PlatformType = 'instagram';
  platformName = 'Instagram Graph API';

  protected apiKey = process.env.INSTAGRAM_GRAPH_API_KEY || '';

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  async search(query: MineradorQuery) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'Fonte não configurada. A API oficial do Instagram (Meta Graph API) requer credenciais configuradas na aba de Configurações.',
        items: []
      };
    }

    // Real API integration would go here using the authorized OAuth token
    return {
      configured: true,
      items: []
    };
  }

  async verifyUrl(url: string) {
    const isInsta = url.includes('instagram.com/reel/') || url.includes('instagram.com/p/');
    if (!isInsta) {
      return { valid: false, platform: this.platformId, message: 'URL não reconhecida como link oficial do Instagram.' };
    }

    if (!this.isConfigured()) {
      return {
        valid: false,
        platform: this.platformId,
        message: 'Fonte não configurada. Para importar de reels privados ou protegidos do Instagram, configure o token de API da Meta em Configurações.'
      };
    }

    return {
      valid: true,
      platform: this.platformId,
      title: 'Instagram Reel Import',
      duration: 15
    };
  }
}

export class TikTokAdapter implements ContentSourceAdapter {
  platformId: PlatformType = 'tiktok';
  platformName = 'TikTok Commercial Content API';

  protected apiKey = process.env.TIKTOK_API_KEY || '';

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  async search(query: MineradorQuery) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'Fonte não configurada. A API de desenvolvedores do TikTok requer credenciais oficiais do TikTok for Business/Developers em Configurações.',
        items: []
      };
    }

    return {
      configured: true,
      items: []
    };
  }

  async verifyUrl(url: string) {
    const isTikTok = url.includes('tiktok.com');
    if (!isTikTok) {
      return { valid: false, platform: this.platformId, message: 'URL não corresponde ao domínio tiktok.com.' };
    }

    if (!this.isConfigured()) {
      return {
        valid: false,
        platform: this.platformId,
        message: 'Fonte não configurada. A extração de dados requer API oficial autorizada.'
      };
    }

    return {
      valid: true,
      platform: this.platformId,
      title: 'TikTok Video'
    };
  }
}

export class GenericUrlAdapter implements ContentSourceAdapter {
  platformId: PlatformType = 'generic';
  platformName = 'Importador Direto de Vídeo (MP4 / WebM)';

  isConfigured(): boolean {
    return true; // Direct accessible public media URLs are supported!
  }

  async search(query: MineradorQuery) {
    return {
      configured: true,
      items: []
    };
  }

  async verifyUrl(url: string) {
    try {
      const parsed = new URL(url);
      const isMediaExtension = /\.(mp4|webm|mov|mkv)$/i.test(parsed.pathname);

      if (!isMediaExtension && !url.includes('cdn') && !url.includes('video')) {
        return {
          valid: false,
          platform: this.platformId,
          message: 'A URL informada deve apontar diretamente para um arquivo de vídeo compatível (.mp4, .webm, .mov) ou CDN de mídia.'
        };
      }

      return {
        valid: true,
        platform: this.platformId,
        title: path.basename(parsed.pathname) || 'Vídeo Importado por URL Direta',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
        duration: 15
      };
    } catch (err) {
      return {
        valid: false,
        platform: this.platformId,
        message: 'URL inválida. Verifique o formato do link fornecido.'
      };
    }
  }
}

export class AdapterManager {
  private static adapters: Map<PlatformType, ContentSourceAdapter> = new Map<PlatformType, ContentSourceAdapter>([
    ['instagram', new InstagramAdapter() as ContentSourceAdapter],
    ['tiktok', new TikTokAdapter() as ContentSourceAdapter],
    ['generic', new GenericUrlAdapter() as ContentSourceAdapter]
  ]);

  static getAdapter(platform: PlatformType): ContentSourceAdapter | undefined {
    return this.adapters.get(platform);
  }

  static getAllAdapters(): ContentSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  static async verifyAnyUrl(url: string) {
    if (url.includes('instagram.com')) {
      return this.adapters.get('instagram')!.verifyUrl(url);
    }
    if (url.includes('tiktok.com')) {
      return this.adapters.get('tiktok')!.verifyUrl(url);
    }
    return this.adapters.get('generic')!.verifyUrl(url);
  }
}
