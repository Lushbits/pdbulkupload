/**
 * Mapping Service for Planday Name-to-ID Conversion
 * Handles intelligent mapping between human-readable names and Planday API IDs
 * Features:
 * - Bidirectional name ↔ ID mapping
 * - Fuzzy matching for typo detection
 * - Bulk error pattern detection
 * - Comma-separated value handling
 * - Case-insensitive matching
 * - Mixed name/ID input support
 */

import type {
  PlandayDepartment,
  PlandayEmployeeGroup,
  PlandayEmployeeType,
  ValidationError,
  PlandayFieldDefinitionsSchema,
  PlandayEmployeeCreateRequest
} from '../types/planday';

export interface MappingResult {
  ids: number[];
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ErrorPattern {
  field: 'departments' | 'employeeGroups' | 'employeeTypes';
  invalidName: string;
  count: number;
  rows: number[];
  suggestion?: string;
  confidence: number; // 0-1, how confident we are in the suggestion
}

export interface BulkCorrectionSummary {
  totalErrors: number;
  patterns: ErrorPattern[];
  affectedRows: number;
  canBulkFix: number; // Number of errors that have good suggestions
}

export interface CustomFieldConversionResult {
  convertedValue: any;
  errors: ValidationError[];
  warnings: string[];
}

export interface CustomFieldInfo {
  fieldName: string;
  fieldType: CustomFieldType;
  description?: string;
  isRequired: boolean;
  enumValues?: string[]; // For dropdown/select fields
  enumOptions?: Array<{ value: any; label: string }>; // For more complex enums with labels
}

export type CustomFieldType = 
  | 'optionalString'
  | 'optionalBoolean' 
  | 'optionalNumeric'
  | 'optionalDate'
  | 'optionalImage'
  | 'optionalEnum' // New type for dropdown/select fields
  | 'unknown';

/**
 * Core Mapping Service Class
 */
export class MappingService {
  // Bidirectional maps for fast lookups
  private departmentsByName: Map<string, number> = new Map();
  private departmentsById: Map<number, string> = new Map();
  private employeeGroupsByName: Map<string, number> = new Map();
  private employeeGroupsById: Map<number, string> = new Map();
  private employeeTypesByName: Map<string, number> = new Map();
  private employeeTypesById: Map<number, string> = new Map();

  // Original data for reference (public for utility functions)
  public departments: PlandayDepartment[] = [];
  public employeeGroups: PlandayEmployeeGroup[] = [];
  public employeeTypes: PlandayEmployeeType[] = [];

  constructor() {}

  /**
   * Initialize the service with Planday department, employee group, and employee type data
   */
  initialize(departments: PlandayDepartment[], employeeGroups: PlandayEmployeeGroup[], employeeTypes: PlandayEmployeeType[] = []): void {
    // Store the original data
    this.departments = departments;
    this.employeeGroups = employeeGroups;
    this.employeeTypes = employeeTypes;

    // Clear previous data
    this.departmentsByName.clear();
    this.departmentsById.clear();
    this.employeeGroupsByName.clear();
    this.employeeGroupsById.clear();
    this.employeeTypesByName.clear();
    this.employeeTypesById.clear();

    // Build lookup maps for departments
    departments.forEach(dept => {
      if (dept && dept.name) {
        const normalizedName = this.normalizeName(dept.name);
        this.departmentsByName.set(normalizedName, dept.id);
        this.departmentsById.set(dept.id, dept.name);
      }
    });

    // Build lookup maps for employee groups
    employeeGroups.forEach(group => {
      if (group && group.name) {
        const normalizedName = this.normalizeName(group.name);
        this.employeeGroupsByName.set(normalizedName, group.id);
        this.employeeGroupsById.set(group.id, group.name);
      }
    });

    // Build lookup maps for employee types
    employeeTypes.forEach(type => {
      if (type && type.name) {
        const normalizedName = this.normalizeName(type.name);
        this.employeeTypesByName.set(normalizedName, type.id);
        this.employeeTypesById.set(type.id, type.name);
      }
    });
  }

  /**
   * Normalize names for consistent matching
   */
  private normalizeName(name: string): string {
    return name
      .toString()
      .trim()
      .toLowerCase()
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      // Remove special characters but keep spaces
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Resolve single employee type name to ID (no comma separation)
   */
  resolveEmployeeType(input: string): MappingResult {
    const result: MappingResult = {
      ids: [],
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!input || input.trim() === '') {
      return result;
    }

    // Employee types are single values only - no comma splitting
    const name = input.trim();
    const normalizedName = this.normalizeName(name);
    const availableNames = Array.from(this.employeeTypesByName.keys());

    // 1. Try exact match (case-insensitive)
    const id = this.employeeTypesByName.get(normalizedName);
    if (id) {
      result.ids.push(id);
      return result;
    }

    // 2. Try numeric ID as fallback
    const numericId = parseInt(name);
    if (!isNaN(numericId) && this.employeeTypesById.has(numericId)) {
      result.ids.push(numericId);
      result.warnings.push(`Using numeric ID ${numericId} for "${name}"`);
      return result;
    }

    // 3. Try fuzzy matching for typos
    const suggestion = this.findBestMatch(normalizedName, availableNames);
    if (suggestion.match && suggestion.confidence > 0.7) {
      result.errors.push(`"${name}" not found. Did you mean "${this.getOriginalEmployeeTypeName(suggestion.match)}"?`);
      result.suggestions.push(suggestion.match);
    } else if (suggestion.match && suggestion.confidence > 0.4) {
      result.errors.push(`"${name}" not found. Possible matches: ${this.getTopMatches(normalizedName, availableNames, 3).map(m => this.getOriginalEmployeeTypeName(m)).join(', ')}`);
    } else {
      result.errors.push(`"${name}" not found in available employee types`);
    }

    return result;
  }

  /**
   * Resolve comma-separated names to IDs with comprehensive error handling
   */
  resolveNames(input: string, type: 'departments' | 'employeeGroups'): MappingResult {
    const result: MappingResult = {
      ids: [],
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!input || input.trim() === '') {
      return result;
    }

    // Split comma-separated values and clean them
    const names = input
      .split(',')
      .map(name => name.trim())
      .filter(name => name !== '');

    const mapping = type === 'departments' 
      ? this.departmentsByName 
      : this.employeeGroupsByName;

    const availableNames = Array.from(mapping.keys());
    const processedNames = new Set<string>(); // Track duplicates

    names.forEach(name => {
      // Skip if we've already processed this name (handle duplicates)
      const normalizedName = this.normalizeName(name);
      if (processedNames.has(normalizedName)) {
        result.warnings.push(`Duplicate entry "${name}" removed`);
        return;
      }
      processedNames.add(normalizedName);

      // 1. Try exact match (case-insensitive)
      const id = mapping.get(normalizedName);
      if (id) {
        result.ids.push(id);
        return;
      }

      // 2. Try numeric ID as fallback
      const numericId = parseInt(name);
      if (!isNaN(numericId) && this.isValidId(numericId, type)) {
        result.ids.push(numericId);
        result.warnings.push(`Using numeric ID ${numericId} for "${name}"`);
        return;
      }

      // 3. Try fuzzy matching for typos
      const suggestion = this.findBestMatch(normalizedName, availableNames);
      if (suggestion.match && suggestion.confidence > 0.7) {
        result.errors.push(`"${name}" not found. Did you mean "${this.getOriginalName(suggestion.match, type)}"?`);
        result.suggestions.push(suggestion.match);
      } else if (suggestion.match && suggestion.confidence > 0.4) {
        result.errors.push(`"${name}" not found. Possible matches: ${this.getTopMatches(normalizedName, availableNames, 3).map(m => this.getOriginalName(m, type)).join(', ')}`);
      } else {
        result.errors.push(`"${name}" not found in available ${type}`);
      }
    });

    return result;
  }

  /**
   * Check if a numeric ID is valid for the given type
   */
  private isValidId(id: number, type: 'departments' | 'employeeGroups'): boolean {
    return type === 'departments' 
      ? this.departmentsById.has(id)
      : this.employeeGroupsById.has(id);
  }

  /**
   * Get original employee type name from normalized name
   */
  private getOriginalEmployeeTypeName(normalizedName: string): string {
    const id = this.employeeTypesByName.get(normalizedName);
    if (id) {
      return this.employeeTypesById.get(id) || normalizedName;
    }
    return normalizedName;
  }

  /**
   * Get original name from normalized name
   */
  private getOriginalName(normalizedName: string, type: 'departments' | 'employeeGroups'): string {
    const mapping = type === 'departments' 
      ? this.departmentsByName 
      : this.employeeGroupsByName;
    
    const id = mapping.get(normalizedName);
    if (id) {
      return type === 'departments'
        ? this.departmentsById.get(id) || normalizedName
        : this.employeeGroupsById.get(id) || normalizedName;
    }
    return normalizedName;
  }

  /**
   * Find best fuzzy match using Levenshtein distance
   */
  private findBestMatch(input: string, candidates: string[]): { match: string | null; confidence: number } {
    if (candidates.length === 0) {
      return { match: null, confidence: 0 };
    }

         let bestMatch = null;
     let bestConfidence = 0;

     for (const candidate of candidates) {
       const distance = this.levenshteinDistance(input, candidate);
       const maxLength = Math.max(input.length, candidate.length);
       const confidence = 1 - (distance / maxLength);

       if (confidence > bestConfidence) {
         bestMatch = candidate;
         bestConfidence = confidence;
       }
     }

    return {
      match: bestMatch,
      confidence: bestConfidence
    };
  }

  /**
   * Get top N fuzzy matches
   */
  private getTopMatches(input: string, candidates: string[], limit: number = 3): string[] {
    return candidates
      .map(candidate => ({
        name: candidate,
        confidence: 1 - (this.levenshteinDistance(input, candidate) / Math.max(input.length, candidate.length))
      }))
      .filter(match => match.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
      .map(match => match.name);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Detect common error patterns across an entire dataset
   */
  detectCommonErrors(employees: any[]): BulkCorrectionSummary {
    const errorPatterns = new Map<string, ErrorPattern>();
    let totalErrors = 0;
    let affectedRows = 0;

    employees.forEach((employee, rowIndex) => {
      // Handle departments and employee groups (comma-separated)
      const commaFields: Array<'departments' | 'employeeGroups'> = ['departments', 'employeeGroups'];
      commaFields.forEach((field) => {
        if (!employee[field]) return;

        const result = this.resolveNames(employee[field], field);
        if (result.errors.length > 0) {
          affectedRows++;
          totalErrors += result.errors.length;

          // Extract the invalid names from error messages
          const names = employee[field].split(',').map((s: string) => s.trim());
          names.forEach((name: string) => {
            const normalizedName = this.normalizeName(name);
            const mapping = field === 'departments' 
              ? this.departmentsByName 
              : this.employeeGroupsByName;

            if (!mapping.has(normalizedName) && !this.isValidId(parseInt(name), field)) {
              const key = `${field}:${normalizedName}`;
              const pattern: ErrorPattern = errorPatterns.get(key) || {
                field,
                invalidName: name,
                count: 0,
                rows: [],
                confidence: 0
              };

              pattern.count++;
              pattern.rows.push(rowIndex + 1); // 1-based row numbers

              // Get fuzzy match suggestion
              const availableNames = Array.from(mapping.keys());
              const suggestion = this.findBestMatch(normalizedName, availableNames);
              if (suggestion.match && suggestion.confidence > 0.4) {
                pattern.suggestion = this.getOriginalName(suggestion.match, field);
                pattern.confidence = suggestion.confidence;
              }

              errorPatterns.set(key, pattern);
            }
          });
        }
      });

      // Handle employee type (single value, no comma separation)
      if (employee.employeeTypeId) {
        const result = this.resolveEmployeeType(employee.employeeTypeId);
        if (result.errors.length > 0) {
          affectedRows++;
          totalErrors += result.errors.length;

          const name = employee.employeeTypeId.trim();
          const normalizedName = this.normalizeName(name);

          if (!this.employeeTypesByName.has(normalizedName) && !this.employeeTypesById.has(parseInt(name))) {
            const key = `employeeTypes:${normalizedName}`;
            const pattern: ErrorPattern = errorPatterns.get(key) || {
              field: 'employeeTypes' as const,
              invalidName: name,
              count: 0,
              rows: [],
              confidence: 0
            };

            pattern.count++;
            pattern.rows.push(rowIndex + 1); // 1-based row numbers

            // Get fuzzy match suggestion
            const availableNames = Array.from(this.employeeTypesByName.keys());
            const suggestion = this.findBestMatch(normalizedName, availableNames);
            if (suggestion.match && suggestion.confidence > 0.4) {
              pattern.suggestion = this.getOriginalEmployeeTypeName(suggestion.match);
              pattern.confidence = suggestion.confidence;
            }

            errorPatterns.set(key, pattern);
          }
        }
      }
    });

    const patterns = Array.from(errorPatterns.values())
      .sort((a, b) => b.count - a.count); // Sort by frequency

    const canBulkFix = patterns
      .filter(pattern => pattern.confidence > 0.7)
      .reduce((sum, pattern) => sum + pattern.count, 0);

    return {
      totalErrors,
      patterns,
      affectedRows,
      canBulkFix
    };
  }

  /**
   * Apply bulk correction to dataset
   */
  applyBulkCorrection(
    employees: any[],
    pattern: ErrorPattern,
    newValue: string
  ): any[] {
    return employees.map(employee => {
      // Map the pattern field to the actual employee field name
      const actualFieldName = pattern.field === 'employeeTypes' ? 'employeeTypeId' : pattern.field;
      const fieldValue = employee[actualFieldName];
      
      if (!fieldValue || !fieldValue.includes(pattern.invalidName)) {
        return employee;
      }

      let updatedValue: string;

      // Handle employee types (single value) vs departments/employee groups (comma-separated)
      if (pattern.field === 'employeeTypes') {
        // Employee types are single values - direct replacement
        updatedValue = fieldValue.toLowerCase() === pattern.invalidName.toLowerCase() ? newValue : fieldValue;
      } else {
        // Handle comma-separated values for departments and employee groups
        updatedValue = fieldValue
          .split(',')
          .map((item: string) => item.trim())
          .map((item: string) => 
            item.toLowerCase() === pattern.invalidName.toLowerCase() ? newValue : item
          )
          .join(', ');
      }

      return {
        ...employee,
        [actualFieldName]: updatedValue,
        _bulkCorrected: {
          ...employee._bulkCorrected,
          [actualFieldName]: [...(employee._bulkCorrected?.[actualFieldName] || []), {
            from: pattern.invalidName,
            to: newValue,
            timestamp: new Date()
          }]
        }
      };
    });
  }

  /**
   * Get available names for a field type
   */
  getAvailableNames(type: 'departments' | 'employeeGroups'): string[] {
    return type === 'departments'
      ? Array.from(this.departmentsById.values())
      : Array.from(this.employeeGroupsById.values());
  }

  /**
   * Get available options with IDs for reference
   */
  getAvailableOptions(type: 'departments' | 'employeeGroups' | 'employeeTypes'): Array<{id: number, name: string}> {
    let result: Array<{id: number, name: string}>;
    
    if (type === 'departments') {
      result = this.departments.map(d => ({id: d.id, name: d.name}));
    } else if (type === 'employeeGroups') {
      result = this.employeeGroups.map(g => ({id: g.id, name: g.name}));
    } else {
      result = this.employeeTypes.map(t => ({id: t.id, name: t.name}));
    }

    return result;
  }

  /**
   * Validate and convert employee data for Planday API
   */
  async validateAndConvert(employee: any): Promise<{
    isValid: boolean;
    converted: any;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const converted = { ...employee };

    // Handle date fields conversion using new DateParser (hiredFrom, birthDate)
    // Only parse dates if user has resolved ambiguity or if no ambiguous dates exist
    const dateFields = ['hiredFrom', 'birthDate'];
    for (const field of dateFields) {
      if (employee[field] && employee[field].toString().trim() !== '') {
        const dateStr = employee[field].toString().trim();
        
        // Check if this date value looks like a date
        if (DateParser.couldBeDate(dateStr)) {
          // Check if this specific date is ambiguous
          const ambiguousDates = DateParser.findAmbiguousDates([dateStr]);
          
          if (ambiguousDates.length > 0) {
            // This date is ambiguous and user hasn't selected format yet
            // Keep original value and don't convert yet
            converted[field] = dateStr;
            console.log(`📅 Preserving ambiguous date "${dateStr}" for user format selection`);
          } else {
            // Date is unambiguous or user has already set format preference
            const convertedDate = DateParser.parseToISO(dateStr);
            
            if (convertedDate) {
              converted[field] = convertedDate;
              console.log(`📅 Converted ${field}: "${dateStr}" → "${convertedDate}"`);
            } else {
              errors.push({
                field: field as any,
                value: dateStr,
                message: `Invalid date format. Supported: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, YYYYMMDD, named months, etc.`,
                rowIndex: employee.rowIndex || 0,
                severity: 'error'
              });
            }
          }
        } else {
          // Value doesn't look like a date 
          errors.push({
            field: field as any,
            value: dateStr,
            message: `Value "${dateStr}" doesn't appear to be a valid date. Supported: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, YYYYMMDD, named months, etc.`,
            rowIndex: employee.rowIndex || 0,
            severity: 'error'
          });
        }
      }
    }

    // Handle departments
    if (employee.departments) {
      const deptResult = this.resolveNames(employee.departments, 'departments');
      if (deptResult.errors.length > 0) {
        errors.push({
          field: 'departments',
          value: employee.departments,
          message: deptResult.errors.join(', '),
          rowIndex: employee.rowIndex || 0,
          severity: 'error'
        });
      }
      converted.departments = deptResult.ids;
    }

    // Handle employee groups
    if (employee.employeeGroups) {
      const groupResult = this.resolveNames(employee.employeeGroups, 'employeeGroups');
      if (groupResult.errors.length > 0) {
        errors.push({
          field: 'employeeGroups',
          value: employee.employeeGroups,
          message: groupResult.errors.join(', '),
          rowIndex: employee.rowIndex || 0,
          severity: 'error'
        });
      }
      converted.employeeGroups = groupResult.ids;
    }

    // Handle employee type (single value)
    if (employee.employeeTypeId) {
      const typeResult = this.resolveEmployeeType(employee.employeeTypeId);
      if (typeResult.errors.length > 0) {
        errors.push({
          field: 'employeeTypeId',
          value: employee.employeeTypeId,
          message: typeResult.errors.join(', '),
          rowIndex: employee.rowIndex || 0,
          severity: 'error'
        });
      }
      // Set the ID if we found a match
      if (typeResult.ids.length > 0) {
        converted.employeeTypeId = typeResult.ids[0];
      }
    }

    // Handle phone numbers with country code extraction
    // Convert cellPhone to string and check if it's not empty
    const cellPhoneStr = employee.cellPhone?.toString()?.trim() || '';
    if (cellPhoneStr !== '') {
      // Simplified phone parsing - user must specify country code
      const countryCode = employee.cellPhoneCountryCode?.toString()?.trim() || '';
      
      if (countryCode) {
        try {
          const { PhoneParser } = await import('../utils');
          const parseResult = PhoneParser.parsePhoneNumberWithCountry(cellPhoneStr, countryCode);
          
          if (parseResult.isValid && parseResult.phoneNumber && parseResult.countryCode) {
            // Set the parsed phone number and country information
            converted.cellPhone = parseResult.phoneNumber;
            converted.cellPhoneCountryCode = parseResult.countryCode;
            if (parseResult.countryId) {
              converted.cellPhoneCountryId = parseResult.countryId;
            }
          } else {
            // Keep original value if parsing failed - validation will catch this
            converted.cellPhone = cellPhoneStr;
            converted.cellPhoneCountryCode = countryCode;
          }
        } catch (error) {
          console.warn('⚠️ Error parsing phone number:', error);
          // Fallback to original values
          converted.cellPhone = cellPhoneStr;
          converted.cellPhoneCountryCode = countryCode;
        }
      } else {
        // No country code provided - keep original phone number
        converted.cellPhone = cellPhoneStr;
      }
    }

    // Auto-populate email field from userName
    // Email field is not shown in mapping UI but must be populated for Planday API
    if (converted.userName) {
      converted.email = converted.userName;
    }

    // Handle custom field type conversion using ValidationService
    const customFieldResult = ValidationService.convertAllCustomFields(employee, employee.rowIndex || 0);
    
    // Apply converted custom field values
    Object.assign(converted, customFieldResult.convertedFields);
    
    // Add any custom field conversion errors
    errors.push(...customFieldResult.errors);
    
    // Log warnings for custom field conversions
    if (customFieldResult.warnings.length > 0) {
      console.warn(`⚠️ Custom field warnings for employee at row ${employee.rowIndex || 0}:`, customFieldResult.warnings);
    }
    
    console.log(`🔧 Custom field conversion completed for row ${employee.rowIndex || 0}:`, {
      originalCustomFields: Object.keys(employee).filter(k => k.startsWith('custom_')).length,
      convertedCustomFields: Object.keys(customFieldResult.convertedFields).length,
      errors: customFieldResult.errors.length,
      warnings: customFieldResult.warnings.length
    });

    return {
      isValid: errors.length === 0,
      converted,
      errors
    };
  }

  /**
   * Generate Excel template with available names
   */
  generateTemplate(): {
    headers: string[];
    examples: string[][];
    instructions: Record<string, string>;
  } {
    return {
      headers: [
        'firstName',
        'lastName', 
        'userName',
        'departments',
        'employeeGroups',
        'hiredFrom'
      ],
      examples: [],
      instructions: {
        departments: `Available departments: ${this.getAvailableNames('departments').join(', ')}`,
        employeeGroups: `Available employee groups: ${this.getAvailableNames('employeeGroups').join(', ')}`,
        general: 'Use comma-separated names for multiple departments/groups. Example: "Kitchen,Bar" or "Chef,Manager"'
      }
    };
  }

  /**
   * Generate a comprehensive Excel template based on portal fields
   * Orders fields logically: required first, then optional, then custom
   */
  static generatePortalTemplate(): {
    headers: string[];
    examples: string[][];
    instructions: Record<string, string>;
    fieldOrder: Array<{ field: string; displayName: string; isRequired: boolean; isCustom: boolean; description?: string }>;
  } {
    // Get field information from validation service
    const requiredFields = ValidationService.getRequiredFields();
    const customFields = ValidationService.getCustomFields();
    const allApiFields = ValidationService.getAllFieldNames();
    const fieldDefinitionsStatus = ValidationService.getStatus();
    
    console.log('🔍 Template Generation Debug:', {
      requiredFields,
      customFieldsCount: customFields.length,
      customFields: customFields.map(cf => ({ name: cf.name, description: cf.description })),
      allApiFieldsCount: allApiFields.length,
      fieldDefinitionsStatus
    });
    
    // Build ordered field list dynamically based on actual API fields
    const fieldOrder: Array<{ field: string; displayName: string; isRequired: boolean; isCustom: boolean; description?: string }> = [];
    const processedFields = new Set<string>();
    
    // Fields to exclude from templates because they are auto-populated
    const excludedFields = ['email', 'phone']; // email is auto-populated from userName, phone field removed (only cellPhone supported)
    
    // Add required fields first (excluding auto-populated ones)
    requiredFields.forEach(field => {
      if (allApiFields.includes(field) && !processedFields.has(field) && !excludedFields.includes(field)) {
        fieldOrder.push({
          field,
          displayName: field, // Use raw field name for standard fields
          isRequired: true,
          isCustom: field.startsWith('custom_'),
          description: field.startsWith('custom_') ? 
            customFields.find(cf => cf.name === field)?.description : undefined
        });
        processedFields.add(field);
      }
    });
    
    // Add remaining non-custom fields (standard optional fields, excluding auto-populated ones)
    allApiFields
      .filter(field => !field.startsWith('custom_') && !processedFields.has(field) && !excludedFields.includes(field))
      .sort() // Alphabetical order for consistent output
      .forEach(field => {
        fieldOrder.push({
          field,
          displayName: field, // Use raw field name for standard fields
          isRequired: false,
          isCustom: false
        });
        processedFields.add(field);
      });
    
    // Add custom fields at the end
    customFields.forEach(customField => {
      if (!processedFields.has(customField.name)) {
        fieldOrder.push({
          field: customField.name,
          displayName: customField.description || customField.name,
          isRequired: ValidationService.isRequired(customField.name),
          isCustom: true,
          description: customField.description
        });
        processedFields.add(customField.name);
      }
    });
    
    // Generate headers (only include relevant fields)
    const headers = fieldOrder.map(f => f.displayName);
    
    // Create empty template with just headers - no sample data
    const examples: string[][] = [];
    
    // Generate instructions dynamically based on actual fields
    const instructions: Record<string, string> = {
      general: 'Fill in employee data. Required fields must be completed. Use the exact department and employee group names from your Planday portal.',
    };
    
    // Add field-specific instructions
    fieldOrder.forEach(field => {
      if (field.isCustom && field.description) {
        instructions[field.field] = field.description;
      } else {
        // Standard field instructions
        switch (field.field) {
          case 'firstName':
            instructions[field.field] = 'Employee\'s first name (required)';
            break;
          case 'lastName':
            instructions[field.field] = 'Employee\'s last name (required)';
            break;
          case 'userName':
            instructions[field.field] = 'Email address that will be used for login (required, must be unique)';
            break;
          case 'departments':
            instructions[field.field] = `Department names from your portal. Use comma-separated names for multiple departments. Available: ${mappingService.getAvailableNames('departments').join(', ')}`;
            break;
          case 'employeeGroups':
            instructions[field.field] = `Employee group names from your portal. Use comma-separated names for multiple groups. Available: ${mappingService.getAvailableNames('employeeGroups').join(', ')}`;
            break;
          case 'cellPhone':
            instructions[field.field] = 'Mobile phone number (optional)';
            break;
          case 'hiredFrom':
            instructions[field.field] = 'Hire date in YYYY-MM-DD format (e.g., 2024-01-15)';
            break;
          case 'birthDate':
            instructions[field.field] = 'Birth date in YYYY-MM-DD format (e.g., 1990-03-15)';
            break;
          case 'street1':
            instructions[field.field] = 'Street address';
            break;
          case 'city':
            instructions[field.field] = 'City';
            break;
          case 'zip':
            instructions[field.field] = 'ZIP/Postal code';
            break;
          case 'gender':
            instructions[field.field] = 'Gender (Male/Female)';
            break;
          case 'jobTitle':
            instructions[field.field] = 'Job title or position';
            break;
          case 'employeeId':
            instructions[field.field] = 'Internal employee ID (if applicable)';
            break;
          case 'payrollId':
            instructions[field.field] = 'Payroll system ID (if applicable)';
            break;
          case 'ssn':
            instructions[field.field] = 'Social Security Number (if required by your portal)';
            break;
          case 'bankAccount':
            instructions[field.field] = 'Bank account information (if required by your portal)';
            break;
          default:
            instructions[field.field] = `Enter appropriate value for ${field.field}`;
        }
      }
    });
    
    return {
      headers,
      examples,
      instructions,
      fieldOrder
    };
  }

  // Removed unused date validation methods - now handled by DateParser class

  // Removed convertDateToISO and convert8DigitDate methods - now handled by DateParser class

  /**
   * Create a clean payload for Planday API from converted employee data
   * This ensures consistency between preview and actual upload
   */
  static createApiPayload(converted: any): PlandayEmployeeCreateRequest {
    const cleanPayload: any = {};
    
    // Define internal fields that should be excluded from the API payload
    const internalFields = new Set(['rowIndex', 'originalData', '__internal_id', '_id', '_bulkCorrected']);
    
    // Include all fields from the converted employee, excluding internal ones
    Object.entries(converted).forEach(([key, value]) => {
      // Skip internal fields and undefined/empty values
      if (!internalFields.has(key) && value != null && value !== '') {
        // For array fields, only include if they have elements
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleanPayload[key] = value;
          }
        } else {
          cleanPayload[key] = value;
        }
      }
    });
    
    // Ensure required fields have defaults if needed
    if (!cleanPayload.email && cleanPayload.userName) {
      cleanPayload.email = cleanPayload.userName;
    }
    
    // Ensure we have a default gender if not provided
    if (!cleanPayload.gender) {
      cleanPayload.gender = 'Male';
    }
    
    return cleanPayload as PlandayEmployeeCreateRequest;
  }


}

/**
 * Singleton instance of the mapping service
 */
export const mappingService = new MappingService();

/**
 * Convenience functions for common operations
 */
export const MappingUtils = {
  /**
   * Initialize with Planday data
   */
  initialize(departments: PlandayDepartment[], employeeGroups: PlandayEmployeeGroup[], employeeTypes: PlandayEmployeeType[] = []): void {
    mappingService.initialize(departments, employeeGroups, employeeTypes);
  },

  /**
   * Resolve names to IDs
   */
  resolveNames(input: string, type: 'departments' | 'employeeGroups'): MappingResult {
    return mappingService.resolveNames(input, type);
  },

  /**
   * Detect common errors for bulk correction
   */
  detectCommonErrors(employees: any[]): BulkCorrectionSummary {
    return mappingService.detectCommonErrors(employees);
  },

  /**
   * Apply bulk corrections
   */
  applyBulkCorrection(employees: any[], pattern: ErrorPattern, newValue: string): any[] {
    return mappingService.applyBulkCorrection(employees, pattern, newValue);
  },

  /**
   * Validate and convert employee data
   */
  async validateEmployee(employee: any) {
    return await mappingService.validateAndConvert(employee);
  },

  /**
   * Get available options for dropdowns
   */
  getAvailableOptions(type: 'departments' | 'employeeGroups' | 'employeeTypes') {
    return mappingService.getAvailableOptions(type);
  },

  /**
   * Get stored departments data
   */
  getDepartments(): PlandayDepartment[] {
    return [...mappingService.departments];
  },

  /**
   * Get stored employee groups data
   */
  getEmployeeGroups(): PlandayEmployeeGroup[] {
    return [...mappingService.employeeGroups];
  },

  /**
   * Get stored employee types data
   */
  getEmployeeTypes(): PlandayEmployeeType[] {
    return [...mappingService.employeeTypes];
  },

  /**
   * Check if the service has been initialized with data
   */
  isInitialized(): boolean {
    return mappingService.departments.length > 0 && mappingService.employeeGroups.length > 0;
  },

  /**
   * Generate template
   */
  generateTemplate() {
    return mappingService.generateTemplate();
  },

  /**
   * Create a clean payload for Planday API from converted employee data
   * This ensures consistency between preview and actual upload
   */
  createApiPayload(converted: any): PlandayEmployeeCreateRequest {
    return MappingService.createApiPayload(converted);
  }
};

/**
 * Validation Service
 * Handles dynamic validation based on Planday field definitions
 */
export class ValidationService {
  private static fieldDefinitions: PlandayFieldDefinitionsSchema | null = null;
  private static hasLoggedRequiredFields: boolean = false;

  /**
   * Initialize with field definitions from Planday API
   */
  static initialize(fieldDefinitions: PlandayFieldDefinitionsSchema): void {
    this.fieldDefinitions = fieldDefinitions;
    
    // Debug logging disabled to reduce console noise
    
    // Debug logging disabled to reduce console noise
    // Field processing debug logging disabled to reduce console noise
  }

  /**
   * Get required fields for the current portal
   * Note: userName and departments are always required for ALL portals to create employees,
   * even if the API field definitions don't mark them as required
   */
  static getRequiredFields(): string[] {
    if (!this.fieldDefinitions) {
      console.warn('⚠️ Field definitions not loaded, using fallback required fields');
      return ['firstName', 'lastName', 'userName', 'departments']; // Safe fallback with business-critical fields
    }
    
    // Start with fields marked as required by the API
    const apiRequiredFields = [...this.fieldDefinitions.required];
    
    // Always ensure userName and departments are marked as required
    // These are business-critical for creating employees in ANY Planday portal
    const businessCriticalFields = ['userName', 'departments'];
    
    for (const field of businessCriticalFields) {
      if (!apiRequiredFields.includes(field)) {
        // Force-marking business-critical field as required
        apiRequiredFields.push(field);
      }
    }
    
    if (!this.hasLoggedRequiredFields) {
      this.hasLoggedRequiredFields = true;
    }
    
    return apiRequiredFields;
  }

  /**
   * Get read-only fields that cannot be modified
   */
  static getReadOnlyFields(): string[] {
    if (!this.fieldDefinitions) {
      return [];
    }
    return this.fieldDefinitions.readOnly;
  }

  /**
   * Get unique fields that must be unique across employees
   */
  static getUniqueFields(): string[] {
    if (!this.fieldDefinitions) {
      return [];
    }
    return this.fieldDefinitions.unique;
  }

  /**
   * Check if a field is required
   */
  static isRequired(fieldName: string): boolean {
    return this.getRequiredFields().includes(fieldName);
  }

  /**
   * Check if a field is read-only
   */
  static isReadOnly(fieldName: string): boolean {
    return this.getReadOnlyFields().includes(fieldName);
  }

  /**
   * Check if a field must be unique
   */
  static isUnique(fieldName: string): boolean {
    return this.getUniqueFields().includes(fieldName);
  }

  /**
   * Get custom fields with their descriptions
   * Excludes read-only fields (disabled/inactive custom fields)
   */
  static getCustomFields(): Array<{ name: string; description: string }> {
    if (!this.fieldDefinitions) {
      console.warn('⚠️ Field definitions not loaded, custom fields unavailable');
      return [];
    }

    const customFields: Array<{ name: string; description: string }> = [];
    
    for (const [fieldName, fieldConfig] of Object.entries(this.fieldDefinitions.properties)) {
      // Use Planday's actual custom field convention: fields starting with 'custom_'
      if (fieldName.startsWith('custom_')) {
        const isReadOnly = this.fieldDefinitions.readOnly.includes(fieldName);
        
        // Filter out read-only fields (these are disabled/inactive custom fields)
        if (!isReadOnly) {
          customFields.push({
            name: fieldName,
            description: fieldConfig.description || fieldName
          });
        }
      }
    }

    return customFields;
  }

  /**
   * Get custom fields with their type information
   * Excludes read-only fields (disabled/inactive custom fields)
   */
  static getCustomFieldsWithTypes(): CustomFieldInfo[] {
    if (!this.fieldDefinitions) {
      return [];
    }

    const customFields: CustomFieldInfo[] = [];
    
    for (const [fieldName, fieldConfig] of Object.entries(this.fieldDefinitions.properties)) {
      if (fieldName.startsWith('custom_')) {
        const fieldType = this.detectCustomFieldType(fieldConfig.$ref, fieldConfig);
        const isReadOnly = this.fieldDefinitions.readOnly.includes(fieldName);
        
        // Filter out read-only fields (these are disabled/inactive custom fields)
        if (!isReadOnly) {
          // Extract enum values for dropdown fields
          let enumValues: string[] | undefined;
          let enumOptions: Array<{ value: any; label: string }> | undefined;
          
          if (fieldType === 'optionalEnum') {
            const extracted = this.extractEnumValues(fieldConfig);
            enumValues = extracted.values;
            enumOptions = extracted.options;
          }
          
          customFields.push({
            fieldName,
            fieldType,
            description: fieldConfig.description,
            isRequired: this.fieldDefinitions.required.includes(fieldName),
            enumValues,
            enumOptions
          });
        }
      }
    }

    return customFields;
  }

  /**
   * Detect field type from $ref value and field configuration
   * Enhanced to handle enum/dropdown fields and custom definitions
   */
  private static detectCustomFieldType(ref?: string, fieldConfig?: any): CustomFieldType {
    if (!ref) {
      return 'unknown';
    }
    
    // Check if field has enum values directly (dropdown/select field)
    if (fieldConfig && (fieldConfig.enum || fieldConfig.values || 
        (fieldConfig.anyOf && fieldConfig.anyOf.some((option: any) => option.enum || option.values)))) {
      return 'optionalEnum';
    }
    
    // Check if it's a custom definition (like #/definitions/optionalCustom196907)
    if (ref.startsWith('#/definitions/optionalCustom') && this.fieldDefinitions) {
      const definitionKey = ref.replace('#/definitions/', '');
      const definition = this.fieldDefinitions.definitions[definitionKey];
      
      if (definition) {
        // Check if the definition contains enum values
        if (definition.enum || definition.values || 
            (definition.anyOf && definition.anyOf.some((option: any) => option.enum || option.values))) {
          return 'optionalEnum';
        }
      }
    }
    
    switch (ref) {
      case '#/definitions/optionalString':
        return 'optionalString';
      case '#/definitions/optionalBoolean':
        return 'optionalBoolean';
      case '#/definitions/optionalNumeric':
        return 'optionalNumeric';
      case '#/definitions/optionalDate':
        return 'optionalDate';
      case '#/definitions/optionalImage':
        return 'optionalImage';
      
      // Additional common patterns that might indicate active fields
      case '#/definitions/string':
        return 'optionalString'; // Treat required string as optional string for bulk upload
      case '#/definitions/numeric':
      case '#/definitions/number':
        return 'optionalNumeric';
      case '#/definitions/boolean':
        return 'optionalBoolean';
      case '#/definitions/date':
        return 'optionalDate';
        
      default:
        return 'unknown';
    }
  }

  /**
   * Convert and validate a custom field value
   */
  static convertCustomFieldValue(
    fieldName: string, 
    value: any, 
    rowIndex: number = 0
  ): CustomFieldConversionResult {
    const result: CustomFieldConversionResult = {
      convertedValue: value,
      errors: [],
      warnings: []
    };

    // Handle empty/null values
    if (value === null || value === undefined || value === '') {
      result.convertedValue = null;
      return result;
    }

    // Get field type
    const fieldInfo = this.getCustomFieldInfo(fieldName);
    if (!fieldInfo) {
      result.warnings.push(`Custom field "${fieldName}" not found in field definitions`);
      return result;
    }

    // Convert based on type
    try {
      switch (fieldInfo.fieldType) {
        case 'optionalString':
          result.convertedValue = this.convertToString(value);
          break;
          
        case 'optionalBoolean':
          result.convertedValue = this.convertToBoolean(value, fieldName, rowIndex, result);
          break;
          
        case 'optionalNumeric':
          result.convertedValue = this.convertToNumber(value, fieldName, rowIndex, result);
          break;
          
        case 'optionalDate':
          result.convertedValue = this.convertToDate(value, fieldName, rowIndex, result);
          break;
          
        case 'optionalEnum':
          result.convertedValue = this.convertToEnum(value, fieldName, rowIndex, result, fieldInfo);
          break;
          
        case 'optionalImage':
          // Images not supported for bulk upload
          result.convertedValue = null;
          result.warnings.push(`Image field "${fieldName}" is not supported for bulk upload - value ignored`);
          break;
          
        default:
          // Unknown type - pass through as string with warning
          result.convertedValue = String(value);
          result.warnings.push(`Unknown custom field type for "${fieldName}" - treating as string`);
      }
    } catch (error) {
      result.errors.push({
        field: fieldName,
        value: value,
        message: `Failed to convert custom field "${fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        rowIndex,
        severity: 'error'
      });
      result.convertedValue = null;
    }

    return result;
  }

  /**
   * Convert and validate all custom fields in an employee record
   */
  static convertAllCustomFields(employee: any, rowIndex: number = 0): {
    convertedFields: Record<string, any>;
    errors: ValidationError[];
    warnings: string[];
  } {
    const convertedFields: Record<string, any> = {};
    const allErrors: ValidationError[] = [];
    const allWarnings: string[] = [];

    // Process all custom fields in the employee record
    Object.keys(employee).forEach(fieldName => {
      if (fieldName.startsWith('custom_')) {
        const conversionResult = this.convertCustomFieldValue(fieldName, employee[fieldName], rowIndex);
        
        convertedFields[fieldName] = conversionResult.convertedValue;
        allErrors.push(...conversionResult.errors);
        allWarnings.push(...conversionResult.warnings);
      }
    });

    return {
      convertedFields,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Get field type information for a specific custom field
   */
  private static getCustomFieldInfo(fieldName: string): CustomFieldInfo | null {
    if (!this.fieldDefinitions || !fieldName.startsWith('custom_')) {
      return null;
    }

    const fieldConfig = this.fieldDefinitions.properties[fieldName];
    if (!fieldConfig) {
      return null;
    }

    const fieldType = this.detectCustomFieldType(fieldConfig.$ref, fieldConfig);
    
    // Extract enum values for dropdown fields
    let enumValues: string[] | undefined;
    let enumOptions: Array<{ value: any; label: string }> | undefined;
    
    if (fieldType === 'optionalEnum') {
      const extracted = this.extractEnumValues(fieldConfig);
      enumValues = extracted.values;
      enumOptions = extracted.options;
    }

    return {
      fieldName,
      fieldType,
      description: fieldConfig.description,
      isRequired: this.fieldDefinitions.required.includes(fieldName),
      enumValues,
      enumOptions
    };
  }

  /**
   * Convert value to string
   */
  private static convertToString(value: any): string {
    return String(value).trim();
  }

  /**
   * Convert value to boolean with flexible parsing
   */
  private static convertToBoolean(
    value: any, 
    fieldName: string, 
    rowIndex: number,
    result: CustomFieldConversionResult
  ): boolean | null {
    const strValue = String(value).toLowerCase().trim();
    
    // True values
    if (['true', '1', 'yes', 'y', 'on', 'enabled', 'active'].includes(strValue)) {
      return true;
    }
    
    // False values  
    if (['false', '0', 'no', 'n', 'off', 'disabled', 'inactive'].includes(strValue)) {
      return false;
    }
    
    // Invalid boolean value
    result.errors.push({
      field: fieldName,
      value: value,
      message: `Invalid boolean value "${value}" for custom field "${fieldName}". Use: true/false, 1/0, yes/no, y/n, on/off, enabled/disabled, active/inactive`,
      rowIndex,
      severity: 'error'
    });
    
    return null;
  }

  /**
   * Convert value to number with validation
   */
  private static convertToNumber(
    value: any, 
    fieldName: string, 
    rowIndex: number,
    result: CustomFieldConversionResult
  ): number | null {
    // Handle string numbers with potential formatting
    let cleanValue = String(value).trim();
    
    // Remove common formatting (commas, spaces)
    cleanValue = cleanValue.replace(/[,\s]/g, '');
    
    const numValue = Number(cleanValue);
    
    if (isNaN(numValue)) {
      result.errors.push({
        field: fieldName,
        value: value,
        message: `Invalid numeric value "${value}" for custom field "${fieldName}". Must be a valid number`,
        rowIndex,
        severity: 'error'
      });
      return null;
    }
    
    // Check for reasonable numeric range (avoid extremely large numbers that might be data entry errors)
    if (!isFinite(numValue)) {
      result.errors.push({
        field: fieldName,
        value: value,
        message: `Numeric value "${value}" for custom field "${fieldName}" is too large or infinite`,
        rowIndex,
        severity: 'error'
      });
      return null;
    }
    
    return numValue;
  }

  /**
   * Convert value to ISO date format
   */
  private static convertToDate(
    value: any, 
    fieldName: string, 
    rowIndex: number,
    result: CustomFieldConversionResult
  ): string | null {
    const dateStr = String(value).trim();
    
    // Use existing DateParser logic
    if (!DateParser.couldBeDate(dateStr)) {
      result.errors.push({
        field: fieldName,
        value: value,
        message: `Value "${value}" for custom field "${fieldName}" doesn't appear to be a valid date. Supported formats: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, YYYYMMDD, named months, etc.`,
        rowIndex,
        severity: 'error'
      });
      return null;
    }
    
    // Check for ambiguous dates
    const ambiguousDates = DateParser.findAmbiguousDates([dateStr]);
    if (ambiguousDates.length > 0) {
      result.errors.push({
        field: fieldName,
        value: value,
        message: `Ambiguous date format "${value}" for custom field "${fieldName}". Please resolve date format ambiguity first`,
        rowIndex,
        severity: 'error'
      });
      return null;
    }
    
    // Convert to ISO format
    const convertedDate = DateParser.parseToISO(dateStr);
    if (!convertedDate) {
      result.errors.push({
        field: fieldName,
        value: value,
        message: `Invalid date format "${value}" for custom field "${fieldName}". Supported formats: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, MM/DD/YYYY, YYYYMMDD, named months, etc.`,
        rowIndex,
        severity: 'error'
      });
      return null;
    }
    
    return convertedDate;
  }

  /**
   * Convert value to enum with validation against allowed options
   */
  private static convertToEnum(
    value: any, 
    fieldName: string, 
    rowIndex: number,
    result: CustomFieldConversionResult,
    fieldInfo: CustomFieldInfo
  ): any {
    const strValue = String(value).trim();
    
    if (!fieldInfo.enumValues || fieldInfo.enumValues.length === 0) {
      result.warnings.push(`No enum values found for dropdown field "${fieldName}" - treating as string`);
      return strValue;
    }
    
    // Check for exact match (case-sensitive first)
    if (fieldInfo.enumValues.includes(strValue)) {
      return strValue;
    }
    
    // Check for case-insensitive match
    const lowerValue = strValue.toLowerCase();
    const caseInsensitiveMatch = fieldInfo.enumValues.find(enumValue => 
      String(enumValue).toLowerCase() === lowerValue
    );
    
    if (caseInsensitiveMatch) {
      result.warnings.push(`Found case-insensitive match for "${strValue}" → "${caseInsensitiveMatch}" in field "${fieldName}"`);
      return caseInsensitiveMatch;
    }
    
    // Check if it's a numeric value that matches enum options
    if (fieldInfo.enumOptions) {
      const numericValue = Number(strValue);
      if (!isNaN(numericValue)) {
        const numericMatch = fieldInfo.enumOptions.find(option => option.value === numericValue);
        if (numericMatch) {
          return numericMatch.value;
        }
      }
      
      // Check if input matches any label
      const labelMatch = fieldInfo.enumOptions.find(option => 
        String(option.label).toLowerCase() === lowerValue
      );
      if (labelMatch) {
        result.warnings.push(`Found label match for "${strValue}" → "${labelMatch.value}" (${labelMatch.label}) in field "${fieldName}"`);
        return labelMatch.value;
      }
    }
    
    // No match found - this is an error
    const availableValues = fieldInfo.enumOptions 
      ? fieldInfo.enumOptions.map(opt => `${opt.value} (${opt.label})`).join(', ')
      : fieldInfo.enumValues.join(', ');
      
    result.errors.push({
      field: fieldName,
      value: value,
      message: `Invalid value "${strValue}" for dropdown field "${fieldName}". Must be one of: ${availableValues}`,
      rowIndex,
      severity: 'error'
    });
    
    return null;
  }

  /**
   * Extract enum values from field configuration
   * Handles both simple enum arrays, complex anyOf structures, and custom definitions
   */
  private static extractEnumValues(fieldConfig: any): {
    values: string[];
    options: Array<{ value: any; label: string }>;
  } {
    const values: string[] = [];
    const options: Array<{ value: any; label: string }> = [];
    
    let configToCheck = fieldConfig;
    
    // If the field references a custom definition, look it up in definitions
    if (fieldConfig.$ref && fieldConfig.$ref.startsWith('#/definitions/optionalCustom') && this.fieldDefinitions) {
      const definitionKey = fieldConfig.$ref.replace('#/definitions/', '');
      const definition = this.fieldDefinitions.definitions[definitionKey];
      
      if (definition) {
        configToCheck = definition;
      }
    }
    
    // Direct enum/values properties
    if (configToCheck.enum) {
      values.push(...configToCheck.enum);
      configToCheck.enum.forEach((value: any) => {
        options.push({ value, label: String(value) });
      });
    }
    
    if (configToCheck.values) {
      values.push(...configToCheck.values);
      configToCheck.values.forEach((value: any) => {
        options.push({ value, label: String(value) });
      });
    }
    
    // anyOf structure (like employeeType with enum and values)
    if (configToCheck.anyOf && Array.isArray(configToCheck.anyOf)) {
      configToCheck.anyOf.forEach((option: any) => {
        if (option.enum) {
          values.push(...option.enum);
          
          // If there are corresponding values/labels, use them
          if (option.values && option.values.length === option.enum.length) {
            option.enum.forEach((enumValue: any, index: number) => {
              options.push({ 
                value: enumValue, 
                label: option.values[index] || String(enumValue) 
              });
            });
          } else {
            // No labels, use enum values as labels
            option.enum.forEach((enumValue: any) => {
              options.push({ value: enumValue, label: String(enumValue) });
            });
          }
        }
        
        if (option.values) {
          values.push(...option.values);
          option.values.forEach((value: any) => {
            if (!options.some(opt => opt.value === value)) {
              options.push({ value, label: String(value) });
            }
          });
        }
      });
    }
    
    // Remove duplicates
    const uniqueValues = [...new Set(values)];
    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(opt => opt.value === option.value)
    );
    
    return {
      values: uniqueValues,
      options: uniqueOptions
    };
  }

  /**
   * Get human-readable type name for UI display
   */
  static getFieldTypeDisplayName(fieldType: CustomFieldType): string {
    switch (fieldType) {
      case 'optionalString':
        return 'Text';
      case 'optionalBoolean':
        return 'Yes/No (Boolean)';
      case 'optionalNumeric':
        return 'Number';
      case 'optionalDate':
        return 'Date';
      case 'optionalEnum':
        return 'Dropdown/Select';
      case 'optionalImage':
        return 'Image (not supported)';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get user-friendly conversion hints for a field type
   */
  static getConversionHints(fieldType: CustomFieldType): string[] {
    switch (fieldType) {
      case 'optionalString':
        return ['Any text value'];
        
      case 'optionalBoolean':
        return [
          'Use: true/false, 1/0, yes/no, y/n',
          'Also: on/off, enabled/disabled, active/inactive'
        ];
        
      case 'optionalNumeric':
        return [
          'Use numeric values (integers or decimals)',
          'Commas and spaces will be removed automatically'
        ];
        
      case 'optionalDate':
        return [
          'Supported formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY',
          'Also: YYYY/MM/DD, YYYYMMDD, named months'
        ];
        
      case 'optionalEnum':
        return [
          'Must use one of the predefined dropdown options',
          'Case-insensitive matching supported'
        ];
        
      case 'optionalImage':
        return ['Image uploads not supported in bulk import'];
        
      default:
        return ['Unknown field type - will be treated as text'];
    }
  }

  /**
   * Validate required fields for an employee
   */
  static validateRequiredFields(employee: any, rowIndex: number = 0): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields = this.getRequiredFields();

    for (const fieldName of requiredFields) {
      const value = employee[fieldName];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({
          field: fieldName,
          value: value,
          message: `${fieldName} is required by your Planday portal`,
          rowIndex,
          severity: 'error'
        });
      }
    }

    // Conditional requirement: cellPhoneCountryCode is required when cellPhone is provided
    const cellPhone = employee.cellPhone?.toString()?.trim() || '';
    const cellPhoneCountryCode = employee.cellPhoneCountryCode?.toString()?.trim() || '';
    
    if (cellPhone && !cellPhoneCountryCode) {
      errors.push({
        field: 'cellPhoneCountryCode',
        value: cellPhoneCountryCode,
        message: 'cellPhoneCountryCode is required when cellPhone is provided. Specify country like "DK", "SE", "Denmark", "Sweden"',
        rowIndex,
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate unique fields across all employees
   */
  static validateUniqueFields(employees: any[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const uniqueFields = this.getUniqueFields();

    for (const fieldName of uniqueFields) {
      const valueMap = new Map<string, number[]>();
      
      // Collect all values for this field
      employees.forEach((employee, index) => {
        const value = employee[fieldName];
        if (value && typeof value === 'string' && value.trim() !== '') {
          const normalizedValue = value.trim().toLowerCase();
          const indices = valueMap.get(normalizedValue) || [];
          indices.push(index);
          valueMap.set(normalizedValue, indices);
        }
      });

      // Check for duplicates
      for (const [_value, indices] of valueMap.entries()) {
        if (indices.length > 1) {
          indices.forEach(index => {
            errors.push({
              field: fieldName,
              value: employees[index][fieldName],
              message: `${fieldName} must be unique across all employees (duplicate found in rows ${indices.map(i => i + 1).join(', ')})`,
              rowIndex: index,
              severity: 'error'
            });
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate employees against existing Planday employees to check for duplicates
   */
  static validateExistingEmployees(
    employees: any[], 
    existingEmployees: Map<string, any>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    employees.forEach((employee, index) => {
      const email = employee.userName;
      if (email && email.trim() !== '') {
        const normalizedEmail = email.toLowerCase().trim();
        const existingEmployee = existingEmployees.get(normalizedEmail);
        
        if (existingEmployee) {
          errors.push({
            field: 'userName',
            value: email,
            message: `Employee with email "${email}" already exists in Planday (ID: ${existingEmployee.id}, Name: ${existingEmployee.firstName} ${existingEmployee.lastName})`,
            rowIndex: index,
            severity: 'error'
          });
        }
      }
    });
    
    return errors;
  }

  /**
   * Validate country code and suggest correct ISO codes
   */
  static validateCountryCode(input: string): { isValidCountryCode: boolean; suggestedCode?: string } {
    const normalizedInput = input.toUpperCase().trim();
    
    // Common ISO 3166-1 alpha-2 country codes
    const validCodes = new Set([
      'DK', 'SE', 'NO', 'FI', 'IS', // Nordic countries
      'UK', 'GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'AT', 'CH', // Western Europe
      'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'EE', 'LV', 'LT', // Eastern Europe
      'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO', 'VE', // Americas
      'AU', 'NZ', 'JP', 'CN', 'IN', 'KR', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', // Asia-Pacific
      'ZA', 'EG', 'MA', 'NG', 'KE', 'GH', 'TN', // Africa
      'RU', 'TR', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', // Eastern Europe/Asia
    ]);
    
    // If it's already a valid code, return true
    if (validCodes.has(normalizedInput)) {
      return { isValidCountryCode: true };
    }
    
    // Country name to ISO code mapping
    const countryNameMapping: Record<string, string> = {
      // Nordic countries
      'DENMARK': 'DK', 'SWEDEN': 'SE', 'NORWAY': 'NO', 'FINLAND': 'FI', 'ICELAND': 'IS',
      
      // Common European countries
      'UNITED KINGDOM': 'GB', 'ENGLAND': 'GB', 'SCOTLAND': 'GB', 'WALES': 'GB',
      'IRELAND': 'IE', 'FRANCE': 'FR', 'GERMANY': 'DE', 'ITALY': 'IT', 'SPAIN': 'ES',
      'PORTUGAL': 'PT', 'NETHERLANDS': 'NL', 'HOLLAND': 'NL', 'BELGIUM': 'BE',
      'AUSTRIA': 'AT', 'SWITZERLAND': 'CH',
      
      // Other common countries
      'UNITED STATES': 'US', 'USA': 'US', 'AMERICA': 'US', 'CANADA': 'CA',
      'AUSTRALIA': 'AU', 'NEW ZEALAND': 'NZ', 'JAPAN': 'JP', 'CHINA': 'CN',
      'INDIA': 'IN', 'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'RUSSIA': 'RU', 'TURKEY': 'TR',
      'POLAND': 'PL', 'CZECH REPUBLIC': 'CZ', 'HUNGARY': 'HU', 'ROMANIA': 'RO',
      'BULGARIA': 'BG', 'CROATIA': 'HR', 'SLOVENIA': 'SI', 'ESTONIA': 'EE',
      'LATVIA': 'LV', 'LITHUANIA': 'LT',
    };
    
    // Try to find a suggestion
    const suggestedCode = countryNameMapping[normalizedInput];
    
    return {
      isValidCountryCode: false,
      suggestedCode
    };
  }

  /**
   * Validate country code fields for an employee
   */
  static validateCountryCodeFields(employee: any, rowIndex: number = 0): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate phoneCountryCode field
    const phoneCountryCodeStr = employee.phoneCountryCode?.toString()?.trim() || '';
    if (phoneCountryCodeStr !== '') {
      const { isValidCountryCode, suggestedCode } = this.validateCountryCode(phoneCountryCodeStr);
      
      if (!isValidCountryCode) {
        if (suggestedCode) {
          errors.push({
            field: 'phoneCountryCode',
            value: phoneCountryCodeStr,
            message: `"${phoneCountryCodeStr}" should be ISO country code "${suggestedCode}" (e.g. DK, SE, NO, UK)`,
            rowIndex,
            severity: 'error'
          });
        } else {
          errors.push({
            field: 'phoneCountryCode',
            value: phoneCountryCodeStr,
            message: `"${phoneCountryCodeStr}" is not a valid ISO country code (use DK, SE, NO, UK, etc.)`,
            rowIndex,
            severity: 'error'
          });
        }
      }
    }

    // Validate cellPhoneCountryCode field  
    const cellPhoneCountryCodeStr = employee.cellPhoneCountryCode?.toString()?.trim() || '';
    if (cellPhoneCountryCodeStr !== '') {
      const { isValidCountryCode, suggestedCode } = this.validateCountryCode(cellPhoneCountryCodeStr);
      
      if (!isValidCountryCode) {
        if (suggestedCode) {
          errors.push({
            field: 'cellPhoneCountryCode',
            value: cellPhoneCountryCodeStr,
            message: `"${cellPhoneCountryCodeStr}" should be ISO country code "${suggestedCode}" (e.g. DK, SE, NO, UK)`,
            rowIndex,
            severity: 'error'
          });
        } else {
          errors.push({
            field: 'cellPhoneCountryCode',
            value: cellPhoneCountryCodeStr,
            message: `"${cellPhoneCountryCodeStr}" is not a valid ISO country code (use DK, SE, NO, UK, etc.)`,
            rowIndex,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Get field definitions status
   */
  static getStatus(): {
    isLoaded: boolean;
    portalId: number | null;
    requiredFieldsCount: number;
    customFieldsCount: number;
  } {
    return {
      isLoaded: !!this.fieldDefinitions,
      portalId: this.fieldDefinitions?.portalId || null,
      requiredFieldsCount: this.fieldDefinitions?.required.length || 0,
      customFieldsCount: this.getCustomFields().length,
    };
  }

  /**
   * Get all field names available from the API
   */
  static getAllFieldNames(): string[] {
    if (!this.fieldDefinitions) {
      return [];
    }
    return Object.keys(this.fieldDefinitions.properties);
  }

  /**
   * Diagnostic method to analyze field classification
   * Call this method to get detailed information about how fields are being classified
   */
  static diagnoseFieldInconsistencies(): {
    isLoaded: boolean;
    fieldClassification: {
      totalApiFields: number;
      standardFields: string[];
      customFields: string[];
      requiredFieldOverrides: string[];
    };
    fieldMapping: {
      apiField: string;
      classification: string;
      isRequired: boolean;
      isCustom: boolean;
      notes: string;
    }[];
  } {
    if (!this.fieldDefinitions) {
      return {
        isLoaded: false,
        fieldClassification: {
          totalApiFields: 0,
          standardFields: [],
          customFields: [],
          requiredFieldOverrides: []
        },
        fieldMapping: []
      };
    }

    const apiFieldNames = Object.keys(this.fieldDefinitions.properties);
    const standardFields = apiFieldNames.filter(field => !field.startsWith('custom_'));
    const customFieldsFromApi = apiFieldNames.filter(field => field.startsWith('custom_'));

    // Check for required field overrides
    const apiRequiredFields = this.fieldDefinitions.required;
    const processedRequiredFields = this.getRequiredFields();
    const requiredFieldOverrides = processedRequiredFields.filter(
      (field: string) => !apiRequiredFields.includes(field)
    );

    // Create field mapping analysis
    const fieldMapping = apiFieldNames.map(apiField => ({
      apiField,
      classification: apiField.startsWith('custom_') ? 'Custom Field' : 'Standard Field',
      isRequired: this.isRequired(apiField),
      isCustom: apiField.startsWith('custom_'),
      notes: apiField.startsWith('custom_') 
        ? 'Custom field identified by custom_ prefix'
        : 'Standard Planday field'
    }));

    console.log('🔍 Field Classification Analysis:', {
      portalId: this.fieldDefinitions.portalId,
      totalApiFields: apiFieldNames.length,
      standardFieldsCount: standardFields.length,
      customFieldsCount: customFieldsFromApi.length,
      requiredFieldOverrides,
      customFieldsDetected: this.getCustomFields().length
    });

    return {
      isLoaded: true,
      fieldClassification: {
        totalApiFields: apiFieldNames.length,
        standardFields,
        customFields: customFieldsFromApi,
        requiredFieldOverrides
      },
      fieldMapping
    };
  }
}

/**
 * Comprehensive Date Parser for Excel Import
 * Handles all common date formats with smart auto-detection
 * Only operates on fields mapped to date fields
 * Asks user only when truly ambiguous
 */
export class DateParser {
  private static userDateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | null = null;
  
  /**
   * Set user's preferred date format for ambiguous cases
   */
  static setUserDateFormat(format: 'DD/MM/YYYY' | 'MM/DD/YYYY'): void {
    this.userDateFormat = format;
    console.log(`📅 User date format set to: ${format}`);
  }
  
  /**
   * Reset user date format (for new uploads)
   */
  static resetUserDateFormat(): void {
    this.userDateFormat = null;
  }
  
  /**
   * Check if a value could be a date in any supported format
   */
  static couldBeDate(value: string): boolean {
    const trimmed = value.trim();
    
    // All supported date patterns
    const patterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/,          // YYYY-MM-DD, YYYY-M-D
      /^\d{4}\/\d{1,2}\/\d{1,2}$/,        // YYYY/MM/DD, YYYY/M/D
      /^\d{4}\.\d{1,2}\.\d{1,2}$/,        // YYYY.MM.DD, YYYY.M.D
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,        // MM/DD/YYYY, M/D/YYYY, DD/MM/YYYY, D/M/YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/,          // MM-DD-YYYY, M-D-YYYY, DD-MM-YYYY, D-M-YYYY
      /^\d{1,2}\.\d{1,2}\.\d{4}$/,        // MM.DD.YYYY, M.D.YYYY, DD.MM.YYYY, D.M.YYYY
      /^\d{1,2}\/\d{1,2}\/\d{2}$/,        // MM/DD/YY, M/D/YY, DD/MM/YY, D/M/YY
      /^\d{1,2}-\d{1,2}-\d{2}$/,          // MM-DD-YY, M-D-YY, DD-MM-YY, D-M-YY
      /^\d{1,2}\.\d{1,2}\.\d{2}$/,        // MM.DD.YY, M.D.YY, DD.MM.YY, D.M.YY
      /^\d{8}$/,                          // YYYYMMDD, DDMMYYYY, MMDDYYYY
      /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i, // 24 Jun 1974
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i, // Jun 24, 1974
    ];
    
    return patterns.some(pattern => pattern.test(trimmed));
  }
  
  /**
   * Detect if a date format can be auto-determined by scanning for unambiguous dates
   * Returns detected format or null if ambiguous
   */
  static detectDateFormat(dateValues: string[]): 'DD/MM/YYYY' | 'MM/DD/YYYY' | null {
    for (const dateStr of dateValues) {
      const trimmed = dateStr.trim();
      
      // Check slash-separated dates for auto-detection
      const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (slashMatch) {
        const [, first, second] = slashMatch;
        const firstNum = parseInt(first, 10);
        const secondNum = parseInt(second, 10);
        
        // If first number > 12, must be DD/MM format
        if (firstNum > 12) {
          return 'DD/MM/YYYY';
        }
        // If second number > 12, must be MM/DD format
        else if (secondNum > 12) {
          return 'MM/DD/YYYY';
        }
      }
      
      // Check dash-separated dates for auto-detection
      const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
      if (dashMatch) {
        const [, first, second] = dashMatch;
        const firstNum = parseInt(first, 10);
        const secondNum = parseInt(second, 10);
        
        if (firstNum > 12) {
          return 'DD/MM/YYYY';
        } else if (secondNum > 12) {
          return 'MM/DD/YYYY';
        }
      }
      
      // Check dot-separated dates for auto-detection
      const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (dotMatch) {
        const [, first, second] = dotMatch;
        const firstNum = parseInt(first, 10);
        const secondNum = parseInt(second, 10);
        
        if (firstNum > 12) {
          return 'DD/MM/YYYY';
        } else if (secondNum > 12) {
          return 'MM/DD/YYYY';
        }
      }
    }
    
    return null; // Could not auto-detect
  }
  
  /**
   * Find ambiguous dates that need user clarification
   * Returns array of sample ambiguous date values
   */
  static findAmbiguousDates(dateValues: string[]): string[] {
    const ambiguous = new Set<string>();
    
    for (const dateStr of dateValues) {
      const trimmed = dateStr.trim();
      
      // Check 8-digit dates for ambiguity
      if (/^\d{8}$/.test(trimmed)) {
        const validFormats = this.getValid8DigitFormats(trimmed);
        if (validFormats.length > 1) {
          // Check if the different interpretations actually give different dates
          const dates = validFormats.map(f => `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`);
          const uniqueDates = new Set(dates);
          if (uniqueDates.size > 1) {
            ambiguous.add(trimmed);
          }
        }
      }
      
      // Check slash/dash/dot separated dates where both numbers <= 12
      const separatorMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (separatorMatch) {
        const [, first, second] = separatorMatch;
        const firstNum = parseInt(first, 10);
        const secondNum = parseInt(second, 10);
        
        // Only ambiguous if both are <= 12 and different
        if (firstNum <= 12 && secondNum <= 12 && firstNum !== secondNum) {
          ambiguous.add(trimmed);
        }
      }
    }
    
    return Array.from(ambiguous).slice(0, 5); // Max 5 samples
  }
  
  /**
   * Parse a date string to ISO format (YYYY-MM-DD)
   * Uses smart detection and user preferences
   */
  static parseToISO(dateStr: string): string | null {
    const trimmed = dateStr.trim();
    
    if (!trimmed) return null;
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Handle YYYY-M-D format (pad to YYYY-MM-DD)
    const yyyyMdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyyMdMatch) {
      const [, year, month, day] = yyyyMdMatch;
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      
      if (this.isValidDateParts(parseInt(year), parseInt(month), parseInt(day))) {
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }
    
    // Handle 8-digit formats
    if (/^\d{8}$/.test(trimmed)) {
      return this.parse8DigitDate(trimmed);
    }
    
    // Handle YYYY/MM/DD and YYYY.MM.DD formats (unambiguous)
    const yyyyFirstMatch = trimmed.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
    if (yyyyFirstMatch) {
      const [, year, month, day] = yyyyFirstMatch;
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      
      if (this.isValidDateParts(parseInt(year), parseInt(month), parseInt(day))) {
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }
    
    // Handle separator-based dates (DD/MM/YYYY, MM/DD/YYYY, etc.)
    const separatorMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (separatorMatch) {
      return this.parseSeparatorDate(separatorMatch);
    }
    
    // Handle named month formats via Date constructor
    try {
      const date = new Date(trimmed + ' UTC');
      if (!isNaN(date.getTime())) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      // Fallback failed
    }
    
    return null;
  }
  
  /**
   * Parse separator-based dates with smart detection
   */
  private static parseSeparatorDate(match: RegExpMatchArray): string | null {
    const [, first, second, year] = match;
    const firstNum = parseInt(first, 10);
    const secondNum = parseInt(second, 10);
    
    // Convert 2-digit years to 4-digit
    let fullYear = year;
    if (year.length === 2) {
      const yearNum = parseInt(year, 10);
      // Assume 00-30 means 2000-2030, 31-99 means 1931-1999
      fullYear = (yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum).toString();
    }
    
    let day: string, month: string;
    
    // Auto-detection logic
    if (firstNum > 12) {
      // Must be DD/MM format
      day = first;
      month = second;
    } else if (secondNum > 12) {
      // Must be MM/DD format
      month = first;
      day = second;
    } else {
      // Ambiguous - use user preference or default
      if (this.userDateFormat === 'MM/DD/YYYY') {
        month = first;
        day = second;
      } else {
        // Default to DD/MM (European convention)
        day = first;
        month = second;
      }
    }
    
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    
    if (this.isValidDateParts(parseInt(fullYear), parseInt(month), parseInt(day))) {
      return `${fullYear}-${paddedMonth}-${paddedDay}`;
    }
    
    return null;
  }
  
  /**
   * Parse 8-digit date with intelligent format detection
   */
  private static parse8DigitDate(dateStr: string): string | null {
    const validFormats = this.getValid8DigitFormats(dateStr);
    
    if (validFormats.length === 0) {
      return null;
    }
    
    // If only one valid format, use it
    if (validFormats.length === 1) {
      const { year, month, day, format } = validFormats[0];
      const paddedMonth = String(month).padStart(2, '0');
      const paddedDay = String(day).padStart(2, '0');
      console.log(`📅 Detected 8-digit date format ${format}: "${dateStr}" → "${year}-${paddedMonth}-${paddedDay}"`);
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    // Multiple valid formats - use user preference or priority order
    if (this.userDateFormat === 'DD/MM/YYYY') {
      // Prefer DDMMYYYY format
      const ddmmyyyy = validFormats.find(f => f.format === 'DDMMYYYY');
      if (ddmmyyyy) {
        const { year, month, day } = ddmmyyyy;
        const paddedMonth = String(month).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        console.log(`📅 User prefers DD/MM, using DDMMYYYY: "${dateStr}" → "${year}-${paddedMonth}-${paddedDay}"`);
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }
    
    // Default priority: YYYYMMDD > DDMMYYYY > MMDDYYYY > YYYYDDMM
    const formatPriority = ['YYYYMMDD', 'DDMMYYYY', 'MMDDYYYY', 'YYYYDDMM'];
    
    for (const priorityFormat of formatPriority) {
      const match = validFormats.find(f => f.format === priorityFormat);
      if (match) {
        const { year, month, day, format } = match;
        const paddedMonth = String(month).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        console.log(`📅 Multiple valid formats for "${dateStr}", chose ${format}: → "${year}-${paddedMonth}-${paddedDay}"`);
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }
    
    return null;
  }
  
  /**
   * Get all valid 8-digit date format interpretations
   */
  private static getValid8DigitFormats(dateStr: string): Array<{ year: number; month: number; day: number; format: string }> {
    const validFormats: Array<{ year: number; month: number; day: number; format: string }> = [];
    
    // Try YYYYMMDD
    const year1 = parseInt(dateStr.substring(0, 4), 10);
    const month1 = parseInt(dateStr.substring(4, 6), 10);
    const day1 = parseInt(dateStr.substring(6, 8), 10);
    if (this.isValidDateParts(year1, month1, day1)) {
      validFormats.push({ year: year1, month: month1, day: day1, format: 'YYYYMMDD' });
    }
    
    // Try DDMMYYYY
    const day2 = parseInt(dateStr.substring(0, 2), 10);
    const month2 = parseInt(dateStr.substring(2, 4), 10);
    const year2 = parseInt(dateStr.substring(4, 8), 10);
    if (this.isValidDateParts(year2, month2, day2)) {
      validFormats.push({ year: year2, month: month2, day: day2, format: 'DDMMYYYY' });
    }
    
    // Try MMDDYYYY
    const month3 = parseInt(dateStr.substring(0, 2), 10);
    const day3 = parseInt(dateStr.substring(2, 4), 10);
    const year3 = parseInt(dateStr.substring(4, 8), 10);
    if (this.isValidDateParts(year3, month3, day3)) {
      validFormats.push({ year: year3, month: month3, day: day3, format: 'MMDDYYYY' });
    }
    
    // Try YYYYDDMM
    const year4 = parseInt(dateStr.substring(0, 4), 10);
    const day4 = parseInt(dateStr.substring(4, 6), 10);
    const month4 = parseInt(dateStr.substring(6, 8), 10);
    if (this.isValidDateParts(year4, month4, day4)) {
      validFormats.push({ year: year4, month: month4, day: day4, format: 'YYYYDDMM' });
    }
    
    return validFormats;
  }
  
  /**
   * Validate date parts are reasonable
   */
  private static isValidDateParts(year: number, month: number, day: number): boolean {
    return year >= 1900 && year <= 2100 && 
           month >= 1 && month <= 12 && 
           day >= 1 && day <= 31;
  }
} 