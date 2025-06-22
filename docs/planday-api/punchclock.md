---
name: Time clock integrations
menu: Guides
route: /guides/timeclock-guide
---
# Time clock integrations

Punch Clock is Planday’s time clock feature that supports keeping track of employees' punctuality as well as approving hours for payroll. For a quick intro you can have a look at our [Setup Punch Clock](https://help.planday.com/en/articles/3704338-setup-punch-clock) Help Centre article.

Use the APIs to read Punch Clock data or create new Punch Clock entries on an employees’ shift in Planday. Suggested scopes for integrating with the Punch Clock are:

* Department read
* Employee read
* Shifts read
* Punch Clock read/create

### Get Punch Clock records

The `GET /punchclock/v{version}/punchclockshifts` endpoint returns all the Punch Clock records for a specified period.
On the record you will see the Punch Clock entry’s start and end time as well as the shift’s start and end time.

In Planday, you can approve Punch Clock entries, and also set up rounding rules that will trigger changes to the shift’s start and end time at the time of approval. In this respect, you might want to check if the Punch Clock entry is approved in the `isApproved` property. 
The records include a `punchClockShiftId`, which you will have to use to find the breaks from Punch Clock (see below).

You can also use the `shiftId` to call the `GET /scheduling/v{version}/shifts` endpoint, if you need more information about the shift to which the Punch Clock entry is related.

#### Get Punch Clock break records


To get the records for breaks from the Punch Clock you can use the `GET /punchclock/v{version}/punchclockshifts/{punchClockShiftId}/breaks` endpoint.

To make this query you need to specify the `punchClockShiftId` from the Punch Clock entry.

#### Breaks not related to Punch Clock


Please be aware that this is only for breaks from the Punch Clock. To find details about the manual breaks or breaks from break rules you have to use the Payroll API. 


### Add Punch Clock entries

There are two paths for creating Punch Clock entries through the API. Regardless of your selected approach, it is possible to specify the start time and end time, or leave it blank. If blank, the endpoint will use the time of the request.

#### Employee punch in  / out


With the employee punch in / out endpoints you only need to specify the `employeeId` in your API calls and therefore you don’t have to query other endpoints to find the `shiftId` of the shift which the employee should punch in on. Please note that if an employee has more than one upcoming shift on the given day, the endpoint will return an error. The error will include the `shiftId` of the shifts the employee is assigned to, which makes it possible for you to display the shifts and let the user select which shift to add the Punch Clock entry to.

* **Employee punch in** : 
Use `POST /punchclock/v{version}/punchclockshifts/employee/{employeeId}/punchin` to punch in with a specified employeeId to create a Punch Clock entry with a specified employeeId. In other words, this endpoint allows you to clock in an employee on their only upcoming or ongoing shift on a given day. The entry is created at the time of the request (if `startDateTime` is not included) on the upcoming or ongoing shift for this employee. If the employee is assigned to more than one upcoming shift on a given date, `shiftId` needs to be specified. If successful, the response will include the `PunchClockShiftId`.

* **Employee punch out**
Use `PUT /punchclock/v{version}/punchclockshifts/employee/{employeeId}/punchout` to punch out with a specified employeeId to update an existing Punch Clock entry, i.e. a Punch Clock entry that has a `startDateTime`. In other words, this enables you to clock out an employee at the end of their ongoing shift. The entry is updated at time the of the request (if `endDateTime` is not included).

#### Create a punch-in/out entry


 These endpoints require you to specify shift details to ensure the Punch Clock records are registered on the right shift, regardless of the number of shifts the employee is assigned to on the given date. 

* **Create a Punch-In entry** : The `POST /punchclock/v{version}/punchclockshifts` endpoint requires first fetching the available shifts for an employee to punch in on. Do this by calling the `GET /punchclock/v{version}/employeeshifts/today` endpoint to fetch today’s shifts for an employee. You can also use the `GET /scheduling/v{version}/shifts` endpoint in the Scheduling API, which supports more query parameters to find the right shift.
When you have created a Punch Clock entry, it returns a `punchClockShiftId`, which you’ll need for punching out.

* **Create a Punch-Out entry** : To add a punch out entry you have to use the `PUT /punchclock/v{version}/punchclockshifts` and include the `punchClockShiftId` from the punch in entry.
