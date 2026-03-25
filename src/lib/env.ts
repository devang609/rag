import path from "node:path";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  APP_DATASET_ROOT: z.string().optional(),
});

const parsed = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  APP_DATASET_ROOT: process.env.APP_DATASET_ROOT,
});

export const env = parsed;

export function getDatasetRoot(): string {
  const configuredRoot = parsed.APP_DATASET_ROOT?.trim();

  if (!configuredRoot) {
    return path.resolve(process.cwd(), "sap-o2c-data");
  }

  return path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.resolve(process.cwd(), configuredRoot);
}
