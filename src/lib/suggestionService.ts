export interface PracticeSuggestionItem {
  id: string;
  type: 'mcq' | 'true_false' | 'match' | 'anagram';
  prompt: string;
  data: MCQData | TrueFalseData | MatchData | AnagramData;
  difficultyRating: number;
  estimatedTime: number;
  keywords: string[];
}

export interface MCQData {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TrueFalseData {
  statement: string;
  correct: boolean;
}

export interface MatchData {
  left: string[];
  right: string[];
  pairs: Record<number, number>;
}

export interface AnagramData {
  letters: string[];
  target: string;
}

export function generateExerciseId(): string {
  return `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getDifficultyRange(elo: number): { min: number; max: number } {
  return {
    min: Math.max(0, elo - 150),
    max: Math.min(3000, elo + 150) // Cap at 3000 to avoid unrealistic difficulty
  };
}

// Mock LLM service - in production, this would call an actual LLM API
export async function generatePracticeSuggestions(
  keywords: string[],
  elo: number,
  limit: number = 5,
  _nativeLanguage: string = 'vi',
  _targetLanguage: string = 'en'
): Promise<PracticeSuggestionItem[]> {
  
  const difficultyRange = getDifficultyRange(elo);
  const exerciseTypes: Array<'mcq' | 'true_false' | 'match' | 'anagram'> = ['mcq', 'true_false', 'match', 'anagram'];
  
  const suggestions: PracticeSuggestionItem[] = [];
  
  for (let i = 0; i < limit; i++) {
    const type = exerciseTypes[i % exerciseTypes.length];
    const keyword = keywords[i % keywords.length] || 'general';
    const difficulty = Math.floor(Math.random() * (difficultyRange.max - difficultyRange.min)) + difficultyRange.min;
    
    let exercise: PracticeSuggestionItem;
    
    switch (type) {
      case 'mcq':
        exercise = {
          id: generateExerciseId(),
          type: 'mcq',
          prompt: `Choose the correct translation for "${keyword}"`,
          data: {
            question: `What does "${keyword}" mean in ${_targetLanguage}?`,
            options: [`Option A`, `Option B`, `Option C`, `Option D`],
            correctIndex: Math.floor(Math.random() * 4)
          },
          difficultyRating: difficulty,
          estimatedTime: 30,
          keywords: [keyword]
        };
        break;
        
      case 'true_false':
        exercise = {
          id: generateExerciseId(),
          type: 'true_false',
          prompt: `True or false: "${keyword}" means "hello"`,
          data: {
            statement: `The word "${keyword}" means "hello" in ${targetLanguage}`,
            correct: Math.random() > 0.5
          },
          difficultyRating: difficulty,
          estimatedTime: 15,
          keywords: [keyword]
        };
        break;
        
      case 'match':
        const matchPairs = [
          { left: 'Hello', right: 'Xin chào' },
          { left: 'Goodbye', right: 'Tạm biệt' },
          { left: 'Thank you', right: 'Cảm ơn' },
          { left: 'Please', right: 'Làm ơn' }
        ];
        
        exercise = {
          id: generateExerciseId(),
          type: 'match',
          prompt: 'Match the English words with their Vietnamese translations',
          data: {
            left: matchPairs.map(p => p.left),
            right: matchPairs.map(p => p.right),
            pairs: matchPairs.reduce((acc, _, index) => {
              acc[index] = index;
              return acc;
            }, {} as Record<number, number>)
          },
          difficultyRating: difficulty,
          estimatedTime: 60,
          keywords: [keyword]
        };
        break;
        
      case 'anagram':
        const targetWord = keyword.length > 3 ? keyword : 'practice';
        const shuffledLetters = targetWord.split('').sort(() => Math.random() - 0.5);
        
        exercise = {
          id: generateExerciseId(),
          type: 'anagram',
          prompt: `Unscramble the letters to form a word related to "${keyword}"`,
          data: {
            letters: shuffledLetters,
            target: targetWord
          },
          difficultyRating: difficulty,
          estimatedTime: 45,
          keywords: [keyword]
        };
        break;
    }
    
    suggestions.push(exercise);
  }
  
  return suggestions;
}