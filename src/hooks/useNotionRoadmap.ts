/**
 * Custom hook for managing Notion roadmap data
 * Follows the same patterns as usePlandayApi.ts
 */

import { useState, useEffect } from 'react';
import { getRoadmapData, type RoadmapItem } from '../services/notionApi';

interface UseNotionRoadmapReturn {
  roadmapItems: RoadmapItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useNotionRoadmap(): UseNotionRoadmapReturn {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const items = await getRoadmapData();
      setRoadmapItems(items);
      
      console.log('🎉 Successfully loaded roadmap data:', items.length, 'items');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch roadmap data';
      setError(errorMessage);
      console.error('❌ Roadmap data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const refetch = async () => {
    await fetchData();
  };

  return {
    roadmapItems,
    isLoading,
    error,
    refetch,
  };
} 