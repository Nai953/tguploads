import React from 'react';
import { 
  Zap, 
  UploadCloud, 
  FolderOpen, 
  ShieldCheck, 
  Crown, 
  LogOut, 
  User as UserIcon, 
  HardDrive,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { User, Plan } from '../types.js';
import { formatBytes } from '../lib/utils.js';

interface NavbarProps {
  currentTab: 'upload' | 'files' | 'plans' | 'admin';
  setCurrentTab: (tab: 'upload' | 'files' | 'plans' | 'admin') => void;
  user: User | null;
  plan: Plan | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  plan,
  onOpenAuth,
  onLogout
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const isAdmin = user?.role === 'admin' || user?.email.toLowerCase() === 'teamthunderofficialyt@gmail.com';

  const usedBytes = user?.usedStorageBytes || 0;
  const limitBytes = plan?.storageLimitBytes || 5 * 1024 * 1024 * 1024;
  const usagePercent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

  return (
    <nav id="app-navbar" className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              id="brand-logo-btn"
              onClick={() => setCurrentTab('upload')}
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  TG <span className="text-cyan-400">Uploads</span>
                </span>
                <span className="text-[10px] block text-slate-400 font-mono uppercase tracking-wider">
                  Cloud Share
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <button
                id="nav-upload-tab"
                onClick={() => setCurrentTab('upload')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'upload'
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                Upload
              </button>

              <button
                id="nav-files-tab"
                onClick={() => setCurrentTab('files')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'files'
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                My Files
              </button>

              <button
                id="nav-plans-tab"
                onClick={() => setCurrentTab('plans')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'plans'
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-400" />
                Plans & Pricing
              </button>

              {isAdmin && (
                <button
                  id="nav-admin-tab"
                  onClick={() => setCurrentTab('admin')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    currentTab === 'admin'
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                      : 'text-purple-300 hover:text-purple-200 hover:bg-purple-950/40'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Admin Panel
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/30 text-purple-200 font-mono uppercase tracking-wider">
                    Staff
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right Area: Storage Meter & User Status */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Storage Quota Mini Widget */}
                <div 
                  id="user-storage-mini"
                  onClick={() => setCurrentTab('plans')}
                  title="Click to upgrade storage"
                  className="hidden lg:flex flex-col cursor-pointer bg-slate-900/80 hover:bg-slate-800/80 transition-colors border border-slate-800 rounded-xl px-3 py-1.5 min-w-[170px]"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <HardDrive className="w-3 h-3 text-cyan-400" />
                      {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
                    </span>
                    <span className="text-cyan-400 font-mono font-semibold">{usagePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.max(4, usagePercent)}%` }}
                    />
                  </div>
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    id="user-profile-btn"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                        {user.name || user.email}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-medium">
                        {plan?.name || 'Free Starter'}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div 
                      id="user-dropdown-menu"
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="px-3 py-2.5 border-b border-slate-800">
                        <p className="text-xs font-semibold text-white truncate">{user.name || 'User'}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Sparkles className="w-2.5 h-2.5" />
                            {plan?.name || 'Free Starter'}
                          </span>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        {user.planExpiresAt && user.planId !== 'plan_free' && (
                          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Renewal/Expiry:</span>
                            <span className="font-semibold text-cyan-300">
                              {new Date(user.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          id="menu-my-files-btn"
                          onClick={() => {
                            setCurrentTab('files');
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                        >
                          <FolderOpen className="w-4 h-4 text-cyan-400" />
                          My Stored Files
                        </button>

                        <button
                          id="menu-plans-btn"
                          onClick={() => {
                            setCurrentTab('plans');
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                        >
                          <Crown className="w-4 h-4 text-amber-400" />
                          Upgrade Plan & Storage
                        </button>

                        {isAdmin && (
                          <button
                            id="menu-admin-btn"
                            onClick={() => {
                              setCurrentTab('admin');
                              setDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-950/40 rounded-lg transition-colors font-medium"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-400" />
                            TG Uploads Admin Panel
                          </button>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-800">
                        <button
                          id="menu-logout-btn"
                          onClick={() => {
                            setDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="nav-login-btn"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  id="nav-register-btn"
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-102 cursor-pointer"
                >
                  Free Signup
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80">
          <button
            id="mobile-nav-upload"
            onClick={() => setCurrentTab('upload')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
              currentTab === 'upload' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Upload
          </button>
          <button
            id="mobile-nav-files"
            onClick={() => setCurrentTab('files')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
              currentTab === 'files' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Files
          </button>
          <button
            id="mobile-nav-plans"
            onClick={() => setCurrentTab('plans')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
              currentTab === 'plans' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            Plans
          </button>
          {isAdmin && (
            <button
              id="mobile-nav-admin"
              onClick={() => setCurrentTab('admin')}
              className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-lg ${
                currentTab === 'admin' ? 'text-purple-400' : 'text-purple-300/70'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
