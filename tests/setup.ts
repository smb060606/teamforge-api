// Jest test setup
// Silence logger during tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-16-chars';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/teamforge_test?schema=public';
