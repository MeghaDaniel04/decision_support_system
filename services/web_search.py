
import httpx


async def _ddg_search(query: str, max_results: int = 5):
    """Lightweight DuckDuckGo instant-answer + HTML scrape."""
    snippets = []
    try:
        url = f"https://api.duckduckgo.com/?q={httpx.QueryParams({'q': query})}&format=json&no_redirect=1&no_html=1"
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            data = r.json()
        if data.get("AbstractText"):
            snippets.append(data["AbstractText"])
        for t in data.get("RelatedTopics", [])[:max_results]:
            txt = t.get("Text") or t.get("FirstURL", "")
            if txt:
                snippets.append(txt[:300])
    except Exception:
        pass
    return snippets
