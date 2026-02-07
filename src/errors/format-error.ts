import { ZodError } from "zod";
import { PlaytomicApiError } from "../adapters/playtomic/errors";

export interface ErrorFormatOptions {
  includeApiBody?: boolean;
}

export function formatErrorMessage(
  error: unknown,
  options: ErrorFormatOptions = {},
): string {
  const includeApiBody = options.includeApiBody ?? true;

  if (error instanceof PlaytomicApiError) {
    if (!includeApiBody) {
      return `${error.message} (HTTP ${error.status})`;
    }

    return `${error.message}\nHTTP status: ${error.status}\nResponse body:\n${error.responseBody}`;
  }

  if (error instanceof ZodError) {
    const issues = error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `- ${path}: ${issue.message}`;
      })
      .join("\n");

    return `Invalid input:\n${issues}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
