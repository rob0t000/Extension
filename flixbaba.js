const baseUrl = "https://flixbaba.net";
const defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": baseUrl
};

/**
 * Search for movies/TV shows.
 */
async function searchResults(keyword) {
    const results = [];
    const url = `${baseUrl}/search?q=${encodeURIComponent(keyword)}`;
    // fetchv2 returns the raw HTML string
    const html = await fetchv2(url, defaultHeaders);

    // Adjust regex to FlixBaba’s card structure
    const regex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h[^>]*>([^<]+)<\/h[^>]*>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[3].trim(),
            image: match[2].startsWith("http") ? match[2] : baseUrl + match[2],
            href:  match[1].startsWith("http") ? match[1] : baseUrl + match[1]
        });
    }

    console.error(JSON.stringify(results));
    return JSON.stringify(results);
}

/**
 * Get description, aliases, airdate.
 */
async function extractDetails(url) {
    const html = await fetchv2(url, defaultHeaders);

    const descM = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    const titleM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const dateM  = html.match(/Release date:<\/strong>\s*([^<\n]+)/i);

    const description = descM  ? descM[1].trim() : "No description available.";
    const aliases     = titleM ? titleM[1].trim() : "N/A";
    const airdate     = dateM  ? dateM[1].trim().split("-")[0] : "Unknown";

    const result = { description, aliases, airdate };
    console.error(JSON.stringify(result));
    return JSON.stringify(result);
}

/**
 * List all episodes (or empty for movies).
 */
async function extractEpisodes(url) {
    const html = await fetchv2(url, defaultHeaders);

    const regex = /<button[^>]*data-episode=["'](\d+)["'][^>]*>(?:EP)?\s*(\d+)<\/button>/g;
    const episodes = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        episodes.push({
            href: `${url.split('?')[0]}?e=${match[2]}&p=1`,
            number: parseInt(match[2], 10)
        });
    }

    console.error(JSON.stringify(episodes));
    return JSON.stringify(episodes);
}

/**
 * Grab the .m3u8 stream and .vtt subtitles.
 */
async function extractStreamUrl(url) {
    try {
        let playerUrl = url.endsWith("/watch") ? url : `${url}/watch`;
        const html = await fetchv2(playerUrl, defaultHeaders);

        const srcM = html.match(/<source[^>]*src="([^"]+\.m3u8)"/i);
        const subM = html.match(/<track[^>]*kind="subtitles"[^>]*src="([^"]+\.vtt)"/i);

        const stream    = srcM ? srcM[1] : null;
        const subtitles = subM ? subM[1] : null;
        const result = { stream, subtitles };

        console.error(JSON.stringify(result));
        return JSON.stringify(result);

    } catch (e) {
        console.error("Stream error:", e);
        return JSON.stringify({ stream: null, subtitles: null });
    }
}
