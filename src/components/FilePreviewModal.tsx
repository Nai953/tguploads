import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { FileItem } from '../types.js';
import { formatBytes, getFileCategory } from '../lib/utils.js';

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const previewUrl = `/api/preview/${file.id}`;
  const downloadUrl = `/api/download/${file.id}`;
  const category = getFileCategory(file.mimeType, file.originalName);

  return (
    <div id="preview-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div 
        id="preview-modal-content"
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="truncate pr-4">
            <h3 className="text-sm sm:text-base font-bold text-white truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <p className="text-xs text-slate-400">
              {formatBytes(file.sizeBytes)} • {file.mimeType}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              id="preview-download-btn"
              href={downloadUrl}
              download={file.originalName}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              id="preview-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Preview Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950 min-h-[300px]">
          {category === 'image' ? (
            <img
              src={previewUrl}
              alt={file.originalName}
              className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          ) : category === 'video' ? (
            <video
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-xl shadow-2xl bg-black"
            >
              <source src={previewUrl} type={file.mimeType} />
              Your browser does not support the video tag.
            </video>
          ) : category === 'audio' ? (
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white">{file.originalName}</p>
              <audio controls className="w-full">
                <source src={previewUrl} type={file.mimeType} />
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white">Direct browser preview not available for this file format.</p>
              <a
                href={downloadUrl}
                download={file.originalName}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download to view ({formatBytes(file.sizeBytes)})
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
