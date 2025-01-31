import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    DEEPSEEK_API_KEY: z.string(),
    GOOGLE_CLIENT_EMAIL: z.string(),
    GOOGLE_PRIVATE_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    OPENAI_MODEL: z.string().default("gpt-3.5-turbo"),
    OLLAMA_BASE_URL: z.string().optional(),
    LLM_PROVIDER: z.enum(["openai", "deepseek", "ollama"]).default("openai"),
    OLLAMA_MODEL: z.string().default("llama3.2:latest"),
    TTS_PROVIDER: z.enum(["google", "openai"]).default("openai"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    TTS_PROVIDER: process.env.TTS_PROVIDER,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
