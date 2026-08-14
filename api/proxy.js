export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing target URL parameter");
  }

  try {
    const upstreamResponse = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive"
      }
    });

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).send(`Upstream returned ${upstreamResponse.status}`);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    const contentType = upstreamResponse.headers.get("content-type") || "";

    // If fetching the main M3U8 manifest, rewrite relative segment paths
    if (url.includes(".m3u8") || contentType.includes("mpegurl")) {
      let manifestText = await upstreamResponse.text();
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

      const rewrittenManifest = manifestText.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const absoluteSegmentUrl = trimmed.startsWith('http') ? trimmed : `${baseUrl}${trimmed}`;
          return `/api/proxy?url=${encodeURIComponent(absoluteSegmentUrl)}`;
        }
        return line;
      }).join('\n');

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.status(200).send(rewrittenManifest);
    }

    // For video chunk (.ts) data
    res.setHeader("Content-Type", contentType || "video/mp2t");
    const arrayBuffer = await upstreamResponse.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (err) {
    console.error("Proxy failure:", err);
    return res.status(500).send("Proxy error fetching stream resource");
  }
}