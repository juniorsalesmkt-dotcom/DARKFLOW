import React, { useState } from 'react';
import { 
  Search, 
  Sliders, 
  CheckSquare, 
  Square, 
  Download, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Film, 
  Youtube, 
  Instagram, 
  Share2, 
  Eye, 
  ThumbsUp, 
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { 
  PlatformType, 
  Page, 
  MinerSearchItem, 
  MinerSearchResult, 
  ImportBatch 
} from '../../types/index.js';
import { ContentSourceService } from '../../services/ContentSourceService.js';
import { ImportQueueService } from '../../services/ImportQueueService.js';

interface MinerSearchTabProps {
  pages: Page[];
  selectedPageId: string;
  userId: string;
  onNavigateToSettings: () => void;
  onNavigateToSources: () => void;
  onBatchCreated: (batch: ImportBatch) => void;
}

export const MinerSearchTab: React.FC<MinerSearchTabProps> = ({
  pages,
  selectedPageId,
  userId,
  onNavigateToSettings,
  onNavigateToSources,
  onBatchCreated
}) => {
  // Filter states
  const [platform, setPlatform] = useState<PlatformType>('pexels');
  const [keyword, setKeyword] = useState('dark aesthetic vertical');
  const [limit, setLimit] = useState(24);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MinerSearchResult | null>(null);

  // Selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [targetPageId, setTargetPageId] = useState(selectedPageId || pages[0]?.id || 'page_memorias');
  const [customTags, setCustomTags] = useState('MINERADO, VERTICAL');

  // Import batch dialog
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setSelectedItemIds(new Set());

    try {
      const res = await ContentSourceService.search({
        platform,
        keyword: keyword.trim(),
        limit
      });
      setSearchResult(res);
    } catch (err: any) {
      setSearchResult({
        configured: false,
        source: platform,
        message: err.message || 'Erro ao consultar fonte.',
        items: []
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle single item
  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all
  const selectAll = () => {
    if (!searchResult?.items) return;
    const all = new Set(searchResult.items.map(i => i.id));
    setSelectedItemIds(all);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Select first N
  const selectFirstN = (n: number) => {
    if (!searchResult?.items) return;
    const subset = new Set(searchResult.items.slice(0, n).map(i => i.id));
    setSelectedItemIds(subset);
  };

  // Prepare and open confirm modal
  const handleOpenConfirm = () => {
    if (selectedItemIds.size === 0) return;
    setComplianceAccepted(false);
    setShowConfirmModal(true);
  };

  // Create mass import batch
  const handleStartMassImport = async () => {
    if (!complianceAccepted) {
      alert('É obrigatório confirmar a conformidade de direitos para iniciar a importação em massa.');
      return;
    }

    if (!searchResult?.items) return;

    setIsCreatingBatch(true);
    try {
      const selectedItems = searchResult.items
        .filter(item => selectedItemIds.has(item.id))
        .map(item => ({
          sourceContentId: item.sourceContentId,
          sourceUrl: item.videoUrl || '',
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          duration: item.duration
        }));

      const tags = customTags
        .split(',')
        .map(t => t.trim().toUpperCase())
        .filter(Boolean);

      const batch = await ImportQueueService.createBatch({
        userId,
        pageId: targetPageId,
        source: platform,
        items: selectedItems,
        tags,
        authorizationConfirmed: true
      });

      setShowConfirmModal(false);
      onBatchCreated(batch);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar lote de importação.');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const selectedCount = selectedItemIds.size;
  const items = searchResult?.items || [];
  const selectedItems = items.filter(i => selectedItemIds.has(i.id));
  const estimatedSeconds = selectedCount * 4; // ~4s per asset download/metadata

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <form onSubmit={handleSearch} className="p-5 rounded-2xl bg-[#101424] border border-[#222b46] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Fonte / Adaptador
            </label>
            <select
              id="select-miner-platform"
              value={platform}
              onChange={e => setPlatform(e.target.value as PlatformType)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
            >
              <option value="pexels">Pexels (Vídeos Livres Verticais)</option>
              <option value="youtube">YouTube Data API v3 (Shorts CC)</option>
              <option value="instagram">Instagram Graph API (Contas Conectadas)</option>
              <option value="tiktok">TikTok Commercial API (Oficial)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Palavra-chave ou Tema
            </label>
            <div className="relative">
              <input
                id="input-miner-keyword"
                type="text"
                placeholder="Ex: dark motivation, luxury, history, neon..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-white text-xs focus:outline-hidden focus:border-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Limite de Resultados
            </label>
            <select
              id="select-miner-limit"
              value={limit}
              onChange={e => setLimit(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0b0e18] border border-[#20273d] text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
            >
              <option value={12}>12 vídeos</option>
              <option value={24}>24 vídeos</option>
              <option value={50}>50 vídeos</option>
              <option value={100}>100 vídeos</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1b2135]">
          <span className="text-[11px] text-slate-400">
            Acesso oficial via ContentSourceAdapter. Respeito total às regras da plataforma.
          </span>

          <button
            id="btn-run-miner-search"
            type="submit"
            disabled={isSearching}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isSearching ? 'Pesquisando na Fonte...' : 'Buscar Conteúdos'}</span>
          </button>
        </div>
      </form>

      {/* Source Unconfigured Alert */}
      {searchResult && !searchResult.configured && (
        <div className="p-6 rounded-2xl bg-[#17141f] border border-amber-500/40 text-amber-200 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Fonte Não Configurada</h4>
              <p className="text-xs text-amber-300/90 mt-0.5">{searchResult.message}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-slate-300 space-y-2">
            <p>
              O DARKFLOW não inventa APIs ou gera dados fictícios. Para pesquisar nesta fonte, configure as credenciais oficiais na aba <strong className="text-white">Central de Fontes</strong> ou no menu de Configurações.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                id="btn-go-to-sources"
                onClick={onNavigateToSources}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors"
              >
                Ver Central de Fontes
              </button>
              <button
                id="btn-go-to-settings"
                onClick={onNavigateToSettings}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
              >
                Configurar Chaves
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Results & Selection Bar */}
      {searchResult?.configured && (
        <div className="space-y-4 animate-in fade-in">
          {/* Action Bar */}
          <div className="p-4 rounded-2xl bg-[#121626] border border-[#232b47] flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20 shadow-xl backdrop-blur-md">
            {/* Bulk Selection Helpers */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-select-all"
                onClick={selectAll}
                className="px-3 py-1.5 rounded-lg bg-[#192036] hover:bg-[#232c4b] text-slate-200 text-xs font-semibold border border-[#2d375d] transition-colors"
              >
                Selecionar Todos ({items.length})
              </button>

              <button
                id="btn-deselect-all"
                onClick={deselectAll}
                disabled={selectedCount === 0}
                className="px-3 py-1.5 rounded-lg bg-[#192036] hover:bg-[#232c4b] text-slate-200 text-xs font-semibold border border-[#2d375d] transition-colors disabled:opacity-40"
              >
                Desmarcar
              </button>

              <button
                onClick={() => selectFirstN(10)}
                className="px-3 py-1.5 rounded-lg bg-[#192036] hover:bg-[#232c4b] text-slate-200 text-xs font-semibold border border-[#2d375d] transition-colors"
              >
                Primeiros 10
              </button>

              {items.length >= 25 && (
                <button
                  onClick={() => selectFirstN(25)}
                  className="px-3 py-1.5 rounded-lg bg-[#192036] hover:bg-[#232c4b] text-slate-200 text-xs font-semibold border border-[#2d375d] transition-colors"
                >
                  Primeiros 25
                </button>
              )}
            </div>

            {/* Target Page & Import Trigger */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Canal Destino:</span>
                <select
                  value={targetPageId}
                  onChange={e => setTargetPageId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#0b0e18] border border-[#252f4e] text-white text-xs font-medium focus:outline-hidden"
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                id="btn-open-mass-import"
                onClick={handleOpenConfirm}
                disabled={selectedCount === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Importar Selecionados ({selectedCount})</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {items.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0f121e] border border-[#1e243a]">
              <Film className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-semibold">Nenhum resultado encontrado.</p>
              <p className="text-xs text-slate-500 mt-1">Tente pesquisar por outros termos em inglês ou português.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map(item => {
                const isSelected = selectedItemIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer border transition-all select-none flex flex-col justify-between ${
                      isSelected 
                        ? 'border-purple-500 bg-[#161a2e] ring-2 ring-purple-500/50' 
                        : 'border-[#1e253c] bg-[#101423] hover:border-[#333e63]'
                    }`}
                  >
                    {/* Thumbnail Aspect 9:16 Container */}
                    <div className="relative aspect-[9/16] bg-black/60 overflow-hidden">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />

                      {/* Top Checkbox Overlay */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isSelected ? 'bg-purple-600 text-white shadow-md' : 'bg-black/60 text-white/60 backdrop-blur-xs border border-white/20'
                        }`}>
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                        </div>
                      </div>

                      {/* Duration Tag */}
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-mono text-white font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.duration || 15}s</span>
                      </div>

                      {/* Platform source badge */}
                      <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-bold text-slate-300 uppercase">
                        {item.source}
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="p-3">
                      <h5 className="text-xs font-semibold text-white truncate" title={item.title}>
                        {item.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        Por {item.author || 'Criador'}
                      </p>

                      {item.license && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-medium text-slate-300 truncate max-w-full">
                          {item.license}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Compliance Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#121626] border border-[#283253] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Confirmar Importação em Massa</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lote de {selectedCount} vídeos selecionados para a biblioteca.
                </p>
              </div>
            </div>

            {/* Selection Overview */}
            <div className="p-4 rounded-xl bg-[#0b0e18] border border-[#1e253d] space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total de Vídeos:</span>
                <span className="font-bold text-white">{selectedCount}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Página / Canal de Destino:</span>
                <span className="font-bold text-indigo-400">{pages.find(p => p.id === targetPageId)?.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tempo Estimado de Download:</span>
                <span className="font-mono text-slate-300">~{estimatedSeconds}s (3 downloads simultâneos)</span>
              </div>
            </div>

            {/* Custom tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tags do Lote</label>
              <input
                type="text"
                value={customTags}
                onChange={e => setCustomTags(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#0b0e18] border border-[#232c48] text-white text-xs focus:outline-hidden"
              />
            </div>

            {/* Mandatory Compliance Checkbox */}
            <div className="p-4 rounded-xl bg-[#101424] border border-amber-500/30 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="checkbox-compliance"
                  type="checkbox"
                  checked={complianceAccepted}
                  onChange={e => setComplianceAccepted(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-700 bg-slate-900 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs text-slate-300 leading-snug">
                  <span className="font-semibold text-white">Declaração de Conformidade & Autorização Legal (Obrigatório):</span>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Confirmo expressamente que possuo autorização, licença, direito de uso ou reutilização deste conteúdo para os fins desejados, assumindo total responsabilidade legal pelo material importado.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isCreatingBatch}
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-mass-import"
                onClick={handleStartMassImport}
                disabled={!complianceAccepted || isCreatingBatch}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>{isCreatingBatch ? 'Iniciando Fila...' : 'Iniciar Importação em Massa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
