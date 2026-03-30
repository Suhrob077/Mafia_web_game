import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';

import { auth, database, googleProvider, storage } from './firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { ref as dbRef, set, get, child, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import ML from './assets/mafia_img/fonts/Mafia_icon.png';
import './App.css';

import SinglePlayer      from './Single/SinglePlayer';
import Profil            from './Profil/profil';
import Shop              from './ShOP/Shop';
import About             from './Info/About';
import Quest             from './Quest/Quest';
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const snap = await get(child(dbRef(database), `users/${currentUser.uid}`));
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

  const buildNewUser = (uid, uname, mail, loc) => ({
    id: uid, username: uname, email: mail,
    location: { country: loc },
    image: '/avatars/default.jpg',
    coins: 500, stars: 0, vip: 'None',
    aholi: { aholi_all_game: 0, wins: 0, rollar: { tinchaholi: 0, kamissar: 0, shifokor: 0 } },
    mafia: { mafia_all_game: 0, wins: 0, kills: 0, mafia_rollar: { Mafia: 0, Don: 0 } },
    inventory: { roles: { don: 0, mafia: 0, shifokor: 0, kamissar: 0 } },
    active_role: 'none',
    quests: {},
    createdAt: new Date().toISOString(),
  });

  const handleRegister = async () => {
    if (!username || !email || !password) return alert("Hamma maydonni to'ldiring!");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = buildNewUser(res.user.uid, username, email, country);
      await set(dbRef(database, `users/${res.user.uid}`), newUser);
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

  const handleGoogleLogin = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const uid = res.user.uid;
      const snap = await get(child(dbRef(database), `users/${uid}`));
      if (!snap.exists()) {
        // Yangi Google foydalanuvchi
        const uname = res.user.displayName || 'Player_' + uid.slice(0, 5);
        const photoURL = res.user.photoURL || '/avatars/default.jpg';
        const newUser = {
          ...buildNewUser(uid, uname, res.user.email, 'Uzbekistan'),
          image: photoURL,
        };
        await set(dbRef(database, `users/${uid}`), newUser);
      }
      setAuthMode(null);
    } catch (err) {
      alert('Google bilan kirish xatosi: ' + err.message);
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) return alert("Rasm 3MB dan katta bo'lmasin!");
    setUploadingAvatar(true);
    try {
      const sRef = storageRef(storage, `avatars/${user.uid}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      await update(dbRef(database, `users/${user.uid}`), { image: url });
      setUser(prev => ({ ...prev, image: url }));
      alert('Profil rasmi yangilandi! ✅');
    } catch (err) {
      alert('Rasm yuklashda xato: ' + err.message);
    }
    setUploadingAvatar(false);
  };

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0d0d1a', color:'white', fontSize:'1.2rem' }}>
        ⏳ Yuklanmoqda...
      </div>
    );
  }

  const menuItems = [
    { id: 'home',    label: `🏠 ${t('home') || 'Bosh sahifa'}` },
    { id: 'play',    label: `🎮 ${t('play') || 'O\'ynash'}` },
    { id: 'shop',    label: `🛒 ${t('shop') || 'Do\'kon'}` },
    { id: 'profile', label: `👤 ${t('profile') || 'Profil'}` },
    { id: 'quest',   label: `📋 Quest` },
    { id: 'about',   label: `ℹ️ ${t('about') || 'Haqida'}` },
  ];

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
            {menuItems.map(({ id, label }) => (
              <button
                key={id}
                disabled={!user && id !== 'home' && id !== 'about'}
                className={`menu-btn ${activeTab === id ? 'active' : ''}`}
                style={(!user && id !== 'home' && id !== 'about') ? { opacity:0.4, cursor:'not-allowed' } : {}}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="theme-toggle-container">
            <button className="theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? `☀️ ${t('day_mode') || 'Kunduz'}` : `🌙 ${t('night_mode') || 'Tungi'}` }
            </button>
          </div>

          {user && (
            <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.1)', marginTop:'auto' }}>
              {/* Avatar + o'zgartirish */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                <div style={{ position:'relative', cursor:'pointer' }} onClick={() => fileInputRef.current?.click()}>
                  <img
                    src={user.image || '/avatars/default.jpg'}
                    alt="avatar"
                    style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:'2px solid gold' }}
                  />
                  <div style={{ position:'absolute', bottom:0, right:0, background:'rgba(0,0,0,0.7)', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px' }}>
                    ✏️
                  </div>
                </div>
                <div>
                  <div style={{ color:'rgba(255,255,255,0.9)', fontSize:'0.82rem', fontWeight:'bold' }}>{user.username}</div>
                  <div style={{ color:'gold', fontSize:'0.75rem' }}>🪙 {user.coins || 0} | ⭐ {user.stars || 0}</div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display:'none' }}
                onChange={handleAvatarChange}
              />
              {uploadingAvatar && <div style={{ color:'#81c784', fontSize:'0.72rem', marginBottom:'6px' }}>⏳ Rasm yuklanmoqda...</div>}
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

        {/* HOME */}
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
                    <div className="auth-form" style={{ display:'flex', flexDirection:'column', gap:'10px', maxWidth:'320px', margin:'auto' }}>
                      {/* Google tugmasi */}
                      <button
                        onClick={handleGoogleLogin}
                        style={{
                          display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                          background:'white', color:'#333', border:'none', borderRadius:'8px',
                          padding:'10px 16px', fontWeight:'bold', cursor:'pointer', fontSize:'0.95rem',
                          boxShadow:'0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width:22 }} />
                        Google bilan {authMode === 'login' ? 'kirish' : "ro'yxatdan o'tish"}
                      </button>

                      <div style={{ color:'rgba(255,255,255,0.4)', textAlign:'center', fontSize:'0.8rem' }}>— yoki email bilan —</div>

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

                  {!authMode && (
                    <div style={{ marginTop:'16px' }}>
                      <button
                        onClick={handleGoogleLogin}
                        style={{
                          display:'inline-flex', alignItems:'center', gap:'8px',
                          background:'white', color:'#333', border:'none', borderRadius:'8px',
                          padding:'10px 20px', fontWeight:'bold', cursor:'pointer', fontSize:'0.9rem',
                          boxShadow:'0 2px 8px rgba(0,0,0,0.3)'
                        }}
                      >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width:20 }} />
                        Google bilan kirish
                      </button>
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

        {/* PLAY */}
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
          <SinglePlayer onBack={() => setActiveTab('play')} activeRole={user?.active_role} user={user} />
        )}

        {activeTab === 'multiplayer' && user && (
          <Multiplayer_rooms user={user} onBack={() => setActiveTab('play')} />
        )}

        {activeTab === 'shop'    && <Shop    user={user} />}
        {activeTab === 'profile' && <Profil  user={user} />}
        {activeTab === 'quest'   && <Quest   user={user} />}
        {activeTab === 'about'   && <About />}
      </main>
    </div>
  );
}

export default App;
