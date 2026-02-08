import type { TenantAvailability } from "../domain/types";

export type ViewMode = "loading" | "login" | "search";
export type SearchMode = "location" | "name";
export type SearchFocusField = "search" | "results";

export interface LoginFormState {
  email: string;
  password: string;
  focusField: "email" | "password";
  error: string;
}

export interface SearchState {
  term: string;
  mode: SearchMode;
  date: string;
  focusField: SearchFocusField;
  loading: boolean;
  booking: boolean;
  selectedPlaceIndex: number;
  expandedPlaceIndex: number | null;
  selectedExpandedSlotIndex: number;
  pendingBookingPlaceIndex: number | null;
  bookingMessage: string;
  error: string;
  results: TenantAvailability[];
}
