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
  resolvedPatterns?: Set<string>;
  onPatternsResolved?: (patterns: Set<string>) => void;
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
    console.log('🚨 SELECT CHANGE EVENT TRIGGERED:', value);
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
  const [resolvedPatterns, setResolvedPatterns] = useState<Set<string>>(initialResolvedPatterns || new Set());
  const [currentEmployees, setCurrentEmployees] = useState(employees);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState<Map<string, string>>(new Map());
  
  // Date format modal state
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);
  const [ambiguousDateSamples, setAmbiguousDateSamples] = useState<string[]>([]);
  const [isCheckingDates, setIsCheckingDates] = useState(false);

  // Update currentEmployees when employees prop changes
  useEffect(() => {
    setCurrentEmployees(employees);
  }, [employees]);

  // Initialize and detect bulk correction patterns
  useEffect(() => {
    // ValidationAndCorrectionStep: Initializing with provided data
    
    // Reset DateParser for new validation session
    DateParser.resetUserDateFormat();
    
    // Additional debugging: test getAvailableOptions directly
    MappingUtils.initialize(departments, employeeGroups, employeeTypes);
    
    // Initialize mapping utils with provided data
    // const testDepartments = MappingUtils.getAvailableOptions('departments');
    // const testEmployeeGroups = MappingUtils.getAvailableOptions('employeeGroups');
    
    const summary = MappingUtils.detectCommonErrors(employees);
    // Detecting error patterns for bulk correction
    
    // Filter out patterns that are already resolved (either in state or not present in current data)
    const unresolvedPatterns = summary.patterns.filter(pattern => {
      const patternKey = `${pattern.field}:${pattern.invalidName}`;
      const isInResolvedState = resolvedPatterns.has(patternKey);
      
      // If it's already in resolved state, skip it
      if (isInResolvedState) {
        // Pattern already resolved
        return false;
      }
      
      return true;
    });
    
    // Update resolved patterns based on what's actually missing from the data
    // This ensures that if corrections were applied previously, they stay resolved
    const updatedResolvedPatterns = new Set(resolvedPatterns);
    summary.patterns.forEach(pattern => {
      const patternKey = `${pattern.field}:${pattern.invalidName}`;
      // If the pattern was detected but the count is now 0 or very low, mark as resolved
      if (pattern.count === 0) {
        updatedResolvedPatterns.add(patternKey);
        // Auto-marking as resolved (no occurrences)
      }
    });
    
    if (updatedResolvedPatterns.size !== resolvedPatterns.size) {
      setResolvedPatterns(updatedResolvedPatterns);
      onPatternsResolved?.(updatedResolvedPatterns);
    }
    
    // Processing unresolved patterns for correction
    
    setCorrectionSummary({
      ...summary,
      patterns: unresolvedPatterns
    });

    // If no bulk corrections needed, we'll handle date checking when user clicks continue
    if (unresolvedPatterns.length === 0) {
      // No patterns to correct - user can proceed when ready
      console.log('📋 No bulk corrections needed');
    }
  }, [employees, resolvedPatterns, departments, employeeGroups, employeeTypes]);

  // Handle pending correction selection
  const handlePendingCorrection = (pattern: ErrorPattern, newValue: string) => {
    const patternKey = `${pattern.field}:${pattern.invalidName}`;
    
    if (newValue) {
      // Setting pending correction
      setPendingCorrections(prev => new Map(prev.set(patternKey, newValue)));
    } else {
      // Clearing pending correction
      setPendingCorrections(prev => {
        const newMap = new Map(prev);
        newMap.delete(patternKey);
        return newMap;
      });
    }
  };



  // Check if all bulk corrections are complete (either resolved or have pending corrections)
  const allBulkCorrectionsComplete = useMemo(() => {
    return correctionSummary?.patterns.every(pattern => {
      const patternKey = `${pattern.field}:${pattern.invalidName}`;
      return resolvedPatterns.has(patternKey) || pendingCorrections.has(patternKey);
    }) ?? true;
  }, [correctionSummary, resolvedPatterns, pendingCorrections]);



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
      
      setShowDateFormatModal(false);
      setAmbiguousDateSamples([]);
      
      // Continue to individual corrections after date format is resolved
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
    // If there are pending corrections, apply them first and wait for completion
    if (pendingCorrections.size > 0) {
      await new Promise<void>((resolve) => {
        setIsProcessing(true);
        // Applying pending corrections
        
        try {
          let updatedEmployees = currentEmployees;
          const newResolvedPatterns = new Set(resolvedPatterns);
          
          // Apply each pending correction
          for (const [patternKey, newValue] of pendingCorrections.entries()) {
            const pattern = correctionSummary?.patterns.find(p => 
              `${p.field}:${p.invalidName}` === patternKey
            );
            
            if (pattern) {
              updatedEmployees = MappingUtils.applyBulkCorrection(updatedEmployees, pattern, newValue);
              newResolvedPatterns.add(patternKey);
              // Applied correction to rows
            }
          }
          
          setCurrentEmployees(updatedEmployees);
          setResolvedPatterns(newResolvedPatterns);
          onPatternsResolved?.(newResolvedPatterns);
          setPendingCorrections(new Map()); // Clear all pending corrections
          
          // Successfully applied all pending corrections
          resolve();
        } catch (error) {
          console.error('❌ Error applying pending corrections:', error);
          resolve();
        } finally {
          setIsProcessing(false);
        }
      });
    }
    
    // Check for ambiguous dates in mapped date fields BEFORE proceeding to validation
    setIsCheckingDates(true);
    const ambiguousDates = checkForAmbiguousDatesInMappedFields(currentEmployees);
    setIsCheckingDates(false);
    
    if (ambiguousDates.length > 0) {
      // Found ambiguous dates - show modal for user to choose format
      console.log(`📅 Found ${ambiguousDates.length} ambiguous dates, showing format selection modal`);
      setAmbiguousDateSamples(ambiguousDates);
      setShowDateFormatModal(true);
      return; // Don't proceed until user selects format
    }
    
    // No ambiguous dates or format already resolved - proceed to individual corrections
    console.log('📅 No ambiguous dates found, proceeding to individual corrections');
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
                {resolvedPatterns.size} of {correctionSummary.patterns.length} fixed
              </div>
            </div>

            {correctionSummary.patterns.length === 0 ? (
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
                      isResolved={resolvedPatterns.has(patternKey)}
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
                        {allBulkCorrectionsComplete ? 
                          (pendingCorrections.size > 0 ? 
                            `${pendingCorrections.size} corrections ready to apply` :
                            'All corrections complete!'
                          ) :
                          `${correctionSummary.patterns.length - resolvedPatterns.size - pendingCorrections.size} corrections remaining`
                        }
                      </span>
                      
                      <Button
                        onClick={handleProceedToIndividualCorrections}
                        disabled={!allBulkCorrectionsComplete || isProcessing || isCheckingDates}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isCheckingDates ? 
                          'Checking date formats...' :
                          allBulkCorrectionsComplete ? 
                            (pendingCorrections.size > 0 ? 
                              'Apply & Continue →' :
                              'Continue to Data Validation →'
                            ) : 
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
        onBack={() => setCurrentPhase('bulk-correction')}
        className={className}
      />
    );
  }

  return null;
};

export default ValidationAndCorrectionStep; 