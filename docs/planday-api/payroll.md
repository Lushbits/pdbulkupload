---
name: Payroll integrations
menu: Guides
route: /guides/payroll-guide
---
# Payroll integrations

Build a top of the shelf payroll integration to Planday that supports employee sync and importing payroll and absence data from Planday. 

This guide outlines our recommended approach to integrating Planday and a payroll system. A Planday payroll integration may include synchronisation of user data, export of a period’s payroll data as well as absence data from Planday to a payroll system. 

At Planday we and our partners, have already created some successful integrations to payroll systems, and based on that we’ll share some suggestions to the different features you may want to include in your integration between Planday and your payroll system. 

### Employee synchronisation

As part of a payroll integration you may want to help streamline the user creation flow, by creating new users in Planday when added to the payroll system, and vice versa, or automatically update the values of employees’ fields, like bank account information or contact information, to ensure accuracy and alignment between the two systems. To read more about how to manage employee across Planday and other systems, please check out our guide to [employee management integrations](./hr-guide)). We suggest you get aquainted with the HR API for regular data fields as well as the Pay API for managing employees’ pay rates and monthly salaries. 

### Use salary codes to identify payroll items

In Planday Admins can set salary codes for each type of payroll item. This normally corresponds to the salary codes in the payroll system. If correctly set up in the Planday portal, every payroll item in the response object in the Payroll API will have a Salary Code, which you will find in the property `salaryCode`.

As a basic example, worked hours may have a separate Salary Code, and overtime hours may have another one. 
In a more advanced case, a business may have a Salary Code per Employee Group which correspond to different pay rate in the payroll system, one Salary Code per shift type which corresponds to absence codes as well as a Salary Code on payroll supplements triggered by shifts that take place during night hours.

### Mapping of employees

You may want to allow the Admin user to do an employee mapping to make sure that employees are matched to the correct employees across the systems, and this could be achieved by matching for example e-mail addresses and first and last name of the employees.

In quite a few cases employees may have a unique number in the payroll system, which is visible to the Admin who does the payroll and is usually aligned with the standard text field on the Employee Edit Form in Planday, called Salary Identifier. If you or your customer already uses Salary Identifiers across Planday which match those in the payroll system and they are familiar with this as a way to identify their payees, it may be a good idea to display this number during employee mapping to aid the person doing the mapping. But bear in mind that the `salaryIdentifier` property should not be mixed up with `employeeId`.

### Get payroll data

To build an integration that transfers payroll data related to a payroll period from Planday to a payroll system, we recommend you to use our `GET /payroll/v{version}/payroll` endpoint in the Planday Payroll API. This single endpoint includes all payroll data in the portal for one or multiple Departments for a specified date range. There are a few different approaches you may wish to take. You may, for instance, wish to give the user of your integration a UI to manually execute the data synchronisation, or to let them configure a fixed schedule for payruns by allowing them to set up monthly or weekly intervals for when your integration calls the Planday API to get payroll data. We’ve tried to summarise and explain the various objects you’ll find in the response of the `GET /payroll/v{version}/payroll` endpoint in the Planday Payroll API further down.

### Preview of payroll before sync

In Planday, payroll data can be viewed in the Payroll reports, either in our standard PDF, CSV or Excel formats. In addition to fetching the payroll data, and if your integration has a UI, you may want to let the user preview the payroll data in some format before the user triggers the execution of the data sync to your system. 

### Exporting absence

In terms of absence there are two ways to handle absence in Planday, either by using the Vacation and Overtime module or by registering absence as shifts in the schedule using special shift types. If you or your customers need the ability to synchronise remaining vacation days or hours on their vacation accounts or lieu overtime balances on their overtime accounts, handle vacation requests and approvals as well as read or post transactions to vacation or overtime accounts, we recommend to explore the Absence API documentation. If you or your customer solely use shifts with specific shift types with a Salary Code per absence type to register absence, you will find everything you need if you carry on reading.

## The Planday Payroll API response explained

The Payroll API output reflects the output of the Planday which generates the standard Planday payroll reports. This means that pay data for each employeeId for the specified date range is readily calculated in the same way as it is in the payroll exports. 
Payroll objects may have up to one Salary Code (and in some cases up to one Salary Code 2, which is an optional and rarely used feature in Planday), and this final Salary Code determines which type of payroll item the object should be identified as in the payroll system. Also, in most cases Planday Admins will make sure they approve all shifts in the Schedule before they send off the data to payroll, so if your integration will respect this you should use the optional parameter `shiftStaus = Approved`.

There are three categories of payroll items in Planday, payroll items that are related to shifts, payroll items that are related to calendar months and payroll items that are not related to shifts or months. This is reflected by the three objects in the `GET /payroll/v{version}/payroll` response model:

* `shiftsPayroll`
* `supplementsPayroll`
* `salariedPayroll`


All data returned includes the units, typically hours, as well as any monetary rates. Some integrations to payroll systems transfer only the units, and consider the payroll system’s records as the “source of truth” when it comes to up-to-date pay rates, whereas others transfer all the monetary values already calculated within Planday. There may be different reasons why some customers and some partners may choose one approach over another.


### Shifts Payroll: Payroll items related to shifts

The first object includes all payroll items related to shifts based on the employees’ rates, and it also includes supplements related to the shift. Normally this is the majority of the payroll data for the portal.

#### Employee Pay Rates
Hourly rates and rates per shift are related to an Employee’s relation to an Employee Group. All employees must be related to an Employee Group in order to get shifts assigned, and the rate forms the basis for the calculation of pay on shifts. When an employee is added to an Employee Group the rate field is required, and if left empty it defaults to 0. 
One employee can have different rates in different groups, and different individuals may have different individual rates within the same Employee Group.
The employee’s individual pay rate forms the basis for any calculations of salary, break deductions, payroll supplements and other rate adjustments. 

#### Rate adjustments on Shift Types
Shifts in Planday default to “Normal” shift type. Additional shift types can be defined by Admins, and every shift type can have a defined rate adjustment, either as 

* a monetary value that replaces the employee’s rate
* a monetary value that is added to the employee’s rate
* a percentage of the employee’s rate


#### Payroll supplements
Normal supplements in Planday are related to shifts and get applied to each shift by triggers like a certain shift length exceeded, or when a shift’s duration falls within a defined time range. Any supplements which have been automatically associated with a shift or multiple shifts, will be included in the `shiftsPayroll` object. These supplements can have a rate, which is calculated using the employees’ pay rate related to the Employee Group to which this particular shift belongs, and can either be 

* a fixed monetary value per hour
* a percentage of the hourly rate
* a fixed monetary value per shift (In reality this is the same as the first point, where the duration is 1 hour only)

In Planday, payroll supplements are generally payroll items on top of the worked hours. For example, if an employee’s pay rate is $10, and a 50% payroll supplement is triggered after 9 PM on weekends, their hourly rate after 9 PM will still be $10/hour for the shift, plus a 5$/hour supplement. There are exceptions to this rule, of course.


#### Custom rates on shifts
A little less common, sometimes a custom rate has been set on a single shift. Custom rates on shifts can be defined per hour or per shift by the Admins or the Schedule Managers, and overwrites any rates related to the employee in the given Employee Group.

#### Manual payroll supplements
Manual payroll supplements can be added to single shifts and, while there can be a default rate in the manual supplements’ settings, the rates can also be defined for each instance, i.e per shift. Similarly to normal payroll supplements, these do not alter the employee’s rate, but become an additional payroll item.

### Supplements Payroll: Additional payroll supplements

The `supplementsPayroll` object lists any supplements that are not related to specific shifts. e.g. weekly supplements. There are certain exceptions that apply to these types of supplements. For example, they cannot have any relationship to departments.

### Salaried Payroll: Payroll items related to a calendar month

#### Employees’ Monthly salaries
If any employees have a monthly salariy defined in Planday, these will be included in the salariedPayroll object.
Monthly salary is set up per employee via Planday, and an employee can only have one monthly salary.
We currently don’t support other intervals than calendar months. When setting up the monthly salary, a start date for the salary can be selected. 

In the event that a salaried employee started mid-month, you may wish to use the optional property `returnFullSalaryForMonthlyPaid` (boolean) in the Payroll API in order to decide whether their a full monthly salary should be included, or only the part of the salary for the date range provided in the request.

The salaried object also has a `wage` property, which represents the unit wage for this employee, where unit is referring to the hours per month defined in relation to their monthly salary.

Example:
Contracted hours: 160.5 (per month)
Salary: £3500
Wage: 21.8


#### Relevant settings in Planday

There are some settings in Planday which may be relevant to know about when building an integration between Planday and a payroll system, because they might be able to explain variances between the data in the Payroll API vs. the data from other endpoints, such as in the Schedule API.

* Shift type settings: shift types can have various settings which alter the payroll output, for example some of them will exclude breaks and supplements from getting applied to the shift, and some shift types are totally excluded from the payroll output. 
* Departments: in some cases our customers use department numbers to identify payroll costs generated in different areas of the business. The `GET /hr/v{version}/departments` will include department numbers if the portal has them, which can be used to map payroll data


