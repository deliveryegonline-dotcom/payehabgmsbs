import type { WalletAdapter, ParsedSmsResult } from './types.ts';
import { vodafoneCashAdapter } from './vodafone-cash.ts';
import { instaPayAdapter } from './instapay.ts';
import { orangeCashAdapter } from './orange-cash.ts';
import { etisalatCashAdapter } from './etisalat-cash.ts';

export const adapters: WalletAdapter[] = [
  vodafoneCashAdapter,
  instaPayAdapter,
  orangeCashAdapter,
  etisalatCashAdapter,
];

export function getAdapterForSender(sender: string, rawText: string): WalletAdapter | undefined {
  return adapters.find((adapter) => adapter.canHandle(sender, rawText));
}

export function parseIncomingSms(sender: string, rawText: string): ParsedSmsResult | null {
  const adapter = getAdapterForSender(sender, rawText);
  if (adapter) {
    return adapter.parse(sender, rawText);
  }

  // Fallback generic parser if no specific adapter handled it
  const amountMatch = rawText.match(/([\d]+(?:\.[\d]{1,2})?)/);
  const txnMatch = rawText.match(/([a-zA-Z0-9_-]{6,30})/);

  if (amountMatch && txnMatch) {
    const amount = parseFloat(amountMatch[1]);
    if (!isNaN(amount) && amount > 0) {
      return {
        amount,
        transactionId: txnMatch[1],
        sender,
        isTransferIn: true,
        currency: 'EGP',
        rawText,
      };
    }
  }

  return null;
}
