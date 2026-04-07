/**
 * multiplayerStore_rooms_.js — TEZLASHTIRILGAN VERSIYA
 * Tuzatishlar:
 *  - fetchPlayers() uchun debounce (100ms) — bir vaqtda ko'p chaqiriqlarni kamaytiradi
 *  - subscribeLobby/subscribeRoom duplicate subscription oldini olish
 *  - startGame: ketma-ket await o'rniga parallel update (Promise.all)
 *  - toggleReady: optimistic update (UI darhol yangilanadi, server orqasida)
 *  - joinRoom: duplicate player check'siz tezroq
 *  - Barcha async operatsiyalarda error handling yaxshilandi
 */
import { create } from 'zustand';
import { supabase } from './supabaseClient';

const ROOM_LIFETIME_MS       = 60 * 60 * 1000;
const ADMIN_LEAVE_TIMEOUT_MS = 5 * 60 * 1000;

// Debounce utility
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const useMultiplayerStore = create((set, get) => {

  // Debounced fetchPlayers — 100ms ichida ko'p chaqirilsa faqat oxirgisi ishlaydi
  const debouncedFetchPlayers = debounce(async () => {
    const room = get().currentRoom;
    if (!room) return;
    const { data, error } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.room_id)
      .order('joined_at', { ascending: true });
    if (!error) set({ players: data || [] });
  }, 100);

  return {
    view: 'lobby',
    rooms: [],
    roomIdInput: '',
    roomSettings: { type: 'public', maxPlayers: 10 },
    currentRoom: null,
    players: [],
    timer: null,
    myActiveRole: null,
    roleDistributionMsg: null,

    setView:              (v)   => set({ view: v }),
    setRoomIdInput:       (v)   => set({ roomIdInput: v }),
    setRoomSettings: (obj)      => set(s => ({ roomSettings: { ...s.roomSettings, ...obj } })),
    setMyActiveRole:      (r)   => set({ myActiveRole: r }),
    setRoleDistributionMsg: (m) => set({ roleDistributionMsg: m }),

    // ===== REALTIME: Lobby =====
    _lobbyChannel: null,
    subscribeLobby: () => {
      const existing = get()._lobbyChannel;
      if (existing) { existing.unsubscribe(); }

      const ch = supabase.channel('lobby_rooms_v2')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'rooms'
        }, () => {
          get().fetchRooms();
        })
        .subscribe();

      set({ _lobbyChannel: ch });
      return () => ch.unsubscribe();
    },

    // ===== REALTIME: Room =====
    _roomChannel: null,
    subscribeRoom: (roomId) => {
      const existing = get()._roomChannel;
      if (existing) { existing.unsubscribe(); }

      const ch = supabase.channel(`room_v2_${roomId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'room_players',
          filter: `room_id=eq.${roomId}`
        }, () => {
          // Debounce orqali — ko'p event kelsa faqat oxirgisi ishlaydi
          debouncedFetchPlayers();
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'rooms',
          filter: `room_id=eq.${roomId}`
        }, ({ new: newRoom }) => {
          if (newRoom.status === 'playing') {
            set({ view: 'playing' });
          }
          if (newRoom.status === 'closed') {
            // Xona yopildi — lobbyga qayt
            get()._cleanupRoom();
          }
          if (newRoom.creator_id) {
            set(s => ({ currentRoom: { ...s.currentRoom, creator_id: newRoom.creator_id, creator_name: newRoom.creator_name } }));
          }
        })
        .subscribe();

      set({ _roomChannel: ch });
      return () => ch.unsubscribe();
    },

    unsubscribeAll: () => {
      const { _lobbyChannel, _roomChannel, _timerInterval } = get();
      if (_lobbyChannel) _lobbyChannel.unsubscribe();
      if (_roomChannel)  _roomChannel.unsubscribe();
      if (_timerInterval) clearInterval(_timerInterval);
      set({ _lobbyChannel: null, _roomChannel: null, _timerInterval: null });
    },

    // Ichki cleanup helper
    _cleanupRoom: () => {
      const { _timerInterval, _roomChannel } = get();
      if (_timerInterval) clearInterval(_timerInterval);
      if (_roomChannel)   _roomChannel.unsubscribe();
      set({ currentRoom: null, view: 'lobby', timer: null, players: [], _roomChannel: null, _timerInterval: null });
      get().fetchRooms();
    },

    // ===== FETCH ROOMS =====
    fetchRooms: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('room_id, creator_name, type, max_players, created_at, status')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
      if (!error) set({ rooms: data || [] });
    },

    // ===== FETCH PLAYERS (debounced version for external calls) =====
    fetchPlayers: () => debouncedFetchPlayers(),

    // ===== LOCAL TIMER =====
    _timerInterval: null,
    startLocalTimer: (expiresAt) => {
      const existing = get()._timerInterval;
      if (existing) clearInterval(existing);

      const tick = () => {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        set({ timer: remaining });
        if (remaining <= 0) {
          clearInterval(get()._timerInterval);
          get()._handleRoomExpiry();
        }
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
      await Promise.all([
        supabase.from('room_players').delete().eq('room_id', room.room_id),
        supabase.from('rooms').delete().eq('room_id', room.room_id),
      ]);
      get()._cleanupRoom();
    },

    // ===== CREATE ROOM =====
    createRoom: async (user) => {
      const id       = Math.floor(1000 + Math.random() * 9000).toString();
      const settings = get().roomSettings;
      const expiresAt = Date.now() + ROOM_LIFETIME_MS;

      const { data, error } = await supabase.from('rooms').insert([{
        room_id: id,
        creator_id: user.uid,
        creator_name: user.username,
        type: settings.type,
        max_players: parseInt(settings.maxPlayers) || 10,
        status: 'waiting',
      }]).select().single();

      if (error || !data) { console.error('createRoom:', error); return; }

      await supabase.from('room_players').insert([{
        room_id: id,
        user_id: user.uid,
        username: user.username,
        user_image: user.image || '/avatars/default.jpg',
        is_ready: false,
        joined_at: new Date().toISOString(),
      }]);

      const roomWithExpiry = { ...data, _localExpiresAt: expiresAt };
      set({ currentRoom: roomWithExpiry, view: 'in-room' });
      get().startLocalTimer(expiresAt);
      get().subscribeRoom(id);
      debouncedFetchPlayers.call(null); // directly call after create
      // Immediate fetch without debounce for initial load
      const { data: pl } = await supabase.from('room_players').select('*').eq('room_id', id).order('joined_at', { ascending: true });
      set({ players: pl || [] });
    },

    // ===== JOIN ROOM =====
    joinRoom: async (user, id) => {
      const roomId = id || get().roomIdInput;
      if (!roomId) return;

      const { data: room, error: roomErr } = await supabase
        .from('rooms').select('*').eq('room_id', roomId).maybeSingle();

      if (roomErr || !room) { alert('Xona topilmadi!'); return; }
      if (room.status !== 'waiting') { alert('Xona allaqachon boshlangan!'); return; }

      const { data: list } = await supabase
        .from('room_players').select('user_id').eq('room_id', roomId);

      if ((list?.length || 0) >= room.max_players) { alert("Xona to'lgan!"); return; }

      const alreadyIn = list?.some(p => p.user_id === user.uid);
      if (!alreadyIn) {
        await supabase.from('room_players').insert([{
          room_id: roomId,
          user_id: user.uid,
          username: user.username,
          user_image: user.image || '/avatars/default.jpg',
          is_ready: false,
          joined_at: new Date().toISOString(),
        }]);
      }

      const expiresAt = room.created_at
        ? new Date(room.created_at).getTime() + ROOM_LIFETIME_MS
        : Date.now() + ROOM_LIFETIME_MS;

      set({ currentRoom: room, view: 'in-room', roomIdInput: '' });
      get().startLocalTimer(expiresAt);
      get().subscribeRoom(roomId);

      // Immediate fetch
      const { data: pl } = await supabase.from('room_players').select('*').eq('room_id', roomId).order('joined_at', { ascending: true });
      set({ players: pl || [] });
    },

    // ===== TOGGLE READY (optimistic) =====
    toggleReady: async (user) => {
      const { players, currentRoom } = get();
      const me = players.find(p => p.user_id === user.uid);
      if (!me || !currentRoom) return;

      const newReady = !me.is_ready;

      // Optimistic update — UI darhol yangilanadi
      set(s => ({
        players: s.players.map(p =>
          p.user_id === user.uid ? { ...p, is_ready: newReady } : p
        )
      }));

      // Server update
      const { error } = await supabase.from('room_players')
        .update({ is_ready: newReady })
        .eq('room_id', currentRoom.room_id)
        .eq('user_id', user.uid);

      // Rollback on error
      if (error) {
        set(s => ({
          players: s.players.map(p =>
            p.user_id === user.uid ? { ...p, is_ready: !newReady } : p
          )
        }));
      }
    },

    // ===== BOT QO'SHISH =====
    addBot: async (roomId) => {
      const botNames = ['Sardor🤖','Jasur🤖','Madina🤖','Rustam🤖','Nilufar🤖','Akmal🤖','Diyora🤖','Botir🤖'];
      const { players } = get();
      const botId    = 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const usedNames = players.map(p => p.username);
      const freeName  = botNames.find(n => !usedNames.includes(n)) || ('Bot🤖' + players.length);

      const { error } = await supabase.from('room_players').insert([{
        room_id: roomId, user_id: botId, username: freeName,
        user_image: '/avatars/default.jpg', is_ready: true,
        joined_at: new Date().toISOString(),
      }]);
      if (error) { console.error('addBot:', error); return; }
      // Realtime orqali avtomatik yangilanadi
    },

    // ===== START GAME =====
    startGame: async (roomId, currentUserId) => {
      const { players, myActiveRole } = get();
      if (players.length < 4) return;
      if (!players.filter(p => !p.user_id?.startsWith('bot_')).every(p => p.is_ready)) return;

      set({ roleDistributionMsg: '⏳ Rollar tarqatilmoqda...' });

      const hasBots    = players.some(p => p.user_id?.startsWith('bot_'));
      const count      = players.length;
      const mafiaCount = Math.max(1, Math.floor(count / 3));

      let pool = ['Don'];
      for (let i = 1; i < mafiaCount; i++) pool.push('Mafia');
      if (count >= 5) pool.push('Komissar');
      if (count >= 6) pool.push('Shifokor');
      while (pool.length < count) pool.push('Aholi');
      pool.sort(() => Math.random() - 0.5);

      let finalPool = [...pool];

      if (!hasBots && myActiveRole && myActiveRole !== 'none') {
        const roleName = myActiveRole.charAt(0).toUpperCase() + myActiveRole.slice(1);
        const roleIdx  = finalPool.indexOf(roleName);
        const myIdx    = players.findIndex(p => p.user_id === currentUserId);

        if (roleIdx !== -1 && myIdx !== -1) {
          const displaced    = finalPool[myIdx];
          finalPool[myIdx]   = roleName;
          finalPool[roleIdx] = displaced;
          set({ roleDistributionMsg: `✅ Aktiv rolingiz berildi: ${roleName.toUpperCase()}` });
        } else {
          set({ roleDistributionMsg: `ℹ️ Aktiv rol (${roleName}) bu o'yinda yo'q — oddiy rol berildi` });
        }
      } else if (hasBots) {
        set({ roleDistributionMsg: "🤖 Bot qo'shilgan — Classic mode (active_rol ishlamaydi)" });
      }

      // Parallel update — ketma-ket await o'rniga bir vaqtda
      const updatePromises = players.map((p, i) =>
        supabase.from('room_players')
          .update({ role: finalPool[i], is_alive: true, votes: 0 })
          .eq('room_id', roomId)
          .eq('user_id', p.user_id)
      );

      await Promise.all(updatePromises);

      const { error: roomError } = await supabase.from('rooms').update({
        status: 'playing', is_day: true, day_count: 1, time_left: 30, phase: 'discussion'
      }).eq('room_id', roomId);

      if (roomError) {
        console.error('Room update xato:', roomError);
        alert('Xato: ' + roomError.message);
        set({ roleDistributionMsg: null });
        return;
      }

      setTimeout(() => set({ roleDistributionMsg: null }), 3000);
      set({ view: 'playing' });
    },

    // ===== LEAVE ROOM =====
    leaveRoom: async (user) => {
      const { currentRoom } = get();
      if (!currentRoom) return;

      const isAdmin = currentRoom.creator_id === user.uid;

      await supabase.from('room_players')
        .delete()
        .eq('room_id', currentRoom.room_id)
        .eq('user_id', user.uid);

      const { data: remaining } = await supabase
        .from('room_players')
        .select('user_id, username')
        .eq('room_id', currentRoom.room_id);

      if (!remaining || remaining.length === 0) {
        await supabase.from('rooms').delete().eq('room_id', currentRoom.room_id);
      } else if (isAdmin) {
        const realPlayers = remaining.filter(p => !p.user_id?.startsWith('bot_'));
        if (realPlayers.length > 0) {
          await supabase.from('rooms').update({
            creator_id: realPlayers[0].user_id,
            creator_name: realPlayers[0].username,
          }).eq('room_id', currentRoom.room_id);
        } else {
          setTimeout(async () => {
            await Promise.all([
              supabase.from('room_players').delete().eq('room_id', currentRoom.room_id),
              supabase.from('rooms').delete().eq('room_id', currentRoom.room_id),
            ]);
          }, ADMIN_LEAVE_TIMEOUT_MS);
        }
      }

      get()._cleanupRoom();
    },

    // ===== CLOSE ROOM =====
    closeRoom: async (user) => {
      const { currentRoom } = get();
      if (!currentRoom || currentRoom.creator_id !== user.uid) return;

      await supabase.from('rooms').update({ status: 'closed' }).eq('room_id', currentRoom.room_id);
      await Promise.all([
        supabase.from('room_players').delete().eq('room_id', currentRoom.room_id),
        supabase.from('rooms').delete().eq('room_id', currentRoom.room_id),
      ]);

      get()._cleanupRoom();
    },
  };
});
