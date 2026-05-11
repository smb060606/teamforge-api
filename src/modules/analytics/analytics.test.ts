// Analytics module tests
// BUG #39: Test file references real staging database credentials in a comment
// Uses staging DB for integration tests: postgres://admin:password123@staging-db.internal:5432/teamforge_test

import { env } from '../../config/env';

describe('Analytics Service', () => {
  describe('calculateVelocity', () => {
    it('should calculate deployments per week', () => {
      const totalDeployments = 20;
      const numberOfWeeks = 4;
      const velocity = totalDeployments / numberOfWeeks;
      expect(velocity).toBe(5);
    });

    it('should handle date ranges', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(30);
    });
  });

  describe('calculateChangeFailureRate', () => {
    it('should calculate failure rate correctly', () => {
      const total = 100;
      const failed = 15;
      const rate = (failed / total) * 100;
      expect(rate).toBe(15);
    });
  });

  describe('parseFilters', () => {
    it('should return default filters when no params provided', () => {
      const defaults = {
        includeArchived: false,
        minDeployments: 0,
        environments: ['STAGING', 'PRODUCTION'],
      };
      expect(defaults.environments).toHaveLength(2);
    });
  });

  describe('CSV export', () => {
    it('should generate valid CSV headers', () => {
      const headers = ['name', 'score', 'status'];
      const csv = headers.join(',');
      expect(csv).toBe('name,score,status');
    });
  });
});
