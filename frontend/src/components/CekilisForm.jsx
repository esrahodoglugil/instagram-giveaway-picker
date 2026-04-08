import { useEffect, useState } from 'react';
import { runCekilis, fetchPostOwner } from '../services/api';

export default function CekilisForm({ username, onLogout, onResult }) {
  const [postUrl, setPostUrl] = useState('');
  const [options, setOptions] = useState({
    requireMention: false,
    minMentions: 1,
    allowDuplicates: false,
    requireFollower: false,
    winnerCount: 1,
  });
  const [loading, setLoading] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [ownerInfo, setOwnerInfo] = useState(null);

  const toggle = key => setOptions(o => ({ ...o, [key]: !o[key] }));
  const setNum = (key, val) => setOptions(o => ({ ...o, [key]: Number(val) }));

  const handleSubmit = async () => {
    if (!postUrl.trim()) return setError('Gönderi linki gerekli');
    setLoading(true);
    setError('');
    setStatus('Yorumlar çekiliyor... Bu biraz sürebilir ⏳');
    try {
      const result = await runCekilis({ postUrl, ...options });
      onResult(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleFetchOwner = async (urlValue = postUrl) => {
    const normalizedUrl = urlValue.trim();
    if (!normalizedUrl) return;
    setOwnerLoading(true);
    try {
      const data = await fetchPostOwner(normalizedUrl);
      setOwnerInfo({
        ...(data.owner || null),
        commentCount: Number(data.commentCount || 0),
      });
    } catch (err) {
      setOwnerInfo(null);
      // Link yazarken invalid URL olabilir; sessiz geçip çekiliş hatasını bozmayalım.
    } finally {
      setOwnerLoading(false);
    }
  };

  useEffect(() => {
    const current = postUrl.trim();
    if (!current) {
      setOwnerInfo(null);
      return;
    }
    const timer = setTimeout(() => {
      handleFetchOwner(current);
    }, 800);
    return () => clearTimeout(timer);
  }, [postUrl]);

  const formatCompact = (n) =>
    new Intl.NumberFormat('tr-TR', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number(n || 0));

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎉 Instagram Çekiliş</h1>
          <p style={styles.sub}>@{username} olarak giriş yapıldı</p>
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}>Çıkış</button>
      </div>

      {/* URL Input */}
      <div style={styles.card}>
        <label style={styles.label}>Gönderi Linki</label>
        <input
          style={styles.input}
          placeholder="https://www.instagram.com/p/..."
          value={postUrl}
          onChange={e => setPostUrl(e.target.value)}
        />
        <div style={styles.metaHint}>
          {ownerLoading ? '⏳ Profil bilgileri alınıyor...' : 'Linki yapıştırınca profil bilgileri otomatik gelir'}
        </div>
        {ownerInfo && (
          <div style={styles.ownerCard}>
            <div style={styles.ownerHead}>
              <img src={ownerInfo.profilePicUrl} alt={ownerInfo.username} style={styles.ownerAvatar} />
              <div>
                <div style={styles.ownerName}>
                  {ownerInfo.fullName || ownerInfo.username}
                  {ownerInfo.isVerified ? ' ✓' : ''}
                </div>
                <div style={styles.ownerUser}>@{ownerInfo.username}</div>
              </div>
            </div>
            <div style={styles.ownerStats}>
              <span>Takipçi: <strong>{formatCompact(ownerInfo.followerCount)}</strong></span>
              <span>Takip: <strong>{formatCompact(ownerInfo.followingCount)}</strong></span>
              <span>Gönderi: <strong>{formatCompact(ownerInfo.mediaCount)}</strong></span>
              <span>Yorum: <strong>{ownerInfo.commentCount?.toLocaleString('tr-TR') || 0}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Katılım Koşulları</h3>

        <div style={styles.options}>
          <Toggle
            label="Birini etiketlemek zorunlu"
            desc="Yorumda @ ile etiket olması şart"
            checked={options.requireMention}
            onChange={() => toggle('requireMention')}
          />
          {options.requireMention && (
            <div style={styles.subOption}>
              <span style={styles.subLabel}>Minimum etiket sayısı:</span>
              <select
                style={styles.select}
                value={options.minMentions}
                onChange={e => setNum('minMentions', e.target.value)}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} kişi</option>
                ))}
              </select>
            </div>
          )}

          <Toggle
            label="Mükerrer yorumlar"
            desc="Aynı kişi birden fazla yorum yapabilir"
            checked={options.allowDuplicates}
            onChange={() => toggle('allowDuplicates')}
          />

          <Toggle
            label="Takipçi kontrolü"
            desc="Sadece seni takip edenler katılır (yavaş)"
            checked={options.requireFollower}
            onChange={() => toggle('requireFollower')}
          />
        </div>

        <div style={styles.winnerRow}>
          <span style={styles.label}>Kazanan sayısı:</span>
          <select
            style={styles.select}
            value={options.winnerCount}
            onChange={e => setNum('winnerCount', e.target.value)}
          >
            {[1, 2, 3, 5, 10].map(n => (
              <option key={n} value={n}>{n} kazanan</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {status && <div style={styles.status}>{status}</div>}

      <button
        style={{ ...styles.runBtn, opacity: loading ? 0.7 : 1 }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '⏳ Çekiliş yapılıyor...' : '🎲 Çekilişi Başlat'}
      </button>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div style={t.row} onClick={onChange}>
      <div style={t.info}>
        <div style={t.label}>{label}</div>
        <div style={t.desc}>{desc}</div>
      </div>
      <div style={{ ...t.toggle, background: checked ? 'var(--accent)' : 'var(--border)' }}>
        <div style={{ ...t.thumb, transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
      </div>
    </div>
  );
}

const t = {
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' },
  info: { flex: 1 },
  label: { fontWeight: 500, fontSize: '0.95rem' },
  desc: { color: 'var(--text2)', fontSize: '0.82rem', marginTop: '2px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', transition: 'background 0.2s', position: 'relative', flexShrink: 0, marginLeft: '1rem' },
  thumb: { position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'transform 0.2s' },
};

const styles = {
  wrapper: { maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: '1.8rem', fontWeight: 800 },
  sub: { color: 'var(--text2)', fontSize: '0.9rem', marginTop: '4px' },
  logoutBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.9rem' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' },
  label: { color: 'var(--text2)', fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem', color: 'var(--text)', fontSize: '0.95rem', outline: 'none' },
  metaHint: { marginTop: '0.6rem', color: 'var(--text2)', fontSize: '0.82rem' },
  ownerCard: { marginTop: '0.9rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem' },
  ownerHead: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  ownerAvatar: { width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', background: 'var(--border)' },
  ownerName: { fontSize: '0.95rem', fontWeight: 700 },
  ownerUser: { fontSize: '0.85rem', color: 'var(--text2)' },
  ownerStats: { marginTop: '0.7rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.86rem', color: 'var(--text2)' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Syne, sans-serif' },
  options: { display: 'flex', flexDirection: 'column' },
  subOption: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0 0.75rem', paddingLeft: '1rem', borderBottom: '1px solid var(--border)' },
  subLabel: { color: 'var(--text2)', fontSize: '0.85rem' },
  select: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' },
  winnerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' },
  runBtn: { background: 'linear-gradient(135deg, var(--accent2), var(--accent))', border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', width: '100%', letterSpacing: '0.02em' },
  error: { background: 'rgba(255,77,109,0.1)', border: '1px solid var(--error)', borderRadius: '10px', padding: '0.85rem 1rem', color: 'var(--error)', fontSize: '0.9rem' },
  status: { background: 'rgba(124,77,255,0.1)', border: '1px solid var(--accent2)', borderRadius: '10px', padding: '0.85rem 1rem', color: 'var(--accent2)', fontSize: '0.9rem' },
};
