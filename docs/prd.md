# Product Requirements Document: Planday Bulk Employee Uploader

## Executive Summary

A web application that allows Planday customers to bulk upload employees from Excel files directly to their Planday portal via a simple, secure interface with intelligent column mapping, comprehensive validation, and all-or-nothing upload guarantee.

## Problem Statement

Planday customers frequently need to onboard multiple employees simultaneously, but currently must:
- Manually enter each employee one-by-one through the Planday interface
- Use complex API integrations requiring technical expertise
- Struggle with data format requirements and validation errors
- Deal with partial upload failures that create inconsistent data states

## Solution Overview

A client-side web application that:
- Processes Excel files directly in the browser (no server storage)
- Intelligently maps Excel columns to Planday employee fields
- Provides comprehensive pre-validation with editable data correction
- Ensures 100% data validity before any upload attempts
- Performs atomic uploads (all employees succeed or none are created)
- Handles all validation client-side with zero data storage

## Core Features

### 1. Authentication
- Simple refresh token input (no complex OAuth flow)
- Single hardcoded client ID works across all Planday portals
- Clear instructions for obtaining tokens from Planday Settings → API Access
- Secure token handling with browser memory storage only

### 2. Excel File Processing
- Support for .xlsx and .xls formats with comprehensive error handling
- Drag & drop interface with visual feedback and file validation
- Client-side parsing using SheetJS (no data leaves the browser)
- Automatic detection of headers and data rows with smart parsing
- Support for various Excel formatting and data types

### 3. Intelligent Column Mapping
- Auto-detection of common field mappings (firstName, lastName, email, phone)
- Visual interface showing Excel headers vs Planday employee fields
- Department selection with live data from customer's Planday portal
- Required field validation with clear visual indicators
- Support for unmapped columns (ignored during upload)

### 4. Comprehensive Pre-Validation System
- **Complete validation before any API calls**: Zero employees touched until 100% valid
- **Real-time validation engine**: Immediate feedback on data quality
- **Editable data grid**: Click-to-edit interface for fixing invalid data
- **Validation rules**:
  - Required fields: firstName, lastName, userName (email), departments
  - Email format validation with regex checking
  - Email uniqueness within the upload batch
  - Phone number format cleaning and validation
  - Date format standardization (YYYY-MM-DD)
  - Department existence verification against Planday API
- **Visual validation indicators**: Red borders for errors, green for valid
- **Detailed error tooltips**: Hover to see specific validation requirements

### 5. Data Correction Interface
- **Inline editing**: Click any cell to edit the value directly
- **Real-time validation**: Errors clear immediately when data is corrected
- **Bulk edit capabilities**: Fix common issues across multiple employees
- **Validation progress tracking**: Show percentage of valid employees
- **Smart suggestions**: Auto-format phone numbers, suggest email corrections

### 6. All-or-Nothing Upload System
- **Atomic operation**: All employees created successfully or none at all
- **Pre-flight verification**: Final API checks before committing any data
- **Transaction-like behavior**: Complete rollback on any failure
- **Batch processing**: Upload employees in rate-limit friendly batches
- **Progress tracking**: Real-time status during upload process
- **Comprehensive error reporting**: Detailed failure reasons if upload fails

### 7. User Experience & Interface
- **Step-by-step progress indicator**: Clear visual workflow
- **Responsive design**: Optimized for desktop and mobile
- **Loading states**: Visual feedback for all operations
- **Error recovery**: Clear guidance for fixing issues
- **Success confirmation**: Detailed results of successful uploads

## Technical Architecture

### Frontend Stack
- **Framework**: Vite + React + TypeScript for modern development
- **Styling**: Tailwind CSS for responsive, maintainable design
- **File Processing**: SheetJS (xlsx library) for Excel parsing
- **State Management**: React hooks for component state
- **Deployment**: Vercel static hosting with automatic HTTPS

### Privacy & Security Architecture
- **Zero data storage**: All processing happens in browser memory only
- **Direct API integration**: Browser communicates directly with Planday API
- **No backend services**: Pure client-side application with no server
- **Token security**: Refresh tokens stored in memory, cleared on page refresh
- **HTTPS enforced**: All communications encrypted via Vercel's SSL

### API Integration Strategy
- **Planday HR API**: Employee creation, department lookup, field definitions
- **Authentication**: OAuth2 refresh token to access token exchange
- **Rate limiting compliance**: Batch processing with appropriate delays
- **Error handling**: Comprehensive API error capture and user-friendly messaging
- **Validation endpoints**: Pre-flight checks for departments and duplicates

## Detailed User Journey

### 1. Authentication Phase
- User navigates to application URL
- Enters Planday refresh token in secure input field
- System validates token by attempting to refresh access token
- Success leads to file upload, failure shows clear error message

### 2. File Upload Phase
- User drags Excel file to drop zone or clicks to browse
- System validates file type (.xlsx/.xls) and provides immediate feedback
- Excel file parsed in browser memory with progress indicator
- Headers and data extracted and displayed for user confirmation

### 3. Column Mapping Phase
- System displays Excel headers alongside Planday employee fields
- Auto-mapping applied for obvious matches (firstName, lastName, email)
- User manually maps remaining columns using dropdown selectors
- Department selection from live Planday data
- Required field validation prevents proceeding without essential mappings

### 4. Data Validation & Correction Phase (New Enhanced Phase)
- **Initial validation**: System validates all mapped data client-side
- **Validation report**: Shows count of valid/invalid employees with details
- **Editable grid interface**: User can click any cell to edit invalid data
- **Real-time feedback**: Validation status updates as user makes corrections
- **Progress tracking**: Visual indicator of validation completion percentage
- **Mandatory 100% validity**: Cannot proceed until all employees pass validation

### 5. Final Preview Phase
- Display of 100% validated employee data
- Sample employee record preview showing exact API payload
- Final confirmation before upload with employee count
- Clear messaging about all-or-nothing upload approach

### 6. Atomic Upload Phase
- Pre-flight API checks (department existence, API connectivity)
- Batch upload with progress tracking and current employee status
- All-or-nothing guarantee: complete success or complete rollback
- Real-time progress with success/total counters

### 7. Results Phase
- Success confirmation with total employees created
- Or failure notification with specific error details and retry guidance
- Option to download upload summary report
- Clear path to start new upload or return to mapping

## Validation Rules & Data Quality

### Required Field Validation
- **firstName**: Non-empty string, minimum 1 character
- **lastName**: Non-empty string, minimum 1 character  
- **userName**: Valid email format, will be used as login
- **departments**: At least one valid department ID selected

### Email Validation
- **Format check**: Standard email regex validation
- **Uniqueness**: No duplicate emails within the upload batch
- **Username requirement**: userName field must be valid email format

### Phone Number Validation
- **Format cleaning**: Remove spaces, dashes, parentheses
- **International support**: Accept various international formats
- **Optional field**: Valid if provided, ignored if empty

### Date Validation
- **Hire date format**: Must be YYYY-MM-DD if provided
- **Date parsing**: Attempt to parse various Excel date formats
- **Future date warning**: Alert for hire dates in the future

### Department Validation
- **Existence check**: Verify department IDs exist in customer's Planday portal
- **Access validation**: Ensure user has permission to assign to department

## Error Handling & Recovery

### Validation Error Categories
- **Missing required data**: Clear indication of which fields need values
- **Format errors**: Specific guidance on correct formats (email, phone, date)
- **Duplicate data**: Highlight duplicate emails within the batch
- **Reference errors**: Invalid department IDs or missing departments

### User-Friendly Error Messages
- **Specific guidance**: "Email format invalid - should be user@company.com"
- **Bulk fix suggestions**: "5 employees missing phone numbers - edit to continue"
- **Visual indicators**: Color-coded cells with tooltip error details
- **Progress feedback**: "23 of 25 employees valid - 2 issues remaining"

### Recovery Mechanisms
- **Inline editing**: Fix errors without re-uploading Excel file
- **Bulk operations**: Apply same fix to multiple employees
- **Re-validation**: Instant feedback when errors are corrected
- **Save progress**: Maintain corrections during session

## Success Metrics & KPIs

### Primary Success Metrics
- **Upload success rate**: 100% for validated batches (by design)
- **User completion rate**: >85% of users who start complete the full process
- **Validation accuracy**: >98% of client-side validation matches server requirements
- **Time to completion**: <15 minutes for 100 employees including validation

### Secondary Metrics
- **Error resolution rate**: >90% of validation errors successfully fixed by users
- **User satisfaction**: Positive feedback on data correction interface
- **Adoption rate**: Repeat usage by customers indicates value
- **Support ticket reduction**: Fewer issues compared to manual entry

### Technical Performance Metrics
- **File processing speed**: <30 seconds for 1000-employee Excel files
- **API response time**: <5 seconds for department loading
- **Browser compatibility**: Works on 95%+ of modern browsers
- **Mobile usability**: Functional on tablets and large mobile screens

## Timeline & Development Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Vite + React + TypeScript project setup
- [ ] Tailwind CSS configuration and base styling
- [ ] Planday API client with authentication flow
- [ ] Excel file parsing with SheetJS integration
- [ ] Basic routing and component structure

### Phase 2: Mapping & Validation Engine (Week 2)
- [ ] Column mapping interface with auto-detection
- [ ] Comprehensive validation rule engine
- [ ] Department API integration and selection
- [ ] Real-time validation feedback system
- [ ] Error message system and user guidance

### Phase 3: Data Correction Interface (Week 2.5)
- [ ] Editable data grid component with inline editing
- [ ] Real-time validation updates during editing
- [ ] Bulk edit capabilities for common fixes
- [ ] Validation progress tracking and visual indicators
- [ ] User experience polish for editing workflow

### Phase 4: All-or-Nothing Upload (Week 3)
- [ ] Atomic upload system with pre-flight checks
- [ ] Batch processing with progress tracking
- [ ] Complete error handling and rollback logic
- [ ] Success/failure reporting and user feedback
- [ ] Final preview and confirmation interface

### Phase 5: Testing & Polish (Week 3.5)
- [ ] Comprehensive testing across validation scenarios
- [ ] UI/UX improvements and responsive design verification
- [ ] Edge case handling and error scenario testing
- [ ] Performance optimization for large datasets
- [ ] Cross-browser compatibility testing

### Phase 6: Deployment & Launch (Week 4)
- [ ] Production deployment to Vercel with HTTPS
- [ ] Final security and privacy verification
- [ ] User documentation and help content
- [ ] Launch preparation and stakeholder communication

**Total Development Timeline: 4 weeks**

## Risk Assessment & Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API rate limiting | High | Medium | Batch processing with delays, retry logic |
| Large file performance | Medium | Medium | Client-side processing limits, file size warnings |
| Browser memory limits | High | Low | Chunked processing, progress indicators |
| Network failures during upload | High | Medium | Retry logic, clear error messaging, atomic operations |

### User Experience Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Complex validation interface | Medium | Medium | Intuitive design, clear error messages, user testing |
| Data correction confusion | High | Medium | Inline editing, real-time feedback, help tooltips |
| Upload anxiety (all-or-nothing) | Medium | Low | Clear messaging, preview phase, confidence building |

### Security & Privacy Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Token exposure | High | Low | Memory-only storage, HTTPS enforcement |
| Data leakage | Critical | Very Low | No server processing, client-side only architecture |
| Man-in-middle attacks | High | Low | HTTPS enforcement, secure token transmission |

## Future Enhancement Roadmap

### Phase 2 Features (Post-MVP)
- **Custom field support**: Dynamic mapping for portal-specific employee fields
- **Excel template generation**: Download pre-formatted templates for easy data entry
- **Advanced validation rules**: Business logic validation (duplicate employee IDs, etc.)
- **Bulk employee updates**: Modify existing employees via Excel upload
- **Upload history**: Track previous uploads with success/failure details

### Phase 3 Features (Long-term)
- **Multiple file format support**: CSV, JSON, and other data formats
- **API key alternative**: Alternative authentication method to refresh tokens
- **Webhook integration**: Real-time notifications to external systems
- **Advanced error reporting**: Detailed audit logs and export capabilities
- **Integration expansion**: Connect with other HR systems and data sources

### Enterprise Features (Future)
- **Role-based access**: Different permission levels for upload functionality
- **Approval workflows**: Multi-step approval before employee creation
- **Data transformation**: Advanced mapping and data manipulation capabilities
- **Scheduled uploads**: Automated recurring employee imports

## Definition of Done

### MVP Launch Criteria
- [ ] Successfully upload 500+ employees with 100% success rate
- [ ] Complete validation catches 99%+ of data quality issues
- [ ] All-or-nothing upload works reliably across different scenarios
- [ ] Responsive interface tested on desktop, tablet, and mobile
- [ ] Zero data storage/privacy compliance verified and documented
- [ ] Comprehensive error handling covers all edge cases
- [ ] User can complete full workflow in under 15 minutes

### Long-term Success Indicators
- Active usage by 100+ Planday customers within 3 months
- Average upload batch size of 50+ employees per session
- Less than 2% support ticket rate related to upload functionality
- Positive Net Promoter Score (NPS) from customer feedback
- Demonstrated time savings vs manual employee entry

---

**Project Scope**: Bulk employee upload tool for Planday customers  
**Total Development Time**: 4 weeks  
**Resources Required**: 1 Full-stack Developer  
**Target Users**: Planday portal administrators and HR teams  
**Success Definition**: 100% atomic uploads with comprehensive validation**