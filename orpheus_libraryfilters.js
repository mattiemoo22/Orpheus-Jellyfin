/* ==========================================================================
   Jellyfin – Liquid-glass library headers   (JS Injector plugin, JS only)
   Works on top of the Abyss theme. Self-contained: injects its own CSS.

   On a Movies / TV / Collections library page it adds three frosted-glass tabs:
     [ Library name ]  [ Favourites ]  [ Genres ]
   - Library name  -> your normal library grid (untouched, alphabet picker intact)
   - Favourites    -> everything you've favourited in this library
   - Genres        -> one home-page style row per genre, small glass header on each

   It reads data through Jellyfin's own ApiClient. It never changes filters,
   page size or any saved library settings.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__lxGlass) return;
  window.__lxGlass = true;

  /* ------------------------------ settings ------------------------------- */
  var CFG = {
    hideNativeTabs: true,   // hide Abyss's own tab pill on library pages (set false to keep it)
    rowLimit: 30,           // titles per genre row
    purple: '168, 85, 247', // accent R, G, B
    panelBg: '14, 14, 16'   // Favourites / Genres background (R, G, B) - matches the library page
  };

  /* -------------------------------- CSS ---------------------------------- */
  var CSS = [
    ':root{--lxg-p:' + CFG.purple + ';--lxg-bg:' + CFG.panelBg + ';}',

    /* shared liquid-glass surface (tab bar, messages, arrows) */
    '.lxg-glass{position:relative;isolation:isolate;',
    'background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.04));',
    '-webkit-backdrop-filter:blur(22px) saturate(160%) brightness(1.05);backdrop-filter:blur(22px) saturate(160%) brightness(1.05);',
    'border:1px solid rgba(255,255,255,.14);',
    'box-shadow:0 8px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.4),inset 0 -1px 0 rgba(255,255,255,.06);}',
    '.lxg-glass::before{content:"";position:absolute;inset:0;border-radius:inherit;z-index:-1;pointer-events:none;',
    'background:linear-gradient(115deg,rgba(255,255,255,.3) 0%,rgba(255,255,255,0) 34%,rgba(255,255,255,0) 70%,rgba(255,255,255,.08) 100%);opacity:.5;}',
    '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.lxg-glass{background:rgba(34,34,38,.94);}}',

    /* tab bar */
    '.lxg-bar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1150;display:flex;gap:4px;padding:5px;border-radius:999px;max-width:calc(100vw - 24px);}',
    '.lxg-bar{transition:transform .32s cubic-bezier(.3,.8,.3,1),opacity .25s;}',
    '.lxg-bar.lxg-hide{transform:translateX(-50%) translateY(-220%);opacity:0;pointer-events:none;}',
    '.lxg-tab{position:relative;border:0;background:transparent;color:rgba(255,255,255,.72);padding:.62rem 1.35rem;border-radius:999px;',
    'font:inherit;font-weight:600;font-size:1.02rem;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;',
    'transition:color .2s,background .25s,box-shadow .25s;}',
    '.lxg-tab:hover{color:#fff;background:rgba(255,255,255,.08);}',
    '.lxg-tab.on{color:#fff;background:linear-gradient(135deg,rgba(var(--lxg-p),.26),rgba(var(--lxg-p),.08));',
    'box-shadow:0 0 12px rgba(var(--lxg-p),.35),inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1px rgba(var(--lxg-p),.5);}',

    /* panel that covers the native grid on Favourites / Genres (dark, like the library page) */
    '.lxg-panel{position:fixed;inset:0;z-index:1000;overflow-y:auto;overflow-x:hidden;display:none;',
    'padding:92px clamp(14px,3vw,44px) 70px;',
    'background:radial-gradient(1000px 420px at 50% -10%,rgba(var(--lxg-p),.05),transparent 65%),rgb(var(--lxg-bg));',
    'scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent;}',
    '.lxg-panel.show{display:block;}',

    /* grid (favourites) */
    '.lxg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:20px 16px;}',
    '.lxg-grid .lxg-card{width:auto;}',

    /* section headers: small, minimal glass pill with a thin purple glow outline */
    '.lxg-row{margin:0 0 22px;}',
    '.lxg-rowhead{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:.5rem;padding:.26rem .7rem .26rem .6rem;border-radius:999px;margin:0 0 10px;',
    'background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.02));',
    '-webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);',
    'border:1px solid rgba(var(--lxg-p),.55);',
    'box-shadow:0 0 8px rgba(var(--lxg-p),.28),inset 0 1px 0 rgba(255,255,255,.22);}',
    '.lxg-rowhead h3{margin:0;font-size:.92rem;font-weight:600;color:#fff;letter-spacing:.01em;line-height:1.2;}',
    '.lxg-dot{width:6px;height:6px;border-radius:50%;background:rgb(var(--lxg-p));box-shadow:0 0 6px 1px rgba(var(--lxg-p),.7);}',
    '.lxg-count{font-size:.72rem;color:rgba(255,255,255,.55);padding:0 .1rem;}',
    '.lxg-click{cursor:pointer;transition:box-shadow .2s,background .2s;-webkit-tap-highlight-color:transparent;}',
    '.lxg-click:hover,.lxg-click:focus-visible{outline:none;box-shadow:0 0 12px rgba(var(--lxg-p),.5),inset 0 1px 0 rgba(255,255,255,.3);}',
    '.lxg-chev{font-size:1rem;line-height:1;color:rgba(255,255,255,.6);margin-left:-.1rem;}',
    '.lxg-back{font:inherit;color:#fff;border-width:1px;border-style:solid;}',
    '.lxg-toprow{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 14px;}',
    '.lxg-toprow .lxg-rowhead{margin:0;}',
    '.lxg-scrollwrap{position:relative;}',
    '.lxg-scroller{display:flex;gap:16px;overflow-x:auto;padding:6px 4px 12px;scroll-snap-type:x proximity;scrollbar-width:none;}',
    '.lxg-scroller::-webkit-scrollbar{display:none;}',
    '.lxg-scroller .lxg-card{scroll-snap-align:start;}',
    '.lxg-arrow{position:absolute;top:calc(50% - 40px);width:42px;height:42px;border-radius:50%;color:#fff;font-size:22px;line-height:1;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;padding:0;}',
    '.lxg-scrollwrap:hover .lxg-arrow{opacity:1;}',
    '.lxg-arrow.l{left:-8px;}.lxg-arrow.r{right:-8px;}',
    '.lxg-skel{height:230px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.03),rgba(255,255,255,.07),rgba(255,255,255,.03));background-size:200% 100%;animation:lxgsk 1.4s linear infinite;}',
    '@keyframes lxgsk{to{background-position:-200% 0;}}',

    /* cards */
    '.lxg-card{flex:0 0 auto;width:150px;color:#fff;text-decoration:none;display:block;}',
    '.lxg-poster{aspect-ratio:2/3;border-radius:10px;overflow:hidden;background:#1c1c20;position:relative;',
    'box-shadow:0 6px 18px rgba(0,0,0,.4);transition:transform .25s,box-shadow .25s;}',
    '.lxg-poster img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.lxg-poster .lxg-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.4rem;font-weight:700;color:rgba(255,255,255,.35);}',
    '.lxg-card:hover .lxg-poster,.lxg-card:focus-visible .lxg-poster{transform:translateY(-4px);box-shadow:0 10px 26px rgba(0,0,0,.5),0 0 0 1px rgba(var(--lxg-p),.6),0 0 14px rgba(var(--lxg-p),.35);}',
    '.lxg-t{margin-top:8px;font-weight:600;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.lxg-y{font-size:.82rem;color:rgba(255,255,255,.55);}',

    /* states */
    '.lxg-msg{margin:60px auto;text-align:center;color:rgba(255,255,255,.65);font-size:1.05rem;max-width:420px;padding:26px 28px;border-radius:24px;}',

    /* while a panel is open, hide the things that only make sense for the native grid */
    'body.lxg-panel-on header.MuiAppBar-root>.MuiToolbar-root:nth-child(2),body.lxg-panel-on .alphaPicker,body.lxg-panel-on .alphaPicker-fixed-right{visibility:hidden !important;}',
    CFG.hideNativeTabs ? 'body.lxg-on header.MuiAppBar-root>.MuiToolbar-root>.MuiStack-root:first-of-type,body.lxg-on .headerTabs{display:none !important;}' : '',

    /* phones: bar drops below the app-bar icons and sits on the LEFT, clear of the page arrows */
    '@media (max-width:720px){',
    '.lxg-bar{top:70px;left:12px;transform:none;max-width:calc(100vw - 150px);}',
    '.lxg-bar.lxg-hide{transform:translateY(-260%);}',
    '.lxg-tab{padding:.5rem .8rem;font-size:.9rem;max-width:34vw;}',
    '.lxg-panel{padding-top:132px;}',
    '.lxg-card{width:118px;}',
    '.lxg-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:16px 12px;}',
    '.lxg-arrow{display:none;}',
    '}'
  ].join('\n');

  /* ------------------------------- helpers ------------------------------- */
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

  /* -------------------------------- state -------------------------------- */
  var S = { key: null, kind: null, libId: null, libName: null, tab: 'library', bar: null, panel: null, tabs: {}, genreToken: 0 };
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
    if (S.bar && S.bar.parentNode) S.bar.parentNode.removeChild(S.bar);
    if (S.panel && S.panel.parentNode) S.panel.parentNode.removeChild(S.panel);
    S.bar = S.panel = null; S.key = null; S.genreToken++;
    document.body.classList.remove('lxg-on', 'lxg-panel-on');
  }

  /* ------------------------------- building ------------------------------ */
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

  /* ------------------------------ favourites ----------------------------- */
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
      S.panel.appendChild(header('Favourites', String(items.length)).node);
      var grid = el('div', 'lxg-grid');
      items.forEach(function (it) { grid.appendChild(card(it)); });
      S.panel.appendChild(grid);
    }).catch(function (e) {
      console.warn('[library-glass] favourites', e);
      if (token === S.genreToken) message('Could not load favourites.');
    });
  }

  /* ---------------------- show all items in one genre -------------------- */
  function showGenre(name) {
    var token = ++S.genreToken;
    S.panel.scrollTop = 0;
    S.panel.textContent = '';

    var top = el('div', 'lxg-toprow');
    var back = el('button', 'lxg-rowhead lxg-click lxg-back', '‹  Genres');
    back.type = 'button';
    back.style.padding = '.26rem .8rem';
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
      console.warn('[library-glass] show all', name, e);
      if (token === S.genreToken) grid.textContent = 'Could not load this genre.';
    });
  }

  /* -------------------------------- genres ------------------------------- */
  function renderGenres() {
    var token = ++S.genreToken;
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

      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { io.unobserve(en.target); en.target._load(); }
        });
      }, { root: S.panel, rootMargin: '500px 0px' }) : null;

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
            console.warn('[library-glass] genre', g.Name, e);
            scroller.textContent = '';
          });
        };
        S.panel.appendChild(row);
        if (io) io.observe(row); else row._load();
      });
    }).catch(function (e) {
      console.warn('[library-glass] genres', e);
      if (token === S.genreToken) message('Could not load genres.');
    });
  }

  /* ---------------- hide tab bar on scroll down, show on scroll up --------- */
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

  /* ------------------------------- lifecycle ----------------------------- */
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
    } catch (err) { console.warn('[library-glass]', err); }
  }

  window.addEventListener('hashchange', tick);
  document.addEventListener('viewshow', tick);
  setInterval(tick, 700);
  console.info('[library-glass] loaded');
  tick();
})();
