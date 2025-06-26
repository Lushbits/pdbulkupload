/**
 * Notion API Service
 * Handles fetching roadmap data from Notion database
 */

// Notion API configuration
const NOTION_API_TOKEN = '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';
const DATABASE_ID = '21c42cb43d568056b341d44e868ae7cb';
const NOTION_API_VERSION = '2022-06-28';

// TypeScript types for Notion API responses
export interface NotionProperty {
  id: string;
  type: string;
  [key: string]: any;
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, NotionProperty>;
  url: string;
}

export interface NotionDatabaseResponse {
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

// Simplified roadmap item interface
export interface RoadmapItem {
  id: string;
  title: string;
  status: string;
  statusId: string;
  category: string;
  categoryId: string;
  priority: string;
  priorityId: string;
  created: string;
  updated: string;
  url: string;
  rawProperties: Record<string, NotionProperty>;
}

/**
 * Fetch all pages from the roadmap database
 */
export async function fetchRoadmapDatabase(): Promise<NotionDatabaseResponse> {
  // Use Vite proxy in development, direct API in production
  const isDevelopment = import.meta.env.DEV;
  const url = isDevelopment 
    ? `/api/notion/databases/${DATABASE_ID}/query`
    : `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
  
  console.log(`🌐 Using ${isDevelopment ? 'proxy' : 'direct'} URL:`, url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_TOKEN}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: 100, // Get up to 100 items
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}



/**
 * Extract text from Notion title property
 */
function extractTitle(titleProperty: any): string {
  if (!titleProperty?.title || !Array.isArray(titleProperty.title)) {
    return '';
  }
  
  return titleProperty.title
    .map((text: any) => text.plain_text || '')
    .join('');
}

/**
 * Extract select value from Notion select property
 */
function extractSelect(selectProperty: any): string {
  return selectProperty?.select?.name || '';
}

/**
 * Extract select ID from Notion select property
 */
function extractSelectId(selectProperty: any): string {
  return selectProperty?.select?.id || '';
}

/**
 * Extract status value from Notion status property
 */
function extractStatus(statusProperty: any): string {
  return statusProperty?.status?.name || '';
}

/**
 * Extract status ID from Notion status property
 */
function extractStatusId(statusProperty: any): string {
  return statusProperty?.status?.id || '';
}

/**
 * Transform Notion pages into simplified roadmap items
 */
export function transformNotionPages(pages: NotionPage[]): RoadmapItem[] {
  return pages.map(page => {
    const props = page.properties;
    
    return {
      id: page.id,
      title: extractTitle(props.Title), // Use the Title field with id "title"
      status: extractStatus(props.Status),
      statusId: extractStatusId(props.Status),
      category: extractSelect(props.Category),
      categoryId: extractSelectId(props.Category),
      priority: extractSelect(props.Priority),
      priorityId: extractSelectId(props.Priority),
      created: page.created_time,
      updated: page.last_edited_time,
      url: page.url,
      rawProperties: props, // Keep raw data for debugging
    };
  });
}

/**
 * Main function to fetch and transform roadmap data
 */
export async function getRoadmapData(): Promise<RoadmapItem[]> {
  try {
    console.log('🔍 Fetching roadmap data from Notion...');
    const response = await fetchRoadmapDatabase();
    console.log('✅ Raw Notion response:', response);
    
    const transformedItems = transformNotionPages(response.results);
    console.log('🔄 Transformed roadmap items:', transformedItems);
    
    return transformedItems;
  } catch (error) {
    console.error('❌ Error fetching roadmap data:', error);
    throw error;
  }
} 