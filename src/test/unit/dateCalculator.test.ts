import * as assert from 'assert';
import { DateCalculator } from '../../core/DateCalculator';

describe('DateCalculator', () => {
    let dateCalculator: DateCalculator;

    beforeEach(() => {
        dateCalculator = new DateCalculator();
    });

    describe('formatLocalDate', () => {
        it('should format date correctly', () => {
            const date = new Date(2024, 0, 18); // January 18, 2024
            const result = dateCalculator.formatLocalDate(date);
            assert.strictEqual(result, '2024-01-18');
        });

        it('should pad single digit month and day', () => {
            const date = new Date(2024, 0, 1); // January 1, 2024
            const result = dateCalculator.formatLocalDate(date);
            assert.strictEqual(result, '2024-01-01');
        });
    });

    describe('formatLocalDateTime', () => {
        it('should format datetime with timezone offset', () => {
            const date = new Date(2024, 0, 18, 9, 30, 45); // 2024-01-18 09:30:45
            const result = dateCalculator.formatLocalDateTime(date);
            
            // Should include timezone offset
            assert.match(result, /^2024-01-18T09:30:45[+-]\d{2}:\d{2}$/);
        });

        it('should pad single digit values correctly', () => {
            const date = new Date(2024, 0, 1, 1, 5, 9); // 2024-01-01 01:05:09
            const result = dateCalculator.formatLocalDateTime(date);
            
            assert.match(result, /^2024-01-01T01:05:09[+-]\d{2}:\d{2}$/);
        });
    });

    describe('isValidBoundaryTime', () => {
        it('should accept valid time formats', () => {
            assert.strictEqual(dateCalculator.isValidBoundaryTime('00:00'), true);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('02:00'), true);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('23:59'), true);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('12:30'), true);
        });

        it('should reject invalid time formats', () => {
            assert.strictEqual(dateCalculator.isValidBoundaryTime('25:00'), false);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('12:60'), false);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('2:00'), false);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('02-00'), false);
            assert.strictEqual(dateCalculator.isValidBoundaryTime('invalid'), false);
            assert.strictEqual(dateCalculator.isValidBoundaryTime(''), false);
        });
    });

    describe('getLogicalDate', () => {
        it('should return same day when after boundary', () => {
            // 2024-01-18 09:00 with boundary 02:00
            const now = new Date(2024, 0, 18, 9, 0, 0);
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2024-01-18');
        });

        it('should return previous day when before boundary', () => {
            // 2024-01-18 01:59 with boundary 02:00
            const now = new Date(2024, 0, 18, 1, 59, 0);
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2024-01-17');
        });

        it('should return same day when exactly at boundary', () => {
            // 2024-01-18 02:00 with boundary 02:00
            const now = new Date(2024, 0, 18, 2, 0, 0);
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2024-01-18');
        });

        it('should handle month boundary correctly', () => {
            // 2024-02-01 01:00 with boundary 02:00 → should be 2024-01-31
            const now = new Date(2024, 1, 1, 1, 0, 0); // Month is 0-indexed
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2024-01-31');
        });

        it('should handle year boundary correctly', () => {
            // 2024-01-01 01:00 with boundary 02:00 → should be 2023-12-31
            const now = new Date(2024, 0, 1, 1, 0, 0);
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2023-12-31');
        });

        it('should handle leap year correctly', () => {
            // 2024-03-01 01:00 with boundary 02:00 → should be 2024-02-29 (leap year)
            const now = new Date(2024, 2, 1, 1, 0, 0); // March 1st (month is 0-indexed)
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2024-02-29');
        });

        it('should handle standard midnight boundary', () => {
            // 2024-01-18 23:59 with boundary 00:00
            const now = new Date(2024, 0, 18, 23, 59, 0);
            const result = dateCalculator.getLogicalDate(now, '00:00');
            assert.strictEqual(result, '2024-01-18');
        });

        it('should handle different boundary times', () => {
            const now = new Date(2024, 0, 18, 5, 30, 0); // 05:30
            
            // Before 06:00 boundary
            assert.strictEqual(dateCalculator.getLogicalDate(now, '06:00'), '2024-01-17');
            
            // After 05:00 boundary
            assert.strictEqual(dateCalculator.getLogicalDate(now, '05:00'), '2024-01-18');
            
            // Exactly at 05:30 boundary
            assert.strictEqual(dateCalculator.getLogicalDate(now, '05:30'), '2024-01-18');
        });

        it('should throw error for invalid boundary time format', () => {
            const now = new Date(2024, 0, 18, 9, 0, 0);
            
            assert.throws(() => {
                dateCalculator.getLogicalDate(now, '25:00');
            }, /Invalid boundary time format: 25:00\. Expected HH:MM format \(e\.g\., 02:00\)/);
            
            assert.throws(() => {
                dateCalculator.getLogicalDate(now, 'invalid');
            }, /Invalid boundary time format: invalid\. Expected HH:MM format \(e\.g\., 02:00\)/);
        });

        it('should handle boundary times with leading/trailing spaces', () => {
            const now = new Date(2024, 0, 18, 1, 30, 0); // Before 02:00 boundary
            
            // Should trim spaces and process correctly
            const result = dateCalculator.getLogicalDate(now, ' 02:00 ');
            assert.strictEqual(result, '2024-01-17');
        });
    });

    describe('edge cases', () => {
        it('should handle minute precision correctly', () => {
            // Test one second before and after boundary
            const boundary = '02:00';
            
            // 01:59:59 → should be previous day
            const before = new Date(2024, 0, 18, 1, 59, 59);
            assert.strictEqual(dateCalculator.getLogicalDate(before, boundary), '2024-01-17');
            
            // 02:00:00 → should be same day
            const at = new Date(2024, 0, 18, 2, 0, 0);
            assert.strictEqual(dateCalculator.getLogicalDate(at, boundary), '2024-01-18');
            
            // 02:00:01 → should be same day
            const after = new Date(2024, 0, 18, 2, 0, 1);
            assert.strictEqual(dateCalculator.getLogicalDate(after, boundary), '2024-01-18');
        });

        it('should handle 30-minute boundaries', () => {
            // Test 02:30 boundary
            const now1 = new Date(2024, 0, 18, 2, 29, 0); // 02:29
            assert.strictEqual(dateCalculator.getLogicalDate(now1, '02:30'), '2024-01-17');
            
            const now2 = new Date(2024, 0, 18, 2, 30, 0); // 02:30
            assert.strictEqual(dateCalculator.getLogicalDate(now2, '02:30'), '2024-01-18');
            
            const now3 = new Date(2024, 0, 18, 2, 31, 0); // 02:31
            assert.strictEqual(dateCalculator.getLogicalDate(now3, '02:30'), '2024-01-18');
        });

        it('should handle non-leap year February correctly', () => {
            // 2023 is not a leap year
            const now = new Date(2023, 2, 1, 1, 0, 0); // March 1, 2023, 01:00
            const result = dateCalculator.getLogicalDate(now, '02:00');
            assert.strictEqual(result, '2023-02-28'); // February 28, not 29
        });
    });
});