/**
 * Version History Modal Component
 * Displays the application version history with changelog
 */

import React from 'react';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Version history data - single source of truth for all versions
const versionHistory = [
  {
    version: '0.1.3',
    date: '2025-06-22',
    features: [
      'Intelligent phone number parsing with automatic country code detection',
      'Support for 27+ countries with portal-based default country configuration',
      'Enhanced phone validation with confidence scoring and format suggestions',
      'Smooth header animations during workflow navigation with slide-up effects',
      'Improved navigation consistency across all workflow steps',
      'Preserved mapping state when navigating between steps',
      'Fixed phone input field cursor behavior and text selection issues',
      'Added company name display integration throughout authentication flow',
      'Resolved race conditions in data loading with proper loading states',
      'Always-available disconnect button as emergency escape hatch',
      'Optimized layout alignment - centered authentication, top-aligned workflow steps',
      'Enhanced error handling with detailed phone parsing feedback',
      'Added cookie policy modal - transparent about not using any cookies'
    ]
  },
  {
    version: '0.1.2',
    date: '2025-06-22',
    features: [
      'Enhanced duplicate employee detection with real-time validation',
      'Dynamic duplicate banner updates when emails are corrected',
      'Improved username field editing with immediate duplicate checking',
      'Excluded username/email fields from bulk editing for data integrity',
      'Fixed duplicate validation state management and UI responsiveness'
    ]
  },
  {
    version: '0.1.1',
    date: '2025-06-22',
    features: [
      'Added ignore column functionality for mapping step',
      'Implemented Excel template download with portal-specific fields',
      'Enhanced column mapping with visual field indicators',
      'Improved user interface consistency and visual hierarchy',
      'Fixed template generation with proper field ordering'
    ]
  },
  {
    version: '0.1.0',
    date: '2025-06-22',
    title: 'Beta Release',
    features: [
      'Complete Planday API integration with OAuth authentication',
      'Excel file upload and parsing with auto-mapping capabilities',
      'Dynamic column mapping with portal-specific field definitions',
      'Data validation and error correction workflows',
      'Bulk employee upload with real-time progress tracking',
      'Department and employee group name resolution',
      'Comprehensive error handling and user feedback',
      'Responsive design with modern UI components'
    ]
  }
];

// Export the current version for use in other components
export const getCurrentVersion = () => versionHistory[0].version;

export const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {versionHistory.map((release, index) => (
              <div key={release.version}>
                {/* Version Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Version {release.version}
                    {release.title && (
                      <span className="ml-2 text-blue-600">({release.title})</span>
                    )}
                  </h3>
                  <p className="text-gray-500 text-sm">({release.date})</p>
                </div>
                
                {/* Features */}
                <ul className="space-y-2">
                  {release.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1.5 w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></span>
                      <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Divider */}
                {index < versionHistory.length - 1 && (
                  <div className="mt-6 border-b border-gray-200"></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-500 text-center">
            Planday Bulk Employee Uploader - Built with React + TypeScript
          </p>
        </div>
      </div>
    </div>
  );
}; 