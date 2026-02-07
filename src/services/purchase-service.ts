import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import type { PaymentIntent, PurchaseSlotInput, Session } from "../domain/types";

function chooseDefaultMethod(intent: PaymentIntent): string | null {
  const preferredCard = intent.availablePaymentMethods.find((method) =>
    method.paymentMethodId.startsWith("CREDIT_CARD-"),
  );
  if (preferredCard) {
    return preferredCard.paymentMethodId;
  }

  const quickPay = intent.availablePaymentMethods.find(
    (method) => method.paymentMethodId === "QUICK_PAY",
  );
  if (quickPay) {
    return quickPay.paymentMethodId;
  }

  return intent.availablePaymentMethods[0]?.paymentMethodId ?? null;
}

export interface PurchaseSlotResult {
  created: PaymentIntent;
  selected: PaymentIntent;
  confirmed?: PaymentIntent;
  final: PaymentIntent;
}

export class PurchaseService {
  constructor(private readonly api: PlaytomicApi) {}

  async purchaseSlot(
    session: Session,
    input: PurchaseSlotInput,
  ): Promise<PurchaseSlotResult> {
    const created = await this.api.createPaymentIntent(
      {
        tenantId: input.tenantId,
        resourceId: input.resourceId,
        start: input.start,
        duration: input.duration,
        numberOfPlayers: input.numberOfPlayers,
        userId: "me",
      },
      session,
    );

    const selectedPaymentMethodId = input.paymentMethodId ?? chooseDefaultMethod(created);
    if (!selectedPaymentMethodId) {
      throw new Error(
        `No available payment methods returned. Raw response: ${JSON.stringify(created.raw)}`,
      );
    }

    const selected = await this.api.updatePaymentIntent(
      created.paymentIntentId,
      {
        selectedPaymentMethodId,
        selectedPaymentMethodData: selectedPaymentMethodId.startsWith("CREDIT_CARD-")
          ? {
              stripe_return_url: `playtomic://new-payments/stripe?anemone_payment_intent_id=${created.paymentIntentId}`,
            }
          : undefined,
      },
      session,
    );

    let confirmed: PaymentIntent | undefined;
    if (selected.status === "REQUIRES_CONFIRMATION") {
      confirmed = await this.api.confirmPaymentIntent(created.paymentIntentId, session);
    }

    const final = confirmed ?? (await this.api.getPaymentIntent(created.paymentIntentId, session));

    return {
      created,
      selected,
      confirmed,
      final,
    };
  }
}
