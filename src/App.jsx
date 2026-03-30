import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';

import { auth, database } from './firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';

import ML from './assets/mafia_img/fonts/Mafia_icon.png';
import './App.css';

import SinglePlayer      from './Single/SinglePlayer';
import Profil            from './Profil/profil';
import Shop              from './ShOP/Shop';
import About             from './Info/About';
import Multiplayer_rooms from './multiplayer_rooms/mtt/Multiplayer_rooms';

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

  const [user, setUser]         = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry]   = useState('Uzbekistan');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const snap = await get(child(ref(database), `users/${currentUser.uid}`));
          if (snap.exists()) {
            setUser({ uid: currentUser.uid, email: currentUser.email, ...snap.val() });
          } else {
            setUser({ uid: currentUser.uid, email: currentUser.email });
          }
        } catch {
          setUser({ uid: currentUser.uid, email: currentUser.email });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    isDarkMode
      ? document.body.classList.add('dark-theme')
      : document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleRegister = async () => {
    if (!username || !email || !password) return alert("Hamma maydonni to'ldiring!");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = {
        id: res.user.uid, username, email,
        location: { country },
        image: '/avatars/default.jpg',
        coins: 500, stars: 0, vip: 'None',
        aholi: { aholi_all_game: 0, wins: 0, rollar: { tinchaholi: 0, kamissar: 0, shifokor: 0 } },
        mafia: { mafia_all_game: 0, wins: 0, kills: 0, mafia_rollar: { Mafia: 0, Don: 0 } },
        inventory: { roles: { don: 0, mafia: 0, shifokor: 0, kamissar: 0 } },
        active_role: 'none',
        createdAt: new Date().toISOString(),
      };
      await set(ref(database, `users/${res.user.uid}`), newUser);
      alert("Muvaffaqiyatli ro'yxatdan o'tdingiz! 🎉");
      setAuthMode(null);
    } catch (err) {
      alert('Xato: ' + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthMode(null);
    } catch (err) {
      alert('Xato: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveTab('home');
    } catch (err) {
      alert('Chiqishda xato: ' + err.message);
    }
  };

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0d0d1a', color:'white', fontSize:'1.2rem' }}>
        ⏳ Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="menu_Mafia">
      {activeTab !== 'play-zone' && activeTab !== 'multiplayer' && (
        <aside className="sidebar">
          <div className="logo-section">
            <h1 className="logo-text">MAFIA</h1>
            <img className="main_logo1" src={ML} alt="main_logo" />
            <span className="logo-subtitle">CREATIVE GAME</span>
          </div>

          <div className="language-switcher">
            <button className={`lang-btn ${i18n.language === 'uz' ? 'active-lang' : ''}`} onClick={() => changeLanguage('uz')}>UZ</button>
            <button className={`lang-btn ${i18n.language === 'en' ? 'active-lang' : ''}`} onClick={() => changeLanguage('en')}>EN</button>
          </div>

          <nav className="menu-list">
            {['home','play','shop','profile','about'].map(id => (
              <button
                key={id}
                disabled={!user && id !== 'home' && id !== 'about'}
                className={`menu-btn ${activeTab === id ? 'active' : ''}`}
                style={(!user && id !== 'home' && id !== 'about') ? { opacity:0.4, cursor:'not-allowed' } : {}}
                onClick={() => setActiveTab(id)}
              >
                {id === 'play' ? `🎮 ${t('play')}` : t(id)}
              </button>
            ))}
          </nav>

          <div className="theme-toggle-container">
            <button className="theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? `☀️ ${t('day_mode')}` : `🌙 ${t('night_mode')}`}
            </button>
          </div>

          {user && (
            <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.1)', marginTop:'auto' }}>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.8rem', marginBottom:'4px' }}>{user.username}</div>
              <div style={{ color:'gold', fontSize:'0.8rem', marginBottom:'8px' }}>
                🪙 {user.coins || 0} | ⭐ {user.stars || 0}
              </div>
              {user.active_role && user.active_role !== 'none' && (
                <div style={{ color:'#81c784', fontSize:'0.75rem', marginBottom:'8px' }}>
                  🎭 Aktiv: {user.active_role.toUpperCase()}
                </div>
              )}
              <button className="menu-btn" onClick={handleLogout}
                style={{ color:'#ff4d4d', border:'1px solid #ff4d4d', width:'100%', fontSize:'0.82rem', padding:'6px' }}>
                🚪 Chiqish
              </button>
            </div>
          )}
        </aside>
      )}

      <main className={activeTab === 'play-zone' || activeTab === 'multiplayer' ? 'full-content' : 'content-area'}>

        {activeTab === 'home' && (
          <section className="hero-section">
            <div className="hero-inner" style={{ textAlign:'center' }}>
              <h2 className="hero-title">{t('welcome')}</h2>

              {!user ? (
                <div className="auth-buttons" style={{ marginTop:'20px' }}>
                  {!authMode ? (
                    <>
                      <button className="secondary-btn" onClick={() => setAuthMode('login')}>🔑 Kirish</button>
                      <button className="secondary-btn" onClick={() => setAuthMode('register')} style={{ marginLeft:'10px' }}>📝 Ro'yxatdan o'tish</button>
                    </>
                  ) : (
                    <div className="auth-form" style={{ display:'flex', flexDirection:'column', gap:'10px', maxWidth:'300px', margin:'auto' }}>
                      {authMode === 'register' && (
                        <>
                          <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} className="auth-input" />
                          <select onChange={e => setCountry(e.target.value)} className="auth-input">
                            <option value="Uzbekistan">🇺🇿 Uzbekistan</option>
                            <option value="USA">🇺🇸 USA</option>
                            <option value="Russia">🇷🇺 Russia</option>
                            <option value="Other">🌍 Other</option>
                          </select>
                        </>
                      )}
                      <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} className="auth-input" />
                      <input type="password" placeholder="Parol" onChange={e => setPassword(e.target.value)} className="auth-input" />
                      <button className="secondary-btn" onClick={authMode === 'login' ? handleLogin : handleRegister}>
                        {authMode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}
                      </button>
                      <button onClick={() => setAuthMode(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>← Orqaga</button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="hero-desc" style={{ color:'#4caf50', fontWeight:'bold', fontSize:'1.1rem', marginTop:'20px' }}>
                  Xush kelibsiz, {user.username}! 🎭
                </p>
              )}
              <p className="hero-desc" style={{ marginTop:'16px', color:'rgba(255,255,255,0.6)' }}>{t('home_desc')}</p>
            </div>
          </section>
        )}

        {activeTab === 'play' && user && (
          <section className="hero-section">
            <div className="hero-inner" style={{ textAlign:'center' }}>
              <h2 className="hero-title">{t('select_mode')}</h2>
              {user.active_role && user.active_role !== 'none' && (
                <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid rgba(76,175,80,0.3)', borderRadius:'8px', padding:'10px 20px', marginBottom:'20px', color:'#81c784' }}>
                  🎭 Aktiv rolingiz: <strong>{user.active_role.toUpperCase()}</strong>
                </div>
              )}
              <div style={{ display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap', marginTop:'24px' }}>
                <button className="secondary-btn" onClick={() => setActiveTab('play-zone')}>🤖 Singleplayer (AI)</button>
                <button className="secondary-btn" onClick={() => setActiveTab('multiplayer')}>🌐 Multiplayer (Online)</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'play-zone' && (
          <SinglePlayer onBack={() => setActiveTab('play')} activeRole={user?.active_role} />
        )}

        // ✅ TO'G'RI
        {activeTab === 'multiplayer' && user && (
          <Multiplayer_rooms user={user} onBack={() => setActiveTab('play')} />
        )}

        {activeTab === 'shop'    && <Shop    user={user} />}
        {activeTab === 'profile' && <Profil  user={user} />}
        {activeTab === 'about'   && <About />}
      </main>
    </div>
  );
}

export default App;
