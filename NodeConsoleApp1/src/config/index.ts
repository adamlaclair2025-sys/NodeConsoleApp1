export const config = {
  node: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/mental_health_platform',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  },
  password: {
    minLength: parseInt(process.env.MIN_PASSWORD_LENGTH || '12', 10),
    requireUppercase: process.env.REQUIRE_UPPERCASE === 'true',
    requireNumbers: process.env.REQUIRE_NUMBERS === 'true',
    requireSpecialChars: process.env.REQUIRE_SPECIAL_CHARS === 'true',
  },
  safety: {
    quickExitUrl: process.env.QUICK_EXIT_URL || 'https://www.google.com',
  },
};

export type Config = typeof config;
