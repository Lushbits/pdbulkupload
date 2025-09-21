/**
 * Reference Data Service for Planday Edit Feature
 * Handles departments, employee groups, types, supervisors, and contract rules
 */

import { CoreApiClient } from './coreApiClient';
import type {
  EditDepartment,
  EditDepartmentsResponse,
  EditEmployeeGroup,
  EditEmployeeGroupsResponse,
  EditEmployeeType,
  EditEmployeeTypesResponse,
  EditSupervisor,
  EditSupervisorsResponse,
  EditContractRule,
  EditContractRulesResponse,
} from '../types';

import { EDIT_API_ENDPOINTS } from '../constants';

/**
 * Reference Data Service for lookup data
 */
export class ReferenceDataService {
  private coreClient: CoreApiClient;

  // Cache for reference data (these don't change often)
  private departmentsCache: EditDepartment[] | null = null;
  private employeeGroupsCache: EditEmployeeGroup[] | null = null;
  private employeeTypesCache: EditEmployeeType[] | null = null;
  private supervisorsCache: EditSupervisor[] | null = null;
  private contractRulesCache: EditContractRule[] | null = null;

  constructor(coreClient: CoreApiClient) {
    this.coreClient = coreClient;
  }

  /**
   * Fetch departments with caching
   */
  async fetchDepartments(useCache: boolean = true): Promise<EditDepartment[]> {
    if (useCache && this.departmentsCache) {
      console.log('📋 Using cached departments data');
      return this.departmentsCache;
    }

    console.log('🔄 Fetching departments...');
    const response = await this.coreClient.makeAuthenticatedRequest<EditDepartmentsResponse>(
      EDIT_API_ENDPOINTS.DEPARTMENTS,
      {},
      50 // High priority for reference data
    );
    
    this.departmentsCache = response.data || [];
    console.log(`✅ Loaded ${this.departmentsCache.length} departments`);
    return this.departmentsCache;
  }

  /**
   * Fetch employee groups with caching
   */
  async fetchEmployeeGroups(useCache: boolean = true): Promise<EditEmployeeGroup[]> {
    if (useCache && this.employeeGroupsCache) {
      console.log('📋 Using cached employee groups data');
      return this.employeeGroupsCache;
    }

    console.log('🔄 Fetching employee groups...');
    const response = await this.coreClient.makeAuthenticatedRequest<EditEmployeeGroupsResponse>(
      EDIT_API_ENDPOINTS.EMPLOYEE_GROUPS,
      {},
      50 // High priority for reference data
    );
    
    this.employeeGroupsCache = response.data || [];
    console.log(`✅ Loaded ${this.employeeGroupsCache.length} employee groups`);
    return this.employeeGroupsCache;
  }

  /**
   * Fetch employee types with caching
   */
  async fetchEmployeeTypes(useCache: boolean = true): Promise<EditEmployeeType[]> {
    if (useCache && this.employeeTypesCache) {
      console.log('📋 Using cached employee types data');
      return this.employeeTypesCache;
    }

    console.log('🔄 Fetching employee types...');
    const response = await this.coreClient.makeAuthenticatedRequest<EditEmployeeTypesResponse>(
      EDIT_API_ENDPOINTS.EMPLOYEE_TYPES,
      {},
      50 // High priority for reference data
    );
    
    this.employeeTypesCache = response.data || [];
    console.log(`✅ Loaded ${this.employeeTypesCache.length} employee types`);
    return this.employeeTypesCache;
  }

  /**
   * Fetch supervisors with caching
   */
  async fetchSupervisors(useCache: boolean = true): Promise<EditSupervisor[]> {
    if (useCache && this.supervisorsCache) {
      console.log('📋 Using cached supervisors data');
      return this.supervisorsCache;
    }

    console.log('🔄 Fetching supervisors...');
    const response = await this.coreClient.makeAuthenticatedRequest<EditSupervisorsResponse>(
      EDIT_API_ENDPOINTS.SUPERVISORS,
      {},
      50 // High priority for reference data
    );
    
    this.supervisorsCache = response.data || [];
    console.log(`✅ Loaded ${this.supervisorsCache.length} supervisors:`, this.supervisorsCache);
    return this.supervisorsCache;
  }

  /**
   * Fetch all contract rules with caching
   */
  async fetchAllContractRules(useCache: boolean = true): Promise<EditContractRule[]> {
    if (useCache && this.contractRulesCache) {
      console.log('📋 Using cached contract rules data');
      return this.contractRulesCache;
    }

    console.log('🔄 Fetching all contract rules...');
    const response = await this.coreClient.makeAuthenticatedRequest<EditContractRulesResponse>(
      EDIT_API_ENDPOINTS.CONTRACTS,
      {},
      100 // Medium priority for contract rules
    );
    
    this.contractRulesCache = response.data || [];
    console.log(`✅ Loaded ${this.contractRulesCache.length} contract rules`);
    return this.contractRulesCache;
  }

  /**
   * Fetch all reference data in parallel
   */
  async fetchAllReferenceData(options: {
    includeSupervisors?: boolean;
    includeContractRules?: boolean;
    useCache?: boolean;
  } = {}): Promise<{
    departments: EditDepartment[];
    employeeGroups: EditEmployeeGroup[];
    employeeTypes: EditEmployeeType[];
    supervisors: EditSupervisor[];
    contractRules: EditContractRule[];
  }> {
    const { 
      includeSupervisors = false, 
      includeContractRules = false, 
      useCache = true 
    } = options;

    console.log('🔄 Fetching all reference data...');

    // Build promises array for parallel execution
    const promises = [
      this.fetchDepartments(useCache),
      this.fetchEmployeeGroups(useCache),
      this.fetchEmployeeTypes(useCache)
    ];

    // Add conditional data with explicit typing
    if (includeSupervisors) {
      promises.push(this.fetchSupervisors(useCache));
    } else {
      promises.push(Promise.resolve([] as EditSupervisor[]));
    }

    if (includeContractRules) {
      promises.push(this.fetchAllContractRules(useCache));
    } else {
      promises.push(Promise.resolve([] as EditContractRule[]));
    }

    // Execute all requests in parallel
    const results = await Promise.all(promises);
    const departments = results[0] as EditDepartment[];
    const employeeGroups = results[1] as EditEmployeeGroup[];
    const employeeTypes = results[2] as EditEmployeeType[];
    const supervisors = results[3] as EditSupervisor[];
    const contractRules = results[4] as EditContractRule[];

    console.log('📊 Reference data loaded:', {
      departments: departments.length,
      employeeGroups: employeeGroups.length,
      employeeTypes: employeeTypes.length,
      supervisors: supervisors.length,
      contractRules: contractRules.length
    });

    return {
      departments,
      employeeGroups,
      employeeTypes,
      supervisors,
      contractRules
    };
  }

  /**
   * Helper method to resolve department names for employee data
   */
  resolveDepartmentNames(employees: any[], departments?: EditDepartment[]): void {
    if (!departments) {
      departments = this.departmentsCache || [];
    }

    if (departments.length === 0) {
      console.warn('⚠️ No departments available for name resolution');
      return;
    }

    employees.forEach(employee => {
      if (employee.departments && Array.isArray(employee.departments)) {
        employee.departments = employee.departments.map((dept: any) => {
          if (typeof dept === 'number') {
            // Convert ID to department object
            const departmentData = departments.find(d => d.id === dept);
            return departmentData || { id: dept, name: `Department ${dept}`, number: '' };
          } else if (dept.id && !dept.name) {
            // Enhance existing object with name
            const departmentData = departments.find(d => d.id === dept.id);
            return { ...dept, ...departmentData };
          }
          return dept;
        });
      }
    });

    console.log(`🔧 Resolved department names for ${employees.length} employees`);
  }

  /**
   * Helper method to resolve employee group names for employee data
   */
  resolveEmployeeGroupNames(employees: any[], employeeGroups?: EditEmployeeGroup[]): void {
    if (!employeeGroups) {
      employeeGroups = this.employeeGroupsCache || [];
    }

    if (employeeGroups.length === 0) {
      console.warn('⚠️ No employee groups available for name resolution');
      return;
    }

    employees.forEach(employee => {
      if (employee.employeeGroups && Array.isArray(employee.employeeGroups)) {
        employee.employeeGroups = employee.employeeGroups.map((group: any) => {
          if (typeof group === 'number') {
            // Convert ID to group object
            const groupData = employeeGroups.find(g => g.id === group);
            return groupData || { id: group, name: `Group ${group}` };
          } else if (group.id && !group.name) {
            // Enhance existing object with name
            const groupData = employeeGroups.find(g => g.id === group.id);
            return { ...group, ...groupData };
          }
          return group;
        });
      }
    });

    console.log(`🔧 Resolved employee group names for ${employees.length} employees`);
  }

  /**
   * Helper method to resolve supervisor names for employee data
   */
  resolveSupervisorNames(employees: any[], supervisors?: EditSupervisor[]): void {
    if (!supervisors) {
      supervisors = this.supervisorsCache || [];
    }

    if (supervisors.length === 0) {
      console.warn('⚠️ No supervisors available for name resolution');
      return;
    }

    console.log(`🔍 DEBUG: Starting supervisor mapping with ${supervisors.length} supervisors:`, supervisors);
    
    let mappedCount = 0;
    employees.forEach(employee => {
      // Try both supervisor ID approaches
      let supervisor = null;
      
      if (employee.supervisorId) {
        console.log(`🔍 DEBUG: Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has supervisorId: ${employee.supervisorId}`);
        supervisor = supervisors.find(s => s.id === employee.supervisorId);
        if (supervisor) {
          console.log(`✅ DEBUG: Found supervisor by ID match: ${supervisor.name} (id: ${supervisor.id})`);
        }
      }
      
      if (!supervisor && employee.supervisorEmployeeId) {
        console.log(`🔍 DEBUG: Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has supervisorEmployeeId: ${employee.supervisorEmployeeId}`);
        supervisor = supervisors.find(s => s.employeeId === employee.supervisorEmployeeId);
        if (supervisor) {
          console.log(`✅ DEBUG: Found supervisor by employeeId match: ${supervisor.name} (employeeId: ${supervisor.employeeId})`);
        }
      }
      
      if (supervisor) {
        employee.supervisorName = supervisor.name;
        mappedCount++;
        console.log(`✅ DEBUG: Mapped supervisor "${supervisor.name}" to employee ${employee.id}`);
      } else if (employee.supervisorId || employee.supervisorEmployeeId) {
        console.log(`⚠️ DEBUG: No supervisor found for employee ${employee.id} (supervisorId: ${employee.supervisorId}, supervisorEmployeeId: ${employee.supervisorEmployeeId})`);
      }
    });

    console.log(`👥 Mapped supervisor names for ${mappedCount} employees with supervisors`);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.departmentsCache = null;
    this.employeeGroupsCache = null;
    this.employeeTypesCache = null;
    this.supervisorsCache = null;
    this.contractRulesCache = null;
    console.log('🧹 Reference data cache cleared');
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    return {
      departments: !!this.departmentsCache,
      employeeGroups: !!this.employeeGroupsCache,
      employeeTypes: !!this.employeeTypesCache,
      supervisors: !!this.supervisorsCache,
      contractRules: !!this.contractRulesCache,
      counts: {
        departments: this.departmentsCache?.length || 0,
        employeeGroups: this.employeeGroupsCache?.length || 0,
        employeeTypes: this.employeeTypesCache?.length || 0,
        supervisors: this.supervisorsCache?.length || 0,
        contractRules: this.contractRulesCache?.length || 0
      }
    };
  }
} 