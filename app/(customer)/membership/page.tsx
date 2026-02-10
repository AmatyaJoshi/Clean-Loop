'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Crown, Sparkles, Building2, Upload, Loader2, QrCode } from 'lucide-react';
import { MEMBERSHIP_PLANS, type MembershipPlan } from '@/types/membership';
import Footer from "@/components/Footer";

export default function MembershipPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod'>('upi');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [upiDetails, setUpiDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    if (showPaymentForm && paymentMethod === 'upi') {
      fetchUpiDetails();
    }
  }, [showPaymentForm, paymentMethod]);

  const fetchUpiDetails = async () => {
    try {
      const response = await fetch('/api/payments/upi-details');
      const data = await response.json();
      if (data.success) {
        setUpiDetails(data.upiAccount);
      }
    } catch (error) {
      console.error('Failed to fetch UPI details:', error);
    }
  };

  const handlePlanSelect = (plan: MembershipPlan) => {
    if (plan.id === 'basic') {
      alert('Basic plan is free and active by default!');
      return;
    }
    
    // Check if user is logged in before allowing purchase
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/membership');
      return;
    }
    
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) return;

    if (paymentMethod === 'upi' && !paymentProof) {
      alert('Please upload payment proof for UPI payment');
      return;
    }

    if (paymentMethod === 'upi' && !upiTransactionId) {
      alert('Please enter UPI transaction ID');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('planId', selectedPlan.id);
      formData.append('billingCycle', billingCycle);
      formData.append('paymentMethod', paymentMethod);
      
      if (upiTransactionId) {
        formData.append('upiTransactionId', upiTransactionId);
      }
      
      if (paymentProof) {
        formData.append('paymentProof', paymentProof);
      }

      const response = await fetch('/api/memberships/purchase', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('Membership purchase initiated! Payment is pending verification.');
        router.push('/customer/membership');
      } else {
        alert('Failed to purchase membership: ' + data.error);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to process purchase');
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Premium': return <Crown className="h-8 w-8" />;
      case 'Elite': return <Sparkles className="h-8 w-8" />;
      case 'Business': return <Building2 className="h-7 w-7" />;
      default: return null;
    }
  };

  const getAmount = (plan: MembershipPlan) => {
    return billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (showPaymentForm && selectedPlan) {
    const amount = getAmount(selectedPlan);

    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => {
              setShowPaymentForm(false);
              setSelectedPlan(null);
            }}
            className="text-emerald-600 hover:text-emerald-700 mb-6 font-semibold transition-colors"
          >
            ← Back to Plans
          </button>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Complete Your Purchase
            </h2>
            <p className="text-gray-600 mb-6">
              {selectedPlan.name} - {formatCurrency(amount)}/{billingCycle}
            </p>

            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Billing Cycle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Cycle
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`p-4 rounded-xl border-2 transition ${
                      billingCycle === 'monthly'
                        ? 'border-emerald-600 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">Monthly</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(selectedPlan.priceMonthly)}/month
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`p-4 rounded-xl border-2 transition ${
                      billingCycle === 'yearly'
                        ? 'border-emerald-600 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">Yearly</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(selectedPlan.priceYearly)}/year
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Save {formatCurrency((selectedPlan.priceMonthly * 12) - selectedPlan.priceYearly)}
                    </p>
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <QrCode className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">UPI</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 rounded-xl border-2 transition ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-600 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">Cash/COD</p>
                    <p className="text-xs text-gray-600 mt-1">Pay later</p>
                  </button>
                </div>
              </div>

              {/* UPI Payment Details */}
              {paymentMethod === 'upi' && upiDetails && (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                  <h3 className="font-semibold text-gray-900 mb-4">UPI Payment Instructions</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">UPI ID</p>
                      <p className="font-mono font-medium text-gray-900">{upiDetails.upiId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Account Name</p>
                      <p className="font-medium text-gray-900">{upiDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount to Pay</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
                    </div>
                    {upiDetails.qrCodeUrl && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Scan QR Code</p>
                        <img src={upiDetails.qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* UPI Transaction ID */}
              {paymentMethod === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    placeholder="Enter 12-digit transaction ID"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              )}

              {/* Upload Payment Proof */}
              {paymentMethod === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Payment Screenshot *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="payment-proof"
                      required
                    />
                    <label
                      htmlFor="payment-proof"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-900">
                        {paymentProof ? paymentProof.name : 'Click to upload'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center shadow-lg shadow-emerald-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  `Purchase ${selectedPlan.name} Plan`
                )}
              </button>

              <p className="text-xs text-gray-600 text-center">
                Your payment will be verified by our team within 24 hours
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 hover:scale-105">
            <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CleanLoop</h1>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/services" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300 hover:scale-105">
              Services
            </Link>
            <Link href="/track" className="text-gray-700 hover:text-emerald-600 font-medium transition-all duration-300 hover:scale-105">
              Track Order
            </Link>
            {status === 'authenticated' ? (
              <Link href="/membership-dashboard" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-all duration-300 hover:scale-105">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-all duration-300 hover:scale-105">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Choose Your Membership Plan
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Save more with higher tiers. All prices in ₹ Rupees
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MEMBERSHIP_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`group relative bg-white rounded-2xl p-6 shadow-xl border flex flex-col h-[580px] ${
                plan.name === 'Elite' 
                  ? 'border-emerald-200 ring-2 ring-emerald-500 shadow-2xl shadow-emerald-500/20' 
                  : 'border-gray-200 hover:border-emerald-100 hover:shadow-2xl'
              } transition-all duration-300`}
            >
              {plan.name === 'Elite' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-linear-to-r from-emerald-600 to-teal-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                  Most Popular
                </div>
              )}

              {/* Icon */}
              <div className={`mb-3 transform group-hover:scale-110 transition-transform duration-300 ${
                plan.name === 'Elite' ? 'text-emerald-600' : 'text-gray-700'
              }`}>
                {getPlanIcon(plan.name) || <Crown className="h-7 w-7" />}
              </div>

              {/* Plan Name */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {plan.name}
              </h3>
              
              {/* Description */}
              <p className="text-gray-600 text-xs mb-4">
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-4">
                {plan.priceMonthly === 0 ? (
                  <div className="text-3xl font-bold text-gray-900">
                    Free
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(plan.priceMonthly)}
                      <span className="text-sm font-normal text-gray-600">/mo</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      or {formatCurrency(plan.priceYearly)}/year
                    </p>
                  </>
                )}
              </div>

              {/* Features - Scrollable */}
              <ul className="space-y-2 mb-4 flex-grow overflow-y-auto">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button - Always at bottom */}
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full py-3 rounded-xl font-bold text-base transition-all duration-300 shadow-lg mt-auto ${
                  plan.id === 'basic'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-xl'
                    : plan.name === 'Elite'
                    ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {plan.id === 'basic' ? 'Current Plan' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All membership benefits activate after payment verification.
            <br />
            Contact support for custom enterprise plans.
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
