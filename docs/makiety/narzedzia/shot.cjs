const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto('file://' + dir + '/makiety-F2-9.html');
  const figs = await p.$$('figure');
  for (const f of figs) {
    const id = await f.getAttribute('id');
    await f.screenshot({ path: path.join(dir, 'png', id + '.png') });
  }
  // overflow check: elements whose scrollWidth > clientWidth or that stick out of phone
  const issues = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.ph').forEach(ph => {
      const pr = ph.getBoundingClientRect();
      const fig = ph.closest('figure').id + ':' + ph.dataset.theme;
      ph.querySelectorAll('*').forEach(el => {
        if (el.closest('svg') && el.tagName !== 'svg') return;
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        const cs = getComputedStyle(el);
        if ((el.scrollWidth > el.clientWidth + 1) && cs.overflow !== 'hidden' && el.tagName!=='svg' && !el.classList.contains('linkbox')) out.push(fig + ' hscroll ' + el.className + ' ' + el.textContent.slice(0,40));
        if (el.matches('.scr > *, .sbody > *') && (r.bottom > pr.bottom - (ph.querySelector('.nav') ? 80 : 0) + 0.5)) out.push(fig + ' below ' + el.className + ' ' + el.textContent.trim().slice(0,40) + ' ' + Math.round(r.bottom - pr.top));
        if (r.right > pr.right + 0.5 && !el.closest('.map') && !el.classList.contains('map')) out.push(fig + ' right ' + el.className + ' ' + el.textContent.trim().slice(0,30));
      });
      // sheet content beyond sheet
      ph.querySelectorAll('.sheet').forEach(s => {
        const sb = s.querySelector('.sbody'); const sr = s.getBoundingClientRect(); const br = sb.getBoundingClientRect();
        if (br.bottom > sr.bottom + 0.5) out.push(fig + ' sheet overflow by ' + Math.round(br.bottom - sr.bottom));
      });
      ph.querySelectorAll('.scr').forEach(s => {
        const last = [...s.children].pop(); const sr = s.getBoundingClientRect();
        let maxb = -Infinity; [...s.children].forEach(c => maxb = Math.max(maxb, c.getBoundingClientRect().bottom));
        if (maxb > sr.bottom + 0.5) out.push(fig + ' scr overflow by ' + Math.round(maxb - sr.bottom));
      });
      // small touch targets
      ph.querySelectorAll('button, input').forEach(el => {
        const r = el.getBoundingClientRect();
        if (el.closest('.nav')) return;
        if (r.height < 44 - 0.5 || (r.height < 48 - 0.5 && !el.classList.contains('rbtn'))) out.push(fig + ' small target ' + el.tagName + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + el.textContent.trim().slice(0,30));
      });
    });
    return out;
  });
  console.log([...new Set(issues)].join('\n') || 'brak problemów');
  await b.close();
})();
