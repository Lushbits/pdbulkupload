import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Employee, BulkUploadProgress, EmployeeUploadResult, PlandayEmployeeCreateRequest, PayrateAssignment, PayrateSetResult } from '../../types/planday';
import { usePlandayApi } from '../../hooks/usePlandayApi';
import { MappingUtils } from '../../services/mappingService';
import { ValidationService } from '../../services/mappingService';



interface BulkUploadStepProps {
  employees: Employee[];
  onComplete: (results: EmployeeUploadResult[]) => void;
  onBack: () => void;
  className?: string;
}

/**
 * Bulk Upload Step Component
 * 
 * This step handles the actual upload of validated employee data to Planday:
 * - Converts employee data to Planday API format
 * - Shows real-time upload progress with batch processing
 * - Handles errors gracefully with retry options
 * - Provides detailed feedback on successful vs failed uploads
 */
const BulkUploadStep: React.FC<BulkUploadStepProps> = ({
  employees,
  onComplete,
  onBack,
  className = ''
}) => {
  const [status, setStatus] = useState<'preparing' | 'validating' | 'authenticating' | 'uploading' | 'setting-payrates' | 'completed' | 'error'>('preparing');
  const [progress, setProgress] = useState<BulkUploadProgress | null>(null);
  const [results, setResults] = useState<EmployeeUploadResult[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{employee: string, errors: string[]}>>([]);
  const [payrateProgress, setPayrateProgress] = useState<{ completed: number; total: number } | null>(null);
  const [payrateResults, setPayrateResults] = useState<PayrateSetResult[] | null>(null);
  
  const plandayApi = usePlandayApi();

  // Add log entry for progress tracking
  const addLogEntry = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Pre-validate ALL employees before any upload
  const validateAllEmployees = async (employees: Employee[]): Promise<{
    isValid: boolean,
    validatedEmployees: PlandayEmployeeCreateRequest[],
    convertedEmployees: any[], // Keep converted data for payrate extraction
    errors: Array<{employee: string, errors: string[]}>
  }> => {
    addLogEntry(`🔍 Pre-validating all ${employees.length} employees...`);

    const validatedEmployees: PlandayEmployeeCreateRequest[] = [];
    const convertedEmployees: any[] = []; // Store converted employees with payrate data
    const allErrors: Array<{employee: string, errors: string[]}> = [];

    for (let index = 0; index < employees.length; index++) {
      const employee = employees[index];
      const employeeName = `${employee.firstName || 'Unknown'} ${employee.lastName || 'Unknown'} (row ${index + 1})`;

      // Use ValidationService for required field validation
      const requiredFieldErrors = ValidationService.validateRequiredFields(employee, index);

      // Use MappingUtils for conversion and additional validation
      const validation = await MappingUtils.validateEmployee(employee);

      // Country code validation using centralized ValidationService
      const countryCodeErrors = ValidationService.validateCountryCodeFields(employee, index);

      const allValidationErrors = [...requiredFieldErrors, ...validation.errors, ...countryCodeErrors];

      if (allValidationErrors.length > 0) {
        const errorMessages = allValidationErrors.map(e => e.message);
        allErrors.push({
          employee: employeeName,
          errors: errorMessages
        });
        addLogEntry(`❌ ${employeeName}: ${errorMessages.join(', ')}`);
      } else {
        // Use the converted data from validation
        const converted = validation.converted;

        // Store the converted data (includes __employeeGroupPayrates and wageValidFrom)
        convertedEmployees.push({ ...converted, rowIndex: index });

        // Use the centralized payload creation function to ensure consistency with preview
        const plandayEmployee = MappingUtils.createApiPayload(converted);

        validatedEmployees.push(plandayEmployee);

        // Log payrate info if present
        const payrates = converted.__employeeGroupPayrates || [];
        if (payrates.length > 0) {
          const rateInfo = payrates.map((p: any) => `${p.groupName}: ${p.hourlyRate}`).join(', ');
          addLogEntry(`✅ ${employeeName}: Valid (Hourly rates: ${rateInfo})`);
        } else if (plandayEmployee.employeeTypeId) {
          addLogEntry(`✅ ${employeeName}: Valid (employeeTypeId: ${plandayEmployee.employeeTypeId})`);
        } else {
          addLogEntry(`✅ ${employeeName}: Valid`);
        }
      }
    }
    
    // Check unique fields across all employees
    const uniqueFieldErrors = ValidationService.validateUniqueFields(employees);
    if (uniqueFieldErrors.length > 0) {
      uniqueFieldErrors.forEach(error => {
        const employeeName = `${employees[error.rowIndex]?.firstName || 'Unknown'} ${employees[error.rowIndex]?.lastName || 'Unknown'} (row ${error.rowIndex + 1})`;
        const existingErrorEntry = allErrors.find(e => e.employee === employeeName);
        if (existingErrorEntry) {
          existingErrorEntry.errors.push(error.message);
        } else {
          allErrors.push({
            employee: employeeName,
            errors: [error.message]
          });
        }
        addLogEntry(`❌ ${employeeName}: ${error.message}`);
      });
    }
    
    const isValid = allErrors.length === 0;

    if (isValid) {
      addLogEntry(`🎉 All ${employees.length} employees passed validation!`);
    } else {
      addLogEntry(`❌ ${allErrors.length} employees failed validation. Upload will not proceed.`);
    }

    return {
      isValid,
      validatedEmployees,
      convertedEmployees,
      errors: allErrors
    };
  };

  // Start the atomic upload process with pre-validation
  const startUpload = async () => {
    try {
      // Phase 1: Pre-validation
      setStatus('validating');
      setErrorMessage(null);
      setValidationErrors([]);
      addLogEntry('🚀 Starting atomic upload process...');

      // Validate ALL employees first
      const validation = await validateAllEmployees(employees);
      
      if (!validation.isValid) {
        // Validation failed - show errors and stop
        setStatus('error');
        setValidationErrors(validation.errors);
        setErrorMessage(`Validation failed for ${validation.errors.length} employees. All issues must be fixed before upload can proceed.`);
        addLogEntry(`🛑 Upload aborted due to validation errors. NO employees were uploaded.`);
        return;
      }

      // Phase 2: Authentication check with auto re-authentication
      addLogEntry('🔍 Checking authentication status...');
      console.log('🔍 Auth check:', {
        hookIsAuthenticated: plandayApi.isAuthenticated,
        timestamp: new Date().toISOString()
      });
      
      if (!plandayApi.isAuthenticated) {
        addLogEntry('⚠️ Not authenticated - attempting automatic re-authentication...');
        setStatus('authenticating');
        
        // Try to get stored refresh token for automatic re-authentication
        const storedRefreshToken = sessionStorage.getItem('planday_refresh_token');
        
        if (storedRefreshToken) {
          addLogEntry('🔄 Found stored refresh token, attempting to re-authenticate...');
          
          try {
            const authSuccess = await plandayApi.authenticate(storedRefreshToken);
            
            if (authSuccess) {
              addLogEntry('✅ Automatic re-authentication successful!');
              setStatus('validating'); // Go back to validating status
            } else {
              addLogEntry('❌ Automatic re-authentication failed');
              throw new Error('Authentication expired and automatic re-authentication failed. Please re-authenticate manually.');
            }
          } catch (error) {
            addLogEntry('❌ Automatic re-authentication error: ' + (error instanceof Error ? error.message : 'Unknown error'));
            throw new Error('Authentication expired and automatic re-authentication failed. Please re-authenticate manually.');
          }
        } else {
          addLogEntry('❌ No stored refresh token found for automatic re-authentication');
          throw new Error('Not authenticated with Planday. Please re-authenticate.');
        }
      }
      
      // Double-check by testing connection
      addLogEntry('🔗 Testing API connection...');
      const connectionOk = await plandayApi.testConnection();
      if (!connectionOk) {
        addLogEntry('❌ API connection test failed - trying one more re-authentication attempt...');
        
        // One more attempt at re-authentication
        const storedRefreshToken = sessionStorage.getItem('planday_refresh_token');
        if (storedRefreshToken) {
          addLogEntry('🔄 Final re-authentication attempt...');
          setStatus('authenticating');
          
          try {
            const authSuccess = await plandayApi.authenticate(storedRefreshToken);
            
            if (authSuccess) {
              addLogEntry('✅ Final re-authentication successful!');
              setStatus('validating'); // Go back to validating status
              
              // Test connection again
              const finalConnectionOk = await plandayApi.testConnection();
              if (!finalConnectionOk) {
                addLogEntry('❌ Connection still fails after re-authentication');
                throw new Error('Unable to establish connection to Planday API. Please check your network and try again.');
              }
            } else {
              throw new Error('Unable to connect to Planday API. Please check your authentication and try again.');
            }
          } catch (error) {
            throw new Error('Unable to connect to Planday API. Please check your authentication and try again.');
          }
        } else {
          throw new Error('Unable to connect to Planday API. Please check your authentication and try again.');
        }
      }
      
      addLogEntry('🔐 Authentication verified and API connection successful');

      // Phase 3: Atomic upload
      setStatus('uploading');
      addLogEntry(`🚀 Starting atomic upload of ${validation.validatedEmployees.length} employees...`);
      addLogEntry(`⚠️ ATOMIC MODE: If ANY employee fails to upload, the entire process will stop.`);

      // Start upload with atomic behavior (stop on first failure)
      const uploadResults = await plandayApi.atomicUploadEmployees(validation.validatedEmployees, (progressUpdate) => {
        setProgress(progressUpdate);
        
        if (progressUpdate.inProgress) {
          addLogEntry(`📦 Processing batch ${progressUpdate.currentBatch}/${progressUpdate.totalBatches} - ${progressUpdate.completed} completed, ${progressUpdate.failed} failed`);
          
          // ATOMIC: Stop on any failure
          if (progressUpdate.failed > 0) {
            addLogEntry(`🛑 ATOMIC FAILURE: Upload stopped due to failure. ${progressUpdate.completed} employees were uploaded before failure.`);
            addLogEntry(`⚠️ You may need to manually remove the ${progressUpdate.completed} successfully uploaded employees if you want a clean slate.`);
          }
        } else {
          addLogEntry(`✅ Upload completed - ${progressUpdate.completed} successful, ${progressUpdate.failed} failed`);
        }
      });

      // Check if upload was truly successful (atomic requirement)
      const failed = uploadResults.filter(r => !r.success);
      const successful = uploadResults.filter(r => r.success);

      if (failed.length > 0) {
        setStatus('error');
        setErrorMessage(`Atomic upload failed: ${failed.length} employees failed to upload. ${successful.length} employees were successfully uploaded before the failure.`);
        addLogEntry(`❌ ATOMIC UPLOAD FAILED: Not all employees could be uploaded.`);
        addLogEntry(`📊 Final result: ${successful.length} successful, ${failed.length} failed`);

        // Log detailed failure information
        failed.forEach((failedResult, index) => {
          const employee = failedResult.employee;
          addLogEntry(`❌ Failed Employee ${index + 1}: ${employee.firstName} ${employee.lastName}`);
          addLogEntry(`   Error: ${failedResult.error || 'Unknown error'}`);
          addLogEntry(`   Row: ${failedResult.rowIndex + 1}`);
        });
      } else {
        addLogEntry(`🎉 All ${successful.length} employees uploaded successfully!`);

        // Phase 4: Set pay rates for employees with hourly rates
        const payrateAssignments: PayrateAssignment[] = [];

        successful.forEach((result) => {
          // Find the corresponding converted employee data
          const convertedEmployee = validation.convertedEmployees.find(
            (c: any) => c.rowIndex === result.rowIndex
          );

          if (convertedEmployee && result.plandayId) {
            const payrates = convertedEmployee.__employeeGroupPayrates || [];
            const validFrom = convertedEmployee.wageValidFrom || new Date().toISOString().split('T')[0];

            payrates.forEach((pr: any) => {
              payrateAssignments.push({
                employeeId: result.plandayId!,
                groupId: pr.groupId,
                groupName: pr.groupName,
                rate: pr.hourlyRate,
                validFrom
              });
            });
          }
        });

        if (payrateAssignments.length > 0) {
          setStatus('setting-payrates');
          addLogEntry(`💰 Setting ${payrateAssignments.length} hourly pay rates for employees...`);

          const payrateResults = await plandayApi.bulkSetPayrates(
            payrateAssignments,
            (completed, total) => {
              setPayrateProgress({ completed, total });
            }
          );

          setPayrateResults(payrateResults);

          const successfulPayrates = payrateResults.filter(r => r.success).length;
          const failedPayrates = payrateResults.filter(r => !r.success).length;

          if (failedPayrates > 0) {
            addLogEntry(`⚠️ Pay rates: ${successfulPayrates} successful, ${failedPayrates} failed`);
            payrateResults.filter(r => !r.success).forEach(pr => {
              addLogEntry(`   ❌ Failed: ${pr.groupName} rate ${pr.rate} - ${pr.error}`);
            });
          } else {
            addLogEntry(`✅ All ${successfulPayrates} pay rates set successfully!`);
          }
        }

        setStatus('completed');
        addLogEntry(`🎉 ATOMIC SUCCESS: Upload process complete!`);
      }

      setResults(uploadResults);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown upload error');
      addLogEntry(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle completion - pass results to parent
  const handleComplete = () => {
    if (results) {
      onComplete(results);
    }
  };

  // Auto-start upload when component mounts
  useEffect(() => {
    // Small delay to allow UI to render before starting
    const timer = setTimeout(() => {
      if (status === 'preparing') {
        startUpload();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [status]);

  // Calculate progress percentage
  const progressPercentage = progress ? Math.round((progress.completed + progress.failed) / progress.total * 100) : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {status === 'preparing' && (
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            {status === 'validating' && (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            )}
            {status === 'authenticating' && (
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {status === 'uploading' && (
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            {status === 'setting-payrates' && (
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            {status === 'completed' && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'preparing' && 'Preparing Upload...'}
            {status === 'validating' && 'Validating All Employees'}
            {status === 'authenticating' && 'Re-authenticating with Planday'}
            {status === 'uploading' && 'Uploading to Planday'}
            {status === 'setting-payrates' && 'Setting Hourly Pay Rates'}
            {status === 'completed' && 'Atomic Upload Complete!'}
            {status === 'error' && 'Atomic Upload Failed'}
          </h2>
          <p className="text-gray-600">
            {status === 'preparing' && 'Initializing atomic upload process...'}
            {status === 'validating' && `Pre-validating all ${employees.length} employees. Upload will only proceed if ALL are valid.`}
            {status === 'authenticating' && 'Authentication expired. Automatically refreshing your session...'}
            {status === 'uploading' && `Atomic upload in progress - all ${employees.length} employees must succeed.`}
            {status === 'setting-payrates' && 'Employees created. Now setting hourly pay rates for employee groups...'}
            {status === 'completed' && 'All employees have been successfully uploaded to Planday!'}
            {status === 'error' && 'Upload stopped due to validation or API errors. No partial uploads.'}
          </p>
        </div>
      </Card>

      {/* Progress Tracking */}
      {progress && (
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Upload Progress</h3>
              <span className="text-sm text-gray-600">
                {progressPercentage}% Complete
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{progress.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {progress.currentBatch}/{progress.totalBatches}
                </div>
                <div className="text-sm text-gray-600">Batches</div>
              </div>
            </div>

            {/* Batch Progress */}
            {status === 'uploading' && (
              <div className="text-center text-sm text-gray-600">
                Processing batch {progress.currentBatch} of {progress.totalBatches}...
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pay Rate Progress */}
      {status === 'setting-payrates' && payrateProgress && (
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Setting Pay Rates</h3>
              <span className="text-sm text-gray-600">
                {Math.round((payrateProgress.completed / payrateProgress.total) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(payrateProgress.completed / payrateProgress.total) * 100}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600">
              {payrateProgress.completed} of {payrateProgress.total} pay rates set...
            </div>
          </div>
        </Card>
      )}

      {/* Pay Rate Results */}
      {status === 'completed' && payrateResults && payrateResults.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Rate Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {payrateResults.filter(r => r.success).length}
              </div>
              <div className="text-sm text-green-700">Pay Rates Set</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {payrateResults.filter(r => !r.success).length}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>
          {payrateResults.some(r => !r.success) && (
            <div className="mt-4">
              <h4 className="font-medium text-red-800 mb-2">Failed Pay Rates:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {payrateResults.filter(r => !r.success).map((result, index) => (
                  <div key={index} className="p-2 bg-red-50 rounded text-sm">
                    <span className="font-medium">{result.groupName}</span>: Rate {result.rate} - {result.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Validation Errors Display */}
      {status === 'error' && validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800 mb-2">Validation Errors - Upload Aborted</h4>
                <p className="text-red-700 text-sm mb-4">
                  {validationErrors.length} employees failed validation. ALL issues must be fixed before upload can proceed.
                  <br/>
                  <strong>Atomic Upload:</strong> No employees have been uploaded to Planday.
                </p>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              <h5 className="font-medium text-red-800 mb-2">Employees with validation errors:</h5>
              <div className="space-y-3">
                {validationErrors.map((errorGroup, index) => (
                  <div key={index} className="p-3 bg-white rounded border border-red-200">
                    <div className="font-medium text-red-800 mb-1">{errorGroup.employee}</div>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      {errorGroup.errors.map((error, errorIndex) => (
                        <li key={errorIndex}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Other Errors Display */}
      {status === 'error' && errorMessage && validationErrors.length === 0 && !results && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-800 mb-2">Upload Error</h4>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Atomic Upload Failure Details */}
      {status === 'error' && results && results.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800 mb-2">Atomic Upload Failed</h4>
                <p className="text-red-700 text-sm mb-4">
                  {errorMessage}
                  <br/>
                  <strong>Atomic Upload:</strong> Upload stopped at first failure to maintain data integrity.
                </p>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.success).length}
                  </div>
                  <div className="text-sm text-green-700">Successfully Created</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => !r.success).length}
                  </div>
                  <div className="text-sm text-red-700">Failed to Create</div>
                </div>
              </div>

              {/* Failed Employees Details */}
              {results.some(r => !r.success) && (
                <div>
                  <h5 className="font-medium text-red-800 mb-2">Failed Upload Details:</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {results
                      .filter(r => !r.success)
                      .map((result, index) => (
                        <div key={index} className="p-3 bg-white rounded border border-red-200">
                          <div className="font-medium text-red-800 mb-1">
                            {result.employee.firstName} {result.employee.lastName} (Row {result.rowIndex + 1})
                          </div>
                          <div className="text-sm text-red-600">{result.error}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Processing Log */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Log</h3>
        <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
          <div className="font-mono text-sm space-y-1">
            {processingLog.length === 0 ? (
              <div className="text-gray-500">Waiting to start...</div>
            ) : (
              processingLog.map((entry, index) => (
                <div key={index} className="text-gray-700">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      {status === 'completed' && results && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {results.filter(r => r.success).length}
                </div>
                <div className="text-sm text-green-700">Successfully Created</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {results.filter(r => !r.success).length}
                </div>
                <div className="text-sm text-red-700">Failed to Create</div>
              </div>
            </div>

            {/* Failed Employees Details */}
            {results.some(r => !r.success) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Failed Uploads:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results
                    .filter(r => !r.success)
                    .map((result, index) => (
                      <div key={index} className="p-3 bg-red-50 rounded text-sm">
                        <div className="font-medium text-red-800">
                          {result.employee.firstName} {result.employee.lastName}
                        </div>
                        <div className="text-red-600">{result.error}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={status === 'uploading' || status === 'validating' || status === 'authenticating' || status === 'setting-payrates'}
          className="flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Preview</span>
        </Button>

        <div className="space-x-3">
          {/* Validation Error - Go back to fix issues */}
          {status === 'error' && validationErrors.length > 0 && (
            <Button
              variant="primary"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Fix Validation Errors</span>
            </Button>
          )}

          {/* Other Errors - Retry upload */}
          {status === 'error' && validationErrors.length === 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('preparing');
                setErrorMessage(null);
                setValidationErrors([]);
                setResults(null);
                setProgress(null);
                setProcessingLog([]);
              }}
            >
              Retry Upload
            </Button>
          )}
          
          {status === 'completed' && (
            <Button
              variant="primary"
              onClick={handleComplete}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span>View Results</span>
            </Button>
          )}

          {status === 'validating' && (
            <Button
              variant="primary"
              disabled
              className="flex items-center space-x-2"
            >
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Validating...</span>
            </Button>
          )}

          {status === 'authenticating' && (
            <Button
              variant="primary"
              disabled
              className="flex items-center space-x-2"
            >
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Re-authenticating...</span>
            </Button>
          )}

          {status === 'uploading' && (
            <Button
              variant="primary"
              disabled
              className="flex items-center space-x-2"
            >
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading...</span>
            </Button>
          )}

          {status === 'setting-payrates' && (
            <Button
              variant="primary"
              disabled
              className="flex items-center space-x-2"
            >
              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Setting Pay Rates...</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadStep; 