export interface OxaPayInvoiceOptions {
  apiKey: string;
  amount: number; // in INR
  currency: string; // 'INR'
  orderId: string;
  email: string;
  description: string;
  callbackUrl: string;
  returnUrl: string;
  sandbox?: boolean;
}

export interface OxaPayInvoiceResponse {
  success: boolean;
  trackId?: string | number;
  payLink?: string;
  error?: string;
  raw?: any;
}

export interface OxaPayInquiryResponse {
  success: boolean;
  status?: string; // 'Paid' | 'Waiting' | 'Paying' | 'Expired' | 'Failed' | 'Rejected'
  error?: string;
  raw?: any;
}

/**
 * Creates a payment invoice via OxaPay Merchant API
 */
export async function createOxaPayInvoice(options: OxaPayInvoiceOptions): Promise<OxaPayInvoiceResponse> {
  const { apiKey, amount, currency, orderId, email, description, callbackUrl, returnUrl } = options;

  if (!apiKey) {
    return {
      success: false,
      error: 'OxaPay Merchant API Key is missing. Please configure it in the Admin Panel.'
    };
  }

  try {
    // Primary OxaPay Merchants Request endpoint
    const payload = {
      merchant: apiKey,
      amount: Number(amount),
      currency: currency || 'INR',
      lifeTime: 60, // 60 minutes
      feePaidByPayer: 0,
      underPaidCover: 0,
      callbackUrl,
      returnUrl,
      description: description || `TG Uploads Order #${orderId}`,
      orderId,
      email
    };

    const response = await fetch('https://api.oxapay.com/merchants/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();

    // OxaPay returns result: 100 on success
    const payLink = data.payLink || data.pay_link || data.paymentUrl;
    const trackId = data.trackId || data.track_id;

    if (data && (data.result === 100 || data.result === '100') && payLink) {
      return {
        success: true,
        trackId: trackId,
        payLink: payLink,
        raw: data
      };
    }

    // Try fallback v1 endpoint if merchants/request didn't succeed
    if (!payLink) {
      const v1Payload = {
        merchant_api_key: apiKey,
        merchant: apiKey,
        amount: Number(amount),
        currency: currency || 'INR',
        lifetime: 60,
        callback_url: callbackUrl,
        return_url: returnUrl,
        description: description || `TG Uploads Order #${orderId}`,
        order_id: orderId,
        email
      };

      const v1Res = await fetch('https://api.oxapay.com/v1/payment/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(v1Payload)
      });

      const v1Data: any = await v1Res.json();
      const v1PayLink = v1Data.payLink || v1Data.pay_link || v1Data.paymentUrl;
      const v1TrackId = v1Data.trackId || v1Data.track_id;

      if (v1Data && (v1Data.result === 100 || v1Data.result === '100') && v1PayLink) {
        return {
          success: true,
          trackId: v1TrackId,
          payLink: v1PayLink,
          raw: v1Data
        };
      }
    }

    return {
      success: false,
      error: data.message || data.error || 'OxaPay API Error: Please ensure a valid Merchant API Key is set in Admin Settings.',
      raw: data
    };
  } catch (err: any) {
    console.error('OxaPay invoice generation error:', err);
    return {
      success: false,
      error: err.message || 'Network error communicating with OxaPay API'
    };
  }
}

/**
 * Checks the status of a payment via OxaPay Inquiry endpoint
 */
export async function inquireOxaPayPayment(apiKey: string, trackId: string | number): Promise<OxaPayInquiryResponse> {
  if (!apiKey || !trackId) {
    return { success: false, error: 'API Key and Track ID required' };
  }

  try {
    const response = await fetch('https://api.oxapay.com/merchants/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        merchant: apiKey,
        trackId
      })
    });

    const data: any = await response.json();

    if (data && (data.result === 100 || data.result === '100')) {
      return {
        success: true,
        status: data.status,
        raw: data
      };
    }

    // Try fallback v1 endpoint
    const v1Res = await fetch(`https://api.oxapay.com/v1/payment/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (v1Res.ok) {
      const v1Data: any = await v1Res.json();
      if (v1Data && v1Data.status) {
        return {
          success: true,
          status: v1Data.status,
          raw: v1Data
        };
      }
    }

    return {
      success: false,
      status: data?.status || 'Unknown',
      error: data?.message || 'Could not verify payment status with OxaPay',
      raw: data
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Inquiry network error'
    };
  }
}

/**
 * Validates a Merchant API key with OxaPay
 */
export async function testOxaPayMerchantKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, message: 'Please provide an OxaPay Merchant API Key' };
  }

  try {
    // We send an inquiry for trackId 1. If merchant key is invalid, OxaPay responds with 401 or invalid merchant error.
    // If key is valid, it responds with result 100 (or "trackId not found" / "Transaction not found", which confirms the key works!).
    const response = await fetch('https://api.oxapay.com/merchants/inquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        merchant: apiKey.trim(),
        trackId: '1000'
      })
    });

    const data: any = await response.json();

    // Check if rejected due to bad merchant key
    const msg = (data?.message || data?.error || '').toLowerCase();
    if (
      data.result === 401 ||
      msg.includes('merchant not found') ||
      msg.includes('invalid merchant') ||
      msg.includes('invalid api key') ||
      msg.includes('unauthorized')
    ) {
      return {
        valid: false,
        message: `OxaPay Authentication Failed: ${data?.message || 'Invalid Merchant API Key'}`
      };
    }

    return {
      valid: true,
      message: 'OxaPay Merchant API Key is valid and connected successfully!'
    };
  } catch (err: any) {
    return {
      valid: false,
      message: `Failed to connect to OxaPay: ${err.message}`
    };
  }
}
