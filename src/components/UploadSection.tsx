import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileUp, 
  Shield, 
  Lock, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Share2, 
  Sparkles, 
  AlertCircle, 
  Trash2, 
  HardDrive, 
  Crown,
  FileText,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { User, Plan, FileItem } from '../types.js';
import { formatBytes } from '../lib/utils.js';
import { api } from '../lib/api.js';

interface UploadSectionProps {
  user: User | null;
  plan: Plan | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenPlans: () => void;
  onUploadSuccess: (files: FileItem[]) => void;
  onOpenShareModal: (file: FileItem) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  user,
  plan,
  onOpenAuth,
  onOpenPlans,
  onUploadSuccess,
  onOpenShareModal
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [expiryDays, setExpiryDays] = useState<string>('0');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLoadedMB, setUploadLoadedMB] = useState('0.00');
  const [uploadTotalMB, setUploadTotalMB] = useState('0.00');
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recentlyUploaded, setRecentlyUploaded] = useState<FileItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectivePlan: Plan = plan || {
    id: 'guest',
    name: 'Guest (No Account)',
    description: 'Instant uploads up to 50 MB with 1 GB storage & 30-day retention',
    storageLimitBytes: 1024 * 1024 * 1024, // 1 GB
    maxFileSizeBytes: 50 * 1024 * 1024,    // 50 MB
    downloadSpeed: 'Standard',
    retentionDays: 30,                     // 30 days after last download
    passwordProtection: false,
    directLinks: false,
    prioritySupport: false,
    priceMonthly: 0,
    priceYearly: 0,
    active: true,
    features: [
      '50 MB Maximum File Size',
      '1 GB Total Storage Quota',
      '30-Day Retention After Last Download (Extends on Download)'
    ]
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragOver(true);
    } else if (e.type === 'dragleave') {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    let oversizedFile: string | null = null;
    let oversizedFileSize = 0;

    for (const f of files) {
      if (f.size > effectivePlan.maxFileSizeBytes) {
        oversizedFile = f.name;
        oversizedFileSize = f.size;
        break;
      }
      validFiles.push(f);
    }

    if (oversizedFile) {
      if (!user) {
        setError(`File "${oversizedFile}" (${(oversizedFileSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB limit for non-registered users. Create a free account to upload files up to 500 MB with Unlimited Time retention!`);
      } else {
        setError(`File "${oversizedFile}" exceeds your plan limit of ${formatBytes(effectivePlan.maxFileSizeBytes)}. Upgrade your plan to upload larger files.`);
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const initialTotalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    setUploadLoadedMB('0.00');
    setUploadTotalMB(initialTotalMB);
    setUploadSpeed('');
    setUploadStatus('Encrypting & preparing transmission...');

    const formData = new FormData();
    selectedFiles.forEach(f => {
      formData.append('files', f);
    });

    if (password.trim() && effectivePlan.passwordProtection) {
      formData.append('password', password.trim());
    }
    formData.append('expiryDays', expiryDays);
    if (description.trim()) {
      formData.append('description', description.trim());
    }

    try {
      const res = await api.uploadFilesWithProgress(formData, (p) => {
        setUploadProgress(p.percent);
        setUploadLoadedMB(p.loadedMB);
        setUploadTotalMB(p.totalMB);

        if (p.speedBytesPerSec > 0) {
          const speedMB = (p.speedBytesPerSec / (1024 * 1024)).toFixed(1);
          setUploadSpeed(`${speedMB} MB/s`);
        }

        if (p.percent >= 100) {
          setUploadStatus('Saving & finalizing file encryption on cloud...');
        } else {
          setUploadStatus(`Uploading ${p.loadedMB} MB of ${p.totalMB} MB...`);
        }
      });

      setUploadProgress(100);
      setUploadStatus('Upload completed successfully!');

      setTimeout(() => {
        setRecentlyUploaded(res.files);
        setSelectedFiles([]);
        setPassword('');
        setDescription('');
        setUploading(false);
        setUploadProgress(0);
        setUploadLoadedMB('0.00');
        setUploadTotalMB('0.00');
        setUploadSpeed('');
        setUploadStatus('');
        onUploadSuccess(res.files);
      }, 500);

    } catch (err: any) {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      setError(err.message || 'Upload failed. Please try again.');
    }
  };

  const copyShareLink = (shareToken: string, id: string) => {
    const fullUrl = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalSelectedBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div id="upload-section-container" className="max-w-4xl mx-auto space-y-8">
      
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>TG Uploads Cloud Platform</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Fast, Secure & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Encrypted</span> File Sharing
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Upload any file type with lightning-fast speeds. Every user receives a generous <span className="text-cyan-300 font-semibold">Free 50 GB Plan</span> with instant direct shareable links and Unlimited Time file retention.
        </p>

        {/* Guest Mode Banner */}
        {!user && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-indigo-950/40 border border-cyan-500/30 max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  Guest Upload Enabled
                </span>
                <span className="text-xs font-semibold text-white">No registration required</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Guests can upload up to <strong className="text-cyan-300 font-semibold">50 MB per file</strong> (max 1 GB storage) with <strong className="text-cyan-300 font-semibold">30-day retention after last download</strong>.
              </p>
            </div>
            <button
              id="btn-guest-signup-cta"
              onClick={() => onOpenAuth('register')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shrink-0 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get Unlimited Time Free</span>
            </button>
          </div>
        )}

        {/* Current Plan Badge Pill */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Active: <strong>{effectivePlan.name}</strong></span>
            <span className="text-slate-500">•</span>
            <span>Max File: <strong>{formatBytes(effectivePlan.maxFileSizeBytes)}</strong></span>
            <span className="text-slate-500">•</span>
            <span>Storage: <strong>{formatBytes(effectivePlan.storageLimitBytes)}</strong></span>
          </div>

          <button
            id="btn-view-plans-banner"
            onClick={onOpenPlans}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All Plans</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        id="file-dropzone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all group overflow-hidden ${
          dragOver
            ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01] shadow-2xl shadow-cyan-500/20'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 shadow-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="hidden-file-input"
        />

        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center group-hover:scale-110 group-hover:border-cyan-500/50 group-hover:bg-cyan-950/30 transition-all shadow-inner">
            <UploadCloud className="w-10 h-10 text-cyan-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Drag & Drop your files here
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              or <span className="text-cyan-400 font-semibold underline underline-offset-4">browse from your computer</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
            <span>✓ Up to {formatBytes(effectivePlan.maxFileSizeBytes)} per file</span>
            <span>✓ High-speed transfer</span>
            <span>✓ Safe & encrypted</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div id="upload-error-box" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Upload Notice</p>
            <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs">Dismiss</button>
        </div>
      )}

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div id="selected-files-queue" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-cyan-400" />
                Files Queued for Upload ({selectedFiles.length})
              </h4>
              <p className="text-xs text-slate-400">
                Total size: {formatBytes(totalSelectedBytes)}
              </p>
            </div>

            <button
              id="btn-clear-all-queue"
              onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear queue
            </button>
          </div>

          {/* File item chips */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 truncate mr-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="truncate text-left">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-[280px] sm:max-w-md">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeSelectedFile(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {/* Password Protection */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Password Protection
                </label>
                {!effectivePlan.passwordProtection && (
                  <button
                    onClick={onOpenPlans}
                    className="text-[10px] font-semibold text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3" /> Pro Feature
                  </button>
                )}
              </div>
              <input
                id="upload-password-input"
                type="password"
                placeholder={effectivePlan.passwordProtection ? 'Optional lock password' : 'Requires Pro or Ultra plan'}
                disabled={!effectivePlan.passwordProtection}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Retention Expiry */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Link Retention / Expiry
                </label>
                {!user && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Get Unlimited Time
                  </button>
                )}
              </div>
              {!user ? (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>30 Days after last download (extends on download)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">Guest</span>
                </div>
              ) : (
                <select
                  id="upload-expiry-select"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                  <option value="0">Unlimited Time (Permanent / Never Expires)</option>
                  <option value="30">30 Days</option>
                  <option value="14">14 Days</option>
                  <option value="7">7 Days</option>
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="pt-2">
            <input
              id="upload-desc-input"
              type="text"
              placeholder="Add optional notes or description for recipient..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Upload Progress Bar in MB (if uploading) */}
          {uploading && (
            <div id="upload-progress-card" className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {uploadStatus || 'Uploading to TG Uploads Cloud...'}
                    </span>
                    <span className="text-[11px] text-cyan-300 font-mono flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-white">{uploadLoadedMB} MB</span> of <span className="text-slate-400">{uploadTotalMB} MB</span>
                      {uploadSpeed && (
                        <span className="text-emerald-400 ml-1.5 pl-1.5 border-l border-slate-700 flex items-center gap-1 font-sans font-medium">
                          ⚡ {uploadSpeed}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center">
                  <span className="text-base font-extrabold text-cyan-400 font-mono">
                    {uploadProgress}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {uploadProgress >= 100 
                      ? 'Finalizing encryption...' 
                      : `${Math.max(0, parseFloat(uploadTotalMB || '0') - parseFloat(uploadLoadedMB || '0')).toFixed(2)} MB remaining`}
                  </span>
                </div>
              </div>

              {/* Glowing animated progress bar */}
              <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-200 relative shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                  style={{ width: `${Math.max(2, uploadProgress)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-medium">
                <span>0.00 MB</span>
                <span className="text-cyan-400/90">End-to-End Encrypted Transfer</span>
                <span>{uploadTotalMB} MB</span>
              </div>
            </div>
          )}

          {/* Upload Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              {user ? (
                <span>Uploading under <strong>{user.email}</strong> • Unlimited Time retention</span>
              ) : (
                <span className="text-cyan-400 font-medium">Guest upload active • 30-day retention after last download</span>
              )}
            </div>

            <button
              id="btn-start-upload"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting & Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''} {user ? '' : 'as Guest'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Recently Uploaded Files Showcase */}
      {recentlyUploaded.length > 0 && (
        <div id="recently-uploaded-card" className="bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Files Uploaded & Ready to Share!</span>
          </div>

          <div className="space-y-3">
            {!user && (
              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-slate-300">
                  <span className="text-cyan-400 font-semibold">Guest Notice:</span> Files uploaded as guest retain for 30 days after the last download.
                </p>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer shrink-0"
                >
                  Sign Up for Unlimited Time & 50 GB
                </button>
              </div>
            )}
            {recentlyUploaded.map((file) => {
              const shareUrl = `${window.location.origin}/share/${file.shareToken}`;
              const isCopied = copiedId === file.id;

              return (
                <div 
                  key={file.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="truncate max-w-full sm:max-w-xs">
                    <p className="text-sm font-bold text-white truncate">{file.originalName}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.sizeBytes)} • Ready to download</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => copyShareLink(file.shareToken, file.id)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20'
                      }`}
                    >
                      {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Link Copied!' : 'Copy Share Link'}</span>
                    </button>

                    <button
                      onClick={() => onOpenShareModal(file)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      title="Share details & QR Code"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
            <Crown className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Free 50 GB Plan Included</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every user who signs up receives the Free Starter plan with 50 GB cloud storage, 500 MB per file, and Unlimited Time permanent retention (vs. 30 days for guests).
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Password & Expiry Locks</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Protect your sensitive deliverables with custom passwords and auto-expiration timers directly from your dashboard.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
            <Crown className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Admin-Managed Tiers</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All limits, pricing, and server features can be configured in real-time from the TG Uploads administration control panel.
          </p>
        </div>
      </div>
    </div>
  );
};
