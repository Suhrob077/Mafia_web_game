/**
 * multiplayerStore_rooms_.js — YANGILANGAN VERSIYA
 * Yangiliklar:
 *  - Admin chiqganda: 5 daqiqa kutish yoki xona topshirish
 *  - Bot qo'shilsa — classic mode (active_role ishlamaydi)
 *  - Active rol: 2 kishi bir xil rol active qilsa — tasodifiy bittasiga beriladi
 *  - O'yin boshlanayotganda rol tarqatish xabarlari
 */
import { create } from 'zustand';
import { supabase } from './supabaseClient';

const ROOM_LIFETIME_MS      = 60 * 60 * 1000;
const ADMIN_LEAVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 daqiqa

export const useMultiplayerStore = create((set, get) => ({
  view: 'lobby',
  rooms: [],
  roomIdInput: '',
  roomSettings: { type: 'public', maxPlayers: 10 },
  currentRoom: null,
  players: [],
  timer: null,
  myActiveRole: null,
  roleDistributionMsg: null,   // "Rollar tarqatilmoqda...", "Rolingiz: X" yoki "Aktiv rol boshqaga berildi"

  setView: (v)           => set({ view: v }),
  setRoomIdInput: (v)    => set({ roomIdInput: v }),
  setRoomSettings: (obj) => set(s => ({ roomSettings: { ...s.roomSettings, ...obj } })),
  setMyActiveRole: (r)   => set({ myActiveRole: r }),
  setRoleDistributionMsg: (m) => set({ roleDistributionMsg: m }),

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
        // Admin o'zgarishi
        if (newRoom.creator_id) {
          set(s => ({ currentRoom: { ...s.currentRoom, creator_id: newRoom.creator_id } }));
        }
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

  fetchRooms: async () => {
    const { data } = await supabase.from('rooms').select('*').eq('status', 'waiting').order('created_at', { ascending: false });
    set({ rooms: data || [] });
  },

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
      status: 'waiting',
    }]).select().single();
    if (error || !data) { console.error('createRoom:', error); return; }
    await supabase.from('room_players').insert([{
      room_id: id, user_id: user.uid, username: user.username,
      user_image: user.image || '/avatars/default.jpg', is_ready: false,
      joined_at: new Date().toISOString()
    }]);
    const roomWithExpiry = { ...data, _localExpiresAt: expiresAt };
    set({ currentRoom: roomWithExpiry, view: 'in-room' });
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
    const expiresAt = room.created_at
      ? new Date(room.created_at).getTime() + ROOM_LIFETIME_MS
      : Date.now() + ROOM_LIFETIME_MS;
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

  // ===== BOT QO'SHISH =====
  addBot: async (roomId) => {
    const botNames = ['Sardor🤖','Jasur🤖','Madina🤖','Rustam🤖','Nilufar🤖','Akmal🤖','Diyora🤖','Botir🤖'];
    const { players } = get();
    const botId = 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const usedNames = players.map(p => p.username);
    const freeName = botNames.find(n => !usedNames.includes(n)) || ('Bot🤖' + players.length);
    const { error } = await supabase.from('room_players').insert([{
      room_id: roomId, user_id: botId, username: freeName,
      user_image: '/avatars/default.jpg', is_ready: true,
      joined_at: new Date().toISOString()
    }]);
    if (error) { console.error('addBot xato:', error); return; }
    get().fetchPlayers();
  },

  // ===== START GAME =====
  startGame: async (roomId, currentUserId) => {
    const { players, myActiveRole } = get();
    if (players.length < 4) return;
    if (!players.every(p => p.is_ready)) return;

    // Xabarnoma: rollar tarqatilmoqda
    set({ roleDistributionMsg: '⏳ Rollar tarqatilmoqda...' });

    // Bot bor-yo'qligini aniqlash
    const hasBots = players.some(p => p.user_id?.startsWith('bot_'));

    const count = players.length;
    let pool = [];
    const mafiaCount = Math.max(1, Math.floor(count / 3));
    pool.push('Don');
    for (let i = 1; i < mafiaCount; i++) pool.push('Mafia');
    if (count >= 5) pool.push('Komissar');
    if (count >= 6) pool.push('Shifokor');
    while (pool.length < count) pool.push('Aholi');
    pool.sort(() => Math.random() - 0.5);

    let finalPool = [...pool];

    // Agar bot yo'q bo'lsa — active_role ishlatiladi
    if (!hasBots && myActiveRole && myActiveRole !== 'none') {
      const roleName = myActiveRole.charAt(0).toUpperCase() + myActiveRole.slice(1);

      // Bir xil active rolga ega o'yinchilarni top (bu qism server-side logika uchun,
      // client-side da faqat o'z rolimizni ko'rsatamiz)
      const idx = finalPool.indexOf(roleName);
      if (idx !== -1) {
        // O'zimizni topib, o'sha rolni beramiz
        const myIdx = players.findIndex(p => p.user_id === currentUserId);
        if (myIdx !== -1) {
          const existingAtMyPos = finalPool[myIdx];
          finalPool.splice(idx, 1);
          finalPool.splice(myIdx, 0, roleName);
          // Siqilgan rolni orqaga qo'yamiz
          finalPool.push(existingAtMyPos);
          finalPool = finalPool.slice(0, count);
        }
        set({ roleDistributionMsg: `✅ Aktiv rolingiz berildi: ${roleName.toUpperCase()}` });
      } else {
        set({ roleDistributionMsg: `ℹ️ Aktiv rol (${roleName}) bu o'yinda yo'q — oddiy rol berildi` });
      }
    } else if (hasBots) {
      // Bot bor — classic mode
      set({ roleDistributionMsg: '🤖 Bot qo\'shilgan — Classic mode (active_rol ishlamaydi)' });
    }

    // Rollarni yozish
    for (let i = 0; i < players.length; i++) {
      await supabase
        .from('room_players')
        .update({ role: finalPool[i], is_alive: true, votes: 0 })
        .eq('room_id', roomId)
        .eq('user_id', players[i].user_id);
    }

    // Room statusini o'zgartirish
    const { error: roomError } = await supabase.from('rooms').update({
      status: 'playing', is_day: true, day_count: 1, time_left: 30, phase: 'discussion'
    }).eq('room_id', roomId);

    if (roomError) {
      console.error('Room update xato:', roomError);
      alert('Xato: ' + roomError.message);
      return;
    }

    setTimeout(() => set({ roleDistributionMsg: null }), 3000);
    set({ view: 'playing' });
  },

  // ===== LEAVE ROOM (Admin uchun yangi logika) =====
  leaveRoom: async (user) => {
    const { currentRoom, players, _timerInterval, _roomChannel } = get();
    if (!currentRoom) return;

    const isAdmin = currentRoom.creator_id === user.uid;

    // O'yinchini o'chirish
    await supabase.from('room_players').delete().eq('room_id', currentRoom.room_id).eq('user_id', user.uid);
    const { data: remaining } = await supabase.from('room_players').select('user_id,username').eq('room_id', currentRoom.room_id);

    if (!remaining || remaining.length === 0) {
      // Xona bo'sh — o'chirish
      await supabase.from('rooms').delete().eq('room_id', currentRoom.room_id);
    } else if (isAdmin) {
      // Admin ketdi — real o'yinchilarni topish
      const realPlayers = remaining.filter(p => !p.user_id?.startsWith('bot_'));
      if (realPlayers.length > 0) {
        // Birinchi real o'yinchiga admin berish
        const newAdmin = realPlayers[0];
        await supabase.from('rooms').update({
          creator_id: newAdmin.user_id,
          creator_name: newAdmin.username
        }).eq('room_id', currentRoom.room_id);
      } else {
        // Faqat botlar qoldi — 5 daqiqada o'chirish
        setTimeout(async () => {
          await supabase.from('room_players').delete().eq('room_id', currentRoom.room_id);
          await supabase.from('rooms').delete().eq('room_id', currentRoom.room_id);
        }, ADMIN_LEAVE_TIMEOUT_MS);
      }
    }

    if (_timerInterval) clearInterval(_timerInterval);
    if (_roomChannel) _roomChannel.unsubscribe();
    set({ currentRoom: null, view: 'lobby', timer: null, players: [], _roomChannel: null });
    get().fetchRooms();
  },

  // ===== ADMIN: XONANI BUTUNLAY YOPISH =====
  closeRoom: async (user) => {
    const { currentRoom, _timerInterval, _roomChannel } = get();
    if (!currentRoom) return;
    if (currentRoom.creator_id !== user.uid) return;

    // Xonani o'chirish — barcha foydalanuvchilar avtomatik chiqariladi (realtime orqali)
    await supabase.from('rooms').update({ status: 'closed' }).eq('room_id', currentRoom.room_id);
    await supabase.from('room_players').delete().eq('room_id', currentRoom.room_id);
    await supabase.from('rooms').delete().eq('room_id', currentRoom.room_id);

    if (_timerInterval) clearInterval(_timerInterval);
    if (_roomChannel) _roomChannel.unsubscribe();
    set({ currentRoom: null, view: 'lobby', timer: null, players: [], _roomChannel: null });
    get().fetchRooms();
  },
}));
