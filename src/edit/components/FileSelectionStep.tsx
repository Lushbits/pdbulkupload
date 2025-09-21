/**
 * File Selection Step Component
 * 
 * Allows users to choose between:
 * 1. Download all employees for editing
 * 2. Upload Excel file to filter specific employees
 */

import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import type { EditEmployee } from '../types';

interface FileSelectionStepProps {
  employees: EditEmployee[];
  isLoading: boolean;
  onDownloadAllWithPayrates: () => void;
  onUploadFilter: (file: File) => void;
  onNext: () => void;
  onLogout: () => void;
}

export const FileSelectionStep: React.FC<FileSelectionStepProps> = ({
  employees,
  isLoading,
  onDownloadAllWithPayrates,
  onUploadFilter,
  onNext,
  onLogout,
}) => {
  const [selectedOption, setSelectedOption] = useState<'download-all' | 'upload-filter' | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Handle file upload
   */
  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    
    setUploadedFile(file);
    onUploadFilter(file);
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Logout Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="secondary"
          onClick={onLogout}
          className="px-4 py-2"
        >
          Cancel & Logout
        </Button>
      </div>
      
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select Employees to Edit
        </h1>
        <p className="text-lg text-gray-600">
          Choose how you'd like to select employees for bulk editing
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Focus on: Monthly Salary, Employee Group Hourly Rates, and Contract Rules
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Option 1: Download All Employees */}
        <Card 
          className={`p-6 cursor-pointer transition-all duration-200 ${
            selectedOption === 'download-all' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-md border-gray-200'
          }`}
          onClick={() => setSelectedOption('download-all')}
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Show All Employee Data
            </h2>
            
            <p className="text-gray-600 text-sm mb-4">
              Display all {employees.length} employees on screen (no Excel generated)
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium mb-1">Will display:</div>
              <ul className="text-left space-y-1">
                <li>• All employee details</li>
                <li>• Employee groups</li>
                <li>• All departments</li>
                <li>• Raw data for debugging</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Option 2: Upload Excel to Filter */}
        <Card 
          className={`p-6 cursor-pointer transition-all duration-200 ${
            selectedOption === 'upload-filter' 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:shadow-md border-gray-200'
          }`}
          onClick={() => setSelectedOption('upload-filter')}
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Filter by Excel File
            </h2>
            
            <p className="text-gray-600 text-sm mb-4">
              Upload an Excel file to get only the employees listed in that file
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium mb-1">Perfect for:</div>
              <ul className="text-left space-y-1">
                <li>• Recently uploaded employees</li>
                <li>• Specific departments/groups</li>
                <li>• Custom employee lists</li>
                <li>• Targeted updates</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons based on selection */}
      {selectedOption === 'download-all' && (
        <div className="mt-8 text-center space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-yellow-800 font-medium text-sm">
                Very fast! 100ms delays (10 req/sec, half of API's 20 req/sec limit)
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onDownloadAllWithPayrates}
              disabled={isLoading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
            >
              {isLoading ? (
                <>
                  <svg className="w-6 h-6 mr-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Loading Employee Data...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Load All Employee Data
                </>
              )}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <div className="font-medium mb-2">What will be loaded:</div>
            <ul className="text-left space-y-1">
              <li>• All employee details and contact information</li>
              <li>• Departments & employee groups</li>
              <li>• Hourly payrates per employee group</li>
              <li>• Contract rules and salary information</li>
              <li>• Supervisor relationships</li>
              <li>• Progress shown in real-time</li>
            </ul>
          </div>
        </div>
      )}

      {selectedOption === 'upload-filter' && (
        <div className="mt-8">
          {!uploadedFile ? (
            <div className="text-center">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <svg className="mx-auto w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload Your Excel File
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  We'll extract usernames and create a filtered edit file
                </p>
                
                <div className="space-y-2">
                  <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Choose File
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500">
                    or drag and drop your Excel file here
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 font-medium">
                    File uploaded: {uploadedFile.name}
                  </span>
                </div>
              </div>
              
              <Button
                onClick={onNext}
                disabled={isLoading}
                className="px-8 py-3"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Processing File...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Filtered Excel
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 