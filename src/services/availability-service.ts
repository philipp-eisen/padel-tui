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

function formatLocalDayBounds(date: Date): { min: string; max: string } {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const base = `${year}-${month}-${day}`;
  return {
    min: `${base}T00:00:00`,
    max: `${base}T23:59:59`,
  };
}

function parseDate(input?: string): Date {
  if (!input) {
    return new Date();
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date '${input}'. Use YYYY-MM-DD.`);
  }
  return date;
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
        throw new Error("Search query is required when --near is not provided.");
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
    const results: TenantAvailability[] = [];

    for (const tenant of scopedTenants) {
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

      results.push({ tenant, resources });
    }

    return results;
  }
}
