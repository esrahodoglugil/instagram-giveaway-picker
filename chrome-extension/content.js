/**
 * Instagram gönderi sayfasında çalışır. Yorumları DOM'dan toplar, backend'e POST eder.
 * Backend: POST http://localhost:3001/api/instagram/cekilis (Mod B: comments[])
 *
 * Not: Instagram DOM sık değişir; selector'lar kırılabilir.
 */
const API_BASE = 'http://localhost:3001/api/instagram';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function injectUI() {
  if (document.getElementById('ig-cekilis-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'ig-cekilis-btn';
  btn.type = 'button';
  btn.textContent = '🎯 Yorumları topla ve çekilişe gönder';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 16px;
    background: #e1306c;
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  const progress = document.createElement('div');
  progress.id = 'ig-cekilis-progress';
  progress.style.cssText = `
    position: fixed;
    bottom: 72px;
    right: 20px;
    z-index: 999999;
    max-width: 320px;
    padding: 10px 12px;
    background: rgba(0,0,0,0.85);
    color: #fff;
    border-radius: 8px;
    font-size: 12px;
    font-family: system-ui, sans-serif;
    line-height: 1.4;
  `;
  progress.textContent = 'Hazır — butona basın';

  document.body.appendChild(btn);
  document.body.appendChild(progress);

  btn.addEventListener('click', () => runScraper(progress));
}

async function clickLoadMore() {
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const b of buttons) {
    const t = (b.innerText || b.textContent || '').toLowerCase();
    if (
      t.includes('daha fazla') ||
      t.includes('view more') ||
      t.includes('load more') ||
      t.includes('see more')
    ) {
      b.click();
      await sleep(900);
      return true;
    }
  }
  return false;
}

async function loadAllComments(progressEl) {
  let lastCount = 0;
  let same = 0;

  for (let i = 0; i < 200; i++) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    await clickLoadMore();
    await sleep(1100);

    const currentCount = document.querySelectorAll('article ul li, [role="dialog"] ul li').length;
    if (progressEl) {
      progressEl.textContent = `Yükleniyor… ${currentCount} satır (scroll ${i + 1})`;
    }

    if (currentCount === lastCount) same++;
    else same = 0;
    lastCount = currentCount;

    if (same > 6) break;
  }
}

function extractComments() {
  const map = new Map();

  document.querySelectorAll('article ul li, [role="dialog"] ul li').forEach((el, idx) => {
    const userLink =
      el.querySelector('h3 a[href*="/"]') ||
      el.querySelector('a[href*="/"][role="link"]') ||
      el.querySelector('a[href^="/"]');
    const username = userLink?.innerText?.trim()?.replace(/^@/, '');
    const spans = el.querySelectorAll('span');
    let text = '';
    for (const s of spans) {
      const t = (s.innerText || '').trim();
      if (t.length > text.length) text = t;
    }
    if (!username || !text) return;

    const key = `${username}::${text.slice(0, 80)}`;
    if (!map.has(key)) {
      map.set(key, {
        username,
        text,
      });
    }
  });

  return Array.from(map.values());
}

async function runScraper(progressEl) {
  const el = progressEl || document.getElementById('ig-cekilis-progress');
  if (el) el.textContent = 'Başlıyor…';

  try {
    await loadAllComments(el);
    const comments = extractComments();

    if (el) el.textContent = `Gönderiliyor… (${comments.length} yorum)`;

    const res = await fetch(`${API_BASE}/cekilis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comments,
        requireMention: false,
        allowDuplicates: false,
        minMentions: 1,
        requireFollower: false,
        winnerCount: 1,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const w = data.winners?.[0];
    if (el) {
      el.textContent = w
        ? `✅ Tamamlandı — Kazanan: @${w.username}`
        : `✅ Tamamlandı — ${comments.length} yorum işlendi`;
    }
    alert(
      data.winners?.length
        ? `Kazanan: @${data.winners[0].username}\nGeçerli: ${data.stats?.eligibleComments ?? 0}`
        : `İşlendi. Geçerli katılım: ${data.stats?.eligibleComments ?? 0}`
    );
  } catch (e) {
    console.error(e);
    if (el) el.textContent = `Hata: ${e.message}`;
    alert(`Hata: ${e.message}`);
  }
}

setTimeout(injectUI, 1500);
