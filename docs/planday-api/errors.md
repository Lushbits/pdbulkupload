---
name: Errors
menu: Guides
route: /guides/errors
---

# Errors

Learn more about the error codes of the API and how you can handle them. 


|Http code	|Sample message	|Error explanation	|
|---	|---	|---	|
|400	|Employee id is invalid	|The employeeId does not exist or the user is no longer active. Please verify the specified user.	|
|401	|Unauthorized	|The app credentials are not sufficient. Please ensure to exchange the refresh token with and Access token or verify that the user who authorised the application is active.	|
|403	|Your application isn't assigned to the appropriate scope, so it can't perform this action	|Please verify that your application has the right scopes in order to make this request.	|
|404	|Employee with given id doesn't exist	|This user does not exist. Please verify employeeId and try again.	|
|409	|Conflict	|A validation error occurred in your request data.	|
|429	|Too many requests	|You’ve passed the rate limit for the allowed number of API requests.	|
|500	|Server error	|Internal server error - Please inform our API support team	|










