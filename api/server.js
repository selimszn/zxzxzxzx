const https = require('https');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const path = req.url.split('/api/server')[1] || '';
    const targetUrl = `https://player.videasy.net${path}`;

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

            if (contentType.includes('text/html')) {
                let html = buffer.toString('utf-8');
                
                // FIX: Rewrite relative paths to go through your proxy
                // This stops the 404s for .js and .css files
                html = html.replace(/(src|href)="\/_next/g, '$1="/api/server/_next');
                html = html.replace(/(src|href)="\/static/g, '$1="/api/server/static');

                const injections = `
                    <meta charset="utf-8">
                    <style>
                        body { background: black !important; }
                        .MuiBox-root, [class*="mui-"] { background-color: transparent !important; }
                    </style>
                `;
                html = html.replace('<head>', `<head>${injections}`);
                
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.status(200).send(html);
            }

            res.setHeader('Content-Type', contentType);
            res.status(proxyRes.statusCode).send(buffer);
        });
    }).on('error', () => res.status(500).send("Proxy Error"));
};