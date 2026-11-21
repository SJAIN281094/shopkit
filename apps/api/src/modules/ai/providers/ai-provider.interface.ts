export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiUsageInfo {
  inputTokens: number;
  outputTokens: number;
}

export interface AiResult<T> {
  /** Raw model output. Callers must validate it before use. */
  output: T;
  model: string;
  usage: AiUsageInfo;
}

export interface GenerateStoreInput {
  storeName: string;
  description: string;
}

export interface GenerateListingInput {
  storeName: string;
  /** Public URL of a photo the seller uploaded to this store. */
  imageUrl: string;
  /** Optional words from the seller, e.g. "blue cotton kurta, size M-XL". */
  hint: string;
  /** Existing collection names the model may pick from. */
  collections: string[];
}

export interface AiProvider {
  readonly name: string;
  generateStoreLayout(input: GenerateStoreInput): Promise<AiResult<unknown>>;
  /** Expected output: { title, description, collectionName: string | null } */
  generateProductListing(input: GenerateListingInput): Promise<AiResult<unknown>>;
}
