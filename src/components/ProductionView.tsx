import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Film, 
  LayoutTemplate, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  X, 
  RefreshCw, 
  Download, 
  ArrowRight, 
  ArrowLeft,
  Search,
  Check,
  Ban,
  Archive,
  Copy,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Production, ProductionItem, Video, Template, Page } from '../types/index.js';
import { ProductionService } from '../services/ProductionService';

interface ProductionViewProps {
  productions: Production[];
  videos: Video[];
  templates: Template[];
  pages: Page[];
  selectedPageId: string;
  selectedProductionId?: string | null;
  onSelectProduction: (id: string | null) => void;
  onCreateProduction: (data: { 
    pageId: string; 
    templateId: string; 
    videoIds: string[]; 
    title?: string;
    audioMode?: 'ORIGINAL' | 'MUTE';
  }) => Promise<void>;
  onCancelProduction: (id: string) => Promise<void>;
  onRetryProduction: (id: string) => Promise<void>;
  onGenerateZip: (productionId: string) => Promise<void>;
  onPreviewVideo: (video: Partial<Video>) => void;
  preselectedVideoIds?: string[];
  preselectedTemplateId?: string;
  isWizardOpenDefault?: boolean;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  productions,
  videos,
  templates,
  pages,
  selectedPageId,
  selectedProductionId,
  onSelectProduction,
  onCreateProduction,
  onCancelProduction,
  onRetryProduction,
  onGenerateZip,
  onPreviewVideo,
  preselectedVideoIds = [],
  preselectedTemplateId,
  isWizardOpenDefault = false
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(isWizardOpenDefault);
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Wizard state
  const [wizardPageId, setWizardPageId] = useState<string>(selectedPageId || pages[0]?.id || '');
  const [wizardTemplateId, setWizardTemplateId] = useState<string>(preselectedTemplateId || templates[0]?.id || '');
  const [wizardSelectedVideoIds, setWizardSelectedVideoIds] = useState<Set<string>>(new Set(preselectedVideoIds));
  const [wizardAudioMode, setWizardAudioMode] = useState<'ORIGINAL' | 'MUTE'>('ORIGINAL');
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // When props update preselection
  useEffect(() => {
    if (preselectedVideoIds.length > 0) {
      setWizardSelectedVideoIds(new Set(preselectedVideoIds));
      setIsWizardOpen(true);
      setWizardStep(1); // pick template for the preselected videos
    }
  }, [preselectedVideoIds]);

  useEffect(() => {
    if (preselectedTemplateId) {
      setWizardTemplateId(preselectedTemplateId);
      setIsWizardOpen(true);
      setWizardStep(2); // template is set, pick videos
    }
  }, [preselectedTemplateId]);

  // Selected production details
  const activeProd = productions.find(p => p.id === selectedProductionId) || productions[0];
  const [prodDetails, setProdDetails] = useState<Production | null>(null);

  // Fetch live production details when selected
  useEffect(() => {
    if (!activeProd) return;
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        const data = await ProductionService.getProduction(activeProd.id);
        if (isMounted && data) {
          setProdDetails(data);
        }
      } catch (err) {
        console.error('Error fetching live production status:', err);
      }
    };

    fetchDetails();
    const timer = setInterval(fetchDetails, 1500); // live polling for background worker updates
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeProd?.id]);

  // Wizard filtering
  const availableTemplates = templates.filter(t => {
    if (wizardPageId && t.pageId && t.pageId !== wizardPageId) return false;
    return true;
  });

  const availableVideos = videos.filter(v => {
    if (wizardPageId && v.pageId && v.pageId !== wizardPageId) return false;
    if (videoSearch.trim() && !v.name.toLowerCase().includes(videoSearch.toLowerCase())) return false;
    return true;
  });

  // Template validation: supports both element-based placeholders AND direct image template videoArea
  const selectedTemplate = templates.find(t => t.id === wizardTemplateId) || availableTemplates[0];
  const templatePlaceholders = selectedTemplate?.elements?.filter(
    el => el.type === 'video_placeholder' || (el as any).type === 'VIDEO_PLACEHOLDER'
  ) || [];
  const hasVideoPlaceholder = templatePlaceholders.length > 0 || !!selectedTemplate?.videoArea || !!selectedTemplate?.backgroundImageUrl;

  const handleToggleSelectVideo = (id: string) => {
    const next = new Set(wizardSelectedVideoIds);
    if (next.has(id)) {
      next.delete(id);
      console.log(`[PRODUCTION 01] Deseleção de vídeo: ${id} (Restantes selecionados: ${next.size})`);
    } else {
      next.add(id);
      console.log(`[PRODUCTION 01] Seleção de vídeo: ${id} (Total selecionados: ${next.size})`);
    }
    setWizardSelectedVideoIds(next);
  };

  const handleSelectAllVideos = () => {
    if (wizardSelectedVideoIds.size === availableVideos.length && availableVideos.length > 0) {
      setWizardSelectedVideoIds(new Set());
      console.log('[PRODUCTION 01] Desmarcar todos os vídeos');
    } else {
      const allIds = new Set(availableVideos.map(v => v.id));
      setWizardSelectedVideoIds(allIds);
      console.log(`[PRODUCTION 01] Seleção em massa de vídeos: ${allIds.size} selecionados`);
    }
  };

  const handleSelectTemplate = (tplId: string) => {
    const tpl = templates.find(t => t.id === tplId);
    console.log(`[PRODUCTION 02] Seleção de template: ${tplId} ("${tpl?.name || ''}")`);
    setWizardTemplateId(tplId);
  };

  const handleLaunchProduction = async () => {
    if (!wizardTemplateId || wizardSelectedVideoIds.size === 0 || !hasVideoPlaceholder) return;
    setIsSubmitting(true);
    const videoIdsList = Array.from(wizardSelectedVideoIds);
    console.log(`[PRODUCTION 03] Início da produção: template=${wizardTemplateId}, totalVideos=${videoIdsList.length}, audioMode=${wizardAudioMode}`);

    try {
      await onCreateProduction({
        pageId: wizardPageId,
        templateId: wizardTemplateId,
        videoIds: videoIdsList,
        title: wizardTitle.trim() || undefined,
        audioMode: wizardAudioMode
      });
      setIsWizardOpen(false);
      setWizardStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleRetrySingleJob = async (jobId: string) => {
    if (!prodDetails) return;
    await ProductionService.retryJob(prodDetails.id, jobId);
    const updated = await ProductionService.getProduction(prodDetails.id);
    if (updated) setProdDetails(updated);
  };

  // Helper to format elapsed time
  const formatElapsedTime = (start?: string, end?: string) => {
    if (!start) return '-';
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const diffSec = Math.max(0, Math.round((e - s) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Produção em Massa & Fila</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Renderize vídeos em lote aplicando templates visuais com o motor FFmpeg de processamento em segundo plano.
          </p>
        </div>

        <button
          id="btn-open-production-wizard"
          onClick={() => {
            setIsWizardOpen(true);
            setWizardStep(1);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ NOVA PRODUÇÃO EM MASSA</span>
        </button>
      </div>

      {/* Main Layout: Left List of Batches, Right Detailed Inspector */}
      {productions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11131e] border border-[#202538] text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#171a28] border border-[#252c42] flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Cpu className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma produção registrada</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Inicie um novo lote de renderização combinando seus vídeos da biblioteca com o template desejado.
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-900/40"
          >
            Iniciar Primeira Produção
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Productions */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
              Lotes de Produção ({productions.length})
            </h2>

            <div className="space-y-2.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {productions.map(prod => {
                const isSelected = activeProd?.id === prod.id;
                const statusUpper = (prod.status || 'queued').toUpperCase();

                return (
                  <div
                    key={prod.id}
                    onClick={() => onSelectProduction(prod.id)}
                    className={`
                      p-4 rounded-xl border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-[#151928] border-purple-500/80 shadow-md ring-1 ring-purple-500/30' 
                        : 'bg-[#111420] border-[#202538] hover:border-[#2d344d]'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white truncate max-w-[170px]">
                        {prod.title || prod.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        statusUpper === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        statusUpper === 'PROCESSING' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                        statusUpper === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300' :
                        statusUpper === 'FAILED' ? 'bg-rose-500/20 text-rose-400' :
                        statusUpper === 'CANCELLED' ? 'bg-slate-800 text-slate-400' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {statusUpper === 'PROCESSING' ? 'PROCESSANDO' :
                         statusUpper === 'COMPLETED' ? 'CONCLUÍDO' :
                         statusUpper === 'PARTIAL' ? 'PARCIAL' :
                         statusUpper === 'CANCELLED' ? 'CANCELADO' :
                         statusUpper === 'FAILED' ? 'FALHA' : 'NA FILA'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Template: <strong className="text-slate-300">{prod.templateName}</strong>
                    </p>

                    {/* Mini Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>Progresso Real</span>
                        <span className="font-bold text-white">{prod.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1e2335] overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-purple-500 to-indigo-400 transition-all duration-300"
                          style={{ width: `${prod.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-[#1c2133]">
                      <span>{prod.completed || prod.completedJobs || 0}/{prod.total || prod.totalJobs || 0} vídeos</span>
                      <span>{new Date(prod.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: Detailed Live Inspector & Items Grid */}
          <div className="lg:col-span-2 space-y-4">
            {prodDetails && (
              <div className="p-6 rounded-2xl bg-[#111420] border border-[#23293e] space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-extrabold text-white">{prodDetails.title || prodDetails.name}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                        {prodDetails.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Template aplicado: <strong className="text-purple-300">{prodDetails.templateName}</strong>
                      {prodDetails.audioMode && (
                        <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1b2033] text-slate-300">
                          Áudio: {prodDetails.audioMode}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(prodDetails.status === 'processing' || prodDetails.status === 'queued') && (
                      <button
                        onClick={() => onCancelProduction(prodDetails.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancelar Produção</span>
                      </button>
                    )}

                    {(prodDetails.failed > 0 || prodDetails.status === 'failed' || prodDetails.status === 'partial') && (
                      <button
                        onClick={() => onRetryProduction(prodDetails.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#1a1f33] border border-[#2b3350] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Reprocessar Falhas ({prodDetails.failed})</span>
                      </button>
                    )}

                    {prodDetails.completed > 0 && (
                      <button
                        onClick={() => onGenerateZip(prodDetails.id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Baixar Todos (ZIP) ({prodDetails.completed})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Metric Bar & Live Timers */}
                <div className="p-4 rounded-xl bg-[#0c0e16] border border-[#1d2235] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Progresso Geral da Renderização</span>
                    <span className="font-mono font-bold text-purple-300 text-sm">{prodDetails.progress}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#181d2e] overflow-hidden">
                    <div 
                      className="h-full bg-linear-to-r from-purple-600 via-indigo-500 to-sky-400 transition-all duration-300"
                      style={{ width: `${prodDetails.progress}%` }}
                    />
                  </div>

                  {/* Timestamps */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Iniciado: {prodDetails.startedAt ? new Date(prodDetails.startedAt).toLocaleTimeString() : '-'}
                    </span>
                    <span>
                      Tempo Decorrido: <strong className="text-purple-300">{formatElapsedTime(prodDetails.startedAt, prodDetails.completedAt)}</strong>
                    </span>
                    <span>
                      Concluído: {prodDetails.completedAt ? new Date(prodDetails.completedAt).toLocaleTimeString() : 'Em andamento...'}
                    </span>
                  </div>

                  {/* 6 Stats Blocks */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center pt-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-[#131624]">
                      <span className="block text-[10px] text-slate-400">TOTAL</span>
                      <strong className="text-white text-sm">{prodDetails.total}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#131624]">
                      <span className="block text-[10px] text-emerald-400">CONCLUÍDOS</span>
                      <strong className="text-emerald-300 text-sm">{prodDetails.completed}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#131624]">
                      <span className="block text-[10px] text-purple-400">PROCESSANDO</span>
                      <strong className="text-purple-300 text-sm">{prodDetails.processing}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#131624]">
                      <span className="block text-[10px] text-blue-400">NA FILA</span>
                      <strong className="text-blue-300 text-sm">{prodDetails.queued}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#131624]">
                      <span className="block text-[10px] text-rose-400">FALHAS</span>
                      <strong className="text-rose-400 text-sm">{prodDetails.failed}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[#131624]">
                      <span className="block text-[10px] text-slate-500">CANCELADOS</span>
                      <strong className="text-slate-400 text-sm">{prodDetails.cancelled || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Items List / Table */}
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Vídeos Individuais ({prodDetails.items?.length || 0})
                  </h3>

                  <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                    {prodDetails.items?.map((item, idx) => (
                      <div 
                        key={item.id}
                        className="p-3 rounded-xl bg-[#141726] border border-[#21273d] flex items-center justify-between gap-3 hover:border-purple-500/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-slate-500 w-5">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>

                          <div className="relative w-10 h-16 rounded-lg bg-black/60 overflow-hidden shrink-0 border border-[#262d44]">
                            {item.thumbnailUrl && (
                              <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            )}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => onPreviewVideo({
                                  name: item.videoName,
                                  originalUrl: item.outputVideoUrl || item.outputUrl || item.originalVideoUrl,
                                  thumbnailUrl: item.thumbnailUrl
                                })}
                                className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white cursor-pointer"
                                title="Visualizar Vídeo Renderizado"
                              >
                                <Play className="w-4 h-4 fill-white" />
                              </button>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{item.videoName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                              <span>{Math.round(item.duration || 0)}s</span>
                              {item.fileSize && item.fileSize > 0 && (
                                <span>• {(item.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                              )}
                              {item.error && (
                                <span className="text-rose-400 font-sans truncate max-w-[220px]" title={item.error}>
                                  • {item.error}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Action Controls */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {item.status === 'processing' && (
                            <div className="w-20 text-right">
                              <span className="text-[10px] font-mono text-purple-400 font-bold block">{item.progress}%</span>
                              <div className="w-full h-1 bg-[#20263c] rounded-full overflow-hidden mt-0.5">
                                <div className="h-full bg-purple-500" style={{ width: `${item.progress}%` }} />
                              </div>
                            </div>
                          )}

                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.status === 'processing' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                            item.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                            item.status === 'cancelled' ? 'bg-slate-800 text-slate-400' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {item.status}
                          </span>

                          {/* Action: Copy Link */}
                          {(item.outputVideoUrl || item.outputUrl) && (
                            <button
                              onClick={() => handleCopyLink(item.outputVideoUrl || item.outputUrl || '', item.id)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1f253a] rounded transition-colors cursor-pointer"
                              title="Copiar URL do vídeo"
                            >
                              {copyFeedback === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Action: Direct Download */}
                          {(item.outputVideoUrl || item.outputUrl) && (
                            <a
                              href={item.outputVideoUrl || item.outputUrl}
                              download
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1f253a] rounded transition-colors"
                              title="Baixar Vídeo Renderizado"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Action: Retry failed job */}
                          {item.status === 'failed' && (
                            <button
                              onClick={() => handleRetrySingleJob(item.id)}
                              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-[#1f253a] rounded transition-colors cursor-pointer"
                              title="Reprocessar este vídeo"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3-STEP WIZARD MODAL (PROMPT 3 COMPLIANT) */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#111420] border border-[#272d42] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            {/* Wizard Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2335]">
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">
                  Assistente de Produção em Massa
                </span>
                <h2 className="text-base font-extrabold text-white">
                  {wizardStep === 1 && 'Etapa 1: Selecionar Template Visual'}
                  {wizardStep === 2 && 'Etapa 2: Selecionar Vídeos da Biblioteca'}
                  {wizardStep === 3 && 'Etapa 3: Resumo & Configurações da Produção'}
                </h2>
              </div>
              <button 
                onClick={() => setIsWizardOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#1e2335]">
              {[1, 2, 3].map(step => (
                <div 
                  key={step} 
                  className={`h-1.5 rounded-full transition-all ${
                    step <= wizardStep ? 'bg-purple-500' : 'bg-[#1e2436]'
                  }`} 
                />
              ))}
            </div>

            {/* Wizard Content Body */}
            <div className="flex-1 overflow-y-auto py-4">
              
              {/* STEP 1: SELECT TEMPLATE WITH VALIDATION */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Selecione o template visual que servirá de base para o enquadramento e overlays dos vídeos:
                  </p>

                  {availableTemplates.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#151928] border border-[#22283d] text-center">
                      <LayoutTemplate className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-xs text-white font-bold">Nenhum template encontrado</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Crie um template na Central de Templates antes de iniciar a produção em massa.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {availableTemplates.map(t => {
                        const isSel = wizardTemplateId === t.id;
                        const hasPlaceholder = t.elements.some(
                          el => el.type === 'video_placeholder' || (el as any).type === 'VIDEO_PLACEHOLDER'
                        ) || !!t.videoArea || !!t.backgroundImageUrl;

                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTemplate(t.id)}
                            className={`
                              p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between
                              ${isSel ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500' : 'bg-[#151928] border-[#22283d] hover:bg-[#1a1f33]'}
                            `}
                          >
                            <div 
                              style={{ background: t.background }} 
                              className="aspect-9/16 max-h-[140px] rounded-lg border border-[#2b334d] flex items-center justify-center mb-2 overflow-hidden relative shadow-inner"
                            >
                              <span className="text-[10px] font-mono text-purple-300 font-bold uppercase truncate px-2">
                                {t.name}
                              </span>
                              {isSel && <Check className="w-5 h-5 text-purple-400 absolute top-2 right-2 bg-black/60 rounded-full p-0.5" />}
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-white truncate">{t.name}</h4>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                                <span>{t.aspectRatio}</span>
                                <span className={hasPlaceholder ? 'text-emerald-400' : 'text-amber-400'}>
                                  {hasPlaceholder ? '✓ Área de vídeo' : '⚠️ Sem área'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Template Validation Warning Banner (Prompt 3 Section 4) */}
                  {selectedTemplate && !hasVideoPlaceholder && (
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-300">Este template não possui uma área de vídeo</h4>
                        <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                          Para renderizar vídeos em massa, o template selecionado precisa conter pelo menos um elemento do tipo <strong>Área de Vídeo (Placeholder)</strong>. Abra este template no Editor Visual e adicione uma área de vídeo antes de prosseguir.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SELECT VIDEOS FROM LIBRARY */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filtrar vídeos por nome..."
                        value={videoSearch}
                        onChange={e => setVideoSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0c0e17] border border-[#21273c] text-xs text-white focus:outline-hidden"
                      />
                    </div>
                    <button
                      onClick={handleSelectAllVideos}
                      className="px-3 py-1.5 rounded-lg bg-[#181d2e] border border-[#262e47] text-xs font-semibold text-purple-300 hover:text-white cursor-pointer"
                    >
                      {wizardSelectedVideoIds.size === availableVideos.length && availableVideos.length > 0
                        ? 'Desmarcar Todos'
                        : `Selecionar Todos (${availableVideos.length})`}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>
                      Selecionados: <strong className="text-purple-300 font-mono text-sm">{wizardSelectedVideoIds.size}</strong> vídeos
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Total disponíveis: {availableVideos.length}
                    </span>
                  </div>

                  {availableVideos.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#151928] border border-[#22283d] text-center">
                      <Film className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs text-white font-bold">Nenhum vídeo disponível</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Envie vídeos na aba Vídeos para que apareçam disponíveis para produção.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-1">
                      {availableVideos.map(v => {
                        const isSel = wizardSelectedVideoIds.has(v.id);
                        return (
                          <div
                            key={v.id}
                            onClick={() => handleToggleSelectVideo(v.id)}
                            className={`
                              p-2 rounded-xl border cursor-pointer flex flex-col justify-between transition-all
                              ${isSel ? 'bg-purple-600/25 border-purple-500' : 'bg-[#151928] border-[#22283d] hover:border-[#333b59]'}
                            `}
                          >
                            <div className="relative aspect-9/16 rounded-lg bg-black/50 overflow-hidden mb-1.5 border border-[#262d44]">
                              <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              {isSel && (
                                <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                                  <Check className="w-6 h-6 text-white bg-purple-600 rounded-full p-1" />
                                </div>
                              )}
                              <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-white">
                                {Math.round(v.duration)}s
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-200 truncate">{v.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SUMMARY & CONFIGURATION (PROMPT 3 SECTION 6) */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0d101a] border border-[#20263b] space-y-3">
                    <h3 className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                      Resumo da Produção
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#141827]">
                        <span className="text-[10px] text-slate-400 block">Template</span>
                        <strong className="text-white truncate block">{selectedTemplate?.name || 'Não selecionado'}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#141827]">
                        <span className="text-[10px] text-slate-400 block">Formato / Resolução</span>
                        <strong className="text-white block font-mono">
                          {selectedTemplate?.width || 1080} × {selectedTemplate?.height || 1920}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#141827]">
                        <span className="text-[10px] text-slate-400 block">Áreas de Vídeo</span>
                        <strong className="text-emerald-400 block font-mono">
                          {templatePlaceholders.length} área(s)
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#141827]">
                        <span className="text-[10px] text-slate-400 block">Vídeos a Renderizar</span>
                        <strong className="text-purple-400 block font-mono text-sm">
                          {wizardSelectedVideoIds.size} vídeos
                        </strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 <strong>Estimativa:</strong> Os vídeos serão processados em fila com concorrência controlada no servidor. O progresso será exibido em tempo real e você poderá fechar o navegador sem perder o andamento.
                    </p>
                  </div>

                  {/* Audio Configuration */}
                  <div className="p-4 rounded-xl bg-[#141827] border border-[#23293e] space-y-2">
                    <h4 className="text-xs font-bold text-white">Configuração de Áudio</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setWizardAudioMode('ORIGINAL')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                          wizardAudioMode === 'ORIGINAL'
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-[#111420] border-[#22283d] text-slate-400 hover:bg-[#161a2b]'
                        }`}
                      >
                        <Volume2 className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Áudio Original</p>
                          <p className="text-[10px] text-slate-400">Preserva o som e trilha dos vídeos fonte</p>
                        </div>
                      </div>

                      <div
                        onClick={() => setWizardAudioMode('MUTE')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                          wizardAudioMode === 'MUTE'
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-[#111420] border-[#22283d] text-slate-400 hover:bg-[#161a2b]'
                        }`}
                      >
                        <VolumeX className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Mudo (MUTE)</p>
                          <p className="text-[10px] text-slate-400">Remove todo o áudio dos vídeos gerados</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Title input */}
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-semibold block">Título do Lote (Opcional):</label>
                    <input
                      type="text"
                      placeholder="Ex: Produção #01 - Fatos Curiosos"
                      value={wizardTitle}
                      onChange={e => setWizardTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0c0e17] border border-[#242b42] text-white text-xs font-bold focus:outline-hidden focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1e2335]">
              <button
                type="button"
                onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                disabled={wizardStep === 1}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-2">
                {wizardStep < 3 ? (
                  <button
                    type="button"
                    disabled={
                      (wizardStep === 1 && (!selectedTemplate || !hasVideoPlaceholder)) ||
                      (wizardStep === 2 && wizardSelectedVideoIds.size === 0)
                    }
                    onClick={() => {
                      if (wizardStep === 1 && !hasVideoPlaceholder) {
                        return;
                      }
                      if (wizardStep === 2 && wizardSelectedVideoIds.size === 0) {
                        alert('Selecione pelo menos um vídeo para continuar');
                        return;
                      }
                      setWizardStep(s => s + 1);
                    }}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <span>Próximo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-confirm-start-production"
                    onClick={handleLaunchProduction}
                    disabled={isSubmitting || wizardSelectedVideoIds.size === 0 || !hasVideoPlaceholder}
                    className="px-6 py-2 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-black text-white shadow-lg shadow-purple-900/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isSubmitting ? 'Iniciando Fila...' : `INICIAR PRODUÇÃO (${wizardSelectedVideoIds.size} VÍDEOS)`}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
