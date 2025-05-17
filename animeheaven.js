const BASE_URL = 'https://animeheaven.me';

async function search(query) {
  const res = await fetch(`${BASE_URL}/search.html?keyword=${encodeURIComponent(query)}`);
  const html = await res.text();

  const results = [];
  const itemRegex = /<div class="item">.*?<a href="(.*?)".*?<img src="(.*?)".*?<div class="name">(.*?)<\/div>/gs;

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    results.push({
      title: match[3].trim(),
      url: BASE_URL + match[1],
      image: match[2].startsWith('http') ? match[2] : BASE_URL + match[2],
    });
  }

  return results;
}

async function load(url) {
  const res = await fetch(url);
  const html = await res.text();

  const titleMatch = html.match(/<div class="info">.*?<h1 class="title">(.*?)<\/h1>/s);
  const title = titleMatch ? titleMatch[1].trim() : "Unknown Title";

  const episodes = [];
  const episodeRegex = /<li><a href="(\/watch\/.*?)">(.*?)<\/a><\/li>/g;

  let match;
  while ((match = episodeRegex.exec(html)) !== null) {
    episodes.push({
      title: match[2].trim(),
      url: BASE_URL + match[1],
    });
  }

  return { title, episodes };
}

async function watch(url) {
  const res = await fetch(url);
  const html = await res.text();

  const videoMatch = html.match(/file:\s*"(https?:\/\/[^"]+)"/);
  const videoUrl = videoMatch ? videoMatch[1] : null;

  return {
    sources: videoUrl ? [{ url: videoUrl, quality: 'default' }] : []
  };
}
