import axios from 'axios';
import { getAuthHeaders, getWebApiFetchHeaders, getDocumentFetchHeaders } from './session.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function refererForPost(postUrl, shortcode) {
  if (/instagram\.com\/reel\//i.test(postUrl)) {
    return `https://www.instagram.com/reel/${shortcode}/`;
  }
  if (/instagram\.com\/tv\//i.test(postUrl)) {
    return `https://www.instagram.com/tv/${shortcode}/`;
  }
  return `https://www.instagram.com/p/${shortcode}/`;
}

function htmlLoginHint() {
  return (
    'Instagram HTML döndü (giriş/challenge sayfası). .env içine tarayıcıdan kopyalanmış TAM çerez satırını ' +
    'INSTAGRAM_COOKIE=sessionid=…; csrftoken=…; mid=…; ig_did=…; ds_user_id=… şeklinde ekleyin; ' +
    'sessionid tek başına sunucudan yetmeyebilir.'
  );
}

async function instagramCommentsJson(url, refererUrl) {
  const headers = getWebApiFetchHeaders(refererUrl);
  const res = await fetch(url, { headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const hint = text.trimStart().startsWith('<!') ? htmlLoginHint() : 'Yanıt JSON değil.';
    throw new Error(`${hint} (HTTP ${res.status}) Önizleme: ${text.slice(0, 100)}…`);
  }
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data;
}

async function instagramWebJson(url, refererUrl) {
  const headers = getWebApiFetchHeaders(refererUrl);
  const res = await fetch(url, { headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const hint = text.trimStart().startsWith('<!') ? htmlLoginHint() : 'Yanıt JSON değil.';
    throw new Error(`${hint} (HTTP ${res.status}) Önizleme: ${text.slice(0, 100)}…`);
  }
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data;
}

// Gönderi URL'inden shortcode çıkar
export function extractShortcode(url) {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw new Error('Geçerli bir Instagram gönderi linki giriniz');
}

// Shortcode'dan media ID hesapla
export function shortcodeToMediaId(shortcode) {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(ALPHABET.indexOf(char));
  }
  return id.toString();
}

function normalizeOwner(owner, stats = {}) {
  if (!owner) return null;
  return {
    userId: owner.pk != null ? String(owner.pk) : owner.id != null ? String(owner.id) : '',
    username: owner.username || '',
    fullName: owner.full_name || '',
    profilePicUrl: owner.profile_pic_url || '',
    isPrivate: owner.is_private === true,
    isVerified: owner.is_verified === true,
    followerCount: Number(stats.followerCount || 0),
    followingCount: Number(stats.followingCount || 0),
    mediaCount: Number(stats.mediaCount || 0),
  };
}

function toCount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mergeStats(primary = {}, fallback = {}) {
  return {
    followerCount: toCount(primary.followerCount) || toCount(fallback.followerCount),
    followingCount: toCount(primary.followingCount) || toCount(fallback.followingCount),
    mediaCount: toCount(primary.mediaCount) || toCount(fallback.mediaCount),
  };
}

function getSessionIdOnlyCookie() {
  const fullCookie = getAuthHeaders()?.Cookie || '';
  const sessionPart = fullCookie
    .split(';')
    .map(p => p.trim())
    .find(p => p.startsWith('sessionid='));
  return sessionPart || '';
}

export async function fetchPostOwnerProfile(postUrl) {
  const shortcode = extractShortcode(postUrl);
  const mediaId = shortcodeToMediaId(shortcode);
  const postReferer = refererForPost(postUrl, shortcode);

  await fetch(postReferer, { headers: getDocumentFetchHeaders() }).catch(() => {});

  const commentsData = await instagramCommentsJson(
    `https://www.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true`,
    postReferer
  );

  const ownerFromCaption = commentsData?.caption?.user || null;
  const ownerFromFirstComment = commentsData?.comments?.[0]?.user || null;
  const owner = ownerFromCaption || ownerFromFirstComment;
  if (!owner?.username) {
    throw new Error('Gönderi sahibi bilgisi alınamadı.');
  }

  let stats = { followerCount: 0, followingCount: 0, mediaCount: 0 };

  // Ana kaynak: web_profile_info (curl testinde doğru değerleri döndürüyor)
  if (owner?.username) {
    try {
      const profileData = await instagramWebJson(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(owner.username)}`,
        `https://www.instagram.com/${owner.username}/`
      );
      const user = profileData?.data?.user;
      const fallbackStats = {
        followerCount:
          user?.edge_followed_by?.count ??
          user?.follower_count ??
          user?.followerCount ??
          0,
        followingCount:
          user?.edge_follow?.count ??
          user?.following_count ??
          user?.followingCount ??
          0,
        mediaCount:
          user?.edge_owner_to_timeline_media?.count ??
          user?.media_count ??
          user?.mediaCount ??
          0,
      };
      stats = mergeStats(stats, fallbackStats);
      console.log(`  [OK] ${owner.username}: ${stats.followerCount} takipci`);
    } catch {
      // no-op
    }
  }

  // Fallback: bazı hesaplarda web_profile_info eksik dönerse /users/{id}/info dene
  if ((!stats.followerCount || !stats.followingCount || !stats.mediaCount) && owner?.pk) {
    try {
      const userInfoHeaders = {
        Cookie: getSessionIdOnlyCookie(),
        'X-IG-App-ID': '936619743392459',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      const userInfoRes = await axios.get(
        `https://www.instagram.com/api/v1/users/${encodeURIComponent(String(owner.pk))}/info/`,
        { headers: userInfoHeaders }
      );
      const u = userInfoRes?.data?.user || userInfoRes?.data;
      const fallbackStats = {
        followerCount:
          u?.follower_count ??
          u?.edge_followed_by?.count ??
          u?.followers ??
          0,
        followingCount:
          u?.following_count ??
          u?.edge_follow?.count ??
          u?.following ??
          0,
        mediaCount:
          u?.media_count ??
          u?.edge_owner_to_timeline_media?.count ??
          u?.posts_count ??
          0,
      };
      stats = mergeStats(stats, fallbackStats);
    } catch {
      // no-op
    }
  }

  return {
    shortcode,
    mediaId,
    owner: normalizeOwner(owner, stats),
    commentCount: Number(commentsData?.comment_count || 0),
  };
}

/** Sonraki sayfa için query param adı + değer (next_min_id bazen JSON cursor string: cached_comments_cursor + bifilter_token). */
function nextPageCursor(data, commentsOnPage) {
  const nextMin = data.next_min_id != null ? String(data.next_min_id) : null;
  const nextMax = data.next_max_id != null ? String(data.next_max_id) : null;
  if (nextMin) return { param: 'min_id', value: nextMin };
  if (nextMax) return { param: 'max_id', value: nextMax };
  const last = commentsOnPage[commentsOnPage.length - 1];
  const pk = last?.pk != null ? String(last.pk) : null;
  if (pk) return { param: 'min_id', value: pk };
  return null;
}

/** Web API: has_more_comments false olsa bile has_more_headload_comments + next_min_id ile devam. */
function shouldFetchAnotherPage(data, nextCursor) {
  if (!nextCursor) return false;
  if (data.has_more_comments === true) return true;
  if (data.has_more_headload_comments === true) return true;
  return false;
}

// Tüm yorumları çek (sayfalama ile)
export async function fetchAllComments(postUrl, onProgress) {
  const shortcode = extractShortcode(postUrl);
  const mediaId = shortcodeToMediaId(shortcode);
  const postReferer = refererForPost(postUrl, shortcode);

  console.log(`📥 Yorumlar çekiliyor... Media ID: ${mediaId}`);

  await fetch(postReferer, { headers: getDocumentFetchHeaders() }).catch(() => {});

  let allComments = [];
  /** @type {{ param: 'min_id' | 'max_id', value: string } | null} */
  let cursor = null;
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    page++;
    const cursorForThisRequest = cursor;
    const params = new URLSearchParams({ can_support_threading: 'true' });
    if (cursor) params.append(cursor.param, cursor.value);

    try {
      const data = await instagramCommentsJson(
        `https://www.instagram.com/api/v1/media/${mediaId}/comments/?${params}`,
        postReferer
      );
      const comments = data.comments || [];

      if (page === 1) {
        console.log('  [DEBUG] Pagination (sayfa 1):', {
          has_more_comments: data.has_more_comments,
          has_more_headload_comments: data.has_more_headload_comments,
          next_min_id: data.next_min_id,
          next_max_id: data.next_max_id,
          comment_count: data.comment_count,
          initiate_at_top: data.initiate_at_top,
        });
      }

      allComments = allComments.concat(
        comments.map(c => ({
          id: c.pk,
          username: c.user?.username || '',
          fullName: c.user?.full_name || '',
          profilePicUrl: c.user?.profile_pic_url || '',
          text: c.text || '',
          timestamp: c.created_at,
          likeCount: c.comment_like_count || 0,
          userId:
            c.user?.pk != null
              ? String(c.user.pk)
              : c.user?.id != null
                ? String(c.user.id)
                : '',
        }))
      );

      if (onProgress) {
        onProgress({ loaded: allComments.length, page });
      }

      const next = nextPageCursor(data, comments);
      const loadedAfter = allComments.length;
      hasMore = shouldFetchAnotherPage(data, next);

      console.log(
        `  Sayfa ${page}: ${comments.length} yorum, toplam: ${loadedAfter}` +
          (page > 1 || hasMore
            ? ` | devam: more=${data.has_more_comments} headload=${data.has_more_headload_comments} cursor=${next ? 'var' : 'yok'}`
            : '')
      );

      const repeatsCursor =
        next &&
        cursorForThisRequest &&
        next.param === cursorForThisRequest.param &&
        next.value === cursorForThisRequest.value;

      if (hasMore && (!next || repeatsCursor)) {
        console.warn(
          '  [WARN] Daha fazla yorum olmalı görünüyor ama cursor yok veya öncekiyle aynı; sayfalama durduruldu.'
        );
        hasMore = false;
        cursor = null;
      } else {
        cursor = hasMore ? next : null;
      }

      if (hasMore) {
        await sleep(800 + Math.random() * 400);
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('429') || msg.includes('rate limit')) {
        console.warn('Rate limit! 10 saniye bekleniyor...');
        await sleep(10000);
        continue;
      }
      throw new Error(`Yorum çekme hatası: ${msg}`);
    }
  }

  console.log(`✅ Toplam ${allComments.length} yorum çekildi`);
  return allComments;
}

// Kullanıcının seni takip edip etmediğini kontrol et
export async function checkFollower(userId) {
  const base = getAuthHeaders();
  const headers = {
    ...base,
    Referer: 'https://www.instagram.com/',
    'Accept-Encoding': 'gzip, deflate',
  };

  try {
    const res = await axios.get(
      `https://www.instagram.com/api/v1/friendships/${userId}/`,
      { headers }
    );
    return res.data?.followed_by || false;
  } catch {
    return false;
  }
}

// Yorumları filtrele
export function filterComments(comments, options) {
  const {
    requireMention = false,    // @ etiket zorunlu mu
    allowDuplicates = false,   // Aynı kişi birden fazla katılabilir mi
    minMentions = 1,           // Minimum etiket sayısı
  } = options;

  let filtered = [...comments];

  // Etiket kontrolü
  if (requireMention) {
    filtered = filtered.filter(c => {
      const mentions = extractMentions(c.text);
      return mentions.length >= minMentions;
    });
  }

  // Mükerrer kullanıcı filtresi (her kullanıcıyı bir kez say)
  if (!allowDuplicates) {
    const seen = new Set();
    filtered = filtered.filter(c => {
      if (seen.has(c.username)) return false;
      seen.add(c.username);
      return true;
    });
  }

  return filtered;
}

// Yorumdan @ etiketleri çıkar
export function extractMentions(text) {
  const matches = text.match(/@[\w.]+/g) || [];
  return matches.map(m => m.slice(1));
}

// Rastgele kazanan seç
export function pickWinners(comments, count = 1) {
  if (comments.length === 0) return [];
  const shuffled = [...comments].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, comments.length));
}
