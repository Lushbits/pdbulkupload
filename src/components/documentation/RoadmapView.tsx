/**
 * Roadmap View Component
 * Displays roadmap items in a three-column kanban-style layout
 */

import React from 'react';
import type { RoadmapItem } from '../../services/notionApi';

interface RoadmapViewProps {
  roadmapItems: RoadmapItem[];
}

// Helper component to render a roadmap card
const RoadmapCard: React.FC<{ item: RoadmapItem }> = ({ item }) => {
  // Map priority IDs to display names and colors
  const getPriorityInfo = (priorityId: string) => {
    switch (priorityId) {
      case '>Cxn': 
        return { name: 'Critical', color: 'bg-red-100 text-red-800' };
      case 'priority_high': 
        return { name: 'High', color: 'bg-orange-100 text-orange-800' };
      case 'priority_medium': 
        return { name: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
      case 'priority_low': 
        return { name: 'Low', color: 'bg-green-100 text-green-800' };
      default: 
        return null;
    }
  };

  const priorityInfo = getPriorityInfo(item.priorityId || '');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Priority - Right aligned */}
      <div className="flex justify-end mb-2">
        {priorityInfo && (
          <span className={`px-2 py-1 text-xs font-medium rounded ${priorityInfo.color}`}>
            {priorityInfo.name}
          </span>
        )}
      </div>
      
      {/* Title */}
      <h4 className="font-medium text-gray-900 mb-2">
        {item.title || 'Untitled'}
      </h4>
      
      {/* Updated Date */}
      <div className="text-xs text-gray-500">
        Updated: {new Date(item.updated).toISOString().split('T')[0]}
      </div>
    </div>
  );
};

// Helper component for each column
const RoadmapColumn: React.FC<{ title: string; items: RoadmapItem[]; count: number; bgColor?: string }> = ({ title, items, count, bgColor = 'bg-gray-50' }) => {
      return (
      <div className="flex-1">
        <div className={`${bgColor} rounded-lg p-4`}>
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
          {title}
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
            {count}
          </span>
        </h4>
        
        <div className="space-y-3">
          {items.map((item) => (
            <RoadmapCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const RoadmapView: React.FC<RoadmapViewProps> = ({ roadmapItems }) => {
  // Filter roadmap items: only category id "f<[|"
  const roadmapFeatures = roadmapItems.filter(item => item.categoryId === 'f<[|');

  // Helper function to sort items by priority
  const sortByPriority = (items: RoadmapItem[]) => {
    const priorityOrder = ['>Cxn', 'priority_high', 'priority_medium', 'priority_low'];
    return items.sort((a, b) => {
      const aPriorityIndex = priorityOrder.indexOf(a.priorityId || '');
      const bPriorityIndex = priorityOrder.indexOf(b.priorityId || '');
      
      // If priority not found, put at end
      const aIndex = aPriorityIndex === -1 ? priorityOrder.length : aPriorityIndex;
      const bIndex = bPriorityIndex === -1 ? priorityOrder.length : bPriorityIndex;
      
      return aIndex - bIndex;
    });
  };

  // Group items by status and sort by priority
  const backlogItems = sortByPriority(roadmapFeatures.filter(item => item.statusId === '30d36a1f-2bce-4db6-b303-fc4ce072913e'));
  const inDevelopmentItems = sortByPriority(roadmapFeatures.filter(item => item.statusId === 'dccfec41-1f77-4394-8e1f-eac1761a6565'));
  const qaTestingItems = sortByPriority(roadmapFeatures.filter(item => item.statusId === '56b00745-d98a-45b3-b50f-2617612acd24'));

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        Roadmap View
      </h2>
      
      <div className="flex gap-6">
        <RoadmapColumn 
          title="Backlog" 
          items={backlogItems} 
          count={backlogItems.length}
          bgColor="bg-blue-50"
        />
        <RoadmapColumn 
          title="In Development" 
          items={inDevelopmentItems} 
          count={inDevelopmentItems.length}
          bgColor="bg-yellow-50"
        />
        <RoadmapColumn 
          title="Release Candidates" 
          items={qaTestingItems} 
          count={qaTestingItems.length}
          bgColor="bg-green-50"
        />
      </div>
    </div>
  );
}; 