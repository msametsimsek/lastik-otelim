const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.teggsoft.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface PaginatedResponse<T> {
  items: T[];
  index: number;
  size: number;
  count: number;
  pages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface GetListParams {
  page?: number;
  pageSize?: number;
  searchKey?: string;
}

export interface UploadFileDetailDto {
  id?: number;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileExtension?: string;
  imageSize?: "thumb" | "small" | "medium" | "large" | string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface UploadFileDto {
  id?: number;
  fileId?: number;
  orginalName?: string;
  originalName?: string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  url?: string;
  fileSize?: number;
  fileExtension?: string;
  fileType?: string;
  uploadDate?: string;
  details?: UploadFileDetailDto[];
  [key: string]: unknown;
}

export interface ClientListItemDto {
  id: number;
  name: string;
  phone: string;
  note: string | null;
  createdDate: string;
  createdUsername: string;
}

export interface CreateClientPayload {
  name: string;
  phone: string;
  note: string;
}

export interface UpdateClientPayload {
  id: number;
  name: string;
  phone: string;
  note: string;
}

export interface VehicleListItemDto {
  id: number;
  licensePlate: string;
  note: string | null;
  clientId: number;
  clientName: string;
  createdDate: string;
  createdUsername: string;
  uploadFiles?: UploadFileDto[];
}

export interface CreateVehiclePayload {
  licensePlate: string;
  note: string;
  clientId: number;
  imageIds: number[];
}

export interface UpdateVehiclePayload {
  id: number;
  licensePlate: string;
  note: string;
  imageIds: number[];
}

export interface ConstantListItemDto {
  id: number;
  name: string;
  value: string;
  type: "TIRE_TYPE" | "TIRE_BRAND" | string;
  createdDate: string;
}

export interface TireListItemDto {
  id: number;
  vehicleId: number;
  vehicleLicensePlate: string;
  modelConstantId: number;
  modelConstantName: string;
  brandConstantId: number;
  brandConstantName: string;
  sizes: string;
  count: number;
  code: string;
  clientName: string;
  storageLocation: string | null;
  createdDate: string;
  createdUsername: string;
}

export interface TireClientPayload {
  id: number | null;
  name: string | null;
  phone: string | null;
}

export interface TireVehiclePayload {
  id: number | null;
  licensePlate: string | null;
  note: string | null;
  imageIds: number[];
}

export interface CreateTirePayload {
  client: TireClientPayload;
  vehicle: TireVehiclePayload;
  modelConstantId: number;
  brandConstantId: number;
  sizes: string;
  count: number;
  storageLocation: string;
}

export interface UpdateTirePayload {
  id: number;
  modelConstantId: number;
  brandConstantId: number;
  sizes: string;
  count: number;
  storageLocation: string;
}

export const searchPlaceholders = {
  client: "İsim, telefon veya nota göre ara...",
  vehicle: "Plaka, müşteri adı, telefon veya nota göre ara...",
  tire: "Plaka, müşteri adı veya ebata göre ara..."
};

function getAccessToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function getErrorMessage(data: unknown) {
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

function buildGetListQuery(params: GetListParams = {}) {
  const query = new URLSearchParams();

  query.set("pageRequest.Page", String(params.page ?? 0));
  query.set("pageRequest.PageSize", String(params.pageSize ?? 1000));

  const searchKey = params.searchKey?.trim();

  if (searchKey) {
    query.set("searchKey", searchKey);
  }

  return query.toString();
}

async function request<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data as T;
}

export const clientApi = {
  getClients(params: GetListParams = {}) {
    return request<PaginatedResponse<ClientListItemDto>>(
      `/tire/Client/GetList?${buildGetListQuery(params)}`
    );
  },

  addClient(payload: CreateClientPayload) {
    return request<ClientListItemDto>("/tire/Client/Add", "POST", payload);
  },

  updateClient(payload: UpdateClientPayload) {
    return request<ClientListItemDto>("/tire/Client/Update", "PUT", payload);
  }
};

export const vehicleApi = {
  getVehicles(params: GetListParams = {}) {
    return request<PaginatedResponse<VehicleListItemDto>>(
      `/tire/Vehicle/GetList?${buildGetListQuery(params)}`
    );
  },

  getVehicleById(id: number) {
    return request<VehicleListItemDto>(`/tire/Vehicle/GetById?id=${id}`);
  },

  addVehicle(payload: CreateVehiclePayload) {
    return request<VehicleListItemDto>("/tire/Vehicle/Add", "POST", payload);
  },

  updateVehicle(payload: UpdateVehiclePayload) {
    return request<VehicleListItemDto>("/tire/Vehicle/Update", "PUT", payload);
  }
};

export const constantApi = {
  getConstants(params: GetListParams = {}) {
    return request<PaginatedResponse<ConstantListItemDto>>(
      `/tire/Constant/GetList?${buildGetListQuery(params)}`
    );
  }
};

export const tireApi = {
  getTires(pageOrParams: number | GetListParams = 0, pageSize = 1000) {
    const params =
      typeof pageOrParams === "number"
        ? { page: pageOrParams, pageSize }
        : pageOrParams;

    return request<PaginatedResponse<TireListItemDto>>(
      `/tire/Tire/GetList?${buildGetListQuery(params)}`
    );
  },

  getList(params: GetListParams = {}) {
    return request<PaginatedResponse<TireListItemDto>>(
      `/tire/Tire/GetList?${buildGetListQuery(params)}`
    );
  },

  addTire(payload: CreateTirePayload) {
    return request<TireListItemDto>("/tire/Tire/Add", "POST", payload);
  },

  updateTire(payload: UpdateTirePayload) {
    return request<TireListItemDto>("/tire/Tire/Update", "PUT", payload);
  }
};