import type { WalletAdapter, ParsedSmsResult } from './types.ts';

export const instaPayAdapter: WalletAdapter = {
  id: 'instapay',
  name: 'InstaPay (IPN Egypt)',
  arabicName: 'إنستاباي / شبكة المدفوعات اللحظية',
  senders: ['InstaPay', 'IPN', 'IPN-Egypt', 'Insta-Pay', 'instapay'],

  canHandle(sender: string, rawText: string): boolean {
    const s = sender.toLowerCase();
    const isSenderMatch = this.senders.some((name) => s.includes(name.toLowerCase()));
    const hasKeywords =
      rawText.includes('إنستاباي') ||
      rawText.includes('تحويل لحظي') ||
      rawText.includes('شبكة المدفوعات اللحظية') ||
      rawText.toLowerCase().includes('instapay') ||
      rawText.toLowerCase().includes('instant payment');
    return isSenderMatch || hasKeywords;
  },

  parse(sender: string, rawText: string): ParsedSmsResult | null {
    const isReceive =
      rawText.includes('استلام') ||
      rawText.includes('وارد') ||
      rawText.includes('تم إيداع') ||
      rawText.toLowerCase().includes('received') ||
      rawText.toLowerCase().includes('credited');

    if (!isReceive) {
      return null;
    }

    // 1. Amount Extraction
    let amount: number | null = null;
    const amountRegexes = [
      /(?:مبلغ|بمبلغ|قيمة|received|amount)\s*[:\s]?\s*(?:egp|ج\.م|جم|جنيه)?\s*([\d]+(?:\.[\d]{1,2})?)/i,
      /([\d]+(?:\.[\d]{1,2})?)\s*(?:ج\.م|جم|جنيه|egp)/i,
    ];

    for (const rx of amountRegexes) {
      const match = rawText.match(rx);
      if (match && match[1]) {
        const parsed = parseFloat(match[1]);
        if (!isNaN(parsed) && parsed > 0) {
          amount = parsed;
          break;
        }
      }
    }

    if (amount === null) {
      return null;
    }

    // 2. Reference / Transaction ID
    let transactionId = '';
    const txnRegexes = [
      /(?:مرجع التحويل|الرقم المرجعي|رقم العملية|مرجع|ref(?:erence)?|txn\s*id)\s*[:\s#]?\s*([a-zA-Z0-9_-]{6,30})/i,
      /([0-9]{10,20})/,
    ];

    for (const rx of txnRegexes) {
      const match = rawText.match(rx);
      if (match && match[1]) {
        transactionId = match[1].trim();
        break;
      }
    }

    if (!transactionId) {
      return null;
    }

    // 3. Sender phone / IPA handle
    let counterpartyPhone: string | null = null;
    const phoneMatch = rawText.match(/(?:من|from)?\s*(01[0125][0-9]{8})/);
    if (phoneMatch && phoneMatch[1]) {
      counterpartyPhone = phoneMatch[1];
    } else {
      const ipaMatch = rawText.match(/([a-zA-Z0-9._]+@instapay)/i);
      if (ipaMatch && ipaMatch[1]) {
        counterpartyPhone = ipaMatch[1];
      }
    }

    return {
      amount,
      counterpartyPhone,
      transactionId,
      sender: sender || 'InstaPay',
      isTransferIn: true,
      currency: 'EGP',
      rawText,
    };
  },
};
