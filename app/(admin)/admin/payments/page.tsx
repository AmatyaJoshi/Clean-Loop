'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Eye, FileImage, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import Footer from "@/components/Footer";

interface PaymentProof {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  upiTransactionId: string | null;
  createdAt: string;
  customer: {
    user: {
      name: string;
      email: string;
      phone: string;
    };
  };
  order: {
    orderNumber: string;
    status: string;
  } | null;
  membership: {
    id: string;
    planId: string;
    billingCycle: string;
  } | null;
  paymentProofs: PaymentProof[];
}

export default function PaymentVerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPendingPayments();
    }
  }, [status, router]);

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch('/api/payments/verify');
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (paymentId: string, status: 'verified' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${status === 'verified' ? 'verify' : 'reject'} this payment?`)) {
      return;
    }

    setVerifying(paymentId);
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, status }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        fetchPendingPayments(); // Refresh list
      } else {
        alert('Failed to process payment: ' + data.error);
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to process payment');
    } finally {
      setVerifying(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Link href="/admin" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 hover:scale-105">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Sparkles className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Verification</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-emerald-600 transition-all duration-300 hover:scale-105">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <Sparkles className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Payment Verification</h1>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Status */}
        <div className="mb-8">
          <p className="text-gray-600">
            Review and verify customer payments ({payments.length} pending)
          </p>
        </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h2>
          <p className="text-gray-600">No pending payments to verify</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* Payment Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {payment.customer.user.name}
                      </h3>
                      <p className="text-sm text-gray-600">{payment.customer.user.email}</p>
                      {payment.customer.user.phone && (
                        <p className="text-sm text-gray-600">{payment.customer.user.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium text-gray-900 uppercase">
                        {payment.paymentMethod}
                      </p>
                    </div>
                    
                    {payment.upiTransactionId && (
                      <div>
                        <p className="text-sm text-gray-600">Transaction ID</p>
                        <p className="font-mono text-sm text-gray-900">
                          {payment.upiTransactionId}
                        </p>
                      </div>
                    )}

                    {payment.order && (
                      <div>
                        <p className="text-sm text-gray-600">Order Number</p>
                        <p className="font-medium text-gray-900">
                          {payment.order.orderNumber}
                        </p>
                      </div>
                    )}

                    {payment.membership && (
                      <div>
                        <p className="text-sm text-gray-600">Membership Plan</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {payment.membership.planId} ({payment.membership.billingCycle})
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Payment Proofs */}
                  {payment.paymentProofs.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Payment Proof(s)</p>
                      <div className="flex gap-2 flex-wrap">
                        {payment.paymentProofs.map((proof) => (
                          <button
                            key={proof.id}
                            onClick={() => setSelectedImage(proof.fileUrl)}
                            className="relative group"
                          >
                            <img
                              src={proof.fileUrl}
                              alt="Payment proof"
                              className="h-20 w-20 object-cover rounded border-2 border-gray-200 hover:border-emerald-500 transition"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded flex items-center justify-center transition">
                              <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex lg:flex-col gap-3">
                  <button
                    onClick={() => handleVerify(payment.id, 'verified')}
                    disabled={verifying === payment.id}
                    className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {verifying === payment.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Verify
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleVerify(payment.id, 'rejected')}
                    disabled={verifying === payment.id}
                    className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {verifying === payment.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <XCircle className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Payment proof preview"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
      </div>
      
      <Footer />
    </div>
  );
}
