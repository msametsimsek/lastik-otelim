import {
  SubscriptionPlanId,
  UserSubscription,
  SubscriptionBillingCycle
} from "../types";

import { getValidAccessToken } from "./authApi";

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

/**
 * Abonelik/ödeme endpoint'i backend tarafında netleşene kadar
 * bu servis sahte ödeme sonucu üretmez.
 *
 * Endpoint hazır olduğunda .env içine özel olarak eklenmeli:
 *
 * VITE_SUBSCRIPTION_PAYMENT_INITIALIZE_URL=https://gateway.teggsoft.com/tire/...
 */
const SUBSCRIPTION_PAYMENT_INITIALIZE_URL =
  import.meta.env.VITE_SUBSCRIPTION_PAYMENT_INITIALIZE_URL || "";

function normalizeOnlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

function getApiErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "İşlem tamamlanamadı.";
  }

  const errorData = data as {
    message?: string;
    Message?: string;
    error?: string;
    Error?: string;
    title?: string;
    Title?: string;
    detail?: string;
    Detail?: string;
    errors?: Record<string, string[]>;
  };

  if (errorData.message) return errorData.message;
  if (errorData.Message) return errorData.Message;
  if (errorData.error) return errorData.error;
  if (errorData.Error) return errorData.Error;
  if (errorData.title) return errorData.title;
  if (errorData.Title) return errorData.Title;
  if (errorData.detail) return errorData.detail;
  if (errorData.Detail) return errorData.Detail;

  if (errorData.errors) {
    const firstError = Object.values(errorData.errors).flat()[0];

    if (firstError) {
      return firstError;
    }
  }

  return "İşlem tamamlanamadı.";
}

function sanitizePaymentPayload(
  payload: InitializeSubscriptionPaymentPayload
): InitializeSubscriptionPaymentPayload {
  return {
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
}

export const SubscriptionApi = {
  async initializePayment(
    payload: InitializeSubscriptionPaymentPayload
  ): Promise<InitializeSubscriptionPaymentResponse> {
    if (!SUBSCRIPTION_PAYMENT_INITIALIZE_URL) {
      throw new Error(
        "Abonelik ödeme endpoint'i henüz tanımlı değil. Sahte ödeme işlemi yapılmadı."
      );
    }

    const token = await getValidAccessToken();
    const cleanPayload = sanitizePaymentPayload(payload);

    const response = await fetch(SUBSCRIPTION_PAYMENT_INITIALIZE_URL, {
      method: "POST",
      headers: {
        accept: "*/*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(cleanPayload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(getApiErrorMessage(data));
    }

    return data as InitializeSubscriptionPaymentResponse;
  }
};