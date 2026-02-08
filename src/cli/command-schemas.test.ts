import { describe, expect, test } from "bun:test";
import { AvailabilitySearchInputSchema } from "./commands/availability-search";
import { AuthLoginOptionsSchema } from "./commands/auth-login";
import { PurchaseInputSchema } from "./commands/payment-purchase";

describe("CLI zod schemas", () => {
  test("accepts auth login without options", () => {
    const parsed = AuthLoginOptionsSchema.parse({});
    expect(parsed).toEqual({});
  });

  test("validates availability date format", () => {
    expect(() =>
      AvailabilitySearchInputSchema.parse({ name: "berlin", date: "2026/02/11" }),
    ).toThrow();
  });

  test("accepts optional tenant filter for availability", () => {
    const parsed = AvailabilitySearchInputSchema.parse({
      name: "berlin",
      tenantId: "16825678-053a-400d-b626-4c386d58706b",
    });

    expect(parsed.tenantId).toBe("16825678-053a-400d-b626-4c386d58706b");
  });

  test("accepts location-based availability search without query", () => {
    const parsed = AvailabilitySearchInputSchema.parse({
      near: "Berlin",
      radiusMeters: "50000",
    });

    expect(parsed.near).toBe("Berlin");
    expect(parsed.radiusMeters).toBe(50000);
  });

  test("coerces purchase numeric options", () => {
    const parsed = PurchaseInputSchema.parse({
      tenantId: "tenant",
      resourceId: "resource",
      start: "2026-02-11T10:00:00",
      duration: "60",
      players: "4",
    });

    expect(parsed.duration).toBe(60);
    expect(parsed.players).toBe(4);
  });
});
