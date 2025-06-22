---
name: Point of Sale (POS) integrations
menu: Guides
route: /guides/pos-guide
---
# Point of Sale (POS) integrations

One of the main integration use cases is to send total daily revenue into Planday, which enable managers to compare labour costs with the imported revenue. In Planday we automatically calculate the payroll percentage (labour cost vs. revenue) based on these numbers and this can be compared to a defined budget set in Planday.

Revenue is linked to revenue units in Planday. Every revenue unit is capable of storing one revenue record per day and is tied to a Planday department. There can be multiple revenue units in a department, reflecting where the revenue was generated. Revenue units can be managed by users inside Planday or via our [API](https://openapi.planday.com/api/revenue#tag/RevenueUnit). Learn more about revenue and revenue units in our [Help Centre article](https://help.planday.com/en/articles/3807690-revenue-in-planday).
A typical example of how revenue units are used and structured can be described with the example below.

#### Example

Business X has two restaurants and in each restaurant they generate revenue in the bar and in the restaurant. This could look like following:

Business X has one Planday portal:

* Department A (Restaurant 1)
    * Revenue unit 1A (Restaurant 1 - Bar)
    * Revenue unit 2A (Restaurant 1 - Restaurant)
* Department B (Restaurant 2)
    *   Revenue unit 1B (Restaurant 2 - Bar)
    *   Revenue unit 2B (Restaurant 2 - Restaurant)


### Entity mapping

First, you will need to allow users to map entities in your system with Planday departments and revenue units. 

For instance, if your POS system is based on sales areas with registers, you should allow users to map sales areas to departments. Subsequently, users should have the option to map registers to existing revenue units or create a new one corresponding to a chosen register.
* sales areas in the example could be equivalent to shop floors, outlets or shops in your system
* registers could represent POS devices or cash desks

Users have the option to view detailed Revenue reports in Planday or see a breakdown of daily revenue values for each unit in Schedule, therefore it is recommended that POS devices in the 3rd party system are mapped to individual units instead of cummulating revenue from several devices into one revenue unit.

### Adding revenue

Once mappings have been set up, you can use the `POST /revenue/v{version}/revenueunits` [endpoint](https://openapi.planday.com/api/revenue#tag/Revenue/paths/~1revenue~1v%7Bversion%7D~1revenue/post) to set the daily revenue values for individual units in Planday.
Here you have to specify the value, the revenue unit ID, date and optionally a comment. We recommend to include a comment similar to "Imported from {your system name} on {dateTime of import}".

You can use the same endpoint to update revenue if you wish to import revenue for the same day later again.

It is only possible to import revenue on a "business day" in Schedule. In practice, this means that there must be at least one shift on the given day. If no shifts are scheduled for a day, Planday Schedule won't allow you to import revenue and the POST Revenue endpoint will return 409 and an error message "No opening day on date: {date} in department: {departmentID}". In that case, import for that day should be skipped.

### Exclude tax from revenue data

You need to consider whether the revenue should be including or excluding tax, or make a toggle so the client can decide themselves. 

You may also consider if there are any other sales data that should be excluded e.g. service charges, gift cards, charity fees, tips.

### Import frequency

It is up to you to decide how often you will update the revenue. You need to be aware that we only store one value for daily revenue, so for days back in time you can only set one value. If revenue of past days in your system is likely to change due to, for instance, payment processing times, you should consider importing revenue for several past days every day to ensure that previously imported values get corrected.

