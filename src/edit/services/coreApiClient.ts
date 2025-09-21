/**
 * Core API Client for Planday Edit Feature
 * Handles authentication, token management, and basic request infrastructure
 */

import { PlandayRequestQueue, type RateLimitInfo } from './rateLimitService';
import type {
  EditAuthTokens,
  EditTokenRefreshRequest,
  EditApiErrorData,
} from '../types';

import {
  EDIT_API_CONFIG,
  EDIT_TOKEN_CONFIG,
} from '../constants';

/**
 * API Error class for structured error handling
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
      case 'HTML_RESPONSE':
        return 'Received unexpected HTML response. This may indicate a proxy or deployment issue.';
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }
}

/**
 * Core API Client for authentication and basic request handling
 */
export class CoreApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshPromise: Promise<void> | null = null;

  // Request queue for intelligent rate limiting
  private requestQueue: PlandayRequestQueue;

  // Proxy configuration
  private useProxy: boolean = false; // Disabled by default due to Netlify function issues

  constructor() {
    // Initialize rate limiting queue respecting Planday's 20/sec hard cap
    this.requestQueue = new PlandayRequestQueue({
      maxConcurrency: 10,   // Keep higher concurrency
      perSecondLimit: 18,   // Just under 20/sec hard limit
      perMinuteLimit: 1000, // Conservative minute limit
      initialSpeed: 'fast'
    });

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
   * Make authenticated API request using smart rate limiting
   */
  async makeAuthenticatedRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    priority: number = 0,
    employeeId?: number
  ): Promise<T> {
    // Add request to the smart queue with retry logic
    return this.requestQueue.addRequest(async () => {
      return this.executeRequest<T>(endpoint, options);
    }, priority, employeeId, 4); // 4 retries for API calls to prevent data loss
  }

  /**
   * Execute the actual API request
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      console.log(`🔗 Making API request to: ${endpoint}`);
      const accessToken = await this.getValidAccessToken();
      console.log(`🔑 Access token obtained: ${accessToken ? 'present' : 'missing'} (length: ${accessToken?.length || 0})`);
      
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

    throw new EditApiError(error);
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
      await this.makeAuthenticatedRequest('/hr/v1.0/employees?limit=1&offset=0', {}, 1000); // High priority test
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
    
    console.log('🔄 Rate Limiting Status:', this.requestQueue.getStatistics());
    
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
   * Get current rate limit information for UI display
   */
  getRateLimitInfo(): RateLimitInfo {
    return this.requestQueue.getRateLimitInfo();
  }

  /**
   * Get detailed statistics for monitoring
   */
  getStatistics() {
    return this.requestQueue.getStatistics();
  }

  /**
   * Clear the request queue (useful for cancelling operations)
   */
  clearQueue(): void {
    this.requestQueue.clearQueue();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearStoredTokens();
    this.clearQueue();
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
} 