import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig: ReturnType<typeof nextJest> = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

const exportConfig: ReturnType<typeof createJestConfig> = createJestConfig(config);

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default exportConfig;
