import React, { useState } from 'react';
import { 
  Search, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Download, 
  Clock, 
  Sliders, 
  Check, 
  Sparkles,
  Info,
  Key
} from 'lucide-react';
import { PlatformType, MineradorQuery, Page, Video } from '../types/index.js';
import { api } from '../services/api.js';

interface MineradorViewProps {
  pages: Page[];
  selectedPageId: string;
  onVideoImported: (video: Video) => void;
  onNavigateToSettings: () => void;
}

export const MineradorView: React.FC<MineradorViewProps> = ({
  pages,
  selectedPageId,
  onVideoImported,
  onNavigateToSettings
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'search'>('url');

  // URL Importer state
  const [inputUrl, setInputUrl] = useState('');
  const [targetPageId, setTargetPageId] = useState(selectedPageId || pages[0]?.id || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    title?: string;
    thumbnailUrl?: string;
    duration?: number;
    platform?: string;
    message?: string;
  } | null>(null);

  // Search state
  const [platform, setPlatform] = useState<PlatformType>('instagram');
  const [keyword, setKeyword] = useState('');
  const [minViews, setMinViews] = useState('');
  const [minLikes, setMinLikes] = useState('');
  const [searchResult, setSearchResult] = useState<{
    configured: boolean;
    message?: string;
    items: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Verify URL
  const handleVerifyUrl = async () => {
    if (!inputUrl.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await api.verifyUrl(inputUrl.trim());
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        message: err.message || 'Erro ao verificar a URL'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Import verified URL
  const handleImportUrl = async () => {
    if (!verificationResult || !verificationResult.valid) return;
    setIsImporting(true);
    try {
      const vid = await api.importUrl({
        url: inputUrl.trim(),
        pageId: targetPageId || pages[0]?.id || 'page_memorias',
        name: verificationResult.title
      });
      onVideoImported(vid);
      setInputUrl('');
      setVerificationResult(null);
      alert('Vídeo importado com sucesso para sua biblioteca!');
    } catch (err: any) {
      alert(err.message || 'Falha ao importar vídeo');
    } finally {
      setIsImporting(false);
    }
  };

  // Search via Adapter
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const res = await api.searchMinerador({
        platform,
        source: 'busca',
        keyword,
        minViews: minViews ? parseInt(minViews, 10) : undefined,
        minLikes: minLikes ? parseInt(minLikes, 10) : undefined
      });
      setSearchResult(res);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Minerador & Importador</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Arquitetura baseada em ContentSourceAdapters oficiais para curadoria e importação direta de arquivos de mídia.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#21263a]">
        <button
          onClick={() => setActiveTab('url')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'url' ? 'border-purple-500 text-purple-300 bg-[#141827]' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Importação por URL Direta</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'search' ? 'border-purple-500 text-purple-300 bg-[#141827]' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Minerador por Critérios (API Adapters)</span>
        </button>
      </div>

      {/* TAB 1: IMPORTAÇÃO POR URL */}
      {activeTab === 'url' && (
        <div className="p-6 rounded-2xl bg-[#121522] border border-[#23293e] space-y-6 max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Insira a URL do Arquivo de Vídeo</h3>
            <p className="text-xs text-slate-400">
              Cole links diretos de arquivos MP4/WebM ou links de servidores de mídia compatíveis.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Destino na Biblioteca</label>
              <select
                value={targetPageId}
                onChange={e => setTargetPageId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0d101a] border border-[#23283c] text-slate-200 text-xs focus:outline-hidden"
              >
                {pages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.username})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cole a URL aqui</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://exemplo.com/videos/meu_video.mp4"
                  value={inputUrl}
                  onChange={e => {
                    setInputUrl(e.target.value);
                    setVerificationResult(null);
                  }}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#0d101a] border border-[#23283c] text-white text-xs font-mono focus:outline-hidden focus:border-purple-500"
                />
                <button
                  id="btn-verify-url"
                  onClick={handleVerifyUrl}
                  disabled={!inputUrl.trim() || isVerifying}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isVerifying ? 'Verificando...' : 'VERIFICAR'}
                </button>
              </div>
            </div>

            {/* Verification Result Card */}
            {verificationResult && (
              <div className={`p-4 rounded-xl border animate-in fade-in ${
                verificationResult.valid ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-start gap-3">
                  {verificationResult.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{verificationResult.valid ? 'Mídia Verificada com Sucesso!' : 'Incompatibilidade ou Proteção Detectada'}</p>
                    <p className="text-[11px] mt-0.5 text-slate-300">
                      {verificationResult.message || (verificationResult.valid ? `Arquivo: ${verificationResult.title}` : '')}
                    </p>

                    {verificationResult.valid && (
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-emerald-500/20">
                        <span className="text-[10px] font-mono text-emerald-300">Pronto para ser adicionado à biblioteca.</span>
                        <button
                          id="btn-import-url"
                          onClick={handleImportUrl}
                          disabled={isImporting}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                        >
                          {isImporting ? 'Importando...' : 'IMPORTAR AGORA'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MINERADOR VIA ADAPTERS */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="p-6 rounded-2xl bg-[#121522] border border-[#23293e] space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Filtros de Mineração Automatizada</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plataforma</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as PlatformType)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d101a] border border-[#23283c] text-white text-xs"
                >
                  <option value="instagram">Instagram (Meta Graph API)</option>
                  <option value="tiktok">TikTok Commercial Content API</option>
                  <option value="generic">Generic Direct Media Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Palavra-chave ou Assunto</label>
                <input
                  type="text"
                  placeholder="Ex: Fatos históricos, curiosidades..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d101a] border border-[#23283c] text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mínimo de Visualizações</label>
                <input
                  type="number"
                  placeholder="Ex: 50000"
                  value={minViews}
                  onChange={e => setMinViews(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d101a] border border-[#23283c] text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#1e2335]">
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearching ? 'Consultando Adapter...' : 'Executar Mineração'}</span>
              </button>
            </div>
          </form>

          {/* Adapter Execution Feedback */}
          {searchResult && !searchResult.configured && (
            <div className="p-6 rounded-2xl bg-[#17141d] border border-amber-500/40 text-amber-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">Fonte Não Configurada</h4>
                  <p className="text-xs text-amber-300/90 mt-0.5">{searchResult.message}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-slate-300 space-y-2">
                <p>
                  O DARKFLOW é construído com arquitetura modular de adaptadores e respeita integralmente as diretrizes de acesso oficial das plataformas (Instagram Graph API, TikTok Commercial API), sem simulações artificiais de dados.
                </p>
                <button
                  onClick={onNavigateToSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Configurar Chaves em Configurações</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
