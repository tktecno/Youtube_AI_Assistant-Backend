import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { z } from "zod";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const envPath = resolve(currentDirectory, "../../.env");

dotenv.config({ path: envPath });

const isSupabaseBackendKey = (value: string): boolean => {
  if (!value) {
    return false;
  }

  if (value.startsWith("sb_secret_")) {
    return true;
  }

  if (value.startsWith("sb_publishable_")) {
    return false;
  }

  if (value.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        Buffer.from(value.split(".")[1] ?? "", "base64url").toString("utf8")
      ) as { role?: string };

      return payload.role === "service_role";
    } catch {
      return false;
    }
  }

  return true;
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .refine(isSupabaseBackendKey, {
      message:
        "SUPABASE_SERVICE_ROLE_KEY must be a backend-only Supabase secret/service_role key, not a publishable/anon key."
    }),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_CHAT_MODEL: z.string().min(1),
  OPENROUTER_EMBEDDING_MODEL: z.string().min(1),
  OPENROUTER_APP_URL: z.string().url().default("http://localhost:5173"),
  OPENROUTER_APP_NAME: z.string().min(1).default("Teacher Culture"),
  MAX_CHUNK_CHARACTERS: z.coerce.number().int().positive().default(900),
  CHUNK_OVERLAP_SEGMENTS: z.coerce.number().int().min(0).max(5).default(2),
  RETRIEVAL_K: z.coerce.number().int().positive().default(4),
  CHAT_MEMORY_MESSAGES: z.coerce.number().int().positive().default(5)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const invalidKeys = Object.entries(fieldErrors)
    .filter(([, issues]) => Array.isArray(issues) && issues.length > 0)
    .map(([key]) => key);

  console.error("Invalid environment variables", fieldErrors);
  throw new Error(
    `Missing or invalid backend environment variables: ${invalidKeys.join(", ")}`
  );
}

export const env = parsed.data;
