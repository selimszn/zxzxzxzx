const https = require('https');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Strip the /api/server prefix to get the real path
    const urlPath = req.url.replace('/api/server', '') || '/';
    const targetUrl = `https://player.videasy.net${urlPath}`;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://player.videasy.net/',
            'Origin': 'https://player.videasy.net',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    };

    https.get(targetUrl, options, (proxyRes) => {
        let data = [];
        proxyRes.on('data', (chunk) => data.push(chunk));
        proxyRes.on('end', () => {
            const buffer = Buffer.concat(data);
            const contentType = proxyRes.headers['content-type'] || '';
            const status = proxyRes.statusCode || 200;

            // Forward most headers except ones that break things
            const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection', 'keep-alive', 'x-frame-options', 'content-security-policy', 'frame-options'];
            Object.entries(proxyRes.headers).forEach(([key, value]) => {
                if (!skipHeaders.includes(key.toLowerCase())) {
                    try { res.setHeader(key, value); } catch(e) {}
                }
            });

            if (contentType.includes('text/html')) {
                let html = buffer.toString('utf-8');

                // Rewrite ALL absolute paths to go through proxy
                // This catches /_next, /static, and any other root-relative paths
                html = html
                    .replace(/(src|href|action)="\//g, '$1="/api/server/')
                    .replace(/(src|href|action)='\//g, "$1='/api/server/")
                    // Fix any double-proxied paths
                    .replace(/\/api\/server\/api\/server\//g, '/api/server/')
                    // Rewrite fetch/XHR calls in inline scripts
                    .replace(/fetch\("\/(?!api\/server)/g, 'fetch("/api/server/')
                    .replace(/fetch\('\/(?!api\/server)/g, "fetch('/api/server/");

                // Inject styles to hide unwanted overlays
                const injections = `
                    <meta charset="utf-8">
                    <style>
                        body { background: #000 !important; }
                        div[style*="background-color: rgba(137, 137, 137"],
                        div[style*="background: rgba(137, 137, 137"] {
                            display: none !important;
                        }
                    </style>
                    <script>
                        // Rewrite dynamic fetch calls to go through proxy
                        const _origFetch = window.fetch;
                        window.fetch = function(url, ...args) {
                            if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/api/server')) {
                                url = '/api/server' + url;
                            }
                            return _origFetch.call(this, url, ...args);
                        };
                        // Rewrite XHR too
                        const _origOpen = XMLHttpRequest.prototype.open;
                        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                            if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('/api/server')) {
                                url = '/api/server' + url;
                            }
                            return _origOpen.call(this, method, url, ...rest);
                        };
                    <\/script>`;

                html = html.replace('<head>', `<head>${injections}`);

                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.status(200).send(html);
            }

            // Pass through everything else as-is (JS, CSS, images, fonts)
            res.setHeader('Content-Type', contentType);
            res.status(status).send(buffer);
        });
    }).on('error', (err) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error: ' + err.message);
    });
};