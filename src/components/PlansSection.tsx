import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ArrowRight, 
  HardDrive, 
  Lock, 
  Clock, 
  Gauge,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Plan, User } from '../types.js';
import { formatBytes } from '../lib/utils.js';
import { api } from '../lib/api.js';
import { OxaPayCheckoutModal } from './OxaPayCheckoutModal.js';
import { PaymentDetailsPage } from './PaymentDetailsPage.js';

interface PlansSectionProps {
  plans: Plan[];
  user: User | null;
  currentPlan: Plan | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onPlanUpdated: (newPlan: Plan, updatedUser: User) => void;
  onNavigateToAdminSettings?: () => void;
}

export const PlansSection: React.FC<PlansSectionProps> = ({
  plans,
  user,
  currentPlan,
  onOpenAuth,
  onPlanUpdated,
  onNavigateToAdminSettings
}) => {
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const isPaidUser = Boolean(
    user && 
    currentPlan && 
    currentPlan.priceMonthly > 0 && 
    user.planId !== 'plan_free' &&
    user.role !== 'admin'
  );

  const formattedExpiry = user?.planExpiresAt 
    ? new Date(user.planExpiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const handleSelectPlan = async (plan: Plan, isRenewal = false) => {
    if (!user) {
      onOpenAuth('register');
      return;
    }

    setErrorMessage(null);

    // If attempting to downgrade an active paid plan, block with informative message
    if (isPaidUser && !isRenewal && currentPlan) {
      const isLower = (plan.priceMonthly < currentPlan.priceMonthly) || 
                      (plan.storageLimitBytes < currentPlan.storageLimitBytes) ||
                      (plan.priceMonthly === 0);
      if (isLower) {
        setErrorMessage(
          `Paid users cannot switch to a lower plan under any circumstances. Your ${currentPlan.name} plan is active until ${formattedExpiry || 'the end of your cycle'}. It will only downgrade to Free if not renewed.`
        );
        return;
      }
    }

    if (currentPlan?.id === plan.id && !isRenewal) {
      return; // Already on this plan
    }

    const price = billingCycle === 'yearly' ? (plan.priceYearly || plan.priceMonthly * 10) : plan.priceMonthly;

    // For paid plans, open OxaPay Checkout modal
    if (price > 0) {
      setCheckoutPlan(plan);
      return;
    }

    // Free plan can be switched directly only for non-paid users
    setUpgradingId(plan.id);
    setSuccessMessage(null);

    try {
      const res = await api.upgradePlan(plan.id);
      onPlanUpdated(res.plan, res.user);
      setSuccessMessage(`Successfully switched to the ${plan.name} plan! Your new limits are now active.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch plan');
    } finally {
      setUpgradingId(null);
    }
  };

  // If user selected a plan to purchase/upgrade, show the dedicated Payment Details Page
  if (checkoutPlan && user) {
    return (
      <PaymentDetailsPage
        plan={checkoutPlan}
        billingCycle={billingCycle}
        user={user}
        onBack={() => setCheckoutPlan(null)}
        onPlanUpdated={(newPlan, updatedUser) => {
          if (updatedUser) {
            onPlanUpdated(newPlan, updatedUser);
          }
          setSuccessMessage(`Successfully updated to ${newPlan.name} plan!`);
          setTimeout(() => setSuccessMessage(null), 6000);
        }}
        onOpenAuth={onOpenAuth}
      />
    );
  }

  return (
    <div id="plans-section-container" className="max-w-7xl mx-auto space-y-10">
      
      {/* Plans Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Flexible Storage & Speed Tiers</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Choose the Perfect Storage Tier for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-400">TG Uploads</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400">
          Every new registration automatically receives the <strong className="text-cyan-300 font-semibold">Free Starter Plan (5 GB)</strong>. Upgrade anytime for permanent retention, password protection, and gigabit speeds.
        </p>

        {/* Active Paid User Status Banner */}
        {isPaidUser && currentPlan && (
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-left max-w-2xl mx-auto flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Active Paid Subscription:</span>
                <span className="text-xs font-bold text-cyan-300">{currentPlan.name}</span>
                {formattedExpiry && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                    Renews: {formattedExpiry}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paid accounts cannot downgrade to lower plans during an active subscription. Your account will automatically revert to the Free Starter plan only if not renewed in the next billing cycle.
              </p>
            </div>
          </div>
        )}

        {/* Billing cycle switch */}
        <div className="flex items-center justify-center pt-2">
          <div className="p-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div id="plan-error-alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3 animate-in fade-in max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-200">Plan Restriction Notice</p>
            <p className="text-xs text-rose-300/90 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div id="plan-success-alert" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in max-w-2xl mx-auto">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.id === plan.id;
          const isPro = plan.id === 'plan_pro' || plan.name.toLowerCase().includes('pro');
          const isEnterprise = plan.id === 'plan_ultra' || plan.name.toLowerCase().includes('enterprise');

          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const period = billingCycle === 'yearly' ? '/year' : '/month';

          // Check if this plan is lower than user's active paid plan
          const isLower = Boolean(
            isPaidUser && 
            !isCurrent && 
            currentPlan && (
              plan.priceMonthly < currentPlan.priceMonthly ||
              plan.storageLimitBytes < currentPlan.storageLimitBytes ||
              plan.priceMonthly === 0
            )
          );

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                isLower
                  ? 'bg-slate-950/60 border border-slate-900 opacity-75'
                  : isPro
                  ? 'bg-gradient-to-b from-slate-900 to-cyan-950/40 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10 scale-102 z-10'
                  : 'bg-slate-900/70 border border-slate-800 hover:border-slate-700 shadow-xl'
              }`}
            >
              {/* Badge */}
              {isLower ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 shadow-md flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Downgrade Locked
                  </span>
                </div>
              ) : plan.badge ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md ${
                    isPro 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950'
                      : isEnterprise
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              ) : null}

              <div>
                {/* Title & Description */}
                <div className="space-y-2 mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center justify-between">
                    <span className={isLower ? 'text-slate-400' : ''}>{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Current Plan
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-slate-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl font-extrabold ${isLower ? 'text-slate-400' : 'text-white'}`}>
                      {price === 0 ? '₹0' : `₹${price.toLocaleString('en-IN')}`}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {price === 0 ? 'Free forever' : period}
                    </span>
                  </div>
                  {price > 0 && (
                    <p className="text-[11px] text-cyan-400 font-medium mt-1">
                      Pay with Crypto via OxaPay
                    </p>
                  )}
                  {plan.isDefault && (
                    <p className="text-[11px] text-cyan-400 font-semibold mt-1">
                      Auto-activated on sign up
                    </p>
                  )}
                </div>

                {/* Key Metrics Quick List */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Storage Quota
                    </span>
                    <span className="font-bold text-white font-mono">{formatBytes(plan.storageLimitBytes)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" /> Max File Size
                    </span>
                    <span className="font-bold text-white font-mono">{formatBytes(plan.maxFileSizeBytes)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Bandwidth Speed
                    </span>
                    <span className="font-semibold text-slate-200">{plan.downloadSpeed}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" /> File Retention
                    </span>
                    <span className="font-semibold text-slate-200">
                      {plan.retentionDays === 0 ? 'Permanent' : `${plan.retentionDays} Days`}
                    </span>
                  </div>
                </div>

                {/* Feature Checkpoints */}
                <div className="space-y-2.5 mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Included Capabilities
                  </p>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}

                  {plan.passwordProtection ? (
                    <div className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>Password protected links enabled</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <div className="w-4 h-4 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center shrink-0">
                        ✕
                      </div>
                      <span className="line-through">Password protection</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button & Info */}
              <div className="space-y-2">
                {isLower ? (
                  <>
                    <button
                      id={`btn-plan-select-${plan.id}`}
                      disabled={true}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-slate-900 text-slate-500 border border-slate-800 flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>Cannot Downgrade Active Plan</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                      Only downgrades to Free if not renewed at expiration.
                    </p>
                  </>
                ) : isCurrent && isPaidUser ? (
                  <>
                    <button
                      id={`btn-plan-renew-${plan.id}`}
                      onClick={() => handleSelectPlan(plan, true)}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Renew / Extend Plan (₹{price.toLocaleString('en-IN')})</span>
                    </button>
                    {formattedExpiry && (
                      <p className="text-[11px] text-emerald-400/80 text-center font-medium">
                        Active until {formattedExpiry}
                      </p>
                    )}
                  </>
                ) : isCurrent ? (
                  <button
                    id={`btn-plan-select-${plan.id}`}
                    disabled={true}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center gap-2 cursor-default"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Active Current Plan</span>
                  </button>
                ) : (
                  <button
                    id={`btn-plan-select-${plan.id}`}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={upgradingId === plan.id}
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-default ${
                      isPro
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-xl shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {upgradingId === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Plan...</span>
                      </>
                    ) : !user ? (
                      <>
                        <span>Sign Up to Get Started</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : price > 0 ? (
                      <>
                        <span>Upgrade to {plan.name} (₹{price.toLocaleString('en-IN')})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Switch to {plan.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* OxaPay Checkout Modal */}
      {checkoutPlan && user && (
        <OxaPayCheckoutModal
          isOpen={Boolean(checkoutPlan)}
          onClose={() => setCheckoutPlan(null)}
          plan={checkoutPlan}
          billingCycle={billingCycle}
          user={user}
          onPlanUpdated={(newPlan, updatedUser) => {
            onPlanUpdated(newPlan, updatedUser);
            setSuccessMessage(`Successfully updated ${newPlan.name} plan with OxaPay!`);
            setTimeout(() => setSuccessMessage(null), 6000);
          }}
          onNavigateToAdminSettings={onNavigateToAdminSettings}
        />
      )}
    </div>
  );
};
