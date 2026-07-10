/**
 * Unified feed — masonry activity wall.
 *
 * Pulls everything from a single Cloudflare Worker (FEED_API), caches to
 * localStorage for instant repeat visits, and incrementally syncs deltas
 * (keyed on updated_at). Filters are a pure client-side operation over the
 * cached set. Tiles are absolutely positioned by a shortest-column masonry
 * pass so there are never any gaps. Long content (reviews, full drops,
 * snippets) opens in a fixed central detail panel.
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
  var gridEl = null;

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
        if (item.deleted) delete cache.items[item.id];
        else cache.items[item.id] = item;
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
    if (d.getFullYear() !== new Date().getFullYear()) s += " '" + String(d.getFullYear()).slice(2);
    return s;
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function timeOf(ts) { var d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function stampFor(it) {
    var d = fmtDate(it.occurred_at);
    return it.source === "telegram" ? d + " · " + timeOf(it.occurred_at) : d;
  }

  function ratingDots(rating) {
    if (!rating || rating <= 0) return "";
    var full = Math.floor(rating);
    var half = rating - full >= 0.5;
    var out = "";
    for (var i = 0; i < full && i < 5; i++) out += "\u25CF";        /* ● */
    if (half && full < 5) out += "\u25D0";                           /* ◐ */
    return out;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return ""; }
  }

  /** Belt-and-suspenders: worker output is pre-cleaned, but strip scripts
   *  and inline event handlers regardless. */
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
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* masonry column span — wide quotes / long drops take 2 columns */
  function spanOf(it) {
    if (it.source === "telegram") {
      var h = it.html || "";
      if (h.length > 320 || /<blockquote/i.test(h)) return 2;
    }
    return 1;
  }

  /* ------------------------------------------------------------------ *
   * Tile builders
   * ------------------------------------------------------------------ */
  function buildTile(it) {
    var tile = el("article", "fd-t");
    tile.dataset.span = String(spanOf(it));
    tile.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openPanel(it, tile);
    });
    if (it.source === "letterboxd") fillFilm(it, tile);
    else if (it.source === "telegram") fillDrop(it, tile);
    else if (it.source === "curius") fillLink(it, tile);
    else return null;
    return tile;
  }

  function fillFilm(it, tile) {
    tile.className += " fd-film";
    if (it.body && String(it.body).trim()) tile.className += " has-review";
    var p = el("div", "fd-poster");
    var img = el("img");
    img.src = it.poster || "";
    img.alt = it.title || "";
    img.loading = "lazy";
    p.appendChild(img);
    tile.appendChild(p);
    tile.appendChild(el("span", "fd-fts", fmtDate(it.occurred_at)));
    var cap = el("div", "fd-cap");
    cap.appendChild(el("span", "fd-ti", it.title || "Untitled"));
    if (it.meta && it.meta.year) cap.appendChild(el("span", "fd-yr", String(it.meta.year)));
    if (it.rating) cap.appendChild(el("span", "fd-dots", ratingDots(it.rating)));
    tile.appendChild(cap);
  }

  function fillDrop(it, tile) {
    tile.className += " fd-drop";
    var html = it.html;
    var bodyOnly = !html && it.body;
    if (/<blockquote/i.test(html || "")) tile.className += " fd-quote";
    if (spanOf(it) === 2) tile.className += " fd-wide";

    var dh = el("div", "fd-dh");
    dh.appendChild(el("span", "fd-ts", stampFor(it)));
    tile.appendChild(dh);

    var body = el("div", "fd-body");
    if (html) body.innerHTML = sanitize(html);
    else if (it.body) body.textContent = it.body;
    tile.appendChild(body);

    if (it.media && it.media.length) {
      it.media.forEach(function (m) {
        if (m.type === "photo" && m.url) {
          var pi = el("img", "fd-photo");
          pi.src = m.url; pi.loading = "lazy"; pi.alt = "";
          pi.style.aspectRatio = (m.width && m.height) ? (m.width + "/" + m.height) : "4/3";
          body.appendChild(pi);
        }
      });
    }

    var pv = it.meta && it.meta.preview;
    if (pv && pv.url) {
      var og = el("a", "fd-og");
      og.href = pv.url; og.target = "_blank"; og.rel = "noopener";
      if (pv.image) {
        var i = el("img"); i.src = pv.image; i.loading = "lazy"; i.alt = "";
        og.appendChild(i);
      }
      var t = el("span");
      t.appendChild(el("span", "fd-ot", pv.title || hostOf(pv.url)));
      t.appendChild(el("span", "fd-od", pv.site || hostOf(pv.url)));
      og.appendChild(t);
      tile.appendChild(og);
    }
  }

  function fillLink(it, tile) {
    tile.className += " fd-link";
    var fav = it.meta && it.meta.favorite;
    if (fav) tile.className += " fd-fav-tile";
    var host = hostOf(it.url);

    var favi = el("img", "fd-fav");
    favi.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=64";
    favi.alt = ""; favi.loading = "lazy";
    tile.appendChild(favi);

    var lx = el("div", "fd-lx");
    lx.appendChild(el("div", "fd-lt", it.title || "Untitled"));
    var bits = [host];
    if (it.meta && it.meta.toRead) bits.push("to read");
    bits.push(fmtDate(it.occurred_at));
    lx.appendChild(el("div", "fd-ld", bits.filter(Boolean).join(" · ")));
    tile.appendChild(lx);

    if (fav) tile.appendChild(el("span", "fd-star", "\u2605"));
  }

  /* ------------------------------------------------------------------ *
   * Central detail panel
   * ------------------------------------------------------------------ */
  var panel = document.getElementById("fd-panel");
  var pin = panel ? panel.querySelector(".fd-pin") : null;
  var activeTile = null;
  var openY = null;

  function panelHTML(it) {
    var pv = it.meta && it.meta.preview;
    var openUrl = it.url || (pv && pv.url) || "";
    var ob = openUrl ? '<a class="fd-open-top" href="' + esc(openUrl) + '" target="_blank" rel="noopener" title="open in new tab">open ↗</a>' : '';
    if (it.source === "letterboxd") {
      return ob + '<span class="fd-src">watched</span>' +
        '<div class="fd-filmhead">' +
          (it.poster ? '<img class="fd-pposter" src="' + esc(it.poster) + '" alt="' + esc(it.title) + '">' : '') +
          '<div class="fd-ph">' +
            '<div class="fd-pt">' + esc(it.title) + '</div>' +
            (it.meta && it.meta.year ? '<div class="fd-sub">' + esc(it.meta.year) + '</div>' : '') +
            (it.rating ? '<div class="fd-stars">' + ratingDots(it.rating) + ' <span style="color:var(--text-secondary);font-family:Space Mono,monospace;font-size:.7rem;margin-left:.4em">' + Number(it.rating).toFixed(1) + '/5</span></div>' : '') +
            (it.meta && it.meta.rewatch ? '<div class="fd-sub">rewatch</div>' : '') +
          '</div>' +
        '</div>' +
        (it.body && String(it.body).trim() ? '<p class="fd-review">' + esc(it.body) + '</p>' : '') +
        '<span class="fd-when">Watched ' + esc(stampFor(it)) + '</span>';
    }
    if (it.source === "telegram") {
      return ob + '<span class="fd-src">drop</span>' +
        '<div class="fd-dropbody">' + sanitize(it.html || ("<p>" + esc(it.body) + "</p>")) + '</div>' +
        (pv && pv.url ? '<a class="fd-pog" href="' + esc(pv.url) + '" target="_blank" rel="noopener">' +
          (pv.image ? '<img src="' + esc(pv.image) + '" alt="">' : '') +
          '<span><span style="font-family:et-book,serif;font-weight:600;display:block">' + esc(pv.title || hostOf(pv.url)) + '</span>' +
          (pv.description ? '<span class="fd-sub">' + esc(pv.description) + '</span>' : '') +
          '<span class="fd-sub">' + esc(pv.site || hostOf(pv.url)) + '</span></span></a>' : '') +
        '<span class="fd-when">' + esc(stampFor(it)) + '</span>';
    }
    /* curius */
    return ob + '<span class="fd-src">saved' + (it.meta && it.meta.favorite ? ' · favorite' : '') + (it.meta && it.meta.toRead ? ' · to read' : '') + '</span>' +
      '<div class="fd-pt">' + esc(it.title) + '</div>' +
      (it.url ? '<div class="fd-sub">' + esc(hostOf(it.url)) + '</div>' : '') +
      (it.body ? '<p class="fd-snip">' + esc(it.body) + '</p>' : '') +
      '<span class="fd-when">Saved ' + esc(fmtDate(it.occurred_at)) + '</span>';
  }

  function openPanel(it, tile) {
    if (!panel || !pin) return;
    if (activeTile === tile) { closePanel(); return; }
    if (activeTile) activeTile.classList.remove("fd-open");
    pin.innerHTML = panelHTML(it);
    panel.classList.add("fd-show");
    panel.setAttribute("aria-hidden", "false");
    activeTile = tile;
    tile.classList.add("fd-open");
    openY = window.scrollY;
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove("fd-show");
    panel.setAttribute("aria-hidden", "true");
    if (activeTile) { activeTile.classList.remove("fd-open"); activeTile = null; }
    openY = null;
  }

  if (panel) {
    var xb = panel.querySelector(".fd-x");
    if (xb) xb.addEventListener("click", closePanel);
    document.addEventListener("click", function (e) {
      if (panel.contains(e.target)) return;
      if (e.target.closest(".fd-t")) return;
      closePanel();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
    window.addEventListener("scroll", function () {
      if (openY != null && Math.abs(window.scrollY - openY) > window.innerHeight * 0.6) closePanel();
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Masonry — fixed columns, place each tile in the shortest column
   * ------------------------------------------------------------------ */
  var COL_GAP = 18;
  var COL_TARGET = 235;

  function layout() {
    if (!gridEl) return;
    var W = gridEl.clientWidth;
    if (!W) return;
    var cols = W < 520 ? 1 : Math.max(2, Math.min(5, Math.round((W + COL_GAP) / (COL_TARGET + COL_GAP))));
    var cw = (W - (cols - 1) * COL_GAP) / cols;
    var bottoms = new Array(cols).fill(0);
    var kids = gridEl.children;
    for (var i = 0; i < kids.length; i++) {
      var t = kids[i];
      if (!t.dataset || !t.dataset.span) continue; /* skip the empty-state node */
      var span = Math.min(+t.dataset.span || 1, cols);
      var w = span * cw + (span - 1) * COL_GAP;
      t.style.width = w + "px";
      var bestX = 0, bestTop = Infinity;
      for (var x = 0; x <= cols - span; x++) {
        var top = Math.max.apply(null, bottoms.slice(x, x + span));
        if (top < bestTop) { bestTop = top; bestX = x; }
      }
      t.style.left = (bestX * (cw + COL_GAP)) + "px";
      t.style.top = bestTop + "px";
      var h = t.offsetHeight; /* films: aspect-ratio 2/3; photos: set aspect */
      for (var k = bestX; k < bestX + span; k++) bottoms[k] = bestTop + h + COL_GAP;
    }
    gridEl.style.height = Math.max.apply(null, bottoms) + "px";
  }

  /* ------------------------------------------------------------------ *
   * Render + filters
   * ------------------------------------------------------------------ */
  var FILTER_MAP = { all: null, watched: "letterboxd", reading: "curius", drops: "telegram" };

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
    return want ? items.filter(function (i) { return i.source === want; }) : items;
  }

  function buildFilters() {
    var items = allItems();
    var counts = {
      all: items.length,
      watched: items.filter(function (i) { return i.source === "letterboxd"; }).length,
      reading: items.filter(function (i) { return i.source === "curius"; }).length,
      drops: items.filter(function (i) { return i.source === "telegram"; }).length
    };
    var bar = el("div", "fd-filters");
    [["all","All"],["watched","Watched"],["reading","Reading"],["drops","Drops"]].forEach(function (f) {
      var btn = el("button", "fd-filter" + (activeFilter === f[0] ? " on" : ""));
      btn.type = "button";
      btn.appendChild(document.createTextNode(f[1] + " "));
      btn.appendChild(el("span", "fd-filter-count", String(counts[f[0]])));
      btn.addEventListener("click", function () { activeFilter = f[0]; render(); });
      bar.appendChild(btn);
    });
    return bar;
  }

  function buildFooter(count) {
    var foot = el("div", "fd-footer");
    foot.appendChild(el("span", "fd-count", "\u2014 " + count + " item" + (count === 1 ? "" : "s")));
    var btn = el("button", "fd-refresh", "resync");
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

    gridEl = el("div", "fd-grid");
    if (items.length === 0) {
      gridEl.appendChild(el("div", "fd-empty", "Nothing here yet."));
    } else {
      var frag = document.createDocumentFragment();
      items.forEach(function (it) {
        var tile = buildTile(it);
        if (tile) frag.appendChild(tile);
      });
      gridEl.appendChild(frag);
    }
    root.appendChild(gridEl);
    root.appendChild(buildFooter(items.length));

    requestAnimationFrame(layout);
    setTimeout(layout, 250); /* re-measure after fonts/images settle */
  }

  /* ------------------------------------------------------------------ *
   * States + fetch
   * ------------------------------------------------------------------ */
  function showLoading() { root.innerHTML = ""; root.appendChild(el("div", "fd-loading", "loading\u2026")); }

  function showError() {
    root.innerHTML = "";
    var box = el("div", "fd-error");
    box.appendChild(document.createTextNode("Could not load the feed. "));
    var btn = el("button", "fd-retry", "retry");
    btn.type = "button";
    btn.addEventListener("click", function () { showLoading(); doFetch(!cache); });
    box.appendChild(btn);
    root.appendChild(box);
  }

  function doFetch(forceFull) {
    var url = API + "/feed";
    if (!forceFull && cache && cache.ts) url += "?ts=" + cache.ts;
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { mergeDelta(data); saveCache(); render(); })
      .catch(function () { if (!hasRendered) showError(); });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  cache = loadCache();

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
  window.addEventListener("load", function () { requestAnimationFrame(layout); });

  if (cache && Object.keys(cache.items).length) {
    render();        /* instant first paint from cache */
    doFetch(false);  /* delta sync in background */
  } else {
    showLoading();
    doFetch(true);   /* no cache — full fetch */
  }
})();
