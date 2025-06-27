/**
 * Combined Validation & Correction Step Component
 * Handles both bulk corrections for invalid names and individual data corrections
 * This is the unified step that replaces separate validation and correction steps
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from '../ui';
import { DateFormatModal } from '../ui/DateFormatModal';
import { MappingUtils, DateParser, type ErrorPattern, type BulkCorrectionSummary } from '../../services/mappingService';
import { DataCorrectionStep } from './DataCorrectionStep';
import type { UsePlandayApiReturn } from '../../hooks/usePlandayApi';

interface ValidationAndCorrectionStepProps {
  employees: any[];
  departments: any[];
  employeeGroups: any[];
  employeeTypes: any[];
  resolvedPatterns?: Map<string, string>;
  onPatternsResolved?: (patterns: Map<string, string>) => void;
  onComplete: (correctedEmployees: any[]) => void;
  onBack: () => void;
  plandayApi: UsePlandayApiReturn;
  className?: string;
}

interface CorrectionCardProps {
  pattern: ErrorPattern;
  validOptions: Array<{id: number, name: string}>;
  isResolved: boolean;
  pendingCorrection?: string; // New prop for pending corrections
  onPendingCorrection: (pattern: ErrorPattern, newValue: string) => void; // New prop for handling pending selections
}

const CorrectionCard: React.FC<CorrectionCardProps> = ({ 
  pattern, 
  validOptions, 
  isResolved, 
  pendingCorrection,
  onPendingCorrection 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(pendingCorrection || '');

  const confidencePercent = Math.round(pattern.confidence * 100);

  const handleSuggestedCorrection = () => {
    if (pattern.suggestion) {
      onPendingCorrection(pattern, pattern.suggestion);
    }
  };

  const handleDropdownSelection = (value: string) => {
    // Select change event triggered
    // Set pending selection - don't apply immediately
    if (value) {
      // Pending selection set
      onPendingCorrection(pattern, value);
      setSelectedOption(value);
    }
  };

  const handleEditSelection = () => {
    // Clear the pending selection to allow re-selection
    onPendingCorrection(pattern, '');
    setSelectedOption('');
  };

  if (isResolved) {
    return (
      <Card className="mb-4 border-l-4 border-l-green-400 bg-green-50">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-green-800 font-medium">
                  "{pattern.invalidName}" has been mapped successfully
                </div>
                <div className="text-xs text-green-600">
                  {pattern.count} rows corrected
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPendingCorrection(pattern, '')} // Clear the resolved state to allow modification
              className="text-green-700 hover:text-green-800 border-green-300 hover:bg-green-100"
            >
              Modify
            </Button>
          </div>
        </div>
      </Card>
    );
  }



  // If we have a pending correction, show green confirmation
  if (pendingCorrection) {
    return (
      <Card className="mb-4 border-l-4 border-l-green-400 bg-green-50">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-green-800 font-medium">
                  Pending: "{pattern.invalidName}" → "{pendingCorrection}"
                </div>
                <div className="text-xs text-green-600">
                  Will correct {pattern.count} rows when you continue
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditSelection}
              className="text-green-700 hover:text-green-800 border-green-300 hover:bg-green-100"
            >
              Edit
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-l-4 border-l-red-400">
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600 capitalize">
                {pattern.field === 'employeeGroups' ? 'Employee Groups' : 
                 pattern.field === 'employeeTypes' ? 'Employee Types' : 'Departments'}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Must be corrected
              </span>
            </div>
            
            <div className="text-lg mb-2">
              <span className="text-red-600 font-bold">❌ "{pattern.invalidName}"</span>
              <span className="text-gray-600 mx-2">doesn't exist in Planday</span>
            </div>
            
            <div className="text-sm text-gray-600 mb-3">
              Found in <span className="font-semibold">{pattern.count} rows</span> - must be mapped to a valid option
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Hide Rows' : `Show ${pattern.count} Rows`}
          </Button>
        </div>

        <div className="space-y-3">
          {pattern.suggestion && (
            <div>
              <Button
                onClick={handleSuggestedCorrection}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                <span className="text-lg">✨</span>
                Map to "{pattern.suggestion}" (suggested match - {confidencePercent}% confidence)
              </Button>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {pattern.suggestion ? 'Or choose a different' : 'Choose a'} {
                pattern.field === 'employeeGroups' ? 'employee group' : 
                pattern.field === 'employeeTypes' ? 'employee type' : 'department'
              }:
            </label>
            {/* Debug info for empty dropdown */}
            {validOptions.length === 0 && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ⚠️ No valid {
                  pattern.field === 'employeeGroups' ? 'employee groups' : 
                  pattern.field === 'employeeTypes' ? 'employee types' : 'departments'
                } available.
                Check console for debugging info.
              </div>
            )}
            <select
              value={selectedOption}
              onChange={(e) => handleDropdownSelection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select valid option...</option>
              {validOptions.length === 0 ? (
                <option value="" disabled>No options available</option>
              ) : (
                validOptions
                  .filter(option => option.name !== pattern.suggestion)
                  .map(option => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))
              )}
            </select>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Affected Rows ({pattern.rows.length}):
            </h4>
            <div className="text-sm text-gray-600">
              {pattern.rows.length <= 15 
                ? pattern.rows.join(', ')
                : `${pattern.rows.slice(0, 15).join(', ')} and ${pattern.rows.length - 15} more...`
              }
            </div>
            <div className="mt-2 text-xs text-gray-500">
              All instances of "{pattern.invalidName}" in these rows will be updated
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const ValidationAndCorrectionStep: React.FC<ValidationAndCorrectionStepProps> = ({
  employees,
  departments,
  employeeGroups,
  employeeTypes,
  resolvedPatterns: initialResolvedPatterns,
  onPatternsResolved,
  onComplete,
  onBack,
  plandayApi,
  className = ''
}) => {
  const [currentPhase, setCurrentPhase] = useState<'bulk-correction' | 'individual-correction' | 'complete'>('bulk-correction');
  const [correctionSummary, setCorrectionSummary] = useState<BulkCorrectionSummary | null>(null);
  const [originalCorrectionSummary, setOriginalCorrectionSummary] = useState<BulkCorrectionSummary | null>(null); // Preserve original summary
  const [resolvedPatterns, setResolvedPatterns] = useState<Map<string, string>>(initialResolvedPatterns || new Map());
  const [currentEmployees, setCurrentEmployees] = useState(employees);

  const [pendingCorrections, setPendingCorrections] = useState<Map<string, string>>(new Map());
  const [hasNavigatedToIndividualCorrection, setHasNavigatedToIndividualCorrection] = useState(false); // Track navigation
  const [helperCompletionState, setHelperCompletionState] = useState({
    bulkCorrectionsCompleted: false,
    dateFormatCompleted: false
  }); // Track which helpers have been completed in this forward journey
  
  // Date format modal state
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);
  const [ambiguousDateSamples, setAmbiguousDateSamples] = useState<string[]>([]);


  // Update currentEmployees when employees prop changes
  useEffect(() => {
    setCurrentEmployees(employees);
  }, [employees]);

  // Only reset helper completion state when truly starting fresh (not on every re-render)
  useEffect(() => {
    // Setting initial phase and helper state
    setHelperCompletionState({
      bulkCorrectionsCompleted: false,
      dateFormatCompleted: false
    });
    setHasNavigatedToIndividualCorrection(false);
    setCurrentPhase('bulk-correction'); // Always start with bulk correction phase when coming forward
    
    // Component initialized
  }, []); // Only run on mount, not on every prop change

  // Initialize and detect bulk correction patterns
  useEffect(() => {
    // ValidationAndCorrectionStep: Initializing with provided data
    console.log('🔄 ValidationAndCorrectionStep initializing');
    console.log('🔍 Initial resolved patterns received:', initialResolvedPatterns ? Array.from(initialResolvedPatterns.entries()) : 'none');
    
    // Reset DateParser for new validation session
    DateParser.resetUserDateFormat();
    
    // Additional debugging: test getAvailableOptions directly
    MappingUtils.initialize(departments, employeeGroups, employeeTypes);
    
    // Fresh detection from current data - always re-evaluate
    const summary = MappingUtils.detectCommonErrors(employees);
    console.log('🔍 Detecting error patterns for bulk correction - found', summary.patterns.length, 'patterns');
    
    // Store original summary if this is the first time
    if (!originalCorrectionSummary) {
      setOriginalCorrectionSummary(summary);
    }
    
    setCorrectionSummary(summary);
  }, [employees, departments, employeeGroups, employeeTypes]); // Removed conflicting dependencies

  // Separate useEffect for state initialization - runs when initialResolvedPatterns changes
  useEffect(() => {
    console.log('🔄 State initialization useEffect - triggered by initialResolvedPatterns change');
    console.log('🔍 initialResolvedPatterns:', initialResolvedPatterns ? Array.from(initialResolvedPatterns.entries()) : 'none');
    
    if (initialResolvedPatterns && initialResolvedPatterns.size > 0) {
      console.log('🔄 Return visit: restoring previous corrections as editable pending corrections');
      console.log('🔍 Restoring patterns:', Array.from(initialResolvedPatterns.keys()));
      
      // Convert resolved patterns back to pending corrections for editing
      const newPendingCorrections = new Map<string, string>();
      for (const [patternKey, correctionValue] of initialResolvedPatterns.entries()) {
        newPendingCorrections.set(patternKey, correctionValue);
        console.log(`🔄 Restored correction: ${patternKey} → ${correctionValue}`);
      }
      console.log('🔄 Setting pending corrections:', Array.from(newPendingCorrections.entries()));
      setPendingCorrections(newPendingCorrections);
      
      // Clear resolved patterns so they show as editable pending corrections
      setResolvedPatterns(new Map());
    } else {
      console.log('🆕 First visit: no previous corrections to restore');
      // Clear both pending and resolved patterns for fresh start
      setPendingCorrections(new Map());
      setResolvedPatterns(new Map());
    }
  }, [initialResolvedPatterns]); // Run whenever initialResolvedPatterns changes

  // Handle pending correction selection
  const handlePendingCorrection = (pattern: ErrorPattern, newValue: string) => {
    const patternKey = `${pattern.field}:${pattern.invalidName}`;
    
    console.log('🎯 handlePendingCorrection called:', patternKey, '→', newValue);
    
    if (newValue) {
      // Setting pending correction
      console.log('✅ Setting pending correction:', patternKey, '→', newValue);
      setPendingCorrections(prev => new Map(prev.set(patternKey, newValue)));
    } else {
      // Clearing pending correction OR unresolving a resolved pattern
      console.log('❌ Clearing pending correction:', patternKey);
      setPendingCorrections(prev => {
        const newMap = new Map(prev);
        newMap.delete(patternKey);
        return newMap;
      });
      
      // If this pattern was resolved, unresolve it so user can modify the correction
      if (resolvedPatterns.has(patternKey)) {
        console.log(`🔄 Unresolving pattern for modification: ${patternKey}`);
        const newResolvedPatterns = new Map(resolvedPatterns);
        newResolvedPatterns.delete(patternKey);
        setResolvedPatterns(newResolvedPatterns);
        onPatternsResolved?.(newResolvedPatterns);
      }
    }
  };



  // Check if all bulk corrections are complete (all patterns have pending corrections)
  const allBulkCorrectionsComplete = useMemo(() => {
    const patternsToCheck = correctionSummary?.patterns || [];
      
    return patternsToCheck.every(pattern => {
      const patternKey = `${pattern.field}:${pattern.invalidName}`;
      return pendingCorrections.has(patternKey);
    });
  }, [correctionSummary, pendingCorrections]);



  /**
   * Check for ambiguous dates ONLY in fields mapped to date fields
   * This happens during validation phase, not initial parsing
   */
  const checkForAmbiguousDatesInMappedFields = (employees: any[]): string[] => {
    const dateFields = ['hiredFrom', 'birthDate']; // Only these fields expect dates
    const allDateValues: string[] = [];
    
    employees.forEach(employee => {
      dateFields.forEach(field => {
        const value = employee[field];
        if (value && typeof value === 'string' && value.trim()) {
          const trimmed = value.trim();
          // Only consider values that could be dates
          if (DateParser.couldBeDate(trimmed)) {
            allDateValues.push(trimmed);
          }
        }
      });
    });
    
    // Find truly ambiguous dates
    const ambiguous = DateParser.findAmbiguousDates(allDateValues);
    console.log(`📅 Found ${ambiguous.length} ambiguous dates in mapped date fields:`, ambiguous);
    
    return ambiguous;
  };

  /**
   * Re-convert all dates after user selects format
   */
  const reConvertDatesWithUserFormat = async (employees: any[]): Promise<any[]> => {
    console.log('📅 Re-converting all dates with user-selected format...');
    const convertedEmployees = [];
    
    for (const employee of employees) {
      // Create a copy and re-run date conversion with user's format choice
      const employeeCopy = { ...employee };
      
      // Re-process date fields
      const dateFields = ['hiredFrom', 'birthDate'];
      for (const field of dateFields) {
        if (employeeCopy[field] && typeof employeeCopy[field] === 'string' && employeeCopy[field].trim()) {
          const dateStr = employeeCopy[field].toString().trim();
          
          if (DateParser.couldBeDate(dateStr)) {
            const convertedDate = DateParser.parseToISO(dateStr);
            if (convertedDate) {
              employeeCopy[field] = convertedDate;
              console.log(`📅 Re-converted ${field}: "${dateStr}" → "${convertedDate}"`);
            }
          }
        }
      }
      
      convertedEmployees.push(employeeCopy);
    }
    
    return convertedEmployees;
  };

  /**
   * Handle date format selection from modal
   */
  const handleDateFormatSelection = async (format?: 'DD/MM/YYYY' | 'MM/DD/YYYY') => {
    if (format) {
      DateParser.setUserDateFormat(format);
      console.log(`📅 User selected date format: ${format}`);
      
      // Re-convert all dates with the selected format
      const reConvertedEmployees = await reConvertDatesWithUserFormat(currentEmployees);
      setCurrentEmployees(reConvertedEmployees);
      
      // Mark date format as completed
      setHelperCompletionState(prev => ({ ...prev, dateFormatCompleted: true }));
      
      setShowDateFormatModal(false);
      setAmbiguousDateSamples([]);
      
      // Continue to individual corrections after date format is resolved
      setHasNavigatedToIndividualCorrection(true); // Mark that we've navigated to individual corrections
      setCurrentPhase('individual-correction');
    } else {
      // User cancelled - go back to bulk correction
      setShowDateFormatModal(false);
      setAmbiguousDateSamples([]);
      setCurrentPhase('bulk-correction');
    }
  };

  // Handle proceeding to individual corrections
  const handleProceedToIndividualCorrections = async () => {
    console.log('🚀 handleProceedToIndividualCorrections called');
    console.log('🔍 Current pendingCorrections:', Array.from(pendingCorrections.entries()));
    console.log('🔍 Current resolvedPatterns:', Array.from(resolvedPatterns.entries()));
    
    // If there are pending corrections, apply them and immediately proceed (first-time completion)
    let employeesToUse = currentEmployees;
    let newResolvedPatterns = new Map(resolvedPatterns);
    let hadPendingCorrections = pendingCorrections.size > 0;
    
    console.log('🔍 hadPendingCorrections:', hadPendingCorrections);
    console.log('🔍 pendingCorrections.size:', pendingCorrections.size);
    
    if (pendingCorrections.size > 0) {
      console.log('🔧 First-time completion: applying corrections and proceeding immediately');
      
      try {
        // Apply each pending correction
        for (const [patternKey, newValue] of pendingCorrections.entries()) {
          console.log(`🔧 Processing correction: ${patternKey} → ${newValue}`);
          const pattern = correctionSummary?.patterns.find(p => 
            `${p.field}:${p.invalidName}` === patternKey
          );
          
          if (pattern) {
            employeesToUse = MappingUtils.applyBulkCorrection(employeesToUse, pattern, newValue);
            newResolvedPatterns.set(patternKey, newValue);
            console.log(`✅ Applied correction: ${patternKey} → ${newValue}`);
          } else {
            console.warn(`⚠️ Pattern not found for correction: ${patternKey}`);
          }
        }
        
        console.log('✅ Successfully applied all pending corrections - proceeding immediately');
        
        // Clear pending corrections after applying them
        setPendingCorrections(new Map());
      } catch (error) {
        console.error('❌ Error applying pending corrections:', error);
      }
    } else {
      console.log('ℹ️ No pending corrections to apply');
    }
    
    console.log('🔍 newResolvedPatterns after processing:', Array.from(newResolvedPatterns.entries()));
    console.log('🔍 newResolvedPatterns.size:', newResolvedPatterns.size);
    
    // Mark bulk corrections as completed
    setHelperCompletionState(prev => ({ ...prev, bulkCorrectionsCompleted: true }));
    
    // CRITICAL: Save resolved patterns to parent state BEFORE checking dates
    // This ensures bulk corrections are saved even if we have ambiguous dates
    console.log('🔍 Checking save conditions - hadPendingCorrections:', hadPendingCorrections, 'newResolvedPatterns.size:', newResolvedPatterns.size);
    if (hadPendingCorrections || newResolvedPatterns.size > 0) {
      console.log('💾 Saving resolved patterns to parent state:', Array.from(newResolvedPatterns.entries()));
      onPatternsResolved?.(newResolvedPatterns);
    } else {
      console.log('❌ Not saving patterns - no pending corrections and no existing resolved patterns');
    }
    
    // ALWAYS check for ambiguous dates when proceeding forward
    const ambiguousDates = checkForAmbiguousDatesInMappedFields(employeesToUse);
    
    if (ambiguousDates.length > 0 && !helperCompletionState.dateFormatCompleted) {
      // Found ambiguous dates - show modal for user to choose format
      console.log(`📅 Found ${ambiguousDates.length} ambiguous dates, showing format selection modal`);
      setAmbiguousDateSamples(ambiguousDates);
      setCurrentEmployees(employeesToUse);
      setShowDateFormatModal(true);
      return; // Early return is OK now - patterns already saved above
    }
    
    // No ambiguous dates - proceed directly to individual corrections
    console.log('📅 No ambiguous dates found, proceeding directly to individual corrections');
    setCurrentEmployees(employeesToUse);
    setHasNavigatedToIndividualCorrection(true);
    setCurrentPhase('individual-correction');
  };



  // Render DateFormatModal if showing (must be first to override other phases)
  if (showDateFormatModal) {
    return (
      <div className={`validation-correction-step ${className}`}>
        <DateFormatModal
          isOpen={showDateFormatModal}
          onClose={handleDateFormatSelection}
          samples={ambiguousDateSamples}
        />
      </div>
    );
  }

  // Render bulk correction phase
  if (currentPhase === 'bulk-correction') {
    return (
      <div className={`validation-correction-step ${className}`}>
        


        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-orange-600 text-2xl">🔧</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Fix Invalid Names
            </h3>
            <p className="text-gray-600">
              These department/employee group/employee type names don't exist in Planday and must be corrected before proceeding.
            </p>
          </div>
        </Card>

        {/* Bulk Correction Summary */}
        {correctionSummary && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Bulk Corrections Required
              </h4>
              <div className="text-sm text-gray-600">
                {`${pendingCorrections.size} of ${correctionSummary.patterns.length} corrections set`}
              </div>
            </div>

            {correctionSummary.patterns.length === 0 && !hasNavigatedToIndividualCorrection ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-4xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Invalid Names Found
                </h3>
                <p className="text-gray-600 mb-4">
                  All department and employee group names are valid in Planday.
                </p>
                
                {/* Navigation buttons - consistent with other phases */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={onBack}
                    className="text-gray-600 hover:bg-gray-50"
                  >
                    ← Back to Mapping
                  </Button>
                  
                  <Button onClick={handleProceedToIndividualCorrections} className="bg-green-600 hover:bg-green-700 text-white">
                    Continue to Data Validation →
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Correction Cards */}
                {correctionSummary.patterns.map(pattern => {
                  const validOptions = MappingUtils.getAvailableOptions(pattern.field);
                  const patternKey = `${pattern.field}:${pattern.invalidName}`;
                  const pendingCorrection = pendingCorrections.get(patternKey);
                  
                  return (
                    <CorrectionCard
                      key={patternKey}
                      pattern={pattern}
                      validOptions={validOptions}
                      isResolved={false} // Never show as resolved - always show as editable pending corrections
                      pendingCorrection={pendingCorrection}
                      onPendingCorrection={handlePendingCorrection}
                    />
                  );
                })}

                {/* Progress Actions */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={onBack}
                      className="text-gray-600 hover:bg-gray-50"
                    >
                      ← Back to Mapping
                    </Button>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {(() => {
                          const totalPatterns = correctionSummary.patterns.length;
                          const remainingCorrections = totalPatterns - pendingCorrections.size;
                          
                          if (allBulkCorrectionsComplete) {
                            return 'All corrections set!';
                          } else {
                            return `${remainingCorrections} corrections remaining`;
                          }
                        })()}
                      </span>
                      
                      <Button
                        onClick={handleProceedToIndividualCorrections}
                        disabled={!allBulkCorrectionsComplete}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {allBulkCorrectionsComplete ? 
                          'Continue to Data Validation →' : 
                          'Select corrections to continue'
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    );
  }

  // Render individual correction phase with proper validation
  if (currentPhase === 'individual-correction') {
    return (
      <DataCorrectionStep
        employees={currentEmployees}
        departments={departments}
        employeeGroups={employeeGroups}
        employeeTypes={employeeTypes}
        plandayApi={plandayApi}
        onComplete={(correctedEmployees) => {
          setCurrentEmployees(correctedEmployees);
          console.log('✅ Individual corrections complete, proceeding with', correctedEmployees.length, 'corrected employees');
          // ValidationAndCorrectionStep - calling onComplete with corrected employees
          onComplete(correctedEmployees); // Pass the corrected employees directly instead of relying on state
        }}
        onBack={() => {
          // Backward navigation: skip helpers and go directly to Column Mapping
          console.log('🔄 Individual correction back navigation - going directly to Column Mapping (skipping helpers)');
          onBack();
        }}
        className={className}
      />
    );
  }

  return null;
};

export default ValidationAndCorrectionStep; 