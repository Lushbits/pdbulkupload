/**
 * Edit Application Constants
 * Completely isolated constants for the bulk edit functionality
 * No dependencies on upload workflow constants
 */

/**
 * Edit API Configuration
 */
export const EDIT_API_CONFIG = {
  baseUrl: 'https://openapi.planday.com',
  authUrl: 'https://id.planday.com/connect/token',
  clientId: '13000bf2-dd1f-41ab-a1a0-eeec783f50d7', // Planday Application ID
  requiredHeaders: {
    'X-ClientId': '13000bf2-dd1f-41ab-a1a0-eeec783f50d7', // Planday Application ID
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

/**
 * Edit API Endpoints
 */
export const EDIT_API_ENDPOINTS = {
  // Authentication
  TOKEN_REFRESH: '/connect/token',
  
  // HR API Endpoints
  DEPARTMENTS: '/hr/v1.0/departments',
  EMPLOYEES: '/hr/v1.0/employees',
  EMPLOYEE_GROUPS: '/hr/v1.0/employeegroups',
  EMPLOYEE_TYPES: '/hr/v1.0/employeetypes',
  SUPERVISORS: '/hr/v1.0/employees/supervisors',
  
  // Payrate and Salary endpoints
  PAYRATES: '/pay/v1.0/payrates/employees', // Legacy endpoint
  PAYRATES_BY_GROUP: '/pay/v1.0/payrates/employeeGroups', // New endpoint for group-specific payrates
  SALARIES: '/pay/v1.0/salaries/employees', // Per employee salaries
  
  // Contract rules endpoint
  CONTRACTS: '/contractrules/v1.0/contractrules',
  EMPLOYEE_CONTRACT: '/contractrules/v1.0/employees', // For individual employee contract assignment
} as const;

/**
 * Edit Rate Limiting Configuration
 */
export const EDIT_RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 60,
  batchSize: 50, // Edit can handle larger batches than upload
  delayBetweenBatches: 500, // Faster processing for reads
  maxRetries: 3,
  exponentialBackoffBase: 1000,
} as const;

/**
 * Edit Token Configuration
 */
export const EDIT_TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: 'edit_planday_access_token',
  REFRESH_TOKEN_KEY: 'edit_planday_refresh_token',
  TOKEN_EXPIRY_KEY: 'edit_planday_token_expiry',
  
  // Refresh token 5 minutes before expiry
  REFRESH_BUFFER_MINUTES: 5,
  
  // Session storage keys (for security)
  SESSION_STORAGE_PREFIX: 'edit_planday_',
} as const;

/**
 * Edit Workflow Steps
 */
export const EDIT_WORKFLOW_STEPS = {
  Authentication: 'authentication',
  EmployeeGrid: 'employee-grid',
  Confirmation: 'confirmation',
  Success: 'success',
} as const;

/**
 * Edit Grid Configuration
 */
export const EDIT_GRID_CONFIG = {
  // Pagination
  defaultPageSize: 50,
  maxPageSize: 500,
  pageSizeOptions: [25, 50, 100, 250, 500],
  
  // Grid behavior
  autoSaveInterval: 30000, // 30 seconds
  confirmationTimeout: 5000, // 5 seconds
  
  // Column widths
  columnWidths: {
    id: 80,
    firstName: 120,
    lastName: 120,
    userName: 180,
    cellPhone: 140,
    departments: 200,
    employeeGroups: 200,
    hourlyPayrate: 100,
    contractedHours: 120,
    monthlySalary: 120,
    hiredFrom: 110,
    isActive: 80,
    actions: 100,
  },
  
  // Default visible columns
  defaultVisibleColumns: [
    'id', 'firstName', 'lastName', 'userName', 'cellPhone',
    'departments', 'hourlyPayrate', 'contractedHours', 'monthlySalary',
    'hiredFrom', 'isActive'
  ],
  
  // Required columns (cannot be hidden)
  requiredColumns: ['firstName', 'lastName', 'userName'],
} as const;

/**
 * Edit Filter Configuration
 */
export const EDIT_FILTER_CONFIG = {
  // Text filter debounce time
  debounceTime: 300,
  
  // Number range defaults
  defaultRanges: {
    hourlyPayrate: { min: 0, max: 1000 },
    contractedHours: { min: 0, max: 80 },
    monthlySalary: { min: 0, max: 100000 },
  },
  
  // Filter drawer
  drawerHeight: 400,
  collapsedHeight: 60,
} as const;

/**
 * Edit Validation Configuration
 */
export const EDIT_VALIDATION_CONFIG = {
  // Email validation
  emailPattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Phone validation
  phonePattern: /^[\+]?[1-9][\d]{0,15}$/,
  
  // Field length limits
  fieldLimits: {
    firstName: { min: 1, max: 50 },
    lastName: { min: 1, max: 50 },
    userName: { min: 1, max: 100 },
    cellPhone: { max: 20 },
    street1: { max: 100 },
    city: { max: 50 },
    zip: { max: 10 },
  },
  
  // Numeric limits
  numericLimits: {
    hourlyPayrate: { min: 0, max: 10000 },
    contractedHours: { min: 0, max: 168 }, // Max hours per week
    monthlySalary: { min: 0, max: 1000000 },
  },
} as const;

/**
 * Edit UI Configuration
 */
export const EDIT_UI_CONFIG = {
  // Colors
  colors: {
    modified: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    selected: 'bg-blue-50 border-blue-200',
  },
  
  // Animation durations
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Grid row heights
  rowHeights: {
    compact: 32,
    normal: 40,
    comfortable: 48,
  },
  
  // Keyboard shortcuts
  shortcuts: {
    save: 'Ctrl+S',
    selectAll: 'Ctrl+A',
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    search: 'Ctrl+F',
    filter: 'Ctrl+Shift+F',
  },
} as const;

/**
 * Edit Error Messages
 */
export const EDIT_ERROR_MESSAGES = {
  // Authentication errors
  authenticationFailed: 'Authentication failed. Please check your token and try again.',
  tokenExpired: 'Your session has expired. Please authenticate again.',
  
  // API errors
  fetchEmployeesFailed: 'Failed to fetch employees. Please try again.',
  updateEmployeeFailed: 'Failed to update employee. Please try again.',
  networkError: 'Network error. Please check your connection and try again.',
  
  // Validation errors
  requiredField: 'This field is required.',
  invalidEmail: 'Please enter a valid email address.',
  invalidPhone: 'Please enter a valid phone number.',
  fieldTooLong: 'This field is too long.',
  fieldTooShort: 'This field is too short.',
  invalidNumber: 'Please enter a valid number.',
  numberTooLarge: 'This number is too large.',
  numberTooSmall: 'This number is too small.',
  
  // Grid errors
  unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
  saveConflict: 'Another user has modified this employee. Please refresh and try again.',
  
  // General errors
  unexpectedError: 'An unexpected error occurred. Please try again.',
  permissionDenied: 'You do not have permission to perform this action.',
} as const;

/**
 * Edit Success Messages
 */
export const EDIT_SUCCESS_MESSAGES = {
  employeeUpdated: 'Employee updated successfully.',
  employeesUpdated: 'Employees updated successfully.',
  changesSaved: 'All changes saved successfully.',
  authenticationSuccess: 'Authentication successful.',
} as const;

/**
 * Edit Column Definitions
 */
export const EDIT_COLUMN_DEFINITIONS = {
  id: {
    key: 'id',
    label: 'ID',
    type: 'number',
    width: 80,
    sortable: true,
    filterable: true,
    editable: false,
    required: true,
  },
  firstName: {
    key: 'firstName',
    label: 'First Name',
    type: 'text',
    width: 120,
    sortable: true,
    filterable: true,
    editable: true,
    required: true,
  },
  lastName: {
    key: 'lastName',
    label: 'Last Name',
    type: 'text',
    width: 120,
    sortable: true,
    filterable: true,
    editable: true,
    required: true,
  },
  userName: {
    key: 'userName',
    label: 'Email',
    type: 'email',
    width: 180,
    sortable: true,
    filterable: true,
    editable: true,
    required: true,
  },
  cellPhone: {
    key: 'cellPhone',
    label: 'Phone',
    type: 'phone',
    width: 140,
    sortable: true,
    filterable: true,
    editable: true,
    required: false,
  },
  departments: {
    key: 'departments',
    label: 'Departments',
    type: 'multiselect',
    width: 200,
    sortable: false,
    filterable: true,
    editable: true,
    required: false,
  },
  employeeGroups: {
    key: 'employeeGroups',
    label: 'Employee Groups',
    type: 'multiselect',
    width: 200,
    sortable: false,
    filterable: true,
    editable: true,
    required: false,
  },
  hourlyPayrate: {
    key: 'hourlyPayrate',
    label: 'Hourly Rate',
    type: 'number',
    width: 100,
    sortable: true,
    filterable: true,
    editable: true,
    required: false,
  },
  contractedHours: {
    key: 'contractedHours',
    label: 'Contracted Hours',
    type: 'number',
    width: 120,
    sortable: true,
    filterable: true,
    editable: true,
    required: false,
  },
  monthlySalary: {
    key: 'monthlySalary',
    label: 'Monthly Salary',
    type: 'number',
    width: 120,
    sortable: true,
    filterable: true,
    editable: true,
    required: false,
  },
  hiredFrom: {
    key: 'hiredFrom',
    label: 'Hired From',
    type: 'date',
    width: 110,
    sortable: true,
    filterable: true,
    editable: true,
    required: false,
  },
  isActive: {
    key: 'isActive',
    label: 'Active',
    type: 'boolean',
    width: 80,
    sortable: true,
    filterable: true,
    editable: true,
    required: false,
  },
} as const;

/**
 * App Metadata for Edit
 */
export const EDIT_APP_METADATA = {
  name: 'Planday Bulk Employee Editor',
  description: 'Edit employee records with payrates, salaries, and contract details',
  version: '1.0.0',
  author: 'Planday Integration Team',
} as const; 