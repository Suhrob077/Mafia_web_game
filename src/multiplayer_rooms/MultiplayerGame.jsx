import React, { useEffect, useRef, useState } from 'react';
import useMultiplayerGameStore from '../store/useMultiplayerGameStore';
import './MultiplayerGame.css';

// FIX: Hardcoded /src/assets/ yo'llar o'rniga import.meta.url (Vite build uchun to'g'ri)
const ROLE_IMAGES = {
  Don:      new URL('../assets/mafia_img/cards/don.png',      import.meta.url).href,
  Mafia:    new URL('../assets/mafia_img/cards/mafia.png',    import.meta.url).href,
  Komissar: new URL('../assets/mafia_img/cards/komissar.png', import.meta.url).href,
  Shifokor: new URL('../assets/mafia_img/cards/shifokor.png', import.meta.url).href,
  Aholi:    new URL('../assets/mafia_img/cards/aholi.png',    import.meta.url).href,
  Sudya:    new URL('../assets/mafia_img/cards/sudya.png',    import.meta.url).href,
};
const CARD_BG = new URL('../assets/mafia_img/fonts/card_bg.png', import.meta.url).href;

function MultiplayerGame({ user, roomId, onBack }) {
  const s = useMultiplayerGameStore();
  const chatEndRef = useRef(null);
  const [chatInput, setChatInput] = useState('');
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  useEffect(() => {
    // O'yinni boshlash: store'ni init qilish
    s.init(roomId, user.uid, user.active_role);
    return () => s.cleanup();
  }, [roomId, user.uid]);

  // Timer
  useEffect(() => {
    s.startTimer();
    return () => s.stopTimer();
  }, [s.gameState]);

  // Chat avtomatik pastga
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [s.logs]);

  const me = s.players.find(p => p.user_id === user.uid);
  const isAlive = me?.is_alive !== false;
  const myRole = me?.role || s.myRole;

  // Tun harakati ruxsati
  const canNightAction = !s.isDay && isAlive && !s.nightActionDone && s.gameState === 'playing';
  const canDoAction = canNightAction && s.selectedTarget;

  // Nishon tanlash uchun klik
  const handlePlayerClick = (targetUserId) => {
    if (s.gameState !== 'playing') return;
    if (!isAlive) return;
    if (targetUserId === user.uid) return;

    const target = s.players.find(p => p.user_id === targetUserId);
    if (!target?.is_alive) return;

    if (s.isDay) {
      s.handleVote(targetUserId);
    } else {
      // Tun: faqat nishon tanlash
      if (myRole === 'Mafia' || myRole === 'Don') {
        // Mafia sherigini nishonga olmaydi
        if (target.role === 'Mafia' || target.role === 'Don') return;
      }
      s.setTarget(targetUserId);
    }
  };

  // Rolga mos tun harakati tugmasi
  const renderNightActionBtn = () => {
    if (!canNightAction || !s.selectedTarget) return null;
    const target = s.players.find(p => p.user_id === s.selectedTarget);

    if (myRole === 'Mafia' || myRole === 'Don') {
      return (
        <button className="MG_night_btn kill"
          onClick={() => s.handleNightAction('kill', s.selectedTarget)}>
          🔫 O'LDIRISH: {target?.username}
        </button>
      );
    }
    if (myRole === 'Komissar') {
      return (
        <div className="MG_night_actions">
          <button className="MG_night_btn check"
            onClick={() => s.handleNightAction('check', s.selectedTarget)}>
            👁️ TEKSHIRISH: {target?.username}
          </button>
          <button className="MG_night_btn kill"
            onClick={() => s.handleNightAction('shoot', s.selectedTarget)}>
            🔫 OTISH: {target?.username}
          </button>
        </div>
      );
    }
    if (myRole === 'Shifokor') {
      return (
        <button className="MG_night_btn heal"
          onClick={() => s.handleNightAction('heal', s.selectedTarget)}>
          ➕ DAVOLASH: {target?.username}
        </button>
      );
    }
    return null;
  };

  // ===== GAME ENDED SCREEN =====
  if (s.gameState === 'ended') {
    const hasBots = s.players.some(p => p.user_id?.startsWith('bot_'));
    const iWon = (s.gameResult === 'mafia' && (myRole === 'Mafia' || myRole === 'Don')) ||
                 (s.gameResult === 'civil' && myRole !== 'Mafia' && myRole !== 'Don');
    return (
      <div className={`MG_end_screen ${iWon ? 'win' : 'lose'}`}>
        <div className="MG_end_card">
          <div className="MG_end_icon">{iWon ? '🏆' : '💀'}</div>
          <h1 className="MG_end_title">{s.announcement}</h1>
          {hasBots && (
            <div style={{
              background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.5)',
              borderRadius: '10px', padding: '12px 16px', margin: '12px 0', color: '#ffaa00',
              fontSize: '0.88rem', textAlign: 'center'
            }}>
              🤖 Bu o'yinda botlar ishtirok etdi — sovg'alar berilmaydi!
            </div>
          )}
          {iWon && !hasBots && (
            <div className="MG_rewards">
              <h3>🎁 Sovg'angiz:</h3>
              <div className="MG_reward_items">
                <div className="MG_reward_item">🪙 +500 Tanga</div>
                <div className="MG_reward_item">⭐ +10 Yulduz</div>
                {myRole === 'Don' || myRole === 'Komissar'
                  ? <div className="MG_reward_item">🎭 +1 Bonus Rol</div>
                  : null
                }
              </div>
            </div>
          )}
          <div className="MG_end_roles">
            <h4>Rollar ochildi:</h4>
            <div className="MG_roles_reveal">
              {s.players.map(p => (
                <div key={p.user_id} className="MG_role_reveal_item">
                  <img src={ROLE_IMAGES[p.role] || CARD_BG} alt={p.role} />
                  <span>{p.username}</span>
                  <span className="MG_role_tag">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="MG_btn gold" onClick={onBack}>🏠 MENUGA QAYTISH</button>
        </div>
      </div>
    );
  }

  // ===== WAITING SCREEN =====
  if (s.gameState === 'waiting') {
    return (
      <div className="MG_waiting">
        <div className="MG_spinner" />
        <h2>O'yin boshlanishini kutmoqdasiz...</h2>
        <p>Xona: {roomId}</p>
      </div>
    );
  }

  // ===== SURRENDER CONFIRM =====
  const SurrenderModal = () => (
    <div className="MG_modal_overlay">
      <div className="MG_modal">
        <h3>Taslim bo'lasizmi?</h3>
        <p>Siz o'yindan chiqib ketasiz va o'lik hisoblanasiz.</p>
        <div className="MG_modal_btns">
          <button className="MG_btn red" onClick={async () => {
            await s.surrender();
            setShowSurrenderConfirm(false);
            onBack();
          }}>Ha, taslim bo'laman</button>
          <button className="MG_btn gold" onClick={() => setShowSurrenderConfirm(false)}>Yo'q, davom etaman</button>
        </div>
      </div>
    </div>
  );

  // ===== MAIN GAME UI =====
  const hasBots = s.players.some(p => p.user_id?.startsWith('bot_'));

  return (
    <div className={`MG_container ${s.isDay ? 'MG_day' : 'MG_night'}`}>
      {showSurrenderConfirm && <SurrenderModal />}

      {/* BOT OGOHLANTIRISH */}
      {hasBots && (
        <div style={{
          background: 'rgba(255,170,0,0.12)', borderBottom: '1px solid rgba(255,170,0,0.3)',
          padding: '6px 16px', textAlign: 'center', color: '#ffaa00', fontSize: '0.8rem'
        }}>
          🤖 Botlar ishtirok etmoqda — bu o'yin uchun sovg'alar berilmaydi
        </div>
      )}

      {/* ANNOUNCEMENT */}
      {s.announcement && (
        <div className="MG_announcement">
          <p>{s.announcement}</p>
        </div>
      )}

      {/* TOP BAR */}
      <div className="MG_topbar">
        <div className="MG_phase_info">
          <span className={`MG_phase_badge ${s.isDay ? 'day' : 'night'}`}>
            {s.isDay ? '☀️ KUNDUZ' : '🌙 TUN'} — {s.dayCount}-kun
          </span>
        </div>

        <div className="MG_timer_wrap">
          <div className={`MG_timer ${s.timeLeft <= 10 ? 'urgent' : ''}`}>
            {s.timeLeft}s
          </div>
        </div>

        <div className="MG_my_role">
          <img src={ROLE_IMAGES[myRole] || CARD_BG} alt={myRole} className="MG_my_role_img" />
          <span>SIZ: <strong>{myRole}</strong></span>
        </div>

        <div className="MG_top_actions">
          {/* Chat toggle */}
          <button className={`MG_icon_btn ${s.showChat ? 'active' : ''}`}
            onClick={s.toggleChat} title="Chat">
            💬
          </button>
          {/* Taslim bo'lish */}
          {isAlive && (
            <button className="MG_icon_btn danger"
              onClick={() => setShowSurrenderConfirm(true)} title="Taslim bo'lish">
              🏳️
            </button>
          )}
        </div>
      </div>

      {/* GAME ARENA */}
      <div className="MG_arena">
        {/* DOIRA - O'YINCHILAR */}
        <div className="MG_circle_table">
          {s.players.map((player, idx) => {
            const angle = (360 / s.players.length) * idx;
            const isDead = player.is_alive === false;
            const isSelected = s.selectedTarget === player.user_id;
            const isMe = player.user_id === user.uid;

            // Rol ko'rsatish sharti
            const showRole = isMe || isDead || s.gameState === 'ended' ||
              (myRole === 'Komissar' && player.knowsAsMafia) ||
              ((myRole === 'Mafia' || myRole === 'Don') && (player.role === 'Mafia' || player.role === 'Don'));

            return (
              <div
                key={player.user_id}
                className={`MG_player_slot ${isDead ? 'dead' : ''} ${isSelected ? 'selected' : ''} ${isMe ? 'me' : ''}`}
                style={{ transform: `rotate(${angle}deg) translate(240px) rotate(-${angle}deg)` }}
                onClick={() => handlePlayerClick(player.user_id)}
              >
                <div className="MG_card_frame">
                  <img
                    src={showRole ? (ROLE_IMAGES[player.role] || CARD_BG) : CARD_BG}
                    alt="card"
                    className={`MG_card_img ${showRole ? 'revealed' : ''}`}
                  />
                  {player.votes > 0 && s.isDay && (
                    <div className="MG_vote_badge">{player.votes}</div>
                  )}
                  {isDead && <div className="MG_dead_overlay">💀</div>}
                </div>
                <div className="MG_player_label">
                  <img src={player.user_image || '/avatars/default.jpg'} alt="" className="MG_avatar_small" />
                  <span>{player.username}{isMe && ' (SIZ)'}</span>
                </div>
              </div>
            );
          })}

          {/* Markaziy timer doirasi */}
          <div className={`MG_center_circle ${s.isDay ? 'day' : 'night'}`}>
            <span>{s.isDay ? 'MUHOKAMA' : 'TUNGI HARAKAT'}</span>
            <h2>{s.timeLeft}</h2>
          </div>
        </div>

        {/* TUN HARAKATLARI PANELI */}
        {canNightAction && (
          <div className="MG_night_panel">
            <p className="MG_night_hint">
              {myRole === 'Aholi'
                ? '😴 Aholi tunda uxlaydi. Tun tugashini kuting...'
                : s.selectedTarget
                  ? `Nishon tanlandi: ${s.players.find(p => p.user_id === s.selectedTarget)?.username}`
                  : 'Nishon tanlang (o\'yinchiga bosing)'}
            </p>
            {renderNightActionBtn()}
            {s.nightActionDone && (
              <p className="MG_action_done">✅ Harakatingiz bajarildi. Tun tugashini kuting...</p>
            )}
          </div>
        )}

        {/* O'LIK XABAR */}
        {!isAlive && s.gameState === 'playing' && (
          <div className="MG_dead_banner">
            💀 Siz o'ldingiz. O'yinni kuzatishingiz mumkin.
          </div>
        )}
      </div>

      {/* CHAT PANEL */}
      {s.showChat && (
        <div className="MG_chat_panel">
          <div className="MG_chat_header">
            <span>💬 Chat</span>
            <button onClick={s.toggleChat}>✕</button>
          </div>
          <div className="MG_chat_messages">
            {s.logs.map(log => (
              <div key={log.id} className={`MG_chat_msg ${log.user === 'Sistema' ? 'system' : ''}`}>
                <span className="MG_chat_user">{log.user}:</span>
                <span className="MG_chat_text">{log.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {isAlive && (
            <div className="MG_chat_input_row">
              <input
                className="MG_chat_input"
                placeholder="Xabar yozing..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && chatInput.trim()) {
                    s.sendChatMessage(chatInput.trim());
                    setChatInput('');
                  }
                }}
              />
              <button className="MG_chat_send" onClick={() => {
                if (chatInput.trim()) { s.sendChatMessage(chatInput.trim()); setChatInput(''); }
              }}>➤</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MultiplayerGame;