import React from 'react';
import { X, CheckCheck, Bell, ExternalLink } from 'lucide-react';
import { AppNotification } from '../types/index.js';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50" onClick={onClose} />
      <div className="fixed top-0 bottom-0 right-0 w-80 sm:w-96 bg-[#0f121d] border-l border-[#22283d] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="p-4 border-b border-[#202538] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Central de Notificações</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="p-1 text-slate-400 hover:text-white"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma notificação encontrada.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-all ${
                  n.read ? 'bg-[#121522] border-[#1e2335] text-slate-400' : 'bg-[#151928] border-purple-500/40 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span className={`font-bold uppercase ${
                    n.type === 'success' ? 'text-emerald-400' :
                    n.type === 'error' ? 'text-rose-400' :
                    n.type === 'warning' ? 'text-amber-400' : 'text-purple-400'
                  }`}>{n.type}</span>
                  <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{n.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{n.message}</p>
                {n.link && (
                  <a
                    href={n.link}
                    download
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300"
                  >
                    <span>Acessar Arquivo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
