import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  StopCircle, 
  RotateCcw, 
  Film, 
  ExternalLink, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  FolderCheck,
  Zap
} from 'lucide-react';
import { ImportBatch, ImportJob } from '../../types/index.js';
import { ImportQueueService } from '../../services/ImportQueueService.js';

interface ImportHistoryTabProps {
  userId: string;
  selectedPageId: string;
  onNavigateToLibrary: () => void;
  onStartProduction?: () => void;
}

export const ImportHistoryTab: React.FC<ImportHistoryTabProps> = ({
  userId,
  selectedPageId,
  onNavigateToLibrary,
  onStartProduction
}) => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const data = await ImportQueueService.getBatches(userId, selectedPageId);
      setBatches(data);
      if (!expandedBatchId && data.length > 0) {
        setExpandedBatchId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load import batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    // Poll active queues every 3 seconds
    const interval = setInterval(() => {
      fetchBatches();
    }, 3000);
    return () => clearInterval(interval);
  }, [userId, selectedPageId]);

  const handleCancelBatch = async (batchId: string) => {
    setActionInProgress(batchId);
    try {
      await ImportQueueService.cancelBatch(batchId);
      await fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar lote.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetryFailed = async (batchId: string) => {
    setActionInProgress(batchId);
    try {
      await ImportQueueService.retryFailed(batchId);
      await fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Erro ao reprocessar itens.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetryJob = async (batchId: string, jobId: string) => {
    setActionInProgress(jobId);
    try {
      await ImportQueueService.retryJob(batchId, jobId);
      await fetchBatches();
    } catch (err: any) {
      alert(err.message || 'Erro ao reprocessar job.');
    } finally {
      setActionInProgress(null);
    }
  };

  const renderStatusBadge = (status: ImportBatch['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Concluído</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
            <span>Processando</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Na Fila</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Parcial</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
            <StopCircle className="w-3 h-3 text-slate-500" />
            <span>Cancelado</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Falhou</span>
          </span>
        );
    }
  };

  if (isLoading && batches.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
        <span>Carregando fila e histórico de importações...</span>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[#101424] border border-[#20273d]">
        <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">Nenhum lote de importação registrado</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Utilize o Minerador ou a Importação por URL para carregar conteúdos em massa para sua biblioteca.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Fila de Processamento & Histórico de Importação</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Downloads concorrentes, extração de metadados FFmpeg e inserção direta na biblioteca.
          </p>
        </div>

        <button
          onClick={fetchBatches}
          className="px-3.5 py-1.5 rounded-lg bg-[#181f33] hover:bg-[#222b46] text-slate-300 hover:text-white text-xs font-semibold border border-[#2b3558] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Batches List */}
      <div className="space-y-4">
        {batches.map(batch => {
          const isExpanded = expandedBatchId === batch.id;
          const isActive = batch.status === 'PROCESSING' || batch.status === 'QUEUED';
          const hasFailed = batch.failed > 0;
          const jobs = batch.items || [];

          return (
            <div
              key={batch.id}
              className="rounded-2xl bg-[#101424] border border-[#222b46] overflow-hidden shadow-md transition-all"
            >
              {/* Batch Summary Row */}
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#192036] flex items-center justify-center shrink-0 border border-[#2a3458]">
                    <Film className="w-5 h-5 text-purple-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white truncate">{batch.title}</h4>
                      {renderStatusBadge(batch.status)}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                      <span className="font-mono text-[11px]">ID: {batch.id}</span>
                      <span>Fonte: <strong className="text-slate-200 uppercase">{batch.source}</strong></span>
                      <span>Criado em: {new Date(batch.createdAt).toLocaleTimeString()}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3 max-w-xl">
                      <div className="flex-1 h-2 rounded-full bg-[#1b2135] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            batch.status === 'COMPLETED' ? 'bg-emerald-500' :
                            batch.status === 'FAILED' ? 'bg-rose-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${batch.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300 shrink-0">
                        {batch.progress}%
                      </span>
                    </div>

                    {/* Counters */}
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                      <span>Total: <strong className="text-white">{batch.total}</strong></span>
                      <span>Concluídos: <strong className="text-emerald-400">{batch.completed}</strong></span>
                      {batch.processing > 0 && (
                        <span>Processando: <strong className="text-indigo-400">{batch.processing}</strong></span>
                      )}
                      {batch.queued > 0 && (
                        <span>Na Fila: <strong className="text-purple-400">{batch.queued}</strong></span>
                      )}
                      {batch.failed > 0 && (
                        <span>Falhas: <strong className="text-rose-400">{batch.failed}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Cancel Button */}
                  {isActive && (
                    <button
                      id={`btn-cancel-${batch.id}`}
                      onClick={() => handleCancelBatch(batch.id)}
                      disabled={actionInProgress === batch.id}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/40 transition-colors flex items-center gap-1.5"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  )}

                  {/* Retry Failed */}
                  {hasFailed && !isActive && (
                    <button
                      id={`btn-retry-${batch.id}`}
                      onClick={() => handleRetryFailed(batch.id)}
                      disabled={actionInProgress === batch.id}
                      className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-semibold border border-amber-800/40 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reprocessar Falhas ({batch.failed})</span>
                    </button>
                  )}

                  {/* Go to Library */}
                  {batch.completed > 0 && (
                    <button
                      id={`btn-library-${batch.id}`}
                      onClick={onNavigateToLibrary}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      <FolderCheck className="w-3.5 h-3.5" />
                      <span>Ver na Biblioteca</span>
                    </button>
                  )}

                  {/* Direct Mass Production trigger */}
                  {batch.completed > 0 && onStartProduction && (
                    <button
                      id={`btn-production-${batch.id}`}
                      onClick={onStartProduction}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-purple-950/40"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Produção em Massa</span>
                    </button>
                  )}

                  {/* Expand/Collapse toggle */}
                  <button
                    onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                    className="p-1.5 rounded-lg bg-[#192036] hover:bg-[#252f4f] text-slate-300 transition-colors"
                    title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Jobs Details Accordion */}
              {isExpanded && jobs.length > 0 && (
                <div className="border-t border-[#1b2238] bg-[#0b0e18] p-4 space-y-2.5 animate-in fade-in">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Itens do Lote ({jobs.length} vídeos)
                  </span>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {jobs.map(job => (
                      <div
                        key={job.id}
                        className="p-3 rounded-xl bg-[#111524] border border-[#1e253d] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Thumb */}
                          <div className="w-10 h-14 rounded-lg bg-black/60 overflow-hidden shrink-0">
                            <img
                              src={job.thumbnailUrl}
                              alt={job.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white truncate max-w-sm" title={job.title}>
                                {job.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                ({job.duration || 15}s)
                              </span>
                            </div>

                            <p className="text-[11px] text-indigo-300/90 mt-0.5 truncate">
                              {job.currentStage || 'Aguardando...'}
                            </p>

                            {/* Job mini progress */}
                            {(job.status === 'DOWNLOADING' || job.status === 'PROCESSING') && (
                              <div className="mt-1.5 h-1.5 w-48 rounded-full bg-[#1e253c] overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 transition-all duration-200"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            )}

                            {job.error && (
                              <p className="text-[11px] text-rose-400 mt-0.5 truncate">
                                Erro: {job.error}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Job status & retry */}
                        <div className="flex items-center gap-2 shrink-0">
                          {renderStatusBadge(job.status)}

                          {job.status === 'FAILED' && (
                            <button
                              id={`btn-retry-job-${job.id}`}
                              onClick={() => handleRetryJob(batch.id, job.id)}
                              disabled={actionInProgress === job.id}
                              className="p-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 transition-colors"
                              title="Tentar novamente este item"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
