import { useState, useEffect } from 'react';
import { Button, Card, ProgressIndicator, PrivacyModal, CookieModal, TermsOfServiceModal, VersionModal, getCurrentVersion } from './components/ui';
import { AuthenticationStep } from './components/auth/AuthenticationStep';
import { FileUploadStep } from './components/upload/FileUploadStep';
import MappingStep from './components/mapping/MappingStep';
import ValidationAndCorrectionStep from './components/validation/ValidationAndCorrectionStep';
import FinalPreviewStep from './components/results/FinalPreviewStep';
import BulkUploadStep from './components/results/BulkUploadStep';
import ResultsVerificationStep from './components/results/ResultsVerificationStep';
import { usePlandayApi } from './hooks/usePlandayApi';
import { APP_METADATA, WorkflowStep } from './constants';
import type { 
  ParsedExcelData, 
  ExcelColumnMapping, 
  ColumnMapping, 
  Employee, 
  WorkflowStep as WorkflowStepType,
  EmployeeUploadResult,
  PlandayEmployeeCreateRequest
} from './types/planday';

/**
 * Main App Component
 * 
 * This is the root component for the Planday Bulk Employee Uploader.
 * Currently showcasing the components we've built in Phase 1.
 * 
 * Phase 1 Complete:
 * - ✅ Project setup with Vite + React + TypeScript
 * - ✅ Tailwind CSS configuration with custom design system
 * - ✅ Project structure and folder organization
 * - ✅ TypeScript type definitions for Planday API
 * - ✅ Application constants and configuration
 * - ✅ Step-by-step progress indicator component (PRD requirement)
 * - ✅ Base UI components (Button, Input, Card)
 * 
 * Next Steps (Phase 1.3):
 * - Planday API integration
 * - Authentication flow
 * - Excel file processing
 */
function App() {
  // Application state
  const [currentStep, setCurrentStep] = useState<WorkflowStepType>(WorkflowStep.Authentication);
  const [completedSteps, setCompletedSteps] = useState<WorkflowStepType[]>([]);
  
  // Excel file data
  const [excelData, setExcelData] = useState<ParsedExcelData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ExcelColumnMapping[]>([]);
  
  // Enhanced mapping data (will be used in later steps)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mappedColumns, setMappedColumns] = useState<ColumnMapping>({});
  
  // Upload results state for verification step
  const [uploadResults, setUploadResults] = useState<EmployeeUploadResult[]>([]);
  const [originalEmployees, setOriginalEmployees] = useState<PlandayEmployeeCreateRequest[]>([]);
  
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
  const { departments, employeeGroups } = plandayApi;
  
  // Debug: Log departments and employee groups

  
  // Additional debug: Log what we're passing to ValidationAndCorrectionStep
  useEffect(() => {
    if (currentStep === WorkflowStep.ValidationCorrection && employees.length > 0) {
      console.log('🏗️ App.tsx passing to ValidationAndCorrectionStep:');
      console.log('   - departments:', departments.length, departments);
      console.log('   - employeeGroups:', employeeGroups.length, employeeGroups);
      console.log('   - employees:', employees.length);
    }
  }, [currentStep, employees.length]); // Removed departments and employeeGroups from dependency array
  
  // Silence unused variable warning temporarily 
  
  


  /**
   * Demo function to simulate step progression
   */
  const handleNextStep = () => {
    const steps = Object.values(WorkflowStep) as WorkflowStepType[];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex < steps.length - 1) {
      // Mark current step as completed
      setCompletedSteps(prev => [...prev, currentStep]);
      // Move to next step
      setCurrentStep(steps[currentIndex + 1]);
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
    setUploadResults([]);
    setOriginalEmployees([]);
    
    // Also clear Planday API state
    plandayApi.logout();
  };

  // Determine if we should show the main header (only on step 1)
  const showMainHeader = currentStep === WorkflowStep.Authentication;
  
  // Determine if we should show the cancel button (steps 2-7)
  const showCancelButton = currentStep !== WorkflowStep.Authentication;

  return (
    <div className={`min-h-screen sparkling-background flex justify-center py-8 ${
      showMainHeader ? 'items-center' : 'items-start'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative" style={{zIndex: 10}}>
        
        {/* App Header - Only shown on step 1, slides up and disappears on step 2+ */}
        <div className={`text-center transition-all duration-500 overflow-hidden ${
          showMainHeader 
            ? 'mb-12 max-h-40 opacity-100 transform translate-y-0' 
            : 'mb-0 max-h-0 opacity-0 transform -translate-y-4'
        }`}>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 dynamic-header">
            {APP_METADATA.NAME}
          </h1>
          <p className="text-xl text-gray-600">
            {APP_METADATA.DESCRIPTION}
          </p>
        </div>

        {/* Progress Indicator - Always visible, with different margins based on header visibility */}
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
          <AuthenticationStep
            onNext={handleNextStep}
            onPrevious={() => {}}
            onCancel={() => {}}
            onAuthenticated={() => {
              // Data is already loaded during authentication process
            }}
            plandayApi={plandayApi}
          />
        )}

        {currentStep === WorkflowStep.FileUpload && (
          <FileUploadStep
            onNext={handleNextStep}
            onPrevious={() => {
              setCurrentStep(WorkflowStep.Authentication);
              setCompletedSteps([]);
            }}
            onCancel={() => {}}
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
            initialColumnMappings={columnMappings}
            savedMappings={Object.keys(mappedColumns).length > 0 ? mappedColumns : undefined}
            onComplete={(mappedEmployees, mappings) => {
              setEmployees(mappedEmployees);
              setMappedColumns(mappings);
              handleNextStep(); // This will go to ValidationCorrection step
            }}
            onBack={() => {
              setCurrentStep(WorkflowStep.FileUpload);
              setCompletedSteps([WorkflowStep.Authentication]);
            }}
          />
        )}

        {currentStep === WorkflowStep.ValidationCorrection && employees.length > 0 && (
          <ValidationAndCorrectionStep
            employees={employees}
            departments={departments}
            employeeGroups={employeeGroups}
            onComplete={(correctedEmployees) => {
              setEmployees(correctedEmployees);
              handleNextStep(); // Go to final preview
            }}
            onBack={() => {
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
            onComplete={(results) => {
              setUploadResults(results);
              // Store original employees for verification
              const originalEmps = results.map(r => r.employee);
              setOriginalEmployees(originalEmps);
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
            onComplete={() => {
              // Reset everything and go back to start
              setCurrentStep(WorkflowStep.Authentication);
              setCompletedSteps([]);
              setExcelData(null);
              setColumnMappings([]);
              setEmployees([]);
              setMappedColumns({});
              setUploadResults([]);
              setOriginalEmployees([]);
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
              setUploadResults([]);
              setOriginalEmployees([]);
            }}
          />
        )}

        {/* Placeholder for remaining steps */}
        {currentStep !== WorkflowStep.Authentication && 
         currentStep !== WorkflowStep.FileUpload && 
         currentStep !== WorkflowStep.ColumnMapping && 
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
        <div className="mt-16 pt-8">
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

      </div>
    </div>
  );
}

export default App;
