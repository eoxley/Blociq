
// Test deployment configuration
const testConfig = {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cwd: process.cwd(),
  env: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'
  }
};

console.log('Deployment test config:', JSON.stringify(testConfig, null, 2));
