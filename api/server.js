const https = require('https');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Clean the path
    const urlPath = req.url.replace('/api/server', '') || '/';
    const targetUrl = `https://player.videasy.net${urlPath}`;

    https.get(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
                
                // ONLY rewrite paths that start with /_next or /static
                // We use a "Lookahead" to make sure we don't double-proxy
                html = html.replace(/(src|href)="\/_next/g, '$1="/api/server/_next');
                html = html.replace(/(src|href)="\/static/g, '$1="/api/server/static');
                
                const injections = `
                    <meta charset="utf-8">
                    <style>
                        body { background: black !important; color: white; }
                        .MuiBox-root, [class*="mui-"] { background-color: transparent !important; }
                    </style>
                `;
                html = html.replace('<head>', `<head>${injections}`);
                
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.status(200).send(html);
            }

            // Just pass through everything else (JS, CSS, Images) exactly as they are
            res.setHeader('Content-Type', contentType);
            res.status(proxyRes.statusCode).send(buffer);
        });
    }).on('error', () => res.status(500).send("Proxy Link Dead"));
};