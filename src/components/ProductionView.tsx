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
  Archive
} from 'lucide-react';
import { Production, ProductionItem, Video, Template, Page } from '../types/index.js';

interface ProductionViewProps {
  productions: Production[];
  videos: Video[];
  templates: Template[];
  pages: Page[];
  selectedPageId: string;
  selectedProductionId?: string | null;
  onSelectProduction: (id: string | null) => void;
  onCreateProduction: (data: { pageId: string; templateId: string; videoIds: string[]; title?: string }) => Promise<void>;
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
  const [wizardSelectedVideoIds, setWizardSelectedVideoIds] = useState<Set<string>>(new Set(preselectedVideoIds));
  const [wizardTemplateId, setWizardTemplateId] = useState<string>(preselectedTemplateId || templates[0]?.id || '');
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');

  // When props update preselection
  useEffect(() => {
    if (preselectedVideoIds.length > 0) {
      setWizardSelectedVideoIds(new Set(preselectedVideoIds));
      setIsWizardOpen(true);
      setWizardStep(3); // jump directly to template selection
    }
  }, [preselectedVideoIds]);

  useEffect(() => {
    if (preselectedTemplateId) {
      setWizardTemplateId(preselectedTemplateId);
      setIsWizardOpen(true);
      setWizardStep(2); // jump directly to video selection
    }
  }, [preselectedTemplateId]);

  // Selected production details
  const activeProd = productions.find(p => p.id === selectedProductionId) || productions[0];
  const [prodDetails, setProdDetails] = useState<Production | null>(null);

  // Fetch live production details when selected
  useEffect(() => {
    if (!activeProd) return;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/productions/${activeProd.id}`);
        if (res.ok) {
          const data = await res.json();
          setProdDetails(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();
    const timer = setInterval(fetchDetails, 1500); // live polling for queue updates
    return () => clearInterval(timer);
  }, [activeProd?.id]);

  // Wizard filtering
  const availableVideos = videos.filter(v => {
    if (wizardPageId && v.pageId !== wizardPageId) return false;
    if (videoSearch.trim() && !v.name.toLowerCase().includes(videoSearch.toLowerCase())) return false;
    return true;
  });

  const availableTemplates = templates.filter(t => {
    if (wizardPageId && t.pageId !== wizardPageId) return false;
    return true;
  });

  const handleToggleSelectVideo = (id: string) => {
    const next = new Set(wizardSelectedVideoIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWizardSelectedVideoIds(next);
  };

  const handleSelectAllVideos = () => {
    if (wizardSelectedVideoIds.size === availableVideos.length && availableVideos.length > 0) {
      setWizardSelectedVideoIds(new Set());
    } else {
      setWizardSelectedVideoIds(new Set(availableVideos.map(v => v.id)));
    }
  };

  const handleLaunchProduction = async () => {
    if (!wizardTemplateId || wizardSelectedVideoIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await onCreateProduction({
        pageId: wizardPageId,
        templateId: wizardTemplateId,
        videoIds: Array.from(wizardSelectedVideoIds),
        title: wizardTitle.trim() || undefined
      });
      setIsWizardOpen(false);
      setWizardStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Produção em Massa & Fila</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Renderize dezenas ou centenas de vídeos aplicando seu template visual com processamento em segundo plano.
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

            <div className="space-y-2.5">
              {productions.map(prod => {
                const isSelected = activeProd?.id === prod.id;
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
                      <h3 className="text-xs font-bold text-white truncate max-w-[170px]">{prod.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        prod.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        prod.status === 'processing' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                        prod.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                        prod.status === 'cancelled' ? 'bg-slate-800 text-slate-400' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {prod.status === 'processing' ? 'Renderizando' :
                         prod.status === 'completed' ? 'Concluído' :
                         prod.status === 'cancelled' ? 'Cancelado' :
                         prod.status === 'failed' ? 'Falha' : 'Na Fila'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 truncate">Template: <strong className="text-slate-300">{prod.templateName}</strong></p>

                    {/* Mini Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>Progresso</span>
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
                      <span>{prod.completed}/{prod.total} prontos</span>
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-white">{prodDetails.title}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                        {prodDetails.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Template aplicado: <strong className="text-purple-300">{prodDetails.templateName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {prodDetails.status === 'processing' && (
                      <button
                        onClick={() => onCancelProduction(prodDetails.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                    )}

                    {(prodDetails.status === 'completed' || prodDetails.status === 'failed' || prodDetails.status === 'cancelled') && (
                      <button
                        onClick={() => onRetryProduction(prodDetails.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#1a1f33] border border-[#2b3350] transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Reprocessar Falhas</span>
                      </button>
                    )}

                    {prodDetails.completed > 0 && (
                      <button
                        onClick={() => onGenerateZip(prodDetails.id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Gerar Pacote ZIP ({prodDetails.completed})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Metric Bar */}
                <div className="p-4 rounded-xl bg-[#0c0e16] border border-[#1d2235] space-y-2">
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
                  <div className="grid grid-cols-5 gap-2 text-center pt-2 text-xs font-mono">
                    <div className="p-1.5 rounded bg-[#131624]">
                      <span className="block text-[10px] text-slate-400">TOTAL</span>
                      <strong className="text-white text-sm">{prodDetails.total}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-[#131624]">
                      <span className="block text-[10px] text-emerald-400">CONCLUÍDOS</span>
                      <strong className="text-emerald-300 text-sm">{prodDetails.completed}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-[#131624]">
                      <span className="block text-[10px] text-purple-400">PROCESSANDO</span>
                      <strong className="text-purple-300 text-sm">{prodDetails.processing}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-[#131624]">
                      <span className="block text-[10px] text-amber-400">NA FILA</span>
                      <strong className="text-amber-300 text-sm">{prodDetails.queued}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-[#131624]">
                      <span className="block text-[10px] text-rose-400">ERROS</span>
                      <strong className="text-rose-400 text-sm">{prodDetails.failed}</strong>
                    </div>
                  </div>
                </div>

                {/* Items List / Table */}
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Itens Individuais ({prodDetails.items?.length || 0})
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

                          <div className="relative w-9 h-14 rounded bg-black/60 overflow-hidden shrink-0">
                            {item.thumbnailUrl && (
                              <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            )}
                            {item.status === 'completed' && (
                              <button
                                onClick={() => onPreviewVideo({
                                  name: item.videoName,
                                  originalUrl: item.outputVideoUrl || item.originalVideoUrl,
                                  thumbnailUrl: item.thumbnailUrl
                                })}
                                className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white"
                                title="Visualizar Vídeo Renderizado"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                              </button>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{item.videoName}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                              <span>{Math.round(item.duration || 0)}s</span>
                              {item.error && (
                                <span className="text-rose-400 font-sans truncate max-w-[200px]" title={item.error}>
                                  • {item.error}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Progress */}
                        <div className="flex items-center gap-3 shrink-0">
                          {item.status === 'processing' && (
                            <div className="w-24 text-right">
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
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {item.status}
                          </span>

                          {item.outputVideoUrl && (
                            <a
                              href={item.outputVideoUrl}
                              download
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1f253a] rounded transition-colors"
                              title="Baixar Vídeo Renderizado"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
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

      {/* 5-STEP WIZARD MODAL */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#111420] border border-[#272d42] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            
            {/* Wizard Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2335]">
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest">Wizard de Produção</span>
                <h2 className="text-base font-extrabold text-white">
                  {wizardStep === 1 && 'Passo 1: Selecionar Página de Destino'}
                  {wizardStep === 2 && 'Passo 2: Selecionar Vídeos da Biblioteca'}
                  {wizardStep === 3 && 'Passo 3: Escolher Template Visual'}
                  {wizardStep === 4 && 'Passo 4: Revisar & Preview'}
                  {wizardStep === 5 && 'Passo 5: Confirmar & Enviar para Fila'}
                </h2>
              </div>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-5 gap-1 py-3 border-b border-[#1e2335]">
              {[1, 2, 3, 4, 5].map(step => (
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
              
              {/* STEP 1: SELECT PAGE */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">Selecione a página ou canal para o qual esses vídeos serão gerados:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pages.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setWizardPageId(p.id)}
                        className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                          wizardPageId === p.id 
                            ? 'bg-purple-600/20 border-purple-500 text-white' 
                            : 'bg-[#151928] border-[#22283d] text-slate-300 hover:bg-[#1a1f33]'
                        }`}
                      >
                        <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-xs text-white">{p.name}</p>
                          <p className="text-[11px] text-purple-400 font-mono">{p.username}</p>
                        </div>
                        {wizardPageId === p.id && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT VIDEOS */}
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
                      className="px-3 py-1.5 rounded-lg bg-[#181d2e] border border-[#262e47] text-xs font-semibold text-purple-300 hover:text-white"
                    >
                      [ Selecionar Todos ] ({availableVideos.length})
                    </button>
                  </div>

                  <div className="text-xs text-slate-400">
                    <strong className="text-purple-300">{wizardSelectedVideoIds.size}</strong> vídeos selecionados para produção
                  </div>

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
                          <div className="relative aspect-9/16 rounded-lg bg-black/50 overflow-hidden mb-1.5">
                            <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            {isSel && (
                              <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                                <Check className="w-6 h-6 text-white" />
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
                </div>
              )}

              {/* STEP 3: SELECT TEMPLATE */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">Escolha o template que definirá o layout e o enquadramento do vídeo:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availableTemplates.map(t => {
                      const isSel = wizardTemplateId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setWizardTemplateId(t.id)}
                          className={`
                            p-3 rounded-xl border cursor-pointer transition-all
                            ${isSel ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500' : 'bg-[#151928] border-[#22283d] hover:bg-[#1a1f33]'}
                          `}
                        >
                          <div 
                            style={{ background: t.background }} 
                            className="aspect-9/16 max-h-[160px] rounded-lg border border-[#2b334d] flex items-center justify-center mb-2 overflow-hidden relative"
                          >
                            <span className="text-[10px] font-mono text-purple-300 font-bold uppercase">{t.name}</span>
                            {isSel && <Check className="w-5 h-5 text-purple-400 absolute top-2 right-2" />}
                          </div>
                          <h4 className="font-bold text-xs text-white truncate">{t.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{t.aspectRatio} • {t.elements.length} camadas</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & PREVIEW */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0d101a] border border-[#20263b] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Título Identificador da Produção:</p>
                      <input
                        type="text"
                        placeholder="Ex: Produção #001 - Fatos Históricos"
                        value={wizardTitle}
                        onChange={e => setWizardTitle(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-[#141827] border border-[#252b42] text-white text-xs font-bold w-72 focus:outline-hidden focus:border-purple-500"
                      />
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total a Renderizar</span>
                      <strong className="text-xl font-extrabold text-purple-400 font-mono">
                        {wizardSelectedVideoIds.size} Vídeos
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#141827] border border-[#23293e] text-center">
                    <h4 className="text-xs font-bold text-white mb-1">Preview de Amostra com Placeholder</h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Cada vídeo original será dimensionado e alinhado exatamente dentro da área de placeholder configurada no template.
                    </p>
                    <div className="w-32 aspect-9/16 mx-auto rounded-lg border border-purple-500/50 bg-black/60 relative overflow-hidden shadow-lg">
                      <img 
                        src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80" 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-1 left-1 right-1 text-[7px] font-bold text-white bg-purple-600/80 rounded py-0.5">
                        DARKFLOW PREVIEW
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRMATION */}
              {wizardStep === 5 && (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Tudo Pronto para o Lote!</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Ao clicar em "Iniciar Produção", o DarkFlow adicionará os {wizardSelectedVideoIds.size} vídeos à fila de renderização do backend.
                    </p>
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
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-2">
                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 2 && wizardSelectedVideoIds.size === 0) {
                        alert('Selecione pelo menos um vídeo para continuar');
                        return;
                      }
                      setWizardStep(s => s + 1);
                    }}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md"
                  >
                    <span>Próximo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLaunchProduction}
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-purple-900/40 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isSubmitting ? 'Iniciando Fila...' : `GERAR ${wizardSelectedVideoIds.size} VÍDEOS`}</span>
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
