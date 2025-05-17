async function search(keyword) {
    const response = await fetchv2(`https://mangayomi.com/api/search?q=${encodeURIComponent(keyword)}`);
    const data = await response.json();
    
    return data.results.map(item => ({
        id: item.id,
        title: item.title,
        poster: item.thumbnail,
        year: item.year,
        rating: item.rating
    }));
}

async function getStreams(mediaId) {
    const response = await fetchv2(`https://mangayomi.com/api/media/${mediaId}`);
    const data = await response.json();
    
    return data.sources.map(source => ({
        quality: source.quality,
        url: source.url,
        subtitles: source.subtitles
    }));
}
