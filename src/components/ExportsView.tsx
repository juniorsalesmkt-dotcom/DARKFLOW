import React, { useState } from 'react';
import { 
  DownloadCloud, 
  Archive, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Download, 
  RefreshCw,
  Film,
  Sparkles
} from 'lucide-react';
import { ExportBatch, Production } from '../types/index.js';

interface ExportsViewProps {
  exports: ExportBatch[];
  productions: Production[];
  onGenerateZip: (productionId: string) => Promise<void>;
  onRefresh: () => void;
}

export const ExportsView: React.FC<ExportsViewProps> = ({
  exports,
  productions,
  onGenerateZip,
  onRefresh
}) => {
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);

  const completedProductions = productions.filter(p => p.completed > 0);

  const handleCreateZip = async (prodId: string) => {
    setGeneratingForId(prodId);
    try {
      await onGenerateZip(prodId);
    } finally {
      setGeneratingForId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Exportações & Downloads</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Baixe seus vídeos renderizados individualmente ou gere pacotes compactados em ZIP para publicação rápida.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#151928] hover:bg-[#1f253b] border border-[#272e47] text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
          <span>Atualizar Status</span>
        </button>
      </div>

      {/* Grid of completed productions ready for export */}
      <div>
        <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
          Produções Disponíveis para Exportação
        </h2>

        {completedProductions.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#111420] border border-[#1f2538] text-center">
            <p className="text-xs text-slate-400">Nenhuma produção com vídeos concluídos ainda. Inicie uma produção para exportar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedProductions.map(prod => (
              <div 
                key={prod.id}
                className="p-5 rounded-2xl bg-[#121522] border border-[#23293e] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white truncate">{prod.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {prod.completed} vídeos prontos
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Template: <strong className="text-slate-300">{prod.templateName}</strong></p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Concluído em: {new Date(prod.updatedAt).toLocaleString()}</p>
                </div>

                <div className="pt-3 border-t border-[#1e2436] flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleCreateZip(prod.id)}
                    disabled={generatingForId === prod.id}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                    <span>{generatingForId === prod.id ? 'Gerando ZIP...' : 'BAIXAR TODOS (GERAR ZIP)'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Archive Batches Table */}
      <div className="pt-4">
        <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
          Histórico de Pacotes ZIP Gerados ({exports.length})
        </h2>

        {exports.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#111420] border border-[#1f2538] text-center">
            <Archive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhum arquivo ZIP foi gerado ainda. Clique em "BAIXAR TODOS" em uma das produções acima.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-[#121522] border border-[#22283d] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e101a] border-b border-[#22283d] text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Produção / Pacote</th>
                  <th className="p-3">Qtd Vídeos</th>
                  <th className="p-3">Tamanho</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2336]">
                {exports.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#161a29] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <Archive className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-200">{exp.productionTitle}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{exp.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-purple-300 font-bold">{exp.totalVideos} vídeos</td>
                    <td className="p-3 font-mono text-slate-400">{exp.zipSizeFormatted || 'Calculando...'}</td>
                    <td className="p-3 font-mono text-slate-400">{new Date(exp.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        exp.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' :
                        exp.status === 'generating' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {exp.status === 'ready' ? 'Pronto para Download' :
                         exp.status === 'generating' ? 'Gerando Pacote...' : 'Falhou'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {exp.downloadUrl ? (
                        <a
                          href={exp.downloadUrl}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar ZIP</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 text-xs font-mono">Processando</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
