'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PracticeExercise {
  id: string;
  type: 'mcq' | 'true_false' | 'match' | 'anagram';
  prompt: string;
  data: MCQData | TrueFalseData | MatchData | AnagramData;
  difficultyRating: number;
  estimatedTime: number;
  keywords: string[];
}

interface MCQData {
  question: string;
  options: string[];
  correctIndex: number;
}

interface TrueFalseData {
  statement: string;
  correct: boolean;
}

interface MatchData {
  left: string[];
  right: string[];
  pairs: Record<number, number>;
}

interface AnagramData {
  letters: string[];
  target: string;
}

export default function PracticePage() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params.id as string;
  
  const [exercise, setExercise] = useState<PracticeExercise | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | number | boolean | Record<number, number> | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; deltaElo: number; newElo: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // For now, we'll get the exercise from localStorage since it's generated on the fly
    // In a real app, you might want to store exercises temporarily or regenerate them
    const storedExercise = sessionStorage.getItem(`exercise_${exerciseId}`);
    if (storedExercise) {
      setExercise(JSON.parse(storedExercise));
    } else {
      setError('Exercise not found. Please go back to overview.');
    }
    setLoading(false);
  }, [exerciseId]);

  const handleSubmit = async () => {
    if (!exercise || userAnswer === null) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseId: exercise.id,
          answer: userAnswer,
          exerciseType: exercise.type,
          difficultyRating: exercise.difficultyRating,
          correctAnswer: exercise.data
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to submit answer');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    router.push('/overview');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exercise...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/overview')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Exercise not found</p>
          <button
            onClick={() => router.push('/overview')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Practice Exercise
            </h1>
            <button
              onClick={() => router.push('/overview')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Overview
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Exercise Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {exercise.type.replace('_', ' ')} Exercise
              </h2>
              <div className="flex space-x-2">
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded">
                  Difficulty: {exercise.difficultyRating}
                </span>
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded">
                  {exercise.estimatedTime}s
                </span>
              </div>
            </div>
            <p className="text-gray-700 text-lg">{exercise.prompt}</p>
          </div>

          {/* Exercise Content */}
          <div className="mb-8">
            {exercise.type === 'mcq' && (
              <MCQExercise
                data={exercise.data}
                onAnswer={setUserAnswer}
                disabled={result !== null}
              />
            )}
            
            {exercise.type === 'true_false' && (
              <TrueFalseExercise
                data={exercise.data}
                onAnswer={setUserAnswer}
                disabled={result !== null}
              />
            )}
            
            {exercise.type === 'match' && (
              <MatchExercise
                data={exercise.data}
                onAnswer={setUserAnswer}
                disabled={result !== null}
              />
            )}
            
            {exercise.type === 'anagram' && (
              <AnagramExercise
                data={exercise.data}
                onAnswer={setUserAnswer}
                disabled={result !== null}
              />
            )}
          </div>

          {/* Submit Button */}
          {!result && (
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={userAnswer === null || submitting}
                className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-8 p-6 rounded-lg">
              <div className={`text-center ${result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <h3 className={`text-xl font-semibold mb-2 ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {result.isCorrect ? 'Correct! 🎉' : 'Incorrect 😞'}
                </h3>
                <p className="text-gray-700 mb-2">
                  Elo change: {result.deltaElo > 0 ? '+' : ''}{result.deltaElo}
                </p>
                <p className="text-gray-700 mb-4">
                  New Elo: {result.newElo}
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={handleContinue}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Exercise Components
function MCQExercise({ data, onAnswer, disabled }: { data: MCQData; onAnswer: (answer: number) => void; disabled: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-gray-700">{data.question}</p>
      {data.options.map((option: string, index: number) => (
        <label key={index} className="flex items-center space-x-3 cursor-pointer">
          <input
            type="radio"
            name="mcq-answer"
            value={index}
            onChange={() => onAnswer(index)}
            disabled={disabled}
            className="text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-700">{option}</span>
        </label>
      ))}
    </div>
  );
}

function TrueFalseExercise({ data, onAnswer, disabled }: { data: TrueFalseData; onAnswer: (answer: boolean) => void; disabled: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-gray-700">{data.statement}</p>
      <div className="flex space-x-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="tf-answer"
            value="true"
            onChange={() => onAnswer(true)}
            disabled={disabled}
            className="text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-700">True</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="tf-answer"
            value="false"
            onChange={() => onAnswer(false)}
            disabled={disabled}
            className="text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-700">False</span>
        </label>
      </div>
    </div>
  );
}

function MatchExercise({ data, onAnswer, disabled }: { data: MatchData; onAnswer: (answer: Record<number, number>) => void; disabled: boolean }) {
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

  const handleMatch = (leftIndex: number, rightIndex: number) => {
    const newMatches = { ...matches, [leftIndex]: rightIndex };
    setMatches(newMatches);
    onAnswer(newMatches);
  };

  const rightAlreadyTaken = (rightIndex: number) => {
    return Object.values(matches).includes(rightIndex);
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Left Column</h4>
        {data.left.map((item: string, index: number) => (
          <button
            key={index}
            onClick={() => {
              if (disabled) return;
              setSelectedLeft(index);
            }}
            className={`block w-full p-3 rounded mb-2 text-left ${selectedLeft === index ? "bg-indigo-100" : "bg-gray-50"} hover:bg-indigo-50 disabled:cursor-not-allowed`}
            disabled={disabled}
          >
            {item}
          </button>
        ))}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Right Column</h4>
        {data.right.map((item: string, index: number) => (
          <button
            key={index}
            onClick={() => {
              if (disabled) return;
              if (selectedLeft !== null && matches[selectedLeft] === undefined && !rightAlreadyTaken(index)) {
                handleMatch(selectedLeft, index);
                setSelectedLeft(null);
              }
            }}
            disabled={disabled || rightAlreadyTaken(index)}
            className="block w-full p-3 bg-blue-50 rounded mb-2 text-left hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnagramExercise({ data, onAnswer, disabled }: { data: AnagramData; onAnswer: (answer: string) => void; disabled: boolean }) {
  const [answer, setAnswer] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {data.letters.map((letter: string, index: number) => (
          <span
            key={index}
            className="px-3 py-2 bg-blue-100 text-blue-800 rounded font-mono"
          >
            {letter}
          </span>
        ))}
      </div>
      <input
        type="text"
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          onAnswer(e.target.value);
        }}
        placeholder="Enter your answer..."
        disabled={disabled}
        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
