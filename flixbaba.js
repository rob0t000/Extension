const baseUrl = "https://flixbaba.net";

/**
 * Search for movies and TV shows by keyword.
 * Returns JSON array of objects: { title, image, href }.
 */
async function searchResults(keyword) {
  // Encode the keyword for use in a URL
  const query = encodeURIComponent(keyword.trim());
  // Example using TMDB (replace with actual FlixBaba search if available)
  const tmdbApiKey = c9d9bc0bd5f2232c89ea52e60839d46c; // Placeholder: an API key would be needed
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${query}`;
  const res = await fetch(url);
  const data = await res.json();

  // Map each result to the required format
  const results = (data.results || []).map(item => {
    // Determine if item is a movie or TV show
    const mediaType = item.media_type;
    const id = item.id;
    // Construct a slug for the title (e.g., "My Movie Title" -> "my-movie-title")
    const title = item.title || item.name || "";
    const slug = title.toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "");
    // Build the href to the FlixBaba page
    let href;
    if (mediaType === "tv") {
      href = `${baseUrl}/tv/${id}/${slug}`;
    } else {
      href = `${baseUrl}/movie/${id}/${slug}`;
    }
    // Use poster image if available
    const image = item.poster_path 
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : "";
    return { title, image, href };
  });

  // Return as JSON string (Sora expects JSON-formatted string)
  return JSON.stringify(results);
}

/**
 * Extract detailed metadata from a movie or show page.
 * Returns JSON with fields like description, aliases, airdate.
 */
async function extractDetails(url) {
  // Parse the URL to get the ID and determine type (movie or tv)
  const parts = url.replace(/\/+$/, "").split('/');
  const id = parts[4];
  const type = (parts[3] === "tv") ? "tv" : "movie";
  const tmdbApiKey = c9d9bc0bd5f2232c89ea52e60839d46c; // Placeholder
  let apiUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${tmdbApiKey}`;
  const res = await fetch(apiUrl);
  const data = await res.json();

  // Extract fields (or use empty strings if missing)
  const description = data.overview || "";
  // Use original_title or original_name as alias if different
  const aliases = data.original_title && data.original_title !== data.title
                  ? data.original_title
                  : (data.original_name && data.original_name !== data.name 
                     ? data.original_name 
                     : "");
  // Use release_date or first_air_date to get the year
  const date = data.release_date || data.first_air_date || "";
  const airdate = date ? date.split("-")[0] : "";
  
  return JSON.stringify({
    description: description,
    aliases: aliases,
    airdate: airdate
  });
}

/**
 * Extract episodes list for a TV show.
 * Returns JSON array of { href, number } objects.
 */
async function extractEpisodes(url) {
  // Parse the URL to get the show ID and slug
  const parts = url.replace(/\/+$/, "").split('/');
  const showId = parts[4];
  const showSlug = parts[5];
  const tmdbApiKey = c9d9bc0bd5f2232c89ea52e60839d46c; // Placeholder
  const apiUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${tmdbApiKey}`;
  const res = await fetch(apiUrl);
  const data = await res.json();

  const episodes = [];
  let episodeCounter = 1;
  // Loop through each season in the show
  for (const season of (data.seasons || [])) {
    // Skip if not a numeric season (e.g., specials)
    if (!Number.isInteger(season.season_number)) continue;
    // Fetch season details to get the episode count
    const seasonRes = await fetch(
      `https://api.themoviedb.org/3/tv/${showId}/season/${season.season_number}?api_key=${tmdbApiKey}`
    );
    const seasonData = await seasonRes.json();
    const epCount = (seasonData.episodes || []).length;
    // For each episode in the season, create an entry
    for (let ep = 1; ep <= epCount; ep++) {
      // Construct the FlixBaba episode URL pattern
      const href = `${baseUrl}/tv/${showId}/${showSlug}/season/${season.season_number}?e=${ep}&p=1`;
      episodes.push({ href: href, number: episodeCounter.toString() });
      episodeCounter++;
    }
  }

  return JSON.stringify(episodes);
}

/**
 * Extract the video stream URL and subtitle track URL for a given episode or movie.
 * Returns JSON like { stream: "...", subtitles: "..." }:contentReference[oaicite:16]{index=16}.
 */
async function extractStreamUrl(url) {
  // Construct the "watch" page URL for FlixBaba (assumes a /watch endpoint)
  // Note: The exact endpoint may vary; adjust if needed.
  let watchUrl = url;
  if (!watchUrl.endsWith("/watch")) {
    watchUrl = watchUrl + "/watch";
  }
  const res = await fetch(watchUrl);
  const html = await res.text();
  // Parse out the stream and subtitles URLs from the page HTML.
  // (The actual selectors depend on FlixBaba's page structure.)
  // Here we use regex as a placeholder for demonstration.
  const streamMatch = html.match(/<source[^>]+src="([^"]+)"/);
  const subMatch = html.match(/<track[^>]+kind="subtitles"[^>]+src="([^"]+)"/);
  const stream = streamMatch ? streamMatch[1] : "";
  const subtitles = subMatch ? subMatch[1] : "";
  
  return JSON.stringify({ stream: stream, subtitles: subtitles });
}
