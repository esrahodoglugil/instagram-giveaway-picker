import { Router } from 'express';
import { getSession, clearSession, reloadSessionFromEnv } from '../services/session.js';
import {
  fetchAllComments,
  filterComments,
  pickWinners,
  checkFollower,
  extractShortcode,
  shortcodeToMediaId,
} from '../services/scraper.js';

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
instagramRouter.post('/cekilis', async (req, res, next) => {
  try {
    const session = getSession();
    if (!session) {
      return res.status(401).json({ error: 'Önce giriş yapmalısınız' });
    }

    const {
      postUrl,
      requireMention = false,
      allowDuplicates = false,
      minMentions = 1,
      requireFollower = false,
      winnerCount = 1,
    } = req.body;

    if (!postUrl) {
      return res.status(400).json({ error: 'Gönderi linki gerekli' });
    }

    // Yorumları çek
    const allComments = await fetchAllComments(postUrl);

    // Filtreleme
    let filtered = filterComments(allComments, {
      requireMention,
      allowDuplicates,
      minMentions,
    });

    // Takipçi kontrolü (yavaş olabilir)
    if (requireFollower) {
      const followerChecks = await Promise.all(
        filtered.map(async c => {
          const isFollower = await checkFollower(c.userId);
          return { ...c, isFollower };
        })
      );
      filtered = followerChecks.filter(c => c.isFollower);
    }

    // Kazananları seç
    const winners = pickWinners(filtered, winnerCount);

    res.json({
      success: true,
      stats: {
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
