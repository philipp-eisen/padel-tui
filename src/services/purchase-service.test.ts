import { describe, expect, test } from "bun:test";
import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import type { PaymentIntent, Session } from "../domain/types";
import { PurchaseService } from "./purchase-service";

function createIntent(
  paymentIntentId: string,
  status: string,
  methods: string[] = ["CREDIT_CARD-STRIPE_card-1"],
): PaymentIntent {
  return {
    paymentIntentId,
    status,
    selectedPaymentMethodId: null,
    nextPaymentAction: null,
    nextPaymentActionData: null,
    paymentId: null,
    availablePaymentMethods: methods.map((id) => ({
      paymentMethodId: id,
      methodType: id.startsWith("CREDIT_CARD-") ? "CREDIT_CARD" : "QUICK_PAY",
      name: id,
    })),
    raw: { paymentIntentId, status },
  };
}

function createApiStub(overrides: Partial<PlaytomicApi>): PlaytomicApi {
  const missing = async (): Promise<never> => {
    throw new Error("Unexpected API method call in test");
  };

  return {
    login: missing,
    refreshSession: missing,
    searchTenants: missing,
    createPaymentIntent: missing,
    updatePaymentIntent: missing,
    confirmPaymentIntent: missing,
    getPaymentIntent: missing,
    getAvailability: missing,
    ...overrides,
  } as PlaytomicApi;
}

describe("PurchaseService", () => {
  test("confirms payment intent when status requires confirmation", async () => {
    const session: Session = { accessToken: "token", userId: "me" };
    const created = createIntent("pi-1", "REQUIRES_PAYMENT_METHOD");
    const selected = createIntent("pi-1", "REQUIRES_CONFIRMATION");
    const confirmed = {
      ...createIntent("pi-1", "SUCCEEDED"),
      paymentId: "payment-1",
    };

    let confirmCalls = 0;
    let getCalls = 0;

    const api = createApiStub({
      createPaymentIntent: async () => created,
      updatePaymentIntent: async () => selected,
      confirmPaymentIntent: async () => {
        confirmCalls += 1;
        return confirmed;
      },
      getPaymentIntent: async () => {
        getCalls += 1;
        return confirmed;
      },
    });

    const service = new PurchaseService(api);
    const result = await service.purchaseSlot(session, {
      tenantId: "tenant-1",
      resourceId: "resource-1",
      start: "2026-02-11T10:00:00",
      duration: 60,
      numberOfPlayers: 4,
    });

    expect(confirmCalls).toBe(1);
    expect(getCalls).toBe(0);
    expect(result.final.status).toBe("SUCCEEDED");
  });

  test("falls back to get payment intent when confirmation not required", async () => {
    const session: Session = { accessToken: "token", userId: "me" };
    const created = createIntent("pi-2", "REQUIRES_PAYMENT_METHOD", ["QUICK_PAY"]);
    const selected = createIntent("pi-2", "REQUIRES_PAYMENT_METHOD_ACTION", ["QUICK_PAY"]);
    const fetched = createIntent("pi-2", "SUCCEEDED", ["QUICK_PAY"]);

    let confirmCalls = 0;
    let getCalls = 0;

    const api = createApiStub({
      createPaymentIntent: async () => created,
      updatePaymentIntent: async () => selected,
      confirmPaymentIntent: async () => {
        confirmCalls += 1;
        return fetched;
      },
      getPaymentIntent: async () => {
        getCalls += 1;
        return fetched;
      },
    });

    const service = new PurchaseService(api);
    const result = await service.purchaseSlot(session, {
      tenantId: "tenant-1",
      resourceId: "resource-1",
      start: "2026-02-11T10:00:00",
      duration: 60,
      numberOfPlayers: 4,
      paymentMethodId: "QUICK_PAY",
    });

    expect(confirmCalls).toBe(0);
    expect(getCalls).toBe(1);
    expect(result.final.status).toBe("SUCCEEDED");
  });
});
