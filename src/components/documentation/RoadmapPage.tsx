/**
 * Roadmap Page Component
 * Main roadmap page that displays known issues and roadmap data from Notion
 */

import React from 'react';
import { useNotionRoadmap } from '../../hooks/useNotionRoadmap';
import { KnownIssuesSection } from './KnownIssuesSection';
import { RoadmapView } from './RoadmapView';
import { ShippedSection } from './ShippedSection';

export const RoadmapPage: React.FC = () => {
  const { roadmapItems, isLoading, error, refetch } = useNotionRoadmap();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Roadmap...
          </h2>
          <p className="text-gray-600">
            Fetching latest roadmap data from Notion
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Roadmap
          </h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <button
            onClick={refetch}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }



  return (
    <div>
      {/* Known Issues Section */}
      <KnownIssuesSection roadmapItems={roadmapItems} />

      {/* Roadmap View Section */}
      <div className="mt-8">
        <RoadmapView roadmapItems={roadmapItems} />
      </div>

      {/* Shipped Section */}
      <div className="mt-8">
        <ShippedSection roadmapItems={roadmapItems} />
      </div>
    </div>
  );
}; 