import type { SearchCategories } from 'nashm-data-provider';

export type TWebSearchKeys =
  | 'serperApiKey'
  | 'nashmsearchInstanceUrl'
  | 'nashmsearchApiKey'
  | 'firecrawlApiKey'
  | 'firecrawlApiUrl'
  | 'firecrawlVersion'
  | 'tavilyApiKey'
  | 'tavilySearchUrl'
  | 'tavilyExtractUrl'
  | 'jinaApiKey'
  | 'jinaApiUrl'
  | 'cohereApiKey';

export type TWebSearchCategories =
  | SearchCategories.PROVIDERS
  | SearchCategories.SCRAPERS
  | SearchCategories.RERANKERS;
