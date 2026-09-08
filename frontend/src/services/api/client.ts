import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// 1. IN-MEMORY TOKEN HOLDER (RAM only, protected against persistent XSS)
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// 2. DYNAMIC BASE URL NORMALIZATION (Safely handles Vite env in TypeScript)
const rawBaseUrl: string =
  (import.meta as { env?: { VITE_API_BASE_URL?: string; VITE_API_URL?: string } }).env?.VITE_API_BASE_URL ||
  (import.meta as { env?: { VITE_API_BASE_URL?: string; VITE_API_URL?: string } }).env?.VITE_API_URL ||
  "http://localhost:8000/api/v1";

// Ensure no trailing slash so path concatenation is deterministic
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, "");

export const apiClient: AxiosInstance = axios.create({
  baseURL: cleanBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  // Required to accept and transmit the HttpOnly refresh token cookie
  withCredentials: true,
});

// 3. CONCURRENT 401 QUEUE MUTEX
let isRefreshing = false;
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedRequestsQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedRequestsQueue = [];
};

// ============================================================================
// REQUEST INTERCEPTOR: Inject Bearer Access Token
// ============================================================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// RESPONSE INTERCEPTOR: Silent Token Refresh Queue & Auto-Retry
// ============================================================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Exit immediately if no response or if status is not 401
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Never loop-retry an already retried request
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Never intercept auth endpoints to avoid infinite refresh loops
    const requestUrl = originalRequest.url || "";
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    // If another request is currently refreshing the session, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedRequestsQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use raw axios instance to bypass interceptors during the refresh call
      const response = await axios.post<{ access_token: string }>(
        `${cleanBaseUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newAccessToken = response.data.access_token;
      setAccessToken(newAccessToken);

      // Replay all waiting queued requests with the fresh token
      processQueue(null, newAccessToken);

      // Retry original request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh token invalid/revoked/expired: clear state and broadcast logout
      processQueue(refreshError, null);
      setAccessToken(null);
      window.dispatchEvent(new Event("auth:session-expired"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);