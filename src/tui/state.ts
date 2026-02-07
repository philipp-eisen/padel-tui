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
  booking: boolean;
  selectedSlotIndex: number;
  pendingBookingSlotIndex: number | null;
  bookingMessage: string;
  error: string;
  results: TenantAvailability[];
}
