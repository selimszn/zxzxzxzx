export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const TMDB_KEY = process.env.TMDB_API_KEY || 'be70d302735d201a6e47d7044e6c735e';

  const { endpoint, ...rest } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing ?endpoint= param' });
  }

  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(rest).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const tmdbRes = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (!tmdbRes.ok) {
      return res.status(tmdbRes.status).json({ error: `TMDB returned ${tmdbRes.status}` });
    }

    const data = await tmdbRes.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    console.error('TMDB proxy error:', err);
    return res.status(500).json({ error: 'Failed to reach TMDB' });
  }
}