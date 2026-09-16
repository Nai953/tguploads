export type UserRole = 'admin' | 'user';

export interface Plan {
  id: string;
  name: string;
  description: string;
  storageLimitBytes: number; // e.g. 5 GB = 5 * 1024 * 1024 * 1024
  maxFileSizeBytes: number;  // e.g. 500 MB = 500 * 1024 * 1024
  downloadSpeed: string;     // 'Standard (10 MB/s)' | 'High-Speed (50 MB/s)' | 'Uncapped (Gigabit)'
  retentionDays: number;     // 0 = unlimited, or e.g. 30 days
  passwordProtection: boolean;
  directLinks: boolean;
  prioritySupport: boolean;
  priceMonthly: number;      // 0 for free
  priceYearly: number;
  badge?: string;            // 'Free', 'Popular', 'Pro', 'Enterprise'
  isDefault?: boolean;
  active: boolean;
  features: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  planId: string;
  planExpiresAt?: string | null;
  planCycle?: 'monthly' | 'yearly';
  usedStorageBytes: number;
  createdAt: string;
  lastLoginAt?: string;
  isSuspended: boolean;
  avatarUrl?: string;
}

export interface FileItem {
  id: string;
  shareToken: string;
  originalName: string;
  storedFileName: string;
  tgFileId?: number | string;
  folderId?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string; // userId
  uploaderEmail: string;
  uploaderName: string;
  createdAt: string;
  expiresAt: string | null; // ISO string or null
  downloadCount: number;
  isPasswordProtected: boolean;
  hasDirectLink: boolean;
  description?: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  announcementText: string;
  announcementEnabled: boolean;
  allowPublicRegistration: boolean;
  defaultPlanId: string;
  supportEmail: string;
  telegramChannel: string;
  maxGlobalUploadSizeBytes: number;
  maintenanceMode: boolean;
  currency: string; // 'INR'
  oxapayApiKey: string;
  oxapayEnabled: boolean;
  oxapaySandbox: boolean;
  // Ad Network Verification & Download Page Ad Codes
  customHeadCode?: string;         // Injected into <head> across the whole site for verification
  adsTxt?: string;                 // Content served at /ads.txt for programmatic ad networks
  adsEnabled?: boolean;            // Master switch for ads
  adDownloadTop?: string;          // Download Page: Top banner (728x90 / responsive)
  adDownloadBelowDetails?: string; // Download Page: Inside card below file specs
  adDownloadBelowButton?: string;  // Download Page: Directly below download button
  adDownloadSidebar?: string;      // Download Page: Sidebar banner (300x250 / skyscraper)
  adDownloadBottom?: string;       // Download Page: Bottom banner
  adDownloadPopunder?: string;     // Download Page: Popunder / OnClick script
}

export interface PublicRootFile {
  id: string;
  path: string; // e.g. "robots.txt", "google1234.html", "sitemap.xml"
  contentType: string; // e.g. "text/plain", "text/html", "application/xml"
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string; // 'ord_...'
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number; // in INR
  currency: string; // 'INR'
  status: 'pending' | 'paying' | 'paid' | 'expired' | 'failed';
  trackId?: string | number;
  payLink?: string;
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  description?: string;
}

export interface AuthState {
  user: User | null;
  plan: Plan | null;
  token: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalFiles: number;
  totalStorageBytes: number;
  totalDownloads: number;
  plansCount: Record<string, number>;
  recentUploads: FileItem[];
  recentUsers: User[];
  totalOrders?: number;
  totalRevenueINR?: number;
}
