/*! Orpheus: library headers (JS Injector plugin, JS only)
 *  Companion to Orpheus.css and Orpheus-appbar.js. Self-contained: injects its own CSS and reads
 *  its colours and radii from the theme's --nf-* tokens, with fallbacks so it still works alone.
 *
 *  On a Movies / TV / Collections library page it adds three flat tabs INSIDE the app bar:
 *    Library name  |  Favourites  |  Genres
 *  - Library name -> your normal library grid (untouched, alphabet picker intact)
 *  - Favourites   -> everything you've favourited in this library
 *  - Genres       -> one row per genre, titled like Netflin's row titles
 *
 *  Flat and light: no glass, no blur, no glow, no scroll listeners, no hide-on-scroll.
 *  The tabs sit on the same line as the Home / Back / profile buttons and line up with them using the
 *  app bar's --orp-* variables (with fallbacks). Data comes through Jellyfin's own ApiClient;
 *  filters, page size and saved library settings are never changed. */
(function () {
  'use strict';
  if (window.__lxGlass) return;
  window.__lxGlass = true;

  /* ═══ 1. Settings ═══ */

  var CFG = {
    hideNativeTabs: true,   // hide the theme's own tab pill on library pages (set false to keep it)
    rowLimit: 30            // titles per genre row
  };

  /* ═══ 2. CSS ═══ */

  var CSS = [
    '.lxg-bar,.lxg-panel{',
    '--lxg-accent:var(--nf-accent,#b9a2e6);',
    '--lxg-bg:var(--nf-bg-rgb,16 16 16);',
    '--lxg-text:var(--nf-text,#fff);',
    '--lxg-text-2:var(--nf-text-2,#e5e5e5);',
    '--lxg-dim:var(--nf-text-dim,#b3b3b3);',
    '--lxg-mute:var(--nf-text-mute,#8c8c8c);',
    '--lxg-surface:var(--nf-surface-2,#232323);',
    '--lxg-hover:var(--nf-fill-hover,rgb(255 255 255 / 0.08));',
    '--lxg-tag:var(--nf-fill-tag,rgb(255 255 255 / 0.12));',
    '--lxg-outline:var(--nf-outline,rgb(255 255 255 / 0.5));',
    '--lxg-radius:var(--nf-card-radius,0.55em);',
    '--lxg-radius-xs:var(--nf-radius-xs,2px);',
    '--lxg-img-bg:var(--nf-img-bg,#14111c);',
    '--lxg-font:var(--nf-font,inherit);',
    '--lxg-fs-h2:var(--nf-fs-h2,1.25rem);',
    '--lxg-ease-out:var(--nf-ease-out,cubic-bezier(0.2,0,0,1));',
    '}',

    /* ── Tabs: flat text tabs on the app bar row, between Home/Back and the profile button ── */
    '.lxg-bar{--lxg-inset:calc(var(--orp-edge,12px) + var(--orp-btn,44px) * 2 + 12px);',
    'position:fixed;top:calc(var(--orp-cy,24px) - 24px);height:48px;left:var(--lxg-inset);right:var(--lxg-inset);',
    'z-index:1200;display:flex;align-items:center;justify-content:center;gap:2px;overflow-x:auto;scrollbar-width:none;',
    'font-family:var(--lxg-font);}',
    '.lxg-bar::-webkit-scrollbar{display:none;}',
    '.lxg-tab{position:relative;flex:0 1 auto;min-width:0;max-width:34vw;height:40px;padding:0 .8rem;border:0;border-radius:var(--nf-radius,4px);',
    'background:transparent;color:var(--lxg-dim);font:600 .9rem/1 var(--lxg-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;',
    'transition:background-color .15s var(--lxg-ease-out),color .15s var(--lxg-ease-out);}',
    '.lxg-tab:hover{color:var(--lxg-text);background:var(--lxg-hover);}',
    '.lxg-tab:focus-visible{outline:2px solid #fff;outline-offset:-2px;}',
    '.lxg-tab.on{color:var(--lxg-accent);}',
    '.lxg-tab.on::after{content:"";position:absolute;left:.8rem;right:.8rem;bottom:3px;height:2px;border-radius:1px;background:var(--lxg-accent);}',

    /* ── Panel that covers the native grid on Favourites / Genres (sits under the bar) ── */
    '.lxg-panel{position:fixed;inset:0;z-index:1000;overflow-y:auto;overflow-x:hidden;display:none;',
    'padding:calc(var(--orp-cy,24px) * 2 + 14px) var(--nf-gutter,clamp(14px,3.3%,44px)) 70px;',
    'font-family:var(--lxg-font);color:var(--lxg-text-2);background:rgb(var(--lxg-bg));scrollbar-width:none;}',
    '.lxg-panel::-webkit-scrollbar{display:none;}',
    '.lxg-panel.show{display:block;}',

    /* ── Grid (favourites, one genre) ── */
    '.lxg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:22px 16px;}',
    '.lxg-grid .lxg-card{width:auto;}',

    /* ── Row titles: Netflin-style, with the lavender dot ── */
    '.lxg-row{margin:0 0 26px;}',
    '.lxg-rowhead{display:inline-flex;align-items:center;gap:.55rem;margin:0 0 .35rem;color:var(--lxg-text);-webkit-tap-highlight-color:transparent;}',
    '.lxg-rowhead h3{margin:0;font:700 var(--lxg-fs-h2)/1.35 var(--lxg-font);letter-spacing:-.005em;color:inherit;}',
    '.lxg-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--lxg-accent);}',
    '.lxg-count{padding:.12rem .5rem;border-radius:var(--lxg-radius-xs);background:var(--lxg-tag);color:var(--lxg-text-2);',
    'font-size:.72rem;font-weight:600;font-variant-numeric:tabular-nums;}',
    '.lxg-click{cursor:pointer;}',
    '.lxg-click:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:var(--lxg-radius-xs);}',
    '.lxg-chev{font-size:1.25rem;line-height:1;color:var(--lxg-mute);}',
    '.lxg-click:hover .lxg-chev{color:var(--lxg-text);}',

    '.lxg-toprow{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin:0 0 16px;}',
    '.lxg-toprow .lxg-rowhead{margin:0;}',

    /* outlined button (Netflin "cancel" look) */
    '.lxg-btn{font:600 .875rem/1.2 var(--lxg-font);color:var(--lxg-text);background:transparent;border:0;border-radius:var(--nf-radius,4px);',
    'padding:.5rem 1rem;cursor:pointer;box-shadow:inset 0 0 0 1px var(--lxg-outline);}',
    '.lxg-btn:hover{background:var(--lxg-hover);box-shadow:inset 0 0 0 1px #fff;}',
    '.lxg-btn:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
    '.lxg-more{display:block;margin:22px auto 0;}',

    /* ── Genre rows ── */
    '.lxg-scrollwrap{position:relative;}',
    '.lxg-scroller{display:flex;gap:16px;overflow-x:auto;padding:6px 4px 12px;scrollbar-width:none;}',
    '.lxg-scroller::-webkit-scrollbar{display:none;}',
    '.lxg-arrow{position:absolute;top:calc(50% - 40px);width:40px;height:40px;border:0;border-radius:50%;padding:0;z-index:2;',
    'background:rgb(var(--lxg-bg) / 0.85);color:var(--lxg-text);font-size:22px;line-height:1;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;opacity:0;}',
    '.lxg-arrow:hover{background:var(--lxg-hover);}',
    '.lxg-scrollwrap:hover .lxg-arrow{opacity:1;}',
    '.lxg-arrow.l{left:-8px;}.lxg-arrow.r{right:-8px;}',

    /* ── Loading placeholder (static: no animation) ── */
    '.lxg-skel{height:230px;border-radius:var(--lxg-radius);background:var(--lxg-surface);}',

    /* ── Cards ── */
    /* content-visibility: off-screen cards cost almost nothing to lay out or paint */
    '.lxg-card{flex:0 0 auto;width:150px;color:var(--lxg-text);text-decoration:none;display:block;-webkit-tap-highlight-color:transparent;',
    'content-visibility:auto;contain-intrinsic-size:auto 150px auto 280px;}',
    '.lxg-card:focus-visible{outline:2px solid #fff;outline-offset:2px;border-radius:var(--lxg-radius);}',
    '.lxg-poster{aspect-ratio:2/3;border-radius:var(--lxg-radius);overflow:hidden;background:var(--lxg-img-bg);position:relative;}',
    '.lxg-poster img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.lxg-poster .lxg-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:700;color:rgb(255 255 255 / 0.3);}',
    '@media (hover:hover) and (pointer:fine){.lxg-card:hover .lxg-poster{outline:2px solid var(--lxg-accent);outline-offset:-2px;}}',
    '.lxg-t{margin-top:8px;font-weight:600;font-size:.875rem;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.lxg-y{font-size:.8125rem;line-height:1.35;color:var(--lxg-mute);}',

    /* ── States ── */
    '.lxg-msg{margin:60px auto;text-align:center;color:var(--lxg-dim);font-size:1.05rem;max-width:420px;padding:24px 28px;border-radius:var(--lxg-radius);background:var(--lxg-surface);}',

    /* ── Page controls (page count + prev/next arrows): the page's second toolbar, restyled as ONE flat row.
          Phones/tablets: a slim row under the bar, right-aligned (the page content moves down to make room).
          Same row on every screen size; it only exists on the Library tab (Favourites / Genres have none). ── */
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2){position:static!important;display:flex!important;flex-direction:row!important;',
    'flex-wrap:nowrap!important;justify-content:flex-end!important;align-items:center!important;gap:10px!important;min-height:44px!important;height:44px!important;',
    'padding:0 14px 4px!important;margin:0!important;width:auto!important;background:transparent!important;box-shadow:none!important;border:0!important;}',
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2)>*{margin:0!important;display:flex!important;flex-direction:row!important;',
    'flex-wrap:nowrap!important;align-items:center!important;gap:4px!important;}',
    /* the page's own title and tab items repeat what our tabs already say (and overlapped them): hide them,
       but never anything inside a button, so the page count and the arrows stay */
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2) :is(.MuiTabs-root,.MuiTab-root,[role="tablist"],[role="tab"],h1,h2,h3,h4,h5,h6){display:none!important;}',
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2) .MuiTypography-root:not(:is(button,[role="button"]) *){display:none!important;}',
    /* phones: Play All and Shuffle go, so the row is not crammed (they are still on every title's page) */
    /* the library drop-down ("Movies ▾"): our tabs replace it, on every screen size */
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2) :is(button,[role="button"]):has([data-testid="ArrowDropDownIcon"]),body.lxg-on .lxg-gone{display:none!important;}',
    '@media (max-width:720px){',
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2) :is(button,a,[role="button"]):is(.MuiButton-contained,:has([data-testid="PlayArrowIcon"]),:has([data-testid="ShuffleIcon"])){display:none!important;}',
    /* phones: page count on the left, the icons spread evenly to the right, same side gap as the posters */
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2){justify-content:space-between!important;}',
    '}',
    /* wider screens: icons packed to the right, side gap matches the poster grid */
    '@media (min-width:721px){',
    'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2){padding:0 var(--nf-gutter,clamp(14px,3.3%,44px)) 4px!important;}',
    '}',

    /* ── While a panel is open, hide what only makes sense for the native grid ── */
    'body.lxg-panel-on .alphaPicker,body.lxg-panel-on .alphaPicker-fixed-right{visibility:hidden !important;}',
    /* Favourites / Genres have their own panel: no page controls, so the bar stays a single row */
    'body.lxg-on.lxg-panel-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2){display:none!important;}',
    CFG.hideNativeTabs ? 'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root>.MuiStack-root:first-of-type,body.lxg-on .headerTabs{display:none !important;}' : '',

    /* ── Narrow screens: more room on the right (only the profile button is there) ── */
    '@media (max-width:720px){',
    '.lxg-bar{right:calc(var(--orp-btn,44px) + 18px);justify-content:flex-start;}',
    '.lxg-tab{padding:0 .55rem;font-size:.8rem;max-width:30vw;}',
    '.lxg-tab.on::after{left:.55rem;right:.55rem;}',
    '.lxg-card{width:118px;contain-intrinsic-size:auto 118px auto 220px;}',
    '.lxg-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:16px 12px;}',
    '.lxg-arrow{display:none;}',
    '}'
  ].join('\n');

  /* ═══ 3. Helpers ═══ */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function client() { return window.ApiClient && typeof window.ApiClient.getJSON === 'function' ? window.ApiClient : null; }
  function api(path, params) { var c = client(); return c.getJSON(c.getUrl(path, params || {})); }
  function uid() { return client().getCurrentUserId(); }

  /* Movies, TV and Collections (boxsets) library pages */
  function routeInfo() {
    var m = (location.hash || '').match(/^#!?\/(movies|tv|tvshows|list)(?:\.html)?(?:\?(.*))?$/i);
    if (!m) return null;
    var qs = new URLSearchParams(m[2] || '');
    var route = m[1].toLowerCase();
    var ct = (qs.get('collectionType') || '').toLowerCase();
    var kind;
    if (ct === 'boxsets') kind = 'boxsets';
    else if (route === 'list') return null; // generic list pages that aren't collections
    else kind = route === 'movies' ? 'movies' : 'tvshows';
    return {
      kind: kind,
      libId: qs.get('topParentId') || qs.get('parentId') || null
    };
  }

  function posterUrl(item, h) {
    var tag = item.ImageTags && item.ImageTags.Primary;
    if (!tag) return null;
    var c = client();
    if (typeof c.getScaledImageUrl === 'function') return c.getScaledImageUrl(item.Id, { type: 'Primary', maxHeight: h, tag: tag, quality: 85 });
    return c.getUrl('Items/' + item.Id + '/Images/Primary', { maxHeight: h, tag: tag, quality: 85 });
  }

  function card(item) {
    var a = el('a', 'lxg-card');
    var sid = client().serverId ? client().serverId() : '';
    a.href = '#/details?id=' + encodeURIComponent(item.Id) + (sid ? '&serverId=' + encodeURIComponent(sid) : '');
    var p = el('div', 'lxg-poster');
    var url = posterUrl(item, 360);
    if (url) {
      var img = el('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.src = url;
      p.appendChild(img);
    } else {
      p.appendChild(el('div', 'lxg-ph', (item.Name || '?').charAt(0).toUpperCase()));
    }
    a.appendChild(p);
    a.appendChild(el('div', 'lxg-t', item.Name || ''));
    if (item.ProductionYear) a.appendChild(el('div', 'lxg-y', String(item.ProductionYear)));
    return a;
  }

  function header(title, countText, onClick) {
    var head = el('div', 'lxg-rowhead');
    head.appendChild(el('span', 'lxg-dot'));
    head.appendChild(el('h3', null, title));
    var count = el('span', 'lxg-count', countText);
    head.appendChild(count);
    if (onClick) {
      head.classList.add('lxg-click');
      head.setAttribute('role', 'button');
      head.tabIndex = 0;
      head.title = 'Show all';
      head.appendChild(el('span', 'lxg-chev', '›'));
      head.addEventListener('click', onClick);
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      });
    }
    return { node: head, count: count };
  }

  /* Long lists (Favourites, one genre) are drawn 60 at a time with a "Show more" button, instead of
     building hundreds of cards at once. */
  var CHUNK = 60;
  function fillChunked(grid, items) {
    var i = 0, btn = null;
    function next() {
      var end = Math.min(i + CHUNK, items.length), frag = document.createDocumentFragment();
      for (; i < end; i++) frag.appendChild(card(items[i]));
      grid.appendChild(frag);
      if (i >= items.length) { if (btn) { btn.remove(); btn = null; } return; }
      if (!btn) {
        btn = el('button', 'lxg-btn lxg-more');
        btn.type = 'button';
        btn.addEventListener('click', next);
        grid.parentNode.insertBefore(btn, grid.nextSibling);
      }
      btn.textContent = 'Show more (' + (items.length - i) + ' left)';
    }
    next();
  }

  /* ═══ 4. State ═══ */

  var S = { key: null, kind: null, libId: null, libName: null, tab: 'library', bar: null, panel: null, tabs: {}, genreToken: 0, io: null };
  var includeTypes = function () {
    return S.kind === 'movies' ? 'Movie' : S.kind === 'boxsets' ? 'BoxSet' : 'Series';
  };
  var defaultName = function () {
    return S.kind === 'movies' ? 'Movies' : S.kind === 'boxsets' ? 'Collections' : 'Series';
  };
  var tabKey = function () { return 'lxg_tab_' + S.libId; };

  function injectCss() {
    if (document.getElementById('lxg-style')) return;
    var s = el('style'); s.id = 'lxg-style'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function stopIO() { if (S.io) { S.io.disconnect(); S.io = null; } }

  function teardown() {
    stopIO();
    if (S.bar && S.bar.parentNode) S.bar.parentNode.removeChild(S.bar);
    if (S.panel && S.panel.parentNode) S.panel.parentNode.removeChild(S.panel);
    S.bar = S.panel = null; S.key = null; S.genreToken++;
    document.body.classList.remove('lxg-on', 'lxg-panel-on');
  }

  /* ═══ 5. Building ═══ */

  function setup(info) {
    teardown();
    S.kind = info.kind; S.libId = info.libId; S.libName = defaultName();

    S.tabs = {};
    S.bar = el('div', 'lxg-bar');
    S.panel = el('div', 'lxg-panel');
    var defs = [['library', S.libName], ['fav', 'Favourites'], ['genres', 'Genres']];
    defs.forEach(function (d) {
      var b = el('button', 'lxg-tab', d[1]);
      b.type = 'button';
      b.addEventListener('click', function () { selectTab(d[0]); });
      S.tabs[d[0]] = b;
      S.bar.appendChild(b);
    });
    document.body.appendChild(S.bar);
    document.body.appendChild(S.panel);
    document.body.classList.add('lxg-on');

    var saved = null;
    try { saved = sessionStorage.getItem(tabKey()); } catch (e) {}
    selectTab(saved === 'fav' || saved === 'genres' ? saved : 'library');

    // real library name for the first tab (Movies / Series / Collections / your own name)
    resolveLibrary().then(function (name) {
      if (name && S.tabs.library) S.tabs.library.textContent = name;
    }).catch(function () {});
  }

  function resolveLibrary() {
    return Promise.resolve().then(function () {
      if (S.libId) return api('Items', { userId: uid(), Ids: S.libId }).then(function (r) {
        return r && r.Items && r.Items[0] ? r.Items[0].Name : null;
      });
      // no library id in the URL: pick the first library of this kind
      return api('UserViews', { userId: uid() }).then(function (r) {
        var want = S.kind === 'movies' ? 'movies' : S.kind === 'boxsets' ? 'boxsets' : 'tvshows';
        var v = ((r && r.Items) || []).filter(function (x) { return x.CollectionType === want; })[0];
        if (v) { S.libId = v.Id; return v.Name; }
        return null;
      });
    });
  }

  function whenLibReady(fn) {
    if (S.libId) return fn();
    return resolveLibrary().then(fn);
  }

  function selectTab(t) {
    S.tab = t;
    Object.keys(S.tabs).forEach(function (k) { S.tabs[k].classList.toggle('on', k === t); });
    var open = t !== 'library';
    S.panel.classList.toggle('show', open);
    document.body.classList.toggle('lxg-panel-on', open);
    try { sessionStorage.setItem(tabKey(), t); } catch (e) {}
    S.genreToken++;
    stopIO();
    if (open) S.panel.scrollTop = 0;
    if (t === 'fav') renderFavourites();
    else if (t === 'genres') renderGenres();
    else S.panel.textContent = '';
  }

  function message(text) {
    S.panel.textContent = '';
    S.panel.appendChild(el('div', 'lxg-msg', text));
  }

  /* ═══ 6. Favourites ═══ */

  function renderFavourites() {
    var token = ++S.genreToken;
    message('Loading favourites…');
    whenLibReady(function () {
      return api('Items', {
        userId: uid(), ParentId: S.libId, Recursive: true, IncludeItemTypes: includeTypes(),
        Filters: 'IsFavorite', SortBy: 'SortName', SortOrder: 'Ascending',
        Fields: 'PrimaryImageAspectRatio', ImageTypeLimit: 1, EnableImageTypes: 'Primary', Limit: 500
      });
    }).then(function (r) {
      if (token !== S.genreToken) return;
      var items = (r && r.Items) || [];
      if (!items.length) { message('No favourites yet. Tap the heart on any title and it will show up here.'); return; }
      S.panel.textContent = '';
      var top = el('div', 'lxg-toprow');
      top.appendChild(header('Favourites', String(items.length)).node);
      S.panel.appendChild(top);
      var grid = el('div', 'lxg-grid');
      S.panel.appendChild(grid);
      fillChunked(grid, items);
    }).catch(function (e) {
      console.warn('[orpheus-library] favourites', e);
      if (token === S.genreToken) message('Could not load favourites.');
    });
  }

  /* ═══ 7. One genre (show all) ═══ */

  function showGenre(name) {
    var token = ++S.genreToken;
    stopIO();
    S.panel.scrollTop = 0;
    S.panel.textContent = '';

    var top = el('div', 'lxg-toprow');
    var back = el('button', 'lxg-btn', '‹  Genres');
    back.type = 'button';
    back.addEventListener('click', function () { renderGenres(); });
    top.appendChild(back);
    var h = header(name, '…');
    top.appendChild(h.node);
    S.panel.appendChild(top);

    var grid = el('div', 'lxg-grid');
    grid.appendChild(el('div', 'lxg-skel', null));
    S.panel.appendChild(grid);

    whenLibReady(function () {
      return api('Items', {
        userId: uid(), ParentId: S.libId, Recursive: true, IncludeItemTypes: includeTypes(),
        Genres: name, SortBy: 'SortName', SortOrder: 'Ascending',
        Fields: 'PrimaryImageAspectRatio', ImageTypeLimit: 1, EnableImageTypes: 'Primary',
        EnableTotalRecordCount: true
      });
    }).then(function (res) {
      if (token !== S.genreToken) return;
      var items = (res && res.Items) || [];
      h.count.textContent = String(res.TotalRecordCount || items.length);
      grid.textContent = '';
      fillChunked(grid, items);
    }).catch(function (e) {
      console.warn('[orpheus-library] show all', name, e);
      if (token === S.genreToken) grid.textContent = 'Could not load this genre.';
    });
  }

  /* ═══ 8. Genres ═══ */

  function renderGenres() {
    var token = ++S.genreToken;
    stopIO();
    message('Loading genres…');
    whenLibReady(function () {
      return api('Genres', {
        userId: uid(), ParentId: S.libId, IncludeItemTypes: includeTypes(),
        SortBy: 'SortName', SortOrder: 'Ascending', Recursive: true
      });
    }).then(function (r) {
      if (token !== S.genreToken) return;
      var genres = (r && r.Items) || [];
      if (!genres.length) { message('No genres found in this library.'); return; }
      S.panel.textContent = '';

      // lazy-load each row as it approaches the screen
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { io.unobserve(en.target); en.target._load(); }
        });
      }, { root: S.panel, rootMargin: '400px 0px' }) : null;
      S.io = io;

      genres.forEach(function (g) {
        var row = el('section', 'lxg-row');
        var h = header(g.Name, '…', function () { showGenre(g.Name); });
        row.appendChild(h.node);

        var wrap = el('div', 'lxg-scrollwrap');
        var scroller = el('div', 'lxg-scroller');
        scroller.appendChild(el('div', 'lxg-skel', null)).style.width = '100%';
        wrap.appendChild(scroller);
        [['l', '‹', -1], ['r', '›', 1]].forEach(function (a) {
          var b = el('button', 'lxg-arrow ' + a[0], a[1]);
          b.type = 'button';
          b.addEventListener('click', function () { scroller.scrollBy({ left: a[2] * scroller.clientWidth * 0.85, behavior: 'smooth' }); });
          wrap.appendChild(b);
        });
        row.appendChild(wrap);

        var loaded = false;
        row._load = function () {
          if (loaded) return; loaded = true;
          api('Items', {
            userId: uid(), ParentId: S.libId, Recursive: true, IncludeItemTypes: includeTypes(),
            Genres: g.Name, SortBy: 'SortName', SortOrder: 'Ascending',
            Fields: 'PrimaryImageAspectRatio', ImageTypeLimit: 1, EnableImageTypes: 'Primary',
            EnableTotalRecordCount: true, Limit: CFG.rowLimit
          }).then(function (res) {
            if (token !== S.genreToken) return;
            var items = (res && res.Items) || [];
            if (!items.length) { row.parentNode && row.parentNode.removeChild(row); return; }
            h.count.textContent = String(res.TotalRecordCount || items.length);
            scroller.textContent = '';
            items.forEach(function (it) { scroller.appendChild(card(it)); });
          }).catch(function (e) {
            console.warn('[orpheus-library] genre', g.Name, e);
            scroller.textContent = '';
          });
        };
        S.panel.appendChild(row);
        if (io) io.observe(row); else row._load();
      });
    }).catch(function (e) {
      console.warn('[orpheus-library] genres', e);
      if (token === S.genreToken) message('Could not load genres.');
    });
  }

  /* Fallback for the library drop-down, in case the CSS above does not match this Jellyfin version:
     any button in the page toolbar that has text and an icon, and is not the page count, Play or Shuffle.
     Cheap: one small query on the 1-second route check, library pages only. */
  var COUNT_RE = /\d+\s*[-\u2013]\s*\d+\s+of\s+\d+/i;
  function prune() {
    var tb = document.querySelector('header.MuiAppBar-root>.MuiToolbar-root:nth-child(2)');
    if (!tb) return;
    var bs = tb.querySelectorAll('button,[role="button"]');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.classList.contains('lxg-gone') || !b.querySelector('svg')) continue;
      var t = (b.textContent || '').trim();
      if (!t || COUNT_RE.test(t) || /play|shuffle/i.test(t)) continue;
      b.classList.add('lxg-gone');
    }
  }

  /* ═══ 9. Lifecycle ═══ */

  /* No scroll listeners and no DOM observers: the route is a string compare, checked on navigation
     events plus a slow poll. */
  function tick() {
    try {
      var info = routeInfo();
      if (!info || !client() || !document.body) { if (S.key) teardown(); return; }
      var key = info.kind + '|' + (info.libId || '');
      if (key !== S.key) {
        injectCss();
        setup(info);
        S.key = key;
      }
      prune();
    } catch (err) { console.warn('[orpheus-library]', err); }
  }

  window.addEventListener('hashchange', tick);
  window.addEventListener('popstate', tick);
  document.addEventListener('viewshow', tick);
  setInterval(tick, 1000);
  console.info('[orpheus-library] loaded');
  tick();
})();
