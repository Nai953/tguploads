import React from 'react';
import { FileQuestion, UploadCloud, LayoutDashboard, FolderOpen, Crown, ArrowLeft } from 'lucide-react';
import { Link, useRouter } from '../lib/router.js';

export const NotFoundPage: React.FC = () => {
  const { pathname, navigate } = useRouter();

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in">
      <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400 shadow-xl">
        <FileQuestion className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
          Error 404
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The requested page <code className="text-cyan-300 font-mono bg-slate-900 px-2 py-0.5 rounded text-xs">{pathname}</code> does not exist or has been moved.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </Link>
        <Link
          to="/upload"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 transition-all border border-slate-700"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Files</span>
        </Link>
        <Link
          to="/plans"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center gap-2 transition-all border border-slate-700"
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>View Plans</span>
        </Link>
      </div>
    </div>
  );
};
