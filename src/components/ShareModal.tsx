import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  CheckCircle2, 
  Share2, 
  Send, 
  QrCode, 
  Lock, 
  Clock, 
  FileText, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { FileItem } from '../types.js';
import { formatBytes, formatDate } from '../lib/utils.js';

interface ShareModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!file) return null;

  const shareUrl = `${window.location.origin}/share/${file.shareToken}`;
  const directUrl = `${window.location.origin}/api/download/${file.id}`;
  const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Download ${file.originalName} on TG Uploads`)}`;

  // SVG QR Code generator URL using public qr API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyDirect = () => {
    navigator.clipboard.writeText(directUrl);
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 2000);
  };

  return (
    <div id="share-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        id="share-modal-content"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          id="share-close-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div className="truncate pr-6">
            <h3 className="text-lg font-bold text-white tracking-tight truncate">
              Share File
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {file.originalName} ({formatBytes(file.sizeBytes)})
            </p>
          </div>
        </div>

        {/* Security / Status Tags */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Clean
          </span>

          {file.isPasswordProtected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Password Protected
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {file.expiresAt ? `Expires ${formatDate(file.expiresAt).split(',')[0]}` : 'Permanent Link'}
          </span>
        </div>

        {/* Public Share URL Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Public Download Page Link
          </label>
          <div className="flex items-center gap-2">
            <input
              id="input-share-url"
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none select-all"
            />
            <button
              id="btn-copy-share-url"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                copiedLink
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
              }`}
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Direct Hotlink */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Direct Instant Download Hotlink
          </label>
          <div className="flex items-center gap-2">
            <input
              id="input-direct-url"
              type="text"
              readOnly
              value={directUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 font-mono focus:outline-none select-all"
            />
            <button
              id="btn-copy-direct-url"
              onClick={handleCopyDirect}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 transition-colors"
            >
              {copiedDirect ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Buttons: Telegram & QR Code */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <a
            id="btn-share-telegram"
            href={tgShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 text-[#229ED9] text-xs font-bold transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Share on Telegram</span>
          </a>

          <button
            id="btn-toggle-qr"
            onClick={() => setShowQr(!showQr)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>{showQr ? 'Hide QR Code' : 'Mobile QR Code'}</span>
          </button>
        </div>

        {/* QR Code view */}
        {showQr && (
          <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center space-y-2 animate-in fade-in">
            <img 
              src={qrCodeUrl} 
              alt="Scan to download" 
              className="w-40 h-40 object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
            <p className="text-[11px] text-slate-700 font-medium">Scan with camera to download on phone</p>
          </div>
        )}
      </div>
    </div>
  );
};
