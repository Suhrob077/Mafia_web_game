import React, { useEffect } from 'react';
import { useMultiplayerStore } from './multiplayerStore_rooms_';
import MultiplayerGame from '../MultiplayerGame';
import './multiplayer_rooms.css';

function Multiplayer_rooms({ user, onBack }) {
  const {
    view, rooms, roomIdInput, roomSettings, players, currentRoom, timer,
    setRoomIdInput, setRoomSettings, fetchRooms, fetchPlayers,
    createRoom, joinRoom, toggleReady, leaveRoom, startGame,
    subscribeLobby, subscribeRoom, unsubscribeAll
  } = useMultiplayerStore();

  const isAdmin  = currentRoom?.creator_id === user?.uid;
  const canStart = players.length >= 4 && players.every(p => p.is_ready);
  const myPlayer = players.find(p => p.user_id === user?.uid);

  const formatTime = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    return `${Math.floor(sec / 60).toString().padStart(2,'0')}:${(sec % 60).toString().padStart(2,'0')}`;
  };
  const timerColor = timer < 60 ? '#ff4444' : timer < 300 ? '#ffaa00' : '#4caf50';

  useEffect(() => {
    const unsub = subscribeLobby();
    fetchRooms();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentRoom?.room_id) {
      const unsub = subscribeRoom(currentRoom.room_id);
      fetchPlayers();
      return () => unsub();
    }
  }, [currentRoom?.room_id]);

  if (view === 'playing') {
    return (
      <MultiplayerGame
        user={user}
        roomId={currentRoom?.room_id}
        onBack={() => { unsubscribeAll(); leaveRoom(user); onBack?.(); }}
      />
    );
  }

  return (
    <div className="MS_wrap">
      {view === 'lobby' && (
        <div className="MS_lobby">
          <div className="MS_header">
            <button className="MS_back_btn" onClick={onBack}>← Orqaga</button>
            <h1 className="MS_title">🌐 ONLINE LOBBY</h1>
          </div>
          <div className="MS_topGrid">
            <div className="MS_card">
              <h3>🔑 Xonaga Kirish</h3>
              <input className="MS_input" placeholder="Xona ID" value={roomIdInput}
                onChange={e => setRoomIdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && joinRoom(user)} />
              <button className="MS_btn blue" onClick={() => joinRoom(user)}>KIRISH</button>
            </div>
            <div className="MS_card">
              <h3>🏠 Xona Ochish</h3>
              <select className="MS_input" value={roomSettings.type}
                onChange={e => setRoomSettings({ type: e.target.value })}>
                <option value="public">🌍 Ochiq</option>
                <option value="private">🔒 Yopiq</option>
              </select>
              <input type="number" className="MS_input" placeholder="Max o'yinchilar (4-12)"
                min={4} max={12} value={roomSettings.maxPlayers}
                onChange={e => setRoomSettings({ maxPlayers: e.target.value })} />
              <button className="MS_btn gold" onClick={() => createRoom(user)}>XONA OCHISH</button>
            </div>
          </div>
          <div className="MS_rooms">
            <div className="MS_rooms_header">
              <h3>📋 Ochiq Xonalar</h3>
              <button className="MS_btn small" onClick={fetchRooms}>🔄</button>
            </div>
            {rooms.length === 0 ? (
              <div className="MS_empty">Hozircha ochiq xonalar yo'q.</div>
            ) : (
              <table>
                <thead><tr><th>ID</th><th>Admin</th><th>Vaqt</th><th></th></tr></thead>
                <tbody>
                  {rooms.map(r => (
                    <tr key={r.room_id}>
                      <td><code>{r.room_id}</code></td>
                      <td>{r.creator_name}</td>
                      <td style={{ color: '#ffaa00' }}>
                        {r.expires_at ? formatTime(Math.max(0, Math.floor((new Date(r.expires_at) - Date.now()) / 1000))) : '--:--'}
                      </td>
                      <td><button className="MS_btn small" onClick={() => joinRoom(user, r.room_id)}>KIRISH</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {view === 'in-room' && (
        <div className="MS_room">
          <div className="MS_room_header">
            <div>
              <h2 className="MS_title">XONA: <code>{currentRoom?.room_id}</code></h2>
              <p style={{ color: timerColor, margin: 0, fontWeight: 'bold' }}>⏳ {formatTime(timer)}</p>
            </div>
            {isAdmin && <span className="MS_admin_badge">👑 ADMIN</span>}
          </div>

          {user?.active_role && user.active_role !== 'none' && (
            <div className="MS_active_role_banner">
              🎭 Aktiv rolingiz: <strong>{user.active_role.toUpperCase()}</strong>
              {isAdmin && <span> — o'yin boshlananda sizga beriladi</span>}
            </div>
          )}

          <div className="MS_players">
            {players.map(p => (
              <div key={p.user_id} className={`MS_player ${p.is_ready ? 'ready' : ''}`}>
                <div className="MS_player_img_wrap">
                  <img src={p.user_image || '/avatars/default.jpg'} alt={p.username} />
                  {p.is_ready && <span className="MS_ready_check">✓</span>}
                </div>
                <span className="MS_player_name">
                  {p.username}{p.user_id === user.uid && ' (SIZ)'}{p.user_id === currentRoom?.creator_id && ' 👑'}
                </span>
                <span className={`MS_status_dot ${p.is_ready ? 'green' : 'red'}`}>
                  {p.is_ready ? 'TAYYOR' : 'KUTMOQDA'}
                </span>
              </div>
            ))}
          </div>

          <div className="MS_requirements">
            <div className={`MS_req_item ${players.length >= 4 ? 'met' : ''}`}>
              👥 {players.length}/4 kishi {players.length >= 4 ? '✓' : '(min 4)'}
            </div>
            <div className={`MS_req_item ${players.every(p => p.is_ready) ? 'met' : ''}`}>
              ✋ Tayyor: {players.filter(p => p.is_ready).length}/{players.length}
            </div>
          </div>

          <div className="MS_bottom">
            <button className={`MS_btn ${myPlayer?.is_ready ? 'gold' : 'green'}`}
              onClick={() => toggleReady(user)}>
              {myPlayer?.is_ready ? '❌ TAYYOR EMAS' : '✅ TAYYOR'}
            </button>
            {isAdmin && (
              <button className="MS_btn blue" disabled={!canStart}
                onClick={() => startGame(currentRoom.room_id)}
                style={{ opacity: canStart ? 1 : 0.5, cursor: canStart ? 'pointer' : 'not-allowed' }}>
                {canStart ? "🎮 O'YINNI BOSHLASH" : `KUTILMOQDA (${players.length}/4)`}
              </button>
            )}
            {!isAdmin && canStart && (
              <div className="MS_waiting_start">Admin o'yinni boshlashini kuting...</div>
            )}
            <button className="MS_btn red" onClick={() => leaveRoom(user)}>🚪 CHIQISH</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Multiplayer_rooms;
