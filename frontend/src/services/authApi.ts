export interface AuthApiUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessId: number;
  businessSlug: string;
  status: boolean;
}

export interface AuthApiResponse {
  user: AuthApiUser;
  accessToken: {
    token: string;
    expiration: string;
  };
  refreshToken: string;
}

export interface RegisterPayload {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://gateway.megriva.com"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/tire")
  ? RAW_API_BASE_URL.slice(0, -5)
  : RAW_API_BASE_URL;

let refreshRequest: Promise<AuthApiResponse> | null = null;

function getApiErrorMessage(data: unknown) {
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

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  return data as T;
}

export function splitOwnerName(ownerName: string) {
  const parts = ownerName.trim().split(/\s+/);

  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");

  return {
    firstName,
    lastName
  };
}

export function saveAuthUser(user: AuthApiUser) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("businessId", String(user.businessId));
  localStorage.setItem("businessSlug", user.businessSlug || "");
}

export function saveAuthSession(authData: AuthApiResponse) {
  if (!authData?.accessToken?.token) {
    throw new Error("API response içinde access token bulunamadı.");
  }

  localStorage.setItem("token", authData.accessToken.token);
  localStorage.setItem("accessToken", authData.accessToken.token);
  localStorage.setItem("refreshToken", authData.refreshToken || "");
  localStorage.setItem("tokenExpiration", authData.accessToken.expiration || "");

  saveAuthUser(authData.user);
}

export function getStoredAuthUser(): AuthApiUser | null {
  const rawUser = localStorage.getItem("user");

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as AuthApiUser;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("tokenExpiration");
  localStorage.removeItem("user");
  localStorage.removeItem("businessId");
  localStorage.removeItem("businessSlug");
}

export function isAccessTokenExpired(bufferMs = 90_000) {
  const expiration = localStorage.getItem("tokenExpiration");

  if (!expiration) return false;

  const expirationTime = Date.parse(expiration);

  if (Number.isNaN(expirationTime)) return false;

  return Date.now() + bufferMs >= expirationTime;
}

async function getAuthDetailWithToken(token: string): Promise<AuthApiUser> {
  return request<AuthApiUser>("/tire/Auth/Detail", {
    method: "GET",
    headers: {
      accept: "*/*",
      Authorization: `Bearer ${token}`
    }
  });
}

export async function refreshAccessToken(): Promise<AuthApiResponse> {
  if (refreshRequest) {
    return refreshRequest;
  }

  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken) {
    throw new Error("Access token bulunamadı.");
  }

  if (!refreshToken) {
    throw new Error("Refresh token bulunamadı.");
  }

  refreshRequest = request<AuthApiResponse>(
    `/tire/Auth/RefreshToken?token=${encodeURIComponent(refreshToken)}`,
    {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${accessToken}`
      }
    }
  )
    .then((refreshedSession) => {
      saveAuthSession(refreshedSession);
      return refreshedSession;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

export async function getValidAccessToken() {
  const currentToken = getAccessToken();

  if (!currentToken) {
    throw new Error("Oturum token bilgisi bulunamadı.");
  }

  if (!isAccessTokenExpired()) {
    return currentToken;
  }

  const refreshedSession = await refreshAccessToken();

  return refreshedSession.accessToken.token;
}

export async function getAuthDetail(): Promise<AuthApiUser> {
  const currentToken = getAccessToken();

  if (!currentToken) {
    clearAuthSession();
    throw new Error("Oturum token bilgisi bulunamadı.");
  }

  if (isAccessTokenExpired()) {
    try {
      const refreshedSession = await refreshAccessToken();
      const user = await getAuthDetailWithToken(refreshedSession.accessToken.token);

      saveAuthUser(user);

      return user;
    } catch (error) {
      clearAuthSession();

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
    }
  }

  try {
    const user = await getAuthDetailWithToken(currentToken);

    saveAuthUser(user);

    return user;
  } catch {
    try {
      const refreshedSession = await refreshAccessToken();
      const user = await getAuthDetailWithToken(refreshedSession.accessToken.token);

      saveAuthUser(user);

      return user;
    } catch (refreshError) {
      clearAuthSession();

      if (refreshError instanceof Error) {
        throw refreshError;
      }

      throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
    }
  }
}

export async function revokeToken(): Promise<void> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken || !refreshToken) {
    return;
  }

  const response = await fetch(`${API_BASE_URL}/tire/Auth/RevokeToken`, {
    method: "PUT",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(refreshToken)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(getApiErrorMessage(data));
  }
}

export async function registerBusiness(payload: RegisterPayload): Promise<AuthApiResponse> {
  const { firstName, lastName } = splitOwnerName(payload.ownerName);

  return request<AuthApiResponse>("/tire/Auth/Register", {
    method: "POST",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: payload.email,
      firstName,
      lastName,
      password: payload.password,
      businessName: payload.businessName,
      phone: payload.phone
    })
  });
}

export async function loginBusiness(payload: LoginPayload): Promise<AuthApiResponse> {
  return request<AuthApiResponse>("/tire/Auth/Login", {
    method: "POST",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password
    })
  });
}