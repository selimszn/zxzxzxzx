export default async function handler(req, res) {
    // 1. Set CORS so your website can talk to this API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle the browser's "pre-flight" check
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Construct the target URL (Videasy)
    // We grab the path after /api/server from the request
    const targetPath = req.url.replace('/api/server', '');
    const targetUrl = `https://player.videasy.net${targetPath}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://player.videasy.net/'
            }
        });

        const contentType = response.headers.get('content-type');

        // 3. If it's HTML, we inject our fixes (Transparent BG + UTF-8 Subtitles)
        if (contentType && contentType.includes('text/html')) {
            let html = await response.text();

            const injections = `
                <meta charset="utf-8">
                <style>
                    /* Kill the gray boxes */
                    .MuiBox-root, [class*="mui-"], div[class*="MuiBox-root"] { 
                        background-color: transparent !important; 
                    }
                    div[style*="background-color: rgba(137, 137, 137, 0.3)"] {
                        background-color: transparent !important;
                    }
                </style>
            `;

            html = html.replace('<head>', `<head>${injections}`);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(200).send(html);
        }

        // 4. For everything else (JS, CSS, Subtitle files), just pipe it through
        const data = await response.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        return res.status(200).send(Buffer.from(data));

    } catch (err) {
        console.error('Proxy Error:', err);
        return res.status(500).json({ error: 'Failed to reach Video Provider' });
    }
}