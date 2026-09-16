import { User, Plan, FileItem, SiteSettings, AdminStats, PaymentOrder, PublicRootFile } from '../types.js';

const TOKEN_KEY = 'tg_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Public
  getSettings: () => request<SiteSettings>('/api/site/settings'),
  getPlans: () => request<Plan[]>('/api/plans'),
  
  // Auth
  register: (body: { email: string; name?: string; password: string }) =>
    request<{ token: string; user: User; plan: Plan }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User; plan: Plan }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  quickAdminLogin: () =>
    request<{ token: string; user: User; plan: Plan }>('/api/auth/quick-admin', {
      method: 'POST'
    }),

  getMe: () => request<{ user: User; plan: Plan }>('/api/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST'
    }),

  upgradePlan: (planId: string) =>
    request<{ success: boolean; user: User; plan: Plan }>('/api/user/upgrade-plan', {
      method: 'POST',
      body: JSON.stringify({ planId })
    }),

  // OxaPay Payments
  createOxaPayInvoice: (planId: string, billingCycle: 'monthly' | 'yearly') =>
    request<{
      success: boolean;
      free?: boolean;
      orderId?: string;
      trackId?: string | number;
      payLink?: string;
      amount?: number;
      currency?: string;
      sandbox?: boolean;
      notice?: string;
      user?: User;
      plan?: Plan;
      message?: string;
    }>('/api/payments/oxapay/create-invoice', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle })
    }),

  checkPaymentStatus: (orderId: string) =>
    request<{
      status: 'pending' | 'paying' | 'paid' | 'expired' | 'failed';
      order: PaymentOrder;
      plan?: Plan;
      user?: User;
    }>(`/api/payments/oxapay/check-status/${orderId}`),

  simulatePayment: (orderId: string) =>
    request<{
      success: boolean;
      message: string;
      order: PaymentOrder;
      user?: User;
      plan?: Plan;
    }>('/api/payments/oxapay/simulate-payment', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    }),

  // Files
  uploadFiles: (formData: FormData) =>
    request<{ message: string; files: FileItem[] }>('/api/files/upload', {
      method: 'POST',
      body: formData
    }),

  uploadFilesWithProgress: (
    formData: FormData,
    onProgress?: (progress: {
      loadedBytes: number;
      totalBytes: number;
      percent: number;
      loadedMB: string;
      totalMB: string;
      speedBytesPerSec: number;
    }) => void
  ): Promise<{ message: string; files: FileItem[] }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = getStoredToken();
      
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;
      let currentSpeed = 0;

      xhr.open('POST', '/api/files/upload');

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.15 || e.loaded === e.total) {
              const loadedDiff = e.loaded - lastLoaded;
              if (timeDiff > 0) {
                currentSpeed = loadedDiff / timeDiff;
              }
              lastLoaded = e.loaded;
              lastTime = now;
            }

            const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
            const loadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
            const totalMB = (e.total / (1024 * 1024)).toFixed(2);

            onProgress({
              loadedBytes: e.loaded,
              totalBytes: e.total,
              percent,
              loadedMB,
              totalMB,
              speedBytesPerSec: currentSpeed
            });
          }
        });
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload. Please check your connection.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. Please try again.'));
      };

      xhr.send(formData);
    });
  },

  getMyFiles: () => request<{ files: FileItem[]; totalStorageBytes: number }>('/api/files/my-files'),

  deleteFile: (id: string) =>
    request<{ success: boolean }>(`/api/files/${id}`, {
      method: 'DELETE'
    }),

  updateFile: (id: string, body: { originalName?: string; description?: string; password?: string; removePassword?: boolean }) =>
    request<FileItem>(`/api/files/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),

  // Share & Download
  getSharedFile: (shareToken: string) => request<FileItem>(`/api/share/${shareToken}`),

  verifySharePassword: (shareToken: string, password: string) =>
    request<{ valid: boolean; downloadToken?: string }>(`/api/share/${shareToken}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password })
    }),

  getDownloadUrl: (idOrToken: string, password?: string) => {
    const base = `/api/download/${idOrToken}`;
    return password ? `${base}?password=${encodeURIComponent(password)}` : base;
  },

  getPreviewUrl: (idOrToken: string) => `/api/preview/${idOrToken}`,

  // Admin Panel (teamthunderofficialyt@gmail.com)
  adminGetStats: () => request<AdminStats>('/api/admin/stats'),
  adminGetPlans: () => request<Plan[]>('/api/admin/plans'),
  adminCreatePlan: (plan: Partial<Plan>) =>
    request<Plan>('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan)
    }),
  adminUpdatePlan: (id: string, plan: Partial<Plan>) =>
    request<Plan>(`/api/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan)
    }),
  adminDeletePlan: (id: string) =>
    request<{ success: boolean }>(`/api/admin/plans/${id}`, {
      method: 'DELETE'
    }),

  adminGetUsers: () => request<User[]>('/api/admin/users'),
  adminUpdateUser: (id: string, updates: Partial<User>) =>
    request<User>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
  adminDeleteUser: (id: string) =>
    request<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: 'DELETE'
    }),

  adminGetFiles: () => request<FileItem[]>('/api/admin/files'),
  adminDeleteFile: (id: string) =>
    request<{ success: boolean }>(`/api/admin/files/${id}`, {
      method: 'DELETE'
    }),

  adminGetSettings: () => request<SiteSettings>('/api/admin/settings'),
  adminUpdateSettings: (settings: Partial<SiteSettings>) =>
    request<SiteSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  adminGetPublicFiles: () => request<PublicRootFile[]>('/api/admin/public-files'),
  adminCreatePublicFile: (file: { path: string; contentType?: string; content?: string }) =>
    request<PublicRootFile>('/api/admin/public-files', {
      method: 'POST',
      body: JSON.stringify(file)
    }),
  adminUpdatePublicFile: (id: string, file: Partial<PublicRootFile>) =>
    request<PublicRootFile>(`/api/admin/public-files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(file)
    }),
  adminDeletePublicFile: (id: string) =>
    request<{ success: boolean }>(`/api/admin/public-files/${id}`, {
      method: 'DELETE'
    }),

  adminTestOxaPay: (apiKey?: string) =>
    request<{ success: boolean; message: string }>('/api/admin/oxapay/test', {
      method: 'POST',
      body: JSON.stringify({ apiKey })
    }),

  adminGetOrders: () =>
    request<{
      orders: PaymentOrder[];
      totalOrders: number;
      totalPaidOrders: number;
      totalRevenueINR: number;
    }>('/api/admin/orders'),

  adminActivateOrder: (orderId: string) =>
    request<{ success: boolean; message: string; order: PaymentOrder }>(`/api/admin/orders/${orderId}/activate`, {
      method: 'POST'
    })
};
