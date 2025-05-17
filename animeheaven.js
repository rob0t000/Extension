const BASE_URL = "https://animeheaven.me";

async function search(query) {
  try {
    // Encode the query for the URL (e.g., "One piece" -> "one+piece")
    const encodedQuery = encodeURIComponent(query.replace(/\s+/g, "+"));
    const searchUrl = `${BASE_URL}/search.php?s=${encodedQuery}`;
    
    // Headers to mimic browser
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
      "Referer": BASE_URL,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    };

    // Fetch the search page HTML
    const response = await fetch(searchUrl, { headers });
    if (!response.ok) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }
    const html = await response.text();

    // Use regex to find all <div class="vid-box"> blocks
    const vidBoxRegex = /<div class="vid-box">.*?<\/div>/gs;
    const vidBoxes = html.match(vidBoxRegex) || [];

    const results = [];
    for (const vidBox of vidBoxes) {
      // Extract title
      const titleRegex = /<h3>(.*?)</h3>/s;
      const titleMatch = vidBox.match(titleRegex);
      const title = titleMatch ? titleMatch[1].trim() : null;

      // Extract link and ID
      const linkRegex = /<a href="\/anime\/(.*?)"/s;
      const linkMatch = vidBox.match(linkRegex);
      const id = linkMatch ? linkMatch[1] : null;

      // Extract image
      const imageRegex = /<img src="(.*?)"/s;
      const imageMatch = vidBox.match(imageRegex);
      const image = imageMatch ? imageMatch[1] : "";

      // If title and id are present, add to results
      if (title && id) {
        // Ensure image URL is absolute
        const imageUrl = image.startsWith("http") ? image : `${BASE_URL}${image}`;
        results.push({
          title: title,
          id: id,
          image: imageUrl,
          type: "ANIME"
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Search error:", error.message || error);
    return [];
  }
}

async function getMediaInfo(id) {
  try {
    const response = await fetch(`${BASE_URL}/anime/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();

    // Use regex to extract media info
    const titleRegex = /<h1>(.*?)</h1>/s;
    const imageRegex = /<img class="anime-poster" src="(.*?)"/s;
    const descRegex = /<div class="anime-desc">(.*?)</div>/s;
    const genresRegex = /<div class="gen">.*?<\/div>/s;
    const episodeRegex = /<ul class="epi">.*?<\/ul>/s;

    const titleMatch = html.match(titleRegex);
    const imageMatch = html.match(imageRegex);
    const descMatch = html.match(descRegex);
    const genresMatch = html.match(genresRegex);
    const episodeMatch = html.match(episodeRegex);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const image = imageMatch ? (imageMatch[1].startsWith("http") ? imageMatch[1] : `${BASE_URL}${imageMatch[1]}`) : "";
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract genres
    const genreLinkRegex = /<a.*?>(.*?)</g;
    const genres = genresMatch ? [...genresMatch[0].matchAll(genreLinkRegex)].map(match => match[1].trim()) : [];

    // Count episodes
    const episodeItemRegex = /<li>/g;
    const totalEpisodes = episodeMatch ? (episodeMatch[0].match(episodeItemRegex) || []).length : 0;

    return {
      id: id,
      title: title,
      image: image,
      description: description,
      genres: genres,
      totalEpisodes: totalEpisodes,
      type: "ANIME"
    };
  } catch (error) {
    console.error("Media info error:", error);
    return {};
  }
}

async function getEpisodeList(id, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}/anime/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();

    // Use regex to extract episode list
    const episodeListRegex = /<ul class="epi">.*?<li>.*?<\/ul>/s;
    const episodeItemRegex = /<li>.*?<\/li>/gs;
    const linkRegex = /<a href=".*?\/(\d+)"/s;
    const titleRegex = /<span class="title">(.*?)</s;

    const episodeListMatch = html.match(episodeListRegex);
    if (!episodeListMatch) return [];

    const episodeItems = episodeListMatch[0].match(episodeItemRegex) || [];
    const episodes = [];

    for (const item of episodeItems) {
      const linkMatch = item.match(linkRegex);
      const titleMatch = item.match(titleRegex);

      const epNumber = linkMatch ? linkMatch[1] : null;
      const title = titleMatch ? titleMatch[1].trim() : `Episode ${epNumber}`;

      if (epNumber) {
        episodes.push({
          id: `${id}/${epNumber}`,
          number: parseInt(epNumber) || 1,
          title: title
        });
      }
    }

    return episodes.reverse();
  } catch (error) {
    console.error("Episode list error:", error);
    return [];
  }
}

async function getSource(episodeId) {
  try {
    const [animeId, epNumber] = episodeId.split("/");
    const episodeUrl = `${BASE_URL}/watch/${animeId}/${epNumber}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
      "Referer": episodeUrl,
      "Origin": BASE_URL
    };

    const response = await fetch(episodeUrl, { headers });
    const html = await response.text();

    // Use regex to extract video sources
    let sources = [];
    const iframeRegex = /<div class="vid-player">.*?<iframe src="(.*?)"/gs;
    const iframeMatches = html.matchAll(iframeRegex);

    for (const match of iframeMatches) {
      const src = match[1];
      if (src) {
        sources.push({
          url: src,
          quality: `Server ${sources.length + 1}`,
          isM3U8: src.includes(".m3u8")
        });
      }
    }

    // Extract subtitles
    const subtitles = [];
    const subtitleRegex = /<track kind="subtitles" src="(.*?)" srclang="(.*?)"/gs;
    const subtitleMatches = html.matchAll(subtitleRegex);

    for (const match of subtitleMatches) {
      const src = match[1];
      const lang = match[2] || "en";
      subtitles.push({ url: src, lang: lang });
    }

    if (sources.length > 0) {
      return {
        sources: sources,
        subtitles: subtitles,
        headers: headers
      };
    }
    return { sources: [], subtitles: [], headers: {} };
  } catch (error) {
    console.error("Source error:", error);
    return { sources: [], subtitles: [], headers: {} };
  }
}

export default {
  search,
  getMediaInfo,
  getEpisodeList,
  getSource,
  moduleInfo: {
    name: "AnimeHeaven",
    version: "1.0.0",
    types: ["ANIME"],
    disabled: false
  }
};
