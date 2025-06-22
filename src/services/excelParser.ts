/**
 * Excel Parser Service
 * Handles Excel file processing for employee data import
 * Features:
 * - File validation (.xlsx, .xls support)
 * - Header detection and normalization
 * - Data extraction with error handling
 * - Progress tracking for large files
 * - Memory-efficient processing
 */

import * as XLSX from 'xlsx';
import type {
  ParsedExcelData,
  ExcelColumnMapping,
  ValidationError,
} from '../types/planday';
import { VALIDATION_CONFIG, AUTO_MAPPING_RULES } from '../constants';

export interface ExcelParseOptions {
  maxRows?: number;
  maxFileSize?: number;
  onProgress?: (progress: number) => void;
  customFields?: Array<{ name: string; description: string }>;
}

export interface ExcelParseResult {
  success: boolean;
  data?: ParsedExcelData;
  error?: string;
  columnMappings?: ExcelColumnMapping[];
}

/**
 * Excel Parser Class
 * Handles all Excel file processing operations
 */
export class ExcelParser {
  /**
   * Parse Excel file and extract employee data
   */
  static async parseFile(
    file: File,
    options: ExcelParseOptions = {}
  ): Promise<ExcelParseResult> {
    const {
      maxRows = VALIDATION_CONFIG.MAX_EMPLOYEES,
      maxFileSize = VALIDATION_CONFIG.MAX_FILE_SIZE,
      onProgress,
      customFields,
    } = options;

    try {
      // Validate file before processing
      const validationError = this.validateFile(file, maxFileSize);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      onProgress?.(10); // File validation complete

      // Read file as array buffer
      console.log('📖 Reading Excel file...');
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      onProgress?.(30); // File read complete

      // Parse workbook
  
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellText: false,
        cellDates: true,
        raw: false, // Force string parsing to prevent scientific notation
      });

      onProgress?.(50); // Workbook parsed

      // Get first worksheet
      const worksheetName = workbook.SheetNames[0];
      if (!worksheetName) {
        return {
          success: false,
          error: 'No worksheets found in the Excel file.',
        };
      }

      const worksheet = workbook.Sheets[worksheetName];
      
      onProgress?.(70); // Worksheet selected

      // Extract data from worksheet with special handling for phone numbers
      
      // First, try to get raw text values to preserve phone number precision
      let rawData: any[][];
      try {
        // Get the range of the worksheet to read cell by cell
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        rawData = [];
        
        for (let row = range.s.r; row <= range.e.r; row++) {
          const rowData: any[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (!cell) {
              rowData.push('');
              continue;
            }
            
            // For cells that might be phone numbers (numeric but should be text)
            if (cell.t === 'n' && cell.w && (cell.w.includes('E+') || cell.w.includes('e+'))) {
              // Use the display value (cell.w) instead of the numeric value to preserve precision
              rowData.push(cell.w);
              console.log(`📱 Preserved phone number precision: ${cell.v} → ${cell.w}`);
            } else if (cell.t === 'n' && cell.v && cell.v > 1000000000) {
              // Large numbers that might be phone numbers - use raw value as string
              rowData.push(cell.v.toString());
            } else if (cell.w !== undefined) {
              // Use formatted/display value
              rowData.push(cell.w);
            } else {
              // Use raw value
              rowData.push(cell.v || '');
            }
          }
          rawData.push(rowData);
        }
      } catch (error) {
        console.warn('⚠️ Cell-by-cell reading failed, falling back to standard method:', error);
        // Fallback to standard method
        rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false, // Prevent scientific notation
          defval: '', // Default value for empty cells
          dateNF: 'yyyy-mm-dd', // Standardize date format
        }) as any[][];
      }

      if (rawData.length === 0) {
        return {
          success: false,
          error: 'The Excel file appears to be empty.',
        };
      }

      onProgress?.(85); // Data extracted

      // Process the data
      const processedData = this.processRawData(rawData, maxRows, file);
      
      onProgress?.(95); // Data processed

      // Generate column mappings with custom fields
      const columnMappings = this.generateColumnMappings(processedData.headers, customFields);

      onProgress?.(100); // Complete

      console.log(`✅ Excel parsing complete: ${processedData.totalRows} rows, ${processedData.headers.length} columns`);

      return {
        success: true,
        data: processedData,
        columnMappings,
      };

    } catch (error) {
      console.error('❌ Excel parsing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error 
          ? `Failed to parse Excel file: ${error.message}`
          : 'An unknown error occurred while parsing the Excel file.',
      };
    }
  }

  /**
   * Validate Excel file before processing
   */
  private static validateFile(file: File, maxFileSize: number): string | null {
    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      return `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB).`;
    }

    // Check file type
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!VALIDATION_CONFIG.SUPPORTED_FILE_TYPES.some(type => type.substring(1) === fileExtension)) {
      return `Unsupported file type. Please upload ${VALIDATION_CONFIG.SUPPORTED_FILE_TYPES.join(' or ')} files.`;
    }

    // Check file name
    if (!file.name || file.name.length < 5) {
      return 'Invalid file name. Please ensure the file has a proper name.';
    }

    return null; // No validation errors
  }

  /**
   * Read file as array buffer with progress tracking
   */
  private static readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process raw Excel data into structured format
   */
  private static processRawData(
    rawData: any[][],
    maxRows: number,
    file: File
  ): ParsedExcelData {
    // Extract headers (first row)
    const headers = rawData[0]?.map((header, index) => {
      // Handle empty or undefined headers
      if (!header || header.toString().trim() === '') {
        return `Column ${index + 1}`;
      }
      return this.normalizeHeader(header.toString());
    }) || [];

    // Extract data rows (skip header row)
    const dataRows = rawData.slice(1);

    // Limit rows if necessary
    const limitedRows = maxRows > 0 ? dataRows.slice(0, maxRows) : dataRows;

    // Clean and normalize data
    const cleanedRows = limitedRows.map((row) => {
      return headers.map((_, colIndex) => {
        const cellValue = row[colIndex];
        return this.normalizeCellValue(cellValue);
      });
    });

    // Filter out completely empty rows
    const nonEmptyRows = cleanedRows.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '')
    );

    console.log(`📋 Processed ${nonEmptyRows.length} non-empty rows from ${dataRows.length} total rows`);

    return {
      headers,
      rows: nonEmptyRows,
      totalRows: nonEmptyRows.length,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  /**
   * Normalize header text for consistent matching
   * Preserves international characters (ä, ö, å, ü, etc.)
   */
  private static normalizeHeader(header: string): string {
    return header
      .toString()
      .trim()
      .toLowerCase()
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      // Remove special characters but keep spaces, letters (including international), and digits
      // This preserves characters like ä, ö, å, ü, ñ, etc.
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
  }

  /**
   * Normalize cell values with proper type handling
   */
  private static normalizeCellValue(value: any): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle empty strings
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    // Handle dates
    if (value instanceof Date) {
      // Format as YYYY-MM-DD for Planday API
      return value.toISOString().split('T')[0];
    }

    // Handle numbers
    if (typeof value === 'number') {
      // Check if it's a date serial number (Excel dates)
      if (value > 25000 && value < 50000) {
        // Likely an Excel date serial number
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      return value;
    }

    // Handle strings
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Handle scientific notation from Excel (common with phone numbers)
      if (trimmed.includes('E+') || trimmed.includes('e+')) {
        try {
          // Use more precise conversion for scientific notation
          const scientificMatch = trimmed.match(/^(\d+\.?\d*)[eE]\+(\d+)$/);
          if (scientificMatch) {
            const [, mantissa, exponent] = scientificMatch;
            const mantissaNum = parseFloat(mantissa);
            const exp = parseInt(exponent, 10);
            
            if (!isNaN(mantissaNum) && !isNaN(exp) && mantissaNum > 1 && exp >= 6) {
              // For phone numbers, try to reconstruct the original precision
              const phoneNumber = (mantissaNum * Math.pow(10, exp)).toFixed(0);
              console.log(`📱 Excel scientific notation converted: ${trimmed} → ${phoneNumber}`);
              return phoneNumber;
            }
          }
          
          // Fallback to regular parsing
          const numericValue = parseFloat(trimmed);
          if (!isNaN(numericValue) && numericValue > 1000000) { // Likely a phone number
            const phoneNumber = Math.round(numericValue).toString();
            console.log(`📱 Excel scientific notation converted (fallback): ${trimmed} → ${phoneNumber}`);
            return phoneNumber;
          }
        } catch (error) {
          console.warn(`⚠️ Could not convert scientific notation: ${trimmed}`);
        }
      }
      
      // Try to parse as date if it looks like a date
      if (this.isDateString(trimmed)) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return trimmed;
    }

    // Return as-is for other types
    return value;
  }

  /**
   * Check if a string looks like a date
   */
  private static isDateString(value: string): boolean {
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{2}\.\d{2}\.\d{4}$/, // MM.DD.YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ];

    return datePatterns.some(pattern => pattern.test(value));
  }

  /**
   * Generate automatic column mappings
   * Now includes custom fields from Planday for more intelligent auto-mapping
   */
  private static generateColumnMappings(headers: string[], customFields?: Array<{ name: string; description: string }>): ExcelColumnMapping[] {
    const mappings: ExcelColumnMapping[] = [];

    headers.forEach((header) => {
      const normalizedHeader = this.normalizeHeader(header);
      let plandayField: string | null = null;
      let plandayFieldDisplayName: string | null = null;
      let isRequired = false;

      // 1. Try to auto-map based on predefined AUTO_MAPPING_RULES
      for (const [field, patterns] of Object.entries(AUTO_MAPPING_RULES)) {
        if (patterns.some(pattern => normalizedHeader.includes(pattern))) {
          plandayField = field;
          // For standard fields, create a display name from the field name
          plandayFieldDisplayName = field.replace(/([A-Z])/g, ' $1').trim();
          break;
        }
      }

      // 2. If no standard field matched, try to match against custom fields
      if (!plandayField && customFields) {
        for (const customField of customFields) {
          const normalizedCustomFieldName = this.normalizeHeader(customField.name);
          const normalizedCustomFieldDescription = this.normalizeHeader(customField.description);
          
          // Try exact match with field name
          if (normalizedHeader === normalizedCustomFieldName) {
            plandayField = customField.name;
            plandayFieldDisplayName = customField.description; // Use description as display name
            console.log(`🎯 Auto-mapped custom field: "${header}" → "${customField.description}" (${customField.name})`);
            break;
          }
          
          // Try exact match with field description
          if (normalizedHeader === normalizedCustomFieldDescription) {
            plandayField = customField.name;
            plandayFieldDisplayName = customField.description;
            console.log(`🎯 Auto-mapped custom field: "${header}" → "${customField.description}" (${customField.name})`);
            break;
          }
          
          // Try contains match (for flexibility)
          if (normalizedHeader.includes(normalizedCustomFieldName) || normalizedCustomFieldName.includes(normalizedHeader)) {
            plandayField = customField.name;
            plandayFieldDisplayName = customField.description;
            console.log(`🎯 Auto-mapped custom field: "${header}" → "${customField.description}" (${customField.name})`);
            break;
          }
        }
      }

      // Check if field is required
      if (plandayField && VALIDATION_CONFIG.FALLBACK_REQUIRED_FIELDS.includes(plandayField as any)) {
        isRequired = true;
      }

      mappings.push({
        excelColumn: header,
        plandayField: plandayField as any,
        plandayFieldDisplayName: plandayFieldDisplayName || undefined,
        isRequired,
        isMapped: !!plandayField,
      });
    });

    const mappedCount = mappings.filter(m => m.isMapped).length;
    const customFieldMappedCount = mappings.filter(m => m.isMapped && customFields?.some(cf => cf.name === m.plandayField)).length;
    
    console.log(`🎯 Auto-mapped ${mappedCount}/${headers.length} columns (${customFieldMappedCount} custom fields)`);

    return mappings;
  }

  /**
   * Validate parsed data for common issues
   */
  static validateParsedData(data: ParsedExcelData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for empty data
    if (data.totalRows === 0) {
      errors.push({
        field: 'general',
        value: null,
        message: 'The Excel file contains no data rows.',
        rowIndex: -1,
        severity: 'error',
      });
      return errors;
    }

    // Check for too many rows
    if (data.totalRows > VALIDATION_CONFIG.MAX_EMPLOYEES) {
      errors.push({
        field: 'general',
        value: data.totalRows,
        message: `Too many rows (${data.totalRows}). Maximum allowed is ${VALIDATION_CONFIG.MAX_EMPLOYEES}.`,
        rowIndex: -1,
        severity: 'error',
      });
    }

    // Check for empty headers
    const emptyHeaders = data.headers.filter((header) => 
      !header || header.trim() === '' || header.startsWith('Column ')
    );

    if (emptyHeaders.length > 0) {
      errors.push({
        field: 'headers',
        value: emptyHeaders.length,
        message: `Found ${emptyHeaders.length} empty or unnamed columns. Please ensure all columns have descriptive headers.`,
        rowIndex: -1,
        severity: 'warning',
      });
    }

    // Check for duplicate headers
    const headerCounts = data.headers.reduce((acc, header) => {
      acc[header] = (acc[header] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicateHeaders = Object.entries(headerCounts)
      .filter(([_, count]) => count > 1)
      .map(([header, _]) => header);

    if (duplicateHeaders.length > 0) {
      errors.push({
        field: 'headers',
        value: duplicateHeaders,
        message: `Found duplicate column headers: ${duplicateHeaders.join(', ')}. Each column should have a unique name.`,
        rowIndex: -1,
        severity: 'warning',
      });
    }


    return errors;
  }

  /**
   * Get sample data for preview (first 5 rows)
   */
  static getSampleData(data: ParsedExcelData, maxRows: number = 5): any[][] {
    return data.rows.slice(0, maxRows);
  }

  /**
   * Export data back to Excel (for corrections or downloads)
   */
  static exportToExcel(data: ParsedExcelData, filename?: string): void {
    try {
      // Create new workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data with headers
      const exportData = [data.headers, ...data.rows];
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(exportData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Data');
      
      // Generate filename
      const exportFilename = filename || `${data.fileName.replace(/\.[^/.]+$/, '')}_processed.xlsx`;
      
      // Download file
      XLSX.writeFile(workbook, exportFilename);
      
      console.log(`✅ Excel file exported: ${exportFilename}`);
    } catch (error) {
      console.error('❌ Excel export failed:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Generate and download Excel template based on portal configuration
   */
  static downloadTemplate(templateData: {
    headers: string[];
    examples: string[][];
    instructions: Record<string, string>;
    fieldOrder: Array<{ field: string; displayName: string; isRequired: boolean; isCustom: boolean; description?: string }>;
  }): void {
    try {
      // Create new workbook
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1: Employee Data Template
      // Use clean headers without asterisks for proper import compatibility
      const cleanHeaders = templateData.fieldOrder.map(field => field.displayName);
      
      const employeeData = [cleanHeaders, ...templateData.examples];
      const employeeWorksheet = XLSX.utils.aoa_to_sheet(employeeData);
      
      // Style the header row with different colors for required vs optional fields
      const headerRange = XLSX.utils.decode_range(employeeWorksheet['!ref'] || 'A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!employeeWorksheet[cellAddress]) continue;
        
        const field = templateData.fieldOrder[col];
        const isRequired = field?.isRequired || false;
        const isCustom = field?.isCustom || false;
        
        // Different colors for required, optional, and custom fields
        let fillColor = 'E6F3FF'; // Default blue for optional
        if (isRequired) {
          fillColor = 'FFE6E6'; // Light red for required
        } else if (isCustom) {
          fillColor = 'F0F8E8'; // Light green for custom
        }
        
        employeeWorksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: fillColor } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
      
      // Set column widths for better readability
      const columnWidths = templateData.headers.map(header => {
        if (header.includes('Email') || header.includes('User Name')) return { wch: 25 };
        if (header.includes('Department') || header.includes('Employee Group')) return { wch: 20 };
        if (header.includes('Address') || header.includes('Street')) return { wch: 30 };
        if (header.includes('Phone')) return { wch: 15 };
        return { wch: 12 };
      });
      employeeWorksheet['!cols'] = columnWidths;
      
      // Keep data sheet clean for import compatibility - all info is in Instructions tab
      
      XLSX.utils.book_append_sheet(workbook, employeeWorksheet, 'Employee Data');
      
      // Sheet 2: Instructions
      const instructionData: string[][] = [
        ['Field', 'Required', 'Type', 'Instructions'],
        ...templateData.fieldOrder.map(field => [
          field.displayName,
          field.isRequired ? 'Yes' : 'No',
          field.isCustom ? 'Custom' : 'Standard',
          templateData.instructions[field.field] || field.description || 'Enter appropriate value'
        ])
      ];
      
      const instructionWorksheet = XLSX.utils.aoa_to_sheet(instructionData);
      
      // Style the instruction sheet header
      const instructionHeaderRange = XLSX.utils.decode_range(instructionWorksheet['!ref'] || 'A1');
      for (let col = instructionHeaderRange.s.c; col <= instructionHeaderRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!instructionWorksheet[cellAddress]) continue;
        
        instructionWorksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'F0F8E8' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
      
      // Set column widths for instructions sheet
      instructionWorksheet['!cols'] = [
        { wch: 20 }, // Field
        { wch: 10 }, // Required
        { wch: 10 }, // Type
        { wch: 50 }  // Instructions
      ];
      
      XLSX.utils.book_append_sheet(workbook, instructionWorksheet, 'Instructions');
      
      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `Planday_Employee_Template_${today}.xlsx`;
      
      // Download file
      XLSX.writeFile(workbook, filename);
      
      console.log(`✅ Template downloaded: ${filename}`);
    } catch (error) {
      console.error('❌ Template download failed:', error);
      throw new Error('Failed to download template');
    }
  }
}

/**
 * Convenience functions for common operations
 */
export const ExcelUtils = {
  /**
   * Parse Excel file
   */
  async parseFile(
    file: File,
    options?: ExcelParseOptions
  ): Promise<ExcelParseResult> {
    return ExcelParser.parseFile(file, options);
  },

  /**
   * Validate parsed data
   */
  validateData(data: ParsedExcelData): ValidationError[] {
    return ExcelParser.validateParsedData(data);
  },

  /**
   * Get sample data for preview
   */
  getSample(data: ParsedExcelData, maxRows?: number): any[][] {
    return ExcelParser.getSampleData(data, maxRows);
  },

  /**
   * Export data to Excel
   */
  exportToExcel(data: ParsedExcelData, filename?: string): void {
    return ExcelParser.exportToExcel(data, filename);
  },

  /**
   * Check if file is valid Excel format
   */
  isValidExcelFile(file: File): boolean {
    const fileExtension = file.name.toLowerCase().split('.').pop();
    return VALIDATION_CONFIG.SUPPORTED_FILE_TYPES.some(
      type => type.substring(1) === fileExtension
    );
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Download Excel template based on portal configuration
   */
  downloadTemplate(templateData: {
    headers: string[];
    examples: string[][];
    instructions: Record<string, string>;
    fieldOrder: Array<{ field: string; displayName: string; isRequired: boolean; isCustom: boolean; description?: string }>;
  }): void {
    return ExcelParser.downloadTemplate(templateData);
  },
}; 