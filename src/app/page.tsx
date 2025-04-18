'use client';

import dynamic from "next/dynamic";

// Use dynamic import for components that use browser APIs
const EMDRSession = dynamic(() => import('../components/EMDRSession'), { 
  loading: () => <div className="p-12 text-center">Loading EMDR session...</div>
});

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Doctor Feel Good
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            EMDR Therapy Assistant
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <EMDRSession />
      </main>
      
      <footer className="bg-white dark:bg-gray-800 shadow-inner mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Built with ❤️ to support mental health professionals
          </p>
        </div>
      </footer>
    </div>
  );
}
