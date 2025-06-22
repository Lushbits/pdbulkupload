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
  field: 'departments' | 'employeeGroups';
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

  // Original data for reference (public for utility functions)
  public departments: PlandayDepartment[] = [];
  public employeeGroups: PlandayEmployeeGroup[] = [];

  constructor() {}

  /**
   * Initialize the service with Planday department and employee group data
   */
  initialize(departments: PlandayDepartment[], employeeGroups: PlandayEmployeeGroup[]): void {
    // Store the original data
    this.departments = departments;
    this.employeeGroups = employeeGroups;

    // Clear previous data
    this.departmentsByName.clear();
    this.departmentsById.clear();
    this.employeeGroupsByName.clear();
    this.employeeGroupsById.clear();

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
      const fields: Array<'departments' | 'employeeGroups'> = ['departments', 'employeeGroups'];
      fields.forEach((field) => {
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
              const pattern = errorPatterns.get(key) || {
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
      const fieldValue = employee[pattern.field];
      if (!fieldValue || !fieldValue.includes(pattern.invalidName)) {
        return employee;
      }

      // Handle comma-separated values properly
      const updatedValue = fieldValue
        .split(',')
        .map((item: string) => item.trim())
        .map((item: string) => 
          item.toLowerCase() === pattern.invalidName.toLowerCase() ? newValue : item
        )
        .join(', ');

      return {
        ...employee,
        [pattern.field]: updatedValue,
        _bulkCorrected: {
          ...employee._bulkCorrected,
          [pattern.field]: [...(employee._bulkCorrected?.[pattern.field] || []), {
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
  getAvailableOptions(type: 'departments' | 'employeeGroups'): Array<{id: number, name: string}> {
    const result = type === 'departments'
      ? this.departments.map(d => ({id: d.id, name: d.name}))
      : this.employeeGroups.map(g => ({id: g.id, name: g.name}));
    

    
    return result;
  }

  /**
   * Validate and convert employee data for Planday API
   */
  validateAndConvert(employee: any): {
    isValid: boolean;
    converted: any;
    errors: ValidationError[];
  } {
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
  initialize(departments: PlandayDepartment[], employeeGroups: PlandayEmployeeGroup[]): void {
    mappingService.initialize(departments, employeeGroups);
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
  validateEmployee(employee: any) {
    return mappingService.validateAndConvert(employee);
  },

  /**
   * Get available options for dropdowns
   */
  getAvailableOptions(type: 'departments' | 'employeeGroups') {
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
        console.log(`🔒 Force-marking '${field}' as required (business-critical field)`);
        apiRequiredFields.push(field);
      }
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
        console.log(`✨ Found custom field: ${fieldName} -> "${fieldConfig.description || fieldName}"`);
        customFields.push({
          name: fieldName,
          description: fieldConfig.description || fieldName
        });
      }
    }

    console.log(`✅ Found ${customFields.length} custom fields:`, customFields.map(f => f.name));
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