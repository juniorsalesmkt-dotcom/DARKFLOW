export type PlatformType = 'instagram' | 'tiktok' | 'youtube_shorts' | 'facebook' | 'generic';

export type VideoStatus = 'UPLOADING' | 'READY' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'ARCHIVED' | 'original' | 'queued' | 'processed' | 'error';

export type PageStatus = 'ACTIVE' | 'ARCHIVED';

export type ProductionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ProductionItemStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

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
  fit?: 'cover' | 'contain' | 'fill';
  
  // Specific for 'shape' & 'background'
  fill?: string;
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
  thumbnailUrl: string;
  elements: TemplateElement[];
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
  fileSize?: number;
  duration: number; // in seconds
  width: number;
  height: number;
  platform: PlatformType;
  sourceUrl?: string;
  source: string;
  status: VideoStatus;
  tags: string[];
  sizeBytes: number;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface UploadProgressItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageId: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  videoRecord?: Video;
  downloadUrl?: string;
  cancelFn?: () => void;
}

export interface ProductionItem {
  id: string;
  productionId: string;
  videoId: string;
  videoName: string;
  originalVideoUrl: string;
  thumbnailUrl: string;
  templateId: string;
  status: ProductionItemStatus;
  progress: number; // 0 to 100
  outputPath?: string;
  outputVideoUrl?: string;
  error?: string;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Production {
  id: string;
  userId: string;
  pageId: string;
  templateId: string;
  templateName: string;
  title: string;
  total: number;
  completed: number;
  processing: number;
  queued: number;
  failed: number;
  status: ProductionStatus;
  progress: number; // 0 to 100
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
  source: 'profile' | 'url' | 'hashtag' | 'keyword' | 'busca';
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
