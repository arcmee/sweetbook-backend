export interface SweetBookQuoteResult {
  quoteId: string;
  status: string;
}
export const SweetBookQuoteResult = Symbol("SweetBookQuoteResult");

export interface SweetBookFinalizeResult {
  finalizationId: string;
  status: string;
}
export const SweetBookFinalizeResult = Symbol("SweetBookFinalizeResult");

export interface SweetBookOrderResult {
  orderId: string;
  status: string;
}
export const SweetBookOrderResult = Symbol("SweetBookOrderResult");

export interface SweetBookClient {
  quote(payload: unknown): Promise<SweetBookQuoteResult>;
  finalize(payload: unknown): Promise<SweetBookFinalizeResult>;
  submitOrder(payload: unknown): Promise<SweetBookOrderResult>;
}

export const SweetBookClient = Symbol("SweetBookClient");
