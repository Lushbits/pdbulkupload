---
name: Time and Cost integrations
menu: Guides
route: /guides/timeandcost-guide
---

# Time and Cost integrations

Use the Planday Time and Cost API to fetch the schedule time and cost data in a specified department and time period. To use the endpoint you’ll need to provide the `departmentId`, and the boundaries of the time period (`from` and `to`), as described in the [documentation](https://openapi.planday.com/api/schedule). Usually, time and cost data is related to a shift, but if there is no `shiftId` in the response of your request, it can be because the data is related to a supplement.

### How is the time and cost calculated?

The data returned by the Time And Cost endpoint is a list of all shifts (except open shifts) from a given department and time period, along with their time and cost.
Below is an example to explain how the data is calculated.

Suppose we have the department called *Main shop* which has three employees assigned: Alice, Bob and Carl. They are all assigned to the same employee group: *cashier*, and have the same salary: 10$ per hour. The break settings are defined as follows: every normal shift which is longer than 6 hours, has an automatically assigned lunch break which lasts for half an hour, and is paid. All other breaks are unpaid. Additionally, there is a *late hours supplement* defined, and each hour worked after 6 pm is paid 50% more than standard wage.
Having defined the department settings, let's create a sample schedule for the 1st and 2nd of April, where the information for each shift means: “[start time - end time], [Shift type], [break]”

|Employee	|1.04	|2.04	|
|---	|---	|---	|
|Alice	|6am - 2pm, Normal shift, no breaks	|2pm - 10pm, Normal shift, break 7pm - 8pm	|
|Bob	|8am - 4pm, Sick - paid 75%	|8am - 4pm, Sick - paid 75%	|
|Carl	|8am - 4pm, Unpaid Vacation	|8am - 4pm, Unpaid Vacation	|

Now let's investigate what data the Time And Cost endpoint will return if we set the `departmentId` to *Main shop*'s id, and the time period to 1.04 to 2.04. First, normal shifts and shifts with the shift type setting "count hours in payroll report" enabled are included in the response. This is because there might be some shifts in the schedule that should not be included in the cost calculation and the client can configure this in Planday in shift type settings (Settings > Schedule > Shift types).
Let's assume that in our case, *Normal shift* and *Sick - paid 50%* types have the setting enabled, and the *Unpaid vacation* has it disabled. Therefore, the response will include all of Alice's and Bob's shifts - 4 entries in total.

```
`{
  "data": {
    "costs": [
      {
        "shiftId": 1,
        "duration": "0:07:30",
        "cost": 80,
        "employeeId": 1,
        "date": "2019-04-01"
      },
      {
        "shiftId": 2,
        "duration": "0:06:30",
        "cost": 85,
        "employeeId": 1,
        "date": "2019-04-02"
      },
      {
        "shiftId": 3,
        "duration": "0:08:00",
        "cost": 60,
        "employeeId": 2,
        "date": "2019-04-01"
      },
      {
        "shiftId": 4,
        "duration": "0:08:00",
        "cost": 60,
        "employeeId": 2,
        "date": "2019-04-02"
      }
    ],
    "currencySymbol": "$",
    "currencyFormatString": "{0}{1}"
  }
}`
```

* Alice's first shift's `duration` is equal to **7,5 hours**. That's because the shift lasts for 8 hours, but has the 30 minutes lunch break automatically included.
* Alice's second shift's `duration` equals **6,5 hours** - it's the same as in the first case, but with an additional unpaid one-hour of break.
* Alice's first shift's `cost` is equal to **80$** due to 7,5 hours of work plus 0,5 hour of paid lunch break multiplied by 10$ hourly wage.
* Alice's second shift's `cost` equals **85$**. Because of the *late hours supplement*, the wage of the 3 hours worked after 6pm equals 15$, while the wage of the first 4 hours stil equals 10$. That yields 4 times 10$ plus 3 times 15$ = 85$.
* The `duration` of both of Bob's shifts are the same, and equal to **8 hours** as there is no lunch break added to this shift type.
* The `cost` of both of Bob's shifts are also the same, and equal to **60$** because of the 75% wage rate associated with this shift type.

It's worth noting that:

* Only normal and manual supplements will be included in the response. Daily and weekly supplements are not supported in the Time and Cost endpoint.
* Additional payroll costs set in Settings > Reports > Revenue will be included in the response

### Combining Time and Cost with other API's

The Time and Cost endpoint provides cost data, which can be used to create miscellaneous reports and statistics. As every entry from the Time and Cost endpoint response contains `shiftId` and `employeeId`, it's possible to query the [HR API](https://openapi.planday.com/api/hr) and [Scheduling API](https://openapi.planday.com/api/schedule){:target="_blank"} to create a variety of useful reports. Let's look at some examples of using Time And Cost endpoint with other API's

* Use with **GET Employees** endpoint and display a report containing employees' work time and cost.
* Use with **GET Shifts** and **GET PunchClockShifts** and display a comparison of employees' scheduled worktime and actual worktime.
* Use with **GET Shifts** and **GET ShiftTypes** and display statistics of different Shift Types' time and cost.
* Use with **GET Shifts** and **GET Positions** and display statistics of different positions' time and cost.

