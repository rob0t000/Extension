const baseUrl = "https://flixbaba.net";
const tmdbApiKey = "c9d9bc0bd5f2232c89ea52e60839d46c";

/**
 * Search for movies and TV shows by keyword.
 * Returns JSON array of objects: { title, image, href }.
 */
async function searchResults(keyword) {
  const query = encodeURIComponent(keyword.trim());
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${query}`;
  const res = await fetch(url);
  const data = await res.json();

  const results = (data.results || [])
    .map(item => {
      const mediaType = item.media_type;
      if (mediaType !== "tv" && mediaType !== "movie") return null;

      const id = item.id;
      const title = item.title || item.name || "";
      const slug = title.toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");

      const href = `${baseUrl}/${mediaType}/${id}/${slug}`;
      const image = item.poster_path 
                    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                    : "";

      return { title, image, href };
    })
    .filter(Boolean); // Remove nulls

  return JSON.stringify(results);
}

/**
 * Extract detailed metadata from a movie or show page.
 * Returns JSON with fields: description, aliases, airdate.
 */
async function extractDetails(url) {
  const parts = url.replace(/\/+$/, "").split('/');
  const id = parts[4];
  const type = (parts[3] === "tv") ? "tv" : "movie";
  const apiUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${tmdbApiKey}`;

  const res = await fetch(apiUrl);
  const data = await res.json();

  const description = data.overview || "No description available.";
  const aliases = (data.original_title && data.original_title !== data.title)
    ? data.original_title
    : (data.original_name && data.original_name !== data.name
      ? data.original_name
      : "N/A");
  const date = data.release_date || data.first_air_date || "";
  const airdate = date ? date.split("-")[0] : "Unknown";

  return JSON.stringify({
    description,
    aliases,
    airdate
  });
}

/**
 * Extract episodes list for a TV show.
 * Returns JSON array of { href, number } objects.
 */
async function extractEpisodes(url) {
  const parts = url.replace(/\/+$/, "").split('/');
  const showId = parts[4];
  const showSlug = parts[5];
  const apiUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${tmdbApiKey}`;

  const res = await fetch(apiUrl);
  const data = await res.json();

  const episodes = [];
  let episodeCounter = 1;

  for (const season of (data.seasons || [])) {
    if (!Number.isInteger(season.season_number)) continue;

    const seasonRes = await fetch(
      `https://api.themoviedb.org/3/tv/${showId}/season/${season.season_number}?api_key=${tmdbApiKey}`
    );
    const seasonData = await seasonRes.json();
    const epList = seasonData.episodes || [];

    for (let ep of epList) {
      const href = `${baseUrl}/tv/${showId}/${showSlug}/season/${season.season_number}?e=${ep.episode_number}&p=1`;
      episodes.push({ href, number: episodeCounter.toString() });
      episodeCounter++;
    }
  }

  return JSON.stringify(episodes);
}

/**
 * Extract stream and subtitle URL from a movie or episode.
 * Returns JSON like: { stream: "HLS_URL", subtitles: "VTT_URL" }
 */
async function extractStreamUrl(url) {
  let watchUrl = url;
  if (!watchUrl.endsWith("/watch")) {
    watchUrl += "/watch";
  }

  const res = await fetch(watchUrl);
  const html = await res.text();

  const streamMatch = html.match(/<source[^>]+src="([^"]+)"/);
  const subMatch = html.match(/<track[^>]+kind="subtitles"[^>]+src="([^"]+)"/);

  const stream = streamMatch ? streamMatch[1] : "";
  const subtitles = subMatch ? subMatch[1] : "";

  return JSON.stringify({ stream, subtitles });
}
