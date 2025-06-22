/**
 * Data Correction Step Component
 * Provides editable data grid for final employee record corrections
 * Features:
 * - Inline cell editing with validation
 * - Real-time validation feedback
 * - Bulk edit capabilities
 * - Smart suggestions for common fixes
 * - Session persistence during editing
 * - Keyboard navigation support
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button, Input, Card } from '../ui';
import { ValidationService } from '../../services/mappingService';
import { VALIDATION_CONFIG } from '../../constants';

import type { 
  Employee, 
  ValidationError, 
  PlandayDepartment,
  PlandayEmployeeGroup,
  PlandayEmployeeResponse
} from '../../types/planday';
import type { UsePlandayApiReturn } from '../../hooks/usePlandayApi';

interface DataCorrectionStepProps {
  employees: Employee[];
  departments: PlandayDepartment[];
  employeeGroups: PlandayEmployeeGroup[];
  plandayApi: UsePlandayApiReturn;
  onComplete: (correctedEmployees: Employee[]) => void;
  onBack: () => void;
  className?: string;
}

interface EditingCell {
  rowIndex: number;
  field: keyof Employee;
  value: string;
}

// Removed unused interface CellValidation

/**
 * Data Correction Step Component
 */
export const DataCorrectionStep: React.FC<DataCorrectionStepProps> = ({
  employees: initialEmployees,
  departments,
  employeeGroups,
  plandayApi,
  onComplete,
  onBack,
  className = ''
}) => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [validationErrors, setValidationErrors] = useState<Map<string, ValidationError[]>>(new Map());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkEditField, setBulkEditField] = useState<keyof Employee | ''>('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New state for duplicate checking
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [existingEmployees, setExistingEmployees] = useState<Map<string, PlandayEmployeeResponse>>(new Map());
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize mapping service with department and employee group data
  useEffect(() => {
    // Note: MappingService doesn't have setDepartments/setEmployeeGroups methods
    // This will be handled directly in validation
    console.log('DataCorrectionStep initialized with:', { 
      departments: departments.length, 
      employeeGroups: employeeGroups.length 
    });
  }, [departments, employeeGroups]);

  // Check for existing employees with duplicate emails on component initialization
  useEffect(() => {
    const checkForExistingEmployees = async () => {
      try {
        setIsCheckingDuplicates(true);
        console.log('🔍 Checking for existing employees with duplicate emails...');
        
        // Extract email addresses from employees
        const emailAddresses = employees
          .map(emp => emp.userName)
          .filter(email => email && email.trim() !== '')
          .map(email => email!.toLowerCase().trim());
        
        if (emailAddresses.length === 0) {
          console.log('⚠️ No email addresses found to check for duplicates');
          setIsCheckingDuplicates(false);
          return;
        }
        
        // Check for existing employees
        const existingEmps = await plandayApi.checkExistingEmployeesByEmail(emailAddresses);
        setExistingEmployees(existingEmps);
        
        if (existingEmps.size > 0) {
          console.log(`⚠️ Found ${existingEmps.size} existing employees with matching emails`);
        } else {
          console.log('✅ No existing employees found with matching emails');
        }
        
      } catch (error) {
        console.error('❌ Failed to check for existing employees:', error);
        // Don't block validation if duplicate check fails - just log and continue
      } finally {
        setIsCheckingDuplicates(false);
      }
    };

    // Only check if we have authentication and employees
    if (plandayApi.isAuthenticated && employees.length > 0) {
      checkForExistingEmployees();
    }
  }, [employees.length]); // Only run when employees change, not on every re-render

  // Validate all employees on component mount and when data changes
  useEffect(() => {
    console.log('🔄 Re-running validation due to data changes');
    validateAllEmployees();
  }, [employees, existingEmployees]); // Re-validate when existing employees data changes

  // Focus input when editing cell
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  /**
   * Validate all employees and update error state
   */
  const validateAllEmployees = useCallback(() => {
    const newValidationErrors = new Map<string, ValidationError[]>();

    employees.forEach((employee, index) => {
      const errors: ValidationError[] = [];
      const employeeKey = `employee-${index}`;

      // Use dynamic required field validation from ValidationService
      const requiredFieldErrors = ValidationService.validateRequiredFields(employee, index);
      errors.push(...requiredFieldErrors);

      // Email validation
      if (employee.userName && !VALIDATION_CONFIG.EMAIL_PATTERN.test(employee.userName)) {
        errors.push({
          field: 'userName',
          value: employee.userName,
          message: 'Invalid email format',
          rowIndex: index,
          severity: 'error'
        });
      }

      // Phone validation (if provided)
      if (employee.cellPhone && employee.cellPhone.trim() !== '') {
        const cleanPhone = employee.cellPhone.replace(VALIDATION_CONFIG.PHONE_CLEANUP_PATTERN, '');
        if (cleanPhone.length < 10) {
          errors.push({
            field: 'cellPhone',
            value: employee.cellPhone,
            message: 'Phone number too short',
            rowIndex: index,
            severity: 'warning'
          });
        }
      }

      // Date validation (if provided)
      if (employee.hireDate && employee.hireDate.trim() !== '') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(employee.hireDate)) {
          errors.push({
            field: 'hireDate',
            value: employee.hireDate,
            message: 'Date must be in YYYY-MM-DD format',
            rowIndex: index,
            severity: 'error'
          });
        }
      }

      // NOTE: Department/employee group validation is handled in the bulk correction phase
      // Individual validation should only check format/field-level issues, not name-to-ID mapping

      if (errors.length > 0) {
        newValidationErrors.set(employeeKey, errors);
      }
    });

    // Validate unique fields across all employees
    const uniqueFieldErrors = ValidationService.validateUniqueFields(employees);
    uniqueFieldErrors.forEach(error => {
      const employeeKey = `employee-${error.rowIndex}`;
      const existingErrors = newValidationErrors.get(employeeKey) || [];
      existingErrors.push(error);
      newValidationErrors.set(employeeKey, existingErrors);
    });

    // Validate against existing employees in Planday (duplicate checking)
    if (existingEmployees.size > 0) {
      console.log('🔍 Running duplicate validation against', existingEmployees.size, 'existing employees');
      const existingEmployeeErrors = ValidationService.validateExistingEmployees(employees, existingEmployees);
      console.log('🔍 Found', existingEmployeeErrors.length, 'duplicate validation errors');
      
      existingEmployeeErrors.forEach(error => {
        const employeeKey = `employee-${error.rowIndex}`;
        const existingErrors = newValidationErrors.get(employeeKey) || [];
        existingErrors.push(error);
        newValidationErrors.set(employeeKey, existingErrors);
        console.log('🔍 Added duplicate error for', employeeKey, ':', error.message);
      });
    }

    setValidationErrors(newValidationErrors);
  }, [employees, existingEmployees]);

  /**
   * Handle cell click to start editing
   */
  const handleCellClick = (rowIndex: number, field: keyof Employee) => {
    const employee = employees[rowIndex];
    setEditingCell({
      rowIndex,
      field,
      value: employee[field]?.toString() || ''
    });
  };

  /**
   * Handle cell value change during editing
   */
  const handleCellChange = (value: string) => {
    if (editingCell) {
      setEditingCell({
        ...editingCell,
        value
      });
    }
  };

  /**
   * Commit cell edit
   */
  const commitCellEdit = useCallback(() => {
    if (!editingCell) return;

    const { rowIndex, field, value } = editingCell;
    
    setEmployees(prev => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        [field]: value
      };
      return updated;
    });

    setEditingCell(null);
  }, [editingCell]);

  /**
   * Cancel cell edit
   */
  const cancelCellEdit = () => {
    setEditingCell(null);
  };

  /**
   * Handle keyboard navigation in grid
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editingCell) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        commitCellEdit();
        break;
      case 'Escape':
        e.preventDefault();
        cancelCellEdit();
        break;
      case 'Tab':
        e.preventDefault();
        commitCellEdit();
        // Move to next cell logic could be added here
        break;
    }
  };

  /**
   * Toggle row selection for bulk operations
   */
  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  /**
   * Select all rows
   */
  const selectAllRows = () => {
    const allIndices = employees.map((_, index) => index);
    setSelectedRows(new Set(allIndices));
  };

  /**
   * Clear row selection
   */
  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  /**
   * Mark duplicate employees to be skipped (excluded from upload)
   */
  const handleSkipDuplicates = useCallback(() => {
    const duplicateEmails = new Set(Array.from(existingEmployees.keys()));
    const updatedEmployees = employees.map(emp => {
      const email = emp.userName?.toLowerCase().trim();
      if (email && duplicateEmails.has(email)) {
        return { ...emp, _skipUpload: true }; // Add flag to skip this employee
      }
      return emp;
    });
    
    console.log(`⏭️ Marking ${Array.from(duplicateEmails).length} employees to be skipped`);
    setEmployees(updatedEmployees);
    
    // Clear existing employees state since duplicates are now marked to skip
    setExistingEmployees(new Map());
  }, [employees, existingEmployees]);

  /**
   * Apply bulk edit to selected rows
   */
  const applyBulkEdit = async () => {
    if (!bulkEditField || bulkEditValue.trim() === '' || selectedRows.size === 0) return;

    setIsProcessing(true);

    try {
      setEmployees(prev => {
        const updated = [...prev];
        selectedRows.forEach(rowIndex => {
          updated[rowIndex] = {
            ...updated[rowIndex],
            [bulkEditField]: bulkEditValue
          };
        });
        return updated;
      });

      // Clear bulk edit form
      setBulkEditField('');
      setBulkEditValue('');
      clearSelection();

      console.log(`✅ Applied bulk edit to ${selectedRows.size} rows`);
    } catch (error) {
      console.error('Error applying bulk edit:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Smart suggestions function removed for now - will be added in Phase 3.2

  /**
   * Filter employees based on search
   */
  const filteredEmployees = employees.filter(employee => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.userName?.toLowerCase().includes(searchLower) ||
      employee.departments?.toLowerCase().includes(searchLower) ||
      employee.employeeGroups?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate validation statistics
  const totalErrors = Array.from(validationErrors.values()).reduce(
    (sum, errors) => sum + errors.filter(e => e.severity === 'error').length, 
    0
  );
  const totalWarnings = Array.from(validationErrors.values()).reduce(
    (sum, errors) => sum + errors.filter(e => e.severity === 'warning').length, 
    0
  );
  
  // Calculate employees with no errors (not just no validation entries)
  const employeesWithErrors = new Set<number>();
  const skippedEmployees = new Set<number>();
  
  employees.forEach((emp, index) => {
    if (emp._skipUpload) {
      skippedEmployees.add(index);
    }
  });
  
  validationErrors.forEach((errors, employeeKey) => {
    if (errors.some(e => e.severity === 'error')) {
      const rowIndex = parseInt(employeeKey.split('-')[1]);
      employeesWithErrors.add(rowIndex);
    }
  });
  
  const validEmployees = employees.length - employeesWithErrors.size - skippedEmployees.size;
  const willBeUploaded = employees.length - skippedEmployees.size;

  // Debug logging
  console.log('🔍 Validation Debug:', {
    totalEmployees: employees.length,
    validationErrorsMapSize: validationErrors.size,
    totalErrors,
    totalWarnings,
    validEmployees,
    employeesWithErrors: Array.from(employeesWithErrors),
    existingEmployeesCount: existingEmployees.size,
    isCheckingDuplicates,
    validationErrorsMap: Object.fromEntries(validationErrors.entries()),
    existingEmployees: Array.from(existingEmployees.entries())
  });

  // Get all fields that actually have data (dynamically determined from employee data)
  const editableFields = useMemo(() => {
    const fieldSet = new Set<string>();
    employees.forEach(emp => {
      // Define internal fields that should be excluded
      const internalFields = new Set(['rowIndex', 'originalData', '__internal_id', '_id', '_bulkCorrected']);
      
      Object.keys(emp).forEach(key => {
        if (!internalFields.has(key) && emp[key as keyof Employee] != null && emp[key as keyof Employee] !== '') {
          fieldSet.add(key);
        }
      });
    });
    
    // Sort fields with important ones first
    const importantFields = ['firstName', 'lastName', 'userName', 'email'];
    const otherFields = Array.from(fieldSet).filter(field => !importantFields.includes(field)).sort();
    
    return [...importantFields.filter(field => fieldSet.has(field)), ...otherFields] as (keyof Employee)[];
  }, [employees]);

  // Helper function to get display name for field
  const getFieldDisplayName = (fieldName: string): string => {
    // Check if it's a custom field
    const customFields = ValidationService.getCustomFields();
    const customField = customFields.find(f => f.name === fieldName);
    
    if (customField && customField.description) {
      return customField.description;
    }
    
    // For standard fields, convert camelCase to Title Case
    return fieldName.replace(/([A-Z])/g, ' $1').trim();
  };

  /**
   * Render validation status for a cell
   */
  const renderCellValidation = (rowIndex: number, field: keyof Employee) => {
    const employeeKey = `employee-${rowIndex}`;
    const errors = validationErrors.get(employeeKey) || [];
    const fieldErrors = errors.filter(e => e.field === field);
    
    if (fieldErrors.length === 0) return null;

    const hasError = fieldErrors.some(e => e.severity === 'error');
    const hasWarning = fieldErrors.some(e => e.severity === 'warning');

    return (
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
        hasError ? 'bg-red-500' : hasWarning ? 'bg-yellow-500' : ''
      }`} title={fieldErrors.map(e => e.message).join(', ')} />
    );
  };

  return (
    <div className={`data-correction-step ${className}`}>
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            📝 Final Data Review & Correction
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-600">{validEmployees}</span> valid • 
              <span className="font-medium text-red-600 ml-1">{totalErrors}</span> errors • 
              <span className="font-medium text-yellow-600 ml-1">{totalWarnings}</span> warnings
              {skippedEmployees.size > 0 && (
                <>
                  {' • '}
                  <span className="font-medium text-blue-600">{skippedEmployees.size}</span> skipped
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          Review and edit individual employee records. Click any cell to edit inline. 
          All errors must be resolved before proceeding to upload.
        </p>

        {/* Duplicate Checking Status */}
        {isCheckingDuplicates && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-800 font-medium">
                🔍 Checking for existing employees in Planday...
              </span>
            </div>
          </div>
        )}

        {/* Duplicate Check Results */}
        {!isCheckingDuplicates && existingEmployees.size > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <span className="text-yellow-800 font-medium">
                  Found {existingEmployees.size} employees that already exist in Planday
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipDuplicates}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                ⏭️ Skip Duplicates
              </Button>
            </div>
            <p className="text-yellow-700 text-sm mt-2">
              Click <strong>Skip Duplicates</strong> to exclude them from upload while keeping them visible for review.
            </p>
          </div>
        )}

        {/* Show skipped employees status */}
        {skippedEmployees.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <span className="text-blue-600 text-lg mr-2">ℹ️</span>
              <span className="text-blue-800 font-medium">
                {skippedEmployees.size} employees marked to skip upload
              </span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              These employees are visible below with blue highlighting but will not be uploaded to Planday.
            </p>
          </div>
        )}

        {!isCheckingDuplicates && existingEmployees.size === 0 && employees.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <span className="text-green-600 text-lg mr-2">✅</span>
              <span className="text-green-800 font-medium">
                No duplicate employees found in Planday
              </span>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search employees..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          
          {/* Row Selection Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={selectAllRows}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
            <span className="text-sm text-gray-600">
              {selectedRows.size} selected
            </span>
          </div>
        </div>

        {/* Bulk Edit Panel */}
        {selectedRows.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-3">
              Bulk Edit ({selectedRows.size} rows selected)
            </h4>
            <div className="flex flex-col md:flex-row gap-3">
              <select
                value={bulkEditField}
                onChange={(e) => setBulkEditField(e.target.value as keyof Employee)}
                className="px-3 py-2 border border-blue-300 rounded-md text-sm"
              >
                <option value="">Select field...</option>
                                 {editableFields.map(field => (
                   <option key={field} value={field}>
                     {getFieldDisplayName(field.toString())}
                   </option>
                 ))}
              </select>
              <Input
                placeholder="Enter new value..."
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                size="sm"
                className="flex-1"
              />
              <Button
                onClick={applyBulkEdit}
                disabled={!bulkEditField || !bulkEditValue.trim() || isProcessing}
                size="sm"
                loading={isProcessing}
              >
                Apply to Selected
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Data Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => e.target.checked ? selectAllRows() : clearSelection()}
                    checked={selectedRows.size === employees.length && employees.length > 0}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row
                </th>
                                                 {editableFields.map(field => (
                  <th key={field} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                    {getFieldDisplayName(field.toString())}
                    {ValidationService.isRequired(field.toString()) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {ValidationService.isReadOnly(field.toString()) && (
                      <span className="text-blue-500 ml-1" title="Read-only field">🔒</span>
                    )}
                    {ValidationService.isUnique(field.toString()) && (
                      <span className="text-orange-500 ml-1" title="Must be unique">⚡</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                                           {filteredEmployees.map((employee) => {
                const originalIndex = employees.indexOf(employee);
                const employeeKey = `employee-${originalIndex}`;
                const errors = validationErrors.get(employeeKey) || [];
                const hasErrors = errors.some(e => e.severity === 'error');
                const hasWarnings = errors.some(e => e.severity === 'warning');
                const isSkipped = employee._skipUpload;

                return (
                  <tr 
                    key={originalIndex} 
                    className={`hover:bg-gray-50 ${
                      isSkipped ? 'bg-blue-50 opacity-75 border-l-4 border-blue-400' : 
                      hasErrors ? 'bg-red-50' : 
                      hasWarnings ? 'bg-yellow-50' : ''
                    } ${selectedRows.has(originalIndex) ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(originalIndex)}
                        onChange={() => toggleRowSelection(originalIndex)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>{originalIndex + 1}</span>
                        {isSkipped && (
                          <span className="text-blue-600 font-medium text-xs bg-blue-100 px-2 py-1 rounded" title="This employee will be skipped during upload">
                            SKIP
                          </span>
                        )}
                      </div>
                    </td>
                    {editableFields.map(field => (
                      <td key={field} className="px-4 py-3 whitespace-nowrap relative">
                        {editingCell?.rowIndex === originalIndex && editingCell?.field === field ? (
                          <Input
                            ref={inputRef}
                            value={editingCell.value}
                            onChange={(e) => handleCellChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={commitCellEdit}
                            size="sm"
                            className="min-w-32"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(originalIndex, field)}
                            className="min-h-6 px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded border-2 border-transparent hover:border-blue-200 relative"
                            title="Click to edit"
                          >
                            {employee[field] || (
                              <span className="text-gray-400 italic">Click to add...</span>
                            )}
                            {renderCellValidation(originalIndex, field)}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Validation Summary */}
      {(totalErrors > 0 || totalWarnings > 0) && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚠️ Validation Issues
          </h3>
          <div className="space-y-2">
            {Array.from(validationErrors.entries()).map(([employeeKey, errors]) => {
              const rowIndex = parseInt(employeeKey.split('-')[1]);
              const employee = employees[rowIndex];
              
              return (
                <div key={employeeKey} className="border rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-900 mb-2">
                    Row {rowIndex + 1}: {employee.firstName} {employee.lastName}
                  </div>
                  <div className="space-y-1">
                    {errors.map((error, errorIndex) => (
                      <div
                        key={errorIndex}
                        className={`text-sm px-2 py-1 rounded ${
                          error.severity === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <strong>{error.field}:</strong> {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back to Bulk Correction
          </Button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {totalErrors > 0 && (
                <span className="text-red-600 font-medium">
                  {totalErrors} errors must be fixed before proceeding
                </span>
              )}
              {totalErrors === 0 && totalWarnings > 0 && (
                <span className="text-yellow-600">
                  {totalWarnings} warnings (can proceed)
                </span>
              )}
              {totalErrors === 0 && totalWarnings === 0 && (
                <span className="text-green-600 font-medium">
                  All data is valid ✓
                </span>
              )}
            </div>
            
            <Button
              onClick={() => {
                // Filter out employees marked to skip
                const employeesToUpload = employees.filter(emp => !emp._skipUpload);
                onComplete(employeesToUpload);
              }}
              disabled={totalErrors > 0 || willBeUploaded === 0}
              className={totalErrors === 0 && willBeUploaded > 0 ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {willBeUploaded === 0 ? 
                '❌ No employees to upload' : 
                totalErrors === 0 ? 
                  `✅ Proceed with ${willBeUploaded} employees` : 
                  `Fix ${totalErrors} errors first`
              }
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}; 