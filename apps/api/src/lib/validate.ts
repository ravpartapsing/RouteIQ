import type { z } from 'zod';
import { ApiError } from './errors.js';

/** Parses a request body against a contract; failures become a 400 with per-field messages. */
export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_';
    fields[path] ??= issue.message;
  }
  throw new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', fields);
}
