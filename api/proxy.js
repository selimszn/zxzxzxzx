// api/proxy.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing target URL");
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // IPTV servers often block missing/default Node user agents
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Connection": "keep-alive"
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Upstream server returned status ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    } else if (url.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (url.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
    }

    // Enable CORS for your front-end
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).send("Proxy error while fetching stream");
  }
}