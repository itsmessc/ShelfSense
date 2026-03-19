/**
 * Centralised environment configuration.
 * Import `env` instead of reading process.env directly across the codebase.
 */
export const env = {
  db: {
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER     ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'shelfsense',
  },
  port:           Number(process.env.PORT ?? 3001),
  geminiApiKey:   process.env.GEMINI_API_KEY  ?? '',
  useFallbackOnly: process.env.USE_FALLBACK_ONLY === 'true',
} as const;
