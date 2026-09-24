export interface ParsedSmsResult {
  amount: number;
  counterpartyPhone?: string | null;
  transactionId: string;
  receivedAt?: string | null;
  sender: string;
  isTransferIn: boolean;
  currency: string;
  rawText: string;
}

export interface WalletAdapter {
  id: string;
  name: string;
  arabicName: string;
  senders: string[];
  canHandle(sender: string, rawText: string): boolean;
  parse(sender: string, rawText: string): ParsedSmsResult | null;
}
