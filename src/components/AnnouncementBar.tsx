import React from 'react';
import { Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { SiteSettings } from '../types.js';

interface AnnouncementBarProps {
  settings: SiteSettings | null;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ settings }) => {
  if (!settings || !settings.announcementEnabled || !settings.announcementText) {
    return null;
  }

  return (
    <div id="announcement-banner" className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-b border-cyan-500/20 text-xs sm:text-sm py-2 px-4 text-cyan-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-medium text-slate-200">{settings.announcementText}</span>
        </div>

        {settings.telegramChannel && (
          <a
            id="announcement-tg-link"
            href={settings.telegramChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Join TG Channel</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
