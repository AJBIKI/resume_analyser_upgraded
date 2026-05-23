'use client';

import React from 'react';
import Link from 'next/link';
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs';
import { Zap, History, User, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function Navbar() {
  const { isSignedIn, user, isLoaded } = useUser();

  return (
    <nav className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-pink-500/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 rounded-lg dark:shadow-[0_0_15px_rgba(236,72,153,0.5)]">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-pink-400 dark:to-pink-600 bg-clip-text text-transparent">
              Resume Analyzer
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isSignedIn && (
              <Link
                href="/history"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-pink-400 hover:bg-gray-100 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                <span className="text-sm font-medium">History</span>
              </Link>
            )}
            
            {!isLoaded ? (
              <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse"></div>
            ) : isSignedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-zinc-900 rounded-lg dark:border dark:border-pink-500/20">
                  <User className="w-4 h-4 text-gray-600 dark:text-pink-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
                <SignOutButton>
                  <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </SignOutButton>
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-pink-500 dark:to-pink-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 dark:hover:from-pink-600 dark:hover:to-pink-700 dark:shadow-[0_0_10px_rgba(236,72,153,0.4)] transition-all">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign In</span>
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
