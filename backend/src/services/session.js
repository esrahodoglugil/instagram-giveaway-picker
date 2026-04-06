import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'X-IG-App-ID': '936619743392459',
  'X-Requested-With': 'XMLHttpRequest',
  Referer: 'https://www.instagram.com/',
  Origin: 'https://www.instagram.com',
};

let sessionData = null;

function resetJarSync() {
  jar.removeAllCookiesSync();
}

function parseCookiePair(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === name) return v;
  }
  return null;
}

function cookieHeaderForRequests() {
  if (!sessionData) return '';
  if (sessionData.fullCookie) return sessionData.fullCookie;
  const parts = [`sessionid=${sessionData.sessionId}`, `csrftoken=${sessionData.csrfToken}`];
  if (sessionData.dsUserId) parts.push(`ds_user_id=${sessionData.dsUserId}`);
  return parts.join('; ');
}

/**
 * .env:
 * - INSTAGRAM_COOKIE (önerilen): instagram.com çerezlerinin tamamı tek satır
 * - veya INSTAGRAM_SESSION_ID (+ gerekirse csrftoken / ds_user_id)
 */
export async function initSessionFromEnv() {
  const fullCookie = process.env.INSTAGRAM_COOKIE?.trim();

  if (fullCookie) {
    const sessionId =
      parseCookiePair(fullCookie, 'sessionid') || process.env.INSTAGRAM_SESSION_ID?.trim();
    if (!sessionId) {
      console.error('❌ INSTAGRAM_COOKIE içinde sessionid bulunamadı.');
      return false;
    }
    let csrfToken =
      parseCookiePair(fullCookie, 'csrftoken') || process.env.INSTAGRAM_CSRF_TOKEN?.trim();
    const dsUserId =
      parseCookiePair(fullCookie, 'ds_user_id') || process.env.INSTAGRAM_DS_USER_ID?.trim() || '';

    if (!csrfToken) {
      console.error(
        '❌ INSTAGRAM_COOKIE içinde csrftoken yok; ekleyin veya INSTAGRAM_CSRF_TOKEN tanımlayın.'
      );
      return false;
    }

    const username =
      process.env.INSTAGRAM_USERNAME?.trim() ||
      (dsUserId ? `user_${dsUserId}` : 'Instagram oturumu');

    sessionData = {
      csrfToken,
      sessionId,
      dsUserId,
      username,
      fullCookie,
      loggedInAt: Date.now(),
      fromEnv: true,
    };
    console.log(`✅ Instagram oturumu INSTAGRAM_COOKIE ile yüklendi: ${username}`);
    return true;
  }

  const sessionId = process.env.INSTAGRAM_SESSION_ID?.trim();
  if (!sessionId) {
    console.warn(
      '⚠️  INSTAGRAM_SESSION_ID veya INSTAGRAM_COOKIE gerekli. Yorum API’si için INSTAGRAM_COOKIE (tam çerez satırı) önerilir.'
    );
    return false;
  }

  try {
    await jar.setCookie(`sessionid=${sessionId}`, 'https://www.instagram.com');

    let csrfToken = process.env.INSTAGRAM_CSRF_TOKEN?.trim();
    let dsUserId = process.env.INSTAGRAM_DS_USER_ID?.trim();

    if (!csrfToken || !dsUserId) {
      await client.get('https://www.instagram.com/', {
        headers: { ...BASE_HEADERS },
      });
      const cookies = await jar.getCookies('https://www.instagram.com');
      if (!csrfToken) {
        csrfToken = cookies.find(c => c.key === 'csrftoken')?.value || null;
      }
      if (!dsUserId) {
        dsUserId = cookies.find(c => c.key === 'ds_user_id')?.value || '';
      }
    }

    if (!csrfToken) {
      console.error(
        '❌ csrftoken alınamadı. INSTAGRAM_CSRF_TOKEN ekleyin veya INSTAGRAM_COOKIE kullanın.'
      );
      return false;
    }

    const username =
      process.env.INSTAGRAM_USERNAME?.trim() ||
      (dsUserId ? `user_${dsUserId}` : 'Instagram oturumu');

    sessionData = {
      csrfToken,
      sessionId,
      dsUserId: dsUserId || '',
      username,
      fullCookie: null,
      loggedInAt: Date.now(),
      fromEnv: true,
    };

    console.log(`✅ Instagram oturumu .env (sessionid) ile yüklendi: ${username}`);
    return true;
  } catch (err) {
    console.error('Oturum başlatma hatası:', err.response?.data || err.message);
    return false;
  }
}

export function getSession() {
  return sessionData;
}

export function clearSession() {
  sessionData = null;
  console.log('Session temizlendi');
}

/** .env güncellendiğinde veya çıkış sonrası tekrar denemek için */
export async function reloadSessionFromEnv() {
  resetJarSync();
  sessionData = null;
  return initSessionFromEnv();
}

export function getAuthClient() {
  if (!sessionData) throw new Error('Oturum yok. .env içinde INSTAGRAM_SESSION_ID tanımlayın ve sunucuyu yeniden başlatın.');
  return client;
}

export function getAuthHeaders() {
  if (!sessionData) throw new Error('Oturum yok. .env içinde INSTAGRAM_SESSION_ID tanımlayın ve sunucuyu yeniden başlatın.');

  return {
    ...BASE_HEADERS,
    'X-CSRFToken': sessionData.csrfToken,
    Cookie: cookieHeaderForRequests(),
  };
}

/** Node fetch ile yorum API — tarayıcı XHR’ına yakın başlıklar (yalnız sessionid çoğu zaman HTML döndürür). */
export function getWebApiFetchHeaders(refererUrl) {
  if (!sessionData) throw new Error('Oturum yok. .env içinde INSTAGRAM_SESSION_ID tanımlayın ve sunucuyu yeniden başlatın.');
  const referer = refererUrl || 'https://www.instagram.com/';
  return {
    Accept: '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    Cookie: cookieHeaderForRequests(),
    Origin: 'https://www.instagram.com',
    Referer: referer,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': BASE_HEADERS['User-Agent'],
    'X-ASBD-ID': '129477',
    'X-CSRFToken': sessionData.csrfToken,
    'X-IG-App-ID': '936619743392459',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

/** Gönderi sayfası GET (warm-up). */
export function getDocumentFetchHeaders() {
  if (!sessionData) throw new Error('Oturum yok.');
  return {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    Cookie: cookieHeaderForRequests(),
    Referer: 'https://www.instagram.com/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': BASE_HEADERS['User-Agent'],
  };
}
