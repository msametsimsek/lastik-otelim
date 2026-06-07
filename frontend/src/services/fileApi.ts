import { getValidAccessToken } from "./authApi";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.teggsoft.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

const STATIC_FILE_BASE_URL = (
  import.meta.env.VITE_STATIC_FILE_BASE_URL ||
  "https://statik.teggsoft.com/files"
).replace(/\/$/, "");

const FILE_PROJECT_NAME = "lastikci";
const FILE_DIRECTORY_NAME = "images";

export interface FileDetailDto {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileExtension: string;
  imageSize?: "thumb" | "small" | "medium" | "large" | string;
  width?: number;
  height?: number;
}

export interface UploadedFileDto {
  id: number;
  orginalName?: string;
  originalName?: string;
  projectName: string;
  directoryName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileExtension: string;
  fileType: string;
  username: string;
  uploadDate: string;
  details?: FileDetailDto[];
}

function getErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return "İşlem tamamlanamadı.";
  }

  const errorData = data as {
    message?: string;
    Message?: string;
    title?: string;
    Title?: string;
    detail?: string;
    Detail?: string;
    errors?: Record<string, string[]>;
  };

  if (errorData.message) return errorData.message;
  if (errorData.Message) return errorData.Message;
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

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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
    throw new Error(getErrorMessage(data));
  }

  return data as T;
}

export function buildFilePublicUrl(fileUrl?: string | null) {
  if (!fileUrl) return "";

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  const cleanFileUrl = fileUrl.replace(/^\/+/, "");

  return `${STATIC_FILE_BASE_URL}/${cleanFileUrl}`;
}

export function pickImagePreviewUrl(file?: UploadedFileDto | null) {
  if (!file) return "";

  const details = file.details || [];

  const preferred =
    details.find((item) => item.imageSize === "small") ||
    details.find((item) => item.imageSize === "medium") ||
    details.find((item) => item.imageSize === "thumb") ||
    details[0];

  return buildFilePublicUrl(preferred?.fileUrl || file.fileUrl);
}

export const fileApi = {
  async uploadFile(file: File) {
    const token = await getValidAccessToken();

    const formData = new FormData();

    formData.append("ProjectName", FILE_PROJECT_NAME);
    formData.append("DirectoryName", FILE_DIRECTORY_NAME);
    formData.append("File", file);

    const response = await fetch(`${API_BASE_URL}/tire/Files/Add`, {
      method: "POST",
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    return data as UploadedFileDto;
  },

  getFile(id: number) {
    return requestJson<UploadedFileDto>(`/tire/Files/${id}`, {
      method: "GET"
    });
  },

  deleteFile(id: number) {
    return requestJson<void>(`/tire/Files?id=${id}`, {
      method: "DELETE"
    });
  }
};