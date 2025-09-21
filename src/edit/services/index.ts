/**
 * Edit Services Exports
 * Includes smart rate limiting and modular API services
 */

// Main unified API client (replaces editApiService.ts)
export * from './unifiedApiClient';

// Individual services for advanced use cases
export * from './coreApiClient';
export * from './employeeService';
export * from './referenceDataService';
export * from './rateLimitService';

// Other services
export * from './excelExportService';

// Legacy compatibility - these are exported by unifiedApiClient
// export { EditApi } from './unifiedApiClient';
// export { EditApiError } from './coreApiClient';

// Placeholder for additional services
// export * from './editValidationService';
// export * from './editGridService'; 