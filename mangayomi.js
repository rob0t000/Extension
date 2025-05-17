async function searchResults(keyword) {
    try {
        const url = `https://mangayomi.com/api/search?q=${encodeURIComponent(keyword)}`;
        const response = await fetchv2(url);
        const data = await response.json();

        // Adjust according to the actual API response structure!
        const results = (data.results || []).map(item => ({
            id: item.id,
            title: item.title,
            poster: item.thumbnail || "",
            year: item.year || "",
            rating: item.rating || ""
        }));

        return JSON.stringify(results);
    } catch (error) {
        console.log("Search error:", error);
        return JSON.stringify([]);
    }
}

async function getStreams(mediaId) {
    try {
        const url = `https://mangayomi.com/api/media/${mediaId}`;
        const response = await fetchv2(url);
        const data = await response.json();

        // Adjust according to the actual API response structure!
        const streams = (data.sources || []).map(source => ({
            quality: source.quality || "unknown",
            url: source.url,
            subtitles: source.subtitles || ""
        }));

        return JSON.stringify(streams);
    } catch (error) {
        console.log("Stream error:", error);
        return JSON.stringify([]);
    }
}
