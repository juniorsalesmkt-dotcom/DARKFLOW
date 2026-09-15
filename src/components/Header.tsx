import React, { useState } from 'react';
import { 
  Menu, 
  Bell, 
  Plus, 
  Layers, 
  Video, 
  ChevronDown, 
  Check, 
  CheckCircle2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Page, AppNotification } from '../types/index.js';

interface HeaderProps {
  pages: Page[];
  selectedPageId: string;
  onSelectPageId: (id: string) => void;
  onOpenNewPageModal: () => void;
  onOpenUploadModal: () => void;
  onOpenProductionWizard: () => void;
  onToggleMobileMenu: () => void;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pages,
  selectedPageId,
  onSelectPageId,
  onOpenNewPageModal,
  onOpenUploadModal,
  onOpenProductionWizard,
  onToggleMobileMenu,
  notifications,
  onOpenNotifications
}) => {
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const activePage = pages.find(p => p.id === selectedPageId);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0c0e16]/90 backdrop-blur-md border-b border-[#1e2233] px-4 lg:px-8 flex items-center justify-between">
      {/* Left side: Mobile button & Page Switcher */}
      <div className="flex items-center gap-3">
        <button
          id="header-mobile-toggle"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#161a29]"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Switcher Dropdown */}
        <div className="relative">
          <button
            id="page-selector-button"
            onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#141724] border border-[#23283b] hover:border-purple-500/40 text-xs font-semibold text-slate-200 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse" />
            <span className="text-slate-400">Página Ativa:</span>
            <span className="text-white font-bold">{activePage ? activePage.name : 'Todas as Páginas'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {pageDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setPageDropdownOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-[#121520] border border-[#23283b] shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Minhas Páginas
                </div>

                <button
                  onClick={() => {
                    onSelectPageId('');
                    setPageDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                    selectedPageId === '' ? 'bg-purple-600/20 text-purple-300' : 'text-slate-300 hover:bg-[#1a1e2e]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>Todas as Páginas (Global)</span>
                  </div>
                  {selectedPageId === '' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>

                {pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelectPageId(page.id);
                      setPageDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                      selectedPageId === page.id ? 'bg-purple-600/20 text-purple-300' : 'text-slate-300 hover:bg-[#1a1e2e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <img 
                        src={page.avatarUrl} 
                        alt={page.name} 
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                      <div className="truncate text-left">
                        <p className="truncate text-xs font-medium">{page.name}</p>
                        <p className="text-[10px] text-slate-400">{page.username}</p>
                      </div>
                    </div>
                    {selectedPageId === page.id && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-2" />}
                  </button>
                ))}

                <div className="my-1 border-t border-[#1e2233]" />

                <button
                  id="header-create-page-btn"
                  onClick={() => {
                    setPageDropdownOpen(false);
                    onOpenNewPageModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-600/10 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Criar Nova Página</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* FFmpeg Engine Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#131726] border border-[#21273d] text-[11px] font-mono text-purple-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>FFmpeg Native Engine</span>
        </div>
      </div>

      {/* Right side: Actions & Notifications */}
      <div className="flex items-center gap-2.5">
        <button
          id="header-quick-upload-btn"
          onClick={onOpenUploadModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b2a] hover:bg-[#20253b] border border-[#282d45] text-xs font-semibold text-slate-200 hover:text-white transition-all"
        >
          <Video className="w-3.5 h-3.5 text-indigo-400" />
          <span>Importar Vídeos</span>
        </button>

        <button
          id="header-quick-produce-btn"
          onClick={onOpenProductionWizard}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/25 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nova Produção</span>
        </button>

        {/* Notification Bell */}
        <button
          id="header-notifications-bell"
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#161a29] transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-[#0c0e16]" />
          )}
        </button>
      </div>
    </header>
  );
};
