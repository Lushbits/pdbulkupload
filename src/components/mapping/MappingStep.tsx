/**
 * Enhanced Mapping Step Component
 * Handles column mapping and bulk correction for name-to-ID conversion
 * Features:
 * - Enhanced auto-mapping for department/employee group name columns
 * - Integration with bulk correction system
 * - Live preview of mapping results
 * - Validation of mapped columns
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AUTO_MAPPING_RULES } from '../../constants';
import { ValidationService } from '../../services/mappingService';
import type { Employee, ColumnMapping, ExcelColumnMapping } from '../../types/planday';

interface MappingStepProps {
  employees: any[][]; // Raw Excel rows data
  headers: string[];
  initialColumnMappings?: ExcelColumnMapping[]; // Auto-mappings from Excel parser
  onComplete: (employees: Employee[], mappings: ColumnMapping) => void;
  onBack: () => void;
  className?: string;
}

interface ExcelColumn {
  name: string;
  index: number;
  sampleData: string[];
}

interface PlandayField {
  name: string;
  displayName: string;
  description?: string;
  isRequired: boolean;
  isReadOnly: boolean;
  isUnique: boolean;
  isCustom: boolean;
}

const MappingStep: React.FC<MappingStepProps> = ({
  employees,
  headers,
  initialColumnMappings,
  onComplete,
  onBack,
  className = ''
}) => {
  const [columnMappings, setColumnMappings] = useState<ColumnMapping>({});
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<{ [fieldName: string]: string }>({});

  // Prepare Excel columns with sample data
  const excelColumns = useMemo<ExcelColumn[]>(() => {
    return headers.map((header, index) => ({
      name: header,
      index,
      sampleData: employees.slice(0, 3).map(row => row[index] || '').filter(Boolean)
    }));
  }, [headers, employees]);

  // Prepare Planday fields
  const plandayFields = useMemo<PlandayField[]>(() => {
    const requiredFields = ValidationService.getRequiredFields();
    const customFields = ValidationService.getCustomFields();
    const optionalFieldsList = ['departments', 'employeeGroups', 'cellPhone', 'phone', 'hireDate', 'birthDate', 'street1', 'city', 'zip', 'gender', 'ssn', 'employeeId', 'payrollId', 'jobTitle'];

    console.log('🏗️ Building Planday fields for mapping:', {
      requiredFields,
      customFields,
      totalCustomFields: customFields.length
    });

    const fields: PlandayField[] = [];
    const processedFields = new Set<string>();

    // Add required fields
    requiredFields.forEach(fieldName => {
      if (!processedFields.has(fieldName)) {
        fields.push({
          name: fieldName,
          displayName: fieldName.replace(/([A-Z])/g, ' $1').trim(),
          isRequired: true,
          isReadOnly: ValidationService.isReadOnly(fieldName),
          isUnique: ValidationService.isUnique(fieldName),
          isCustom: false
        });
        processedFields.add(fieldName);
      }
    });

    // Add optional fields (only if not already in required)
    optionalFieldsList.forEach(fieldName => {
      if (!processedFields.has(fieldName)) {
        fields.push({
          name: fieldName,
          displayName: fieldName.replace(/([A-Z])/g, ' $1').trim(),
          isRequired: false,
          isReadOnly: ValidationService.isReadOnly(fieldName),
          isUnique: ValidationService.isUnique(fieldName),
          isCustom: false
        });
        processedFields.add(fieldName);
      }
    });

    // Add custom fields
    customFields.forEach(customField => {
      if (!processedFields.has(customField.name)) {
        console.log(`➕ Adding custom field: ${customField.name} -> "${customField.description}"`);
        fields.push({
          name: customField.name,
          displayName: customField.description || customField.name,
          description: customField.description,
          isRequired: ValidationService.isRequired(customField.name),
          isReadOnly: ValidationService.isReadOnly(customField.name),
          isUnique: ValidationService.isUnique(customField.name),
          isCustom: true
        });
        processedFields.add(customField.name);
      }
    });



    return fields;
  }, []);

  // Initialize column mappings from auto-mapping results
  useEffect(() => {
    if (initialColumnMappings && initialColumnMappings.length > 0 && plandayFields.length > 0) {
      const initialMappings: ColumnMapping = {};
      const availableFieldNames = new Set(plandayFields.map(f => f.name));
      
      initialColumnMappings.forEach(mapping => {
        if (mapping.isMapped && mapping.plandayField) {
          // Check if the field exists in our available fields
          if (availableFieldNames.has(mapping.plandayField as string)) {
            initialMappings[mapping.excelColumn] = mapping.plandayField as string;
          } else {
            console.warn(`Field "${mapping.plandayField}" not found in available fields. Skipping mapping for "${mapping.excelColumn}"`);
          }
        }
      });
      setColumnMappings(initialMappings);
    }
  }, [initialColumnMappings, plandayFields]);

  // Get available fields for dropdown (excluding already mapped fields)
  const getAvailableFields = (currentColumnName: string): PlandayField[] => {
    const currentMapping = columnMappings[currentColumnName];
    const mappedFields = new Set(Object.values(columnMappings).filter(Boolean));
    const customMappedFields = new Set(Object.keys(customValues));
    
    return plandayFields.filter(field => {
      // Include if not mapped in either regular or custom mappings, or if it's the current mapping
      return (!mappedFields.has(field.name) && !customMappedFields.has(field.name)) || field.name === currentMapping;
    });
  };

  // Get available fields for custom values (excluding already mapped fields)
  const getAvailableFieldsForCustom = (currentFieldName?: string): PlandayField[] => {
    const mappedFields = new Set(Object.values(columnMappings).filter(Boolean));
    const customMappedFields = new Set(Object.keys(customValues));
    
    return plandayFields.filter(field => {
      // Include if not mapped in either regular or custom mappings, or if it's the current custom mapping
      return (!mappedFields.has(field.name) && !customMappedFields.has(field.name)) || field.name === currentFieldName;
    });
  };

  // Get mapping status for visual feedback
  const getMappingStatus = (columnName: string) => {
    const mappedField = columnMappings[columnName];
    return mappedField ? 'mapped' : 'unmapped';
  };

  // Get unmapped required fields
  const unmappedRequiredFields = useMemo(() => {
    const requiredFields = ValidationService.getRequiredFields();
    const mappedFields = new Set(Object.values(columnMappings).filter(Boolean));
    const customMappedFields = new Set(Object.keys(customValues).filter(key => customValues[key].trim()));
    return requiredFields.filter(field => !mappedFields.has(field) && !customMappedFields.has(field));
  }, [columnMappings, customValues]);

  // Auto-detect mappings on mount (only if no initial mappings provided)
  useEffect(() => {
    // Only run auto-detection if no initial mappings were provided
    if (!initialColumnMappings || initialColumnMappings.length === 0) {
      const autoDetectedMappings: ColumnMapping = {};

      // Auto-detect mappings using fuzzy matching
      for (const [fieldName, patterns] of Object.entries(AUTO_MAPPING_RULES)) {
        const bestMatch = findBestColumnMatch(headers, patterns);
        if (bestMatch) {
          autoDetectedMappings[bestMatch] = fieldName;
        }
      }


      setColumnMappings(autoDetectedMappings);
    }
  }, [headers, initialColumnMappings]);

  // Validate mappings when they change
  useEffect(() => {
    validateMappings();
  }, [columnMappings]);

  /**
   * Find best matching column for a field using fuzzy matching
   */
  const findBestColumnMatch = (headers: string[], patterns: readonly string[]): string | null => {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase();
        
        // Exact match gets highest score
        if (normalizedHeader === normalizedPattern) {
          return header;
        }
        
        // Partial match scoring
        if (normalizedHeader.includes(normalizedPattern)) {
          const score = normalizedPattern.length / normalizedHeader.length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = header;
          }
        }
      }
    }

    return bestScore > 0.5 ? bestMatch : null;
  };

  /**
   * Apply column mappings to create Employee objects
   */
  const applyColumnMappings = (rawRows: any[][], mappings: ColumnMapping): Employee[] => {
    return rawRows.map((row, index) => {
      const employee: Partial<Employee> = {
        rowIndex: index + 1
      };

      // Convert array row to object using headers
      const rowObject = headers.reduce((obj, header, headerIndex) => {
        obj[header] = row[headerIndex];
        return obj;
      }, {} as any);

      // Map each field from Excel columns
      for (const [columnName, fieldName] of Object.entries(mappings)) {
        if (fieldName && rowObject[columnName] !== undefined) {
          employee[fieldName as keyof Employee] = rowObject[columnName];
        }
      }

      // Apply custom static values
      for (const [fieldName, staticValue] of Object.entries(customValues)) {
        if (staticValue.trim()) {
          employee[fieldName as keyof Employee] = staticValue.trim();
        }
      }

      return employee as Employee;
    });
  };

  /**
   * Validate current mappings
   */
  const validateMappings = () => {
    const errors: string[] = [];
    const requiredFields = ValidationService.getRequiredFields();
    const mappedFields = new Set(Object.values(columnMappings).filter(Boolean));
    const customMappedFields = new Set(Object.keys(customValues).filter(key => customValues[key].trim()));

    // Check required fields - they can be satisfied by either Excel mappings OR custom values
    for (const field of requiredFields) {
      if (!mappedFields.has(field) && !customMappedFields.has(field)) {
        errors.push(`${field} is required but not mapped`);
      }
    }

    setMappingErrors(errors);
  };

  /**
   * Handle dropdown change
   */
  const handleMappingChange = (columnName: string, fieldName: string) => {
    const newMappings = { ...columnMappings };
    
    if (fieldName === '') {
      // Clear mapping
      delete newMappings[columnName];
    } else {
      // Set new mapping
      newMappings[columnName] = fieldName;
    }
    
    setColumnMappings(newMappings);
  };

  /**
   * Handle custom value changes
   */
  const handleAddCustomValue = () => {
    const newFieldName = `custom_field_${Date.now()}`;
    setCustomValues(prev => ({
      ...prev,
      [newFieldName]: ''
    }));
  };

  const handleCustomFieldChange = (oldFieldName: string, newFieldName: string) => {
    if (newFieldName !== oldFieldName) {
      const newCustomValues = { ...customValues };
      const value = newCustomValues[oldFieldName];
      delete newCustomValues[oldFieldName];
      if (newFieldName.trim()) {
        newCustomValues[newFieldName] = value;
      }
      setCustomValues(newCustomValues);
    }
  };

  const handleCustomValueChange = (fieldName: string, value: string) => {
    setCustomValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleRemoveCustomValue = (fieldName: string) => {
    const newCustomValues = { ...customValues };
    delete newCustomValues[fieldName];
    setCustomValues(newCustomValues);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    if (mappingErrors.length === 0) {
      const mappedEmployees = applyColumnMappings(employees, columnMappings);
      onComplete(mappedEmployees, columnMappings);
    }
  };

  const mappedFieldsCount = Object.values(columnMappings).filter(Boolean).length;
  const customValuesCount = Object.entries(customValues).filter(([_, value]) => value.trim()).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Column Mapping</h2>
        <p className="text-gray-600 mt-2">
          Map your Excel columns to Planday fields using the dropdowns
        </p>
      </div>

      {/* Warning Bar for Unmapped Required Fields */}
      {unmappedRequiredFields.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Required fields not mapped
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>The following required Planday fields need to be mapped:</p>
                <ul className="list-disc list-inside mt-1">
                  {unmappedRequiredFields.map(field => (
                    <li key={field}><strong>{field.replace(/([A-Z])/g, ' $1').trim()}</strong></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Interface - Two Column Layout */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Map Excel Columns to Planday Fields
          </h3>
          
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-4 mb-4 pb-3 border-b border-gray-200">
            <div className="col-span-5">
              <h4 className="font-medium text-gray-700 flex items-center">
                📊 Excel Columns ({excelColumns.length})
              </h4>
            </div>
            <div className="col-span-2 text-center">
              <h4 className="font-medium text-gray-500">Mapping</h4>
            </div>
            <div className="col-span-5">
              <h4 className="font-medium text-gray-700 flex items-center">
                🎯 Planday Fields
              </h4>
            </div>
          </div>
          
          {/* Mapping Rows */}
          <div className="space-y-3">
            {excelColumns.map((column) => {
              const mappedField = columnMappings[column.name];
              const availableFields = getAvailableFields(column.name);
              const status = getMappingStatus(column.name);
              
              return (
                <div 
                  key={column.name}
                  className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg transition-colors hover:bg-gray-50"
                >
                  {/* Excel Column (Left) */}
                  <div className="col-span-5">
                    <div className={`p-3 rounded-lg border-2 ${
                      status === 'mapped' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="font-medium text-gray-900 flex items-center">
                        {column.name}
                        {status === 'mapped' && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                      </div>
                      {column.sampleData.length > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          Sample: {column.sampleData.slice(0, 2).join(', ')}
                          {column.sampleData.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow (Center) */}
                  <div className="col-span-2 flex justify-center">
                    <div className={`text-2xl font-bold ${
                      status === 'mapped' 
                        ? 'text-green-500' 
                        : 'text-gray-300'
                    }`}>
                      →
                    </div>
                  </div>

                  {/* Planday Field Dropdown (Right) */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <select
                        value={mappedField || ''}
                        onChange={(e) => handleMappingChange(column.name, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Planday field...</option>
                        
                        {/* Required Fields */}
                        <optgroup label="📍 Required Fields">
                          {availableFields
                            .filter(field => field.isRequired)
                            .map(field => (
                              <option key={field.name} value={field.name}>
                                {field.displayName}
                                {field.isUnique ? ' ⚡' : ''}
                                {field.isReadOnly ? ' 🔒' : ''}
                              </option>
                            ))
                          }
                        </optgroup>

                        {/* Optional Fields */}
                        <optgroup label="⚪ Optional Fields">
                          {availableFields
                            .filter(field => !field.isRequired && !field.isCustom)
                            .map(field => (
                              <option key={field.name} value={field.name}>
                                {field.displayName}
                                {field.isUnique ? ' ⚡' : ''}
                                {field.isReadOnly ? ' 🔒' : ''}
                              </option>
                            ))
                          }
                        </optgroup>

                        {/* Custom Fields */}
                        {availableFields.some(field => field.isCustom) && (
                          <optgroup label="✨ Custom Fields">
                            {availableFields
                              .filter(field => field.isCustom)
                              .map(field => (
                                <option key={field.name} value={field.name}>
                                  {field.displayName}
                                  {field.isUnique ? ' ⚡' : ''}
                                  {field.isReadOnly ? ' 🔒' : ''}
                                </option>
                              ))
                            }
                          </optgroup>
                        )}
                      </select>
                      
                      {/* Checkmark when mapped */}
                      {status === 'mapped' && (
                        <div className="flex-shrink-0 text-green-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Field description */}
                    {mappedField && (
                      <div className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const field = plandayFields.find(f => f.name === mappedField);
                          const badges = [];
                          if (field?.isRequired) badges.push('Required');
                          if (field?.isUnique) badges.push('Must be unique');
                          if (field?.isReadOnly) badges.push('Read-only');
                          if (field?.isCustom) badges.push('Custom field');
                          return badges.length > 0 ? badges.join(' • ') : '';
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Custom Values Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Custom Values
              </h3>
              <p className="text-sm text-gray-600">
                Set the same value for ALL employees in a specific field (e.g., all employees get "Male" for gender)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleAddCustomValue}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              + Add Custom Value
            </Button>
          </div>

          {Object.keys(customValues).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No custom values added yet.</p>
              <p className="text-sm">Click "Add Custom Value" to set static values for missing fields.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(customValues).map(([fieldName, value]) => {
                const availableFields = getAvailableFieldsForCustom(fieldName);
                
                return (
                  <div 
                    key={fieldName}
                    className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg transition-colors hover:bg-gray-50"
                  >
                    {/* Custom Field Name & Value (Left) */}
                    <div className="col-span-5">
                      <div className={`p-3 rounded-lg border-2 ${
                        value.trim() && availableFields.some(f => f.name === fieldName)
                          ? 'bg-purple-50 border-purple-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleCustomValueChange(fieldName, e.target.value)}
                            placeholder="Static value (e.g., Male, Kitchen, Manager)"
                            className="w-full text-lg font-medium bg-transparent border-none outline-none placeholder-gray-400"
                          />
                          <div className="text-xs text-gray-500">
                            This value will be applied to ALL employees
                          </div>
                        </div>
                        {value.trim() && (
                          <div className="text-xs text-purple-600 mt-2 flex items-center">
                            <span className="mr-1">🔧</span>
                            All employees will get: "<strong>{value}</strong>"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow (Center) */}
                    <div className="col-span-2 flex justify-center">
                      <div className={`text-2xl font-bold ${
                        value.trim() && availableFields.some(f => f.name === fieldName)
                          ? 'text-purple-500' 
                          : 'text-gray-300'
                      }`}>
                        →
                      </div>
                    </div>

                    {/* Planday Field Dropdown (Right) */}
                    <div className="col-span-4">
                      <select
                        value={fieldName}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleCustomFieldChange(fieldName, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Planday field...</option>
                        
                        {/* Required Fields */}
                        <optgroup label="📍 Required Fields">
                          {availableFields
                            .filter(field => field.isRequired)
                            .map(field => (
                              <option key={field.name} value={field.name}>
                                {field.displayName}
                                {field.isUnique ? ' ⚡' : ''}
                                {field.isReadOnly ? ' 🔒' : ''}
                              </option>
                            ))
                          }
                        </optgroup>

                        {/* Optional Fields */}
                        <optgroup label="⚪ Optional Fields">
                          {availableFields
                            .filter(field => !field.isRequired && !field.isCustom)
                            .map(field => (
                              <option key={field.name} value={field.name}>
                                {field.displayName}
                                {field.isUnique ? ' ⚡' : ''}
                                {field.isReadOnly ? ' 🔒' : ''}
                              </option>
                            ))
                          }
                        </optgroup>

                        {/* Custom Fields */}
                        {availableFields.some(field => field.isCustom) && (
                          <optgroup label="✨ Custom Fields">
                            {availableFields
                              .filter(field => field.isCustom)
                              .map(field => (
                                <option key={field.name} value={field.name}>
                                  {field.displayName}
                                  {field.isUnique ? ' ⚡' : ''}
                                  {field.isReadOnly ? ' 🔒' : ''}
                                </option>
                              ))
                            }
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => handleRemoveCustomValue(fieldName)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Remove custom value"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={onBack}
            className="text-gray-600 hover:bg-gray-50"
          >
            ← Back to Upload
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {unmappedRequiredFields.length === 0 ? 
                `${mappedFieldsCount} Excel columns + ${customValuesCount} custom values mapped` :
                `${unmappedRequiredFields.length} required fields missing`
              }
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={unmappedRequiredFields.length > 0}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
            >
              Continue to Validation →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MappingStep; 