# Planday HR API - Employees

## Overview

The Planday HR API Employees endpoint provides comprehensive employee management functionality for workforce administration. This API allows you to create, read, update, and manage employee information, including personal details, contact information, and organizational assignments.

**Base URL:** `https://openapi.planday.com/hr/v1.0`

**Authentication:** All endpoints require OAuth2 authorization with appropriate scopes.

---

## Data Model

### Employee Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique employee identifier |
| `hiredDate` | string (date) | Date when the employee got hired |
| `dateTimeCreated` | string (datetime) | Date and time of employee creation |
| `dateTimeModified` | string (datetime) | Date and time of the last employee data modification |
| `dateTimeDeleted` | string (datetime) | Datetime when the employee account was last deactivated |
| `employeeTypeId` | integer | Identifier of the employee's employee type |
| `salaryIdentifier` | string | Salary code identifier of the employee |
| `firstName` | string | First name of the employee |
| `lastName` | string | Last name of the employee |
| `userName` | string | Username of the employee - must be an e-mail |
| `cellPhone` | string | Cell phone number associated with the employee |
| `street1` | string | Address 1 information of the employee's address |
| `street2` | string | Address 2 information of the employee's address |
| `zip` | string | Zip code of the employee's address |
| `city` | string | City of the employee's address |
| `phone` | string | Phone number associated with the employee (not frequently used) |
| `email` | string | Primary email address of the employee |
| `departments` | array[integer] | List of Department IDs associated with the employee |
| `employeeGroups` | array[integer] | List of Employee Group IDs associated with the employee |
| `bankAccount` | string | Bank account associated with the employee |
| `birthDate` | string (date) | Birth date of the employee |
| `ssn` | string | Social security number of the employee |
| `cellPhoneCountryPrefix` | string | Country prefix of the cell phone number |
| `cellPhoneCountryCode` | string | Country code of the cell phone number (ISO 3155 alpha-2) |
| `phoneCountryPrefix` | string | Country prefix of the phone number |
| `phoneCountryCode` | string | Country code of the phone number (ISO 3155 alpha-2) |

### Special Fields

Some sensitive fields require explicit inclusion via the `special` parameter:

- `BankAccount` - Include bank account information
- `BirthDate` - Include birth date information
- `Ssn` - Include social security number

---

## Endpoints

### GET /employees/deactivated - List Deactivated Employees

Get a paginated list of deactivated employees.

**Required Scope:** `employee:read`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Maximum number of records to return (max 50, default: 50) |
| `offset` | integer | Skip first N records for pagination (default: 0) |
| `createdFrom` | string (datetime) | Return only employees created after specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `createdTo` | string (datetime) | Return only employees created before specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `modifiedFrom` | string (datetime) | Return only employees last modified after specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `modifiedTo` | string (datetime) | Return only employees last modified before specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `deactivatedFrom` | string (datetime) | Return only employees deactivated after specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `deactivatedTo` | string (datetime) | Return only employees deactivated before specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `special` | array[string] | Include special fields: "BankAccount", "BirthDate", "Ssn" |
| `searchQuery` | string | Free text search by name, email, phone, salary identifier, or SSN |

#### Example Request

```http
GET /hr/v1.0/employees/deactivated?limit=20&offset=0&special=BirthDate&searchQuery=smith
Authorization: Bearer {access_token}
X-ClientId: {client_id}
```

#### Response

```json
{
  "paging": {
    "offset": 0,
    "limit": 20,
    "total": 1
  },
  "data": [
    {
      "hiredDate": "2016-01-01",
      "id": 614517,
      "dateTimeCreated": "2016-01-02",
      "dateTimeModified": "2016-07-11T13:22:00Z",
      "dateTimeDeleted": "2025-07-07T15:07:56.1066449Z",
      "employeeTypeId": 5322,
      "salaryIdentifier": "DKF614517",
      "firstName": "Mindy",
      "lastName": "Haynes",
      "userName": "mindy.haynes@test.com",
      "cellPhone": "+451212121212",
      "street1": "Lundsbjergvej 51",
      "street2": "Lundsbjegvej 52",
      "zip": "1924",
      "city": "Copenhagen",
      "phone": "+452121212121",
      "email": "mindy.haynes@test.com",
      "departments": [6324, 4967],
      "employeeGroups": [9663, 8987],
      "ssn": "",
      "cellPhoneCountryPrefix": "+45",
      "cellPhoneCountryCode": "DK",
      "phoneCountryPrefix": "+45",
      "phoneCountryCode": "DK"
    }
  ]
}
```

---

### GET /employees/fielddefinitions - Get Employee Field Definitions

Get a list of fields available when creating or updating an employee account. Returns a JSON schema that defines the structure and validation rules for employee data.

**Required Scope:** `employee:read`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | The type of employee definition (JsonSchema) to return: "Post" or "Put" |

#### Example Request

```http
GET /hr/v1.0/employees/fielddefinitions?type=Post
Authorization: Bearer {access_token}
X-ClientId: {client_id}
```

#### Response

```json
{
  "data": {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "required": [
      "firstName",
      "lastName"
    ],
    "properties": {
      "firstName": {
        "$ref": "#/definitions/string"
      },
      "lastName": {
        "$ref": "#/definitions/string"
      },
      "ssn": {
        "$ref": "#/definitions/optionalString"
      },
      "email": {
        "$ref": "#/definitions/optionalEmail"
      },
      "phone": {
        "$ref": "#/definitions/optionalString"
      },
      "phoneCountryCode": {
        "$ref": "#/definitions/optionalCountryCode"
      },
      "cellPhone": {
        "$ref": "#/definitions/optionalString"
      },
      "cellPhoneCountryCode": {
        "$ref": "#/definitions/optionalCountryCode"
      },
      "street1": {
        "$ref": "#/definitions/optionalString"
      },
      "street2": {
        "$ref": "#/definitions/optionalString"
      },
      "zip": {
        "$ref": "#/definitions/optionalString"
      },
      "city": {
        "$ref": "#/definitions/optionalString"
      },
      "userName": {
        "$ref": "#/definitions/optionalString"
      },
      "departments": {
        "$ref": "#/definitions/optionalArray<System.Int64>"
      },
      "employeeGroups": {
        "$ref": "#/definitions/optionalArray<System.Int64>"
      },
      "hiredFrom": {
        "$ref": "#/definitions/optionalDate"
      },
      "birthDate": {
        "$ref": "#/definitions/optionalDate"
      },
      "gender": {
        "$ref": "#/definitions/optionalGender"
      },
      "salaryIdentifier": {
        "$ref": "#/definitions/optionalString"
      },
      "jobTitle": {
        "$ref": "#/definitions/optionalString"
      },
      "employeeTypeId": {
        "$ref": "#/definitions/optionalEmployeeType"
      },
      "primaryDepartmentId": {
        "$ref": "#/definitions/optionalNumeric"
      },
      "bankAccount": {
        "$ref": "#/definitions/bankAccount"
      }
    },
    "definitions": {
      "string": {
        "type": "string",
        "minLength": 1
      },
      "optionalString": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1
          },
          {
            "type": "null"
          },
          {
            "type": "string",
            "maxLength": 0
          }
        ]
      },
      "optionalEmail": {
        "anyOf": [
          {
            "type": "string",
            "format": "email"
          },
          {
            "type": "null"
          },
          {
            "type": "string",
            "maxLength": 0
          }
        ]
      },
      "optionalCountryCode": {
        "type": "string",
        "enum": ["DK", "UK", "NO", "SE", "DE", "US", "PL", "VN", "FR", "ES", "IT", "NL", "CH", "BE", "AT", "FI", "IS", "AU", "CA", "JP", "KR", "CN", "BR", "MX", "IN", "ZA", "SG"]
      },
      "optionalArray<System.Int64>": {
        "anyOf": [
          {
            "type": "array",
            "items": {
              "type": "number"
            }
          },
          {
            "type": "null"
          },
          {
            "type": "string",
            "maxLength": 0
          }
        ]
      },
      "optionalDate": {
        "anyOf": [
          {
            "type": "string",
            "pattern": "^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[0-1]|0[1-9]|[1-2][0-9])(?:T(2[0-3]|[0-1][0-9]):([0-5][0-9]):([0-5][0-9])(\\\\.[0-9]+)?(Z|[+-](?:2[0-3]|[0-1][0-9]):[0-5][0-9])?)?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "optionalGender": {
        "anyOf": [
          {
            "type": "string",
            "enum": ["Male", "Female"]
          },
          {
            "type": "null"
          }
        ]
      },
      "optionalEmployeeType": {
        "anyOf": [
          {
            "type": "integer",
            "enum": [71285, 71286, 71287],
            "values": ["Intern", "Part-time", "Full-time"]
          },
          {
            "type": "null"
          }
        ]
      },
      "optionalNumeric": {
        "anyOf": [
          {
            "type": "number"
          },
          {
            "type": "null"
          }
        ]
      },
      "bankAccount": {
        "type": "object",
        "properties": {
          "accountNumber": {
            "$ref": "#/definitions/optionalString"
          },
          "registrationNumber": {
            "$ref": "#/definitions/optionalString"
          }
        }
      }
    },
    "portalId": 1022990,
    "readOnly": [
      "email",
      "cellPhoneCountryCode", 
      "cellPhone"
    ],
    "unique": []
  }
}
```

---

## Field Definitions and Validation

### Required Fields
- `firstName` - Employee's first name (required for all operations)
- `lastName` - Employee's last name (required for all operations)

### Optional Fields
- **Contact Information**: `email`, `phone`, `cellPhone`, `userName`
- **Address**: `street1`, `street2`, `zip`, `city`
- **Personal Information**: `birthDate`, `gender`, `ssn`
- **Employment Details**: `hiredFrom`, `salaryIdentifier`, `jobTitle`, `employeeTypeId`
- **Organizational**: `departments`, `employeeGroups`, `primaryDepartmentId`
- **Financial**: `bankAccount` (with `accountNumber` and `registrationNumber`)

### Country Codes
Supported country codes include: DK, UK, NO, SE, DE, US, PL, VN, FR, ES, IT, NL, CH, BE, AT, FI, IS, AU, CA, JP, KR, CN, BR, MX, IN, ZA, SG, and many others.

### Employee Types
- `71285` - Intern
- `71286` - Part-time
- `71287` - Full-time

### Read-Only Fields
Some fields may be read-only depending on portal configuration:
- `email`
- `cellPhoneCountryCode`
- `cellPhone`

### Custom Fields
Portals may define custom fields with specific naming patterns (e.g., `custom_123194`).

---

### PUT /employees/reactivate/{employeeId} - Reactivate Employee

Immediately reactivate a deactivated employee with the given ID.

**Required Scope:** `employee:update`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | integer | Required. ID of the employee to reactivate |

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `comment` | string | Optional comment explaining the reactivation |
| `departments` | array[integer] | Optional list of department IDs to assign the employee to |

#### Example Request

```http
PUT /hr/v1.0/employees/reactivate/614517
Authorization: Bearer {access_token}
X-ClientId: {client_id}
Content-Type: application/json

{
  "comment": "Employee returning from leave of absence",
  "departments": [6324, 4967]
}
```

#### Response

```
204 No Content
```

---

## Usage Examples

### Reactivate Employee with Department Assignment

```javascript
// Reactivate employee and assign to specific departments
await reactivateEmployee(614517, {
  comment: "Returning from maternity leave",
  departments: [6324, 4967]
});

console.log("Employee successfully reactivated");
```

### Simple Employee Reactivation

```javascript
// Reactivate employee without department changes
await reactivateEmployee(614517, {
  comment: "Rehired after temporary layoff"
});
```

### Bulk Reactivation with Error Handling

```javascript
// Reactivate multiple employees with proper error handling
const employeesToReactivate = [
  { id: 614517, departments: [6324] },
  { id: 614518, departments: [4967] },
  { id: 614519, departments: [6324, 4967] }
];

for (const emp of employeesToReactivate) {
  try {
    await reactivateEmployee(emp.id, {
      comment: "Seasonal rehire",
      departments: emp.departments
    });
    console.log(`Employee ${emp.id} reactivated successfully`);
  } catch (error) {
    console.error(`Failed to reactivate employee ${emp.id}:`, error);
  }
}
```

---

## Employee Reactivation Workflow

### Business Process
1. **Identify Deactivated Employee**: Use the deactivated employees endpoint to find the employee
2. **Verify Eligibility**: Check if the employee is eligible for reactivation
3. **Prepare Department Assignments**: Determine which departments the employee should rejoin
4. **Reactivate**: Call the reactivation endpoint with appropriate comment and departments
5. **Update Related Systems**: Ensure scheduling, payroll, and access systems are updated

### Integration Considerations
- **Department Assignments**: Reactivated employees may need new department assignments
- **Historical Data**: Previous scheduling and payroll data remains intact
- **Access Rights**: Employee access to systems may need to be restored
- **Compliance**: Document reactivation reasons for HR compliance
- **Communication**: Notify relevant managers and team members

---

### POST /employees - Create Employee

Create a new employee account based on provided parameters. Additional fields might be required depending on the portal configuration.

**Required Scope:** `employee:create`

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | ✓ | First name of the employee |
| `lastName` | string | ✓ | Last name of the employee |
| `userName` | string | ✓ | Username of the employee - must be an e-mail |
| `departments` | array[integer] | ✓ | List of Department IDs associated with the employee |
| `cellPhone` | string | | Cell phone number associated with the employee |
| `birthDate` | string (date) | | Birth date of the employee |
| `ssn` | string | | Social security number of the employee |
| `cellPhoneCountryCode` | string | | Country code of the cell phone (ISO 3155 alpha-2) |
| `cellPhoneCountryId` | integer | | Country code ID of the cell phone number |
| `street1` | string | | Address line 1 of the employee's address |
| `street2` | string | | Address line 2 of the employee's address |
| `zip` | string | | Zip code of the employee's address |
| `phone` | string | | Phone number associated with the employee |
| `phoneCountryCode` | string | | Country code of the phone (ISO 3155 alpha-2) |
| `phoneCountryId` | integer | | Country code ID of the phone number |
| `city` | string | | City of the employee's address |
| `email` | string | | Primary email address of the employee |
| `employeeGroups` | array[integer] | | List of Employee Group IDs associated with the employee |
| `hiredFrom` | string (date) | | Date when the employee was hired |
| `gender` | string | | Gender: "Male" or "Female" |
| `primaryDepartmentId` | integer | | Primary department ID (available on enabled portals) |
| `jobTitle` | string | | Job title of the employee |
| `employeeTypeId` | integer | | Employee type ID |
| `bankAccount` | object | | Bank account information |
| `bankAccount.registrationNumber` | string | | Bank registration number |
| `bankAccount.accountNumber` | string | | Bank account number |
| `salaryIdentifier` | string | | Salary code identifier |
| `isSupervisor` | boolean | | Set to true to create a supervisor employee |
| `supervisorId` | integer | | Supervisor ID associated with the employee |
| `skillIds` | array[integer] | | List of Skill IDs associated with the employee |

#### Example Request

```http
POST /hr/v1.0/employees
Authorization: Bearer {access_token}
X-ClientId: {client_id}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "userName": "john.smith@example.com",
  "departments": [6324, 4967],
  "cellPhone": "1234567890",
  "birthDate": "1990-05-15",
  "ssn": "123-45-6789",
  "cellPhoneCountryCode": "US",
  "street1": "123 Main Street",
  "street2": "Apt 4B",
  "zip": "10001",
  "phone": "9876543210",
  "phoneCountryCode": "US",
  "city": "New York",
  "email": "john.smith@example.com",
  "employeeGroups": [9663, 8987],
  "hiredFrom": "2025-06-07",
  "gender": "Male",
  "primaryDepartmentId": 6324,
  "jobTitle": "Server",
  "employeeTypeId": 71287,
  "bankAccount": {
    "registrationNumber": "123456789",
    "accountNumber": "987654321"
  },
  "salaryIdentifier": "EMP001",
  "isSupervisor": false,
  "supervisorId": 451874,
  "skillIds": [1, 3, 7]
}
```

#### Response

```json
{
  "data": {
    "id": 614518,
    "hiredFrom": "2025-06-07",
    "deactivationDate": null,
    "salaryIdentifier": "EMP001",
    "gender": "Male",
    "jobTitle": "Server",
    "employeeTypeId": 71287,
    "primaryDepartmentId": 6324,
    "dateTimeCreated": "2025-06-07T10:30:00Z",
    "dateTimeModified": "2025-06-07T10:30:00Z",
    "supervisorEmployeeId": 451874,
    "securityGroups": [8673, 98741],
    "firstName": "John",
    "lastName": "Smith",
    "userName": "john.smith@example.com",
    "cellPhone": "1234567890",
    "cellPhoneCountryCode": "US",
    "street1": "123 Main Street",
    "street2": "Apt 4B",
    "zip": "10001",
    "phone": "9876543210",
    "phoneCountryCode": "US",
    "city": "New York",
    "email": "john.smith@example.com",
    "departments": [6324, 4967],
    "employeeGroups": [9663, 8987],
    "custom_11111": {
      "name": "Custom Text",
      "type": "Text",
      "value": "Welcome message",
      "url": "dummyUrl"
    },
    "custom_22222": {
      "name": "Custom Numeric",
      "type": "Numeric",
      "value": 100,
      "url": "dummyUrl"
    }
  }
}
```

---

## Employee Creation Examples

### Basic Employee Creation

```javascript
// Create a basic employee with minimum required fields
const newEmployee = await createEmployee({
  firstName: "Jane",
  lastName: "Doe",
  userName: "jane.doe@example.com",
  departments: [6324],
  email: "jane.doe@example.com",
  hiredFrom: "2025-06-07"
});

console.log(`Created employee with ID: ${newEmployee.data.id}`);
```

### Complete Employee Profile Creation

```javascript
// Create employee with full profile information
const fullEmployee = await createEmployee({
  firstName: "Michael",
  lastName: "Johnson",
  userName: "michael.johnson@example.com",
  departments: [6324, 4967],
  cellPhone: "5551234567",
  cellPhoneCountryCode: "US",
  street1: "456 Oak Avenue",
  zip: "90210",
  city: "Beverly Hills",
  email: "michael.johnson@example.com",
  employeeGroups: [9663],
  hiredFrom: "2025-06-01",
  gender: "Male",
  primaryDepartmentId: 6324,
  jobTitle: "Assistant Manager",
  employeeTypeId: 71287,
  bankAccount: {
    registrationNumber: "987654321",
    accountNumber: "123456789"
  },
  salaryIdentifier: "AM001",
  isSupervisor: true,
  skillIds: [1, 2, 3, 5]
});
```

### Supervisor Creation

```javascript
// Create a supervisor employee
const supervisor = await createEmployee({
  firstName: "Sarah",
  lastName: "Manager",
  userName: "sarah.manager@example.com",
  departments: [6324],
  email: "sarah.manager@example.com",
  hiredFrom: "2025-06-01",
  jobTitle: "Department Manager",
  employeeTypeId: 71287,
  isSupervisor: true,
  skillIds: [1, 2, 3, 4, 5, 6]
});

// Then create employees under this supervisor
const subordinate = await createEmployee({
  firstName: "Tom",
  lastName: "Employee",
  userName: "tom.employee@example.com",
  departments: [6324],
  supervisorId: supervisor.data.id,
  hiredFrom: "2025-06-07"
});
```

### Bulk Employee Creation with Error Handling

```javascript
// Create multiple employees with proper error handling
const employeesToCreate = [
  {
    firstName: "Alice",
    lastName: "Williams",
    userName: "alice.williams@example.com",
    departments: [6324]
  },
  {
    firstName: "Bob",
    lastName: "Brown",
    userName: "bob.brown@example.com",
    departments: [4967]
  },
  {
    firstName: "Carol",
    lastName: "Davis",
    userName: "carol.davis@example.com",
    departments: [6324, 4967]
  }
];

const createdEmployees = [];
const errors = [];

for (const employeeData of employeesToCreate) {
  try {
    const employee = await createEmployee({
      ...employeeData,
      hiredFrom: "2025-06-07",
      email: employeeData.userName
    });
    createdEmployees.push(employee.data);
    console.log(`Created: ${employee.data.firstName} ${employee.data.lastName} (ID: ${employee.data.id})`);
  } catch (error) {
    errors.push({
      employee: employeeData,
      error: error.message
    });
    console.error(`Failed to create ${employeeData.firstName} ${employeeData.lastName}:`, error.message);
  }
}

console.log(`Successfully created ${createdEmployees.length} employees`);
console.log(`Failed to create ${errors.length} employees`);
```

---

## Custom Fields Support

### Custom Field Types
The API supports various custom field types that may be configured in your portal:

- **Text**: Custom text fields
- **Numeric**: Custom numeric values
- **Boolean**: True/false custom fields
- **Date**: Custom date fields
- **Dropdown**: Custom dropdown selections
- **Image**: Custom image uploads

### Custom Field Response Format
```json
{
  "custom_11111": {
    "name": "Emergency Contact",
    "type": "Text",
    "value": "Jane Smith - 555-0123",
    "url": "dummyUrl"
  },
  "custom_22222": {
    "name": "Years Experience",
    "type": "Numeric",
    "value": 5,
    "url": "dummyUrl"
  },
  "custom_33333": {
    "name": "Has Driver License",
    "type": "Boolean", 
    "value": true,
    "url": "dummyUrl"
  }
}
```

---

## Employee Creation Workflow

### Pre-Creation Steps
1. **Get Field Definitions**: Use `/employees/fielddefinitions?type=Post` to understand required fields
2. **Validate Departments**: Ensure department IDs exist and are accessible
3. **Check Employee Groups**: Verify employee group IDs are valid
4. **Validate Skills**: Confirm skill IDs exist and are appropriate
5. **Prepare Supervisor Hierarchy**: If using supervisors, ensure supervisor exists

### Post-Creation Steps
1. **Verify Creation**: Check the returned employee ID and data
2. **Set up Scheduling**: Add employee to scheduling systems
3. **Configure Access**: Set up system access and permissions
4. **Payroll Integration**: Ensure employee is added to payroll systems
5. **Communication**: Notify relevant teams of new employee

---

### GET /employees - List Active Employees

Get a paginated list of active employee profiles.

**Required Scope:** `employee:read`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Maximum number of records to return (max 50, default: 50) |
| `offset` | integer | Skip first N records for pagination (default: 0) |
| `createdFrom` | string (datetime) | Return only employees created after specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `createdTo` | string (datetime) | Return only employees created before specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `modifiedFrom` | string (datetime) | Return only employees modified after specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `modifiedTo` | string (datetime) | Return only employees modified before specified instant (YYYY-MM-DDTHH:MM:SSZ) |
| `special` | array[string] | Include special fields: "BankAccount", "BirthDate", "Ssn" |
| `includeSecurityGroups` | boolean | Include security groups for each employee |
| `searchQuery` | string | Free text search by name, email, phone, salary identifier, or SSN |

#### Example Request

```http
GET /hr/v1.0/employees?limit=20&offset=0&special=BankAccount,BirthDate&includeSecurityGroups=true&searchQuery=mindy
Authorization: Bearer {access_token}
X-ClientId: {client_id}
```

#### Response

```json
{
  "paging": {
    "offset": 0,
    "limit": 20,
    "total": 1
  },
  "data": [
    {
      "hiredDate": "2016-01-01",
      "deactivationDate": null,
      "securityGroups": [8673, 98741],
      "supervisorId": 2345,
      "primaryDepartmentId": 1234,
      "id": 614517,
      "dateTimeCreated": "2016-01-02",
      "dateTimeModified": "2016-07-11T13:22:00Z",
      "dateTimeDeleted": null,
      "employeeTypeId": 5322,
      "salaryIdentifier": "DKF614517",
      "firstName": "Mindy",
      "lastName": "Haynes",
      "userName": "mindy.haynes@test.com",
      "cellPhone": "+451212121212",
      "street1": "Lundsbjergvej 51",
      "street2": "Lundsbjegvej 52",
      "zip": "1924",
      "city": "Copenhagen",
      "phone": "+452121212121",
      "email": "mindy.haynes@test.com",
      "departments": [6324, 4967],
      "employeeGroups": [9663, 8987],
      "bankAccount": {
        "registrationNumber": "333",
        "accountNumber": "1234-1234-1234-1234"
      },
      "birthDate": "1991-10-16",
      "ssn": "98765432",
      "cellPhoneCountryPrefix": "+45",
      "cellPhoneCountryCode": "DK",
      "phoneCountryPrefix": "+45",
      "phoneCountryCode": "DK"
    }
  ]
}
```

---

## Active Employee Management Examples

### Get All Active Employees

```javascript
// Get all active employees with basic information
const activeEmployees = await getEmployees({
  limit: 50,
  offset: 0
});

console.log(`Found ${activeEmployees.paging.total} active employees`);

// Process each employee
activeEmployees.data.forEach(employee => {
  console.log(`${employee.firstName} ${employee.lastName} - ${employee.jobTitle || 'No Title'}`);
  console.log(`Departments: ${employee.departments.join(', ')}`);
});
```

### Search Active Employees

```javascript
// Search for specific active employees
const searchResults = await getEmployees({
  searchQuery: "manager",
  includeSecurityGroups: true,
  limit: 20
});

// Find employees with management roles
const managers = searchResults.data.filter(emp => 
  emp.jobTitle && emp.jobTitle.toLowerCase().includes('manager')
);

console.log(`Found ${managers.length} managers`);
```

### Get Employees with Sensitive Information

```javascript
// Get employees with complete sensitive data for payroll processing
const payrollEmployees = await getEmployees({
  special: ["BankAccount", "BirthDate", "Ssn"],
  includeSecurityGroups: true,
  limit: 50
});

// Process payroll-ready employees
payrollEmployees.data.forEach(employee => {
  console.log(`Employee: ${employee.firstName} ${employee.lastName}`);
  if (employee.bankAccount) {
    console.log(`Bank: ${employee.bankAccount.registrationNumber} - ${employee.bankAccount.accountNumber}`);
  }
  if (employee.birthDate) {
    console.log(`DOB: ${employee.birthDate}`);
  }
  if (employee.ssn) {
    console.log(`SSN: ${employee.ssn}`);
  }
});
```

### Get Recently Hired Employees

```javascript
// Get employees hired in the last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const recentHires = await getEmployees({
  createdFrom: thirtyDaysAgo.toISOString(),
  limit: 50
});

console.log(`${recentHires.paging.total} employees hired in the last 30 days`);

recentHires.data.forEach(employee => {
  console.log(`${employee.firstName} ${employee.lastName} - Hired: ${employee.hiredDate}`);
});
```

### Get Employees by Department

```javascript
// Get all employees and group by department
const allEmployees = await getAllEmployees(); // Helper function with pagination

const employeesByDepartment = {};

allEmployees.forEach(employee => {
  employee.departments.forEach(deptId => {
    if (!employeesByDepartment[deptId]) {
      employeesByDepartment[deptId] = [];
    }
    employeesByDepartment[deptId].push(employee);
  });
});

// Display department summaries
Object.keys(employeesByDepartment).forEach(deptId => {
  console.log(`Department ${deptId}: ${employeesByDepartment[deptId].length} employees`);
});
```

### Supervisor Hierarchy Analysis

```javascript
// Get employees with security groups to analyze hierarchy
const employeesWithSecurity = await getEmployees({
  includeSecurityGroups: true,
  limit: 50
});

// Find supervisors (employees who have others reporting to them)
const allEmployees = await getAllEmployees();
const supervisors = allEmployees.filter(emp => 
  allEmployees.some(other => other.supervisorId === emp.id)
);

console.log(`Found ${supervisors.length} supervisors`);

supervisors.forEach(supervisor => {
  const subordinates = allEmployees.filter(emp => emp.supervisorId === supervisor.id);
  console.log(`${supervisor.firstName} ${supervisor.lastName} manages ${subordinates.length} employees`);
});
```

### Complete Employee Directory with Pagination

```javascript
// Helper function to get all employees with pagination
async function getAllEmployees() {
  let allEmployees = [];
  let offset = 0;
  const limit = 50;
  
  do {
    const response = await getEmployees({ 
      limit, 
      offset,
      includeSecurityGroups: true,
      special: ["BankAccount", "BirthDate"]
    });
    
    allEmployees.push(...response.data);
    offset += limit;
    
    console.log(`Loaded ${allEmployees.length} of ${response.paging.total} employees`);
  } while (offset < response.paging.total);
  
  return allEmployees;
}

// Generate complete employee directory
const directory = await getAllEmployees();

// Create directory by department
const directoryByDept = {};
directory.forEach(employee => {
  const primaryDept = employee.primaryDepartmentId || employee.departments[0];
  if (!directoryByDept[primaryDept]) {
    directoryByDept[primaryDept] = [];
  }
  directoryByDept[primaryDept].push({
    name: `${employee.firstName} ${employee.lastName}`,
    title: employee.jobTitle,
    email: employee.email,
    phone: employee.cellPhone,
    hiredDate: employee.hiredDate
  });
});

console.log('Employee Directory:', directoryByDept);
```

### Employee Analytics and Reporting

```javascript
// Generate employee analytics report
const employees = await getAllEmployees();

const analytics = {
  total: employees.length,
  byEmployeeType: {},
  byDepartment: {},
  avgTenure: 0,
  recentHires: 0,
  supervisors: 0
};

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

employees.forEach(employee => {
  // Group by employee type
  const typeId = employee.employeeTypeId;
  analytics.byEmployeeType[typeId] = (analytics.byEmployeeType[typeId] || 0) + 1;
  
  // Group by primary department
  const deptId = employee.primaryDepartmentId;
  if (deptId) {
    analytics.byDepartment[deptId] = (analytics.byDepartment[deptId] || 0) + 1;
  }
  
  // Count recent hires
  if (new Date(employee.dateTimeCreated) > thirtyDaysAgo) {
    analytics.recentHires++;
  }
  
  // Count supervisors
  if (employee.supervisorId) {
    analytics.supervisors++;
  }
});

// Calculate average tenure
const totalTenureDays = employees.reduce((sum, emp) => {
  const hiredDate = new Date(emp.hiredDate || emp.dateTimeCreated);
  const tenureDays = (now - hiredDate) / (1000 * 60 * 60 * 24);
  return sum + tenureDays;
}, 0);

analytics.avgTenure = Math.round(totalTenureDays / employees.length);

console.log('Employee Analytics:', analytics);
```

---

### PUT /employees/{employeeId} - Update Employee

Update employee's details such as phone number, name, or department membership.

**Required Scope:** `employee:update`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | integer | Required. Employee ID to update |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `useValidation` | boolean | If true (default), require values for any empty required fields in the employee profile |

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | string | First name of the employee |
| `lastName` | string | Last name of the employee |
| `userName` | string | Username (use dedicated Change Username endpoint to update) |
| `departments` | array[integer] | List of Department IDs associated with the employee |
| `cellPhone` | string | Cell phone number associated with the employee |
| `birthDate` | string (date) | Birth date of the employee |
| `ssn` | string | Social security number of the employee |
| `cellPhoneCountryCode` | string | Country code of the cell phone (ISO 3155 alpha-2) |
| `cellPhoneCountryId` | integer | Country code ID of the cell phone number |
| `street1` | string | Address line 1 of the employee's address |
| `street2` | string | Address line 2 of the employee's address |
| `zip` | string | Zip code of the employee's address |
| `phone` | string | Phone number associated with the employee |
| `phoneCountryCode` | string | Country code of the phone (ISO 3155 alpha-2) |
| `phoneCountryId` | integer | Country code ID of the phone number |
| `city` | string | City of the employee's address |
| `email` | string | Primary email address of the employee |
| `employeeGroups` | array[integer] | List of Employee Group IDs associated with the employee |
| `hiredFrom` | string (date) | Date when the employee was hired |
| `gender` | string | Gender: "Male" or "Female" |
| `primaryDepartmentId` | integer | Primary department ID |
| `jobTitle` | string | Job title of the employee |
| `employeeTypeId` | integer | Employee type ID |
| `bankAccount` | object | Bank account information |
| `bankAccount.registrationNumber` | string | Bank registration number |
| `bankAccount.accountNumber` | string | Bank account number |
| `salaryIdentifier` | string | Salary code identifier |
| `isSupervisor` | boolean | Set to true to make employee a supervisor |
| `supervisorId` | integer | Supervisor ID associated with the employee |
| `skillIds` | array[integer] | List of Skill IDs associated with the employee |

#### Example Request

```http
PUT /hr/v1.0/employees/614517?useValidation=true
Authorization: Bearer {access_token}
X-ClientId: {client_id}
Content-Type: application/json

{
  "firstName": "Mindy",
  "lastName": "Johnson",
  "cellPhone": "5551234567",
  "cellPhoneCountryCode": "US",
  "street1": "789 New Address Street",
  "street2": "Unit 12",
  "zip": "10002",
  "city": "New York",
  "email": "mindy.johnson@example.com",
  "departments": [6324, 4967, 7890],
  "employeeGroups": [9663],
  "jobTitle": "Senior Server",
  "employeeTypeId": 71287,
  "primaryDepartmentId": 6324,
  "skillIds": [1, 3, 7, 8],
  "bankAccount": {
    "registrationNumber": "987654321",
    "accountNumber": "5555-6666-7777-8888"
  }
}
```

#### Response

```
204 No Content
```

---

## Employee Update Examples

### Update Basic Information

```javascript
// Update employee's basic contact information
await updateEmployee(614517, {
  firstName: "Mindy",
  lastName: "Smith-Johnson",
  cellPhone: "5551234567",
  email: "mindy.smithjohnson@example.com",
  street1: "456 Oak Street",
  city: "Brooklyn",
  zip: "11201"
});

console.log("Employee contact information updated");
```

### Update Department and Role

```javascript
// Promote employee and change departments
await updateEmployee(614517, {
  jobTitle: "Assistant Manager",
  employeeTypeId: 71287, // Full-time
  primaryDepartmentId: 6324,
  departments: [6324, 4967], // Multi-department assignment
  isSupervisor: true,
  skillIds: [1, 2, 3, 4, 5, 6] // Add management skills
});

console.log("Employee promoted to Assistant Manager");
```

### Update Skills and Supervisor

```javascript
// Update employee skills and assign new supervisor
await updateEmployee(614517, {
  skillIds: [1, 3, 7, 8, 9], // Add new skills
  supervisorId: 451874, // Assign to new supervisor
  employeeGroups: [9663, 8987] // Update employee groups
});

console.log("Employee skills and supervision updated");
```

### Update Bank Account Information

```javascript
// Update payroll-related information
await updateEmployee(614517, {
  bankAccount: {
    registrationNumber: "123456789",
    accountNumber: "9999-8888-7777-6666"
  },
  salaryIdentifier: "EMP614517-2025"
});

console.log("Employee payroll information updated");
```

### Partial Updates with Validation

```javascript
// Update only specific fields with validation disabled
await updateEmployee(614517, {
  cellPhone: "5559876543",
  street1: "123 Updated Address"
}, { useValidation: false });

console.log("Employee address updated without validation");
```

### Bulk Employee Updates

```javascript
// Update multiple employees with error handling
const employeeUpdates = [
  {
    id: 614517,
    updates: {
      jobTitle: "Senior Server",
      skillIds: [1, 3, 7]
    }
  },
  {
    id: 614518,
    updates: {
      jobTitle: "Lead Bartender",
      skillIds: [2, 4, 8]
    }
  },
  {
    id: 614519,
    updates: {
      departments: [6324, 4967],
      primaryDepartmentId: 6324
    }
  }
];

const updateResults = [];
const updateErrors = [];

for (const employeeUpdate of employeeUpdates) {
  try {
    await updateEmployee(employeeUpdate.id, employeeUpdate.updates);
    updateResults.push({
      id: employeeUpdate.id,
      status: "success"
    });
    console.log(`Successfully updated employee ${employeeUpdate.id}`);
  } catch (error) {
    updateErrors.push({
      id: employeeUpdate.id,
      error: error.message
    });
    console.error(`Failed to update employee ${employeeUpdate.id}:`, error.message);
  }
}

console.log(`Updated ${updateResults.length} employees successfully`);
console.log(`Failed to update ${updateErrors.length} employees`);
```

### Employee Transfer Between Departments

```javascript
// Transfer employee to new department with updated role
async function transferEmployee(employeeId, fromDeptId, toDeptId, newRole) {
  // First get current employee data
  const employee = await getEmployee(employeeId);
  
  // Remove old department, add new department
  const updatedDepartments = employee.departments
    .filter(id => id !== fromDeptId)
    .concat(toDeptId);
  
  // Update employee with new department and role
  await updateEmployee(employeeId, {
    departments: updatedDepartments,
    primaryDepartmentId: toDeptId,
    jobTitle: newRole,
    // Clear supervisor if moving departments
    supervisorId: null
  });
  
  console.log(`Employee ${employeeId} transferred from department ${fromDeptId} to ${toDeptId}`);
}

// Example usage
await transferEmployee(614517, 6324, 4967, "Kitchen Supervisor");
```

### Employee Promotion Workflow

```javascript
// Complete employee promotion process
async function promoteEmployee(employeeId, promotionData) {
  const {
    newTitle,
    newEmployeeType,
    newSkills,
    newSupervisor,
    newDepartments,
    newSalaryId,
    makeSupevisor = false
  } = promotionData;
  
  const updateData = {
    jobTitle: newTitle,
    employeeTypeId: newEmployeeType,
    skillIds: newSkills,
    isSupervisor: makeSupevisor
  };
  
  // Add optional fields if provided
  if (newSupervisor) updateData.supervisorId = newSupervisor;
  if (newDepartments) updateData.departments = newDepartments;
  if (newSalaryId) updateData.salaryIdentifier = newSalaryId;
  
  try {
    await updateEmployee(employeeId, updateData);
    console.log(`Employee ${employeeId} promoted to ${newTitle}`);
    return { success: true };
  } catch (error) {
    console.error(`Promotion failed for employee ${employeeId}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Example promotion
const promotionResult = await promoteEmployee(614517, {
  newTitle: "Department Manager",
  newEmployeeType: 71287, // Full-time
  newSkills: [1, 2, 3, 4, 5, 6, 7, 8],
  newDepartments: [6324],
  newSalaryId: "MGR614517",
  makeSupevisor: true
});
```

### Employee Information Sync

```javascript
// Sync employee information from external HR system
async function syncEmployeeFromHR(employeeId, externalHRData) {
  const syncData = {
    firstName: externalHRData.first_name,
    lastName: externalHRData.last_name,
    email: externalHRData.email,
    cellPhone: externalHRData.mobile_phone,
    street1: externalHRData.address.street,
    city: externalHRData.address.city,
    zip: externalHRData.address.postal_code,
    jobTitle: externalHRData.position,
    employeeTypeId: mapEmployeeType(externalHRData.employment_type),
    birthDate: externalHRData.date_of_birth,
    hiredFrom: externalHRData.hire_date
  };
  
  // Only include fields that have values
  const filteredData = Object.entries(syncData)
    .filter(([key, value]) => value != null && value !== '')
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  
  try {
    await updateEmployee(employeeId, filteredData, { useValidation: false });
    console.log(`Successfully synced employee ${employeeId} from HR system`);
  } catch (error) {
    console.error(`Failed to sync employee ${employeeId}:`, error.message);
    throw error;
  }
}

function mapEmployeeType(hrType) {
  const typeMapping = {
    'intern': 71285,
    'part-time': 71286,
    'full-time': 71287
  };
  return typeMapping[hrType.toLowerCase()] || 71287;
}
```

---

## Update Validation and Error Handling

### Validation Options
- **useValidation=true** (default): Requires values for any empty required fields
- **useValidation=false**: Allows partial updates without checking required fields

### Common Update Scenarios
1. **Contact Information Updates**: Phone, email, address changes
2. **Role Changes**: Job title, department, skills updates
3. **Organizational Changes**: Supervisor, employee group modifications
4. **Payroll Updates**: Bank account, salary identifier changes
5. **Personal Information**: Birth date, gender, SSN updates

### Error Prevention
- Validate department IDs exist before updating
- Verify employee group IDs are accessible
- Check skill IDs are valid for the organization
- Ensure supervisor IDs reference existing employees
- Validate country codes for phone numbers

---

### GET /employees/{employeeId} - Get Employee by ID

Get details of an employee's profile.

**Required Scope:** `employee:read`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | integer | Required. Employee ID to retrieve |

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `special` | array[string] | Include special fields: "BankAccount", "BirthDate", "Ssn" |

#### Example Request

```http
GET /hr/v1.0/employees/614517?special=BankAccount,BirthDate
Authorization: Bearer {access_token}
X-ClientId: {client_id}
```

#### Response

```json
{
  "data": {
    "id": 614517,
    "hiredFrom": "2016-01-01",
    "deactivationDate": null,
    "salaryIdentifier": "DKF614517",
    "gender": "Female",
    "jobTitle": "Bartender",
    "employeeTypeId": 5322,
    "primaryDepartmentId": 4967,
    "dateTimeCreated": "2016-01-02T16:55:00Z",
    "dateTimeModified": "2016-07-11T13:22:00Z",
    "firstName": "Mindy",
    "lastName": "Haynes",
    "userName": "mindy.haynes@test.com",
    "cellPhone": "1212121212",
    "street1": "Lundsbjergvej 51",
    "street2": "Lundsbjegvej 52",
    "zip": "1924",
    "phone": "2121212121",
    "city": "Copenhagen",
    "email": "mindy.haynes@test.com",
    "departments": [6324, 4967],
    "employeeGroups": [9663, 8987],
    "supervisorEmployeeId": 451874,
    "securityGroups": [8673, 98741],
    "skillIds": [1, 3, 7],
    "ssn": "123-45-6789",
    "cellPhoneCountryPrefix": "+45",
    "cellPhoneCountryCode": "DK",
    "phoneCountryPrefix": "+45",
    "phoneCountryCode": "DK",
    "custom_11111": {
      "name": "Custom Text",
      "type": "Text",
      "value": "This is an example text.",
      "url": "dummyUrl"
    },
    "custom_22222": {
      "name": "Custom Numeric",
      "type": "Numeric",
      "value": 42,
      "url": "dummyUrl"
    },
    "custom_33333": {
      "name": "Custom Boolean",
      "type": "Boolean",
      "value": true,
      "url": "dummyUrl"
    }
  }
}
```

---

### PUT /employees/deactivate/{employeeId} - Deactivate Employee

Deactivate an employee's system access. If no or past date is provided, the employee will lose access immediately, otherwise their access will be terminated on the specified date.

**Required Scope:** `employee:update`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | integer | Required. Employee ID to deactivate |

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (date) | Last date where the user is active (YYYY-MM-DD). If null, deactivates immediately |
| `reason` | string | Reason for deactivation shown in the "Detail" field |
| `keepShifts` | boolean | True = keep shifts assigned; False = unassign from future shifts |

#### Example Request

```http
PUT /hr/v1.0/employees/deactivate/614517
Authorization: Bearer {access_token}
X-ClientId: {client_id}
Content-Type: application/json

{
  "date": "2025-06-30",
  "reason": "Voluntary resignation - pursuing new opportunity",
  "keepShifts": false
}
```

#### Response

```
204 No Content
```

---

### GET /employees/supervisors - List Supervisors

Get a list of employees who can be assigned as supervisors. Use this endpoint to map special supervisor IDs to the user's employee ID.

**Required Scope:** `employee:read`

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offset` | integer | Skip first N records for pagination purposes |
| `limit` | integer | Maximum number of records to return (max 50 per request) |

#### Example Request

```http
GET /hr/v1.0/employees/supervisors?limit=50&offset=0
Authorization: Bearer {access_token}
X-ClientId: {client_id}
```

#### Response

```json
{
  "paging": {
    "offset": 0,
    "limit": 50,
    "total": 15
  },
  "data": [
    {
      "id": 451874,
      "employeeId": 451874,
      "name": "Sarah Manager"
    },
    {
      "id": 451875,
      "employeeId": 451875,
      "name": "Mike Supervisor"
    },
    {
      "id": 451876,
      "employeeId": 451876,
      "name": "Lisa Director"
    }
  ]
}
```

---

## Complete Employee Management Examples

### Get Employee Details with Sensitive Information

```javascript
// Get complete employee profile with sensitive data
const employee = await getEmployee(614517, {
  special: ["BankAccount", "BirthDate", "Ssn"]
});

console.log(`Employee: ${employee.data.firstName} ${employee.data.lastName}`);
console.log(`Job Title: ${employee.data.jobTitle}`);
console.log(`Departments: ${employee.data.departments.join(', ')}`);
console.log(`Skills: ${employee.data.skillIds.join(', ')}`);

// Process custom fields
Object.keys(employee.data).forEach(key => {
  if (key.startsWith('custom_')) {
    const customField = employee.data[key];
    console.log(`${customField.name}: ${customField.value}`);
  }
});
```

### Employee Deactivation Workflow

```javascript
// Immediate deactivation
async function terminateEmployeeImmediately(employeeId, reason) {
  await deactivateEmployee(employeeId, {
    date: null, // Immediate deactivation
    reason: reason,
    keepShifts: false // Remove from future shifts
  });
  
  console.log(`Employee ${employeeId} terminated immediately`);
}

// Scheduled deactivation
async function scheduleEmployeeDeactivation(employeeId, lastWorkDate, reason) {
  await deactivateEmployee(employeeId, {
    date: lastWorkDate,
    reason: reason,
    keepShifts: true // Keep shifts until deactivation date
  });
  
  console.log(`Employee ${employeeId} scheduled for deactivation on ${lastWorkDate}`);
}

// Examples
await terminateEmployeeImmediately(614517, "Policy violation");
await scheduleEmployeeDeactivation(614518, "2025-07-15", "End of contract");
```

### Supervisor Management

```javascript
// Get all supervisors and their information
const supervisors = await getSupervisors({ limit: 50 });

console.log(`Found ${supervisors.paging.total} supervisors`);

// Create supervisor lookup map
const supervisorMap = {};
supervisors.data.forEach(supervisor => {
  supervisorMap[supervisor.id] = supervisor.name;
});

// Get employee and show supervisor relationship
const employee = await getEmployee(614517);
if (employee.data.supervisorEmployeeId) {
  const supervisorName = supervisorMap[employee.data.supervisorEmployeeId];
  console.log(`${employee.data.firstName} reports to: ${supervisorName}`);
}
```

### Complete Employee Profile Management

```javascript
// Complete employee management workflow
class EmployeeManager {
  async getCompleteProfile(employeeId) {
    return await getEmployee(employeeId, {
      special: ["BankAccount", "BirthDate", "Ssn"]
    });
  }
  
  async updateEmployeeRole(employeeId, roleData) {
    const { jobTitle, departments, skillIds, supervisorId, employeeTypeId } = roleData;
    
    await updateEmployee(employeeId, {
      jobTitle,
      departments,
      skillIds,
      supervisorId,
      employeeTypeId
    });
    
    console.log(`Employee ${employeeId} role updated`);
  }
  
  async transferEmployee(employeeId, newDepartmentId, newSupervisorId) {
    const employee = await this.getCompleteProfile(employeeId);
    
    await updateEmployee(employeeId, {
      departments: [newDepartmentId],
      primaryDepartmentId: newDepartmentId,
      supervisorId: newSupervisorId
    });
    
    console.log(`Employee ${employeeId} transferred to department ${newDepartmentId}`);
  }
  
  async processResignation(employeeId, lastWorkDate, reason) {
    await deactivateEmployee(employeeId, {
      date: lastWorkDate,
      reason: reason,
      keepShifts: false
    });
    
    console.log(`Employee ${employeeId} resignation processed for ${lastWorkDate}`);
  }
  
  async rehireEmployee(employeeId, departments) {
    await reactivateEmployee(employeeId, {
      comment: "Employee rehired",
      departments: departments
    });
    
    console.log(`Employee ${employeeId} successfully rehired`);
  }
}

// Usage example
const empManager = new EmployeeManager();

// Get complete employee profile
const profile = await empManager.getCompleteProfile(614517);

// Update role
await empManager.updateEmployeeRole(614517, {
  jobTitle: "Senior Bartender",
  departments: [6324, 4967],
  skillIds: [1, 2, 3, 4],
  supervisorId: 451874,
  employeeTypeId: 71287
});

// Process transfer
await empManager.transferEmployee(614517, 6324, 451875);

// Process resignation
await empManager.processResignation(614517, "2025-08-15", "Relocation to another city");
```

### Employee Reporting and Analytics

```javascript
// Generate comprehensive employee report
async function generateEmployeeReport() {
  // Get all active employees
  const employees = await getAllEmployees();
  
  // Get supervisors for reporting structure
  const supervisors = await getSupervisors({ limit: 50 });
  const supervisorMap = supervisors.data.reduce((map, sup) => {
    map[sup.id] = sup.name;
    return map;
  }, {});
  
  // Analyze employee data
  const report = {
    totalEmployees: employees.length,
    byJobTitle: {},
    byDepartment: {},
    bySupervisor: {},
    averageTenure: 0,
    customFieldAnalysis: {}
  };
  
  const now = new Date();
  let totalTenureDays = 0;
  
  employees.forEach(emp => {
    // Group by job title
    const title = emp.jobTitle || 'No Title';
    report.byJobTitle[title] = (report.byJobTitle[title] || 0) + 1;
    
    // Group by primary department
    if (emp.primaryDepartmentId) {
      report.byDepartment[emp.primaryDepartmentId] = 
        (report.byDepartment[emp.primaryDepartmentId] || 0) + 1;
    }
    
    // Group by supervisor
    if (emp.supervisorEmployeeId) {
      const supervisorName = supervisorMap[emp.supervisorEmployeeId] || 'Unknown';
      report.bySupervisor[supervisorName] = 
        (report.bySupervisor[supervisorName] || 0) + 1;
    }
    
    // Calculate tenure
    const hiredDate = new Date(emp.hiredFrom || emp.dateTimeCreated);
    const tenureDays = (now - hiredDate) / (1000 * 60 * 60 * 24);
    totalTenureDays += tenureDays;
    
    // Analyze custom fields
    Object.keys(emp).forEach(key => {
      if (key.startsWith('custom_')) {
        const customField = emp[key];
        if (!report.customFieldAnalysis[customField.name]) {
          report.customFieldAnalysis[customField.name] = {
            type: customField.type,
            values: []
          };
        }
        report.customFieldAnalysis[customField.name].values.push(customField.value);
      }
    });
  });
  
  report.averageTenure = Math.round(totalTenureDays / employees.length);
  
  return report;
}

// Generate and display report
const employeeReport = await generateEmployeeReport();
console.log('Employee Analytics Report:', employeeReport);
```

---

## Complete Employee API Summary

The Employee API provides comprehensive workforce management capabilities:

### **Core Operations**
1. **Create** - Add new employees with complete profiles
2. **Read** - List active/deactivated employees and get individual details  
3. **Update** - Modify employee information and roles
4. **Deactivate** - Terminate employee access with options
5. **Reactivate** - Restore deactivated employees

### **Advanced Features**
- **Field Definitions** - Dynamic schema discovery
- **Supervisor Management** - Hierarchical relationships
- **Custom Fields** - Portal-specific data handling
- **Sensitive Data** - Secure handling of private information
- **Bulk Operations** - Efficient multi-employee processing

### **Integration Support**
- **Search Capabilities** - Find employees by multiple criteria
- **Pagination** - Handle large employee datasets
- **Validation Control** - Flexible update requirements
- **International Support** - Country codes and formatting
- **Audit Trails** - Track changes and deactivations

---

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Success - Request completed successfully |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Application isn't assigned to the appropriate scope |
| 429 | Too Many Requests - Rate limit exceeded |

## Rate Limits

- **Per Portal**: 20 requests/second, 750 requests/minute
- **Per Client ID**: 100 requests/second, 2000 requests/minute

---

## Usage Examples

### Get Recently Deactivated Employees

```javascript
// Get employees deactivated in the last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const recentlyDeactivated = await getDeactivatedEmployees({
  deactivatedFrom: thirtyDaysAgo.toISOString(),
  limit: 50,
  offset: 0
});

console.log(`Found ${recentlyDeactivated.paging.total} recently deactivated employees`);
```

### Search Deactivated Employees

```javascript
// Search for specific deactivated employees
const searchResults = await getDeactivatedEmployees({
  searchQuery: "john smith",
  special: ["BirthDate", "BankAccount"],
  limit: 20
});

searchResults.data.forEach(employee => {
  console.log(`${employee.firstName} ${employee.lastName} - Deactivated: ${employee.dateTimeDeleted}`);
});
```

### Get Deactivated Employees with Sensitive Data

```javascript
// Get deactivated employees with all sensitive information
const sensitiveData = await getDeactivatedEmployees({
  special: ["BankAccount", "BirthDate", "Ssn"],
  limit: 50
});

// Process employees with complete information
sensitiveData.data.forEach(employee => {
  console.log(`Employee: ${employee.firstName} ${employee.lastName}`);
  if (employee.bankAccount) {
    console.log(`Bank Account: ${employee.bankAccount}`);
  }
  if (employee.birthDate) {
    console.log(`Birth Date: ${employee.birthDate}`);
  }
});
```

### Pagination Through All Deactivated Employees

```javascript
// Get all deactivated employees with pagination
let allDeactivated = [];
let offset = 0;
const limit = 50;

do {
  const response = await getDeactivatedEmployees({ limit, offset });
  allDeactivated.push(...response.data);
  offset += limit;
} while (offset < response.paging.total);

console.log(`Retrieved ${allDeactivated.length} total deactivated employees`);
```

---

## Common Use Cases

### HR Administration
Deactivated employee management for:
- **Exit Processing**: Track employees who have left the organization
- **Compliance Records**: Maintain historical employee records for regulatory requirements
- **Rehire Analysis**: Identify former employees for potential rehiring
- **Data Archival**: Manage inactive employee data retention

### Reporting and Analytics
Use deactivated employee data for:
- **Turnover Analysis**: Calculate employee turnover rates and patterns
- **Exit Trends**: Analyze when and why employees leave
- **Department Analysis**: Track turnover by department or role
- **Historical Reporting**: Generate reports on past employee data

### Data Management
Handle deactivated employees for:
- **Data Cleanup**: Regular review and archival of inactive records
- **Privacy Compliance**: Manage data retention and deletion policies
- **System Maintenance**: Keep active employee lists current
- **Audit Trails**: Maintain records for compliance and legal requirements

---

## Integration Notes

- **Deactivation vs. Deletion**: Deactivated employees are soft-deleted and remain in the system
- **Historical Data**: Deactivated employees maintain their historical scheduling and payroll data
- **Search Functionality**: Full-text search across multiple employee fields
- **Sensitive Data**: Bank account, birth date, and SSN require explicit inclusion
- **Department/Group Associations**: Maintain organizational relationships even when deactivated
- **International Support**: Country codes and phone prefixes for global organizations

## Related Endpoints

- **Active Employees API**: Manage currently active employees
- **Departments API**: Manage department associations
- **Employee Groups API**: Manage employee group memberships
- **Employee Types API**: Manage employee type classifications

---

## Best Practices

### Data Privacy
- Only request sensitive fields when absolutely necessary
- Implement proper access controls for sensitive employee data
- Follow data retention policies for deactivated employees
- Consider GDPR and other privacy regulations

### Search and Filtering
- Use specific date ranges to improve query performance
- Combine search queries with filters for more targeted results
- Consider pagination for large datasets
- Cache frequently accessed deactivated employee lists

### Performance Optimization
- Use appropriate page sizes (maximum 50 records per request)
- Implement date-based filtering to reduce dataset size
- Consider caching for frequently accessed data
- Use search queries to find specific employees quickly

### Compliance and Auditing
- Maintain audit trails for deactivated employee access
- Regular review of deactivated employee data
- Implement data retention policies
- Document reasons for accessing historical employee data