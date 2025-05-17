const BASE_URL = "https://animeheaven.me";

// Custom fetch function from the sample script
async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
  try {
    return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
  } catch (e) {
    try {
      return await fetch(url, options);
    } catch (error) {
      return null;
    }
  }
}

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
    const response = await soraFetch(searchUrl, { headers });
    if (!response || !response.ok) {
      throw new Error(`Fetch failed with status: ${response?.status || 'unknown'}`);
    }
    const html = await response.text();

    // Ensure html is a string
    if (typeof html !== "string") {
      throw new Error("Fetched HTML is not a string");
    }

    // Manually extract <div class="vid-box"> blocks
    const results = [];
    let currentIndex = 0;
    const blockStart = '<div class="vid-box">';
    const blockEnd = '</div>';

    while (true) {
      // Find the next <div class="vid-box">
      const startIndex = html.indexOf(blockStart, currentIndex);
      if (startIndex === -1) break; // No more blocks

      // Find the end of the block
      const endIndex = html.indexOf(blockEnd, startIndex + blockStart.length);
      if (endIndex === -1) break; // Malformed HTML

      // Extract the block
      const vidBox = html.substring(startIndex, endIndex + blockEnd.length);
      currentIndex = endIndex + blockEnd.length;

      // Extract title
      const titleStart = vidBox.indexOf('<h3>');
      const titleEnd = vidBox.indexOf('</h3>', titleStart);
      let title = null;
      if (titleStart !== -1 && titleEnd !== -1) {
        title = vidBox.substring(titleStart + 4, titleEnd).trim();
      }

      // Extract link and ID
      let id = null;
      const linkStart = vidBox.indexOf('<a href="/anime/');
      if (linkStart !== -1) {
        const hrefStart = linkStart + 16; // Length of '<a href="/anime/'
        const hrefEnd = vidBox.indexOf('"', hrefStart);
        if (hrefEnd !== -1) {
          id = vidBox.substring(hrefStart, hrefEnd);
        }
      }

      // Extract image
      let image = "";
      const imgStart = vidBox.indexOf('<img src="');
      if (imgStart !== -1) {
        const srcStart = imgStart + 10; // Length of '<img src="'
        const srcEnd = vidBox.indexOf('"', srcStart);
        if (srcEnd !== -1) {
          image = vidBox.substring(srcStart, srcEnd);
        }
      }

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
    const response = await soraFetch(`${BASE_URL}/anime/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
      }
    });
    if (!response || !response.ok) {
      throw new Error(`Fetch failed with status: ${response?.status || 'unknown'}`);
    }
    const html = await response.text();

    // Ensure html is a string
    if (typeof html !== "string") {
      throw new Error("Fetched HTML is not a string");
    }

    // Extract title
    const titleStart = html.indexOf('<h1>');
    const titleEnd = html.indexOf('</h1>', titleStart);
    const title = titleStart !== -1 && titleEnd !== -1 ? html.substring(titleStart + 4, titleEnd).trim() : "";

    // Extract image
    let image = "";
    const imageStart = html.indexOf('<img class="anime-poster" src="');
    if (imageStart !== -1) {
      const srcStart = imageStart + 30; // Length of '<img class="anime-poster" src="'
      const srcEnd = html.indexOf('"', srcStart);
      if (srcEnd !== -1) {
        image = html.substring(srcStart, srcEnd);
        image = image.startsWith("http") ? image : `${BASE_URL}${image}`;
      }
    }

    // Extract description
    const descStart = html.indexOf('<div class="anime-desc">');
    const descEnd = html.indexOf('</div>', descStart);
    const description = descStart !== -1 && descEnd !== -1 ? html.substring(descStart + 23, descEnd).trim() : "";

    // Extract genres
    const genres = [];
    const genresBlockStart = html.indexOf('<div class="gen">');
    const genresBlockEnd = html.indexOf('</div>', genresBlockStart);
    if (genresBlockStart !== -1 && genresBlockEnd !== -1) {
      const genresBlock = html.substring(genresBlockStart, genresBlockEnd);
      let genreIndex = 0;
      while (true) {
        const genreStart = genresBlock.indexOf('<a', genreIndex);
        if (genreStart === -1) break;
        const genreTextStart = genresBlock.indexOf('>', genreStart) + 1;
        const genreTextEnd = genresBlock.indexOf('</a>', genreTextStart);
        if (genreTextStart === -1 || genreTextEnd === -1) break;
        const genre = genresBlock.substring(genreTextStart, genreTextEnd).trim();
        if (genre) genres.push(genre);
        genreIndex = genreTextEnd;
      }
    }

    // Count episodes
    let totalEpisodes = 0;
    const episodeBlockStart = html.indexOf('<ul class="epi">');
    const episodeBlockEnd = html.indexOf('</ul>', episodeBlockStart);
    if (episodeBlockStart !== -1 && episodeBlockEnd !== -1) {
      const episodeBlock = html.substring(episodeBlockStart, episodeBlockEnd);
      let liIndex = 0;
      while (true) {
        const liStart = episodeBlock.indexOf('<li>', liIndex);
        if (liStart === -1) break;
        totalEpisodes++;
        liIndex = liStart + 4;
      }
    }

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
    const response = await soraFetch(`${BASE_URL}/anime/${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
      }
    });
    if (!response || !response.ok) {
      throw new Error(`Fetch failed with status: ${response?.status || 'unknown'}`);
    }
    const html = await response.text();

    // Ensure html is a string
    if (typeof html !== "string") {
      throw new Error("Fetched HTML is not a string");
    }

    const episodes = [];
    const episodeBlockStart = html.indexOf('<ul class="epi">');
    const episodeBlockEnd = html.indexOf('</ul>', episodeBlockStart);
    if (episodeBlockStart === -1 || episodeBlockEnd === -1) return [];

    const episodeBlock = html.substring(episodeBlockStart, episodeBlockEnd);
    let currentIndex = 0;

    while (true) {
      const liStart = episodeBlock.indexOf('<li>', currentIndex);
      if (liStart === -1) break;
      const liEnd = episodeBlock.indexOf('</li>', liStart);
      if (liEnd === -1) break;

      const item = episodeBlock.substring(liStart, liEnd + 5);
      currentIndex = liEnd + 5;

      // Extract episode number from link
      let epNumber = null;
      const hrefStart = item.indexOf('<a href="');
      if (hrefStart !== -1) {
        const urlStart = hrefStart + 9; // Length of '<a href="'
        const urlEnd = item.indexOf('"', urlStart);
        if (urlEnd !== -1) {
          const url = item.substring(urlStart, urlEnd);
          const lastSlash = url.lastIndexOf('/');
          if (lastSlash !== -1) {
            epNumber = url.substring(lastSlash + 1);
          }
        }
      }

      // Extract title
      const titleStart = item.indexOf('<span class="title">');
      const titleEnd = item.indexOf('</span>', titleStart);
      const title = titleStart !== -1 && titleEnd !== -1 ? item.substring(titleStart + 19, titleEnd).trim() : `Episode ${epNumber}`;

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

    const response = await soraFetch(episodeUrl, { headers });
    if (!response || !response.ok) {
      throw new Error(`Fetch failed with status: ${response?.status || 'unknown'}`);
    }
    const html = await response.text();

    // Ensure html is a string
    if (typeof html !== "string") {
      throw new Error("Fetched HTML is not a string");
    }

    let sources = [];
    let currentIndex = 0;
    const iframeBlockStartTag = '<div class="vid-player">';
    const iframeStartTag = '<iframe src="';

    while (true) {
      const blockStart = html.indexOf(iframeBlockStartTag, currentIndex);
      if (blockStart === -1) break;
      const iframeStart = html.indexOf(iframeStartTag, blockStart);
      if (iframeStart === -1) break;
      const iframeEnd = html.indexOf('"', iframeStart + iframeStartTag.length);
      if (iframeEnd === -1) break;

      const src = html.substring(iframeStart + iframeStartTag.length, iframeEnd);
      if (src) {
        sources.push({
          url: src,
          quality: `Server ${sources.length + 1}`,
          isM3U8: src.includes(".m3u8")
        });
      }
      currentIndex = iframeEnd;
    }

    const subtitles = [];
    const subtitleStartTag = '<track kind="subtitles" src="';
    currentIndex = 0;

    while (true) {
      const subtitleStart = html.indexOf(subtitleStartTag, currentIndex);
      if (subtitleStart === -1) break;
      const srcEnd = html.indexOf('"', subtitleStart + subtitleStartTag.length);
      if (srcEnd === -1) break;
      const src = html.substring(subtitleStart + subtitleStartTag.length, srcEnd);

      const langStart = html.indexOf('srclang="', srcEnd) + 9;
      const langEnd = html.indexOf('"', langStart);
      const lang = langStart !== -1 && langEnd !== -1 ? html.substring(langStart, langEnd) : "en";

      if (src) {
        subtitles.push({ url: src, lang: lang });
      }
      currentIndex = langEnd || srcEnd;
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
