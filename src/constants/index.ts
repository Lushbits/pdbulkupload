// Temporary inline types to fix import issue
interface PlandayApiConfig {
  baseUrl: string;
  authUrl: string;
  clientId: string;
  requiredHeaders: {
    'X-ClientId': string;
    'Content-Type': string;
    'Accept': string;
  };
}

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  exponentialBackoffBase: number;
}

export const WorkflowStep = {
  Authentication: 'authentication',
  FileUpload: 'upload',
  ColumnMapping: 'mapping',
  ValidationCorrection: 'validation-correction',
  FinalPreview: 'preview',
  BulkUpload: 'uploading',
  Results: 'results',
} as const;

/**
 * Planday API Configuration
 * Based on implementation plan specifications
 */
export const PLANDAY_API_CONFIG: PlandayApiConfig = {
  baseUrl: 'https://openapi.planday.com',
  authUrl: 'https://id.planday.com/connect/token',
  clientId: 'a1cf1063-3590-4edd-b8bf-80b32481f77a', // Planday Application ID
  requiredHeaders: {
    'X-ClientId': 'a1cf1063-3590-4edd-b8bf-80b32481f77a', // Planday Application ID
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * API Endpoints
 * Based on actual Planday API documentation
 */
export const API_ENDPOINTS = {
  // Authentication
  TOKEN_REFRESH: '/connect/token',
  
  // HR API Endpoints (v1.0 with lowercase paths)
  DEPARTMENTS: '/hr/v1.0/departments',
  EMPLOYEES: '/hr/v1.0/employees',
  EMPLOYEE_GROUPS: '/hr/v1.0/employeegroups',
  EMPLOYEE_FIELD_DEFINITIONS: '/hr/v1.0/employees/fielddefinitions',
} as const;

/**
 * Rate Limiting Configuration
 * Based on Planday API rate limits and best practices
 */
export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinute: 60,
  batchSize: 10, // Process 10 employees at a time
  delayBetweenBatches: 1000, // 1 second delay between batches
  maxRetries: 3,
  exponentialBackoffBase: 1000, // Start with 1 second, then 2s, 4s, 8s...
};

/**
 * Token Configuration
 * Access tokens expire after 1 hour according to Planday documentation
 */
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY_MINUTES: 60,
  REFRESH_BUFFER_MINUTES: 5, // Refresh token 5 minutes before expiry
  STORAGE_KEY_REFRESH_TOKEN: 'planday_refresh_token',
  STORAGE_KEY_ACCESS_TOKEN: 'planday_access_token',
  STORAGE_KEY_TOKEN_EXPIRY: 'planday_token_expiry',
} as const;

/**
 * Workflow Steps Configuration
 * Step-by-step progress indicator as per PRD requirements
 */
export const WORKFLOW_STEPS = [
  { key: 'authentication' as const, label: 'Authentication', description: 'Connect to Planday' },
  { key: 'upload' as const, label: 'Upload', description: 'Upload Excel file' },
  { key: 'mapping' as const, label: 'Mapping', description: 'Map columns' },
  { key: 'validation-correction' as const, label: 'Validation', description: 'Validate & fix errors' },
  { key: 'preview' as const, label: 'Preview', description: 'Final review' },
  { key: 'uploading' as const, label: 'Upload', description: 'Bulk upload' },
  { key: 'results' as const, label: 'Results', description: 'View results' },
] as const;

/**
 * Auto-detection Rules for Column Mapping
 * Based on common Excel column names that map to Planday fields
 */
export const AUTO_MAPPING_RULES = {
  firstName: [
    'first name', 'first', 'given name', 'fname', 'firstname',
    'prenom', 'vorname', 'fornavn', 'etunimi'
  ],
  lastName: [
    'last name', 'last', 'surname', 'family name', 'lname', 'lastname',
    'nom', 'nachname', 'efternavn', 'sukunimi'
  ],
  userName: [
    'email', 'username', 'login', 'user email', 'e-mail', 'mail',
    'email address', 'login email', 'work email'
  ],
  cellPhone: [
    'mobile', 'cell phone', 'cell', 'mobile phone', 'cellular',
    'mobile number', 'cell number', 'gsm'
  ],
  phone: [
    'phone', 'telephone', 'phone number', 'tel', 'work phone',
    'office phone', 'landline'
  ],
  hireDate: [
    'hire date', 'start date', 'employment date', 'date hired',
    'start of employment', 'employment start', 'join date'
  ],
  birthDate: [
    'birth date', 'date of birth', 'birthday', 'born', 'dob',
    'birth day', 'date born'
  ],
  street1: [
    'address', 'street', 'street address', 'address line 1',
    'street1', 'home address', 'residential address'
  ],
  city: [
    'city', 'town', 'municipality', 'place', 'location'
  ],
  zip: [
    'zip', 'zip code', 'postal code', 'postcode', 'zip-code',
    'postal', 'post code'
  ],
  gender: [
    'gender', 'sex', 'male/female', 'm/f'
  ],
  ssn: [
    'ssn', 'social security', 'social security number', 'social',
    'national id', 'personal number', 'cpr'
  ],
  departments: [
    'departments', 'department', 'dept', 'depts',
    'department name', 'department names', 'work area', 'work areas',
    'division', 'divisions', 'location', 'locations'
  ],
  employeeGroups: [
    'employee groups', 'employee group', 'groups', 'group',
    'employee roles', 'employee role', 'roles', 'role',
    'positions', 'position', 'job roles', 'job role',
    'team', 'teams', 'category', 'categories'
  ],
} as const;

/**
 * Validation Configuration
 */
export const VALIDATION_CONFIG = {
  // NOTE: Required fields are now fetched dynamically from Planday API
  // via ValidationService.getRequiredFields() instead of being hardcoded
  // Fallback required fields for cases when API is not available
  FALLBACK_REQUIRED_FIELDS: ['firstName', 'lastName'] as const,
  
  // Email validation pattern
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Phone number cleaning patterns
  PHONE_CLEANUP_PATTERN: /[\s\-\(\)]/g,
  
  // Date format for Planday API (YYYY-MM-DD)
  DATE_FORMAT: 'YYYY-MM-DD',
  
  // Maximum file size (10MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  // Supported file types
  SUPPORTED_FILE_TYPES: ['.xlsx', '.xls'] as const,
  
  // Maximum number of employees to process
  MAX_EMPLOYEES: 1000,
  
  // Field length limits
  FIELD_LIMITS: {
    firstName: { min: 1, max: 50 },
    lastName: { min: 1, max: 50 },
    userName: { min: 1, max: 100 },
    cellPhone: { max: 20 },
    phone: { max: 20 },
    street1: { max: 100 },
    city: { max: 50 },
    zip: { max: 10 },
  },
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  // Animation durations
  ANIMATION_DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  
  // Toast notification durations
  TOAST_DURATION: {
    SUCCESS: 3000,
    ERROR: 5000,
    WARNING: 4000,
    INFO: 3000,
  },
  
  // Progress indicator colors
  PROGRESS_COLORS: {
    COMPLETED: 'bg-success-600',
    CURRENT: 'bg-primary-600',
    PENDING: 'bg-gray-300',
  },
  
  // Table pagination
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  
  // File upload
  UPLOAD_AREA_HEIGHT: 200,
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  // File upload errors
  FILE_TOO_LARGE: 'File size exceeds 10MB limit',
  INVALID_FILE_TYPE: 'Only Excel files (.xlsx, .xls) are supported',
  FILE_READ_ERROR: 'Error reading file. Please check the file format.',
  
  // Authentication errors
  AUTH_FAILED: 'Authentication failed. Please check your refresh token.',
  TOKEN_EXPIRED: 'Your session has expired. Please re-authenticate.',
  INVALID_TOKEN: 'Invalid refresh token provided.',
  
  // API errors
  API_CONNECTION_ERROR: 'Unable to connect to Planday API. Please check your internet connection.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait before making more requests.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  
  // Validation errors
  REQUIRED_FIELD_MISSING: 'This field is required',
  INVALID_EMAIL_FORMAT: 'Please enter a valid email address',
  INVALID_DATE_FORMAT: 'Please enter a valid date (YYYY-MM-DD)',
  DUPLICATE_EMAIL: 'This email address is already in use',
  INVALID_DEPARTMENT: 'Selected department does not exist',
  
  // Upload errors
  UPLOAD_FAILED: 'Upload failed. All employees have been rolled back.',
  PARTIAL_UPLOAD_ERROR: 'Some employees failed to upload. Check results for details.',
  NETWORK_ERROR: 'Network error occurred during upload. Please try again.',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'File uploaded successfully',
  VALIDATION_PASSED: 'All data validated successfully',
  MAPPING_COMPLETED: 'Column mapping completed',
  UPLOAD_COMPLETED: 'All employees uploaded successfully',
  DATA_CORRECTED: 'Data corrections applied',
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  REFRESH_TOKEN: 'pdbulkupload_refresh_token',
  COLUMN_MAPPINGS: 'pdbulkupload_column_mappings',
  USER_PREFERENCES: 'pdbulkupload_preferences',
  SESSION_DATA: 'pdbulkupload_session',
} as const;

/**
 * Application Metadata
 */
export const APP_METADATA = {
  NAME: 'Planday Bulk Employee Uploader',
  VERSION: '1.0.0',
  DESCRIPTION: 'Upload employees to Planday in bulk from Excel files',
  AUTHOR: 'Planday',
  SUPPORT_EMAIL: 'support@planday.com',
} as const;

/**
 * Feature Flags
 * For enabling/disabling features during development
 */
export const FEATURE_FLAGS = {
  ENABLE_CUSTOM_FIELDS: true,
  ENABLE_EMPLOYEE_GROUPS: true,
  ENABLE_SPECIAL_FIELDS: true, // SSN, BankAccount, BirthDate
  ENABLE_DEBUG_MODE: false,
  ENABLE_MOCK_API: false,
} as const;

/**
 * Development Configuration
 */
export const DEV_CONFIG = {
  MOCK_DELAY: 1000, // Simulated API delay in milliseconds
  ENABLE_CONSOLE_LOGS: true,
  SHOW_DEV_TOOLS: false,
} as const;

// WorkflowStep is already exported above 