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
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user data
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

      // Fetch keywords
      const keywordsResponse = await fetch("/api/keywords");
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json();
        setKeywords(keywordsData.keywords);
      }

      // Fetch practice suggestions
      const suggestionsResponse = await fetch("/api/suggestions?limit=5");
      if (suggestionsResponse.ok) {
        const suggestionsData = await suggestionsResponse.json();
        setSuggestions(suggestionsData.items);
        // Store suggestions in sessionStorage for practice page
        (suggestionsData.items as PracticeSuggestion[]).forEach(
          (suggestion) => {
            sessionStorage.setItem(
              `exercise_${suggestion.id}`,
              JSON.stringify(suggestion)
            );
          }
        );
      }
    } catch (err) {
      setError("Failed to load data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: newKeyword.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setKeywords([data.keyword, ...keywords]);
        setNewKeyword("");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add keyword");
      }
    } catch {
      alert("Failed to add keyword");
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      const response = await fetch(`/api/keywords/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setKeywords(keywords.filter((k) => k.id !== id));
      } else {
        alert("Failed to delete keyword");
      }
    } catch {
      alert("Failed to delete keyword");
    }
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Keyword Manager Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Keyword Manager
            </h2>

            {/* Add Keyword Form */}
            <form onSubmit={handleAddKeyword} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add a new keyword..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            </form>

            {/* Keywords List */}
            <div className="space-y-2">
              {keywords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No keywords added yet
                </p>
              ) : (
                keywords.map((keyword) => (
                  <div
                    key={keyword.id}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                  >
                    <span className="text-gray-900">{keyword.value}</span>
                    <button
                      onClick={() => handleDeleteKeyword(keyword.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Practice Suggestions Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Practice Suggestions
            </h2>

            {suggestions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No suggestions available
              </p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {suggestion.type.replace("_", " ")}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {suggestion.estimatedTime}s
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{suggestion.prompt}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Difficulty: {suggestion.difficultyRating}
                        </span>
                        <div className="flex space-x-1">
                          {suggestion.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          router.push(`/practice/${suggestion.id}`)
                        }
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        Practice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
