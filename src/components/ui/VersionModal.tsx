/**
 * Version History Modal Component
 * Displays the application version history with changelog
 */

import React, { useEffect } from 'react';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Version history data - single source of truth for all versions
const versionHistory = [
  {
    version: '0.2.9',
    date: '2025-07-05',
    features: [
      'Individual field mapping for departments and employee groups replaces comma-separated values',
      'Each department now appears as separate mappable field like "Department Kitchen" or "Department Bar"',
      'Any non-empty value in individual field assigns that department or employee group to the employee',
      'Eliminated bulk corrections for departments and employee groups since typos are no longer possible',
      'Uses same pattern as bankAccount field flattening for consistent architecture'
    ]
  },
  {
    version: '0.2.8',
    date: '2025-06-30',
    features: [
      'Custom fields marked as read-only now appear in mapping interface since they can be set during employee creation',
      'Excel files with empty columns no longer trigger false "duplicate column names" errors',
      'Read-only custom fields like enum dropdowns now behave identically to non-read-only fields',
      'Bulk correction step is now automatically skipped when no department or employee group corrections are needed'
    ]
  },
  {
    version: '0.2.7',
    date: '2025-06-28',
    features: [
      'Migrated from xlsx to exceljs library eliminating prototype pollution and ReDoS vulnerabilities (CVSS 7.8 and 7.5)',
      'Implemented name-agnostic auto-mapping supporting exact matching for any API field without hardcoded rules',
      'Restored sophisticated pattern matching with confidence scoring and empty column detection',
      'Fixed international character support in auto-mapping for Swedish and other Unicode characters',
      'Achieved zero npm audit vulnerabilities and enhanced auto-mapping performance from 64% to 100%'
    ]
  },
  {
    version: '0.2.6',
    date: '2025-06-28',
    features: [
      'Fixed universal date pattern detection bug: created comprehensive DatePatternAnalyzer to perform dataset-level analysis instead of individual date checking',
      'Resolved missing date picker for ambiguous patterns: now correctly shows format selection for cases like "01/01/2024 + 06/01/1950" and "2024-01-01 + 1950-01-06"',
      'Enhanced DateFormatSelectionStep: added support for dash-separated year-first patterns (YYYY-MM-DD vs YYYY-DD-MM) with dynamic examples from user data',
      'Improved date format tip clarity: replaced confusing identical-value comparisons with clear format descriptions (year-month-day vs year-day-month)'
    ]
  },
  {
    version: '0.2.5',
    date: '2025-06-27',
    features: [
      'Date format verification rework: moved from modal popup to dedicated page step for improved UX and workflow clarity',
      'Console log cleanup: removed excessive debug logging across validation, mapping, and workflow components for cleaner console output',
      'Fixed bankAccount field console warnings: enhanced FieldDefinitionValidator.getFieldEnumValues() to handle complex object sub-fields like "bankAccount.accountNumber"',
      'Improved mapping step feedback: reduced verbose logging while preserving error reporting functionality'
    ]
  },
  {
    version: '0.2.4',
    date: '2025-06-27',
    features: [
      'Fixed auto-mapping rules for cellPhoneCountryCode: added more specific patterns to detect country codes in phone fields',
      'Read-only fields are now included back in to the mapping interface as they are most likely not read-only on POST Employee Create',
    ]
  },
  {
    version: '0.2.3',
    date: '2025-06-27',
    features: [
      'Fixed bankAccount field splitting: resolved $ref resolution bug in getComplexObjectSubFields() method',
      'Corrected PlandayEmployee and PlandayEmployeeCreateRequest type definitions: bankAccount now properly typed as object with accountNumber and registrationNumber properties',
      'Enhanced complex object detection: added logic to resolve $ref fields from field definitions instead of only checking direct type properties',
      'Fixed phoneCountryCode exclusion: added phoneCountryCode to excludedFields arrays in template generation, field detection, and mapping UI',
      'Removed unnecessary template instruction fallback cases for deprecated phone fields',
      'Verified phone field exclusion consistency: confirmed phone and phoneCountryCode are properly excluded while cellPhone and cellPhoneCountryCode remain available',
      'Excel templates now correctly show Bank Account - Account Number and Bank Account - Registration Number as separate fields instead of single bankAccount field',
      'Templates properly exclude all landline phone fields (phone, phoneCountryCode) while including mobile phone fields (cellPhone, cellPhoneCountryCode)'
    ]
  },
  {
    version: '0.2.2',
    date: '2025-06-27',
    features: [
      'Custom fields improvements',
      'Improved navigation and state management when going back to mapping step',
      'Testing focus: custom fields'
    ]
  },
  {
    version: '0.2.1',
    date: '2025-06-26',
    title: 'Status Page Integration',
    features: [
      'Added /status page with Notion API integration',
      'Known Issues section with status-based grouping and color-coded badges',
      'Three-column kanban Roadmap View (Backlog, In Development, QA & Testing)',
      'Shipped section with pagination (10 items per page)',
      'Priority-based sorting (Critical, High, Medium, Low)',
      'Updated BetaTag and BetaBanner to link to internal /status route',
      'Route changed from /roadmap to /status'
    ]
  },
  {
    version: '0.2.0',
    date: '2025-06-26',
    features: [
      'Preserve raw Excel values like "20230405" during parsing, only convert when mapped to date fields',
      'Detect ambiguous dates: distinguish between unambiguous (2023-15-04) and ambiguous (20230405) formats',
      'Validate dates only when columns are mapped to hiredFrom or birthDate fields',
      'Support multiple date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, YYYYMMDD, DDMMYYYY, MMDDYYYY, YYYYDDMM, named months, 2-digit years',
      'Auto-detect day vs month using numbers >12 when possible',
      'Added DateFormatModal to ask users about ambiguous dates like "Is 20230405 April 5th or May 4th?"',
      'Date format selection occurs after mapping step, before final validation',
      'All dates converted to YYYY-MM-DD format for Planday API',
      'Fixed infinite loop in bulk correction workflow that retriggered same page after fixes',
      'Fixed DateFormatModal render order to appear above other UI elements'
    ]
  },
  {
    version: '0.1.9',
    date: '2025-06-25',
    features: [
      'Simplified phone number logic: removed landline phone field support, now only supports cellPhone',
      'Made cellPhoneCountryCode mandatory when cellPhone is mapped - no more auto-detection guesswork',
      'Enhanced country code support: accepts both ISO codes (DK, SE) and country names (Denmark, Sweden)',
      'Intelligent dial code removal: automatically strips country dial codes (e.g., removes "46" from Swedish numbers)',
      'Improved phone validation with country-specific length validation and clearer error messages',
      'Removed phone field from mapping UI, templates, and all auto-mapping rules for cleaner user experience'
    ]
  },
  {
    version: '0.1.8',
    date: '2025-06-25',
    features: [
      'Enhanced 8-digit date format support: now handles YYYYMMDD, DDMMYYYY, MMDDYYYY, and YYYYDDMM formats with intelligent detection',
      'Context-aware date conversion: preserves ambiguous values during Excel parsing, then converts based on user field mapping intent'
    ]
  },
  {
    version: '0.1.7',
    date: '2025-06-25',
    features: [
      'Fixed Excel date parsing "off by one day" issue by reading formatted display text instead of converting Excel serial numbers',
      'Fixed Results Verification step showing incorrect employee data and improved table transparency'
    ]
  },
  {
    version: '0.1.6',
    date: '2025-06-24',
    features: [
      'Enhanced field display consistency: raw API field names for standard fields, human-readable descriptions for custom fields',
      'Added monospace font styling to all field displays for improved "data-like" appearance throughout the application',
      'Completely dynamic Excel template generation - no more hardcoded field lists, templates now reflect actual portal configuration',
      'Fixed critical field name inconsistency: corrected hireDate → hiredFrom throughout codebase to match Planday API',
      'Improved custom field detection using Planday\'s actual custom_ prefix convention instead of hardcoded exclusion lists',
      'Enhanced field selection modal with consistent raw field names for standard fields and descriptions for custom fields',
      'Updated auto-mapping rules to use correct API field names (hiredFrom, etc.) for better Excel column detection',
      'Synchronized field display across all components: mapping interface, validation steps, preview tables, and templates',
      'Resolved TypeScript compilation errors and improved code maintainability',
      'Template downloads now show exactly the same field names visible in the mapping interface for perfect consistency'
    ]
  },
  {
    version: '0.1.5',
    date: '2025-06-23',
    features: [
      'Fixed critical bug: duplicate detection now works for portals with more than 50 employees',
      'Enhanced phone number validation with automatic country code detection for 27+ countries',
      'Improved employee type mapping with smart suggestions for invalid entries',
      'Added automatic detection and skipping of empty columns in Excel files',
      'Fixed validation errors no longer blocking upload for employees marked to skip',
      'Cleaner console output - reduced technical noise while preserving important errors',
      'Better email normalization prevents false duplicate detection',
      'Enhanced bulk correction suggestions for common data entry mistakes'
    ]
  },
  {
    version: '0.1.4',
    date: '2025-06-23',
    features: [
      'Added comprehensive Terms of Service with clear GDPR roles and responsibilities',
      'Enhanced Privacy Statement with software tool provider clarifications',
      'Added ESC key functionality to close all modals (Privacy, Terms, Cookie, Version)',
      'Clarified data processing model - positioned as client-side software tool provider'
    ]
  },
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
  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

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
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Planday Bulk Employee Uploader - Built with React + TypeScript
            </p>
            <div className="flex items-center text-xs text-gray-500">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <a 
                href="https://github.com/Lushbits/pdbulkupload" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                Open Source on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 