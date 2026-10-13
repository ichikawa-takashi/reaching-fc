(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- 見出しを一文字ずつに分割 ---------- */
  const splitChars = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent.replace(/\s+/g, '');
          if (!text) { child.remove(); return; }
          const frag = document.createDocumentFragment();
          [...text].forEach((ch) => {
            const span = document.createElement('span');
            span.className = 'kv-char';
            span.textContent = ch;
            span.style.transitionDelay = `${0.6 + i * 0.05}s`;
            i += 1;
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent);
    el.classList.add('is-split');
  };
  document.querySelectorAll('[data-split]').forEach(splitChars);

  /* ---------- 読み込み完了を待って開始（上限3秒） ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ready = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...[...document.querySelectorAll('.kv-img img')].map((img) => img.decode().catch(() => {})),
  ]);

  /* ---------- 数字のカウントアップ ---------- */
  const countUp = (el) => {
    const final = el.textContent;
    const nums = final.match(/[\d,]+/g).map((n) => Number(n.replace(/,/g, '')));
    const render = (p) => {
      let i = 0;
      el.textContent = final.replace(/[\d,]+/g, () => Math.round(nums[i++] * p).toLocaleString('en-US'));
    };
    el.style.display = 'inline-block';
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.style.fontVariantNumeric = 'tabular-nums';
    const duration = 1600;
    let t0;
    const tick = (now) => {
      t0 ??= now;
      const p = Math.min((now - t0) / duration, 1);
      render(1 - Math.pow(1 - p, 3)); // easeOutCubic
      if (p < 1) requestAnimationFrame(tick);
      else { el.textContent = final; el.style.minWidth = ''; }
    };
    render(0);
    setTimeout(() => requestAnimationFrame(tick), 300);
  };

  let countInited = false;
  const initCount = () => {
    if (countInited) return;
    countInited = true;
    const counts = document.querySelectorAll('[data-count]');
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          countUp(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    counts.forEach((el) => io.observe(el));
  };

  const start = () => {
    root.classList.remove('is-loading');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-start')));
    initCount();
  };

  window.scrollTo(0, 0);
  Promise.race([ready, wait(3000)]).then(start);
  setTimeout(start, 4000); // 念のための強制解除

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      root.classList.remove('is-loading');
      root.classList.add('is-start');
    }
  });

  /* ---------- スクロールで現れる ---------- */
  const targets = document.querySelectorAll('.js-in');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-view'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-view');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- ヘッダーと追従ボタン ---------- */
  const header = document.querySelector('.site-header');
  const floatCta = document.querySelector('.float-cta');
  const form = document.getElementById('form');
  let formVisible = false;

  if (form && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      formVisible = entry.isIntersecting;
      onScroll();
    }).observe(form);
  }

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    floatCta.classList.toggle('is-show', y > window.innerHeight * 0.9 && !formVisible);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- FAQ の開閉 ---------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const summary = item.querySelector('summary');
    const body = item.querySelector('.faq-body');
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.open) {
        item.classList.remove('is-open');
        const close = () => { if (!item.classList.contains('is-open')) item.open = false; };
        if (reduceMotion) close();
        else body.addEventListener('transitionend', close, { once: true });
      } else {
        item.open = true;
        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('is-open')));
      }
    });
  });
})();
