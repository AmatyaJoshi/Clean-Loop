// Database Types for Laundry Management System

export interface Organization {
  id: string;
  name: string;
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Outlet {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  geolocation: {
    lat: number;
    lng: number;
  };
  capacityPerDay: number;
  operatingHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  contactDetails: {
    phone: string;
    email: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  password: string | null;
  phone: string | null;
  role: 'customer' | 'business_client' | 'staff' | 'outlet_manager' | 'admin' | 'owner' | 'super_admin';
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  userId: string;
  organizationId: string;
  customerCode: string;
  addresses: Address[];
  defaultAddressIndex: number;
  loyaltyPoints: number;
  totalOrders: number;
  lifetimeValue: number;
  preferences: Record<string, any>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
}

export interface ServiceCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Service {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  code: string;
  description?: string;
  basePrice: number;
  processingTimeHours: number;
  isExpressAvailable: boolean;
  expressMultiplier: number;
  unit: 'piece' | 'kg' | 'set';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  organizationId: string;
  orderNumber: string;
  customerId: string;
  outletId: string;
  status: OrderStatus;
  priority: 'normal' | 'express' | 'urgent';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryCharges: number;
  totalAmount: number;
  pickupScheduledAt?: Date;
  pickupCompletedAt?: Date;
  deliveryScheduledAt?: Date;
  deliveryCompletedAt?: Date;
  expectedCompletionAt?: Date;
  pickupAddress: Address;
  deliveryAddress: Address;
  pickupAgentId?: string;
  deliveryAgentId?: string;
  assignedTo?: string;
  specialInstructions?: string;
  customerNotes?: string;
  internalNotes?: string;
  metadata: Record<string, any>;
  statusHistory: OrderStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'picked_up'
  | 'in_progress'
  | 'quality_check'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  updatedBy: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  garmentDetails?: {
    color?: string;
    brand?: string;
    issues?: string[];
  };
  beforeImages?: string[];
  afterImages?: string[];
  status: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  organizationId: string;
  orderId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'card' | 'upi' | 'cash' | 'wallet' | 'net_banking';
  paymentGateway?: 'razorpay' | 'stripe';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt?: Date;
  gatewayResponse?: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
