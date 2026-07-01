import {
  SubscriptionPlanId,
  UserSubscription,
  SubscriptionBillingCycle
} from "../types";

import { getValidAccessToken } from "./authApi";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.megriva.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

const SUBSCRIPTION_PAYMENT_INITIALIZE_URL =
  import.meta.env.VITE_SUBSCRIPTION_PAYMENT_INITIALIZE_URL || "";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type BillingCycle = SubscriptionBillingCycle;

export interface PaginatedSubscriptionResponse<T> {
  items: T[];
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Backend plan response.
 * Not: Backend tarafında "vatInculededPrice" typo olarak geliyor.
 * Güvenli olmak için hem typo'lu hem doğru yazımı destekliyoruz.
 */
export interface SubscriptionPlanDto {
  id: number;
  name: string;
  price: number;
  vatPercent: string | null;
  vatPrice: number;
  vatInculededPrice: number;
  vatIncludedPrice?: number;
  durationDays: number;
  description: string | null;
  status: boolean;
}

export interface GetSubscriptionPlansParams {
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}

export interface SubscriptionListDto {
  id?: number;
  businessId?: number;
  subscriptionPlanId?: number;
  subscriptionPlanName?: string;
  planId?: number;
  planName?: string;
  status?: string | number | boolean;
  isActive?: boolean;
  autoRenew?: boolean;
  price?: number;
  amount?: number;
  startDate?: string;
  startedAt?: string;
  endDate?: string;
  periodEndAt?: string;
  renewalDate?: string;
  createdDate?: string;
  cancelledAt?: string | null;
  [key: string]: unknown;
}

export interface GetSubscriptionsParams {
  page?: number;
  pageSize?: number;
}

export interface CreateBankTransferPaymentPayload {
  subscriptionPlanId: number;
  identityNumber: string;
  shippingAddressId: number;
  billingAddressId?: number | null;
  useShippingAsBilling: boolean;
}

export interface SubscriptionPaymentResponse {
  success?: boolean;
  message?: string;
  transactionId?: string;
  referenceCode?: string;
  subscriptionPlan?: string;
  amount?: number;
  subscriptionId?: number;
  paymentId?: number;
  status?: string | number | boolean;
  [key: string]: unknown;
}

export interface ThreeDSInitializePaymentCard {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  registerCard: boolean;
}

export interface ThreeDSRegisteredPaymentCard {
  cardUserKey: string;
  cardToken: string;
}

export interface CreateThreeDSInitializePayload {
  subscriptionPlanId: number;
  identityNumber: string;
  shippingAddressId: number;
  billingAddressId?: number | null;
  useShippingAsBilling: boolean;
  autoRenew: boolean;
  paymentCard?: ThreeDSInitializePaymentCard;
  registeredPaymentCard?: ThreeDSRegisteredPaymentCard;
}

export interface ThreeDSInitializeResponse {
  success?: boolean;
  message?: string;
  providerReference?: string;
  htmlContent?: string;
  threeDSHtmlContent?: string;
  paymentPageUrl?: string;
  redirectUrl?: string;
  transactionId?: string;
  conversationId?: string;
  paymentId?: string;
  provider?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  status?: string | number | boolean;
  [key: string]: unknown;
}

/**
 * Legacy ödeme tipi.
 * Şu an ana akışta PaymentViaBankTransfer ve ThreedsInitialize kullanıyoruz.
 * Eski kullanım varsa bozulmasın diye korundu.
 */
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

function normalizeOnlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

function getApiErrorMessage(data: unknown): string {
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

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
    if (firstError) return firstError;
  }

  return "İşlem tamamlanamadı.";
}

async function subscriptionRequest<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      accept: "*/*",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  return data as T;
}

function toSafeNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function buildPagedQuery(params: { page?: number; pageSize?: number } = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("Page", String(params.page ?? 0));
  searchParams.set("PageSize", String(params.pageSize ?? 20));

  return searchParams.toString();
}

function normalizeSubscriptionPlanListResponse(
  data:
    | Partial<PaginatedSubscriptionResponse<SubscriptionPlanDto>>
    | null
    | undefined,
  params: GetSubscriptionPlansParams
): PaginatedSubscriptionResponse<SubscriptionPlanDto> {
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  const items =
    params.activeOnly === false
      ? rawItems
      : rawItems.filter((plan) => plan.status !== false);

  const index = toSafeNumber(data?.index, params.page ?? 0);
  const size = toSafeNumber(data?.size, params.pageSize ?? 20);
  const count = toSafeNumber(data?.count, items.length);

  const safeSize = size > 0 ? size : 20;
  const pages = toSafeNumber(data?.pages, Math.ceil(count / safeSize));

  const hasPrevious =
    typeof data?.hasPrevious === "boolean" ? data.hasPrevious : index > 0;

  const hasNext =
    typeof data?.hasNext === "boolean"
      ? data.hasNext
      : pages > 0 && index + 1 < pages;

  return {
    items,
    index,
    size,
    count,
    pages,
    hasPrevious,
    hasNext
  };
}

function sanitizeLegacyPaymentPayload(
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

function sanitizeThreeDSPaymentCard(card: ThreeDSInitializePaymentCard) {
  return {
    cardHolderName: card.cardHolderName.trim(),
    cardNumber: normalizeOnlyNumbers(card.cardNumber),
    expireMonth: normalizeOnlyNumbers(card.expireMonth),
    expireYear: normalizeOnlyNumbers(card.expireYear),
    cvc: normalizeOnlyNumbers(card.cvc),
    registerCard: card.registerCard ? 1 : 0
  };
}

export const SubscriptionApi = {
  async getPlans(
    params: GetSubscriptionPlansParams = {}
  ): Promise<PaginatedSubscriptionResponse<SubscriptionPlanDto>> {
    const query = buildPagedQuery(params);

    const data = await subscriptionRequest<
      PaginatedSubscriptionResponse<SubscriptionPlanDto>
    >(`/tire/SubscriptionPlan/GetList?${query}`, "GET");

    return normalizeSubscriptionPlanListResponse(data, params);
  },

  async getSubscriptions(
    params: GetSubscriptionsParams = {}
  ): Promise<PaginatedSubscriptionResponse<SubscriptionListDto>> {
    const query = buildPagedQuery(params);

    return subscriptionRequest<PaginatedSubscriptionResponse<SubscriptionListDto>>(
      `/tire/Subscription/GetList?${query}`,
      "GET"
    );
  },

  async createBankTransferPayment(
    payload: CreateBankTransferPaymentPayload
  ): Promise<SubscriptionPaymentResponse> {
    return subscriptionRequest<SubscriptionPaymentResponse>(
      "/tire/SubscriptionPayment/PaymentViaBankTransfer",
      "POST",
      {
        subscriptionPlanId: payload.subscriptionPlanId,
        identityNumber: normalizeOnlyNumbers(payload.identityNumber),
        shippingAddressId: payload.shippingAddressId,
        billingAddressId: payload.billingAddressId ?? null,
        useShippingAsBilling: payload.useShippingAsBilling
      }
    );
  },

  async initializeThreeDSPayment(
    payload: CreateThreeDSInitializePayload
  ): Promise<ThreeDSInitializeResponse> {
    return subscriptionRequest<ThreeDSInitializeResponse>(
      "/tire/SubscriptionPayment/ThreedsInitialize",
      "POST",
      {
        subscriptionPlanId: payload.subscriptionPlanId,
        identityNumber: normalizeOnlyNumbers(payload.identityNumber),
        shippingAddressId: payload.shippingAddressId,
        billingAddressId: payload.billingAddressId ?? null,
        useShippingAsBilling: payload.useShippingAsBilling,
        autoRenew: payload.autoRenew,
        registeredPaymentCard: payload.registeredPaymentCard
          ? {
              cardUserKey: payload.registeredPaymentCard.cardUserKey,
              cardToken: payload.registeredPaymentCard.cardToken
            }
          : null,
        paymentCard: payload.paymentCard
          ? sanitizeThreeDSPaymentCard(payload.paymentCard)
          : null
      }
    );
  },

  async initializePayment(
    payload: InitializeSubscriptionPaymentPayload
  ): Promise<InitializeSubscriptionPaymentResponse> {
    if (!SUBSCRIPTION_PAYMENT_INITIALIZE_URL) {
      throw new Error(
        "Abonelik ödeme endpoint'i henüz tanımlı değil. Sahte ödeme işlemi yapılmadı."
      );
    }

    const token = await getValidAccessToken();
    const cleanPayload = sanitizeLegacyPaymentPayload(payload);

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