import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  HardDrive, 
  FolderOpen, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Download, 
  Crown, 
  Lock, 
  Clock, 
  FileText, 
  Mail, 
  ShieldAlert, 
  ExternalLink,
  MessageCircle,
  Sparkles,
  Loader2,
  Coins,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  CheckCircle,
  Megaphone,
  Code,
  Globe,
  Layout,
  Layers,
  FileCode,
  Upload,
  FilePlus,
  FileCheck
} from 'lucide-react';
import { User, Plan, FileItem, SiteSettings, AdminStats, PaymentOrder, PublicRootFile } from '../types.js';
import { formatBytes, formatDate } from '../lib/utils.js';
import { api } from '../lib/api.js';

interface AdminPanelProps {
  currentUser: User | null;
  onRefreshGlobalPlans: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  initialTab?: 'stats' | 'plans' | 'users' | 'files' | 'orders' | 'ads' | 'public-files' | 'settings';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onRefreshGlobalPlans,
  onOpenAuth,
  initialTab = 'stats'
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'plans' | 'users' | 'files' | 'orders' | 'ads' | 'public-files' | 'settings'>(initialTab);
  
  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [publicFiles, setPublicFiles] = useState<PublicRootFile[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // OxaPay & Orders state
  const [orderFilter, setOrderFilter] = useState('');
  const [testingOxaPay, setTestingOxaPay] = useState(false);
  const [oxapayTestResult, setOxapayTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showOxaPayKey, setShowOxaPayKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [activatingOrderId, setActivatingOrderId] = useState<string | null>(null);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [publicFileSearch, setPublicFileSearch] = useState('');

  // Public Files Modal / Form state
  const [editingPublicFile, setEditingPublicFile] = useState<PublicRootFile | null>(null);
  const [isCreatingPublicFile, setIsCreatingPublicFile] = useState(false);
  const [publicFileForm, setPublicFileForm] = useState({
    path: '',
    contentType: 'text/plain; charset=utf-8',
    content: ''
  });
  const [savingPublicFile, setSavingPublicFile] = useState(false);
  const [copiedPublicPath, setCopiedPublicPath] = useState<string | null>(null);

  // Plan Edit / Create Modal state
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    storageLimitGB: 5,
    maxFileSizeMB: 500,
    downloadSpeed: 'Standard (10 MB/s)',
    retentionDays: 30,
    passwordProtection: false,
    directLinks: false,
    prioritySupport: false,
    priceMonthly: 0,
    priceYearly: 0,
    badge: '',
    isDefault: false,
    featuresText: ''
  });

  const isSuperAdmin = currentUser?.email.toLowerCase() === 'teamthunderofficialyt@gmail.com' || currentUser?.role === 'admin';

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllAdminData();
    }
  }, [isSuperAdmin]);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 4000);
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, plansData, usersData, filesData, settingsData, ordersData, publicFilesData] = await Promise.all([
        api.adminGetStats().catch(() => null),
        api.adminGetPlans().catch(() => []),
        api.adminGetUsers().catch(() => []),
        api.adminGetFiles().catch(() => []),
        api.adminGetSettings().catch(() => null),
        api.adminGetOrders().catch(() => ({ orders: [] })),
        api.adminGetPublicFiles().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      if (plansData) setPlans(plansData);
      if (usersData) setUsers(usersData);
      if (filesData) setFiles(filesData);
      if (settingsData) setSettings(settingsData);
      if (ordersData && ordersData.orders) setOrders(ordersData.orders);
      if (publicFilesData) setPublicFiles(publicFilesData);
    } catch (err: any) {
      showError('Failed to load admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  // --- Plan CRUD ---
  const handleOpenCreatePlan = () => {
    setIsCreatingPlan(true);
    setEditingPlan(null);
    setPlanForm({
      name: '',
      description: '',
      storageLimitGB: 10,
      maxFileSizeMB: 1000,
      downloadSpeed: 'High-Speed (25 MB/s)',
      retentionDays: 60,
      passwordProtection: true,
      directLinks: false,
      prioritySupport: false,
      priceMonthly: 499,
      priceYearly: 4999,
      badge: 'New',
      isDefault: false,
      featuresText: '10 GB Cloud Storage\n1 GB Max File Size\n60 Days Retention\nPassword Protection'
    });
  };

  const handleOpenEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setIsCreatingPlan(false);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      storageLimitGB: Math.round(plan.storageLimitBytes / (1024 * 1024 * 1024)),
      maxFileSizeMB: Math.round(plan.maxFileSizeBytes / (1024 * 1024)),
      downloadSpeed: plan.downloadSpeed,
      retentionDays: plan.retentionDays,
      passwordProtection: plan.passwordProtection,
      directLinks: plan.directLinks,
      prioritySupport: plan.prioritySupport,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      badge: plan.badge || '',
      isDefault: !!plan.isDefault,
      featuresText: plan.features.join('\n')
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Plan> = {
        name: planForm.name,
        description: planForm.description,
        storageLimitBytes: Number(planForm.storageLimitGB) * 1024 * 1024 * 1024,
        maxFileSizeBytes: Number(planForm.maxFileSizeMB) * 1024 * 1024,
        downloadSpeed: planForm.downloadSpeed,
        retentionDays: Number(planForm.retentionDays),
        passwordProtection: planForm.passwordProtection,
        directLinks: planForm.directLinks,
        prioritySupport: planForm.prioritySupport,
        priceMonthly: Number(planForm.priceMonthly),
        priceYearly: Number(planForm.priceYearly),
        badge: planForm.badge,
        isDefault: planForm.isDefault,
        active: true,
        features: planForm.featuresText.split('\n').map(s => s.trim()).filter(Boolean)
      };

      if (isCreatingPlan) {
        await api.adminCreatePlan(payload);
        showSuccess(`Plan "${planForm.name}" created successfully`);
      } else if (editingPlan) {
        await api.adminUpdatePlan(editingPlan.id, payload);
        showSuccess(`Plan "${planForm.name}" updated successfully`);
      }

      setEditingPlan(null);
      setIsCreatingPlan(false);
      loadAllAdminData();
      onRefreshGlobalPlans();
    } catch (err: any) {
      showError(err.message || 'Failed to save plan');
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the plan "${name}"? Users on this plan will be moved to the default Free plan.`)) return;

    try {
      await api.adminDeletePlan(id);
      showSuccess(`Plan "${name}" removed`);
      loadAllAdminData();
      onRefreshGlobalPlans();
    } catch (err: any) {
      showError(err.message || 'Failed to delete plan');
    }
  };

  // --- User Management ---
  const handleUpdateUserPlan = async (userId: string, newPlanId: string) => {
    try {
      await api.adminUpdateUser(userId, { planId: newPlanId });
      showSuccess('User plan updated successfully');
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to update user plan');
    }
  };

  const handleToggleUserSuspension = async (userId: string, currentSuspended: boolean) => {
    try {
      await api.adminUpdateUser(userId, { isSuspended: !currentSuspended });
      showSuccess(`User account ${!currentSuspended ? 'suspended' : 'activated'}`);
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to update user status');
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.adminUpdateUser(userId, { role: newRole as any });
      showSuccess(`User role set to ${newRole}`);
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email} and all of their uploaded files permanently?`)) return;

    try {
      await api.adminDeleteUser(userId);
      showSuccess(`User ${email} deleted`);
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete user');
    }
  };

  // --- File Management ---
  const handleDeleteFileAdmin = async (fileId: string, filename: string) => {
    if (!confirm(`Permanently remove "${filename}" from server storage?`)) return;

    try {
      await api.adminDeleteFile(fileId);
      showSuccess(`File "${filename}" deleted from storage`);
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete file');
    }
  };

  // --- Settings Management ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await api.adminUpdateSettings(settings);
      showSuccess('Site settings, OxaPay configuration, and announcement updated successfully');
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to save settings');
    }
  };

  // --- OxaPay & Orders Management ---
  const handleTestOxaPay = async () => {
    setTestingOxaPay(true);
    setOxapayTestResult(null);
    try {
      const res = await api.adminTestOxaPay(settings?.oxapayApiKey);
      setOxapayTestResult({ success: true, message: res.message || 'OxaPay API Connection Verified!' });
      showSuccess('OxaPay Merchant API verified successfully!');
    } catch (err: any) {
      setOxapayTestResult({ success: false, message: err.message || 'Connection failed' });
      showError(err.message || 'OxaPay API validation failed');
    } finally {
      setTestingOxaPay(false);
    }
  };

  const handleCheckOrderStatus = async (orderId: string) => {
    setCheckingOrderId(orderId);
    try {
      const res = await api.checkPaymentStatus(orderId);
      showSuccess(`Order ${orderId.slice(0, 8)}... status: ${res.status.toUpperCase()}`);
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to query OxaPay status');
    } finally {
      setCheckingOrderId(null);
    }
  };

  const handleActivateOrder = async (order: PaymentOrder) => {
    if (!confirm(`Manually activate plan "${order.planName}" for user ${order.userEmail}?`)) return;
    setActivatingOrderId(order.id);
    try {
      const res = await api.adminActivateOrder(order.id);
      showSuccess(res.message || 'Order marked as paid and plan activated!');
      loadAllAdminData();
      onRefreshGlobalPlans();
    } catch (err: any) {
      showError(err.message || 'Failed to activate order');
    } finally {
      setActivatingOrderId(null);
    }
  };

  const handleCopyWebhookUrl = () => {
    const url = `${window.location.origin}/api/payments/oxapay/callback`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    showSuccess('OxaPay Webhook Callback URL copied to clipboard');
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  // --- Public Root Files CRUD Handlers ---
  const handleOpenCreatePublicFile = () => {
    setIsCreatingPublicFile(true);
    setEditingPublicFile(null);
    setPublicFileForm({
      path: '',
      contentType: 'text/plain; charset=utf-8',
      content: ''
    });
  };

  const handleOpenEditPublicFile = (file: PublicRootFile) => {
    setEditingPublicFile(file);
    setIsCreatingPublicFile(false);
    setPublicFileForm({
      path: file.path,
      contentType: file.contentType || 'text/plain; charset=utf-8',
      content: file.content || ''
    });
  };

  const handleClosePublicFileModal = () => {
    setIsCreatingPublicFile(false);
    setEditingPublicFile(null);
    setPublicFileForm({
      path: '',
      contentType: 'text/plain; charset=utf-8',
      content: ''
    });
  };

  const handleSavePublicFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = publicFileForm.path.replace(/^\/+/, '').trim();
    if (!cleanPath) {
      showError('Please provide a valid file path (e.g. "robots.txt" or "google12345.html")');
      return;
    }

    setSavingPublicFile(true);
    try {
      if (editingPublicFile) {
        await api.adminUpdatePublicFile(editingPublicFile.id, {
          path: cleanPath,
          contentType: publicFileForm.contentType,
          content: publicFileForm.content
        });
        showSuccess(`Updated public file "/${cleanPath}" successfully!`);
      } else {
        await api.adminCreatePublicFile({
          path: cleanPath,
          contentType: publicFileForm.contentType,
          content: publicFileForm.content
        });
        showSuccess(`Created public file "/${cleanPath}" successfully! Live at /${cleanPath}`);
      }
      handleClosePublicFileModal();
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to save public file');
    } finally {
      setSavingPublicFile(false);
    }
  };

  const handleDeletePublicFile = async (id: string, filePath: string) => {
    if (!confirm(`Are you sure you want to delete the public file "/${filePath}"? It will no longer be served at the root URL.`)) {
      return;
    }
    try {
      await api.adminDeletePublicFile(id);
      showSuccess(`Deleted public file "/${filePath}"`);
      loadAllAdminData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete public file');
    }
  };

  const handleFileUploadForPublicFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      let detectedMime = file.type;
      if (!detectedMime) {
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) detectedMime = 'text/html; charset=utf-8';
        else if (file.name.endsWith('.xml')) detectedMime = 'application/xml; charset=utf-8';
        else if (file.name.endsWith('.json')) detectedMime = 'application/json; charset=utf-8';
        else if (file.name.endsWith('.txt')) detectedMime = 'text/plain; charset=utf-8';
        else if (file.name.endsWith('.js')) detectedMime = 'application/javascript; charset=utf-8';
        else detectedMime = 'text/plain; charset=utf-8';
      }

      setPublicFileForm(prev => ({
        ...prev,
        path: prev.path || file.name,
        contentType: detectedMime.includes('charset') ? detectedMime : `${detectedMime}; charset=utf-8`,
        content: text || ''
      }));
      showSuccess(`Loaded file "${file.name}" (${file.size} bytes)`);
    };
    reader.readAsText(file);
  };

  const copyPublicFileUrl = (filePath: string) => {
    const clean = filePath.replace(/^\/+/, '');
    const url = `${window.location.origin}/${clean}`;
    navigator.clipboard.writeText(url);
    setCopiedPublicPath(clean);
    showSuccess(`Copied link to /${clean}`);
    setTimeout(() => setCopiedPublicPath(null), 2500);
  };

  // Guard for unauthorized visitors
  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Administrator Access Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The TG Uploads Admin Control Panel is restricted exclusively to authorized administrators.
          </p>
        </div>
        {onOpenAuth && (
          <button
            onClick={() => onOpenAuth('login')}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In to Admin Account</span>
          </button>
        )}
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredFiles = files.filter(f =>
    f.originalName.toLowerCase().includes(fileSearch.toLowerCase()) ||
    f.uploaderEmail.toLowerCase().includes(fileSearch.toLowerCase())
  );

  return (
    <div id="admin-panel-container" className="max-w-7xl mx-auto space-y-8">
      
      {/* Admin Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-500/30 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider font-mono">
              Root Administration
            </span>
            <span className="text-xs text-purple-300/80 font-mono">
              teamthunderofficialyt@gmail.com
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
            TG Uploads Control Center
          </h1>
          <p className="text-xs text-slate-400">
            Live management of cloud storage plans, registered users, uploaded content, and platform settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="admin-btn-refresh-telemetry"
            onClick={loadAllAdminData}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div id="admin-success-alert" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div id="admin-error-alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Admin Subtabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'stats', label: 'Telemetry & Stats', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'plans', label: `Manage Plans (${plans.length})`, icon: <Crown className="w-4 h-4 text-amber-400" /> },
          { id: 'users', label: `Registered Users (${users.length})`, icon: <Users className="w-4 h-4 text-cyan-400" /> },
          { id: 'files', label: `Platform Files (${files.length})`, icon: <FolderOpen className="w-4 h-4 text-emerald-400" /> },
          { id: 'orders', label: `OxaPay Orders (${orders.length})`, icon: <Coins className="w-4 h-4 text-amber-400" /> },
          { id: 'ads', label: 'Ads & <head> Code', icon: <Megaphone className="w-4 h-4 text-pink-400" /> },
          { id: 'public-files', label: `Public Root Files (${publicFiles.length})`, icon: <FileCode className="w-4 h-4 text-cyan-400" /> },
          { id: 'settings', label: 'Site & OxaPay Gateway', icon: <Settings className="w-4 h-4 text-slate-400" /> }
        ].map(tab => (
          <button
            key={tab.id}
            id={`admin-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: TELEMETRY & STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{stats?.totalUsers || users.length}</p>
              <p className="text-[11px] text-slate-500">Auto-allocated Free 5GB</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Uploaded Files</span>
                <FolderOpen className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{stats?.totalFiles || files.length}</p>
              <p className="text-[11px] text-slate-500">Stored on server disk</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Storage Used</span>
                <HardDrive className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{formatBytes(stats?.totalStorageBytes || 0)}</p>
              <p className="text-[11px] text-slate-500">Tracked vs plan limits</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Downloads</span>
                <Download className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{stats?.totalDownloads || 0}</p>
              <p className="text-[11px] text-slate-500">Public deliveries</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Revenue (INR)</span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                ₹{(stats?.totalRevenueINR || orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount || 0), 0)).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-400/80">Via OxaPay Gateway</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Orders</span>
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{orders.length}</p>
              <p className="text-[11px] text-cyan-400/80">{orders.filter(o => o.status === 'paid').length} Completed</p>
            </div>
          </div>

          {/* Plan Distribution Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              Plan Distribution Across Users
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map(p => {
                const count = users.filter(u => u.planId === p.id).length;
                const percent = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                return (
                  <div key={p.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="font-mono text-cyan-400">{count} user{count !== 1 ? 's' : ''} ({percent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Dynamic TG Uploads Plans</h3>
              <p className="text-xs text-slate-400">
                Modify storage limits, max file sizes, prices, and default assignees. Changes apply immediately to all users.
              </p>
            </div>

            <button
              id="admin-btn-create-plan"
              onClick={handleOpenCreatePlan}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div 
                key={plan.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-xl relative"
              >
                {plan.isDefault && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Default for New Users
                  </span>
                )}

                <div>
                  <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage Limit:</span>
                      <span className="font-bold text-white font-mono">{formatBytes(plan.storageLimitBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max File Size:</span>
                      <span className="font-bold text-cyan-400 font-mono">{formatBytes(plan.maxFileSizeBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Price (INR):</span>
                      <span className="font-bold text-white">
                        {plan.priceMonthly === 0 ? 'Free' : `₹${plan.priceMonthly.toLocaleString('en-IN')}/mo · ₹${(plan.priceYearly || plan.priceMonthly * 10).toLocaleString('en-IN')}/yr`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Retention:</span>
                      <span className="font-semibold text-slate-200">
                        {plan.retentionDays === 0 ? 'Permanent' : `${plan.retentionDays} Days`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Password Protection:</span>
                      <span className={plan.passwordProtection ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {plan.passwordProtection ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Edit</span>
                  </button>

                  {!plan.isDefault && (
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-950 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Quick User Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">Total Registered Users</div>
              <div className="text-xl font-bold text-white mt-1">{users.length}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-emerald-400 font-medium">Active Accounts</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {users.filter(u => !u.isSuspended).length}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-amber-400 font-medium">Suspended Accounts</div>
              <div className="text-xl font-bold text-amber-300 mt-1">
                {users.filter(u => u.isSuspended).length}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-purple-400 font-medium">Platform Administrators</div>
              <div className="text-xl font-bold text-purple-300 mt-1">
                {users.filter(u => u.role === 'admin' || u.email.toLowerCase() === 'teamthunderofficialyt@gmail.com').length}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-users-search"
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredUsers.length} of {users.length} registered accounts
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-4">User & Joined</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Active Plan</th>
                    <th className="p-4">Storage Usage</th>
                    <th className="p-4">Files</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.map(u => {
                    const isOwner = u.email.toLowerCase() === 'teamthunderofficialyt@gmail.com';
                    const userPlan = plans.find(p => p.id === u.planId);
                    const userFileCount = files.filter(f => f.uploadedBy === u.id || f.uploaderEmail.toLowerCase() === u.email.toLowerCase()).length;
                    const maxStorage = userPlan?.storageLimitBytes || 5 * 1024 * 1024 * 1024;
                    const usagePercent = Math.min(100, Math.round(((u.usedStorageBytes || 0) / maxStorage) * 100));

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{u.name || 'Anonymous'}</div>
                          <div className="text-slate-400 text-[11px] font-mono">{u.email}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Joined {formatDate(u.createdAt).split(',')[0]}
                          </div>
                        </td>

                        <td className="p-4">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                              SUPER ADMIN
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleUserRole(u.id, u.role)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                                u.role === 'admin'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-700 hover:bg-purple-900'
                                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                              }`}
                            >
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </button>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="space-y-1">
                            <select
                              value={u.planId}
                              onChange={(e) => handleUpdateUserPlan(u.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-cyan-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
                            >
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly}/mo`})
                                </option>
                              ))}
                            </select>
                            {u.planExpiresAt && u.planId !== 'plan_free' && (
                              <div className="text-[10px] text-slate-400">
                                Exp: <span className="text-cyan-400 font-mono">{new Date(u.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-4 font-mono min-w-[170px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span>{formatBytes(u.usedStorageBytes)}</span>
                            <span className="text-slate-500">{formatBytes(maxStorage)}</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-400' : 'bg-cyan-400'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 text-right mt-0.5">
                            {usagePercent}% quota
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono font-medium">
                            {userFileCount} {userFileCount === 1 ? 'file' : 'files'}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                            u.isSuspended 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isSuspended ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                            {u.isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isOwner && (
                              <>
                                <button
                                  onClick={() => handleToggleUserSuspension(u.id, u.isSuspended)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                    u.isSuspended
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                                      : 'bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-900'
                                  }`}
                                >
                                  {u.isSuspended ? 'Activate' : 'Suspend'}
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-300 transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ALL PLATFORM FILES */}
      {activeTab === 'files' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Quick File Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">Total Uploaded Files</div>
              <div className="text-xl font-bold text-white mt-1">{files.length}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-cyan-400 font-medium">Total Platform Storage</div>
              <div className="text-xl font-bold text-cyan-300 mt-1">
                {formatBytes(files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0))}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-emerald-400 font-medium">Total Downloads Served</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {files.reduce((acc, f) => acc + (f.downloadCount || 0), 0)}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="text-[11px] text-purple-400 font-medium">Average File Size</div>
              <div className="text-xl font-bold text-purple-300 mt-1">
                {files.length > 0 
                  ? formatBytes(Math.round(files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0) / files.length))
                  : '0 B'
                }
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-files-search"
                type="text"
                placeholder="Search files by name, uploader, or ID..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredFiles.length} of {files.length} system files
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-4">File Name</th>
                    <th className="p-4">Uploader</th>
                    <th className="p-4">Size (Exact)</th>
                    <th className="p-4">Downloads</th>
                    <th className="p-4">Uploaded</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredFiles.map(file => {
                    const uploaderUser = users.find(u => u.id === file.uploadedBy || u.email.toLowerCase() === file.uploaderEmail.toLowerCase());
                    const uploaderPlan = plans.find(p => p.id === uploaderUser?.planId);

                    return (
                      <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-white truncate block max-w-xs" title={file.originalName}>
                                {file.originalName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ID: {file.id}
                                </span>
                                {file.hasPassword && (
                                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                    <Lock className="w-3 h-3" /> Protected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-mono text-[11px] text-slate-300">{file.uploaderEmail}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500">{uploaderUser?.name || 'Account'}</span>
                            {uploaderPlan && (
                              <span className="px-1.5 py-0.2 text-[9px] rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                                {uploaderPlan.name}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 font-mono">
                          <div className="text-white font-semibold text-xs">
                            {formatBytes(file.sizeBytes)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {Number(file.sizeBytes).toLocaleString()} bytes
                          </div>
                        </td>

                        <td className="p-4 font-mono text-cyan-400">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-900/60 font-semibold text-xs">
                            {file.downloadCount} dl
                          </span>
                        </td>

                        <td className="p-4 text-slate-400">
                          <div className="text-slate-300">{formatDate(file.createdAt).split(',')[0]}</div>
                          <div className="text-[10px] text-slate-500">
                            {formatDate(file.createdAt).split(',')[1] || ''}
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={api.getDownloadUrl(file.id)}
                              download={file.originalName}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                              title="Direct Download File"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() => handleDeleteFileAdmin(file.id, file.originalName)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-300 transition-colors cursor-pointer"
                              title="Delete File from System & Cloud"
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
        </div>
      )}

      {/* TAB: OXAPAY ORDERS & TRANSACTIONS */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Orders Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Orders Placed</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold text-white font-mono">{orders.length}</p>
              <p className="text-[11px] text-slate-500">All OxaPay payment invoices</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Completed / Paid Orders</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-400 font-mono">
                {orders.filter(o => o.status === 'paid').length}
              </p>
              <p className="text-[11px] text-emerald-400/80">Account storage upgraded</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Revenue (INR)</span>
                <Crown className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-3xl font-extrabold text-cyan-400 font-mono">
                ₹{orders.filter(o => o.status === 'paid').reduce((acc, o) => acc + (o.amount || 0), 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-cyan-400/80">Indian Rupee (INR ₹)</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                placeholder="Search orders by Order ID, track ID, or user email..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-bold">
                {orders.filter(o => 
                  o.id.toLowerCase().includes(orderFilter.toLowerCase()) ||
                  o.userEmail.toLowerCase().includes(orderFilter.toLowerCase()) ||
                  (o.trackId && String(o.trackId).includes(orderFilter))
                ).length}
              </span> of {orders.length} orders
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {orders.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Coins className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No payment orders placed yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When users upgrade to paid storage plans using the OxaPay Crypto checkout, invoices and transaction records will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Order ID & Track ID</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Plan & Cycle</th>
                      <th className="p-4">Amount (INR)</th>
                      <th className="p-4">Payment Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders
                      .filter(o => 
                        o.id.toLowerCase().includes(orderFilter.toLowerCase()) ||
                        o.userEmail.toLowerCase().includes(orderFilter.toLowerCase()) ||
                        (o.trackId && String(o.trackId).includes(orderFilter))
                      )
                      .map((order) => {
                        const isPaid = order.status === 'paid';
                        const isPaying = order.status === 'paying';

                        return (
                          <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                              <div className="font-mono text-cyan-300 font-semibold text-xs">{order.id}</div>
                              {order.trackId && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Track ID: {order.trackId}
                                </div>
                              )}
                            </td>

                            <td className="p-4">
                              <div className="text-white font-medium">{order.userEmail}</div>
                              {order.userName && (
                                <div className="text-[10px] text-slate-500">{order.userName}</div>
                              )}
                            </td>

                            <td className="p-4">
                              <div className="font-semibold text-white">{order.planName}</div>
                              <div className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider capitalize">
                                {order.billingCycle} billing
                              </div>
                            </td>

                            <td className="p-4 font-mono">
                              <div className="text-white font-bold text-sm">
                                ₹{order.amount.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-slate-400 font-sans">
                                {order.currency || 'INR'}
                              </div>
                            </td>

                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isPaying
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                  : order.status === 'expired' || order.status === 'failed'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {isPaid ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                                <span className="uppercase">{order.status}</span>
                              </span>
                            </td>

                            <td className="p-4 text-slate-400">
                              <div className="text-slate-300">{formatDate(order.createdAt).split(',')[0]}</div>
                              <div className="text-[10px] text-slate-500">
                                {formatDate(order.createdAt).split(',')[1] || ''}
                              </div>
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {order.payLink && (
                                  <a
                                    href={order.payLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                                    title="Open OxaPay Invoice Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <button
                                  onClick={() => handleCheckOrderStatus(order.id)}
                                  disabled={checkingOrderId === order.id}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Check latest status from OxaPay API"
                                >
                                  <RefreshCw className={`w-3 h-3 ${checkingOrderId === order.id ? 'animate-spin' : ''}`} />
                                  <span>Verify</span>
                                </button>

                                {!isPaid && (
                                  <button
                                    onClick={() => handleActivateOrder(order)}
                                    disabled={activatingOrderId === order.id}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Manually mark as Paid and activate plan for user"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Activate</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ADS & <HEAD> CODE MONETIZATION */}
      {activeTab === 'ads' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl animate-in fade-in">
          
          {/* TOP INTRO BANNER */}
          <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl shadow-pink-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30 shadow-inner">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Ad Networks & Site Verification</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      Monetization Hub
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inject &lt;head&gt; verification codes across all pages and configure multiple ad zones on the file download page.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="admin-btn-save-ads-top"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save All Ad Settings</span>
                </button>
              </div>
            </div>

            {/* Supported Networks Tags */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="text-slate-500 font-semibold">Compatible with:</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">Google AdSense</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">PropellerAds</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">Adsterra</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">Monetag</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">PopAds / PopCash</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">Google Analytics / GTM</span>
            </div>
          </div>

          {/* SECTION 1: GLOBAL <HEAD> CODE / SITE VERIFICATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" />
                  <span>Site-Wide &lt;head&gt; Verification Code</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Code entered here is automatically injected into the <code className="text-cyan-400 font-mono text-[11px]">&lt;head&gt;</code> element across the entire website on every page. Use this for Google AdSense site verification meta tags, Ad network crawler verification scripts, or Google Tag Manager.
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                  Global Injection
                </span>
              </div>
            </div>

            {/* Quick Templates Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500">Insert Sample:</span>
              <button
                type="button"
                onClick={() => {
                  const sample = `<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>`;
                  setSettings({ ...settings, customHeadCode: settings.customHeadCode ? `${settings.customHeadCode}\n${sample}` : sample });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                + Google AdSense Verification Tag
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = `<meta name="monetag" content="XXXXXXXXXXXXXXXX">\n<meta name="propeller" content="XXXXXXXXXXXXXXXX">`;
                  setSettings({ ...settings, customHeadCode: settings.customHeadCode ? `${settings.customHeadCode}\n${sample}` : sample });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                + Network Meta Verification Tag
              </button>
              {settings.customHeadCode && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, customHeadCode: '' })}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/30 transition-colors cursor-pointer ml-auto"
                >
                  Clear Code
                </button>
              )}
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <textarea
                id="admin-input-custom-head-code"
                rows={6}
                value={settings.customHeadCode || ''}
                onChange={(e) => setSettings({ ...settings, customHeadCode: e.target.value })}
                placeholder={'<meta name="google-adsense-account" content="ca-pub-0000000000000000">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000" crossorigin="anonymous"></script>'}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-cyan-300 placeholder:text-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Accepts raw HTML &lt;meta&gt;, &lt;script&gt;, &lt;link&gt;, or JavaScript snippets</span>
                <span>{(settings.customHeadCode || '').length} characters</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: ADS.TXT (AUTHORIZED DIGITAL SELLERS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-amber-400" />
                  <h4 className="text-base font-bold text-white">
                    Authorized Digital Sellers (<code className="text-amber-400 font-mono text-sm">ads.txt</code>)
                  </h4>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    (settings.adsTxt || '').trim()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {(settings.adsTxt || '').trim() ? 'Configured & Active' : 'Not Configured'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The <code className="text-amber-400 font-mono text-[11px]">/ads.txt</code> file is served directly at the root of your domain as raw <code className="text-slate-300 font-mono text-[11px]">text/plain</code>. Ad networks (Google AdSense, Adsterra, PropellerAds, etc.) crawl this file to verify you are the authorized seller of your ad inventory.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/ads.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View /ads.txt</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/ads.txt`);
                    showSuccess('Copied /ads.txt link to clipboard');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </button>
              </div>
            </div>

            {/* Quick Templates for ads.txt */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500">Insert Template:</span>
              <button
                type="button"
                onClick={() => {
                  const line = 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0';
                  setSettings({ ...settings, adsTxt: settings.adsTxt ? `${settings.adsTxt.trim()}\n${line}` : line });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                + Google AdSense Line
              </button>
              <button
                type="button"
                onClick={() => {
                  const line = 'propellerads.com, 00000, DIRECT';
                  setSettings({ ...settings, adsTxt: settings.adsTxt ? `${settings.adsTxt.trim()}\n${line}` : line });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-pink-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                + PropellerAds Line
              </button>
              <button
                type="button"
                onClick={() => {
                  const line = 'adsterra.com, 00000, DIRECT';
                  setSettings({ ...settings, adsTxt: settings.adsTxt ? `${settings.adsTxt.trim()}\n${line}` : line });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                + Adsterra Line
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = `# Google AdSense\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n# PropellerAds\npropellerads.com, 00000, DIRECT\n# Adsterra\nadsterra.com, 00000, DIRECT`;
                  setSettings({ ...settings, adsTxt: sample });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                + Full Starter Set
              </button>
              {settings.adsTxt && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, adsTxt: '' })}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/30 transition-colors cursor-pointer ml-auto"
                >
                  Clear ads.txt
                </button>
              )}
            </div>

            {/* ads.txt Textarea */}
            <div className="space-y-1.5">
              <textarea
                id="admin-input-ads-txt"
                rows={6}
                value={settings.adsTxt || ''}
                onChange={(e) => setSettings({ ...settings, adsTxt: e.target.value })}
                placeholder={'# Example ads.txt\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\npropellerads.com, 00000, DIRECT'}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-amber-300 placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Format: &lt;SSP / Ad Domain&gt;, &lt;Publisher ID&gt;, &lt;DIRECT/RESELLER&gt;, &lt;TAG ID&gt;</span>
                <span>
                  {((settings.adsTxt || '').match(/\n/g) || []).length + (settings.adsTxt ? 1 : 0)} lines • {(settings.adsTxt || '').length} characters
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: DOWNLOAD PAGE ADS CONFIGURATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            
            {/* Header & Master Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Layout className="w-5 h-5 text-pink-400" />
                  <span>Download Page Multiple Ad Placements</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Target high-traffic download pages with customized ad zones. Leave any slot blank to hide it.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-white block">Download Page Ads</span>
                  <span className="text-[10px] text-slate-400">
                    {settings.adsEnabled !== false ? 'Active & Displaying' : 'Disabled (Hidden)'}
                  </span>
                </div>
                <input
                  id="admin-toggle-ads-enabled"
                  type="checkbox"
                  checked={settings.adsEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, adsEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-pink-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* AD SLOTS LIST */}
            <div className="space-y-6">
              
              {/* SLOT 1: TOP BANNER AD */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 font-bold text-xs flex items-center justify-center border border-pink-500/30">
                      1
                    </span>
                    <label className="text-xs font-bold text-white">
                      Top Header Banner Ad (Above Download Card)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Recommended: 728x90 Leaderboard, 468x60, or Responsive Banner
                  </span>
                </div>

                <textarea
                  id="admin-ad-download-top"
                  rows={4}
                  value={settings.adDownloadTop || ''}
                  onChange={(e) => setSettings({ ...settings, adDownloadTop: e.target.value })}
                  placeholder={'<!-- Paste your 728x90 Top Banner HTML or script code here -->\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-..." data-ad-slot="..."></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-pink-300 placeholder:text-slate-700 focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* SLOT 2: IN-CARD AD (BELOW FILE SPECS) */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                      2
                    </span>
                    <label className="text-xs font-bold text-white">
                      In-Card Ad (Below File Specs / Above Download Button)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Recommended: 300x250 Medium Rectangle or Native In-Article Ad
                  </span>
                </div>

                <textarea
                  id="admin-ad-download-below-details"
                  rows={4}
                  value={settings.adDownloadBelowDetails || ''}
                  onChange={(e) => setSettings({ ...settings, adDownloadBelowDetails: e.target.value })}
                  placeholder={'<!-- Paste 300x250 Rectangle or Native Ad code here -->\n<div>...</div>'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder:text-slate-700 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* SLOT 3: UNDER DOWNLOAD BUTTON */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      3
                    </span>
                    <label className="text-xs font-bold text-white">
                      Under Download Button Ad (High Conversion & CTR)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Recommended: 300x250, 468x60, or Promoted Link Widget
                  </span>
                </div>

                <textarea
                  id="admin-ad-download-below-button"
                  rows={4}
                  value={settings.adDownloadBelowButton || ''}
                  onChange={(e) => setSettings({ ...settings, adDownloadBelowButton: e.target.value })}
                  placeholder={'<!-- Paste Ad code displayed right under the primary Download Button -->\n<div>...</div>'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-300 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* SLOT 4: SIDEBAR AD (DESKTOP) */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                      4
                    </span>
                    <label className="text-xs font-bold text-white">
                      Sidebar Ad (Desktop Sticky Column)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Recommended: 300x250 Rectangle or 160x600 Skyscraper
                  </span>
                </div>

                <textarea
                  id="admin-ad-download-sidebar"
                  rows={4}
                  value={settings.adDownloadSidebar || ''}
                  onChange={(e) => setSettings({ ...settings, adDownloadSidebar: e.target.value })}
                  placeholder={'<!-- Paste Desktop Sidebar Ad snippet here (300x250 or 160x600) -->\n<div>...</div>'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-amber-300 placeholder:text-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* SLOT 5: BOTTOM BANNER AD */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/30">
                      5
                    </span>
                    <label className="text-xs font-bold text-white">
                      Bottom Banner Ad (Below Sign-up Card)
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Recommended: 728x90 Leaderboard or Native Grid Widget
                  </span>
                </div>

                <textarea
                  id="admin-ad-download-bottom"
                  rows={4}
                  value={settings.adDownloadBottom || ''}
                  onChange={(e) => setSettings({ ...settings, adDownloadBottom: e.target.value })}
                  placeholder={'<!-- Paste Bottom Banner 728x90 or Native Feed code here -->\n<div>...</div>'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-purple-300 placeholder:text-slate-700 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* SLOT 6: POPUNDER / DIRECT SCRIPT */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center border border-rose-500/30">
                      6
                    </span>
                    <label className="text-xs font-bold text-white">
                      Popunder / OnClick / Interstitial Script Code
                    </label>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Compatible with: PropellerAds, PopAds, PopCash, Monetag OnClick
                  </span>
                </div>

                <textarea
                  id="admin-ad-download-popunder"
                  rows={4}
                  value={settings.adDownloadPopunder || ''}
                  onChange={(e) => setSettings({ ...settings, adDownloadPopunder: e.target.value })}
                  placeholder={'<!-- Paste Popunder / OnClick JS Script tag here -->\n<script type="text/javascript" src="//..."></script>'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-rose-300 placeholder:text-slate-700 focus:outline-none focus:border-rose-500"
                />
              </div>

            </div>

            {/* Bottom Save Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Changes apply instantly across all active download links upon saving.
              </p>
              <button
                id="admin-btn-save-ads"
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:from-pink-400 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition-all cursor-pointer"
              >
                Save All Ad & &lt;head&gt; Codes
              </button>
            </div>
          </div>

        </form>
      )}

      {/* TAB: PUBLIC ROOT FILES (SERVED AT /) */}
      {activeTab === 'public-files' && (
        <div className="space-y-6 max-w-5xl animate-in fade-in">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl shadow-cyan-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-inner">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Public Root Files (<code className="text-cyan-400 font-mono text-base">/</code>)</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {publicFiles.length} {publicFiles.length === 1 ? 'File' : 'Files'} Served
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Host arbitrary verification files, <code className="text-cyan-400 font-mono">robots.txt</code>, <code className="text-cyan-400 font-mono">sitemap.xml</code>, Google HTML verification tags, or raw text directly at the domain root URL.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="admin-btn-create-public-file"
                  type="button"
                  onClick={handleOpenCreatePublicFile}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Add Public Root File</span>
                </button>
              </div>
            </div>

            {/* Quick Templates Quick-Add Row */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-slate-500 font-semibold">Quick Create Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingPublicFile(true);
                  setEditingPublicFile(null);
                  setPublicFileForm({
                    path: 'robots.txt',
                    contentType: 'text/plain; charset=utf-8',
                    content: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${window.location.origin}/sitemap.xml`
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 text-[11px] font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                + robots.txt
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingPublicFile(true);
                  setEditingPublicFile(null);
                  setPublicFileForm({
                    path: 'sitemap.xml',
                    contentType: 'application/xml; charset=utf-8',
                    content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${window.location.origin}/</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 text-[11px] font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                + sitemap.xml
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingPublicFile(true);
                  setEditingPublicFile(null);
                  setPublicFileForm({
                    path: 'google-site-verification.html',
                    contentType: 'text/html; charset=utf-8',
                    content: `google-site-verification: google1234567890abcdef.html`
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 text-[11px] font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                + Google HTML Verification
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingPublicFile(true);
                  setEditingPublicFile(null);
                  setPublicFileForm({
                    path: 'security.txt',
                    contentType: 'text/plain; charset=utf-8',
                    content: `Contact: mailto:${settings?.supportEmail || 'teamthunderofficialyt@gmail.com'}\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en`
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-400 text-[11px] font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                + security.txt
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={publicFileSearch}
                onChange={(e) => setPublicFileSearch(e.target.value)}
                placeholder="Search root files (e.g. robots, google, xml)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Root Path: <span className="text-cyan-400">{window.location.origin}/&lt;filename&gt;</span>
            </div>
          </div>

          {/* Public Files Grid / Cards */}
          {publicFiles.filter(f => f.path.toLowerCase().includes(publicFileSearch.toLowerCase()) || f.contentType.toLowerCase().includes(publicFileSearch.toLowerCase())).length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto border border-slate-700/50">
                <FileCode className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">No Public Root Files Configured</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Add files to be served directly from your website root (e.g. <code className="text-cyan-400 font-mono">robots.txt</code>, Search Console HTML verification files, XML sitemaps, etc.).
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreatePublicFile}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Public Root File</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicFiles
                .filter(f => f.path.toLowerCase().includes(publicFileSearch.toLowerCase()) || f.contentType.toLowerCase().includes(publicFileSearch.toLowerCase()))
                .map((file) => {
                  const cleanPath = file.path.replace(/^\/+/, '');
                  const fullUrl = `${window.location.origin}/${cleanPath}`;
                  const isCopied = copiedPublicPath === cleanPath;

                  return (
                    <div
                      key={file.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top path & badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                <FileCode className="w-4 h-4" />
                              </span>
                              <span className="font-mono text-sm font-bold text-white tracking-tight">
                                /{cleanPath}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                {file.contentType.split(';')[0]}
                              </span>
                              <span>•</span>
                              <span>{file.content.length} chars ({new Blob([file.content]).size} bytes)</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Live at /
                          </span>
                        </div>

                        {/* Content Preview Box */}
                        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 max-h-24 overflow-hidden relative">
                          <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-wrap break-all leading-tight">
                            {file.content ? (file.content.length > 200 ? `${file.content.slice(0, 200)}...` : file.content) : '<empty file>'}
                          </pre>
                          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Updated {formatDate(file.updatedAt || file.createdAt)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/${cleanPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                            title="Open URL in New Tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => copyPublicFileUrl(cleanPath)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title="Copy Live URL"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditPublicFile(file)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                            title="Edit File"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePublicFile(file.id, cleanPath)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SITE & OXAPAY SETTINGS */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6 max-w-3xl animate-in fade-in">
          
          {/* OXAPAY CRYPTO PAYMENT GATEWAY CARD */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-amber-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>OxaPay Crypto Payment Gateway</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      INR Currency (₹)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Accept cryptocurrency payments (USDT, BTC, ETH, TRX, BNB) converted automatically from Indian Rupees.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                  settings.oxapayEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {settings.oxapayEnabled ? 'Gateway Active' : 'Gateway Disabled'}
                </span>
              </div>
            </div>

            {/* Merchant API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  OxaPay Merchant API Key
                </label>
                <a
                  href="https://oxapay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  <span>Get Key from OxaPay Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showOxaPayKey ? 'text' : 'password'}
                    value={settings.oxapayApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, oxapayApiKey: e.target.value })}
                    placeholder="Enter your OxaPay Merchant API Key..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOxaPayKey(!showOxaPayKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showOxaPayKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTestOxaPay}
                  disabled={testingOxaPay}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {testingOxaPay ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Test API Key</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test result feedback badge */}
              {oxapayTestResult && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  oxapayTestResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {oxapayTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold">{oxapayTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Gateway Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">Enable OxaPay Payments</p>
                  <p className="text-[11px] text-slate-400">Allow users to pay with crypto on plan upgrade.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.oxapayEnabled ?? true}
                  onChange={(e) => setSettings({ ...settings, oxapayEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">Sandbox / Demo Mode</p>
                  <p className="text-[11px] text-slate-400">Simulate invoices and instant payments for testing.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.oxapaySandbox ?? false}
                  onChange={(e) => setSettings({ ...settings, oxapaySandbox: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
              </div>
            </div>

            {/* Website Currency Details */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Website Primary Currency:</span>
                <span className="text-xs font-mono font-bold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  {settings.currency || 'INR'} (₹ Indian Rupee)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All platform storage tiers are denominated in Indian Rupees (INR). During checkout, OxaPay automatically presents the user with real-time crypto prices (e.g. USDT, BTC, ETH) matching the exact INR amount.
              </p>
            </div>

            {/* Webhook Callback URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Webhook Callback URL (IPN)</span>
                <span className="text-[11px] text-slate-500 font-normal">Auto-registered with each invoice</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/api/payments/oxapay/callback` : '/api/payments/oxapay/callback'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* GENERAL SITE SETTINGS FORM */}
          <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                TG Uploads Website Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Customize the platform name, live announcement message, and public registrations.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Site Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Announcement Banner */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Live Announcement Banner
                  </label>
                  <label className="text-xs text-cyan-400 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.announcementEnabled}
                      onChange={(e) => setSettings({ ...settings, announcementEnabled: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                    Show Banner
                  </label>
                </div>

                <textarea
                  rows={2}
                  value={settings.announcementText}
                  onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                  placeholder="Message displayed on top of TG Uploads..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Telegram Support Channel Link</label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settings.telegramChannel}
                    onChange={(e) => setSettings({ ...settings, telegramChannel: e.target.value })}
                    placeholder="https://t.me/teamthunderofficial"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Support Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    placeholder="teamthunderofficialyt@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">Public User Registration</p>
                  <p className="text-[11px] text-slate-400">Allow new users to sign up and get the Free Starter plan.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowPublicRegistration}
                  onChange={(e) => setSettings({ ...settings, allowPublicRegistration: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="admin-btn-save-settings"
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Save All Platform & OxaPay Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PLAN CREATE / EDIT MODAL */}
      {(isCreatingPlan || editingPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                {isCreatingPlan ? 'Create New Storage Plan' : `Edit Plan: ${editingPlan?.name}`}
              </h3>
              <button 
                onClick={() => { setIsCreatingPlan(false); setEditingPlan(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g. Pro Thunder"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Badge Tag (Optional)</label>
                  <input
                    type="text"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    placeholder="e.g. Most Popular"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Short description of who this plan is for"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Total Storage Limit (GB)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planForm.storageLimitGB}
                    onChange={(e) => setPlanForm({ ...planForm, storageLimitGB: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Max File Size (MB)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={planForm.maxFileSizeMB}
                    onChange={(e) => setPlanForm({ ...planForm, maxFileSizeMB: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Monthly Price (₹ INR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Yearly Price (₹ INR)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Retention (0 = Permanent)</label>
                  <input
                    type="number"
                    value={planForm.retentionDays}
                    onChange={(e) => setPlanForm({ ...planForm, retentionDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bandwidth / Speed Label</label>
                <input
                  type="text"
                  value={planForm.downloadSpeed}
                  onChange={(e) => setPlanForm({ ...planForm, downloadSpeed: e.target.value })}
                  placeholder="e.g. Uncapped Gigabit"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Feature checkboxes */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.passwordProtection}
                    onChange={(e) => setPlanForm({ ...planForm, passwordProtection: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  <span>Allow Password Locks</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.directLinks}
                    onChange={(e) => setPlanForm({ ...planForm, directLinks: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  <span>Allow Direct Hotlinking</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer col-span-2">
                  <input
                    type="checkbox"
                    checked={planForm.isDefault}
                    onChange={(e) => setPlanForm({ ...planForm, isDefault: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500"
                  />
                  <span>Make this the default plan for new signups</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Features (One per line)</label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsCreatingPlan(false); setEditingPlan(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  {isCreatingPlan ? 'Create Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLIC ROOT FILE CREATE / EDIT MODAL */}
      {(isCreatingPublicFile || editingPublicFile) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                {isCreatingPublicFile ? 'Create Public Root File' : `Edit Public File: /${editingPublicFile?.path}`}
              </h3>
              <button 
                type="button"
                onClick={handleClosePublicFileModal}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePublicFile} className="space-y-4 text-xs">
              
              {/* File Upload Option */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Auto-fill by uploading local file</span>
                    <span className="text-[11px] text-slate-400">Select any verification or text/html file from your device</span>
                  </div>
                </div>
                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold cursor-pointer border border-slate-700 transition-colors shrink-0">
                  <span>Browse Device</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUploadForPublicFile}
                  />
                </label>
              </div>

              {/* Path and Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    File Path / Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-mono text-slate-500 select-none">/</span>
                    <input
                      type="text"
                      required
                      value={publicFileForm.path}
                      onChange={(e) => {
                        const val = e.target.value.replace(/^\/+/, '');
                        setPublicFileForm(prev => {
                          let autoType = prev.contentType;
                          if (val.endsWith('.html') || val.endsWith('.htm')) autoType = 'text/html; charset=utf-8';
                          else if (val.endsWith('.xml')) autoType = 'application/xml; charset=utf-8';
                          else if (val.endsWith('.json')) autoType = 'application/json; charset=utf-8';
                          else if (val.endsWith('.txt')) autoType = 'text/plain; charset=utf-8';
                          else if (val.endsWith('.js')) autoType = 'application/javascript; charset=utf-8';
                          return { ...prev, path: val, contentType: autoType };
                        });
                      }}
                      placeholder="e.g. robots.txt, google12345.html, sitemap.xml"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Served live at: <code className="text-cyan-400 font-mono">{window.location.origin}/{publicFileForm.path || '<path>'}</code>
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Content-Type / MIME</label>
                  <select
                    value={publicFileForm.contentType}
                    onChange={(e) => setPublicFileForm({ ...publicFileForm, contentType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="text/plain; charset=utf-8">text/plain (Plain Text / TXT)</option>
                    <option value="text/html; charset=utf-8">text/html (HTML Document)</option>
                    <option value="application/xml; charset=utf-8">application/xml (XML / Sitemap)</option>
                    <option value="application/json; charset=utf-8">application/json (JSON Data)</option>
                    <option value="application/javascript; charset=utf-8">application/javascript (JavaScript)</option>
                  </select>
                </div>
              </div>

              {/* Template shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Insert Sample:</span>
                <button
                  type="button"
                  onClick={() => setPublicFileForm({
                    path: 'robots.txt',
                    contentType: 'text/plain; charset=utf-8',
                    content: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${window.location.origin}/sitemap.xml`
                  })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[10px] border border-slate-700"
                >
                  robots.txt
                </button>
                <button
                  type="button"
                  onClick={() => setPublicFileForm({
                    path: 'sitemap.xml',
                    contentType: 'application/xml; charset=utf-8',
                    content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${window.location.origin}/</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`
                  })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] border border-slate-700"
                >
                  sitemap.xml
                </button>
                <button
                  type="button"
                  onClick={() => setPublicFileForm(prev => ({
                    path: prev.path || 'google-site-verification.html',
                    contentType: 'text/html; charset=utf-8',
                    content: `google-site-verification: google1234567890abcdef.html`
                  }))}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] border border-slate-700"
                >
                  Google Verification HTML
                </button>
                <button
                  type="button"
                  onClick={() => setPublicFileForm(prev => ({
                    path: prev.path || 'security.txt',
                    contentType: 'text/plain; charset=utf-8',
                    content: `Contact: mailto:${settings?.supportEmail || 'teamthunderofficialyt@gmail.com'}\nExpires: 2027-01-01T00:00:00.000Z\nPreferred-Languages: en`
                  }))}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 text-[10px] border border-slate-700"
                >
                  security.txt
                </button>
              </div>

              {/* Content text area */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">File Body / Content</label>
                <textarea
                  rows={9}
                  value={publicFileForm.content}
                  onChange={(e) => setPublicFileForm({ ...publicFileForm, content: e.target.value })}
                  placeholder="Paste or write raw file contents here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Served with HTTP 200 OK and specified Content-Type</span>
                  <span>{publicFileForm.content.length} characters</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClosePublicFileModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPublicFile}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
                >
                  {savingPublicFile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{isCreatingPublicFile ? 'Publish to Root /' : 'Update Root File'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
