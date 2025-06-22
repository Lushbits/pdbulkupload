/**
 * Mandatory Correction Step Component
 * Detects invalid department/employee group names that don't exist in Planday
 * and REQUIRES users to map them to valid options before proceeding
 */

import React, { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import { MappingUtils, type ErrorPattern, type BulkCorrectionSummary } from '../../services/mappingService';

interface BulkCorrectionStepProps {
  employees: any[];
  departments: any[]; // Planday departments data
  employeeGroups: any[]; // Planday employee groups data
  onCorrection: (correctedEmployees: any[]) => void;
  onSkip: () => void; // Now only used for "back" navigation
  className?: string;
}

interface CorrectionCardProps {
  pattern: ErrorPattern;
  onCorrect: (pattern: ErrorPattern, newValue: string) => void;
  validOptions: Array<{id: number, name: string}>;
  isResolved: boolean;
}

const CorrectionCard: React.FC<CorrectionCardProps> = ({ pattern, onCorrect, validOptions, isResolved }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [pendingSelection, setPendingSelection] = useState<string>(''); // New state for pending selection

  // Debug logging
  console.log(`🔍 CorrectionCard render for "${pattern.invalidName}":`, {
    isResolved,
    selectedOption,
    pendingSelection,
    validOptionsCount: validOptions.length
  });

  // Format confidence percentage for display
  const confidencePercent = Math.round(pattern.confidence * 100);

  const handleSuggestedCorrection = () => {
    if (pattern.suggestion) {
      onCorrect(pattern, pattern.suggestion);
    }
  };

  const handleDropdownSelection = (value: string) => {
    console.log(`🔍 Dropdown selection for "${pattern.invalidName}":`, value);
    // Just set the pending selection, don't apply immediately
    if (value) {
      setPendingSelection(value);
      // Keep the dropdown showing the selected value
      setSelectedOption(value);
      console.log(`✅ Set pending selection: "${value}"`);
    }
  };

  const handleApplySelection = () => {
    if (pendingSelection) {
      onCorrect(pattern, pendingSelection);
      setPendingSelection('');
      setSelectedOption('');
    }
  };

  const handleClearSelection = () => {
    setPendingSelection('');
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

  return (
    <Card className="mb-4 border-l-4 border-l-red-400">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600 capitalize">
                {pattern.field === 'employeeGroups' ? 'Employee Groups' : 'Departments'}
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

          {/* Expand/Collapse Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Hide Rows' : `Show ${pattern.count} Rows`}
          </Button>
        </div>

        {/* Correction Options */}
        <div className="space-y-3">
          {/* Suggested Option (Primary) */}
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
          
          {/* Alternative Options Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or choose a different {pattern.field === 'employeeGroups' ? 'employee group' : 'department'}:
              {pendingSelection && <span className="ml-2 text-green-600 font-medium">(Selected: {pendingSelection})</span>}
            </label>
            {/* Debug info for empty dropdown */}
            {validOptions.length === 0 && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ⚠️ No valid {pattern.field === 'employeeGroups' ? 'employee groups' : 'departments'} available.
                Check console for debugging info.
              </div>
            )}
            <select
              value={selectedOption}
              onChange={(e) => {
                console.log('🚨 SELECT CHANGE EVENT TRIGGERED:', e.target.value);
                handleDropdownSelection(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select valid option...</option>
              {validOptions.length === 0 ? (
                <option value="" disabled>No options available</option>
              ) : (
                validOptions
                  .filter(option => option.name !== pattern.suggestion) // Don't duplicate the suggestion
                  .map(option => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))
              )}
            </select>

            {/* Pending Selection Feedback */}
            {pendingSelection && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        Selected: "{pendingSelection}"
                      </div>
                      <div className="text-xs text-green-600">
                        Will map "{pattern.invalidName}" → "{pendingSelection}" in {pattern.count} rows
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleApplySelection}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearSelection}
                      className="text-xs px-3 py-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Row Details */}
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

const BulkCorrectionStep: React.FC<BulkCorrectionStepProps> = ({
  employees,
  departments,
  employeeGroups,
  onCorrection,
  onSkip,
  className = ''
}) => {
  const [correctionSummary, setCorrectionSummary] = useState<BulkCorrectionSummary | null>(null);
  const [resolvedPatterns, setResolvedPatterns] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEmployees, setCurrentEmployees] = useState(employees);
  const [correctionHistory, setCorrectionHistory] = useState<Array<{
    pattern: ErrorPattern;
    newValue: string;
    timestamp: Date;
  }>>([]);

  // Initialize MappingService and detect invalid names
  useEffect(() => {
    console.log('🔧 BulkCorrectionStep: Initializing with', departments.length, 'departments and', employeeGroups.length, 'employee groups');
    console.log('📊 BulkCorrectionStep: Processing', currentEmployees.length, 'employees');
    
    // First initialize the mapping service with Planday data
    MappingUtils.initialize(departments, employeeGroups);
    
    const summary = MappingUtils.detectCommonErrors(currentEmployees);
    console.log('🔍 BulkCorrectionStep: Detected', summary.totalErrors, 'errors in', summary.patterns.length, 'patterns');
    
    // Filter out already resolved patterns
    const unresolvedPatterns = summary.patterns.filter(
      pattern => !resolvedPatterns.has(`${pattern.field}:${pattern.invalidName}`)
    );
    
    console.log('⚠️ BulkCorrectionStep: Showing', unresolvedPatterns.length, 'unresolved patterns');
    
    setCorrectionSummary({
      ...summary,
      patterns: unresolvedPatterns
    });
  }, [currentEmployees, resolvedPatterns, departments, employeeGroups]);

  const handleMandatoryCorrection = (pattern: ErrorPattern, newValue: string) => {
    setIsProcessing(true);
    
    try {
      // Apply the mandatory correction
      const updatedEmployees = MappingUtils.applyBulkCorrection(currentEmployees, pattern, newValue);
      setCurrentEmployees(updatedEmployees);
      
      // Mark this pattern as resolved
      const patternKey = `${pattern.field}:${pattern.invalidName}`;
      setResolvedPatterns(prev => new Set([...prev, patternKey]));
      
      // Add to correction history
      setCorrectionHistory(prev => [...prev, {
        pattern,
        newValue,
        timestamp: new Date()
      }]);
      
      // Show success message
      console.log(`✅ Mapped "${pattern.invalidName}" to "${newValue}" in ${pattern.count} rows`);
      
    } catch (error) {
      console.error('Error applying mandatory correction:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToValidation = () => {
    onCorrection(currentEmployees);
  };

  const handleGoBack = () => {
    onSkip(); // Used for going back to column mapping
  };

  // Check if all invalid names have been resolved
  const canProceed = !correctionSummary || correctionSummary.patterns.length === 0;
  const remainingErrors = correctionSummary?.patterns.length || 0;

  // Loading state
  if (!correctionSummary) {
    return (
      <div className={`mandatory-correction-step ${className}`}>
        <Card className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing data for invalid names...</p>
        </Card>
      </div>
    );
  }

  // All invalid names have been resolved
  if (canProceed) {
    return (
      <div className={`mandatory-correction-step ${className}`}>
        <Card className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All Invalid Names Resolved
            </h3>
            <p className="text-gray-600 mb-4">
              Great! All department and employee group names now map to valid options in your Planday portal.
            </p>
            
            {correctionHistory.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Successfully mapped {correctionHistory.length} invalid names to valid Planday options
                </p>
              </div>
            )}
            
            <Button onClick={handleProceedToValidation} className="bg-green-600 hover:bg-green-700 text-white">
              Continue to Validation
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`mandatory-correction-step ${className}`}>
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Invalid Names Must Be Corrected
          </h3>
          <p className="text-gray-600 mb-4">
            These department/employee group names don't exist in your Planday portal and must be mapped to valid options.
          </p>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{remainingErrors}</div>
              <div className="text-sm text-red-600">Invalid Names</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{correctionSummary.affectedRows}</div>
              <div className="text-sm text-orange-600">Affected Rows</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{correctionHistory.length}</div>
              <div className="text-sm text-blue-600">Already Fixed</div>
            </div>
          </div>
          
          {correctionHistory.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                ✅ {correctionHistory.length} invalid names mapped successfully. 
                {remainingErrors} remaining to fix.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Correction Cards */}
      <div className="space-y-0">
        {correctionSummary.patterns.map(pattern => (
          <CorrectionCard
            key={`${pattern.field}:${pattern.invalidName}`}
            pattern={pattern}
            onCorrect={handleMandatoryCorrection}
            validOptions={MappingUtils.getAvailableOptions(pattern.field)}
            isResolved={resolvedPatterns.has(`${pattern.field}:${pattern.invalidName}`)}
          />
        ))}
      </div>

      {/* Mandatory Correction Footer */}
      <Card className="p-4 mt-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="text-sm text-gray-600">
            {!canProceed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-yellow-800 font-medium">
                    You must correct all invalid names before proceeding.
                  </span>
                </div>
                <div className="text-yellow-700 text-sm mt-1">
                  {remainingErrors} {remainingErrors === 1 ? 'item still needs' : 'items still need'} mapping to valid Planday options.
                </div>
              </div>
            )}
            Map all invalid names to valid options in your Planday portal to continue.
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="text-gray-600 hover:bg-gray-50"
            >
              ← Back to Mapping
            </Button>
            
            <Button
              onClick={handleProceedToValidation}
              disabled={!canProceed || isProcessing}
              className={`${
                canProceed 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!canProceed ? "Fix all invalid names to continue" : ""}
            >
              {isProcessing 
                ? 'Processing...' 
                : canProceed 
                  ? '✅ Continue to Validation'
                  : `Fix ${remainingErrors} remaining issues`
              }
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BulkCorrectionStep; 