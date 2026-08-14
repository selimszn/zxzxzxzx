export default async function handler(req, res) {
  // Set CORS headers to allow your frontend to access the response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter.' });
  }

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch stream source: ${response.statusText}`);
    }

    const data = await response.text();
    const contentType = response.headers.get('content-type') || 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}