import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import zlib from 'zlib'; // To handle compressed sites

const app = express();
const PORT = 3000;

app.use('/', createProxyMiddleware({
    target: 'https://vidcore.net',
    changeOrigin: true,
    selfHandleResponse: true,
    // Add headers so Vidcore thinks you are a real user
    onProxyReq: (proxyReq) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyReq.setHeader('Referer', 'https://vidcore.net/');
    },
    onProxyRes: (proxyRes, req, res) => {
        const contentType = proxyRes.headers['content-type'] || '';
        
        // ONLY modify if it's HTML. If it's a video/script/image, just pipe it through.
        if (contentType.includes('text/html')) {
            let body = Buffer.from([]);
            
            proxyRes.on('data', (chunk) => {
                body = Buffer.concat([body, chunk]);
            });

            proxyRes.on('end', () => {
                // Handle Gzip/Deflate compression if the website uses it
                const encoding = proxyRes.headers['content-encoding'];
                let html;
                
                if (encoding === 'gzip') {
                    html = zlib.gunzipSync(body).toString('utf8');
                } else if (encoding === 'deflate') {
                    html = zlib.inflateSync(body).toString('utf8');
                } else {
                    html = body.toString('utf8');
                }

                // INJECT THE CSS
                const injectedHtml = html.replace('</head>', `
                    <style>
                        .MuiBox-root, [class*="mui-"], div[class*="MuiBox-root"] { 
                            background-color: transparent !important; 
                        }
                        div[style*="background-color: rgba(137, 137, 137, 0.3)"] {
                            background-color: transparent !important;
                        }
                    </style>
                </head>`);

                res.set('content-type', 'text/html');
                res.send(injectedHtml);
            });
        } else {
            // This is critical: just stream everything else (videos, JS, images)
            proxyRes.pipe(res);
        }
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).send('Proxy failed to connect.');
    }
}));

app.listen(PORT, () => console.log(`Proxy running: http://localhost:${PORT}`));