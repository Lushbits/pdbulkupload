/**
 * Edit API Service
 * Completely isolated API service for bulk edit functionality
 * No dependencies on upload workflow services
 */

import type {
  EditAuthTokens,
  EditTokenRefreshRequest,
  EditEmployee,
  EditEmployeesResponse,
  EditDepartment,
  EditDepartmentsResponse,
  EditEmployeeGroup,
  EditEmployeeGroupsResponse,
  EditEmployeeType,
  EditEmployeeTypesResponse,
  EditEmployeeGroupPayrate,
  EditPayrateData,
  EditSalaryData,
  EditSalaryResponse,
  EditContractData,
  EditContractRule,
  EditContractRulesResponse,
  EditEmployeeContractRule,
  EditEmployeeContractRulesResponse,
  EditSupervisor,
  EditSupervisorsResponse,
  EditApiErrorData,
} from '../types';

import {
  EDIT_API_CONFIG,
  EDIT_API_ENDPOINTS,
  EDIT_TOKEN_CONFIG,
} from '../constants';

/**
 * Edit API Client
 * Handles all communication with Planday APIs for edit functionality
 */
export class EditApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshPromise: Promise<void> | null = null;

  // Dynamic rate limit tracking
  private requestCount: number = 0;
  private rateLimitRemaining: number | null = null;
  private rateLimitReset: number | null = null;
  private rateLimitActiveLimit: number | null = null;
  private lastRateLimitUpdate: number = 0;

  // Error-based rate limiting for when headers aren't available
  private consecutive429Errors: number = 0;
  private lastErrorTime: number = 0;
  private baseDelay: number = 60; // Start with 60ms
  private isInBackoffMode: boolean = false;

  // Proxy configuration
  private useProxy: boolean = false; // Set to true to use Netlify proxy for rate limit headers (DISABLED - proxy not working)

  constructor() {
    // Load stored tokens on initialization
    this.loadStoredTokens();
  }

  /**
   * Enable/disable proxy mode for accessing rate limit headers
   */
  setProxyMode(enabled: boolean): void {
    this.useProxy = enabled;
    console.log(enabled ? '🔄 Proxy mode enabled - accessing rate limit headers via Netlify function' : '📡 Direct mode - using direct API calls');
  }

  /**
   * Initialize the API client with a refresh token
   */
  async initialize(refreshToken: string): Promise<void> {
    this.refreshToken = refreshToken;
    this.storeRefreshToken(refreshToken);
    
    // Get initial access token
    await this.refreshAccessToken();
  }

  /**
   * Check if the client is properly authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.refreshToken && this.tokenExpiry);
  }

  /**
   * Get current access token, refreshing if necessary
   */
  private async getValidAccessToken(): Promise<string> {
    // Check if we need to refresh the token
    if (this.shouldRefreshToken()) {
      await this.ensureTokenRefresh();
    }

    if (!this.accessToken) {
      throw new Error('No valid access token available. Please re-authenticate.');
    }

    return this.accessToken;
  }

  /**
   * Check if token should be refreshed (5 minutes before expiry)
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenExpiry) return true;
    
    const bufferTime = EDIT_TOKEN_CONFIG.REFRESH_BUFFER_MINUTES * 60 * 1000;
    const refreshTime = this.tokenExpiry.getTime() - bufferTime;
    
    return Date.now() >= refreshTime;
  }

  /**
   * Ensure token refresh happens only once if multiple requests are made
   */
  private async ensureTokenRefresh(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshAccessToken();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    const requestBody: EditTokenRefreshRequest = {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: EDIT_API_CONFIG.clientId,
    };

    try {
      const response = await fetch(EDIT_API_CONFIG.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams(requestBody as any).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
      }

      const tokens: EditAuthTokens = await response.json();
      
      // Update stored tokens
      this.accessToken = tokens.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));
      
      // Store in sessionStorage for security
      this.storeTokens(tokens);
      
    } catch (error) {
      console.error('❌ Edit API token refresh failed:', error);
      this.clearStoredTokens();
      throw error;
    }
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  private async makeAuthenticatedRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      console.log(`🔗 Making API request to: ${endpoint}`);
      const accessToken = await this.getValidAccessToken();
      console.log(`🔑 Access token obtained: ${accessToken ? 'present' : 'missing'} (length: ${accessToken?.length || 0})`);
      
      // Track request count for rate limiting
      this.requestCount++;
      
      let response: Response;
      const fullUrl = `${EDIT_API_CONFIG.baseUrl}${endpoint}`;
      console.log(`🌐 Full API URL: ${fullUrl}`);
      
      if (this.useProxy) {
        console.log('🔄 Using Netlify proxy for API call');
        // Use Netlify function proxy to access rate limit headers
        response = await fetch('/.netlify/functions/planday-proxy', {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Planday-Endpoint': endpoint,
            ...options.headers,
          },
          body: options.body
        });
      } else {
        console.log('🔗 Making direct API call');
        // Direct API call (CORS-limited)
        response = await fetch(fullUrl, {
          ...options,
          headers: {
            ...EDIT_API_CONFIG.requiredHeaders,
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers,
          },
        });
      }

      console.log(`📡 API Response received: ${response.status} ${response.statusText}`);
      console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

      // Update rate limit tracking from response headers
      this.updateRateLimitTracking(response.headers);

      const result = await this.handleApiResponse<T>(response);
      console.log(`✅ API call successful, response type: ${typeof result}`);
      if (result && typeof result === 'object') {
        console.log(`📊 Response structure:`, {
          hasData: 'data' in result,
          dataType: result && 'data' in result ? typeof (result as any).data : 'unknown',
          dataIsArray: result && 'data' in result ? Array.isArray((result as any).data) : false,
          keys: Object.keys(result)
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ API request failed for ${endpoint}:`, error);
      
      // Handle network errors and other fetch failures
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new EditApiError({
          code: 'NETWORK_ERROR',
          message: 'Network connection failed. Please check your internet connection.',
          details: { originalError: error.message, endpoint, fullUrl: `${EDIT_API_CONFIG.baseUrl}${endpoint}` }
        });
      }
      
      // Re-throw EditApiErrors as-is
      if (error instanceof EditApiError) {
        throw error;
      }
      
      // Handle other unexpected errors
      throw new EditApiError({
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: { originalError: error, endpoint }
      });
    }
  }

  /**
   * Handle API response with comprehensive error handling
   */
  private async handleApiResponse<T>(response: Response): Promise<T> {
    // Handle successful responses
    if (response.ok) {
      // Track successful requests for rate limit adaptation
      this.handleApiSuccess();
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType && contentType.includes('text/html')) {
        // This usually means we hit a Netlify error page or similar
        const htmlContent = await response.text();
        console.error('🚨 Got HTML response instead of JSON - likely proxy/deployment issue:', {
          contentType,
          responseText: htmlContent.substring(0, 200) + '...'
        });
        throw new EditApiError({
          code: 'HTML_RESPONSE',
          message: 'Received HTML response instead of JSON. This usually indicates a proxy or deployment issue.',
          details: { contentType, responsePreview: htmlContent.substring(0, 200) }
        });
      }
      return {} as T;
    }

    // Handle error responses
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // If JSON parsing fails, use status text
      errorData = { message: response.statusText };
    }

    const error: EditApiErrorData = {
      code: response.status.toString(),
      message: errorData.message || errorData.error_description || response.statusText,
      details: errorData,
    };

    // Add specific handling for rate limit errors
    if (response.status === 429) {
      error.message = `Rate limit exceeded. ${error.message}`;
      console.warn('⚠️ API rate limit hit:', error);
    }

    const apiError = new EditApiError(error);
    
    // Track errors for adaptive rate limiting
    this.handleApiError(apiError);
    
    throw apiError;
  }

  /**
   * Fetch employees from Planday API
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

    const response = await this.makeAuthenticatedRequest<EditEmployeesResponse>(
      `${EDIT_API_ENDPOINTS.EMPLOYEES}?${queryParams.toString()}`
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
   * Fetch departments
   */
  async fetchDepartments(): Promise<EditDepartment[]> {
    const response = await this.makeAuthenticatedRequest<EditDepartmentsResponse>(
      EDIT_API_ENDPOINTS.DEPARTMENTS
    );
    
    return response.data;
  }

  /**
   * Fetch employee groups
   */
  async fetchEmployeeGroups(): Promise<EditEmployeeGroup[]> {
    const response = await this.makeAuthenticatedRequest<EditEmployeeGroupsResponse>(
      EDIT_API_ENDPOINTS.EMPLOYEE_GROUPS
    );
    
    return response.data;
  }

  /**
   * Fetch employee types
   */
  async fetchEmployeeTypes(): Promise<EditEmployeeType[]> {
    const response = await this.makeAuthenticatedRequest<EditEmployeeTypesResponse>(
      EDIT_API_ENDPOINTS.EMPLOYEE_TYPES
    );
    
    return response.data;
  }

  /**
   * Fetch supervisors
   */
  async fetchSupervisors(): Promise<EditSupervisor[]> {
    console.log('🔄 Fetching supervisors...');
    const response = await this.makeAuthenticatedRequest<EditSupervisorsResponse>(
      EDIT_API_ENDPOINTS.SUPERVISORS
    );
    console.log(`✅ Found ${response.data?.length || 0} supervisors:`, response.data);
    return response.data || [];
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
        // Apply rate limiting delay
        const delay = this.calculateRequestDelay();
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const { data } = await this.makeAuthenticatedRequestWithHeaders<any>(
          `${EDIT_API_ENDPOINTS.PAYRATES_BY_GROUP}/${groupId}/employees/${employeeId}`
        );

        // Debug logging for payrate API response
        if (this.requestCount <= 3) {
          console.log(`🔍 Raw payrate API response for employee ${employeeId}, group ${groupId}:`, {
            data,
            dataType: typeof data,
            keys: data ? Object.keys(data) : 'null',
            nestedData: data?.data,
            rateField: data?.data?.rate,
            rateType: typeof data?.data?.rate
          });
        }

        // Fix: API response is nested - actual data is inside data.data
        const actualData = data?.data;
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
          if (this.requestCount <= 3) {
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
   * Parse rate limit headers and calculate dynamic delay
   */
  private parseRateLimitHeaders(headers: Headers): {
    remaining: number | null;
    reset: number | null;
    activeLimit: number | null;
  } {
    // Try both original header names and proxy-exposed names
    const remainingHeaders = ['x-ratelimit-remaining', 'X-RateLimit-Remaining'];
    const resetHeaders = ['x-ratelimit-reset', 'X-RateLimit-Reset'];
    const limitHeaders = ['x-ratelimit-limit', 'X-RateLimit-Limit'];

    let remaining: string | null = null;
    let reset: string | null = null;
    let limit: string | null = null;

    // Try to find the headers
    for (const headerName of remainingHeaders) {
      remaining = headers.get(headerName);
      if (remaining) break;
    }

    for (const headerName of resetHeaders) {
      reset = headers.get(headerName);
      if (reset) break;
    }

    for (const headerName of limitHeaders) {
      limit = headers.get(headerName);
      if (limit) break;
    }

    let activeLimit: number | null = null;
    if (limit) {
      // Parse the first number from "100, 20;w=1, 750;w=60, 100;w=1, 2000;w=60"
      const firstCommaIndex = limit.indexOf(',');
      const activeLimitStr = firstCommaIndex > 0 ? limit.substring(0, firstCommaIndex) : limit;
      const parsed = parseInt(activeLimitStr);
      if (!isNaN(parsed)) {
        activeLimit = parsed;
      }
    }

    return {
      remaining: remaining ? parseInt(remaining) : null,
      reset: reset ? parseInt(reset) : null,
      activeLimit
    };
  }

  /**
   * Calculate intelligent delay that adapts to actual API behavior
   */
  private calculateRequestDelay(): number {
    // If we have fresh rate limit info (unlikely due to CORS), use it
    const rateLimitAge = Date.now() - this.lastRateLimitUpdate;
    const hasValidRateLimit = this.rateLimitRemaining !== null && 
                              this.rateLimitReset !== null && 
                              this.rateLimitActiveLimit !== null &&
                              rateLimitAge < 5000; // 5 seconds

    if (hasValidRateLimit) {
      // Use the original dynamic calculation if we somehow have rate limit data
      const remaining = this.rateLimitRemaining!;
      const reset = this.rateLimitReset!;
      const activeLimit = this.rateLimitActiveLimit!;
      const utilizationRatio = remaining / activeLimit;
      
      if (utilizationRatio > 0.6) return 0;
      if (utilizationRatio > 0.3) return 25;
      if (utilizationRatio > 0.1) return 100;
      if (remaining > 0) return 250;
      return (reset * 1000) + 100;
    }
    
    // Error-based adaptive delays (more realistic for CORS-limited scenarios)
    const timeSinceLastError = Date.now() - this.lastErrorTime;
    
    if (this.consecutive429Errors > 0 && timeSinceLastError < 60000) { // Within last minute
      // Exponential backoff based on consecutive errors
      const backoffDelay = this.baseDelay * Math.pow(2, this.consecutive429Errors);
      const maxDelay = 5000; // Cap at 5 seconds
      const actualDelay = Math.min(backoffDelay, maxDelay);
      
      if (this.requestCount % 10 === 0) {
        console.log(`🔄 Adaptive backoff: ${actualDelay}ms delay (${this.consecutive429Errors} consecutive 429s)`);
      }
      
      return actualDelay;
    }
    
    // Conservative multi-user safe delays
    if (this.requestCount <= 5) {
      return 120; // Slower start to be safe
    }
    
    // Use conservative base delay with slight randomization to spread out multi-user requests
    const randomOffset = Math.random() * 20 - 10; // ±10ms randomization
    const conservativeDelay = 80 + randomOffset; // 80ms base (12.5 req/sec per user)
    
    if (this.requestCount % 50 === 0) {
      console.log(`⚡ Conservative mode: ${Math.round(conservativeDelay)}ms delay (~12.5 req/sec, multi-user safe)`);
    }
    
    return Math.max(conservativeDelay, 50); // Minimum 50ms
  }

  /**
   * Track API errors to adapt rate limiting behavior
   */
  private handleApiError(error: any): void {
    if (error instanceof EditApiError && error.code === '429') {
      this.consecutive429Errors++;
      this.lastErrorTime = Date.now();
      this.isInBackoffMode = true;
      
      console.warn(`⚠️ Rate limit hit! Consecutive 429s: ${this.consecutive429Errors}. Increasing delays.`);
    }
  }

  /**
   * Reset error tracking on successful requests
   */
  private handleApiSuccess(): void {
    if (this.consecutive429Errors > 0) {
      // Gradually reduce error count on success rather than immediate reset
      this.consecutive429Errors = Math.max(0, this.consecutive429Errors - 1);
      
      if (this.consecutive429Errors === 0) {
        this.isInBackoffMode = false;
        console.log(`✅ Rate limiting recovered. Returning to normal speeds.`);
      }
    }
  }

  /**
   * Update rate limit tracking from response headers
   */
  private updateRateLimitTracking(headers: Headers): void {
    const rateLimitInfo = this.parseRateLimitHeaders(headers);
    
    // Log successful rate limit detection for first few requests
    if (this.requestCount <= 3 && rateLimitInfo.remaining !== null) {
      console.log(`✅ Rate limit headers detected! ${rateLimitInfo.remaining}/${rateLimitInfo.activeLimit} remaining, resets in ${rateLimitInfo.reset}s`);
    }
    
    // Update tracking if we got valid headers
    if (rateLimitInfo.remaining !== null && rateLimitInfo.reset !== null && rateLimitInfo.activeLimit !== null) {
      this.rateLimitRemaining = rateLimitInfo.remaining;
      this.rateLimitReset = rateLimitInfo.reset;
      this.rateLimitActiveLimit = rateLimitInfo.activeLimit;
      this.lastRateLimitUpdate = Date.now();
      
      // Log when we actually get rate limit data
      if (this.requestCount <= 3 || rateLimitInfo.remaining < 10) {
        console.log(`📊 Dynamic rate limiting active: ${rateLimitInfo.remaining}/${rateLimitInfo.activeLimit} remaining, resets in ${rateLimitInfo.reset}s`);
      }
    }
  }

  /**
   * Fetch payrates for all employees (legacy method)
   */
  async fetchPayrates(): Promise<EditPayrateData[]> {
    // This method is kept for backward compatibility but won't be used
    // in the new implementation since we fetch per employee
    console.warn('⚠️ fetchPayrates() called - use fetchEmployeePayrates() instead');
    return [];
  }

  /**
   * Fetch salary for a specific employee
   */
  async fetchEmployeeSalary(employeeId: number): Promise<EditSalaryData | null> {
    try {
      console.log(`🔄 Fetching salary for employee ${employeeId}...`);
      
      // Apply rate limiting delay
      const delay = this.calculateRequestDelay();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await this.makeAuthenticatedRequest<EditSalaryResponse>(
        `${EDIT_API_ENDPOINTS.SALARIES}/${employeeId}`
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
   * Fetch salaries for all employees (legacy method)
   */
  async fetchSalaries(): Promise<EditSalaryData[]> {
    // This method is kept for backward compatibility
    console.warn('⚠️ fetchSalaries() called - use fetchEmployeeSalary() instead');
    return [];
  }

  /**
   * Fetch contract for a specific employee
   */
  async fetchEmployeeContract(employeeId: number): Promise<EditContractData | null> {
    try {
      const response = await this.makeAuthenticatedRequest<any>(
        `${EDIT_API_ENDPOINTS.EMPLOYEE_CONTRACT}/${employeeId}`
      );
      
      if (!response) return null;
      
      return this.transformContractData(response);
    } catch (error) {
      if (error instanceof EditApiError && (error.code === '404' || error.code === '204')) {
        // No contract for this employee is normal
        return null;
      }
      console.warn(`⚠️ Contract data not available for employee ${employeeId}:`, error);
      return null;
    }
  }

  /**
   * Fetch contract rules for all employees (legacy method)
   */
  async fetchContracts(): Promise<EditContractData[]> {
    // This method is kept for backward compatibility
    console.warn('⚠️ fetchContracts() called - use fetchEmployeeContract() instead');
    return [];
  }

  /**
   * Fetch all contract rules in the portal
   */
  async fetchAllContractRules(): Promise<EditContractRule[]> {
    try {
      console.log('🔄 Fetching all contract rules...');
      const response = await this.makeAuthenticatedRequest<EditContractRulesResponse>(
        EDIT_API_ENDPOINTS.CONTRACTS
      );
      
      console.log(`✅ Found ${response.data?.length || 0} contract rules`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch contract rules:', error);
      throw error;
    }
  }

  /**
   * Fetch contract rules for a specific employee
   */
  async fetchEmployeeContractRules(employeeId: number): Promise<EditEmployeeContractRule[]> {
    try {
      console.log(`🔄 Fetching contract rules for employee ${employeeId}...`);
      
      // Apply rate limiting delay
      const delay = this.calculateRequestDelay();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await this.makeAuthenticatedRequest<EditEmployeeContractRulesResponse>(
        `${EDIT_API_ENDPOINTS.EMPLOYEE_CONTRACT}/${employeeId}`
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
   * Fetch basic employee data for Excel export with optional streaming progress
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
      employee?: EditEmployee; // Add the newly processed employee
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
    console.log('🔄 Loading basic employee data...');
    
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
      
      // Fetch reference data and employees in parallel
      const [
        departments,
        employeeGroups,
        employeeTypes,
        allEmployees
      ] = await Promise.all([
        this.fetchDepartments(),
        this.fetchEmployeeGroups(),
        this.fetchEmployeeTypes(),
        this.fetchAllEmployees()
      ]);

      // Fetch contract rules and supervisors if requested
      const contractRules = options.includeContractRules ? await this.fetchAllContractRules() : [];
      const supervisors = options.includeSupervisors ? await this.fetchSupervisors() : [];

      // If payrates are not requested, return basic data immediately
      if (!options.includePayrates) {
        // Map supervisor names to employees if supervisors were fetched
        if (supervisors.length > 0) {
          console.log(`🔍 DEBUG: Starting supervisor mapping with ${supervisors.length} supervisors:`, supervisors);
          
          let mappedCount = 0;
          allEmployees.forEach(employee => {
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
        } else {
          console.log(`⚠️ DEBUG: No supervisors to map (supervisors.length = ${supervisors.length})`);
        }

        console.log('📊 Basic data loaded (without payrates):', {
          employees: allEmployees.length,
          departments: departments.length,
          employeeGroups: employeeGroups.length,
          employeeTypes: employeeTypes.length,
          contractRules: contractRules.length,
          supervisors: supervisors.length
        });

        return {
          employees: allEmployees,
          departments,
          employeeGroups,
          employeeTypes,
          contractRules,
          supervisors
        };
      }

      console.log('🔄 Loading payrates for employees...');
      console.log('🚀 TURBO FAST: 60ms delays (~16.7 req/sec, 83% of API\'s 20 req/sec limit)');
      
      // Reset rate limit tracking for this operation
      this.requestCount = 0; // Reset request counter
      
      // Use all employees for production
      const employeesToProcess = allEmployees;
      console.log(`🔄 Loading payrates for ${employeesToProcess.length} employees...`);
      
      // Calculate estimated time (even faster with 60ms delays!)
      const totalPayrateRequests = employeesToProcess.reduce((total, emp) => total + (emp.employeeGroups?.length || 0), 0);
      const initialTime = 5 * 0.12; // First 5 requests at 120ms each = 0.6s
      const remainingTime = Math.max(0, totalPayrateRequests - 5) * 0.06; // Remaining requests at 60ms each
      const estimatedSeconds = initialTime + remainingTime;
      const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
      
      console.log(`📊 Estimated loading time: ~${estimatedMinutes} minutes for ${totalPayrateRequests} payrate requests`);
      console.log(`⚡ TURBO delays: 5×120ms then ${totalPayrateRequests-5}×60ms (~16.7 req/sec)`);
      console.log(`🚀 Much faster! API allows 20 req/sec, using 16.7 req/sec for safety`);
      
      // Fetch payrates for employees with truly sequential warm-up, then intelligent adaptive rate limiting
      const enrichedEmployees: EditEmployee[] = [];
      
      for (let i = 0; i < employeesToProcess.length; i++) {
        const employee = employeesToProcess[i];
        
        // Report progress (before processing this employee)
        if (options.onProgress) {
          options.onProgress({
            currentEmployee: `${employee.firstName} ${employee.lastName}`,
            completed: i,
            total: employeesToProcess.length,
            percentage: (i / employeesToProcess.length) * 100,
            departments,
            employeeGroups,
            supervisors,
            contractRules
          });
        }
        
        try {
          // Extract employee group IDs from the employee data
          const employeeGroupIds = employee.employeeGroups?.map(group => group.id) || [];
          
          console.log(`🧪 DEBUG - Employee ${employee.id} (${employee.firstName} ${employee.lastName}):`);
          console.log(`   • Groups: ${employeeGroupIds.length} (${employeeGroupIds.join(', ')})`);
          console.log(`   • Will fetch payrates for each group...`);
          
          if (employeeGroupIds.length === 0) {
            console.log(`⚠️ Employee ${employee.id} has no groups, skipping payrate fetch`);
            enrichedEmployees.push({
              ...employee,
              employeeGroupPayrates: []
            });
            continue;
          }
          
          // Apply delay BEFORE making the request
          if (i > 0) { // Don't delay the first request
            const delay = this.calculateRequestDelay();
            console.log(`⏳ TURBO delay ${delay}ms before request ${i + 1}/${employeesToProcess.length}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Fetch payrates for this employee
          console.log(`🔍 Fetching payrates for employee ${employee.id} across ${employeeGroupIds.length} groups...`);
          const payrates = await this.fetchEmployeePayrates(employee.id, employeeGroupIds);
          
          // Fetch contract rules for this employee if requested
          let contractRulesForEmployee: EditEmployeeContractRule[] = [];
          if (options.includeContractRules) {
            try {
              console.log(`🔍 Fetching contract rules for employee ${employee.id}...`);
              const rulesResult = await this.fetchEmployeeContractRules(employee.id);
              contractRulesForEmployee = Array.isArray(rulesResult) ? rulesResult : [];
              console.log(`✅ Found ${contractRulesForEmployee.length} contract rules for employee ${employee.id}`);
            } catch (error) {
              console.warn(`⚠️ Failed to fetch contract rules for employee ${employee.id}:`, error);
              contractRulesForEmployee = [];
            }
          }

          // Fetch salary for this employee if requested
          let salaryForEmployee: EditSalaryData | null = null;
          if (options.includeSalaries) {
            try {
              salaryForEmployee = await this.fetchEmployeeSalary(employee.id);
            } catch (error) {
              console.warn(`⚠️ Failed to fetch salary for employee ${employee.id}:`, error);
              salaryForEmployee = null;
            }
          }
          
          // Add payrates, contract rules, and salary to employee data
          const enrichedEmployee = {
            ...employee,
            employeeGroupPayrates: payrates,
            contractRules: contractRulesForEmployee,
            salaryData: salaryForEmployee || undefined
          };
          enrichedEmployees.push(enrichedEmployee);
          
          const progress = Math.round((enrichedEmployees.length / employeesToProcess.length) * 100);
          console.log(`📄 Processed employee ${enrichedEmployees.length}/${employeesToProcess.length} (${progress}% complete)`);
          
          // Report progress after processing this employee
          if (options.onProgress) {
            options.onProgress({
              currentEmployee: `${employee.firstName} ${employee.lastName}`,
              completed: enrichedEmployees.length,
              total: employeesToProcess.length,
              percentage: progress,
              employee: enrichedEmployee,
              departments,
              employeeGroups,
              supervisors,
              contractRules
            });
          }
          
          // Debug final payrate, contract rule, and salary data for this employee
          console.log(`🧪 Final data for employee ${employee.id}:`, {
            totalPayrates: payrates.length,
            totalContractRules: Array.isArray(contractRulesForEmployee) ? contractRulesForEmployee.length : 0,
            hasSalary: !!salaryForEmployee,
            payrates: payrates.map(pr => ({
              groupId: pr.employeeGroupId,
              rate: pr.rate,
              rateType: typeof pr.rate,
              salaryCode: pr.salaryCode,
              wageType: pr.wageType
            })),
            contractRules: Array.isArray(contractRulesForEmployee) ? contractRulesForEmployee.map(cr => ({
              id: cr.id,
              name: cr.name,
              description: cr.description
            })) : [],
            salary: salaryForEmployee ? {
              amount: salaryForEmployee.salary,
              hours: salaryForEmployee.hours,
              validFrom: salaryForEmployee.validFrom
            } : null
          });
          
        } catch (error) {
          console.error(`❌ Failed to fetch payrates for employee ${employee.id}:`, error);
          // Continue with empty payrates rather than failing completely
          enrichedEmployees.push({
            ...employee,
            employeeGroupPayrates: []
          });
        }
      }

      console.log('📊 Basic data loaded (with payrates, contract rules, salaries, and supervisors):', {
        employees: enrichedEmployees.length,
        departments: departments.length,
        employeeGroups: employeeGroups.length,
        employeeTypes: employeeTypes.length,
        contractRules: contractRules.length,
        supervisors: supervisors.length,
        totalPayrates: enrichedEmployees.reduce((total, emp) => total + (emp.employeeGroupPayrates?.length || 0), 0),
        totalEmployeeContractRules: enrichedEmployees.reduce((total, emp) => total + (Array.isArray(emp.contractRules) ? emp.contractRules.length : 0), 0),
        employeesWithSalary: enrichedEmployees.filter(emp => emp.salaryData).length,
        employeesWithSupervisor: enrichedEmployees.filter(emp => emp.supervisorEmployeeId).length
      });

      // Report final progress
      if (options.onProgress) {
        options.onProgress({
          currentEmployee: 'Finalizing...',
          completed: employeesToProcess.length,
          total: employeesToProcess.length,
          percentage: 100,
          departments,
          employeeGroups,
          supervisors,
          contractRules
        });
      }

      // Use enriched employees directly (all employees were processed)
      const finalEmployees = enrichedEmployees;

      // Map supervisor names to employees if supervisors were fetched
      if (supervisors.length > 0) {
        console.log(`🔍 DEBUG (Payrate Path): Starting supervisor mapping with ${supervisors.length} supervisors:`, supervisors);
        
        let mappedCount = 0;
        finalEmployees.forEach(employee => {
          // Try both supervisor ID approaches
          let supervisor = null;
          
          if (employee.supervisorId) {
            console.log(`🔍 DEBUG (Payrate Path): Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has supervisorId: ${employee.supervisorId}`);
            supervisor = supervisors.find(s => s.id === employee.supervisorId);
            if (supervisor) {
              console.log(`✅ DEBUG (Payrate Path): Found supervisor by ID match: ${supervisor.name} (id: ${supervisor.id})`);
            }
          }
          
          if (!supervisor && employee.supervisorEmployeeId) {
            console.log(`🔍 DEBUG (Payrate Path): Employee ${employee.id} (${employee.firstName} ${employee.lastName}) has supervisorEmployeeId: ${employee.supervisorEmployeeId}`);
            supervisor = supervisors.find(s => s.employeeId === employee.supervisorEmployeeId);
            if (supervisor) {
              console.log(`✅ DEBUG (Payrate Path): Found supervisor by employeeId match: ${supervisor.name} (employeeId: ${supervisor.employeeId})`);
            }
          }
          
          if (supervisor) {
            employee.supervisorName = supervisor.name;
            mappedCount++;
            console.log(`✅ DEBUG (Payrate Path): Mapped supervisor "${supervisor.name}" to employee ${employee.id}`);
          } else if (employee.supervisorId || employee.supervisorEmployeeId) {
            console.log(`⚠️ DEBUG (Payrate Path): No supervisor found for employee ${employee.id} (supervisorId: ${employee.supervisorId}, supervisorEmployeeId: ${employee.supervisorEmployeeId})`);
          }
        });
        console.log(`👥 (Payrate Path) Mapped supervisor names for ${mappedCount} employees with supervisors`);
      } else {
        console.log(`⚠️ DEBUG (Payrate Path): No supervisors to map (supervisors.length = ${supervisors.length})`);
      }
      
      console.log(`📊 Final result: ${finalEmployees.length} total employees, ${enrichedEmployees.length} with payrates`);
      
      return {
        employees: finalEmployees,
        departments,
        employeeGroups,
        employeeTypes,
        contractRules,
        supervisors
      };
    } catch (error) {
      console.error('❌ Failed to load basic employee data:', error);
      throw error;
    }
  }

  /**
   * Fetch all employee-related data in one coordinated operation (SLOW - only use when needed)
   */
  async fetchCompleteEmployeeData(): Promise<{
    employees: EditEmployee[];
    payrates: EditPayrateData[];
    salaries: EditSalaryData[];
    contracts: EditContractData[];
    departments: EditDepartment[];
    employeeGroups: EditEmployeeGroup[];
    employeeTypes: EditEmployeeType[];
  }> {
    console.log('🔄 Loading complete employee data...');
    console.log('⚠️ WARNING: This will make many API calls and may take several minutes');
    
    try {
      // First fetch reference data
      const [
        departments,
        employeeGroups,
        employeeTypes
      ] = await Promise.all([
        this.fetchDepartments(),
        this.fetchEmployeeGroups(),
        this.fetchEmployeeTypes()
      ]);

      // Fetch all employees with pagination
      const allEmployees = await this.fetchAllEmployees();
      
      console.log('🔄 Loading payrates and salary data for each employee...');
      console.log(`📊 This will require ~${allEmployees.length * 3} API calls across ${Math.ceil(allEmployees.length / 3)} batches`);
      
      // Fetch payrates, salaries, and contracts for each employee
      const employeeDataPromises = allEmployees.map(async (employee) => {
        // Extract employee group IDs from the employee data
        const employeeGroupIds = employee.employeeGroups?.map(group => group.id) || [];
        
        const [employeePayrates, salary, contract] = await Promise.allSettled([
          this.fetchEmployeePayrates(employee.id, employeeGroupIds),
          this.fetchEmployeeSalary(employee.id),
          this.fetchEmployeeContract(employee.id)
        ]);

        return {
          employee,
          employeePayrates: employeePayrates.status === 'fulfilled' ? employeePayrates.value : [],
          salary: salary.status === 'fulfilled' ? salary.value : null,
          contract: contract.status === 'fulfilled' ? contract.value : null,
        };
      });

      // Process in smaller batches with longer delays to avoid rate limits
      const batchSize = 3; // Much smaller batches
      const allEmployeeData: any[] = [];
      
      for (let i = 0; i < employeeDataPromises.length; i += batchSize) {
        const batch = employeeDataPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        allEmployeeData.push(...batchResults);
        
        console.log(`📄 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(employeeDataPromises.length / batchSize)} (${allEmployeeData.length}/${allEmployees.length} employees)`);
        
        // Much longer delay to avoid rate limits (2 seconds between batches)
        if (i + batchSize < employeeDataPromises.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Merge all data into employee records
      const enrichedEmployees = allEmployeeData.map(({ employee, employeePayrates, salary, contract }) => ({
        ...employee,
        // Add employee group payrates
        employeeGroupPayrates: employeePayrates,
        
        // Legacy payrate data (for backward compatibility)
        hourlyPayrate: employeePayrates.length > 0 ? employeePayrates[0].rate : undefined,
        
        // Merge salary data
        monthlySalary: salary?.monthlySalary,
        contractedHours: salary?.contractedHours || contract?.contractedHours,
        
        // Store additional data
        payrateData: salary ? {
          employeeId: employee.id,
          hourlyRate: employeePayrates.length > 0 ? employeePayrates[0].rate : 0,
          currency: salary.currency || 'USD',
          effectiveDate: salary.effectiveDate,
          validFrom: salary.validFrom,
          validTo: salary.validTo,
        } : undefined,
        salaryData: salary,
        contractData: contract,
      }));

      console.log('📊 Complete data loaded:', {
        employees: enrichedEmployees.length,
        payrates: allEmployeeData.reduce((total, data) => total + data.employeePayrates.length, 0),
        salaries: allEmployeeData.filter(data => data.salary).length,
        contracts: allEmployeeData.filter(data => data.contract).length,
        departments: departments.length,
        employeeGroups: employeeGroups.length,
        employeeTypes: employeeTypes.length
      });

      return {
        employees: enrichedEmployees,
        payrates: [], // Legacy - not used in new implementation
        salaries: [], // Legacy - not used in new implementation  
        contracts: [], // Legacy - not used in new implementation
        departments,
        employeeGroups,
        employeeTypes
      };
    } catch (error) {
      console.error('❌ Failed to load complete employee data:', error);
      throw error;
    }
  }

  /**
   * Fetch all employees with proper pagination
   */
  private async fetchAllEmployees(): Promise<EditEmployee[]> {
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
   * Transform contract data from API format to our internal format
   */
  private transformContractData(apiContract: any): EditContractData {
    return {
      employeeId: apiContract.employeeId,
      contractType: apiContract.contractType,
      contractedHours: apiContract.contractedHours,
      startDate: apiContract.startDate,
      endDate: apiContract.endDate,
      workingDays: apiContract.workingDays,
      effectiveDate: apiContract.effectiveDate,
      validFrom: apiContract.validFrom,
      validTo: apiContract.validTo,
    };
  }

  /**
   * Test API connection with detailed diagnostics
   */
  async testConnection(): Promise<boolean> {
    console.log('🔍 Testing API connection...');
    
    // First check if we have basic authentication setup
    console.log('📋 Authentication status check:', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      hasTokenExpiry: !!this.tokenExpiry,
      tokenExpiry: this.tokenExpiry?.toISOString(),
      isAuthenticated: this.isAuthenticated()
    });
    
    // Check sessionStorage
    const storedRefreshToken = sessionStorage.getItem(EDIT_TOKEN_CONFIG.REFRESH_TOKEN_KEY);
    const storedAccessToken = sessionStorage.getItem(EDIT_TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    const storedExpiry = sessionStorage.getItem(EDIT_TOKEN_CONFIG.TOKEN_EXPIRY_KEY);
    
    console.log('💾 SessionStorage check:', {
      hasStoredRefreshToken: !!storedRefreshToken,
      hasStoredAccessToken: !!storedAccessToken,
      hasStoredExpiry: !!storedExpiry,
      storedExpiry: storedExpiry
    });
    
    // If no refresh token, authentication is definitely needed
    if (!this.refreshToken && !storedRefreshToken) {
      console.log('❌ No refresh token found - authentication required');
      return false;
    }
    
    try {
      // Try a simple API call to test connection
      await this.fetchEmployees({ limit: 1 });
      console.log('✅ API connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Edit API connection test failed:', error);
      
      // Log additional error details for diagnosis
      if (error instanceof EditApiError) {
        console.log('🔍 API Error Details:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
      }
      
      return false;
    }
  }

  /**
   * Public diagnostic method for troubleshooting
   * Call this from browser console: window.EditApi.diagnoseAuth()
   */
  diagnoseAuth(): void {
    console.log('🔍 ==> AUTHENTICATION DIAGNOSIS <==');
    console.log('📊 Current State:', {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
      hasTokenExpiry: !!this.tokenExpiry,
      tokenExpiry: this.tokenExpiry?.toISOString(),
      isAuthenticated: this.isAuthenticated(),
      tokenExpiredOrExpiringSoon: this.shouldRefreshToken()
    });
    
    const storedRefreshToken = sessionStorage.getItem(EDIT_TOKEN_CONFIG.REFRESH_TOKEN_KEY);
    const storedAccessToken = sessionStorage.getItem(EDIT_TOKEN_CONFIG.ACCESS_TOKEN_KEY);
    const storedExpiry = sessionStorage.getItem(EDIT_TOKEN_CONFIG.TOKEN_EXPIRY_KEY);
    
    console.log('💾 SessionStorage State:', {
      hasStoredRefreshToken: !!storedRefreshToken,
      refreshTokenLength: storedRefreshToken?.length || 0,
      hasStoredAccessToken: !!storedAccessToken,
      accessTokenLength: storedAccessToken?.length || 0,
      hasStoredExpiry: !!storedExpiry,
      storedExpiry: storedExpiry,
      parsedExpiry: storedExpiry ? new Date(storedExpiry).toISOString() : null
    });
    
    if (!storedRefreshToken) {
      console.log('❌ PROBLEM: No refresh token in sessionStorage');
      console.log('💡 SOLUTION: You need to log in again');
      console.log('   1. Click "Disconnect & Use Different Token" or logout');
      console.log('   2. Enter your refresh token again');
      return;
    }
    
    if (!this.refreshToken && storedRefreshToken) {
      console.log('🔄 INFO: Refresh token exists in storage but not loaded in memory');
      console.log('💡 SOLUTION: The app should reload this automatically');
    }
    
    if (this.tokenExpiry && this.tokenExpiry < new Date()) {
      console.log('⏰ INFO: Access token has expired');
      console.log('💡 SOLUTION: App should refresh automatically using refresh token');
    }
    
    console.log('🔍 ==> END DIAGNOSIS <==');
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearStoredTokens();
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
  }

  /**
   * Load stored tokens from sessionStorage
   */
  private loadStoredTokens(): void {
    try {
      console.log('🔄 Loading stored tokens from sessionStorage...');
      
      this.refreshToken = sessionStorage.getItem(EDIT_TOKEN_CONFIG.REFRESH_TOKEN_KEY);
      this.accessToken = sessionStorage.getItem(EDIT_TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      
      const expiryStr = sessionStorage.getItem(EDIT_TOKEN_CONFIG.TOKEN_EXPIRY_KEY);
      if (expiryStr) {
        this.tokenExpiry = new Date(expiryStr);
      }
      
      console.log('📋 Token loading results:', {
        hasRefreshToken: !!this.refreshToken,
        refreshTokenLength: this.refreshToken?.length || 0,
        hasAccessToken: !!this.accessToken,
        accessTokenLength: this.accessToken?.length || 0,
        hasTokenExpiry: !!this.tokenExpiry,
        tokenExpiry: this.tokenExpiry?.toISOString(),
        isExpired: this.tokenExpiry ? this.tokenExpiry < new Date() : 'unknown',
        isAuthenticated: this.isAuthenticated()
      });
      
      if (this.refreshToken && this.tokenExpiry && this.tokenExpiry < new Date()) {
        console.log('⚠️ Access token has expired, but refresh token is available - token will be refreshed on next API call');
      }
      
    } catch (error) {
      console.warn('❌ Failed to load stored tokens:', error);
    }
  }

  /**
   * Store tokens in sessionStorage
   */
  private storeTokens(tokens: EditAuthTokens): void {
    try {
      sessionStorage.setItem(EDIT_TOKEN_CONFIG.ACCESS_TOKEN_KEY, tokens.access_token);
      if (this.tokenExpiry) {
        sessionStorage.setItem(EDIT_TOKEN_CONFIG.TOKEN_EXPIRY_KEY, this.tokenExpiry.toISOString());
      }
    } catch (error) {
      console.warn('Failed to store tokens:', error);
    }
  }

  /**
   * Store refresh token in sessionStorage
   */
  private storeRefreshToken(refreshToken: string): void {
    try {
      sessionStorage.setItem(EDIT_TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.warn('Failed to store refresh token:', error);
    }
  }

  /**
   * Clear stored tokens
   */
  private clearStoredTokens(): void {
    try {
      sessionStorage.removeItem(EDIT_TOKEN_CONFIG.REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(EDIT_TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(EDIT_TOKEN_CONFIG.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.warn('Failed to clear stored tokens:', error);
    }
  }

  /**
   * Make authenticated request and return both data and headers
   */
  private async makeAuthenticatedRequestWithHeaders<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; headers: Headers }> {
    const accessToken = await this.getValidAccessToken();
    
    // Track request count for rate limiting
    this.requestCount++;
    
    let response: Response;
    
    if (this.useProxy) {
      // Use Netlify function proxy to access rate limit headers
      response = await fetch('/.netlify/functions/planday-proxy', {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Planday-Endpoint': endpoint,
          ...options.headers,
        },
        body: options.body
      });
    } else {
      // Direct API call (CORS-limited)  
      response = await fetch(`${EDIT_API_CONFIG.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...EDIT_API_CONFIG.requiredHeaders,
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      });
    }

    // Update rate limit tracking from response headers
    this.updateRateLimitTracking(response.headers);

    const data = await this.handleApiResponse<T>(response);
    
    return {
      data,
      headers: response.headers
    };
  }

  /**
   * Get current rate limit information for UI display
   */
  getRateLimitInfo(): {
    remaining: number;
    limit: number;
    resetTime: number;
    isActive: boolean;
  } | null {
    // Check if we have fresh rate limit data (unlikely due to CORS)
    const rateLimitAge = Date.now() - this.lastRateLimitUpdate;
    const hasValidRateLimit = this.rateLimitRemaining !== null && 
                              this.rateLimitReset !== null && 
                              this.rateLimitActiveLimit !== null &&
                              rateLimitAge < 5000;

    if (hasValidRateLimit) {
      return {
        remaining: this.rateLimitRemaining!,
        limit: this.rateLimitActiveLimit!,
        resetTime: this.rateLimitReset!,
        isActive: true
      };
    }

    // Return simulated data based on our error tracking for UI feedback
    if (this.isInBackoffMode) {
      return {
        remaining: Math.max(1, 10 - this.consecutive429Errors * 2),
        limit: 20,
        resetTime: Math.ceil((Date.now() - this.lastErrorTime) / 1000),
        isActive: true
      };
    }

    return null;
  }
}

/**
 * Edit API Error Class
 */
export class EditApiError extends Error {
  public code: string;
  public details?: any;

  constructor(error: EditApiErrorData) {
    super(error.message);
    this.name = 'EditApiError';
    this.code = error.code;
    this.details = error.details;
  }

  getUserFriendlyMessage(): string {
    switch (this.code) {
      case '401':
        return 'Authentication failed. Please check your token and try again.';
      case '403':
        return 'You do not have permission to access this resource.';
      case '404':
        return 'The requested resource was not found.';
      case '429':
        return 'Too many requests. Please wait a moment and try again.';
      case '500':
        return 'Server error. Please try again later.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }
}

/**
 * Global Edit API instance
 */
export const EditApi = new EditApiClient(); 