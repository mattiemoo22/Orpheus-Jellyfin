/* ==========================================================
   Pause screen for Jellyfin web - add via the JavaScript Injector plugin
   Paused  -> logo + blurb fade in (middle-left)
   +10s    -> backdrop fades in fullscreen behind them
   Play    -> everything fades out
   ========================================================== */
(function () {
  'use strict';
  if (window.__lgPauseScreen) return;
  window.__lgPauseScreen = true;

  var SHOW_DELAY = 300;        // ms after pausing before logo + blurb appear
  var BACKDROP_DELAY = 10000;  // ms after pausing before the fullscreen backdrop

  var el = null;
  var showTimer = null;
  var backdropTimer = null;
  var wantFull = false;
  var token = 0;
  var cache = {};

  /* ---------- DOM ---------- */
  function build() {
    el = document.createElement('div');
    el.id = 'lg-pause';
    el.className = 'lg-pause';
    el.innerHTML =
      '<div class="lg-pause-backdrop"></div>' +
      '<div class="lg-pause-scrim"></div>' +
      '<div class="lg-pause-content">' +
        '<img class="lg-pause-logo" alt="">' +
        '<div class="lg-pause-title"></div>' +
        '<div class="lg-pause-episode"></div>' +
        '<p class="lg-pause-blurb"></p>' +
      '</div>';
    return el;
  }

  function mount() {
    if (!el) build();
    if (!el.isConnected) {
      var host = document.getElementById('videoOsdPage') || document.body;
      host.prepend(el);
    }
    return el;
  }

  /* ---------- Data ---------- */
  async function getNowPlayingId() {
    var c = window.ApiClient;
    var sessions = await c.getJSON(c.getUrl('Sessions', { DeviceId: c.deviceId() }));
    var s = (sessions || []).find(function (x) { return x.NowPlayingItem; });
    return s ? s.NowPlayingItem.Id : null;
  }

  async function getInfo() {
    var c = window.ApiClient;
    if (!c) return null;

    var id = await getNowPlayingId();
    if (!id) {
      // the session can lag a moment right after playback starts
      await new Promise(function (r) { setTimeout(r, 1000); });
      id = await getNowPlayingId();
    }
    if (!id) return null;
    if (cache[id]) return cache[id];

    var item = await c.getItem(c.getCurrentUserId(), id);
    var tags = item.ImageTags || {};

    // Logo: the item's own, else the series' (episodes)
    var logoId = tags.Logo ? item.Id : item.ParentLogoItemId;
    var logoTag = tags.Logo || item.ParentLogoImageTag;

    // Backdrop: the item's own, else the series'
    var bdId = null;
    var bdTag = null;
    if (item.BackdropImageTags && item.BackdropImageTags.length) {
      bdId = item.Id;
      bdTag = item.BackdropImageTags[0];
    } else if (item.ParentBackdropItemId && item.ParentBackdropImageTags &&
               item.ParentBackdropImageTags.length) {
      bdId = item.ParentBackdropItemId;
      bdTag = item.ParentBackdropImageTags[0];
    }

    var isEpisode = item.Type === 'Episode';
    var episode = '';
    if (isEpisode) {
      var parts = [];
      if (item.ParentIndexNumber != null) parts.push('S' + item.ParentIndexNumber);
      if (item.IndexNumber != null) parts.push('E' + item.IndexNumber);
      episode = parts.join(' \u00B7 ') + (parts.length ? ' \u2014 ' : '') + item.Name;
    }

    var info = {
      title: isEpisode ? (item.SeriesName || item.Name) : item.Name,
      episode: episode,
      blurb: item.Overview || '',
      logo: logoId && logoTag
        ? c.getUrl('Items/' + logoId + '/Images/Logo', { tag: logoTag, maxWidth: 800 })
        : '',
      backdrop: bdId && bdTag
        ? c.getUrl('Items/' + bdId + '/Images/Backdrop/0', { tag: bdTag, maxWidth: 1920, quality: 85 })
        : ''
    };
    cache[id] = info;
    return info;
  }

  /* ---------- Show / hide ---------- */
  function render(info) {
    var root = mount();
    var logo = root.querySelector('.lg-pause-logo');
    var title = root.querySelector('.lg-pause-title');
    var ep = root.querySelector('.lg-pause-episode');
    var blurb = root.querySelector('.lg-pause-blurb');
    var bd = root.querySelector('.lg-pause-backdrop');

    title.textContent = info.title;
    function showTitle() {
      logo.style.display = 'none';
      title.style.display = '';
    }
    if (info.logo) {
      logo.onerror = showTitle;
      logo.onload = function () {
        logo.style.display = '';
        title.style.display = 'none';
      };
      logo.src = info.logo;
    } else {
      showTitle();
    }

    ep.textContent = info.episode;
    ep.style.display = info.episode ? '' : 'none';
    blurb.textContent = info.blurb;
    blurb.style.display = info.blurb ? '' : 'none';
    bd.style.backgroundImage = info.backdrop ? 'url("' + info.backdrop + '")' : 'none';

    requestAnimationFrame(function () {
      root.classList.add('lg-on');
      if (wantFull) root.classList.add('lg-full');
    });
  }

  function hide() {
    token++;
    clearTimeout(showTimer);
    clearTimeout(backdropTimer);
    wantFull = false;
    if (el) el.classList.remove('lg-on', 'lg-full');
  }

  function onPause(video) {
    hide();
    var my = token;

    showTimer = setTimeout(async function () {
      if (my !== token || !video.paused || video.ended) return;
      var info = null;
      try {
        info = await getInfo();
      } catch (e) {
        console.warn('[pause-screen] could not load item info', e);
        return;
      }
      if (!info || my !== token || !video.paused) return;
      if (info.backdrop) { new Image().src = info.backdrop; } // preload
      render(info);
    }, SHOW_DELAY);

    backdropTimer = setTimeout(function () {
      if (my !== token) return;
      wantFull = true;
      if (el && el.classList.contains('lg-on')) el.classList.add('lg-full');
    }, BACKDROP_DELAY);
  }

  /* ---------- Events (media events don't bubble, so capture) ---------- */
  document.addEventListener('pause', function (e) {
    var t = e.target;
    if (t && t.tagName === 'VIDEO') onPause(t);
  }, true);

  ['play', 'playing', 'ended', 'emptied'].forEach(function (name) {
    document.addEventListener(name, function (e) {
      if (e.target && e.target.tagName === 'VIDEO') hide();
    }, true);
  });

  window.addEventListener('hashchange', hide);
  window.addEventListener('popstate', hide);
})();
