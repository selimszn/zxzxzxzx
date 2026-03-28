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

            // Handle HTML files by rewriting all internal links
            if (contentType.includes('text/html')) {
                let html = buffer.toString('utf-8');
                
                // This regex finds anything starting with /_next or /static or /scripts
                // and slaps /api/server in front of it so your proxy catches it.
                html = html.replace(/(src|href|action)="\/(?!api\/server)(_next|static|scripts|manifest|api)/g, '$1="/api/server/$2');
                
                // Also fix background images or fetches in the code
                html = html.replace(/['"]\/(_next|static|scripts|api)/g, '"/api/server/$1');

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

            // Handle JS files (some JS files also have internal paths that need fixing)
            if (contentType.includes('application/javascript')) {
                let js = buffer.toString('utf-8');
                js = js.replace(/"\/(_next|static|api)/g, '"/api/server/$1');
                res.setHeader('Content-Type', contentType);
                return res.status(200).send(js);
            }

            res.setHeader('Content-Type', contentType);
            res.status(proxyRes.statusCode).send(buffer);
        });
    }).on('error', () => res.status(500).send("Proxy Error"));
};