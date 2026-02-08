import type { TenantAvailability } from "../domain/types";

export interface PlaceSummary {
  tenantName: string;
  tenantId: string;
  address: string;
  availableSlots: number;
  resourceCount: number;
  minPrice?: string;
  source: TenantAvailability;
}

export interface BookableSlot {
  tenantName: string;
  tenantId: string;
  resourceId: string;
  resourceName?: string;
  resourceType?: "indoor" | "outdoor" | "covered" | "unknown";
  startDate: string;
  startTime: string;
  duration: number;
  price: string;
}

export interface SlotPreview {
  startDate: string;
  startTime: string;
  timeZoneLabel: string;
  duration: number;
  price: string;
  courtName: string;
  type: string;
}
