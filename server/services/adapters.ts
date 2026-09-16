import path from 'path';
import { 
  PlatformType, 
  MineradorQuery, 
  MinerSearchResult, 
  MinerSearchItem, 
  ContentSourceInfo, 
  SourceStatus 
} from '../../src/types/index.js';

export interface ContentSourceAdapter {
  id: string;
  platformId: PlatformType;
  name: string;
  description: string;
  icon: string;
  authType: 'oauth' | 'api_key' | 'direct' | 'none';
  requiredCredentials: string[];
  features: string[];
  docsUrl?: string;

  isConfigured(): boolean;
  getStatus(): SourceStatus;
  testConnection(): Promise<{ success: boolean; message: string }>;
  search(query: MineradorQuery): Promise<MinerSearchResult>;
  getContent(id: string): Promise<MinerSearchItem | null>;
  getDownloadableAsset(id: string): Promise<{ downloadUrl: string; filename: string; mimeType: string; duration?: number } | null>;
  verifyUrl?(url: string): Promise<{
    valid: boolean;
    title?: string;
    thumbnailUrl?: string;
    duration?: number;
    platform: PlatformType;
    message?: string;
    fileSize?: number;
  }>;
}

// -----------------------------------------------------------
// 1. INSTAGRAM GRAPH API ADAPTER (Meta Official Platform)
// -----------------------------------------------------------
export class InstagramSourceAdapter implements ContentSourceAdapter {
  id = 'instagram';
  platformId: PlatformType = 'instagram';
  name = 'Instagram Graph API';
  description = 'Acesso oficial a Reels e mídias de contas conectadas e autorizadas via Meta for Developers.';
  icon = 'Instagram';
  authType: 'oauth' | 'api_key' = 'oauth';
  requiredCredentials = ['INSTAGRAM_ACCESS_TOKEN', 'META_APP_SECRET'];
  features = ['Reels da Conta Autorizada', 'Métricas Reais (Plays, Likes)', 'Metadados de Criador'];
  docsUrl = 'https://developers.facebook.com/docs/instagram-api';

  protected accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
  protected appSecret = process.env.META_APP_SECRET || '';

  isConfigured(): boolean {
    return !!this.accessToken && this.accessToken.trim() !== '';
  }

  getStatus(): SourceStatus {
    return this.isConfigured() ? 'CONFIGURADA' : 'NÃO CONFIGURADA';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { 
        success: false, 
        message: 'Fonte não configurada. Defina a variável de ambiente INSTAGRAM_ACCESS_TOKEN.' 
      };
    }

    try {
      // Test against Graph API me endpoint
      const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${this.accessToken}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { 
          success: false, 
          message: `Erro na autenticação da Meta API: ${err.error?.message || res.statusText}` 
        };
      }
      return { success: true, message: 'Conexão com Instagram Graph API estabelecida com sucesso!' };
    } catch (err: any) {
      return { success: false, message: `Falha na comunicação com a API: ${err.message}` };
    }
  }

  async search(query: MineradorQuery): Promise<MinerSearchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        source: this.id,
        message: 'Fonte não configurada. A API oficial do Instagram (Meta Graph API) requer credenciais configuradas na Central de Fontes.',
        items: []
      };
    }

    try {
      // Query official Instagram media endpoint
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${this.accessToken}&limit=${query.limit || 25}`
      );
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          configured: false,
          source: this.id,
          message: `Erro na Meta API: ${err.error?.message || res.statusText}`,
          items: []
        };
      }

      const data = await res.json();
      const rawItems = Array.isArray(data.data) ? data.data : [];

      const items: MinerSearchItem[] = rawItems
        .filter((item: any) => item.media_type === 'VIDEO' || item.media_type === 'REELS')
        .map((item: any) => ({
          id: `ig_${item.id}`,
          source: this.id,
          sourceContentId: item.id,
          title: item.caption ? item.caption.substring(0, 80) : 'Reel Instagram',
          author: 'Conta Conectada',
          thumbnailUrl: item.thumbnail_url || item.media_url,
          videoUrl: item.media_url,
          duration: 30,
          views: 0,
          likes: item.like_count || 0,
          comments: item.comments_count || 0,
          publishedAt: item.timestamp,
          isAvailableForImport: !!item.media_url,
          aspectRatio: '9:16'
        }));

      return {
        configured: true,
        source: this.id,
        items,
        totalResults: items.length
      };
    } catch (err: any) {
      return {
        configured: false,
        source: this.id,
        message: `Falha ao consultar Instagram: ${err.message}`,
        items: []
      };
    }
  }

  async getContent(id: string): Promise<MinerSearchItem | null> {
    if (!this.isConfigured()) return null;
    const cleanId = id.replace('ig_', '');
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${cleanId}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${this.accessToken}`
      );
      if (!res.ok) return null;
      const item = await res.json();
      return {
        id: `ig_${item.id}`,
        source: this.id,
        sourceContentId: item.id,
        title: item.caption || 'Reel Instagram',
        author: 'Conta Conectada',
        thumbnailUrl: item.thumbnail_url || item.media_url,
        videoUrl: item.media_url,
        duration: 30,
        views: 0,
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        publishedAt: item.timestamp,
        isAvailableForImport: !!item.media_url,
        aspectRatio: '9:16'
      };
    } catch {
      return null;
    }
  }

  async getDownloadableAsset(id: string) {
    const item = await this.getContent(id);
    if (!item || !item.videoUrl) return null;
    return {
      downloadUrl: item.videoUrl,
      filename: `${item.sourceContentId}.mp4`,
      mimeType: 'video/mp4',
      duration: item.duration
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
        message: 'Fonte não configurada. Para importar conteúdo do Instagram, configure o token oficial em Central de Fontes.'
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

// -----------------------------------------------------------
// 2. TIKTOK COMMERCIAL API ADAPTER (TikTok For Developers)
// -----------------------------------------------------------
export class TikTokSourceAdapter implements ContentSourceAdapter {
  id = 'tiktok';
  platformId: PlatformType = 'tiktok';
  name = 'TikTok Commercial Content API';
  description = 'API oficial do TikTok for Business & Developers para acesso a conteúdos comerciais autorizados.';
  icon = 'Share2';
  authType: 'api_key' = 'api_key';
  requiredCredentials = ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'];
  features = ['Busca de Tendências Comerciais', 'Métricas Oficiais de Visualizações', 'Filtro por Região'];
  docsUrl = 'https://developers.tiktok.com';

  protected clientKey = process.env.TIKTOK_CLIENT_KEY || '';
  protected clientSecret = process.env.TIKTOK_CLIENT_SECRET || '';

  isConfigured(): boolean {
    return !!this.clientKey && this.clientKey.trim() !== '';
  }

  getStatus(): SourceStatus {
    return this.isConfigured() ? 'CONFIGURADA' : 'NÃO CONFIGURADA';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { 
        success: false, 
        message: 'Fonte não configurada. Defina TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET.' 
      };
    }
    return { success: true, message: 'Credenciais do TikTok detectadas.' };
  }

  async search(query: MineradorQuery): Promise<MinerSearchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        source: this.id,
        message: 'Fonte não configurada. A API de desenvolvedores do TikTok requer credenciais oficiais em Fontes / Configurações.',
        items: []
      };
    }

    return {
      configured: true,
      source: this.id,
      items: [],
      totalResults: 0
    };
  }

  async getContent(id: string): Promise<MinerSearchItem | null> {
    return null;
  }

  async getDownloadableAsset(id: string) {
    return null;
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
        message: 'Fonte não configurada. A API do TikTok requer credenciais autorizadas em Central de Fontes.'
      };
    }

    return {
      valid: true,
      platform: this.platformId,
      title: 'TikTok Video'
    };
  }
}

// -----------------------------------------------------------
// 3. YOUTUBE DATA API V3 ADAPTER
// -----------------------------------------------------------
export class YouTubeSourceAdapter implements ContentSourceAdapter {
  id = 'youtube';
  platformId: PlatformType = 'youtube';
  name = 'YouTube Data API v3';
  description = 'Pesquisa oficial de Shorts e conteúdos sob licença Creative Commons ou canais autorizados.';
  icon = 'Youtube';
  authType: 'api_key' = 'api_key';
  requiredCredentials = ['YOUTUBE_API_KEY'];
  features = ['Pesquisa por Palavra-Chave', 'Filtro Shorts (<60s)', 'Licença Creative Commons', 'Métricas Oficiais'];
  docsUrl = 'https://developers.google.com/youtube/v3';

  protected apiKey = process.env.YOUTUBE_API_KEY || '';

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  getStatus(): SourceStatus {
    return this.isConfigured() ? 'CONFIGURADA' : 'NÃO CONFIGURADA';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { 
        success: false, 
        message: 'Fonte não configurada. Defina a variável YOUTUBE_API_KEY.' 
      };
    }

    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${this.apiKey}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: `Erro YouTube API: ${err.error?.message || res.statusText}` };
      }
      return { success: true, message: 'Chave YouTube Data API v3 válida e conectada!' };
    } catch (err: any) {
      return { success: false, message: `Falha na conexão: ${err.message}` };
    }
  }

  async search(query: MineradorQuery): Promise<MinerSearchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        source: this.id,
        message: 'Fonte não configurada. A API oficial do YouTube (YouTube Data API v3) requer uma chave YOUTUBE_API_KEY.',
        items: []
      };
    }

    try {
      const q = encodeURIComponent(query.keyword || 'shorts');
      const maxResults = query.limit || 20;
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&videoLicense=creativeCommon&q=${q}&maxResults=${maxResults}&key=${this.apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          configured: false,
          source: this.id,
          message: `Erro YouTube API: ${err.error?.message || res.statusText}`,
          items: []
        };
      }

      const data = await res.json();
      const rawItems = Array.isArray(data.items) ? data.items : [];

      const items: MinerSearchItem[] = rawItems.map((item: any) => ({
        id: `yt_${item.id.videoId}`,
        source: this.id,
        sourceContentId: item.id.videoId,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        duration: 30,
        publishedAt: item.snippet.publishedAt,
        isAvailableForImport: true,
        license: 'Creative Commons (CC BY)',
        aspectRatio: '9:16'
      }));

      return {
        configured: true,
        source: this.id,
        items,
        totalResults: data.pageInfo?.totalResults || items.length,
        nextPageToken: data.nextPageToken
      };
    } catch (err: any) {
      return {
        configured: false,
        source: this.id,
        message: `Falha ao pesquisar no YouTube: ${err.message}`,
        items: []
      };
    }
  }

  async getContent(id: string): Promise<MinerSearchItem | null> {
    if (!this.isConfigured()) return null;
    const cleanId = id.replace('yt_', '');
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${cleanId}&key=${this.apiKey}`);
      if (!res.ok) return null;
      const data = await res.json();
      const item = data.items?.[0];
      if (!item) return null;
      return {
        id: `yt_${item.id}`,
        source: this.id,
        sourceContentId: item.id,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
        duration: 30,
        views: parseInt(item.statistics?.viewCount || '0', 10),
        likes: parseInt(item.statistics?.likeCount || '0', 10),
        comments: parseInt(item.statistics?.commentCount || '0', 10),
        publishedAt: item.snippet.publishedAt,
        isAvailableForImport: true,
        license: 'Creative Commons',
        aspectRatio: '9:16'
      };
    } catch {
      return null;
    }
  }

  async getDownloadableAsset(id: string) {
    const item = await this.getContent(id);
    if (!item) return null;
    return null;
  }
}

// -----------------------------------------------------------
// 4. PEXELS OPEN SOURCE MEDIA ADAPTER (Authorized Stock Videos)
// -----------------------------------------------------------
export class PexelsSourceAdapter implements ContentSourceAdapter {
  id = 'pexels';
  platformId: PlatformType = 'pexels';
  name = 'Pexels Open Video Library';
  description = 'Catálogo de vídeos verticais livres para uso comercial sob licença oficial Pexels License.';
  icon = 'Film';
  authType: 'api_key' = 'api_key';
  requiredCredentials = ['PEXELS_API_KEY'];
  features = ['Orientação Vertical (9:16)', 'Download Direto MP4 HD/FullHD', 'Livre de Royalties', 'Sem Marcas D\'água'];
  docsUrl = 'https://www.pexels.com/api/';

  protected apiKey = process.env.PEXELS_API_KEY || '';

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  getStatus(): SourceStatus {
    return this.isConfigured() ? 'CONFIGURADA' : 'NÃO CONFIGURADA';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { 
        success: false, 
        message: 'Fonte não configurada. Defina PEXELS_API_KEY para habilitar busca em massa de vídeos abertos.' 
      };
    }

    try {
      const res = await fetch('https://api.pexels.com/videos/popular?per_page=1', {
        headers: { Authorization: this.apiKey }
      });
      if (!res.ok) {
        return { success: false, message: `Erro Pexels API: ${res.statusText}` };
      }
      return { success: true, message: 'Pexels API conectada com sucesso!' };
    } catch (err: any) {
      return { success: false, message: `Falha na conexão: ${err.message}` };
    }
  }

  async search(query: MineradorQuery): Promise<MinerSearchResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        source: this.id,
        message: 'Fonte não configurada. Para minerar vídeos de banco livre de direitos, configure PEXELS_API_KEY em Central de Fontes.',
        items: []
      };
    }

    try {
      const q = encodeURIComponent(query.keyword || 'dark aesthetic');
      const perPage = query.limit || 30;
      const url = `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&per_page=${perPage}`;

      const res = await fetch(url, {
        headers: { Authorization: this.apiKey }
      });

      if (!res.ok) {
        return {
          configured: false,
          source: this.id,
          message: `Erro na resposta da Pexels API (${res.status}): ${res.statusText}`,
          items: []
        };
      }

      const data = await res.json();
      const rawVideos = Array.isArray(data.videos) ? data.videos : [];

      const items: MinerSearchItem[] = rawVideos.map((v: any) => {
        // Pick best portrait HD/SD file
        const videoFiles = Array.isArray(v.video_files) ? v.video_files : [];
        const hdFile = videoFiles.find((f: any) => f.quality === 'hd' && f.width && f.height && f.height > f.width) ||
                       videoFiles.find((f: any) => f.quality === 'sd' && f.width && f.height && f.height > f.width) ||
                       videoFiles[0];

        return {
          id: `px_${v.id}`,
          source: this.id,
          sourceContentId: String(v.id),
          title: `Vídeo ${v.id} por ${v.user?.name || 'Pexels Creator'}`,
          author: v.user?.name || 'Pexels',
          thumbnailUrl: v.image,
          videoUrl: hdFile?.link,
          duration: v.duration || 15,
          views: 0,
          likes: 0,
          comments: 0,
          isAvailableForImport: !!hdFile?.link,
          license: 'Pexels Free Commercial License',
          aspectRatio: '9:16'
        };
      });

      return {
        configured: true,
        source: this.id,
        items,
        totalResults: data.total_results || items.length
      };
    } catch (err: any) {
      return {
        configured: false,
        source: this.id,
        message: `Falha ao pesquisar na Pexels API: ${err.message}`,
        items: []
      };
    }
  }

  async getContent(id: string): Promise<MinerSearchItem | null> {
    if (!this.isConfigured()) return null;
    const cleanId = id.replace('px_', '');
    try {
      const res = await fetch(`https://api.pexels.com/videos/videos/${cleanId}`, {
        headers: { Authorization: this.apiKey }
      });
      if (!res.ok) return null;
      const v = await res.json();
      const videoFiles = Array.isArray(v.video_files) ? v.video_files : [];
      const hdFile = videoFiles.find((f: any) => f.quality === 'hd' && f.height > f.width) || videoFiles[0];

      return {
        id: `px_${v.id}`,
        source: this.id,
        sourceContentId: String(v.id),
        title: `Vídeo ${v.id} por ${v.user?.name || 'Pexels'}`,
        author: v.user?.name || 'Pexels',
        thumbnailUrl: v.image,
        videoUrl: hdFile?.link,
        duration: v.duration || 15,
        isAvailableForImport: !!hdFile?.link,
        license: 'Pexels Free Commercial License',
        aspectRatio: '9:16'
      };
    } catch {
      return null;
    }
  }

  async getDownloadableAsset(id: string) {
    const item = await this.getContent(id);
    if (!item || !item.videoUrl) return null;
    return {
      downloadUrl: item.videoUrl,
      filename: `pexels_${item.sourceContentId}.mp4`,
      mimeType: 'video/mp4',
      duration: item.duration
    };
  }
}

// -----------------------------------------------------------
// 5. DIRECT AUTHORIZED URL ADAPTER (MP4 / WebM Direct File)
// -----------------------------------------------------------
export class DirectUrlSourceAdapter implements ContentSourceAdapter {
  id = 'direct_url';
  platformId: PlatformType = 'direct_url';
  name = 'Importador por URL Autorizada';
  description = 'Permite colar e importar links diretos de arquivos MP4, WebM ou CDN aos quais você tenha autorização de acesso.';
  icon = 'Link';
  authType: 'direct' = 'direct';
  requiredCredentials = [];
  features = ['Links Diretos MP4/WebM/MOV', 'Verificação de Headers HTTP', 'Detecção Automática de Metadados'];

  isConfigured(): boolean {
    return true; // Always available!
  }

  getStatus(): SourceStatus {
    return 'CONFIGURADA';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Importador de URL Direta operacional.' };
  }

  async search(query: MineradorQuery): Promise<MinerSearchResult> {
    return {
      configured: true,
      source: this.id,
      items: [],
      message: 'Utilize a aba "Importação por URL" para verificar e importar links específicos diretamente.'
    };
  }

  async getContent(id: string): Promise<MinerSearchItem | null> {
    return null;
  }

  async getDownloadableAsset(url: string) {
    const verification = await this.verifyUrl(url);
    if (!verification.valid) return null;
    return {
      downloadUrl: url,
      filename: path.basename(new URL(url).pathname) || 'video.mp4',
      mimeType: 'video/mp4',
      duration: verification.duration || 15
    };
  }

  async verifyUrl(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          platform: this.platformId,
          message: 'Protocolo inválido. Apenas links HTTP ou HTTPS são aceitos.'
        };
      }

      const isMediaExtension = /\.(mp4|webm|mov|mkv)$/i.test(parsed.pathname);

      // Perform HEAD request to probe content-type
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const headRes = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'DARKFLOW-Media-Verifier/1.0' }
        });
        clearTimeout(timeout);

        const contentType = headRes.headers.get('content-type') || '';
        const contentLength = headRes.headers.get('content-length');
        const sizeBytes = contentLength ? parseInt(contentLength, 10) : 0;

        const isVideoMime = contentType.startsWith('video/') || contentType.includes('octet-stream');

        if (!isMediaExtension && !isVideoMime && !url.includes('cdn')) {
          return {
            valid: false,
            platform: this.platformId,
            message: 'O link não parece retornar um arquivo de vídeo válido (.mp4, .webm) ou cabeçalho MIME de vídeo compatível.'
          };
        }

        const filename = path.basename(parsed.pathname) || 'Vídeo Importado por URL';

        return {
          valid: true,
          platform: this.platformId,
          title: decodeURIComponent(filename),
          fileSize: sizeBytes,
          thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
          duration: 15
        };
      } catch (e: any) {
        clearTimeout(timeout);
        // If HEAD fails due to CORS or forbidden HEAD, fallback to extension check
        if (isMediaExtension) {
          return {
            valid: true,
            platform: this.platformId,
            title: decodeURIComponent(path.basename(parsed.pathname)),
            thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
            duration: 15
          };
        }
        return {
          valid: false,
          platform: this.platformId,
          message: 'Não foi possível conectar ao servidor da URL para verificar a integridade do arquivo.'
        };
      }
    } catch (err: any) {
      return {
        valid: false,
        platform: this.platformId,
        message: 'Formato de URL inválido.'
      };
    }
  }
}

// -----------------------------------------------------------
// 6. MANUAL UPLOAD ADAPTER (Existing Multi-File Upload Integration)
// -----------------------------------------------------------
export class ManualUploadSourceAdapter implements ContentSourceAdapter {
  id = 'manual_upload';
  platformId: PlatformType = 'upload_direto';
  name = 'Upload Manual de Arquivos';
  description = 'Envie arquivos de vídeo locais (MP4, WebM, MOV) do seu computador diretamente para a Biblioteca.';
  icon = 'UploadCloud';
  authType: 'none' = 'none';
  requiredCredentials = [];
  features = ['Arrastar e Soltar', 'Processamento com FFmpeg', 'Extração de Thumbnail', 'Concorrência Múltipla'];

  isConfigured(): boolean {
    return true;
  }

  getStatus(): SourceStatus {
    return 'CONFIGURADA';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Módulo de Upload Manual operacional.' };
  }

  async search(query: MineradorQuery): Promise<MinerSearchResult> {
    return {
      configured: true,
      source: this.id,
      items: [],
      message: 'Para enviar vídeos locais, utilize a opção "Enviar Arquivos" ou o botão "Upload" na Biblioteca.'
    };
  }

  async getContent(id: string): Promise<MinerSearchItem | null> {
    return null;
  }

  async getDownloadableAsset(id: string) {
    return null;
  }
}

// -----------------------------------------------------------
// CONTENT SOURCE SERVICE (Adapter Manager & Orchestrator)
// -----------------------------------------------------------
export class ContentSourceService {
  private static adapters: Map<string, ContentSourceAdapter> = new Map<string, ContentSourceAdapter>([
    ['instagram', new InstagramSourceAdapter()],
    ['tiktok', new TikTokSourceAdapter()],
    ['youtube', new YouTubeSourceAdapter()],
    ['pexels', new PexelsSourceAdapter()],
    ['direct_url', new DirectUrlSourceAdapter()],
    ['manual_upload', new ManualUploadSourceAdapter()]
  ]);

  static getAdapter(id: string): ContentSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  static getAllAdapters(): ContentSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  static getSourcesInfo(): ContentSourceInfo[] {
    return this.getAllAdapters().map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      description: adapter.description,
      icon: adapter.icon,
      status: adapter.getStatus(),
      authType: adapter.authType,
      requiredCredentials: adapter.requiredCredentials,
      features: adapter.features,
      docsUrl: adapter.docsUrl
    }));
  }

  static async testSource(id: string): Promise<{ success: boolean; message: string }> {
    const adapter = this.getAdapter(id);
    if (!adapter) {
      return { success: false, message: `Fonte "${id}" não encontrada.` };
    }
    return adapter.testConnection();
  }

  static async search(query: MineradorQuery): Promise<MinerSearchResult> {
    const sourceId = query.platform as string;

    // If source specified, query that adapter
    if (sourceId && sourceId !== 'all' && this.adapters.has(sourceId)) {
      const adapter = this.adapters.get(sourceId)!;
      return adapter.search(query);
    }

    // Otherwise search across configured adapters that support search
    const configuredSearchAdapters = this.getAllAdapters().filter(
      a => a.id !== 'direct_url' && a.id !== 'manual_upload' && a.isConfigured()
    );

    if (configuredSearchAdapters.length === 0) {
      return {
        configured: false,
        source: 'all',
        message: 'Nenhuma fonte de busca externa está configurada. Configure o YouTube, Pexels, Instagram ou TikTok na Central de Fontes.',
        items: []
      };
    }

    const results = await Promise.all(configuredSearchAdapters.map(a => a.search(query)));
    const mergedItems: MinerSearchItem[] = [];
    results.forEach(r => {
      if (r.configured && r.items) {
        mergedItems.push(...r.items);
      }
    });

    return {
      configured: true,
      source: 'all',
      items: mergedItems,
      totalResults: mergedItems.length
    };
  }

  static async verifyAnyUrl(url: string) {
    if (url.includes('instagram.com')) {
      return this.adapters.get('instagram')!.verifyUrl!(url);
    }
    if (url.includes('tiktok.com')) {
      return this.adapters.get('tiktok')!.verifyUrl!(url);
    }
    return (this.adapters.get('direct_url') as DirectUrlSourceAdapter).verifyUrl(url);
  }
}

// Backward compatibility export
export const AdapterManager = ContentSourceService;
