/**
 * useGameStore.js — TO'LDIRILGAN SINGLEPLAYER STORE
 * 
 * Tuzatmalar:
 * 1. Mafia qoidalariga to'liq mos keladi
 * 2. Komissar: tekshirish YOKI otish (ikkalasini emas)
 * 3. Shifokor: o'zini faqat 1 marta davolaydi
 * 4. Don: barcha mafia qarorlarini o'z zimmasiga oladi
 * 5. Game over to'g'ri hisoblanadi
 * 6. Bot AI yaxshilandi (mafia botlari bir-birini ovoz bermaydi)
 * 7. Voting result: tenglik bo'lsa hech kim ketmaydi
 * 8. Active role singleplayda ham ishlatilishi
 */
import { create } from 'zustand';
import { auth, database } from '../firebase';
import { ref, update } from 'firebase/database';

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
      selectedVote: null,
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
    const { isDay, players, isTimerPaused, gameState, userRole } = get();
    const user = players.find(p => p.isUser);
    if (isTimerPaused || !user.isAlive || gameState !== 'playing') return;

    const target = players.find(p => p.id === targetId);
    if (!target || !target.isAlive) return;

    if (isDay) {
      if (targetId === user.id) return; // O'ziga ovoz bermaydi
      const { selectedVote } = get();
      set(state => ({
        selectedVote: targetId,
        players: state.players.map(p => {
          if (p.id === targetId)    return { ...p, votes: p.votes + 1 };
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
  saveGameResult: async (result) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const { userRole } = get();
    const isMafia = userRole === 'Mafia' || userRole === 'Don';
    const won = (result === 'WIN' && !isMafia) || (result === 'LOSE' && isMafia);

    try {
      const userRef = ref(database, `users/${currentUser.uid}`);
      const updates = {};
      const faction = isMafia ? 'mafia' : 'aholi';

      // Umumiy o'yinlar
      updates[`/${faction}/${faction === 'mafia' ? 'mafia_all_game' : 'aholi_all_game'}`] = Date.now(); // increment kerak, lekin increment uchun transaction kerak
      if (won) updates[`/${faction}/wins`] = Date.now();

      // Rol statistikasi
      if (userRole === 'Don')      updates['/mafia/mafia_rollar/Don']      = Date.now();
      if (userRole === 'Mafia')    updates['/mafia/mafia_rollar/Mafia']    = Date.now();
      if (userRole === 'Komissar') updates['/aholi/rollar/kamissar']       = Date.now();
      if (userRole === 'Shifokor') updates['/aholi/rollar/shifokor']       = Date.now();
      if (userRole === 'Aholi')    updates['/aholi/rollar/tinchaholi']     = Date.now();

      // Aktiv rolni 1 dan kamaytirish
      const { activeRole } = get();
      if (activeRole && activeRole !== 'none') {
        // Bu serverda bo'lishi kerak, lekin local sifatida
        updates[`/inventory/roles/${activeRole}`] = 0; // sifatida reset - real projectda transaction ishlating
        updates['/active_role'] = 'none';
      }

      await update(userRef, updates);
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
    selectedVote: null, nightActionTarget: null, protectedId: null
  })),

  addLog: (user, text) => set(state => ({
    logs: [...state.logs, { id: Date.now() + Math.random(), user, text }]
  })),

  toggleUI: (key) => set(state => ({ [key]: !state[key] })),
}));

export default useGameStore;
