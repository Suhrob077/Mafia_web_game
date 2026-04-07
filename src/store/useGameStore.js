import { create } from 'zustand';
import { auth, database } from '../firebase';
import { ref, update } from 'firebase/database';

// ============ QUEST PROGRESS TRACKER ============
// Bu funksiya o'yin tugaganda quest progressini yangilaydi
export const trackQuestProgress = async (database, uid, questUpdates) => {
  if (!uid || !questUpdates || questUpdates.length === 0) return;
  const { ref, get, update } = await import('firebase/database');
  try {
    const snap = await get(ref(database, `users/${uid}/quests`));
    const existing = snap.exists() ? snap.val() : {};
    const updates = {};
    for (const { id, increment } of questUpdates) {
      const cur = existing[id]?.progress || 0;
      updates[`quests/${id}/progress`] = cur + (increment || 1);
    }
    await update(ref(database, `users/${uid}`), updates);
  } catch (err) {
    console.error('trackQuestProgress error:', err);
  }
};

const ROLES_MAP = {
  Don:      { side: 'mafia',  canKill: true,  canCheck: false, canHeal: false },
  Mafia:    { side: 'mafia',  canKill: true,  canCheck: false, canHeal: false },
  Komissar: { side: 'civil',  canKill: true,  canCheck: true,  canHeal: false },
  Shifokor: { side: 'civil',  canKill: false, canCheck: false, canHeal: true  },
  Aholi:    { side: 'civil',  canKill: false, canCheck: false, canHeal: false },
};

const NAMES = ['Sardor','Jasur','Madina','Rustam','Nilufar','Akmal','Diyora','Botir'];

const useGameStore = create((set, get) => ({
  gameState: 'lobby',
  isDay: true,
  timeLeft: 45,
  dayCount: 1,
  players: [],
  userRole: null,
  selectedVote: null,
  hasVoted: false,            // FIX: foydalanuvchi bu kunda ovoz berdimi
  isTimerPaused: false,
  announcement: '',
  logs: [],
  nightActionTarget: null,
  hasDoctorHealedSelf: false,
  gameResult: null,
  protectedId: null,
  sheriffUsedAction: false,   // Komissar bu tunda harakat qildimi
  activeRole: null,           // Firebase'dan olingan aktiv rol

  // ===== INIT =====
  initGame: (activeRoleOverride = null) => {
    // 8 kishi, rollar to'g'ri taqsimlanadi
    const rolesPool = ['Don', 'Mafia', 'Komissar', 'Shifokor', 'Aholi', 'Aholi', 'Aholi', 'Aholi']
      .sort(() => Math.random() - 0.5);

    // Agar aktiv rol bo'lsa, foydalanuvchiga o'sha rol beriladi
    let finalRoles = [...rolesPool];
    if (activeRoleOverride && activeRoleOverride !== 'none') {
      const ar = activeRoleOverride.charAt(0).toUpperCase() + activeRoleOverride.slice(1);
      const idx = finalRoles.indexOf(ar);
      if (idx !== -1) {
        finalRoles.splice(idx, 1);
        finalRoles.unshift(ar);
      }
    }

    const initialPlayers = NAMES.map((name, i) => ({
      id: i + 1, name, role: finalRoles[i],
      isAlive: true, isUser: i === 0,
      votes: 0, knowsAsMafia: false, pendingDeath: false
    }));

    set({
      players: initialPlayers,
      userRole: initialPlayers[0].role,
      activeRole: activeRoleOverride,
      gameState: 'playing',
      isDay: true, dayCount: 1, timeLeft: 45,
      logs: [{ id: Date.now(), user: 'Sistema', text: "O'yin boshlandi! 1-kun - Muhokama vaqti." }],
      announcement: '',
      hasDoctorHealedSelf: false, gameResult: null,
      nightActionTarget: null, protectedId: null,
      isTimerPaused: false, sheriffUsedAction: false,
      selectedVote: null, hasVoted: false,
    });
  },

  // ===== TIMER TICK =====
  tick: () => {
    const { timeLeft, gameState, isTimerPaused } = get();
    if (gameState === 'playing' && !isTimerPaused) {
      if (timeLeft <= 0) get().handlePhaseChange();
      else set({ timeLeft: timeLeft - 1 });
    }
  },

  handlePhaseChange: () => {
    const { isDay } = get();
    set({ isTimerPaused: true });
    if (isDay) get().calculateVotingResult();
    else get().calculateNightResult();
  },

  // ===== VOTING =====
  handleVote: (targetId) => {
    const { isDay, players, isTimerPaused, gameState, userRole, hasVoted } = get();
    const user = players.find(p => p.isUser);
    if (isTimerPaused || !user.isAlive || gameState !== 'playing') return;

    const target = players.find(p => p.id === targetId);
    if (!target || !target.isAlive) return;

    if (isDay) {
      if (targetId === user.id) return;
      if (hasVoted) return;              // FIX: bir kunda faqat 1 marta ovoz
      const { selectedVote } = get();
      set(state => ({
        selectedVote: targetId,
        hasVoted: true,                  // FIX: ovoz berildi
        players: state.players.map(p => {
          if (p.id === targetId)     return { ...p, votes: p.votes + 1 };
          if (p.id === selectedVote) return { ...p, votes: Math.max(0, p.votes - 1) };
          return p;
        })
      }));
    } else {
      // Tun nishon tanlash
      if (userRole === 'Mafia' || userRole === 'Don') {
        if (target.role === 'Mafia' || target.role === 'Don') return;
      }
      set({ nightActionTarget: targetId });
    }
  },

  // ===== KOMISSAR HARAKATLARI =====
  executeSheriffAction: (type) => {
    const { nightActionTarget, players, addLog, sheriffUsedAction } = get();
    if (!nightActionTarget || sheriffUsedAction) return;

    const target = players.find(p => p.id === nightActionTarget);
    if (!target) return;

    if (type === 'check') {
      const isMafia = target.role === 'Mafia' || target.role === 'Don';
      addLog('Komissar', `${target.name}: ${isMafia ? '🔴 MAFIA' : '🟢 TINCH AHOLI'}`);
      if (isMafia) {
        set(state => ({
          players: state.players.map(p => p.id === target.id ? { ...p, knowsAsMafia: true } : p)
        }));
      }
    } else if (type === 'kill') {
      // Komissar o'ldirishni keyingi kechaga qo'yadi
      set(state => ({
        players: state.players.map(p => p.id === target.id ? { ...p, pendingDeath: true } : p)
      }));
      addLog('Komissar', `${target.name} nishonga olindi!`);
    }

    set({ sheriffUsedAction: true, nightActionTarget: null, timeLeft: 0 });
  },

  // ===== SHIFOKOR HARAKATI =====
  executeDoctorAction: () => {
    const { nightActionTarget, players, hasDoctorHealedSelf, addLog } = get();
    if (!nightActionTarget) return;

    const target = players.find(p => p.id === nightActionTarget);
    if (!target) return;

    if (target.isUser && hasDoctorHealedSelf) {
      addLog('Sistema', "O'zingizni bir martadan ortiq davolay olmaysiz!");
      return;
    }

    if (target.isUser) set({ hasDoctorHealedSelf: true });
    set({ protectedId: target.id, nightActionTarget: null, timeLeft: 0 });
    addLog('Shifokor', `${target.name} himoyalandi. ✅`);
  },

  // ===== VOTING NATIJASI =====
  calculateVotingResult: () => {
    const { players, killPlayer, checkGameOver, simulateBotVotes } = get();
    simulateBotVotes();

    setTimeout(() => {
      const alivePlayers = get().players.filter(p => p.isAlive);
      const sorted = [...alivePlayers].sort((a, b) => b.votes - a.votes);
      const top = sorted[0];
      const second = sorted[1];

      // Tenglik bo'lsa hech kim ketmaydi
      const target = (top?.votes > 0 && (!second || top.votes !== second.votes)) ? top : null;

      if (target) {
        set({ announcement: `Shahar qarori: ${target.name} (${target.role}) chetlatildi!` });
        killPlayer(target.id);
      } else {
        set({ announcement: 'Hech kim chetlatilmadi (tenglik yoki ovoz yo\'q).' });
      }

      setTimeout(() => {
        if (!checkGameOver()) {
          get().resetVotes();
          set({ isDay: false, isTimerPaused: false, timeLeft: 30, announcement: '', sheriffUsedAction: false });
          get().addLog('Sistema', 'Tun boshlandi...');
        }
      }, 2500);
    }, 1200);
  },

  // ===== TUN NATIJASI =====
  calculateNightResult: () => {
    const { players, protectedId, userRole, nightActionTarget, killPlayer, checkGameOver, addLog } = get();

    let finalDeadId = null;
    const isUserMafia = userRole === 'Mafia' || userRole === 'Don';

    if (isUserMafia && nightActionTarget) {
      // User mafia - u tanlagan
      finalDeadId = nightActionTarget !== protectedId ? nightActionTarget : null;
    } else {
      // Bot mafia - tasodifiy aholi
      const victims = players.filter(p => p.isAlive && p.role !== 'Mafia' && p.role !== 'Don');
      if (victims.length > 0) {
        const mafiaTarget = victims[Math.floor(Math.random() * victims.length)];
        finalDeadId = mafiaTarget.id !== protectedId ? mafiaTarget.id : null;
      }
    }

    set({ announcement: 'Tun o\'tdi. Shahar uyg\'onmoqda...' });

    setTimeout(() => {
      const currentPlayers = get().players;

      // Mafia o'ldirishi
      if (finalDeadId) {
        const victim = currentPlayers.find(p => p.id === finalDeadId);
        killPlayer(finalDeadId);
        addLog('Sistema', `Tunda ${victim?.name} o'ldirildi.`);
      } else {
        addLog('Sistema', 'Tunda hech kim o\'lmadi. (Himoya ishlagandir...)');
      }

      // Komissar otishi
      const sheriffVictim = get().players.find(p => p.pendingDeath && p.isAlive);
      if (sheriffVictim) {
        killPlayer(sheriffVictim.id);
        addLog('Sistema', `Komissar ${sheriffVictim.name}ni jazoladi.`);
      }

      set(state => ({ players: state.players.map(p => ({ ...p, pendingDeath: false })) }));

      setTimeout(() => {
        if (!checkGameOver()) {
          get().resetVotes();
          const newDay = get().dayCount + 1;
          set(state => ({
            isDay: true, isTimerPaused: false, timeLeft: 45,
            dayCount: newDay,
            announcement: `${newDay}-kun boshlandi!`,
            protectedId: null, nightActionTarget: null,
            sheriffUsedAction: false
          }));
          // FIX: "N-kun boshlandi" xabarini 2.5 sekunddan keyin tozalash
          setTimeout(() => set({ announcement: '' }), 2500);
        }
      }, 2000);
    }, 2000);
  },

  // ===== GAME OVER =====
  checkGameOver: () => {
    const { players } = get();
    const alive = players.filter(p => p.isAlive);
    const mafiaCount = alive.filter(p => p.role === 'Mafia' || p.role === 'Don').length;
    const civilianCount = alive.length - mafiaCount;

    if (mafiaCount === 0) {
      set({ gameState: 'ended', gameResult: 'WIN', announcement: "AHOLI G'ALABA QOZONDI! 🎉", isTimerPaused: true });
      get().saveGameResult('WIN');
      return true;
    }
    if (mafiaCount >= civilianCount) {
      set({ gameState: 'ended', gameResult: 'LOSE', announcement: "MAFIA G'ALABA QOZONDI! 💀", isTimerPaused: true });
      get().saveGameResult('LOSE');
      return true;
    }
    return false;
  },

  // ===== FIREBASE GA NATIJA SAQLASH =====
  // FIX: Quest tracking SinglePlayer.jsx ga ko'chirildi (double counting oldini olish uchun)
  // Bu funksiya faqat statistika va aktiv rol boshqaruvini bajaradi
  saveGameResult: async (result) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const { userRole } = get();
    const isMafia = userRole === 'Mafia' || userRole === 'Don';
    const won = (result === 'WIN' && !isMafia) || (result === 'LOSE' && isMafia);

    try {
      const updates = {};
      const faction = isMafia ? 'mafia' : 'aholi';

      // ==== Statistika — runTransaction bilan to'g'ri increment ====
      const { runTransaction } = await import('firebase/database');
      await runTransaction(ref(database, `users/${currentUser.uid}/${faction}/${faction === 'mafia' ? 'mafia_all_game' : 'aholi_all_game'}`), (cur) => (cur || 0) + 1);
      if (won) await runTransaction(ref(database, `users/${currentUser.uid}/${faction}/wins`), (cur) => (cur || 0) + 1);

      // Rol statistikasi
      if (userRole === 'Don')      await runTransaction(ref(database, `users/${currentUser.uid}/mafia/mafia_rollar/Don`), c => (c||0)+1);
      if (userRole === 'Mafia')    await runTransaction(ref(database, `users/${currentUser.uid}/mafia/mafia_rollar/Mafia`), c => (c||0)+1);
      if (userRole === 'Komissar') await runTransaction(ref(database, `users/${currentUser.uid}/aholi/rollar/kamissar`), c => (c||0)+1);
      if (userRole === 'Shifokor') await runTransaction(ref(database, `users/${currentUser.uid}/aholi/rollar/shifokor`), c => (c||0)+1);
      if (userRole === 'Aholi')    await runTransaction(ref(database, `users/${currentUser.uid}/aholi/rollar/tinchaholi`), c => (c||0)+1);

      // Aktiv rolni inventardan kamaytirish
      const { activeRole } = get();
      if (activeRole && activeRole !== 'none') {
        await runTransaction(ref(database, `users/${currentUser.uid}/inventory/roles/${activeRole}`), c => Math.max(0, (c||0) - 1));
        updates['/active_role'] = 'none';
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database, `users/${currentUser.uid}`), updates);
      }
    } catch (err) {
      console.error('saveGameResult error:', err);
    }
  },

  // ===== BOT VOTES =====
  simulateBotVotes: () => {
    set(state => {
      const alivePlayers = state.players.filter(p => p.isAlive);
      const newPlayers = state.players.map(p => ({ ...p }));

      alivePlayers.forEach(bot => {
        if (!bot.isUser) {
          const isBotMafia = bot.role === 'Mafia' || bot.role === 'Don';
          let possibleTargets;

          if (isBotMafia) {
            // Mafia botlari mafia bo'lmaganlarga ovoz beradi
            possibleTargets = alivePlayers.filter(p => p.id !== bot.id && p.role !== 'Mafia' && p.role !== 'Don');
          } else {
            // Aholi botlari tasodifiy (bioz aqlli: mafiani bilsa unga)
            possibleTargets = alivePlayers.filter(p => p.id !== bot.id);
          }

          if (possibleTargets.length > 0) {
            const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
            const idx = newPlayers.findIndex(p => p.id === target.id);
            if (idx !== -1) newPlayers[idx].votes += 1;
          }
        }
      });

      return { players: newPlayers };
    });
  },

  // ===== HELPERS =====
  killPlayer: (id) => set(state => ({
    players: state.players.map(p => p.id === id ? { ...p, isAlive: false } : p)
  })),

  resetVotes: () => set(state => ({
    players: state.players.map(p => ({ ...p, votes: 0 })),
    selectedVote: null, nightActionTarget: null, protectedId: null,
    hasVoted: false,    // FIX: yangi kunda ovoz berish imkonini qaytarish
  })),

  addLog: (user, text) => set(state => ({
    logs: [...state.logs, { id: Date.now() + Math.random(), user, text }]
  })),

  toggleUI: (key) => set(state => ({ [key]: !state[key] })),
}));

export default useGameStore;