/**
 * Roadmap Page Component
 * Redirects users to the external Notion roadmap page
 */

import React, { useEffect } from 'react';

export const RoadmapPage: React.FC = () => {
  // Redirect to Notion page on component mount
  useEffect(() => {
    window.location.href = 'https://holy-mind-c22.notion.site/Known-Issues-Roadmap-21c42cb43d56800f9c34c29420151613';
  }, []);

  // Show a loading message while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 animate-pulse">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting to Roadmap...
        </h2>
        <p className="text-gray-600">
          Taking you to our Notion documentation page
        </p>
        <p className="text-sm text-gray-500 mt-4">
          If you're not redirected automatically, 
          <a 
            href="https://holy-mind-c22.notion.site/Known-Issues-Roadmap-21c42cb43d56800f9c34c29420151613"
            className="text-blue-600 hover:text-blue-800 underline ml-1"
          >
            click here
          </a>
        </p>
      </div>
    </div>
  );
}; 