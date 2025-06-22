# Planday Employee Upload: Name-to-ID Mapping Architecture

## Overview

Instead of forcing users to memorize and enter department/employee group IDs, we allow them to use human-readable names in their Excel files. The system handles the conversion from names to IDs behind the scenes.

## Core Problem

**User Experience Issue:**
```excel
# Bad UX - Users have to remember IDs
departments: 42,18,156
employeeGroups: 203,891,445

# Good UX - Users work with familiar names  
departments: Kitchen,Bar,Front Desk
employeeGroups: Waiter,Chef,Manager
```

## Architecture Components

### 1. Mapping Service Creation

When the app loads departments and employee groups from Planday API, create bidirectional maps:

```typescript
// Fetch data from Planday
const departments = await plandayApi.getDepartments();
const employeeGroups = await plandayApi.getEmployeeGroups();

// Create mapping service
const mappingService = {
  // Name → ID lookups (case-insensitive)
  departmentsByName: Map<string, number>    // "kitchen" → 42
  groupsByName: Map<string, number>         // "waiter" → 203
  
  // ID → Name lookups (for reverse conversion)
  departmentsById: Map<number, string>      // 42 → "Kitchen"
  groupsById: Map<number, string>           // 203 → "Waiter"
}
```

### 2. Name Resolution with Error Recovery

Convert comma-separated names to ID arrays with smart error handling:

```typescript
// Input: "Kitchen, Bar, Ktichen"  (note the typo)
// Output: { ids: [42, 18], errors: ["Ktichen not found. Did you mean Kitchen?"] }

const resolveNames = (input: string, type: 'departments' | 'groups') => {
  const names = input.split(',').map(s => s.trim());
  const result = { ids: [], errors: [] };
  
  names.forEach(name => {
    // 1. Try exact match (case-insensitive)
    const id = mappingService[type].get(name.toLowerCase());
    if (id) return result.ids.push(id);
    
    // 2. Try numeric ID as fallback
    if (!isNaN(+name) && existsById(+name)) return result.ids.push(+name);
    
    // 3. Try fuzzy matching for typos
    const suggestion = findClosestMatch(name, availableNames);
    result.errors.push(suggestion 
      ? `"${name}" not found. Did you mean "${suggestion}"?`
      : `"${name}" not found`
    );
  });
  
  return result;
};
```

### 3. Enhanced Excel Column Auto-Detection

Expand auto-mapping to handle name-based columns:

```typescript
const AUTO_MAPPING_RULES = {
  departments: [
    'departments', 'department', 'dept',           // Standard
    'department_names', 'dept_names', 'work_areas' // Name variants
  ],
  employeeGroups: [
    'employee_groups', 'groups', 'roles',          // Standard  
    'group_names', 'employee_roles', 'positions'   // Name variants
  ]
};
```

### 4. Validation with Smart Suggestions

Replace ID validation with name-aware validation:

```typescript
const validateEmployee = (employee, mappingService) => {
  const errors = [];
  
  // Validate departments
  const deptResult = resolveNames(employee.departments, 'departments');
  if (deptResult.errors.length) {
    errors.push({
      field: 'departments',
      message: deptResult.errors.join(', '),
      availableOptions: Array.from(mappingService.departmentsById.values())
    });
  }
  
  // Store resolved IDs for API payload
  employee._resolvedDepartmentIds = deptResult.ids;
  
  return errors;
};
```

### 5. User-Friendly Excel Templates

Generate templates with names instead of IDs:

```typescript
const generateTemplate = (departments, employeeGroups) => ({
  headers: ['firstName', 'lastName', 'departments', 'employeeGroups'],
  examples: [
    ['John', 'Smith', 'Kitchen,Bar', 'Waiter,Chef']
  ],
  instructions: {
    departments: `Available: ${departments.map(d => d.name).join(', ')}`,
    employeeGroups: `Available: ${employeeGroups.map(g => g.name).join(', ')}`
  }
});
```

### 6. API Payload Conversion

Convert validated names to IDs for Planday API:

```typescript
const convertForPlandayApi = (validatedEmployee) => ({
  firstName: validatedEmployee.firstName,
  lastName: validatedEmployee.lastName,
  userName: validatedEmployee.userName,
  
  // Use pre-resolved IDs from validation step
  departments: validatedEmployee._resolvedDepartmentIds,
  employeeGroups: validatedEmployee._resolvedEmployeeGroupIds,
  
  // Convert primary department name to ID
  primaryDepartmentId: mappingService.departmentsByName
    .get(validatedEmployee.primaryDepartment.toLowerCase())
});
```

## Data Flow Example

### Step 1: User Input
```excel
firstName | departments  | employeeGroups
John      | Kitchen,Bar  | Wiater,Chef     # Typo: "Wiater" 
Sarah     | Front Desk   | Wiater          # Same typo in 100+ rows
Mike      | Kithen,Bar   | Wiater,Chef     # Multiple typos
...       | ...          | Wiater          # Repeated across dataset
```

### Step 2: Pattern Detection & Bulk Error Analysis
```typescript
// Analyze all unique invalid names across entire dataset
const analyzeValidationPatterns = (allEmployees) => {
  const invalidNames = new Map(); // "wiater" → { count: 156, suggestion: "waiter" }
  
  allEmployees.forEach(employee => {
    const { errors } = resolveNames(employee.employeeGroups, 'groups');
    errors.forEach(invalidName => {
      const current = invalidNames.get(invalidName) || { count: 0, rows: [] };
      current.count++;
      current.rows.push(employee.rowNumber);
      current.suggestion = findClosestMatch(invalidName, validGroupNames);
      invalidNames.set(invalidName, current);
    });
  });
  
  return invalidNames;
};

// Result: 
// "wiater" → { count: 156, suggestion: "waiter", rows: [1,2,4,7,8...] }
// "kithen" → { count: 1, suggestion: "kitchen", rows: [3] }
```

### Step 3: Mandatory Correction UI
```typescript
// Show mandatory correction prompts - user MUST choose a valid option
<BulkCorrectionPrompt>
  <CorrectionItem>
    <ErrorSummary>
      ❌ "Wiater" doesn't exist in Planday (found in 156 rows)
      <RequiredBadge>Must be corrected to proceed</RequiredBadge>
    </ErrorSummary>
    <CorrectionOptions>
      <SuggestedOption 
        onClick={() => bulkReplace("Wiater", "Waiter")}
        primary={true}
      >
        ✨ Map to "Waiter" (suggested match)
      </SuggestedOption>
      
      <DropdownSelector
        label="Or choose different department:"
        options={validEmployeeGroups}
        onSelect={(value) => bulkReplace("Wiater", value)}
      />
      
      <ShowRowsButton onClick={() => showAffectedRows([1,2,4,7,8...])}>
        Show all 156 affected rows
      </ShowRowsButton>
    </CorrectionOptions>
  </CorrectionItem>
  
  <CorrectionItem>
    <ErrorSummary>
      ❌ "Kithen" doesn't exist in Planday (found in 1 row)
      <RequiredBadge>Must be corrected to proceed</RequiredBadge>
    </ErrorSummary>
    <CorrectionOptions>
      <SuggestedOption 
        onClick={() => bulkReplace("Kithen", "Kitchen")}
        primary={true}
      >
        ✨ Map to "Kitchen" (suggested match)
      </SuggestedOption>
      
      <DropdownSelector
        label="Or choose different department:"
        options={validDepartments}
        onSelect={(value) => bulkReplace("Kithen", value)}
      />
    </CorrectionOptions>
  </CorrectionItem>
  
  {/* User cannot proceed until ALL invalid names are mapped */}
  <ProceedButton 
    disabled={hasUnresolvedErrors}
    title={hasUnresolvedErrors ? "Fix all invalid names to continue" : ""}
  >
    Continue to Validation ({remainingErrors} errors remaining)
  </ProceedButton>
</BulkCorrectionPrompt>
```

### Step 4: Bulk Replacement Implementation
```typescript
const bulkReplace = (originalValue: string, newValue: string, field: string) => {
  // Update all employees with this incorrect value
  const updatedEmployees = employees.map(employee => {
    if (employee[field]?.includes(originalValue)) {
      return {
        ...employee,
        [field]: employee[field].replace(
          new RegExp(`\\b${escapeRegex(originalValue)}\\b`, 'gi'), 
          newValue
        ),
        _modified: true  // Track that this row was auto-corrected
      };
    }
    return employee;
  });
  
  // Re-run validation after bulk correction
  setEmployees(updatedEmployees);
  revalidateAllEmployees(updatedEmployees);
  
  // Show success message
  showNotification(`Replaced "${originalValue}" with "${newValue}" in ${affectedCount} rows`);
};
```

### Step 5: Post-Correction Validation
```typescript
// After bulk corrections, most validation errors should be resolved
// Only show remaining individual errors that couldn't be bulk-corrected

const remainingErrors = employees.filter(emp => 
  emp.validationErrors?.length > 0
);

// Show summary: "152 of 156 errors fixed automatically. 4 rows still need attention."
```

## Bulk Correction Architecture

### 1. Pattern Detection During Mapping Phase

After column mapping but before validation, analyze the entire dataset for common errors:

```typescript
const detectCommonErrors = (employees: Employee[], mappingService: MappingService) => {
  const errorPatterns = new Map();
  
  employees.forEach((employee, rowIndex) => {
    ['departments', 'employeeGroups'].forEach(field => {
      if (!employee[field]) return;
      
      const names = employee[field].split(',').map(s => s.trim());
      names.forEach(name => {
        const normalizedName = name.toLowerCase();
        
        // Check if this name exists in our mapping
        const mapping = field === 'departments' 
          ? mappingService.departmentsByName 
          : mappingService.groupsByName;
        
        if (!mapping.has(normalizedName) && !isNumericId(name)) {
          // This is an invalid name - track it
          const key = `${field}:${normalizedName}`;
          const pattern = errorPatterns.get(key) || {
            field,
            invalidName: name,
            count: 0,
            rows: [],
            suggestion: findBestMatch(normalizedName, Array.from(mapping.keys()))
          };
          
          pattern.count++;
          pattern.rows.push(rowIndex + 1); // 1-based row numbers for UI
          errorPatterns.set(key, pattern);
        }
      });
    });
  });
  
  // Sort by frequency (most common errors first)
  return Array.from(errorPatterns.values())
    .filter(pattern => pattern.suggestion) // Only show patterns with suggestions
    .sort((a, b) => b.count - a.count);
};
```

### 2. Mandatory Correction UI Component

Force users to resolve ALL invalid names before proceeding:

```typescript
const MandatoryCorrectionStep = ({ employees, mappingService, onCorrection }) => {
  const [errorPatterns, setErrorPatterns] = useState([]);
  const [unresolvedErrors, setUnresolvedErrors] = useState(new Set());
  
  useEffect(() => {
    const patterns = detectCommonErrors(employees, mappingService);
    setErrorPatterns(patterns);
    setUnresolvedErrors(new Set(patterns.map(p => p.invalidName)));
  }, [employees]);
  
  const handleMandatoryCorrection = (pattern: ErrorPattern, validOption: string) => {
    // Apply correction to all affected rows
    const updatedEmployees = applyBulkCorrection(employees, pattern, validOption);
    onCorrection(updatedEmployees);
    
    // Remove this error from unresolved list
    setUnresolvedErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(pattern.invalidName);
      return newSet;
    });
    
    // Show success notification
    showNotification(`✅ Mapped "${pattern.invalidName}" to "${validOption}" in ${pattern.count} rows`);
  };
  
  const canProceed = unresolvedErrors.size === 0;
  
  return (
    <div className="mandatory-correction-step">
      <h3>🔧 Invalid Names Must Be Corrected</h3>
      <p>
        These names don't exist in your Planday portal and must be mapped to valid options:
      </p>
      
      {errorPatterns.map(pattern => (
        <CorrectionCard
          key={pattern.invalidName}
          pattern={pattern}
          validOptions={getValidOptions(pattern.field, mappingService)}
          onCorrect={handleMandatoryCorrection}
          isResolved={!unresolvedErrors.has(pattern.invalidName)}
        />
      ))}
      
      <div className="proceed-section">
        {!canProceed && (
          <Alert variant="warning">
            ⚠️ You must correct all invalid names before proceeding. 
            {unresolvedErrors.size} items still need mapping.
          </Alert>
        )}
        
        <Button 
          disabled={!canProceed}
          onClick={() => proceedToValidation(employees)}
          size="large"
        >
          {canProceed 
            ? "✅ Continue to Validation" 
            : `Fix ${unresolvedErrors.size} remaining issues`
          }
        </Button>
      </div>
    </div>
  );
};

const CorrectionCard = ({ pattern, validOptions, onCorrect, isResolved }) => (
  <div className={`correction-card ${isResolved ? 'resolved' : 'pending'}`}>
    <div className="error-header">
      <span className="invalid-name">"{pattern.invalidName}"</span>
      <span className="error-count">{pattern.count} rows</span>
      <span className="field-type">{pattern.field}</span>
      {isResolved && <CheckIcon className="resolved-icon" />}
    </div>
    
    {!isResolved && (
      <div className="correction-options">
        {pattern.suggestion && (
          <Button
            variant="primary"
            onClick={() => onCorrect(pattern, pattern.suggestion)}
          >
            ✨ Map to "{pattern.suggestion}" (suggested)
          </Button>
        )}
        
        <Select
          placeholder="Choose valid option..."
          options={validOptions}
          onSelect={(value) => onCorrect(pattern, value)}
        />
        
        <Button 
          variant="ghost" 
          onClick={() => showAffectedRows(pattern.rows)}
        >
          View {pattern.count} affected rows
        </Button>
      </div>
    )}
  </div>
);
```

### 3. Smart Correction Application

Apply corrections across the entire dataset with proper text replacement:

```typescript
const applyBulkCorrection = (
  employees: Employee[], 
  pattern: ErrorPattern, 
  newValue: string
): Employee[] => {
  return employees.map(employee => {
    const fieldValue = employee[pattern.field];
    if (!fieldValue || !fieldValue.includes(pattern.invalidName)) {
      return employee;
    }
    
    // Handle comma-separated values properly
    const updatedValue = fieldValue
      .split(',')
      .map(item => item.trim())
      .map(item => item.toLowerCase() === pattern.invalidName.toLowerCase() ? newValue : item)
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
};
```

### 4. Enhanced Workflow Integration

Update the 8-step workflow to include bulk correction:

```typescript
// Step 3: Mapping (Enhanced)
// - Column mapping
// - Bulk error detection  
// - Bulk correction prompts
// - Only proceed when bulk corrections are complete

// Step 4: Validation (Simplified)  
// - Individual validation for remaining issues
// - Focus on data that couldn't be bulk-corrected
// - Much fewer errors to fix manually

const WORKFLOW_STEPS = [
  { id: 1, name: 'Authentication', status: 'complete' },
  { id: 2, name: 'Upload', status: 'complete' },
  { id: 3, name: 'Mapping', 
    substeps: [
      'Map columns',
      'Detect common errors', 
      'Apply bulk corrections'  // New substep
    ]
  },
  { id: 4, name: 'Validation', status: 'current' },
  // ... rest of workflow
];
```

### Fuzzy Matching for Typos
```typescript
// Simple Levenshtein distance or similar
"Ktichen" → "Kitchen" (1 character difference)
"Cheif" → "Chef" (1 character difference)  
"Waitr" → "Waiter" (1 character missing)
```

### Multiple Match Handling
```typescript
// If user types "Manager" but there are "Kitchen Manager" and "Floor Manager"
errors.push({
  message: "Manager is ambiguous",
  suggestions: ["Kitchen Manager", "Floor Manager"]
});
```

### Fallback to IDs
```typescript
// Still accept numeric IDs for power users or data exports
"Kitchen,42,Bar" → [42, 42, 18] // Kitchen ID, literal 42, Bar ID
```

## Implementation Benefits

### For Users
- **Intuitive**: Work with familiar department/role names
- **Error Prevention**: Typo detection with suggestions
- **Flexible**: Mix names and IDs if needed
- **Self-Documenting**: Excel files are readable by humans

### For Developers
- **Clean Separation**: UI layer handles names, API layer handles IDs
- **Robust Validation**: Comprehensive error detection and recovery
- **Maintainable**: Single source of truth for name↔ID mappings
- **Extensible**: Easy to add new fuzzy matching algorithms

### For System
- **Performance**: Pre-computed maps for O(1) lookups
- **Reliability**: Validation happens before any API calls
- **Scalability**: Works with any number of departments/groups
- **Backwards Compatible**: Still accepts ID-based input

## Edge Cases Handled

```typescript
// Case sensitivity
"kitchen" === "Kitchen" === "KITCHEN"

// Whitespace normalization  
" Kitchen , Bar " → ["Kitchen", "Bar"]

// Mixed input types
"Kitchen,42,Bar" → [kitchenId, 42, barId]

// Empty values
"Kitchen,,Bar" → [kitchenId, barId] // Skip empty

// Duplicate names
"Kitchen,Kitchen,Bar" → [kitchenId, barId] // Deduplicate
```

This architecture provides a seamless user experience while maintaining robust data validation and API compatibility.