import React from "react";
import { 
  CheckCircle, AlertTriangle, Target, FileText, 
  TrendingUp, Users, Award, Zap, AlertCircle, ChevronRight, 
  BookOpen, Code, Lightbulb, UserX
} from 'lucide-react';

export interface AnalysisResult {
  overallScore: number;
  scoreInterpretation: 'strong' | 'moderate' | 'weak';
  rubricBreakdown: {
    technicalSkills: { score: number; maxScore: number; rationale: string };
    yearsOfExperience: { score: number; maxScore: number; rationale: string };
    education: { score: number; maxScore: number; rationale: string };
    keywordCoverage: { score: number; maxScore: number; rationale: string };
    softSkillsAndLeadership: { score: number; maxScore: number; rationale: string };
  };
  seniorityMismatch: {
    detected: boolean;
    resumeLevel: string;
    jdLevel: string;
    message: string | null;
  };
  keywordAnalysis: {
    matchedMustHave: string[];
    missingMustHave: string[];
    matchedNiceToHave: string[];
    missingNiceToHave: string[];
    unexpectedStrengths: string[];
  };
  atsAnalysis: {
    overallAtsScore: number;
    sectionFlags: Array<{ section: string; status: string; severity: string; advice: string }>;
    formattingFlags: string[];
  };
  bulletFeedback: Array<{
    original: string;
    issue: string;
    rewritten: string;
    improvementType: string;
  }>;
  grammarAndStyle: {
    issues: Array<{ text: string; issue: string; suggestion: string }>;
    toneAssessment: string;
    readabilityGrade: number;
    usesFirstPerson: boolean;
    tenseConsistency: string;
  };
  semanticInsights: {
    strongestSections: string[];
    weakestSections: string[];
    meaningGaps: Array<{ area: string; gap: string; suggestion: string }>;
  };
  topPriorityActions: Array<{
    priority: number;
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }>;
  summaryVerdict: string;
  semanticScore: number;
  semanticGaps: Array<{ section: string; score: number }>;
}

interface ResultsProps {
  analysis: AnalysisResult;
}

const Results: React.FC<ResultsProps> = ({ analysis }) => {
  const getScoreColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-50 border-green-200';
    if (percentage >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getBarColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getImpactColor = (impact: string) => {
    switch(impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-600 dark:bg-pink-600 dark:shadow-[0_0_20px_rgba(236,72,153,0.6)] rounded-full shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent mb-3 tracking-tight">Executive Summary</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{analysis.summaryVerdict}</p>
        </div>

        {/* Seniority Mismatch Alert */}
        {analysis.seniorityMismatch.detected && (
          <div className="mb-8 p-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-4">
            <UserX className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-1">Seniority Mismatch Detected</h3>
              <p className="text-red-800">
                You are applying for a <span className="font-bold">{analysis.seniorityMismatch.jdLevel}</span> role, 
                but your resume reads as <span className="font-bold">{analysis.seniorityMismatch.resumeLevel}</span>. 
                {analysis.seniorityMismatch.message}
              </p>
            </div>
          </div>
        )}

        {/* Top Priority Actions - HERO SECTION */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500 dark:text-pink-500" />
            Top Priority Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analysis.topPriorityActions.map((action, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-950 rounded-xl p-6 border border-gray-200 dark:border-pink-500/30 shadow-sm hover:shadow-md dark:shadow-[0_0_10px_rgba(236,72,153,0.1)] dark:hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-2 h-full ${action.impact === 'high' ? 'bg-red-500 dark:bg-pink-600' : action.impact === 'medium' ? 'bg-yellow-500 dark:bg-pink-400' : 'bg-blue-500 dark:bg-pink-300'}`} />
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Priority #{action.priority}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getImpactColor(action.impact)} dark:bg-transparent dark:text-pink-400 dark:border-pink-500`}>
                    {action.impact.toUpperCase()} IMPACT
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-medium">{action.action}</p>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Effort: {action.effort}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scores Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          
          {/* Main Overall Score Card */}
          <div className={`col-span-1 lg:col-span-1 p-8 rounded-2xl border-2 dark:border-pink-500 shadow-lg dark:shadow-[0_0_25px_rgba(236,72,153,0.2)] ${getScoreBg(analysis.overallScore)} dark:bg-black flex flex-col justify-center items-center text-center`}>
            <Target className="w-12 h-12 text-blue-600 dark:text-pink-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Overall Match Score</h2>
            <div className={`text-7xl font-extrabold mb-4 ${getScoreColor(analysis.overallScore)} dark:text-pink-500 dark:drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]`}>
              {analysis.overallScore}<span className="text-3xl text-gray-400 dark:text-zinc-600">%</span>
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium capitalize">
              {analysis.scoreInterpretation} Alignment
            </p>
          </div>

          {/* Rubric Breakdown */}
          <div className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-gray-200 dark:border-pink-500/30 shadow-lg dark:shadow-[0_0_15px_rgba(236,72,153,0.15)]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-600 dark:text-pink-500" />
              Dynamic Scoring Rubric
            </h2>
            <div className="space-y-5">
              {Object.entries(analysis.rubricBreakdown).map(([key, data]) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return (
                  <div key={key}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
                      <span className={`text-sm font-bold ${getScoreColor(data.score, data.maxScore)} dark:text-pink-400`}>
                        {data.score} / {data.maxScore} pts
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
                      <div 
                        className={`h-full ${getBarColor(data.score, data.maxScore)} dark:bg-pink-500 dark:shadow-[0_0_10px_rgba(236,72,153,0.8)]`}
                        style={{ width: `${(data.score / data.maxScore) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 italic">{data.rationale}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Semantic & ATS Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* Semantic Analysis */}
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-pink-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(236,72,153,0.1)] overflow-hidden">
            <div className="bg-indigo-50 dark:bg-pink-950/30 px-6 py-4 border-b border-indigo-100 dark:border-pink-500/20 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-pink-500" />
              <h3 className="text-lg font-bold text-indigo-900 dark:text-pink-400">Semantic Meaning Gaps</h3>
            </div>
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Overall Semantic Score:</span>
                <span className={`text-2xl font-bold ${getScoreColor(analysis.semanticScore)} dark:text-pink-500 dark:drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]`}>
                  {analysis.semanticScore}%
                </span>
              </div>
              
              {analysis.semanticInsights.meaningGaps.length > 0 ? (
                <div className="space-y-4">
                  {analysis.semanticInsights.meaningGaps.map((gap, i) => (
                    <div key={i} className="p-4 bg-indigo-50 dark:bg-zinc-900 rounded-lg border border-indigo-100 dark:border-zinc-800">
                      <p className="text-sm font-bold text-indigo-900 dark:text-pink-400 mb-1">{gap.area.toUpperCase()}</p>
                      <p className="text-sm text-indigo-800 dark:text-gray-300 mb-2"><span className="font-semibold">Gap:</span> {gap.gap}</p>
                      <p className="text-sm text-indigo-700 dark:text-gray-400"><span className="font-semibold">Fix:</span> {gap.suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-green-600 font-medium flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> No major semantic gaps detected.
                </p>
              )}
            </div>
          </div>

          {/* ATS & Formatting */}
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-pink-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(236,72,153,0.1)] overflow-hidden">
            <div className="bg-orange-50 dark:bg-pink-950/30 px-6 py-4 border-b border-orange-100 dark:border-pink-500/20 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-pink-500" />
              <h3 className="text-lg font-bold text-orange-900 dark:text-pink-400">ATS & Section Analysis</h3>
            </div>
            <div className="p-6 space-y-6">
              
              {/* ATS Sections */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-400 mb-3 uppercase tracking-wider">Required Sections</h4>
                <div className="space-y-3">
                  {analysis.atsAnalysis.sectionFlags.map((flag, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      flag.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-800' :
                      flag.severity === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                      'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                      {flag.severity === 'critical' ? <AlertTriangle className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
                      <div>
                        <p className="text-sm font-bold">{flag.section.toUpperCase()} ({flag.status})</p>
                        <p className="text-sm mt-1">{flag.advice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Keywords Comparison */}
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-pink-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(236,72,153,0.1)] overflow-hidden mb-10">
          <div className="bg-gray-50 dark:bg-pink-950/30 px-6 py-4 border-b border-gray-200 dark:border-pink-500/20 flex items-center gap-3">
            <Code className="w-6 h-6 text-gray-700 dark:text-pink-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-pink-400">Keyword Coverage</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Must Haves */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Must-Have Skills</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-2">MATCHED ({analysis.keywordAnalysis.matchedMustHave.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordAnalysis.matchedMustHave.map((k, i) => (
                      <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium border border-green-200">{k}</span>
                    ))}
                    {analysis.keywordAnalysis.matchedMustHave.length === 0 && <span className="text-sm text-gray-500">None found</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-2">MISSING ({analysis.keywordAnalysis.missingMustHave.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordAnalysis.missingMustHave.map((k, i) => (
                      <span key={i} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium border border-red-200">{k}</span>
                    ))}
                    {analysis.keywordAnalysis.missingMustHave.length === 0 && <span className="text-sm text-gray-500">None missing!</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Nice to Haves */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Nice-to-Have / Bonus Skills</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-2">MATCHED ({analysis.keywordAnalysis.matchedNiceToHave.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordAnalysis.matchedNiceToHave.map((k, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium border border-blue-200">{k}</span>
                    ))}
                    {analysis.keywordAnalysis.matchedNiceToHave.length === 0 && <span className="text-sm text-gray-500">None found</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">UNEXPECTED STRENGTHS (Consider highlighting these)</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordAnalysis.unexpectedStrengths.map((k, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium border border-purple-200">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bullet Rewrites */}
        {analysis.bulletFeedback.length > 0 && (
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-pink-500/30 shadow-sm dark:shadow-[0_0_15px_rgba(236,72,153,0.1)] overflow-hidden mb-10">
            <div className="bg-blue-50 dark:bg-pink-950/30 px-6 py-4 border-b border-blue-100 dark:border-pink-500/20 flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-blue-600 dark:text-pink-500" />
              <h3 className="text-lg font-bold text-blue-900 dark:text-pink-400">Experience Bullet Rewrites</h3>
            </div>
            <div className="p-6 space-y-6">
              {analysis.bulletFeedback.map((item, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Original ({item.issue})</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{item.original}"</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-pink-900/20 rounded-lg border border-blue-200 dark:border-pink-500/30 relative">
                    <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-black rounded-full border border-gray-200 dark:border-pink-500 flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-blue-500 dark:text-pink-500" />
                    </div>
                    <p className="text-xs font-bold text-blue-600 dark:text-pink-400 mb-2 uppercase">Suggested Rewrite</p>
                    <p className="text-sm text-blue-900 dark:text-pink-200 font-medium">"{item.rewritten}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Results;