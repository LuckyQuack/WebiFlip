/**
 * Sends a test event directly to the Sentry API to verify the DSN works.
 * Run with: node scripts/test-sentry.mjs
 * Requires Node 18+.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

// Read DSN from .env
let dsn = '';
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const match = envContent.match(/^VITE_SENTRY_DSN=(.+)$/m);
  dsn = match?.[1]?.trim() ?? '';
} catch {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

if (!dsn) {
  console.error('❌ VITE_SENTRY_DSN is not set in .env');
  process.exit(1);
}

// Parse: https://KEY@HOST/PROJECT_ID
const dsnMatch = dsn.match(/^https?:\/\/([^@]+)@([^/]+)\/(.+)$/);
if (!dsnMatch) {
  console.error('❌ DSN format looks wrong — expected https://KEY@HOST/PROJECT_ID');
  process.exit(1);
}

const [, key, host, projectId] = dsnMatch;
const timestamp = Math.floor(Date.now() / 1000);
const eventId = crypto.randomUUID().replace(/-/g, '');

const url = `https://${host}/api/${projectId}/store/`;
const authHeader = `Sentry sentry_version=7, sentry_key=${key}, sentry_timestamp=${timestamp}`;

const event = {
  event_id: eventId,
  timestamp: new Date().toISOString(),
  platform: 'javascript',
  level: 'info',
  message: 'WebiFlip — Sentry connectivity test',
  tags: { source: 'test-script' },
};

console.log(`Sending test event to Sentry...`);

let res;
try {
  res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': authHeader,
    },
    body: JSON.stringify(event),
  });
} catch (err) {
  console.error('❌ Network error — could not reach Sentry:', err.message);
  process.exit(1);
}

if (res.ok) {
  const data = await res.json();
  console.log('✅ Sentry is working!');
  console.log(`   Event ID: ${data.id}`);
  console.log(`   Check Sentry dashboard > Issues for "WebiFlip — Sentry connectivity test"`);
} else {
  const body = await res.text();
  console.error(`❌ Sentry rejected the event (HTTP ${res.status})`);
  console.error(`   Response: ${body}`);
  if (res.status === 401) console.error('   → DSN key is invalid or the project does not exist');
  if (res.status === 403) console.error('   → DSN is rate-limited or the project is disabled');
}
