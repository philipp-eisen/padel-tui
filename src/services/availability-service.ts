import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import type {
  AvailabilitySearchInput,
  Session,
  TenantAvailability,
} from "../domain/types";

interface AvailabilityServiceOptions {
  defaultSportId: string;
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
    const tenants = await this.api.searchTenants(input.query, session);
    const limitedTenants = tenants.slice(0, input.maxTenants ?? 5);
    const dayBounds = formatLocalDayBounds(parseDate(input.date));
    const sportId = input.sportId ?? this.options.defaultSportId;

    const results: TenantAvailability[] = [];

    for (const tenant of limitedTenants) {
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
