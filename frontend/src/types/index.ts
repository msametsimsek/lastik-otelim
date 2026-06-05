export type Customer = {
  id: string;
  fullName: string;
  phone: string;
  createdAt: string;
  updatedAt?: string;
  isActive?: boolean;
};

export type Vehicle = {
  id: string;
  customerId: string;
  plate: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export type TirePhoto = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
};

export type TireType = "Yazlık" | "Kışlık" | "4 Mevsim";

export type TireRecord = {
  id: string;
  customerId: string;
  vehicleId: string;
  tireCode: string;
  tireType: TireType;
  brand: string;
  size: string;
  quantity: number;
  storageLocation?: string;
  vehicleNote?: string;
  photos: TirePhoto[];
  createdAt: string;
  updatedAt?: string;

  status?: "active" | "delivered";
  deliveredAt?: string;
  deletedAt?: string;
  deliveryNote?: string;
  deletedReason?: string;

  snapshot?: {
    customerName: string;
    phone: string;
    plate: string;
    tireCode?: string;
    tireType?: string;
    brand?: string;
    size?: string;
    quantity?: number;
    storageLocation?: string;
    vehicleNote?: string;
  };
};

export interface SystemStats {
  totalRecords: number;
  inStorage: number;
  totalCustomers: number;
  addedThisMonth: number;
  printedLabelsCount: number;
}

export interface AppSettings {
  businessName: string;
  businessType: string;
  phone: string;
  address: string;
}

export type SubscriptionPlanId = "starter" | "pro" | "enterprise";

export type SubscriptionStatus = "inactive" | "active" | "cancelled" | "expired";
export type SubscriptionBillingCycle = "monthly" | "yearly";

export interface UserSubscription {
  id: string;
  planId: SubscriptionPlanId | null;
  planName: string;
  status: SubscriptionStatus;
  isActive: boolean;
  billingCycle?: SubscriptionBillingCycle;
  amount?: number;
  currency?: "TRY";
  startedAt?: string;
  renewalDate?: string;
  periodEndAt?: string;
  cancelledAt?: string;
}

export type ActiveTab =
  | "dashboard"
  | "add-tire"
  | "records"
  | "customers"
  | "storage"
  | "subscription"
  | "settings"
  | "reminders";

export interface AuthUser {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  password?: string;
  phone: string;
  businessType: string;
  address: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}
