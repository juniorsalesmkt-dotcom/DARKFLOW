import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  X, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Folder, 
  Plus,
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Page, UploadProgressItem, Video } from '../types';
import { UploadQueueService } from '../services/UploadQueueService';
import { VideoMetadataService } from '../services/VideoMetadataService';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: Page[];
  currentUserId: string;
  selectedPageId: string;
  onUploadSuccess: (newVideos: Video[]) => void;
  onOpenNewPageModal: () => void;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
  isOpen,
  onClose,
  pages,
  currentUserId,
  selectedPageId,
  onUploadSuccess,
  onOpenNewPageModal
}) => {
  const [targetPageId, setTargetPageId] = useState<string>(selectedPageId || pages[0]?.id || '');
  const [items, setItems] = useState<UploadProgressItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected page ID if changes from outside
  useEffect(() => {
    if (selectedPageId && pages.some(p => p.id === selectedPageId)) {
      setTargetPageId(selectedPageId);
    } else if (pages.length > 0 && !targetPageId) {
      setTargetPageId(pages[0].id);
    }
  }, [selectedPageId, pages]);

  // Subscribe to global UploadQueueService
  useEffect(() => {
    const unsub = UploadQueueService.subscribe((queueItems) => {
      setItems(queueItems);
      setIsProcessing(UploadQueueService.getIsProcessing());
    });

    const unsubCompleted = UploadQueueService.onQueueCompleted((newVideos) => {
      if (newVideos.length > 0) {
        onUploadSuccess(newVideos);
      }
    });

    return () => {
      unsub();
      unsubCompleted();
    };
  }, [onUploadSuccess]);

  if (!isOpen) return null;

  const targetPage = pages.find(p => p.id === targetPageId) || pages[0];

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setValidationErrors([]);

    if (!targetPageId && pages.length > 0) {
      setTargetPageId(pages[0].id);
    }

    const { added, rejected } = UploadQueueService.addFiles(
      Array.from(files),
      currentUserId,
      targetPageId || (pages[0]?.id || ''),
      targetPage?.platform
    );

    if (rejected.length > 0) {
      setValidationErrors(rejected);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const startUpload = () => {
    if (!currentUserId) {
      setValidationErrors(['Sessão de usuário expirada ou não autenticada. Faça login novamente.']);
      return;
    }

    if (!targetPageId) {
      setValidationErrors(['Selecione uma página de destino para seus vídeos antes de iniciar.']);
      return;
    }

    setValidationErrors([]);
    UploadQueueService.start(currentUserId, targetPage?.platform);
  };

  const cancelItem = (id: string) => {
    UploadQueueService.cancelItem(id);
  };

  const retryItem = (id: string) => {
    UploadQueueService.retryItem(id, currentUserId, targetPage?.platform);
  };

  const removeItem = (id: string) => {
    UploadQueueService.removeItem(id);
  };

  const clearCompleted = () => {
    UploadQueueService.clearCompleted();
  };

  const retryAllFailed = () => {
    UploadQueueService.retryAllFailed(currentUserId, targetPage?.platform);
  };

  // Metrics
  const totalCount = items.length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const uploadingCount = items.filter(i => i.status === 'uploading' || i.status === 'processing').length;
  const waitingCount = items.filter(i => i.status === 'waiting').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  const totalProgress = totalCount > 0
    ? Math.round(items.reduce((acc, i) => acc + i.progress, 0) / totalCount)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="batch-upload-modal"
        className="w-full max-w-2xl bg-[#121522] border border-[#23283b] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1e2335] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-inner">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Importação de Vídeos em Massa
                {isProcessing && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Processando em 2º plano
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Selecione ou arraste vídeos originais para enviar ao storage e registrar na biblioteca.
              </p>
            </div>
          </div>

          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1a1f33] transition-colors"
            title="Fechar (Uploads continuarão em segundo plano)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Page Destination Selector (Mandatory) */}
        <div className="px-5 py-3.5 bg-[#0d1019] border-b border-[#1e2335] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300">Página de Destino:</span>
          </div>

          {pages.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                id="target-page-select"
                value={targetPageId}
                disabled={isProcessing}
                onChange={(e) => setTargetPageId(e.target.value)}
                className="bg-[#141827] border border-[#252c42] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
              >
                {pages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.name} ({page.username}) • {page.platform.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-1 px-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">Crie uma página antes de importar vídeos.</span>
              <button
                type="button"
                id="create-page-from-upload-btn"
                onClick={onOpenNewPageModal}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-bold ml-2"
              >
                + Criar Página
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Drag & Drop Area */}
          <div
            id="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              p-7 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200
              ${isDragging 
                ? 'border-purple-500 bg-purple-600/10 scale-[1.01]' 
                : 'border-[#2e354e] hover:border-purple-500/50 bg-[#101320] hover:bg-[#141829]'
              }
            `}
          >
            <input
              ref={fileInputRef}
              id="file-upload-input"
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${
              isDragging ? 'bg-purple-600 text-white animate-bounce' : 'bg-purple-600/15 text-purple-400'
            }`}>
              <Film className="w-6 h-6" />
            </div>

            <p className="text-xs font-bold text-white">
              {isDragging ? 'Solte os vídeos aqui agora!' : (
                <>Arraste vídeos aqui ou <span className="text-purple-400 underline">clique para selecionar</span></>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Formatos suportados: MP4, MOV, WEBM, M4V (Até 1GB por arquivo)
            </p>
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Aviso de Validação:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Overall Progress Bar & Queue Stats */}
          {items.length > 0 && (
            <div className="p-4 rounded-xl bg-[#0c0e17] border border-[#1e2335] space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  {isProcessing ? 'Enviando vídeos para o Storage...' : 'Status da Fila de Upload'}
                </span>
                <span className="font-mono text-purple-400 font-bold">{totalProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[#171b2c] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-purple-600 to-indigo-500 transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>

              {/* Badges / Stats */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span>Total: <strong className="text-white">{totalCount}</strong></span>
                <span>• Concluídos: <strong className="text-emerald-400">{completedCount}</strong></span>
                <span>• Em envio: <strong className="text-purple-400">{uploadingCount}</strong></span>
                <span>• Aguardando: <strong className="text-slate-300">{waitingCount}</strong></span>
                {failedCount > 0 && <span>• Falhas: <strong className="text-rose-400">{failedCount}</strong></span>}
                <span className="ml-auto text-[10px] text-slate-500 font-mono">Concorrência: 5 simultâneos</span>
              </div>
            </div>
          )}

          {/* Individual Items List */}
          {items.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  id={`upload-item-${item.id}`}
                  className="p-3 rounded-lg bg-[#0e111c] border border-[#1b2033] flex flex-col gap-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded bg-[#161a29] flex items-center justify-center text-slate-400 shrink-0">
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : item.status === 'uploading' ? (
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        ) : item.status === 'processing' ? (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-200 font-medium">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{VideoMetadataService.formatFileSize(item.size)}</span>
                          <span>•</span>
                          <span className={
                            item.status === 'completed' ? 'text-emerald-400 font-bold' :
                            item.status === 'uploading' ? 'text-purple-400 font-bold' :
                            item.status === 'processing' ? 'text-indigo-400 font-bold' :
                            item.status === 'failed' ? 'text-rose-400 font-bold' : 'text-slate-400'
                          }>
                            {item.status === 'completed' && '100% Concluído'}
                            {item.status === 'uploading' && `${item.progress}% Enviando...`}
                            {item.status === 'processing' && 'Processando metadados...'}
                            {item.status === 'failed' && (item.error || 'Falha no upload')}
                            {item.status === 'waiting' && 'Aguardando na fila'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status === 'uploading' && (
                        <button
                          type="button"
                          onClick={() => cancelItem(item.id)}
                          className="px-2 py-1 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[10px] font-semibold transition-colors"
                        >
                          Cancelar
                        </button>
                      )}

                      {item.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => retryItem(item.id)}
                          className="px-2 py-1 rounded bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Repetir
                        </button>
                      )}

                      {item.status !== 'uploading' && item.status !== 'processing' && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Remover da lista"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Mini Progress bar when uploading */}
                  {(item.status === 'uploading' || item.status === 'processing') && (
                    <div className="w-full h-1 bg-[#161a29] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d1019] border-t border-[#1e2335] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                type="button"
                id="clear-completed-btn"
                onClick={clearCompleted}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Limpar concluídos ({completedCount})
              </button>
            )}

            {failedCount > 0 && !isProcessing && (
              <button
                type="button"
                id="retry-failed-btn"
                onClick={retryAllFailed}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition-colors ml-2"
              >
                <RotateCcw className="w-3 h-3" />
                Tentar novamente erros ({failedCount})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="cancel-modal-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-[#181c2d] transition-colors"
            >
              {completedCount > 0 ? 'Concluir' : 'Fechar'}
            </button>

            <button
              type="button"
              id="start-upload-btn"
              onClick={startUpload}
              disabled={isProcessing || waitingCount === 0 || pages.length === 0 || !currentUserId}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando ({completedCount}/{totalCount})...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Iniciar Upload ({waitingCount > 0 ? waitingCount : items.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
