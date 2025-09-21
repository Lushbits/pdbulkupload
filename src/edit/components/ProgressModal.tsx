/**
 * Progress Modal Component
 * 
 * Full-screen modal that shows real-time progress of employee data loading
 * with a dynamic table that populates as data is fetched.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui';
import { RateLimitGauge } from './RateLimitGauge';
import type { EditEmployee, EditDepartment, EditEmployeeGroup, EditSupervisor } from '../types';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadExcel: () => void;
  isLoading: boolean;
  isCompleted: boolean;
  progress: number;
  employees: EditEmployee[];
  departments: EditDepartment[];
  employeeGroups: EditEmployeeGroup[];
  supervisors: EditSupervisor[];
  totalEmployees: number;
  currentEmployee: string;
  // Rate limit data
  rateLimitInfo?: {
    remaining: number;
    limit: number;
    resetTime: number;
    isActive: boolean;
  } | null;
}



export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  onClose,
  onDownloadExcel,
  isLoading,
  isCompleted,
  progress,
  employees,
  departments,
  employeeGroups,
  supervisors,
  totalEmployees,
  currentEmployee,
  rateLimitInfo
}) => {
  // IMPORTANT: All hooks must be called before any conditional returns
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
  // Calculate pagination (with null check)
  const totalPages = Math.ceil((employees || []).length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentEmployees = (employees || []).slice(startIndex, endIndex);

  // Create lookup maps for efficient display (with null checks)
  const supervisorMap = new Map((supervisors || []).map(supervisor => [supervisor.employeeId, supervisor]));

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation when modal is open and has multiple pages
      if (!isOpen || totalPages <= 1) return;
      
      // Don't handle if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          // A key - Previous page
          if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
          event.preventDefault();
          break;
        case 'd':
          // D key - Next page
          if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
          }
          event.preventDefault();
          break;
        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentPage, totalPages]);

  // Reset pagination when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Now we can safely do conditional returns after all hooks are defined
  if (!isOpen) return null;

  // Helper function to get supervisor name
  const getSupervisorName = (employee: EditEmployee) => {
    if (!employee.supervisorEmployeeId) return '-';
    const supervisor = supervisorMap.get(employee.supervisorEmployeeId);
    return supervisor?.name || `ID: ${employee.supervisorEmployeeId}`;
  };

  // Helper function to get contract rule names
  const getContractRuleNames = (employee: EditEmployee) => {
    if (!employee.contractRules || employee.contractRules.length === 0) return '-';
    return employee.contractRules
      .map(rule => rule.name || `Rule ${rule.id}`)
      .join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl m-4 flex flex-col h-[95vh] w-[95vw]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Loading Employee Data
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Rate Limit Gauge */}
          <RateLimitGauge rateLimitInfo={rateLimitInfo} />
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Progress: {(employees || []).length} of {totalEmployees} employees
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {isLoading && currentEmployee && (
              <div className="mt-2 text-sm text-gray-600">
                Currently loading: {currentEmployee}
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            <table className="w-full">
                             <thead className="bg-gray-50 sticky top-0">
                 <tr>
                   <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">First Name</th>
                   <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Last Name</th>
                   <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">User Name</th>
                   
                   {/* Dynamic Employee Group Columns */}
                   {(employeeGroups || []).map((group) => (
                     <th key={`group-${group.id}`} className="border-b border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-900">
                       <div>{group.name}</div>
                       <div className="text-xs text-gray-500 mt-1">Hourly Rate</div>
                     </th>
                   ))}
                   
                   {/* Dynamic Department Columns */}
                   {(departments || []).map((dept) => (
                     <th key={`dept-${dept.id}`} className="border-b border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-900">
                       <div>{dept.name}</div>
                       <div className="text-xs text-gray-500 mt-1">Department</div>
                     </th>
                   ))}
                   
                   <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Supervisor</th>
                   <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Contract Rules</th>
                 </tr>
               </thead>
                             <tbody>
                 {(currentEmployees || []).map((employee) => (
                   <tr key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                     <td className="px-4 py-3 text-sm text-gray-900">{employee.firstName || '-'}</td>
                     <td className="px-4 py-3 text-sm text-gray-900">{employee.lastName || '-'}</td>
                     <td className="px-4 py-3 text-sm text-gray-900">{employee.userName || '-'}</td>
                     
                     {/* Dynamic Employee Group Cells - Show hourly rates */}
                     {(employeeGroups || []).map((group) => {
                       const isInGroup = employee.employeeGroups?.some(empGroup => empGroup.id === group.id);
                       const payrate = employee.employeeGroupPayrates?.find(rate => rate.employeeGroupId === group.id);
                       
                       return (
                         <td key={`emp-${employee.id}-group-${group.id}`} className="px-3 py-3 text-sm text-center">
                           {isInGroup ? (
                             payrate && payrate.rate !== undefined ? (
                               <span className="text-green-700 font-medium" title={`${payrate.rate}/hour`}>
                                 {payrate.rate}
                               </span>
                             ) : (
                               <span className="inline-block w-3 h-3 bg-green-500 rounded-full" title="Member - Rate loading..."/>
                             )
                           ) : (
                             <span className="text-gray-300">-</span>
                           )}
                         </td>
                       );
                     })}
                     
                     {/* Dynamic Department Cells */}
                     {(departments || []).map((dept) => {
                       const isInDept = employee.departments?.some(empDept => empDept.id === dept.id);
                       return (
                         <td key={`emp-${employee.id}-dept-${dept.id}`} className="px-3 py-3 text-sm text-center">
                           {isInDept ? (
                             <span className="inline-block w-3 h-3 bg-blue-500 rounded-full" title="Member"/>
                           ) : (
                             <span className="text-gray-300">-</span>
                           )}
                         </td>
                       );
                     })}
                     
                     <td className="px-4 py-3 text-sm text-gray-900">
                       {employee.supervisorName ? (
                         <span className="text-orange-700 font-medium">{employee.supervisorName}</span>
                       ) : (
                         <span className="text-gray-500">{getSupervisorName(employee)}</span>
                       )}
                     </td>
                     <td className="px-4 py-3 text-sm text-gray-900">{getContractRuleNames(employee)}</td>
                   </tr>
                 ))}
              </tbody>
            </table>
            
            {/* Loading indicator when no employees yet */}
            {(employees || []).length === 0 && isLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <svg className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-gray-600">Loading employee data...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, (employees || []).length)} of {(employees || []).length} employees
                {totalPages > 1 && (
                  <span className="ml-4 text-xs text-gray-400">
                    Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">A</kbd> / <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">D</kbd> to navigate
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
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
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {isCompleted ? (
                <span className="text-green-600 font-medium">
                  ✅ Loading complete! {(employees || []).length} employees loaded
                  {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </span>
              ) : (
                <span>
                  {(employees || []).length > 0 ? `${(employees || []).length} employees loaded so far...` : 'Preparing to load...'}
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={onDownloadExcel}
                disabled={!isCompleted}
                className={`px-6 py-2 ${
                  isCompleted 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Excel
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Loading...
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 