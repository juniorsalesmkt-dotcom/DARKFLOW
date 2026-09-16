export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'youtube_shorts' | 'facebook' | 'generic' | 'pexels' | 'direct_url' | 'upload_direto';

export type VideoStatus = 'UPLOADING' | 'READY' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'ARCHIVED' | 'original' | 'queued' | 'processed' | 'error';

export type PageStatus = 'ACTIVE' | 'ARCHIVED';

export type ProductionStatus = 
  | 'DRAFT' 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'PARTIAL' 
  | 'FAILED' 
  | 'CANCELLED'
  | 'draft'
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'partial'
  | 'failed' 
  | 'cancelled';

export type ProductionItemStatus = 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED'
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type ElementType = 'text' | 'image' | 'shape' | 'line' | 'video_placeholder' | 'background';

export type AspectRatioPreset = '9:16' | '1:1' | '4:5' | '16:9' | 'custom';
export type AspectRatioType = AspectRatioPreset;

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Page {
  id: string;
  userId: string;
  name: string;
  username: string;
  platform: PlatformType;
  avatarUrl: string;
  description: string;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
  templatesCount?: number;
  videosCount?: number;
  productionsCount?: number;
}

export interface TemplateElement {
  id: string;
  type: ElementType;
  name: string;
  x: number; // percentage or px (normalized)
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  zIndex: number;
  visible?: boolean;
  locked?: boolean;
  hidden?: boolean;
  
  // Specific for 'text'
  text?: string;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  textAlign?: 'left' | 'center' | 'right' | string;
  lineHeight?: number;
  letterSpacing?: number;
  backgroundColor?: string;
  padding?: number;
  
  // Specific for 'image'
  source?: string;
  imageUrl?: string;
  src?: string;
  fit?: 'cover' | 'contain' | 'fill';
  
  // Specific for 'shape' & 'background'
  fill?: string;
  shapeType?: 'rectangle' | 'circle' | 'line' | string;
  stroke?: string;
  strokeWidth?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  
  // Specific for 'video_placeholder'
  placeholderType?: 'main_video' | 'b_roll';
  crop?: 'none' | 'crop_to_fit';
}

export interface Template {
  id: string;
  userId: string;
  pageId?: string; // empty means global
  name: string;
  description: string;
  width: number;
  height: number;
  aspectRatio: AspectRatioPreset;
  background: string;
  backgroundImageUrl?: string;
  backgroundImagePath?: string;
  isOverlayFrame?: boolean;
  videoArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: number;
    fit?: 'cover' | 'contain' | 'fill';
  };
  thumbnailUrl?: string;
  elements: TemplateElement[];
  tags?: string[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  userId: string;
  pageId: string;
  name: string;
  originalFilename?: string;
  storagePath: string;
  downloadUrl?: string;
  originalUrl?: string;
  thumbnailPath?: string | null;
  thumbnailUrl: string;
  mimeType?: string;
  format?: string;
  fileSize?: number;
  duration: number; // in seconds
  width: number;
  height: number;
  platform: PlatformType;
  sourceUrl?: string;
  source: string;
  sourceContentId?: string;
  status: VideoStatus;
  tags: string[];
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
  importedAt?: string;
  authorizationConfirmed?: boolean;
  isDemo?: boolean;
}

export interface UploadProgressItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageId: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  bytesTransferred?: number;
  error?: string;
  videoRecord?: Video;
  downloadUrl?: string;
  cancelFn?: () => void;
}

export interface TemplateSnapshot {
  width: number;
  height: number;
  background: string;
  backgroundImageUrl?: string;
  backgroundImagePath?: string;
  isOverlayFrame?: boolean;
  videoArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius?: number;
    fit?: 'cover' | 'contain' | 'fill';
  };
  elements: TemplateElement[];
}

export interface ProductionItem {
  id: string;
  productionId: string;
  userId?: string;
  pageId?: string;
  videoId: string;
  videoName: string;
  originalVideoUrl?: string;
  inputPath?: string;
  inputUrl?: string;
  thumbnailUrl: string;
  templateId: string;
  status: ProductionItemStatus;
  progress: number; // 0 to 100
  outputPath?: string;
  outputVideoUrl?: string;
  outputUrl?: string;
  error?: string;
  duration?: number;
  fileSize?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Production {
  id: string;
  userId: string;
  pageId: string;
  templateId: string;
  templateName: string;
  templateVersion?: string;
  templateSnapshot?: TemplateSnapshot;
  title: string;
  name?: string;
  audioMode?: 'ORIGINAL' | 'MUTE';
  total: number;
  completed: number;
  processing: number;
  queued: number;
  failed: number;
  cancelled?: number;
  totalJobs?: number;
  completedJobs?: number;
  processingJobs?: number;
  queuedJobs?: number;
  failedJobs?: number;
  cancelledJobs?: number;
  status: ProductionStatus;
  progress: number; // 0 to 100
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: ProductionItem[];
}

export interface ExportBatch {
  id: string;
  productionId: string;
  productionTitle: string;
  totalVideos: number;
  downloadUrl?: string;
  zipStoragePath?: string;
  zipSizeFormatted?: string;
  status: 'ready' | 'generating' | 'failed';
  createdAt: string;
}

export interface Tag {
  id: string;
  userId?: string;
  name: string;
  color?: string;
  count?: number;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface MineradorQuery {
  platform: PlatformType;
  source?: 'profile' | 'url' | 'hashtag' | 'keyword' | 'busca';
  queryValue?: string;
  keyword?: string;
  category?: string;
  minViews?: number;
  minLikes?: number;
  minComments?: number;
  duration?: 'any' | 'short' | 'medium' | 'long';
  dateRange?: 'all' | 'today' | 'week' | 'month';
  limit?: number;
}

export interface MineradorResultItem {
  id: string;
  title: string;
  author: string;
  platform: PlatformType;
  views: number;
  likes: number;
  comments: number;
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  date: string;
  isAvailableForImport: boolean;
  note?: string;
}

// ==========================================
// MINER & CONTENT SOURCES TYPES (PROMPT 4)
// ==========================================

export type SourceStatus = 'CONFIGURADA' | 'NÃO CONFIGURADA' | 'ERRO';

export interface ContentSourceInfo {
  id: string; // 'instagram' | 'tiktok' | 'youtube' | 'direct_url' | 'manual_upload' | 'pexels'
  name: string;
  description: string;
  icon: string;
  status: SourceStatus;
  authType: 'oauth' | 'api_key' | 'direct' | 'none';
  configuredAt?: string;
  errorMessage?: string;
  requiredCredentials: string[];
  features: string[];
  docsUrl?: string;
}

export type ImportJobStatus = 
  | 'QUEUED' 
  | 'DOWNLOADING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export interface ImportJob {
  id: string;
  batchId: string;
  userId: string;
  pageId: string;
  source: string;
  sourceContentId: string;
  sourceUrl: string;
  title: string;
  thumbnailUrl: string;
  duration?: number;
  tags: string[];
  status: ImportJobStatus;
  progress: number; // 0 to 100
  currentStage?: string;
  error?: string;
  retryCount: number;
  videoRecord?: Video;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ImportBatch {
  id: string;
  userId: string;
  pageId: string;
  source: string;
  title: string;
  total: number;
  completed: number;
  processing: number;
  queued: number;
  failed: number;
  cancelled: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  progress: number; // 0 to 100
  tags: string[];
  authorizationConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  items?: ImportJob[];
}

export interface MinerSearchItem {
  id: string;
  source: string;
  sourceContentId: string;
  title: string;
  author?: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  publishedAt?: string;
  isAvailableForImport: boolean;
  alreadyInLibrary?: boolean;
  existingVideoId?: string;
  license?: string;
  aspectRatio?: string;
}

export interface MinerSearchResult {
  items: MinerSearchItem[];
  totalResults?: number;
  nextPageToken?: string;
  configured: boolean;
  message?: string;
  source: string;
}
