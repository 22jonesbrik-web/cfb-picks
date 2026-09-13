import { randomBytes, scryptSync } from 'node:crypto';

const pin = process.argv[2];
if (!/^\d{4}$/.test(pin ?? '')) {
  console.error('Usage: node scripts/hash-pin.mjs 1234');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
console.log(`scrypt:${salt}:${scryptSync(pin, salt, 64).toString('hex')}`);