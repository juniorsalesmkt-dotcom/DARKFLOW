import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  Film, 
  Youtube, 
  Instagram, 
  Share2, 
  Link as LinkIcon, 
  UploadCloud, 
  HelpCircle,
  Sliders
} from 'lucide-react';
import { ContentSourceInfo } from '../../types/index.js';
import { ContentSourceService } from '../../services/ContentSourceService.js';

interface SourceCentralTabProps {
  onNavigateToSettings: () => void;
}

export const SourceCentralTab: React.FC<SourceCentralTabProps> = ({ onNavigateToSettings }) => {
  const [sources, setSources] = useState<ContentSourceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const loadSources = async () => {
    setIsLoading(true);
    try {
      const data = await ContentSourceService.getSources();
      setSources(data);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleTestSource = async (id: string) => {
    setTestingId(id);
    try {
      const res = await ContentSourceService.testSource(id);
      setTestResults(prev => ({ ...prev, [id]: res }));
    } catch (err: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [id]: { success: false, message: err.message || 'Falha ao testar conexão' } 
      }));
    } finally {
      setTestingId(null);
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Instagram':
        return <Instagram className="w-5 h-5 text-pink-400" />;
      case 'Share2':
        return <Share2 className="w-5 h-5 text-cyan-400" />;
      case 'Youtube':
        return <Youtube className="w-5 h-5 text-red-400" />;
      case 'Film':
        return <Film className="w-5 h-5 text-teal-400" />;
      case 'Link':
        return <LinkIcon className="w-5 h-5 text-indigo-400" />;
      case 'UploadCloud':
        return <UploadCloud className="w-5 h-5 text-purple-400" />;
      default:
        return <Sliders className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner & Information */}
      <div className="p-5 rounded-2xl bg-[#121524] border border-[#222842] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Central de Fontes & Compliance Oficial</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            O DARKFLOW opera de forma desacoplada através de <span className="text-slate-200 font-semibold">ContentSourceAdapters</span>. Nenhuma chave secreta é exposta ao frontend. Fontes não configuradas exibem aviso claro e não geram dados falsificados.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-refresh-sources"
            onClick={loadSources}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#1b2034] hover:bg-[#252c48] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 border border-[#2b3353] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Status</span>
          </button>

          <button
            id="btn-sources-settings"
            onClick={onNavigateToSettings}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950/40 transition-all"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gerenciar Credenciais</span>
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sources.map(source => {
          const isConfigured = source.status === 'CONFIGURADA';
          const testResult = testResults[source.id];

          return (
            <div 
              key={source.id} 
              className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                isConfigured 
                  ? 'bg-[#101424] border-[#252e4d] shadow-sm' 
                  : 'bg-[#0f121d] border-[#1d2235]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#192036] flex items-center justify-center shrink-0 border border-[#2a3458]">
                      {renderIcon(source.icon)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{source.name}</h4>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        {source.authType === 'oauth' ? 'OAuth 2.0' : source.authType === 'api_key' ? 'API Key Privada' : 'Acesso Direto'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 shrink-0 ${
                    isConfigured 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                  }`}>
                    {isConfigured ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Configurada</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>Não Configurada</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {source.description}
                </p>

                {/* Features */}
                <div className="mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Recursos Suportados
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {source.features.map((feat, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded-md bg-[#161b2d] border border-[#222b46] text-[11px] text-slate-300"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Required env vars info */}
                {source.requiredCredentials.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#0b0e18] border border-[#1b2135] mb-4">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Variáveis de Ambiente Necessárias:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {source.requiredCredentials.map((c, i) => (
                        <code key={i} className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/30">
                          {c}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Feedback */}
                {testResult && (
                  <div className={`p-3 rounded-xl mb-4 text-xs border ${
                    testResult.success 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <p className="text-[11px] leading-tight">{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-[#1e2439] flex items-center justify-between gap-2 mt-2">
                {source.docsUrl ? (
                  <a
                    href={source.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Documentação</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500">Módulo Interno</span>
                )}

                <button
                  id={`btn-test-${source.id}`}
                  onClick={() => handleTestSource(source.id)}
                  disabled={testingId === source.id}
                  className="px-3 py-1.5 rounded-lg bg-[#181f33] hover:bg-[#222a45] text-white text-xs font-semibold border border-[#2b3558] transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${testingId === source.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === source.id ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
