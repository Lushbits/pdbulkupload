/**
 * Edit API React Hook
 * Provides centralized state management for Edit API operations
 * Completely isolated from upload workflow hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { EditApi } from '../services/unifiedApiClient';
import { EditApiError } from '../services/coreApiClient';
import type {
  EditEmployee,
  EditDepartment,
  EditEmployeeGroup,
  EditEmployeeType,
  EditWorkflowStep,
} from '../types';

interface EditApiState {
  // Authentication state
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  
  // Employee data state
  employees: EditEmployee[];
  totalEmployees: number;
  isEmployeesLoading: boolean;
  employeesError: string | null;
  
  // Reference data state
  departments: EditDepartment[];
  employeeGroups: EditEmployeeGroup[];
  employeeTypes: EditEmployeeType[];
  
  // Current workflow step
  currentStep: EditWorkflowStep;
}

interface EditApiActions {
  // Authentication actions
  authenticate: (refreshToken: string) => Promise<boolean>;
  logout: () => void;
  
  // Employee data actions
  fetchEmployees: (params?: {
    searchQuery?: string;
    forceRefresh?: boolean;
  }) => Promise<void>;
  
  // Reference data actions
  fetchDepartments: () => Promise<void>;
  fetchEmployeeGroups: () => Promise<void>;
  fetchEmployeeTypes: () => Promise<void>;
  
  // Workflow actions
  setCurrentStep: (step: EditWorkflowStep) => void;
  
  // Utility actions
  clearErrors: () => void;
  testConnection: () => Promise<boolean>;
  clearCache: () => void;
}

export interface UseEditApiReturn extends EditApiState, EditApiActions {}

/**
 * Hook for managing Edit API state and operations
 */
export const useEditApi = (): UseEditApiReturn => {
  const [state, setState] = useState<EditApiState>({
    // Authentication state
    isAuthenticated: false,
    isAuthenticating: false,
    authError: null,
    
    // Employee data state
    employees: [],
    totalEmployees: 0,
    isEmployeesLoading: false,
    employeesError: null,
    
    // Reference data state
    departments: [],
    employeeGroups: [],
    employeeTypes: [],
    
    // Current workflow step
    currentStep: 'authentication',
  });

  /**
   * Update state with partial updates
   */
  const updateState = useCallback((updates: Partial<EditApiState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors with user-friendly messages
   */
  const handleError = useCallback((error: unknown): string => {
    console.error('Edit API Error:', error);
    
    if (error instanceof EditApiError) {
      return error.getUserFriendlyMessage();
    } else if (error instanceof Error) {
      return error.message;
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }, []);

  /**
   * Authenticate with Planday using refresh token
   */
  const authenticate = useCallback(async (refreshToken: string): Promise<boolean> => {
    updateState({ 
      isAuthenticating: true, 
      authError: null 
    });

    try {
      // Initialize API client
      await EditApi.initialize(refreshToken);
      
      // Verify authentication by testing connection
      const isConnected = await EditApi.testConnection();
      
      if (isConnected) {
        updateState({
          isAuthenticated: true,
          isAuthenticating: false,
          authError: null,
          currentStep: 'file-selection',
        });
        
        // Don't fetch employee data automatically - only fetch when needed
        // This prevents unnecessary API calls on authentication
        console.log('✅ Authentication successful - data will be loaded when needed');
        
        return true;
      } else {
        throw new Error('Authentication failed. Unable to connect to Planday API.');
      }
    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isAuthenticated: false,
        isAuthenticating: false,
        authError: errorMessage,
        currentStep: 'authentication',
      });
      return false;
    }
  }, [updateState, handleError]);

  /**
   * Logout and clear authentication
   */
  const logout = useCallback(() => {
    EditApi.cleanup();
    
    // Clear session storage cache
    Object.values(CACHE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    updateState({
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
      employees: [],
      totalEmployees: 0,
      departments: [],
      employeeGroups: [],
      employeeTypes: [],
      currentStep: 'authentication',
    });
  }, [updateState]);

  /**
   * Session storage keys for caching
   */
  const CACHE_KEYS = {
    EMPLOYEES: 'edit_employees_cache',
    DEPARTMENTS: 'edit_departments_cache',
    EMPLOYEE_GROUPS: 'edit_employee_groups_cache',
    EMPLOYEE_TYPES: 'edit_employee_types_cache',
    CACHE_TIMESTAMP: 'edit_cache_timestamp',
  };

  /**
   * Check if cached data is still valid (1 hour expiry)
   */
  const isCacheValid = useCallback((): boolean => {
    const timestamp = sessionStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;
    
    const cacheTime = parseInt(timestamp);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return (now - cacheTime) < oneHour;
  }, []);

  /**
   * Load data from session storage cache
   */
  const loadFromCache = useCallback((): boolean => {
    if (!isCacheValid()) return false;
    
    try {
      const employeesCache = sessionStorage.getItem(CACHE_KEYS.EMPLOYEES);
      const departmentsCache = sessionStorage.getItem(CACHE_KEYS.DEPARTMENTS);
      const groupsCache = sessionStorage.getItem(CACHE_KEYS.EMPLOYEE_GROUPS);
      const typesCache = sessionStorage.getItem(CACHE_KEYS.EMPLOYEE_TYPES);
      
      if (employeesCache) {
        const employees = JSON.parse(employeesCache);
        const departments = departmentsCache ? JSON.parse(departmentsCache) : [];
        const employeeGroups = groupsCache ? JSON.parse(groupsCache) : [];
        const employeeTypes = typesCache ? JSON.parse(typesCache) : [];
        
        updateState({
          employees: employees,
          totalEmployees: employees.length,
          departments: departments,
          employeeGroups: employeeGroups,
          employeeTypes: employeeTypes,
        });
        
        console.log('✅ Loaded employee data from cache:', {
          total: employees.length,
          withPayrates: employees.filter((e: EditEmployee) => e.hourlyPayrate).length,
          withSalaries: employees.filter((e: EditEmployee) => e.monthlySalary).length,
          withContracts: employees.filter((e: EditEmployee) => e.contractedHours).length,
        });
        
        return true;
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
    
    return false;
  }, [isCacheValid, updateState]);

  /**
   * Save data to session storage cache
   */
  const saveToCache = useCallback((data: {
    employees: EditEmployee[];
    departments: EditDepartment[];
    employeeGroups: EditEmployeeGroup[];
    employeeTypes: EditEmployeeType[];
  }) => {
    try {
      sessionStorage.setItem(CACHE_KEYS.EMPLOYEES, JSON.stringify(data.employees));
      sessionStorage.setItem(CACHE_KEYS.DEPARTMENTS, JSON.stringify(data.departments));
      sessionStorage.setItem(CACHE_KEYS.EMPLOYEE_GROUPS, JSON.stringify(data.employeeGroups));
      sessionStorage.setItem(CACHE_KEYS.EMPLOYEE_TYPES, JSON.stringify(data.employeeTypes));
      sessionStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
      
      console.log('✅ Saved employee data to cache');
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }, []);

  /**
   * Fetch employees from Planday API (fast basic data for Excel export)
   */
  const fetchEmployees = useCallback(async (params: {
    searchQuery?: string;
    forceRefresh?: boolean;
  } = {}) => {
    // Try to load from cache first (unless forced refresh)
    if (!params.forceRefresh && loadFromCache()) {
      return;
    }
    
    updateState({ 
      isEmployeesLoading: true,
      employeesError: null 
    });

    try {
      // Load basic employee data (fast, no rate limit issues)
      const basicData = await EditApi.fetchBasicEmployeeData();
      
      // Apply search query filtering if provided
      let filteredEmployees = basicData.employees;
      if (params.searchQuery) {
        const query = params.searchQuery.toLowerCase();
        filteredEmployees = basicData.employees.filter(emp => 
          emp.firstName.toLowerCase().includes(query) ||
          emp.lastName.toLowerCase().includes(query) ||
          emp.userName.toLowerCase().includes(query)
        );
      }

      // Store ALL employees in state (no pagination here)
      updateState({
        employees: filteredEmployees,
        totalEmployees: filteredEmployees.length,
        isEmployeesLoading: false,
        employeesError: null,
        departments: basicData.departments,
        employeeGroups: basicData.employeeGroups,
        employeeTypes: basicData.employeeTypes,
      });

      // Cache the data for future use
      const cacheData = {
        employees: basicData.employees,
        departments: basicData.departments,
        employeeGroups: basicData.employeeGroups,
        employeeTypes: basicData.employeeTypes,
      };
      saveToCache(cacheData);
      
      console.log('✅ Basic employee data loaded successfully from API:', {
        total: basicData.employees.length,
        departments: basicData.departments.length,
        employeeGroups: basicData.employeeGroups.length,
        message: 'Individual payrates skipped to avoid rate limits'
      });

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        employees: [],
        totalEmployees: 0,
        isEmployeesLoading: false,
        employeesError: errorMessage,
      });
    }
  }, [updateState, handleError, loadFromCache, saveToCache]);

  /**
   * Fetch departments
   */
  const fetchDepartments = useCallback(async () => {
    try {
      const departments = await EditApi.fetchDepartments();
      updateState({ departments });
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  }, [updateState]);

  /**
   * Fetch employee groups
   */
  const fetchEmployeeGroups = useCallback(async () => {
    try {
      const employeeGroups = await EditApi.fetchEmployeeGroups();
      updateState({ employeeGroups });
    } catch (error) {
      console.error('Failed to fetch employee groups:', error);
    }
  }, [updateState]);

  /**
   * Fetch employee types
   */
  const fetchEmployeeTypes = useCallback(async () => {
    try {
      const employeeTypes = await EditApi.fetchEmployeeTypes();
      updateState({ employeeTypes });
    } catch (error) {
      console.error('Failed to fetch employee types:', error);
    }
  }, [updateState]);

  /**
   * Set current workflow step
   */
  const setCurrentStep = useCallback((step: EditWorkflowStep) => {
    updateState({ currentStep: step });
  }, [updateState]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    updateState({
      authError: null,
      employeesError: null,
    });
  }, [updateState]);

  /**
   * Test API connection
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await EditApi.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, []);

  /**
   * Clear all cached data and force refresh
   */
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
    console.log('🗑️ Cleared all cached employee data - next load will fetch fresh data');
  }, []);

  /**
   * Check for existing authentication on mount
   */
  useEffect(() => {
    const checkExistingAuth = async () => {
      if (EditApi.isAuthenticated()) {
        try {
          const isConnected = await EditApi.testConnection();
          if (isConnected) {
            updateState({
              isAuthenticated: true,
              currentStep: 'file-selection',
            });
            
            // Don't fetch employee data automatically - only when needed
            console.log('✅ Existing authentication verified - data will be loaded when needed');
          } else {
            // Token may be expired, clear it
            EditApi.cleanup();
          }
        } catch (error) {
          console.error('Failed to verify existing authentication:', error);
          EditApi.cleanup();
        }
      }
    };

    checkExistingAuth();
  }, [updateState]);

  return {
    ...state,
    authenticate,
    logout,
    fetchEmployees,
    fetchDepartments,
    fetchEmployeeGroups,
    fetchEmployeeTypes,
    setCurrentStep,
    clearErrors,
    testConnection,
    clearCache,
  };
}; 