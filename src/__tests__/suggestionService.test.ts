import { generatePracticeSuggestions, generateExerciseId, getDifficultyRange } from '../lib/suggestionService';

describe('Suggestion Service', () => {
  describe('generateExerciseId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateExerciseId();
      const id2 = generateExerciseId();
      
      expect(id1).toMatch(/^exercise_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^exercise_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getDifficultyRange', () => {
    it('should calculate correct difficulty range for different Elo values', () => {
      const range1 = getDifficultyRange(1000);
      expect(range1.min).toBe(850);
      expect(range1.max).toBe(1150);

      const range2 = getDifficultyRange(500);
      expect(range2.min).toBe(350); // 500 - 150, not 0 because it's > 150
      expect(range2.max).toBe(650); // 500 + 150

      const range3 = getDifficultyRange(100); // This should hit the 0 minimum
      expect(range3.min).toBe(0); // 100 - 150 = -50, but capped at 0
      expect(range3.max).toBe(250); // 100 + 150

      const range4 = getDifficultyRange(1800);
      expect(range4.min).toBe(1650);
      expect(range4.max).toBe(1950);
    });
  });

  describe('generatePracticeSuggestions', () => {
    it('should generate the correct number of suggestions', async () => {
      const keywords = ['family', 'work', 'food'];
      const elo = 1000;
      const limit = 3;

      const suggestions = await generatePracticeSuggestions(keywords, elo, limit);

      expect(suggestions).toHaveLength(limit);
    });

    it('should generate suggestions with required properties', async () => {
      const keywords = ['family'];
      const elo = 1000;

      const suggestions = await generatePracticeSuggestions(keywords, elo, 1);
      const suggestion = suggestions[0];

      expect(suggestion).toHaveProperty('id');
      expect(suggestion).toHaveProperty('type');
      expect(suggestion).toHaveProperty('prompt');
      expect(suggestion).toHaveProperty('data');
      expect(suggestion).toHaveProperty('difficultyRating');
      expect(suggestion).toHaveProperty('estimatedTime');
      expect(suggestion).toHaveProperty('keywords');
    });

    it('should generate different exercise types', async () => {
      const keywords = ['family', 'work', 'food', 'travel'];
      const elo = 1000;

      const suggestions = await generatePracticeSuggestions(keywords, elo, 4);
      const types = suggestions.map(s => s.type);

      expect(types).toContain('mcq');
      expect(types).toContain('true_false');
      expect(types).toContain('match');
      expect(types).toContain('anagram');
    });

    it('should use default keywords when none provided', async () => {
      const suggestions = await generatePracticeSuggestions([], 1000, 2);

      expect(suggestions).toHaveLength(2);
      suggestions.forEach(suggestion => {
        expect(suggestion.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should generate suggestions within difficulty range', async () => {
      const elo = 1200;
      const difficultyRange = getDifficultyRange(elo);

      const suggestions = await generatePracticeSuggestions(['family'], elo, 5);

      suggestions.forEach(suggestion => {
        expect(suggestion.difficultyRating).toBeGreaterThanOrEqual(difficultyRange.min);
        expect(suggestion.difficultyRating).toBeLessThanOrEqual(difficultyRange.max);
      });
    });

    it('should generate valid MCQ data', async () => {
      const suggestions = await generatePracticeSuggestions(['family'], 1000, 1);
      const mcqSuggestion = suggestions.find(s => s.type === 'mcq');

      if (mcqSuggestion) {
        expect(mcqSuggestion.data).toHaveProperty('question');
        expect(mcqSuggestion.data).toHaveProperty('options');
        expect(mcqSuggestion.data).toHaveProperty('correctIndex');
        expect(Array.isArray(mcqSuggestion.data.options)).toBe(true);
        expect(mcqSuggestion.data.options.length).toBeGreaterThan(0);
        expect(typeof mcqSuggestion.data.correctIndex).toBe('number');
      }
    });

    it('should generate valid True/False data', async () => {
      const suggestions = await generatePracticeSuggestions(['family'], 1000, 1);
      const tfSuggestion = suggestions.find(s => s.type === 'true_false');

      if (tfSuggestion) {
        expect(tfSuggestion.data).toHaveProperty('statement');
        expect(tfSuggestion.data).toHaveProperty('correct');
        expect(typeof tfSuggestion.data.statement).toBe('string');
        expect(typeof tfSuggestion.data.correct).toBe('boolean');
      }
    });

    it('should generate valid Match data', async () => {
      const suggestions = await generatePracticeSuggestions(['family'], 1000, 1);
      const matchSuggestion = suggestions.find(s => s.type === 'match');

      if (matchSuggestion) {
        expect(matchSuggestion.data).toHaveProperty('left');
        expect(matchSuggestion.data).toHaveProperty('right');
        expect(matchSuggestion.data).toHaveProperty('pairs');
        expect(Array.isArray(matchSuggestion.data.left)).toBe(true);
        expect(Array.isArray(matchSuggestion.data.right)).toBe(true);
        expect(typeof matchSuggestion.data.pairs).toBe('object');
      }
    });

    it('should generate valid Anagram data', async () => {
      const suggestions = await generatePracticeSuggestions(['family'], 1000, 1);
      const anagramSuggestion = suggestions.find(s => s.type === 'anagram');

      if (anagramSuggestion) {
        expect(anagramSuggestion.data).toHaveProperty('letters');
        expect(anagramSuggestion.data).toHaveProperty('target');
        expect(Array.isArray(anagramSuggestion.data.letters)).toBe(true);
        expect(typeof anagramSuggestion.data.target).toBe('string');
        expect(anagramSuggestion.data.letters.length).toBeGreaterThan(0);
      }
    });
  });
});