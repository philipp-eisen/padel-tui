import type { AppContext } from "../../app/context";
import { z } from "zod";
import { extractMatchIdFromUnknown, extractShareLinkFromUnknown } from "../../services/match-utils";

export const PurchaseInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  resourceId: z.string().trim().min(1),
  start: z.string().trim().min(1),
  duration: z.coerce.number().int().positive().default(60),
  players: z.coerce.number().int().positive().max(8).default(4),
  paymentMethodId: z.string().trim().min(1).optional(),
});

export type PurchaseInput = z.input<typeof PurchaseInputSchema>;

export async function runPaymentPurchaseCommand(
  app: AppContext,
  input: PurchaseInput,
): Promise<void> {
  const parsed = PurchaseInputSchema.parse(input);

  const result = await app.authService.runWithValidSession((session) =>
    app.purchaseService.purchaseSlot(session, {
      tenantId: parsed.tenantId,
      resourceId: parsed.resourceId,
      start: parsed.start,
      duration: parsed.duration,
      numberOfPlayers: parsed.players,
      paymentMethodId: parsed.paymentMethodId,
    }),
  );

  let shareLink = extractShareLinkFromUnknown(result.final.raw);
  if (!shareLink) {
    const matchId = extractMatchIdFromUnknown(result.final.raw);
    if (matchId) {
      try {
        const match = await app.authService.runWithValidSession((session) =>
          app.matchService.getMatch(session, matchId),
        );
        shareLink = match.shareLink;
      } catch {
        // Ignore match detail fetch failures.
      }
    }
  }

  console.log(`Created payment intent: ${result.created.paymentIntentId}`);
  console.log(`Status after method selection: ${result.selected.status}`);
  if (result.confirmed) {
    console.log(`Status after confirmation: ${result.confirmed.status}`);
  }
  console.log(`Final status: ${result.final.status}`);

  if (result.final.status !== "SUCCEEDED") {
    throw new Error(
      `Purchase did not succeed. Final payment intent:\n${JSON.stringify(result.final.raw, null, 2)}`,
    );
  }

  console.log(`Payment succeeded. payment_id=${result.final.paymentId ?? "unknown"}`);
  if (shareLink) {
    console.log(`Match share link: ${shareLink}`);
  }
}
