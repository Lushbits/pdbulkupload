/**
 * Planday API React Hook
 * Provides centralized state management for Planday API operations
 * Features:
 * - Authentication state management
 * - Department and employee group caching
 * - Error handling with user-friendly messages
 * - Loading states for UI components
 * - Automatic cleanup on unmount
 */

import { useState, useEffect, useCallback } from 'react';
import { PlandayApi, PlandayApiError } from '../services/plandayApi';
import { MappingUtils, ValidationService } from '../services/mappingService';
import type {
  PlandayDepartment,
  PlandayEmployeeGroup,
  PlandayEmployeeResponse,
  PlandayEmployeeCreateRequest,
  EmployeeUploadResult,
  BulkUploadProgress,
  PlandayFieldDefinitionsSchema,
} from '../types/planday';

interface PlandayApiState {
  // Authentication state
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  
  // Department state
  departments: PlandayDepartment[];
  isDepartmentsLoading: boolean;
  departmentsError: string | null;
  
  // Employee group state
  employeeGroups: PlandayEmployeeGroup[];
  isEmployeeGroupsLoading: boolean;
  employeeGroupsError: string | null;
  
  // Field definitions state
  fieldDefinitions: PlandayFieldDefinitionsSchema | null;
  isFieldDefinitionsLoading: boolean;
  fieldDefinitionsError: string | null;
  
  // Upload state
  isUploading: boolean;
  uploadProgress: BulkUploadProgress | null;
  uploadError: string | null;
}

interface PlandayApiActions {
  // Authentication actions
  authenticate: (refreshToken: string) => Promise<boolean>;
  logout: () => void;
  
  // Data fetching actions
  refreshDepartments: () => Promise<void>;
  refreshEmployeeGroups: () => Promise<void>;
  refreshFieldDefinitions: () => Promise<void>;
  refreshPlandayData: () => Promise<void>;
  
  // Upload actions
  uploadEmployees: (
    employees: PlandayEmployeeCreateRequest[],
    onProgress?: (progress: BulkUploadProgress) => void
  ) => Promise<EmployeeUploadResult[]>;
  
  atomicUploadEmployees: (
    employees: PlandayEmployeeCreateRequest[],
    onProgress?: (progress: BulkUploadProgress) => void
  ) => Promise<EmployeeUploadResult[]>;
  
  // Employee fetching for verification
  fetchEmployees: (
    limit?: number,
    offset?: number
  ) => Promise<{
    employees: PlandayEmployeeResponse[];
    total: number;
    hasMore: boolean;
  }>;
  
  fetchEmployeesByIds: (
    employeeIds: number[]
  ) => Promise<PlandayEmployeeResponse[]>;
  
  // Utility actions
  testConnection: () => Promise<boolean>;
  clearErrors: () => void;
}

export interface UsePlandayApiReturn extends PlandayApiState, PlandayApiActions {}

/**
 * Hook for managing Planday API state and operations
 */
// Global counter to track hook instances
let hookInstanceCounter = 0;

export const usePlandayApi = (): UsePlandayApiReturn => {
  // Debug hook lifecycle with unique ID
  const instanceId = ++hookInstanceCounter;
  
  const [state, setState] = useState<PlandayApiState>({
    // Authentication state
    isAuthenticated: false,
    isAuthenticating: false,
    authError: null,
    
    // Department state
    departments: [],
    isDepartmentsLoading: false,
    departmentsError: null,
    
    // Employee group state
    employeeGroups: [],
    isEmployeeGroupsLoading: false,
    employeeGroupsError: null,
    
    // Field definitions state
    fieldDefinitions: null,
    isFieldDefinitionsLoading: false,
    fieldDefinitionsError: null,
    
    // Upload state
    isUploading: false,
    uploadProgress: null,
    uploadError: null,
  });

  /**
   * Update state with partial updates
   */
  const updateState = useCallback((updates: Partial<PlandayApiState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors with user-friendly messages
   */
  const handleError = useCallback((error: unknown): string => {
    console.error('Planday API Error:', error);
    
    if (error instanceof PlandayApiError) {
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
      await PlandayApi.init(refreshToken);
      
      // Test connection and fetch initial data
      const [departments, employeeGroups, fieldDefinitions] = await Promise.all([
        PlandayApi.getDepartments(),
        PlandayApi.getEmployeeGroups(),
        PlandayApi.getFieldDefinitions()
      ]);
      
      // Initialize services with fetched data
      MappingUtils.initialize(departments, employeeGroups);
      ValidationService.initialize(fieldDefinitions);
      
      updateState({
        isAuthenticated: true,
        isAuthenticating: false,
        departments,
        employeeGroups,
        fieldDefinitions,
        authError: null,
      });

      return true;

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isAuthenticated: false,
        isAuthenticating: false,
        authError: errorMessage,
        departments: [],
        employeeGroups: [],
      });
      
      return false;
    }
  }, [updateState, handleError]);

  /**
   * Logout and cleanup
   */
  const logout = useCallback(() => {
    PlandayApi.cleanup();
    
    setState({
      // Reset authentication state
      isAuthenticated: false,
      isAuthenticating: false,
      authError: null,
      
      // Reset department state
      departments: [],
      isDepartmentsLoading: false,
      departmentsError: null,
      
      // Reset employee group state
      employeeGroups: [],
      isEmployeeGroupsLoading: false,
      employeeGroupsError: null,
      
      // Reset field definitions state
      fieldDefinitions: null,
      isFieldDefinitionsLoading: false,
      fieldDefinitionsError: null,
      
      // Reset upload state
      isUploading: false,
      uploadProgress: null,
      uploadError: null,
    });

    console.log('🔐 Logged out successfully');
  }, []);

  /**
   * Refresh departments from Planday
   */
  const refreshDepartments = useCallback(async (): Promise<void> => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    updateState({ 
      isDepartmentsLoading: true,
      departmentsError: null
    });

    try {
      // Fetch departments
      const departments = await PlandayApi.getDepartments();
      
      updateState({
        departments,
        isDepartmentsLoading: false,
        departmentsError: null,
      });

      // Initialize mapping service if we have employee groups too
      if (state.employeeGroups.length > 0) {
        MappingUtils.initialize(departments, state.employeeGroups);
      }

      console.log(`✅ Refreshed ${departments.length} departments`);

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isDepartmentsLoading: false,
        departmentsError: errorMessage,
      });
      
      throw error;
    }
  }, [state.isAuthenticated, state.employeeGroups, updateState, handleError]);

  /**
   * Refresh employee groups from Planday
   */
  const refreshEmployeeGroups = useCallback(async (): Promise<void> => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    updateState({ 
      isEmployeeGroupsLoading: true,
      employeeGroupsError: null
    });

    try {
      // Fetch employee groups
      const employeeGroups = await PlandayApi.getEmployeeGroups();
      
      updateState({
        employeeGroups,
        isEmployeeGroupsLoading: false,
        employeeGroupsError: null,
      });

      // Initialize mapping service if we have departments too
      if (state.departments.length > 0) {
        MappingUtils.initialize(state.departments, employeeGroups);
      }

      console.log(`✅ Refreshed ${employeeGroups.length} employee groups`);

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isEmployeeGroupsLoading: false,
        employeeGroupsError: errorMessage,
      });
      
      throw error;
    }
  }, [state.isAuthenticated, state.departments, updateState, handleError]);

  /**
   * Refresh field definitions from Planday
   */
  const refreshFieldDefinitions = useCallback(async (): Promise<void> => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    updateState({ 
      isFieldDefinitionsLoading: true,
      fieldDefinitionsError: null
    });

    try {
      // Fetch field definitions
      const fieldDefinitions = await PlandayApi.getFieldDefinitions();
      
      updateState({
        fieldDefinitions,
        isFieldDefinitionsLoading: false,
        fieldDefinitionsError: null,
      });

      // Initialize ValidationService with field definitions
      ValidationService.initialize(fieldDefinitions);

      console.log(`✅ Refreshed field definitions`);

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isFieldDefinitionsLoading: false,
        fieldDefinitionsError: errorMessage,
      });
      
      throw error;
    }
  }, [state.isAuthenticated, updateState, handleError]);

  /**
   * Refresh all Planday data (departments, employee groups, field definitions)
   */
  const refreshPlandayData = useCallback(async (): Promise<void> => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    // Fetch all data in parallel for better performance
    try {
      await Promise.all([
        refreshDepartments(),
        refreshEmployeeGroups(),
        refreshFieldDefinitions(),
      ]);
      
      console.log('✅ All Planday data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh some Planday data:', error);
      throw error;
    }
  }, [state.isAuthenticated, refreshDepartments, refreshEmployeeGroups, refreshFieldDefinitions]);

  /**
   * Upload employees to Planday
   */
  const uploadEmployees = useCallback(async (
    employees: PlandayEmployeeCreateRequest[],
    onProgress?: (progress: BulkUploadProgress) => void
  ): Promise<EmployeeUploadResult[]> => {
    // Check both hook state and API client state
    const apiAuthenticated = PlandayApi.isAuthenticated();
    
    // Sync hook state with API client state if they're out of sync
    if (state.isAuthenticated !== apiAuthenticated) {
      console.log('🔄 Syncing hook state with API client state (uploadEmployees):', {
        before: state.isAuthenticated,
        after: apiAuthenticated
      });
      updateState({ isAuthenticated: apiAuthenticated });
    }
    
    // Use the API client state as the source of truth
    if (!apiAuthenticated) {
      throw new Error('Not authenticated with Planday. Please re-authenticate.');
    }

    updateState({ 
      isUploading: true, 
      uploadError: null,
      uploadProgress: null 
    });

    try {
      const results = await PlandayApi.uploadEmployees(employees, (progress) => {
        updateState({ uploadProgress: progress });
        if (onProgress) {
          onProgress(progress);
        }
      });

      updateState({
        isUploading: false,
        uploadProgress: null,
        uploadError: null,
      });

      console.log('✅ Bulk upload completed successfully');
      return results;

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isUploading: false,
        uploadError: errorMessage,
      });
      
      throw error;
    }
  }, [state.isAuthenticated, updateState, handleError]);

  /**
   * Atomic upload employees to Planday (stop on first failure)
   */
  const atomicUploadEmployees = useCallback(async (
    employees: PlandayEmployeeCreateRequest[],
    onProgress?: (progress: BulkUploadProgress) => void
  ): Promise<EmployeeUploadResult[]> => {
    // Check both hook state and API client state
    const apiAuthenticated = PlandayApi.isAuthenticated();

    
    // Sync hook state with API client state if they're out of sync
    if (state.isAuthenticated !== apiAuthenticated) {
      console.log('🔄 Syncing hook state with API client state:', {
        before: state.isAuthenticated,
        after: apiAuthenticated
      });
      updateState({ isAuthenticated: apiAuthenticated });
    }
    
    // Use the API client state as the source of truth
    if (!apiAuthenticated) {
      throw new Error('Not authenticated with Planday. Please re-authenticate.');
    }

    updateState({ 
      isUploading: true, 
      uploadError: null,
      uploadProgress: null 
    });

    try {
      const results = await PlandayApi.atomicUploadEmployees(employees, (progress) => {
        updateState({ uploadProgress: progress });
        if (onProgress) {
          onProgress(progress);
        }
      });

      updateState({
        isUploading: false,
        uploadProgress: null,
        uploadError: null,
      });

      console.log('✅ Atomic upload completed successfully');
      return results;

    } catch (error) {
      const errorMessage = handleError(error);
      updateState({
        isUploading: false,
        uploadError: errorMessage,
      });
      
      throw error;
    }
  }, [state.isAuthenticated, updateState, handleError]);

  /**
   * Fetch employees for verification
   */
  const fetchEmployees = useCallback(async (
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    employees: PlandayEmployeeResponse[];
    total: number;
    hasMore: boolean;
  }> => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    try {
      const result = await PlandayApi.fetchEmployees(limit, offset);
      console.log(`✅ Fetched ${result.employees.length} employees (${offset}-${offset + limit} of ${result.total})`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch employees:', error);
      const errorMessage = handleError(error);
      throw new Error(errorMessage);
    }
  }, [state.isAuthenticated, handleError]);

  /**
   * Fetch specific employees by IDs for verification
   */
  const fetchEmployeesByIds = useCallback(async (
    employeeIds: number[]
  ): Promise<PlandayEmployeeResponse[]> => {
    if (!state.isAuthenticated) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    try {
      const employees = await PlandayApi.fetchEmployeesByIds(employeeIds);
      console.log(`✅ Fetched ${employees.length} employees by IDs`);
      
      return employees;
    } catch (error) {
      console.error('❌ Failed to fetch employees by IDs:', error);
      const errorMessage = handleError(error);
      throw new Error(errorMessage);
    }
  }, [state.isAuthenticated, handleError]);

  /**
   * Test API connection and sync authentication state
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await PlandayApi.testConnection();
      
      // Sync authentication state based on connection test result
      const apiAuthenticated = PlandayApi.isAuthenticated();
      if (state.isAuthenticated !== apiAuthenticated) {
        console.log('🔄 Syncing authentication state:', {
          hookState: state.isAuthenticated,
          apiState: apiAuthenticated,
          connectionResult: isConnected
        });
        
        updateState({ isAuthenticated: apiAuthenticated });
      }
      
      return isConnected;
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // If connection test throws, assume authentication failed
      updateState({ 
        isAuthenticated: false,
        authError: 'Connection test failed. Please re-authenticate.' 
      });
      
      return false;
    }
  }, [state.isAuthenticated, updateState]);

  /**
   * Clear all error states
   */
  const clearErrors = useCallback(() => {
    updateState({
      authError: null,
      departmentsError: null,
      employeeGroupsError: null,
      uploadError: null,
    });
  }, [updateState]);

  /**
   * Check authentication status on mount
   */
  useEffect(() => {
    const isAuthenticated = PlandayApi.isAuthenticated();
    
    if (isAuthenticated && !state.isAuthenticated) {
      // Restore authentication state FIRST
      updateState({ isAuthenticated: true });
    }
  }, [state.isAuthenticated, updateState, state.departments.length, state.employeeGroups.length]);

  /**
   * Refresh data when authentication is restored
   */
  useEffect(() => {
    // Only run if we're authenticated but don't have data
    if (state.isAuthenticated && (state.departments.length === 0 || state.employeeGroups.length === 0)) {
      // Add a small delay to ensure state has settled
      const timeoutId = setTimeout(() => {
        // First, try to restore data from MappingService (faster than API call)
        if (MappingUtils.isInitialized()) {
          const cachedDepartments = MappingUtils.getDepartments();
          const cachedEmployeeGroups = MappingUtils.getEmployeeGroups();
          
          updateState({
            departments: cachedDepartments,
            employeeGroups: cachedEmployeeGroups
          });
        } else {
          refreshPlandayData().catch((error) => {
            console.error('Failed to restore Planday data:', error);
            // Reset authentication state if data fetch fails
            updateState({ 
              isAuthenticated: false,
              authError: 'Failed to restore session data. Please re-authenticate.'
            });
          });
        }
      }, 100); // Small delay to let state settle
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.isAuthenticated, state.departments.length, state.employeeGroups.length, refreshPlandayData, updateState]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Cleanup is handled by the logout function
      // No automatic cleanup on unmount to preserve session
    };
  }, [instanceId]);

  const returnValue = {
    // State
    ...state,
    
    // Actions
    authenticate,
    logout,
    refreshDepartments,
    refreshEmployeeGroups,
    refreshFieldDefinitions,
    refreshPlandayData,
    uploadEmployees,
    atomicUploadEmployees,
    fetchEmployees,
    fetchEmployeesByIds,
    testConnection,
    clearErrors,
  };

  return returnValue;
}; 