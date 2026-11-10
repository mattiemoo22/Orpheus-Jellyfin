/*! Orpheus: library headers (JS Injector plugin, JS only)
 *  Companion to Orpheus.css (the Netflin-based theme). Self-contained: injects its own CSS and reads
 *  its colours, glass and radii from the theme's --nf-* tokens, with fallbacks so it still works alone.
 *
 *  On a Movies / TV / Collections library page it adds three glass tabs:
 *    [ Library name ]  [ Favourites ]  [ Genres ]
 *  - Library name -> your normal library grid (untouched, alphabet picker intact)
 *  - Favourites   -> everything you've favourited in this library
 *  - Genres       -> one home-page style row per genre, titled like Netflin's row titles
 *
 *  It reads data through Jellyfin's own ApiClient. It never changes filters,
 *  page size or any saved library settings. */
(function () {
  'use strict';
  if (window.__lxGlass) return;
  window.__lxGlass = true;

  /* ═══════════════════════════════════════════════════════════════════════
   * 1. Settings
   * ═══════════════════════════════════════════════════════════════════════ */

  var CFG = {
    hideNativeTabs: true,   // hide the theme's own tab pill on library pages (set false to keep it)
    rowLimit: 30            // titles per genre row
  };

  /* ═══════════════════════════════════════════════════════════════════════
   * 2. CSS
   * ═══════════════════════════════════════════════════════════════════════ */

  var CSS = [
    /* ── Tokens: taken from Orpheus.css, with fallbacks ─────────────────── */
    '.lxg-bar,.lxg-panel{',
    '--lxg-acc:var(--nf-accent-rgb,185 162 230);',
    '--lxg-bg:var(--nf-bg-rgb,16 16 16);',
    '--lxg-text:var(--nf-text,#fff);',
    '--lxg-text-2:var(--nf-text-2,#e5e5e5);',
    '--lxg-dim:var(--nf-text-dim,#b3b3b3);',
    '--lxg-mute:var(--nf-text-mute,#8c8c8c);',
    '--lxg-surface:var(--nf-surface-2,#232323);',
    '--lxg-fill-hover:var(--nf-fill-hover,rgb(255 255 255 / 0.08));',
    '--lxg-fill-tag:var(--nf-fill-tag,rgb(255 255 255 / 0.12));',
    '--lxg-outline:var(--nf-outline,rgb(255 255 255 / 0.5));',
    '--lxg-glass:var(--nf-glass,rgb(255 255 255 / 0.09));',
    '--lxg-glass-line:var(--nf-glass-line,rgb(255 255 255 / 0.22));',
    '--lxg-glass-shadow:var(--nf-glass-shadow,inset 0 1px 0 rgb(255 255 255 / 0.35),0 8px 22px rgb(0 0 0 / 0.35));',
    '--lxg-blur:var(--nf-glass-blur,18px);',
    '--lxg-radius:var(--nf-card-radius,0.55em);',
    '--lxg-radius-xs:var(--nf-radius-xs,2px);',
    '--lxg-img-bg:var(--nf-img-bg,#14111c);',
    '--lxg-font:var(--nf-font,inherit);',
    '--lxg-fs-h2:var(--nf-fs-h2,1.25rem);',
    '--lxg-ease:var(--nf-ease,cubic-bezier(0.5,0,0.1,1));',
    '--lxg-ease-out:var(--nf-ease-out,cubic-bezier(0.2,0,0,1));',
    '}',

    /* ── Glass surface (tab bar, messages, arrows) ──────────────────────── */
    '.lxg-glass{position:relative;isolation:isolate;',
    'border:1px solid var(--lxg-glass-line);background:var(--lxg-glass);',
    '-webkit-backdrop-filter:blur(var(--lxg-blur)) saturate(1.6);backdrop-filter:blur(var(--lxg-blur)) saturate(1.6);',
    'box-shadow:var(--lxg-glass-shadow);}',
    '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.lxg-glass{background:rgb(34 34 38 / 0.94);}}',

    /* ── Tab bar ────────────────────────────────────────────────────────── */
    '.lxg-bar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1150;display:flex;gap:4px;padding:5px;border-radius:999px;max-width:calc(100vw - 24px);',
    'font-family:var(--lxg-font);transition:transform .32s var(--lxg-ease),opacity .25s;}',
    '.lxg-bar.lxg-hide{transform:translateX(-50%) translateY(-220%);opacity:0;pointer-events:none;}',
    '.lxg-tab{position:relative;border:0;background:transparent;color:var(--lxg-dim);padding:.6rem 1.3rem;border-radius:999px;',
    'font:inherit;font-weight:600;font-size:.95rem;letter-spacing:.005em;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;',
    'transition:color .2s,background-color .25s,box-shadow .25s;}',
    '.lxg-tab:hover{color:var(--lxg-text);background:var(--lxg-fill-hover);}',
    '.lxg-tab:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
    '.lxg-tab.on{color:var(--lxg-text);font-weight:700;background:rgb(var(--lxg-acc) / 0.22);',
    'box-shadow:inset 0 0 0 1px rgb(var(--lxg-acc) / 0.6),0 0 12px rgb(var(--lxg-acc) / 0.3);}',

    /* ── Panel that covers the native grid on Favourites / Genres ───────── */
    '.lxg-panel{position:fixed;inset:0;z-index:1000;overflow-y:auto;overflow-x:hidden;display:none;',
    'padding:92px var(--nf-gutter,clamp(14px,3.3%,44px)) 70px;font-family:var(--lxg-font);color:var(--lxg-text-2);',
    'background:radial-gradient(1000px 420px at 50% -10%,rgb(var(--lxg-acc) / 0.06),transparent 65%),rgb(var(--lxg-bg));',
    'scrollbar-width:none;}',
    '.lxg-panel::-webkit-scrollbar{display:none;}',
    '.lxg-panel.show{display:block;}',

    /* ── Grid (favourites, one genre) ───────────────────────────────────── */
    '.lxg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:22px 16px;}',
    '.lxg-grid .lxg-card{width:auto;}',

    /* ── Row titles: Netflin-style, with the lavender dot ───────────────── */
    '.lxg-row{margin:0 0 26px;}',
    '.lxg-rowhead{display:inline-flex;align-items:center;gap:.55rem;margin:0 0 .35rem;color:var(--lxg-dim);',
    'transition:color .35s ease;-webkit-tap-highlight-color:transparent;}',
    '.lxg-rowhead h3{margin:0;font:700 var(--lxg-fs-h2)/1.35 var(--lxg-font);letter-spacing:-.005em;color:inherit;',
    'transition:color .35s ease,text-shadow .35s ease;}',
    '.lxg-dot{width:6px;height:6px;flex:none;border-radius:50%;background:rgb(var(--lxg-acc));box-shadow:0 0 6px 1px rgb(var(--lxg-acc) / 0.6);}',
    '.lxg-count{padding:.12rem .5rem;border-radius:var(--lxg-radius-xs);background:var(--lxg-fill-tag);color:var(--lxg-text-2);',
    'font-size:.72rem;font-weight:600;font-variant-numeric:tabular-nums;}',
    '.lxg-click{cursor:pointer;}',
    '.lxg-click:hover,.lxg-click:focus-visible{color:var(--lxg-text);outline:none;}',
    '.lxg-click:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:var(--lxg-radius-xs);}',
    '.lxg-chev{font-size:1.25rem;line-height:1;color:var(--lxg-mute);transition:transform .25s var(--lxg-ease),color .25s var(--lxg-ease-out);}',
    '.lxg-click:hover .lxg-chev,.lxg-click:focus-visible .lxg-chev{color:var(--lxg-text);transform:translateX(.2em);}',
    /* the row in view lights up, like on the home page */
    '.lxg-row.lxg-in-view .lxg-rowhead{color:var(--lxg-text);}',
    '.lxg-row.lxg-in-view .lxg-rowhead h3{font-weight:800;text-shadow:0 0 14px rgb(168 85 247 / 0.55),0 0 28px rgb(168 85 247 / 0.25);}',

    '.lxg-toprow{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin:0 0 16px;}',
    '.lxg-toprow .lxg-rowhead{margin:0;color:var(--lxg-text);}',

    /* outlined button (Netflin "cancel" look) */
    '.lxg-btn{font:600 .875rem/1.2 var(--lxg-font);color:var(--lxg-text);background:transparent;border:0;border-radius:var(--nf-radius,4px);',
    'padding:.5rem 1rem;cursor:pointer;box-shadow:inset 0 0 0 1px var(--lxg-outline);transition:background-color .15s,box-shadow .15s;}',
    '.lxg-btn:hover{background:var(--lxg-fill-hover);box-shadow:inset 0 0 0 1px #fff;}',
    '.lxg-btn:focus-visible{outline:2px solid #fff;outline-offset:2px;}',

    /* ── Genre rows ─────────────────────────────────────────────────────── */
    '.lxg-scrollwrap{position:relative;}',
    '.lxg-scroller{display:flex;gap:16px;overflow-x:auto;padding:6px 4px 12px;scroll-snap-type:x proximity;scrollbar-width:none;}',
    '.lxg-scroller::-webkit-scrollbar{display:none;}',
    '.lxg-scroller .lxg-card{scroll-snap-align:start;}',
    '.lxg-arrow{position:absolute;top:calc(50% - 40px);width:42px;height:42px;border-radius:50%;color:var(--lxg-text);font-size:22px;line-height:1;cursor:pointer;z-index:2;',
    'display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s,background-color .15s;padding:0;}',
    '.lxg-arrow:hover{background:rgb(var(--lxg-acc) / 0.22);}',
    '.lxg-scrollwrap:hover .lxg-arrow{opacity:1;}',
    '.lxg-arrow.l{left:-8px;}.lxg-arrow.r{right:-8px;}',

    /* ── Loading skeleton ───────────────────────────────────────────────── */
    '.lxg-skel{height:230px;border-radius:var(--lxg-radius);background:var(--lxg-surface);}',
    '@media (prefers-reduced-motion:no-preference){.lxg-skel{animation:lxgsk 1.6s ease-in-out infinite;}}',
    '@keyframes lxgsk{50%{opacity:.45;}}',

    /* ── Cards ──────────────────────────────────────────────────────────── */
    '.lxg-card{flex:0 0 auto;width:150px;color:var(--lxg-text);text-decoration:none;display:block;-webkit-tap-highlight-color:transparent;}',
    '.lxg-card:focus-visible{outline:2px solid #fff;outline-offset:2px;border-radius:var(--lxg-radius);}',
    '.lxg-poster{aspect-ratio:2/3;border-radius:var(--lxg-radius);overflow:hidden;background:var(--lxg-img-bg);position:relative;transition:box-shadow .25s;}',
    '.lxg-poster img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.lxg-poster .lxg-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:700;color:rgb(255 255 255 / 0.3);}',
    '@media (hover:hover) and (pointer:fine){.lxg-card:hover .lxg-poster{box-shadow:0 0 0 1px rgb(var(--lxg-acc) / 0.6),0 0 14px rgb(var(--lxg-acc) / 0.3);}}',
    '.lxg-t{margin-top:8px;font-weight:600;font-size:.875rem;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.lxg-y{font-size:.8125rem;line-height:1.35;color:var(--lxg-mute);}',

    /* ── States ─────────────────────────────────────────────────────────── */
    '.lxg-msg{margin:60px auto;text-align:center;color:var(--lxg-dim);font-size:1.05rem;max-width:420px;padding:26px 28px;border-radius:24px;}',

    /* ── While a panel is open, hide what only makes sense for the native grid ── */
    'body.lxg-panel-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2),body.lxg-panel-on .alphaPicker,body.lxg-panel-on .alphaPicker-fixed-right{visibility:hidden !important;}',
    CFG.hideNativeTabs ? 'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root>.MuiStack-root:first-of-type,body.lxg-on .headerTabs{display:none !important;}' : '',

    /* ── Phones: bar drops below the app-bar icons, on the left, clear of the page arrows ── */
    '@media (max-width:720px){',
    '.lxg-bar{top:calc(70px + env(safe-area-inset-top,0px));left:12px;transform:none;max-width:calc(100vw - 150px);}',
    '.lxg-bar.lxg-hide{transform:translateY(-260%);}',
    '.lxg-tab{padding:.5rem .8rem;font-size:.875rem;max-width:34vw;}',
    '.lxg-panel{padding-top:calc(132px + env(safe-area-inset-top,0px));}',
    '.lxg-card{width:118px;}',
    '.lxg-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:16px 12px;}',
    '.lxg-arrow{display:none;}',
    '}'
  ].join('\n');

  /* ═══════════════════════════════════════════════════════════════════════
   * 3. Helpers
   * ═══════════════════════════════════════════════════════════════════════ */

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
    var url = posterUrl(item, 420);
    if (url) {
      var img = el('img');
      img.loading = 'lazy'; img.alt = ''; img.src = url;
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

  /* ═══════════════════════════════════════════════════════════════════════
   * 4. State
   * ═══════════════════════════════════════════════════════════════════════ */

  var S = { key: null, kind: null, libId: null, libName: null, tab: 'library', bar: null, panel: null, tabs: {}, genreToken: 0, viewIO: null };
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

  function teardown() {
    if (S.viewIO) { S.viewIO.disconnect(); S.viewIO = null; }
    if (S.bar && S.bar.parentNode) S.bar.parentNode.removeChild(S.bar);
    if (S.panel && S.panel.parentNode) S.panel.parentNode.removeChild(S.panel);
    S.bar = S.panel = null; S.key = null; S.genreToken++;
    document.body.classList.remove('lxg-on', 'lxg-panel-on');
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 5. Building
   * ═══════════════════════════════════════════════════════════════════════ */

  function setup(info) {
    teardown();
    S.kind = info.kind; S.libId = info.libId; S.libName = defaultName();

    S.tabs = {};
    S.bar = el('div', 'lxg-bar lxg-glass');
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
    showBar();
    if (open) S.panel.scrollTop = 0;
    if (t === 'fav') renderFavourites();
    else if (t === 'genres') renderGenres();
    else S.panel.textContent = '';
  }

  function message(text) {
    S.panel.textContent = '';
    S.panel.appendChild(el('div', 'lxg-msg lxg-glass', text));
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 6. Favourites
   * ═══════════════════════════════════════════════════════════════════════ */

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
      items.forEach(function (it) { grid.appendChild(card(it)); });
      S.panel.appendChild(grid);
    }).catch(function (e) {
      console.warn('[orpheus-library] favourites', e);
      if (token === S.genreToken) message('Could not load favourites.');
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 7. One genre (show all)
   * ═══════════════════════════════════════════════════════════════════════ */

  function showGenre(name) {
    var token = ++S.genreToken;
    if (S.viewIO) { S.viewIO.disconnect(); S.viewIO = null; }
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
      items.forEach(function (it) { grid.appendChild(card(it)); });
    }).catch(function (e) {
      console.warn('[orpheus-library] show all', name, e);
      if (token === S.genreToken) grid.textContent = 'Could not load this genre.';
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 8. Genres
   * ═══════════════════════════════════════════════════════════════════════ */

  function renderGenres() {
    var token = ++S.genreToken;
    if (S.viewIO) { S.viewIO.disconnect(); S.viewIO = null; }
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
      }, { root: S.panel, rootMargin: '500px 0px' }) : null;

      // the row in the middle of the screen lights up
      S.viewIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('lxg-in-view', en.isIntersecting); });
      }, { root: S.panel, rootMargin: '-30% 0px -30% 0px' }) : null;

      genres.forEach(function (g) {
        var row = el('section', 'lxg-row');
        var h = header(g.Name, '…', function () { showGenre(g.Name); });
        row.appendChild(h.node);

        var wrap = el('div', 'lxg-scrollwrap');
        var scroller = el('div', 'lxg-scroller');
        scroller.appendChild(el('div', 'lxg-skel', null)).style.width = '100%';
        wrap.appendChild(scroller);
        [['l', '‹', -1], ['r', '›', 1]].forEach(function (a) {
          var b = el('button', 'lxg-arrow lxg-glass ' + a[0], a[1]);
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
        if (S.viewIO) S.viewIO.observe(row);
      });
    }).catch(function (e) {
      console.warn('[orpheus-library] genres', e);
      if (token === S.genreToken) message('Could not load genres.');
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 9. Hide the tab bar on scroll down, show it on scroll up
   * ═══════════════════════════════════════════════════════════════════════ */

  var lastTop = new WeakMap();
  function showBar() { if (S.bar) S.bar.classList.remove('lxg-hide'); }
  function onScroll(e) {
    if (!S.bar) return;
    var t = e.target, top;
    if (t === document || t === document.documentElement || t === document.body) {
      top = (document.scrollingElement || document.documentElement).scrollTop;
      t = document;
    } else if (t && t.nodeType === 1) {
      if (S.bar.contains(t) || t.clientHeight < 300) return; // ignore small / horizontal scrollers
      top = t.scrollTop;
    } else return;
    var prev = lastTop.has(t) ? lastTop.get(t) : top;
    lastTop.set(t, top);
    var d = top - prev;
    if (top <= 24) { showBar(); return; }
    if (d > 6) S.bar.classList.add('lxg-hide');
    else if (d < -6) showBar();
  }
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });

  /* ═══════════════════════════════════════════════════════════════════════
   * 10. Lifecycle
   * ═══════════════════════════════════════════════════════════════════════ */

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
    } catch (err) { console.warn('[orpheus-library]', err); }
  }

  window.addEventListener('hashchange', tick);
  document.addEventListener('viewshow', tick);
  setInterval(tick, 700);
  console.info('[orpheus-library] loaded');
  tick();
})();
