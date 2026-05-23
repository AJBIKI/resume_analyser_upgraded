'use client';

import React, { useState, useEffect } from 'react';
import { History, FileText, Target, AlertTriangle, CheckCircle, Loader2, Zap, ArrowRight, Clock } from 'lucide-react';
import { useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

interface AnalysisSummary {
  id: string;
  resumeFilename: string;
  matchScore: number;
  atsIssueCount: number;
  matchingKeywordCount: number;
  missingKeywordCount: number;
  createdAt: string;
}

export default function HistoryPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setAnalyses(data.analyses);
      } catch (err) {
        setError('Failed to load analysis history.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isLoaded, isSignedIn]);

  // Helper function to get score color classes
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-black dark:via-black dark:to-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-pink-500 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-black dark:via-black dark:to-zinc-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-gray-100 dark:border-pink-500/30 p-8 max-w-md w-full text-center dark:shadow-[0_0_30px_rgba(236,72,153,0.1)]">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 rounded-full w-fit mx-auto mb-6 dark:shadow-[0_0_20px_rgba(236,72,153,0.5)]">
            <History className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Sign In Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please sign in to view your analysis history.</p>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 dark:hover:from-pink-600 dark:hover:to-pink-700 dark:shadow-[0_0_10px_rgba(236,72,153,0.4)] transition-all font-medium">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-black dark:via-black dark:to-zinc-900">


      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 rounded-full shadow-lg dark:shadow-[0_0_20px_rgba(236,72,153,0.5)]">
              <History className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent mb-3">
            Analysis History
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Review your past resume analyses and track your improvements
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-blue-600 dark:text-pink-500 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Loading your history...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-red-200 dark:border-red-500/50 p-8 max-w-md mx-auto text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-gray-100 dark:border-pink-500/30 p-12 max-w-lg mx-auto text-center dark:shadow-[0_0_20px_rgba(236,72,153,0.1)]">
            <FileText className="w-16 h-16 text-gray-300 dark:text-zinc-600 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">No Analyses Yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload your first resume to get started with AI-powered analysis.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 dark:hover:from-pink-600 dark:hover:to-pink-700 dark:shadow-[0_0_10px_rgba(236,72,153,0.4)] transition-all font-medium"
            >
              <Zap className="w-5 h-5" />
              Analyze Your First Resume
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/results?id=${analysis.id}`}
                className="block bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-gray-100 dark:border-pink-500/30 hover:shadow-md hover:border-blue-200 dark:hover:border-pink-500 dark:hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-200 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    {/* Left: File info & stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 dark:bg-pink-900/30 rounded-lg flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-pink-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-pink-400 transition-colors">
                            {analysis.resumeFilename}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats pills */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-500/30">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {analysis.matchingKeywordCount} matched
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-sm font-medium border border-red-200 dark:border-red-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {analysis.missingKeywordCount} missing
                        </span>
                        {analysis.atsIssueCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium border border-orange-200 dark:border-orange-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {analysis.atsIssueCount} ATS issues
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Score + arrow */}
                    <div className="flex items-center gap-4 ml-6 flex-shrink-0">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.matchScore).split(' ')[0]} dark:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]`}>
                          {analysis.matchScore}%
                        </div>
                        <div className="w-20 h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${getScoreBarColor(analysis.matchScore)} dark:bg-pink-500 dark:shadow-[0_0_10px_rgba(236,72,153,0.8)]`}
                            style={{ width: `${analysis.matchScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Match Score</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 dark:text-zinc-600 group-hover:text-blue-500 dark:group-hover:text-pink-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
