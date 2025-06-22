---
name: Rate limiting
menu: Getting started
route: /gettingstarted/rate-limiting
---

# Rate limits for API

In order to ensure our API remains available for all customers and to prevent abuse, denial-of-service and other unintended issues, our API is subject to a rate limit:

| Limit bucket              | Per portal request limit                  | Per client-id request limit                       |
|---------------------------|-------------------------------------------|---------------------------------------------------|
| Per second                | 20 per portal-id                          | 100 per client-id                                 |
| Per minute                | 750 per portal-id                         | 2000 per client-id                                |


Exceeding the rate limit will result in a `429` response from our API and you should not attempt to retry until after the rate limit counter resets.

**A request will always contain one client id and portal and will always increase the counter for both.**

## Viewing the status of the rate limit

You can inspect the following HTTP headers of each response to determine the current status of your rate limit.

| HTTP header               | Description                                                                                   |
|---------------------------|-----------------------------------------------------------------------------------------------|
| `x-ratelimit-reset`       | Remaining seconds before the counter resets in the current window (per second or per minute)  |
| `x-ratelimit-remaining`   | The number of remaining allowed requests in the current window (per second or per minute)     |
| `x-ratelimit-limit`       | The current limit with quotas for both rate limit per second and per minute                   |

### Examples

1) The client id used to send the request has not been rate limited. The request felt into the "100 requests per second per client id" bucket:

```
$ curl -v 'https://openapi.planday.com/hr/v1/Departments' -H "Authorization: Bearer $token"
...
< HTTP/2 200
...
< x-ratelimit-limit: 100, 20;w=1, 750;w=60, 100;w=1, 2000;w=60
< x-ratelimit-remaining: 99
< x-ratelimit-reset: 1
...
```

How to decode the `x-ratelimit-limit: 100, 20;w=1, 750;w=60, 100;w=1, 2000;w=60` header ?

Since the rate limiting policy specifies more then one time window (limit buckets), the values above represent the window that is closest to reaching its limit.

- `100,` indicates the request-quota associated to the client in the current time-window 
- `20;w=1, 750;w=60, 100;w=1, 2000;w=60` is the description of the quota policy: 
    - The given portal is allowed 10 requests per second (`10;w=1`)
    - The given portal is allowed 750 requests per minute (`750;w=60`)
    - The given client id is allowed 100 requests per second (`100;w=1`)
    - The given client id is allowed 2000 requests per minute (`2000;w=60`)

The client id is then allowed 99 more requests in the current time window (`x-ratelimit-remaining`) and it will be reset after 1 second (`x-ratelimit-reset`).

---

2) The client id used to send the request has been rate limited. The request felt into the "2000 requests per minute per client id" bucket:

```
$ curl -v 'https://openapi.planday.com/hr/v1/Departments' -H "Authorization: Bearer $token"
...
< HTTP/2 429
...
< x-ratelimit-limit: 2000, 20;w=1, 750;w=60, 100;w=1, 2000;w=60
< x-ratelimit-remaining: 0
< x-ratelimit-reset: 33
...
```

The HTTP response code is `429` which indicate the request has been rate limited and the counter will be reset in 33 seconds.
