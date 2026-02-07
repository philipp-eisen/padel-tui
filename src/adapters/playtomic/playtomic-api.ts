import type {
  AvailabilityResource,
  CreatePaymentIntentInput,
  Credentials,
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

export interface PlaytomicApi {
  login(input: Credentials): Promise<Session>;
  refreshSession(refreshToken: string): Promise<Session>;
  searchTenants(query: string, session: Session): Promise<Tenant[]>;
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
}
