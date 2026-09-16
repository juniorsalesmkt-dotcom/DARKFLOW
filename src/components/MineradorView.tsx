import React, { useState } from 'react';
import { 
  Search, 
  Link as LinkIcon, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { Page, Video, ImportBatch } from '../types/index.js';
import { MinerSearchTab } from './miner/MinerSearchTab.js';
import { UrlImportTab } from './miner/UrlImportTab.js';
import { SourceCentralTab } from './miner/SourceCentralTab.js';
import { ImportHistoryTab } from './miner/ImportHistoryTab.js';

interface MineradorViewProps {
  pages: Page[];
  selectedPageId: string;
  userId?: string;
  onVideoImported: (video: Video) => void;
  onNavigateToSettings: () => void;
  onNavigateToLibrary?: () => void;
  onStartProduction?: () => void;
}

export const MineradorView: React.FC<MineradorViewProps> = ({
  pages,
  selectedPageId,
  userId = 'usr_darkflow_demo',
  onVideoImported,
  onNavigateToSettings,
  onNavigateToLibrary = () => {},
  onStartProduction
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'url' | 'sources' | 'history'>('search');
  const [activeBatch, setActiveBatch] = useState<ImportBatch | null>(null);

  const handleBatchCreated = (batch: ImportBatch) => {
    setActiveBatch(batch);
    // Switch to history queue tab to monitor progress
    setActiveTab('history');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Search className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Miner & Central de Fontes
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Curadoria, importação em massa e central de fontes oficiais com adapters desacoplados. Conexão direta com a Biblioteca e o Motor de Produção.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sources')}
            className="px-3.5 py-1.5 rounded-xl bg-[#151a2d] hover:bg-[#1f2641] text-slate-300 hover:text-white text-xs font-semibold border border-[#273254] transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Central de Fontes</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#21263a] gap-2 overflow-x-auto custom-scrollbar">
        <button
          id="tab-miner-search"
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'search' 
              ? 'border-purple-500 text-purple-300 bg-[#141827]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Minerador em Massa</span>
        </button>

        <button
          id="tab-miner-url"
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'url' 
              ? 'border-purple-500 text-purple-300 bg-[#141827]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Importação por URL</span>
        </button>

        <button
          id="tab-miner-sources"
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sources' 
              ? 'border-purple-500 text-purple-300 bg-[#141827]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Central de Fontes</span>
        </button>

        <button
          id="tab-miner-history"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history' 
              ? 'border-purple-500 text-purple-300 bg-[#141827]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Fila & Histórico de Importações</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div>
        {activeTab === 'search' && (
          <MinerSearchTab
            pages={pages}
            selectedPageId={selectedPageId}
            userId={userId}
            onNavigateToSettings={onNavigateToSettings}
            onNavigateToSources={() => setActiveTab('sources')}
            onBatchCreated={handleBatchCreated}
          />
        )}

        {activeTab === 'url' && (
          <UrlImportTab
            pages={pages}
            selectedPageId={selectedPageId}
            userId={userId}
            onVideoImported={(video) => {
              onVideoImported(video);
              setActiveTab('history');
            }}
            onNavigateToLibrary={onNavigateToLibrary}
          />
        )}

        {activeTab === 'sources' && (
          <SourceCentralTab
            onNavigateToSettings={onNavigateToSettings}
          />
        )}

        {activeTab === 'history' && (
          <ImportHistoryTab
            userId={userId}
            selectedPageId={selectedPageId}
            onNavigateToLibrary={onNavigateToLibrary}
            onStartProduction={onStartProduction}
          />
        )}
      </div>
    </div>
  );
};
