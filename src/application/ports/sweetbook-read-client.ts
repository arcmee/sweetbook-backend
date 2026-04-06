export interface SweetBookBookSpec {
  bookSpecUid: string;
  name: string;
  pageMin: number;
  pageMax: number;
  pageIncrement: number;
  sandboxPriceBase?: number | null;
  sandboxPricePerIncrement?: number | null;
}

export interface SweetBookTemplateSummary {
  templateUid: string;
  templateName: string;
  templateKind: string;
  category?: string | null;
  theme?: string | null;
  bookSpecUid: string;
  isPublic: boolean;
  status: string;
}

export interface SweetBookTemplateParameterDefinition {
  binding?: string | null;
  type?: string | null;
  required?: boolean | null;
  description?: string | null;
}

export interface SweetBookTemplateDetail {
  templateUid: string;
  templateName: string;
  templateKind: string;
  bookSpecUid: string;
  parameters?: {
    definitions?: Record<string, SweetBookTemplateParameterDefinition>;
  } | null;
}

export interface SweetBookTemplatePagination {
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
}

export interface SweetBookTemplateListResult {
  templates: SweetBookTemplateSummary[];
  pagination: SweetBookTemplatePagination;
}

export interface SweetBookCreditsBalance {
  accountUid: string;
  balance: number;
  currency: string;
  env?: string | null;
}

export interface SweetBookUploadedPhoto {
  fileName: string;
  originalName?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt?: string | null;
}

export interface SweetBookBookPhotoListResult {
  photos: SweetBookUploadedPhoto[];
  totalCount: number;
}

export interface SweetBookBookSummary {
  bookUid: string;
  title?: string | null;
  bookSpecUid?: string | null;
  status?: number | string | null;
  pageCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SweetBookBookListResult {
  books: SweetBookBookSummary[];
  total: number;
}

export interface SweetBookBookListOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

export interface SweetBookTemplateListOptions {
  bookSpecUid?: string;
  limit?: number;
  offset?: number;
  templateKind?: string;
}

export interface SweetBookReadClient {
  listBookSpecs(): Promise<SweetBookBookSpec[]>;
  listTemplates(
    options?: SweetBookTemplateListOptions,
  ): Promise<SweetBookTemplateListResult>;
  getTemplateDetail(templateUid: string): Promise<SweetBookTemplateDetail>;
  listBooks(options?: SweetBookBookListOptions): Promise<SweetBookBookListResult>;
  listBookPhotos(bookUid: string): Promise<SweetBookBookPhotoListResult>;
  getCredits(): Promise<SweetBookCreditsBalance>;
}

export const SweetBookReadClient = Symbol("SweetBookReadClient");
