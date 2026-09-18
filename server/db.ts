import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Plan, FileItem, SiteSettings, PaymentOrder, PublicRootFile, Coupon } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

export interface StoredFileItem extends FileItem {
  passwordHash?: string;
  filePath?: string;
  tgFileId?: number | string;
  folderId?: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  plans: Plan[];
  files: StoredFileItem[];
  orders: PaymentOrder[];
  coupons: Coupon[];
  publicFiles: PublicRootFile[];
  settings: SiteSettings;
  sessions: Record<string, { userId: string; expiresAt: number }>;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free Starter',
    description: 'Perfect for quick file transfers and casual sharing.',
    storageLimitBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    maxFileSizeBytes: 500 * 1024 * 1024,       // 500 MB
    downloadSpeed: 'Standard (10 MB/s)',
    retentionDays: 0, // 0 = Unlimited time / Permanent
    passwordProtection: false,
    directLinks: false,
    prioritySupport: false,
    priceMonthly: 0,
    priceYearly: 0,
    badge: 'Free Forever',
    isDefault: true,
    active: true,
    features: [
      '50 GB Secure Cloud Storage',
      '500 MB Maximum File Size',
      'Unlimited Time (Permanent - No Expiry)',
      'High-Speed CDN Transfers',
      'QR Code & Quick Share Links',
      'Direct In-Browser Previews'
    ]
  },
  {
    id: 'plan_pro',
    name: 'Pro Thunder',
    description: 'Designed for power users, creators, and large files.',
    storageLimitBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    maxFileSizeBytes: 5 * 1024 * 1024 * 1024,   // 5 GB
    downloadSpeed: 'High-Speed (50 MB/s)',
    retentionDays: 0, // Permanent
    passwordProtection: true,
    directLinks: true,
    prioritySupport: true,
    priceMonthly: 499,
    priceYearly: 4999,
    badge: 'Most Popular',
    isDefault: false,
    active: true,
    features: [
      '50 GB High-Speed Storage',
      '5 GB Maximum File Size',
      'Permanent Storage (No Expiry)',
      'Password Protected Files',
      'Direct Hotlinking & Streaming',
      'Advanced Download Analytics',
      'Priority Transfer Speed'
    ]
  },
  {
    id: 'plan_ultra',
    name: 'TG Enterprise',
    description: 'Uncapped gigabit bandwidth and massive storage capacity.',
    storageLimitBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    maxFileSizeBytes: 25 * 1024 * 1024 * 1024,   // 25 GB
    downloadSpeed: 'Uncapped Gigabit',
    retentionDays: 0,
    passwordProtection: true,
    directLinks: true,
    prioritySupport: true,
    priceMonthly: 1499,
    priceYearly: 14999,
    badge: 'Uncapped Power',
    isDefault: false,
    active: true,
    features: [
      '500 GB Premium Enterprise Storage',
      '25 GB Massive File Size Limit',
      'Permanent Storage & Custom Retention',
      'Password Protection & PIN Codes',
      'Uncapped Gigabit Multi-Thread Speeds',
      'Custom Vanity Download Pages',
      'Dedicated 24/7 VIP Support'
    ]
  }
];

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'TG Uploads',
  tagline: 'Lightning-Fast, Cloud-Powered File Sharing & Storage',
  announcementText: '',
  announcementEnabled: false,
  allowPublicRegistration: true,
  defaultPlanId: 'plan_free',
  supportEmail: 'teamthunderofficialyt@gmail.com',
  telegramChannel: 'https://t.me/teamthunderofficial',
  maxGlobalUploadSizeBytes: 25 * 1024 * 1024 * 1024,
  maintenanceMode: false,
  currency: 'INR',
  oxapayApiKey: process.env.OXAPAY_API_KEY || '',
  oxapayEnabled: true,
  oxapaySandbox: false,
  customHeadCode: '',
  adsTxt: '',
  adsEnabled: true,
  adDownloadTop: '',
  adDownloadBelowDetails: '',
  adDownloadBelowButton: '',
  adDownloadSidebar: '',
  adDownloadBottom: '',
  adDownloadPopunder: ''
};

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'coup_free2026',
    code: 'FREE2026',
    description: '100% Free TG Enterprise Plan Upgrade',
    discountType: 'free',
    discountValue: 100,
    applicablePlanIds: ['plan_ultra', 'all'],
    applicableCycle: 'all',
    maxUses: 0,
    usedCount: 0,
    expiresAt: null,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_free100',
    code: 'FREE100',
    description: '100% Free Plan Upgrade (No payment required)',
    discountType: 'free',
    discountValue: 100,
    applicablePlanIds: [],
    applicableCycle: 'all',
    maxUses: 0,
    usedCount: 0,
    expiresAt: null,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup_thunder50',
    code: 'THUNDER50',
    description: 'Special 50% discount on Pro & Enterprise plans',
    discountType: 'percentage',
    discountValue: 50,
    applicablePlanIds: [],
    applicableCycle: 'all',
    maxUses: 200,
    usedCount: 0,
    expiresAt: null,
    active: true,
    createdAt: new Date().toISOString()
  }
];

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    this.data = this.loadDatabase();
    this.ensureAdminUser();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const plans = (parsed.plans && parsed.plans.length > 0 ? parsed.plans : DEFAULT_PLANS).map((p: Plan) => {
          if (p.id === 'plan_free') {
            p.storageLimitBytes = 50 * 1024 * 1024 * 1024; // 50 GB
            p.maxFileSizeBytes = 500 * 1024 * 1024;       // 500 MB
            p.retentionDays = 0; // 0 = Unlimited Time / Permanent
            p.features = [
              '50 GB Secure Cloud Storage',
              '500 MB Maximum File Size',
              'Unlimited Time (Permanent - No Expiry)',
              'High-Speed CDN Transfers',
              'QR Code & Quick Share Links',
              'Direct In-Browser Previews'
            ];
          }
          // Convert legacy USD prices to INR if needed
          if (p.id === 'plan_pro' && p.priceMonthly < 50) {
            p.priceMonthly = 499;
            p.priceYearly = 4999;
          } else if (p.id === 'plan_ultra' && p.priceMonthly < 50) {
            p.priceMonthly = 1499;
            p.priceYearly = 14999;
          }
          return p;
        });

        const cleanFiles = (parsed.files || []).filter((f: StoredFileItem) => !f.id.startsWith('file_tg_'));

        const initialCoupons = parsed.coupons && Array.isArray(parsed.coupons) ? parsed.coupons : DEFAULT_COUPONS;
        if (!initialCoupons.some((c: Coupon) => c.code === 'FREE2026')) {
          initialCoupons.unshift(DEFAULT_COUPONS[0]);
        }

        const loadedData: DatabaseSchema = {
          users: parsed.users || [],
          plans,
          files: cleanFiles,
          orders: parsed.orders || [],
          coupons: initialCoupons,
          publicFiles: parsed.publicFiles || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}), currency: 'INR' },
          sessions: parsed.sessions || {}
        };

        // Recalculate storage for all users based only on their actual uploaded files
        loadedData.users.forEach(u => {
          const userTotal = cleanFiles
            .filter((f: StoredFileItem) => f.uploadedBy === u.id || (f.uploaderEmail && u.email && f.uploaderEmail.toLowerCase() === u.email.toLowerCase()))
            .reduce((acc: number, f: StoredFileItem) => acc + (f.sizeBytes || 0), 0);
          u.usedStorageBytes = userTotal;
        });

        return loadedData;
      }
    } catch (err) {
      console.error('Error loading DB file, creating fresh DB:', err);
    }

    const initialData: DatabaseSchema = {
      users: [],
      plans: DEFAULT_PLANS,
      files: [],
      orders: [],
      coupons: DEFAULT_COUPONS,
      publicFiles: [],
      settings: DEFAULT_SETTINGS,
      sessions: {}
    };
    this.persist(initialData);
    return initialData;
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private ensureAdminUser() {
    const adminEmail = 'teamthunderofficialyt@gmail.com';
    const existing = this.data.users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
    const { hash, salt } = hashPassword('Thunderffyt123@');

    if (!existing) {
      const adminUser: StoredUser = {
        id: 'user_admin_teamthunder',
        email: adminEmail,
        name: 'Team Thunder Admin',
        role: 'admin',
        planId: 'plan_ultra',
        usedStorageBytes: 0,
        createdAt: new Date().toISOString(),
        isSuspended: false,
        passwordHash: hash,
        salt
      };
      this.data.users.push(adminUser);
      this.persist();
      console.log(`[DB] Created default administrator: ${adminEmail}`);
    } else {
      existing.role = 'admin';
      existing.passwordHash = hash;
      existing.salt = salt;
      this.persist();
    }
  }

  // --- Users ---
  public checkUserPlanExpiry(user: StoredUser): boolean {
    if (!user) return false;
    // Administrator accounts remain permanent
    if (user.role === 'admin' || user.email.toLowerCase() === 'teamthunderofficialyt@gmail.com') {
      return false;
    }
    // If paid plan has passed its expiration/renewal date, automatically downgrade to Free Starter
    if (user.planId && user.planId !== 'plan_free' && user.planExpiresAt) {
      const expiryMs = new Date(user.planExpiresAt).getTime();
      if (!isNaN(expiryMs) && expiryMs < Date.now()) {
        console.log(`[Plan Expiry] User ${user.email} plan ${user.planId} expired at ${user.planExpiresAt} without renewal. Reverting to plan_free.`);
        user.planId = 'plan_free';
        user.planExpiresAt = null;
        user.planCycle = undefined;
        this.persist();
        return true;
      }
    }
    return false;
  }

  public getUsers(): StoredUser[] {
    for (const u of this.data.users) {
      this.checkUserPlanExpiry(u);
    }
    return this.data.users;
  }

  public getUserById(id: string): StoredUser | undefined {
    const user = this.data.users.find(u => u.id === id);
    if (user) {
      this.checkUserPlanExpiry(user);
    }
    return user;
  }

  public getUserByEmail(email: string): StoredUser | undefined {
    const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      this.checkUserPlanExpiry(user);
    }
    return user;
  }

  public createUser(email: string, name: string, passwordHash: string, salt: string): StoredUser {
    const isAdminEmail = email.toLowerCase() === 'teamthunderofficialyt@gmail.com';
    const defaultPlan = this.getDefaultPlan();
    
    const newUser: StoredUser = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      email,
      name,
      role: isAdminEmail ? 'admin' : 'user',
      planId: isAdminEmail ? 'plan_ultra' : defaultPlan.id,
      usedStorageBytes: 0,
      createdAt: new Date().toISOString(),
      isSuspended: false,
      passwordHash,
      salt
    };

    this.data.users.push(newUser);
    this.persist();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    // teamthunderofficialyt@gmail.com always stays admin
    if (this.data.users[idx].email.toLowerCase() === 'teamthunderofficialyt@gmail.com') {
      updates.role = 'admin';
      updates.isSuspended = false;
    }

    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.persist();
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const target = this.getUserById(id);
    if (!target) return false;
    if (target.email.toLowerCase() === 'teamthunderofficialyt@gmail.com') {
      return false; // Prevent deleting superadmin
    }

    // Delete user's files and file system assets
    const userFiles = this.data.files.filter(f => f.uploadedBy === id);
    for (const file of userFiles) {
      this.deleteFile(file.id);
    }

    this.data.users = this.data.users.filter(u => u.id !== id);
    this.persist();
    return true;
  }

  public recalculateUserStorage(userId: string): number {
    const user = this.getUserById(userId);
    if (!user) return 0;

    const total = this.data.files
      .filter(f => f.uploadedBy === userId || (f.uploaderEmail && user.email && f.uploaderEmail.toLowerCase() === user.email.toLowerCase()))
      .reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

    user.usedStorageBytes = total;
    this.persist();
    return total;
  }

  // --- Sessions ---
  public createSession(userId: string): string {
    const token = 'tgs_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    this.data.sessions[token] = { userId, expiresAt };
    this.persist();
    return token;
  }

  public getSessionUser(token: string): StoredUser | null {
    if (!token) return null;
    const session = this.data.sessions[token];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete this.data.sessions[token];
      this.persist();
      return null;
    }
    return this.getUserById(session.userId) || null;
  }

  public deleteSession(token: string) {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.persist();
    }
  }

  // --- Plans ---
  public getPlans(): Plan[] {
    return this.data.plans;
  }

  public getPlanById(id: string): Plan | undefined {
    return this.data.plans.find(p => p.id === id);
  }

  public getDefaultPlan(): Plan {
    const defaultP = this.data.plans.find(p => p.isDefault && p.active);
    return defaultP || this.data.plans[0] || DEFAULT_PLANS[0];
  }

  public createPlan(planData: Omit<Plan, 'id'>): Plan {
    const newPlan: Plan = {
      ...planData,
      id: 'plan_' + crypto.randomBytes(4).toString('hex')
    };

    if (newPlan.isDefault) {
      this.data.plans.forEach(p => { p.isDefault = false; });
    }

    this.data.plans.push(newPlan);
    this.persist();
    return newPlan;
  }

  public updatePlan(id: string, updates: Partial<Plan>): Plan | null {
    const idx = this.data.plans.findIndex(p => p.id === id);
    if (idx === -1) return null;

    if (updates.isDefault) {
      this.data.plans.forEach(p => { p.isDefault = false; });
    }

    this.data.plans[idx] = { ...this.data.plans[idx], ...updates };
    this.persist();
    return this.data.plans[idx];
  }

  public deletePlan(id: string): boolean {
    const plan = this.getPlanById(id);
    if (!plan || plan.isDefault) return false;
    
    // Fallback any users on this plan to default plan
    const defaultPlan = this.getDefaultPlan();
    this.data.users.forEach(u => {
      if (u.planId === id) {
        u.planId = defaultPlan.id;
      }
    });

    this.data.plans = this.data.plans.filter(p => p.id !== id);
    this.persist();
    return true;
  }

  // --- Files ---
  public getFiles(): StoredFileItem[] {
    return this.data.files;
  }

  public getFileById(id: string): StoredFileItem | undefined {
    return this.data.files.find(f => f.id === id);
  }

  public getFileByShareToken(token: string): StoredFileItem | undefined {
    return this.data.files.find(f => f.shareToken === token);
  }

  public getFilesByUser(userId: string): StoredFileItem[] {
    const user = this.getUserById(userId);
    if (!user) {
      return this.data.files.filter(f => f.uploadedBy === userId);
    }
    return this.data.files.filter(f => 
      f.uploadedBy === userId || 
      (f.uploaderEmail && user.email && f.uploaderEmail.toLowerCase() === user.email.toLowerCase())
    );
  }

  public addFile(file: StoredFileItem): StoredFileItem {
    this.data.files.unshift(file);
    this.recalculateUserStorage(file.uploadedBy);
    this.persist();
    return file;
  }

  public updateFile(id: string, updates: Partial<StoredFileItem>): StoredFileItem | null {
    const idx = this.data.files.findIndex(f => f.id === id);
    if (idx === -1) return null;

    this.data.files[idx] = { ...this.data.files[idx], ...updates };
    this.persist();
    return this.data.files[idx];
  }

  public deleteFile(id: string): boolean {
    const idx = this.data.files.findIndex(f => f.id === id);
    if (idx === -1) return false;

    const file = this.data.files[idx];
    try {
      if (file.filePath && fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
    } catch (e) {
      console.warn('Could not remove physical file:', e);
    }

    this.data.files.splice(idx, 1);
    this.recalculateUserStorage(file.uploadedBy);
    this.persist();
    return true;
  }

  public incrementDownload(fileId: string) {
    const file = this.getFileById(fileId);
    if (file) {
      file.downloadCount += 1;
      file.lastDownloadedAt = new Date().toISOString();
      // If guest upload or retentionType is after_last_download, extend retention for 30 days from download
      if (file.isGuest || file.retentionType === 'after_last_download') {
        file.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      this.persist();
    }
  }

  public getGuestUsedStorage(guestId: string): number {
    const gid = guestId.startsWith('guest_') ? guestId : `guest_${guestId}`;
    return this.data.files
      .filter(f => f.uploadedBy === gid || f.uploadedBy === guestId)
      .reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  }

  public getFilesByGuest(guestId: string): StoredFileItem[] {
    const gid = guestId.startsWith('guest_') ? guestId : `guest_${guestId}`;
    return this.data.files.filter(f => f.uploadedBy === gid || f.uploadedBy === guestId);
  }

  // --- Orders & Payments ---
  public getOrders(): PaymentOrder[] {
    return this.data.orders || [];
  }

  public getOrderById(id: string): PaymentOrder | undefined {
    return (this.data.orders || []).find(o => o.id === id);
  }

  public getOrderByTrackId(trackId: string | number): PaymentOrder | undefined {
    return (this.data.orders || []).find(o => String(o.trackId) === String(trackId));
  }

  public getOrdersByUser(userId: string): PaymentOrder[] {
    return (this.data.orders || []).filter(o => o.userId === userId);
  }

  public addOrder(order: PaymentOrder): PaymentOrder {
    if (!this.data.orders) {
      this.data.orders = [];
    }
    this.data.orders.unshift(order);
    this.persist();
    return order;
  }

  public updateOrder(id: string, updates: Partial<PaymentOrder>): PaymentOrder | null {
    if (!this.data.orders) return null;
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.data.orders[idx] = { ...this.data.orders[idx], ...updates };
    this.persist();
    return this.data.orders[idx];
  }

  // --- Coupons & Promos ---
  public getCoupons(): Coupon[] {
    return this.data.coupons || [];
  }

  public getCouponById(id: string): Coupon | undefined {
    return (this.data.coupons || []).find(c => c.id === id);
  }

  public getCouponByCode(code: string): Coupon | undefined {
    if (!code) return undefined;
    const clean = code.trim().toUpperCase();
    return (this.data.coupons || []).find(c => c.code.trim().toUpperCase() === clean);
  }

  public addCoupon(coupon: Coupon): Coupon {
    if (!this.data.coupons) {
      this.data.coupons = [];
    }
    // Check if code already exists
    const clean = coupon.code.trim().toUpperCase();
    const existingIdx = this.data.coupons.findIndex(c => c.code.trim().toUpperCase() === clean);
    if (existingIdx !== -1) {
      this.data.coupons[existingIdx] = coupon;
    } else {
      this.data.coupons.unshift(coupon);
    }
    this.persist();
    return coupon;
  }

  public updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
    if (!this.data.coupons) return null;
    const idx = this.data.coupons.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.coupons[idx] = { ...this.data.coupons[idx], ...updates };
    this.persist();
    return this.data.coupons[idx];
  }

  public deleteCoupon(id: string): boolean {
    if (!this.data.coupons) return false;
    const initialLen = this.data.coupons.length;
    this.data.coupons = this.data.coupons.filter(c => c.id !== id);
    if (this.data.coupons.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public incrementCouponUses(code: string) {
    const coupon = this.getCouponByCode(code);
    if (coupon) {
      coupon.usedCount = (coupon.usedCount || 0) + 1;
      this.persist();
    }
  }

  // --- Public Root Files (served at /<path>) ---
  public getPublicFiles(): PublicRootFile[] {
    return this.data.publicFiles || [];
  }

  public getPublicFileById(id: string): PublicRootFile | undefined {
    return (this.data.publicFiles || []).find(f => f.id === id);
  }

  public getPublicFileByPath(filePath: string): PublicRootFile | undefined {
    // Normalize path by stripping leading slashes
    const normalized = filePath.replace(/^\/+/, '').trim().toLowerCase();
    return (this.data.publicFiles || []).find(f => f.path.replace(/^\/+/, '').trim().toLowerCase() === normalized);
  }

  public addPublicFile(file: PublicRootFile): PublicRootFile {
    if (!this.data.publicFiles) {
      this.data.publicFiles = [];
    }
    // Remove any existing file with same path
    const normalized = file.path.replace(/^\/+/, '').trim().toLowerCase();
    this.data.publicFiles = this.data.publicFiles.filter(
      f => f.path.replace(/^\/+/, '').trim().toLowerCase() !== normalized
    );
    this.data.publicFiles.unshift(file);
    this.persist();
    return file;
  }

  public updatePublicFile(id: string, updates: Partial<PublicRootFile>): PublicRootFile | null {
    if (!this.data.publicFiles) return null;
    const idx = this.data.publicFiles.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.publicFiles[idx] = { 
      ...this.data.publicFiles[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    this.persist();
    return this.data.publicFiles[idx];
  }

  public deletePublicFile(id: string): boolean {
    if (!this.data.publicFiles) return false;
    const initialLen = this.data.publicFiles.length;
    this.data.publicFiles = this.data.publicFiles.filter(f => f.id !== id);
    if (this.data.publicFiles.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Settings ---
  public getSettings(): SiteSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<SiteSettings>): SiteSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.persist();
    return this.data.settings;
  }
}

export const db = new Database();
export { UPLOADS_DIR };
