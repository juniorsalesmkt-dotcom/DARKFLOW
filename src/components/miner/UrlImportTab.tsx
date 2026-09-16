import React, { useState } from 'react';
import { 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ShieldCheck, 
  Check, 
  Film, 
  FolderPlus, 
  Tag as TagIcon,
  HelpCircle
} from 'lucide-react';
import { Page, Video } from '../../types/index.js';
import { ContentSourceService } from '../../services/ContentSourceService.js';
import { ImportQueueService } from '../../services/ImportQueueService.js';

interface UrlImportTabProps {
  pages: Page[];
  selectedPageId: string;
  userId: string;
  onVideoImported: (video: Video) => void;
  onNavigateToLibrary: () => void;
}

export const UrlImportTab: React.FC<UrlImportTabProps> = ({
  pages,
  selectedPageId,
  userId,
  onVideoImported,
  onNavigateToLibrary
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [targetPageId, setTargetPageId] = useState(selectedPageId || pages[0]?.id || 'page_memorias');
  const [videoTitle, setVideoTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('URL, IMPORTADO');
  const [authorizedChecked, setAuthorizedChecked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    title?: string;
    thumbnailUrl?: string;
    duration?: number;
    platform?: string;
    message?: string;
    fileSize?: number;
  } | null>(null);

  const handleVerify = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setDuplicateWarning(null);

    try {
      const res = await ContentSourceService.verifyUrl(trimmed);
      setVerificationResult(res);
      if (res.title && !videoTitle) {
        setVideoTitle(res.title);
      }

      // Check duplicate
      const dup = await ContentSourceService.checkDuplicate({
        userId,
        pageId: targetPageId,
        source: 'importador_url',
        sourceContentId: trimmed
      });

      if (dup.isDuplicate) {
        setDuplicateWarning(`Atenção: Este vídeo já foi importado anteriormente para a página selecionada ("${dup.video?.name}").`);
      }
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        platform: 'direct_url',
        message: err.message || 'Falha ao conectar ou verificar a URL informada.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleImport = async () => {
    if (!verificationResult || !verificationResult.valid) return;
    if (!authorizedChecked) {
      alert('É obrigatório confirmar a autorização e conformidade de direitos para importar conteúdos.');
      return;
    }

    setIsImporting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim().toUpperCase())
        .filter(Boolean);

      const importedVideo = await ImportQueueService.importDirectUrl({
        url: inputUrl.trim(),
        pageId: targetPageId,
        name: videoTitle.trim() || verificationResult.title || 'Vídeo Importado por URL',
        tags
      });

      onVideoImported(importedVideo);
      setInputUrl('');
      setVideoTitle('');
      setVerificationResult(null);
      setAuthorizedChecked(false);
    } catch (err: any) {
      alert(err.message || 'Falha ao importar vídeo.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Intro box */}
      <div className="p-5 rounded-2xl bg-[#121524] border border-[#222842] space-y-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-indigo-400" />
          <span>Importação Direta por Link de Mídia</span>
        </h3>
        <p className="text-xs text-slate-400">
          Insira um link HTTP/HTTPS direto de arquivo de vídeo (.mp4, .webm) ou endpoint de CDN de mídia autorizado. O sistema valida os cabeçalhos em tempo real antes de descarregar.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#101424] border border-[#222b46] space-y-5">
        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Canal / Página de Destino
            </label>
            <select
              id="select-target-page"
              value={targetPageId}
              onChange={e => {
                setTargetPageId(e.target.value);
                setDuplicateWarning(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
            >
              {pages.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.username})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL do Arquivo de Vídeo
            </label>
            <div className="flex gap-2">
              <input
                id="input-media-url"
                type="url"
                placeholder="https://meuservidor.com/videos/meu_video_original.mp4"
                value={inputUrl}
                onChange={e => {
                  setInputUrl(e.target.value);
                  setVerificationResult(null);
                  setDuplicateWarning(null);
                }}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-white text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
              <button
                id="btn-verify-direct-url"
                onClick={handleVerify}
                disabled={!inputUrl.trim() || isVerifying}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 shrink-0"
              >
                {isVerifying ? 'Verificando...' : 'VERIFICAR LINK'}
              </button>
            </div>
          </div>

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Verification Result Card */}
          {verificationResult && (
            <div className={`p-4 rounded-xl border transition-all ${
              verificationResult.valid 
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-start gap-3">
                {verificationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">
                    {verificationResult.valid ? 'Arquivo de Vídeo Válido e Acessível' : 'Erro na Verificação da URL'}
                  </p>
                  <p className="text-[11px] mt-0.5 text-slate-300 leading-relaxed">
                    {verificationResult.message || (verificationResult.valid ? `Detectado: ${verificationResult.title}` : '')}
                  </p>

                  {verificationResult.valid && (
                    <div className="mt-2 text-[11px] text-emerald-300 font-mono flex items-center gap-4">
                      {verificationResult.fileSize && (
                        <span>Tamanho: {(verificationResult.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                      )}
                      <span>Duração Estimada: {verificationResult.duration || 15}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extra fields if URL valid */}
          {verificationResult?.valid && (
            <div className="space-y-4 pt-3 border-t border-[#1a2034] animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Título Personalizado (Opcional)
                </label>
                <input
                  id="input-custom-title"
                  type="text"
                  placeholder="Nome do vídeo na biblioteca"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <TagIcon className="w-3 h-3 text-slate-400" />
                  <span>Tags Separadas por Vírgula</span>
                </label>
                <input
                  id="input-tags"
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Compliance Checkbox */}
              <div className="p-4 rounded-xl bg-[#0c101c] border border-indigo-900/40 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="checkbox-url-compliance"
                    type="checkbox"
                    checked={authorizedChecked}
                    onChange={e => setAuthorizedChecked(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs text-slate-300 leading-snug">
                    <span className="font-semibold text-white">Declaração de Autorização e Conformidade:</span>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Confirmo que possuo autorização, licença, consentimento ou direito legal para baixar, editar e utilizar este material nos meus fluxos de produção.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="btn-confirm-import-url"
                  onClick={handleImport}
                  disabled={isImporting || !authorizedChecked}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isImporting ? 'Importando...' : 'Importar para Biblioteca'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
