import bcrypt from 'bcryptjs';
import { getPrisma } from '@/lib/prisma';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createUser(username: string, password: string) {
  const prisma = getPrisma();
  const existingUser = await prisma.user.findUnique({
    where: { username }
  });

  if (existingUser) {
    throw new Error('Username already exists');
  }

  const passwordHash = await hashPassword(password);
  
  // Create user with default Elo of 1000
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      elo: 1000
    }
  });

  // Create default popular keywords for the user
  const defaultKeywords = [
    'family', 'work', 'food', 'travel', 'health', 
    'shopping', 'school', 'weather', 'transport', 'daily routines'
  ];

  await prisma.keyword.createMany({
    data: defaultKeywords.map(value => ({
      userId: user.id,
      value
    }))
  });

  return {
    id: user.id,
    username: user.username,
    nativeLanguage: user.nativeLanguage,
    targetLanguage: user.targetLanguage,
    elo: user.elo,
    createdAt: user.createdAt
  };
}

export async function authenticateUser(username: string, password: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return {
    id: user.id,
    username: user.username,
    nativeLanguage: user.nativeLanguage,
    targetLanguage: user.targetLanguage,
    elo: user.elo,
    createdAt: user.createdAt
  };
}
