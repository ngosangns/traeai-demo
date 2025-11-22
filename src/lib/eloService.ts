export interface EloUpdateResult {
  isCorrect: boolean;
  deltaElo: number;
  newElo: number;
}

export function calculateExpectedScore(userElo: number, exerciseElo: number): number {
  return 1 / (1 + Math.pow(10, (exerciseElo - userElo) / 400));
}

export function getKFactor(elo: number): number {
  if (elo < 1000) return 40;
  if (elo > 1600) return 24;
  return 32;
}

export function updateElo(
  userElo: number,
  exerciseElo: number,
  isCorrect: boolean
): EloUpdateResult {
  const expectedScore = calculateExpectedScore(userElo, exerciseElo);
  const actualScore = isCorrect ? 1 : 0;
  const kFactor = getKFactor(userElo);
  
  const deltaElo = Math.round(kFactor * (actualScore - expectedScore));
  const newElo = Math.max(0, userElo + deltaElo);
  
  return {
    isCorrect,
    deltaElo,
    newElo
  };
}

export function evaluateAnswer(
  exerciseType: string,
  userAnswer: string | number | boolean | Record<number, number>,
  correctAnswer: { correctIndex?: number; correct?: boolean; pairs?: Record<number, number>; target?: string }
): boolean {
  switch (exerciseType) {
    case 'mcq':
      return userAnswer === correctAnswer.correctIndex;
      
    case 'true_false':
      return userAnswer === correctAnswer.correct;
      
    case 'match':
      // For MVP, we check if all pairs match exactly
      return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer.pairs);
      
    case 'anagram':
      return userAnswer.toLowerCase().trim() === correctAnswer.target.toLowerCase().trim();
      
    default:
      return false;
  }
}