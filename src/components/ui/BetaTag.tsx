/**
 * Beta Tag Component
 * Shows a stylish "BETA" tag in the header that can be clicked
 */

import React from 'react';

export const BetaTag: React.FC = () => {
  return (
    <a
      href="https://holy-mind-c22.notion.site/Known-Issues-Roadmap-21c42cb43d56800f9c34c29420151613"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500 text-white text-sm font-bold uppercase tracking-wide rounded-full hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg cursor-pointer"
      style={{
        marginLeft: '12px',
        position: 'relative',
        top: '-1px'
      }}
      title="Click to view beta information and known issues"
    >
      BETA
    </a>
  );
}; 