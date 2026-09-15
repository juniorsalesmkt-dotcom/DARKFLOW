import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PagesView } from './components/PagesView';
import { LibraryView } from './components/LibraryView';
import { TemplatesView } from './components/TemplatesView';
import { VisualEditor } from './components/VisualEditor';
import { ProductionView } from './components/ProductionView';
import { ExportsView } from './components/ExportsView';
import { MineradorView } from './components/MineradorView';
import { SettingsView } from './components/SettingsView';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { BatchUploadModal } from './components/BatchUploadModal';
import { AuthView } from './components/AuthView';
import { AuthService } from './services/AuthService';
import { PageService } from './services/PageService';
import { VideoService } from './services/VideoService';
import { TemplateService } from './services/TemplateService';
import { ProductionService } from './services/ProductionService';
import { ExportService } from './services/ExportService';
import { NotificationService } from './services/NotificationService';
import { TagService } from './services/TagService';
import { UploadQueueService } from './services/UploadQueueService';
import { 
  User, Page, Video, Template, Production, ExportBatch, 
  AppNotification, Tag 
} from './types';
import { Sparkles, Loader2 } from 'lucide-react';

export default function App() {
  // Auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<NavItem>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // App Data (Loaded directly from Firestore)
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [exportsList, setExportsList] = useState<ExportBatch[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Modals & Sub-flows
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Partial<Video> | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Production wizard jump state
  const [preselectedVideoIds, setPreselectedVideoIds] = useState<string[]>([]);
  const [preselectedTemplateId, setPreselectedTemplateId] = useState<string | undefined>(undefined);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);

  // 1. Listen for Authentication changes
  useEffect(() => {
    const unsubscribe = AuthService.onAuthState(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await AuthService.getUserProfile(fbUser.uid);
          if (profile) {
            setUser(profile);
          } else {
            const fallback: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário DARKFLOW',
              email: fbUser.email || '',
              plan: 'PRO',
              avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.email || 'DF')}`,
              createdAt: new Date().toISOString()
            };
            setUser(fallback);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUser(null);
        setPages([]);
        setVideos([]);
        setTemplates([]);
        setProductions([]);
        setExportsList([]);
        setNotifications([]);
        setTags([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Firestore collections for authenticated user
  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [p, v, t, prod, exp, notifs, tg] = await Promise.all([
        PageService.getPages(userId, true),
        VideoService.getVideos(userId),
        TemplateService.getTemplates(userId),
        ProductionService.getProductions(userId),
        ExportService.getExports(userId),
        NotificationService.getNotifications(userId),
        TagService.getTags(userId)
      ]);

      setPages(p);
      setVideos(v);
      setTemplates(t);
      setProductions(prod);
      setExportsList(exp);
      setNotifications(notifs);
      setTags(tg);

      // Auto-select first active page if none selected
      if (p.length > 0 && !selectedPageId) {
        const active = p.find(page => page.status !== 'ARCHIVED');
        setSelectedPageId(active ? active.id : p[0].id);
      }
    } catch (err) {
      console.error('Error loading Firestore collections:', err);
    }
  }, [selectedPageId]);

  useEffect(() => {
    if (firebaseUser?.uid) {
      loadUserData(firebaseUser.uid);
    }
  }, [firebaseUser, loadUserData]);

  // 3. Periodic polling for background queue updates & notifications
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const interval = setInterval(async () => {
      try {
        const [prod, exp, notifs] = await Promise.all([
          ProductionService.getProductions(firebaseUser.uid, selectedPageId || undefined),
          ExportService.getExports(firebaseUser.uid),
          NotificationService.getNotifications(firebaseUser.uid)
        ]);
        setProductions(prod);
        setExportsList(exp);
        setNotifications(notifs);
      } catch (e) {
        // quiet error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [firebaseUser, selectedPageId]);

  // Auth Logout
  const handleLogout = async () => {
    await AuthService.logout();
  };

  // Upload Complete Callback & Live Video Sync
  useEffect(() => {
    const unsub = UploadQueueService.onVideoCreated((video) => {
      setVideos(prev => {
        if (prev.some(v => v.id === video.id)) return prev;
        return [video, ...prev];
      });
      if (firebaseUser?.uid) {
        PageService.getPages(firebaseUser.uid, true).then(setPages).catch(() => {});
      }
    });
    return unsub;
  }, [firebaseUser]);

  const handleUploadSuccess = (newVideos: Video[]) => {
    setVideos(prev => {
      const existingIds = new Set(prev.map(v => v.id));
      const filtered = newVideos.filter(v => !existingIds.has(v.id));
      return [...filtered, ...prev];
    });
    if (firebaseUser?.uid) {
      loadUserData(firebaseUser.uid);
    }
  };

  // Handler: Update / Rename Video
  const handleUpdateVideo = async (id: string, updates: Partial<Video>) => {
    await VideoService.updateVideo(id, updates);
    setVideos(prev => prev.map(v => (v.id === id ? { ...v, ...updates } : v)));
  };

  // Handler: Delete videos
  const handleBatchDeleteVideos = async (ids: string[]) => {
    await VideoService.batchDeleteVideos(ids);
    setVideos(prev => prev.filter(v => !ids.includes(v.id)));
    if (firebaseUser?.uid) {
      const p = await PageService.getPages(firebaseUser.uid, true);
      setPages(p);
    }
  };

  // Handler: Tag videos
  const handleBatchTagVideos = async (ids: string[], customTags: string[]) => {
    await VideoService.batchTagVideos(ids, customTags);
    if (firebaseUser?.uid) {
      const updated = await VideoService.getVideos(firebaseUser.uid);
      setVideos(updated);
    }
  };

  // Handler: Move videos
  const handleBatchMoveVideos = async (ids: string[], targetPageId: string) => {
    await VideoService.batchMoveVideos(ids, targetPageId);
    if (firebaseUser?.uid) {
      const [updatedVideos, updatedPages] = await Promise.all([
        VideoService.getVideos(firebaseUser.uid),
        PageService.getPages(firebaseUser.uid, true)
      ]);
      setVideos(updatedVideos);
      setPages(updatedPages);
    }
  };

  // Handler: Archive videos
  const handleBatchArchiveVideos = async (ids: string[]) => {
    await VideoService.batchArchiveVideos(ids);
    if (firebaseUser?.uid) {
      const updated = await VideoService.getVideos(firebaseUser.uid);
      setVideos(updated);
    }
  };

  // Handler: Pages CRUD
  const handleCreatePage = async (data: Partial<Page>) => {
    if (!firebaseUser?.uid) return;
    const created = await PageService.createPage(firebaseUser.uid, {
      name: data.name || 'Novo Canal',
      username: data.username || '@canal',
      platform: data.platform || 'instagram',
      avatarUrl: data.avatarUrl,
      description: data.description
    });
    setPages(prev => [created, ...prev]);
    setSelectedPageId(created.id);
  };

  const handleUpdatePage = async (id: string, data: Partial<Page>) => {
    await PageService.updatePage(id, data);
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const handleDuplicatePage = async (id: string) => {
    const duplicated = await PageService.duplicatePage(id);
    setPages(prev => [duplicated, ...prev]);
  };

  const handleDeletePage = async (id: string) => {
    await PageService.deletePage(id);
    setPages(prev => prev.filter(p => p.id !== id));
    if (selectedPageId === id) {
      const remaining = pages.filter(p => p.id !== id);
      setSelectedPageId(remaining[0]?.id || '');
    }
  };

  const handleArchivePage = async (id: string, archive: boolean) => {
    await PageService.archivePage(id, archive);
    setPages(prev => prev.map(p => p.id === id ? { ...p, status: archive ? 'ARCHIVED' : 'ACTIVE' } : p));
  };

  // Handler: Templates CRUD
  const handleSaveTemplate = async (updated: Template) => {
    await TemplateService.updateTemplate(updated.id, updated);
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingTemplate(null);
  };

  const handleCreateNewTemplate = async () => {
    if (!firebaseUser?.uid) return;
    const newTpl = await TemplateService.createTemplate(firebaseUser.uid, {
      name: `Template #${templates.length + 1}`,
      pageId: selectedPageId || pages[0]?.id || '',
      aspectRatio: '9:16',
      width: 1080,
      height: 1920,
      background: '#090a0f',
      elements: [
        {
          id: `el_bg_video_${Date.now()}`,
          name: 'Área do Vídeo (Placeholder)',
          type: 'video_placeholder',
          x: 40,
          y: 360,
          width: 1000,
          height: 1200,
          zIndex: 1,
          opacity: 1,
          fit: 'cover',
          borderRadius: 24,
          borderColor: '#8b5cf6',
          borderWidth: 2
        },
        {
          id: `el_headline_${Date.now()}`,
          name: 'Texto / Headline',
          type: 'text',
          content: 'TÍTULO DO VÍDEO',
          x: 40,
          y: 180,
          width: 1000,
          height: 120,
          zIndex: 2,
          opacity: 1,
          color: '#ffffff',
          fontSize: 56,
          fontWeight: '800',
          fontFamily: 'Plus Jakarta Sans',
          textAlign: 'center'
        }
      ]
    });

    setTemplates(prev => [newTpl, ...prev]);
    setEditingTemplate(newTpl);
  };

  const handleDuplicateTemplate = async (id: string) => {
    const duplicated = await TemplateService.duplicateTemplate(id);
    setTemplates(prev => [duplicated, ...prev]);
  };

  const handleDeleteTemplate = async (id: string) => {
    await TemplateService.deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Handler: Start Production with selected videos
  const handleStartProductionWithVideos = (videoIds: string[]) => {
    setPreselectedVideoIds(videoIds);
    setCurrentTab('PRODUCAO');
  };

  // Handler: Use template in production
  const handleUseTemplateInProduction = (templateId: string) => {
    setPreselectedTemplateId(templateId);
    setCurrentTab('PRODUCAO');
  };

  // Handler: Launch production
  const handleCreateProduction = async (data: { pageId: string; templateId: string; videoIds: string[]; title?: string }) => {
    if (!firebaseUser?.uid) return;
    const res = await ProductionService.createProduction(firebaseUser.uid, data);
    const updatedProd = await ProductionService.getProductions(firebaseUser.uid);
    setProductions(updatedProd);
    setSelectedProductionId(res.id);
  };

  const handleCancelProduction = async (id: string) => {
    await ProductionService.cancelProduction(id);
    if (firebaseUser?.uid) {
      const updatedProd = await ProductionService.getProductions(firebaseUser.uid);
      setProductions(updatedProd);
    }
  };

  const handleRetryProduction = async (id: string) => {
    await ProductionService.retryProduction(id);
    if (firebaseUser?.uid) {
      const updatedProd = await ProductionService.getProductions(firebaseUser.uid);
      setProductions(updatedProd);
    }
  };

  const handleGenerateZip = async (productionId: string) => {
    if (!firebaseUser?.uid) return;
    await ExportService.generateZip(firebaseUser.uid, productionId);
    const exps = await ExportService.getExports(firebaseUser.uid);
    setExportsList(exps);
    setCurrentTab('EXPORTACOES');
  };

  // Notification handlers
  const handleMarkAllNotificationsRead = async () => {
    if (!firebaseUser?.uid) return;
    await NotificationService.markAllAsRead(firebaseUser.uid);
    const notifs = await NotificationService.getNotifications(firebaseUser.uid);
    setNotifications(notifs);
  };

  const handleMarkNotificationRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    if (firebaseUser?.uid) {
      const notifs = await NotificationService.getNotifications(firebaseUser.uid);
      setNotifications(notifs);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    await NotificationService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Tag handlers
  const handleCreateTag = async (name: string) => {
    if (!firebaseUser?.uid) return;
    const t = await TagService.createTag(firebaseUser.uid, name);
    setTags(prev => [...prev, t]);
  };

  const handleDeleteTag = async (tagId: string) => {
    await TagService.deleteTag(tagId);
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  // Count of active productions for sidebar badge
  const activeProdCount = productions.filter(p => p.status === 'processing' || p.status === 'queued').length;

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center text-white">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#121522] border border-[#212638] shadow-2xl">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/40 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-wider font-mono">DARKFLOW</h2>
            <p className="text-xs text-slate-400">Carregando autenticação...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Logged In -> Show Auth View
  if (!firebaseUser) {
    return <AuthView onAuthSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col antialiased">
      {/* Visual Editor Overlay */}
      {editingTemplate && (
        <VisualEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={previewVideo}
        onClose={() => setPreviewVideo(null)}
      />

      {/* Batch Upload Modal (with concurrency limit 5 & progress tracking) */}
      <BatchUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        pages={pages}
        currentUserId={firebaseUser.uid}
        selectedPageId={selectedPageId}
        onUploadSuccess={handleUploadSuccess}
        onOpenNewPageModal={() => {
          setIsUploadModalOpen(false);
          setCurrentTab('PAGINAS');
        }}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onMarkAsRead={handleMarkNotificationRead}
        onDelete={handleDeleteNotification}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        isOpenMobile={isMobileMenuOpen}
        onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeProductionsCount={activeProdCount}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Sticky Header with Page Switcher & Global Actions */}
        <Header
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPageId={setSelectedPageId}
          onOpenNewPageModal={() => setCurrentTab('PAGINAS')}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenProductionWizard={() => {
            setPreselectedVideoIds([]);
            setCurrentTab('PRODUCAO');
          }}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          notifications={notifications}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'DASHBOARD' && (
            <DashboardView
              videos={videos}
              productions={productions}
              templates={templates}
              pages={pages}
              notifications={notifications}
              onNavigateTab={setCurrentTab}
              onOpenProductionWizard={() => {
                setPreselectedVideoIds([]);
                setCurrentTab('PRODUCAO');
              }}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenNewPageModal={() => setCurrentTab('PAGINAS')}
              onPreviewVideo={setPreviewVideo}
            />
          )}

          {currentTab === 'MINERADOR' && (
            <MineradorView
              pages={pages}
              selectedPageId={selectedPageId}
              onVideoImported={(video) => {
                setVideos(prev => [video, ...prev]);
                setCurrentTab('BIBLIOTECA');
              }}
              onNavigateToSettings={() => setCurrentTab('CONFIGURACOES')}
            />
          )}

          {currentTab === 'BIBLIOTECA' && (
            <LibraryView
              videos={videos}
              pages={pages}
              selectedPageId={selectedPageId}
              tags={tags}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onBatchDelete={handleBatchDeleteVideos}
              onBatchTag={handleBatchTagVideos}
              onBatchMove={handleBatchMoveVideos}
              onBatchArchive={handleBatchArchiveVideos}
              onStartProductionWithVideos={handleStartProductionWithVideos}
              onPreviewVideo={setPreviewVideo}
              onUpdateVideo={handleUpdateVideo}
            />
          )}

          {currentTab === 'TEMPLATES' && (
            <TemplatesView
              templates={templates}
              pages={pages}
              selectedPageId={selectedPageId}
              onOpenEditor={setEditingTemplate}
              onCreateNewTemplate={handleCreateNewTemplate}
              onDuplicateTemplate={handleDuplicateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onUseTemplateInProduction={handleUseTemplateInProduction}
            />
          )}

          {currentTab === 'PRODUCAO' && (
            <ProductionView
              productions={productions}
              videos={videos}
              templates={templates}
              pages={pages}
              selectedPageId={selectedPageId}
              selectedProductionId={selectedProductionId}
              onSelectProduction={setSelectedProductionId}
              onCreateProduction={handleCreateProduction}
              onCancelProduction={handleCancelProduction}
              onRetryProduction={handleRetryProduction}
              onGenerateZip={handleGenerateZip}
              onPreviewVideo={setPreviewVideo}
              preselectedVideoIds={preselectedVideoIds}
              preselectedTemplateId={preselectedTemplateId}
            />
          )}

          {currentTab === 'EXPORTACOES' && (
            <ExportsView
              exports={exportsList}
              productions={productions}
              onGenerateZip={handleGenerateZip}
              onRefresh={async () => {
                if (firebaseUser?.uid) {
                  const exps = await ExportService.getExports(firebaseUser.uid);
                  setExportsList(exps);
                }
              }}
            />
          )}

          {currentTab === 'PAGINAS' && (
            <PagesView
              pages={pages}
              selectedPageId={selectedPageId}
              videos={videos}
              templates={templates}
              productions={productions}
              onSelectActivePage={setSelectedPageId}
              onCreatePage={handleCreatePage}
              onUpdatePage={handleUpdatePage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              onArchivePage={handleArchivePage}
              onNavigateToLibrary={(pageId) => {
                setSelectedPageId(pageId);
                setCurrentTab('BIBLIOTECA');
              }}
              onNavigateToTemplates={(pageId) => {
                setSelectedPageId(pageId);
                setCurrentTab('TEMPLATES');
              }}
            />
          )}

          {currentTab === 'CONFIGURACOES' && (
            <SettingsView
              user={user}
              onUpdateUser={async (data) => {
                if (firebaseUser?.uid) {
                  await AuthService.updateUserProfile(firebaseUser.uid, data);
                  setUser(prev => prev ? { ...prev, ...data } : null);
                }
              }}
              onLogout={handleLogout}
              tags={tags}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
            />
          )}
        </main>
      </div>
    </div>
  );
}
