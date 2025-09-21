/**
 * Unified API Client for Planday Edit Feature
 * Combines all services and provides the main interface with smart rate limiting
 */

import { CoreApiClient } from './coreApiClient';
import { EmployeeService } from './employeeService';
import { ReferenceDataService } from './referenceDataService';
import type { RateLimitInfo } from './rateLimitService';
import type {
  EditEmployee,
  EditDepartment,
  EditEmployeeGroup,
  EditEmployeeType,
  EditSupervisor,
  EditContractRule,
} from '../types';

/**
 * Unified API Client with Smart Rate Limiting
 */
export class UnifiedEditApiClient {
  // Core services
  private coreClient: CoreApiClient;
  private employeeService: EmployeeService;
  private referenceDataService: ReferenceDataService;

  constructor() {
    // Initialize core client
    this.coreClient = new CoreApiClient();
    
    // Initialize specialized services
    this.employeeService = new EmployeeService(this.coreClient);
    this.referenceDataService = new ReferenceDataService(this.coreClient);
  }

  /**
   * Enable/disable proxy mode
   */
  setProxyMode(enabled: boolean): void {
    this.coreClient.setProxyMode(enabled);
  }

  /**
   * Initialize with refresh token
   */
  async initialize(refreshToken: string): Promise<void> {
    return this.coreClient.initialize(refreshToken);
  }

  /**
   * Check authentication status
   */
  isAuthenticated(): boolean {
    return this.coreClient.isAuthenticated();
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    return this.coreClient.testConnection();
  }

  /**
   * Diagnostic method for troubleshooting
   */
  diagnoseAuth(): void {
    this.coreClient.diagnoseAuth();
  }

  /**
   * Fetch basic employee data with optional enhancements
   * This is the main method that replaces fetchBasicEmployeeData from the old service
   */
  async fetchBasicEmployeeData(options: { 
    includePayrates?: boolean; 
    includeContractRules?: boolean; 
    includeSalaries?: boolean; 
    includeSupervisors?: boolean;
    onProgress?: (progress: { 
      currentEmployee: string; 
      completed: number; 
      total: number; 
      percentage: number;
      employee?: EditEmployee;
      departments: EditDepartment[];
      employeeGroups: EditEmployeeGroup[];
      supervisors: EditSupervisor[];
      contractRules: EditContractRule[];
    }) => void;
  } = {}): Promise<{
    employees: EditEmployee[];
    departments: EditDepartment[];
    employeeGroups: EditEmployeeGroup[];
    employeeTypes: EditEmployeeType[];
    contractRules: EditContractRule[];
    supervisors: EditSupervisor[];
  }> {
    console.log('🔄 Loading complete employee data with smart rate limiting...');
    
    try {
      // First, test the connection to ensure we're authenticated
      console.log('🔍 Testing API connection...');
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.warn('⚠️ Connection test failed, but continuing anyway...');
        console.log('💡 Run "EditApi.diagnoseAuth()" in browser console to diagnose');
        // Don't throw error - let the actual API calls handle auth errors
        // This allows users to work if the connection test is too strict
      } else {
        console.log('✅ API connection test successful');
      }
      
      // Fetch reference data first to avoid timing issues
      console.log('🔄 Loading reference data...');
      const referenceData = await this.referenceDataService.fetchAllReferenceData({
        includeSupervisors: options.includeSupervisors,
        includeContractRules: options.includeContractRules,
        useCache: true
      });
      
      console.log('✅ Reference data loaded, now fetching employees...');
      
      // Now fetch employee data with reference data available for progress callbacks
      const enrichedEmployees = await this.employeeService.fetchBasicEmployeeData({
        includePayrates: options.includePayrates,
        includeContractRules: options.includeContractRules,
        includeSalaries: options.includeSalaries,
        onProgress: options.onProgress ? (progress) => {
          // Forward progress with reference data included (now available)
          options.onProgress!({
            ...progress,
            departments: referenceData.departments || [],
            employeeGroups: referenceData.employeeGroups || [],
            supervisors: referenceData.supervisors || [],
            contractRules: referenceData.contractRules || []
          });
        } : undefined
      });

      // Resolve reference data names in employee objects
      if (referenceData.departments.length > 0) {
        this.referenceDataService.resolveDepartmentNames(enrichedEmployees, referenceData.departments);
      }
      
      if (referenceData.employeeGroups.length > 0) {
        this.referenceDataService.resolveEmployeeGroupNames(enrichedEmployees, referenceData.employeeGroups);
      }
      
      if (referenceData.supervisors.length > 0) {
        this.referenceDataService.resolveSupervisorNames(enrichedEmployees, referenceData.supervisors);
      }

      console.log('📊 Complete data loaded with smart rate limiting:', {
        employees: enrichedEmployees.length,
        departments: referenceData.departments.length,
        employeeGroups: referenceData.employeeGroups.length,
        employeeTypes: referenceData.employeeTypes.length,
        contractRules: referenceData.contractRules.length,
        supervisors: referenceData.supervisors.length,
        totalPayrates: enrichedEmployees.reduce((total, emp) => total + (emp.employeeGroupPayrates?.length || 0), 0),
        employeesWithSalary: enrichedEmployees.filter(emp => emp.salaryData).length,
        employeesWithSupervisor: enrichedEmployees.filter(emp => emp.supervisorEmployeeId).length
      });

      // Report final progress
      if (options.onProgress) {
        options.onProgress({
          currentEmployee: 'Finalizing...',
          completed: enrichedEmployees.length,
          total: enrichedEmployees.length,
          percentage: 100,
          departments: referenceData.departments,
          employeeGroups: referenceData.employeeGroups,
          supervisors: referenceData.supervisors,
          contractRules: referenceData.contractRules
        });
      }

      return {
        employees: enrichedEmployees,
        departments: referenceData.departments,
        employeeGroups: referenceData.employeeGroups,
        employeeTypes: referenceData.employeeTypes,
        contractRules: referenceData.contractRules,
        supervisors: referenceData.supervisors
      };
    } catch (error) {
      console.error('❌ Failed to load complete employee data:', error);
      throw error;
    }
  }

  /**
   * Individual service method delegations for backward compatibility
   */
  
  async fetchEmployees(params: any = {}) {
    return this.employeeService.fetchEmployees(params);
  }

  async fetchDepartments() {
    return this.referenceDataService.fetchDepartments();
  }

  async fetchEmployeeGroups() {
    return this.referenceDataService.fetchEmployeeGroups();
  }

  async fetchEmployeeTypes() {
    return this.referenceDataService.fetchEmployeeTypes();
  }

  async fetchSupervisors() {
    return this.referenceDataService.fetchSupervisors();
  }

  async fetchAllContractRules() {
    return this.referenceDataService.fetchAllContractRules();
  }

  async fetchEmployeePayrates(employeeId: number, employeeGroupIds: number[] = []) {
    return this.employeeService.fetchEmployeePayrates(employeeId, employeeGroupIds);
  }

  async fetchEmployeeSalary(employeeId: number) {
    return this.employeeService.fetchEmployeeSalary(employeeId);
  }

  async fetchEmployeeContractRules(employeeId: number) {
    return this.employeeService.fetchEmployeeContractRules(employeeId);
  }

  /**
   * Legacy method compatibility
   */
  async fetchPayrates(): Promise<any[]> {
    console.warn('⚠️ fetchPayrates() called - use fetchEmployeePayrates() instead');
    return [];
  }

  async fetchSalaries(): Promise<any[]> {
    console.warn('⚠️ fetchSalaries() called - use fetchEmployeeSalary() instead');
    return [];
  }

  async fetchContracts(): Promise<any[]> {
    console.warn('⚠️ fetchContracts() called - use fetchEmployeeContractRules() instead');
    return [];
  }

  async fetchCompleteEmployeeData() {
    console.warn('⚠️ fetchCompleteEmployeeData() called - use fetchBasicEmployeeData() instead');
    return this.fetchBasicEmployeeData({
      includePayrates: true,
      includeSalaries: true,
      includeContractRules: true,
      includeSupervisors: true
    });
  }

  /**
   * Rate limiting and monitoring methods
   */
  
  getRateLimitInfo(): RateLimitInfo {
    return this.employeeService.getRateLimitInfo();
  }

  getStatistics() {
    return {
      employee: this.employeeService.getStatistics(),
      core: this.coreClient.getStatistics(),
      referenceCache: this.referenceDataService.getCacheStatus()
    };
  }

  clearQueue(): void {
    this.coreClient.clearQueue();
    this.employeeService.clearQueue();
  }

  clearCache(): void {
    this.referenceDataService.clearCache();
  }

  cleanup(): void {
    this.clearQueue();
    this.clearCache();
    this.coreClient.cleanup();
  }
}

/**
 * Global Edit API instance
 */
export const EditApi = new UnifiedEditApiClient();

/**
 * Make EditApi available globally for debugging
 */
if (typeof window !== 'undefined') {
  (window as any).EditApi = EditApi;
}

// Export classes for individual use if needed
export { CoreApiClient } from './coreApiClient';
export { EmployeeService } from './employeeService';
export { ReferenceDataService } from './referenceDataService';
export { PlandayRequestQueue, ProgressiveEmployeeLoader } from './rateLimitService';
export type { RateLimitInfo } from './rateLimitService'; 