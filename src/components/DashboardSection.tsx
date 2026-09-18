import React from 'react';
import { 
  HardDrive, 
  UploadCloud, 
  FolderOpen, 
  Crown, 
  Download, 
  Share2, 
  Eye, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Image, 
  Film, 
  Music, 
  Archive, 
  Code2, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { User, Plan, FileItem } from '../types.js';
import { formatBytes, formatDate, getFileCategory } from '../lib/utils.js';
import { Link, useRouter } from '../lib/router.js';

interface DashboardSectionProps {
  user: User | null;
  plan: Plan | null;
  files: FileItem[];
  loading: boolean;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenPreview: (file: FileItem) => void;
  onOpenShareModal: (file: FileItem) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  user,
  plan,
  files,
  loading,
  onOpenAuth,
  onOpenPreview,
  onOpenShareModal
}) => {
  const { navigate } = useRouter();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // If user is not logged in, show an authenticated dashboard welcome/sign-in screen
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
            <HardDrive className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              User Dashboard & Cloud Storage
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Sign in or create a free account to track your storage quota, monitor real-time file downloads, manage shareable links, and unlock faster speeds.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="dash-login-btn"
              onClick={() => onOpenAuth('login')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all cursor-pointer shadow-md"
            >
              Sign In to Dashboard
            </button>
            <button
              id="dash-register-btn"
              onClick={() => onOpenAuth('register')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Create Free Account (5 GB Free)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-left">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1">
              <div className="text-cyan-400 text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Quotas</span>
              </div>
              <p className="text-xs text-slate-400">Track total used storage and upload limits in real-time.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1">
              <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Download Telemetry</span>
              </div>
              <p className="text-xs text-slate-400">See how many times your shared files have been downloaded.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1">
              <div className="text-purple-400 text-xs font-semibold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>Plan Upgrades</span>
              </div>
              <p className="text-xs text-slate-400">Upgrade to Pro or Ultra tiers with instant cryptocurrency checkout.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const usedBytes = user.usedStorageBytes || 0;
  const limitBytes = plan?.storageLimitBytes || 5 * 1024 * 1024 * 1024;
  const usagePercent = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
  const totalDownloads = files.reduce((acc, f) => acc + (f.downloadCount || 0), 0);
  const recentFiles = [...files].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  // Category breakdown
  const categoryStats: Record<string, { bytes: number; count: number }> = {
    image: { bytes: 0, count: 0 },
    video: { bytes: 0, count: 0 },
    audio: { bytes: 0, count: 0 },
    archive: { bytes: 0, count: 0 },
    code: { bytes: 0, count: 0 },
    document: { bytes: 0, count: 0 },
  };

  files.forEach(file => {
    const cat = getFileCategory(file.mimeType, file.originalName);
    const key = categoryStats[cat] ? cat : 'document';
    categoryStats[key].bytes += file.sizeBytes;
    categoryStats[key].count += 1;
  });

  const handleCopyShareLink = (shareToken: string, fileId: string) => {
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'image': return <Image className="w-4 h-4 text-emerald-400" />;
      case 'video': return <Film className="w-4 h-4 text-purple-400" />;
      case 'audio': return <Music className="w-4 h-4 text-amber-400" />;
      case 'archive': return <Archive className="w-4 h-4 text-rose-400" />;
      case 'code': return <Code2 className="w-4 h-4 text-cyan-400" />;
      default: return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      
      {/* Dashboard Top Greeting & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Account Dashboard
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              {plan?.name || 'Starter Plan'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hello, {user.name || user.email.split('@')[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Welcome to your storage command center. Manage files, track bandwidth, and review share links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/upload"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New File</span>
          </Link>
          <Link
            to="/files"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 transition-all border border-slate-700 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>Open Vault</span>
          </Link>
          <Link
            to="/plans"
            className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Upgrade</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Storage Meter */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Storage Quota
            </span>
            <span className="text-cyan-400 font-mono font-bold">{usagePercent}%</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {formatBytes(usedBytes)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              of {formatBytes(limitBytes)} capacity
            </div>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.max(3, usagePercent)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Total Files */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              Stored Files
            </span>
            <Link to="/files" className="text-emerald-400 hover:underline text-[11px]">
              Browse →
            </Link>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {files.length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              active files in your vault
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Max size: {formatBytes(plan?.maxFileSizeBytes || 500 * 1024 * 1024)}/file
          </div>
        </div>

        {/* Metric 3: Total Downloads */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4 text-purple-400" />
              Total Downloads
            </span>
            <span className="text-purple-400 text-[11px] font-semibold">Shared Reach</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {totalDownloads.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              downloads across all links
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Speed: {plan?.downloadSpeed || 'High-Speed'}
          </div>
        </div>

        {/* Metric 4: Plan Status */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              Subscription Tier
            </span>
            <Link to="/plans" className="text-amber-400 hover:underline text-[11px]">
              Change →
            </Link>
          </div>
          <div>
            <div className="text-xl font-black text-amber-300">
              {plan?.name || 'Starter Plan'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {user.planExpiresAt && user.planId !== 'plan_free' 
                ? `Renews ${formatDate(user.planExpiresAt)}`
                : 'No expiration / Permanent'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            {plan?.directLinks ? '✓ Direct Links Enabled' : 'Standard Web Delivery'}
          </div>
        </div>

      </div>

      {/* Storage Category Breakdown */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Storage Breakdown by File Type</span>
          </h2>
          <span className="text-xs text-slate-400">{formatBytes(usedBytes)} total</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex">
          {usedBytes > 0 ? (
            <>
              {categoryStats.image.bytes > 0 && (
                <div 
                  style={{ width: `${(categoryStats.image.bytes / usedBytes) * 100}%` }} 
                  className="bg-emerald-500 h-full" 
                  title={`Images: ${formatBytes(categoryStats.image.bytes)}`}
                />
              )}
              {categoryStats.video.bytes > 0 && (
                <div 
                  style={{ width: `${(categoryStats.video.bytes / usedBytes) * 100}%` }} 
                  className="bg-purple-500 h-full" 
                  title={`Videos: ${formatBytes(categoryStats.video.bytes)}`}
                />
              )}
              {categoryStats.audio.bytes > 0 && (
                <div 
                  style={{ width: `${(categoryStats.audio.bytes / usedBytes) * 100}%` }} 
                  className="bg-amber-500 h-full" 
                  title={`Audio: ${formatBytes(categoryStats.audio.bytes)}`}
                />
              )}
              {categoryStats.archive.bytes > 0 && (
                <div 
                  style={{ width: `${(categoryStats.archive.bytes / usedBytes) * 100}%` }} 
                  className="bg-rose-500 h-full" 
                  title={`Archives: ${formatBytes(categoryStats.archive.bytes)}`}
                />
              )}
              {categoryStats.code.bytes > 0 && (
                <div 
                  style={{ width: `${(categoryStats.code.bytes / usedBytes) * 100}%` }} 
                  className="bg-cyan-500 h-full" 
                  title={`Code/Text: ${formatBytes(categoryStats.code.bytes)}`}
                />
              )}
              {categoryStats.document.bytes > 0 && (
                <div 
                  style={{ width: `${(categoryStats.document.bytes / usedBytes) * 100}%` }} 
                  className="bg-blue-500 h-full" 
                  title={`Documents: ${formatBytes(categoryStats.document.bytes)}`}
                />
              )}
            </>
          ) : (
            <div className="w-full bg-slate-800 h-full" />
          )}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {[
            { label: 'Images', cat: 'image', color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Videos', cat: 'video', color: 'text-purple-400 bg-purple-500/10' },
            { label: 'Audio', cat: 'audio', color: 'text-amber-400 bg-amber-500/10' },
            { label: 'Archives', cat: 'archive', color: 'text-rose-400 bg-rose-500/10' },
            { label: 'Code', cat: 'code', color: 'text-cyan-400 bg-cyan-500/10' },
            { label: 'Documents', cat: 'document', color: 'text-blue-400 bg-blue-500/10' },
          ].map(item => (
            <div key={item.cat} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                {getCategoryIcon(item.cat)}
                <span>{item.label}</span>
              </div>
              <div className="text-xs font-bold text-white">
                {formatBytes(categoryStats[item.cat]?.bytes || 0)}
              </div>
              <div className="text-[10px] text-slate-500">
                {categoryStats[item.cat]?.count || 0} file{categoryStats[item.cat]?.count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Files Table & Shortcuts */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Recent Uploads</span>
            </h2>
            <p className="text-xs text-slate-400">Quickly access and share your recently uploaded files.</p>
          </div>

          <Link
            to="/files"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>View All Files ({files.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentFiles.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {recentFiles.map(file => {
              const cat = getFileCategory(file.mimeType, file.originalName);
              const isCopied = copiedId === file.id;

              return (
                <div 
                  key={file.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-800/30 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                      {getCategoryIcon(cat)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{formatBytes(file.sizeBytes)}</span>
                        <span>•</span>
                        <span>{formatDate(file.createdAt)}</span>
                        <span>•</span>
                        <span className="text-cyan-400">{file.downloadCount} downloads</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyShareLink(file.shareToken, file.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Share Link'}</span>
                    </button>

                    <button
                      onClick={() => onOpenPreview(file)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Preview File"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenShareModal(file)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Share modal & QR Code"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={`/api/download/${file.id}`}
                      download={file.originalName}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">You haven't uploaded any files yet.</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Your First File</span>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
};
