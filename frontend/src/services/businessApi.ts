import { AppSettings } from "../types";
import { getValidAccessToken } from "./authApi";

export interface BusinessApiResponse {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  slug: string;
  uploadFileId: number | null;
  status: boolean;
  createdDate: string;
  imageFile: unknown | null;
}

export interface UpdateBusinessPayload {
  name: string;
  address: string;
  phone: string;
  uploadFileId: number | null;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
    errors?: Record<string, string[]>;
  };

  if (errorData.message) return errorData.message;
  if (errorData.Message) return errorData.Message;
  if (errorData.error) return errorData.error;
  if (errorData.Error) return errorData.Error;
  if (errorData.title) return errorData.title;

  if (errorData.errors) {
    const firstError = Object.values(errorData.errors).flat()[0];
    if (firstError) return firstError;
  }

  return "İşlem tamamlanamadı.";
}

async function businessRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API adresi bulunamadı. frontend/.env içine VITE_API_BASE_URL ekleyin.");
  }

  const token = await getValidAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      accept: "*/*",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  return data as T;
}

export async function getBusinessById(): Promise<BusinessApiResponse> {
  return businessRequest<BusinessApiResponse>("/Business/Get", {
    method: "GET"
  });
}

export async function updateBusiness(
  payload: UpdateBusinessPayload
): Promise<BusinessApiResponse> {
  return businessRequest<BusinessApiResponse>("/Business/Update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: payload.name,
      address: payload.address,
      phone: payload.phone,
      uploadFileId: payload.uploadFileId
    })
  });
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