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

export interface SweetBookFilePart {
  fileName: string;
  contentType: string;
  bytes: Blob;
}

export interface UploadSweetBookCoverInput {
  bookUid: string;
  templateUid: string;
  parameters: Record<string, unknown>;
  frontPhoto: SweetBookFilePart;
  backPhoto?: SweetBookFilePart;
}

export interface SweetBookCoverUploadResult {
  result: string;
}
export const SweetBookCoverUploadResult = Symbol("SweetBookCoverUploadResult");

export interface UploadSweetBookPhotoInput {
  bookUid: string;
  file: SweetBookFilePart;
}

export interface SweetBookPhotoUploadResult {
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  isDuplicate: boolean;
  hash: string;
}
export const SweetBookPhotoUploadResult = Symbol("SweetBookPhotoUploadResult");

export interface UploadSweetBookContentsInput {
  bookUid: string;
  templateUid: string;
  breakBefore?: "page" | "column" | "none";
  parameters: Record<string, unknown>;
  fileParts?: Record<string, SweetBookFilePart>;
}

export interface SweetBookContentsUploadResult {
  result: string;
  breakBefore: string;
  pageNum: number;
  pageSide: string;
  pageCount: number;
}
export const SweetBookContentsUploadResult = Symbol("SweetBookContentsUploadResult");

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
  uploadCover(
    input: UploadSweetBookCoverInput,
  ): Promise<SweetBookCoverUploadResult>;
  uploadPhoto(
    input: UploadSweetBookPhotoInput,
  ): Promise<SweetBookPhotoUploadResult>;
  uploadContents(
    input: UploadSweetBookContentsInput,
  ): Promise<SweetBookContentsUploadResult>;
  submitOrder(
    input: SubmitSweetBookOrderInput,
  ): Promise<SweetBookOrderResult>;
}

export const SweetBookClient = Symbol("SweetBookClient");
