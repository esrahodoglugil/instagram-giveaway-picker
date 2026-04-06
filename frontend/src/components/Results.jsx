import { useState, useEffect } from 'react';

export default function Results({ result, onReset }) {
  const { stats, winners, eligible } = result;
  const [showWinners, setShowWinners] = useState(false);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShowWinners(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showWinners) return;
    if (revealed < winners.length) {
      const t = setTimeout(() => setRevealed(r => r + 1), 600);
      return () => clearTimeout(t);
    }
  }, [showWinners, revealed, winners.length]);

  return (
    <div style={styles.wrapper}>
      {/* Stats */}
      <div style={styles.statsRow}>
        <StatBox label="Toplam Yorum" value={stats.totalComments} icon="💬" />
        <StatBox label="Geçerli Katılım" value={stats.eligibleComments} icon="✅" />
        <StatBox label="Kazanan" value={stats.winnerCount} icon="🏆" />
      </div>

      {/* Winners */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>🎉 Kazananlar</h2>
        <div style={styles.winners}>
          {winners.slice(0, revealed).map((w, i) => (
            <WinnerCard key={w.id} winner={w} rank={i + 1} />
          ))}
          {revealed < winners.length && (
            <div style={styles.revealing}>⏳ Açıklanıyor...</div>
          )}
        </div>
      </div>

      {/* Eligible list */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Tüm Geçerli Katılımcılar ({eligible.length})</h3>
        <div style={styles.list}>
          {eligible.map(c => (
            <div key={c.id} style={styles.listItem}>
              <img
                src={c.profilePicUrl || `https://ui-avatars.com/api/?name=${c.username}&background=2a2a3a&color=fff`}
                style={styles.avatar}
                alt=""
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${c.username}&background=2a2a3a&color=fff`; }}
              />
              <div style={styles.listInfo}>
                <div style={styles.listUsername}>@{c.username}</div>
                <div style={styles.listText}>{c.text.length > 80 ? c.text.slice(0, 80) + '…' : c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button style={styles.resetBtn} onClick={onReset}>
        🔄 Yeni Çekiliş
      </button>
    </div>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <div style={sb.box}>
      <div style={sb.icon}>{icon}</div>
      <div style={sb.value}>{value}</div>
      <div style={sb.label}>{label}</div>
    </div>
  );
}

function WinnerCard({ winner, rank }) {
  return (
    <div style={wc.card}>
      <div style={wc.rank}>#{rank}</div>
      <img
        src={winner.profilePicUrl || `https://ui-avatars.com/api/?name=${winner.username}&background=7c4dff&color=fff`}
        style={wc.avatar}
        alt=""
        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${winner.username}&background=7c4dff&color=fff`; }}
      />
      <div>
        <div style={wc.username}>@{winner.username}</div>
        {winner.fullName && <div style={wc.fullname}>{winner.fullName}</div>}
        <div style={wc.comment}>{winner.text.length > 100 ? winner.text.slice(0, 100) + '…' : winner.text}</div>
      </div>
    </div>
  );
}

const sb = {
  box: { flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', textAlign: 'center' },
  icon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  value: { fontSize: '2rem', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--accent)' },
  label: { color: 'var(--text2)', fontSize: '0.8rem', marginTop: '4px' },
};

const wc = {
  card: { display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'linear-gradient(135deg, rgba(124,77,255,0.1), rgba(224,64,251,0.1))', border: '1px solid var(--accent2)', borderRadius: '12px', padding: '1.25rem', animation: 'fadeIn 0.4s ease' },
  rank: { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)', minWidth: '2rem' },
  avatar: { width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent2)', flexShrink: 0 },
  username: { fontWeight: 700, fontSize: '1rem', color: 'var(--text)' },
  fullname: { color: 'var(--text2)', fontSize: '0.85rem', marginTop: '2px' },
  comment: { color: 'var(--text2)', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.4 },
};

const styles = {
  wrapper: { maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  statsRow: { display: 'flex', gap: '1rem' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'Syne, sans-serif' },
  winners: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  revealing: { color: 'var(--text2)', textAlign: 'center', padding: '1rem', fontSize: '0.9rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '400px', overflowY: 'auto' },
  listItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  listInfo: { flex: 1, minWidth: 0 },
  listUsername: { fontWeight: 600, fontSize: '0.9rem' },
  listText: { color: 'var(--text2)', fontSize: '0.82rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  resetBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', width: '100%' },
};
