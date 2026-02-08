import type { TenantAvailability } from "../domain/types";
import type { BookableSlot, PlaceSummary, SlotPreview } from "./types";

function parsePriceToNumber(price: string): number | null {
  const match = price.match(/\d+(\.\d+)?/u);
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function formatAddress(result: TenantAvailability): string {
  const city = result.tenant.city?.trim();
  return city && city.length > 0 ? city : "Unknown";
}

function compareSlotOrder(a: BookableSlot, b: BookableSlot): number {
  const aKey = `${a.startDate}T${a.startTime}`;
  const bKey = `${b.startDate}T${b.startTime}`;
  if (aKey < bKey) {
    return -1;
  }
  if (aKey > bKey) {
    return 1;
  }

  const aPrice = parsePriceToNumber(a.price) ?? Number.POSITIVE_INFINITY;
  const bPrice = parsePriceToNumber(b.price) ?? Number.POSITIVE_INFINITY;
  return aPrice - bPrice;
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftIsoDateByDays(input: string, deltaDays: number): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return input;
  }

  parsed.setDate(parsed.getDate() + deltaDays);
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHumanDate(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return input;
  }

  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function summarizeAvailablePlaces(results: TenantAvailability[]): PlaceSummary[] {
  const summaries: PlaceSummary[] = [];

  for (const result of results) {
    let availableSlots = 0;
    let minPriceValue: number | null = null;
    let minPriceLabel: string | undefined;

    for (const resource of result.resources) {
      for (const slot of resource.slots) {
        availableSlots += 1;
        const priceValue = parsePriceToNumber(slot.price);
        if (priceValue === null) {
          continue;
        }

        if (minPriceValue === null || priceValue < minPriceValue) {
          minPriceValue = priceValue;
          minPriceLabel = slot.price;
        }
      }
    }

    if (availableSlots === 0) {
      continue;
    }

    summaries.push({
      tenantName: result.tenant.tenantName,
      tenantId: result.tenant.tenantId,
      address: formatAddress(result),
      availableSlots,
      resourceCount: result.resources.length,
      minPrice: minPriceLabel,
      source: result,
    });
  }

  return summaries;
}

export function collectBookableSlots(result: TenantAvailability): BookableSlot[] {
  const slots: BookableSlot[] = [];

  const resourceMetaById = new Map(
    (result.tenant.resources ?? []).map((resource) => [resource.resourceId, resource]),
  );

  for (const resource of result.resources) {
    const resourceMeta = resourceMetaById.get(resource.resourceId);

    for (const slot of resource.slots) {
      slots.push({
        tenantName: result.tenant.tenantName,
        tenantId: result.tenant.tenantId,
        resourceId: resource.resourceId,
        resourceName: resourceMeta?.name,
        resourceType: resourceMeta?.resourceType,
        startDate: resource.startDate,
        startTime: slot.startTime,
        duration: slot.duration,
        price: slot.price,
      });
    }
  }

  slots.sort(compareSlotOrder);
  return slots;
}

export function pickPrimaryBookableSlot(result: TenantAvailability): BookableSlot | null {
  const slots = collectBookableSlots(result);
  return slots[0] ?? null;
}

export function pickBookableSlotByIndex(
  result: TenantAvailability,
  index: number,
): BookableSlot | null {
  const slots = collectBookableSlots(result);
  if (slots.length === 0) {
    return null;
  }

  const safeIndex = Math.max(0, Math.min(index, slots.length - 1));
  return slots[safeIndex] ?? null;
}

function formatSlotType(type: BookableSlot["resourceType"]): string {
  if (type === "indoor") {
    return "IN";
  }
  if (type === "outdoor") {
    return "OUT";
  }
  if (type === "covered") {
    return "COV";
  }
  return "UNK";
}

function formatUtcSlotInTimezone(
  startDate: string,
  startTime: string,
  timezone?: string,
): { startDate: string; startTime: string; timeZoneLabel: string } {
  const utcDate = new Date(`${startDate}T${startTime}Z`);
  if (Number.isNaN(utcDate.getTime())) {
    return {
      startDate,
      startTime,
      timeZoneLabel: timezone?.trim() || "UTC",
    };
  }

  const resolvedTimeZone = timezone?.trim() || "UTC";

  try {
    const dateLabel = new Intl.DateTimeFormat("en-CA", {
      timeZone: resolvedTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utcDate);

    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: resolvedTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).formatToParts(utcDate);

    const hour = timeParts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = timeParts.find((part) => part.type === "minute")?.value ?? "00";
    const timeZoneLabel =
      timeParts.find((part) => part.type === "timeZoneName")?.value ?? resolvedTimeZone;

    return {
      startDate: dateLabel,
      startTime: `${hour}:${minute}`,
      timeZoneLabel,
    };
  } catch {
    return {
      startDate,
      startTime,
      timeZoneLabel: resolvedTimeZone,
    };
  }
}

export function buildSlotPreview(result: TenantAvailability, limit?: number): SlotPreview[] {
  const allSlots = collectBookableSlots(result);
  const slots = typeof limit === "number" ? allSlots.slice(0, limit) : allSlots;
  return slots.map((slot) => ({
    ...formatUtcSlotInTimezone(slot.startDate, slot.startTime, result.tenant.timezone),
    duration: slot.duration,
    price: slot.price,
    courtName: slot.resourceName ?? slot.resourceId,
    type: formatSlotType(slot.resourceType),
  }));
}
