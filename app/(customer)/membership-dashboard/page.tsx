'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Crown, Calendar, CheckCircle, Clock, AlertCircle, TrendingUp, Gift, ArrowLeft, Sparkles } from 'lucide-react';
import { MEMBERSHIP_PLANS } from '@/types/membership';
import Footer from "@/components/Footer";

export default function MembershipDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [membershipData, setMembershipData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchMembership();
    }
  }, [status, router]);

  const fetchMembership = async () => {
    try {
      const response = await fetch('/api/memberships/my-membership');
      const data = await response.json();
      
      if (data.success) {
        setMembershipData(data);
      }
    } catch (error) {
      console.error('Failed to fetch membership:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      expired: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Expired' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Cancelled' },
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50">
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 hover:scale-105">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Sparkles className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Membership Dashboard</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (!membershipData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const activeMembership = membershipData?.activeMembership;
  const plan = activeMembership ? MEMBERSHIP_PLANS.find(p => p.id === activeMembership.planId) : null;
  const daysRemaining = activeMembership ? getDaysRemaining(activeMembership.expiryDate) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 hover:scale-105">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <Sparkles className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Membership</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Status */}
        <div className="mb-8">
          <p className="text-gray-600">Manage your membership and view benefits</p>
        </div>

        {/* Active Membership Card */}
        {activeMembership && plan ? (
          <div className="bg-linear-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-8 w-8" />
                  <h2 className="text-3xl font-bold">{plan.name} Member</h2>
                </div>
                <p className="text-emerald-100">{plan.description}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                {getStatusBadge(activeMembership.status)}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Start Date</p>
                <p className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatDate(activeMembership.startDate)}
                </p>
              </div>
              <div>
                <p className="text-emerald-100 text-sm mb-1">Expires On</p>
                <p className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatDate(activeMembership.expiryDate)}
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Days Remaining</p>
                <p className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {daysRemaining !== null ? `${daysRemaining} days` : 'N/A'}
                </p>
              </div>
            </div>

            {daysRemaining !== null && daysRemaining <= 7 && (
              <div className="mt-6 bg-yellow-500/20 backdrop-blur-sm rounded-lg p-4">
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-5 w-5" />
                  Your membership is expiring soon! Renew now to continue enjoying benefits.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center mb-8 shadow-sm">
            <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Membership</h2>
            <p className="text-gray-600 mb-6">
              Unlock exclusive benefits and discounts with a membership plan
            </p>
            <Link
              href="/membership"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Membership Plans
            </Link>
          </div>
        )}

        {/* Benefits Overview */}
        {activeMembership && plan && (
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Gift className="h-7 w-7 text-blue-600" />
              Your Benefits
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-green-50 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {plan.discountPercentage}%
                </div>
                <p className="text-gray-700">Discount on all orders</p>
              </div>
              {plan.freePickupDelivery && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <CheckCircle className="h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-gray-700 font-medium">Free Pickup & Delivery</p>
                </div>
              )}
              {plan.prioritySupport && (
                <div className="bg-purple-50 rounded-lg p-6">
                  <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                  <p className="text-gray-700 font-medium">Priority Support</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-3">All Features:</h3>
              <ul className="grid md:grid-cols-2 gap-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Membership History */}
        {membershipData?.membershipHistory && membershipData.membershipHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Membership History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cycle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Start Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Expiry Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {membershipData.membershipHistory.map((membership: any) => {
                    const historyPlan = MEMBERSHIP_PLANS.find(p => p.id === membership.planId);
                    return (
                      <tr key={membership.id} className="border-b last:border-0">
                        <td className="py-4 px-4">
                          <span className="font-medium text-gray-900">{historyPlan?.name || 'Unknown'}</span>
                        </td>
                        <td className="py-4 px-4 capitalize text-gray-700">{membership.billingCycle}</td>
                        <td className="py-4 px-4 text-gray-700">{formatDate(membership.startDate)}</td>
                        <td className="py-4 px-4 text-gray-700">{formatDate(membership.expiryDate)}</td>
                        <td className="py-4 px-4">{getStatusBadge(membership.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 text-center">
          <Link
            href="/membership"
            className="inline-block text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          >
            {activeMembership ? 'Upgrade Your Plan' : 'Browse Membership Plans'} →
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
