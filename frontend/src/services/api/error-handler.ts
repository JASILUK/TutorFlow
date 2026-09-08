import { AxiosError } from "axios";
import { FieldValues, Path, UseFormSetError } from "react-hook-form";

export interface BackendErrorDetail {
  field?: string | null;
  message: string;
}

export interface BackendErrorResponse {
  error_code: string;
  message: string;
  status_code: number;
  details?: BackendErrorDetail[] | null;
}

export interface ParsedApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  fieldErrors: Record<string, string>;
}

/**
 * Universal error parser matching FastAPI's ErrorResponse schema
 */
export const parseApiError = (error: unknown): ParsedApiError => {
  // 1. Network / Offline / Connection Errors
  if (!(error instanceof AxiosError) || !error.response) {
    return {
      statusCode: 0,
      errorCode: "NETWORK_ERROR",
      message: "Unable to reach the server. Please check your internet connection.",
      fieldErrors: {},
    };
  }

  const { status, data } = error.response;
  const fieldErrors: Record<string, string> = {};

  // 2. Parse Backend Contract { error_code, message, status_code, details }
  if (data && typeof data === "object") {
    const backendData = data as Partial<BackendErrorResponse>;

    if (Array.isArray(backendData.details)) {
      backendData.details.forEach((item) => {
        if (item.field && item.field !== "unknown" && item.field !== "None") {
          fieldErrors[item.field] = item.message;
        }
      });
    }

    return {
      statusCode: backendData.status_code || status,
      errorCode: backendData.error_code || `HTTP_${status}`,
      message: backendData.message || "An unexpected error occurred.",
      fieldErrors,
    };
  }

  // 3. Fallback for raw / unformatted errors
  return {
    statusCode: status,
    errorCode: `HTTP_${status}`,
    message: "An unexpected server error occurred.",
    fieldErrors: {},
  };
};

/**
 * Maps parsed backend field errors straight into React Hook Form state
 */
export const applyFieldErrors = <T extends FieldValues>(
  fieldErrors: Record<string, string>,
  setError: UseFormSetError<T>
): void => {
  Object.entries(fieldErrors).forEach(([field, msg]) => {
    setError(field as Path<T>, {
      type: "server",
      message: msg,
    });
  });
};