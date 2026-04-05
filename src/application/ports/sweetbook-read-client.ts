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
  getCredits(): Promise<SweetBookCreditsBalance>;
}

export const SweetBookReadClient = Symbol("SweetBookReadClient");
