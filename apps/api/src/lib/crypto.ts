import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

/** Time-ordered ids: new items sort after old ones, which keeps index pages in creation order. */
export const newId = (): string => uuidv7();

// scrypt with ~32 MB of memory per hash. Costs ~60 ms on a 512 MB Lambda: slow enough to hurt an
// offline guesser, cheap enough that login latency is dominated by the network.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

function scryptAsync(password: string, salt: Buffer, n = N, r = R, p = P): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Burned on unknown-email logins so they take as long as real ones — otherwise response time
 * alone tells an attacker which emails have accounts.
 */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('not-a-real-password-just-timing');
  await verifyPassword(password, await dummyHash);
}

// Crockford base32 minus I, L, O, U: nothing a driver can misread off a dispatcher's screen.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 8 characters ≈ 40 bits. Safe because the code dies after 5 wrong tries and expires in 7 days. */
export function newActivationCode(): { code: string; display: string } {
  let code = '';
  for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return { code, display: `${code.slice(0, 4)}-${code.slice(4)}` };
}

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('base64url');

export const randomSecret = (): string => randomBytes(32).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
