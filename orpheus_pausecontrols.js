/* Orpheus player controls
 * Liquid-glass centre controls: back 10s | play/pause | forward 10s
 * - Tap the video: controls appear, then fade after 2 seconds
 * - Lavender glow on tap
 * - Self-contained: injects its own CSS, touches no Jellyfin files
 * - Ignores taps on Jellyfin's own OSD, header, dialogs and sliders
 * - Android-safe: does not intercept or stop Jellyfin's touch/pointer events
 */
(function () {
  function init() {
    if (window.__orpPlayerControls) return;
    window.__orpPlayerControls = true;

    var HIDE_MS = 2000;            // how long the controls stay visible
    var SKIP_SECONDS = 10;
    var GLOW_MS = 550;             // lavender glow duration after a tap
    var KEEP_WHEN_PAUSED = false;  // true = stay visible while paused

    var root = null, btnMain = null, hideTimer = null;

    /* ---------- CSS ---------- */
    var css = [
      '#orp-pc{position:fixed;left:0;right:0;top:50%;transform:translateY(-50%);z-index:998;',
      'display:flex;align-items:center;justify-content:center;gap:clamp(28px,10vw,96px);',
      'pointer-events:none;opacity:0;visibility:hidden;',
      'transition:opacity .25s ease,visibility 0s linear .25s}',
      '#orp-pc.on{opacity:1;visibility:visible;transition:opacity .25s ease}',

      '.orp-b{pointer-events:auto;position:relative;display:flex;align-items:center;justify-content:center;',
      'width:58px;height:58px;border-radius:21px;color:#fff;cursor:pointer;',
      '-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:manipulation;',
      'background:linear-gradient(135deg,rgba(255,255,255,.26),rgba(255,255,255,.07) 48%,rgba(255,255,255,.13));',
      '-webkit-backdrop-filter:blur(18px) saturate(180%);backdrop-filter:blur(18px) saturate(180%);',
      'border:1px solid rgba(255,255,255,.30);',
      'box-shadow:inset 0 1px 1px rgba(255,255,255,.55),inset 0 -10px 18px rgba(255,255,255,.05),0 8px 24px rgba(0,0,0,.38);',
      'transition:transform .15s ease,box-shadow .3s ease,border-color .3s ease}',
      '.orp-b::before{content:"";position:absolute;inset:1px;border-radius:inherit;pointer-events:none;',
      'background:linear-gradient(180deg,rgba(255,255,255,.32),rgba(255,255,255,0) 52%);opacity:.55}',
      '.orp-b svg{position:relative;width:32px;height:32px;display:block;pointer-events:none}',
      '.orp-b.orp-main{width:78px;height:78px;border-radius:29px}',
      '.orp-b.orp-main svg{width:36px;height:36px}',
      '.orp-b:active{transform:scale(.93)}',
      '.orp-b.tap{border-color:rgba(185,166,232,.95);',
      'box-shadow:inset 0 1px 1px rgba(255,255,255,.55),0 0 0 3px rgba(185,166,232,.35),',
      '0 0 26px 8px rgba(185,166,232,.60),0 0 64px 18px rgba(185,166,232,.28)}',
      '@media (max-height:420px){.orp-b{width:52px;height:52px;border-radius:19px}',
      '.orp-b.orp-main{width:68px;height:68px;border-radius:25px}}'
    ].join('');

    /* ---------- icons ---------- */
    var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5.6v12.8c0 .8.9 1.3 1.6.9l10-6.4c.6-.4.6-1.3 0-1.8l-10-6.4c-.7-.4-1.6.1-1.6.9z"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="4.5" width="4.6" height="15" rx="1.6"/><rect x="13.9" y="4.5" width="4.6" height="15" rx="1.6"/></svg>';
    var ARC = '<path d="M20 10A12 12 0 1 1 11.5 13.5M23 6L19 10L23 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    var TXT = '<text x="20" y="27" text-anchor="middle" font-size="11.5" font-weight="700" font-family="system-ui,sans-serif" fill="currentColor">10</text>';
    var ICON_BACK = '<svg viewBox="0 0 40 40">' + ARC + TXT + '</svg>';
    var ICON_FWD = '<svg viewBox="0 0 40 40"><g transform="translate(40,0) scale(-1,1)">' + ARC + '</g>' + TXT + '</svg>';

    /* ---------- helpers ---------- */
    function getVideo() {
      return document.querySelector('video.htmlvideoplayer') || document.querySelector('video');
    }

    function inPlayer() {
      var v = getVideo();
      if (!v || !v.offsetWidth) return false;
      if (/\/video/.test(location.hash)) return true;
      return !!document.querySelector('#videoOsdPage:not(.hide)');
    }

    var BLOCK = [
      'button', 'a', 'input', 'select', 'textarea',
      '[is="emby-button"]', '[is="emby-slider"]', '.emby-slider-container',
      '.videoOsdBottom', '.osdHeader', '.upNextContainer', '.skinHeader',
      '.dialogContainer', '.dialog', '.actionSheet', '.formDialog',
      '[class*="skip" i]', '#orp-pc'
    ].join(',');

    function isInteractive(el) {
      return !!(el && el.closest && el.closest(BLOCK));
    }

    function glow(el) {
      el.classList.add('tap');
      clearTimeout(el._orpGlow);
      el._orpGlow = setTimeout(function () { el.classList.remove('tap'); }, GLOW_MS);
    }

    function syncIcon() {
      if (!btnMain) return;
      var v = getVideo();
      var paused = !v || v.paused;
      btnMain.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
      btnMain.setAttribute('aria-label', paused ? 'Riproduci' : 'Pausa');
    }

    function hide() {
      clearTimeout(hideTimer);
      if (root) root.classList.remove('on');
    }

    function armTimer() {
      clearTimeout(hideTimer);
      var v = getVideo();
      if (KEEP_WHEN_PAUSED && v && v.paused) return;
      hideTimer = setTimeout(hide, HIDE_MS);
    }

    function show() {
      build();
      syncIcon();
      root.classList.add('on');
      armTimer();
    }

    function seek(delta) {
      var v = getVideo();
      if (!v) return;
      var t = v.currentTime + delta;
      var d = v.duration;
      t = isFinite(d) ? Math.min(Math.max(0, t), Math.max(0, d - 0.25)) : Math.max(0, t);
      v.currentTime = t;
    }

    function togglePlay() {
      var v = getVideo();
      if (!v) return;
      if (v.paused) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
      }
    }

    function makeBtn(cls, html, label, action) {
      var b = document.createElement('div');
      b.className = 'orp-b ' + cls;
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', label);
      b.tabIndex = -1;
      b.innerHTML = html;

      b.addEventListener('click', function (e) {
        e.stopPropagation();
        action();
        syncIcon();
        glow(b);
        armTimer();
      });

      b.addEventListener('pointerdown', function () {
        glow(b);
        armTimer();
      });

      return b;
    }

    function build() {
      if (root && document.body.contains(root)) return;

      if (!document.getElementById('orp-pc-style')) {
        var st = document.createElement('style');
        st.id = 'orp-pc-style';
        st.textContent = css;
        document.head.appendChild(st);
      }

      root = document.createElement('div');
      root.id = 'orp-pc';

      var back = makeBtn(
        'orp-back',
        ICON_BACK,
        'Indietro di ' + SKIP_SECONDS + ' secondi',
        function () { seek(-SKIP_SECONDS); }
      );

      btnMain = makeBtn(
        'orp-main',
        ICON_PLAY,
        'Riproduci',
        togglePlay
      );

      var fwd = makeBtn(
        'orp-fwd',
        ICON_FWD,
        'Avanti di ' + SKIP_SECONDS + ' secondi',
        function () { seek(SKIP_SECONDS); }
      );

      root.appendChild(back);
      root.appendChild(btnMain);
      root.appendChild(fwd);
      document.body.appendChild(root);
    }

    /* ---------- tap on the video area -> show controls ---------- */
    var down = null;

    document.addEventListener('touchstart', function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      down = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!down) return;

      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;

      var d = down;
      down = null;

      // Ignore drags and long presses
      if (Math.hypot(t.clientX - d.x, t.clientY - d.y) > 12) return;
      if (Date.now() - d.t > 600) return;

      // Ignore Jellyfin's own controls, dialogs, sliders and skip buttons
      if (!inPlayer() || isInteractive(e.target)) return;

      show();
    }, { passive: true });

    // Keep the centre icon in sync with the real player state
    document.addEventListener('play', function (e) {
      if (e.target && e.target.tagName === 'VIDEO') {
        syncIcon();
        if (root && root.classList.contains('on')) armTimer();
      }
    }, true);

    document.addEventListener('pause', function (e) {
      if (e.target && e.target.tagName === 'VIDEO') syncIcon();
    }, true);

    // Leaving the player page
    window.addEventListener('hashchange', hide);
  }

  try {
    init();
  } catch (err) {
    console.warn('Orpheus player controls disabled:', err);
  }
})();
