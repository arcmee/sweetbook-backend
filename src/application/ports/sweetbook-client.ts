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

export interface SweetBookOrderItemInput {
  bookUid: string;
  quantity: number;
}

export interface EstimateSweetBookOrderInput {
  items: SweetBookOrderItemInput[];
}

export interface SweetBookOrderEstimateResult {
  items?: Array<{
    bookUid: string;
    bookSpecUid?: string | null;
    pageCount?: number | null;
    quantity: number;
    unitPrice?: number | null;
    itemAmount?: number | null;
    packagingFee?: number | null;
  }>;
  totalAmount: number;
  paidCreditAmount?: number | null;
  creditBalance?: number | null;
  creditSufficient?: boolean | null;
  currency: string;
}
export const SweetBookOrderEstimateResult = Symbol("SweetBookOrderEstimateResult");

export interface SweetBookShippingAddressInput {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2: string;
  memo?: string;
}

export interface SubmitSweetBookOrderInput {
  items: SweetBookOrderItemInput[];
  shipping: SweetBookShippingAddressInput;
  externalRef?: string;
  idempotencyKey?: string;
}

export interface SweetBookOrderResult {
  orderUid: string;
  orderStatus: number | string;
  orderStatusDisplay?: string | null;
  paidCreditAmount?: number | null;
  creditBalanceAfter?: number | null;
  items?: Array<{
    itemUid: string;
    bookUid: string;
    pageCount?: number | null;
    itemStatus?: number | string | null;
    itemStatusDisplay?: string | null;
  }>;
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
