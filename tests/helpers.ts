import jwt from 'jsonwebtoken';

export function generateTestToken(userId: string, email: string, role: string): string {
  return jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET || 'test-jwt-secret-at-least-16-chars', {
    expiresIn: '1h',
  });
}
