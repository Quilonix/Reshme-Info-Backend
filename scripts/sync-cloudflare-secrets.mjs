import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

if (!existsSync(envPath)) {
  console.error('.env.local not found in admin-pwa');
  process.exit(1);
}

const projectName = process.env.CF_PAGES_PROJECT || 'reshme-info-backend';
console.log(`Syncing secrets to Cloudflare Pages project: "${projectName}"...\n`);

const envContent = readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

const secretsToSync = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_GA_MEASUREMENT_ID',
  'GA_PROPERTY_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_KEY',
  'GEMINI_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const envMap = new Map();

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  envMap.set(key, val);
}

const cfToken = process.env.CLOUDFLARE_API_TOKEN || envMap.get('CLOUDFLARE_API_TOKEN');
const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID || envMap.get('CLOUDFLARE_ACCOUNT_ID');

for (const key of secretsToSync) {
  const val = envMap.get(key);
  if (!val) continue;
  try {
    process.stdout.write(`Uploading ${key}... `);
    execSync(`npx wrangler pages secret put ${key} --project-name=${projectName}`, {
      input: val,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: cfToken,
        CLOUDFLARE_ACCOUNT_ID: cfAccount,
      },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    console.log('OK');
  } catch (err) {
    console.log(`Failed: ${err.message}`);
  }
}

console.log('\nAll secrets synchronized with Cloudflare Pages!');
