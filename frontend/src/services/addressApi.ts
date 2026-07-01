import { getValidAccessToken } from "./authApi";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.megriva.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface PaginatedAddressResponse<T> {
  items: T[];
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface AddressDto {
  id: number;
  type?: string | null;
  title?: string | null;
  contactName?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
  zipCode?: string | null;
  [key: string]: unknown;
}

export interface CreateAddressPayload {
  type: string;
  title: string;
  contactName: string;
  addressLine: string;
  city: string;
  country: string;
  zipCode: string;
}

export interface GetAddressesParams {
  page?: number;
  pageSize?: number;
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

async function addressRequest<T>(
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

function buildAddressQuery(params: GetAddressesParams = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("Page", String(params.page ?? 0));
  searchParams.set("PageSize", String(params.pageSize ?? 20));

  return searchParams.toString();
}

export const AddressApi = {
  async getList(
    params: GetAddressesParams = {}
  ): Promise<PaginatedAddressResponse<AddressDto>> {
    const query = buildAddressQuery(params);

    return addressRequest<PaginatedAddressResponse<AddressDto>>(
      `/tire/Address/GetList?${query}`,
      "GET"
    );
  },

  async add(payload: CreateAddressPayload): Promise<AddressDto> {
    return addressRequest<AddressDto>("/tire/Address/Add", "POST", {
      type: payload.type.trim(),
      title: payload.title.trim(),
      contactName: payload.contactName.trim(),
      addressLine: payload.addressLine.trim(),
      city: payload.city.trim(),
      country: payload.country.trim(),
      zipCode: payload.zipCode.trim()
    });
  }
};