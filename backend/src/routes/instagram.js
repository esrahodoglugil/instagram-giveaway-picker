import { Router } from 'express';
import { getSession, clearSession, reloadSessionFromEnv } from '../services/session.js';
import {
  fetchAllComments,
  fetchPostOwnerProfile,
  filterComments,
  pickWinners,
  checkFollower,
  extractShortcode,
  shortcodeToMediaId,
  normalizeClientComments,
} from '../services/scraper.js';

const MAX_CLIENT_COMMENTS = 100_000;

export const instagramRouter = Router();

// Oturum durumu
instagramRouter.get('/session', (req, res) => {
  const session = getSession();
  if (session) {
    res.json({ loggedIn: true, username: session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// .env'den oturumu yeniden yükle (sunucuyu kapatmadan)
instagramRouter.post('/session/reload', async (req, res, next) => {
  try {
    const ok = await reloadSessionFromEnv();
    if (ok) {
      const session = getSession();
      return res.json({ success: true, loggedIn: true, username: session.username });
    }
    return res.status(401).json({
      success: false,
      error:
        'Oturum yüklenemedi. backend/.env içinde INSTAGRAM_SESSION_ID doğru mu kontrol edin; gerekirse csrftoken/ds_user_id ekleyin.',
    });
  } catch (err) {
    next(err);
  }
});

// Çıkış yap
instagramRouter.post('/logout', (req, res) => {
  clearSession();
  res.json({ success: true });
});

// Çekiliş yap
// - Mod A (sunucu): postUrl + .env oturumu → Instagram API’den yorum çeker
// - Mod B (istemci): body.comments[] → sunucu Instagram’a gitmez, sadece filtre + kazanan (extension / manuel)
instagramRouter.post('/cekilis', async (req, res, next) => {
  try {
    const {
      postUrl,
      comments: rawComments,
      requireMention = false,
      allowDuplicates = false,
      minMentions = 1,
      requireFollower = false,
      winnerCount = 1,
    } = req.body;

    const clientMode =
      Array.isArray(rawComments) && rawComments.length > 0;

    if (clientMode) {
      if (rawComments.length > MAX_CLIENT_COMMENTS) {
        return res.status(400).json({
          error: `En fazla ${MAX_CLIENT_COMMENTS.toLocaleString('tr-TR')} yorum gönderilebilir`,
        });
      }
      if (requireFollower) {
        return res.status(400).json({
          error:
            'Tarayıcıdan gelen yorumlarla takipçi kontrolü desteklenmiyor (userId yok). requireFollower kapatın veya sunucu modunu (postUrl) kullanın.',
        });
      }

      const allComments = normalizeClientComments(rawComments);
      if (allComments.length === 0) {
        return res.status(400).json({
          error: 'Geçerli yorum yok: her öğede username ve text gerekli',
        });
      }

      let filtered = filterComments(allComments, {
        requireMention,
        allowDuplicates,
        minMentions,
      });

      const winners = pickWinners(filtered, winnerCount);

      return res.json({
        success: true,
        stats: {
          source: 'client',
          totalComments: allComments.length,
          eligibleComments: filtered.length,
          winnerCount: winners.length,
        },
        winners,
        eligible: filtered,
      });
    }

    const session = getSession();
    if (!session) {
      return res.status(401).json({ error: 'Önce giriş yapmalısınız' });
    }

    if (!postUrl) {
      return res.status(400).json({
        error: 'Gönderi linki gerekli (veya comments dizisi gönderin)',
      });
    }

    const allComments = await fetchAllComments(postUrl);

    let filtered = filterComments(allComments, {
      requireMention,
      allowDuplicates,
      minMentions,
    });

    if (requireFollower) {
      const followerChecks = await Promise.all(
        filtered.map(async c => {
          const isFollower = await checkFollower(c.userId);
          return { ...c, isFollower };
        })
      );
      filtered = followerChecks.filter(c => c.isFollower);
    }

    const winners = pickWinners(filtered, winnerCount);

    res.json({
      success: true,
      stats: {
        source: 'server',
        totalComments: allComments.length,
        eligibleComments: filtered.length,
        winnerCount: winners.length,
      },
      winners,
      eligible: filtered,
    });
  } catch (err) {
    next(err);
  }
});

// Sadece yorum sayısını önizle (hızlı kontrol)
instagramRouter.post('/preview', async (req, res, next) => {
  try {
    const session = getSession();
    if (!session) {
      return res.status(401).json({ error: 'Önce giriş yapmalısınız' });
    }

    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: 'Gönderi linki gerekli' });

    const shortcode = extractShortcode(postUrl);
    const mediaId = shortcodeToMediaId(shortcode);

    res.json({ success: true, shortcode, mediaId });
  } catch (err) {
    next(err);
  }
});

// Gönderi sahibini ve profil istatistiklerini önizle
instagramRouter.post('/post-owner', async (req, res, next) => {
  try {
    const session = getSession();
    if (!session) {
      return res.status(401).json({ error: 'Önce giriş yapmalısınız' });
    }

    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: 'Gönderi linki gerekli' });

    const profile = await fetchPostOwnerProfile(postUrl);
    res.json({ success: true, ...profile });
  } catch (err) {
    next(err);
  }
});
