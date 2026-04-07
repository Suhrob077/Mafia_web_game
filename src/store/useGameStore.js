import { create } from 'zustand';
import { auth, database } from '../firebase';
import { ref, update } from 'firebase/database';

// ============ QUEST PROGRESS TRACKER ============
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

const NAMES = ['Sardor','Jasur','Madina','Rustam','Nilufar','Akmal','Diyora','Botir'];

// ============ CHAT DATA ============
const CHAT_DATA = {
  roles: {
    Komissar: {
      day: [
        "Kecha qiziq narsalar ko'rdim... 🤔",
        "Kimdir yolg'on gapirgan bo'lishi kerak! 🧐",
        "Bugun ehtiyot bo'lish kerak, do'stlar 👀",
        "Men hamma narsani kuzatib boraman 🔍",
        "Sezgim menga yomonni ko'rsatyapti 😤",
        "Hech kimga ishonma deyishadi... to'g'ri gap! 🕵️",
        "Bugun sessiyadagi barcha so'zlarni yozib oldim 📝",
        "Mening nazarimda bir kishi juda g'alati ko'rindi 🤨",
        "Adolat har doim g'alaba qozonadi! ⚖️",
        "Tez orada hamma aniq bo'ladi 😏",
        "Men hech narsa bilmayman, keling muhokama qilaylik 😇",
        "Ovoz berish vaqtida diqqat qiling! ☝️",
        "Bu odam menga ishonchli ko'rinyapti ✅",
        "Kecha tunda juda qo'rqinchli edi 😬",
        "Shahrni himoya qilish mening burchim 🛡️",
        "Faktlarga qarab gaplashamiz 📊",
        "Men kimdir shubhali ekanini bilaman 👁️",
        "Oxirga qadar kurashaman 💪",
        "Adolat g'alaba qozonadi! ⚖️",
        "Sizlarni kuzatib boraman... 🕵️‍♂️"
      ]
    },
    Mafia: {
      day: [
        "Hammaning ahvoli qanday? 😊",
        "Bugun tinch kun bo'lsin 🙏",
        "Men hech kimdan shubhalanmayman 😌",
        "Keling birgalikda o'ylaymiz 💭",
        "Mafiani topish qiyin emas, ular orasida bo'lmay men! 😂",
        "Qiziq o'yin, ha? 🎭",
        "Mening ovozim eng adolatli odamga ketadi 👍",
        "Hech nima ko'rmadim, hech nima bilmayman 🙈",
        "Bugun kuni bilan xotirjam yurdim 😇",
        "Shaharliklar birlashinglar! ✊",
        "Men ham sizlar bilan ovoz beraman 🗳️",
        "Xavotirlanma, biz aholi bilan birgamiz 😊",
        "Keling faktlarga qaraylik 🧐",
        "Bugun bahslashmaylik, ovoz beraylik 🗳️",
        "Men biron kimni shubha qilmayman 😌",
        "Hammasi yaxshi bo'ladi 😊",
        "Birlashib ishlaylik! 💪",
        "Bu o'yin qiziq, lekin jiddiy 🎯",
        "Tinch yashaylik, do'stlar ☮️",
        "Birga ishlasak, g'alaba bizniki 🤝"
      ]
    },
    Don: {
      day: [
        "Bugun hammaga salom 😎",
        "O'yin qiziq borayapti, lekin men xotirjamman 🙂",
        "Bu o'yinda aql muhim 🧠",
        "Men har doim to'g'ri qaror qilaman 😌",
        "Shahar xavfsizligi muhim masala! 🏛️",
        "Keling faktlarga qarab gaplashamiz 📊",
        "Lider bo'lish qiyin, lekin men uddalay olaman 💼",
        "Hammani tinglagan yaxshi 👂",
        "Mening ovozim engil bo'lmaydi ⚖️",
        "Men oddiy shaharlikman, ishoning 😇",
        "Birlashib ishlaylik 🤝",
        "Bu safar g'alaba bizniki! 🏆",
        "Shoshmasdan o'ylaylik 🤔",
        "Faktlarga tayanamiz, his-tuyg'ularga emas 📋",
        "Men hech kimni chetlatmayman shoshilinch 🚫",
        "Keling barcha fikrlarni eshitaylik 👂",
        "Aqlli qarorlar qabul qilamiz 🧠",
        "Bugun tinch kechirish maqsadimiz 🕊️",
        "Men ham sizlar kabi oddiy odamman 🙏",
        "Oxirigacha kurashaman, aholi uchun! ✊"
      ]
    },
    Shifokor: {
      day: [
        "Hammaning sog'lig'i yaxshimi? 💉",
        "Men doim himoya qilishga tayyorman 🏥",
        "Kecha qiyin tun edi 😔",
        "Hayotni asrash eng muhim vazifam ❤️",
        "Bugun kimga yordam kerak bo'lsa aytsin 🩺",
        "Men aholi tomonida turaman! 🤍",
        "Davolanish uchun hech qachon kech emas 💊",
        "Mafia qurbonlarini ko'rmaylik iltimos 🙏",
        "Shifokorlik qiyin kasb, lekin muhim 👨‍⚕️",
        "Bugun ham tirikman, demak ish bor 😊",
        "Sen sog'misan? Ko'zing charchagan ko'rinyapti 😕",
        "Kecha tunda qo'rqib ketdim 😨",
        "Men sizni davolay olaman ☺️",
        "Xavotirlanma, men yoningdaman 💪",
        "Hayot muhim, asrash kerak! 🌿",
        "Har bir inson qimmatli 🤲",
        "Men hech kimni yo'qotishni istamayman 😢",
        "Bugun jangsiz kun bo'lsin 🕊️",
        "Shifokor sifatida aytamanki - ehtiyot bo'ling! ⚠️",
        "Himoya doim kerak 🛡️"
      ]
    },
    Aholi: {
      day: [
        "Men oddiy odamman, hech nima bilmayman 😊",
        "Bugun ovoz berish muhim! 🗳️",
        "Mafia orasimizda, topishimiz kerak 🕵️",
        "Kecha tunda qo'rqib ketdim 😱",
        "Hammaga salom, ahvollar qanday? 👋",
        "Menga shubhali odam ko'rinyapti 🤨",
        "Birgalikda jang qilaylik mafiaга qarshi 💪",
        "O'yin qiziq ketayapti 😄",
        "Bugun kimni chiqaramiz? 🤔",
        "Mening fikrimcha... nega bunday qildi u? 🧐",
        "Sen qanday fikrda? 💬",
        "Seni ishonchli deb hisoblayman 😊",
        "Qo'rqmasdan gapir, biz qulyapmiz 👂",
        "Birgalikda boshqaraylik ovozlarni 🗳️",
        "Ertaga ham sog'-salomat bo'laylik 🙏",
        "Bu o'yinda hamma shubhali 🤔",
        "Meni eshitinglar! ☝️",
        "Mafia orasimizda! Topaylik 🔍",
        "Ovozimni to'g'ri berishga harakat qilaman ✅",
        "Birlashgan aholi mag'lub bo'lmaydi! ✊"
      ]
    }
  },
  greetings: [
    "Assalomu alaykum! 👋",
    "Salom! Yaxshimisiz? 😊",
    "Ahvollar qanday? 🙂",
    "Xayrli kun! ☀️",
    "Hey, barchaga salom! 👐",
    "O'yin qiziq bo'lmoqda! 🎭",
    "Salom salom! 🤗",
    "Vah, jamoa to'planibdi! 🤝",
    "Hamma yaxshi ko'rinyapti 😌",
    "Assalomu alaykum, do'stlar! 🙏"
  ],
  reactions: {
    agree: ["To'g'ri gap! 👍", "Men ham shunday o'ylayman ✅", "Ha, qo'shilaman! 🙌", "Aynan! 💯", "Biz bir xil fikrdamiz 🤝"],
    disagree: ["Yo'q, unday emas! 😤", "Men buni qabul qilmayman 🙅", "G'alati fikr... 🤨", "Shoshilma! ☝️", "Bu noto'g'ri 🚫"],
    neutral: ["Qiziq... 🤭", "Hmm... 🤔", "Nima deyapsan? 😅", "Voah! 😮", "Tushunmadim 🧐"]
  }
};

// ============ EMOJI DATA ============
const FLOATING_EMOJIS = {
  day:    ["☀️","💬","🗳️","👥","🤔","💭","⚖️","🧐","📢","✊","💪","🙌","👀","😮","🎭"],
  night:  ["🌙","👁️","🔍","🌑","⭐","🕵️","🔮","🌟","🦇","🕯️","💫","🌃","👤","🌒","✨"],
  action: ["💥","⚡","🎯","🔫","💉","🛡️","❤️","💔","✅","🚨","🔔","⚠️","🎪","🎲","🔥"]
};

// ============ BOT AI HELPERS ============
const getMafiaNightTarget = (civilians) => {
  if (!civilians || civilians.length === 0) return null;
  const komissar = civilians.find(p => p.role === 'Komissar');
  if (komissar && Math.random() < 0.4) return komissar;
  const shifokor = civilians.find(p => p.role === 'Shifokor');
  if (shifokor && Math.random() < 0.35) return shifokor;
  return civilians[Math.floor(Math.random() * civilians.length)];
};

const getDoctorHealTarget = (alivePlayers, hasDoctorHealedSelf, doctorBot) => {
  if (!doctorBot) return null;
  if (!hasDoctorHealedSelf && Math.random() < 0.3) return doctorBot;
  const komissar = alivePlayers.find(p => p.role === 'Komissar');
  if (komissar && Math.random() < 0.4) return komissar;
  return alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
};

const getKomissarNightAction = (alivePlayers) => {
  const knownMafia = alivePlayers.find(p => p.knowsAsMafia);
  if (knownMafia && Math.random() < 0.7) return { target: knownMafia, action: 'kill' };
  const unknownTargets = alivePlayers.filter(p => p.role !== 'Komissar' && !p.knowsAsMafia);
  if (unknownTargets.length > 0) {
    const target = unknownTargets[Math.floor(Math.random() * unknownTargets.length)];
    return { target, action: Math.random() < 0.6 ? 'check' : 'kill' };
  }
  return null;
};

const getBotVoteTarget = (bot, alivePlayers) => {
  const isMafia = bot.role === 'Mafia' || bot.role === 'Don';
  if (isMafia) {
    const knownCommissar = alivePlayers.find(p => p.role === 'Komissar' && p.id !== bot.id);
    if (knownCommissar && Math.random() < 0.6) return knownCommissar;
    const targets = alivePlayers.filter(p => p.role !== 'Mafia' && p.role !== 'Don' && p.id !== bot.id);
    return targets[Math.floor(Math.random() * targets.length)] || null;
  } else {
    const suspicious = alivePlayers.filter(p => p.id !== bot.id && p.votes > 0);
    if (suspicious.length > 0 && Math.random() < 0.5) return suspicious.sort((a,b) => b.votes - a.votes)[0];
    const targets = alivePlayers.filter(p => p.id !== bot.id);
    return targets[Math.floor(Math.random() * targets.length)] || null;
  }
};

const getBotChatMessage = (bot, isDay, userMessage = null) => {
  const roleData = CHAT_DATA.roles[bot.role];
  if (!roleData) return null;
  if (userMessage) {
    const greetWords = ['salom', 'aloha', 'hey', 'hi', 'assalom', 'xayr', 'yaxshi', 'hello'];
    const isGreeting = greetWords.some(w => userMessage.toLowerCase().includes(w));
    if (isGreeting) return CHAT_DATA.greetings[Math.floor(Math.random() * CHAT_DATA.greetings.length)];
    const reactions = [...CHAT_DATA.reactions.agree, ...CHAT_DATA.reactions.neutral, ...CHAT_DATA.reactions.disagree];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }
  if (isDay && roleData.day) return roleData.day[Math.floor(Math.random() * roleData.day.length)];
  return null;
};

const useGameStore = create((set, get) => ({
  gameState: 'lobby',
  isDay: true,
  timeLeft: 45,
  dayCount: 1,
  players: [],
  userRole: null,
  selectedVote: null,
  hasVoted: false,
  isTimerPaused: false,
  announcement: '',
  logs: [],
  nightActionTarget: null,
  hasDoctorHealedSelf: false,
  gameResult: null,
  protectedId: null,
  sheriffUsedAction: false,
  activeRole: null,
  floatingEmojis: [],

  // ===== FLOATING EMOJI =====
  spawnEmoji: (emoji, x, y) => {
    const id = Date.now() + Math.random();
    const ex = x !== undefined ? x : Math.random() * 75 + 10;
    const ey = y !== undefined ? y : Math.random() * 65 + 10;
    set(state => ({ floatingEmojis: [...state.floatingEmojis, { id, emoji, x: ex, y: ey }] }));
    setTimeout(() => {
      set(state => ({ floatingEmojis: state.floatingEmojis.filter(e => e.id !== id) }));
    }, 2400);
  },

  spawnRandomEmoji: () => {
    const { isDay } = get();
    const list = isDay ? FLOATING_EMOJIS.day : FLOATING_EMOJIS.night;
    const emoji = list[Math.floor(Math.random() * list.length)];
    get().spawnEmoji(emoji);
  },

  // ===== INIT =====
  initGame: (activeRoleOverride = null) => {
    const rolesPool = ['Don', 'Mafia', 'Komissar', 'Shifokor', 'Aholi', 'Aholi', 'Aholi', 'Aholi']
      .sort(() => Math.random() - 0.5);
    let finalRoles = [...rolesPool];
    if (activeRoleOverride && activeRoleOverride !== 'none') {
      const ar = activeRoleOverride.charAt(0).toUpperCase() + activeRoleOverride.slice(1);
      const idx = finalRoles.indexOf(ar);
      if (idx !== -1) { finalRoles.splice(idx, 1); finalRoles.unshift(ar); }
    }
    const initialPlayers = NAMES.map((name, i) => ({
      id: i + 1, name, role: finalRoles[i],
      isAlive: true, isUser: i === 0,
      votes: 0, knowsAsMafia: false, pendingDeath: false
    }));

    set({
      players: initialPlayers, userRole: initialPlayers[0].role,
      activeRole: activeRoleOverride, gameState: 'playing',
      isDay: true, dayCount: 1, timeLeft: 45,
      logs: [{ id: Date.now(), user: 'Sistema', text: "🎭 O'yin boshlandi! 1-kun — Muhokama vaqti." }],
      announcement: '', hasDoctorHealedSelf: false, gameResult: null,
      nightActionTarget: null, protectedId: null,
      isTimerPaused: false, sheriffUsedAction: false,
      selectedVote: null, hasVoted: false, floatingEmojis: [],
    });

    setTimeout(() => get().spawnEmoji('🎭', 50, 50), 200);
    setTimeout(() => get().spawnEmoji('🎲', 30, 35), 500);
    setTimeout(() => get().spawnEmoji('🃏', 70, 30), 800);

    get()._scheduleBotChats();
  },

  // ===== BOT CHAT SCHEDULER =====
  _scheduleBotChats: () => {
    const scheduleNext = () => {
      const delay = 9000 + Math.random() * 13000;
      setTimeout(() => {
        const { gameState, isDay, players } = get();
        if (gameState !== 'playing') return;
        if (!isDay) { scheduleNext(); return; }
        const aliveBots = players.filter(p => !p.isUser && p.isAlive);
        if (aliveBots.length === 0) return;
        const bot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
        const msg = getBotChatMessage(bot, true);
        if (msg) { get().addLog(bot.name, msg); get().spawnRandomEmoji(); }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  },

  // ===== USER MESSAGE =====
  sendUserMessage: (text) => {
    if (!text.trim()) return;
    const { players, isDay, gameState } = get();
    const user = players.find(p => p.isUser);
    if (!user?.isAlive || gameState !== 'playing') return;
    get().addLog(user.name + ' (SIZ)', text);
    get().spawnRandomEmoji();
    const aliveBots = players.filter(p => !p.isUser && p.isAlive);
    const respondCount = Math.min(Math.floor(Math.random() * 3) + 1, aliveBots.length);
    const respondBots = [...aliveBots].sort(() => Math.random() - 0.5).slice(0, respondCount);
    respondBots.forEach((bot, i) => {
      setTimeout(() => {
        const msg = getBotChatMessage(bot, isDay, text);
        if (msg) get().addLog(bot.name, msg);
      }, (i + 1) * (1000 + Math.random() * 1500));
    });
  },

  // ===== TIMER =====
  tick: () => {
    const { timeLeft, gameState, isTimerPaused } = get();
    if (gameState === 'playing' && !isTimerPaused) {
      if (timeLeft <= 0) get().handlePhaseChange();
      else {
        set({ timeLeft: timeLeft - 1 });
        if (Math.random() < 0.07) get().spawnRandomEmoji();
      }
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
    if (isTimerPaused || !user?.isAlive || gameState !== 'playing') return;
    const target = players.find(p => p.id === targetId);
    if (!target || !target.isAlive) return;

    if (isDay) {
      if (targetId === user.id || hasVoted) return;
      const { selectedVote } = get();
      set(state => ({
        selectedVote: targetId, hasVoted: true,
        players: state.players.map(p => {
          if (p.id === targetId) return { ...p, votes: p.votes + 1 };
          if (p.id === selectedVote) return { ...p, votes: Math.max(0, p.votes - 1) };
          return p;
        })
      }));
      get().addLog('Sistema', `🗳️ ${user.name} → ${target.name}ga ovoz berdi`);
      get().spawnEmoji('🗳️');
    } else {
      if (userRole === 'Mafia' || userRole === 'Don') {
        if (target.role === 'Mafia' || target.role === 'Don') return;
      }
      set({ nightActionTarget: targetId });
      get().addLog('Sistema', `🎯 Nishon: ${target.name}`);
      get().spawnEmoji('🎯');
    }
  },

  // ===== KOMISSAR =====
  executeSheriffAction: (type) => {
    const { nightActionTarget, players, sheriffUsedAction } = get();
    if (!nightActionTarget || sheriffUsedAction) return;
    const target = players.find(p => p.id === nightActionTarget);
    if (!target) return;

    if (type === 'check') {
      const isMafia = target.role === 'Mafia' || target.role === 'Don';
      get().addLog('Komissar', `🔍 ${target.name} tekshirildi: ${isMafia ? '🔴 MAFIA!' : '🟢 Tinch aholi'}`);
      get().addLog('Sistema', `🔍 Komissar ${target.name}ni tekshirdi`);
      get().spawnEmoji(isMafia ? '🔴' : '🟢');
      if (isMafia) {
        set(state => ({ players: state.players.map(p => p.id === target.id ? { ...p, knowsAsMafia: true } : p) }));
      }
    } else {
      set(state => ({ players: state.players.map(p => p.id === target.id ? { ...p, pendingDeath: true } : p) }));
      get().addLog('Komissar', `🔫 ${target.name} nishonga olindi!`);
      get().addLog('Sistema', `💥 Komissar ${target.name}ni nishonga oldi`);
      get().spawnEmoji('🔫');
    }
    set({ sheriffUsedAction: true, nightActionTarget: null, timeLeft: 0 });
  },

  // ===== SHIFOKOR =====
  executeDoctorAction: () => {
    const { nightActionTarget, players, hasDoctorHealedSelf } = get();
    if (!nightActionTarget) return;
    const target = players.find(p => p.id === nightActionTarget);
    if (!target) return;
    if (target.isUser && hasDoctorHealedSelf) {
      get().addLog('Sistema', "⚠️ O'zingizni bir martadan ortiq davolay olmaysiz!");
      return;
    }
    if (target.isUser) set({ hasDoctorHealedSelf: true });
    set({ protectedId: target.id, nightActionTarget: null, timeLeft: 0 });
    get().addLog('Shifokor', `💉 ${target.name} davolandi va himoyalandi ✅`);
    get().addLog('Sistema', `🛡️ Shifokor ${target.name}ni himoyaladi`);
    get().spawnEmoji('💉');
  },

  // ===== VOTING RESULT =====
  calculateVotingResult: () => {
    get().simulateBotVotes();
    setTimeout(() => {
      const alivePlayers = get().players.filter(p => p.isAlive);
      const sorted = [...alivePlayers].sort((a, b) => b.votes - a.votes);
      const top = sorted[0]; const second = sorted[1];
      const target = (top?.votes > 0 && (!second || top.votes !== second.votes)) ? top : null;

      if (target) {
        set({ announcement: `Shahar qarori: ${target.name} (${target.role}) chetlatildi! 🏛️` });
        get().killPlayer(target.id);
        get().addLog('Sistema', `🏛️ Aholi qarori: ${target.name} (${target.role}) chetlatildi`);
        get().spawnEmoji('🏛️'); get().spawnEmoji('⚖️');
      } else {
        set({ announcement: "Tenglik — hech kim chetlatilmadi 🤝" });
        get().addLog('Sistema', "🤝 Tenglik — hech kim chetlatilmadi");
        get().spawnEmoji('🤝');
      }

      setTimeout(() => {
        if (!get().checkGameOver()) {
          get().resetVotes();
          set({ isDay: false, isTimerPaused: false, timeLeft: 30, announcement: '', sheriffUsedAction: false });
          get().addLog('Sistema', '🌙 Tun boshlandi... Shahar uxlayapti');
          get().spawnEmoji('🌙'); get().spawnEmoji('⭐');
          setTimeout(() => get()._executeBotNightActions(), 4000);
        }
      }, 2500);
    }, 1200);
  },

  // ===== BOT NIGHT ACTIONS =====
  _executeBotNightActions: () => {
    const { players, userRole, hasDoctorHealedSelf } = get();
    const isUserMafia = userRole === 'Mafia' || userRole === 'Don';
    const isUserKomissar = userRole === 'Komissar';
    const isUserDoctor = userRole === 'Shifokor';
    const alivePlayers = players.filter(p => p.isAlive);

    // Mafia boti
    if (!isUserMafia) {
      const mafiaBot = players.find(p => (p.role === 'Don' || p.role === 'Mafia') && p.isAlive && !p.isUser);
      if (mafiaBot) {
        const civilians = alivePlayers.filter(p => p.role !== 'Mafia' && p.role !== 'Don');
        const target = getMafiaNightTarget(civilians);
        if (target) {
          set(state => ({
            _botMafiaTargetId: target.id
          }));
          get().addLog('Sistema', `🌑 Mafia o'z nishonini tanladi...`);
          get().spawnEmoji('🌑');
        }
      }
    }

    // Shifokor boti
    if (!isUserDoctor) {
      const doctorBot = players.find(p => p.role === 'Shifokor' && p.isAlive && !p.isUser);
      if (doctorBot) {
        const healTarget = getDoctorHealTarget(alivePlayers, hasDoctorHealedSelf, doctorBot);
        if (healTarget) {
          const isSelf = doctorBot.id === healTarget.id;
          set({ protectedId: healTarget.id });
          if (isSelf && !hasDoctorHealedSelf) set({ hasDoctorHealedSelf: true });
          get().addLog('Sistema', `💉 Shifokor ${healTarget.name}ni himoyaladi`);
          get().spawnEmoji('💉');
        }
      }
    }

    // Komissar boti
    if (!isUserKomissar) {
      const kommBot = players.find(p => p.role === 'Komissar' && p.isAlive && !p.isUser);
      if (kommBot) {
        const action = getKomissarNightAction(alivePlayers);
        if (action) {
          if (action.action === 'check') {
            const isMafia = action.target.role === 'Mafia' || action.target.role === 'Don';
            get().addLog('Sistema', `🔍 Komissar ${action.target.name}ni tekshirdi: ${isMafia ? '🔴 MAFIA' : '🟢 Tinch'}`);
            get().spawnEmoji('🔍');
            if (isMafia) {
              set(state => ({ players: state.players.map(p => p.id === action.target.id ? { ...p, knowsAsMafia: true } : p) }));
            }
          } else {
            set(state => ({ players: state.players.map(p => p.id === action.target.id ? { ...p, pendingDeath: true } : p) }));
            get().addLog('Sistema', `🔫 Komissar ${action.target.name}ni nishonga oldi`);
            get().spawnEmoji('🔫');
          }
        }
      }
    }
  },

  // ===== NIGHT RESULT =====
  calculateNightResult: () => {
    const { players, protectedId, userRole, nightActionTarget } = get();
    let finalDeadId = null;
    const isUserMafia = userRole === 'Mafia' || userRole === 'Don';

    if (isUserMafia && nightActionTarget) {
      finalDeadId = nightActionTarget !== protectedId ? nightActionTarget : null;
    } else {
      const civilians = players.filter(p => p.isAlive && p.role !== 'Mafia' && p.role !== 'Don');
      const mafiaTarget = getMafiaNightTarget(civilians);
      if (mafiaTarget) finalDeadId = mafiaTarget.id !== protectedId ? mafiaTarget.id : null;
    }

    set({ announcement: "Tun o'tdi. Shahar uyg'onmoqda... 🌅" });
    get().spawnEmoji('🌅');

    setTimeout(() => {
      const currentPlayers = get().players;
      if (finalDeadId) {
        const victim = currentPlayers.find(p => p.id === finalDeadId);
        get().killPlayer(finalDeadId);
        get().addLog('Sistema', `🔪 Tunda ${victim?.name} (${victim?.role}) o'ldirildi!`);
        get().spawnEmoji('💀'); get().spawnEmoji('🩸');
      } else if (protectedId && finalDeadId === null) {
        const saved = currentPlayers.find(p => p.id === protectedId);
        if (saved) {
          get().addLog('Sistema', `🛡️ ${saved.name} shifokor tomonidan qutqarildi! Mafia hujumi bekor bo'ldi`);
          get().spawnEmoji('🛡️'); get().spawnEmoji('❤️');
        } else {
          get().addLog('Sistema', "😮 Tunda hech kim o'lmadi");
        }
      } else {
        get().addLog('Sistema', "😮 Tunda hech kim o'lmadi");
        get().spawnEmoji('😮');
      }

      const sheriffVictim = get().players.find(p => p.pendingDeath && p.isAlive);
      if (sheriffVictim) {
        get().killPlayer(sheriffVictim.id);
        get().addLog('Sistema', `⚖️ Komissar ${sheriffVictim.name}ni jazoladi! (${sheriffVictim.role})`);
        get().spawnEmoji('⚖️');
      }

      set(state => ({ players: state.players.map(p => ({ ...p, pendingDeath: false })), _botMafiaTargetId: null }));

      setTimeout(() => {
        if (!get().checkGameOver()) {
          get().resetVotes();
          const newDay = get().dayCount + 1;
          set({ isDay: true, isTimerPaused: false, timeLeft: 45, dayCount: newDay, protectedId: null, nightActionTarget: null, sheriffUsedAction: false, announcement: `${newDay}-kun boshlandi! ☀️` });
          get().addLog('Sistema', `☀️ ${newDay}-kun boshlandi! Muhokama vaqti.`);
          get().spawnEmoji('☀️');
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
      setTimeout(() => { get().spawnEmoji('🎉'); get().spawnEmoji('🏆'); get().spawnEmoji('🎊'); }, 200);
      get().saveGameResult('WIN');
      return true;
    }
    if (mafiaCount >= civilianCount) {
      set({ gameState: 'ended', gameResult: 'LOSE', announcement: "MAFIA G'ALABA QOZONDI! 💀", isTimerPaused: true });
      setTimeout(() => { get().spawnEmoji('💀'); get().spawnEmoji('😈'); }, 200);
      get().saveGameResult('LOSE');
      return true;
    }
    return false;
  },

  saveGameResult: async (result) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const { userRole } = get();
    const isMafia = userRole === 'Mafia' || userRole === 'Don';
    const won = (result === 'WIN' && !isMafia) || (result === 'LOSE' && isMafia);
    try {
      const faction = isMafia ? 'mafia' : 'aholi';
      const { runTransaction } = await import('firebase/database');
      await runTransaction(ref(database, `users/${currentUser.uid}/${faction}/${faction === 'mafia' ? 'mafia_all_game' : 'aholi_all_game'}`), c => (c||0)+1);
      if (won) await runTransaction(ref(database, `users/${currentUser.uid}/${faction}/wins`), c => (c||0)+1);
      if (userRole === 'Don')      await runTransaction(ref(database, `users/${currentUser.uid}/mafia/mafia_rollar/Don`), c => (c||0)+1);
      if (userRole === 'Mafia')    await runTransaction(ref(database, `users/${currentUser.uid}/mafia/mafia_rollar/Mafia`), c => (c||0)+1);
      if (userRole === 'Komissar') await runTransaction(ref(database, `users/${currentUser.uid}/aholi/rollar/kamissar`), c => (c||0)+1);
      if (userRole === 'Shifokor') await runTransaction(ref(database, `users/${currentUser.uid}/aholi/rollar/shifokor`), c => (c||0)+1);
      if (userRole === 'Aholi')    await runTransaction(ref(database, `users/${currentUser.uid}/aholi/rollar/tinchaholi`), c => (c||0)+1);
      const { activeRole } = get();
      const updates = {};
      if (activeRole && activeRole !== 'none') {
        await runTransaction(ref(database, `users/${currentUser.uid}/inventory/roles/${activeRole}`), c => Math.max(0, (c||0)-1));
        updates['/active_role'] = 'none';
      }
      if (Object.keys(updates).length > 0) await update(ref(database, `users/${currentUser.uid}`), updates);
    } catch (err) { console.error('saveGameResult error:', err); }
  },

  simulateBotVotes: () => {
    set(state => {
      const alivePlayers = state.players.filter(p => p.isAlive);
      const newPlayers = state.players.map(p => ({ ...p }));
      alivePlayers.forEach(bot => {
        if (!bot.isUser) {
          const target = getBotVoteTarget(bot, alivePlayers);
          if (target) {
            const idx = newPlayers.findIndex(p => p.id === target.id);
            if (idx !== -1) newPlayers[idx].votes += 1;
          }
        }
      });
      return { players: newPlayers };
    });
    const bots = get().players.filter(p => !p.isUser && p.isAlive).slice(0, 3);
    bots.forEach((bot, i) => {
      setTimeout(() => get().addLog('Sistema', `🗳️ ${bot.name} ovoz berdi`), i * 350);
    });
    get().spawnEmoji('🗳️');
  },

  killPlayer: (id) => set(state => ({ players: state.players.map(p => p.id === id ? { ...p, isAlive: false } : p) })),
  resetVotes: () => set(state => ({ players: state.players.map(p => ({ ...p, votes: 0 })), selectedVote: null, nightActionTarget: null, protectedId: null, hasVoted: false })),
  addLog: (user, text) => set(state => ({ logs: [...state.logs, { id: Date.now() + Math.random(), user, text }] })),
  toggleUI: (key) => set(state => ({ [key]: !state[key] })),
}));

export default useGameStore;
