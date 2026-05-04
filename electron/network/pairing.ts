import { randomInt } from 'crypto';

export interface PairingSession {
  code: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 5 * 60 * 1000;

export function generatePairingCode(): PairingSession {
  const code = String(randomInt(100000, 999999));
  const now = Date.now();
  return {
    code,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };
}

export function validatePairingCode(session: PairingSession, input: string): boolean {
  if (Date.now() > session.expiresAt) return false;
  return session.code === input;
}
