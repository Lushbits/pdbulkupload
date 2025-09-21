/**
 * Edit Application Types
 * Completely isolated types for the bulk edit functionality
 * No dependencies on upload workflow types
 */

/**
 * Authentication Types for Edit App
 */
export interface EditAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface EditTokenRefreshRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
  client_id: string;
}

/**
 * Employee Data Types for Edit Grid
 */
export interface EditEmployee {
  id: number;
  firstName: string;
  lastName: string;
  userName: string; // Email format
  email?: string;
  cellPhone?: string;
  cellPhoneCountryCode?: string;
  street1?: string;
  zip?: string;
  city?: string;
  phone?: string;
  phoneCountryCode?: string;
  gender?: 'Male' | 'Female';
  departments: EditDepartment[];
  employeeGroups?: EditEmployeeGroup[];
  employeeTypeId?: number;
  employeeType?: EditEmployeeType;
  hiredFrom?: string; // YYYY-MM-DD format
  birthDate?: string; // YYYY-MM-DD format
  ssn?: string;
  bankAccount?: {
    accountNumber?: string;
    registrationNumber?: string;
  };
  
  // Payrate and salary information (will be populated from API)
  hourlyPayrate?: number; // Legacy - to be deprecated
  contractedHours?: number;
  monthlySalary?: number;
  
  // Supervisor information
  supervisorEmployeeId?: number; // ID of the employee who is this employee's supervisor
  supervisorId?: number; // ID of the supervisor record
  supervisorName?: string; // Name of the supervisor (derived from supervisors list)
  
  // Employee group payrates (new structure)
  employeeGroupPayrates?: EditEmployeeGroupPayrate[]; // Payrates for each group this employee belongs to
  payrateData?: EditPayrateData; // Legacy payrate data
  salaryData?: EditSalaryData; // Salary data
  contractData?: EditContractData; // Contract data
  contractRules?: EditEmployeeContractRule[]; // Contract rules assigned to this employee
  
  // Status and metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Edit-specific fields
  isModified: boolean; // Track if row has been modified
  modifiedFields: Set<string>; // Track which specific fields were modified
  originalValues: Partial<EditEmployee>; // Store original values for comparison
  
  // Custom fields
  [key: string]: any;
}

/**
 * Department Types for Edit App
 */
export interface EditDepartment {
  id: number;
  name: string;
  number?: string;
}

export interface EditDepartmentsResponse {
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
  data: EditDepartment[];
}

/**
 * Employee Group Types for Edit App
 */
export interface EditEmployeeGroup {
  id: number;
  name: string;
}

export interface EditEmployeeGroupsResponse {
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
  data: EditEmployeeGroup[];
}

/**
 * Employee Type Types for Edit App
 */
export interface EditEmployeeType {
  id: number;
  name: string;
  description: string;
}

export interface EditEmployeeTypesResponse {
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
  data: EditEmployeeType[];
}

/**
 * Payrate and Salary Types (per employee group structure)
 */
export interface EditEmployeeGroupPayrate {
  employeeId: number;
  employeeGroupId: number;
  wageType: 'HourlyRate' | 'ShiftRate';
  rate: number;
  validFrom: string;
  validTo?: string;
  salaryCode?: string;
}

export interface EditPayrateData {
  employeeId: number;
  hourlyRate: number;
  currency: string;
  effectiveDate: string;
  validFrom: string;
  validTo?: string;
}

export interface EditSalaryData {
  employeeId: number;
  salary: number;
  hours: number;
  validFrom: string;
  createdByEmployeeId: number;
  createdAt: string;
  salaryTypeId: number;
}

export interface EditSalaryResponse {
  data: EditSalaryData;
}

/**
 * Contract Data Types
 */
export interface EditContractData {
  employeeId: number;
  contractType: string;
  contractedHours: number;
  startDate: string;
  endDate?: string;
  workingDays?: number[];
  effectiveDate: string;
  validFrom: string;
  validTo?: string;
}

/**
 * Contract Rule Types
 */
export interface EditContractRule {
  id: number;
  name: string;
  description?: string;
  ruleType: string;
  settings: any; // Dynamic settings object
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EditContractRulesResponse {
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
  data: EditContractRule[];
}

export interface EditEmployeeContractRule {
  id: number;
  name: string;
  description: string;
}

export interface EditEmployeeContractRulesResponse {
  data: EditEmployeeContractRule;
}

/**
 * Supervisor Types
 */
export interface EditSupervisor {
  id: number;
  employeeId: number;
  name: string;
}

export interface EditSupervisorsResponse {
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
  data: EditSupervisor[];
}

/**
 * Filtering Types
 */
export interface EditFilterCriteria {
  // Text filters
  firstName?: string;
  lastName?: string;
  userName?: string;
  cellPhone?: string;
  
  // Multi-select filters
  departments?: number[];
  employeeGroups?: number[];
  employeeTypes?: number[];
  
  // Status filters
  isActive?: boolean;
  isModified?: boolean;
  
  // Date range filters
  hiredFromStart?: string;
  hiredFromEnd?: string;
  
  // Numeric filters
  hourlyPayrateMin?: number;
  hourlyPayrateMax?: number;
  contractedHoursMin?: number;
  contractedHoursMax?: number;
  monthlySalaryMin?: number;
  monthlySalaryMax?: number;
  
  // Custom field filters
  customFilters?: { [fieldName: string]: any };
}

export interface EditFilterState {
  criteria: EditFilterCriteria;
  isActive: boolean;
  appliedFiltersCount: number;
}

/**
 * Sorting Types
 */
export interface EditSortCriteria {
  field: keyof EditEmployee | string;
  direction: 'asc' | 'desc';
}

export interface EditSortState {
  criteria: EditSortCriteria[];
  primary?: EditSortCriteria;
}

/**
 * Grid State Types
 */
export interface EditGridState {
  employees: EditEmployee[];
  filteredEmployees: EditEmployee[];
  selectedEmployees: Set<number>;
  modifiedEmployees: Set<number>;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  totalEmployees: number;
  
  // Sorting and filtering
  sortState: EditSortState;
  filterState: EditFilterState;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Column visibility
  visibleColumns: Set<string>;
  columnOrder: string[];
}

/**
 * API Response Types
 */
export interface EditEmployeesResponse {
  paging: {
    offset: number;
    limit: number;
    total: number;
  };
  data: EditEmployee[];
}

export interface EditBulkUpdateRequest {
  employees: Array<{
    id: number;
    updates: Partial<EditEmployee>;
  }>;
}

export interface EditBulkUpdateResponse {
  results: Array<{
    id: number;
    success: boolean;
    error?: string;
    updatedData?: EditEmployee;
  }>;
  summary: {
    totalUpdated: number;
    successCount: number;
    errorCount: number;
  };
}

/**
 * Edit Workflow Steps
 */
export type EditWorkflowStep = 
  | 'authentication'
  | 'file-selection'
  | 'employee-grid'
  | 'confirmation'
  | 'success';

/**
 * Edit Application State
 */
export interface EditAppState {
  currentStep: EditWorkflowStep;
  isAuthenticated: boolean;
  authTokens?: EditAuthTokens;
  
  // Reference data
  departments: EditDepartment[];
  employeeGroups: EditEmployeeGroup[];
  employeeTypes: EditEmployeeType[];
  
  // Grid state
  gridState: EditGridState;
  
  // Save state
  isSaving: boolean;
  saveError: string | null;
  saveResults?: EditBulkUpdateResponse;
}

/**
 * Edit Configuration
 */
export interface EditConfig {
  // API configuration
  apiBaseUrl: string;
  apiClientId: string;
  
  // Grid configuration
  defaultPageSize: number;
  maxPageSize: number;
  
  // Update configuration
  batchSize: number;
  maxRetries: number;
  
  // UI configuration
  autoSaveInterval?: number; // milliseconds
  confirmationTimeout: number; // milliseconds
}

/**
 * Edit Error Types
 */
export interface EditApiErrorData {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface EditValidationError {
  field: string;
  value: any;
  message: string;
  employeeId: number;
}

/**
 * Edit Portal Information
 */
export interface EditPortalInfo {
  id: number;
  name: string;
  companyName: string;
  country: string;
  timeZone: string;
  currency: string;
  
  // Permissions for edit functionality
  permissions: {
    canEditEmployees: boolean;
    canEditPayrates: boolean;
    canEditSalaries: boolean;
    canEditPersonalInfo: boolean;
    canEditDepartments: boolean;
  };
}

/**
 * Column Definition for Grid
 */
export interface EditColumnDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'phone' | 'email';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable: boolean;
  filterable: boolean;
  editable: boolean;
  required: boolean;
  
  // For select/multiselect columns
  options?: Array<{ value: any; label: string }>;
  
  // Validation
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    required?: boolean;
  };
  
  // Formatting
  format?: (value: any) => string;
  parse?: (value: string) => any;
}

/**
 * Export types for external use
 */
export type EditEmployeeField = keyof EditEmployee;
export type EditFilterField = keyof EditFilterCriteria;
export type EditSortField = keyof EditEmployee | string; 