/**
 * Unified feed — bento/masonry activity wall.
 *
 * Pulls everything from a single Cloudflare Worker, caches to localStorage
 * for instant repeat visits, and incrementally syncs deltas on each load.
 * Filter chips are a pure client-side operation over the cached set.
 */
(function () {
  "use strict";

  var API = window.FEED_API || "https://feed.shubhxms.workers.dev";
  var CACHE_KEY = "ss_feed";
  var root = document.getElementById("feed-root");
  if (!root) return;

  var cache = null;
  var activeFilter = "all";
  var hasRendered = false;

  /* ------------------------------------------------------------------ *
   * Cache
   * ------------------------------------------------------------------ */

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.ts !== "number" || !parsed.items) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      /* storage full or unavailable — cache lives in memory only */
    }
  }

  function mergeDelta(data) {
    if (!cache) cache = { ts: 0, items: {} };
    if (!cache.items) cache.items = {};
    if (data && data.items) {
      data.items.forEach(function (item) {
        if (!item || item.id == null) return;
        if (item.deleted) {
          delete cache.items[item.id];
        } else {
          cache.items[item.id] = item;
        }
      });
    }
    if (data && data.ts) cache.ts = data.ts;
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function fmtDate(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    var diff = Date.now() - ts;
    var day = 86400000;
    if (diff < 3600000) return Math.max(1, Math.round(diff / 60000)) + "m";
    if (diff < day) return Math.round(diff / 3600000) + "h";
    if (diff < 7 * day) return Math.round(diff / day) + "d";
    var s = MONTHS[d.getMonth()] + " " + d.getDate();
    if (d.getFullYear() !== new Date().getFullYear())
      s += " '" + String(d.getFullYear()).slice(2);
    return s;
  }

  function ratingDots(rating) {
    if (!rating || rating <= 0) return "";
    var full = Math.floor(rating);
    var half = rating - full >= 0.5;
    var out = "";
    for (var i = 0; i < full && i < 5; i++) out += "\u25CF";      /* ● */
    if (half && full < 5) out += "\u25D0";                         /* ◐ */
    for (var j = full + (half ? 1 : 0); j < 5; j++) out += "\u25CB"; /* ○ */
    return out;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return ""; }
  }

  /** Defensive sanitisation — worker output is pre-cleaned, but strip
   *  <script> and inline event handlers as belt-and-suspenders. */
  function sanitize(html) {
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
      .replace(/javascript:/gi, "");
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------------ *
   * Tile builders
   * ------------------------------------------------------------------ */

  function buildWatched(item) {
    var tile = el("article", "tile tile-watched");

    var link = el("a", "tile-link");
    if (item.url) { link.href = item.url; link.target = "_blank"; link.rel = "noopener"; }

    if (item.poster) {
      var poster = el("div", "tile-poster");
      var img = el("img");
      img.src = item.poster;
      img.alt = item.title || "";
      img.loading = "lazy";
      poster.appendChild(img);
      link.appendChild(poster);
    }

    var meta = el("div", "tile-meta");
    meta.appendChild(el("h3", "tile-title", item.title || "Untitled"));

    var bits = [];
    var year = item.meta && item.meta.year;
    if (year) bits.push(year);
    var dateStr = fmtDate(item.occurred_at);
    if (dateStr) bits.push(dateStr);
    if (bits.length) meta.appendChild(el("div", "tile-sub", bits.join(" · ")));

    if (item.rating) {
      var r = el("div", "tile-rating");
      r.textContent = ratingDots(item.rating);
      meta.appendChild(r);
    }

    if (item.meta && item.meta.rewatch) {
      meta.appendChild(el("span", "tile-tag", "rewatch"));
    }

    link.appendChild(meta);
    tile.appendChild(link);

    if (item.body && item.body.trim()) {
      var wrap = el("div", "tile-review-wrap");
      var btn = el("button", "tile-chevron", "\u25B8 review");
      var review = el("p", "tile-review", item.body);
      review.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var open = !review.hidden;
        review.hidden = open;
        btn.textContent = open ? "\u25B8 review" : "\u25BE review";
        btn.setAttribute("aria-expanded", String(!open));
      });
      wrap.appendChild(btn);
      wrap.appendChild(review);
      tile.appendChild(wrap);
    }

    return tile;
  }

  function buildSaved(item) {
    var tile = el("article", "tile tile-saved");
    var fav = item.meta && item.meta.favorite;
    if (fav) tile.classList.add("tile-favorite");

    var link = el("a", "tile-link");
    if (item.url) { link.href = item.url; link.target = "_blank"; link.rel = "noopener"; }

    var head = el("div", "tile-bookmark-head");
    var host = hostOf(item.url);
    if (host) {
      var favIcon = el("img", "tile-favicon");
      favIcon.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=64";
      favIcon.alt = "";
      favIcon.loading = "lazy";
      favIcon.width = 16;
      favIcon.height = 16;
      head.appendChild(favIcon);
    }
    head.appendChild(el("h3", "tile-title", item.title || "Untitled"));
    if (fav) head.appendChild(el("span", "tile-star", "\u2605"));
    link.appendChild(head);

    if (item.body && item.body.trim()) {
      link.appendChild(el("p", "tile-snippet", item.body));
    }

    var foot = el("div", "tile-domain");
    foot.textContent = [host, fmtDate(item.occurred_at)].filter(Boolean).join(" · ");
    link.appendChild(foot);

    tile.appendChild(link);
    return tile;
  }

  function buildDrop(item) {
    var tile = el("article", "tile tile-drop");

    if (item.html) {
      var content = el("div", "tile-drop-text");
      content.innerHTML = sanitize(item.html);
      tile.appendChild(content);
    } else if (item.body) {
      tile.appendChild(el("p", "tile-drop-text", item.body));
    }

    if (item.media && item.media.length) {
      item.media.forEach(function (m) {
        if (m.type === "photo" && m.url) {
          var img = el("img", "tile-drop-img");
          img.src = m.url;
          img.loading = "lazy";
          img.alt = "";
          if (m.width) img.width = m.width;
          if (m.height) img.height = m.height;
          tile.appendChild(img);
        }
      });
    }

    if (item.meta && item.meta.preview && item.meta.preview.url) {
      var pv = item.meta.preview;
      var card = el("a", "tile-preview");
      card.href = pv.url;
      card.target = "_blank";
      card.rel = "noopener";

      if (pv.image) {
        var pi = el("img", "tile-preview-img");
        pi.src = pv.image;
        pi.loading = "lazy";
        pi.alt = "";
        card.appendChild(pi);
      }

      var text = el("div", "tile-preview-text");
      if (pv.title) text.appendChild(el("span", "tile-preview-title", pv.title));
      if (pv.description) text.appendChild(el("span", "tile-preview-desc", pv.description));
      if (pv.site) text.appendChild(el("span", "tile-preview-domain", pv.site));
      card.appendChild(text);
      tile.appendChild(card);
    }

    var date = el("div", "tile-date", fmtDate(item.occurred_at));
    tile.appendChild(date);

    return tile;
  }

  function buildTile(item) {
    if (item.source === "letterboxd") return buildWatched(item);
    if (item.source === "curius") return buildSaved(item);
    if (item.source === "telegram") return buildDrop(item);
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */

  var FILTER_MAP = {
    all: null,
    watched: "letterboxd",
    reading: "curius",
    drops: "telegram",
  };

  function allItems() {
    if (!cache || !cache.items) return [];
    return Object.keys(cache.items)
      .map(function (id) { return cache.items[id]; })
      .filter(function (item) { return !item.deleted; })
      .sort(function (a, b) { return (b.occurred_at || 0) - (a.occurred_at || 0); });
  }

  function filteredItems() {
    var items = allItems();
    var want = FILTER_MAP[activeFilter];
    if (!want) return items;
    return items.filter(function (item) { return item.source === want; });
  }

  function buildFilters(total) {
    var items = allItems();
    var counts = {
      all: items.length,
      watched: items.filter(function (i) { return i.source === "letterboxd"; }).length,
      reading: items.filter(function (i) { return i.source === "curius"; }).length,
      drops: items.filter(function (i) { return i.source === "telegram"; }).length,
    };
    var bar = el("div", "feed-filters");
    bar.setAttribute("role", "tablist");
    [["all","All"],["watched","Watched"],["reading","Reading"],["drops","Drops"]].forEach(function (f) {
      var key = f[0], label = f[1];
      var btn = el("button", "feed-filter");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(activeFilter === key));
      if (activeFilter === key) btn.classList.add("active");
      btn.appendChild(document.createTextNode(label + " "));
      var c = el("span", "feed-filter-count", String(counts[key]));
      btn.appendChild(c);
      btn.addEventListener("click", function () {
        activeFilter = key;
        render();
      });
      bar.appendChild(btn);
    });
    return bar;
  }

  function buildFooter(count) {
    var foot = el("div", "feed-footer");
    foot.appendChild(el("span", "feed-count", "\u2014 " + count + " item" + (count === 1 ? "" : "s")));
    var btn = el("button", "feed-refresh", "resync");
    btn.type = "button";
    btn.title = "Clear cache and re-fetch everything";
    btn.addEventListener("click", function () {
      cache = null;
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      hasRendered = false;
      showLoading();
      doFetch(true);
    });
    foot.appendChild(btn);
    return foot;
  }

  function render() {
    hasRendered = true;
    var items = filteredItems();
    root.innerHTML = "";
    root.appendChild(buildFilters());

    var grid = el("div");
    grid.className = "feed-grid";
    grid.id = "feed-grid";

    if (items.length === 0) {
      grid.appendChild(el("div", "feed-empty", "Nothing here yet."));
    } else {
      var frag = document.createDocumentFragment();
      items.forEach(function (item) {
        var tile = buildTile(item);
        if (tile) frag.appendChild(tile);
      });
      grid.appendChild(frag);
    }

    root.appendChild(grid);
    root.appendChild(buildFooter(items.length));
  }

  /* ------------------------------------------------------------------ *
   * States
   * ------------------------------------------------------------------ */

  function showLoading() {
    root.innerHTML = "";
    root.appendChild(el("div", "feed-loading", "loading\u2026"));
  }

  function showError() {
    root.innerHTML = "";
    var box = el("div", "feed-error");
    box.appendChild(document.createTextNode("Could not load the feed. "));
    var btn = el("button", "feed-retry", "retry");
    btn.type = "button";
    btn.addEventListener("click", function () {
      showLoading();
      doFetch(!cache);
    });
    box.appendChild(btn);
    root.appendChild(box);
  }

  /* ------------------------------------------------------------------ *
   * Fetch
   * ------------------------------------------------------------------ */

  function doFetch(forceFull) {
    var url = API + "/feed";
    if (!forceFull && cache && cache.ts) url += "?ts=" + cache.ts;

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) {
        mergeDelta(data);
        saveCache();
        render();
      })
      .catch(function () {
        /* Never wipe the page on fetch failure — keep the cached render.
           If nothing has rendered yet, show the error state. */
        if (!hasRendered) showError();
      });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  cache = loadCache();

  if (cache && Object.keys(cache.items).length) {
    render();                 /* instant first paint from cache */
    doFetch(false);           /* delta sync in background */
  } else {
    showLoading();
    doFetch(true);            /* no cache — full fetch */
  }
})();
