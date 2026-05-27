'use client'

import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, Briefcase, Zap, CheckCircle, AlertCircle, Loader2, Target, User, LogOut, History, FileUp } from 'lucide-react';
import { useUser, useAuth, SignInButton, SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import { io } from 'socket.io-client';

const ResumeForm: React.FC = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ step: '', percent: 0 });
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [extractingJD, setExtractingJD] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<any>(null);

  // Clean up socket connection on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Reset file inputs on mount (fixes stale state after browser back navigation)
  useEffect(() => {
    if (resumeInputRef.current) resumeInputRef.current.value = '';
    if (jdInputRef.current) jdInputRef.current.value = '';
  }, []);

  const handleJDFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdFile(file);
    setExtractingJD(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-text', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Extraction failed');
      }
      const { text } = await res.json();
      setJobDescription(text);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to extract text from file: ${message}. You can paste the job description manually.`);
      console.error(err);
    } finally {
      setExtractingJD(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is signed in
    if (!isSignedIn) {
      setError("Please sign in to analyze your resume.");
      return;
    }
    
    if (!resumeFile && !jobDescription.trim()) {
      setError("Please upload a resume or enter a job description.");
      return;
    }

    setIsLoading(true);
    setProgress({ step: 'Uploading file...', percent: 5 });
    setError("");

    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analysis failed to start");
      }

      const data = await response.json();
      const { jobId } = data;

      if (!jobId) throw new Error("No job ID received");

      // Grab the Clerk JWT token for secure socket connection
      const token = await getToken();

      // Connect to the Express Socket.io server
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        auth: { token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('joinJobRoom', jobId);
      });

      socket.on('connect_error', (err) => {
        setError(`Connection failed: ${err.message}. Ensure backend is running.`);
        setIsLoading(false);
        socket.disconnect();
      });

      socket.on('progress', (data) => {
        setProgress({ step: data.step, percent: data.percent });
      });

      socket.on('completed', (result) => {
        if (result.analysisId) {
          window.location.href = `/results?id=${result.analysisId}`;
        } else {
          setError("Failed to save analysis to database. Please try again.");
          setIsLoading(false);
        }
        socket.disconnect();
      });

      socket.on('error', (err) => {
        setError(err.message || 'Analysis failed');
        setIsLoading(false);
        socket.disconnect();
      });

    } catch (err) {
      setError("Failed to analyze resume. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-black dark:via-black dark:to-zinc-900">


      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 rounded-full shadow-lg dark:shadow-[0_0_20px_rgba(236,72,153,0.5)]">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent mb-4">
            Resume Analyzer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Get instant insights on your resume's performance with AI-powered analysis. 
            Optimize for ATS systems and improve your job match score.
          </p>
        </div>

        {/* Main Form Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-gray-100 dark:border-pink-500/30 overflow-hidden dark:shadow-[0_0_30px_rgba(236,72,153,0.1)]">
            
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-600 dark:to-pink-800 px-8 py-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FileText className="w-7 h-7" />
                Upload & Analyze
              </h2>
              <p className="text-blue-100 mt-2">Upload your resume and job description to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                
                {/* Resume Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-pink-900/30 rounded-lg">
                      <Upload className="w-5 h-5 text-blue-600 dark:text-pink-500" />
                    </div>
                    <label htmlFor="resume" className="text-lg font-semibold text-gray-800 dark:text-white">
                      Upload Resume
                    </label>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="resume"
                      ref={resumeInputRef}
                      accept=".pdf"
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="resume"
                      className={`
                        flex flex-col items-center justify-center w-full h-48 
                        border-2 border-dashed rounded-xl cursor-pointer 
                        transition-all duration-300 hover:bg-gray-50 dark:hover:bg-zinc-900
                        ${resumeFile 
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-500' 
                          : 'border-gray-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-pink-500'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {resumeFile ? (
                          <>
                            <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mb-3" />
                            <p className="text-green-700 dark:text-green-400 font-medium">{resumeFile.name}</p>
                            <p className="text-sm text-green-600 dark:text-green-500">
                              {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • PDF
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 text-gray-400 dark:text-zinc-500 mb-3" />
                            <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                              Drop your PDF here
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {resumeFile && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-green-800 dark:text-green-400 text-sm font-medium">Resume uploaded successfully!</span>
                    </div>
                  )}
                </div>

                {/* Job Description Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-pink-900/30 rounded-lg">
                      <Briefcase className="w-5 h-5 text-indigo-600 dark:text-pink-500" />
                    </div>
                    <label htmlFor="jobDescription" className="text-lg font-semibold text-gray-800 dark:text-white">
                      Job Description
                    </label>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full h-48 px-4 py-3 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-pink-500 focus:border-transparent resize-none transition-all duration-200"
                      placeholder="Paste the complete job description here...

Example:
• Bachelor's degree in Computer Science
• 3+ years of experience with React and Node.js
• Strong knowledge of JavaScript, TypeScript
• Experience with AWS, Docker, and CI/CD
• Excellent communication skills"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                      {jobDescription.length} characters
                    </div>
                  </div>

                  {/* JD File Upload */}
                  <div className="relative">
                    <input
                      type="file"
                      id="jdFile"
                      ref={jdInputRef}
                      accept=".pdf,.docx"
                      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={handleJDFileUpload}
                      disabled={extractingJD}
                      className="hidden"
                    />
                    <label
                      htmlFor="jdFile"
                      className={`
                        flex items-center gap-3 w-full p-3 
                        border border-dashed rounded-lg cursor-pointer 
                        transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-zinc-900
                        ${extractingJD 
                          ? 'border-blue-400 bg-blue-50 dark:border-pink-500 dark:bg-pink-900/20 cursor-wait' 
                          : jdFile 
                            ? 'border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/20' 
                            : 'border-gray-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-pink-500'
                        }
                      `}
                    >
                      {extractingJD ? (
                        <>
                          <Loader2 className="w-5 h-5 text-blue-600 dark:text-pink-500 animate-spin flex-shrink-0" />
                          <span className="text-blue-700 dark:text-pink-400 text-sm font-medium">Extracting text from file…</span>
                        </>
                      ) : jdFile ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-green-700 dark:text-green-400 text-sm font-medium">{jdFile.name} — text extracted</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-5 h-5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Or upload a JD file (PDF / DOCX)</span>
                        </>
                      )}
                    </label>
                  </div>

                  {jobDescription.trim() && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-pink-900/20 rounded-lg border border-indigo-200 dark:border-pink-500/30">
                      <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-pink-500 flex-shrink-0" />
                      <span className="text-indigo-800 dark:text-pink-400 text-sm font-medium">
                        Job description added • {jobDescription.trim().split(' ').length} words
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-8 flex justify-center">
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-700 hover:from-blue-600 hover:to-indigo-700 dark:hover:from-pink-600 dark:hover:to-pink-800 text-white shadow-lg hover:shadow-xl dark:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-pink-500/50"
                    >
                      <User className="w-6 h-6" />
                      Sign In to Analyze Resume
                    </button>
                  </SignInButton>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`
                      flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg
                      transition-all duration-300 transform hover:scale-105 
                      focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-pink-500/50
                      ${isLoading
                        ? 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-700 hover:from-blue-600 hover:to-indigo-700 dark:hover:from-pink-600 dark:hover:to-pink-800 text-white shadow-lg hover:shadow-xl dark:shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                      }
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analyzing Your Resume...
                      </>
                    ) : (
                      <>
                        <Zap className="w-6 h-6" />
                        Analyze Resume
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Progress Indicator */}
              {isLoading && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{progress.step || 'Processing...'}</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Features Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-gray-100 dark:border-pink-500/30">
              <div className="p-3 bg-blue-100 dark:bg-pink-900/30 rounded-full w-fit mx-auto mb-4">
                <Target className="w-6 h-6 text-blue-600 dark:text-pink-500" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">ATS Optimization</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Ensure your resume passes Applicant Tracking Systems</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-gray-100 dark:border-pink-500/30">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Keyword Matching</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Identify missing keywords and improve job relevance</p>
            </div>
            <div className="text-center p-6 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-gray-100 dark:border-pink-500/30">
              <div className="p-3 bg-purple-100 dark:bg-pink-900/30 rounded-full w-fit mx-auto mb-4">
                <FileText className="w-6 h-6 text-purple-600 dark:text-pink-500" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Readability Score</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Get professional feedback on writing quality</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeForm;