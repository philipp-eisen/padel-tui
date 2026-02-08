export interface Credentials {
  email: string;
  password: string;
}

export interface Session {
  accessToken: string;
  accessTokenExpiration?: string;
  refreshToken?: string;
  refreshTokenExpiration?: string;
  userId: string;
}

export interface Tenant {
  tenantId: string;
  tenantName: string;
  city?: string;
  timezone?: string;
  resources?: TenantResource[];
}

export interface TenantResource {
  resourceId: string;
  name?: string;
  resourceType?: "indoor" | "outdoor" | "covered" | "unknown";
}

export interface AvailabilitySlot {
  startTime: string;
  duration: number;
  price: string;
}

export interface AvailabilityResource {
  resourceId: string;
  startDate: string;
  slots: AvailabilitySlot[];
}

export interface TenantAvailability {
  tenant: Tenant;
  resources: AvailabilityResource[];
}

export interface AvailabilitySearchInput {
  query?: string;
  near?: string;
  tenantId?: string;
  date?: string;
  sportId?: string;
  radiusMeters?: number;
  maxTenants?: number;
}

export type MatchStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "PLAYED"
  | "VALIDATING"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED"
  | "UNKNOWN";

export interface MatchSummary {
  matchId: string;
  status: MatchStatus;
  gameStatus: string;
  startDate: string;
  endDate: string;
  location: string;
  resourceName: string;
  tenantName: string;
  timezone?: string;
  ownerId?: string;
  joinedPlayers: number;
  totalPlayers: number;
  shareLink?: string;
  raw: unknown;
}

export interface MatchListInput {
  afterEndDate: string;
  beforeEndDate: string;
  matchStatus: string[];
  size?: number;
  userId?: string;
}

export interface PaymentMethod {
  paymentMethodId: string;
  methodType: string;
  name: string;
  data?: unknown;
}

export interface PaymentIntent {
  paymentIntentId: string;
  status: string;
  selectedPaymentMethodId?: string | null;
  nextPaymentAction?: string | null;
  nextPaymentActionData?: unknown;
  paymentId?: string | null;
  availablePaymentMethods: PaymentMethod[];
  raw: unknown;
}

export interface CreatePaymentIntentInput {
  tenantId: string;
  resourceId: string;
  start: string;
  duration: number;
  numberOfPlayers: number;
  userId?: string;
}

export interface UpdatePaymentIntentInput {
  selectedPaymentMethodId: string;
  selectedPaymentMethodData?: {
    stripe_return_url?: string;
  };
}

export interface PurchaseSlotInput {
  tenantId: string;
  resourceId: string;
  start: string;
  duration: number;
  numberOfPlayers: number;
  paymentMethodId?: string;
}
