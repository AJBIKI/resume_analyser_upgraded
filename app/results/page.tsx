'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Results from '../components/Results';
import { FileText, AlertCircle, Loader2 } from 'lucide-react';

import { AnalysisResult } from '../components/Results';

function ResultsContent() {
  const searchParams = useSearchParams();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = searchParams.get('id');
    const data = searchParams.get('data');

    if (id) {
      // Fetch from database via API
      fetch(`/api/analysis/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to fetch analysis');
          }
          return res.json();
        })
        .then((result) => {
          setAnalysis(result);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load analysis results.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (data) {
      // Legacy: parse from URL query param
      try {
        const parsed = JSON.parse(decodeURIComponent(data)) as AnalysisResult;
        setAnalysis(parsed);
      } catch (err) {
        setError('Failed to parse analysis data.');
      }
      setLoading(false);
    } else {
      setError('No analysis data provided.');
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-xl border border-red-200 p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">Error</h1>
          </div>
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600 animate-pulse" />
          <p className="text-gray-600 font-medium">Loading analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <main>
      <Results analysis={analysis} />
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}