import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  Copy, 
  Edit3, 
  Trash2, 
  Archive, 
  ExternalLink, 
  Layers, 
  Film, 
  Cpu, 
  Check,
  Instagram,
  Share2,
  AlertTriangle,
  ArrowLeft,
  X,
  LayoutTemplate
} from 'lucide-react';
import { Page, PlatformType, Video, Template, Production } from '../types';

interface PagesViewProps {
  pages: Page[];
  selectedPageId: string;
  videos: Video[];
  templates: Template[];
  productions: Production[];
  onSelectActivePage: (id: string) => void;
  onCreatePage: (data: Partial<Page>) => Promise<void>;
  onUpdatePage: (id: string, data: Partial<Page>) => Promise<void>;
  onDuplicatePage: (id: string) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  onArchivePage?: (id: string, archive: boolean) => Promise<void>;
  onNavigateToLibrary: (pageId: string) => void;
  onNavigateToTemplates: (pageId: string) => void;
}

export const PagesView: React.FC<PagesViewProps> = ({
  pages,
  selectedPageId,
  videos,
  templates,
  productions,
  onSelectActivePage,
  onCreatePage,
  onUpdatePage,
  onDuplicatePage,
  onDeletePage,
  onArchivePage,
  onNavigateToLibrary,
  onNavigateToTemplates
}) => {
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [detailedPageId, setDetailedPageId] = useState<string | null>(null);
  const [pageDetailTab, setPageDetailTab] = useState<'OVERVIEW' | 'VIDEOS' | 'TEMPLATES' | 'PRODUCTIONS'>('OVERVIEW');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('instagram');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openNewPageModal = () => {
    setEditingPage(null);
    setName('');
    setUsername('');
    setPlatform('instagram');
    setAvatarUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Page) => {
    setEditingPage(p);
    setName(p.name);
    setUsername(p.username);
    setPlatform(p.platform);
    setAvatarUrl(p.avatarUrl);
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      if (editingPage) {
        await onUpdatePage(editingPage.id, {
          name,
          username: username.startsWith('@') ? username : `@${username}`,
          platform,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          description
        });
      } else {
        await onCreatePage({
          name,
          username: username.startsWith('@') ? username : `@${username}`,
          platform,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          description,
          status: 'ACTIVE'
        });
      }
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPage) return;
    setIsDeleting(true);
    try {
      await onDeletePage(deletingPage.id);
      if (detailedPageId === deletingPage.id) {
        setDetailedPageId(null);
      }
      setDeletingPage(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter pages by Active vs Archived
  const displayedPages = pages.filter(p => {
    if (filterTab === 'ARCHIVED') return p.status === 'ARCHIVED';
    return p.status !== 'ARCHIVED';
  });

  const detailedPage = pages.find(p => p.id === detailedPageId);

  // If viewing a single page detail
  if (detailedPage) {
    const pageVideos = videos.filter(v => v.pageId === detailedPage.id);
    const pageTemplates = templates.filter(t => t.pageId === detailedPage.id);
    const pageProductions = productions.filter(p => p.pageId === detailedPage.id);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Back Button and Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDetailedPageId(null)}
            className="p-2 rounded-xl bg-[#141827] border border-[#232a40] text-slate-400 hover:text-white hover:bg-[#1a2033] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{detailedPage.name}</span>
              <span className="text-xs font-mono text-purple-400 font-semibold">{detailedPage.username}</span>
            </h1>
            <p className="text-xs text-slate-400">
              Gerenciamento isolado do canal ({detailedPage.platform})
            </p>
          </div>
        </div>

        {/* Page Banner Info Card */}
        <div className="p-6 rounded-2xl bg-[#121522] border border-[#23283b] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={detailedPage.avatarUrl}
              alt={detailedPage.name}
              className="w-16 h-16 rounded-full object-cover ring-4 ring-purple-500/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{detailedPage.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase border border-purple-500/30">
                  {detailedPage.platform}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{detailedPage.username}</p>
              {detailedPage.description && (
                <p className="text-xs text-slate-300 mt-2 max-w-xl">{detailedPage.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => openEditModal(detailedPage)}
              className="px-3 py-1.5 rounded-lg bg-[#1a1f33] hover:bg-[#222944] text-xs font-semibold text-slate-200 border border-[#2c3452] flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => onDuplicatePage(detailedPage.id)}
              className="px-3 py-1.5 rounded-lg bg-[#1a1f33] hover:bg-[#222944] text-xs font-semibold text-slate-200 border border-[#2c3452] flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicar</span>
            </button>
            {onArchivePage && (
              <button
                onClick={() => onArchivePage(detailedPage.id, detailedPage.status !== 'ARCHIVED')}
                className="px-3 py-1.5 rounded-lg bg-[#1a1f33] hover:bg-[#222944] text-xs font-semibold text-amber-300 border border-[#2c3452] flex items-center gap-1.5 transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{detailedPage.status === 'ARCHIVED' ? 'Desarquivar' : 'Arquivar'}</span>
              </button>
            )}
            <button
              onClick={() => setDeletingPage(detailedPage)}
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation for Page */}
        <div className="flex border-b border-[#1e2335] space-x-4">
          <button
            onClick={() => setPageDetailTab('OVERVIEW')}
            className={`pb-3 text-xs font-bold transition-colors relative ${
              pageDetailTab === 'OVERVIEW' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            VISÃO GERAL
            {pageDetailTab === 'OVERVIEW' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setPageDetailTab('VIDEOS')}
            className={`pb-3 text-xs font-bold transition-colors relative ${
              pageDetailTab === 'VIDEOS' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            VÍDEOS ({pageVideos.length})
            {pageDetailTab === 'VIDEOS' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setPageDetailTab('TEMPLATES')}
            className={`pb-3 text-xs font-bold transition-colors relative ${
              pageDetailTab === 'TEMPLATES' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            TEMPLATES ({pageTemplates.length})
            {pageDetailTab === 'TEMPLATES' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setPageDetailTab('PRODUCTIONS')}
            className={`pb-3 text-xs font-bold transition-colors relative ${
              pageDetailTab === 'PRODUCTIONS' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            PRODUÇÕES ({pageProductions.length})
            {pageDetailTab === 'PRODUCTIONS' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Contents */}
        {pageDetailTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#121522] border border-[#202538]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Vídeos Importados</span>
                  <p className="text-xl font-extrabold text-white mt-0.5">{pageVideos.length}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToLibrary(detailedPage.id)}
                className="mt-4 w-full py-1.5 rounded-lg bg-[#171b2d] hover:bg-[#1e233b] text-xs font-semibold text-purple-400 transition-colors"
              >
                Ver na Biblioteca →
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#121522] border border-[#202538]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Templates Visuais</span>
                  <p className="text-xl font-extrabold text-white mt-0.5">{pageTemplates.length}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTemplates(detailedPage.id)}
                className="mt-4 w-full py-1.5 rounded-lg bg-[#171b2d] hover:bg-[#1e233b] text-xs font-semibold text-purple-400 transition-colors"
              >
                Gerenciar Templates →
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#121522] border border-[#202538]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Lotes de Produção</span>
                  <p className="text-xl font-extrabold text-white mt-0.5">{pageProductions.length}</p>
                </div>
              </div>
              <div className="mt-4 text-[11px] text-slate-400 font-mono py-1.5 text-center">
                Módulo Fila de Produção
              </div>
            </div>
          </div>
        )}

        {pageDetailTab === 'VIDEOS' && (
          <div className="space-y-4">
            {pageVideos.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#10131d] border border-[#1f2437] text-center">
                <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white">Nenhum vídeo vinculado a esta página</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Importe vídeos diretamente na biblioteca selecionando esta página como destino.
                </p>
                <button
                  onClick={() => onNavigateToLibrary(detailedPage.id)}
                  className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg"
                >
                  Ir para a Biblioteca
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {pageVideos.map(v => (
                  <div key={v.id} className="rounded-xl bg-[#121522] border border-[#202538] overflow-hidden">
                    <img src={v.thumbnailUrl || ''} alt={v.name} className="w-full aspect-9/16 object-cover bg-slate-950" />
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-slate-200 truncate">{v.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{v.status || 'READY'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pageDetailTab === 'TEMPLATES' && (
          <div className="p-8 rounded-2xl bg-[#10131d] border border-[#1f2437] text-center">
            <LayoutTemplate className="w-8 h-8 text-purple-400/80 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">Templates da Página</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              O editor visual avançado de templates com áreas dinâmicas e posicionamento livre será ativado no próximo estágio (Prompt 2).
            </p>
          </div>
        )}

        {pageDetailTab === 'PRODUCTIONS' && (
          <div className="p-8 rounded-2xl bg-[#10131d] border border-[#1f2437] text-center">
            <Cpu className="w-8 h-8 text-sky-400/80 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">Fila de Produção da Página</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              O pipeline de renderização em massa com fila paralela e downloads ZIP será ativado no próximo estágio (Prompt 3).
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Minhas Páginas</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Gerencie múltiplos canais e perfis com isolamento completo de arquivos e produções.
          </p>
        </div>

        <button
          id="btn-new-page"
          onClick={openNewPageModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ NOVA PÁGINA</span>
        </button>
      </div>

      {/* Tabs Filter: Ativas vs Arquivadas */}
      <div className="flex items-center gap-2 border-b border-[#1e2335] pb-2">
        <button
          onClick={() => setFilterTab('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'ACTIVE'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-[#141827]'
          }`}
        >
          Páginas Ativas ({pages.filter(p => p.status !== 'ARCHIVED').length})
        </button>

        <button
          onClick={() => setFilterTab('ARCHIVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'ARCHIVED'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-[#141827]'
          }`}
        >
          Arquivadas ({pages.filter(p => p.status === 'ARCHIVED').length})
        </button>
      </div>

      {/* Empty State */}
      {displayedPages.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#10131d] border border-[#1f2437] text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#161a29] border border-[#232a40] flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Globe className="w-7 h-7 text-indigo-400/80" />
          </div>
          <h3 className="text-base font-bold text-white">
            {filterTab === 'ARCHIVED' ? 'Nenhuma página arquivada' : 'Nenhuma página criada ainda'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {filterTab === 'ARCHIVED'
              ? 'Páginas que forem arquivadas serão listadas nesta aba para restauração segura.'
              : 'Crie sua primeira página para organizar vídeos, templates e produções.'}
          </p>
          {filterTab === 'ACTIVE' && (
            <div className="mt-5">
              <button
                onClick={openNewPageModal}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/40"
              >
                + Criar Primeira Página
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Pages Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedPages.map(page => {
            const isActive = selectedPageId === page.id;
            const pageVideosCount = videos.filter(v => v.pageId === page.id).length;
            const pageTemplatesCount = templates.filter(t => t.pageId === page.id).length;
            const pageProductionsCount = productions.filter(p => p.pageId === page.id).length;

            return (
              <div
                key={page.id}
                className={`
                  p-5 rounded-2xl bg-[#121522] border transition-all duration-200 flex flex-col justify-between
                  ${isActive ? 'border-purple-500/80 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/40' : 'border-[#22273b] hover:border-[#333a55]'}
                `}
              >
                <div>
                  {/* Top Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={page.avatarUrl} 
                        alt={page.name} 
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/30 shrink-0"
                      />
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight">{page.name}</h2>
                        <p className="text-xs font-mono text-purple-400 font-semibold">{page.username}</p>
                        <span className="inline-block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {page.platform}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase flex items-center gap-1">
                        <Check className="w-3 h-3 text-purple-400" />
                        Ativa
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectActivePage(page.id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-[#181c2d] border border-[#252b42] transition-colors"
                      >
                        Selecionar
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  {page.description && (
                    <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                      {page.description}
                    </p>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-[#0d101a] border border-[#1b2032] text-center">
                    <button 
                      onClick={() => onNavigateToTemplates(page.id)}
                      className="hover:bg-[#151928] p-1.5 rounded-lg transition-colors text-left"
                    >
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Templates</span>
                      <span className="text-sm font-extrabold text-purple-300">{pageTemplatesCount}</span>
                    </button>

                    <button 
                      onClick={() => onNavigateToLibrary(page.id)}
                      className="hover:bg-[#151928] p-1.5 rounded-lg transition-colors text-left"
                    >
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Vídeos</span>
                      <span className="text-sm font-extrabold text-indigo-300">{pageVideosCount}</span>
                    </button>

                    <div className="p-1.5 text-left">
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Produções</span>
                      <span className="text-sm font-extrabold text-sky-300">{pageProductionsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-[#1d2235] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(page)}
                      title="Editar Página"
                      className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-[#1a1f33] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicatePage(page.id)}
                      title="Duplicar Página"
                      className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-[#1a1f33] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {onArchivePage && (
                      <button
                        onClick={() => onArchivePage(page.id, page.status !== 'ARCHIVED')}
                        title={page.status === 'ARCHIVED' ? 'Desarquivar' : 'Arquivar'}
                        className="p-1.5 text-slate-400 hover:text-amber-300 rounded-md hover:bg-[#1a1f33] transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingPage(page)}
                      title="Excluir Página"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-[#1a1f33] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setDetailedPageId(page.id)}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>ABRIR</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova / Editar Página */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121522] border border-[#262c42] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-4">
              {editingPage ? 'Editar Página' : 'Criar Nova Página'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Canal/Página *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Curiosidades Dark"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0e17] border border-[#23283c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">@ de Usuário</label>
                <input
                  type="text"
                  placeholder="Ex: @curiosidadesdark"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0e17] border border-[#23283c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plataforma Principal</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as PlatformType)}
                  className="w-full px-3 py-2 bg-[#0c0e17] border border-[#23283c] rounded-lg text-xs text-white focus:outline-hidden focus:border-purple-500"
                >
                  <option value="instagram">Instagram Reels</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube_shorts">YouTube Shorts</option>
                  <option value="generic">Genérico / Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL da Imagem / Avatar</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0e17] border border-[#23283c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descrição Breve</label>
                <textarea
                  rows={2}
                  placeholder="Tema do canal, nicho ou notas de produção..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0c0e17] border border-[#23283c] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2335]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingPage ? 'Salvar Alterações' : 'Criar Página'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121522] border border-[#2d2128] rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Excluir Página</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Deseja realmente excluir a página <strong className="text-white">"{deletingPage.name}"</strong>? Os dados vinculados deixarão de ser associados.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button 
                onClick={() => setDeletingPage(null)} 
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete} 
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-900/40 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
