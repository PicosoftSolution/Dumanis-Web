import React, { useState } from 'react';
import { Check, Crown, Zap, Sparkles, Users, FileText } from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Small teams ki start cheyadaniki',
    monthly: 0,
    icon: Sparkles,
    limits: { users: '10', entries: '500' },
    features: ['Basic Reports', 'Email Support'],
  },
  {
    key: 'basic',
    name: 'Basic',
    tagline: 'Growing teams kosam',
    monthly: 999,
    icon: Zap,
    limits: { users: '25', entries: '1,000' },
    features: ['Standard Reports', 'Export to Excel', 'Email Support'],
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'Big projects, no limits',
    monthly: 2999,
    icon: Crown,
    popular: true,
    limits: { users: 'Unlimited', entries: 'Unlimited' },
    features: ['Advanced Reports', 'Export to Excel & PDF', 'Priority Support', 'Dedicated Manager'],
  },
];

const YEARLY_DISCOUNT = 0.2; // 20% off on yearly billing

const formatINR = (n) => `₹${n.toLocaleString('en-IN')}`;

export default function PricingPlans({ currentPlan = 'free', onSelect }) {
  const [yearly, setYearly] = useState(false);

  const getPrice = (monthly) =>
    yearly ? Math.round(monthly * (1 - YEARLY_DISCOUNT)) : monthly;

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Plans & Pricing</h2>
    
        {/* Billing toggle */}
        <div className="inline-flex items-center mt-6 p-1 bg-gray-100 rounded-full">
          <button
            onClick={() => setYearly(false)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              !yearly ? 'bg-white text-blue-900 shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              yearly ? 'bg-white text-blue-900 shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yearly
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.key;
          const price = getPrice(plan.monthly);
          const dark = plan.popular;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-7 flex flex-col transition-all duration-200 hover:-translate-y-1
                ${dark
                  ? 'bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-2xl shadow-blue-900/30 md:scale-105'
                  : 'bg-white text-gray-900 border border-gray-200 shadow-md hover:shadow-xl'}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-950 text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1 shadow">
                  <Crown className="w-3 h-3" /> MOST POPULAR
                </span>
              )}

              {/* Plan name */}
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                  ${dark ? 'bg-white/15' : 'bg-blue-50'}`}>
                  <Icon className={`w-5 h-5 ${dark ? 'text-white' : 'text-blue-800'}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-tight">{plan.name}</h3>
                  <p className={`text-xs ${dark ? 'text-blue-200' : 'text-gray-500'}`}>{plan.tagline}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mt-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{formatINR(price)}</span>
                  <span className={`mb-1 text-sm ${dark ? 'text-blue-200' : 'text-gray-500'}`}>/month</span>
                </div>
                <p className={`text-xs mt-1 h-4 ${dark ? 'text-blue-200' : 'text-gray-400'}`}>
                  {plan.monthly === 0
                    ? 'Free forever'
                    : yearly
                      ? `${formatINR(price * 12)} billed yearly`
                      : 'Billed monthly'}
                </p>
              </div>

              {/* Key limits */}
              <div className={`grid grid-cols-2 gap-3 mt-6 p-3 rounded-xl
                ${dark ? 'bg-white/10' : 'bg-gray-50'}`}>
                <div>
                  <div className={`flex items-center gap-1 text-xs ${dark ? 'text-blue-200' : 'text-gray-500'}`}>
                    <Users className="w-3.5 h-3.5" /> Users
                  </div>
                  <p className="font-bold text-sm mt-0.5">{plan.limits.users}</p>
                </div>
                <div>
                  <div className={`flex items-center gap-1 text-xs ${dark ? 'text-blue-200' : 'text-gray-500'}`}>
                    <FileText className="w-3.5 h-3.5" /> Entries
                  </div>
                  <p className="font-bold text-sm mt-0.5">{plan.limits.entries}</p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mt-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
                      ${dark ? 'bg-green-400/20' : 'bg-green-100'}`}>
                      <Check className={`w-3 h-3 ${dark ? 'text-green-300' : 'text-green-600'}`} />
                    </span>
                    <span className={dark ? 'text-blue-50' : 'text-gray-700'}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              <button
                disabled={isCurrent}
                onClick={() => onSelect?.(plan.key, yearly ? 'yearly' : 'monthly')}
                className={`mt-8 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  ${isCurrent
                    ? dark
                      ? 'bg-white/20 text-white/70 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : dark
                      ? 'bg-white text-blue-900 hover:bg-blue-50 shadow-lg'
                      : 'bg-blue-800 text-white hover:bg-blue-900'}`}
              >
                {isCurrent ? '✓ Current Plan' : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}