import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any
import yfinance as yf

# In-memory TTL cache for news (10 minutes)
_NEWS_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 600


def _time_ago(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        mins = int(seconds // 60)
        return f"{mins}m ago"
    elif seconds < 86400:
        hrs = int(seconds // 3600)
        return f"{hrs}h ago"
    elif seconds < 604800:
        days = int(seconds // 86400)
        return f"{days}d ago"
    else:
        return dt.strftime("%d %b %Y")


def _clean_text(text: str) -> str:
    if not text:
        return ""
    # Basic cleaning
    text = text.replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'")
    text = text.replace("&lt;", "<").replace("&gt;", ">")
    return text.strip()


def _fetch_yfinance_news(ticker: str) -> List[Dict[str, Any]]:
    articles = []
    try:
        stock = yf.Ticker(ticker)
        raw_news = stock.news or []
        for item in raw_news:
            title = _clean_text(item.get("title", ""))
            if not title:
                continue

            pub_time = item.get("providerPublishTime")
            if pub_time:
                dt = datetime.fromtimestamp(pub_time, tz=timezone.utc)
            else:
                dt = datetime.now(timezone.utc)

            link = item.get("link", "")
            publisher = item.get("publisher", "Financial Media")
            
            # Extract thumbnail if present
            thumb_url = ""
            thumbnails = item.get("thumbnail", {})
            if thumbnails and isinstance(thumbnails, dict):
                resolutions = thumbnails.get("resolutions", [])
                if resolutions and isinstance(resolutions, list):
                    thumb_url = resolutions[0].get("url", "")

            articles.append({
                "id": str(item.get("uuid", item.get("id", len(articles)))),
                "title": title,
                "publisher": publisher,
                "url": link,
                "published_at": dt.isoformat(),
                "relative_time": _time_ago(dt),
                "summary": title,
                "thumbnail": thumb_url,
                "source": "yfinance",
            })
    except Exception as e:
        print(f"Error fetching yfinance news for {ticker}: {e}")
    return articles


def _fetch_rss_news(query: str, max_items: int = 8) -> List[Dict[str, Any]]:
    articles = []
    try:
        clean_q = query.replace(".NS", "").replace(".BO", "") + " stock India"
        encoded_q = urllib.parse.quote(clean_q)
        rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-IN&gl=IN&ceid=IN:en"

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        req = urllib.request.Request(rss_url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as response:
            content = response.read()

        root = ET.fromstring(content)
        channel = root.find("channel")
        if channel is not None:
            for item in channel.findall("item")[:max_items]:
                title_elem = item.find("title")
                link_elem = item.find("link")
                pub_date_elem = item.find("pubDate")
                source_elem = item.find("source")

                raw_title = title_elem.text if title_elem is not None else ""
                url = link_elem.text if link_elem is not None else ""
                pub_date_str = pub_date_elem.text if pub_date_elem is not None else ""
                publisher = source_elem.text if source_elem is not None else "Google News"

                if not raw_title:
                    continue

                # Parse date
                try:
                    # e.g. "Tue, 25 Aug 2026 05:40:00 GMT"
                    dt = datetime.strptime(pub_date_str[:25], "%a, %d %b %Y %H:%M:%S").replace(tzinfo=timezone.utc)
                except Exception:
                    dt = datetime.now(timezone.utc)

                articles.append({
                    "id": f"rss-{abs(hash(url))}",
                    "title": _clean_text(raw_title),
                    "publisher": _clean_text(publisher),
                    "url": url,
                    "published_at": dt.isoformat(),
                    "relative_time": _time_ago(dt),
                    "summary": _clean_text(raw_title),
                    "thumbnail": "",
                    "source": "google_news",
                })
    except Exception as e:
        print(f"Error fetching RSS news for {query}: {e}")
    return articles


def get_live_stock_news(ticker: str, company_name: str = "") -> List[Dict[str, Any]]:
    """
    Fetches real-time market news from Yahoo Finance & Google News RSS with 10-minute caching.
    """
    now = time.time()
    cache_key = ticker.upper()

    if cache_key in _NEWS_CACHE:
        cached = _NEWS_CACHE[cache_key]
        if now - cached["timestamp"] < CACHE_TTL_SECONDS:
            return cached["data"]

    # 1. Pull yfinance news
    news = _fetch_yfinance_news(ticker)

    # 2. If yfinance has fewer than 5 items, supplement with Google News RSS
    if len(news) < 5:
        search_term = company_name if company_name else ticker
        rss_news = _fetch_rss_news(search_term, max_items=10 - len(news))
        # Deduplicate by title
        seen_titles = {n["title"].lower() for n in news}
        for item in rss_news:
            if item["title"].lower() not in seen_titles:
                news.append(item)
                seen_titles.add(item["title"].lower())

    # Sort latest first
    news.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    _NEWS_CACHE[cache_key] = {
        "timestamp": now,
        "data": news,
    }

    return news
