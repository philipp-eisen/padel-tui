import ky, { HTTPError, type KyInstance } from "ky";
import { z } from "zod";
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
}

const SessionResponseSchema = z.object({
  access_token: z.string().min(1),
  access_token_expiration: z.string().optional(),
  refresh_token: z.string().optional(),
  refresh_token_expiration: z.string().optional(),
  user_id: z.string().min(1),
});

const TenantResponseSchema = z.object({
  tenant_id: z.string().min(1),
  tenant_name: z.string().min(1),
  address: z
    .object({
      city: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

const AvailabilityResponseSchema = z.object({
  resource_id: z.string().min(1),
  start_date: z.string().min(1),
  slots: z.array(
    z.object({
      start_time: z.string().min(1),
      duration: z.number().int().positive(),
      price: z.string().min(1),
    }),
  ),
});

const PaymentIntentResponseSchema = z.object({
  payment_intent_id: z.string().min(1),
  status: z.string().min(1),
  selected_payment_method_id: z.string().optional().nullable(),
  next_payment_action: z.string().optional().nullable(),
  next_payment_action_data: z.unknown().optional(),
  payment_id: z.string().optional().nullable(),
  available_payment_methods: z
    .array(
      z.object({
        payment_method_id: z.string().min(1),
        method_type: z.string().min(1),
        name: z.string().min(1),
        data: z.unknown().optional(),
      }),
    )
    .optional(),
});

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

function withoutLeadingSlash(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function parseWithSchema<T>(schema: z.ZodType<T>, payload: unknown, context: string): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid ${context} response: ${formatZodError(parsed.error)}`);
  }
  return parsed.data;
}

function mapSession(response: z.infer<typeof SessionResponseSchema>): Session {
  return {
    accessToken: response.access_token,
    accessTokenExpiration: response.access_token_expiration,
    refreshToken: response.refresh_token,
    refreshTokenExpiration: response.refresh_token_expiration,
    userId: response.user_id,
  };
}

function mapPaymentIntent(response: z.infer<typeof PaymentIntentResponseSchema>): PaymentIntent {
  const methods: PaymentMethod[] = (response.available_payment_methods ?? []).map((method) => ({
    paymentMethodId: method.payment_method_id,
    methodType: method.method_type,
    name: method.name,
    data: method.data,
  }));

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
  private readonly apiClient: KyInstance;
  private readonly refreshClient: KyInstance;

  constructor(private readonly config: AppConfig) {
    const normalizedBaseUrl = this.config.apiBaseUrl.replace(/\/+$/u, "");

    this.apiClient = ky.create({
      prefixUrl: normalizedBaseUrl,
      timeout: this.config.requestTimeoutMs,
      headers: {
        "accept-language": this.config.defaultAcceptLanguage,
        "content-type": "application/json",
        "x-requested-with": this.config.defaultRequestedWith,
        "user-agent": this.config.defaultUserAgent,
      },
    });

    this.refreshClient = ky.create({
      prefixUrl: normalizedBaseUrl,
      timeout: this.config.requestTimeoutMs,
      headers: {
        "accept-language": this.config.defaultAcceptLanguage,
        "content-type": "application/json",
        "user-agent": "okhttp/4.12.0",
      },
    });
  }

  async login(input: Credentials): Promise<Session> {
    const payload = await this.requestJson(this.apiClient, {
      method: "POST",
      path: "/v3/auth/login",
      body: input,
    });
    const response = parseWithSchema(SessionResponseSchema, payload, "auth login");
    return mapSession(response);
  }

  async refreshSession(refreshToken: string): Promise<Session> {
    const payload = await this.requestJson(this.refreshClient, {
      method: "POST",
      path: "/v3/auth/token",
      body: {
        refresh_token: refreshToken,
      },
    });
    const response = parseWithSchema(SessionResponseSchema, payload, "auth token refresh");
    return mapSession(response);
  }

  async searchTenants(query: string, session: Session): Promise<Tenant[]> {
    const payload = await this.requestJson(this.apiClient, {
      path: "/v1/tenants",
      query: {
        playtomic_status: "ACTIVE",
        tenant_name: query,
        with_properties: "ALLOWS_CASH_PAYMENT,LIVE_TV_URL",
      },
      session,
    });

    const response = parseWithSchema(z.array(TenantResponseSchema), payload, "tenant search");

    return response.map((tenant) => ({
      tenantId: tenant.tenant_id,
      tenantName: tenant.tenant_name,
      city: tenant.address?.city,
      timezone: tenant.address?.timezone,
    }));
  }

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
    session: Session,
  ): Promise<PaymentIntent> {
    const payload = await this.requestJson(this.apiClient, {
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

    return mapPaymentIntent(parseWithSchema(PaymentIntentResponseSchema, payload, "create payment intent"));
  }

  async updatePaymentIntent(
    paymentIntentId: string,
    input: UpdatePaymentIntentInput,
    session: Session,
  ): Promise<PaymentIntent> {
    const payload = await this.requestJson(this.apiClient, {
      method: "PATCH",
      path: `/v1/payment_intents/${paymentIntentId}`,
      session,
      body: {
        selected_payment_method_id: input.selectedPaymentMethodId,
        selected_payment_method_data: input.selectedPaymentMethodData,
      },
    });

    return mapPaymentIntent(parseWithSchema(PaymentIntentResponseSchema, payload, "update payment intent"));
  }

  async confirmPaymentIntent(paymentIntentId: string, session: Session): Promise<PaymentIntent> {
    const payload = await this.requestJson(this.apiClient, {
      method: "POST",
      path: `/v1/payment_intents/${paymentIntentId}/confirmation`,
      session,
      body: {},
    });

    return mapPaymentIntent(parseWithSchema(PaymentIntentResponseSchema, payload, "confirm payment intent"));
  }

  async getPaymentIntent(paymentIntentId: string, session: Session): Promise<PaymentIntent> {
    const payload = await this.requestJson(this.apiClient, {
      method: "GET",
      path: `/v1/payment_intents/${paymentIntentId}`,
      session,
    });

    return mapPaymentIntent(parseWithSchema(PaymentIntentResponseSchema, payload, "get payment intent"));
  }

  async getAvailability(
    query: AvailabilityQuery,
    session: Session,
  ): Promise<AvailabilityResource[]> {
    const payload = await this.requestJson(this.apiClient, {
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

    const response = parseWithSchema(
      z.array(AvailabilityResponseSchema),
      payload,
      "availability",
    );

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

  private async requestJson(
    client: KyInstance,
    options: RequestOptions,
  ): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (options.session) {
      headers.authorization = `Bearer ${options.session.accessToken}`;
    }

    try {
      return await client(withoutLeadingSlash(options.path), {
        method: options.method ?? "GET",
        searchParams: options.query,
        json: options.body,
        headers,
      }).json<unknown>();
    } catch (error) {
      if (error instanceof HTTPError) {
        const responseBody = await error.response.text();
        throw new PlaytomicApiError(
          `Playtomic API request failed (${error.response.status} ${error.response.statusText})`,
          error.response.status,
          responseBody,
        );
      }

      throw error;
    }
  }
}
