/**
 * Beta Banner Component
 * Shows a clickable banner warning users about beta status
 */

import React from 'react';

export const BetaBanner: React.FC = () => {
  return (
    <a 
      href="https://holy-mind-c22.notion.site/Known-Issues-Roadmap-21c42cb43d56800f9c34c29420151613"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center justify-center gap-3 text-center">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center group-hover:bg-amber-200 transition-colors">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.312 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-amber-800 font-medium text-sm sm:text-base">
            This tool is currently in beta testing. Please do not use with real employee data yet.
          </p>
          <p className="text-amber-700 text-xs sm:text-sm mt-1 group-hover:text-amber-800 transition-colors">
            Click here for known issues and upcoming developments.
          </p>
        </div>
        
        {/* Click Indicator */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600 group-hover:text-amber-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  );
}; 