async function searchResults(keyword) {
    try {
        const encoded = encodeURIComponent(keyword);
        // Fetch search data from Flixbaba’s endpoint (returns JSON)
        const responseText = await fetchv2(`https://flixbaba.net/search?q=${encoded}`);
        const data = JSON.parse(responseText);
        const results = [];
        // Map each item to the required format (title, image, href)
        (data.results || []).forEach(item => {
            results.push({
                title: item.title,      // Movie/show title
                image: item.image,      // Poster/thumbnail URL
                href: item.url          // Link to Flixbaba item page
            });
        });
        return JSON.stringify(results);
    } catch (error) {
        console.log('Search error:', error);
        return JSON.stringify([]);
    }
}
