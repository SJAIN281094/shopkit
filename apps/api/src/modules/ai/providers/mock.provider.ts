import { Injectable } from '@nestjs/common';
import {
  buildLayoutFromTemplate,
  DEFAULT_TEMPLATE_KEY,
  getTemplate,
  THEME_TEMPLATES,
  type ThemeTemplate,
} from '@shopkit/themes';
import type { AiProvider, AiResult, GenerateListingInput, GenerateStoreInput } from './ai-provider.interface';

const LISTING_DETAILS: Record<string, string> = {
  fashion: 'Soft, breathable fabric with a flattering fit — easy to style for everyday wear or festive occasions.',
  jewelry: 'Finely finished with a lasting shine, it makes a beautiful gift for weddings, festivals and birthdays.',
  food: 'Made in small batches with fresh ingredients and no added preservatives, packed hygienically to stay fresh.',
  electronics: 'Reliable everyday performance with a compact design, tested before dispatch.',
  handmade: 'Handcrafted by skilled artisans, so every piece is slightly unique.',
  general: 'Carefully chosen for quality and value.',
};

/**
 * Offline stand-in for a real model. It cannot see images: store layouts come from
 * the closest template, and listings are written from the seller's hint. Lets every
 * AI flow run end to end without an API key.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async generateStoreLayout(input: GenerateStoreInput): Promise<AiResult<unknown>> {
    const template = this.pickTemplate(input.description);
    const description = this.toSentence(input.description);

    const layout = buildLayoutFromTemplate(template, input.storeName, {
      ...template.content,
      heroHeading: input.storeName.slice(0, 100),
      heroSubheading: description.slice(0, 240),
      aboutHeading: `About ${input.storeName}`.slice(0, 100),
      aboutBody: `${description} ${template.content.aboutBody}`.slice(0, 1000),
    });

    return {
      output: layout,
      model: 'mock-store-v1',
      usage: this.usage(input.storeName + input.description, JSON.stringify(layout)),
    };
  }

  async generateProductListing(input: GenerateListingInput): Promise<AiResult<unknown>> {
    const hint = input.hint.trim().replace(/\s+/g, ' ');
    const title = hint ? this.toTitle(hint.split(/[,.;]/)[0]).slice(0, 120) : 'New product';
    const template = this.pickTemplate(hint);
    const details = LISTING_DETAILS[template.key] ?? LISTING_DETAILS.general;
    const extra = hint.includes(',') ? ` ${this.toSentence(hint.slice(hint.indexOf(',') + 1))}` : '';
    const description =
      `${title} from ${input.storeName}. ${details}${extra}\n\n` +
      'Quality-checked before dispatch. Cash on delivery available across India.';

    const words = ` ${hint.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
    const collectionName =
      input.collections.find((name) =>
        name
          .toLowerCase()
          .split(/\s+/)
          .some((w) => w.length > 2 && (words.includes(` ${w} `) || words.includes(` ${w.replace(/s$/, '')} `))),
      ) ?? null;

    const output = { title, description, collectionName };
    return { output, model: 'mock-listing-v1', usage: this.usage(hint, JSON.stringify(output)) };
  }

  private pickTemplate(description: string): ThemeTemplate {
    const text = ` ${description.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')} `;
    let best: ThemeTemplate | undefined;
    let bestScore = 0;
    for (const template of THEME_TEMPLATES) {
      const score = template.keywords.filter((k) => text.includes(` ${k} `) || text.includes(` ${k}s `)).length;
      if (score > bestScore) {
        best = template;
        bestScore = score;
      }
    }
    return best ?? getTemplate(DEFAULT_TEMPLATE_KEY)!;
  }

  private toSentence(text: string): string {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    const capitalised = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
  }

  private toTitle(text: string): string {
    return text
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private usage(input: string, output: string) {
    return { inputTokens: Math.ceil(input.length / 4), outputTokens: Math.ceil(output.length / 4) };
  }
}
