import type {
  AvailabilityResource,
  CreatePaymentIntentInput,
  Credentials,
  MatchListInput,
  MatchSummary,
  PaymentIntent,
  Session,
  Tenant,
  UpdatePaymentIntentInput,
} from "../../domain/types";

export interface AvailabilityQuery {
  tenantIds: string[];
  localStartMin: string;
  localStartMax: string;
  sportId: string;
  userId?: string;
}

export interface TenantLocationQuery {
  lat: number;
  lon: number;
  radiusMeters: number;
  sportId?: string;
  size?: number;
}

export interface PlaytomicApi {
  login(input: Credentials): Promise<Session>;
  refreshSession(refreshToken: string): Promise<Session>;
  searchTenants(query: string, session: Session): Promise<Tenant[]>;
  searchTenantsByLocation(query: TenantLocationQuery, session: Session): Promise<Tenant[]>;
  createPaymentIntent(
    input: CreatePaymentIntentInput,
    session: Session,
  ): Promise<PaymentIntent>;
  updatePaymentIntent(
    paymentIntentId: string,
    input: UpdatePaymentIntentInput,
    session: Session,
  ): Promise<PaymentIntent>;
  confirmPaymentIntent(
    paymentIntentId: string,
    session: Session,
  ): Promise<PaymentIntent>;
  getPaymentIntent(paymentIntentId: string, session: Session): Promise<PaymentIntent>;
  getAvailability(
    query: AvailabilityQuery,
    session: Session,
  ): Promise<AvailabilityResource[]>;
  listMatches(input: MatchListInput, session: Session): Promise<MatchSummary[]>;
  getMatch(matchId: string, session: Session): Promise<MatchSummary>;
  cancelMatch(matchId: string, reasonCode: string, session: Session): Promise<MatchSummary>;
}
