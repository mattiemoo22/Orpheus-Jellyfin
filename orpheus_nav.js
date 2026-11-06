/* Orpheus app bar - self-contained, loaded via Javascript Injector.
   Abyss-style "no bar" look:
   - the stock header becomes transparent; its buttons turn into frosted lavender squares floating over the hero
   - the hamburger button now shows the harp (same action as before); the old separate harp button is hidden
   - HOME screen: glass pill nav (Home / Favourites / Search) under the icons, "Orpheus" wordmark on desktop
   - EVERY OTHER screen: no pill nav, just a frosted Home button + Back button at the top left
   - DASHBOARD screens: harp (opens the dashboard menu) + Home + Back
   - the header is pinned and measured once per page, so nothing drifts while you scroll

   v2 fixes:
   - route changes are now detected even when Jellyfin navigates without a "hashchange" event
     (history.pushState / popstate / polling), so the pill nav can no longer get stuck on library,
     dashboard or season pages
   - the "scrolled" state is recomputed from the real scroll position, so it can no longer get stuck
     and hide every button (this is what removed Back/Home on season pages)
   - dashboard pages keep the harp so the dashboard menu stays reachable
   - hideOnHash only matches the start of the route (a "homevideos" library no longer counts as the video player) */
(function () {
  'use strict';
  if (window.__orpheusAppBar) return;
  window.__orpheusAppBar = true;

  /* ---------- CONFIG: edit these ---------- */
  const CFG = {
    accent: '#B9A6E8',        // set to your step-1 accent hex
    logoText: 'Orpheus',      // wordmark font: Playfair Display Bold (SIL OFL), subset + embedded below
    mobileMax: 700,           // px; at or below this width the two-row pill layout is used
    nav: [                    // routes may need adjusting on 12.x
      { id: 'home',   label: 'Home',       href: '#/home',       match: /^#\/home(\.html)?(\?(?!.*tab=1).*)?$/i, icon: 'home'   },
      { id: 'favs',   label: 'Favourites', href: '#/home?tab=1', match: /tab=1/i,                               icon: 'heart'  },
      { id: 'search', label: 'Search',     href: '#/search',     match: /^#\/search/i,                          icon: 'search' }
    ],
    /* the full pill nav shows only on these routes (Home and its Favourites tab) */
    homeHash: /^#!?\/?(home(\.html)?)?(\?.*)?$/i,
    /* admin / dashboard routes: these keep the harp (dashboard menu) next to Home + Back */
    dashHash: /^#!?\/?(dashboard|configurationpage|plugins?|serversettings|metadata|networking|library|librarysettings|librarydisplay|encodingsettings|notificationsettings|userprofiles|useredit|usernew|userlibraryaccess|userparentalcontrol|userpassword|scheduledtasks?|logs?|activity|apikeys|devices?|playbackconfiguration|streamingsettings|dlnasettings|dlnaprofiles?|branding)/i,
    /* nothing of ours is shown on these routes (player, login, ...) */
    hideOnHash: /^#!?\/?(video|login|selectserver|wizard|forgotpassword|queue|nowplaying)/i,
    heroUnderBar: true,       // slide the home hero up so it sits behind the floating buttons
    debug: false              // small on-screen readout of route / mode / what the script found (tap it to dismiss)
  };
  /* ---------------------------------------- */

  const ICONS = {
    home:   '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5.5h4V20"/>',
    heart:  '<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.6 5 6.6 5c1.9 0 3.5 1 5.4 3 1.9-2 3.5-3 5.4-3 3 0 4.9 2.8 3.8 6.1-1.7 4.8-9.2 9.4-9.2 9.4z"/>',
    tv:     '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M8 3.5 12 6l4-2.5"/><path d="M8 21h8"/>',
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

  const css = `
@font-face{font-family:"Orpheus Wordmark";font-weight:700;font-style:normal;font-display:swap;
  src:url("data:font/woff2;base64,d09GMgABAAAAAAV8ABAAAAAACqAAAAUhAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbgWgcKgZgP1NUQVREAFwRCAqHaIZAATYCJAMgCxIABCAFhSAHIAwHG9AIUVRxGih+HDjOM0QprK1NaekvoxEu4lkfNW8RVGv/9uztQ1BfEQgdB0SeyQLqWPapKJQROi7GxdH+/bre7gmJ8c8lKwHIC6iU+/nv2p+5kVNNxNSmzcLugyLwBP3J83/MdNE2nFWLjKYzzPggC6ymiMLy8UC77k4k7fAOr3Xv7GwzkTQ0fbX1U5yIXJwTKXvkXgS6gCSEhhBoW9SDb7I7vyF7IdJWISvD0og4H2uqEOcmyFqaaFdNaEquCeOBv4YGlK9IKuDK39blh2z49UT9Ta1EfGosb3JAMYe6UIWoqcsdkkQslLGuSiu8rIIuJdDqnJbTphrpWToGYOdjkDgDudBBguGsLYf2AK/t5eRZiZAf+6MEEjl+ALNxNFHbvTCFYxF+O563MeDsDULGMkI2hEHk9B2VkKLPWcOuqUDShOFTYduAvsPwur0YPJ3FOeUszHzn8ql0lY7SWBpKvUhGiVLwXLMJhkCLOAEQHwD5f4KnW8VwqGh8JSGlbaaVXHH7NtBu3WI/cecORr971/cEA4AmAI6KBjB6E6m8gVOUY+DO/GG75YM3tl6Qy30rO6oKndY9itHCXY6K88RYHyDaGAcM37G8rTxWMYEx0LvH2U+szoqvY6JPs2NDHBV3wxlpazuKQecfT7RbL5DCbWsf1Ddj/flt9hPXpCUX7iZXrE0BbZP9xDZGn1FqFhxcnewERNsC7qIEHTsXwyvO42tyHK23gL37zpUbbILFeVll7fpcCQuWFZuHhZpbRdg77mIcfb8KRibOpTfMxm/sY/STd/MRbYoDhieoZ4N5RMf7MWyOBdG6xnrDxoLzgsrrSd2+/r3ZGYEjvaHxzGF9WRlBI92h0XwGXoFqXQlJ2p1+ProMsTs+WbvjJQDBHxAdn+fIfxm4vK4Tcpr+jLEKHGzctoq+y1L4pRvm+BLV3p1iYBNvaJQbHGpWnGYC3FTugIM+yrqqOs/RRyoXeVkOl3ZB8koOiBeXLCX1icZBQuzSgKwwWSqJ89rKd3VDmrjcZdKQMq6Af5JUcWSGlzxRGv9IvDYIURXszMEyE8pfKOvymme1xkZ119NI83aUTjVx8lHQVfrF2llnLUIxEUpz9cMjA8XkR6hWIn5GkM4vXaQirDAtJxclIX5I7eYtWZGcB4Jsms818Ah/pKnsiSzcEcbPkXRgfhO6XmwAj/nJV/eFcnAxzMMatxGzdyUlMqQkTY69YfX4WaFQrXzkdCQ/sp5Oaqh/qYVLYcEuuK+UVxrJ99edUDs+9/OAiRLlr5sksPEMfPkvvJAi7Zm+n8j0IXVI3WfosdbfqVO6icONhNjUoAyzcF8AEACC+iO3pTY4nMfkKysDwzsAfkq4uwDwy6L/579P/03z1+oaYMAMyCpdIaCGaTD/DNoIoP+uibTBhIEAVeyHJRQBAogkAHJxUymuaKUwyAg0vVJ3UQRyXhboeKYSuUUsAoYWZkOeljRjE62yIVxo2Xoco9XMxDy1bjUu8QTd+E3LmrGJ1tNN7t7XTl0baXQBk4DDsyE9HV3joXrzUOb8OxkhwCIITMiawKKLYl24SSNiUKDlCw4bT2OyIBUHjb0Uw2fa2jhCX+YgtVA0ijYKO8xhYXA4DKR0Owa/ZmhVA+KBHcgTA8KbXBW9kbY0aiByRVDSVVc+eitrKYctaWS0rlaBpL65bdu9+Ug19E1AtjXL9bpvMRohVQHyzo2j+Yd58+EHNoJMQHm+xIcRVCGgdJoi/89RHn7MLwEA") format("woff2");}
:root{--orp-accent:${CFG.accent};--orp-harp:${HARP_URL};--AppBar-background:transparent;--AppBar-color:inherit;}

/* stock header: no bar, no logo/title/library links; pinned so it can't slide or drift while scrolling */
.skinHeader,.skinHeader-withBackground,.skinHeader.semiTransparent,.skinHeader.skinHeader-blurred,
.MuiAppBar-root,.MuiAppBar-root>.MuiToolbar-root,.MuiAppBar-colorPrimary,.MuiAppBar-colorDefault,
.MuiAppBar-root .MuiPaper-root,.orp-clear{
  background:transparent!important;background-color:transparent!important;background-image:none!important;
  box-shadow:none!important;border:0!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
.skinHeader,.MuiAppBar-root{position:fixed!important;top:0!important;transform:none!important;translate:none!important;}
.skinHeader::before,.skinHeader::after,.MuiAppBar-root::before,.MuiAppBar-root::after{display:none!important;}
.pageTitleWithDefaultLogo,.pageTitleWithLogo,img.pageTitle,.headerTabs,.headerBackButton~.pageTitle{display:none!important;}
.orp-hide{display:none!important;}

/* frosted lavender squares: the stock header buttons and our own Home/Back buttons */
.orp-btn,.orp-sbtn{
  background:rgba(255,255,255,.12)!important;
  background:color-mix(in srgb,var(--orp-accent) 16%,rgba(255,255,255,.07))!important;
  border:1px solid rgba(255,255,255,.14)!important;border-radius:14px!important;
  backdrop-filter:blur(18px) saturate(170%)!important;-webkit-backdrop-filter:blur(18px) saturate(170%)!important;
  box-shadow:0 6px 20px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.16)!important;
  color:#fff!important;}
.orp-btn .MuiAvatar-root{background:transparent!important;color:#fff!important;}

/* the old harp button, SyncPlay (group) and cast buttons are gone for good */
.orp-extra,.orp-rhide{display:none!important;}
/* on every page except Home the stock menu + back buttons give way to our Home + Back.
   The profile button is always visible, on every page.
   (visibility, not display, so the header keeps its size and the buttons stay measurable) */
html[data-orp-mode="sub"] .orp-menu,html[data-orp-mode="sub"] .orp-back{
  visibility:hidden!important;pointer-events:none!important;}
/* dashboard pages: the menu (harp) stays so the dashboard sections are reachable; only the stock back gives way */
html[data-orp-mode="dash"] .orp-back{visibility:hidden!important;pointer-events:none!important;}

/* the hamburger button now shows the harp (still opens the same menu) */
.orp-menu>*{display:none!important;}
.orp-menu::after{content:"";display:block;width:24px;height:24px;background:var(--orp-accent);
  -webkit-mask:var(--orp-harp) center/contain no-repeat;mask:var(--orp-harp) center/contain no-repeat;}

/* home hero slides up under the floating buttons (classes added/removed by the script) */
.orp-lift-m{margin-top:calc(-1 * var(--orp-lift,0px))!important;}
.orp-lift-t{position:relative!important;top:calc(-1 * var(--orp-lift,0px))!important;}
.orp-flush-p{padding-top:0!important;}
.orp-flush-m{margin-top:0!important;}

/* empty spacer that reserved room for the header: squeezed to nothing (the buttons are not inside it) */
.orp-collapse{height:0!important;min-height:0!important;max-height:0!important;padding:0!important;margin:0!important;
  border:0!important;overflow:hidden!important;flex:0 0 0!important;}
#orpheus-debug{position:fixed;left:4px;right:4px;bottom:96px;z-index:99999;margin:0;padding:6px;border-radius:8px;
  background:rgba(0,0,0,.84);color:#9f9;font:9px/1.25 ui-monospace,Menlo,monospace;white-space:pre-wrap;
  word-break:break-all;max-height:46vh;overflow:auto;}

/* HOME: a transparent strip aligned with the stock icons; holds wordmark + pills */
#orpheus-bar{position:fixed;top:calc(var(--orp-cy,23px) - 32px);left:0;right:0;height:64px;z-index:1200;pointer-events:none;
  display:flex;align-items:center;justify-content:center;}
#orpheus-bar.orp-hidden{display:none;}
#orpheus-bar>*{pointer-events:auto;}
/* slides away once you scroll down, comes back at the top */
#orpheus-bar{transition:opacity .22s ease,transform .22s ease,visibility 0s;}
html.orp-scrolled #orpheus-bar{opacity:0;transform:translateY(-10px);visibility:hidden;pointer-events:none;
  transition:opacity .22s ease,transform .22s ease,visibility 0s linear .22s;}
/* the side icons (harp, profile, and Home/Back on other pages) go with it */
.orp-btn,#orpheus-sub{transition:opacity .22s ease,transform .22s ease,visibility 0s;}
html.orp-scrolled .orp-btn,html.orp-scrolled #orpheus-sub{opacity:0!important;transform:translateY(-10px)!important;
  visibility:hidden!important;pointer-events:none!important;
  transition:opacity .22s ease,transform .22s ease,visibility 0s linear .22s!important;}

#orpheus-bar .orp-logo{position:absolute;left:var(--orp-left,20px);top:50%;transform:translateY(-50%);
  display:flex;align-items:center;text-decoration:none;color:var(--orp-accent);}
#orpheus-bar .orp-word{font-family:"Orpheus Wordmark","Playfair Display",Georgia,"Times New Roman",serif;font-weight:700;
  font-size:26px;letter-spacing:.02em;line-height:1;white-space:nowrap;
  text-shadow:0 0 18px color-mix(in srgb,var(--orp-accent) 35%,transparent);}

#orpheus-bar .orp-pills{display:flex;gap:4px;padding:3px;border-radius:999px;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);
  backdrop-filter:blur(20px) saturate(170%);-webkit-backdrop-filter:blur(20px) saturate(170%);
  box-shadow:0 6px 24px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.18);}
#orpheus-bar .orp-pill{display:grid;place-items:center;width:calc(var(--orp-btn,45px) - 8px);height:calc(var(--orp-btn,45px) - 8px);border-radius:999px;
  color:rgba(255,255,255,.85);background:transparent;border:1px solid transparent;cursor:pointer;padding:0;
  transition:background .18s,color .18s,border-color .18s,transform .12s;text-decoration:none;}
#orpheus-bar .orp-pill:hover{background:rgba(255,255,255,.12);color:#fff;}
#orpheus-bar .orp-pill:active{transform:scale(.94);}
#orpheus-bar .orp-pill.active{color:var(--orp-accent);
  background:color-mix(in srgb,var(--orp-accent) 20%,rgba(255,255,255,.06));
  border-color:color-mix(in srgb,var(--orp-accent) 55%,transparent);}

/* OTHER PAGES: Home + Back, top left, same size and line as the stock buttons */
#orpheus-sub{position:fixed;top:calc(var(--orp-cy,23px) - var(--orp-btn,45px) / 2);left:var(--orp-edge,13px);
  z-index:1200;display:none;gap:8px;}
html[data-orp-mode="sub"] #orpheus-sub,html[data-orp-mode="dash"] #orpheus-sub{display:flex;}
/* dashboard pages: sit to the right of the harp (only when the harp is actually on screen) */
html[data-orp-mode="dash"].orp-has-menu #orpheus-sub{left:calc(var(--orp-edge,13px) + var(--orp-btn,45px) + 8px);}
#orpheus-sub .orp-sbtn{display:grid;place-items:center;width:var(--orp-btn,45px);height:var(--orp-btn,45px);
  padding:0;margin:0;cursor:pointer;text-decoration:none;box-sizing:border-box;transition:transform .12s;}
#orpheus-sub .orp-sbtn:active{transform:scale(.94);}
#orpheus-sub .orp-sbtn.orp-sub-home{color:var(--orp-accent)!important;}

/* phone: no wordmark; the pills stay centred on the same row as the menu + profile buttons */
@media (max-width:${CFG.mobileMax}px){
  #orpheus-bar .orp-logo{display:none;}
}`;

  const style = document.createElement('style');
  style.id = 'orpheus-appbar-css';
  style.textContent = css;
  document.head.appendChild(style);

  /* Home bar (wordmark + pills) */
  const bar = document.createElement('div');
  bar.id = 'orpheus-bar';
  bar.innerHTML =
    '<a class="orp-logo" href="#/home" aria-label="' + CFG.logoText + '">' +
      '<span class="orp-word">' + CFG.logoText + '</span>' +
    '</a>' +
    '<nav class="orp-pills">' +
      CFG.nav.map((n) =>
        '<a class="orp-pill" data-id="' + n.id + '" href="' + n.href + '" title="' + n.label +
        '" aria-label="' + n.label + '">' + svg(n.icon) + '</a>').join('') +
    '</nav>';
  document.body.appendChild(bar);

  /* Every other page: Home + Back */
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
  const labelOf = (b) => ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '')).toLowerCase();

  function stockHeaders() {
    return Array.from(document.querySelectorAll('.MuiAppBar-root, .skinHeader, header'))
      .filter((h) => !mine(h));
  }

  /* the real header(s): fixed/sticky at the very top. Page toolbars (sort, grid, next/prev) are not included,
     so they can never throw off the measurements. */
  function topHeaders() {
    const w = window.innerWidth, all = stockHeaders();
    const top = all.filter((h) => {
      const r = h.getBoundingClientRect();
      return /fixed|sticky/.test(getComputedStyle(h).position) && r.top <= 4 && r.width >= w * 0.8 && r.height <= 160;
    });
    return top.length ? top : all;
  }
  const inHeader = (b, hs) => hs.some((h) => h.contains(b));

  function findStockUser() {
    const av = document.querySelector('.MuiAppBar-root .MuiAvatar-root, .skinHeader .MuiAvatar-root, .headerUserButton');
    if (av) return av.closest('button, a') || av;
    return null;
  }
  let stockUser = null;

  /* hide stock logo, title, library links and the stock search icon (search lives in the pills);
     style every remaining header button as a frosted square */
  function cleanStock() {
    stockUser = findStockUser();
    const w = window.innerWidth;
    const limit = w > CFG.mobileMax ? w * 0.62 : w * 0.5;
    const sel = 'a, button, img, h1, h2, h3, .MuiTypography-root, [role="tab"], [class*="pageTitle"]';
    topHeaders().forEach((hdr) => {
      hdr.querySelectorAll(sel).forEach((n) => {
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
    /* self-heal: if the profile button was ever hidden by mistake, bring it back */
    document.querySelectorAll('.orp-rhide').forEach((b) => {
      if (b.querySelector('.MuiAvatar-root') || b.classList.contains('headerUserButton')) b.classList.remove('orp-rhide');
    });
    classifyLeft();
    classifyRight();
  }

  /* Left-hand stock buttons: stock back -> .orp-back, the leftmost other one (the hamburger) -> .orp-menu
     (it gets the harp), anything else on the left (the old harp button) -> .orp-extra (hidden). Done once per
     button, so buttons hidden afterwards keep their role. */
  const ROLES = ['orp-menu', 'orp-back', 'orp-extra', 'orp-user', 'orp-rhide'];
  function classifyLeft() {
    const w = window.innerWidth, hs = topHeaders();
    const fresh = Array.from(document.querySelectorAll('.orp-btn')).filter((b) => {
      if (mine(b) || b.closest('.orp-hide') || !inHeader(b, hs)) return false;
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

  /* Right-hand stock buttons: the profile button is kept (.orp-user); SyncPlay/group and cast (anything
     else on the right) become .orp-rhide and disappear. */
  function classifyRight() {
    const w = window.innerWidth, hs = topHeaders();
    const fresh = Array.from(document.querySelectorAll('.orp-btn')).filter((b) => {
      if (mine(b) || b.closest('.orp-hide') || !inHeader(b, hs)) return false;
      if (ROLES.some((c) => b.classList.contains(c))) return false;
      const r = b.getBoundingClientRect();
      return r.width && r.top < 160 && (r.left + r.width / 2) >= w * 0.5;
    }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    if (!fresh.length) return;
    /* The profile button is NEVER hidden. Only buttons that look like SyncPlay/cast are removed, and the
       rightmost button is always kept as a safety net. */
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

  /* dashboard pages: tell the CSS whether the harp is really on screen (on wide screens the dashboard
     has a permanent side menu and no menu button) so Home + Back sit next to it, or at the edge */
  function syncMenuFlag() {
    const m = document.querySelector('.orp-menu');
    const vis = !!m && !m.closest('.orp-hide') && m.getClientRects().length > 0;
    document.documentElement.classList.toggle('orp-has-menu', vis);
  }

  function forceClear(n) {
    n.style.setProperty('background', 'transparent', 'important');
    n.style.setProperty('box-shadow', 'none', 'important');
    n.style.setProperty('backdrop-filter', 'none', 'important');
    n.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
  }
  function clearHeaderBg() {
    stockHeaders().forEach((h) => {
      const r = h.getBoundingClientRect();
      if (r.top > 4 || r.width < window.innerWidth * 0.8) return;
      forceClear(h);
      h.querySelectorAll('.MuiToolbar-root, .MuiPaper-root').forEach(forceClear);
    });
  }

  function hasBg(c) { return c && c !== 'transparent' && !/(,\s*0\)|\/\s*0\))$/.test(c.trim()); }
  function clearTopBars() {
    const w = window.innerWidth, seen = new Set();
    [8, 30, 54].forEach((y) => [w * 0.5, w * 0.9].forEach((x) => {
      document.elementsFromPoint(x, y).forEach((n) => {
        if (seen.has(n) || n === document.body || n === document.documentElement || mine(n)) return;
        seen.add(n);
        const r = n.getBoundingClientRect();
        if (r.height > 110 || r.width < w * 0.8) return;
        if (hasBg(getComputedStyle(n).backgroundColor)) { n.classList.add('orp-clear'); forceClear(n); }
      });
    }));
  }

  /* Line the Orpheus strip / Home+Back buttons up with the stock icons.
     Measured ONCE per page and screen width, then locked, so scrolling can never nudge it out of line. */
  let measuredKey = null, edgeCache = null;
  function measure() {
    const w = window.innerWidth, root = document.documentElement.style;
    const mode = document.documentElement.dataset.orpMode;
    const key = w + '|' + (location.hash || '#/home');
    if (measuredKey === key) return;
    let left = 0, edge = null;
    const cy = [], hh = [], hs = topHeaders();
    document.querySelectorAll('.orp-btn').forEach((b) => {
      if (b.closest('.orp-hide') || mine(b) || !inHeader(b, hs)) return;
      const r = b.getBoundingClientRect();
      if (!r.width || r.top > 160) return;
      cy.push(r.top + r.height / 2);
      hh.push(r.height);
      if (r.right < w * 0.35) {
        left = Math.max(left, r.right);
        edge = edge === null ? r.left : Math.min(edge, r.left);
      }
    });
    if (!cy.length) return;                         /* header not drawn yet: try again on the next refresh */
    if (mode === 'home' && !left) return;           /* wait for the menu button before locking the Home layout */
    const med = (a, d) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1] : d);
    if (edge !== null) edgeCache = Math.round(edge);
    const cyv = med(cy, 23), hv = Math.round(med(hh, 45));
    root.setProperty('--orp-cy', (cyv >= 10 && cyv <= 90 ? cyv : 23) + 'px');
    root.setProperty('--orp-btn', (hv >= 36 && hv <= 56 ? hv : 45) + 'px');
    root.setProperty('--orp-left', (left ? left + 10 : 20) + 'px');
    root.setProperty('--orp-edge', (edgeCache !== null ? edgeCache : 13) + 'px');
    measuredKey = key;
  }

  function descr(n) {
    const r = n.getBoundingClientRect(), cs = getComputedStyle(n);
    const cls = (n.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (cls ? '.' + cls : '') +
      ' t' + Math.round(r.top) + ' h' + Math.round(r.height) + ' ' + cs.position +
      ' pt' + Math.round(parseFloat(cs.paddingTop) || 0) + ' mt' + Math.round(parseFloat(cs.marginTop) || 0);
  }
  function showDebug(lines) {
    if (!CFG.debug) return;
    let d = document.getElementById('orpheus-debug');
    if (!d) {
      d = document.createElement('pre');
      d.id = 'orpheus-debug';
      d.addEventListener('click', () => d.remove());
      document.body.appendChild(d);
    }
    d.textContent = ['route: ' + (location.hash || '(empty)') + '  mode: ' + document.documentElement.dataset.orpMode]
      .concat(lines).join('\n');
  }

  /* Home page: the page content sits below the header, which leaves a black strip behind the floating
     buttons. Squeeze that space out. Four methods, each checked before moving on:
     0) collapse an empty spacer block that holds the header's height
     1) negative margin on the outermost block that starts under the header
     2) zero any parent padding/margin that matches the header height
     3) visually shift that block up */
  let lifted = [], liftHash = null, lastTry = 0;
  function resetLift() { lifted.forEach(([n, c]) => n.classList.remove(c)); lifted = []; }
  function liftHero() {
    const hash = location.hash || '#/home';
    const on = CFG.heroUnderBar && document.documentElement.dataset.orpMode === 'home' &&
      !bar.classList.contains('orp-hidden') && /^#\/home(\.html)?\/?$/i.test(hash);
    if (!on) { resetLift(); liftHash = null; return; }
    if (lifted.length && liftHash === hash && lifted.every(([n]) => n.isConnected)) return;
    const now = Date.now();
    if (liftHash === hash && now - lastTry < 1500) return;
    lastTry = now;
    resetLift();
    liftHash = hash;

    const w = window.innerWidth, rootStyle = document.documentElement.style;
    const log = [];
    const hdr = stockHeaders().find((x) => {
      const r = x.getBoundingClientRect();
      return /fixed|sticky/.test(getComputedStyle(x).position) && r.top <= 4 && r.width >= w * 0.8 && r.height <= 160;
    }) || null;
    const cyv = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--orp-cy')) || 0;
    let H = hdr ? Math.round(hdr.getBoundingClientRect().bottom) : 0;
    if (!(H >= 30 && H <= 160)) H = Math.round(cyv * 2);
    log.push('Orpheus readout (tap to close)  w=' + w + ' H=' + H + ' cy=' + Math.round(cyv));
    log.push('header: ' + (hdr ? descr(hdr) : 'none found'));
    if (H < 30 || H > 160) { log.push('no usable header height'); showDebug(log); return; }
    rootStyle.setProperty('--orp-lift', H + 'px');

    const skip = (n) => n === document.body || n === document.documentElement || mine(n) ||
      n.id === 'orpheus-debug' || !!n.querySelector('.orp-btn');
    const strip = document.elementsFromPoint(w / 2, H / 2).filter((n) => !skip(n));
    const under = document.elementsFromPoint(w / 2, H + 3).filter((n) => !skip(n));
    log.push('in the black strip:');
    strip.slice(0, 8).forEach((n) => log.push(' ' + descr(n)));
    log.push('just below it:');
    under.slice(0, 5).forEach((n) => log.push(' ' + descr(n)));

    const hit = under.find((n) => {
      const r = n.getBoundingClientRect();
      return r.top >= H - 10 && r.top <= H + 12 && r.height > 20;
    });
    if (!hit) { log.push('RESULT: nothing starts under the header'); showDebug(log); return; }
    const add = (n, c) => { n.classList.add(c); lifted.push([n, c]); };
    const moved = () => hit.getBoundingClientRect().top <= 8;
    const done = (how) => { log.push('RESULT: ' + how + ' (hero top now ' + Math.round(hit.getBoundingClientRect().top) + ')'); showDebug(log); };

    strip.forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.top >= -4 && r.top <= 8 && Math.abs(r.height - H) <= 12 && r.width >= w * 0.8) add(n, 'orp-collapse');
    });
    if (lifted.length && moved()) return done('spacer collapsed');
    resetLift();

    let top = hit;
    for (let n = hit.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.querySelector('.orp-btn')) break;
      if (n.getBoundingClientRect().top < H - 8) break;
      top = n;
    }
    add(top, 'orp-lift-m');
    if (moved()) return done('margin lift on ' + descr(top));
    resetLift();

    for (let n = hit; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const pt = parseFloat(cs.paddingTop) || 0, mt = parseFloat(cs.marginTop) || 0;
      if (pt >= H - 12 && pt <= H + 24) add(n, 'orp-flush-p');
      if (mt >= H - 12 && mt <= H + 24) add(n, 'orp-flush-m');
    }
    if (lifted.length && moved()) return done('parent padding/margin removed');
    resetLift();

    add(top, 'orp-lift-t');
    if (moved()) return done('visual shift');
    resetLift();
    log.push('RESULT: none of the four methods moved the hero');
    showDebug(log);
  }

  /* mode: 'home' = pill nav, 'dash' = harp + Home + Back, 'sub' = Home + Back only,
     'off' = hidden (video player, login, ...) */
  function syncRoute() {
    const h = location.hash || '#/home';
    const mode = CFG.hideOnHash.test(h) ? 'off'
      : CFG.homeHash.test(h) ? 'home'
      : CFG.dashHash.test(h) ? 'dash' : 'sub';
    document.documentElement.dataset.orpMode = mode;
    bar.classList.toggle('orp-hidden', mode !== 'home');
    let hit = null;
    CFG.nav.forEach((n) => { if (!hit && n.match.test(h)) hit = n.id; });
    bar.querySelectorAll('.orp-pill').forEach((p) => p.classList.toggle('active', p.dataset.id === hit));
    if (CFG.debug) showDebug([]);
  }

  /* ---- scroll state ----
     The pill nav / buttons slide away while the page is scrolled down and return at the top.
     Jellyfin scrolls inside page containers rather than the window, so scrollers are collected in the
     capture phase. The state is always RECOMPUTED from the real scroll positions of scrollers that are
     still on screen, so it can never get stuck (a stuck state hid every button, Back included). */
  const HIDE_AT = 60, SHOW_AT = 20;
  const scrollers = new Set();
  let scrolled = false;
  function onScreen(t) {
    if (!t.isConnected || !t.getClientRects().length) return false;
    const r = t.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight &&
      r.right > 0 && r.left < window.innerWidth;
  }
  function evalScrolled() {
    let max = window.scrollY || 0;
    scrollers.forEach((t) => {
      if (!onScreen(t)) { scrollers.delete(t); return; }
      if (t.scrollTop > max) max = t.scrollTop;
    });
    if (!scrolled && max > HIDE_AT) scrolled = true;
    else if (scrolled && max <= SHOW_AT) scrolled = false;
    document.documentElement.classList.toggle('orp-scrolled', scrolled);
  }
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t !== document && t.nodeType === 1 && !mine(t) && t.id !== 'orpheus-debug' &&
        t.scrollHeight > t.clientHeight + 50) {            /* ignore horizontal carousels etc. */
      scrollers.add(t);
    }
    evalScrolled();
  }, true);

  /* ---- route changes ----
     Jellyfin navigates with history.pushState, which does NOT fire "hashchange". So the route is checked
     on pushState/replaceState, popstate, hashchange, every DOM change, and a light poll. */
  let lastRoute = null;
  function routeChanged() {
    const r = location.hash || '#/home';
    if (r === lastRoute) return false;
    lastRoute = r;
    scrollers.clear();                                      /* new page starts at the top */
    scrolled = false;
    document.documentElement.classList.remove('orp-scrolled');
    measuredKey = null;
    syncRoute();
    return true;
  }

  let queued = false;
  function refresh() {
    routeChanged();
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      cleanStock(); clearHeaderBg(); clearTopBars(); syncMenuFlag(); measure(); liftHero(); evalScrolled();
    });
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
  window.addEventListener('resize', () => { measuredKey = null; liftHash = null; refresh(); });
  new MutationObserver((muts) => {
    if (muts.every((m) => m.target.closest && m.target.closest('#orpheus-debug'))) return;
    refresh();
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(() => { if (routeChanged()) refresh(); evalScrolled(); }, 400);
  refresh();
})();
