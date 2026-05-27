#!/usr/bin/env python3
import xml.etree.ElementTree as ET
import json
import re
import urllib.request
import sys

RSS_URL = "https://letterboxd.com/sav1tr/rss/"
NS = {
    "letterboxd": "https://letterboxd.com",
    "tmdb": "https://themoviedb.org",
}

def parse_rating(raw):
    if raw is None:
        return None
    try:
        return float(raw)
    except ValueError:
        return None

def extract_poster_and_review(description_html):
    poster_url = None
    review = ""
    img_match = re.search(r'<img\s+src="([^"]+)"', description_html)
    if img_match:
        poster_url = img_match.group(1)
    text = re.sub(r'<img[^>]*>', '', description_html)
    text = re.sub(r'<p>Watched on.*?</p>', '', text)
    text = re.sub(r'<p><em>This review may contain spoilers\.</em></p>', '', text)
    paragraphs = re.findall(r'<p>(.*?)</p>', text, re.DOTALL)
    parts = []
    for p in paragraphs:
        clean = re.sub(r'<br\s*/?>', '\n', p)
        clean = re.sub(r'<[^>]+>', '', clean)
        clean = clean.strip()
        if clean:
            parts.append(clean)
    review = '\n'.join(parts)
    return poster_url, review

def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "data/letterboxd.json"

    req = urllib.request.Request(RSS_URL, headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req)
    xml_data = resp.read()
    root = ET.fromstring(xml_data)

    films = []
    for item in root.findall(".//item"):
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")

        film_title = item.find("letterboxd:filmTitle", NS)
        film_year = item.find("letterboxd:filmYear", NS)
        rating_el = item.find("letterboxd:memberRating", NS)
        watched_el = item.find("letterboxd:watchedDate", NS)
        rewatch_el = item.find("letterboxd:rewatch", NS)
        like_el = item.find("letterboxd:memberLike", NS)
        tmdb_el = item.find("tmdb:movieId", NS)

        description = desc_el.text if desc_el is not None and desc_el.text else ""
        poster_url, review = extract_poster_and_review(description)

        film = {
            "title": film_title.text if film_title is not None else "",
            "year": int(film_year.text) if film_year is not None else None,
            "rating": parse_rating(rating_el.text if rating_el is not None else None),
            "watched": watched_el.text if watched_el is not None else "",
            "rewatch": rewatch_el.text == "Yes" if rewatch_el is not None else False,
            "liked": like_el.text == "Yes" if like_el is not None else False,
            "poster": poster_url,
            "review": review,
            "link": link_el.text if link_el is not None else "",
            "tmdb_id": int(tmdb_el.text) if tmdb_el is not None else None,
        }
        films.append(film)

    films.sort(key=lambda f: f["watched"], reverse=True)

    with open(out_path, "w") as f:
        json.dump(films, f, indent=2)

    print(f"Fetched {len(films)} films → {out_path}")

if __name__ == "__main__":
    main()
