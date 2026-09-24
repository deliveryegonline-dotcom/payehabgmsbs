import type { WalletAdapter, ParsedSmsResult } from './types.ts';

export const orangeCashAdapter: WalletAdapter = {
  id: 'orange_cash',
  name: 'Orange Cash',
  arabicName: 'أورنچ كاش',
  senders: ['OrangeCash', 'Orange-Cash', 'Orange', 'orangecash'],

  canHandle(sender: string, rawText: string): boolean {
    const s = sender.toLowerCase();
    return this.senders.some((name) => s.includes(name.toLowerCase())) || rawText.includes('أورنچ كاش');
  },

  parse(sender: string, rawText: string): ParsedSmsResult | null {
    if (!rawText.includes('استلام') && !rawText.toLowerCase().includes('received')) {
      return null;
    }

    const amountMatch = rawText.match(/(?:مبلغ|استلام|بمبلغ)\s*[:\s]?\s*([\d]+(?:\.[\d]{1,2})?)/i) ||
      rawText.match(/([\d]+(?:\.[\d]{1,2})?)\s*(?:ج\.م|جنيه)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    if (!amount) return null;

    const txnMatch = rawText.match(/(?:رقم العملية|رقم المعاملة)\s*[:\s#]?\s*([a-zA-Z0-9_-]{6,30})/i) ||
      rawText.match(/([0-9]{8,15})/);
    const transactionId = txnMatch ? txnMatch[1].trim() : '';
    if (!transactionId) return null;

    const phoneMatch = rawText.match(/(?:من|from)?\s*(01[0125][0-9]{8})/);

    return {
      amount,
      counterpartyPhone: phoneMatch ? phoneMatch[1] : null,
      transactionId,
      sender: sender || 'OrangeCash',
      isTransferIn: true,
      currency: 'EGP',
      rawText,
    };
  },
};
