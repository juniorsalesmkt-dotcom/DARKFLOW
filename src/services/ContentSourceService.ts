import { 
  ContentSourceInfo, 
  MineradorQuery, 
  MinerSearchResult, 
  MinerSearchItem 
} from '../types/index.js';

const API_BASE = '/api/miner';

export class ContentSourceService {
  /**
   * List all available content sources with their real-time configuration status
   */
  static async getSources(): Promise<ContentSourceInfo[]> {
    try {
      const res = await fetch(`${API_BASE}/sources`);
      if (!res.ok) throw new Error(`Falha ao obter fontes: ${res.statusText}`);
      return res.json();
    } catch (err: any) {
      console.error('Error fetching sources:', err);
      // Fallback default structure
      return [
        {
          id: 'instagram',
          name: 'Instagram Graph API',
          description: 'Acesso oficial a Reels e mídias de contas autorizadas via Meta for Developers.',
          icon: 'Instagram',
          status: 'NÃO CONFIGURADA',
          authType: 'oauth',
          requiredCredentials: ['INSTAGRAM_ACCESS_TOKEN', 'META_APP_SECRET'],
          features: ['Reels da Conta', 'Métricas de Visualizações', 'Metadados de Criador'],
          docsUrl: 'https://developers.facebook.com/docs/instagram-api'
        },
        {
          id: 'tiktok',
          name: 'TikTok Commercial Content API',
          description: 'API oficial do TikTok for Developers para pesquisa de tendências e conteúdo autorizado.',
          icon: 'Share2',
          status: 'NÃO CONFIGURADA',
          authType: 'api_key',
          requiredCredentials: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
          features: ['Tendências Comerciais', 'Métricas de Engajamento', 'Filtro Regional'],
          docsUrl: 'https://developers.tiktok.com'
        },
        {
          id: 'youtube',
          name: 'YouTube Data API v3',
          description: 'Pesquisa oficial de Shorts sob licença Creative Commons ou canais autorizados.',
          icon: 'Youtube',
          status: 'NÃO CONFIGURADA',
          authType: 'api_key',
          requiredCredentials: ['YOUTUBE_API_KEY'],
          features: ['Pesquisa por Palavra-Chave', 'Filtro Shorts (<60s)', 'Licença Creative Commons'],
          docsUrl: 'https://developers.google.com/youtube/v3'
        },
        {
          id: 'pexels',
          name: 'Pexels Open Video Library',
          description: 'Catálogo de vídeos verticais livres para uso comercial sob licença oficial Pexels.',
          icon: 'Film',
          status: 'NÃO CONFIGURADA',
          authType: 'api_key',
          requiredCredentials: ['PEXELS_API_KEY'],
          features: ['Orientação Vertical (9:16)', 'Download Direto MP4 HD', 'Livre de Royalties'],
          docsUrl: 'https://www.pexels.com/api/'
        },
        {
          id: 'direct_url',
          name: 'Importador por URL Autorizada',
          description: 'Permite colar e importar links diretos de arquivos MP4, WebM ou servidores de mídia autorizados.',
          icon: 'Link',
          status: 'CONFIGURADA',
          authType: 'direct',
          requiredCredentials: [],
          features: ['Links Diretos MP4/WebM/MOV', 'Verificação de Headers HTTP', 'Detecção Automática']
        },
        {
          id: 'manual_upload',
          name: 'Upload Manual de Arquivos',
          description: 'Envie arquivos de vídeo locais (MP4, WebM, MOV) diretamente do seu computador.',
          icon: 'UploadCloud',
          status: 'CONFIGURADA',
          authType: 'none',
          requiredCredentials: [],
          features: ['Arrastar e Soltar', 'Processamento FFmpeg', 'Extração de Thumbnail']
        }
      ];
    }
  }

  /**
   * Test connection and credentials for a specific source
   */
  static async testSource(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/sources/${id}/test`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data.error || res.statusText };
    }
    return res.json();
  }

  /**
   * Search contents via configured adapters
   */
  static async search(query: MineradorQuery): Promise<MinerSearchResult> {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro na pesquisa');
    }
    return res.json();
  }

  /**
   * Verify direct media URL integrity and accessibility
   */
  static async verifyUrl(url: string): Promise<{
    valid: boolean;
    title?: string;
    thumbnailUrl?: string;
    duration?: number;
    platform: string;
    message?: string;
    fileSize?: number;
  }> {
    const res = await fetch(`${API_BASE}/verify-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao verificar URL');
    }
    return res.json();
  }

  /**
   * Check if a specific source content already exists in library for a given page
   */
  static async checkDuplicate(params: {
    userId: string;
    pageId: string;
    source: string;
    sourceContentId: string;
  }): Promise<{ isDuplicate: boolean; video: any | null }> {
    const res = await fetch(`${API_BASE}/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return { isDuplicate: false, video: null };
    return res.json();
  }
}
