import type { AppConfig } from "../../config";
import type {
  AvailabilityResource,
  AvailabilitySlot,
  CreatePaymentIntentInput,
  Credentials,
  PaymentIntent,
  PaymentMethod,
  Session,
  Tenant,
  UpdatePaymentIntentInput,
} from "../../domain/types";
import { PlaytomicApiError } from "./errors";
import type { AvailabilityQuery, PlaytomicApi } from "./playtomic-api";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  session?: Session;
  userAgent?: string;
  includeRequestedWith?: boolean;
}

interface LoginResponse {
  access_token: string;
  access_token_expiration?: string;
  refresh_token?: string;
  refresh_token_expiration?: string;
  user_id: string;
}

interface RefreshResponse {
  access_token: string;
  access_token_expiration?: string;
  refresh_token?: string;
  refresh_token_expiration?: string;
  user_id: string;
}

interface TenantResponse {
  tenant_id: string;
  tenant_name: string;
  address?: {
    city?: string;
    timezone?: string;
  };
}

interface AvailabilityResponse {
  resource_id: string;
  start_date: string;
  slots: Array<{
    start_time: string;
    duration: number;
    price: string;
  }>;
}

interface PaymentIntentResponse {
  payment_intent_id: string;
  status: string;
  selected_payment_method_id?: string | null;
  next_payment_action?: string | null;
  next_payment_action_data?: unknown;
  payment_id?: string | null;
  available_payment_methods?: Array<{
    payment_method_id: string;
    method_type: string;
    name: string;
    data?: unknown;
  }>;
}

const DEFAULT_ALLOWED_PAYMENT_METHOD_TYPES = [
  "DIRECT",
  "QUICK_PAY",
  "CREDIT_CARD",
  "WALLET",
  "CASH",
  "MERCHANT_WALLET",
  "OFFER",
  "SWISH_STRIPE",
  "IDEAL",
  "BANCONTACT",
  "PAYPAL",
  "PAYTRAIL",
  "GOOGLE_PAY",
];

function mapPaymentIntent(response: PaymentIntentResponse): PaymentIntent {
  const methods: PaymentMethod[] = (response.available_payment_methods ?? []).map(
    (method) => ({
      paymentMethodId: method.payment_method_id,
      methodType: method.method_type,
      name: method.name,
      data: method.data,
    }),
  );

  return {
    paymentIntentId: response.payment_intent_id,
    status: response.status,
    selectedPaymentMethodId: response.selected_payment_method_id,
    nextPaymentAction: response.next_payment_action,
    nextPaymentActionData: response.next_payment_action_data,
    paymentId: response.payment_id,
    availablePaymentMethods: methods,
    raw: response,
  };
}

export class LivePlaytomicApi implements PlaytomicApi {
  constructor(private readonly config: AppConfig) {}

  async login(input: Credentials): Promise<Session> {
    const response = await this.request<LoginResponse>({
      method: "POST",
      path: "/v3/auth/login",
      body: input,
    });

    return {
      accessToken: response.access_token,
      accessTokenExpiration: response.access_token_expiration,
      refreshToken: response.refresh_token,
      refreshTokenExpiration: response.refresh_token_expiration,
      userId: response.user_id,
    };
  }

  async searchTenants(query: string, session: Session): Promise<Tenant[]> {
    const response = await this.request<TenantResponse[]>({
      path: "/v1/tenants",
      query: {
        playtomic_status: "ACTIVE",
        tenant_name: query,
        with_properties: "ALLOWS_CASH_PAYMENT,LIVE_TV_URL",
      },
      session,
    });

    return response.map((tenant) => ({
      tenantId: tenant.tenant_id,
      tenantName: tenant.tenant_name,
      city: tenant.address?.city,
      timezone: tenant.address?.timezone,
    }));
  }

  async refreshSession(refreshToken: string): Promise<Session> {
    const response = await this.request<RefreshResponse>({
      method: "POST",
      path: "/v3/auth/token",
      body: {
        refresh_token: refreshToken,
      },
      userAgent: "okhttp/4.12.0",
      includeRequestedWith: false,
    });

    return {
      accessToken: response.access_token,
      accessTokenExpiration: response.access_token_expiration,
      refreshToken: response.refresh_token,
      refreshTokenExpiration: response.refresh_token_expiration,
      userId: response.user_id,
    };
  }

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
    session: Session,
  ): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntentResponse>({
      method: "POST",
      path: "/v1/payment_intents",
      session,
      body: {
        allowed_payment_method_types: DEFAULT_ALLOWED_PAYMENT_METHOD_TYPES,
        user_id: input.userId ?? "me",
        cart: {
          requested_item: {
            cart_item_type: "CUSTOMER_MATCH",
            cart_item_data: {
              tenant_id: input.tenantId,
              resource_id: input.resourceId,
              start: input.start,
              duration: input.duration,
              user_id: input.userId ?? "me",
              match_registrations: [{ user_id: input.userId ?? "me", pay_now: true }],
              supports_split_payment: true,
              number_of_players: input.numberOfPlayers,
            },
          },
        },
      },
    });

    return mapPaymentIntent(response);
  }

  async updatePaymentIntent(
    paymentIntentId: string,
    input: UpdatePaymentIntentInput,
    session: Session,
  ): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntentResponse>({
      method: "PATCH",
      path: `/v1/payment_intents/${paymentIntentId}`,
      session,
      body: {
        selected_payment_method_id: input.selectedPaymentMethodId,
        selected_payment_method_data: input.selectedPaymentMethodData,
      },
    });

    return mapPaymentIntent(response);
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    session: Session,
  ): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntentResponse>({
      method: "POST",
      path: `/v1/payment_intents/${paymentIntentId}/confirmation`,
      session,
      body: {},
    });

    return mapPaymentIntent(response);
  }

  async getPaymentIntent(paymentIntentId: string, session: Session): Promise<PaymentIntent> {
    const response = await this.request<PaymentIntentResponse>({
      method: "GET",
      path: `/v1/payment_intents/${paymentIntentId}`,
      session,
    });

    return mapPaymentIntent(response);
  }

  async getAvailability(
    query: AvailabilityQuery,
    session: Session,
  ): Promise<AvailabilityResource[]> {
    const response = await this.request<AvailabilityResponse[]>({
      path: "/v1/availability",
      query: {
        local_start_min: query.localStartMin,
        local_start_max: query.localStartMax,
        sport_id: query.sportId,
        tenant_id: query.tenantIds.join(","),
        user_id: query.userId ?? "me",
      },
      session,
    });

    return response.map((resource) => ({
      resourceId: resource.resource_id,
      startDate: resource.start_date,
      slots: resource.slots.map<AvailabilitySlot>((slot) => ({
        startTime: slot.start_time,
        duration: slot.duration,
        price: slot.price,
      })),
    }));
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const url = new URL(options.path, this.config.apiBaseUrl);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers = new Headers({
      "accept-language": this.config.defaultAcceptLanguage,
      "content-type": "application/json",
      "user-agent": options.userAgent ?? this.config.defaultUserAgent,
    });

    if (options.includeRequestedWith ?? true) {
      headers.set("x-requested-with", this.config.defaultRequestedWith);
    }

    if (options.session) {
      headers.set("authorization", `Bearer ${options.session.accessToken}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new PlaytomicApiError(
          `Playtomic API request failed (${response.status} ${response.statusText})`,
          response.status,
          responseBody,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
