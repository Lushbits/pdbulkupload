/**
 * Bulk Edit Page Component
 * 
 * Main page for bulk editing employee data functionality.
 * Provides interface for editing multiple employees at once.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, Button, Input, PrivacyModal, CookieModal, TermsOfServiceModal, VersionModal, getCurrentVersion } from '../../components/ui';
import { FileSelectionStep } from './FileSelectionStep';
import { EDIT_APP_METADATA } from '../constants';
import { useEditApi } from '../hooks/useEditApi';
import { ExcelExportService } from '../services/excelExportService';
import { ProgressModal } from './ProgressModal';
import type { EditEmployee, EditWorkflowStep, EditSupervisor, EditDepartment, EditEmployeeGroup, EditContractRule } from '../types';

export const BulkEditPage: React.FC = () => {
  const {
    // Authentication state
    isAuthenticated,
    isAuthenticating,
    authError,
    
    // Employee data state
    employees,
    totalEmployees,
    isEmployeesLoading,
    employeesError,
    
    // Reference data
    employeeGroups,
    
    // Actions
    authenticate,
    logout,
    clearErrors,
    clearCache,
  } = useEditApi();

  const [refreshToken, setRefreshToken] = useState('');
  
  // Workflow step state
  const [currentStep, setCurrentStep] = useState<EditWorkflowStep>('authentication');
  const [isStepLoading, setIsStepLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // As per spec
  
  // Modal states for footer
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  

  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState({
    isLoading: false,
    isCompleted: false,
    progress: 0,
    currentEmployee: '',
    employees: [] as EditEmployee[],
    departments: [] as EditDepartment[],
    employeeGroups: [] as EditEmployeeGroup[],
    supervisors: [] as EditSupervisor[],
    contractRules: [] as EditContractRule[],
    totalEmployees: 0,
    rateLimitInfo: null as {
      remaining: number;
      limit: number;
      resetTime: number;
      isActive: boolean;
    } | null
  });

  /**
   * Handle authentication form submission
   */
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!refreshToken.trim()) {
      return;
    }
    
    await authenticate(refreshToken.trim());
  };



  /**
   * Handle download all employees option with payrates and contract rules
   */
  const handleDownloadAllWithPayrates = async () => {
    setIsStepLoading(true);
    try {
      console.log('🔄 Loading all employee data with payrates, contract rules, and salaries...');
      
      // Get fresh data directly from API with smart rate limiting
      const { EditApi } = await import('../services/unifiedApiClient');
      
      // Use direct API calls (proxy disabled due to Netlify function issues)
      console.log('🔧 Using direct API calls with smart rate limiting');
      EditApi.setProxyMode(false);
      
      // Reset progress and show modal
      setProgressData({
        isLoading: true,
        isCompleted: false,
        progress: 0,
        currentEmployee: 'Initializing...',
        employees: [],
        departments: [],
        employeeGroups: [],
        supervisors: [],
        contractRules: [],
        totalEmployees: 0,
        rateLimitInfo: null
      });
      setShowProgressModal(true);
      
      // Fetch data with progress tracking
      const apiData = await EditApi.fetchBasicEmployeeData({ 
        includePayrates: true, 
        includeContractRules: true,
        includeSalaries: true,
        includeSupervisors: true,
        onProgress: (progress) => {
          // Get current rate limit info
          const rateLimitInfo = EditApi.getRateLimitInfo();
          
          setProgressData(prev => ({
            ...prev,
            progress: progress.percentage,
            currentEmployee: progress.currentEmployee,
            totalEmployees: progress.total,
            departments: progress.departments,
            employeeGroups: progress.employeeGroups,
            supervisors: progress.supervisors,
            contractRules: progress.contractRules,
            // Add the new employee to the list if provided
            employees: progress.employee ? [...prev.employees, progress.employee] : prev.employees,
            // Update rate limit info
            rateLimitInfo: rateLimitInfo
          }));
        }
      });
      
      console.log('📊 Employee data with payrates and contract rules fetched, displaying results...');
      
      // Update progress with final data
      setProgressData(prev => ({
        ...prev,
        isLoading: false,
        isCompleted: true,
        progress: 100,
        currentEmployee: 'Complete!',
        employees: apiData.employees || [],
        departments: apiData.departments || [],
        employeeGroups: apiData.employeeGroups || [],
        supervisors: apiData.supervisors || [],
        contractRules: apiData.contractRules || [],
        totalEmployees: apiData.employees?.length || 0,
        rateLimitInfo: EditApi.getRateLimitInfo()
      }));
      
      console.log('✅ Employee data with payrates, contract rules, and salaries displayed successfully');
    } catch (error) {
      console.error('Failed to fetch employee data with payrates, contract rules, and salaries:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to fetch employee data. Please try again.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as any;
        switch (apiError.code) {
          case 'CONNECTION_FAILED':
            errorMessage = 'Unable to connect to Planday API. Please check your authentication and try again.';
            break;
          case 'UNAUTHORIZED':
          case 'AUTH_REQUIRED':
            errorMessage = 'Authentication failed. Please log out and log in again.';
            break;
          case 'RATE_LIMITED':
            errorMessage = 'API rate limit exceeded. Please wait a moment and try again.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          default:
            if (apiError.message) {
              errorMessage = `API Error: ${apiError.message}`;
            }
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
      setShowProgressModal(false);
    } finally {
      setIsStepLoading(false);
    }
  };

  /**
   * Handle upload filter file option
   */
  const handleUploadFilter = async (file: File) => {
    setIsStepLoading(true);
    try {
      // TODO: Process uploaded file and filter employees
      console.log('Processing uploaded file:', file.name);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just log the file - actual processing will be implemented later
    } catch (error) {
      console.error('Failed to process uploaded file:', error);
      alert('Failed to process uploaded file. Please try again.');
    } finally {
      setIsStepLoading(false);
    }
  };

  /**
   * Handle file selection completion
   */
  const handleFileSelectionNext = () => {
    // TODO: Process the uploaded file and filter employees
    // For now, just move to employee grid
    setCurrentStep('employee-grid');
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    logout();
    setRefreshToken('');
    setCurrentPage(1); // Reset pagination
    setCurrentStep('authentication'); // Reset workflow step
  };

  /**
   * Handle progress modal close
   */
  const handleProgressModalClose = () => {
    setShowProgressModal(false);
    setProgressData({
      isLoading: false,
      isCompleted: false,
      progress: 0,
      currentEmployee: '',
      employees: [],
      departments: [],
      employeeGroups: [],
      supervisors: [],
      contractRules: [],
      totalEmployees: 0,
      rateLimitInfo: null
    });
  };

  /**
   * Handle Excel download from progress modal
   */
  const handleDownloadExcel = async () => {
    try {
      console.log('🔄 Generating Excel file...');
      
      // Use the data from progressData
      const dataForExport = {
        employees: progressData.employees,
        departments: progressData.departments,
        employeeGroups: progressData.employeeGroups,
        supervisors: progressData.supervisors,
        contractRules: progressData.contractRules
      };
      
      await ExcelExportService.downloadEmployeeExcel({
        employees: dataForExport.employees,
        departments: dataForExport.departments,
        employeeGroups: dataForExport.employeeGroups
      });
      console.log('✅ Excel file downloaded successfully');
    } catch (error) {
      console.error('Failed to download Excel file:', error);
      alert('Failed to download Excel file. Please try again.');
    }
  };

  /**
   * Handle authentication state changes
   */
  useEffect(() => {
    if (isAuthenticated && currentStep === 'authentication') {
      // Move to file selection step after successful authentication
      setCurrentStep('file-selection');
    }
  }, [isAuthenticated, currentStep]);

  /**
   * Expose EditApi to window for debugging
   */
  useEffect(() => {
    // Dynamically import and expose EditApi for debugging
    const exposeEditApi = async () => {
      const { EditApi } = await import('../services/unifiedApiClient');
      (window as any).EditApi = EditApi;
    };
    
    exposeEditApi();
    
    return () => {
      delete (window as any).EditApi;
    };
  }, []);

  /**
   * Calculate pagination data
   */
  const totalPages = Math.ceil(totalEmployees / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentEmployees = employees.slice(startIndex, endIndex);

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  /**
   * Handle keyboard navigation for pagination
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation when authenticated and have multiple pages
      if (!isAuthenticated || totalPages <= 1) return;
      
      // Don't handle if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          // A key - Previous page
          if (currentPage > 1) {
            handlePageChange(currentPage - 1);
          }
          break;
        case 'd':
          // D key - Next page
          if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
          }
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
  }, [isAuthenticated, currentPage, totalPages]);



  /**
   * Generate page numbers for pagination
   */
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if we have 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, currentPage + halfVisible);
      
      // Adjust if we're near the beginning or end
      if (currentPage <= halfVisible) {
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - halfVisible) {
        startPage = totalPages - maxVisiblePages + 1;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  /**
   * Get hourly rate for an employee in a specific employee group
   */
  const getEmployeeGroupRate = (employee: EditEmployee, groupId: number): 'blank' | 'no-rate' | number => {
    // Check if employee belongs to this group
    const belongsToGroup = employee.employeeGroups?.some(group => group.id === groupId);
    
    if (!belongsToGroup) {
      return 'blank'; // Employee not in this group
    }
    
    // Employee is in the group, check for payrate
    const payrate = employee.employeeGroupPayrates?.find(rate => rate.employeeGroupId === groupId);
    
    if (!payrate) {
      return 'no-rate'; // In group but no rate assigned
    }
    
    return payrate.rate; // Has a rate
  };

  /**
   * Format rate display based on rate status
   */
  const formatRateDisplay = (rateStatus: 'blank' | 'no-rate' | number): React.ReactNode => {
    if (rateStatus === 'blank') {
      return <span className="text-gray-300">-</span>;
    }
    
    if (rateStatus === 'no-rate') {
      return <span className="text-orange-600 text-xs font-medium">No rate</span>;
    }
    
    return (
      <span className="text-green-700 font-medium">
        {rateStatus.toFixed(2)}
      </span>
    );
  };

  /**
   * Format contract rules display for an employee
   */
  const formatContractRulesDisplay = (employee: EditEmployee): React.ReactNode => {
    const contractRules = employee.contractRules || [];
    
    if (contractRules.length === 0) {
      return <span className="text-gray-300">-</span>;
    }
    
    return (
      <div className="space-y-1">
        {(contractRules || []).map((rule) => (
          <div key={rule.id} className="text-xs">
            <span className="text-blue-700 font-medium">
              Rule #{rule.id}
            </span>
            <span className="text-gray-600 ml-1">
              ({rule.name})
            </span>
            {rule.description && (
              <div className="text-gray-500 text-xs mt-1">
                {rule.description}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render authentication form
   */
  const renderAuthenticationForm = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {EDIT_APP_METADATA.name}
          </h1>
          <p className="text-lg text-gray-600">
            {EDIT_APP_METADATA.description}
          </p>
        </div>

        {/* Authentication Card */}
        <Card className="p-8 max-w-md mx-auto">
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connect to Planday
              </h2>
              <p className="text-gray-600 text-sm">
                Enter your Planday refresh token to access employee data
              </p>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div>
                <label htmlFor="refreshToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Refresh Token
                </label>
                <Input
                  id="refreshToken"
                  type="password"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Enter your Planday refresh token"
                  disabled={isAuthenticating}
                  className="w-full"
                />
              </div>

              {/* Error Display */}
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800">{authError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearErrors}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={isAuthenticating || !refreshToken.trim()}
                className="w-full"
              >
                {isAuthenticating ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  'Connect to Planday'
                )}
              </Button>
              
              {/* DEBUG: Clear Cache Button */}
              <Button
                type="button"
                variant="secondary"
                onClick={clearCache}
                className="w-full text-sm"
              >
                🗑️ Clear Cache (Force Refresh)
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );

  /**
   * Render employee list
   */
  const renderEmployeeList = () => (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between p-6 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {EDIT_APP_METADATA.name}
          </h1>
          <p className="text-lg text-gray-600">
            {totalEmployees} employees loaded
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={clearCache}
            className="text-sm"
          >
            🗑️ Clear Cache
          </Button>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="text-sm"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="flex-1 p-6 overflow-auto pb-4">
        {isEmployeesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-gray-600 mb-2">Loading employees...</p>
              <p className="text-sm text-gray-500">
                Fetching all employees with pagination (50 per page)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Check browser console for detailed progress
              </p>
            </div>
          </div>
        ) : employeesError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800">{employeesError}</p>
            </div>
          </div>
        ) : (employees || []).length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-600">There are no employees in your Planday portal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">
                Employee List
              </h2>
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, totalEmployees)} of {totalEmployees} employees
              </p>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">First Name</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Last Name</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Username/Email</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Phone</th>
                      
                      {/* Dynamic Employee Group Rate Columns */}
                      {(employeeGroups || []).map((group) => (
                        <th key={`group-${group.id}`} className="border-b border-gray-200 px-3 py-3 text-left text-sm font-medium text-gray-900">
                          <div className="text-center">
                            <div className="text-xs text-gray-600 mb-1">Employee Group</div>
                            <div className="font-semibold">{group.name}</div>
                            <div className="text-xs text-gray-500 mt-1">Hourly Rate</div>
                          </div>
                        </th>
                      ))}
                      
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Monthly Salary</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Contract Hours</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Contract Rules</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Supervisor</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Hired Date</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentEmployees || []).map((employee: EditEmployee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.firstName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.lastName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.userName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.cellPhone || '-'}</td>
                        
                        {/* Dynamic Employee Group Rate Cells */}
                        {(employeeGroups || []).map((group) => {
                          const rateStatus = getEmployeeGroupRate(employee, group.id);
                          return (
                            <td key={`emp-${employee.id}-group-${group.id}`} className="px-3 py-3 text-sm text-center">
                              {formatRateDisplay(rateStatus)}
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.salaryData?.salary ? (
                            <span className="text-blue-700 font-medium">
                              {employee.salaryData.salary.toLocaleString()}
                            </span>
                          ) : employee.monthlySalary ? (
                            <span className="text-blue-700 font-medium">
                              {employee.monthlySalary.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.salaryData?.hours ? (
                            <span className="text-purple-700 font-medium">
                              {employee.salaryData.hours}h
                            </span>
                          ) : employee.contractedHours ? (
                            <span className="text-purple-700 font-medium">
                              {employee.contractedHours}h
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatContractRulesDisplay(employee)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {employee.supervisorName ? (
                            <span className="text-orange-700 font-medium">
                              {employee.supervisorName}
                            </span>
                          ) : employee.supervisorEmployeeId ? (
                            <span className="text-gray-500">
                              ID: {employee.supervisorEmployeeId}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{employee.hiredFrom || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            employee.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mt-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({pageSize} per page)
                    </span>
                    <span className="text-xs text-gray-400 ml-4">
                      Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">A</kbd> / <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">D</kbd> to navigate
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
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
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
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
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen sparkling-background">
      {/* Content with 5px margin */}
      <div className="p-1" style={{ padding: '5px' }}>
        <div className="min-h-screen bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          {/* Fixed Back Button in Top Left */}
          <div className="absolute top-4 left-4 z-50">
            <Link
              href="/"
              className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Upload
            </Link>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {currentStep === 'authentication' && renderAuthenticationForm()}
            {currentStep === 'file-selection' && (
              <div className="flex-1 p-8">
                <FileSelectionStep
                  employees={employees}
                  isLoading={isStepLoading}
                  onDownloadAllWithPayrates={handleDownloadAllWithPayrates}
                  onUploadFilter={handleUploadFilter}
                  onNext={handleFileSelectionNext}
                  onLogout={handleLogout}
                />
              </div>
            )}
            {currentStep === 'employee-grid' && renderEmployeeList()}
            

          </div>

          {/* Footer - Same as main app */}
          <div className="mt-auto p-8 bg-gray-50 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-800 mb-2">
                Your employee data is processed entirely on your device and sent directly to Planday - we never store, access, or process your data on our servers. <button
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Read more
              </button>.
              </p>
              
              {/* Version Display */}
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  <button
                    onClick={() => setIsVersionModalOpen(true)}
                    className="hover:text-gray-800 transition-colors underline"
                  >
                    Version {getCurrentVersion()}
                  </button>
                  <span className="mx-2">-</span>
                  <button
                    onClick={() => setIsCookieModalOpen(true)}
                    className="hover:text-gray-800 transition-colors underline"
                  >
                    Cookie Policy
                  </button>
                  <span className="mx-2">-</span>
                  <button
                    onClick={() => setIsTermsModalOpen(true)}
                    className="hover:text-gray-800 transition-colors underline"
                  >
                    Terms of Service
                  </button>
                  <span className="mx-2">-</span>
                  <span>Made with <span className="heartbeat">❤️</span> by the </span>
                  <a 
                    href="https://www.planday.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-gray-800 transition-colors underline"
                  >
                    Planday
                  </a>
                  <span> Community</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Modal */}
          <PrivacyModal
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
          />

          {/* Cookie Modal */}
          <CookieModal
            isOpen={isCookieModalOpen}
            onClose={() => setIsCookieModalOpen(false)}
          />

          {/* Terms of Service Modal */}
          <TermsOfServiceModal
            isOpen={isTermsModalOpen}
            onClose={() => setIsTermsModalOpen(false)}
          />

          {/* Version Modal */}
          <VersionModal
            isOpen={isVersionModalOpen}
            onClose={() => setIsVersionModalOpen(false)}
          />

          {/* Progress Modal */}
          <ProgressModal
            isOpen={showProgressModal}
            onClose={handleProgressModalClose}
            onDownloadExcel={handleDownloadExcel}
            isLoading={progressData.isLoading}
            isCompleted={progressData.isCompleted}
            progress={progressData.progress}
            employees={progressData.employees}
            departments={progressData.departments}
            employeeGroups={progressData.employeeGroups}
            supervisors={progressData.supervisors}
            totalEmployees={progressData.totalEmployees}
            currentEmployee={progressData.currentEmployee}
            rateLimitInfo={progressData.rateLimitInfo}
          />
        </div>
      </div>
    </div>
  );
}; 