/**
 * Beta Tag Component
 * Shows a stylish "BETA" tag in the header that can be clicked
 */

import React from 'react';
import { Link } from 'wouter';

export const BetaTag: React.FC = () => {
  return (
    <Link
      href="/status"
      className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500 text-white text-sm font-bold uppercase tracking-wide rounded-full hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg cursor-pointer"
      style={{
        marginLeft: '12px',
        position: 'relative',
        top: '-1px'
      }}
      title="Click to view beta information and known issues"
    >
      BETA
    </Link>
  );
}; 