exports.handler = async (event) => {

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'Method Not Allowed' } })
    };
  }

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'API key not configured. Please add ANTHROPIC_API_KEY in Netlify environment variables.' } })
    };
  }

  try {
    const requestBody = JSON.parse(event.body);

    // Race between the API call and a timeout
    const timeoutMs = 24000; // 24 seconds (safely under Netlify's 26s limit)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — the search took too long. Please try again.')), timeoutMs)
    );

    const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 504,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          message: err.message || 'The request took too long. Please try again.'
        }
      })
    };
  }

};
