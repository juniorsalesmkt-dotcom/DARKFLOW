import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Film, 
  LayoutTemplate, 
  Cpu, 
  DownloadCloud, 
  Globe, 
  Settings, 
  LogOut, 
  Sparkles,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { User } from '../types/index.js';

export type NavItem = 
  | 'DASHBOARD'
  | 'MINERADOR'
  | 'BIBLIOTECA'
  | 'TEMPLATES'
  | 'PRODUCAO'
  | 'EXPORTACOES'
  | 'PAGINAS'
  | 'CONFIGURACOES';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  user: User | null;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
  activeProductionsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  isOpenMobile,
  onToggleMobile,
  activeProductionsCount = 0
}) => {
  const navItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'DASHBOARD', label: 'DASHBOARD', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'MINERADOR', label: 'MINERADOR', icon: <Search className="w-4 h-4" /> },
    { id: 'BIBLIOTECA', label: 'BIBLIOTECA', icon: <Film className="w-4 h-4" /> },
    { id: 'TEMPLATES', label: 'TEMPLATES', icon: <LayoutTemplate className="w-4 h-4" /> },
    { 
      id: 'PRODUCAO', 
      label: 'PRODUÇÃO', 
      icon: <Cpu className="w-4 h-4" />,
      badge: activeProductionsCount > 0 ? activeProductionsCount : undefined
    },
    { id: 'EXPORTACOES', label: 'EXPORTAÇÕES', icon: <DownloadCloud className="w-4 h-4" /> },
    { id: 'PAGINAS', label: 'PÁGINAS', icon: <Globe className="w-4 h-4" /> },
    { id: 'CONFIGURACOES', label: 'CONFIGURAÇÕES', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={onToggleMobile}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0d0f17] border-r border-[#1e2233] 
        flex flex-col justify-between transition-transform duration-200 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo & Header */}
        <div className="p-5 border-b border-[#1e2233]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-linear-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-900/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold tracking-wider text-lg text-white font-mono">DARK<span className="text-purple-400">FLOW</span></span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-widest uppercase">Video SaaS Automation</span>
              </div>
            </div>

            <button 
              onClick={onToggleMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id.toLowerCase()}`}
                onClick={() => {
                  onSelectTab(item.id);
                  if (isOpenMobile) onToggleMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all
                  ${isActive 
                    ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-xs' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151824] border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-purple-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Footer */}
        <div className="p-3 border-t border-[#1e2233] bg-[#0a0c13]">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141724] border border-[#212638]">
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                alt={user?.name || 'User Avatar'} 
                className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-500/40 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Creator Studio'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700/40">
                    {user?.plan || 'PRO'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">{user?.email || 'admin'}</span>
                </div>
              </div>
            </div>

            <button 
              id="sidebar-user-settings-btn"
              onClick={() => onSelectTab('CONFIGURACOES')}
              title="Configurações do Usuário"
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-[#1d2235] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
