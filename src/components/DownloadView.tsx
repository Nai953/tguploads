import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Lock, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Loader2,
  HardDrive
} from 'lucide-react';
import { FileItem, SiteSettings } from '../types.js';
import { api } from '../lib/api.js';
import { formatBytes, formatDate, getFileCategory } from '../lib/utils.js';
import { AdUnit } from './AdUnit.js';

interface DownloadViewProps {
  shareToken: string;
  settings?: SiteSettings | null;
  onBackHome: () => void;
  onOpenPreview: (file: FileItem) => void;
}

export const DownloadView: React.FC<DownloadViewProps> = ({
  shareToken,
  settings: propSettings,
  onBackHome,
  onOpenPreview
}) => {
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<SiteSettings | null>(propSettings || null);

  // Password unlock
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    loadFileInfo();
    if (!propSettings) {
      api.getSettings().then(setLocalSettings).catch(() => {});
    } else {
      setLocalSettings(propSettings);
    }
  }, [shareToken, propSettings]);

  const loadFileInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSharedFile(shareToken);
      setFile(data);
      if (!data.isPasswordProtected) {
        setUnlocked(true);
      }
    } catch (err: any) {
      setError(err.message || 'File not found or the link has expired');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setVerifyingPassword(true);

    try {
      const res = await api.verifySharePassword(shareToken, password);
      if (res.valid) {
        setUnlocked(true);
      } else {
        setPasswordError('Incorrect password');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Verification failed');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleDownload = () => {
    if (!file) return;
    const url = api.getDownloadUrl(file.shareToken, password || undefined);
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Locating file on TG Uploads Cloud...</p>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">File Unavailable</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {error || 'This download link is invalid or has expired.'}
          </p>
        </div>
        <button
          onClick={onBackHome}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to TG Uploads Homepage</span>
        </button>
      </div>
    );
  }

  const category = getFileCategory(file.mimeType, file.originalName);
  const adsActive = localSettings?.adsEnabled !== false;
  const hasSidebarAd = adsActive && Boolean(localSettings?.adDownloadSidebar?.trim());

  return (
    <div id="download-page-container" className={`mx-auto py-6 px-4 space-y-6 ${hasSidebarAd ? 'max-w-5xl' : 'max-w-2xl'}`}>
      
      {/* Popunder Ad Script Container (runs silently if configured) */}
      {adsActive && (
        <AdUnit 
          spotName="popunder" 
          code={localSettings?.adDownloadPopunder} 
          isPopunder={true} 
        />
      )}

      {/* Return Button */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-home"
          onClick={onBackHome}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to TG Uploads</span>
        </button>

        <span className="text-[11px] text-slate-500 font-mono">
          Safe & Verified Download
        </span>
      </div>

      {/* AD AREA 1: TOP BANNER AD (Above Main Card) */}
      {adsActive && localSettings?.adDownloadTop && (
        <AdUnit
          spotName="top-banner"
          code={localSettings.adDownloadTop}
          label="Sponsored Advertisement"
          className="shadow-lg border-cyan-500/10"
        />
      )}

      {/* Main Grid: Card & Optional Sidebar */}
      <div className={`grid gap-6 items-start ${hasSidebarAd ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        
        {/* Main Content Column */}
        <div className={`space-y-6 ${hasSidebarAd ? 'lg:col-span-2' : ''}`}>
          
          {/* Main Download Card */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header & Icon */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>

              <div className="truncate flex-1 space-y-1">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate" title={file.originalName}>
                  {file.originalName}
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Uploaded by {file.uploaderName || 'TG User'} • {formatDate(file.createdAt).split(',')[0]}
                </p>
              </div>
            </div>

            {/* File Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="block text-[10px] uppercase font-bold text-slate-500">File Size</span>
                <span className="text-sm font-bold text-white font-mono">{formatBytes(file.sizeBytes)}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Total Downloads</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">{file.downloadCount}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 col-span-2 sm:col-span-1">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Security</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Clean & Encrypted
                </span>
              </div>
            </div>

            {file.description && (
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Uploader Note</p>
                <p>{file.description}</p>
              </div>
            )}

            {/* AD AREA 2: IN-CARD AD (Below File Details / Specs) */}
            {adsActive && localSettings?.adDownloadBelowDetails && (
              <AdUnit
                spotName="inside-card-details"
                code={localSettings.adDownloadBelowDetails}
                label="Sponsored Link"
                className="my-2 bg-slate-950/90 border-slate-800/60"
              />
            )}

            {/* Password Protection Form or Download Buttons */}
            {!unlocked && file.isPasswordProtected ? (
              <form onSubmit={handleVerifyPassword} className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Lock className="w-4 h-4" />
                  <span>This file requires a security password</span>
                </div>

                {passwordError && (
                  <p className="text-xs text-rose-400">{passwordError}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="input-unlock-password"
                    type="password"
                    required
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    id="btn-unlock-file"
                    type="submit"
                    disabled={verifyingPassword}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {verifyingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Unlock</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Download & Preview Actions */
              <div className="space-y-3">
                <button
                  id="btn-main-download"
                  onClick={handleDownload}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-2xl shadow-cyan-500/30 transition-all flex items-center justify-center gap-3 cursor-pointer hover:scale-101"
                >
                  <Download className="w-5 h-5" />
                  <span>Download File ({formatBytes(file.sizeBytes)})</span>
                </button>

                {/* AD AREA 3: DIRECTLY UNDER DOWNLOAD BUTTON */}
                {adsActive && localSettings?.adDownloadBelowButton && (
                  <AdUnit
                    spotName="under-download-btn"
                    code={localSettings.adDownloadBelowButton}
                    label="Promoted"
                    className="my-3 bg-slate-950/80 border-slate-800/80"
                  />
                )}

                {(category === 'image' || category === 'video' || category === 'audio') && (
                  <button
                    id="btn-preview-shared-file"
                    onClick={() => onOpenPreview(file)}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Preview in Browser</span>
                  </button>
                )}
              </div>
            )}

            {/* Expiration Note */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {file.expiresAt ? `Link expires on ${formatDate(file.expiresAt)}` : 'Permanent storage link'}
              </span>
              <span>Hosted on TG Uploads</span>
            </div>
          </div>

          {/* Join TG Uploads Promotion */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-cyan-950/30 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Need to share large files fast?
              </h4>
              <p className="text-xs text-slate-400">
                Sign up for free and get 5 GB cloud storage instantly with no credit card required.
              </p>
            </div>

            <button
              id="btn-cta-signup"
              onClick={onBackHome}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        </div>

        {/* AD AREA 4: SIDEBAR AD (Desktop Column) */}
        {hasSidebarAd && (
          <div className="space-y-4 lg:sticky lg:top-24">
            <AdUnit
              spotName="sidebar-ad"
              code={localSettings?.adDownloadSidebar}
              label="Sponsored"
              className="p-4 bg-slate-900 border-slate-800 shadow-xl"
            />
          </div>
        )}
      </div>

      {/* AD AREA 5: BOTTOM BANNER AD */}
      {adsActive && localSettings?.adDownloadBottom && (
        <AdUnit
          spotName="bottom-banner"
          code={localSettings.adDownloadBottom}
          label="Advertisement"
          className="shadow-lg border-slate-800"
        />
      )}
    </div>
  );
};
