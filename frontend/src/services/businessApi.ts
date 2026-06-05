import { AppSettings } from "../types";
import { getValidAccessToken } from "./authApi";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.teggsoft.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface BusinessApiResponse {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  slug: string;
  status: boolean;
  createdDate: string;
  imageFile: unknown | null;

  /**
   * Swagger response içinde her zaman görünmüyor.
   * Update request body içinde uploadFileId var.
   */
  uploadFileId?: number | null;
}

export interface UpdateBusinessPayload {
  name: string;
  address: string;
  phone: string;
  uploadFileId?: number | null;
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
    if (firstError) return firstError;
  }

  return "İşlem tamamlanamadı.";
}

async function businessRequest<T>(
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

export async function getBusinessById(): Promise<BusinessApiResponse> {
  return businessRequest<BusinessApiResponse>("/tire/Business/Get", "GET");
}

export async function updateBusiness(
  payload: UpdateBusinessPayload
): Promise<BusinessApiResponse> {
  const body: {
    name: string;
    address: string;
    phone: string;
    uploadFileId?: number;
  } = {
    name: payload.name,
    address: payload.address,
    phone: payload.phone
  };

  if (typeof payload.uploadFileId === "number") {
    body.uploadFileId = payload.uploadFileId;
  }

  return businessRequest<BusinessApiResponse>("/tire/Business/Update", "PUT", body);
}

export function mapBusinessToSettings(
  business: BusinessApiResponse,
  businessType: string
): AppSettings {
  return {
    businessName: business.name || "",
    businessType: businessType || "Oto Lastik & Servis",
    phone: business.phone || "",
    address: business.address || ""
  };
}