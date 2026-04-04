export interface SweetBookResponse {
  quoteId?: string;
  finalizationId?: string;
  orderId?: string;
  status: string;
}

export interface SweetBookAdapterResult {
  quoteId?: string;
  finalizationId?: string;
  orderId?: string;
  status: string;
}

export function translateSweetBookResponse(
  response: SweetBookResponse
): SweetBookAdapterResult {
  return {
    quoteId: response.quoteId,
    finalizationId: response.finalizationId,
    orderId: response.orderId,
    status: response.status
  };
}
