---
name: Planday structure
menu: Guides
route: /guides/planday-structure
---

# Planday Structure

In Planday, you access a Portal where your business is structured into Departments, Employee groups, Sections, Positions, Shifts, and Shift types. 

![Structure of Planday](./images/Structure_of_Planday.png "Structure of Planday")

* **Department: **A place of work. This is generally the physical location of your business. Departments are optional, but if a portal uses departments every shift is connected to one department.
* **Employee group: **What an employee works as (e.g. a function or role). Employee group is required and every shift is connected to one employee group.
* **Section:** A label for a selection of Positions. Sections allow you to easily view all Positions under a particular Section label.
* **Position: **A label that explains more about what an employee will be responsible for during their shift (e.g. Waiter tables 1-5).
* **Shift: **When an employee is scheduled to work. 
* **Shift type: **A label for abnormal shifts (e.g. sick, training, off-site meeting).
* **Networks and master portals** Though the highest entity in Planday is a Portal, some of our larger customers have their portals structured in a network. A network is a link between a master portal and multiple sub portals. Administrators on the master portal will have easy access to specific areas of the sub portals, which makes it easier to manage operations from a central hub.

*Note: Please be aware that employeeIds are only unique within portals. You can create a combination of portalId and employeeId to ensure a unique identifier for the users across portals.*
