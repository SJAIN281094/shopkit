import { z } from 'zod';
import { homeLayoutSchema, storeLayoutSchema, type StoreLayout } from './schema';

export class InvalidLayoutError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid store layout: ${issues.slice(0, 5).join('; ')}`);
    this.name = 'InvalidLayoutError';
  }
}

export function safeParseStoreLayout(
  input: unknown,
): { success: true; layout: StoreLayout } | { success: false; issues: string[] } {
  const result = storeLayoutSchema.safeParse(input);
  if (result.success) {
    const ids = result.data.sections.map((s) => s.id);
    const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
    if (duplicate) {
      return { success: false, issues: [`sections: duplicate section id "${duplicate}"`] };
    }
    return { success: true, layout: result.data };
  }
  return {
    success: false,
    issues: result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
  };
}

function friendlyMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === 'too_small') {
    if (issue.origin === 'string') return issue.minimum === 1 ? "This can't be empty" : `Use at least ${issue.minimum} characters`;
    if (issue.origin === 'array') return `Add at least ${issue.minimum}`;
    if (issue.origin === 'number') return `Must be at least ${issue.minimum}`;
  }
  if (issue.code === 'too_big') {
    if (issue.origin === 'string') return `Keep it under ${issue.maximum} characters`;
    if (issue.origin === 'array') return `No more than ${issue.maximum} allowed`;
    if (issue.origin === 'number') return `Must be ${issue.maximum} or less`;
  }
  if (issue.code === 'invalid_type' && issue.expected === 'number') return 'Enter a number';
  if (issue.code === 'invalid_union') return 'Enter a valid https:// link, or leave it empty';
  return issue.message;
}

export interface LayoutIssue {
  path: (string | number)[];
  message: string;
}

/** Field-level problems for editors; empty when the layout is valid. */
export function getLayoutIssues(input: unknown): LayoutIssue[] {
  const result = storeLayoutSchema.safeParse(input);
  if (!result.success) {
    return result.error.issues.map((issue) => ({
      path: issue.path.filter((p): p is string | number => typeof p !== 'symbol'),
      message: friendlyMessage(issue),
    }));
  }
  const ids = result.data.sections.map((s) => s.id);
  const index = ids.findIndex((id, i) => ids.indexOf(id) !== i);
  return index === -1 ? [] : [{ path: ['sections', index, 'id'], message: 'Duplicate section id' }];
}

export function parseStoreLayout(input: unknown): StoreLayout {
  const result = safeParseStoreLayout(input);
  if (!result.success) throw new InvalidLayoutError(result.issues);
  return result.layout;
}

/** For AI generation, which builds the home page only. */
export function storeLayoutJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(homeLayoutSchema) as Record<string, unknown>;
}
