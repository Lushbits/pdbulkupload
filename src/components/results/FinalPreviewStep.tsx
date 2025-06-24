import React, { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import type { Employee } from '../../types/planday';
import { mappingService, ValidationService } from '../../services/mappingService';

interface FinalPreviewStepProps {
  employees: Employee[];
  onBack: () => void;
  onStartUpload: () => void;
}

/**
 * Final Preview Step Component
 * 
 * This step provides a comprehensive final review of all employee data
 * before proceeding to the bulk upload. Users can:
 * - Review all validated and corrected employee data
 * - See upload statistics and summary
 * - Navigate back to make final changes if needed
 * - Proceed to start the bulk upload process
 */
const FinalPreviewStep: React.FC<FinalPreviewStepProps> = ({
  employees,
  onBack,
  onStartUpload
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 100;

  // Debug: Log what employees data we receive
  useEffect(() => {
    console.log('🔍 FinalPreviewStep received employees:', employees.length);
    console.log('🔍 First employee:', employees[0]);
    console.log('🔍 All employees:', employees);
  }, [employees]);

  // Helper function to get display name for field
  const getFieldDisplayName = (fieldName: string): string => {
    // Check if it's a custom field
    const customFields = ValidationService.getCustomFields();
    const customField = customFields.find(f => f.name === fieldName);
    
    if (customField && customField.description) {
      // For custom fields, show human-readable description
      return customField.description;
    }
    
    // For standard fields, show raw field names (consistent with modal and mapping)
    return fieldName;
  };

  // Convert the first employee to show exactly what will be sent to Planday API
  const [convertedEmployee, setConvertedEmployee] = useState<any>(null);
  
  useEffect(() => {
    const convertFirstEmployee = async () => {
      if (employees.length === 0) {
        setConvertedEmployee(null);
        return;
      }
      
      const result = await mappingService.validateAndConvert(employees[0]);
      const converted = result.converted;
    
      // Create a clean payload by including all non-internal fields from the converted employee
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

      setConvertedEmployee(cleanPayload);
    };
    
    convertFirstEmployee();
  }, [employees]);

  // Calculate statistics for the preview
  const stats = {
    totalEmployees: employees.length,
    withDepartments: employees.filter(emp => emp.departments && emp.departments.trim().length > 0).length,
    withEmployeeGroups: employees.filter(emp => emp.employeeGroups && emp.employeeGroups.trim().length > 0).length,
    withPhoneNumbers: employees.filter(emp => emp.cellPhone || emp.phone).length,
    withAddresses: employees.filter(emp => emp.street1 && emp.city).length,
  };

  // Calculate pagination
  const totalPages = Math.ceil(employees.length / employeesPerPage);
  const startIndex = (currentPage - 1) * employeesPerPage;
  const endIndex = startIndex + employeesPerPage;
  const displayEmployees = employees.slice(startIndex, endIndex);

  // Get all unique field names from all employees to create table columns
  const [allFields, setAllFields] = useState<string[]>([]);
  
  useEffect(() => {
    const getAllFieldsAsync = async () => {
      const fieldSet = new Set<string>();
      
      for (const emp of employees) {
        const result = await mappingService.validateAndConvert(emp);
        const converted = result.converted;
        const internalFields = new Set(['rowIndex', 'originalData', '__internal_id', '_id', '_bulkCorrected']);
        
        Object.keys(converted).forEach(key => {
          if (!internalFields.has(key) && converted[key] != null && converted[key] !== '') {
            fieldSet.add(key);
          }
        });
      }
      
      // Sort fields with important ones first
      const importantFields = ['firstName', 'lastName', 'userName', 'email'];
      const otherFields = Array.from(fieldSet).filter(field => !importantFields.includes(field)).sort();
      
      setAllFields([...importantFields.filter(field => fieldSet.has(field)), ...otherFields]);
    };
    
    getAllFieldsAsync();
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Review</h2>
          <p className="text-gray-600">
            Review your employee data before uploading to Planday. 
            All validations have been completed and corrections applied.
          </p>
        </div>
      </Card>



      {/* Employee Data Table */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Employee Data Table</h3>
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, employees.length)} of {employees.length} employees
            </p>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>
          )}
        </div>

        {/* Table with horizontal scroll */}
        <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  #
                </th>
                {allFields.filter(field => !['rowIndex', 'originalData', '__internal_id', '_id', '_bulkCorrected'].includes(field)).map(field => (
                  <th
                    key={field}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 sticky top-0 z-20"
                  >
                    <span className="font-mono normal-case">{getFieldDisplayName(field)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayEmployees.map((employee, index) => {
                // Note: For table display, we'll use basic employee data since async conversion would complicate the rendering
                // The real conversion happens in the upload step where async is properly handled
                const converted = employee;
                // Filter out internal fields that shouldn't be displayed
                const internalFields = new Set(['rowIndex', 'originalData', '__internal_id', '_id', '_bulkCorrected']);
                
                return (
                  <tr key={`employee-${startIndex + index}`} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm text-gray-900 border-r border-gray-200 font-medium">
                      {startIndex + index + 1}
                    </td>
                    {allFields.filter(field => !internalFields.has(field)).map(field => {
                      const value = converted[field];
                      let displayValue = '';
                      
                      if (value == null || value === '') {
                        displayValue = '-';
                      } else if (Array.isArray(value)) {
                        displayValue = value.join(', ');
                      } else if (field.includes('Date') && value) {
                        displayValue = new Date(value).toLocaleDateString();
                      } else {
                        displayValue = String(value);
                      }
                      
                      return (
                        <td
                          key={field}
                          className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap"
                          title={displayValue}
                        >
                          <div className="max-w-32 truncate">
                            {displayValue}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          {allFields.length} columns • {employees.length} total employees • Page {currentPage} of {totalPages}
        </div>
      </Card>

      {/* JSON Payload Preview */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">API Payload Preview</h4>
              <p className="text-gray-600 text-sm mb-4">
                This shows exactly what will be sent to the Planday API for the first employee. 
                All other employees will follow the same structure with their respective data.
              </p>
            </div>
          </div>
          
          {convertedEmployee && (
            <div className="bg-gray-50 rounded border border-gray-200 p-4 max-h-60 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-2 font-medium">
                Sample JSON for: {employees[0].firstName} {employees[0].lastName} (Converted for Planday API)
              </div>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(convertedEmployee, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Card>

      {/* Important Notes */}
      <Card className="bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-800 mb-2">Before You Continue</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Once you start the upload, the process cannot be undone</li>
              <li>• All {stats.totalEmployees} employees will be created in your Planday account</li>
              <li>• Make sure you have the necessary permissions in Planday</li>
              <li>• The upload process may take several minutes depending on the number of employees</li>
              <li>• You can go back to make changes if needed</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
        <Button
          variant="secondary"
          onClick={onBack}
          className="flex items-center space-x-2 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Validation</span>
        </Button>

        <Button
          variant="primary"
          onClick={onStartUpload}
          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Start Upload ({stats.totalEmployees} employees)</span>
        </Button>
      </div>
    </div>
  );
};

export default FinalPreviewStep; 