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
        {/* Priority first, then status */}
        {issue.priority && (
          <span className={`px-3 py-1 text-sm font-medium rounded ${
            issue.priority === 'High' ? 'bg-red-100 text-red-800' :
            issue.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
            'bg-green-100 text-green-800'
          }`}>
            {issue.priority}
          </span>
        )}
        <span className={`px-3 py-1 text-sm font-medium rounded ${statusInfo.color}`}>
          {statusInfo.name}
        </span>
        <span className="font-medium">
          {issue.title}
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

  // Helper function to sort issues by priority first, then by status
  const sortIssues = (items: RoadmapItem[]) => {
    // Define priority order (High -> Medium -> Low -> no priority)
    const priorityOrder = ['High', 'Medium', 'Low'];
    // Define status order (Fix in testing -> In progress -> Not started)
    const statusOrder = ['56b00745-d98a-45b3-b50f-2617612acd24', 'dccfec41-1f77-4394-8e1f-eac1761a6565', '30d36a1f-2bce-4db6-b303-fc4ce072913e'];
    
    return items.sort((a, b) => {
      // First sort by priority
      const aPriorityIndex = priorityOrder.indexOf(a.priority || '');
      const bPriorityIndex = priorityOrder.indexOf(b.priority || '');
      
      // If priority not found, put at end
      const aIndex = aPriorityIndex === -1 ? priorityOrder.length : aPriorityIndex;
      const bIndex = bPriorityIndex === -1 ? priorityOrder.length : bPriorityIndex;
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      // If priorities are equal, sort by status
      const aStatusIndex = statusOrder.indexOf(a.statusId || '');
      const bStatusIndex = statusOrder.indexOf(b.statusId || '');
      
      const aStatusIdx = aStatusIndex === -1 ? statusOrder.length : aStatusIndex;
      const bStatusIdx = bStatusIndex === -1 ? statusOrder.length : bStatusIndex;
      
      return aStatusIdx - bStatusIdx;
    });
  };

  // Sort all known issues by priority first, then by status
  const sortedKnownIssues = sortIssues(knownIssues);

  // Group issues by priority for rendering with separation
  const groupedByPriority = sortedKnownIssues.reduce((groups, issue) => {
    const priority = issue.priority || 'No Priority';
    if (!groups[priority]) {
      groups[priority] = [];
    }
    groups[priority].push(issue);
    return groups;
  }, {} as Record<string, RoadmapItem[]>);

  // Get priority order for rendering
  const priorityOrder = ['High', 'Medium', 'Low', 'No Priority'];
  const orderedPriorities = priorityOrder.filter(priority => groupedByPriority[priority]);

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
        {/* Render issues grouped by priority with separation */}
        {orderedPriorities.map((priority, priorityIndex) => (
          <div key={priority}>
            {priorityIndex > 0 && <div className="mb-4"></div>}
            {groupedByPriority[priority].map((issue) => (
              <IssueItem key={issue.id} issue={issue} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 