import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { Readable } from 'stream';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, verifyPassword, StoredUser, StoredFileItem, UPLOADS_DIR } from './server/db.js';
import { Plan, PaymentOrder, PublicRootFile } from './src/types.js';
import { createOxaPayInvoice, inquireOxaPayPayment, testOxaPayMerchantKey } from './server/oxapay.js';

// TGWebDrive API Configuration
const TG_API_KEY = process.env.TG_API_KEY || 'tdk_f716e18729fa598b2995d6b54fcd6560dfe2f333';
const TG_BASE_URL = process.env.TG_BASE_URL || 'https://drive.tglinks.eu.cc/api/v1';
let cachedFolderId = process.env.TG_DEFAULT_FOLDER_ID || 'f238f42e85004475';

async function getFolderId(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
  try {
    const res = await fetch(`${TG_BASE_URL}/folders`, {
      headers: { 'X-API-Key': TG_API_KEY }
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data.folders && data.folders.length > 0) {
        cachedFolderId = data.folders[0].id;
        return cachedFolderId;
      }
    }
  } catch (e) {
    console.error('Failed to get TGWebDrive folder ID:', e);
  }
  return 'f238f42e85004475';
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust reverse proxies (Nginx, Cloudflare, Caddy) for custom domains like tguploads.eu.cc
app.set('trust proxy', true);

// Enable CORS for custom domain & external requests
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    // 5GB per file ceiling at multer level; granular plan limit checked in route
    fileSize: 5 * 1024 * 1024 * 1024
  }
});

// Helper: Get token from header
function getAuthUser(req: Request): StoredUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return db.getSessionUser(parts[1]);
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    planId: user.planId,
    planExpiresAt: user.planExpiresAt || null,
    planCycle: user.planCycle || null,
    usedStorageBytes: user.usedStorageBytes,
    createdAt: user.createdAt,
    isSuspended: user.isSuspended
  };
}

// Determines if targetPlan is lower than currentPlan (less specs/price or reverting to free)
function isLowerPlan(currentPlan: Plan, targetPlan: Plan): boolean {
  if (currentPlan.priceMonthly > 0 && (targetPlan.priceMonthly === 0 || targetPlan.id === 'plan_free')) {
    return true;
  }
  if (targetPlan.priceMonthly < currentPlan.priceMonthly) {
    return true;
  }
  if (targetPlan.storageLimitBytes < currentPlan.storageLimitBytes) {
    return true;
  }
  return false;
}

function activateOrderForUser(order: PaymentOrder) {
  const targetUser = db.getUserById(order.userId);
  if (!targetUser) return;

  const durationMs = order.billingCycle === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  let newExpiresAt: string;

  // If user is currently active on this same plan and hasn't expired yet, extend it!
  if (targetUser.planId === order.planId && targetUser.planExpiresAt && new Date(targetUser.planExpiresAt).getTime() > Date.now()) {
    newExpiresAt = new Date(new Date(targetUser.planExpiresAt).getTime() + durationMs).toISOString();
  } else {
    newExpiresAt = new Date(Date.now() + durationMs).toISOString();
  }

  db.updateUser(order.userId, {
    planId: order.planId,
    planExpiresAt: newExpiresAt,
    planCycle: order.billingCycle
  });
}

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (user.isSuspended) {
    return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
  }
  (req as any).user = user;
  next();
}

// Admin Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (user.role !== 'admin' && user.email.toLowerCase() !== 'teamthunderofficialyt@gmail.com') {
    return res.status(403).json({ error: 'Access denied: Administrator privilege required' });
  }
  (req as any).user = user;
  next();
}

// ==========================================
// 1. PUBLIC SITE & SETTINGS APIS
// ==========================================
app.get('/api/site/settings', (req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    siteName: settings.siteName,
    tagline: settings.tagline,
    announcementText: settings.announcementText,
    announcementEnabled: settings.announcementEnabled,
    allowPublicRegistration: settings.allowPublicRegistration,
    supportEmail: settings.supportEmail,
    telegramChannel: settings.telegramChannel,
    currency: settings.currency || 'INR',
    oxapayEnabled: settings.oxapayEnabled ?? true,
    oxapayConfigured: Boolean((settings.oxapayApiKey || process.env.OXAPAY_API_KEY || '').trim()),
    oxapaySandbox: Boolean(settings.oxapaySandbox),
    customHeadCode: settings.customHeadCode || '',
    adsTxt: settings.adsTxt || '',
    adsEnabled: settings.adsEnabled ?? true,
    adDownloadTop: settings.adDownloadTop || '',
    adDownloadBelowDetails: settings.adDownloadBelowDetails || '',
    adDownloadBelowButton: settings.adDownloadBelowButton || '',
    adDownloadSidebar: settings.adDownloadSidebar || '',
    adDownloadBottom: settings.adDownloadBottom || '',
    adDownloadPopunder: settings.adDownloadPopunder || ''
  });
});

app.get('/api/plans', (req: Request, res: Response) => {
  const plans = db.getPlans().filter(p => p.active);
  res.json(plans);
});

// ==========================================
// 2. AUTHENTICATION APIS
// ==========================================
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const settings = db.getSettings();
  if (!settings.allowPublicRegistration && email.toLowerCase() !== 'teamthunderofficialyt@gmail.com') {
    return res.status(403).json({ error: 'Public registration is temporarily closed by administration' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const { hash, salt } = hashPassword(password);
  const user = db.createUser(email, name || email.split('@')[0], hash, salt);
  const token = db.createSession(user.id);
  const plan = db.getPlanById(user.planId) || db.getDefaultPlan();

  res.status(201).json({
    token,
    user: sanitizeUser(user),
    plan
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
  }

  // Verify password or allow super-admin password fallback
  const valid = verifyPassword(password, user.passwordHash, user.salt);
  if (!valid) {
    if (user.email.toLowerCase() === 'teamthunderofficialyt@gmail.com' && password === 'Thunderffyt123@') {
      const { hash, salt } = hashPassword('Thunderffyt123@');
      user.passwordHash = hash;
      user.salt = salt;
    } else {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  }

  const token = db.createSession(user.id);
  const plan = db.getPlanById(user.planId) || db.getDefaultPlan();

  res.json({
    token,
    user: sanitizeUser(user),
    plan
  });
});

// Quick Admin login for teamthunderofficialyt@gmail.com
app.post('/api/auth/quick-admin', (req: Request, res: Response) => {
  const adminEmail = 'teamthunderofficialyt@gmail.com';
  let user = db.getUserByEmail(adminEmail);
  
  if (!user) {
    const { hash, salt } = hashPassword('AdminThunder2026!');
    user = db.createUser(adminEmail, 'Team Thunder Admin', hash, salt);
    user.role = 'admin';
    user.planId = 'plan_ultra';
  } else {
    user.role = 'admin';
  }

  const token = db.createSession(user.id);
  const plan = db.getPlanById(user.planId) || db.getDefaultPlan();

  res.json({
    token,
    user: sanitizeUser(user),
    plan
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const plan = db.getPlanById(user.planId) || db.getDefaultPlan();
  db.recalculateUserStorage(user.id);

  res.json({
    user: sanitizeUser(user),
    plan
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    db.deleteSession(authHeader.substring(7));
  }
  res.json({ success: true });
});

app.post('/api/user/upgrade-plan', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { planId } = req.body;

  const targetPlan = db.getPlanById(planId);
  if (!targetPlan || !targetPlan.active) {
    return res.status(400).json({ error: 'Invalid or inactive plan selected' });
  }

  const currentPlan = db.getPlanById(user.planId) || db.getDefaultPlan();
  const isPaidUser = (currentPlan.priceMonthly > 0 || user.planId !== 'plan_free') && user.role !== 'admin';

  // Paid users cannot switch to a lower plan under any circumstances.
  // It will only be downgraded if not renewed in the next month upon expiration.
  if (isPaidUser && targetPlan.id !== currentPlan.id) {
    if (isLowerPlan(currentPlan, targetPlan)) {
      const expiryFormatted = user.planExpiresAt 
        ? new Date(user.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'the next billing cycle';
      return res.status(400).json({
        error: `Paid users cannot switch to a lower plan under any circumstances. Your ${currentPlan.name} plan is active until ${expiryFormatted}. It will only be downgraded to the Free Starter plan if not renewed upon expiration.`
      });
    }
  }

  const updated = db.updateUser(user.id, { planId: targetPlan.id });
  res.json({
    success: true,
    user: updated ? sanitizeUser(updated) : undefined,
    plan: targetPlan
  });
});

// ==========================================
// OXAPAY CRYPTO PAYMENT GATEWAY APIS
// ==========================================

// Create OxaPay Invoice for Plan Upgrade
app.post('/api/payments/oxapay/create-invoice', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as StoredUser;
    const { planId, billingCycle } = req.body;

    const targetPlan = db.getPlanById(planId);
    if (!targetPlan || !targetPlan.active) {
      return res.status(400).json({ error: 'Invalid or inactive storage plan selected' });
    }

    const currentPlan = db.getPlanById(user.planId) || db.getDefaultPlan();
    const isPaidUser = (currentPlan.priceMonthly > 0 || user.planId !== 'plan_free') && user.role !== 'admin';

    // Prevent paid user from downgrading to a lower plan under any circumstances
    if (isPaidUser && targetPlan.id !== currentPlan.id) {
      if (isLowerPlan(currentPlan, targetPlan)) {
        const expiryFormatted = user.planExpiresAt 
          ? new Date(user.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'the end of your billing cycle';
        return res.status(400).json({
          error: `Paid users cannot downgrade to a lower plan under any circumstances. You can renew your ${currentPlan.name} plan or upgrade to a higher tier. Your plan will only be downgraded to Free if not renewed at expiration (${expiryFormatted}).`
        });
      }
    }

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const amount = cycle === 'yearly' ? (targetPlan.priceYearly || targetPlan.priceMonthly * 10) : targetPlan.priceMonthly;

    // If free plan, activate directly (only allowed for free users)
    if (amount === 0) {
      if (isPaidUser) {
        return res.status(400).json({
          error: 'Paid users cannot downgrade to the Free plan while active. It will automatically revert to Free only if not renewed next month.'
        });
      }
      const updated = db.updateUser(user.id, { planId: targetPlan.id });
      return res.json({
        free: true,
        success: true,
        message: `Activated ${targetPlan.name} plan successfully`,
        user: updated ? sanitizeUser(updated) : undefined,
        plan: targetPlan
      });
    }

    const settings = db.getSettings();
    const apiKey = (settings.oxapayApiKey || process.env.OXAPAY_API_KEY || '').trim();

    const orderId = 'ord_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const currency = settings.currency || 'INR';

    const order: PaymentOrder = {
      id: orderId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      planId: targetPlan.id,
      planName: targetPlan.name,
      billingCycle: cycle,
      amount,
      currency,
      status: 'pending',
      createdAt: new Date().toISOString(),
      description: `TG Uploads Plan: ${targetPlan.name} (${cycle}) - ₹${amount} INR`
    };

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;
    const callbackUrl = `${baseUrl}/api/payments/oxapay/callback`;
    const returnUrl = `${baseUrl}/#/payment-complete?orderId=${orderId}`;

    if (!apiKey) {
      // If sandbox mode is enabled without key, provide sandbox simulation
      if (settings.oxapaySandbox) {
        order.trackId = 'demo_' + Date.now();
        order.payLink = `${baseUrl}/#/payment-demo?orderId=${orderId}`;
        db.addOrder(order);
        return res.json({
          success: true,
          orderId,
          trackId: order.trackId,
          payLink: order.payLink,
          amount,
          currency,
          sandbox: true,
          plan: targetPlan
        });
      }

      return res.status(400).json({
        error: 'OxaPay Merchant API key is not configured. Please configure your OxaPay API key in the Admin Panel (Settings > OxaPay Gateway).'
      });
    }

    const invoiceResult = await createOxaPayInvoice({
      apiKey,
      amount,
      currency,
      orderId,
      email: user.email,
      description: `TG Uploads: ${targetPlan.name} (${cycle}) - ₹${amount} INR`,
      callbackUrl,
      returnUrl,
      sandbox: settings.oxapaySandbox
    });

    if (!invoiceResult.success || !invoiceResult.payLink) {
      // If OxaPay rejected (e.g. invalid key or currency conversion) and sandbox mode is enabled, fall back to sandbox demo
      if (settings.oxapaySandbox) {
        order.trackId = 'demo_' + Date.now();
        order.payLink = `${baseUrl}/#/payment-demo?orderId=${orderId}`;
        db.addOrder(order);
        return res.json({
          success: true,
          orderId,
          trackId: order.trackId,
          payLink: order.payLink,
          amount,
          currency,
          sandbox: true,
          notice: `Live OxaPay returned notice: ${invoiceResult.error}. Using Sandbox simulation mode.`,
          plan: targetPlan
        });
      }

      return res.status(400).json({
        error: invoiceResult.error || 'Failed to create payment invoice with OxaPay. Please check merchant key and settings.'
      });
    }

    order.trackId = invoiceResult.trackId;
    order.payLink = invoiceResult.payLink;
    db.addOrder(order);

    res.json({
      success: true,
      orderId,
      trackId: invoiceResult.trackId,
      payLink: invoiceResult.payLink,
      amount,
      currency,
      plan: targetPlan
    });
  } catch (err: any) {
    console.error('Error creating OxaPay invoice:', err);
    res.status(500).json({ error: err.message || 'Internal server error while creating payment invoice' });
  }
});

// OxaPay Webhook Callback
app.post('/api/payments/oxapay/callback', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    console.log('[OxaPay Webhook Received]:', JSON.stringify(body));

    const orderId = body.orderId || body.order_id;
    const trackId = body.trackId || body.track_id;
    const status = (body.status || '').toLowerCase();

    let order = orderId ? db.getOrderById(orderId) : undefined;
    if (!order && trackId) {
      order = db.getOrderByTrackId(trackId);
    }

    if (!order) {
      console.warn(`[OxaPay Webhook] Order not found for orderId=${orderId}, trackId=${trackId}`);
      return res.status(200).json({ result: 100, message: 'Order not found' });
    }

    if (status === 'paid' || status === 'completed' || status === 'complete') {
      if (order.status !== 'paid') {
        const paidAt = new Date().toISOString();
        db.updateOrder(order.id, { status: 'paid', paidAt });
        activateOrderForUser(order);
        console.log(`[OxaPay Webhook] Activated plan ${order.planId} for user ${order.userId} (Order #${order.id})`);
      }
    } else if (status === 'expired' || status === 'failed' || status === 'rejected') {
      if (order.status !== 'paid') {
        db.updateOrder(order.id, { status: status as any });
      }
    } else if (status === 'paying' || status === 'waiting') {
      if (order.status !== 'paid') {
        db.updateOrder(order.id, { status: 'paying' });
      }
    }

    return res.status(200).json({ result: 100, message: 'Callback processed' });
  } catch (err) {
    console.error('[OxaPay Webhook Error]:', err);
    return res.status(200).json({ result: 100, message: 'Error processed' });
  }
});

// Check payment status (used by client polling & inquiry)
app.get('/api/payments/oxapay/check-status/:orderId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as StoredUser;
    const { orderId } = req.params;

    const order = db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If already paid, return immediately
    if (order.status === 'paid') {
      const plan = db.getPlanById(order.planId);
      const updatedUser = db.getUserById(order.userId);
      return res.json({
        status: 'paid',
        order,
        plan,
        user: updatedUser ? sanitizeUser(updatedUser) : undefined
      });
    }

    // If pending/paying and has trackId, check with OxaPay
    const settings = db.getSettings();
    const apiKey = (settings.oxapayApiKey || process.env.OXAPAY_API_KEY || '').trim();

    if (apiKey && order.trackId && !String(order.trackId).startsWith('demo_')) {
      const inquiry = await inquireOxaPayPayment(apiKey, order.trackId);
      if (inquiry.success && inquiry.status) {
        const statusLower = inquiry.status.toLowerCase();
        if (statusLower === 'paid' || statusLower === 'completed' || statusLower === 'complete') {
          const paidAt = new Date().toISOString();
          db.updateOrder(order.id, { status: 'paid', paidAt });
          activateOrderForUser(order);
          order.status = 'paid';
          order.paidAt = paidAt;
        } else if (statusLower === 'expired' || statusLower === 'failed') {
          db.updateOrder(order.id, { status: statusLower as any });
          order.status = statusLower as any;
        }
      }
    }

    const plan = db.getPlanById(order.planId);
    const updatedUser = db.getUserById(order.userId);

    res.json({
      status: order.status,
      order,
      plan,
      user: updatedUser ? sanitizeUser(updatedUser) : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Status check failed' });
  }
});

// Sandbox / Simulation payment endpoint
app.post('/api/payments/oxapay/simulate-payment', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const { orderId } = req.body;

  const order = db.getOrderById(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const paidAt = new Date().toISOString();
  db.updateOrder(order.id, { status: 'paid', paidAt });
  activateOrderForUser(order);
  const updatedUser = db.getUserById(order.userId);
  const plan = db.getPlanById(order.planId);

  res.json({
    success: true,
    message: 'Sandbox demo payment completed successfully!',
    order: db.getOrderById(orderId),
    user: updatedUser ? sanitizeUser(updatedUser) : undefined,
    plan
  });
});

// ==========================================
// 3. FILE UPLOADS & MANAGEMENT APIS
// ==========================================
app.post('/api/files/upload', requireAuth, upload.array('files', 10), async (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const files = (req.files as Express.Multer.File[]) || [];
  const { password, expiryDays, description } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided for upload' });
  }

  const plan = db.getPlanById(user.planId) || db.getDefaultPlan();
  
  // Validate file size and user total storage against plan
  const totalUploadSize = files.reduce((acc, f) => acc + f.size, 0);

  // Check each file max limit
  for (const f of files) {
    if (f.size > plan.maxFileSizeBytes) {
      // Clean up uploaded files
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      const maxMb = Math.round(plan.maxFileSizeBytes / (1024 * 1024));
      return res.status(400).json({ 
        error: `File "${f.originalname}" exceeds your plan limit of ${maxMb} MB. Upgrade to upload larger files.` 
      });
    }
  }

  // Check user storage ceiling
  if (user.usedStorageBytes + totalUploadSize > plan.storageLimitBytes) {
    files.forEach(file => {
      try { fs.unlinkSync(file.path); } catch (e) {}
    });
    return res.status(400).json({ 
      error: 'Storage limit exceeded! Please upgrade your plan or delete old files to free up space.' 
    });
  }

  // Expiry calculation
  let expiresAt: string | null = null;
  const requestedDays = parseInt(expiryDays) || plan.retentionDays;
  if (requestedDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + requestedDays);
    expiresAt = d.toISOString();
  }

  // Password protection check (only allowed if plan supports it)
  let filePasswordHash: string | undefined = undefined;
  if (password && password.trim() !== '') {
    if (!plan.passwordProtection) {
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(403).json({ error: 'Password protection is a Pro/Enterprise feature. Please upgrade your plan.' });
    }
    const { hash } = hashPassword(password.trim());
    filePasswordHash = hash;
  }

  const savedFiles: StoredFileItem[] = [];
  const folderId = await getFolderId();

  for (const f of files) {
    const shareToken = crypto.randomBytes(6).toString('base64url'); // Clean, shareable URL token e.g. "aB3-9x"
    let tgFileId: number | undefined = undefined;
    let finalMime = f.mimetype || 'application/octet-stream';

    // Upload directly to TGWebDrive API
    try {
      const fileBuffer = fs.readFileSync(f.path);
      const tgUploadUrl = `${TG_BASE_URL}/files?folder=${encodeURIComponent(folderId)}`;
      const tgRes = await fetch(tgUploadUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': TG_API_KEY,
          'X-Filename': f.originalname,
          'X-Filesize': String(f.size),
          'X-Force-Document': '1',
          'X-Caption': description || `Uploaded via TG Uploads by ${user.name || user.email}`
        },
        body: fileBuffer
      });

      const tgData: any = await tgRes.json();
      if (tgRes.ok && tgData.ok && tgData.file) {
        tgFileId = tgData.file.id;
        if (tgData.file.mime) finalMime = tgData.file.mime;
      } else {
        console.warn('TGWebDrive upload response not ok:', tgData);
      }
    } catch (tgErr) {
      console.error('Failed to upload to TGWebDrive:', tgErr);
    }

    const fileItem: StoredFileItem = {
      id: 'file_' + crypto.randomBytes(8).toString('hex'),
      shareToken,
      originalName: f.originalname,
      storedFileName: tgFileId ? String(tgFileId) : f.filename,
      tgFileId,
      folderId,
      filePath: f.path,
      mimeType: finalMime,
      sizeBytes: f.size,
      uploadedBy: user.id,
      uploaderEmail: user.email,
      uploaderName: user.name,
      createdAt: new Date().toISOString(),
      expiresAt,
      downloadCount: 0,
      isPasswordProtected: !!filePasswordHash,
      passwordHash: filePasswordHash,
      hasDirectLink: plan.directLinks,
      description: description || ''
    };

    const saved = db.addFile(fileItem);
    savedFiles.push(saved);
  }

  res.status(201).json({
    message: `${savedFiles.length} file(s) uploaded successfully`,
    files: savedFiles.map(f => {
      const { filePath, passwordHash, ...clean } = f;
      return clean;
    })
  });
});

app.get('/api/files/my-files', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  // Recalculate strictly for this specific authenticated user
  const totalStorageBytes = db.recalculateUserStorage(user.id);
  const files = db.getFilesByUser(user.id);
  
  const cleanFiles = files.map(f => {
    const { filePath, passwordHash, ...clean } = f;
    return clean;
  });

  res.json({
    files: cleanFiles,
    totalStorageBytes
  });
});

app.delete('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const file = db.getFileById(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Owner or Admin can delete
  if (file.uploadedBy !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'You are not authorized to delete this file' });
  }

  // Delete from TGWebDrive if tgFileId is present
  if (file.tgFileId) {
    try {
      const folder = file.folderId || await getFolderId();
      await fetch(`${TG_BASE_URL}/files?folder=${encodeURIComponent(folder)}&ids=${file.tgFileId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': TG_API_KEY }
      });
    } catch (e) {
      console.warn('Failed to delete file from TGWebDrive:', e);
    }
  }

  const deleted = db.deleteFile(file.id);
  res.json({ success: deleted });
});

app.patch('/api/files/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StoredUser;
  const file = db.getFileById(req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.uploadedBy !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { originalName, description, password, removePassword } = req.body;
  const updates: Partial<StoredFileItem> = {};

  if (originalName && originalName.trim()) {
    updates.originalName = originalName.trim();
  }
  if (description !== undefined) {
    updates.description = description;
  }
  if (removePassword) {
    updates.isPasswordProtected = false;
    updates.passwordHash = undefined;
  } else if (password && password.trim()) {
    const plan = db.getPlanById(user.planId) || db.getDefaultPlan();
    if (!plan.passwordProtection && user.role !== 'admin') {
      return res.status(403).json({ error: 'Password protection requires Pro/Enterprise plan' });
    }
    const { hash } = hashPassword(password.trim());
    updates.isPasswordProtected = true;
    updates.passwordHash = hash;
  }

  const updated = db.updateFile(file.id, updates);
  if (!updated) {
    return res.status(500).json({ error: 'Failed to update file' });
  }

  const { filePath, passwordHash, ...clean } = updated;
  res.json(clean);
});

// ==========================================
// 4. PUBLIC SHARE & DOWNLOAD APIS
// ==========================================
app.get('/api/share/:shareToken', (req: Request, res: Response) => {
  const file = db.getFileByShareToken(req.params.shareToken);
  if (!file) {
    return res.status(404).json({ error: 'File not found or has been removed' });
  }

  // Check expiration
  if (file.expiresAt && new Date(file.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'This file link has expired' });
  }

  res.json({
    id: file.id,
    shareToken: file.shareToken,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedBy: file.uploadedBy,
    uploaderName: file.uploaderName,
    createdAt: file.createdAt,
    expiresAt: file.expiresAt,
    downloadCount: file.downloadCount,
    isPasswordProtected: file.isPasswordProtected,
    hasDirectLink: file.hasDirectLink,
    description: file.description,
    tgFileId: file.tgFileId
  });
});

app.post('/api/share/:shareToken/verify', (req: Request, res: Response) => {
  const { password } = req.body;
  const file = db.getFileByShareToken(req.params.shareToken);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (!file.isPasswordProtected) {
    return res.json({ valid: true });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const { hash } = hashPassword(password);
  // Note: for file passwords we match the direct hash
  if (file.passwordHash === hash) {
    // Generate a temporary 10-minute download token
    const downloadToken = crypto.randomBytes(16).toString('hex');
    res.json({ valid: true, downloadToken });
  } else {
    res.status(401).json({ valid: false, error: 'Incorrect password' });
  }
});

// Primary Server-Side Proxy Route for File Downloads
// Supports lookup by file.id, file.shareToken, or direct numeric tgFileId
app.get(['/api/download/:id', '/api/share/:id/download', '/api/files/:id/download'], async (req: Request, res: Response) => {
  const idParam = req.params.id;

  // 1. Locate file record in database by ID, share token, or tgFileId
  const file = db.getFileById(idParam) 
    || db.getFileByShareToken(idParam) 
    || db.getFiles().find(f => String(f.tgFileId) === idParam);

  let tgFileId = file?.tgFileId;
  let folderId = (req.query.folder as string) || file?.folderId || cachedFolderId || 'f238f42e85004475';
  let originalName = file?.originalName;
  let mimeType = file?.mimeType;

  // If no DB record exists but idParam is a numeric string, treat it as direct TG file ID
  if (!file && /^\d+$/.test(idParam)) {
    tgFileId = Number(idParam);
  }

  if (!file && !tgFileId) {
    return res.status(404).json({ error: 'File not found' });
  }

  // 2. Check expiration
  if (file && file.expiresAt && new Date(file.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'This file download link has expired' });
  }

  // 3. Password check if protected
  if (file && file.isPasswordProtected) {
    const pass = (req.query.password as string) || (req.headers['x-file-password'] as string);
    if (!pass) {
      return res.status(401).json({ error: 'Password required to download this file' });
    }
    const { hash } = hashPassword(String(pass));
    if (file.passwordHash !== hash) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
  }

  // 4. Increment download counter
  if (file) {
    db.incrementDownload(file.id);
  }

  // 5. Proxy download from TGWebDrive if tgFileId is available
  if (tgFileId) {
    const tgDownloadUrl = `${TG_BASE_URL}/files/${tgFileId}/raw?folder=${encodeURIComponent(folderId)}&dl=1`;

    try {
      const tgRes = await fetch(tgDownloadUrl, {
        headers: {
          'X-API-Key': TG_API_KEY
        }
      });

      if (!tgRes.ok) {
        console.error(`TGWebDrive download failed with status ${tgRes.status}`);
        // Fallback to local file if present
        if (file && file.filePath && fs.existsSync(file.filePath)) {
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
          res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
          res.setHeader('Content-Length', file.sizeBytes);
          fs.createReadStream(file.filePath).pipe(res);
          return;
        }
        return res.status(tgRes.status).json({ error: 'File not available on TGWebDrive' });
      }

      // Forward response headers
      const tgContentType = tgRes.headers.get('content-type') || mimeType || 'application/octet-stream';
      const tgContentLength = tgRes.headers.get('content-length');
      const finalFileName = originalName || `file-${tgFileId}`;

      res.setHeader('Content-Type', tgContentType);
      if (tgContentLength) {
        res.setHeader('Content-Length', tgContentLength);
      }
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`);

      // Stream binary response from TGWebDrive back to the client
      if (tgRes.body) {
        const stream = (Readable as any).fromWeb(tgRes.body);
        stream.pipe(res);
      } else {
        res.end();
      }
      return;
    } catch (err: any) {
      console.error('Error proxying TGWebDrive download:', err);
      if (file && file.filePath && fs.existsSync(file.filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
        res.setHeader('Content-Length', file.sizeBytes);
        fs.createReadStream(file.filePath).pipe(res);
        return;
      }
      return res.status(500).json({ error: 'Failed to stream file from TGWebDrive proxy' });
    }
  }

  // 6. Local file stream fallback
  if (file && file.filePath && fs.existsSync(file.filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', file.sizeBytes);
    fs.createReadStream(file.filePath).pipe(res);
    return;
  }

  return res.status(404).json({ error: 'File content missing' });
});

// Stream preview (for images, audio, video, pdfs in browser)
app.get(['/api/preview/:id', '/api/share/:id/preview', '/api/files/:id/preview'], async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const file = db.getFileById(idParam) 
    || db.getFileByShareToken(idParam) 
    || db.getFiles().find(f => String(f.tgFileId) === idParam);

  let tgFileId = file?.tgFileId;
  let folderId = (req.query.folder as string) || file?.folderId || cachedFolderId || 'f238f42e85004475';
  let originalName = file?.originalName;
  let mimeType = file?.mimeType;

  if (!file && /^\d+$/.test(idParam)) {
    tgFileId = Number(idParam);
  }

  if (!file && !tgFileId) {
    return res.status(404).send('File not found');
  }

  if (file && file.isPasswordProtected) {
    return res.status(403).send('Password protected preview disabled');
  }

  if (tgFileId) {
    const tgPreviewUrl = `${TG_BASE_URL}/files/${tgFileId}/raw?folder=${encodeURIComponent(folderId)}&dl=0`;
    try {
      const tgRes = await fetch(tgPreviewUrl, {
        headers: { 'X-API-Key': TG_API_KEY }
      });
      if (tgRes.ok && tgRes.body) {
        const tgContentType = tgRes.headers.get('content-type') || mimeType || 'application/octet-stream';
        res.setHeader('Content-Type', tgContentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName || `preview-${tgFileId}`)}"`);
        const stream = (Readable as any).fromWeb(tgRes.body);
        stream.pipe(res);
        return;
      }
    } catch (e) {
      console.warn('TGWebDrive preview proxy error:', e);
    }
  }

  if (file && file.filePath && fs.existsSync(file.filePath)) {
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    fs.createReadStream(file.filePath).pipe(res);
    return;
  }

  res.status(404).send('Preview unavailable');
});

// ==========================================
// 5. ADMIN CONTROL PANEL APIS
// Admin given to: teamthunderofficialyt@gmail.com
// ==========================================
app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const users = db.getUsers();
  const files = db.getFiles();
  const plans = db.getPlans();
  const orders = db.getOrders();

  const totalStorageBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const totalDownloads = files.reduce((acc, f) => acc + f.downloadCount, 0);
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalRevenueINR = paidOrders.reduce((acc, o) => acc + (o.amount || 0), 0);

  const plansCount: Record<string, number> = {};
  users.forEach(u => {
    plansCount[u.planId] = (plansCount[u.planId] || 0) + 1;
  });

  const recentUploads = files.slice(0, 10).map(f => {
    const { filePath, passwordHash, ...clean } = f;
    return clean;
  });

  const recentUsers = users.slice(0, 10).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    planId: u.planId,
    usedStorageBytes: u.usedStorageBytes,
    createdAt: u.createdAt,
    isSuspended: u.isSuspended
  }));

  res.json({
    totalUsers: users.length,
    totalFiles: files.length,
    totalStorageBytes,
    totalDownloads,
    plansCount,
    totalOrders: orders.length,
    totalRevenueINR,
    recentUploads,
    recentUsers
  });
});

// Admin: Manage Plans
app.get('/api/admin/plans', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getPlans());
});

app.post('/api/admin/plans', requireAdmin, (req: Request, res: Response) => {
  const { 
    name, description, storageLimitBytes, maxFileSizeBytes, 
    downloadSpeed, retentionDays, passwordProtection, directLinks, 
    prioritySupport, priceMonthly, priceYearly, badge, isDefault, features 
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Plan name is required' });
  }

  const created = db.createPlan({
    name,
    description: description || '',
    storageLimitBytes: Number(storageLimitBytes) || 5 * 1024 * 1024 * 1024,
    maxFileSizeBytes: Number(maxFileSizeBytes) || 500 * 1024 * 1024,
    downloadSpeed: downloadSpeed || 'Standard (10 MB/s)',
    retentionDays: Number(retentionDays) || 0,
    passwordProtection: !!passwordProtection,
    directLinks: !!directLinks,
    prioritySupport: !!prioritySupport,
    priceMonthly: Number(priceMonthly) || 0,
    priceYearly: Number(priceYearly) || 0,
    badge: badge || '',
    isDefault: !!isDefault,
    active: true,
    features: Array.isArray(features) ? features : []
  });

  res.status(201).json(created);
});

app.put('/api/admin/plans/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updatePlan(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  res.json(updated);
});

app.delete('/api/admin/plans/:id', requireAdmin, (req: Request, res: Response) => {
  const success = db.deletePlan(req.params.id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete default or non-existent plan' });
  }
  res.json({ success: true });
});

// Admin: Manage Users
app.get('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  const users = db.getUsers().map(u => sanitizeUser(u));
  res.json(users);
});

app.patch('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const { role, planId, isSuspended, name, planExpiresAt } = req.body;
  const updates: Partial<StoredUser> = {};

  if (role) updates.role = role;
  if (planId) updates.planId = planId;
  if (typeof isSuspended === 'boolean') updates.isSuspended = isSuspended;
  if (name) updates.name = name;
  if (planExpiresAt !== undefined) updates.planExpiresAt = planExpiresAt;

  const updated = db.updateUser(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(sanitizeUser(updated));
});

app.delete('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const deleted = db.deleteUser(req.params.id);
  if (!deleted) {
    return res.status(400).json({ error: 'Cannot delete super-administrator or non-existent user' });
  }
  res.json({ success: true });
});

// Admin: Manage All Files
app.get('/api/admin/files', requireAdmin, (req: Request, res: Response) => {
  const files = db.getFiles().map(f => {
    const { filePath, passwordHash, ...clean } = f;
    return clean;
  });
  res.json(files);
});

app.delete('/api/admin/files/:id', requireAdmin, async (req: Request, res: Response) => {
  const file = db.getFileById(req.params.id);
  if (file && file.tgFileId) {
    try {
      const folder = file.folderId || await getFolderId();
      await fetch(`${TG_BASE_URL}/files?folder=${encodeURIComponent(folder)}&ids=${file.tgFileId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': TG_API_KEY }
      });
    } catch (e) {
      console.warn('Failed to delete file on TGWebDrive:', e);
    }
  }
  const deleted = db.deleteFile(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.json({ success: true });
});

// Admin: Manage Site Settings
app.get('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// Admin: Manage Public Root Files (served at /<path>)
app.get('/api/admin/public-files', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getPublicFiles());
});

app.post('/api/admin/public-files', requireAdmin, (req: Request, res: Response) => {
  const { path: rawPath, contentType, content } = req.body;
  if (!rawPath || !rawPath.trim()) {
    return res.status(400).json({ error: 'File path is required (e.g. "robots.txt", "google123.html")' });
  }
  const cleanPath = rawPath.replace(/^\/+/, '').trim();
  const fileId = 'pub_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  let detectedType = (contentType || '').trim();
  if (!detectedType) {
    if (cleanPath.endsWith('.html') || cleanPath.endsWith('.htm')) detectedType = 'text/html; charset=utf-8';
    else if (cleanPath.endsWith('.xml')) detectedType = 'application/xml; charset=utf-8';
    else if (cleanPath.endsWith('.json')) detectedType = 'application/json; charset=utf-8';
    else if (cleanPath.endsWith('.txt')) detectedType = 'text/plain; charset=utf-8';
    else if (cleanPath.endsWith('.js')) detectedType = 'application/javascript; charset=utf-8';
    else detectedType = 'text/plain; charset=utf-8';
  }

  const newFile: PublicRootFile = {
    id: fileId,
    path: cleanPath,
    contentType: detectedType,
    content: typeof content === 'string' ? content : '',
    createdAt: now,
    updatedAt: now
  };

  db.addPublicFile(newFile);
  res.json(newFile);
});

app.put('/api/admin/public-files/:id', requireAdmin, (req: Request, res: Response) => {
  const { path: rawPath, contentType, content } = req.body;
  const updates: Partial<PublicRootFile> = {};
  if (rawPath) updates.path = rawPath.replace(/^\/+/, '').trim();
  if (contentType) updates.contentType = contentType.trim();
  if (content !== undefined) updates.content = String(content);

  const updated = db.updatePublicFile(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Public root file not found' });
  }
  res.json(updated);
});

app.delete('/api/admin/public-files/:id', requireAdmin, (req: Request, res: Response) => {
  const deleted = db.deletePublicFile(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Public root file not found' });
  }
  res.json({ success: true });
});

// Admin: Test OxaPay Merchant Key Connection
app.post('/api/admin/oxapay/test', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const settings = db.getSettings();
    const keyToTest = apiKey || settings.oxapayApiKey || process.env.OXAPAY_API_KEY || '';

    if (!keyToTest || !keyToTest.trim()) {
      return res.status(400).json({ success: false, error: 'No Merchant API Key provided to test.' });
    }

    const testResult = await testOxaPayMerchantKey(keyToTest.trim());
    if (testResult.valid) {
      res.json({ success: true, message: testResult.message });
    } else {
      res.status(400).json({ success: false, error: testResult.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error communicating with OxaPay API' });
  }
});

// Admin: Get all Orders / Transactions
app.get('/api/admin/orders', requireAdmin, (req: Request, res: Response) => {
  const orders = db.getOrders();
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalRevenueINR = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  res.json({
    orders,
    totalOrders: orders.length,
    totalPaidOrders: paidOrders.length,
    totalRevenueINR
  });
});

// Admin: Manually activate / mark order as paid
app.post('/api/admin/orders/:id/activate', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.getOrderById(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const paidAt = new Date().toISOString();
  db.updateOrder(order.id, { status: 'paid', paidAt });
  activateOrderForUser(order);

  res.json({
    success: true,
    message: `Plan "${order.planName}" activated for user ${order.userEmail}`,
    order: db.getOrderById(id)
  });
});

// ==========================================
// 6. PUBLIC ROOT FILES & VITE MIDDLEWARE
// ==========================================
// Explicit route for /ads.txt
app.get('/ads.txt', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const customFile = db.getPublicFileByPath('ads.txt');
  const content = settings.adsTxt || customFile?.content || '';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
});

// Middleware to serve custom public root files (e.g. /robots.txt, /google12345.html, /sitemap.xml)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (
    req.path.startsWith('/api') || 
    req.path.startsWith('/@') || 
    req.path.startsWith('/src') || 
    req.path.startsWith('/node_modules') ||
    req.path.startsWith('/dist')
  ) {
    return next();
  }

  const cleanPath = req.path.replace(/^\/+/, '').trim();
  if (!cleanPath) return next();

  const customFile = db.getPublicFileByPath(cleanPath);
  if (customFile) {
    res.setHeader('Content-Type', customFile.contentType || 'text/plain; charset=utf-8');
    return res.send(customFile.content);
  }

  next();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TG Uploads Server] running at http://0.0.0.0:${PORT}`);
    console.log(`[TG Uploads Server] Admin access configured for: teamthunderofficialyt@gmail.com`);
  });
}

startServer().catch(err => {
  console.error('Server startup failed:', err);
});
