/* ─── Scroll-triggered reveal ───────────────────────────────────────────── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      // Counter animation for [data-count] elements
      if (entry.target.dataset.count !== undefined) {
        animateCount(entry.target);
      }
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.anim').forEach(el => observer.observe(el));

/* ─── Number counter ────────────────────────────────────────────────────── */
function animateCount(el) {
  const raw   = el.dataset.count;
  const isM   = raw.includes('M');
  const isK   = raw.includes('K');
  const isPct = raw.includes('%');
  const num   = parseFloat(raw);
  const dur   = 1600;
  const start = performance.now();

  function tick(now) {
    const t   = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val  = ease * num;
    let display;
    if (isM)        display = val.toFixed(val < 10 ? 1 : 0) + 'M';
    else if (isK)   display = Math.round(val) + 'K';
    else if (isPct) display = Math.round(val) + '%';
    else            display = Math.round(val) + (raw.includes('+') ? '+' : '');
    el.textContent = display;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ─── Stagger children ──────────────────────────────────────────────────── */
document.querySelectorAll('.anim-stagger').forEach(parent => {
  [...parent.children].forEach((child, i) => {
    child.classList.add('anim', 'anim-delay-' + Math.min(i, 5));
    observer.observe(child);
  });
});
