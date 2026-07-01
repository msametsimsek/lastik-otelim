import { getValidAccessToken } from "./authApi";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.megriva.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export const DEFAULT_PAGE = 0;
export const DEFAULT_PAGE_SIZE = 20;

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

export interface VehicleListParams extends GetListParams {
  clientId?: number;
}

export interface TireListParams extends GetListParams {
  vehicleId?: number;
  clientId?: number;
}


export interface HistoryListParams extends GetListParams {
  count?: number;
  typeConstantValue?: string;
}
export interface HistoryListItemDto {
  id: number;
  clientName: string;
  licensePlate: string;
  model: string;
  brand: string;
  count: number;
  sizes: string;
  code: string;
  typeConstantValue: string;
  typeConstantName: string;
  storageLocation: string | null;
  businessId: number;
  createdDate: string;
  createdUsername: string;
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
  projectName?: string;
  directoryName?: string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  url?: string;
  fileSize?: number;
  fileExtension?: string;
  fileType?: string;
  username?: string | null;
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
  tires?: TireListItemDto[];
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
  type: "TIRE_TYPE" | "TIRE_BRAND" | "HISTORY_TYPE" | string;
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
  uploadFiles?: UploadFileDto[];
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
  imageIds: number[];
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

function toSafeNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function normalizePaginatedResponse<T>(
  data: Partial<PaginatedResponse<T>> | null | undefined,
  params: GetListParams = {}
): PaginatedResponse<T> {
  const items = Array.isArray(data?.items) ? data.items : [];

  const index = toSafeNumber(data?.index, params.page ?? DEFAULT_PAGE);
  const size = toSafeNumber(
    data?.size,
    params.pageSize ?? DEFAULT_PAGE_SIZE
  );

  const count = toSafeNumber(data?.count, items.length);

  const safeSize = size > 0 ? size : DEFAULT_PAGE_SIZE;
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

function getErrorMessage(data: unknown): string {
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

  const directMessage =
    errorData.message ||
    errorData.Message ||
    errorData.error ||
    errorData.Error ||
    errorData.detail ||
    errorData.Detail ||
    errorData.title ||
    errorData.Title;

  if (directMessage) {
    return directMessage;
  }

  const firstValidationError = errorData.errors
    ? Object.values(errorData.errors).flat()[0]
    : undefined;

  return firstValidationError || "İşlem tamamlanamadı.";
}

function buildIdQuery(id: number) {
  const query = new URLSearchParams();
  query.set("Id", String(id));

  return query.toString();
}

function buildGetListQuery(params: GetListParams = {}) {
  const query = new URLSearchParams();

  query.set("PageRequest.Page", String(params.page ?? DEFAULT_PAGE));
  query.set(
    "PageRequest.PageSize",
    String(params.pageSize ?? DEFAULT_PAGE_SIZE)
  );

  const searchKey = params.searchKey?.trim();

  if (searchKey) {
    query.set("SearchKey", searchKey);
  }

  return query.toString();
}

function buildVehicleListQuery(params: VehicleListParams = {}) {
  const query = new URLSearchParams(buildGetListQuery(params));

  if (typeof params.clientId === "number" && params.clientId > 0) {
    query.set("ClientId", String(params.clientId));
  }

  return query.toString();
}

function buildTireListQuery(params: TireListParams = {}) {
  const query = new URLSearchParams(buildGetListQuery(params));

  if (typeof params.vehicleId === "number" && params.vehicleId > 0) {
    query.set("VehicleId", String(params.vehicleId));
  }

  if (typeof params.clientId === "number" && params.clientId > 0) {
    query.set("ClientId", String(params.clientId));
  }

  return query.toString();
}

function buildHistoryListQuery(params: HistoryListParams = {}) {
  const query = new URLSearchParams(buildGetListQuery(params));

  if (typeof params.count === "number" && params.count > 0) {
    query.set("Count", String(params.count));
  }

  const typeConstantValue = params.typeConstantValue?.trim();

  if (typeConstantValue) {
    query.set("TypeConstantValue", typeConstantValue);
  }

  return query.toString();
}

function buildEndpointWithQuery(endpoint: string, query: string) {
  return query ? `${endpoint}?${query}` : endpoint;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const token = await getValidAccessToken();

  const headers: HeadersInit = {
    accept: "*/*",
    Authorization: `Bearer ${token}`
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data as T;
}

export const clientApi = {
  async getClients(params: GetListParams = {}) {
    const response = await request<Partial<PaginatedResponse<ClientListItemDto>>>(
      buildEndpointWithQuery("/tire/Client/GetList", buildGetListQuery(params))
    );

    return normalizePaginatedResponse(response, params);
  },

  getClientById(id: number) {
    return request<ClientListItemDto>(
      buildEndpointWithQuery("/tire/Client/GetById", buildIdQuery(id))
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
  async getVehicles(params: VehicleListParams = {}) {
    const response = await request<
      Partial<PaginatedResponse<VehicleListItemDto>>
    >(
      buildEndpointWithQuery(
        "/tire/Vehicle/GetList",
        buildVehicleListQuery(params)
      )
    );

    return normalizePaginatedResponse(response, params);
  },

  getVehicleById(id: number) {
    return request<VehicleListItemDto>(
      buildEndpointWithQuery("/tire/Vehicle/GetById", buildIdQuery(id))
    );
  },

  addVehicle(payload: CreateVehiclePayload) {
    return request<VehicleListItemDto>("/tire/Vehicle/Add", "POST", payload);
  },

  updateVehicle(payload: UpdateVehiclePayload) {
    return request<VehicleListItemDto>("/tire/Vehicle/Update", "PUT", payload);
  }
};

export const constantApi = {
  async getConstants(params: GetListParams = {}) {
    const response = await request<
      Partial<PaginatedResponse<ConstantListItemDto>>
    >(
      buildEndpointWithQuery(
        "/tire/Constant/GetList",
        buildGetListQuery(params)
      )
    );

    return normalizePaginatedResponse(response, params);
  }
};

export const tireApi = {
  async getTires(
    pageOrParams: number | TireListParams = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE
  ) {
    const params =
      typeof pageOrParams === "number"
        ? { page: pageOrParams, pageSize }
        : pageOrParams;

    const response = await request<Partial<PaginatedResponse<TireListItemDto>>>(
      buildEndpointWithQuery("/tire/Tire/GetList", buildTireListQuery(params))
    );

    return normalizePaginatedResponse(response, params);
  },

  async getList(params: TireListParams = {}) {
    const response = await request<Partial<PaginatedResponse<TireListItemDto>>>(
      buildEndpointWithQuery("/tire/Tire/GetList", buildTireListQuery(params))
    );

    return normalizePaginatedResponse(response, params);
  },

  getTireById(id: number) {
    return request<TireListItemDto>(
      buildEndpointWithQuery("/tire/Tire/GetById", buildIdQuery(id))
    );
  },

  addTire(payload: CreateTirePayload) {
    return request<TireListItemDto>("/tire/Tire/Add", "POST", payload);
  },

  updateTire(payload: UpdateTirePayload) {
    return request<TireListItemDto>("/tire/Tire/Update", "PUT", payload);
  },

  deleteTire(id: number) {
    return request<void>("/tire/Tire/Delete", "DELETE", { id });
  }
};

export const historyApi = {
  async getHistories(params: HistoryListParams = {}) {
    const response = await request<
      Partial<PaginatedResponse<HistoryListItemDto>>
    >(
      buildEndpointWithQuery(
        "/tire/History/GetList",
        buildHistoryListQuery(params)
      )
    );

    return normalizePaginatedResponse(response, params);
  },

  getHistoryById(id: number) {
    return request<HistoryListItemDto>(
      buildEndpointWithQuery("/tire/History/GetById", buildIdQuery(id))
    );
  }
};