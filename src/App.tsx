import React, { useState, useEffect } from 'react';
import { RouterProvider, useRouter, Link } from './lib/router.js';
import { Navbar } from './components/Navbar.js';
import { AnnouncementBar } from './components/AnnouncementBar.js';
import { UploadSection } from './components/UploadSection.js';
import { DashboardSection } from './components/DashboardSection.js';
import { MyFilesSection } from './components/MyFilesSection.js';
import { PlansSection } from './components/PlansSection.js';
import { AdminPanel } from './components/AdminPanel.js';
import { DownloadView } from './components/DownloadView.js';
import { NotFoundPage } from './components/NotFoundPage.js';
import { AuthModal } from './components/AuthModal.js';
import { ShareModal } from './components/ShareModal.js';
import { FilePreviewModal } from './components/FilePreviewModal.js';
import { HeadCodeInjector } from './components/HeadCodeInjector.js';
import { api, getStoredToken, setStoredToken } from './lib/api.js';
import { User, Plan, FileItem, SiteSettings } from './types.js';
import { Zap, ShieldCheck, Heart, MessageCircle, Mail, HardDrive, LayoutDashboard, UploadCloud, FolderOpen, Crown } from 'lucide-react';

function AppInner() {
  const { pathname, params, navigate } = useRouter();

  // App data state
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Modals
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [shareModalFile, setShareModalFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const isAdmin = user?.role === 'admin' || user?.email.toLowerCase() === 'teamthunderofficialyt@gmail.com';

  // Initial data loading
  useEffect(() => {
    initApp();
  }, []);

  // Synchronize document title with current page
  useEffect(() => {
    const baseName = settings?.siteName || 'TG Uploads';
    if (params.token) {
      document.title = `Download File - ${baseName}`;
    } else if (pathname === '/dashboard') {
      document.title = `Dashboard - ${baseName}`;
    } else if (pathname === '/files' || pathname === '/vault') {
      document.title = `My Files - ${baseName}`;
    } else if (pathname === '/plans' || pathname === '/pricing') {
      document.title = `Plans & Pricing - ${baseName}`;
    } else if (pathname.startsWith('/admin')) {
      document.title = `Admin Control Panel - ${baseName}`;
    } else if (pathname === '/upload') {
      document.title = `Upload Files - ${baseName}`;
    } else {
      document.title = `${baseName} - Fast & Secure File Sharing`;
    }
  }, [pathname, params.token, settings?.siteName]);

  const initApp = async () => {
    try {
      const [settingsData, plansData] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getPlans().catch(() => [])
      ]);

      if (settingsData) setSettings(settingsData);
      if (plansData) setPlans(plansData);

      const token = getStoredToken();
      if (token) {
        try {
          const authRes = await api.getMe();
          setUser(authRes.user);
          setPlan(authRes.plan);
          loadUserFiles();
        } catch (e) {
          // Token expired or invalid
          setStoredToken(null);
          loadUserFiles();
        }
      } else {
        // Load guest files for this browser session
        loadUserFiles();
      }
    } catch (err) {
      console.error('App initialization error:', err);
    }
  };

  const loadUserFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await api.getMyFiles();
      setFiles(res.files);
      setUser(prev => prev ? { ...prev, usedStorageBytes: res.totalStorageBytes } : null);
    } catch (err) {
      console.error('Failed to load user files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleAuthSuccess = (authenticatedUser: User, activePlan: Plan) => {
    setUser(authenticatedUser);
    setPlan(activePlan);
    loadUserFiles();
    if (authenticatedUser.role === 'admin' || authenticatedUser.email.toLowerCase() === 'teamthunderofficialyt@gmail.com') {
      if (pathname === '/' || pathname === '/upload') {
        navigate('/admin');
      }
    } else if (pathname === '/' || pathname === '/login') {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setStoredToken(null);
    setUser(null);
    setPlan(null);
    loadUserFiles();
    navigate('/');
  };

  const handleUploadSuccess = (newFiles: FileItem[]) => {
    loadUserFiles();
  };

  const handlePlanUpdated = (newPlan: Plan, updatedUser: User) => {
    setPlan(newPlan);
    setUser(updatedUser);
  };

  const refreshGlobalPlans = async () => {
    try {
      const updatedPlans = await api.getPlans();
      setPlans(updatedPlans);
      if (user) {
        const userP = updatedPlans.find(p => p.id === user.planId);
        if (userP) setPlan(userP);
      }
    } catch (e) {}
  };

  // Determine which page to render based on URL
  const renderCurrentPage = () => {
    // 1. Share / Download File Page: /share/:token or /download/:token or /file/:token
    if (params.token) {
      return (
        <DownloadView
          shareToken={params.token}
          settings={settings}
          onBackHome={() => navigate('/upload')}
          onOpenPreview={(f) => setPreviewFile(f)}
        />
      );
    }

    // 2. Dashboard Page: /dashboard
    if (pathname === '/dashboard') {
      return (
        <DashboardSection
          user={user}
          plan={plan}
          files={files}
          loading={loadingFiles}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthOpen(true);
          }}
          onOpenPreview={(f) => setPreviewFile(f)}
          onOpenShareModal={(f) => setShareModalFile(f)}
        />
      );
    }

    // 3. File Vault Page: /files or /vault
    if (pathname === '/files' || pathname === '/vault') {
      return (
        <MyFilesSection
          user={user}
          plan={plan}
          files={files}
          loading={loadingFiles}
          onRefreshFiles={loadUserFiles}
          onOpenUpload={() => navigate('/upload')}
          onOpenPreview={(f) => setPreviewFile(f)}
          onOpenShareModal={(f) => setShareModalFile(f)}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthOpen(true);
          }}
        />
      );
    }

    // 4. Plans & Pricing Page: /plans or /pricing
    if (pathname === '/plans' || pathname === '/pricing') {
      return (
        <PlansSection
          plans={plans}
          user={user}
          currentPlan={plan}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthOpen(true);
          }}
          onPlanUpdated={handlePlanUpdated}
          onNavigateToAdminSettings={() => navigate('/admin')}
        />
      );
    }

    // 5. Admin Panel Page: /admin or /admin/*
    if (pathname.startsWith('/admin')) {
      const adminSubTab = pathname.replace(/^\/admin\/?/, '').trim();
      const validTabs = ['stats', 'plans', 'coupons', 'users', 'files', 'orders', 'ads', 'public-files', 'settings'] as const;
      const initialTab = validTabs.includes(adminSubTab as any) ? (adminSubTab as any) : undefined;

      return (
        <AdminPanel
          currentUser={user}
          onRefreshGlobalPlans={refreshGlobalPlans}
          initialTab={initialTab}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthOpen(true);
          }}
        />
      );
    }

    // 6. Home or Upload Page: / or /upload
    if (pathname === '/' || pathname === '/upload') {
      return (
        <UploadSection
          user={user}
          plan={plan}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setAuthOpen(true);
          }}
          onOpenPlans={() => navigate('/plans')}
          onUploadSuccess={handleUploadSuccess}
          onOpenShareModal={(f) => setShareModalFile(f)}
        />
      );
    }

    // 7. 404 Fallback
    return <NotFoundPage />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Dynamic <head> Code & Verification Injector */}
      <HeadCodeInjector code={settings?.customHeadCode} />

      {/* Top Announcement Bar */}
      <AnnouncementBar settings={settings} />

      {/* Main Top Navigation */}
      <Navbar
        user={user}
        plan={plan}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setAuthOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-slate-950 border-t border-slate-900 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/10">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight">TG <span className="text-cyan-400">Uploads</span></span>
                <p className="text-[11px] text-slate-500">Fast, encrypted file delivery & cloud storage</p>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <Link to="/upload" className="hover:text-cyan-400 transition-colors">
              Upload Files
            </Link>
            <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/files" className="hover:text-cyan-400 transition-colors">
              File Vault
            </Link>
            <Link to="/plans" className="hover:text-cyan-400 transition-colors">
              Pricing Plans
            </Link>
            {settings?.telegramChannel && (
              <a
                href={settings.telegramChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Telegram Channel
              </a>
            )}
            {isAdmin && (
              <Link
                id="footer-admin-portal-btn"
                to="/admin"
                className="hover:text-purple-400 transition-colors flex items-center gap-1 font-semibold text-purple-300"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Admin Portal
              </Link>
            )}
          </div>

          <div className="text-center md:text-right">
            <p className="text-slate-400">
              High-Speed Encrypted Cloud Distribution
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              © {new Date().getFullYear()} TG Uploads. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ShareModal
        file={shareModalFile}
        onClose={() => setShareModalFile(null)}
      />

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppInner />
    </RouterProvider>
  );
}
