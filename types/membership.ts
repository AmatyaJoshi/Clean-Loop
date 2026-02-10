export interface MembershipPlan {
  id: string;
  name: 'Basic' | 'Premium' | 'Elite' | 'Business';
  description: string;
  priceMonthly: number; // in Rupees (₹)
  priceYearly: number; // in Rupees (₹)
  features: string[];
  discountPercentage: number;
  freePickupDelivery: boolean;
  prioritySupport: boolean;
  maxOrders: number | null; // null = unlimited
  isActive: boolean;
  displayOrder: number;
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  planId: string;
  plan?: MembershipPlan;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  billingCycle: 'monthly' | 'yearly';
  startDate: Date | null;
  expiryDate: Date | null;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipTransaction {
  id: string;
  membershipId: string;
  type: 'purchase' | 'renewal' | 'upgrade' | 'downgrade' | 'cancellation';
  amount: number; // in Rupees (₹)
  status: 'pending' | 'completed' | 'failed';
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Membership Plans Configuration (All prices in ₹ Rupees)
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for occasional users',
    priceMonthly: 0, // Free
    priceYearly: 0,
    features: [
      'Standard pricing',
      'Email notifications',
      'Order tracking',
      'Regular customer support'
    ],
    discountPercentage: 0,
    freePickupDelivery: false,
    prioritySupport: false,
    maxOrders: null,
    isActive: true,
    displayOrder: 1
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Best for regular customers',
    priceMonthly: 299, // ₹299/month
    priceYearly: 2999, // ₹2999/year (Save ₹590)
    features: [
      '10% off on all services',
      'Free pickup & delivery',
      'Priority support',
      'SMS + Email alerts',
      'Extended order history',
      'No minimum order'
    ],
    discountPercentage: 10,
    freePickupDelivery: true,
    prioritySupport: true,
    maxOrders: null,
    isActive: true,
    displayOrder: 2
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'For power users and families',
    priceMonthly: 499, // ₹499/month
    priceYearly: 4999, // ₹4999/year (Save ₹990)
    features: [
      '15% off on all services',
      'Free pickup & delivery',
      'Priority support',
      'SMS + Email alerts',
      'Dedicated account manager',
      'Same-day service',
      'Fabric care consultation',
      'Stain removal guarantee'
    ],
    discountPercentage: 15,
    freePickupDelivery: true,
    prioritySupport: true,
    maxOrders: null,
    isActive: true,
    displayOrder: 3
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Tailored for businesses',
    priceMonthly: 999, // ₹999/month
    priceYearly: 9999, // ₹9999/year (Save ₹1990)
    features: [
      '20% off on all services',
      'Free pickup & delivery',
      'Dedicated account manager',
      'Bulk order processing',
      'Custom billing & invoicing',
      'Team account access',
      'Priority scheduling',
      'Monthly usage reports'
    ],
    discountPercentage: 20,
    freePickupDelivery: true,
    prioritySupport: true,
    maxOrders: null,
    isActive: true,
    displayOrder: 4
  }
];

// Helper function to calculate membership savings
export function calculateMembershipSavings(
  planName: MembershipPlan['name'],
  orderAmount: number
): number {
  const plan = MEMBERSHIP_PLANS.find(p => p.name === planName);
  if (!plan) return 0;
  
  return (orderAmount * plan.discountPercentage) / 100;
}

// Helper function to get active membership for customer
export function getActiveMembership(
  memberships: CustomerMembership[]
): CustomerMembership | null {
  const active = memberships.find(
    m => m.status === 'active' && m.expiryDate && new Date(m.expiryDate) > new Date()
  );
  return active || null;
}

// Helper function to check if membership is expiring soon (within 7 days)
export function isMembershipExpiringSoon(membership: CustomerMembership): boolean {
  if (!membership.expiryDate || membership.status !== 'active') return false;
  
  const expiryDate = new Date(membership.expiryDate);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  return expiryDate <= sevenDaysFromNow && expiryDate > new Date();
}
