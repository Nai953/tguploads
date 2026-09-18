import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FolderOpen, 
  Download, 
  Share2, 
  Trash2, 
  Eye, 
  Lock, 
  Clock, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Image, 
  Film, 
  Music, 
  Archive, 
  Code2, 
  HardDrive,
  LayoutGrid,
  List,
  Edit2,
  AlertTriangle,
  UploadCloud,
  Sparkles
} from 'lucide-react';
import { User, Plan, FileItem } from '../types.js';
import { formatBytes, formatDate, getFileCategory } from '../lib/utils.js';
import { api } from '../lib/api.js';

interface MyFilesSectionProps {
  user: User | null;
  plan: Plan | null;
  files: FileItem[];
  loading: boolean;
  onRefreshFiles: () => void;
  onOpenUpload: () => void;
  onOpenPreview: (file: FileItem) => void;
  onOpenShareModal: (file: FileItem) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const MyFilesSection: React.FC<MyFilesSectionProps> = ({
  user,
  plan,
  files,
  loading,
  onRefreshFiles,
  onOpenUpload,
  onOpenPreview,
  onOpenShareModal,
  onOpenAuth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit file modal state
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getIconForCategory = (cat: string) => {
    switch (cat) {
      case 'image': return <Image className="w-5 h-5 text-emerald-400" />;
      case 'video': return <Film className="w-5 h-5 text-purple-400" />;
      case 'audio': return <Music className="w-5 h-5 text-amber-400" />;
      case 'archive': return <Archive className="w-5 h-5 text-rose-400" />;
      case 'code': return <Code2 className="w-5 h-5 text-cyan-400" />;
      default: return <FileText className="w-5 h-5 text-blue-400" />;
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;
    const cat = getFileCategory(file.mimeType, file.originalName);
    return cat === selectedCategory;
  });

  const copyShareLink = (shareToken: string, id: string) => {
    const fullUrl = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFile(id);
      setDeletingId(null);
      onRefreshFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const handleOpenEdit = (file: FileItem) => {
    setEditingFile(file);
    setEditName(file.originalName);
    setEditPassword('');
    setRemovePassword(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    setSavingEdit(true);
    try {
      await api.updateFile(editingFile.id, {
        originalName: editName,
        password: editPassword.trim() || undefined,
        removePassword
      });
      setEditingFile(null);
      onRefreshFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to update file settings');
    } finally {
      setSavingEdit(false);
    }
  };

  const guestCalculatedBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const usedBytes = user ? (user.usedStorageBytes ?? guestCalculatedBytes) : guestCalculatedBytes;
  const limitBytes = user ? (plan?.storageLimitBytes || 50 * 1024 * 1024 * 1024) : 1 * 1024 * 1024 * 1024;
  const usagePercent = Math.min(100, Math.round((usedBytes / Math.max(1, limitBytes)) * 100));

  return (
    <div id="my-files-container" className="max-w-7xl mx-auto space-y-6">
      
      {/* Guest Mode Callout */}
      {!user && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Guest File Session (30 Days Retention)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">1 GB Max</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Your guest files are saved for 30 days after the last download. Create a free account to unlock <strong>50 GB storage</strong> with <strong>Unlimited Time (Permanent)</strong> retention!
              </p>
            </div>
          </div>
          {onOpenAuth && (
            <button
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all shrink-0 cursor-pointer"
            >
              Sign Up Free (Unlimited Time)
            </button>
          )}
        </div>
      )}

      {/* Top Header & Storage Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-cyan-400" />
            {user ? 'My Stored Files' : 'Guest Uploaded Files'}
          </h2>
          <p className="text-xs text-slate-400">
            {user 
              ? 'Manage your uploaded content, download links, passwords, and retention periods.' 
              : 'Files uploaded in this browser session. Upgrade to an account for permanent links & 50 GB storage.'}
          </p>
        </div>

        {/* Storage Bar Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">{formatBytes(usedBytes)} used</span>
              <span className="text-slate-400 font-mono">{formatBytes(limitBytes)}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.max(3, usagePercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">Plan: {user ? (plan?.name || 'Free Starter') : 'Guest Mode (1 GB)'}</p>
          </div>
          <button
            onClick={onOpenUpload}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload More</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="files-search-input"
            type="text"
            placeholder="Search by file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Category Filter Pills & View Mode */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'image', label: 'Images' },
            { id: 'video', label: 'Videos' },
            { id: 'document', label: 'Docs' },
            { id: 'audio', label: 'Audio' },
            { id: 'archive', label: 'Archives' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {/* Toggle Grid/List */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 ml-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs ${viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs ${viewMode === 'table' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-white'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm">Loading your files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div id="no-files-state" className="py-20 text-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No files found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery ? 'No files match your search query.' : 'You haven’t uploaded any files yet. Drag and drop files to get started!'}
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Your First File</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => {
            const cat = getFileCategory(file.mimeType, file.originalName);
            const isCopied = copiedId === file.id;

            return (
              <div
                key={file.id}
                className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 shadow-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* File Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {getIconForCategory(cat)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {file.isPasswordProtected && (
                        <span 
                          title="Password Protected"
                          className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        >
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {file.downloadCount} dl
                      </span>
                    </div>
                  </div>

                  {/* Title & Specs */}
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors" title={file.originalName}>
                    {file.originalName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-500" />
                      {file.isGuest || file.retentionType === 'after_last_download'
                        ? `30d after last dl (${file.expiresAt ? formatDate(file.expiresAt).split(',')[0] : '30d'})`
                        : file.expiresAt ? `Expires ${formatDate(file.expiresAt).split(',')[0]}` : 'Unlimited Time'}
                    </span>
                  </div>

                  {file.description && (
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                      {file.description}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {(cat === 'image' || cat === 'video' || cat === 'audio') && !file.isPasswordProtected && (
                      <button
                        onClick={() => onOpenPreview(file)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Preview media"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => copyShareLink(file.shareToken, file.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      title={isCopied ? 'Copied!' : 'Copy download link'}
                    >
                      {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => onOpenShareModal(file)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Share modal & QR code"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(file)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit file details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={api.getDownloadUrl(file.id)}
                      download={file.originalName}
                      className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title="Direct download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => setDeletingId(file.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Uploaded</th>
                  <th className="p-4">Retention</th>
                  <th className="p-4">Downloads</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredFiles.map(file => {
                  const cat = getFileCategory(file.mimeType, file.originalName);
                  const isCopied = copiedId === file.id;

                  return (
                    <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {getIconForCategory(cat)}
                        </div>
                        <div className="truncate max-w-xs">
                          <p className="font-semibold text-white truncate" title={file.originalName}>{file.originalName}</p>
                          {file.isPasswordProtected && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono">{formatBytes(file.sizeBytes)}</td>
                      <td className="p-4 text-slate-400">{formatDate(file.createdAt).split(',')[0]}</td>
                      <td className="p-4 text-slate-400">
                        {file.isGuest || file.retentionType === 'after_last_download'
                          ? <span className="text-cyan-300">30d after last dl</span>
                          : file.expiresAt ? formatDate(file.expiresAt).split(',')[0] : <span className="text-emerald-400 font-medium">Unlimited Time</span>}
                      </td>
                      <td className="p-4 font-mono">{file.downloadCount}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => copyShareLink(file.shareToken, file.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                            title="Copy link"
                          >
                            {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => onOpenShareModal(file)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={api.getDownloadUrl(file.id)}
                            download={file.originalName}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setDeletingId(file.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete File?</h3>
              <p className="text-xs text-slate-400">
                This action is permanent and will remove the file from cloud storage. All active share links will stop working.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-all"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                Edit File Settings
              </h3>
              <button onClick={() => setEditingFile(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">File Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Password Protection */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    Password Lock
                  </label>
                  {editingFile.isPasswordProtected && (
                    <label className="text-[11px] text-rose-400 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removePassword}
                        onChange={(e) => setRemovePassword(e.target.checked)}
                        className="rounded border-slate-700 text-rose-500 focus:ring-0"
                      />
                      Remove Password
                    </label>
                  )}
                </div>

                {!removePassword && (
                  <input
                    type="password"
                    placeholder={editingFile.isPasswordProtected ? 'Enter new password to change' : 'Set file password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
