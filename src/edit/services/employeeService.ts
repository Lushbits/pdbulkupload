/**
 * Employee Service for Planday Edit Feature
 * Handles all employee-related API operations with smart rate limiting
 */

import { CoreApiClient, EditApiError } from './coreApiClient';
import { ProgressiveEmployeeLoader } from './rateLimitService';
import type {
  EditEmployee,
  EditEmployeesResponse,
  EditEmployeeGroupPayrate,
  EditSalaryData,
  EditEmployeeContractRule,
} from '../types';

import { EDIT_API_ENDPOINTS } from '../constants';

/**
 * Employee Service with intelligent loading and rate limiting
 */
export class EmployeeService {
  private coreClient: CoreApiClient;
  private progressiveLoader: ProgressiveEmployeeLoader;

  constructor(coreClient: CoreApiClient) {
    this.coreClient = coreClient;
    this.progressiveLoader = new ProgressiveEmployeeLoader({
      maxConcurrency: 10,   // Keep higher concurrency
      perSecondLimit: 18,   // Just under 20/sec hard limit
      perMinuteLimit: 1000, // Conservative minute limit
      initialSpeed: 'fast'
    });
  }

  /**
   * Fetch employees with pagination support
   */
  async fetchEmployees(params: {
    limit?: number;
    offset?: number;
    createdFrom?: string;
    createdTo?: string;
    modifiedFrom?: string;
    modifiedTo?: string;
    special?: Array<'BankAccount' | 'BirthDate' | 'Ssn'>;
    includeSecurityGroups?: boolean;
    searchQuery?: string;
  } = {}): Promise<EditEmployeesResponse> {
    const {
      limit = 50,
      offset = 0,
      createdFrom,
      createdTo,
      modifiedFrom,
      modifiedTo,
      special,
      includeSecurityGroups,
      searchQuery,
    } = params;

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    if (createdFrom) queryParams.append('createdFrom', createdFrom);
    if (createdTo) queryParams.append('createdTo', createdTo);
    if (modifiedFrom) queryParams.append('modifiedFrom', modifiedFrom);
    if (modifiedTo) queryParams.append('modifiedTo', modifiedTo);
    if (special) special.forEach(s => queryParams.append('special', s));
    if (includeSecurityGroups !== undefined) queryParams.append('includeSecurityGroups', includeSecurityGroups.toString());
    if (searchQuery) queryParams.append('searchQuery', searchQuery);

    const response = await this.coreClient.makeAuthenticatedRequest<EditEmployeesResponse>(
      `${EDIT_API_ENDPOINTS.EMPLOYEES}?${queryParams.toString()}`,
      {},
      100 // Higher priority for basic employee data
    );

    // Basic response validation (non-breaking)
    if (!response) {
      console.error('❌ No response received from API');
      throw new EditApiError({
        code: 'NO_RESPONSE',
        message: 'No response received from API',
        details: { endpoint: EDIT_API_ENDPOINTS.EMPLOYEES }
      });
    }

    // Handle different response formats gracefully
    let employees = response.data || response || [];
    if (!Array.isArray(employees)) {
      console.warn('⚠️ Unexpected response format, attempting to handle:', {
        responseType: typeof response,
        dataType: typeof response.data,
        hasData: 'data' in response,
        response
      });
      
      // Try to extract array from various possible locations
      if (Array.isArray(response)) {
        employees = response;
      } else if (response.data && Array.isArray(response.data)) {
        employees = response.data;
      } else {
        employees = [];
      }
    }

    // Transform API response to our internal format
    return {
      ...response,
      data: employees.map(this.transformEmployeeData),
    };
  }

  /**
   * Fetch all employees with proper pagination and rate limiting
   */
  async fetchAllEmployees(): Promise<EditEmployee[]> {
    const pageSize = 50; // As per spec
    const allEmployees: EditEmployee[] = [];
    let offset = 0;
    let hasMore = true;

    console.log('🔄 Fetching all employees with pagination...');

    while (hasMore) {
      try {
        const response = await this.fetchEmployees({
          limit: pageSize,
          offset: offset,
          special: ['BankAccount', 'BirthDate', 'Ssn'],
          includeSecurityGroups: true
        });

        const employees = response.data || [];
        allEmployees.push(...employees);
        
        console.log(`📄 Page ${Math.floor(offset / pageSize) + 1}: Loaded ${employees.length} employees (Total: ${allEmployees.length})`);

        // Check if we have more pages
        hasMore = employees.length === pageSize;
        offset += pageSize;

        // Safety check to prevent infinite loops
        if (offset > 10000) {
          console.warn('⚠️  Pagination safety limit reached (10,000 employees)');
          break;
        }

      } catch (error) {
        console.error(`❌ Failed to fetch employees at offset ${offset}:`, error);
        
        // Log detailed error information for debugging
        if (error instanceof EditApiError) {
          console.error('🔍 API Error Details:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
        } else if (error instanceof Error) {
          console.error('🔍 Error Details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        } else {
          console.error('🔍 Unknown Error:', error);
        }
        
        throw error;
      }
    }

    console.log(`✅ Successfully loaded ${allEmployees.length} employees across ${Math.ceil(allEmployees.length / pageSize)} pages`);
    return allEmployees;
  }

  /**
   * Fetch payrates for a specific employee
   */
  async fetchEmployeePayrates(employeeId: number, employeeGroupIds: number[] = []): Promise<EditEmployeeGroupPayrate[]> {
    if (employeeGroupIds.length === 0) {
      return [];
    }

    const allPayrates: EditEmployeeGroupPayrate[] = [];

    // Fetch payrates for each employee group
    for (const groupId of employeeGroupIds) {
      console.log(`📋 Fetching payrate for employee ${employeeId} in group ${groupId}...`);
      
      try {
        const response = await this.coreClient.makeAuthenticatedRequest<any>(
          `${EDIT_API_ENDPOINTS.PAYRATES_BY_GROUP}/${groupId}/employees/${employeeId}`,
          {},
          200, // Lower priority for payrates
          employeeId // Pass employeeId for better error tracking and retries
        );

        // Debug logging for payrate API response
        if (allPayrates.length <= 3) {
          console.log(`🔍 Raw payrate API response for employee ${employeeId}, group ${groupId}:`, {
            response,
            dataType: typeof response,
            keys: response ? Object.keys(response) : 'null',
            nestedData: response?.data,
            rateField: response?.data?.rate,
            rateType: typeof response?.data?.rate
          });
        }

        // Fix: API response is nested - actual data is inside data.data
        const actualData = response?.data;
        if (actualData && actualData.rate !== undefined) {
          const payrate: EditEmployeeGroupPayrate = {
            employeeId: actualData.employeeId || employeeId,
            employeeGroupId: actualData.employeeGroupId || groupId,
            salaryCode: actualData.salaryCode || '',
            wageType: actualData.wageType || 'HourlyRate',
            rate: actualData.rate, // Keep original rate value
            validFrom: actualData.validFrom,
            validTo: actualData.validTo
          };
          
          // Debug the transformed payrate
          if (allPayrates.length <= 3) {
            console.log(`🔧 Transformed payrate:`, payrate);
          }
          
          allPayrates.push(payrate);
          console.log(`✅ Found payrate: ${actualData.rate} for employee ${employeeId} in group ${groupId}`);
        } else {
          console.log(`⚠️ No payrate data for employee ${employeeId} in group ${groupId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch payrate for employee ${employeeId} in group ${groupId}:`, error);
        // Continue with other groups rather than failing completely
      }
    }

    console.log(`📊 Found ${allPayrates.length} payrates for employee ${employeeId} across ${employeeGroupIds.length} groups`);
    return allPayrates;
  }

  /**
   * Fetch salary for a specific employee
   */
  async fetchEmployeeSalary(employeeId: number): Promise<EditSalaryData | null> {
    try {
      console.log(`🔄 Fetching salary for employee ${employeeId}...`);
      
      const response = await this.coreClient.makeAuthenticatedRequest<any>(
        `${EDIT_API_ENDPOINTS.SALARIES}/${employeeId}`,
        {},
        300, // Lower priority for salaries
        employeeId // Pass employeeId for better error tracking and retries
      );
      
      // Handle the actual API response structure: { data: { employeeId, salary, hours, ... } }
      if (response.data) {
        const salaryData = this.transformSalaryData(response.data);
        console.log(`✅ Found salary for employee ${employeeId}:`, {
          salary: salaryData.salary,
          hours: salaryData.hours,
          validFrom: salaryData.validFrom
        });
        return salaryData;
      } else {
        console.log(`ℹ️ No salary data found for employee ${employeeId}`);
        return null;
      }
    } catch (error) {
      if (error instanceof EditApiError && (error.code === '404' || error.code === '204')) {
        // No salary for this employee is normal
        console.log(`ℹ️ No salary data found for employee ${employeeId}`);
        return null;
      }
      console.warn(`⚠️ Salary data not available for employee ${employeeId}:`, error);
      return null;
    }
  }

  /**
   * Fetch contract rules for a specific employee
   */
  async fetchEmployeeContractRules(employeeId: number): Promise<EditEmployeeContractRule[]> {
    try {
      console.log(`🔄 Fetching contract rules for employee ${employeeId}...`);
      
      const response = await this.coreClient.makeAuthenticatedRequest<any>(
        `${EDIT_API_ENDPOINTS.EMPLOYEE_CONTRACT}/${employeeId}`,
        {},
        400, // Lowest priority for contract rules
        employeeId // Pass employeeId for better error tracking and retries
      );
      
      // Handle the actual API response structure: { data: { id, name, description } }
      if (response.data) {
        const contractRule = response.data;
        console.log(`✅ Found contract rule for employee ${employeeId}:`, {
          id: contractRule.id,
          name: contractRule.name,
          description: contractRule.description
        });
        return [contractRule]; // Return as array for consistency
      } else {
        console.log(`ℹ️ No contract rules found for employee ${employeeId}`);
        return [];
      }
    } catch (error) {
      if (error instanceof EditApiError && (error.code === '404' || error.code === '204')) {
        // No contract rules for this employee is normal
        console.log(`ℹ️ No contract rules found for employee ${employeeId}`);
        return [];
      }
      console.warn(`⚠️ Contract rules not available for employee ${employeeId}:`, error);
      return [];
    }
  }

  /**
   * Fetch comprehensive employee data with progressive loading
   */
  async fetchBasicEmployeeData(options: { 
    includePayrates?: boolean; 
    includeContractRules?: boolean; 
    includeSalaries?: boolean;
    onProgress?: (progress: { 
      currentEmployee: string; 
      completed: number; 
      total: number; 
      percentage: number;
      employee?: EditEmployee;
    }) => void;
  } = {}): Promise<EditEmployee[]> {
    console.log('🔄 Loading employee data with smart rate limiting...');
    
    try {
      // Fetch all employees first
      const allEmployees = await this.fetchAllEmployees();
      
      // If payrates/salaries/contracts are not requested, return basic data immediately
      if (!options.includePayrates && !options.includeSalaries && !options.includeContractRules) {
        console.log(`📊 Basic employee data loaded: ${allEmployees.length} employees`);
        return allEmployees;
      }

      console.log('🔄 Loading additional data (payrates, salaries, contracts) with progressive loading...');
      console.log(`🚀 Smart rate limiting: Adaptive speeds with intelligent concurrency control`);
      
      // Use progressive loader for loading additional data
      const enrichedEmployees = await this.progressiveLoader.loadEmployeesInBatches(
        allEmployees.map(emp => emp.id),
        async (employeeId: number) => {
          const employee = allEmployees.find(emp => emp.id === employeeId);
          if (!employee) {
            console.error(`❌ Employee ${employeeId} not found in allEmployees array`);
            throw new Error(`Employee ${employeeId} not found in basic employee data`);
          }
          
          // Prepare promises for additional data
          const promises: Promise<any>[] = [];
          
          // Extract employee group IDs for payrates
          const employeeGroupIds = employee.employeeGroups?.map(group => group.id) || [];
          
          if (options.includePayrates && employeeGroupIds.length > 0) {
            promises.push(this.fetchEmployeePayrates(employeeId, employeeGroupIds));
          } else {
            promises.push(Promise.resolve([]));
          }
          
          if (options.includeSalaries) {
            promises.push(this.fetchEmployeeSalary(employeeId));
          } else {
            promises.push(Promise.resolve(null));
          }
          
          if (options.includeContractRules) {
            promises.push(this.fetchEmployeeContractRules(employeeId));
          } else {
            promises.push(Promise.resolve([]));
          }
          
          try {
            // Fetch all additional data in parallel for this employee
            console.log(`🔄 Fetching additional data for employee ${employeeId} (${employee.firstName} ${employee.lastName})...`);
            const results = await Promise.all(promises);
            const [payrates, salary, contractRules] = results;
            
            console.log(`✅ Additional data fetched for employee ${employeeId}:`, {
              payrates: payrates?.length || 0,
              salary: salary ? 'present' : 'none',
              contractRules: contractRules?.length || 0
            });
            
            // Return enriched employee data
            const enrichedEmployee = {
              ...employee,
              employeeGroupPayrates: payrates || [],
              salaryData: salary || undefined,
              contractRules: contractRules || []
            };
            
            console.log(`📊 Enriched employee ${employeeId} successfully`);
            return enrichedEmployee;
            
          } catch (error) {
            console.error(`❌ Failed to fetch additional data for employee ${employeeId} (${employee.firstName} ${employee.lastName}):`, error);
            console.error(`🔍 Error details:`, {
              errorType: typeof error,
                          errorName: (error as Error)?.name,
            errorMessage: (error as Error)?.message,
            errorStack: (error as Error)?.stack
            });
            // Return employee with empty additional data instead of failing completely
            return {
              ...employee,
              employeeGroupPayrates: [],
              salaryData: undefined,
              contractRules: []
            };
          }
        },
        (loaded, total, employee) => {
          // Report progress
          if (options.onProgress && employee) {
            options.onProgress({
              currentEmployee: `${employee.firstName} ${employee.lastName}`,
              completed: loaded,
              total: total,
              percentage: (loaded / total) * 100,
              employee: employee
            });
          }
        }
      );

      console.log(`📊 Complete employee data loaded: ${enrichedEmployees.length} employees with additional data`);
      return enrichedEmployees;
      
    } catch (error) {
      console.error('❌ Failed to load employee data:', error);
      throw error;
    }
  }

  /**
   * Transform employee data from API format to our internal format
   */
  private transformEmployeeData(apiEmployee: any): EditEmployee {
    // Debug supervisor information for first few employees
    if (apiEmployee.supervisorEmployeeId || apiEmployee.supervisorId) {
      console.log(`🔍 DEBUG: Employee ${apiEmployee.id} (${apiEmployee.firstName} ${apiEmployee.lastName}) supervisor fields in API data:`, {
        supervisorEmployeeId: apiEmployee.supervisorEmployeeId,
        supervisorId: apiEmployee.supervisorId
      });
    }
    
    return {
      id: apiEmployee.id,
      firstName: apiEmployee.firstName,
      lastName: apiEmployee.lastName,
      userName: apiEmployee.userName,
      email: apiEmployee.email,
      cellPhone: apiEmployee.cellPhone,
      cellPhoneCountryCode: apiEmployee.cellPhoneCountryCode,
      street1: apiEmployee.street1,
      zip: apiEmployee.zip,
      city: apiEmployee.city,
      phone: apiEmployee.phone,
      phoneCountryCode: apiEmployee.phoneCountryCode,
      gender: apiEmployee.gender,
      // Departments and employee groups come as arrays of IDs from API
      // We'll need to resolve these to objects separately
      departments: (apiEmployee.departments || []).map((id: number) => ({ id, name: `Department ${id}`, number: '' })),
      employeeGroups: (apiEmployee.employeeGroups || []).map((id: number) => ({ id, name: `Group ${id}` })),
      employeeTypeId: apiEmployee.employeeTypeId,
      hiredFrom: apiEmployee.hiredDate,
      birthDate: apiEmployee.birthDate,
      ssn: apiEmployee.ssn,
      bankAccount: apiEmployee.bankAccount,
      
      // Supervisor information  
      supervisorEmployeeId: apiEmployee.supervisorEmployeeId,
      supervisorId: apiEmployee.supervisorId, // Add the supervisor record ID as well
      
      // Status and metadata
      isActive: !apiEmployee.deactivationDate,
      createdAt: apiEmployee.dateTimeCreated,
      updatedAt: apiEmployee.dateTimeModified,
      
      // Edit-specific fields
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {},
      
      // Payrate and salary (placeholder - will be populated from separate API calls)
      hourlyPayrate: undefined,
      contractedHours: undefined,
      monthlySalary: undefined,
    };
  }

  /**
   * Transform salary data from API format to our internal format
   */
  private transformSalaryData(apiSalary: any): EditSalaryData {
    return {
      employeeId: apiSalary.employeeId,
      salary: apiSalary.salary,
      hours: apiSalary.hours,
      validFrom: apiSalary.validFrom,
      createdByEmployeeId: apiSalary.createdByEmployeeId,
      createdAt: apiSalary.createdAt,
      salaryTypeId: apiSalary.salaryTypeId,
    };
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo() {
    return this.progressiveLoader.getRateLimitInfo();
  }

  /**
   * Get detailed statistics for monitoring
   */
  getStatistics() {
    return this.progressiveLoader.getStatistics();
  }

  /**
   * Clear any pending requests
   */
  clearQueue(): void {
    this.progressiveLoader.clearQueue();
  }
} 