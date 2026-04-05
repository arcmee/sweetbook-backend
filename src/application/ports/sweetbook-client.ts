export interface CreateSweetBookBookInput {
  title: string;
  bookSpecUid: string;
  specProfileUid?: string;
  externalRef?: string;
  idempotencyKey?: string;
}

export interface SweetBookBookCreationResult {
  bookUid: string;
}
export const SweetBookBookCreationResult = Symbol("SweetBookBookCreationResult");

export interface FinalizeSweetBookBookInput {
  bookUid: string;
}

export interface SweetBookFinalizeResult {
  result: string;
  pageCount: number;
  finalizedAt: string;
}
export const SweetBookFinalizeResult = Symbol("SweetBookFinalizeResult");

export interface EstimateSweetBookOrderInput {
  bookUid: string;
  quantity: number;
}

export interface SweetBookOrderEstimateResult {
  estimateId: string;
  totalAmount: number;
  currency: string;
}
export const SweetBookOrderEstimateResult = Symbol("SweetBookOrderEstimateResult");

export interface SubmitSweetBookOrderInput {
  bookUid: string;
  quantity: number;
  idempotencyKey?: string;
}

export interface SweetBookOrderResult {
  orderUid: string;
  orderStatus: string;
}
export const SweetBookOrderResult = Symbol("SweetBookOrderResult");

export interface SweetBookClient {
  createBook(
    input: CreateSweetBookBookInput,
  ): Promise<SweetBookBookCreationResult>;
  finalizeBook(
    input: FinalizeSweetBookBookInput,
  ): Promise<SweetBookFinalizeResult>;
  estimateOrder(
    input: EstimateSweetBookOrderInput,
  ): Promise<SweetBookOrderEstimateResult>;
  submitOrder(
    input: SubmitSweetBookOrderInput,
  ): Promise<SweetBookOrderResult>;
}

export const SweetBookClient = Symbol("SweetBookClient");
