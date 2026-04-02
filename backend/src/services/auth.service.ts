import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

function generateAccessToken(userId: number, email: string): string {
  return jwt.sign(
    { id: userId, email },
    process.env['JWT_SECRET']!,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export async function register(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  return issueTokens(user.id, user.email);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return issueTokens(user.id, user.email);
}

export async function refresh(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token } });
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  await prisma.refreshToken.delete({ where: { token } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
  return issueTokens(user.id, user.email);
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

async function issueTokens(userId: number, email: string) {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  return { accessToken, refreshToken };
}
