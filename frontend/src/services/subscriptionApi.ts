import {
  SubscriptionPlanId,
  UserSubscription,
  SubscriptionBillingCycle
} from "../types";

export type BillingCycle = SubscriptionBillingCycle;

export interface SubscriptionPaymentCard {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  registerCard: boolean;
}

export interface SubscriptionBillingInfo {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface InitializeSubscriptionPaymentPayload {
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
  card: SubscriptionPaymentCard;
  billingInfo: SubscriptionBillingInfo;
  returnUrl: string;
}

export interface InitializeSubscriptionPaymentResponse {
  success: boolean;
  message: string;
  requires3ds: boolean;
  threeDSHtmlContent?: string;
  providerReference?: string;
  subscription?: UserSubscription;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const PLAN_NAME_MAP: Record<SubscriptionPlanId, string> = {
  starter: "Başlangıç",
  pro: "Pro",
  enterprise: "Kurumsal"
};

const PLAN_AMOUNT_MAP: Record<BillingCycle, Record<SubscriptionPlanId, number>> = {
  monthly: {
    starter: 299,
    pro: 499,
    enterprise: 899
  },
  yearly: {
    starter: 2990,
    pro: 4990,
    enterprise: 8990
  }
};

function normalizeOnlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

function createMockSubscription(
  planId: SubscriptionPlanId,
  billingCycle: BillingCycle
): UserSubscription {
  const now = new Date();
  const renewalDate = new Date(now);

  if (billingCycle === "yearly") {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }

  return {
    id: "sub-" + Date.now(),
    planId,
    planName: PLAN_NAME_MAP[planId],
    status: "active",
    isActive: true,
    billingCycle,
    amount: PLAN_AMOUNT_MAP[billingCycle][planId],
    currency: "TRY",
    startedAt: now.toISOString(),
    renewalDate: renewalDate.toISOString(),
    periodEndAt: renewalDate.toISOString()
  };
}

export const SubscriptionApi = {
  async initializePayment(
    payload: InitializeSubscriptionPaymentPayload
  ): Promise<InitializeSubscriptionPaymentResponse> {
    const cleanPayload: InitializeSubscriptionPaymentPayload = {
      ...payload,
      card: {
        ...payload.card,
        cardHolderName: payload.card.cardHolderName.trim(),
        cardNumber: normalizeOnlyNumbers(payload.card.cardNumber),
        expireMonth: normalizeOnlyNumbers(payload.card.expireMonth),
        expireYear: normalizeOnlyNumbers(payload.card.expireYear),
        cvc: normalizeOnlyNumbers(payload.card.cvc)
      },
      billingInfo: {
        fullName: payload.billingInfo.fullName.trim(),
        phone: payload.billingInfo.phone.trim(),
        email: payload.billingInfo.email?.trim() || undefined,
        address: payload.billingInfo.address?.trim() || undefined
      }
    };

    /*
      Backend henüz yokken mock ödeme çalışır.
      Backend gelince .env içine VITE_API_BASE_URL eklenirse
      otomatik gerçek endpoint'e istek atar.

      Örnek:
      VITE_API_BASE_URL=https://api.domain.com
    */
    if (!API_BASE_URL) {
      await new Promise((resolve) => setTimeout(resolve, 900));

      return {
        success: true,
        message: "Ödeme başarıyla tamamlandı.",
        requires3ds: false,
        providerReference: "mock-" + Date.now(),
        subscription: createMockSubscription(
          cleanPayload.planId,
          cleanPayload.billingCycle
        )
      };
    }

    const response = await fetch(
      `${API_BASE_URL}/api/subscriptions/payment/initialize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cleanPayload)
      }
    );

    if (!response.ok) {
      throw new Error("Ödeme başlatılırken sunucu hatası oluştu.");
    }

    const data = (await response.json()) as InitializeSubscriptionPaymentResponse;

    return data;
  }
};