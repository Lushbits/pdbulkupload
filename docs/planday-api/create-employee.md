OST Create employee
Create a new employee account based on provided parameters. Additional fields might be required depending on the portal configuration.
Required scope: employee create.
Requires authorization.

Request Body schema: 
application/json
application/json
Employee input model

firstName
required
string non-empty
First name of the employee

lastName
required
string non-empty
Last name of the employee

userName
required
string non-empty
Username of the employee - must be an e-mail

departments
required
Array of integers <int64> [ items <int64 > ]
List of Departments associated with the employee, specified as a list of Department IDs

cellPhone	
string or null
Cell phone number associated with the employee

birthDate	
string or null
Birthdate of the employee

ssn	
string or null
Social security number of the employee

cellPhoneCountryCode	
string or null
Country code of the cell phone number. Follows ISO 3155. alpha-2 codes.

cellPhoneCountryId	
integer or null <int64>
Country code od of the cell phone number

street1	
string or null
Address 1 information of the employee's address

street2	
string or null
Address 2 information of the employee's address

zip	
string or null
Zip code of the employee's address

phone	
string or null
Phone number associated with the employee (not frequently used)

phoneCountryCode	
string or null
Country code of the phone number. Follows ISO 3155. alpha-2 codes.

phoneCountryId	
integer or null <int64>
Country code id of the phone number

city	
string or null
City of the employee's address

email	
string or null
Primary email address of the employee

employeeGroups	
Array of integers or null <int64>
List of Employee Groups associated with the employee, specified as a list of Employee Groups IDs

hiredFrom	
string or null
gender	
string or null
Enum: "Male" "Female"
primaryDepartmentId	
integer or null <int64>
Available only on portals with the field enabled.

jobTitle	
string or null
employeeTypeId	
integer or null <int64>
bankAccount	
object or null
salaryIdentifier	
string or null
isSupervisor	
boolean or null
Setting this to true will create an Employee visible in GET Supervisors

supervisorId	
integer or null <int64>
Supervisor associated with the employee, specified as Supervisor Id

skillIds	
Array of integers or null <int64>
List of Skills associated with the employee, specified as a list of Skill IDs

property name*
additional property
any

POST https://openapi.planday.com/hr/v1.0/employees

{
  "firstName": "string",
  "lastName": "string",
  "userName": "string",
  "departments": [
    0
  ],
  "cellPhone": "string",
  "birthDate": "2025-06-21",
  "ssn": "string",
  "cellPhoneCountryCode": "string",
  "cellPhoneCountryId": 0,
  "street1": "string",
  "street2": "string",
  "zip": "string",
  "phone": "string",
  "phoneCountryCode": "string",
  "phoneCountryId": 0,
  "city": "string",
  "email": "string",
  "employeeGroups": [
    0
  ],
  "hiredFrom": "2025-06-21",
  "gender": "Male",
  "primaryDepartmentId": 0,
  "jobTitle": "string",
  "employeeTypeId": 0,
  "bankAccount": {
    "registrationNumber": "string",
    "accountNumber": "string"
  },
  "salaryIdentifier": "string",
  "isSupervisor": true,
  "supervisorId": 0,
  "skillIds": [
    0
  ],
  "property1": null,
  "property2": null
}

Response samples 200

{
  "data": {
    "id": 614517,
    "hiredFrom": "2016-01-01",
    "deactivationDate": "2025-07-21",
    "salaryIdentifier": "DKF614517",
    "gender": "Female",
    "jobTitle": "Bartender",
    "employeeTypeId": 5322,
    "primaryDepartmentId": 4967,
    "dateTimeCreated": "2016-01-02T16:55:00Z",
    "dateTimeModified": "2016-07-11T13:22:00Z",
    "supervisorEmployeeId": 451874,
    "securityGroups": [
      8673,
      98741
    ],
    "firstName": "Mindy",
    "lastName": "Haynes",
    "userName": "mindy.haynes@test.com",
    "cellPhone": "1212121212",
    "cellPhoneCountryCode": "DK",
    "street1": "Lundsbjergvej 51",
    "street2": "Lundsbjegvej 52",
    "zip": "1924",
    "phone": "2121212121",
    "phoneCountryCode": "DK",
    "city": "Copenhagen",
    "email": "mindy.haynes@test.com",
    "departments": [
      6324,
      4967
    ],
    "employeeGroups": [
      9663,
      8987
    ],
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
    },
    "custom_44444": {
      "name": "Custom Date",
      "type": "Date",
      "value": "2013-05-10T09:37:58",
      "url": "dummyUrl"
    },
    "custom_55555": {
      "name": "Custom Dropdown",
      "type": "Dropdown",
      "value": "Option B",
      "url": "dummyUrl"
    },
    "custom_66666": {
      "name": "Custom Image",
      "type": "Image",
      "value": {},
      "url": "http://hr/v1/employees/614517/customfields/custom_66666/value"
    }
  }
}