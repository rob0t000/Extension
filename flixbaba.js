const baseUrl = "https://flixbaba.net";

/**
 * Search results using FlixBaba HTML.
 */
async function searchResults(keyword) {
    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(keyword)}`;
    const res = await fetch(searchUrl);
    const html = await res.text();

    const cards = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h[^>]*>([^<]+)<\/h[^>]*>/g)];

    const results = cards.map(card => ({
        title: card[3]?.trim(),
        image: card[2],
        href: card[1].startsWith("http") ? card[1] : baseUrl + card[1]
    }));

    return JSON.stringify(results);
}

/**
 * Extract details from movie/show detail page.
 */
async function extractDetails(url) {
    const res = await fetch(url);
    const html = await res.text();

    const descriptionMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const dateMatch = html.match(/Release date:<\/strong>\s*([^<\n]+)/i);

    const description = descriptionMatch ? descriptionMatch[1].trim() : "No description available.";
    const aliases = titleMatch ? titleMatch[1].trim() : "N/A";
    const airdate = dateMatch ? dateMatch[1].trim().split("-")[0] : "Unknown";

    return JSON.stringify({
        description,
        aliases,
        airdate
    });
}

/**
 * Episode list for TV shows (mocked — update if needed).
 */
async function extractEpisodes(url) {
    const res = await fetch(url);
    const html = await res.text();

    const matches = [...html.matchAll(/<button[^>]*data-episode=["'](\d+)["'][^>]*>(?:EP)?\s*(\d+)<\/button>/g)];
    const episodes = matches.map(match => ({
        href: `${url.split('?')[0]}?e=${match[2]}&p=1`,
        number: match[2]
    }));

    return JSON.stringify(episodes);
}

/**
 * Extract video stream + subtitle URL from episode/movie player.
 */
async function extractStreamUrl(url) {
    try {
        let playerUrl = url;
        if (!playerUrl.endsWith("/watch")) {
            playerUrl = playerUrl + "/watch";
        }

        const res = await fetch(playerUrl);
        const html = await res.text();

        const streamMatch = html.match(/<source[^>]*src="([^"]+\.m3u8)"/i);
        const subMatch = html.match(/<track[^>]*kind="subtitles"[^>]*src="([^"]+\.vtt)"/i);

        const stream = streamMatch ? streamMatch[1] : null;
        const subtitles = subMatch ? subMatch[1] : null;

        return JSON.stringify({ stream, subtitles });
    } catch (e) {
        return JSON.stringify({ stream: null, subtitles: null });
    }
}
