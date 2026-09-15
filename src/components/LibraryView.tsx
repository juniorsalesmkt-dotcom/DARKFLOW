import React, { useState, useMemo } from 'react';
import { 
  Film, 
  UploadCloud, 
  Trash2, 
  Tag as TagIcon, 
  FolderInput, 
  Play, 
  Sparkles, 
  Search, 
  Filter, 
  Grid, 
  List, 
  CheckSquare, 
  Square, 
  Clock, 
  Download, 
  Plus,
  RefreshCw,
  X,
  Eye,
  Archive,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Edit2
} from 'lucide-react';
import { Video, Page, Tag } from '../types';
import { VideoMetadataService } from '../services/VideoMetadataService';

interface LibraryViewProps {
  videos: Video[];
  pages: Page[];
  selectedPageId: string;
  tags: Tag[];
  onOpenUploadModal: () => void;
  onBatchDelete: (ids: string[]) => Promise<void>;
  onBatchTag: (ids: string[], tags: string[]) => Promise<void>;
  onBatchMove: (ids: string[], targetPageId: string) => Promise<void>;
  onBatchArchive?: (ids: string[]) => Promise<void>;
  onStartProductionWithVideos: (videoIds: string[]) => void;
  onPreviewVideo: (video: Video) => void;
  onUpdateVideo?: (id: string, updates: Partial<Video>) => Promise<void>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  videos,
  pages,
  selectedPageId,
  tags,
  onOpenUploadModal,
  onBatchDelete,
  onBatchTag,
  onBatchMove,
  onBatchArchive,
  onStartProductionWithVideos,
  onPreviewVideo,
  onUpdateVideo
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc' | 'duration_desc' | 'duration_asc'>('recent');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetMovePageId, setTargetMovePageId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [videoToRename, setVideoToRename] = useState<Video | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Filtered & Sorted videos
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      if (selectedPageId && v.pageId !== selectedPageId) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (platformFilter !== 'all' && v.platform !== platformFilter) return false;
      if (tagFilter !== 'all' && !v.tags?.includes(tagFilter)) return false;

      // Duration filter
      if (durationFilter === 'short' && v.duration >= 30) return false;
      if (durationFilter === 'medium' && (v.duration < 30 || v.duration > 60)) return false;
      if (durationFilter === 'long' && v.duration <= 60) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.name.toLowerCase().includes(q);
        const matchTag = v.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchName && !matchTag) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'duration_desc') {
        return (b.duration || 0) - (a.duration || 0);
      }
      if (sortBy === 'duration_asc') {
        return (a.duration || 0) - (b.duration || 0);
      }
      return 0;
    });
  }, [videos, selectedPageId, statusFilter, platformFilter, tagFilter, durationFilter, searchQuery, sortBy]);

  // Paginated videos
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const currentVideos = filteredVideos.slice(startIndex, startIndex + pageSize);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllCurrentPage = () => {
    const allCurrentSelected = currentVideos.every(v => selectedIds.has(v.id));
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      currentVideos.forEach(v => next.delete(v.id));
    } else {
      currentVideos.forEach(v => next.add(v.id));
    }
    setSelectedIds(next);
  };

  const handleSelectEntireFilter = () => {
    if (selectedIds.size === filteredVideos.length && filteredVideos.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map(v => v.id)));
    }
  };

  const confirmDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyTags = async () => {
    if (!tagInput.trim() || selectedIds.size === 0) return;
    const newTags = tagInput.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    await onBatchTag(Array.from(selectedIds), newTags);
    setIsTagModalOpen(false);
    setTagInput('');
  };

  const handleMoveVideos = async () => {
    if (!targetMovePageId || selectedIds.size === 0) return;
    await onBatchMove(Array.from(selectedIds), targetMovePageId);
    setIsMoveModalOpen(false);
    setSelectedIds(new Set());
  };

  const handleArchiveVideos = async () => {
    if (selectedIds.size === 0 || !onBatchArchive) return;
    await onBatchArchive(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleOpenRename = (v: Video) => {
    setVideoToRename(v);
    setRenameInput(v.name);
    setIsRenameModalOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!videoToRename || !renameInput.trim()) return;
    setIsRenaming(true);
    try {
      if (onUpdateVideo) {
        await onUpdateVideo(videoToRename.id, { name: renameInput.trim() });
      }
      setIsRenameModalOpen(false);
      setVideoToRename(null);
    } catch (err) {
      console.error('Error renaming video:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleTagSingleVideo = (v: Video) => {
    setSelectedIds(new Set([v.id]));
    setIsTagModalOpen(true);
  };

  const handleMoveSingleVideo = (v: Video) => {
    setSelectedIds(new Set([v.id]));
    setIsMoveModalOpen(true);
  };

  const handleDeleteSingleVideo = (v: Video) => {
    setSelectedIds(new Set([v.id]));
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Biblioteca de Vídeos</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Mídia original com metadados extraídos automaticamente, organização por página e tags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-open-upload"
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>IMPORTAR VÍDEOS</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#111420] border border-[#1f2438] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="library-search-input"
              type="text"
              placeholder="Buscar por nome ou tag..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#0c0e17] border border-[#23283c] text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#0c0e17] border border-[#23283c] text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 font-medium"
          >
            <option value="all">Status: Todos</option>
            <option value="READY">Pronto (READY)</option>
            <option value="PROCESSING">Processando</option>
            <option value="PROCESSED">Processado</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>

          {/* Duration Filter */}
          <select
            value={durationFilter}
            onChange={e => {
              setDurationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#0c0e17] border border-[#23283c] text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 font-medium"
          >
            <option value="all">Duração: Qualquer</option>
            <option value="short">Curto (&lt; 30s)</option>
            <option value="medium">Médio (30s - 60s)</option>
            <option value="long">Longo (&gt; 60s)</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={e => {
              setPlatformFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#0c0e17] border border-[#23283c] text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 font-medium"
          >
            <option value="all">Plataforma: Todas</option>
            <option value="instagram">Instagram Reels</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube_shorts">YouTube Shorts</option>
            <option value="generic">Genérico</option>
          </select>

          {/* Tag Filter */}
          {tags.length > 0 && (
            <select
              value={tagFilter}
              onChange={e => {
                setTagFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0c0e17] border border-[#23283c] text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 font-medium"
            >
              <option value="all">Tags: Todas</option>
              {tags.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Order Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-[#0c0e17] border border-[#23283c] text-xs text-slate-300 focus:outline-hidden focus:border-purple-500 font-medium"
          >
            <option value="recent">Mais Recentes</option>
            <option value="oldest">Mais Antigos</option>
            <option value="name_asc">Nome (A-Z)</option>
            <option value="name_desc">Nome (Z-A)</option>
            <option value="duration_desc">Maior Duração</option>
            <option value="duration_asc">Menor Duração</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 self-end lg:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg border ${viewMode === 'grid' ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' : 'text-slate-400 border-transparent hover:bg-[#181d2e]'}`}
            title="Visualização em Grade"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg border ${viewMode === 'list' ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' : 'text-slate-400 border-transparent hover:bg-[#181d2e]'}`}
            title="Visualização em Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Actions Bar (when items selected) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#141725] border border-[#242a3e]">
        <div className="flex items-center gap-3">
          <button
            id="btn-select-all"
            onClick={handleSelectAllCurrentPage}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            {currentVideos.length > 0 && currentVideos.every(v => selectedIds.has(v.id)) ? (
              <CheckSquare className="w-4 h-4 text-purple-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>Página Atual ({currentVideos.length})</span>
          </button>

          {filteredVideos.length > currentVideos.length && (
            <button
              onClick={handleSelectEntireFilter}
              className="text-xs text-purple-400 hover:underline font-medium"
            >
              {selectedIds.size === filteredVideos.length ? 'Desmarcar todos' : `Selecionar todos os ${filteredVideos.length} vídeos`}
            </button>
          )}

          <span className="text-xs font-mono text-slate-400">
            • <strong className="text-purple-300">{selectedIds.size}</strong> selecionado(s)
          </span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onStartProductionWithVideos(Array.from(selectedIds))}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRODUZIR ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => setIsTagModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e2336] hover:bg-[#272e45] text-xs font-semibold text-slate-300 border border-[#2d344d] transition-colors"
            >
              <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>TAGS</span>
            </button>

            <button
              onClick={() => setIsMoveModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e2336] hover:bg-[#272e45] text-xs font-semibold text-slate-300 border border-[#2d344d] transition-colors"
            >
              <FolderInput className="w-3.5 h-3.5 text-sky-400" />
              <span>MOVER</span>
            </button>

            {onBatchArchive && (
              <button
                onClick={handleArchiveVideos}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e2336] hover:bg-[#272e45] text-xs font-semibold text-slate-300 border border-[#2d344d] transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>ARQUIVAR</span>
              </button>
            )}

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>EXCLUIR</span>
            </button>
          </div>
        )}
      </div>

      {/* Videos List / Grid */}
      {filteredVideos.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#10131d] border border-[#1f2437] text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#161a29] border border-[#232a40] flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Film className="w-7 h-7 text-indigo-400/80" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum vídeo cadastrado na biblioteca</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Importe vídeos originais (MP4, MOV, WEBM) para começar a automatizar sua produção para as páginas de conteúdo.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={onOpenUploadModal}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/40"
            >
              + Importar Vídeos
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {currentVideos.map(v => {
            const isSelected = selectedIds.has(v.id);
            const pageOfVideo = pages.find(p => p.id === v.pageId);

            return (
              <div
                key={v.id}
                className={`
                  rounded-xl bg-[#121522] border overflow-hidden flex flex-col justify-between transition-all group relative
                  ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-[#21263a] hover:border-[#343b56]'}
                `}
              >
                {/* Thumbnail Header */}
                <div 
                  className="relative aspect-9/16 bg-black/40 overflow-hidden cursor-pointer"
                  onClick={() => onPreviewVideo(v)}
                >
                  {v.thumbnailUrl ? (
                    <img
                      src={v.thumbnailUrl}
                      alt={v.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-[#0d0f17]">
                      <Film className="w-8 h-8" />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Top Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(v.id);
                    }}
                    className="absolute top-2 left-2 p-1 rounded-md bg-black/60 text-white backdrop-blur-xs hover:scale-110 transition-transform"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-semibold text-slate-200">
                    {VideoMetadataService.formatDuration(v.duration || 0)}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      v.status === 'PROCESSED' || v.status === 'processed' ? 'bg-emerald-500/90 text-white' :
                      v.status === 'PROCESSING' || v.status === 'processing' ? 'bg-purple-500/90 text-white animate-pulse' :
                      'bg-slate-800/90 text-slate-300'
                    }`}>
                      {v.status || 'READY'}
                    </span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 flex flex-col gap-2">
                  <div>
                    <p className="text-xs font-bold text-white truncate" title={v.name}>{v.name}</p>
                    
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[100px] text-purple-400 font-sans">
                        {pageOfVideo ? pageOfVideo.name : 'Página'}
                      </span>
                      <span>{v.width}x{v.height} • {VideoMetadataService.formatFileSize(v.sizeBytes || v.fileSize || 0)}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {v.tags && v.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {v.tags.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1d2235] text-purple-300 border border-[#2b324d]">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Video Actions */}
                  <div className="pt-2 border-t border-[#1e2335] flex items-center justify-between text-slate-400">
                    <button
                      type="button"
                      onClick={() => onPreviewVideo(v)}
                      title="Assistir / Preview"
                      className="p-1 hover:text-white hover:bg-[#1a1f33] rounded transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRename(v)}
                      title="Renomear"
                      className="p-1 hover:text-purple-300 hover:bg-[#1a1f33] rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTagSingleVideo(v)}
                      title="Aplicar Tags"
                      className="p-1 hover:text-indigo-300 hover:bg-[#1a1f33] rounded transition-colors"
                    >
                      <TagIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveSingleVideo(v)}
                      title="Mover de Página"
                      className="p-1 hover:text-sky-300 hover:bg-[#1a1f33] rounded transition-colors"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSingleVideo(v)}
                      title="Excluir"
                      className="p-1 hover:text-rose-400 hover:bg-[#1a1f33] rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="rounded-xl bg-[#121522] border border-[#21263a] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e101a] border-b border-[#21263a] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3">Vídeo</th>
                <th className="p-3">Página</th>
                <th className="p-3">Duração</th>
                <th className="p-3">Resolução</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tags</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2338]">
              {currentVideos.map(v => {
                const isSelected = selectedIds.has(v.id);
                const pageOfVideo = pages.find(p => p.id === v.pageId);

                return (
                  <tr key={v.id} className="hover:bg-[#161a2a] transition-colors">
                    <td className="p-3">
                      <button onClick={() => handleToggleSelect(v.id)}>
                        {isSelected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={v.thumbnailUrl || ''} 
                          alt="" 
                          className="w-8 h-12 rounded object-cover shrink-0 bg-slate-900" 
                        />
                        <div>
                          <p className="font-bold text-slate-200">{v.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{v.source || 'upload_direto'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">
                      {pageOfVideo ? pageOfVideo.name : '—'}
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {VideoMetadataService.formatDuration(v.duration || 0)}
                    </td>
                    <td className="p-3 font-mono text-slate-400">{v.width}x{v.height}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        v.status === 'PROCESSED' || v.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {v.status || 'READY'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {v.tags?.map((t, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded text-[9px] bg-[#1d2235] text-purple-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPreviewVideo(v)}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#20263c] transition-colors"
                          title="Assistir Vídeo"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenRename(v)}
                          className="p-1.5 text-slate-400 hover:text-purple-300 rounded hover:bg-[#20263c] transition-colors"
                          title="Renomear Vídeo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTagSingleVideo(v)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 rounded hover:bg-[#20263c] transition-colors"
                          title="Tags"
                        >
                          <TagIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveSingleVideo(v)}
                          className="p-1.5 text-slate-400 hover:text-sky-300 rounded hover:bg-[#20263c] transition-colors"
                          title="Mover de Página"
                        >
                          <FolderInput className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingleVideo(v)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-[#20263c] transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {filteredVideos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#10131e] border border-[#1d2235] text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Exibindo <strong className="text-white">{startIndex + 1}</strong> a <strong className="text-white">{Math.min(startIndex + pageSize, filteredVideos.length)}</strong> de <strong className="text-white">{filteredVideos.length}</strong> vídeos
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#151928] border border-[#252c42] rounded-md px-2 py-1 text-xs text-white focus:outline-hidden"
            >
              <option value={12}>12 por página</option>
              <option value={24}>24 por página</option>
              <option value={48}>48 por página</option>
            </select>
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="p-1.5 rounded-lg bg-[#141827] border border-[#232a40] text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <React.Fragment key={p}>
                    {prev && p - prev > 1 && <span className="px-1 text-slate-600">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        p === validCurrentPage
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-[#141827] border border-[#232a40] text-slate-300 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="p-1.5 rounded-lg bg-[#141827] border border-[#232a40] text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Tag Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121522] border border-[#262c42] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Adicionar Tags aos Vídeos Selecionados</h3>
            <p className="text-xs text-slate-400 mb-3">Separe múltiplas tags por vírgula (ex: HISTÓRIA, VIRAL, CURIOSIDADES)</p>
            <input
              type="text"
              placeholder="HISTÓRIA, VIRAL..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0d101a] border border-[#252b42] text-white text-xs focus:outline-hidden focus:border-purple-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setIsTagModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleApplyTags} className="px-4 py-1.5 rounded-lg bg-purple-600 text-xs font-bold text-white">Aplicar Tags</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Move Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121522] border border-[#262c42] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Mover Vídeos para Outra Página</h3>
            <p className="text-xs text-slate-400 mb-3">Selecione a página de destino para os {selectedIds.size} vídeos selecionados.</p>
            <select
              value={targetMovePageId}
              onChange={e => setTargetMovePageId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0d101a] border border-[#252b42] text-white text-xs focus:outline-hidden mb-4"
            >
              <option value="">Selecione a página...</option>
              {pages.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.username})</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setIsMoveModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleMoveVideos} disabled={!targetMovePageId} className="px-4 py-1.5 rounded-lg bg-purple-600 text-xs font-bold text-white disabled:opacity-50">Mover</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121522] border border-[#2d2128] rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Você tem certeza de que deseja excluir permanentemente <strong className="text-white">{selectedIds.size}</strong> vídeo(s)? Esta ação é irreversível.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-900/40 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Video Modal */}
      {isRenameModalOpen && videoToRename && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121522] border border-[#262c42] rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Renomear Vídeo</h3>
            <p className="text-xs text-slate-400 mb-3">Defina um novo título descritivo para este vídeo na biblioteca.</p>
            <input
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              placeholder="Nome do vídeo..."
              className="w-full px-3 py-2 rounded-lg bg-[#0d101a] border border-[#252b42] text-white text-xs focus:outline-hidden focus:border-purple-500 mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => { setIsRenameModalOpen(false); setVideoToRename(null); }} 
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmRename} 
                disabled={!renameInput.trim() || isRenaming} 
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white disabled:opacity-50"
              >
                {isRenaming ? 'Salvando...' : 'Salvar Nome'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
