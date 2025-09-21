/**
 * Excel Export Service for Edit Workflow
 * Generates Excel files with employee data for bulk editing
 */

import * as ExcelJS from 'exceljs';
import type { 
  EditEmployee, 
  EditDepartment, 
  EditEmployeeGroup 
} from '../types';

export interface ExcelExportData {
  employees: EditEmployee[];
  departments: EditDepartment[];
  employeeGroups: EditEmployeeGroup[];
}

export interface ExcelExportOptions {
  filename?: string;
  includeExamples?: boolean;
  includeInstructions?: boolean;
}

/**
 * Excel Export Service for Edit Workflow
 * Handles generation of Excel files with employee data for bulk editing
 */
export class ExcelExportService {
  
  /**
   * Generate and download Excel file with employee data
   */
  static async downloadEmployeeExcel(
    data: ExcelExportData,
    options: ExcelExportOptions = {}
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Configure workbook metadata
    workbook.creator = 'Planday Bulk Edit';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Generate the main data sheet
    this.createDataSheet(workbook, data);
    
    // Add instructions sheet if requested
    if (options.includeInstructions !== false) {
      this.createInstructionsSheet(workbook, data);
    }
    
    // Download the file
    const filename = options.filename || this.generateFilename(data.employees.length);
    await this.downloadWorkbook(workbook, filename);
  }
  
  /**
   * Create the main data sheet with employee information
   */
  private static createDataSheet(workbook: ExcelJS.Workbook, data: ExcelExportData): ExcelJS.Worksheet {
    const worksheet = workbook.addWorksheet('Employee Data');
    
    // Generate headers
    const headers = this.generateHeaders(data.departments, data.employeeGroups);
    
    // Add header row
    const headerRow = worksheet.addRow(headers);
    this.styleHeaderRow(headerRow);
    
    // Add employee data rows
    data.employees.forEach(employee => {
      const rowData = this.generateEmployeeRow(employee, data.departments, data.employeeGroups);
      worksheet.addRow(rowData);
    });
    
    // Auto-fit columns
    this.autoFitColumns(worksheet, headers);
    
    return worksheet;
  }
  
  /**
   * Generate column headers based on departments and employee groups
   */
  private static generateHeaders(departments: EditDepartment[], employeeGroups: EditEmployeeGroup[]): string[] {
    const headers: string[] = [
      'Employee ID',
      'First Name', 
      'Last Name',
      'Email (Username)',
      'Cell Phone'
    ];
    
    // Add department columns
    departments.forEach(dept => {
      headers.push(`Dept: ${dept.name}`);
    });
    
    // Add employee group columns
    employeeGroups.forEach(group => {
      headers.push(`Group: ${group.name}`);
    });
    
    // Add supervisor column
    headers.push('Supervisor');
    
    // Add contract rules column
    headers.push('Contract Rules');
    
    return headers;
  }
  
  /**
   * Generate data row for a single employee
   */
  private static generateEmployeeRow(
    employee: EditEmployee,
    departments: EditDepartment[],
    employeeGroups: EditEmployeeGroup[]
  ): (string | number)[] {
    const rowData: (string | number)[] = [
      employee.id,
      employee.firstName || '',
      employee.lastName || '',
      employee.userName || '',
      employee.cellPhone || ''
    ];
    
    // Add department assignments
    departments.forEach(dept => {
      const isAssigned = employee.departments?.some(empDept => empDept.id === dept.id);
      rowData.push(isAssigned ? 'X' : '');
    });
    
    // Add employee group assignments with rates
    employeeGroups.forEach(group => {
      const groupMembership = employee.employeeGroups?.find(empGroup => empGroup.id === group.id);
      if (groupMembership) {
        // Check if there's a payrate for this group (may not be available due to rate limiting)
        const payrate = employee.employeeGroupPayrates?.find(rate => rate.employeeGroupId === group.id);
        
        if (payrate && payrate.rate > 0) {
          rowData.push(payrate.rate);
        } else {
          // Show 'X' for assigned groups without rates (user can fill in manually)
          rowData.push('X');
        }
      } else {
        rowData.push(''); // Not assigned
      }
    });
    
    // Add supervisor information
    const supervisorDisplay = employee.supervisorName || 
      (employee.supervisorEmployeeId ? `ID: ${employee.supervisorEmployeeId}` : '');
    rowData.push(supervisorDisplay);
    
    // Add contract rules
    let contractDisplay = '';
    if (employee.contractRules && employee.contractRules.length > 0) {
      contractDisplay = employee.contractRules
        .map(rule => rule.name || `Rule ${rule.id}`)
        .join(', ');
    }
    rowData.push(contractDisplay);
    
    return rowData;
  }
  
  /**
   * Create instructions sheet with field descriptions and examples
   */
  private static createInstructionsSheet(workbook: ExcelJS.Workbook, data: ExcelExportData): ExcelJS.Worksheet {
    const worksheet = workbook.addWorksheet('Instructions');
    
    // Title
    const titleRow = worksheet.addRow(['Planday Bulk Edit - Instructions']);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:C1');
    
    worksheet.addRow([]);
    
    // Field descriptions
    worksheet.addRow(['Field', 'Description', 'Example']);
    const headerRow = worksheet.getRow(3);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Basic fields
    worksheet.addRow(['Employee ID', 'Unique identifier (read-only)', '12345']);
    worksheet.addRow(['First Name', 'Employee first name (read-only)', 'John']);
    worksheet.addRow(['Last Name', 'Employee last name (read-only)', 'Doe']);
    worksheet.addRow(['Email (Username)', 'Login email address', 'john.doe@company.com']);
    worksheet.addRow(['Cell Phone', 'Mobile phone number', '+45 12 34 56 78']);
    
    worksheet.addRow([]);
    
    // Department instructions
    worksheet.addRow(['Department Columns', 'Mark with X if employee belongs to department', 'X or blank']);
    data.departments.forEach(dept => {
      worksheet.addRow([`Dept: ${dept.name}`, `Assign to ${dept.name} department`, 'X']);
    });
    
    worksheet.addRow([]);
    
    // Employee group instructions
    worksheet.addRow(['Employee Group Columns', 'Replace X with hourly rate or leave as X for assignment', 'X or 25.50']);
    data.employeeGroups.forEach(group => {
      worksheet.addRow([`Group: ${group.name}`, `Replace X with hourly rate for ${group.name} group`, 'X or 25.50']);
    });
    
    worksheet.addRow([]);
    
    // Supervisor
    worksheet.addRow(['Supervisor', 'Current supervisor (read-only)', 'John Smith or ID: 12345']);
    
    // Contract rules
    worksheet.addRow(['Contract Rules', 'Assigned contract rules (read-only)', 'Standard Contract, Part Time']);
    
    worksheet.addRow([]);
    
    // General instructions
    worksheet.addRow(['General Instructions:', '', '']);
    worksheet.addRow(['IMPORTANT: Individual payrates were not loaded to avoid API limits', '', '']);
    worksheet.addRow(['Employee groups show "X" - replace with actual hourly rates', '', '']);
    worksheet.addRow(['', '', '']);
    worksheet.addRow(['1. Do not modify Employee ID, First Name, or Last Name', '', '']);
    worksheet.addRow(['2. For departments: Use X to assign, leave blank to unassign', '', '']);
    worksheet.addRow(['3. For employee groups: Replace X with hourly rate (e.g. 25.50)', '', '']);
    worksheet.addRow(['4. Supervisor and Contract Rules are read-only information', '', '']);
    worksheet.addRow(['5. Save as .xlsx format when uploading back', '', '']);
    
    // Auto-fit columns
    worksheet.columns = [
      { width: 25 },
      { width: 50 },
      { width: 25 }
    ];
    
    return worksheet;
  }
  
  /**
   * Style the header row
   */
  private static styleHeaderRow(headerRow: ExcelJS.Row): void {
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' }
    };
    
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }
  
  /**
   * Auto-fit columns based on content
   */
  private static autoFitColumns(worksheet: ExcelJS.Worksheet, headers: string[]): void {
    worksheet.columns = headers.map((header) => {
      let width = Math.max(header.length, 12);
      
      // Specific width adjustments
      if (header === 'Employee ID') width = 12;
      else if (header === 'First Name' || header === 'Last Name') width = 15;
      else if (header === 'Email (Username)') width = 25;
      else if (header === 'Cell Phone') width = 15;
      else if (header.startsWith('Dept:')) width = 12;
      else if (header.startsWith('Group:')) width = 12;
      else if (header === 'Supervisor') width = 20;
      else if (header === 'Contract Rules') width = 20;
      
      return { width: Math.min(width, 30) };
    });
  }
  
  /**
   * Generate filename based on current date and employee count
   */
  private static generateFilename(employeeCount: number): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return `planday_employees_${employeeCount}_${dateStr}.xlsx`;
  }
  
  /**
   * Download workbook as Excel file
   */
  private static async downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Export instance for convenience
 */
export const excelExportService = new ExcelExportService(); 