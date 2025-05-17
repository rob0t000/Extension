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

    // Use evaluateJS to scrape search results
    const dynamicResults = await evaluateJS(searchUrl, `
      const items = Array.from(document.querySelectorAll('.vid-box'));
      return items.map(item => ({
        title: item.querySelector('h3')?.textContent.trim(),
        link: item.querySelector('a')?.href,
        image: item.querySelector('img')?.src
      }));
    `, { headers });

    let results = [];
    if (dynamicResults && dynamicResults.length > 0) {
      results = dynamicResults
        .filter(item => item.title && item.link)
        .map(item => {
          const id = item.link?.split("/anime/")[1];
          return {
            title: item.title,
            id: id,
            image: item.image || "",
            type: "ANIME"
          };
        })
        .filter(item => item.id); // Ensure id is present
    }

    // Fallback to fetch if evaluateJS fails
    if (results.length === 0) {
      const response = await fetch(searchUrl, { headers });
      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const items = doc.querySelectorAll(".vid-box");
      for (const item of items) {
        const title = item.querySelector("h3")?.textContent.trim();
        const link = item.querySelector("a")?.href;
        const id = link?.split("/anime/")[1];
        const image = item.querySelector("img")?.src;
        if (title && id) {
          results.push({
            title: title,
            id: id,
            image: image || "",
            type: "ANIME"
          });
        }
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const episodeItems = doc.querySelectorAll(".epi li");
    const totalEpisodes = episodeItems.length;

    const info = {
      id: id,
      title: doc.querySelector("h1")?.textContent.trim() || "",
      image: doc.querySelector(".anime-poster img")?.src || "",
      description: doc.querySelector(".anime-desc")?.textContent.trim() || "",
      genres: Array.from(doc.querySelectorAll(".gen a")).map(tag => tag.textContent.trim()),
      totalEpisodes: totalEpisodes || 0,
      type: "ANIME"
    };
    return info;
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const episodes = [];
    const episodeItems = doc.querySelectorAll(".epi li");
    for (const item of episodeItems) {
      const link = item.querySelector("a")?.href;
      const epNumber = link?.split("/").pop();
      const title = item.querySelector(".title")?.textContent.trim() || `Episode ${epNumber}`;
      if (link && epNumber) {
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let sources = [];
    const iframes = doc.querySelectorAll(".vid-player iframe");
    if (iframes.length > 0) {
      iframes.forEach((iframe, index) => {
        const src = iframe.src;
        if (src) {
          sources.push({
            url: src,
            quality: `Server ${index + 1}`,
            isM3U8: src.includes(".m3u8")
          });
        }
      });
    } else {
      const dynamicIframe = await evaluateJS(episodeUrl, `
        return Array.from(document.querySelectorAll('.vid-player iframe')).map(iframe => iframe.src);
      `);
      if (dynamicIframe && dynamicIframe.length > 0) {
        sources = dynamicIframe.map((src, index) => ({
          url: src,
          quality: `Server ${index + 1}`,
          isM3U8: src.includes(".m3u8")
        }));
      }
    }

    const subtitles = [];
    const subtitleLinks = doc.querySelectorAll("track[kind='subtitles']");
    subtitleLinks.forEach(track => {
      const src = track.src;
      const lang = track.srclang || "en";
      if (src) {
        subtitles.push({ url: src, lang: lang });
      }
    });

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
