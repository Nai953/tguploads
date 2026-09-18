import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  CreditCard, 
  Coins, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Plan, User, PaymentOrder } from '../types.js';
import { api } from '../lib/api.js';

interface OxaPayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  user: User;
  onPlanUpdated: (newPlan: Plan, updatedUser: User) => void;
  onNavigateToAdminSettings?: () => void;
}

export const OxaPayCheckoutModal: React.FC<OxaPayCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  billingCycle,
  user,
  onPlanUpdated,
  onNavigateToAdminSettings
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paying' | 'paid' | 'expired' | 'failed'>('pending');
  const pollTimerRef = useRef<any>(null);

  const price = billingCycle === 'yearly' ? (plan.priceYearly || plan.priceMonthly * 10) : plan.priceMonthly;

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // Poll payment status while waiting
  useEffect(() => {
    if (!order || paymentStatus === 'paid' || paymentStatus === 'expired') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await api.checkPaymentStatus(order.id);
        if (res.status === 'paid') {
          setPaymentStatus('paid');
          if (res.plan && res.user) {
            onPlanUpdated(res.plan, res.user);
          }
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        } else if (res.status) {
          setPaymentStatus(res.status);
        }
      } catch (e) {
        // Silently retry polling
      }
    };

    pollTimerRef.current = setInterval(checkStatus, 3500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [order, paymentStatus, onPlanUpdated]);

  if (!isOpen) return null;

  const handleCreateInvoice = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.createOxaPayInvoice(plan.id, billingCycle);

      if (res.free && res.plan && res.user) {
        onPlanUpdated(res.plan, res.user);
        onClose();
        return;
      }

      if (res.success && res.orderId) {
        setPayLink(res.payLink || null);
        setOrder({
          id: res.orderId,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          planId: plan.id,
          planName: plan.name,
          billingCycle,
          amount: res.amount || price,
          currency: res.currency || 'INR',
          status: 'pending',
          trackId: res.trackId,
          payLink: res.payLink,
          createdAt: new Date().toISOString()
        });

        // Automatically open payment link in new window if available
        if (res.payLink) {
          window.open(res.payLink, '_blank', 'noopener,noreferrer');
        }
      } else {
        throw new Error(res.message || 'Could not initiate payment invoice.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment invoice initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="oxapay-checkout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div 
        id="oxapay-checkout-modal-content"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-oxapay-modal"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">OxaPay Crypto Checkout</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                INR Gateway
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Upgrade to <strong className="text-white">{plan.name}</strong> with Crypto
            </p>
          </div>
        </div>

        {/* Plan Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Selected Storage Tier</span>
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800">
              {plan.name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Billing Interval</span>
            <span className="text-xs font-semibold text-cyan-300 capitalize">
              {billingCycle} Billing
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-300">Total Amount Payable</span>
            <div className="text-right">
              <span className="text-2xl font-black text-white">
                ₹{price.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold ml-1">INR</span>
            </div>
          </div>
        </div>

        {/* Supported Cryptos Banner */}
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300 mb-6">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Pay instantly with <strong>USDT, BTC, ETH, TRX, SOL, BNB, LTC, MATIC</strong> and 50+ other cryptocurrencies automatically converted from INR.
          </span>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
            {error.includes('Admin Panel') && user.role === 'admin' && onNavigateToAdminSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAdminSettings();
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Configure OxaPay API Key in Admin Panel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Status Views */}
        {paymentStatus === 'paid' ? (
          <div className="text-center py-6 space-y-4 animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Payment Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Your payment of <strong className="text-emerald-400">₹{price.toLocaleString('en-IN')} INR</strong> via OxaPay was successful. Your account has been upgraded to <strong className="text-white">{plan.name}</strong>!
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Start Using {plan.name} Features
            </button>
          </div>
        ) : order ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-mono text-cyan-300 font-semibold">{order.id}</span>
              </div>
              {order.trackId && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">OxaPay Track ID:</span>
                  <span className="font-mono text-slate-300">{order.trackId}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Payment Status:</span>
                <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Awaiting Payment ({paymentStatus})...</span>
                </span>
              </div>
            </div>

            {/* Direct Link to OxaPay Checkout */}
            {payLink && (
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20"
              >
                <span>Complete Payment on OxaPay Checkout</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>This window will automatically refresh as soon as your payment confirms on OxaPay.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              id="btn-confirm-oxapay-invoice"
              onClick={handleCreateInvoice}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xl shadow-cyan-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating OxaPay Invoice...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Proceed to Pay ₹{price.toLocaleString('en-IN')} INR via OxaPay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted & Decentralized OxaPay Merchant Security</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
