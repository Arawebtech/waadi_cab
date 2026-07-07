export interface SubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  amount: number;
  currency: string;
  durationDays: number;
  badge: string | null;
  color: string;
  sortOrder: number;
  features: string[];
  bookingLimitPerDay: number;
  prioritySupport: boolean;
  instantApproval: boolean;
  commissionDiscount: number;
  purchaseCount: number;
  renewalCount: number;
  totalRevenue: number;
  isPopular: boolean;
  isRecommended: boolean;
  isTrial: boolean;
  isActive: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'cancelled'
  | 'suspended';

export type SubscriptionPurchaseIntent = 'purchase' | 'renew' | 'replace';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Subscription {
  _id: string;
  driverId: string;
  planId: string | SubscriptionPlan;
  planName: string;
  durationDays: number;
  amount: number;
  status: SubscriptionStatus;
  paymentStatus: PaymentStatus;
  startDate: string | null;
  expiryDate: string | null;
  activatedAt: string | null;
  expiredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  renewalCount: number;
  autoRenew: boolean;
  lastRenewedAt: string | null;
  transactionId: string | null;
  gateway: 'wallet' | 'phonepe' | 'cashfree' | 'razorpay' | 'payu' | 'test' | null;
  paymentMethod: string | null;
  walletUsed: boolean;
  walletAmount: number;
  isTrial: boolean;
  createdAt: string;
  updatedAt: string;
  purchaseIntent?: SubscriptionPurchaseIntent;
  scheduledAfterSubscriptionId?: string | null;
  nextSubscriptionId?: string | null;
}

export interface SubscriptionOverview {
  current: Subscription | null;
  active: Subscription | null;
  scheduled: Subscription | null;
}

export type HistoryAction =
  | 'purchase'
  | 'renew'
  | 'expire'
  | 'cancel'
  | 'refund'
  | 'payment_failed'
  | 'suspend'
  | 'reactivate'
  | 'admin_update';

export interface SubscriptionHistoryEntry {
  _id: string;
  driverId: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  action: HistoryAction;
  amount: number;
  currency: string;
  transactionId: string | null;
  paymentMethod: string | null;
  startDate: string | null;
  expiryDate: string | null;
  oldExpiryDate: string | null;
  newExpiryDate: string | null;
  walletUsed: boolean;
  walletAmount: number;
  remarks: string | null;
  createdAt: string;
}

/** Response from POST /subscriptions/purchase — hands off to a payment gateway. */
export interface InitiatePaymentResponse {
  success: boolean;
  message: string;
  gateway: string;
  subscriptionId: string;
  payment: Record<string, unknown>;
}

export interface CreatePlanPayload {
  name: string;
  slug: string;
  durationDays: number;
  amount: number;
  description?: string;
  sortOrder?: number;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  amount?: number;
  durationDays?: number;
  badge?: string;
  color?: string;
  sortOrder?: number;
  features?: string[];
  bookingLimitPerDay?: number;
  prioritySupport?: boolean;
  instantApproval?: boolean;
  commissionDiscount?: number;
  isPopular?: boolean;
  isRecommended?: boolean;
  isTrial?: boolean;
  isActive?: boolean;
}
