(() => {
  const io = new IntersectionObserver(
    es => es.forEach(e => e.target.classList.toggle('mf-in-view', e.isIntersecting)),
    { rootMargin: '-30% 0px -45% 0px' }
  );
  const seen = new WeakSet();
  const scan = () => document.querySelectorAll('.verticalSection').forEach(s => {
    if (!seen.has(s)) { seen.add(s); io.observe(s); }
  });
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
