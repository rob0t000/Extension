const BASE_URL = 'https://animeheaven.me';

async function search(query) {
  const res = await fetch(`${BASE_URL}/search.html?keyword=${encodeURIComponent(query)}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const results = [...doc.querySelectorAll('.items .item')].map(el => {
    const title = el.querySelector('.name')?.textContent.trim();
    const url = el.querySelector('a')?.href;
    const image = el.querySelector('img')?.src;
    return { title, url, image };
  });

  return results;
}

async function load(url) {
  const res = await fetch(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const title = doc.querySelector('.info .title')?.textContent.trim();

  const episodes = [...doc.querySelectorAll('.episodes li a')].map(el => {
    return {
      title: el.textContent.trim(),
      url: el.href
    };
  });

  return { title, episodes };
}

async function watch(url) {
  const res = await fetch(url);
  const html = await res.text();

  const match = html.match(/file:\\"(https?:\\\\\/\\\\\/[^\\"]+)\\"/);
  const videoUrl = match ? match[1].replace(/\\/g, '') : null;

  return {
    sources: videoUrl ? [{ url: videoUrl, quality: 'default' }] : []
  };
}
