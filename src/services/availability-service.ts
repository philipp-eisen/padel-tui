import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import type {
  AvailabilitySearchInput,
  Session,
  TenantAvailability,
} from "../domain/types";
import ky from "ky";

interface AvailabilityServiceOptions {
  defaultSportId: string;
}

interface GeocodingResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
  }>;
}

const DEFAULT_RADIUS_METERS = 50_000;
const AVAILABILITY_CONCURRENCY = 5;

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<U>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index]!, index);
    }
  });

  await Promise.all(workers);
  return results;
}

async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
  const response = await ky
    .get("https://geocoding-api.open-meteo.com/v1/search", {
      searchParams: {
        name: query,
        count: "1",
        language: "en",
        format: "json",
      },
      timeout: 10_000,
      headers: {
        "user-agent": "padel-tui geocoding",
      },
    })
    .json<GeocodingResponse>();

  const first = response.results?.[0];
  if (!first) {
    return null;
  }

  return {
    lat: first.latitude,
    lon: first.longitude,
  };
}

function formatLocalDayBounds(date: LocalDateParts): { min: string; max: string } {
  const year = `${date.year}`;
  const month = `${date.month}`.padStart(2, "0");
  const day = `${date.day}`.padStart(2, "0");
  const base = `${year}-${month}-${day}`;
  return {
    min: `${base}T00:00:00`,
    max: `${base}T23:59:59`,
  };
}

function parseDate(input?: string): LocalDateParts {
  if (!input) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }

  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) {
    throw new Error(`Invalid date '${input}'. Use YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() + 1 === month &&
    utcDate.getUTCDate() === day;

  if (!isValidDate) {
    throw new Error(`Invalid date '${input}'. Use YYYY-MM-DD.`);
  }

  return { year, month, day };
}

export class AvailabilityService {
  constructor(
    private readonly api: PlaytomicApi,
    private readonly options: AvailabilityServiceOptions,
  ) {}

  async search(
    session: Session,
    input: AvailabilitySearchInput,
  ): Promise<TenantAvailability[]> {
    const sportId = input.sportId ?? this.options.defaultSportId;

    let tenants;
    if (input.near && input.near.trim().length > 0) {
      const coordinates = await geocodeLocation(input.near.trim());
      if (!coordinates) {
        throw new Error(`Could not geocode location '${input.near}'.`);
      }

      tenants = await this.api.searchTenantsByLocation(
        {
          lat: coordinates.lat,
          lon: coordinates.lon,
          radiusMeters: input.radiusMeters ?? DEFAULT_RADIUS_METERS,
          sportId,
        },
        session,
      );
    } else {
      if (!input.query || input.query.trim().length === 0) {
        throw new Error("Search term is required when location is not provided.");
      }

      tenants = await this.api.searchTenants(input.query, session);
    }

    const filteredTenants = input.tenantId
      ? tenants.filter((tenant) => tenant.tenantId === input.tenantId)
      : tenants;

    const scopedTenants =
      typeof input.maxTenants === "number"
        ? filteredTenants.slice(0, input.maxTenants)
        : filteredTenants;

    const dayBounds = formatLocalDayBounds(parseDate(input.date));

    return mapWithConcurrency(scopedTenants, AVAILABILITY_CONCURRENCY, async (tenant) => {
      const resources = await this.api.getAvailability(
        {
          tenantIds: [tenant.tenantId],
          localStartMin: dayBounds.min,
          localStartMax: dayBounds.max,
          sportId,
          userId: "me",
        },
        session,
      );

      return { tenant, resources };
    });
  }
}
