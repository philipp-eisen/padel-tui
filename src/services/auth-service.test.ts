import { describe, expect, test } from "bun:test";
import { PlaytomicApiError } from "../adapters/playtomic/errors";
import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import type { Session } from "../domain/types";
import { AuthService, type SessionStoreLike } from "./auth-service";

class MemorySessionStore implements SessionStoreLike {
  public value: Session | null = null;
  public clearCount = 0;

  async load(): Promise<Session | null> {
    return this.value;
  }

  async save(session: Session): Promise<void> {
    this.value = session;
  }

  async clear(): Promise<void> {
    this.value = null;
    this.clearCount += 1;
  }
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

describe("AuthService", () => {
  test("retries operation after 401 by refreshing session", async () => {
    const initialSession: Session = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      userId: "user-1",
    };
    const refreshedSession: Session = {
      accessToken: "new-token",
      refreshToken: "refresh-token-new",
      userId: "user-1",
    };

    const store = new MemorySessionStore();
    store.value = initialSession;

    const api = createApiStub({
      refreshSession: async () => refreshedSession,
    });

    const service = new AuthService(api, store);

    let attempts = 0;
    const result = await service.runWithValidSession(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new PlaytomicApiError("unauthorized", 401, "{\"error\":\"expired\"}");
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
    expect(store.value?.accessToken).toBe("new-token");
  });

  test("clears session when refresh is unauthorized", async () => {
    const initialSession: Session = {
      accessToken: "old-token",
      refreshToken: "refresh-token",
      userId: "user-1",
    };

    const store = new MemorySessionStore();
    store.value = initialSession;

    const api = createApiStub({
      refreshSession: async () => {
        throw new PlaytomicApiError("refresh denied", 401, "{\"error\":\"invalid\"}");
      },
    });

    const service = new AuthService(api, store);

    await expect(service.refresh(initialSession)).rejects.toThrow("Token refresh failed");
    expect(store.value).toBeNull();
    expect(store.clearCount).toBe(1);
  });
});
