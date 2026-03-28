const https = require('https');

module.exports = (req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Get the path after /api/server
    const path = req.url.split('/api/server')[1] || '';
    const targetUrl = `https://player.videasy.net${path}`;

    // 3. Perform the request
    https.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://player.videasy.net/'
        }
    }, (proxyRes) => {
        let data = [];

        proxyRes.on('data', (chunk) => data.push(chunk));

        proxyRes.on('end', () => {
            const buffer = Buffer.concat(data);
            const contentType = proxyRes.headers['content-type'] || '';

            // 4. Inject UTF-8 and CSS fix if it's HTML
            if (contentType.includes('text/html')) {
                let html = buffer.toString('utf-8');
                const injections = `
                    <meta charset="utf-8">
                    <style>
                        .MuiBox-root, [class*="mui-"] { background-color: transparent !important; }
                    </style>
                `;
                html = html.replace('<head>', `<head>${injections}`);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.status(200).send(html);
            }

            // 5. Otherwise, send raw data (JS, CSS, etc.)
            res.setHeader('Content-Type', contentType);
            res.status(proxyRes.statusCode).send(buffer);
        });
    }).on('error', (err) => {
        console.error('Proxy Error:', err);
        res.status(500).send("Proxy failed to connect to Videasy");
    });
};