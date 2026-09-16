import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { AnnouncementBar } from './components/AnnouncementBar.js';
import { UploadSection } from './components/UploadSection.js';
import { MyFilesSection } from './components/MyFilesSection.js';
import { PlansSection } from './components/PlansSection.js';
import { AdminPanel } from './components/AdminPanel.js';
import { DownloadView } from './components/DownloadView.js';
import { AuthModal } from './components/AuthModal.js';
import { ShareModal } from './components/ShareModal.js';
import { FilePreviewModal } from './components/FilePreviewModal.js';
import { HeadCodeInjector } from './components/HeadCodeInjector.js';
import { api, getStoredToken, setStoredToken } from './lib/api.js';
import { User, Plan, FileItem, SiteSettings } from './types.js';
import { Zap, ShieldCheck, Heart, MessageCircle, Mail, HardDrive } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'upload' | 'files' | 'plans' | 'admin'>('upload');
  const [shareToken, setShareToken] = useState<string | null>(null);

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

  // Check URL hash for shared file links e.g. #/share/:token
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/share\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setShareToken(match[1]);
      } else {
        setShareToken(null);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Initial data loading
  useEffect(() => {
    initApp();
  }, []);

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
        }
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
      if (user) {
        setUser(prev => prev ? { ...prev, usedStorageBytes: res.totalStorageBytes } : null);
      }
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
      setCurrentTab('admin');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setStoredToken(null);
    setUser(null);
    setPlan(null);
    setFiles([]);
    setCurrentTab('upload');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Dynamic <head> Code & Verification Injector */}
      <HeadCodeInjector code={settings?.customHeadCode} />

      {/* Top Announcement Bar */}
      <AnnouncementBar settings={settings} />

      {/* Main Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          window.location.hash = '';
          setCurrentTab(tab);
        }}
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
        {shareToken ? (
          /* Public Download View with Multi-Zone Ads */
          <DownloadView
            shareToken={shareToken}
            settings={settings}
            onBackHome={() => {
              window.location.hash = '';
              setCurrentTab('upload');
            }}
            onOpenPreview={(f) => setPreviewFile(f)}
          />
        ) : (
          /* Tab Routing */
          <>
            {currentTab === 'upload' && (
              <UploadSection
                user={user}
                plan={plan}
                onOpenAuth={(mode) => {
                  setAuthMode(mode);
                  setAuthOpen(true);
                }}
                onOpenPlans={() => setCurrentTab('plans')}
                onUploadSuccess={handleUploadSuccess}
                onOpenShareModal={(f) => setShareModalFile(f)}
              />
            )}

            {currentTab === 'files' && (
              <MyFilesSection
                user={user}
                plan={plan}
                files={files}
                loading={loadingFiles}
                onRefreshFiles={loadUserFiles}
                onOpenUpload={() => setCurrentTab('upload')}
                onOpenPreview={(f) => setPreviewFile(f)}
                onOpenShareModal={(f) => setShareModalFile(f)}
              />
            )}

            {currentTab === 'plans' && (
              <PlansSection
                plans={plans}
                user={user}
                currentPlan={plan}
                onOpenAuth={(mode) => {
                  setAuthMode(mode);
                  setAuthOpen(true);
                }}
                onPlanUpdated={handlePlanUpdated}
              />
            )}

            {currentTab === 'admin' && (
              <AdminPanel
                currentUser={user}
                onRefreshGlobalPlans={refreshGlobalPlans}
                onOpenAuth={(mode) => {
                  setAuthMode(mode);
                  setAuthOpen(true);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-slate-950 border-t border-slate-900 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">TG <span className="text-cyan-400">Uploads</span></span>
              <p className="text-[11px] text-slate-500">Fast, encrypted file delivery & cloud storage</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <button onClick={() => setCurrentTab('upload')} className="hover:text-cyan-400 transition-colors cursor-pointer">
              Upload Files
            </button>
            <button onClick={() => setCurrentTab('plans')} className="hover:text-cyan-400 transition-colors cursor-pointer">
              Pricing Plans
            </button>
            <button onClick={() => setCurrentTab('files')} className="hover:text-cyan-400 transition-colors cursor-pointer">
              File Vault
            </button>
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
              <button
                id="footer-admin-portal-btn"
                onClick={() => setCurrentTab('admin')}
                className="hover:text-purple-400 transition-colors flex items-center gap-1 font-semibold text-purple-300 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Admin Portal
              </button>
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
