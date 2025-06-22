---
name: Employee management integrations
menu: Guides
route: /guides/hr-guide
---

# Employee management integrations

Managing employees across Planday and other systems is a key use case and linked to a variety of systems like HR, payroll, communication and e-learning.

Use the basic actions to create, read or update (and deactivate) employees.
The GET employees endpoint is a list endpoint that returns all active employees with basic data. The GET employees by ID endpoint returns more detailed information about the employees - including custom fields.

### Special fields

Some employee fields require some extra attention. We call these special fields. To manage the special fields for both read, create and update actions you have to add the dedicated scopes to you API application as well as including the fields in the URL as path parameters. 

Special fields:

* Ssn (Social security number)
* BankAccount
* BirthDate

### Custom fields

In Planday, managers can create new employee fields if they want something specific to be shown for each employee. These fields are what we call custom fields.

Custom fields are created with a certain type that gives information about the data which can be inputted into the field. The supported types are:

* in text form
* in numeric form
* as an enabled or disabled state
* as a calendar date
* as an uploaded picture 

Employee custom fields are returned in the GET employee by Id endpoint.

#### Create or update custom field values on an employee

You can also specify a custom field value when creating or updating an employee. For this you will need to follow the steps below:


1. Query the GET Employee field definitions endpoint to get a list of all the possible custom fields on the specific portal. All custom fields is listed as `“custom_xxxx”` in the properties collection, where “xxxx” is a number.

![Get employee](./images/getemployee.png "Get employee")
2. When creating/updating an employee, use the custom field id (`"custom_xxxx"`) as key of the field you want to update.

![Create update employee](./images/createemployee.png "Create update employee")
Below you’ll find an example of the request to create or update an employee, including custom fields.

```
{
 "firstName": "First",
 "lastName": "Last",
 "userName": "User123",
 "cellPhone": "1234567",
 "street1": "Example",
 "zip": "12332",
 "city": "ExampleCity",
 "phone": "23213232",
 "gender": "Female",
 "email": "x-planday123123@planday.com",
 "departments": [147991],
 "employeeGroups": [266955],
 "custom_146688": true,
 "custom_164605": 5
}
```

### Updating employees’ pay rates and contract rules

#### Pay rates and salaries

You can add pay rates and salaries to employees in Planday by using the Pay API (Please note that rates are linked to employee groups in Planday). The API also supports other related functionality like read rate history for an employee, read and update monthly salaries and allocation of the cost in schedule.
Use the `PUT /pay/v{version}/payrates/employeeGroups/{employeeGroupId} `to specify an employee’s pay rate in a given employee group or the `PUT /pay/v{version}/salaries/employees/{employeeId}` to specify a salaried employee’s salary.

#### Salary codes
When managing the rates and salaries, you should also consider to handle the salary codes, which are used to identify pay items for payroll, in your requests. If the salary codes are added by managers inside Planday, you should start your update operations by fetching the existing values and use them when making the update request.

#### Contracted hours

The Contract Rules API makes it possible to read the contract rules created in Planday and assign them to employees. A contract rule defines an employee’s contracted hours per week, month or year. The intervals are set up in Planday settings. Use the `PUT /contractrules/v{version}/employees/{employeeId}` to update an employee with a given contract rule.
