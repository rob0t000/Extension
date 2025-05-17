const BASE_URL = "https://animeheaven.pro";

async function search(query) {
  const res = await fetch(`${BASE_URL}/search.html?keyword=${encodeURIComponent(query)}`);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const results = [...doc.querySelectorAll(".items .item")].map(el => {
    const title = el.querySelector(".name")?.textContent.trim();
    const url = el.querySelector("a")?.href;
    const image = el.querySelector("img")?.src;

    return {
      title,
      url,
      image,
    };
  });

  return results;
}

async function load(url) {
  const res = await fetch(url);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = doc.querySelector(".info .title")?.textContent.trim();
  const episodes = [...doc.querySelectorAll(".episodes li")].map(li => {
    return {
      title: li.textContent.trim(),
      url: li.querySelector("a")?.href,
    };
  });

  return {
    title,
    episodes,
  };
}

async function watch(url) {
  const res = await fetch(url);
  const html = await res.text();

  const videoUrl = html.match(/file:"(https?:\/\/[^"]+)"/)?.[1];

  return {
    sources: [
      {
        url: videoUrl,
        quality: "default",
      },
    ],
  };
}

export default {
  name: "AnimeHeaven",
  version: "1.0.3",
  search,
  load,
  watch,
};
