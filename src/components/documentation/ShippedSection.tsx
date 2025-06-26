/**
 * Shipped Section Component
 * Displays shipped features and bugfixes in two paginated columns
 */

import React, { useState } from 'react';
import type { RoadmapItem } from '../../services/notionApi';

interface ShippedSectionProps {
  roadmapItems: RoadmapItem[];
}

// Helper component for pagination controls
const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>
        Showing {startItem}-{endItem} of {totalItems} items
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="px-2 py-1">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Helper component for shipped item row
const ShippedItemRow: React.FC<{ item: RoadmapItem }> = ({ item }) => {
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
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 min-w-[80px] pl-2">
          {new Date(item.updated).toISOString().split('T')[0]}
        </span>
        <span className="text-gray-900">
          {item.title || 'Untitled'}
        </span>
      </div>
      {priorityInfo && (
        <div className="pr-2 flex items-center">
          <span className={`px-2 py-1 text-xs font-medium rounded ${priorityInfo.color}`}>
            {priorityInfo.name}
          </span>
        </div>
      )}
    </div>
  );
};

// Helper component for each shipped section
const ShippedSubSection: React.FC<{
  title: string;
  items: RoadmapItem[];
  currentPage: number;
  onPageChange: (page: number) => void;
}> = ({ title, items, currentPage, onPageChange }) => {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="mb-8">
      <div className="bg-gray-100 p-4 flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          {title}
        </h4>
        <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>
      <div>
        
        <div className="space-y-0">
          {paginatedItems.map((item) => (
            <ShippedItemRow key={item.id} item={item} />
          ))}
          
          {items.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No shipped items</p>
            </div>
          )}
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={items.length}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );
};

export const ShippedSection: React.FC<ShippedSectionProps> = ({ roadmapItems }) => {
  // State for pagination
  const [featuresPage, setFeaturesPage] = useState(1);
  const [bugfixesPage, setBugfixesPage] = useState(1);

  // Filter shipped items: status "In production" (status ID 'h]z\\')
  const shippedItems = roadmapItems.filter(item => item.statusId === 'h]z\\');

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

  // Separate features and bugfixes
  const shippedFeatures = sortByPriority(shippedItems.filter(item => item.categoryId === 'f<[|'));
  const shippedBugfixes = sortByPriority(shippedItems.filter(item => item.categoryId === 'jhtk'));

  // Don't render if no shipped items
  if (shippedItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        Shipped ✓
      </h2>
      
      <div className="space-y-6">
        <ShippedSubSection 
          title="Features" 
          items={shippedFeatures}
          currentPage={featuresPage}
          onPageChange={setFeaturesPage}
        />
        <ShippedSubSection 
          title="Bugfixes" 
          items={shippedBugfixes}
          currentPage={bugfixesPage}
          onPageChange={setBugfixesPage}
        />
      </div>
    </div>
  );
}; 