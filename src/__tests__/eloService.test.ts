import { updateElo, calculateExpectedScore, getKFactor, evaluateAnswer } from '../lib/eloService';

describe('Elo Service', () => {
  describe('calculateExpectedScore', () => {
    it('should calculate expected score correctly for equal ratings', () => {
      const expected = calculateExpectedScore(1000, 1000);
      expect(expected).toBeCloseTo(0.5, 3);
    });

    it('should calculate expected score for higher rated player', () => {
      const expected = calculateExpectedScore(1200, 1000);
      expect(expected).toBeGreaterThan(0.5);
    });

    it('should calculate expected score for lower rated player', () => {
      const expected = calculateExpectedScore(800, 1000);
      expect(expected).toBeLessThan(0.5);
    });
  });

  describe('getKFactor', () => {
    it('should return 40 for low Elo (< 1000)', () => {
      expect(getKFactor(800)).toBe(40);
      expect(getKFactor(999)).toBe(40);
    });

    it('should return 32 for medium Elo (1000-1600)', () => {
      expect(getKFactor(1000)).toBe(32);
      expect(getKFactor(1300)).toBe(32);
      expect(getKFactor(1600)).toBe(32);
    });

    it('should return 24 for high Elo (> 1600)', () => {
      expect(getKFactor(1601)).toBe(24);
      expect(getKFactor(2000)).toBe(24);
    });
  });

  describe('updateElo', () => {
    it('should increase Elo for correct answer', () => {
      const result = updateElo(1000, 1000, true);
      expect(result.deltaElo).toBeGreaterThan(0);
      expect(result.newElo).toBeGreaterThan(1000);
      expect(result.isCorrect).toBe(true);
    });

    it('should decrease Elo for incorrect answer', () => {
      const result = updateElo(1000, 1000, false);
      expect(result.deltaElo).toBeLessThan(0);
      expect(result.newElo).toBeLessThan(1000);
      expect(result.isCorrect).toBe(false);
    });

    it('should not allow negative Elo', () => {
      const result = updateElo(10, 2000, false);
      expect(result.newElo).toBeGreaterThanOrEqual(0);
    });

    it('should handle large Elo differences correctly', () => {
      // High-rated player beats low-rated player (small gain)
      const result1 = updateElo(2000, 1000, true);
      expect(result1.deltaElo).toBeLessThan(10); // Should be small gain

      // Low-rated player beats high-rated player (large gain)
      const result2 = updateElo(1000, 2000, true);
      expect(result2.deltaElo).toBeGreaterThan(20); // Should be large gain
    });
  });

  describe('evaluateAnswer', () => {
    describe('MCQ evaluation', () => {
      it('should evaluate MCQ correctly', () => {
        const correctAnswer = { correctIndex: 2 };
        expect(evaluateAnswer('mcq', 2, correctAnswer)).toBe(true);
        expect(evaluateAnswer('mcq', 1, correctAnswer)).toBe(false);
      });
    });

    describe('True/False evaluation', () => {
      it('should evaluate true/false correctly', () => {
        const correctAnswer = { correct: true };
        expect(evaluateAnswer('true_false', true, correctAnswer)).toBe(true);
        expect(evaluateAnswer('true_false', false, correctAnswer)).toBe(false);
      });
    });

    describe('Match evaluation', () => {
      it('should evaluate match correctly', () => {
        const correctAnswer = { pairs: { '0': 1, '1': 0 } };
        expect(evaluateAnswer('match', { '0': 1, '1': 0 }, correctAnswer)).toBe(true);
        expect(evaluateAnswer('match', { '0': 0, '1': 1 }, correctAnswer)).toBe(false);
      });
    });

    describe('Anagram evaluation', () => {
      it('should evaluate anagram correctly (case insensitive)', () => {
        const correctAnswer = { target: 'hello' };
        expect(evaluateAnswer('anagram', 'hello', correctAnswer)).toBe(true);
        expect(evaluateAnswer('anagram', 'HELLO', correctAnswer)).toBe(true);
        expect(evaluateAnswer('anagram', '  hello  ', correctAnswer)).toBe(true);
        expect(evaluateAnswer('anagram', 'world', correctAnswer)).toBe(false);
      });
    });

    describe('Unknown type', () => {
      it('should return false for unknown exercise types', () => {
        expect(evaluateAnswer('unknown', 'answer', {})).toBe(false);
      });
    });
  });
});