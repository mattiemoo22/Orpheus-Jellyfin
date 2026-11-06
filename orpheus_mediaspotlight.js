/*
 * My Media Bar - a self-contained, Netflix-style featured-content hero for the Jellyfin home page.
 *
 * Written from scratch (not a copy of the Media Bar plugin). One file, no dependencies.
 * Its own CSS is injected by this script, so nothing needs adding to Custom CSS.
 *
 * Auto-advance is driven purely by JavaScript timers (no CSS animation events involved).
 *
 * Optional settings: define window.MyMediaBarConfig BEFORE this script loads, e.g.
 *   window.MyMediaBarConfig = { intervalMs: 6000, itemCount: 10, headerOverlayPx: 70 };
 */
(function () {
  'use strict';
  if (window.__myMediaBarLoaded) return;
  window.__myMediaBarLoaded = true;

  var DEFAULTS = {
    intervalMs: 6000,          // time each slide stays on screen
    itemCount: 6,              // how many slides
    itemTypes: 'Movie,Series', // e.g. 'Movie', 'Series', 'Movie,Series'
    random: true,              // true = random picks, false = newest first
    pauseOnHover: true,        // pause while the mouse is over the bar (mouse devices only)
    refreshMinutes: 30,        // reload the item list after this long
    hostSelector: '',          // advanced: CSS selector of the element to insert the bar into
    headerOverlayPx: '',       // e.g. 70 -> pulls the bar up under a transparent header (leave '' for none)
    bleedX: '',                // e.g. '-3.3%' -> cancels side padding of the host so the bar is full width
    debug: false               // log extra info to the browser console
  };
  var CFG = Object.assign({}, DEFAULTS, window.MyMediaBarConfig || {});

  var LOG = '[MyMediaBar]';
  function log() {
    if (!CFG.debug) return;
    var a = Array.prototype.slice.call(arguments);
    a.unshift(LOG);
    console.log.apply(console, a);
  }
  var warned = {};
  function warnOnce(key, msg) {
    if (warned[key]) return;
    warned[key] = true;
    console.warn(LOG, msg);
  }

  /* ------------------------------------------------------------------ styles */
  var CSS = `
.mmb {
  --mmb-bg: #101010;
  --mmb-pad-x: clamp(24px, 3.3vw, 64px);
  --mmb-pad-bottom: clamp(28px, 5vh, 60px);
  --mmb-pull: 0px;
  --mmb-bleed-x: 0px;
  --mmb-overlap: clamp(160px, 26vh, 300px); /* how far the banner runs behind the section below */

  position: relative;
  z-index: 0;
  width: auto;
  height: calc(clamp(460px, 64vh, 820px) + var(--mmb-overlap));
  margin: calc(-1 * var(--mmb-pull)) var(--mmb-bleed-x) calc(-1 * var(--mmb-overlap));
  overflow: hidden;
  isolation: isolate;
  background: var(--mmb-bg);
  color: #fff;
  box-sizing: border-box;
  outline: none;
  -webkit-user-select: none;
  user-select: none;
}
.mmb *, .mmb *::before, .mmb *::after { box-sizing: border-box; }
/* everything after the bar (My Media tiles etc.) draws on top of the banner */
.mmb ~ * { position: relative; z-index: 1; }

.mmb-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .9s ease, visibility 0s linear .9s;
}
.mmb-slide.is-active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  z-index: 1;
  transition: opacity .9s ease, visibility 0s linear 0s;
}

.mmb-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  transform: scale(1.05);
  transition: transform 10s ease-out;
}
.mmb-slide.is-active .mmb-backdrop { transform: scale(1); }

.mmb-slide::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(16,16,16,.75) 0%, rgba(16,16,16,0) 20%),
    linear-gradient(to right, rgba(16,16,16,.88) 0%, rgba(16,16,16,.55) 35%, rgba(16,16,16,0) 72%),
    linear-gradient(to top, #101010 0, rgba(16,16,16,.55) calc(var(--mmb-overlap) * .6), rgba(16,16,16,0) calc(var(--mmb-overlap) + 120px));
}

.mmb-content {
  position: absolute;
  z-index: 2;
  left: var(--mmb-pad-x);
  bottom: calc(var(--mmb-pad-bottom) + var(--mmb-overlap));
  max-width: min(46vw, 760px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: .9rem;
  text-shadow: 0 1px 8px rgba(0,0,0,.6);
  opacity: 0;
  transform: translateY(14px);
  transition: opacity .7s ease, transform .7s ease;
}
.mmb-slide.is-active .mmb-content {
  opacity: 1;
  transform: none;
  transition-delay: .25s;
}

.mmb-logo {
  display: block;
  width: auto;
  height: auto;
  max-width: min(100%, 520px);
  max-height: clamp(90px, 22vh, 220px);
  object-fit: contain;
  object-position: left bottom;
  filter: drop-shadow(0 2px 14px rgba(0,0,0,.5));
}
.mmb-title {
  margin: 0;
  font-size: clamp(2rem, 4.2vw, 4rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -.01em;
}

.mmb-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem 1rem;
  font-size: 1.05rem;
  font-weight: 500;
  line-height: 1.2;
}
.mmb-meta-item { display: inline-flex; align-items: center; gap: .35em; }
.mmb-star .mmb-icon { color: #ffc107; }
.mmb-icon { font-size: 1.15em; line-height: 1; }
.mmb-badge {
  padding: .1em .45em;
  border: 1px solid rgba(255,255,255,.65);
  border-radius: 3px;
  font-size: .8em;
  font-weight: 600;
}

.mmb-genres {
  margin: 0;
  font-size: 1rem;
  color: rgba(255,255,255,.65);
}

.mmb-overview {
  margin: 0;
  max-width: 62ch;
  font-size: 1.1rem;
  line-height: 1.5;
  color: rgba(255,255,255,.92);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.mmb-actions {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-top: .6rem;
}

.mmb-btn, .mmb-ctrl {
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font: inherit;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color .2s ease, border-color .2s ease, color .2s ease, transform .15s ease;
}
.mmb-btn:focus-visible, .mmb-ctrl:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.mmb-btn:active, .mmb-ctrl:active { transform: scale(.94); }
.mmb-btn svg, .mmb-ctrl svg { width: 22px; height: 22px; fill: currentColor; flex: none; }

.mmb-btn-play {
  height: 44px;
  padding: 0 1.5rem 0 1.25rem;
  background: #fff;
  color: #000;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: 600;
  text-shadow: none;
}
.mmb-btn-play:hover { background: rgba(255,255,255,.82); }

.mmb-btn-icon {
  width: 44px;
  height: 44px;
  border: 2px solid rgba(255,255,255,.7);
  border-radius: 50%;
  background: rgba(20,20,20,.45);
}
.mmb-btn-icon:hover { border-color: #fff; background: rgba(255,255,255,.2); }
.mmb-btn-icon.is-active { background: #fff; color: #000; border-color: #fff; }

.mmb-controls {
  position: absolute;
  z-index: 3;
  right: var(--mmb-pad-x);
  bottom: calc(var(--mmb-pad-bottom) + var(--mmb-overlap));
  height: 44px;
  display: flex;
  align-items: center;
  gap: .6rem;
}
.mmb-ctrl {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: rgba(255,255,255,.8);
}
.mmb-ctrl:hover { color: #fff; }
.mmb-ctrl-nav { border: 2px solid rgba(255,255,255,.5); }
.mmb-ctrl-nav:hover { border-color: #fff; background: rgba(255,255,255,.15); }

@media (max-width: 720px) {
  .mmb {
    --mmb-pad-bottom: 24px;
    --mmb-overlap: 110px;
    height: calc(clamp(500px, 68vh, 720px) + var(--mmb-overlap));
    height: calc(clamp(500px, 68svh, 720px) + var(--mmb-overlap));
  }
  .mmb-backdrop { object-position: center top; }

  .mmb-slide::after {
    background:
      linear-gradient(to bottom, rgba(16,16,16,.7) 0%, rgba(16,16,16,0) 22%),
      linear-gradient(to top, #101010 0%, rgba(16,16,16,.85) 22%, rgba(16,16,16,0) 62%);
  }

  .mmb-content {
    left: 0;
    right: 0;
    max-width: none;
    padding: 0 20px;
    align-items: center;
    text-align: center;
    gap: .7rem;
  }
  .mmb-logo {
    max-width: 88%;
    max-height: 24vh;
    object-position: center bottom;
  }
  .mmb-title { font-size: clamp(1.8rem, 9vw, 2.8rem); }
  .mmb-meta { justify-content: center; font-size: .95rem; gap: .35rem .8rem; }
  .mmb-genres { font-size: .95rem; }
  .mmb-overview { display: none; }
  .mmb-actions { justify-content: center; margin-top: .4rem; }

  .mmb-controls {
    top: calc(80px + env(safe-area-inset-top, 0px));
    right: 14px;
    bottom: auto;
    height: auto;
    flex-direction: column;
    align-items: center;
    gap: .25rem;
  }
  .mmb-ctrl-nav { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .mmb-slide, .mmb-slide.is-active, .mmb-backdrop, .mmb-content, .mmb-btn, .mmb-ctrl {
    transition: none !important;
    transform: none !important;
  }
}
`;

  function injectStyles() {
    if (document.getElementById('mmb-styles')) return;
    var s = document.createElement('style');
    s.id = 'mmb-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* -------------------------------------------------------------------- auth */
  function trimSlash(u) { return String(u || '').replace(/\/+$/, ''); }

  function getAuth() {
    try {
      var c = window.ApiClient;
      if (c && typeof c.accessToken === 'function' && typeof c.getCurrentUserId === 'function') {
        var token = c.accessToken();
        var userId = c.getCurrentUserId();
        var base = typeof c.serverAddress === 'function' ? c.serverAddress() : '';
        if (token && userId) return { token: token, userId: userId, base: trimSlash(base || location.origin) };
      }
    } catch (e) { log('ApiClient not usable', e); }
    try {
      var creds = JSON.parse(localStorage.getItem('jellyfin_credentials') || 'null');
      var srv = creds && creds.Servers && creds.Servers[0];
      if (srv && srv.AccessToken && srv.UserId) {
        return { token: srv.AccessToken, userId: srv.UserId, base: trimSlash(srv.ManualAddress || srv.LocalAddress || location.origin) };
      }
    } catch (e2) { log('stored credentials not usable', e2); }
    return null;
  }

  function authHeaders(auth) {
    return {
      'Authorization': 'MediaBrowser Token="' + auth.token + '"',
      'X-Emby-Token': auth.token
    };
  }

  /* ----------------------------------------------------------------- loading */
  function fetchItems(auth) {
    var p = new URLSearchParams({
      IncludeItemTypes: CFG.itemTypes,
      Recursive: 'true',
      SortBy: CFG.random ? 'Random' : 'DateCreated',
      SortOrder: 'Descending',
      Limit: String(CFG.itemCount),
      ImageTypes: 'Backdrop',
      Fields: 'Overview,Genres',
      EnableImageTypes: 'Backdrop,Logo',
      ImageTypeLimit: '1',
      EnableTotalRecordCount: 'false'
    });
    function get(url) {
      return fetch(url, { headers: authHeaders(auth) }).then(function (r) {
        if (!r.ok) throw new Error('Items request failed: HTTP ' + r.status);
        return r.json();
      });
    }
    var q = p.toString();
    return get(auth.base + '/Items?userId=' + encodeURIComponent(auth.userId) + '&' + q)
      .catch(function (e) {
        log('/Items failed, trying /Users/{id}/Items', e);
        return get(auth.base + '/Users/' + auth.userId + '/Items?' + q);
      })
      .then(function (d) { return (d && d.Items) || []; });
  }

  function imgUrl(auth, item, type, maxWidth) {
    var tag = type === 'Backdrop'
      ? (item.BackdropImageTags && item.BackdropImageTags[0])
      : (item.ImageTags && item.ImageTags.Logo);
    if (!tag) return null;
    return auth.base + '/Items/' + item.Id + '/Images/' + type + (type === 'Backdrop' ? '/0' : '') +
      '?maxWidth=' + maxWidth + '&quality=85&tag=' + encodeURIComponent(tag);
  }

  /* ----------------------------------------------------------------- actions */
  function detailsHash(item) {
    return '#/details?id=' + encodeURIComponent(item.Id) +
      (item.ServerId ? '&serverId=' + encodeURIComponent(item.ServerId) : '');
  }

  // Tries to start playback on this device through the Sessions API; falls back to the details page.
  function playItem(item) {
    var auth = getAuth();
    var deviceId = '';
    try { deviceId = window.ApiClient && ApiClient.deviceId ? ApiClient.deviceId() : ''; } catch (e) { /* ignore */ }
    if (!auth || !deviceId) { location.hash = detailsHash(item); return; }

    fetch(auth.base + '/Sessions?DeviceId=' + encodeURIComponent(deviceId), { headers: authHeaders(auth) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (list) {
        var s = list && list[0];
        if (!s || !s.Id) throw new Error('no session for this device');
        return fetch(auth.base + '/Sessions/' + s.Id + '/Playing?playCommand=PlayNow&itemIds=' + encodeURIComponent(item.Id), {
          method: 'POST',
          headers: authHeaders(auth)
        });
      })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); })
      .catch(function (e) {
        log('direct play failed, opening details instead', e);
        location.hash = detailsHash(item);
      });
  }

  function setFavorite(item, makeFav) {
    var auth = getAuth();
    if (!auth) return Promise.reject(new Error('not signed in'));
    var method = makeFav ? 'POST' : 'DELETE';
    function call(url) {
      return fetch(url, { method: method, headers: authHeaders(auth) }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json().catch(function () { return {}; });
      });
    }
    return call(auth.base + '/Users/' + auth.userId + '/FavoriteItems/' + item.Id)
      .catch(function () {
        return call(auth.base + '/UserFavoriteItems/' + item.Id + '?userId=' + encodeURIComponent(auth.userId));
      })
      .then(function () { return makeFav; });
  }

  /* ---------------------------------------------------------------- building */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ICON = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
    heart: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
    heartOn: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    prev: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    next: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
  };

  function svgIcon(d) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    s.appendChild(p);
    return s;
  }
  function setIcon(btn, d) {
    var old = btn.querySelector('svg');
    var neu = svgIcon(d);
    if (old) btn.replaceChild(neu, old); else btn.insertBefore(neu, btn.firstChild);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function metaItem(cls, iconText, text) {
    var s = el('span', 'mmb-meta-item' + (cls ? ' ' + cls : ''));
    if (iconText) s.appendChild(el('span', 'mmb-icon', iconText));
    if (text != null) s.appendChild(document.createTextNode(text));
    return s;
  }

  function formatEnds(ticks) {
    var d = new Date(Date.now() + ticks / 10000);
    var h = d.getHours(), m = d.getMinutes();
    return 'Ends at ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function buildSlide(auth, item, index) {
    var slide = el('article', 'mmb-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');

    var bgUrl = imgUrl(auth, item, 'Backdrop', 1920);
    if (bgUrl) {
      var bg = el('img', 'mmb-backdrop');
      bg.alt = '';
      bg.decoding = 'async';
      if (index > 0) bg.loading = 'lazy';
      bg.src = bgUrl;
      slide.appendChild(bg);
    }

    var content = el('div', 'mmb-content');

    var logoUrl = imgUrl(auth, item, 'Logo', 800);
    if (logoUrl) {
      var logo = el('img', 'mmb-logo');
      logo.alt = item.Name || '';
      logo.src = logoUrl;
      content.appendChild(logo);
    } else {
      content.appendChild(el('h2', 'mmb-title', item.Name || ''));
    }

    var meta = el('div', 'mmb-meta');
    if (item.CommunityRating) meta.appendChild(metaItem('mmb-star', '\u2605', Number(item.CommunityRating).toFixed(1)));
    if (item.CriticRating) meta.appendChild(metaItem('', '\uD83C\uDF45', Math.round(item.CriticRating) + '%'));
    if (item.ProductionYear) meta.appendChild(metaItem('', '', String(item.ProductionYear)));
    if (item.OfficialRating) meta.appendChild(metaItem('mmb-badge', '', item.OfficialRating));
    if (item.Type === 'Movie' && item.RunTimeTicks) {
      var ends = metaItem('mmb-ends', '', formatEnds(item.RunTimeTicks));
      ends.setAttribute('data-ticks', String(item.RunTimeTicks));
      meta.appendChild(ends);
    }
    content.appendChild(meta);

    if (item.Genres && item.Genres.length) {
      content.appendChild(el('p', 'mmb-genres', item.Genres.slice(0, 3).join(' \u00B7 ')));
    }
    if (item.Overview) content.appendChild(el('p', 'mmb-overview', item.Overview));

    var actions = el('div', 'mmb-actions');

    var play = el('button', 'mmb-btn mmb-btn-play');
    play.type = 'button';
    play.appendChild(svgIcon(ICON.play));
    play.appendChild(document.createTextNode('Play'));
    play.addEventListener('click', function () { playItem(item); });
    actions.appendChild(play);

    var info = el('a', 'mmb-btn mmb-btn-icon');
    info.href = detailsHash(item);
    info.setAttribute('aria-label', 'More info');
    info.appendChild(svgIcon(ICON.info));
    actions.appendChild(info);

    var fav = el('button', 'mmb-btn mmb-btn-icon');
    fav.type = 'button';
    fav.setAttribute('aria-label', 'Favourite');
    var isFav = !!(item.UserData && item.UserData.IsFavorite);
    function paintFav() {
      fav.classList.toggle('is-active', isFav);
      fav.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      setIcon(fav, isFav ? ICON.heartOn : ICON.heart);
    }
    paintFav();
    fav.addEventListener('click', function () {
      setFavorite(item, !isFav).then(function (state) {
        isFav = state;
        paintFav();
      }).catch(function (e) { console.warn(LOG, 'Could not change favourite:', e); });
    });
    actions.appendChild(fav);

    content.appendChild(actions);
    slide.appendChild(content);
    return slide;
  }

  /* ------------------------------------------------------------------ slider */
  function Slider(root, count) {
    var self = this;
    this.root = root;
    this.slides = Array.prototype.slice.call(root.querySelectorAll('.mmb-slide'));
    this.pauseBtn = root.querySelector('.mmb-pause');
    this.count = count;
    this.index = 0;
    this.timer = null;
    this.hovering = false;
    this.focused = false;
    this.userPaused = false;
    this.stopped = false;

    root.querySelector('.mmb-prev').addEventListener('click', function () { self.go(self.index - 1); });
    root.querySelector('.mmb-next').addEventListener('click', function () { self.go(self.index + 1); });

    this.pauseBtn.addEventListener('click', function () {
      self.userPaused = !self.userPaused;
      self.paintPause();
      if (self.userPaused) self.clear(); else self.schedule();
    });

    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (CFG.pauseOnHover && canHover) {
      root.addEventListener('mouseenter', function () { self.hovering = true; self.clear(); });
      root.addEventListener('mouseleave', function () { self.hovering = false; self.schedule(); });
    }
    // Only keyboard focus pauses; a tap/click on a button must not freeze the slideshow.
    root.addEventListener('focusin', function (e) {
      var kb = false;
      try { kb = !!(e.target && e.target.matches && e.target.matches(':focus-visible')); } catch (err) { kb = false; }
      if (kb) { self.focused = true; self.clear(); }
    });
    root.addEventListener('focusout', function () {
      if (self.focused) { self.focused = false; self.schedule(); }
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { self.go(self.index - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { self.go(self.index + 1); e.preventDefault(); }
    });

    var x0 = null, y0 = null;
    root.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null; y0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) self.go(self.index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    this.paintPause();
    this.show(0);
    this.schedule();
  }

  Slider.prototype.paintPause = function () {
    setIcon(this.pauseBtn, this.userPaused ? ICON.play : ICON.pause);
    this.pauseBtn.setAttribute('aria-label', this.userPaused ? 'Play slideshow' : 'Pause slideshow');
  };

  Slider.prototype.show = function (i) {
    var n = this.count;
    this.index = ((i % n) + n) % n;
    for (var k = 0; k < this.slides.length; k++) {
      var on = k === this.index;
      this.slides[k].classList.toggle('is-active', on);
      this.slides[k].setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    // keep the "Ends at" time current
    var ends = this.slides[this.index].querySelector('.mmb-ends');
    if (ends) {
      var t = Number(ends.getAttribute('data-ticks'));
      if (t) {
        ends.textContent = formatEnds(t);
      }
    }
    log('showing slide', this.index);
  };

  Slider.prototype.go = function (i) {
    this.show(i);
    this.schedule();
  };

  Slider.prototype.isPaused = function () {
    return this.hovering || this.focused || this.userPaused;
  };

  Slider.prototype.clear = function () {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  };

  Slider.prototype.schedule = function () {
    var self = this;
    this.clear();
    if (this.stopped || this.count < 2 || this.isPaused()) return;
    this.timer = setTimeout(function () { self.tick(); }, CFG.intervalMs);
  };

  Slider.prototype.tick = function () {
    this.timer = null;
    if (this.stopped) return;
    // Only advance when the bar is actually on screen: tab visible, home page showing.
    var onScreen = !document.hidden && this.root.isConnected && this.root.offsetParent !== null;
    if (onScreen && !this.isPaused()) {
      this.show(this.index + 1);
    }
    this.schedule(); // keep the loop alive
  };

  Slider.prototype.destroy = function () {
    this.stopped = true;
    this.clear();
  };

  /* ------------------------------------------------------------------- mount */
  var state = { root: null, slider: null, loadedAt: 0, loading: false, lastFail: 0 };

  function findHost() {
    if (CFG.hostSelector) return document.querySelector(CFG.hostSelector);
    return document.querySelector('#homeTab') ||
      document.querySelector('.homeSectionsContainer') ||
      document.querySelector('.homePage .tabContent');
  }

  function ctrlButton(cls, label, iconPath) {
    var b = el('button', 'mmb-ctrl ' + cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.appendChild(svgIcon(iconPath));
    return b;
  }

  function build(auth, items) {
    var root = el('section', 'mmb');
    root.tabIndex = 0;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'Featured');

    if (CFG.headerOverlayPx !== '' && CFG.headerOverlayPx != null) {
      root.style.setProperty('--mmb-pull', parseFloat(CFG.headerOverlayPx) + 'px');
    }
    if (CFG.bleedX !== '' && CFG.bleedX != null) {
      root.style.setProperty('--mmb-bleed-x', String(CFG.bleedX));
    }

    items.forEach(function (item, i) { root.appendChild(buildSlide(auth, item, i)); });

    var controls = el('div', 'mmb-controls');
    controls.appendChild(ctrlButton('mmb-pause', 'Pause slideshow', ICON.pause));
    controls.appendChild(ctrlButton('mmb-ctrl-nav mmb-prev', 'Previous slide', ICON.prev));
    controls.appendChild(ctrlButton('mmb-ctrl-nav mmb-next', 'Next slide', ICON.next));
    root.appendChild(controls);
    return root;
  }

  function load(host) {
    if (state.loading) return;
    var auth = getAuth();
    if (!auth) { warnOnce('auth', 'Not signed in yet, or no credentials found. Will retry.'); return; }
    state.loading = true;
    fetchItems(auth).then(function (items) {
      if (!items.length) {
        warnOnce('empty', 'No items with a backdrop image were returned, so there is nothing to show.');
        state.lastFail = Date.now();
        return;
      }
      if (state.slider) state.slider.destroy();
      if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
      injectStyles();
      var root = build(auth, items);
      state.root = root;
      state.loadedAt = Date.now();
      var h = findHost() || host;
      h.insertBefore(root, h.firstChild);
      state.slider = new Slider(root, items.length);
      log('mounted with', items.length, 'slides');
    }).catch(function (e) {
      state.lastFail = Date.now();
      console.warn(LOG, 'Could not load items:', e);
    }).then(function () { state.loading = false; });
  }

  function ensureMounted() {
    var host = findHost();
    if (!host) { warnOnce('host', 'Home page container not found yet (looked for #homeTab / .homeSectionsContainer).'); return; }

    var stale = state.root && (Date.now() - state.loadedAt) > CFG.refreshMinutes * 60000;
    if (!state.root || stale) {
      if (Date.now() - state.lastFail < 15000) return; // back off after a failure
      load(host);
      return;
    }
    // Jellyfin can rebuild the home page; put our bar back if it was removed.
    if (!host.contains(state.root)) {
      host.insertBefore(state.root, host.firstChild);
      if (state.slider) state.slider.schedule();
      log('re-attached bar to home page');
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && state.slider) state.slider.schedule();
  });
  window.addEventListener('hashchange', function () { setTimeout(ensureMounted, 300); });
  document.addEventListener('viewshow', function () { setTimeout(ensureMounted, 100); });

  setInterval(ensureMounted, 1500);
  ensureMounted();
})();
