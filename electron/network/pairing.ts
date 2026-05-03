import { randomInt, pbkdf2Sync } from 'crypto';

export interface PairingSession {
  code: string;
  createdAt: number;
  expiresAt: number;
  salt: string;
}

const SESSION_TTL_MS = 5 * 60 * 1000;

export function generatePairingCode(): PairingSession {
  const code = String(randomInt(100000, 999999));
  const now = Date.now();
  return {
    code,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    salt: randomInt(1000000000, 9999999999).toString(16)
  };
}

export function validatePairingCode(session: PairingSession, input: string): boolean {
  if (Date.now() > session.expiresAt) return false;
  return session.code === input;
}

export function deriveEncryptionKey(code: string, salt: string): Buffer {
  return pbkdf2Sync(code, salt, 100000, 32, 'sha256');
}
