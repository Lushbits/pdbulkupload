/**
 * Smart Rate Limiting Service for Planday API
 * Implements intelligent throttling, request queuing, and adaptive loading speeds
 */

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: number;
  isActive: boolean;
  currentSpeed: 'fast' | 'medium' | 'slow';
}

export interface RequestQueueOptions {
  maxConcurrency?: number;
  perSecondLimit?: number;
  perMinuteLimit?: number;
  initialSpeed?: 'fast' | 'medium' | 'slow';
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }

  getAvailable(): number {
    return this.permits;
  }
}

/**
 * Smart Request Queue with Intelligent Throttling
 */
export class PlandayRequestQueue {
  private queue: Array<{
    request: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: number;
    employeeId?: number;
    retryCount?: number;
    maxRetries?: number;
  }> = [];
  
  private processing = false;
  private requestsThisSecond = 0;
  private requestsThisMinute = 0;
  private lastSecondReset = Date.now();
  private lastMinuteReset = Date.now();
  
  // 🚨 TESTING MODE: Aggressive limits to intentionally hit rate limits
  private readonly LIMITS = {
    perSecond: 30,  // TESTING: Way above Planday's 20/sec hard limit (will hit 429s)
    perMinute: 1500 // TESTING: Higher minute limit
  };

  // Adaptive speed control
  private loadingSpeed: 'fast' | 'medium' | 'slow' = 'fast';
  private consecutiveSuccesses = 0;
  private recentErrors = 0;
  private lastErrorTime = 0;

  // Concurrency control
  private semaphore: Semaphore;
  private activeRequests = 0;

  constructor(options: RequestQueueOptions = {}) {
    const maxConcurrency = options.maxConcurrency || 50; // 🚨 TESTING: Max 50 concurrent (was 5)
    this.semaphore = new Semaphore(maxConcurrency);
    
    if (options.perSecondLimit) this.LIMITS.perSecond = options.perSecondLimit;
    if (options.perMinuteLimit) this.LIMITS.perMinute = options.perMinuteLimit;
    if (options.initialSpeed) this.loadingSpeed = options.initialSpeed;
  }

  /**
   * Add request to queue with priority support and retry logic
   */
  async addRequest<T>(
    requestFn: () => Promise<T>, 
    priority: number = 0,
    employeeId?: number,
    maxRetries: number = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueItem = {
        request: requestFn,
        resolve,
        reject,
        priority,
        employeeId,
        retryCount: 0,
        maxRetries
      };

      // Insert based on priority (higher priority = lower number)
      const insertIndex = this.queue.findIndex(item => item.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue with intelligent throttling
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      await this.checkRateLimits();
      
      const request = this.queue.shift();
      if (!request) break;

      // Acquire semaphore for concurrency control
      await this.semaphore.acquire();
      
      try {
        this.incrementCounters();
        this.activeRequests++;
        
        // Apply adaptive delay based on current speed
        const delay = this.getAdaptiveDelay();
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await request.request();
        this.handleRequestSuccess(request.employeeId);
        request.resolve(result);
        
      } catch (error) {
        const shouldRetry = await this.handleRequestError(error, request);
        if (!shouldRetry) {
          request.reject(error);
        }
        // If shouldRetry is true, the request has been re-queued automatically
      } finally {
        this.activeRequests--;
        this.semaphore.release();
      }
    }
    
    this.processing = false;
  }

  /**
   * Check rate limits and wait if necessary
   */
  private async checkRateLimits(): Promise<void> {
    const now = Date.now();
    
    // Reset counters if time windows have passed
    if (now - this.lastSecondReset >= 1000) {
      this.requestsThisSecond = 0;
      this.lastSecondReset = now;
    }
    
    if (now - this.lastMinuteReset >= 60000) {
      this.requestsThisMinute = 0;
      this.lastMinuteReset = now;
    }
    
    // Wait if we're at limits
    if (this.requestsThisSecond >= this.LIMITS.perSecond) {
      const waitTime = 1000 - (now - this.lastSecondReset) + 50; // Add 50ms buffer
      if (waitTime > 0) {
        console.log(`⏳ Per-second rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (this.requestsThisMinute >= this.LIMITS.perMinute) {
      const waitTime = 60000 - (now - this.lastMinuteReset) + 1000; // Add 1s buffer
      if (waitTime > 0) {
        console.log(`⏳ Per-minute rate limit reached, waiting ${Math.round(waitTime/1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Get adaptive delay based on current loading speed
   */
  private getAdaptiveDelay(): number {
    const delays = {
      fast: 0,      // 🚨 NO DELAYS = UNLIMITED SPEED (will slam API limits!)
      medium: 120,  // RECOVERY: 120ms = ~8.3 req/sec (safe, under limit)
      slow: 300     // RECOVERY: 300ms = ~3.3 req/sec (very safe)
    };
    
    // For testing, remove all delays in fast mode
    if (this.loadingSpeed === 'fast') {
      return 0; // No delay at all!
    }
    
    // Add randomization to spread out requests from multiple users
    const baseDelay = delays[this.loadingSpeed];
    const randomOffset = Math.random() * 5 - 2.5; // ±2.5ms (smaller random offset)
    
    return Math.max(baseDelay + randomOffset, 5);
  }

  /**
   * Handle successful request
   */
  private handleRequestSuccess(_employeeId?: number): void {
    this.consecutiveSuccesses++;
    this.recentErrors = Math.max(0, this.recentErrors - 1); // Gradually reduce error count
    
    // Speed up if we've had many successes
    if (this.consecutiveSuccesses > 15 && this.loadingSpeed !== 'fast') {
      this.increaseSpeed();
      console.log(`🚀 Rate limiting: Increased speed to ${this.loadingSpeed} (${this.consecutiveSuccesses} consecutive successes)`);
    }
  }

  /**
   * Handle request error with adaptive response and retry logic
   * Returns true if request was retried, false if it should be rejected
   */
  private async handleRequestError(error: any, requestItem: any): Promise<boolean> {
    this.consecutiveSuccesses = 0;
    this.lastErrorTime = Date.now();
    
    const isRetryableError = this.isRetryableError(error);
    const canRetry = isRetryableError && 
                    requestItem.retryCount < requestItem.maxRetries;
    
    if (error && (error.code === '429' || error.status === 429)) {
      this.recentErrors++;
      console.warn(`⚠️ Rate limit hit${requestItem.employeeId ? ` for employee ${requestItem.employeeId}` : ''} (${this.recentErrors} recent errors)`);
      
      if (canRetry) {
        await this.retryRequest(requestItem, error);
        return true; // Request was retried
      } else {
        console.error(`❌ Rate limit retry exhausted for employee ${requestItem.employeeId} after ${requestItem.retryCount} attempts`);
        // Still apply rate limiting even if we can't retry
        await this.handleRateLimit();
        return false; // Reject the request
      }
    } else if (isRetryableError && canRetry) {
      // Other retryable errors (network issues, temporary server errors)
      this.recentErrors++;
      console.warn(`⚠️ Retryable error for employee ${requestItem.employeeId}:`, error.message);
      await this.retryRequest(requestItem, error);
      return true; // Request was retried
    } else {
      // Non-retryable errors or retry limit exceeded
      this.recentErrors++;
      if (this.recentErrors > 3) {
        this.decreaseSpeed();
      }
      return false; // Reject the request
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const retryableCodes = ['429', '500', '502', '503', '504'];
    const retryableStatuses = [429, 500, 502, 503, 504];
    
    return retryableCodes.includes(error.code) || 
           retryableStatuses.includes(error.status) ||
           error.name === 'NetworkError' ||
           error.message?.includes('network') ||
           error.message?.includes('timeout');
  }

  /**
   * Retry a failed request with exponential backoff
   */
  private async retryRequest(requestItem: any, error: any): Promise<void> {
    requestItem.retryCount++;
    
    // Calculate exponential backoff delay
    const baseDelay = 1000; // 1 second base
    const maxDelay = 10000; // 10 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, requestItem.retryCount - 1), maxDelay);
    
    console.log(`🔄 Retrying request for employee ${requestItem.employeeId} (attempt ${requestItem.retryCount}/${requestItem.maxRetries}) after ${delay}ms delay`);
    
    // Apply rate limiting changes first
    if (error && (error.code === '429' || error.status === 429)) {
      await this.handleRateLimit();
    }
    
    // Wait for backoff delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Re-queue the request with higher priority (lower number)
    // Retry requests get priority to avoid getting stuck behind new requests
    const retryPriority = Math.max(0, requestItem.priority - 1000);
    
    const insertIndex = this.queue.findIndex(item => item.priority > retryPriority);
    if (insertIndex === -1) {
      this.queue.push({...requestItem, priority: retryPriority});
    } else {
      this.queue.splice(insertIndex, 0, {...requestItem, priority: retryPriority});
    }
    
    console.log(`🔄 Request for employee ${requestItem.employeeId} re-queued with priority ${retryPriority}`);
  }

  /**
   * Handle rate limit with exponential backoff
   */
  private async handleRateLimit(): Promise<void> {
    // Immediately slow down
    this.decreaseSpeed();
    
    // Calculate backoff time based on number of recent errors
    const backoffTime = Math.min(1000 * Math.pow(2, this.recentErrors - 1), 10000); // Max 10s
    
    console.log(`🔄 Rate limit backoff: Waiting ${backoffTime}ms, speed now: ${this.loadingSpeed}`);
    
    // Add the backoff to the queue processing (this affects all future requests)
    await new Promise(resolve => setTimeout(resolve, backoffTime));
  }

  /**
   * Increase loading speed
   */
  private increaseSpeed(): void {
    if (this.loadingSpeed === 'slow') {
      this.loadingSpeed = 'medium';
    } else if (this.loadingSpeed === 'medium') {
      this.loadingSpeed = 'fast';
    }
    this.consecutiveSuccesses = 0; // Reset success counter
  }

  /**
   * Decrease loading speed
   */
  private decreaseSpeed(): void {
    if (this.loadingSpeed === 'fast') {
      this.loadingSpeed = 'medium';
    } else if (this.loadingSpeed === 'medium') {
      this.loadingSpeed = 'slow';
    }
  }

  /**
   * Get current rate limit information for UI display
   */
  getRateLimitInfo(): RateLimitInfo {
    const now = Date.now();
    const secondsUntilSecondReset = Math.max(0, 1000 - (now - this.lastSecondReset)) / 1000;
    const secondsUntilMinuteReset = Math.max(0, 60000 - (now - this.lastMinuteReset)) / 1000;
    
    // Determine which limit is more restrictive
    const secondRemaining = this.LIMITS.perSecond - this.requestsThisSecond;
    const minuteRemaining = this.LIMITS.perMinute - this.requestsThisMinute;
    const isSecondLimitActive = secondRemaining <= minuteRemaining;
    
    return {
      remaining: Math.min(secondRemaining, minuteRemaining),
      limit: this.LIMITS.perSecond,
      // Show the reset time for whichever limit is more restrictive
      resetTime: isSecondLimitActive ? secondsUntilSecondReset : secondsUntilMinuteReset,
      isActive: this.requestsThisSecond > 0 || this.requestsThisMinute > 0,
      currentSpeed: this.loadingSpeed
    };
  }

  /**
   * Get detailed statistics for monitoring
   */
  getStatistics() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      concurrencyLimit: this.semaphore.getAvailable(),
      requestsThisSecond: this.requestsThisSecond,
      requestsThisMinute: this.requestsThisMinute,
      consecutiveSuccesses: this.consecutiveSuccesses,
      recentErrors: this.recentErrors,
      currentSpeed: this.loadingSpeed,
      timeSinceLastError: this.lastErrorTime ? Date.now() - this.lastErrorTime : null
    };
  }

  /**
   * Clear the queue (useful for cancelling operations)
   */
  clearQueue(): void {
    // Reject all pending requests
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log('🧹 Request queue cleared');
  }

  /**
   * Increment request counters
   */
  private incrementCounters(): void {
    this.requestsThisSecond++;
    this.requestsThisMinute++;
  }
}

/**
 * Progressive Employee Loader with Batch Control
 */
export class ProgressiveEmployeeLoader {
  private requestQueue: PlandayRequestQueue;
  private batchSize: number = 1; // 🚨 TESTING: 1 employee per batch for smooth UI updates

  constructor(options: RequestQueueOptions = {}) {
    this.requestQueue = new PlandayRequestQueue({
      maxConcurrency: 50, // 🚨 TESTING: Max 50 employees loading simultaneously (was 10)
      ...options
    });
  }

  /**
   * Load employees in progressive batches
   */
  async loadEmployeesInBatches<T>(
    employeeIds: number[], 
    loadFunction: (id: number) => Promise<T>,
    onProgress?: (loaded: number, total: number, employee?: T) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const totalEmployees = employeeIds.length;
    
    console.log(`🔄 Loading ${totalEmployees} employees in batches of ${this.batchSize}`);
    
    for (let i = 0; i < employeeIds.length; i += this.batchSize) {
      const batch = employeeIds.slice(i, i + this.batchSize);
      
      // Load batch with concurrency control
      const batchResults = await Promise.all(
        batch.map(async (employeeId, index) => {
          const priority = i + index; // Earlier employees get higher priority (lower number)
          
          return this.requestQueue.addRequest(
            () => loadFunction(employeeId),
            priority,
            employeeId,
            5 // Higher retry count for employee data - very important not to lose data
          );
        })
      );
      
      results.push(...batchResults);
      
      // Report progress for each employee in the batch
      batchResults.forEach((result) => {
        if (onProgress) {
          onProgress(results.length, totalEmployees, result);
        }
      });
      
      console.log(`📄 Batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(employeeIds.length / this.batchSize)} complete (${results.length}/${totalEmployees} employees loaded)`);
    }
    
    return results;
  }

  /**
   * Get current loading statistics
   */
  getStatistics() {
    return this.requestQueue.getStatistics();
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): RateLimitInfo {
    return this.requestQueue.getRateLimitInfo();
  }

  /**
   * Clear any pending requests
   */
  clearQueue(): void {
    this.requestQueue.clearQueue();
  }
} 