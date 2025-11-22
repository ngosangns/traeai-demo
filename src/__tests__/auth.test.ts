import bcrypt from 'bcryptjs';

// Mock bcrypt before importing auth module
jest.mock('bcryptjs');

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    keyword: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn()
    }
  }))
}));

// Now import the auth module
import { hashPassword, verifyPassword } from '../lib/auth';

describe('Auth Service', () => {
  describe('hashPassword', () => {
    it('should hash password with salt rounds', async () => {
      const mockHash = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHash);

      const result = await hashPassword('password123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).toBe(mockHash);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const mockCompare = true;
      (bcrypt.compare as jest.Mock).mockResolvedValue(mockCompare);

      const result = await verifyPassword('password123', 'hashed_password');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const mockCompare = false;
      (bcrypt.compare as jest.Mock).mockResolvedValue(mockCompare);

      const result = await verifyPassword('wrong_password', 'hashed_password');

      expect(result).toBe(false);
    });
  });
});