const BASE_URL = "https://animeheaven.me";

async function search(query) {
  try {
    const response = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const results = [];
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
    return results;
  } catch (error) {
    console.error("Search error:", error);
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
    return episodes.reverse(); // Reverse to show episodes in ascending order
  } catch (error) {
    console.error("Episode list error:", error);
    return [];
  }
}

async function getSource(episodeId) {
  try {
    const [animeId, epNumber] = episodeId.split("/");
    const response = await fetch(`${BASE_URL}/watch/${animeId}/${epNumber}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const iframe = doc.querySelector(".vid-player iframe");
    if (iframe?.src) {
      return {
        sources: [{ url: iframe.src, quality: "auto", isM3U8: iframe.src.includes(".m3u8") }],
        subtitles: [],
        headers: {
          "Referer": `${BASE_URL}/watch/${animeId}/${epNumber}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
        }
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
