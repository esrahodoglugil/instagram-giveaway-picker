import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import CekilisForm from './components/CekilisForm';
import Results from './components/Results';
import { checkSession, logout } from './services/api';

export default function App() {
  const [step, setStep] = useState('loading'); // loading | login | cekilis | results
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkSession()
      .then(data => {
        if (data.loggedIn) {
          setUsername(data.username);
          setStep('cekilis');
        } else {
          setStep('login');
        }
      })
      .catch(() => setStep('login'));
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => {});
    setUsername('');
    setStep('login');
    setResult(null);
  };

  const handleResult = (data) => {
    setResult(data);
    setStep('results');
  };

  const handleReset = () => {
    setResult(null);
    setStep('cekilis');
  };

  if (step === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)' }}>
        Yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {step === 'login' && (
        <LoginForm
          onSessionRestored={(uname) => {
            setUsername(uname);
            setStep('cekilis');
          }}
        />
      )}
      {step === 'cekilis' && (
        <CekilisForm
          username={username}
          onLogout={handleLogout}
          onResult={handleResult}
        />
      )}
      {step === 'results' && (
        <Results result={result} onReset={handleReset} />
      )}
    </div>
  );
}
