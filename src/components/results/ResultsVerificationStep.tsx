import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePlandayApi } from '../../hooks/usePlandayApi';
import type { 
  EmployeeUploadResult, 
  PlandayEmployeeResponse, 
  PlandayEmployeeCreateRequest 
} from '../../types/planday';

interface ResultsVerificationStepProps {
  uploadResults: EmployeeUploadResult[];
  originalEmployees: PlandayEmployeeCreateRequest[];
  onComplete: () => void;
  onBack: () => void;
  onReset?: () => void; // New prop for resetting the entire process
  className?: string;
}

interface VerificationResult {
  employee: PlandayEmployeeCreateRequest;
  uploadResult: EmployeeUploadResult;
  apiEmployee?: PlandayEmployeeResponse;
  verified: boolean;
  issues: string[];
}

interface VerificationSummary {
  totalUploaded: number;
  totalVerified: number;
  totalMissing: number;
  totalWithIssues: number;
  accuracy: number;
}

/**
 * Results Verification Step Component
 * 
 * This step provides comprehensive verification of uploaded employees:
 * - Fetches actual employees from Planday API
 * - Compares uploaded data with API data
 * - Shows paginated results with 100% accuracy verification
 * - Provides detailed summary and individual employee verification
 */
const ResultsVerificationStep: React.FC<ResultsVerificationStepProps> = ({
  uploadResults,
  originalEmployees,
  onComplete,
  onBack,
  onReset,
  className = ''
}) => {
  const plandayApi = usePlandayApi();
  
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [verificationComplete, setVerificationComplete] = useState(false);
  
  // Pagination settings
  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.ceil(verificationResults.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResults = verificationResults.slice(startIndex, endIndex);

  /**
   * Compare uploaded employee data with API data
   */
  const compareEmployeeData = (
    original: PlandayEmployeeCreateRequest,
    apiEmployee: PlandayEmployeeResponse
  ): { matches: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Check basic fields
    if (original.firstName !== apiEmployee.firstName) {
      issues.push(`First name mismatch: "${original.firstName}" vs "${apiEmployee.firstName}"`);
    }
    
    if (original.lastName !== apiEmployee.lastName) {
      issues.push(`Last name mismatch: "${original.lastName}" vs "${apiEmployee.lastName}"`);
    }
    
    if (original.userName !== apiEmployee.userName) {
      issues.push(`Username mismatch: "${original.userName}" vs "${apiEmployee.userName}"`);
    }
    
    // Check optional fields
    if (original.cellPhone && original.cellPhone !== apiEmployee.cellPhone) {
      issues.push(`Cell phone mismatch: "${original.cellPhone}" vs "${apiEmployee.cellPhone}"`);
    }
    
    if (original.email && original.email !== apiEmployee.email) {
      issues.push(`Email mismatch: "${original.email}" vs "${apiEmployee.email}"`);
    }
    
    // Check departments - compare IDs
    const originalDeptIds = original.departments?.sort() || [];
    // Handle both array of numbers and array of objects with id property
    const apiDeptIds = apiEmployee.departments?.map(d => 
      typeof d === 'number' ? d : d.id
    ).sort() || [];
    
    console.log(`🔍 Department comparison for ${original.firstName} ${original.lastName}:`, {
      original: originalDeptIds,
      api: apiDeptIds,
      apiDepartmentsRaw: apiEmployee.departments
    });
    
    if (JSON.stringify(originalDeptIds) !== JSON.stringify(apiDeptIds)) {
      issues.push(`Department mismatch: [${originalDeptIds.join(', ')}] vs [${apiDeptIds.join(', ')}]`);
    }
    
    return {
      matches: issues.length === 0,
      issues
    };
  };

  /**
   * Start verification process
   */
  const startVerification = async () => {
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Get successful upload results with Planday IDs
      const successfulUploads = uploadResults.filter(result => result.success && result.plandayId);
      const employeeIds = successfulUploads.map(result => result.plandayId!);
      
      console.log(`🔍 Starting verification for ${employeeIds.length} employees...`);
      
      // Force re-authentication with stored token (don't trust state)
      console.log('🔐 Force re-authenticating for verification...');
      
      const storedRefreshToken = sessionStorage.getItem('planday_refresh_token');
      
      console.log('🔍 Debug token info:', {
        hasStoredToken: !!storedRefreshToken,
        tokenLength: storedRefreshToken?.length || 0,
        tokenPreview: storedRefreshToken ? storedRefreshToken.substring(0, 20) + '...' : 'none'
      });
      
      if (!storedRefreshToken) {
        console.log('❌ No stored refresh token found');
        throw new Error('No authentication token found. Please go back and re-authenticate.');
      }
      
      console.log('🔄 Re-authenticating with stored token...');
      
      const authSuccess = await plandayApi.authenticate(storedRefreshToken);
      
      if (!authSuccess) {
        console.log('❌ Re-authentication failed');
        throw new Error('Authentication failed. The stored token may be expired. Please go back and re-authenticate.');
      }
      
      console.log('✅ Re-authentication successful!');
      
      // Small delay to ensure hook state is fully updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Phase 2: Fetch employees from Planday API
      console.log(`📡 Fetching ${employeeIds.length} employees from Planday API for verification...`);
      console.log('🔍 Final auth check before fetch:', {
        hookAuthenticated: plandayApi.isAuthenticated
      });
      
      const apiEmployees = await plandayApi.fetchEmployeesByIds(employeeIds);
      console.log(`✅ Successfully fetched ${apiEmployees.length} employees from API`);
      
      // Debug: Log the employee IDs and API response
      console.log('🔍 Employee IDs to verify:', employeeIds);
      console.log('🔍 API employees fetched:', apiEmployees.map(emp => ({
        id: emp.id,
        idType: typeof emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        userName: emp.userName,
        fullEmployee: emp
      })));
      console.log('🔍 Raw API employees:', apiEmployees);
      
      // Create verification results
      const results: VerificationResult[] = [];
      
      for (const uploadResult of uploadResults) {
        const originalEmployee = originalEmployees.find(emp => 
          emp.firstName === uploadResult.employee.firstName && 
          emp.lastName === uploadResult.employee.lastName
        );
        
        if (!originalEmployee) {
          console.warn(`⚠️ Could not find original employee for ${uploadResult.employee.firstName} ${uploadResult.employee.lastName}`);
          continue;
        }
        
        if (uploadResult.success && uploadResult.plandayId) {
          // Find corresponding API employee
          const apiEmployee = apiEmployees.find(emp => emp.id === uploadResult.plandayId);
          
          console.log(`🔍 Matching employee ${originalEmployee.firstName} ${originalEmployee.lastName}:`, {
            uploadResultId: uploadResult.plandayId,
            uploadResultIdType: typeof uploadResult.plandayId,
            apiEmployeeIds: apiEmployees.map(emp => ({ id: emp.id, type: typeof emp.id })),
            found: !!apiEmployee
          });
          
          if (apiEmployee) {
            // Compare data
            const comparison = compareEmployeeData(originalEmployee, apiEmployee);
            
            results.push({
              employee: originalEmployee,
              uploadResult,
              apiEmployee,
              verified: comparison.matches,
              issues: comparison.issues
            });
          } else {
            // Employee not found in API - this is a problem
            results.push({
              employee: originalEmployee,
              uploadResult,
              verified: false,
              issues: [`Employee not found in Planday API despite successful upload (ID: ${uploadResult.plandayId})`]
            });
          }
        } else {
          // Failed upload
          results.push({
            employee: originalEmployee,
            uploadResult,
            verified: false,
            issues: [`Upload failed: ${uploadResult.error || 'Unknown error'}`]
          });
        }
      }
      
      setVerificationResults(results);
      
      // Calculate summary
      const totalUploaded = uploadResults.filter(r => r.success).length;
      const totalVerified = results.filter(r => r.verified).length;
      const totalMissing = results.filter(r => r.uploadResult.success && !r.apiEmployee).length;
      const totalWithIssues = results.filter(r => !r.verified).length;
      const accuracy = results.length > 0 ? (totalVerified / results.length) * 100 : 0;
      
      setSummary({
        totalUploaded,
        totalVerified,
        totalMissing,
        totalWithIssues,
        accuracy
      });
      
      setVerificationComplete(true);
      
      console.log(`📊 Verification complete:`, {
        totalUploaded,
        totalVerified,
        totalMissing,
        totalWithIssues,
        accuracy: `${accuracy.toFixed(1)}%`
      });
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      setVerificationError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-start verification when component mounts
  useEffect(() => {
    if (uploadResults.length > 0 && !verificationComplete) {
      // Add a delay to allow the hook's authentication restoration to complete
      const timeoutId = setTimeout(() => {
        console.log('🔍 Starting verification with auth state:', {
          isAuthenticated: plandayApi.isAuthenticated,
          uploadResultsCount: uploadResults.length,
          verificationComplete
        });
        startVerification();
      }, 300); // Give more time for auth restoration
      
      return () => clearTimeout(timeoutId);
    }
  }, [uploadResults.length, verificationComplete, plandayApi.isAuthenticated]);

  const renderSummaryCard = () => {
    if (!summary) return null;
    
    const accuracyColor = summary.accuracy === 100 ? 'text-green-600' : 
                         summary.accuracy >= 95 ? 'text-yellow-600' : 'text-red-600';
    
    return (
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 Verification Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalUploaded}</div>
              <div className="text-sm text-gray-600">Uploaded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.totalVerified}</div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.totalWithIssues}</div>
              <div className="text-sm text-gray-600">With Issues</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${accuracyColor}`}>
                {summary.accuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
          </div>
          
          {summary.accuracy === 100 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="font-medium text-green-800">Perfect Match!</span>
              </div>
              <p className="text-green-700 mt-1">
                All employees were uploaded and verified successfully. 100% accuracy achieved!
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="font-medium text-yellow-800">Issues Found</span>
              </div>
              <p className="text-yellow-700 mt-1">
                {summary.totalWithIssues} employees have verification issues. 
                Please review the details below.
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderEmployeeRow = (result: VerificationResult, index: number) => {
    const globalIndex = startIndex + index + 1;
    const statusColor = result.verified ? 'text-green-600' : 'text-red-600';
    const statusIcon = result.verified ? '✅' : '❌';
    
    return (
      <div key={globalIndex} className="flex items-center py-3 px-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
        {/* Row Number */}
        <span className="text-sm font-medium text-gray-500 w-8 flex-shrink-0">#{globalIndex}</span>
        
        {/* Name */}
        <div className="w-48 flex-shrink-0">
          <div className="font-medium text-gray-900 truncate">
            {result.employee.firstName} {result.employee.lastName}
          </div>
        </div>
        
        {/* Email */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-600 truncate">
            {result.employee.userName}
          </div>
        </div>
        
        {/* Planday ID */}
        <div className="w-24 flex-shrink-0 text-center">
          {result.uploadResult.plandayId ? (
            <span className="text-sm text-gray-900">{result.uploadResult.plandayId}</span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
        
        {/* Status */}
        <div className="w-28 flex-shrink-0 text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
            result.verified 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {statusIcon} {result.verified ? 'Verified' : 'Issues'}
          </span>
        </div>
        
        {/* Issues (if any) */}
        <div className="w-12 flex-shrink-0 text-center">
          {result.issues.length > 0 && (
            <button 
              className="text-red-500 hover:text-red-700"
              title={result.issues.join(', ')}
            >
              ⚠️
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, verificationResults.length)} of {verificationResults.length} employees
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="flex items-center px-3 py-1 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📋 Results Verification
        </h2>
        <p className="text-gray-600">
          Verifying uploaded employees against Planday API to ensure 100% accuracy
        </p>
      </div>

      {/* Summary Card */}
      {renderSummaryCard()}

      {/* Verification Status */}
      {isVerifying && (
        <Card>
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              Re-authenticating and verifying employees with Planday API...
            </p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {verificationError && (
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-2 text-red-600 mb-2">
              <span>❌</span>
              <span className="font-medium">Verification Failed</span>
            </div>
            <p className="text-red-700 mb-4">{verificationError}</p>
            <Button onClick={startVerification} disabled={isVerifying}>
              Retry Verification
            </Button>
          </div>
        </Card>
      )}

      {/* Results List */}
      {verificationResults.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Employee Verification Details
            </h3>
            
            {/* Header Row */}
            <div className="flex items-center py-2 px-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              <span className="w-8 flex-shrink-0">#</span>
              <span className="w-48 flex-shrink-0">Name</span>
              <span className="flex-1 min-w-0">Email</span>
              <span className="w-24 flex-shrink-0 text-center">Planday ID</span>
              <span className="w-28 flex-shrink-0 text-center">Status</span>
              <span className="w-12 flex-shrink-0 text-center">Issues</span>
            </div>
            
            <div className="space-y-0">
              {currentResults.map((result, index) => renderEmployeeRow(result, index))}
            </div>
            
            {renderPagination()}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={onBack}>
          Back to Upload
        </Button>
        
        <div className="flex space-x-3">
          {verificationComplete && (
            <Button onClick={startVerification} variant="outline">
              Re-verify
            </Button>
          )}
          
          <Button 
            onClick={() => {
              // Clear all stored tokens and reset the process
              sessionStorage.removeItem('planday_refresh_token');
              sessionStorage.removeItem('planday_access_token');
              sessionStorage.removeItem('planday_token_expiry');
              localStorage.removeItem('planday_refresh_token');
              localStorage.removeItem('planday_access_token');
              localStorage.removeItem('planday_token_expiry');
              
              // Call logout to clear hook state
              plandayApi.logout();
              
              console.log('🔄 Process completed - all tokens cleared, going back to start');
              
              // Reset the entire process or call the reset callback
              if (onReset) {
                onReset();
              } else {
                onComplete();
              }
            }}
            disabled={!verificationComplete}
          >
            Complete Process
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsVerificationStep; 