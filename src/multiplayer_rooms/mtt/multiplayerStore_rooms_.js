/**
 * multiplayerStore_rooms_.js  — TO'LDIRILGAN VERSIYA
 */
import { create } from 'zustand';
import { supabase } from './supabaseClient';

const ROOM_LIFETIME_MS   = 60 * 60 * 1000;
const EMPTY_ROOM_TIMEOUT_MS = 5 * 60 * 1000;

export const useMultiplayerStore = create((set, get) => ({
  view: 'lobby',
  rooms: [],
  roomIdInput: '',
  roomSettings: { type: 'public', maxPlayers: 10 },
  currentRoom: null,
  players: [],
  timer: null,
  myActiveRole: null,

  setView: (v)           => set({ view: v }),
  setRoomIdInput: (v)    => set({ roomIdInput: v }),
  setRoomSettings: (obj) => set(s => ({ roomSettings: { ...s.roomSettings, ...obj } })),
  setMyActiveRole: (r)   => set({ myActiveRole: r }),

  // ===== REALTIME: Lobby =====
  _lobbyChannel: null,
  subscribeLobby: () => {
    const existing = get()._lobbyChannel;
    if (existing) existing.unsubscribe();
    const ch = supabase.channel('lobby_rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        get().fetchRooms();
      }).subscribe();
    set({ _lobbyChannel: ch });
    return () => ch.unsubscribe();
  },

  // ===== REALTIME: Room =====
  _roomChannel: null,
  subscribeRoom: (roomId) => {
    const existing = get()._roomChannel;
    if (existing) existing.unsubscribe();
    const ch = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => {
        get().fetchPlayers();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_id=eq.${roomId}` }, ({ new: newRoom }) => {
        if (newRoom.status === 'playing') set({ view: 'playing' });
      })
      .subscribe();
    set({ _roomChannel: ch });
    return () => ch.unsubscribe();
  },

  unsubscribeAll: () => {
    const { _lobbyChannel, _roomChannel } = get();
    if (_lobbyChannel) _lobbyChannel.unsubscribe();
    if (_roomChannel)  _roomChannel.unsubscribe();
    set({ _lobbyChannel: null, _roomChannel: null });
  },

  // ===== FETCH ROOMS =====
  fetchRooms: async () => {
    const { data } = await supabase.from('rooms').select('*').eq('status', 'waiting').order('created_at', { ascending: false });
    set({ rooms: data || [] });
  },

  // ===== FETCH PLAYERS =====
  fetchPlayers: async () => {
    const room = get().currentRoom;
    if (!room) return;
    const { data } = await supabase.from('room_players').select('*').eq('room_id', room.room_id).order('joined_at', { ascending: true });
    set({ players: data || [] });
  },

  // ===== LOCAL TIMER =====
  _timerInterval: null,
  startLocalTimer: (expiresAt) => {
    const existing = get()._timerInterval;
    if (existing) clearInterval(existing);
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      set({ timer: remaining });
      if (remaining <= 0) { clearInterval(get()._timerInterval); get()._handleRoomExpiry(); }
    };
    tick();
    const id = setInterval(tick, 1000);
    set({ _timerInterval: id });
  },

  stopLocalTimer: () => {
    const id = get()._timerInterval;
    if (id) clearInterval(id);
    set({ _timerInterval: null, timer: null });
  },

  _handleRoomExpiry: async () => {
    const room = get().currentRoom;
    if (!room) return;
    await supabase.from('room_players').delete().eq('room_id', room.room_id);
    await supabase.from('rooms').delete().eq('room_id', room.room_id);
    set({ currentRoom: null, view: 'lobby', timer: null });
    get().fetchRooms();
  },

  // ===== CREATE ROOM =====
  createRoom: async (user) => {
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    const settings = get().roomSettings;
    const expiresAt = Date.now() + ROOM_LIFETIME_MS;
    const { data, error } = await supabase.from('rooms').insert([{
      room_id: id, creator_id: user.uid, creator_name: user.username,
      type: settings.type, max_players: parseInt(settings.maxPlayers) || 10,
      status: 'waiting', expires_at: new Date(expiresAt).toISOString()
    }]).select().single();
    if (error || !data) { console.error('createRoom:', error); return; }
    await supabase.from('room_players').insert([{
      room_id: id, user_id: user.uid, username: user.username,
      user_image: user.image || '/avatars/default.jpg', is_ready: false,
      joined_at: new Date().toISOString()
    }]);
    set({ currentRoom: data, view: 'in-room' });
    get().startLocalTimer(expiresAt);
    get().subscribeRoom(id);
    get().fetchPlayers();
  },

  // ===== JOIN ROOM =====
  joinRoom: async (user, id) => {
    const roomId = id || get().roomIdInput;
    if (!roomId) return;
    const { data: room } = await supabase.from('rooms').select('*').eq('room_id', roomId).maybeSingle();
    if (!room) { alert('Xona topilmadi!'); return; }
    if (room.status !== 'waiting') { alert("Xona allaqachon boshlangan!"); return; }
    const { data: list } = await supabase.from('room_players').select('*').eq('room_id', roomId);
    if ((list?.length || 0) >= room.max_players) { alert("Xona to'lgan!"); return; }
    const existing = list?.find(p => p.user_id === user.uid);
    if (!existing) {
      await supabase.from('room_players').insert([{
        room_id: roomId, user_id: user.uid, username: user.username,
        user_image: user.image || '/avatars/default.jpg', is_ready: false,
        joined_at: new Date().toISOString()
      }]);
    }
    const expiresAt = room.expires_at ? new Date(room.expires_at).getTime() : Date.now() + ROOM_LIFETIME_MS;
    set({ currentRoom: room, view: 'in-room' });
    get().startLocalTimer(expiresAt);
    get().subscribeRoom(roomId);
    get().fetchPlayers();
  },

  // ===== TOGGLE READY =====
  toggleReady: async (user) => {
    const { players, currentRoom } = get();
    const me = players.find(p => p.user_id === user.uid);
    if (!me || !currentRoom) return;
    await supabase.from('room_players').update({ is_ready: !me.is_ready }).eq('room_id', currentRoom.room_id).eq('user_id', user.uid);
    set(s => ({ players: s.players.map(p => p.user_id === user.uid ? { ...p, is_ready: !p.is_ready } : p) }));
  },

  // ===== START GAME =====
  startGame: async (roomId) => {
    const { players, myActiveRole } = get();
    if (players.length < 4) return;
    if (!players.every(p => p.is_ready)) return;

    // Rollarni taqsimlash
    const ROLES_POOL = ['Don', 'Mafia', 'Komissar', 'Shifokor', 'Aholi', 'Aholi', 'Aholi', 'Aholi', 'Aholi', 'Aholi', 'Aholi', 'Aholi'];
    const count = players.length;
    let pool = [];
    const mafiaCount = Math.max(1, Math.floor(count / 3));
    pool.push('Don');
    for (let i = 1; i < mafiaCount; i++) pool.push('Mafia');
    if (count >= 5) pool.push('Komissar');
    if (count >= 6) pool.push('Shifokor');
    while (pool.length < count) pool.push('Aholi');
    pool.sort(() => Math.random() - 0.5);

    // Aktiv rolni birinchi o'yinchiga berish (agar bor bo'lsa)
    const adminPlayer = players[0];
    let finalPool = [...pool];
    if (myActiveRole && myActiveRole !== 'none') {
      const idx = finalPool.indexOf(myActiveRole.charAt(0).toUpperCase() + myActiveRole.slice(1));
      if (idx !== -1) {
        finalPool.splice(idx, 1);
        finalPool.unshift(myActiveRole.charAt(0).toUpperCase() + myActiveRole.slice(1));
      }
    }

    for (let i = 0; i < players.length; i++) {
      await supabase.from('room_players').update({ role: finalPool[i], is_alive: true, votes: 0 }).eq('room_id', roomId).eq('user_id', players[i].user_id);
    }

    await supabase.from('rooms').update({
      status: 'playing', is_day: true, day_count: 1, time_left: 30, phase: 'discussion'
    }).eq('room_id', roomId);

    set({ view: 'playing' });
  },

  // ===== LEAVE ROOM =====
  leaveRoom: async (user) => {
    const { currentRoom, _timerInterval, _roomChannel } = get();
    if (!currentRoom) return;
    await supabase.from('room_players').delete().eq('room_id', currentRoom.room_id).eq('user_id', user.uid);
    const { data: remaining } = await supabase.from('room_players').select('user_id').eq('room_id', currentRoom.room_id);
    if (!remaining || remaining.length === 0) {
      setTimeout(async () => {
        await supabase.from('rooms').delete().eq('room_id', currentRoom.room_id);
      }, EMPTY_ROOM_TIMEOUT_MS);
    }
    if (_timerInterval) clearInterval(_timerInterval);
    if (_roomChannel) _roomChannel.unsubscribe();
    set({ currentRoom: null, view: 'lobby', timer: null, players: [], _roomChannel: null });
    get().fetchRooms();
  },
}));
