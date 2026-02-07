import type { TenantAvailability } from "../domain/types";

export type ViewMode = "loading" | "login" | "search";

export interface LoginFormState {
  email: string;
  password: string;
  focusField: "email" | "password";
  error: string;
}

export interface SearchState {
  query: string;
  date: string;
  focusField: "query" | "date";
  loading: boolean;
  error: string;
  results: TenantAvailability[];
}
