/**
 * SinglePlayer.jsx — TO'LDIRILGAN VERSIYA
 * 
 * Tuzatmalar:
 * - activeRole prop qabul qiladi (shopdan olingan)
 * - Chat panel yashirilgan/ko'rsatilgan toggle
 * - Qoidalar modali
 * - Tun harakatlari to'g'ri ishlaydi
 * - AI helper (qoidalar tushuntirish)
 * - Taslim bo'lish tugmasi
 * - G'oliblarga sovg'alar ko'rsatish
 */
import React, { useEffect, useRef, useState } from 'react';
import { auth, database } from '../firebase';
import { ref, update, get } from 'firebase/database';
import useGameStore from '../store/useGameStore';
import cb from '../assets/mafia_img/fonts/card_bg.png';
import './SinglePlayer.css';

const ROLE_IMAGES = {
  Don:      new URL('../assets/mafia_img/cards/don.png',      import.meta.url).href,
  Mafia:    new URL('../assets/mafia_img/cards/mafia.png',    import.meta.url).href,
  Komissar: new URL('../assets/mafia_img/cards/komissar.png', import.meta.url).href,
  Shifokor: new URL('../assets/mafia_img/cards/shifokor.png', import.meta.url).href,
  Aholi:    new URL('../assets/mafia_img/cards/aholi.png',    import.meta.url).href,
};

const GAME_RULES = `
🎭 MAFIA O'YIN QOIDALARI

👥 ROLLAR:
• Don (Mafia) — Mafia boshlig'i. Tunda o'ldiradi, kunda aholi kabi ko'rinadi.
• Mafia — Don bilan birgalikda tunda o'ldiradi.
• Komissar (Sheriff) — Tunda bitta kishini tekshiradi (mafia/aholi) YOKI otadi. Ikkalasini bir kechada qila olmaydi!
• Shifokor (Doktor) — Tunda bitta kishini himoyalaydi. O'zini faqat 1 marta himoyalaydi.
• Aholi (Citizen) — Kunda ovoz beradi, tunda uxlaydi.

🌞 KUNDUZ (45 soniya):
• Hamma muhokama qiladi
• Ovoz berish: eng ko'p ovoz olgan o'yinchi chetlatiladi
• Tenglik bo'lsa — hech kim ketmaydi

🌙 TUN (30 soniya):
• Mafia/Don: qurbon tanlaydi
• Komissar: tekshirish YOKI otish (bir kechada bitta!)
• Shifokor: kimnidir himoyalaydi
• Aholi: uxlaydi

🏆 G'ALABA SHARTLARI:
• Aholi: Barcha mafialarni chetlashtirsa — G'ALABA!
• Mafia: Mafia soni aholi soniga teng/ortiq bo'lsa — G'ALABA!
`;

const SinglePlayer = ({ onBack, activeRole, user }) => {
  const s = useGameStore();
  const chatEndRef  = useRef(null);
  const [showChat, setShowChat]   = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);

  // ===== QUEST PROGRESS TRACKING =====
  const trackSinglePlayerQuest = async (won, role) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await get(ref(database, `users/${uid}/quests`));
      const q = snap.exists() ? snap.val() : {};
      const updates = {};
      const add = (id, n=1) => { updates[`quests/${id}/progress`] = (q[id]?.progress || 0) + n; };

      // Match counters
      add('q_sp_play_1'); add('q_sp_play_3'); add('q_sp_play_5'); add('q_sp_play_10');
      add('q_total_1'); add('q_total_3'); add('q_total_5'); add('q_total_10');
      add('q_total_20'); add('q_total_30'); add('q_total_50'); add('q_total_75'); add('q_total_100');

      if (won) {
        add('q_sp_win_1'); add('q_sp_win_5'); add('q_sp_win_10');
        add('q_win_total_5'); add('q_win_total_20'); add('q_win_total_50');
        const r = role?.toLowerCase();
        if (r === 'mafia')    { add('q_mafia_win_1'); add('q_mafia_win_3'); add('q_mafia_win_5'); add('q_mafia_win_10'); add('q_sp_mafia_win_3'); }
        if (r === 'aholi')    { add('q_aholi_win_1'); add('q_aholi_win_3'); add('q_aholi_win_5'); add('q_aholi_win_10'); }
        if (r === 'shifokor') { add('q_shifokor_win_1'); add('q_shifokor_win_3'); add('q_shifokor_win_5'); add('q_shifokor_win_10'); add('q_sp_shifokor_3'); }
        if (r === 'komissar') { add('q_komissar_win_1'); add('q_komissar_win_3'); add('q_komissar_win_5'); add('q_komissar_win_10'); add('q_sp_komissar_3'); }
        if (r === 'don')      { add('q_don_win_1'); add('q_don_win_3'); add('q_don_win_5'); add('q_don_win_10'); add('q_sp_don_win_3'); }

        // FIX: G'olibga tanga va yulduz berish
        const { runTransaction } = await import('firebase/database');
        await runTransaction(ref(database, `users/${uid}/coins`), (cur) => (cur || 0) + 300);
        await runTransaction(ref(database, `users/${uid}/stars`), (cur) => (cur || 0) + 5);
      }
      await update(ref(database, `users/${uid}`), updates);
    } catch(err) { console.error('trackSinglePlayerQuest:', err); }
  };

  // Timer
  useEffect(() => {
    let timer;
    if (s.gameState === 'playing' && !s.isTimerPaused) {
      timer = setInterval(() => s.tick(), 1000);
    }
    return () => clearInterval(timer);
  }, [s.gameState, s.isTimerPaused]);

  // Chat scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [s.logs]);

  const getCardImage = (role) => ROLE_IMAGES[role] || cb;

  const canPerformNightAction = !s.isDay && s.nightActionTarget &&
    s.gameState === 'playing' && !s.isTimerPaused;

  const userPlayer = s.players.find(p => p.isUser);
  const isAlive = userPlayer?.isAlive;

  // FIX: O'yin tugaganda quest va reward tracking
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (s.gameState === 'ended' && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      const userWon = (s.gameResult === 'WIN' && s.userRole !== 'Mafia' && s.userRole !== 'Don') ||
                     (s.gameResult === 'LOSE' && (s.userRole === 'Mafia' || s.userRole === 'Don'));
      trackSinglePlayerQuest(userWon, s.userRole);
    }
    if (s.gameState === 'lobby') {
      hasTrackedRef.current = false;
    }
  }, [s.gameState]);

  // G'oliblar ekrani
  if (s.gameState === 'ended') {
    const userWon = (s.gameResult === 'WIN' && s.userRole !== 'Mafia' && s.userRole !== 'Don') ||
                   (s.gameResult === 'LOSE' && (s.userRole === 'Mafia' || s.userRole === 'Don'));
    return (
      <div className={`Solo_EndScreen ${userWon ? 'win' : 'lose'}`}>
        <div className="Solo_EndCard">
          <div className="Solo_EndIcon">{userWon ? '🏆' : '💀'}</div>
          <h1 className={`Solo_EndTitle ${s.gameResult === 'WIN' ? 'win-text' : 'lose-text'}`}>
            {s.announcement}
          </h1>
          {userWon && (
            <div className="Solo_Rewards">
              <h3>🎁 Sovg'angiz:</h3>
              <div className="Solo_RewardItems">
                <span>🪙 +300 Tanga</span>
                <span>⭐ +5 Yulduz</span>
              </div>
            </div>
          )}
          <div className="Solo_RolesReveal">
            <h4>Barcha rollar:</h4>
            <div className="Solo_RevealGrid">
              {s.players.map(p => (
                <div key={p.id} className="Solo_RevealCard">
                  <img src={getCardImage(p.role)} alt={p.role} />
                  <span>{p.name}</span>
                  <span className="Solo_RevealRole">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="EndActions">
            <button onClick={() => s.initGame(activeRole)}>🔄 QAYTA</button>
            <button onClick={onBack}>🏠 MENUGA</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`Solo_MainContainer ${!s.isDay ? 'Solo_NightTheme' : ''}`}>

      {/* RULES MODAL */}
      {showRules && (
        <div className="Solo_Modal_Overlay" onClick={() => setShowRules(false)}>
          <div className="Solo_Modal" onClick={e => e.stopPropagation()}>
            <button className="Solo_Modal_Close" onClick={() => setShowRules(false)}>✕</button>
            <pre className="Solo_Rules_Text">{GAME_RULES}</pre>
          </div>
        </div>
      )}

      {/* SURRENDER CONFIRM */}
      {showSurrender && (
        <div className="Solo_Modal_Overlay">
          <div className="Solo_Modal" style={{ maxWidth: '360px' }}>
            <h3 style={{ color: '#ff4444', marginBottom: '12px' }}>Taslim bo'lasizmi?</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px' }}>O'yindan chiqib ketasiz.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={onBack} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Ha, chiqaman</button>
              <button onClick={() => setShowSurrender(false)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Yo'q</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="Solo_Sidebar">
        <div className="Solo_LogoArea">
          <h2>MAFIA</h2>
          <span className="RoleBadge">SIZ: {s.userRole}</span>
          {activeRole && activeRole !== 'none' && (
            <span style={{ fontSize: '0.7rem', color: '#81c784', marginTop: '4px', display: 'block' }}>
              🎭 Aktiv: {activeRole.toUpperCase()}
            </span>
          )}
        </div>
        <nav className="Solo_Nav">
          <button className="Solo_NavBtn active">Kun: {s.dayCount}</button>
          <button className="Solo_NavBtn" onClick={() => setShowRules(true)}>📖 Qoidalar</button>
          <button className="Solo_NavBtn" onClick={() => setShowChat(!showChat)}>
            💬 {showChat ? "Chatni yop" : "Chatni och"}
          </button>
          {s.gameState === 'playing' && isAlive && (
            <button className="Solo_NavBtn" style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }}
              onClick={() => setShowSurrender(true)}>
              🏳️ Taslim
            </button>
          )}
          <button className="Solo_NavBtn" onClick={onBack}>← Chiqish</button>
        </nav>
      </aside>

      {/* MAIN GAME ARENA */}
      <main className="Solo_GameArena">
        {s.announcement && (
          <div className="Solo_Announcement">
            <h1 className={s.gameResult === 'WIN' ? 'win-text' : s.gameResult === 'LOSE' ? 'lose-text' : ''}>
              {s.announcement}
            </h1>
          </div>
        )}

        {/* TIMER + PHASE */}
        <div className="Solo_TableCenter">
          <div className={`Solo_TimerCircle ${s.isDay ? 'day' : 'night'}`}>
            <span>{s.isDay ? '☀️ MUHOKAMA' : '🌙 TUNGI HARAKAT'}</span>
            <h1 className={`Solo_BigClock ${s.timeLeft <= 10 ? 'urgent' : ''}`}>{s.timeLeft}</h1>
          </div>

          {/* TUN HARAKATLARI */}
          {canPerformNightAction && (
            <div className="NightActionPanel">
              <p>Nishon: <strong>{s.players.find(p => p.id === s.nightActionTarget)?.name}</strong></p>

              {s.userRole === 'Komissar' && !s.sheriffUsedAction && (
                <div className="ActionBtns">
                  <button className="btn-check" onClick={() => s.executeSheriffAction('check')}>
                    👁️ TEKSHIRISH
                  </button>
                  <button className="btn-kill" onClick={() => s.executeSheriffAction('kill')}>
                    🔫 OTISH
                  </button>
                </div>
              )}
              {s.userRole === 'Komissar' && s.sheriffUsedAction && (
                <p style={{ color: '#4caf50' }}>✅ Harakatingiz bajarildi.</p>
              )}

              {s.userRole === 'Shifokor' && (
                <button className="btn-heal" onClick={s.executeDoctorAction}>➕ DAVOLASH</button>
              )}

              {(s.userRole === 'Mafia' || s.userRole === 'Don') && (
                <p className="status-text">⚔️ Mafia nishoni tanlandi. Tun yakunini kuting...</p>
              )}
            </div>
          )}

          {!s.isDay && s.userRole === 'Aholi' && s.gameState === 'playing' && (
            <div className="NightActionPanel">
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>😴 Aholi tunda uxlaydi...</p>
            </div>
          )}
        </div>

        {/* DOIRA - O'YINCHILAR */}
        <div className="Solo_CircleTable">
          {s.players.map((player, index) => {
            const angle    = (360 / 8) * index;
            const isDead   = !player.isAlive;
            const isSelected = s.selectedVote === player.id || s.nightActionTarget === player.id;
            const showRole = player.isUser || isDead || s.gameState === 'ended' ||
              (s.userRole === 'Komissar' && player.knowsAsMafia) ||
              ((s.userRole === 'Mafia' || s.userRole === 'Don') && (player.role === 'Mafia' || player.role === 'Don'));

            return (
              <div
                key={player.id}
                className={`Solo_PlayerSlot ${isSelected ? 'Voted' : ''} ${isDead ? 'Dead' : ''} ${player.isUser ? 'MySlot' : ''}`}
                style={{ transform: `rotate(${angle}deg) translate(260px) rotate(-${angle}deg)` }}
                onClick={() => !isDead && s.handleVote(player.id)}
              >
                <div className="Solo_CardFrame">
                  <img
                    src={showRole ? getCardImage(player.role) : cb}
                    alt="card"
                    className={showRole ? 'reveal' : 'hidden'}
                  />
                  {player.votes > 0 && s.isDay && <div className="Solo_VoteBadge">{player.votes}</div>}
                  {isDead && <div className="Solo_DeadOverlay">💀</div>}
                  {player.isUser && s.userRole === 'Shifokor' && s.hasDoctorHealedSelf && (
                    <div className="HealedMark">💚</div>
                  )}
                </div>
                <div className="Solo_PlayerMeta">
                  <span>{player.name} {player.isUser && '(SIZ)'}</span>
                  {showRole && !isDead && <small className="RoleLabel">{player.role}</small>}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* CHAT PANEL */}
      {showChat && (
        <section className="Solo_ChatSide">
          <div className="Solo_ChatHeader">📜 O'YIN JARYONI</div>
          <div className="Solo_ChatList">
            {s.logs.map(log => (
              <div key={log.id} className="Solo_ChatMessage">
                <b className={log.user === 'Sistema' ? 'gold' : 'blue'}>{log.user}:</b> {log.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </section>
      )}

      {/* START OVERLAY */}
      {s.gameState === 'lobby' && (
        <div className="Solo_FullOverlay">
          <div className="Solo_StartCard">
            <h1>🎭 MAFIA SOLO</h1>
            {activeRole && activeRole !== 'none' && (
              <p style={{ color: '#81c784', margin: '8px 0' }}>
                Aktiv rol: <strong>{activeRole.toUpperCase()}</strong> ishlatiladi
              </p>
            )}
            <button onClick={() => s.initGame(activeRole)}>▶ O'YINNI BOSHLASH</button>
            <button onClick={() => setShowRules(true)} style={{ background: 'rgba(255,255,255,0.1)', marginTop: '8px' }}>📖 Qoidalar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SinglePlayer;
