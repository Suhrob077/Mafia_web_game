import { create } from 'zustand';
import { supabase } from '../multiplayer_rooms/mtt/supabaseClient';

// ============================================================
// ROLES CONFIG - Mafia qoidalari
// ============================================================
const ROLES = ['Don', 'Mafia', 'Komissar', 'Shifokor', 'Aholi', 'Aholi', 'Aholi', 'Aholi',
               'Aholi', 'Aholi', 'Aholi', 'Aholi'];

const NIGHT_ORDER = ['Don', 'Mafia', 'Komissar', 'Shifokor']; // Tun tartib

function assignRoles(players) {
  const count = players.length;
  let pool = [];

  // Mafia: har 3 kishiga 1 mafia (min 1 Don)
  const mafiaCount = Math.max(1, Math.floor(count / 3));
  pool.push('Don');
  for (let i = 1; i < mafiaCount; i++) pool.push('Mafia');

  // Maxsus rollar
  if (count >= 5) pool.push('Komissar');
  if (count >= 6) pool.push('Shifokor');

  // Qolganlar Aholi
  while (pool.length < count) pool.push('Aholi');

  // Aralashtirish
  pool.sort(() => Math.random() - 0.5);

  return players.map((p, i) => ({ ...p, role: pool[i] }));
}

// ============================================================
// STORE
// ============================================================
const useMultiplayerGameStore = create((set, get) => ({
  // ========== STATE ==========
  gameState: 'waiting',   // waiting | playing | ended
  isDay: true,
  timeLeft: 30,
  dayCount: 1,
  phase: 'discussion',    // discussion | voting | night | results

  players: [],            // { user_id, username, user_image, role, is_alive, votes, active_role }
  myUserId: null,
  myRole: null,
  myActiveRole: null,     // Shopdan olingan aktiv rol

  selectedTarget: null,
  nightActionDone: false,
  protectedId: null,
  logs: [],
  announcement: '',
  gameResult: null,
  isTimerPaused: false,

  showChat: false,        // Chat panel ko'rsatish/yashirish
  surrendered: false,

  roomId: null,
  channel: null,          // Supabase Realtime channel
  timerInterval: null,

  // ========== INIT ==========
  init: async (roomId, userId, activeRole) => {
    set({ roomId, myUserId: userId, myActiveRole: activeRole || null });

    // Supabase Realtime channelga ulanish
    const channel = supabase.channel(`game_${roomId}`, {
      config: { presence: { key: userId } }
    });

    channel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        get().applyState(payload);
      })
      .on('broadcast', { event: 'night_result' }, ({ payload }) => {
        get().applyNightResult(payload);
      })
      .on('broadcast', { event: 'vote_result' }, ({ payload }) => {
        get().applyVoteResult(payload);
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        set({
          gameState: 'ended',
          gameResult: payload.winner,
          announcement: payload.winner === 'mafia'
            ? "MAFIA G'ALABA QOZONDI! 💀"
            : "AHOLI G'ALABA QOZONDI! 🎉",
          isTimerPaused: true
        });
        get().stopTimer();
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        set(state => ({ logs: [...state.logs, payload] }));
      })
      .subscribe();

    set({ channel });

    // DB dan hozirgi holat olish
    await get().syncFromDB(roomId, userId);
  },

  // ========== SYNC FROM DB ==========
  syncFromDB: async (roomId, userId) => {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    const { data: playersData } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId);

    if (!roomData || !playersData) return;

    const me = playersData.find(p => p.user_id === userId);

    set({
      players: playersData.map(p => ({
        ...p,
        is_alive: p.is_alive !== false,
        votes: p.votes || 0,
        role: p.role || null,
      })),
      myRole: me?.role || null,
      gameState: roomData.status === 'playing' ? 'playing' : 'waiting',
      isDay: roomData.is_day !== false,
      dayCount: roomData.day_count || 1,
      timeLeft: roomData.time_left || 30,
      phase: roomData.phase || 'discussion',
    });

    if (roomData.status === 'playing') {
      get().startTimer();
    }
  },

  // ========== BROADCAST (faqat admin yuboradi) ==========
  broadcast: async (event, payload) => {
    const { channel } = get();
    if (!channel) return;
    await channel.send({ type: 'broadcast', event, payload });
  },

  // ========== GAME START (admin chaqiradi) ==========
  startGame: async (roomId) => {
    const { data: playersData } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId);

    if (!playersData || playersData.length < 4) return;

    // Rollarni taqsimlash
    const withRoles = assignRoles(playersData);

    // DB ga rollarni yozish
    for (const p of withRoles) {
      await supabase
        .from('room_players')
        .update({ role: p.role, is_alive: true, votes: 0 })
        .eq('room_id', roomId)
        .eq('user_id', p.user_id);
    }

    // Room statusini yangilash
    await supabase.from('rooms').update({
      status: 'playing',
      is_day: true,
      day_count: 1,
      time_left: 30,
      phase: 'discussion'
    }).eq('room_id', roomId);

    // Broadcast qilish
    const { channel } = get();
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: {
          players: withRoles.map(p => ({ ...p, is_alive: true, votes: 0 })),
          isDay: true,
          dayCount: 1,
          phase: 'discussion',
          timeLeft: 30
        }
      });
    }

    // Local state
    set({ gameState: 'playing' });
    get().startTimer();
  },

  // ========== APPLY STATE (broadcast dan kelgan) ==========
  applyState: (payload) => {
    const { myUserId } = get();
    const me = payload.players?.find(p => p.user_id === myUserId);

    set(state => ({
      players: payload.players || state.players,
      isDay: payload.isDay !== undefined ? payload.isDay : state.isDay,
      dayCount: payload.dayCount || state.dayCount,
      phase: payload.phase || state.phase,
      timeLeft: payload.timeLeft || state.timeLeft,
      myRole: me?.role || state.myRole,
      announcement: payload.announcement || '',
    }));
  },

  // ========== TIMER ==========
  startTimer: () => {
    const existing = get().timerInterval;
    if (existing) clearInterval(existing);

    const interval = setInterval(() => {
      const { timeLeft, isTimerPaused, gameState } = get();
      if (gameState !== 'playing' || isTimerPaused) return;

      if (timeLeft <= 0) {
        get().handlePhaseEnd();
      } else {
        set(state => ({ timeLeft: state.timeLeft - 1 }));
      }
    }, 1000);

    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) clearInterval(timerInterval);
    set({ timerInterval: null });
  },

  // ========== BOT AI ==========
  // Botlar user_id 'bot_' bilan boshlanadi
  runBotActions: async (playersData, isDay) => {
    const { roomId, dayCount } = get();
    const alivePlayers = playersData.filter(p => p.is_alive);
    const bots = alivePlayers.filter(p => p.user_id?.startsWith('bot_'));
    if (bots.length === 0) return playersData;

    let updatedPlayers = [...playersData];

    if (isDay) {
      // ===== KUNDUZ: Botlar ovoz beradi =====
      for (const bot of bots) {
        const isMafia = bot.role === 'Mafia' || bot.role === 'Don';
        // Mafia botlar civil larga, civil botlar tasodifiy ovoz beradi
        const targets = alivePlayers.filter(p => {
          if (p.user_id === bot.user_id) return false;
          if (isMafia) return p.role !== 'Mafia' && p.role !== 'Don';
          // Civil bot: agar kimdir Mafia sifatida bilinsa unga ovoz ber
          return true;
        });
        if (targets.length === 0) continue;
        // Ozroq aqlli: civil bot mafia rolini bilsa unga ovoz beradi
        const knownMafia = targets.find(p => p.role === 'Mafia' || p.role === 'Don');
        const target = (!isMafia && knownMafia && Math.random() > 0.4)
          ? knownMafia
          : targets[Math.floor(Math.random() * targets.length)];

        const idx = updatedPlayers.findIndex(p => p.user_id === target.user_id);
        if (idx !== -1) updatedPlayers[idx] = { ...updatedPlayers[idx], votes: (updatedPlayers[idx].votes || 0) + 1 };

        await supabase.from('room_players')
          .update({ votes: updatedPlayers[idx].votes })
          .eq('room_id', roomId).eq('user_id', target.user_id);
      }
    } else {
      // ===== TUN: Botlar harakat qiladi =====
      for (const bot of bots) {
        const civilians = alivePlayers.filter(p => p.role !== 'Mafia' && p.role !== 'Don' && p.user_id !== bot.user_id);
        const mafiaTeam = alivePlayers.filter(p => (p.role === 'Mafia' || p.role === 'Don') && p.user_id !== bot.user_id);

        if (bot.role === 'Don' || bot.role === 'Mafia') {
          // Mafia bot: random civil ni o'ldiradi
          if (civilians.length === 0) continue;
          const victim = civilians[Math.floor(Math.random() * civilians.length)];
          await supabase.from('night_actions').upsert({
            room_id: roomId, actor_id: bot.user_id, target_id: victim.user_id,
            action_type: 'kill', day_count: dayCount
          }, { onConflict: 'room_id,actor_id,day_count' });

        } else if (bot.role === 'Shifokor') {
          // Shifokor bot: random civilni himoyalaydi (ba'zida o'zini)
          const healTargets = [...civilians, bot];
          const target = healTargets[Math.floor(Math.random() * healTargets.length)];
          await supabase.from('night_actions').upsert({
            room_id: roomId, actor_id: bot.user_id, target_id: target.user_id,
            action_type: 'heal', day_count: dayCount
          }, { onConflict: 'room_id,actor_id,day_count' });

        } else if (bot.role === 'Komissar') {
          // Komissar bot: mafiani tekshiradi yoki otadi
          if (mafiaTeam.length > 0 && Math.random() > 0.5) {
            const target = mafiaTeam[Math.floor(Math.random() * mafiaTeam.length)];
            await supabase.from('night_actions').upsert({
              room_id: roomId, actor_id: bot.user_id, target_id: target.user_id,
              action_type: 'shoot', day_count: dayCount
            }, { onConflict: 'room_id,actor_id,day_count' });
          } else if (civilians.length > 0) {
            const target = civilians[Math.floor(Math.random() * civilians.length)];
            await supabase.from('night_actions').upsert({
              room_id: roomId, actor_id: bot.user_id, target_id: target.user_id,
              action_type: 'check', day_count: dayCount
            }, { onConflict: 'room_id,actor_id,day_count' });
          }
        }
        // Aholi bot: hech narsa qilmaydi (uxlaydi)
      }
    }
    return updatedPlayers;
  },

  // ========== PHASE END (admin) ==========
  handlePhaseEnd: async () => {
    const { isDay, myUserId, roomId } = get();
    set({ isTimerPaused: true });

    // Faqat admin (players[0]) boshqaradi
    const { data: playersData } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    const isAdmin = playersData?.[0]?.user_id === myUserId;
    if (!isAdmin) return;

    // Botlar harakatini bajarish (admin tomonidan)
    const updatedAfterBots = await get().runBotActions(playersData, isDay);

    if (isDay) {
      await get().resolveVoting(updatedAfterBots);
    } else {
      await get().resolveNight(updatedAfterBots);

    }
  },

  // ========== VOTING RESOLUTION ==========
  resolveVoting: async (playersData) => {
    const { roomId, channel } = get();
    const alive = playersData.filter(p => p.is_alive);
    const sorted = [...alive].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const top = sorted[0];
    const second = sorted[1];

    let eliminated = null;
    if (top && top.votes > 0 && (!second || top.votes !== second.votes)) {
      eliminated = top;
    }

    let announcement = '';
    const updatedPlayers = [...playersData];

    if (eliminated) {
      announcement = `Shahar qarori: ${eliminated.username} chetlatildi! (${eliminated.role})`;
      // DB yangilash
      await supabase.from('room_players')
        .update({ is_alive: false })
        .eq('room_id', roomId)
        .eq('user_id', eliminated.user_id);

      const idx = updatedPlayers.findIndex(p => p.user_id === eliminated.user_id);
      if (idx !== -1) updatedPlayers[idx] = { ...updatedPlayers[idx], is_alive: false };
    } else {
      announcement = 'Hech kim chetlatilmadi (tenglik yoki ovoz yo\'q).';
    }

    // Broadcast natija
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'vote_result',
        payload: { eliminated, announcement, players: updatedPlayers }
      });
    }

    // O'yin tugadimi?
    const { over, winner } = checkGameOver(updatedPlayers.filter(p => p.is_alive));
    if (over) {
      await get().endGame(winner);
      return;
    }

    // Kechaga o'tish
    setTimeout(async () => {
      await supabase.from('rooms').update({
        is_day: false, phase: 'night', time_left: 30,
        day_count: get().dayCount
      }).eq('room_id', roomId);

      if (channel) {
        await channel.send({
          type: 'broadcast', event: 'game_state',
          payload: {
            players: updatedPlayers.map(p => ({ ...p, votes: 0 })),
            isDay: false, phase: 'night', timeLeft: 30,
            dayCount: get().dayCount, announcement: 'Tun boshlandi...'
          }
        });
      }

      set({ isDay: false, phase: 'night', timeLeft: 30, isTimerPaused: false, announcement: '' });
    }, 3000);
  },

  // ========== NIGHT RESOLUTION ==========
  resolveNight: async (playersData) => {
    const { roomId, channel, protectedId } = get();
    const alive = playersData.filter(p => p.is_alive);

    // Mafia qurbonini topish (mafia bot / mafia player votes)
    const mafiaVictims = await supabase
      .from('night_actions')
      .select('*')
      .eq('room_id', roomId)
      .eq('action_type', 'kill')
      .eq('day_count', get().dayCount);

    let killTarget = null;
    if (mafiaVictims.data?.length > 0) {
      // Ko'p ovoz olgan
      const votes = {};
      mafiaVictims.data.forEach(a => { votes[a.target_id] = (votes[a.target_id] || 0) + 1; });
      killTarget = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
    } else {
      // Bot: tasodifiy aholi
      const civilians = alive.filter(p => p.role !== 'Mafia' && p.role !== 'Don');
      if (civilians.length > 0) {
        killTarget = civilians[Math.floor(Math.random() * civilians.length)].user_id;
      }
    }

    // Komissar otishi
    const sheriffShot = await supabase
      .from('night_actions')
      .select('*')
      .eq('room_id', roomId)
      .eq('action_type', 'shoot')
      .eq('day_count', get().dayCount)
      .single();

    const updatedPlayers = [...playersData];
    const killed = [];

    // Mafia o'ldirishi (himoyalanmagan)
    if (killTarget && killTarget !== protectedId) {
      const idx = updatedPlayers.findIndex(p => p.user_id === killTarget);
      if (idx !== -1 && updatedPlayers[idx].is_alive) {
        updatedPlayers[idx] = { ...updatedPlayers[idx], is_alive: false };
        killed.push(updatedPlayers[idx].username);
        await supabase.from('room_players')
          .update({ is_alive: false })
          .eq('room_id', roomId).eq('user_id', killTarget);
      }
    }

    // Komissar otishi
    if (sheriffShot.data) {
      const idx = updatedPlayers.findIndex(p => p.user_id === sheriffShot.data.target_id);
      if (idx !== -1 && updatedPlayers[idx].is_alive) {
        updatedPlayers[idx] = { ...updatedPlayers[idx], is_alive: false };
        killed.push(updatedPlayers[idx].username + ' (Komissar)');
        await supabase.from('room_players')
          .update({ is_alive: false })
          .eq('room_id', roomId).eq('user_id', sheriffShot.data.target_id);
      }
    }

    const announcement = killed.length > 0
      ? `Tunda o'ldirildi: ${killed.join(', ')}`
      : 'Tunda hech kim o\'lmadi.';

    if (channel) {
      await channel.send({
        type: 'broadcast', event: 'night_result',
        payload: { killed, announcement, players: updatedPlayers }
      });
    }

    // O'yin tugadimi?
    const { over, winner } = checkGameOver(updatedPlayers.filter(p => p.is_alive));
    if (over) {
      await get().endGame(winner);
      return;
    }

    // Kunduzga o'tish
    const newDay = get().dayCount + 1;
    setTimeout(async () => {
      // night_actions ni tozalash
      await supabase.from('night_actions').delete()
        .eq('room_id', roomId).eq('day_count', get().dayCount);

      await supabase.from('rooms').update({
        is_day: true, phase: 'discussion', time_left: 45,
        day_count: newDay
      }).eq('room_id', roomId);

      if (channel) {
        await channel.send({
          type: 'broadcast', event: 'game_state',
          payload: {
            players: updatedPlayers.map(p => ({ ...p, votes: 0 })),
            isDay: true, phase: 'discussion', timeLeft: 45,
            dayCount: newDay, announcement: `${newDay}-kun boshlandi!`
          }
        });
      }

      set({
        isDay: true, phase: 'discussion', timeLeft: 45,
        dayCount: newDay, isTimerPaused: false,
        protectedId: null, nightActionDone: false, selectedTarget: null
      });
    }, 3500);
  },

  applyNightResult: (payload) => {
    set(state => ({
      players: payload.players || state.players,
      announcement: payload.announcement || '',
      logs: [...state.logs, { id: Date.now(), user: 'Sistema', text: payload.announcement }]
    }));
  },

  applyVoteResult: (payload) => {
    set(state => ({
      players: payload.players || state.players,
      announcement: payload.announcement || '',
      logs: [...state.logs, { id: Date.now(), user: 'Sistema', text: payload.announcement }]
    }));
  },

  // ========== VOTING (day) ==========
  handleVote: async (targetId) => {
    const { isDay, players, myUserId, selectedTarget, roomId, channel, phase, isTimerPaused } = get();
    if (!isDay || phase !== 'voting' && phase !== 'discussion') return;
    if (isTimerPaused) return;

    const me = players.find(p => p.user_id === myUserId);
    const target = players.find(p => p.user_id === targetId);
    if (!me?.is_alive || !target?.is_alive) return;
    if (targetId === myUserId) return;

    // DB ovoz
    if (selectedTarget) {
      await supabase.from('room_players')
        .update({ votes: Math.max(0, (players.find(p => p.user_id === selectedTarget)?.votes || 0) - 1) })
        .eq('room_id', roomId).eq('user_id', selectedTarget);
    }
    await supabase.from('room_players')
      .update({ votes: (target.votes || 0) + 1 })
      .eq('room_id', roomId).eq('user_id', targetId);

    set(state => ({
      selectedTarget: targetId,
      players: state.players.map(p => {
        if (p.user_id === targetId) return { ...p, votes: (p.votes || 0) + 1 };
        if (p.user_id === state.selectedTarget) return { ...p, votes: Math.max(0, (p.votes || 0) - 1) };
        return p;
      })
    }));

    // Broadcast vote update
    if (channel) {
      await channel.send({
        type: 'broadcast', event: 'game_state',
        payload: { players: get().players, isDay: true, phase: get().phase, timeLeft: get().timeLeft, dayCount: get().dayCount }
      });
    }
  },

  // ========== NIGHT ACTIONS ==========
  handleNightAction: async (actionType, targetId) => {
    const { roomId, myUserId, myRole, nightActionDone, dayCount, channel, players } = get();
    if (nightActionDone) return;

    const me = players.find(p => p.user_id === myUserId);
    if (!me?.is_alive) return;

    // Night action ni DB ga yozish
    await supabase.from('night_actions').upsert({
      room_id: roomId,
      actor_id: myUserId,
      target_id: targetId,
      action_type: actionType,
      day_count: dayCount
    }, { onConflict: 'room_id,actor_id,day_count' });

    let logText = '';

    if (actionType === 'heal') {
      set({ protectedId: targetId });
      logText = `Shifokor ${players.find(p => p.user_id === targetId)?.username}ni himoyaladi.`;
    } else if (actionType === 'check') {
      const target = players.find(p => p.user_id === targetId);
      const isMafia = target?.role === 'Mafia' || target?.role === 'Don';
      logText = `Komissar: ${target?.username} - ${isMafia ? 'MAFIA ⛔' : 'TINCH ✅'}`;
    } else if (actionType === 'kill') {
      logText = 'Mafia nishon tanladi...';
    } else if (actionType === 'shoot') {
      logText = `Komissar otdi: ${players.find(p => p.user_id === targetId)?.username}`;
    }

    set(state => ({
      nightActionDone: true,
      selectedTarget: targetId,
      logs: [...state.logs, { id: Date.now(), user: myRole, text: logText }]
    }));
  },

  // ========== SELECT TARGET ==========
  setTarget: (userId) => set({ selectedTarget: userId }),

  // ========== CHAT ==========
  toggleChat: () => set(state => ({ showChat: !state.showChat })),

  sendChatMessage: async (text) => {
    const { channel, myUserId, players } = get();
    const me = players.find(p => p.user_id === myUserId);
    if (!me?.is_alive || !channel) return;

    const msg = { id: Date.now(), user: me.username, text, ts: new Date().toISOString() };
    await channel.send({ type: 'broadcast', event: 'chat_message', payload: msg });
    set(state => ({ logs: [...state.logs, msg] }));
  },

  // ========== SURRENDER ==========
  surrender: async () => {
    const { roomId, myUserId } = get();
    await supabase.from('room_players')
      .update({ is_alive: false, surrendered: true })
      .eq('room_id', roomId).eq('user_id', myUserId);

    set({ surrendered: true });
  },

  // ========== GAME END ==========
  endGame: async (winner) => {
    const { roomId, channel } = get();

    await supabase.from('rooms')
      .update({ status: 'ended' })
      .eq('room_id', roomId);

    if (channel) {
      await channel.send({
        type: 'broadcast', event: 'game_end',
        payload: { winner }
      });
    }

    // Room auto-delete (game ended)
    setTimeout(async () => {
      await supabase.from('room_players').delete().eq('room_id', roomId);
      await supabase.from('rooms').delete().eq('room_id', roomId);
    }, 30000);

    set({
      gameState: 'ended',
      gameResult: winner,
      announcement: winner === 'mafia' ? "MAFIA G'ALABA QOZONDI! 💀" : "AHOLI G'ALABA QOZONDI! 🎉",
      isTimerPaused: true
    });

    get().stopTimer();
  },

  // ========== CLEANUP ==========
  cleanup: () => {
    const { channel, timerInterval } = get();
    if (timerInterval) clearInterval(timerInterval);
    if (channel) channel.unsubscribe();
    set({ channel: null, timerInterval: null });
  },

  addLog: (user, text) => set(state => ({
    logs: [...state.logs, { id: Date.now() + Math.random(), user, text }]
  })),
}));

// ============================================================
// HELPER: Game over tekshiruvi
// ============================================================
function checkGameOver(alivePlayers) {
  const mafiaCount = alivePlayers.filter(p => p.role === 'Mafia' || p.role === 'Don').length;
  const civilCount = alivePlayers.length - mafiaCount;

  if (mafiaCount === 0) return { over: true, winner: 'civil' };
  if (mafiaCount >= civilCount) return { over: true, winner: 'mafia' };
  return { over: false, winner: null };
}

export default useMultiplayerGameStore;