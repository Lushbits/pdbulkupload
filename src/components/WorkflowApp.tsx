/**
 * Workflow App Component
 * 
 * Contains the main 7-step workflow logic, extracted from App.tsx
 * This component handles the actual business logic while App.tsx handles routing
 */

import { useState, useEffect } from 'react';
import { Button, Card, ProgressIndicator, PrivacyModal, CookieModal, TermsOfServiceModal, VersionModal, getCurrentVersion, BetaBanner, BetaTag } from './ui';
import { AuthenticationStep } from './auth/AuthenticationStep';
import { FileUploadStep } from './upload/FileUploadStep';
import MappingStep from './mapping/MappingStep';
import ValidationAndCorrectionStep from './validation/ValidationAndCorrectionStep';

import FinalPreviewStep from './results/FinalPreviewStep';
import BulkUploadStep from './results/BulkUploadStep';
import type { PostCreationResults } from './results/BulkUploadStep';
import ResultsVerificationStep from './results/ResultsVerificationStep';
import { usePlandayApi } from '../hooks/usePlandayApi';
import { APP_METADATA, WorkflowStep, MAIN_WORKFLOW_STEPS } from '../constants';
import type {
  ParsedExcelData,
  ExcelColumnMapping,
  ColumnMapping,
  Employee,
  ExcludedEmployee,
  WorkflowStep as WorkflowStepType,
  EmployeeUploadResult,
  PlandayEmployeeCreateRequest
} from '../types/planday';

interface WorkflowAppProps {
  onStepChange?: (step: WorkflowStepType) => void;
}

export function WorkflowApp({ onStepChange }: WorkflowAppProps = {}) {
  // Application state
  const [currentStep, setCurrentStep] = useState<WorkflowStepType>(WorkflowStep.Authentication);
  const [completedSteps, setCompletedSteps] = useState<WorkflowStepType[]>([]);
  
  // Excel file data
  const [excelData, setExcelData] = useState<ParsedExcelData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ExcelColumnMapping[]>([]);
  
  // Enhanced mapping data (will be used in later steps)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mappedColumns, setMappedColumns] = useState<ColumnMapping>({});
  const [customValues, setCustomValues] = useState<{ [fieldName: string]: string }>({});
  
  // Bulk correction state - persists across navigation but resets when going back to mapping
  const [resolvedBulkCorrectionPatterns, setResolvedBulkCorrectionPatterns] = useState<Map<string, string>>(new Map());
  
  // Upload results state for verification step
  const [uploadResults, setUploadResults] = useState<EmployeeUploadResult[]>([]);
  const [originalEmployees, setOriginalEmployees] = useState<PlandayEmployeeCreateRequest[]>([]);

  // Post-creation operation results (supervisors, salaries, etc.)
  const [postCreationResults, setPostCreationResults] = useState<PostCreationResults>({});

  // Excluded employees (those with errors that were skipped during upload)
  const [excludedEmployees, setExcludedEmployees] = useState<ExcludedEmployee[]>([]);

  // Privacy modal state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  
  // Cookie modal state
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  
  // Terms of Service modal state
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  
  // Version modal state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  
  // Planday API integration - centralized hook usage
  const plandayApi = usePlandayApi();
  const { departments, employeeGroups, employeeTypes } = plandayApi;

  // Security: Clean up any stray tokens from localStorage on app initialization
  useEffect(() => {
    // Our app uses sessionStorage for security, but clean localStorage
    // in case other apps, browser extensions, or previous versions left tokens there
    localStorage.removeItem('planday_refresh_token');
    localStorage.removeItem('planday_access_token');
    localStorage.removeItem('planday_token_expiry');
    
    // Clear any other potential Planday-related tokens
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('planday_')) {
        keysToRemove.push(key);
      }
    }
    
    // Only log if we actually found tokens to remove
    if (keysToRemove.length > 0) {
      console.log('🔒 Security cleanup: Found and removing stray Planday tokens from localStorage');
      keysToRemove.forEach(key => {
        console.log(`🧹 Removing stray token: ${key}`);
        localStorage.removeItem(key);
      });
    }
  }, []); // Run only on mount

  // Notify parent component of step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  /**
   * Move to the next step in the workflow
   */
  const handleNextStep = () => {
    const mainSteps = MAIN_WORKFLOW_STEPS.map(step => step.key);
    const currentIndex = mainSteps.indexOf(currentStep as typeof mainSteps[number]);
    
    if (currentIndex < mainSteps.length - 1) {
      // Mark current step as completed
      setCompletedSteps(prev => [...prev, currentStep]);
      
      // Move to next main step
      setCurrentStep(mainSteps[currentIndex + 1]);
    }
  };

  /**
   * Cancel upload and start over
   */
  const handleCancelUpload = () => {
    // Reset everything and go back to authentication
    setCurrentStep(WorkflowStep.Authentication);
    setCompletedSteps([]);
    setExcelData(null);
    setColumnMappings([]);
    setEmployees([]);
    setMappedColumns({});
    setCustomValues({});
    setResolvedBulkCorrectionPatterns(new Map());
    setUploadResults([]);
    setOriginalEmployees([]);
    
    // Also clear Planday API state
    plandayApi.logout();
    
    // Complete localStorage and sessionStorage cleanup
    // Clear all Planday-related tokens from both storage types
    try {
      // sessionStorage cleanup (handled by plandayApi.logout() but being extra sure)
      sessionStorage.removeItem('planday_refresh_token');
      sessionStorage.removeItem('planday_access_token');
      sessionStorage.removeItem('planday_token_expiry');
      
      // localStorage cleanup (in case tokens were stored there too)
      localStorage.removeItem('planday_refresh_token');
      localStorage.removeItem('planday_access_token');
      localStorage.removeItem('planday_token_expiry');
      
      // Clear any other potential app state that might be cached
      // (Future-proofing for any other localStorage usage)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('planday_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 Complete storage cleanup completed');
    } catch (error) {
      console.warn('⚠️ Storage cleanup had issues:', error);
      // Don't throw - cleanup failures shouldn't break the cancel operation
    }
  };

  // Determine if we should show the main header (only on step 1)
  const showMainHeader = currentStep === WorkflowStep.Authentication;
  
  // Determine if we should show the cancel button (steps 2-7)
  const showCancelButton = currentStep !== WorkflowStep.Authentication;

  return (
    <>
      {/* App Header - Only shown on step 1, slides up and disappears on step 2+ */}
      <div className={`text-center transition-all duration-500 overflow-hidden ${
        showMainHeader 
          ? 'mb-12 max-h-40 opacity-100 transform translate-y-0' 
          : 'mb-0 max-h-0 opacity-0 transform -translate-y-4'
      }`}>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 dynamic-header flex items-center justify-center flex-wrap">
          <span>{APP_METADATA.NAME}</span>
          <BetaTag />
        </h1>
        <p className="text-xl text-gray-600">
          {APP_METADATA.DESCRIPTION}
        </p>
      </div>

      {/* Progress Indicator - Visible for workflow steps */}
      <div className={`flex justify-center transition-all duration-500 ${showMainHeader ? 'mb-16' : 'mb-8'}`}>
        <ProgressIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Cancel Button - Shown on all steps except step 1 */}
      {showCancelButton && (
        <div className="mb-6 transition-all duration-500">
          <Button
            variant="outline"
            onClick={handleCancelUpload}
            className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
          >
            ← Cancel upload and start over
          </Button>
        </div>
      )}

      {/* Main Application Flow */}
      {currentStep === WorkflowStep.Authentication && (
        <>
          <AuthenticationStep
            onNext={handleNextStep}
            onPrevious={() => {}}
            onCancel={handleCancelUpload}
            onAuthenticated={() => {
              // Data is already loaded during authentication process
            }}
            plandayApi={plandayApi}
          />
          
          {/* Beta Banner - Only shown on authentication step */}
          <div className="mt-12 mb-8 flex justify-center">
            <div className="w-full max-w-4xl">
              <BetaBanner />
            </div>
          </div>
        </>
      )}

      {currentStep === WorkflowStep.FileUpload && (
        <FileUploadStep
          onNext={handleNextStep}
          onPrevious={() => {
            setCurrentStep(WorkflowStep.Authentication);
            setCompletedSteps([]);
          }}
          onCancel={handleCancelUpload}
          onFileProcessed={(data, mappings) => {
            setExcelData(data);
            setColumnMappings(mappings);
          }}
          isAuthenticated={plandayApi.isAuthenticated}
          departmentCount={departments.length}
          employeeGroupCount={employeeGroups.length}
          companyName={plandayApi.portalInfo?.companyName}
        />
      )}

      {currentStep === WorkflowStep.ColumnMapping && excelData && (
        <MappingStep
          employees={excelData.rows}
          headers={excelData.headers}
          excelData={excelData}
          initialColumnMappings={columnMappings}
          savedMappings={Object.keys(mappedColumns).length > 0 ? mappedColumns : undefined}
          savedCustomValues={Object.keys(customValues).length > 0 ? customValues : undefined}
          onComplete={(mappedEmployees, mappings, customVals) => {
            setEmployees(mappedEmployees);
            setMappedColumns(mappings);
            setCustomValues(customVals);
            handleNextStep(); // This will go to ValidationCorrection step
          }}
          onBack={() => {
            // Reset state when going back to Column Mapping
            setCurrentStep(WorkflowStep.ColumnMapping);
            setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload]);
          }}
        />
      )}

      {currentStep === WorkflowStep.ValidationCorrection && employees.length > 0 && (
        <ValidationAndCorrectionStep
          key={`validation-${currentStep}-${employees.length}`} // Removed patterns.size to prevent re-mount when patterns are saved
          employees={employees}
          departments={departments}
          employeeGroups={employeeGroups}
          employeeTypes={employeeTypes}
          resolvedPatterns={resolvedBulkCorrectionPatterns}
          onPatternsResolved={(patterns) => {
            setResolvedBulkCorrectionPatterns(patterns);
          }}
          onComplete={(correctedEmployees, excluded) => {
            setEmployees(correctedEmployees);
            setExcludedEmployees(excluded || []);
            handleNextStep(); // Go to final preview
          }}
          onBack={() => {
            // Reset state when going back to Column Mapping
            setCurrentStep(WorkflowStep.ColumnMapping);
            setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload]);
          }}
          plandayApi={plandayApi}
        />
      )}

      {currentStep === WorkflowStep.FinalPreview && employees.length > 0 && (
        <FinalPreviewStep
          employees={employees}
          onBack={() => {
            setCurrentStep(WorkflowStep.ValidationCorrection);
            setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload, WorkflowStep.ColumnMapping]);
          }}
          onStartUpload={() => {
            handleNextStep(); // Go to bulk upload step
          }}
        />
      )}

      {currentStep === WorkflowStep.BulkUpload && employees.length > 0 && (
        <BulkUploadStep
          employees={employees}
          onComplete={(results, postResults) => {
            setUploadResults(results);
            // Store original employees for verification
            const originalEmps = results.map(r => r.employee);
            setOriginalEmployees(originalEmps);
            // Store post-creation results (supervisor, salary, contract rule failures)
            if (postResults) {
              setPostCreationResults(postResults);
            }
            handleNextStep(); // Go to results verification step
          }}
          onBack={() => {
            setCurrentStep(WorkflowStep.FinalPreview);
            setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload, WorkflowStep.ColumnMapping, WorkflowStep.ValidationCorrection]);
          }}
        />
      )}

      {currentStep === WorkflowStep.Results && uploadResults.length > 0 && (
        <ResultsVerificationStep
          uploadResults={uploadResults}
          originalEmployees={originalEmployees}
          postCreationResults={postCreationResults}
          excludedEmployees={excludedEmployees}
          onComplete={() => {
            // Reset everything and go back to start
            setCurrentStep(WorkflowStep.Authentication);
            setCompletedSteps([]);
            setExcelData(null);
            setColumnMappings([]);
            setEmployees([]);
            setMappedColumns({});
            setCustomValues({});
            setResolvedBulkCorrectionPatterns(new Map());
            setUploadResults([]);
            setOriginalEmployees([]);
            setPostCreationResults({});
            setExcludedEmployees([]);
          }}
          onBack={() => {
            setCurrentStep(WorkflowStep.BulkUpload);
            setCompletedSteps([
              WorkflowStep.Authentication,
              WorkflowStep.FileUpload,
              WorkflowStep.ColumnMapping,
              WorkflowStep.ValidationCorrection,
              WorkflowStep.FinalPreview
            ]);
          }}
          onReset={() => {
            // Complete reset of the entire application state
            setCurrentStep(WorkflowStep.Authentication);
            setCompletedSteps([]);
            setExcelData(null);
            setColumnMappings([]);
            setEmployees([]);
            setMappedColumns({});
            setCustomValues({});
            setResolvedBulkCorrectionPatterns(new Map());
            setUploadResults([]);
            setOriginalEmployees([]);
            setExcludedEmployees([]);
          }}
        />
      )}

      {/* Placeholder for remaining steps */}
      {currentStep !== WorkflowStep.Authentication && 
       currentStep !== WorkflowStep.FileUpload && 
       currentStep !== WorkflowStep.ColumnMapping && 
       currentStep !== WorkflowStep.BulkCorrections && 
       currentStep !== WorkflowStep.DateFormat && 
       currentStep !== WorkflowStep.ValidationCorrection && 
       currentStep !== WorkflowStep.FinalPreview && 
       currentStep !== WorkflowStep.BulkUpload && 
       currentStep !== WorkflowStep.Results && (
        <Card className="mb-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              🚧 Step: {currentStep}
            </h3>
            <p className="text-gray-600 mb-6">
              This step is under development. You can test the completed steps below.
            </p>
            <div className="space-x-3">
              <Button 
                variant="secondary"
                onClick={() => {
                  setCurrentStep(WorkflowStep.Authentication);
                  setCompletedSteps([]);
                }}
              >
                Go to Authentication
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  setCurrentStep(WorkflowStep.FileUpload);
                  setCompletedSteps([WorkflowStep.Authentication]);
                }}
              >
                Go to File Upload
              </Button>
              {excelData && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setCurrentStep(WorkflowStep.ColumnMapping);
                    setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload]);
                  }}
                >
                  Go to Mapping
                </Button>
              )}
              {employees.length > 0 && (
                <>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setCurrentStep(WorkflowStep.ValidationCorrection);
                      setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload, WorkflowStep.ColumnMapping]);
                    }}
                  >
                    Go to Validation & Correction
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setCurrentStep(WorkflowStep.FinalPreview);
                      setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload, WorkflowStep.ColumnMapping, WorkflowStep.ValidationCorrection]);
                    }}
                  >
                    Go to Final Preview
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      setCurrentStep(WorkflowStep.BulkUpload);
                      setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload, WorkflowStep.ColumnMapping, WorkflowStep.ValidationCorrection, WorkflowStep.FinalPreview]);
                    }}
                  >
                    Go to Bulk Upload
                  </Button>
                  {uploadResults.length > 0 && (
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        setCurrentStep(WorkflowStep.Results);
                        setCompletedSteps([WorkflowStep.Authentication, WorkflowStep.FileUpload, WorkflowStep.ColumnMapping, WorkflowStep.ValidationCorrection, WorkflowStep.FinalPreview, WorkflowStep.BulkUpload]);
                      }}
                    >
                      Go to Results Verification
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Privacy Notice Footer */}
              <div className="mt-12 pt-8">
        <div className="text-center">
          <p className="text-sm text-gray-800 mb-2">
            Your employee data is processed entirely on your device and sent directly to Planday - we never store, access, or process your data on our servers. <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Read more
          </button>.
          </p>
          
          {/* Version Display */}
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="hover:text-gray-800 transition-colors underline"
              >
                Version {getCurrentVersion()}
              </button>
              <span className="mx-2">-</span>
              <button
                onClick={() => setIsCookieModalOpen(true)}
                className="hover:text-gray-800 transition-colors underline"
              >
                Cookie Policy
              </button>
              <span className="mx-2">-</span>
              <button
                onClick={() => setIsTermsModalOpen(true)}
                className="hover:text-gray-800 transition-colors underline"
              >
                Terms of Service
              </button>
              <span className="mx-2">-</span>
              <span>Made with <span className="heartbeat">❤️</span> by the </span>
              <a 
                href="https://www.planday.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gray-800 transition-colors underline"
              >
                Planday
              </a>
              <span> Community</span>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Cookie Modal */}
      <CookieModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

      {/* Version Modal */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />
    </>
  );
} 