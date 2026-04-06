import { useState } from 'react';
import { reloadSession } from '../services/api';

export default function LoginForm({ onSessionRestored }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tryReload = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reloadSession();
      if (data.loggedIn && data.username) {
        onSessionRestored?.(data.username);
      } else {
        setError(data.error || 'Oturum açılamadı');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.icon}>🍪</div>
        <h2 style={styles.title}>Instagram oturumu (.env)</h2>
        <p style={styles.subtitle}>
          Şifre ile giriş kullanılmıyor. Tarayıcıdaki <strong>sessionid</strong> çerezini backend&apos;e vermeniz yeterli;
          bu yöntem genelde daha stabil çalışır.
        </p>

        <ol style={styles.steps}>
          <li>Chrome&apos;da <a href="https://www.instagram.com" target="_blank" rel="noreferrer" style={styles.link}>instagram.com</a>&apos;a giriş yapın</li>
          <li><strong>F12</strong> → <strong>Application</strong> (Uygulama) → <strong>Cookies</strong> → <code style={styles.code}>https://www.instagram.com</code></li>
          <li><strong>sessionid</strong> satırındaki değeri kopyalayın</li>
          <li><code style={styles.code}>backend/.env</code> dosyasına ekleyin:</li>
        </ol>

        <p style={styles.note}>
          <strong>Önerilen:</strong> Çerez tablosundan <code style={styles.code}>sessionid</code>,{' '}
          <code style={styles.code}>csrftoken</code>, <code style={styles.code}>mid</code>,{' '}
          <code style={styles.code}>ig_did</code>, <code style={styles.code}>ds_user_id</code> vb. önemli
          satırları tek satırda birleştirip <code style={styles.code}>backend/.env</code> içine ekleyin:
        </p>
        <pre style={styles.pre}>
{`INSTAGRAM_COOKIE=sessionid=...; csrftoken=...; mid=...; ig_did=...; ds_user_id=...`}
        </pre>
        <p style={styles.note}>
          Yalnızca <code style={styles.code}>INSTAGRAM_SESSION_ID</code> bazen yeterli olmaz; API HTML döndürebilir.
          Kaydettikten sonra aşağıdaki düğmeyle yeniden yükleyin.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="button"
          style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          disabled={loading}
          onClick={tryReload}
        >
          {loading ? '⏳ Yükleniyor...' : 'Oturumu .env’den yeniden yükle'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '80vh', padding: '2rem',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '2.5rem', maxWidth: '520px',
    width: '100%', textAlign: 'left',
  },
  icon: { fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' },
  title: { fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' },
  subtitle: { color: 'var(--text2)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.6, textAlign: 'center' },
  steps: {
    color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.75,
    paddingLeft: '1.25rem', margin: '0 0 1rem',
  },
  link: { color: 'var(--accent)' },
  code: {
    background: 'var(--surface2)', padding: '0.15rem 0.4rem', borderRadius: '6px',
    fontSize: '0.85rem',
  },
  pre: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '1rem', fontSize: '0.85rem',
    overflow: 'auto', margin: '0 0 1.25rem', color: 'var(--text)',
  },
  note: { color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.55, margin: '0 0 1.25rem' },
  error: {
    background: 'rgba(255,77,109,0.1)', border: '1px solid var(--error)',
    borderRadius: '8px', padding: '0.75rem', color: 'var(--error)',
    fontSize: '0.9rem', marginBottom: '1rem',
  },
  btn: {
    display: 'block', width: '100%',
    background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
    border: 'none', borderRadius: '10px', padding: '0.9rem',
    color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '1rem',
    fontWeight: 700, cursor: 'pointer', transition: 'transform 0.1s',
  },
};
