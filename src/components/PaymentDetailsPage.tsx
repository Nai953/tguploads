import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  Ticket, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Coins,
  Gift,
  Lock,
  Globe,
  Radio
} from 'lucide-react';
import { Plan, User, PaymentOrder } from '../types.js';
import { api } from '../lib/api.js';

interface PaymentDetailsPageProps {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
  user: User;
  onBack: () => void;
  onPlanUpdated: (newPlan: Plan, updatedUser?: User) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const PaymentDetailsPage: React.FC<PaymentDetailsPageProps> = ({
  plan,
  billingCycle: initialBillingCycle,
  user,
  onBack,
  onPlanUpdated,
  onOpenAuth
}) => {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(initialBillingCycle);
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed' | 'free';
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
  } | null>(null);

  // Checkout & Invoice State
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | number | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'paying' | 'paid' | 'expired'>('pending');
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Price calculations
  const basePrice = cycle === 'yearly' ? (plan.priceYearly || plan.priceMonthly * 10) : plan.priceMonthly;
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalPayable = Math.max(0, basePrice - discountAmount);
  const is100PercentFree = finalPayable === 0;

  // Format Storage limit
  const storageGB = Math.round(plan.storageLimitBytes / (1024 * 1024 * 1024));
  const maxFileMB = Math.round(plan.maxFileSizeBytes / (1024 * 1024));

  // Reset coupon calculation when cycle changes
  useEffect(() => {
    if (appliedCoupon) {
      handleRevalidateCoupon(appliedCoupon.code, cycle);
    }
  }, [cycle]);

  const handleRevalidateCoupon = async (code: string, targetCycle: 'monthly' | 'yearly') => {
    try {
      const res = await api.validateCoupon(code, plan.id, targetCycle);
      if (res.valid) {
        setAppliedCoupon({
          code: res.coupon.code,
          description: res.coupon.description,
          discountType: res.coupon.discountType,
          discountValue: res.coupon.discountValue,
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
          isFree: res.isFree
        });
      } else {
        setAppliedCoupon(null);
      }
    } catch {
      setAppliedCoupon(null);
    }
  };

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await api.validateCoupon(couponInput.trim(), plan.id, cycle);
      if (res.valid) {
        setAppliedCoupon({
          code: res.coupon.code,
          description: res.coupon.description,
          discountType: res.coupon.discountType,
          discountValue: res.coupon.discountValue,
          discountAmount: res.discountAmount,
          finalAmount: res.finalAmount,
          isFree: res.isFree
        });
        if (res.isFree) {
          setCouponSuccess(`🎉 Coupon ${res.coupon.code} applied! 100% discount - your plan is completely FREE!`);
        } else {
          setCouponSuccess(`✓ Coupon ${res.coupon.code} applied! Saved ₹${res.discountAmount} INR.`);
        }
      } else {
        setCouponError(res.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Failed to validate coupon code');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  // Start Checkout or Claim Free Plan
  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setInvoiceError(null);

    try {
      const couponCodeToSend = appliedCoupon ? appliedCoupon.code : undefined;
      const res = await api.createOxaPayInvoice(plan.id, cycle, couponCodeToSend);

      if (res.free || res.amount === 0) {
        // Plan activated for free immediately!
        setIsPaidSuccess(true);
        if (res.user) {
          onPlanUpdated(res.plan || plan, res.user);
        }
        return;
      }

      if (res.success && res.orderId) {
        setActiveOrder({
          id: res.orderId,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          planId: plan.id,
          planName: plan.name,
          billingCycle: cycle,
          amount: res.amount || finalPayable,
          originalAmount: res.originalAmount || basePrice,
          discountAmount: res.discountAmount || discountAmount,
          couponCode: res.couponCode,
          currency: res.currency || 'INR',
          status: 'pending',
          trackId: res.trackId,
          payLink: res.payLink,
          createdAt: new Date().toISOString()
        });
        setPayLink(res.payLink || null);
        setTrackId(res.trackId || null);
        setIsSandbox(Boolean(res.sandbox));
      } else {
        setInvoiceError('Unable to generate payment invoice. Please try again.');
      }
    } catch (err: any) {
      setInvoiceError(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll for payment confirmation
  useEffect(() => {
    if (!activeOrder || isPaidSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.checkPaymentStatus(activeOrder.id);
        if (res.status === 'paid') {
          setPollingStatus('paid');
          setIsPaidSuccess(true);
          if (res.user && res.plan) {
            onPlanUpdated(res.plan, res.user);
          }
          clearInterval(interval);
        } else if (res.status === 'paying') {
          setPollingStatus('paying');
        } else if (res.status === 'expired' || res.status === 'failed') {
          setPollingStatus('expired');
          clearInterval(interval);
        }
      } catch (e) {
        // Silently continue polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeOrder, isPaidSuccess]);

  // Sandbox simulation test
  const handleSimulateSandboxPayment = async () => {
    if (!activeOrder) return;
    setIsSimulating(true);
    try {
      const res = await api.simulatePayment(activeOrder.id);
      if (res.success) {
        setIsPaidSuccess(true);
        setPollingStatus('paid');
        if (res.user && res.plan) {
          onPlanUpdated(res.plan, res.user);
        }
      }
    } catch (err: any) {
      setInvoiceError('Sandbox simulation failed: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyOrderId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  return (
    <div id="payment-details-page-root" className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Top Breadcrumb & Back Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          id="btn-back-to-plans"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-semibold cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Plans & Pricing</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>SSL 256-bit Encrypted Checkout</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <Crown className="w-3.5 h-3.5 text-cyan-400" />
          <span>Secure Plan Checkout & Activation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Payment Details & Order Summary
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Review your chosen tier, customize your billing duration, apply coupons for discounts or 100% free access, and complete activation.
        </p>
      </div>

      {/* Main Content: If Payment Completed Successfully */}
      {isPaidSuccess ? (
        <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              {appliedCoupon?.isFree ? 'Free Plan Activated' : 'Payment Confirmed'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome to {plan.name}!
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your storage quota has been upgraded to <strong className="text-cyan-300 font-semibold">{storageGB} GB</strong> with high-speed bandwidth and permanent file retention.
            </p>
          </div>

          {/* Upgraded Quota Breakdown Card */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-3 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Activated Tier</span>
              <span className="text-white font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                {plan.name}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Storage Quota</span>
              <span className="text-cyan-300 font-bold">{storageGB} GB Cloud Storage</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Max Upload Size</span>
              <span className="text-white font-semibold">{maxFileMB} MB per file</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Billing Period</span>
              <span className="text-white capitalize font-semibold">{cycle} Subscription</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80 text-purple-300">
                <span className="font-medium flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5" /> Coupon Code
                </span>
                <span className="font-bold">{appliedCoupon.code} ({appliedCoupon.isFree ? '100% Free' : `₹${appliedCoupon.discountAmount} off`})</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 text-emerald-400 font-bold">
              <span>Status</span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Active & Verified
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Explore My Upgraded Account</span>
            </button>
          </div>
        </div>
      ) : activeOrder && payLink ? (
        /* Invoice Active / Waiting for Payment Screen */
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-amber-500/30 shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">OxaPay Crypto Invoice Created</h3>
                <p className="text-xs text-slate-400">Order #{activeOrder.id}</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              Awaiting Payment
            </span>
          </div>

          {/* Amount to Pay highlight */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Payable Amount</span>
              <span className="text-2xl font-black text-white">₹{finalPayable} <span className="text-xs font-medium text-slate-400">INR</span></span>
              {appliedCoupon && (
                <span className="text-[11px] text-purple-400 block font-medium">Coupon {appliedCoupon.code} saved ₹{discountAmount} INR</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Plan</span>
              <span className="text-sm font-bold text-cyan-300">{plan.name} ({cycle})</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-3">
            <a
              id="btn-open-oxapay-invoice"
              href={payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <span>Pay with OxaPay (Crypto Gateway)</span>
              <ExternalLink className="w-4 h-4 text-slate-950" />
            </a>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Track ID: <strong className="text-slate-200">{String(trackId || 'N/A')}</strong></span>
              <button 
                onClick={() => handleCopyOrderId(activeOrder.id)}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedOrderId ? 'Copied!' : 'Copy Order ID'}</span>
              </button>
            </div>
          </div>

          {/* Live Polling Indicator */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between text-xs text-cyan-300">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Checking network confirmations automatically...</span>
            </div>
            <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[11px]">{pollingStatus}</span>
          </div>

          {/* Sandbox Test Action (if sandbox) */}
          {isSandbox && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Sandbox Simulation Mode Active
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase">Test Mode</span>
              </div>
              <p className="text-xs text-slate-300">
                You can test instantaneous completion without sending real crypto:
              </p>
              <button
                id="btn-simulate-sandbox-payment"
                onClick={handleSimulateSandboxPayment}
                disabled={isSimulating}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Simulate Successful Payment (Instant Upgrade)</span>
              </button>
            </div>
          )}

          <div className="pt-2 text-center">
            <button
              onClick={() => {
                setActiveOrder(null);
                setPayLink(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Cancel and change coupon or billing cycle
            </button>
          </div>
        </div>
      ) : (
        /* Regular Two-Column Checkout View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Plan Breakdown & Cycle Selector (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Billing Cycle Switcher */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Billing Cycle</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Save with Yearly
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  id="btn-cycle-monthly"
                  onClick={() => setCycle('monthly')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    cycle === 'monthly'
                      ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-md shadow-cyan-500/5'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Monthly Billing</span>
                    <Radio className={`w-4 h-4 ${cycle === 'monthly' ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-extrabold text-white">₹{plan.priceMonthly}</span>
                    <span className="text-xs text-slate-400 font-medium"> / month</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Flexible, cancel anytime</p>
                </button>

                <button
                  type="button"
                  id="btn-cycle-yearly"
                  onClick={() => setCycle('yearly')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    cycle === 'yearly'
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/5'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Yearly Billing</span>
                    <Radio className={`w-4 h-4 ${cycle === 'yearly' ? 'text-amber-400' : 'text-slate-600'}`} />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-extrabold text-white">
                      ₹{plan.priceYearly || plan.priceMonthly * 10}
                    </span>
                    <span className="text-xs text-slate-400 font-medium"> / year</span>
                  </div>
                  <p className="text-[11px] text-amber-400/90 mt-1 font-semibold">2 Months Free (Save ~17%)</p>
                </button>
              </div>
            </div>

            {/* Selected Plan Details Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-extrabold text-white">{plan.name} Tier</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                </div>
                {plan.badge && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    {plan.badge}
                  </span>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Storage Quota</span>
                  <span className="text-base font-black text-cyan-300">{storageGB} GB</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Max Single File</span>
                  <span className="text-base font-black text-white">{maxFileMB} MB</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Download Speed</span>
                  <span className="text-base font-black text-emerald-400">{plan.downloadSpeed}</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Features included in this plan:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>{plan.retentionDays === -1 ? 'Permanent Lifetime Storage' : `${plan.retentionDays} Days Retention`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Password Protection Supported</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Direct Fast CDN Links</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Priority Bandwidth Allocation</span>
                  </div>
                </div>
              </div>

              {/* Account Note */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span>Upgrading account: </span>
                  <strong className="text-white">{user.email}</strong>
                  <span className="block text-[11px] text-slate-500">Plan limits apply instantly across all new and existing uploads.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Coupon Code & Order Receipt (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Coupon Code Box */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Coupon / Promo Code</h3>
                </div>
                <span className="text-[11px] text-purple-400 font-semibold">100% Free Codes Supported</span>
              </div>

              {appliedCoupon ? (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="font-mono font-bold text-sm text-purple-200">{appliedCoupon.code}</span>
                    </div>
                    <button
                      type="button"
                      id="btn-remove-coupon"
                      onClick={handleRemoveCoupon}
                      className="text-xs text-slate-400 hover:text-red-400 underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-xs text-purple-300 font-medium">
                    {appliedCoupon.isFree ? (
                      <span className="font-bold text-emerald-400">✨ 100% Free Plan Discount Applied!</span>
                    ) : (
                      <span>Discount: ₹{appliedCoupon.discountAmount} INR ({appliedCoupon.discountValue}{appliedCoupon.discountType === 'percentage' ? '%' : ' INR'} OFF)</span>
                    )}
                  </div>
                  {appliedCoupon.description && (
                    <p className="text-[11px] text-slate-400">{appliedCoupon.description}</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        id="input-coupon-code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="e.g. FREE100, THUNDER50"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs font-mono uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 tracking-wider"
                      />
                    </div>
                    <button
                      type="submit"
                      id="btn-apply-coupon"
                      disabled={validatingCoupon || !couponInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                    >
                      {validatingCoupon ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enter promotional or administrative coupon code for instant discounts or free plan access.
                  </p>
                </form>
              )}

              {couponError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{couponError}</span>
                </div>
              )}

              {couponSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{couponSuccess}</span>
                </div>
              )}
            </div>

            {/* Itemized Order Receipt Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Itemized Receipt</h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>{plan.name} Tier ({cycle})</span>
                  <span className="font-semibold text-white">₹{basePrice} INR</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-purple-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5" /> Coupon Discount ({appliedCoupon.code})
                    </span>
                    <span>- ₹{discountAmount} INR</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-400">
                  <span>Payment Gateway Processing Fee</span>
                  <span className="text-emerald-400 font-semibold">FREE (₹0)</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Taxes & GST</span>
                  <span className="font-semibold text-slate-300">₹0.00</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-extrabold text-white block">Total Payable</span>
                    <span className="text-[11px] text-slate-400">One-time payment, no hidden fees</span>
                  </div>
                  <div className="text-right">
                    {is100PercentFree ? (
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                          FREE
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">100% Discount</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">₹{finalPayable}</span>
                        <span className="text-xs font-semibold text-slate-400">INR</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {invoiceError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{invoiceError}</span>
                </div>
              )}

              {/* Checkout Trigger Button */}
              {is100PercentFree ? (
                /* FREE PLAN CLAIM BUTTON */
                <button
                  type="button"
                  id="btn-claim-free-plan"
                  onClick={handleProceedToPayment}
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                      <span>Activating Free Upgrade...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 text-slate-950" />
                      <span>Claim Free Upgrade with Coupon</span>
                    </>
                  )}
                </button>
              ) : (
                /* PAID CRYPTO CHECKOUT BUTTON */
                <div className="space-y-3">
                  <button
                    type="button"
                    id="btn-proceed-to-payment"
                    onClick={handleProceedToPayment}
                    disabled={isProcessing}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                        <span>Generating OxaPay Invoice...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-5 h-5 text-slate-950" />
                        <span>Proceed to OxaPay Crypto Checkout</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pay with USDT, BTC, ETH, TRX, SOL, BNB, & 50+ coins</span>
                  </div>
                </div>
              )}

              {/* Guarantees */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instant automated account limit upgrade</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>No auto-recurring charges (one-time invoice)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>24/7 dedicated support via Telegram & Email</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
