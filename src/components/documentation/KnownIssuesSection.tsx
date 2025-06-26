/**
 * Known Issues Section Component
 * Displays filtered known issues grouped by status
 */

import React from 'react';
import { getCurrentVersion } from '../ui/VersionModal';
import type { RoadmapItem } from '../../services/notionApi';

interface KnownIssuesSectionProps {
  roadmapItems: RoadmapItem[];
}

// Helper component to render a single issue
const IssueItem: React.FC<{ issue: RoadmapItem }> = ({ issue }) => {
  // Map status IDs to readable names and colors
  const getStatusInfo = (statusId: string) => {
    switch (statusId) {
      case '56b00745-d98a-45b3-b50f-2617612acd24': 
        return { name: 'Fix in testing', color: 'bg-green-100 text-green-800' };
      case 'dccfec41-1f77-4394-8e1f-eac1761a6565': 
        return { name: 'In progress', color: 'bg-yellow-100 text-yellow-800' };
      case '30d36a1f-2bce-4db6-b303-fc4ce072913e': 
        return { name: 'Not started', color: 'bg-gray-100 text-gray-800' };
      default: 
        return { name: issue.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const statusInfo = getStatusInfo(issue.statusId);

  return (
    <div className="text-gray-900 py-1">
      <span className="inline-flex items-center gap-2 flex-wrap">
        <span className={`px-3 py-1 text-sm font-bold rounded ${statusInfo.color}`}>
          {statusInfo.name}
        </span>
        {issue.priority && (
          <span className={`px-3 py-1 text-sm font-bold rounded ${
            issue.priority === 'High' ? 'bg-red-100 text-red-800' :
            issue.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
            {issue.priority}
          </span>
        )}
        <span className="font-medium">
          {issue.title}
        </span>
        <span className="text-sm text-gray-500">
          (Updated: {new Date(issue.updated).toISOString().split('T')[0]})
        </span>
      </span>
    </div>
  );
};

export const KnownIssuesSection: React.FC<KnownIssuesSectionProps> = ({ roadmapItems }) => {
  // Filter known issues: Bugfix category AND status is not "In production"
  const knownIssues = roadmapItems.filter(item => {
    // Is bugfix category (specific ID "jhtk")
    const isBugfix = item.categoryId === 'jhtk';
    // Not in production (status ID is not "h]z\\")
    const notInProduction = item.statusId !== 'h]z\\';
    
    return isBugfix && notInProduction;
  });

  // Group known issues by status
  const fixImplementedIssues = knownIssues.filter(item => item.statusId === '56b00745-d98a-45b3-b50f-2617612acd24');
  const inProgressIssues = knownIssues.filter(item => item.statusId === 'dccfec41-1f77-4394-8e1f-eac1761a6565');
  const notStartedIssues = knownIssues.filter(item => item.statusId === '30d36a1f-2bce-4db6-b303-fc4ce072913e');

  // Don't render if no known issues
  if (knownIssues.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        Known Issues in version {getCurrentVersion()}
      </h2>
      
      <div className="space-y-1">
        {/* All issues sorted by status priority: Fix in testing, In progress, Not started */}
        {fixImplementedIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
        {inProgressIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
        {notStartedIssues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}; 