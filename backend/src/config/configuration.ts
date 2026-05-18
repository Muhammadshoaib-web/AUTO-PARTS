export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'autoparts_db',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? '',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiry: process.env.JWT_EXPIRY ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },

  fbr: {
    baseUrl: process.env.FBR_BASE_URL ?? '',
    apiKey: process.env.FBR_API_KEY ?? '',
    posId: process.env.FBR_POS_ID ?? '',
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? './uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '5', 10),
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
  },

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});
