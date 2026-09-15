import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Cpu, 
  HardDrive, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Tag as TagIcon, 
  Plus, 
  Trash2,
  LogOut,
  FolderTree,
  ShieldCheck
} from 'lucide-react';
import { User as UserType, Tag } from '../types';
import { api } from '../services/api';

interface SettingsViewProps {
  user: UserType | null;
  onUpdateUser: (data: Partial<UserType>) => Promise<void>;
  onLogout: () => Promise<void>;
  tags: Tag[];
  onCreateTag: (name: string) => Promise<void>;
  onDeleteTag?: (tagId: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onLogout,
  tags,
  onCreateTag,
  onDeleteTag
}) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newTagName, setNewTagName] = useState('');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    api.getDiagnostics().then(data => setDiagnostics(data)).catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUser(true);
    setSaveSuccess(false);
    try {
      await onUpdateUser({ name, email });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName.trim().toUpperCase());
    setNewTagName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Configurações do Sistema</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Gerencie perfil de usuário, regras de armazenamento, tags e diagnósticos de renderização.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Encerrar Sessão</span>
        </button>
      </div>

      {/* User Profile Form */}
      <div className="p-6 rounded-2xl bg-[#121522] border border-[#23293e] space-y-4">
        <div className="flex items-center gap-2.5">
          <User className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Perfil do Usuário</h2>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Perfil atualizado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Exibição</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#0d101a] border border-[#23283c] text-white text-xs focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail Cadastrado</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3.5 py-2 rounded-lg bg-[#080a11] border border-[#1b2030] text-slate-400 text-xs cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-500 mt-1">E-mail autenticado via Firebase Auth.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingUser}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingUser ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Storage Organization Policy */}
      <div className="p-6 rounded-2xl bg-[#121522] border border-[#23293e] space-y-4">
        <div className="flex items-center gap-2.5">
          <FolderTree className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">Estrutura de Armazenamento e Diretórios</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          O DARKFLOW armazena seus arquivos mantendo isolamento absoluto por usuário e por canal:
        </p>

        <div className="p-4 rounded-xl bg-[#0d101a] border border-[#1e2335] font-mono text-xs text-slate-300 space-y-1.5">
          <div><span className="text-purple-400">/uploads/</span>users/{user?.id || 'usr_demo'}/</div>
          <div className="pl-4 text-slate-400">└── pages/<span className="text-indigo-400">{'{pageId}'}</span>/</div>
          <div className="pl-8 text-slate-400">├── originals/<span className="text-sky-400">{'{videoId}'}</span>/<span className="text-emerald-400">video.mp4</span></div>
          <div className="pl-8 text-slate-400">├── thumbnails/<span className="text-sky-400">{'{videoId}'}</span>.jpg</div>
          <div className="pl-8 text-slate-400">└── exports/<span className="text-amber-400">{'{batchId}'}</span>/</div>
        </div>
      </div>

      {/* Tag Management */}
      <div className="p-6 rounded-2xl bg-[#121522] border border-[#23293e] space-y-4">
        <div className="flex items-center gap-2.5">
          <TagIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Tags da Biblioteca</h2>
        </div>
        <p className="text-xs text-slate-400">
          Crie marcadores para classificar e segmentar vídeos para a produção.
        </p>

        <form onSubmit={handleAddTag} className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="NOVA_TAG"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d101a] border border-[#23283c] text-white text-xs font-mono uppercase focus:outline-hidden"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map(t => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181d2e] border border-[#27304a] text-purple-300 text-xs font-mono font-bold"
            >
              <span>#{t.name}</span>
              {onDeleteTag && (
                <button
                  onClick={() => onDeleteTag(t.id)}
                  className="text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* System Diagnostics Card */}
      <div className="p-6 rounded-2xl bg-[#121522] border border-[#23293e] space-y-4">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Diagnóstico de Infraestrutura</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0d101a] border border-[#1e2335]">
            <span className="text-[10px] text-slate-400 font-mono block mb-1">BANCO DE DADOS</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white font-mono">Firestore Conectado</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">grand-creek-2sx2c</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d101a] border border-[#1e2335]">
            <span className="text-[10px] text-slate-400 font-mono block mb-1">AUTENTICAÇÃO</span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white font-mono">Firebase Auth</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">E-mail/Senha + Google</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d101a] border border-[#1e2335]">
            <span className="text-[10px] text-slate-400 font-mono block mb-1">CONCORRÊNCIA UPLOAD</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white font-mono">5 Uploads Simultâneos</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Fila com progresso individual</p>
          </div>
        </div>
      </div>
    </div>
  );
};
