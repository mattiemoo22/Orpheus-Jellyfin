/*! Orpheus: app bar and navigation (JS Injector plugin, JS only)
 *  Companion to Orpheus.css (the Netflin-based theme). Self-contained: injects its own CSS and reads its
 *  colours and wordmark from the theme's --nf-* tokens, with fallbacks so it still works alone.
 *  Flat, minimal look: ONE permanent solid dark bar that holds every button.
 *
 *  - the stock header is a permanent solid bar (the theme background); it never fades or hides
 *  - ALL buttons sit inside that bar, on one line:
 *      HOME:  harp (left) | Home / Favourites / Search (centre) | profile (right); wordmark on wide screens
 *      OTHER: Home + Back (left) | profile (right)
 *      DASHBOARD: harp + Home + Back (left) | profile (right)
 *  - the nav is aligned to the live position of the stock buttons on every refresh (nothing is cached),
 *    so it can never end up below the bar
 *  - route changes are detected even when Jellyfin navigates without a "hashchange" event
 *  - VIDEO PLAYER: this script stops touching the header completely. It only sets the class "orp-player" on <html>
 *    (the theme CSS uses it to make the player's top bar transparent) and, if the player has no Back button at all,
 *    adds one inside the player's own header, so it shows and hides together with the rest of the player UI. */
(function () {
  'use strict';
  if (window.__orpheusAppBar) return;
  window.__orpheusAppBar = true;

  /* ═══ 1. Settings ═══ */

  const CFG = {
    logoText: 'Orpheus',      // label of the wordmark link (artwork comes from the theme's --nf-wordmark)
    mobileMax: 700,           // px; at or below this width the wordmark is hidden
    barHeight: 48,            // px; height of the strip that holds the nav (matches the bar's content row)
    nav: [
      { id: 'home',   label: 'Home',       href: '#/home',       match: /^#\/home(\.html)?(\?(?!.*tab=1).*)?$/i, icon: 'home'   },
      { id: 'favs',   label: 'Favourites', href: '#/home?tab=1', match: /tab=1/i,                               icon: 'heart'  },
      { id: 'search', label: 'Search',     href: '#/search',     match: /^#\/search/i,                          icon: 'search' }
    ],
    homeHash: /^#!?\/?(home(\.html)?)?(\?.*)?$/i,
    dashHash: /^#!?\/?(dashboard|configurationpage|plugins?|serversettings|metadata|networking|library|librarysettings|librarydisplay|encodingsettings|notificationsettings|userprofiles|useredit|usernew|userlibraryaccess|userparentalcontrol|userpassword|scheduledtasks?|logs?|activity|apikeys|devices?|playbackconfiguration|streamingsettings|dlnasettings|dlnaprofiles?|branding)/i,
    hideOnHash: /^#!?\/?(video|login|selectserver|wizard|forgotpassword|queue|nowplaying)/i,
    playerHash: /^#!?\/?video/i
  };

  /* ═══ 2. Icons ═══ */

  const ICONS = {
    home:   '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5.5h4V20"/>',
    heart:  '<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.6 5 6.6 5c1.9 0 3.5 1 5.4 3 1.9-2 3.5-3 5.4-3 3 0 4.9 2.8 3.8 6.1-1.7 4.8-9.2 9.4-9.2 9.4z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    back:   '<path d="M19.5 12H5"/><path d="M11 5.5 4.5 12l6.5 6.5"/>',
    harp:   '<path d="M6.5 4.5C5 8 5.5 12 8 15c1 1.2 2.4 2 4 2s3-.8 4-2c2.5-3 3-7 1.5-10.5"/><path d="M5 4.5h14"/><path d="M9.5 4.5v10M12 4.5v12.5M14.5 4.5v10"/><path d="M12 17v3M9.5 20h5"/>'
  };
  const svg = (k, size) =>
    '<svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + '</svg>';

  const HARP_URL = 'url("data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + ICONS.harp + '</svg>') + '")';

  /* ═══ 3. CSS ═══
   * Every rule that styles the STOCK site header is scoped to html:not(.orp-player), so none of it can ever
   * reach the video player's top bar. The player's bar is styled by the theme CSS (section 13). */

  const css = `
:root{
  --orp-accent:var(--nf-accent,#b9a2e6);
  --orp-text:var(--nf-text,#fff);
  --orp-text-2:var(--nf-text-2,#e5e5e5);
  --orp-ink:var(--nf-accent-ink,#1b1230);
  --orp-hover:var(--nf-fill-hover,rgb(255 255 255 / 0.08));
  --orp-ease:var(--nf-ease,cubic-bezier(0.5,0,0.1,1));
  --orp-ease-out:var(--nf-ease-out,cubic-bezier(0.2,0,0,1));
  --orp-bar:${CFG.barHeight}px;
  --orp-harp:${HARP_URL};
  --AppBar-background:transparent;--AppBar-color:inherit;
}

/* ── The bar: one permanent, solid, flat strip that holds every button (not in the video player) ── */
html:not(.orp-player) :is(.skinHeader,.skinHeader-withBackground,.skinHeader.semiTransparent,.skinHeader.skinHeader-blurred,
.MuiAppBar-root,.MuiAppBar-colorPrimary,.MuiAppBar-colorDefault,.MuiAppBar-colorTransparent){
  background:rgb(var(--nf-bg-rgb,16 16 16))!important;background-image:none!important;
  box-shadow:0 1px 0 var(--nf-line,rgb(255 255 255 / 0.08))!important;border:0!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  opacity:1!important;visibility:visible!important;}
html:not(.orp-player) :is(.MuiAppBar-root>.MuiToolbar-root,.MuiAppBar-root .MuiPaper-root){
  background:transparent!important;box-shadow:none!important;border:0!important;}
html:not(.orp-player) :is(.skinHeader,.MuiAppBar-root){position:fixed!important;top:0!important;transform:none!important;translate:none!important;}
html:not(.orp-player) :is(.skinHeader::before,.skinHeader::after,.MuiAppBar-root::before,.MuiAppBar-root::after){display:none!important;}
html:not(.orp-player) :is(.pageTitleWithDefaultLogo,.pageTitleWithLogo,img.pageTitle,.headerTabs,.headerBackButton~.pageTitle){display:none!important;}
html:not(.orp-player) .orp-hide{display:none!important;}

/* login, server select, etc.: no site bar at all. The video player is excluded (orp-player), because its
   own top bar carries the player's Back button. */
html[data-orp-mode="off"]:not(.orp-player) :is(.skinHeader:not(.osdHeader),.MuiAppBar-root,header.MuiAppBar-root){display:none!important;}

/* ── Plain icon buttons (site bar only) ── */
html:not(.orp-player) :is(.orp-btn,.orp-sbtn){
  background:transparent!important;border:0!important;border-radius:50%!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;
  color:var(--orp-text)!important;
  transition:background-color .15s var(--orp-ease-out);}
html:not(.orp-player) :is(.orp-btn,.orp-sbtn):hover{background:var(--orp-hover)!important;}
html:not(.orp-player) :is(.orp-btn,.orp-sbtn):focus-visible{outline:2px solid #fff!important;outline-offset:2px!important;}
html:not(.orp-player) .orp-btn .MuiAvatar-root{width:1.6rem!important;height:1.6rem!important;border-radius:var(--nf-radius,4px)!important;
  background:var(--orp-accent)!important;color:var(--orp-ink)!important;}

html:not(.orp-player) :is(.orp-extra,.orp-rhide){display:none!important;}
/* every page except Home: the stock menu + back give way to our Home + Back (profile always stays) */
html[data-orp-mode="sub"] .orp-menu,html[data-orp-mode="sub"] .orp-back{
  visibility:hidden!important;pointer-events:none!important;}
html[data-orp-mode="dash"] .orp-back{visibility:hidden!important;pointer-events:none!important;}

/* hamburger button shows the harp (same action) */
html:not(.orp-player) .orp-menu>*{display:none!important;}
html:not(.orp-player) .orp-menu::after{content:"";display:block;width:24px;height:24px;background:var(--orp-accent);
  -webkit-mask:var(--orp-harp) center/contain no-repeat;mask:var(--orp-harp) center/contain no-repeat;}

/* ── Home nav: sits INSIDE the bar, centred on the same line as the harp and profile buttons ── */
#orpheus-bar{position:fixed;top:calc(var(--orp-cy,24px) - var(--orp-bar) / 2);left:0;right:0;height:var(--orp-bar);
  z-index:1200;pointer-events:none;display:flex;align-items:center;justify-content:center;}
#orpheus-bar.orp-hidden{display:none;}
#orpheus-bar>*{pointer-events:auto;}

#orpheus-bar .orp-logo{position:absolute;left:var(--orp-left,20px);top:50%;transform:translateY(-50%);
  display:flex;align-items:center;text-decoration:none;color:var(--orp-accent);}
#orpheus-bar .orp-logo:focus-visible{outline:2px solid #fff;outline-offset:4px;border-radius:2px;}
#orpheus-bar .orp-word{font:400 1.9rem/1 var(--nf-font-brand,"Bebas Neue",sans-serif);letter-spacing:.02em;white-space:nowrap;}
#orpheus-bar.orp-svgmark .orp-word{display:block;height:1.3rem;aspect-ratio:var(--nf-wordmark-ratio,3.9208);
  background:var(--nf-wordmark) center/contain no-repeat;font-size:0;color:transparent;}

#orpheus-bar .orp-nav{display:flex;align-items:center;gap:2px;}
#orpheus-bar .orp-link{position:relative;display:grid;place-items:center;width:var(--orp-btn,44px);height:var(--orp-btn,44px);
  border-radius:50%;color:var(--orp-text-2);text-decoration:none;cursor:pointer;
  transition:background-color .15s var(--orp-ease-out),color .15s var(--orp-ease-out),transform .12s var(--orp-ease);}
#orpheus-bar .orp-link:hover{background:var(--orp-hover);color:var(--orp-text);}
#orpheus-bar .orp-link:focus-visible{outline:2px solid #fff;outline-offset:2px;}
#orpheus-bar .orp-link:active{transform:scale(.94);}
#orpheus-bar .orp-link.active{color:var(--orp-accent);}
#orpheus-bar .orp-link.active::after{content:"";position:absolute;left:50%;bottom:5px;width:14px;height:2px;margin-left:-7px;
  border-radius:1px;background:var(--orp-accent);}

/* ── Other pages: Home + Back, top left, same line as the stock buttons ── */
#orpheus-sub{position:fixed;top:calc(var(--orp-cy,24px) - var(--orp-btn,44px) / 2);left:var(--orp-edge,12px);
  z-index:1200;display:none;gap:4px;}
html[data-orp-mode="sub"]:not(.orp-player) #orpheus-sub,html[data-orp-mode="dash"]:not(.orp-player) #orpheus-sub{display:flex;}
html[data-orp-mode="dash"].orp-has-menu #orpheus-sub{left:calc(var(--orp-edge,12px) + var(--orp-btn,44px) + 4px);}
#orpheus-sub .orp-sbtn{display:grid;place-items:center;width:var(--orp-btn,44px);height:var(--orp-btn,44px);
  padding:0;margin:0;cursor:pointer;text-decoration:none;box-sizing:border-box;}
#orpheus-sub .orp-sbtn:active{transform:scale(.94);}
#orpheus-sub .orp-sbtn.orp-sub-home{color:var(--orp-accent)!important;}

/* ── Video player: fallback Back button (only added when the player has none of its own) ── */
.orp-pback{display:inline-grid;place-items:center;flex:none;width:40px;height:40px;margin:0 2px;padding:0;
  border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;
  filter:drop-shadow(0 1px 3px rgb(0 0 0 / 0.7));-webkit-tap-highlight-color:transparent;
  transition:background-color .15s var(--orp-ease-out);}
.orp-pback:hover,.orp-pback:focus-visible{background:rgb(255 255 255 / 0.12);}
.orp-pback:focus-visible{outline:2px solid #fff;outline-offset:2px;}

@media (max-width:${CFG.mobileMax}px){
  #orpheus-bar .orp-logo{display:none;}
}`;

  const style = document.createElement('style');
  style.id = 'orpheus-appbar-css';
  style.textContent = css;
  document.head.appendChild(style);

  /* ═══ 4. DOM we add ═══ */

  const bar = document.createElement('div');
  bar.id = 'orpheus-bar';
  bar.innerHTML =
    '<a class="orp-logo" href="#/home" aria-label="' + CFG.logoText + '">' +
      '<span class="orp-word">' + CFG.logoText + '</span>' +
    '</a>' +
    '<nav class="orp-nav">' +
      CFG.nav.map((n) =>
        '<a class="orp-link" data-id="' + n.id + '" href="' + n.href + '" title="' + n.label +
        '" aria-label="' + n.label + '">' + svg(n.icon, 22) + '</a>').join('') +
    '</nav>';
  document.body.appendChild(bar);

  function syncWordmark() {
    const has = !!getComputedStyle(document.documentElement).getPropertyValue('--nf-wordmark').trim();
    bar.classList.toggle('orp-svgmark', has);
  }

  const sub = document.createElement('div');
  sub.id = 'orpheus-sub';
  sub.innerHTML =
    '<a class="orp-sbtn orp-sub-home" href="#/home" title="Home" aria-label="Home">' + svg('home', 22) + '</a>' +
    '<button type="button" class="orp-sbtn orp-sub-back" title="Back" aria-label="Back">' + svg('back', 22) + '</button>';
  document.body.appendChild(sub);
  sub.querySelector('.orp-sub-back').addEventListener('click', () => {
    if (history.length > 1) history.back(); else location.hash = '#/home';
  });

  const mine = (n) => bar.contains(n) || sub.contains(n);

  /* The video player: detected from the route OR from its page element. While it is open, this script leaves
     every header element alone (no classes, no measuring, no hiding). */
  const playerOpen = () => !!document.querySelector('#videoOsdPage:not(.hide)');
  const isPlayer = () => CFG.playerHash.test(location.hash || '') || playerOpen();
  const inPlayer = (n) => isPlayer() || !!(n.closest && n.closest('.osdHeader, .videoOsd-appBar'));
  const labelOf = (b) => ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '')).toLowerCase();

  function syncPlayerFlag() {
    const on = isPlayer();
    const c = document.documentElement.classList;
    if (c.contains('orp-player') !== on) c.toggle('orp-player', on);
  }

  /* ═══ 5. Stock header ═══ */

  function stockHeaders() {
    return Array.from(document.querySelectorAll('.MuiAppBar-root, .skinHeader, header'))
      .filter((h) => !mine(h) && !inPlayer(h));
  }
  function topHeaders() {
    const w = window.innerWidth, all = stockHeaders();
    const top = all.filter((h) => {
      const r = h.getBoundingClientRect();
      return /fixed|sticky/.test(getComputedStyle(h).position) && r.top <= 4 && r.width >= w * 0.8 && r.height <= 160;
    });
    return top.length ? top : all;
  }
  const inHeader = (b, hs) => hs.some((h) => h.contains(b));
  /* Anything in the page's own second toolbar (page count, prev/next arrows, sort/filter) is left alone:
     it must never be hidden, restyled or used for measuring. Only the first toolbar is "the bar". */
  const inSecond = (n) => {
    const t = n.closest && n.closest('.MuiAppBar-root>.MuiToolbar-root');
    return !!t && t !== t.parentElement.querySelector(':scope>.MuiToolbar-root');
  };

  function findStockUser() {
    const av = Array.from(document.querySelectorAll('.MuiAppBar-root .MuiAvatar-root, .skinHeader .MuiAvatar-root, .headerUserButton'))
      .find((n) => !inPlayer(n));
    return av ? (av.closest('button, a') || av) : null;
  }
  let stockUser = null;

  function cleanStock() {
    stockUser = findStockUser();
    const w = window.innerWidth;
    const limit = w > CFG.mobileMax ? w * 0.62 : w * 0.5;
    const sel = 'a, button, img, h1, h2, h3, .MuiTypography-root, [role="tab"], [class*="pageTitle"]';
    topHeaders().forEach((hdr) => {
      hdr.querySelectorAll(sel).forEach((n) => {
        if (inSecond(n) || inPlayer(n)) return;
        const label = labelOf(n);
        const r = n.getBoundingClientRect();
        const isUser = !!stockUser && (n === stockUser || stockUser.contains(n) || n.contains(stockUser));
        const isNavBtn = /back|indietro|menu|drawer/.test(label) || n.classList.contains('orp-menu') ||
          n.classList.contains('orp-back') || n.classList.contains('orp-extra');
        const isSearch = n.matches('[href*="#/search"]') || /search|cerca/.test(label) ||
          !!n.querySelector('[data-testid="SearchIcon"]');
        if (!isUser && (isSearch || (!isNavBtn && r.width && r.right < limit))) n.classList.add('orp-hide');
        if (n.tagName === 'BUTTON' && !n.classList.contains('orp-hide') && !n.closest('.orp-hide') &&
            (r.width || n.classList.contains('orp-btn'))) {
          n.classList.add('orp-btn');
        }
      });
    });
    if (stockUser) stockUser.classList.add('orp-user');
    document.querySelectorAll('.orp-rhide').forEach((b) => {
      if (b.querySelector('.MuiAvatar-root') || b.classList.contains('headerUserButton')) b.classList.remove('orp-rhide');
    });
    classifyLeft();
    classifyRight();
  }

  const ROLES = ['orp-menu', 'orp-back', 'orp-extra', 'orp-user', 'orp-rhide'];
  function classifyLeft() {
    const w = window.innerWidth, hs = topHeaders();
    const fresh = Array.from(document.querySelectorAll('.orp-btn')).filter((b) => {
      if (mine(b) || inPlayer(b) || b.closest('.orp-hide') || !inHeader(b, hs) || inSecond(b)) return false;
      if (ROLES.some((c) => b.classList.contains(c))) return false;
      const r = b.getBoundingClientRect();
      return r.width && r.top < 160 && (r.left + r.width / 2) < w * 0.5;
    });
    if (!fresh.length) return;
    const isBack = (b) => /back|indietro|atr\u00e1s|retour|zur\u00fcck/.test(labelOf(b)) ||
      b.classList.contains('headerBackButton') ||
      !!b.querySelector('[data-testid^="ArrowBack"], [data-testid^="ChevronLeft"], .arrow_back, .headerBackButton');
    let haveMenu = !!document.querySelector('.orp-menu');
    fresh.filter(isBack).forEach((b) => b.classList.add('orp-back'));
    fresh.filter((b) => !b.classList.contains('orp-back'))
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .forEach((b) => {
        if (!haveMenu) { b.classList.add('orp-menu'); haveMenu = true; }
        else b.classList.add('orp-extra');
      });
  }

  function classifyRight() {
    const w = window.innerWidth, hs = topHeaders();
    const fresh = Array.from(document.querySelectorAll('.orp-btn')).filter((b) => {
      if (mine(b) || inPlayer(b) || b.closest('.orp-hide') || !inHeader(b, hs) || inSecond(b)) return false;
      if (ROLES.some((c) => b.classList.contains(c))) return false;
      const r = b.getBoundingClientRect();
      return r.width && r.top < 160 && (r.left + r.width / 2) >= w * 0.5;
    }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    if (!fresh.length) return;
    const isProfile = (b) => b === stockUser || b.classList.contains('headerUserButton') ||
      /profile|account/.test(labelOf(b)) ||
      !!b.querySelector('.MuiAvatar-root, [data-testid^="Person"], [data-testid^="AccountCircle"]');
    const isExtra = (b) => /headerSyncButton|headerCastButton/.test(b.className) ||
      /syncplay|sync play|cast|play on|remote/.test(labelOf(b)) ||
      !!b.querySelector('[data-testid^="Group"], [data-testid^="Cast"]');
    const rightmost = fresh[fresh.length - 1];
    fresh.forEach((b) => {
      if (isProfile(b)) b.classList.add('orp-user');
      else if (b !== rightmost && (isExtra(b) || fresh.length >= 3)) b.classList.add('orp-rhide');
    });
  }

  function syncMenuFlag() {
    const m = document.querySelector('.orp-menu');
    const vis = !!m && !m.closest('.orp-hide') && m.getClientRects().length > 0;
    document.documentElement.classList.toggle('orp-has-menu', vis);
  }

  /* ═══ 6. Alignment (live, never cached) ═══ */

  /* Line our nav / Home+Back up with the stock buttons that are actually on screen right now.
     The reference is the profile button (always visible), then the harp, then any other bar button;
     the vertical centre is read straight from its rectangle, so the nav always lands on the bar's row. */
  function setVar(name, value) {
    const root = document.documentElement.style;
    if (root.getPropertyValue(name) !== value) root.setProperty(name, value);
  }
  function align() {
    const w = window.innerWidth, hs = topHeaders();
    const usable = (b) => {
      if (!b || mine(b) || inPlayer(b) || b.closest('.orp-hide') || !inHeader(b, hs) || inSecond(b)) return null;
      const r = b.getBoundingClientRect();
      return r.width && r.height && r.top < 160 ? r : null;
    };
    const ref = usable(document.querySelector('.orp-user')) || usable(document.querySelector('.orp-menu')) ||
      (Array.from(document.querySelectorAll('.orp-btn')).map(usable).filter(Boolean)[0] || null);
    if (!ref) return;                                     /* header not drawn yet: try again next refresh */

    const cy = ref.top + ref.height / 2;
    if (cy < 10 || cy > 120) return;
    setVar('--orp-cy', cy.toFixed(1) + 'px');

    let left = 0, edge = null;
    document.querySelectorAll('.orp-btn').forEach((b) => {
      const r = usable(b);
      if (!r || r.right >= w * 0.35) return;
      left = Math.max(left, r.right);
      edge = edge === null ? r.left : Math.min(edge, r.left);
    });
    setVar('--orp-left', (left ? Math.round(left + 10) : 20) + 'px');
    setVar('--orp-edge', (edge !== null ? Math.round(edge) : 12) + 'px');
    const bh = Math.round(ref.height);
    if (bh >= 36 && bh <= 56) setVar('--orp-btn', bh + 'px');
  }

  /* ═══ 7. Route ═══ */

  /* mode: 'home' = nav in the bar, 'dash' = harp + Home + Back, 'sub' = Home + Back, 'off' = hidden */
  function syncRoute() {
    const h = location.hash || '#/home';
    const mode = CFG.hideOnHash.test(h) ? 'off'
      : CFG.homeHash.test(h) ? 'home'
      : CFG.dashHash.test(h) ? 'dash' : 'sub';
    document.documentElement.dataset.orpMode = mode;
    bar.classList.toggle('orp-hidden', mode !== 'home');
    let hit = null;
    CFG.nav.forEach((n) => { if (!hit && n.match.test(h)) hit = n.id; });
    bar.querySelectorAll('.orp-link').forEach((p) => p.classList.toggle('active', p.dataset.id === hit));
    syncWordmark();
  }

  /* ═══ 8. Video player Back button ═══ */

  /* The player's own header normally has a Back button. If, for any reason, there is none, add one INSIDE that
     header so it shows and hides together with the rest of the player UI (nothing is forced visible). */
  function ensurePlayerBack() {
    const ours = document.getElementById('orpheus-player-back');
    if (!isPlayer()) { if (ours) ours.remove(); return; }
    const host = document.querySelector('.osdHeader .videoOsd-appBar') ||
      document.querySelector('.osdHeader') ||
      document.querySelector('#videoOsdPage .MuiAppBar-root .MuiToolbar-root');
    if (!host) return;
    const hasStock = Array.from(host.querySelectorAll('button, a')).some((b) =>
      b !== ours && (b.classList.contains('headerBackButton') || /back|indietro/.test(labelOf(b)) ||
      !!b.querySelector('[data-testid^="ArrowBack"], .arrow_back')));
    if (hasStock) { if (ours) ours.remove(); return; }
    if (ours && host.contains(ours)) return;
    if (ours) ours.remove();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'orpheus-player-back';
    btn.className = 'orp-pback';
    btn.title = 'Back';
    btn.setAttribute('aria-label', 'Back');
    btn.innerHTML = svg('back', 24);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (history.length > 1) history.back(); else location.hash = '#/home';
    });
    host.insertBefore(btn, host.firstChild);
  }

  /* ═══ 9. Lifecycle ═══ */

  let lastRoute = null;
  function routeChanged() {
    const r = location.hash || '#/home';
    if (r === lastRoute) return false;
    lastRoute = r;
    syncRoute();
    return true;
  }

  /* Debounced: many DOM changes in a row (carousels, lists loading) cost a single pass after things settle. */
  let timer = 0;
  function refresh() {
    syncPlayerFlag();
    routeChanged();
    ensurePlayerBack();
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      if (isPlayer()) return;                              /* never touch the header while the player is open */
      requestAnimationFrame(() => { cleanStock(); syncMenuFlag(); align(); });
    }, 150);
  }

  /* Watch ONLY the header element itself (not the whole page), so the script costs nothing while posters,
     rows and carousels load. It re-attaches if the header is ever replaced. */
  let hdrObs = null, hdrTarget = null;
  function watchHeader() {
    const h = Array.from(document.querySelectorAll('.MuiAppBar-root, .skinHeader'))
      .find((n) => !mine(n) && !inPlayer(n));
    if (!h || (h === hdrTarget && h.isConnected)) return;
    if (hdrObs) hdrObs.disconnect();
    hdrTarget = h;
    hdrObs = new MutationObserver(refresh);
    hdrObs.observe(h, { childList: true, subtree: true });
    refresh();
  }

  ['pushState', 'replaceState'].forEach((k) => {
    const orig = history[k];
    if (typeof orig !== 'function') return;
    history[k] = function () {
      const res = orig.apply(this, arguments);
      try { refresh(); } catch (e) { /* never break navigation */ }
      return res;
    };
  });
  window.addEventListener('popstate', refresh);
  window.addEventListener('hashchange', refresh);
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  /* cheap checks only: a string compare for the route, a couple of querySelectors; no layout reads */
  setInterval(() => {
    syncPlayerFlag();
    if (routeChanged()) refresh();
    ensurePlayerBack();
    watchHeader();
  }, 500);
  syncPlayerFlag();
  watchHeader();
  refresh();
})();
