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
  PlandayFieldDefinitionsSchema
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
      try {
        const { PhoneParser } = await import('../utils');
        const parseResult = PhoneParser.parsePhoneNumber(cellPhoneStr);
        
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
        }
      } catch (error) {
        console.warn('⚠️ Error parsing phone number:', error);
        // Fallback to original value
        converted.cellPhone = cellPhoneStr;
      }
    }

    // Handle landline phone numbers similarly
    // Convert phone to string and check if it's not empty
    const phoneStr = employee.phone?.toString()?.trim() || '';
    if (phoneStr !== '') {
      try {
        const { PhoneParser } = await import('../utils');
        const parseResult = PhoneParser.parsePhoneNumber(phoneStr);
        
        if (parseResult.isValid && parseResult.phoneNumber && parseResult.countryCode) {
          converted.phone = parseResult.phoneNumber;
          converted.phoneCountryCode = parseResult.countryCode;
          if (parseResult.countryId) {
            converted.phoneCountryId = parseResult.countryId;
          }
        } else {
          converted.phone = phoneStr;
        }
      } catch (error) {
        console.warn('⚠️ Error parsing landline phone number:', error);
        converted.phone = phoneStr;
      }
    }

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
    const deptNames = this.getAvailableNames('departments').slice(0, 3).join(',');
    const groupNames = this.getAvailableNames('employeeGroups').slice(0, 2).join(',');

    return {
      headers: [
        'firstName',
        'lastName', 
        'userName',
        'departments',
        'employeeGroups',
        'cellPhone',
        'hireDate'
      ],
      examples: [
        ['John', 'Smith', 'john.smith@company.com', deptNames, groupNames, '+1234567890', '2024-01-15'],
        ['Jane', 'Doe', 'jane.doe@company.com', 'Kitchen', 'Chef', '+1234567891', '2024-02-01']
      ],
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
    const fieldDefinitionsStatus = ValidationService.getStatus();
    
    console.log('🔍 Template Generation Debug:', {
      requiredFields,
      customFieldsCount: customFields.length,
      customFields: customFields.map(cf => ({ name: cf.name, description: cf.description })),
      fieldDefinitionsStatus
    });
    
    // Define logical field order (most important first)
    const fieldPriority = [
      'firstName', 'lastName', 'userName', 'departments', 'employeeGroups',
      'cellPhone', 'phone', 'email', 'hireDate', 'birthDate', 
      'street1', 'city', 'zip', 'gender', 'jobTitle', 'employeeId', 
      'payrollId', 'ssn', 'bankAccount'
    ];
    
    // Build ordered field list
    const fieldOrder: Array<{ field: string; displayName: string; isRequired: boolean; isCustom: boolean; description?: string }> = [];
    
    // Add required fields first (in priority order)
    fieldPriority.forEach(field => {
      if (requiredFields.includes(field)) {
        fieldOrder.push({
          field,
          displayName: field.replace(/([A-Z])/g, ' $1').trim(),
          isRequired: true,
          isCustom: false
        });
      }
    });
    
    // Add remaining optional fields (in priority order)
    fieldPriority.forEach(field => {
      if (!requiredFields.includes(field) && !fieldOrder.some(f => f.field === field)) {
        fieldOrder.push({
          field,
          displayName: field.replace(/([A-Z])/g, ' $1').trim(),
          isRequired: false,
          isCustom: false
        });
      }
    });
    
    // Add custom fields at the end
    customFields.forEach(customField => {
      fieldOrder.push({
        field: customField.name,
        displayName: customField.description || customField.name,
        isRequired: ValidationService.isRequired(customField.name),
        isCustom: true,
        description: customField.description
      });
    });
    
    // Generate headers (only include relevant fields)
    const headers = fieldOrder.map(f => f.displayName);
    
    // Get sample data for departments and employee groups
    const sampleDepartments = mappingService.getAvailableNames('departments').slice(0, 2).join(', ') || 'Kitchen, Bar';
    const sampleEmployeeGroups = mappingService.getAvailableNames('employeeGroups').slice(0, 2).join(', ') || 'Chef, Manager';
    
    // Generate example rows with realistic data
    const examples = [
      [
        'John', 'Smith', 'john.smith@company.com', sampleDepartments, sampleEmployeeGroups,
        '+1-555-0123', '+1-555-0123', 'john.smith@company.com', '2024-01-15', '1990-03-15',
        '123 Main St', 'New York', '10001', 'Male', 'Kitchen Manager', 'EMP001',
        'PAY001', '', '', ...customFields.map(() => 'Sample Value')
      ].slice(0, headers.length),
      [
        'Jane', 'Doe', 'jane.doe@company.com', 'Kitchen', 'Chef',
        '+1-555-0124', '+1-555-0124', 'jane.doe@company.com', '2024-02-01', '1985-07-22',
        '456 Oak Ave', 'Los Angeles', '90210', 'Female', 'Senior Chef', 'EMP002',
        'PAY002', '', '', ...customFields.map(() => 'Sample Value')
      ].slice(0, headers.length),
      [
        'Mike', 'Johnson', 'mike.johnson@company.com', 'Bar', 'Bartender',
        '+1-555-0125', '+1-555-0125', 'mike.johnson@company.com', '2024-03-10', '1992-11-08',
        '789 Pine Rd', 'Chicago', '60601', 'Male', 'Head Bartender', 'EMP003',
        'PAY003', '', '', ...customFields.map(() => 'Sample Value')
      ].slice(0, headers.length)
    ];
    
    // Generate instructions
    const instructions: Record<string, string> = {
      general: 'Fill in employee data. Required fields must be completed. Use the exact department and employee group names from your Planday portal.',
      firstName: 'Employee\'s first name (required)',
      lastName: 'Employee\'s last name (required)',
      userName: 'Email address that will be used for login (required, must be unique)',
      departments: `Department names from your portal. Use comma-separated names for multiple departments. Available: ${mappingService.getAvailableNames('departments').join(', ')}`,
      employeeGroups: `Employee group names from your portal. Use comma-separated names for multiple groups. Available: ${mappingService.getAvailableNames('employeeGroups').join(', ')}`,
      cellPhone: 'Mobile phone number (optional)',
      phone: 'Work phone number (optional)',
      email: 'Email address (if different from userName)',
      hireDate: 'Hire date in YYYY-MM-DD format (e.g., 2024-01-15)',
      birthDate: 'Birth date in YYYY-MM-DD format (e.g., 1990-03-15)',
      street1: 'Street address',
      city: 'City',
      zip: 'ZIP/Postal code',
      gender: 'Gender (Male/Female)',
      jobTitle: 'Job title or position',
      employeeId: 'Internal employee ID (if applicable)',
      payrollId: 'Payroll system ID (if applicable)',
      ssn: 'Social Security Number (if required by your portal)',
      bankAccount: 'Bank account information (if required by your portal)'
    };
    
    // Add custom field instructions
    customFields.forEach(customField => {
      instructions[customField.name] = customField.description || `Custom field: ${customField.name}`;
    });
    
    return {
      headers,
      examples,
      instructions,
      fieldOrder
    };
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
   */
  static getCustomFields(): Array<{ name: string; description: string }> {
    if (!this.fieldDefinitions) {
      console.warn('⚠️ Field definitions not loaded, custom fields unavailable');
      return [];
    }

    const customFields: Array<{ name: string; description: string }> = [];
    const standardFields = new Set([
      'firstName', 'lastName', 'email', 'departments', 'employeeGroups', 
      'cellPhone', 'phone', 'hireDate', 'birthDate', 'street1', 'city', 
      'zip', 'gender', 'ssn', 'employeeId', 'payrollId', 'jobTitle'
    ]);
    

    
    for (const [fieldName, fieldConfig] of Object.entries(this.fieldDefinitions.properties)) {
      // Consider any field that's not in our standard list as custom
      if (!standardFields.has(fieldName)) {
        // Individual custom field logging removed to reduce noise
        customFields.push({
          name: fieldName,
          description: fieldConfig.description || fieldName
        });
      }
    }

    // Mark as logged to prevent repeat logging
    // this.hasLoggedCustomFields = true;
    return customFields;
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
} 