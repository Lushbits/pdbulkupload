exports.handler = async (event, context) => {
  // Allow GET and POST requests
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Planday-Endpoint',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Planday-Endpoint',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Expose-Headers': 'X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Limit'
      },
      body: ''
    };
  }

  try {
    // Extract Planday endpoint from custom header
    const plandayEndpoint = event.headers['x-planday-endpoint'];
    if (!plandayEndpoint) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing X-Planday-Endpoint header' })
      };
    }

    // Build full Planday API URL
    const baseUrl = 'https://openapi.planday.com';
    const fullUrl = `${baseUrl}${plandayEndpoint}`;

    // Forward request to Planday API
    const response = await fetch(fullUrl, {
      method: event.httpMethod,
      headers: {
        'Authorization': event.headers.authorization,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: event.httpMethod !== 'GET' ? event.body : undefined
    });

    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      jsonData = { message: data };
    }

    // Extract rate limit headers from Planday response
    const rateLimitHeaders = {};
    
    // Try different header name variations
    const headerVariations = [
      ['x-ratelimit-remaining', 'X-RateLimit-Remaining'],
      ['x-ratelimit-reset', 'X-RateLimit-Reset'], 
      ['x-ratelimit-limit', 'X-RateLimit-Limit']
    ];

    headerVariations.forEach(([original, exposed]) => {
      const value = response.headers.get(original);
      if (value) {
        rateLimitHeaders[exposed] = value;
      }
    });

    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Access-Control-Expose-Headers': 'X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Limit',
        ...rateLimitHeaders
      },
      body: JSON.stringify(jsonData)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
}; 