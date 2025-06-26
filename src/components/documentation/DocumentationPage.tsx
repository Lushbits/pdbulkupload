/**
 * Documentation Page Component  
 * Generic wrapper for documentation pages - delegates to specific page components
 */

import React from 'react';
import { RoadmapPage } from './RoadmapPage';

// This component currently just renders the RoadmapPage
// but could be extended to handle different documentation page types
export const DocumentationPageWrapper: React.FC = () => {
  return <RoadmapPage />;
};

// Export as RoadmapPage for backwards compatibility with existing imports
export { DocumentationPageWrapper as RoadmapPage }; 