const axios = require('axios'); // You might need to run 'npm install axios'

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Get everything after /api/server/
    const path = req.url.split('/api/server')[1] || '';
    const targetUrl = `https://player.videasy.net${path}`;

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://player.videasy.net/'
            }
        });

        const contentType = response.headers['content-type'];

        if (contentType && contentType.includes('text/html')) {
            let html = response.data.toString('utf-8');
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

        res.setHeader('Content-Type', contentType);
        return res.status(200).send(response.data);
    } catch (err) {
        res.status(500).send("Proxy Error");
    }
};