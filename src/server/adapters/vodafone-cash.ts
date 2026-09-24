import type { WalletAdapter, ParsedSmsResult } from './types.ts';

export const vodafoneCashAdapter: WalletAdapter = {
  id: 'vodafone_cash',
  name: 'Vodafone Cash',
  arabicName: 'فودافون كاش',
  senders: ['VF-Cash', 'Vodafone', 'VFCash', 'VF_CASH', 'vodafone'],

  canHandle(sender: string, rawText: string): boolean {
    const s = sender.toLowerCase();
    const isSenderMatch = this.senders.some((name) => s.includes(name.toLowerCase()));
    const hasKeywords =
      rawText.includes('فودافون كاش') ||
      rawText.includes('VF-Cash') ||
      rawText.includes('تم استلام') ||
      rawText.includes('received') ||
      rawText.includes('رقم العملية');
    return isSenderMatch || hasKeywords;
  },

  parse(sender: string, rawText: string): ParsedSmsResult | null {
    // Determine transfer in (receiving money)
    const isReceive =
      rawText.includes('استلام') ||
      rawText.includes('تم إيداع') ||
      rawText.includes('تحويل إلى محفظتك') ||
      rawText.toLowerCase().includes('received') ||
      rawText.toLowerCase().includes('credited');

    if (!isReceive) {
      return null;
    }

    // 1. Amount Extraction (e.g. 150.07 or 150)
    // Examples: "تم استلام مبلغ 150.07 جنيه", "Received EGP 150.07", "استلام 150.07 ج.م"
    let amount: number | null = null;
    const amountRegexes = [
      /(?:مبلغ|استلام|بمبلغ|قيمة|received|credited)\s*[:\s]?\s*(?:egp|ج\.م|جنيه)?\s*([\d]+(?:\.[\d]{1,2})?)/i,
      /([\d]+(?:\.[\d]{1,2})?)\s*(?:ج\.م|جنيه|egp|le)/i,
      /(?:egp|le)\s*([\d]+(?:\.[\d]{1,2})?)/i,
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

    // 2. Transaction ID Extraction
    // Examples: "رقم العملية 1234567890", "رقم المعاملة: 1234567890", "Trans ID: 1234567890", "Txn: 1234567890"
    let transactionId = '';
    const txnRegexes = [
      /(?:رقم العملية|رقم المعاملة|مرجع العملية|trans(?:action)?\s*id|txn\s*(?:id)?|ref(?:erence)?)\s*[:\s#]?\s*([a-zA-Z0-9_-]{6,30})/i,
      /([0-9]{8,15})/, // Fallback long numeric string
    ];

    for (const rx of txnRegexes) {
      const match = rawText.match(rx);
      if (match && match[1]) {
        transactionId = match[1].trim();
        break;
      }
    }

    if (!transactionId) {
      // Create hash-based or timestamp fallback if not found
      return null;
    }

    // 3. Counterparty Phone (Egyptian mobile: 010, 011, 012, 015)
    let counterpartyPhone: string | null = null;
    const phoneMatch = rawText.match(/(?:من|from)?\s*(01[0125][0-9]{8})/);
    if (phoneMatch && phoneMatch[1]) {
      counterpartyPhone = phoneMatch[1];
    }

    return {
      amount,
      counterpartyPhone,
      transactionId,
      sender: sender || 'VF-Cash',
      isTransferIn: true,
      currency: 'EGP',
      rawText,
    };
  },
};
