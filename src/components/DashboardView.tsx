import React from 'react';
import { 
  Film, 
  CheckCircle2, 
  Clock, 
  LayoutTemplate, 
  Globe, 
  ArrowUpRight, 
  Play, 
  Cpu, 
  AlertCircle,
  Plus,
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Video, Production, Template, Page, AppNotification } from '../types';
import { VideoMetadataService } from '../services/VideoMetadataService';

interface DashboardViewProps {
  videos: Video[];
  productions: Production[];
  templates: Template[];
  pages: Page[];
  notifications: AppNotification[];
  onNavigateTab: (tab: any) => void;
  onOpenProductionWizard: () => void;
  onOpenUploadModal: () => void;
  onOpenNewPageModal: () => void;
  onPreviewVideo: (video: Video) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  videos,
  productions,
  templates,
  pages,
  notifications,
  onNavigateTab,
  onOpenProductionWizard,
  onOpenUploadModal,
  onOpenNewPageModal,
  onPreviewVideo
}) => {
  // Real Metrics directly from state
  const totalVideos = videos.length;
  const processedVideos = videos.filter(v => v.status === 'PROCESSED' || v.status === 'processed').length;
  
  const activeProductions = productions.filter(p => p.status === 'processing' || p.status === 'queued');
  const queuedCount = activeProductions.reduce((acc, p) => acc + (p.queued + p.processing), 0);
  const totalTemplates = templates.length;
  const totalPages = pages.length;

  const statCards = [
    {
      label: 'TOTAL DE VÍDEOS',
      value: totalVideos,
      subtext: `${processedVideos} processados`,
      icon: <Film className="w-5 h-5 text-indigo-400" />,
      color: 'from-indigo-500/10 to-transparent border-indigo-500/20'
    },
    {
      label: 'VÍDEOS PROCESSADOS',
      value: processedVideos,
      subtext: `${totalVideos > 0 ? Math.round((processedVideos / totalVideos) * 100) : 0}% da biblioteca`,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/10 to-transparent border-emerald-500/20'
    },
    {
      label: 'VÍDEOS NA FILA',
      value: queuedCount,
      subtext: `${activeProductions.length} lote(s) ativo(s)`,
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/10 to-transparent border-amber-500/20'
    },
    {
      label: 'TEMPLATES',
      value: totalTemplates,
      subtext: 'Modelos visuais',
      icon: <LayoutTemplate className="w-5 h-5 text-purple-400" />,
      color: 'from-purple-500/10 to-transparent border-purple-500/20'
    },
    {
      label: 'PÁGINAS ATIVAS',
      value: totalPages,
      subtext: 'Canais isolados',
      icon: <Globe className="w-5 h-5 text-sky-400" />,
      color: 'from-sky-500/10 to-transparent border-sky-500/20'
    }
  ];

  // Most recent videos
  const recentVideos = [...videos]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="p-6 rounded-2xl bg-linear-to-r from-[#171a29] via-[#141624] to-[#0f111c] border border-[#262c42] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
              DARKFLOW CORE
            </span>
            <span className="text-xs text-slate-400">• Painel de Controle</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1.5 tracking-tight">
            Automação de Conteúdo em Massa
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Gerencie múltiplos canais, organize mídia original e produza dezenas de vídeos em lote com renderização automatizada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="dash-btn-upload"
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1d2238] hover:bg-[#252c46] border border-[#2e3757] text-xs font-semibold text-slate-200 transition-all cursor-pointer"
          >
            <Film className="w-4 h-4 text-indigo-400" />
            <span>Importar Vídeos</span>
          </button>

          <button
            id="dash-btn-new-page"
            onClick={onOpenNewPageModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1d2238] hover:bg-[#252c46] border border-[#2e3757] text-xs font-semibold text-slate-200 transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4 text-sky-400" />
            <span>Nova Página</span>
          </button>

          <button
            id="dash-btn-new-production"
            onClick={onOpenProductionWizard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nova Produção</span>
          </button>
        </div>
      </div>

      {/* 5 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-linear-to-b ${stat.color} bg-[#121522] border transition-all duration-200`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                {stat.label}
              </span>
              <div className="p-2 rounded-lg bg-[#161a29] border border-[#21273d]">
                {stat.icon}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {stat.value}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                {stat.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Recent Videos & Active Pages / Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Videos */}
        <div className="lg:col-span-2 rounded-2xl bg-[#121522] border border-[#202538] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Vídeos Recentes</h2>
              <p className="text-xs text-slate-400">Últimos arquivos adicionados à sua biblioteca</p>
            </div>

            <button
              onClick={() => onNavigateTab('BIBLIOTECA')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <span>Ver Biblioteca Completa</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentVideos.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#0c0e17] border border-[#1b1f30] text-center">
              <Film className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-bold">Nenhum vídeo cadastrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Faça o upload do seu primeiro vídeo para começar a criar templates e produções.
              </p>
              <button
                onClick={onOpenUploadModal}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-xs"
              >
                + Importar Vídeos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentVideos.map(video => {
                const page = pages.find(p => p.id === video.pageId);
                return (
                  <div
                    key={video.id}
                    onClick={() => onPreviewVideo(video)}
                    className="group rounded-xl bg-[#0d0f19] border border-[#1e2338] overflow-hidden hover:border-purple-500/50 cursor-pointer transition-all"
                  >
                    <div className="relative aspect-9/16 bg-black/40 overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white">
                        {VideoMetadataService.formatDuration(video.duration || 0)}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold text-slate-200 truncate">{video.name}</p>
                      <p className="text-[10px] text-purple-400 font-mono mt-0.5 truncate">
                        {page ? page.name : 'Página'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Pages & Recent Activity */}
        <div className="space-y-6">
          {/* Active Pages Card */}
          <div className="rounded-2xl bg-[#121522] border border-[#202538] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Canais Ativos</h2>
              <button
                onClick={() => onNavigateTab('PAGINAS')}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                Gerenciar
              </button>
            </div>

            {pages.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#0c0e17] border border-[#1b1f30] text-center">
                <Globe className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-300 font-bold">Nenhuma página criada</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Crie páginas para separar seu conteúdo por nicho ou perfil.
                </p>
                <button
                  onClick={onOpenNewPageModal}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold"
                >
                  + Nova Página
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pages.slice(0, 4).map(page => {
                  const count = videos.filter(v => v.pageId === page.id).length;
                  return (
                    <div
                      key={page.id}
                      onClick={() => onNavigateTab('PAGINAS')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c0e17] border border-[#1a1f33] hover:border-[#2b3352] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={page.avatarUrl}
                          alt={page.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-500/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{page.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">{page.username}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                        {count} vídeos
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent System Notifications */}
          <div className="rounded-2xl bg-[#121522] border border-[#202538] p-5">
            <h2 className="text-base font-bold text-white tracking-tight mb-3">Atividade Recente</h2>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Nenhuma notificação registrada.</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map(n => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-[#0c0e17] border border-[#1b1f30] text-xs">
                    <p className="font-bold text-slate-200">{n.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
