"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  nativeLanguage: string;
  targetLanguage: string;
  elo: number;
  createdAt: string;
}

interface Keyword {
  id: string;
  value: string;
  createdAt: string;
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

interface PracticeSuggestion {
  id: string;
  type: "mcq" | "true_false" | "match" | "anagram";
  prompt: string;
  data: MCQData | TrueFalseData | MatchData | AnagramData;
  difficultyRating: number;
  estimatedTime: number;
  keywords: string[];
}

export default function OverviewPage() {
  const [user, setUser] = useState<User | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [suggestions, setSuggestions] = useState<PracticeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggestionsError, setSuggestionsError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [currentExercise, setCurrentExercise] =
    useState<PracticeSuggestion | null>(null);
  const [userAnswer, setUserAnswer] = useState<
    string | number | boolean | Record<number, number> | null
  >(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    deltaElo: number;
    newElo: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const userResponse = await fetch("/api/user/me");
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch user data");
      }
      const userData = await userResponse.json();
      setUser(userData.user);

      const keywordsResponse = await fetch("/api/keywords");
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json();
        setKeywords(keywordsData.keywords);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchSuggestions = useCallback(async () => {
    const mergeUnique = (
      curr: PracticeSuggestion[],
      next: PracticeSuggestion[]
    ) => {
      const seen = new Set(curr.map((i) => i.id));
      const filtered = next.filter((i) => !seen.has(i.id));
      return [...curr, ...filtered];
    };

    const fetchBatch = async (limit = 5): Promise<PracticeSuggestion[]> => {
      const res = await fetch(`/api/suggestions?limit=${limit}`);
      if (!res.ok) {
        if (res.status === 503) {
          setSuggestionsError(
            "Không thể tải gợi ý luyện tập (dịch vụ AI không sẵn sàng)"
          );
        }
        return [];
      }
      const data = await res.json();
      const items = (data.items || []) as PracticeSuggestion[];
      items.forEach((s) => {
        sessionStorage.setItem(`exercise_${s.id}`, JSON.stringify(s));
      });
      return items;
    };

    let initial: PracticeSuggestion[] = [];
    try {
      setSuggestionsLoading(true);
      setSuggestionsError("");
      initial = await fetchBatch(5);
      setSuggestions(initial);
      if (initial.length > 0) {
        setCurrentPracticeIndex(0);
        setCurrentExercise(initial[0]);
      } else {
        setCurrentExercise(null);
      }
    } catch (e) {
      setSuggestionsError("Không thể tải gợi ý luyện tập");
      setSuggestions([]);
      setCurrentExercise(null);
    } finally {
      setSuggestionsLoading(false);
    }

    try {
      if (initial.length < 15) {
        setFetchingMore(true);
        let current = initial;
        let safety = 10;
        while (current.length < 15 && safety-- > 0) {
          const batch = await fetchBatch(5);
          if (batch.length === 0) break;
          current = mergeUnique(current, batch);
          setSuggestions(current);
        }
      }
    } finally {
      setFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchData().then(() => {
      fetchSuggestions();
    });
  }, [fetchData, fetchSuggestions]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      console.error("Logout error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
            onClick={fetchData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                English Learning App
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {user?.username}! Elo: {user?.elo}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col space-y-8">
          {/* Keyword Manager Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Keyword Manager
            </h2>
            <div className="space-y-2">
              {keywords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No keywords added yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword.id}
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
                    >
                      {keyword.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={async () => {
                  setEditOpen(true);
                  setEditLoading(true);
                  try {
                    const res = await fetch("/api/keywords");
                    if (res.ok) {
                      const data = await res.json();
                      setKeywords(data.keywords || []);
                    }
                  } finally {
                    setEditLoading(false);
                  }
                }}
                className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900"
              >
                Edit Keywords
              </button>
            </div>
          </div>

          {editOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Edit Keywords
                  </h4>
                  <button
                    onClick={() => setEditOpen(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Close
                  </button>
                </div>
                {editLoading ? (
                  <p className="text-gray-600">Loading...</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {keywords.map((k) => (
                        <span
                          key={k.id}
                          className="inline-flex items-center gap-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
                        >
                          {k.value}
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/keywords/${k.id}`, {
                                method: "DELETE",
                              });
                              if (res.ok) {
                                setKeywords(
                                  keywords.filter((kw) => kw.id !== k.id)
                                );
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {keywords.length === 0 && (
                        <span className="text-sm text-gray-500">
                          No keywords yet
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Add a new keyword..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={async () => {
                          if (!newKeyword.trim()) return;
                          const res = await fetch("/api/keywords", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ value: newKeyword.trim() }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setKeywords([data.keyword, ...keywords]);
                            setNewKeyword("");
                          }
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Practice Inline Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">Practice</h2>
                {user && (
                  <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded">
                    Elo: {user.elo}
                  </span>
                )}
              </div>
              {suggestionsError && !suggestionsLoading && (
                <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded">
                  {suggestionsError}
                </span>
              )}
              <div className="flex items-center gap-2">
                {fetchingMore && (
                  <div
                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"
                    aria-label="loading more"
                  />
                )}
                <button
                  onClick={() => {
                    if (suggestions.length === 0) return;
                    const nextIndex = Math.max(0, currentPracticeIndex - 1);
                    if (nextIndex !== currentPracticeIndex) {
                      setCurrentPracticeIndex(nextIndex);
                      setCurrentExercise(suggestions[nextIndex]);
                      setUserAnswer(null);
                      setResult(null);
                      setPracticeError("");
                    }
                  }}
                  className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  disabled={
                    suggestions.length === 0 || currentPracticeIndex === 0
                  }
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    if (suggestions.length === 0) return;
                    const nextIndex = Math.min(
                      suggestions.length - 1,
                      currentPracticeIndex + 1
                    );
                    if (nextIndex !== currentPracticeIndex) {
                      setCurrentPracticeIndex(nextIndex);
                      setCurrentExercise(suggestions[nextIndex]);
                      setUserAnswer(null);
                      setResult(null);
                      setPracticeError("");
                    }
                  }}
                  className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  disabled={
                    suggestions.length === 0 ||
                    currentPracticeIndex === suggestions.length - 1
                  }
                >
                  →
                </button>
              </div>
            </div>

            {suggestionsLoading ? (
              <div className="animate-pulse">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-6 w-40 bg-gray-200 rounded"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 w-28 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="h-5 w-3/4 bg-gray-200 rounded mb-6"></div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : suggestions.length === 0 || !currentExercise ? (
              <p className="text-gray-500 text-center py-8">
                No suggestions available
              </p>
            ) : (
              <div className="">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 capitalize">
                    {currentExercise.type.replace("_", " ")} Exercise
                  </h3>
                  <div className="flex space-x-2">
                    <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded">
                      Difficulty: {currentExercise.difficultyRating}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 text-lg mb-6">
                  {currentExercise.prompt}
                </p>

                <div className="mb-8">
                  {currentExercise.type === "mcq" && (
                    <MCQExercise
                      data={currentExercise.data as MCQData}
                      onAnswer={setUserAnswer}
                      disabled={result !== null}
                    />
                  )}
                  {currentExercise.type === "true_false" && (
                    <TrueFalseExercise
                      data={currentExercise.data as TrueFalseData}
                      onAnswer={setUserAnswer}
                      disabled={result !== null}
                    />
                  )}
                  {currentExercise.type === "match" && (
                    <MatchExercise
                      data={currentExercise.data as MatchData}
                      onAnswer={setUserAnswer}
                      disabled={result !== null}
                    />
                  )}
                  {currentExercise.type === "anagram" && (
                    <AnagramExercise
                      data={currentExercise.data as AnagramData}
                      onAnswer={setUserAnswer}
                      disabled={result !== null}
                    />
                  )}
                </div>

                {!result && (
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        if (!currentExercise || userAnswer === null) return;
                        setSubmitting(true);
                        setPracticeError("");
                        try {
                          const response = await fetch("/api/practice/submit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              exerciseId: currentExercise.id,
                              answer: userAnswer,
                              exerciseType: currentExercise.type,
                              difficultyRating:
                                currentExercise.difficultyRating,
                              correctAnswer: currentExercise.data,
                            }),
                          });
                          const data = await response.json();
                          if (response.ok) {
                            setResult(data);
                          } else {
                            setPracticeError(
                              data.error || "Failed to submit answer"
                            );
                          }
                        } catch {
                          setPracticeError("Network error. Please try again.");
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      disabled={userAnswer === null || submitting}
                      className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting..." : "Submit Answer"}
                    </button>
                  </div>
                )}

                {practiceError && (
                  <p className="text-center text-red-600 mt-4">
                    {practiceError}
                  </p>
                )}

                {result && (
                  <div className="mt-8 p-6 rounded-lg">
                    <div
                      className={`text-center ${
                        result.isCorrect
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      } border`}
                    >
                      <h3
                        className={`text-xl font-semibold mb-2 ${
                          result.isCorrect ? "text-green-800" : "text-red-800"
                        }`}
                      >
                        {result.isCorrect ? "Correct! 🎉" : "Incorrect 😞"}
                      </h3>
                      <p className="text-gray-700 mb-2">
                        Elo change: {result.deltaElo > 0 ? "+" : ""}
                        {result.deltaElo}
                      </p>
                      <p className="text-gray-700 mb-4">
                        New Elo: {result.newElo}
                      </p>
                    </div>

                    <div className="mt-6 p-4 border rounded">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Correct Answer
                      </h4>
                      {currentExercise.type === "mcq" && (
                        <p className="text-gray-700 mt-2">
                          {
                            (currentExercise.data as MCQData).options[
                              (currentExercise.data as MCQData).correctIndex
                            ]
                          }
                        </p>
                      )}
                      {currentExercise.type === "true_false" && (
                        <p className="text-gray-700 mt-2">
                          {(currentExercise.data as TrueFalseData).correct
                            ? "True"
                            : "False"}
                        </p>
                      )}
                      {currentExercise.type === "match" && (
                        <div className="mt-2 space-y-2">
                          {Object.entries(
                            (currentExercise.data as MatchData).pairs
                          ).map(([l, r]) => {
                            const md = currentExercise.data as MatchData;
                            const li = Number(l);
                            const ri = Number(r);
                            return (
                              <div key={l} className="text-gray-700">
                                {md.left[li]} {"->"} {md.right[ri]}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {currentExercise.type === "anagram" && (
                        <p className="text-gray-700 mt-2">
                          {(currentExercise.data as AnagramData).target}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => {
                          if (suggestions.length === 0) return;
                          const nextIndex = Math.min(
                            suggestions.length - 1,
                            currentPracticeIndex + 1
                          );
                          if (nextIndex !== currentPracticeIndex) {
                            setCurrentPracticeIndex(nextIndex);
                            setCurrentExercise(suggestions[nextIndex]);
                            setUserAnswer(null);
                            setResult(null);
                            setPracticeError("");
                          }
                        }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        disabled={
                          suggestions.length === 0 ||
                          currentPracticeIndex === suggestions.length - 1
                        }
                      >
                        Jump to Next Item
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MCQExercise({
  data,
  onAnswer,
  disabled,
}: {
  data: MCQData;
  onAnswer: (answer: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-gray-700">{data.question}</p>
      {data.options.map((option: string, index: number) => (
        <label
          key={index}
          className="flex items-center space-x-3 cursor-pointer"
        >
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

function TrueFalseExercise({
  data,
  onAnswer,
  disabled,
}: {
  data: TrueFalseData;
  onAnswer: (answer: boolean) => void;
  disabled: boolean;
}) {
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

function MatchExercise({
  data,
  onAnswer,
  disabled,
}: {
  data: MatchData;
  onAnswer: (answer: Record<number, number>) => void;
  disabled: boolean;
}) {
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
            className={`block w-full p-3 rounded mb-2 text-left border ${
              selectedLeft === index
                ? "bg-indigo-200 border-indigo-300"
                : "bg-gray-100 border-gray-300"
            } hover:bg-indigo-200 text-gray-800 disabled:cursor-not-allowed`}
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
              if (
                selectedLeft !== null &&
                matches[selectedLeft] === undefined &&
                !rightAlreadyTaken(index)
              ) {
                handleMatch(selectedLeft, index);
                setSelectedLeft(null);
              }
            }}
            disabled={disabled || rightAlreadyTaken(index)}
            className="block w-full p-3 bg-blue-200 text-gray-800 rounded mb-2 text-left border border-blue-300 hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnagramExercise({
  data,
  onAnswer,
  disabled,
}: {
  data: AnagramData;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<boolean[]>(() =>
    Array(data.letters.length).fill(false)
  );
  const [orderedTokens, setOrderedTokens] = useState<string[]>([]);

  const handleSelect = (index: number) => {
    if (disabled || selected[index]) return;
    const token = data.letters[index];
    const nextSelected = [...selected];
    nextSelected[index] = true;
    const nextOrdered = [...orderedTokens, token];
    setSelected(nextSelected);
    setOrderedTokens(nextOrdered);
    onAnswer(nextOrdered.join(""));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {data.letters.map((token: string, index: number) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={disabled || selected[index]}
            className="px-3 py-2 bg-blue-200 text-gray-800 rounded hover:bg-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {token}
          </button>
        ))}
      </div>
      <div className="min-h-12 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex flex-wrap gap-2">
          {orderedTokens.map((t: string, i: number) => (
            <span
              key={i}
              className="px-3 py-2 bg-green-100 text-gray-800 rounded"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
