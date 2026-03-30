import React, { useEffect, useState } from 'react';
import { auth, database } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import './Quest.css';

// ============================================================
// QUEST TA'RIFLARI (80 ta)
// ============================================================
const QUESTS_DEF = [
  // ROL QUESTLARI
  { id:'q_mafia_win_1',     cat:'rol',   icon:'🔫', title:'Mafia sifatida yuting',        desc:'Mafia sifatida 1 marta g\'alaba qozonish',   target:1,  reward:{coins:200, stars:0} },
  { id:'q_mafia_win_3',     cat:'rol',   icon:'🔫', title:'Mafia ustasi',                  desc:'Mafia sifatida 3 marta g\'alaba qozonish',   target:3,  reward:{coins:400, stars:1} },
  { id:'q_mafia_win_5',     cat:'rol',   icon:'🔫', title:'Mafia generali',                desc:'Mafia sifatida 5 marta g\'alaba qozonish',   target:5,  reward:{coins:700, stars:2} },
  { id:'q_mafia_win_10',    cat:'rol',   icon:'🔫', title:'Mafia afsonasi',                desc:'Mafia sifatida 10 marta g\'alaba qozonish',  target:10, reward:{coins:1500,stars:5} },

  { id:'q_aholi_win_1',     cat:'rol',   icon:'👥', title:'Aholi sifatida yuting',         desc:'Aholi sifatida 1 marta g\'alaba qozonish',   target:1,  reward:{coins:150, stars:0} },
  { id:'q_aholi_win_3',     cat:'rol',   icon:'👥', title:'Xalq qahramoni',                desc:'Aholi sifatida 3 marta g\'alaba qozonish',   target:3,  reward:{coins:350, stars:1} },
  { id:'q_aholi_win_5',     cat:'rol',   icon:'👥', title:'Shahar himoyachisi',            desc:'Aholi sifatida 5 marta g\'alaba qozonish',   target:5,  reward:{coins:600, stars:2} },
  { id:'q_aholi_win_10',    cat:'rol',   icon:'👥', title:'El qo\'riqchisi',               desc:'Aholi sifatida 10 marta g\'alaba qozonish',  target:10, reward:{coins:1200,stars:4} },

  { id:'q_shifokor_win_1',  cat:'rol',   icon:'💉', title:'Shifokor sifatida yuting',      desc:'Shifokor sifatida 1 marta g\'alaba qozonish',target:1,  reward:{coins:200, stars:0} },
  { id:'q_shifokor_win_3',  cat:'rol',   icon:'💉', title:'Muolaja ustasi',                desc:'Shifokor sifatida 3 marta g\'alaba qozonish',target:3,  reward:{coins:450, stars:1} },
  { id:'q_shifokor_win_5',  cat:'rol',   icon:'💉', title:'Bosh shifokor',                 desc:'Shifokor sifatida 5 marta g\'alaba qozonish',target:5,  reward:{coins:800, stars:2} },
  { id:'q_shifokor_win_10', cat:'rol',   icon:'💉', title:'Hayot saqlovchi',               desc:'Shifokor sifatida 10 marta g\'alaba qozonish',target:10,reward:{coins:1500,stars:5} },

  { id:'q_komissar_win_1',  cat:'rol',   icon:'🕵️', title:'Komissar sifatida yuting',     desc:'Komissar sifatida 1 marta g\'alaba qozonish',target:1,  reward:{coins:200, stars:0} },
  { id:'q_komissar_win_3',  cat:'rol',   icon:'🕵️', title:'Detektiv',                     desc:'Komissar sifatida 3 marta g\'alaba qozonish',target:3,  reward:{coins:450, stars:1} },
  { id:'q_komissar_win_5',  cat:'rol',   icon:'🕵️', title:'Bosh komissar',                desc:'Komissar sifatida 5 marta g\'alaba qozonish',target:5,  reward:{coins:800, stars:2} },
  { id:'q_komissar_win_10', cat:'rol',   icon:'🕵️', title:'Super agent',                  desc:'Komissar sifatida 10 marta g\'alaba qozonish',target:10,reward:{coins:1500,stars:5} },

  { id:'q_don_win_1',       cat:'rol',   icon:'🕶️', title:'Don sifatida yuting',          desc:'Don sifatida 1 marta g\'alaba qozonish',     target:1,  reward:{coins:250, stars:1} },
  { id:'q_don_win_3',       cat:'rol',   icon:'🕶️', title:'Don ustasi',                   desc:'Don sifatida 3 marta g\'alaba qozonish',     target:3,  reward:{coins:500, stars:2} },
  { id:'q_don_win_5',       cat:'rol',   icon:'🕶️', title:'Don generali',                 desc:'Don sifatida 5 marta g\'alaba qozonish',     target:5,  reward:{coins:900, stars:3} },
  { id:'q_don_win_10',      cat:'rol',   icon:'🕶️', title:'Don afsonasi',                 desc:'Don sifatida 10 marta g\'alaba qozonish',    target:10, reward:{coins:2000,stars:6} },

  // MULTIPLAYER
  { id:'q_mp_play_1',       cat:'multi', icon:'🌐', title:'Birinchi online match',         desc:'1 ta multiplayer match o\'ynash',            target:1,  reward:{coins:300, stars:1} },
  { id:'q_mp_play_3',       cat:'multi', icon:'🌐', title:'Online o\'yinchi',              desc:'3 ta multiplayer match o\'ynash',            target:3,  reward:{coins:500, stars:1} },
  { id:'q_mp_play_5',       cat:'multi', icon:'🌐', title:'Tajribali online o\'yinchi',    desc:'5 ta multiplayer match o\'ynash',            target:5,  reward:{coins:800, stars:2} },
  { id:'q_mp_play_10',      cat:'multi', icon:'🌐', title:'Online chempion',               desc:'10 ta multiplayer match o\'ynash',           target:10, reward:{coins:1500,stars:4} },
  { id:'q_mp_win_1',        cat:'multi', icon:'🏆', title:'Online g\'alaba',               desc:'Multiplayer da 1 marta g\'alaba qozonish',   target:1,  reward:{coins:400, stars:2} },
  { id:'q_mp_win_5',        cat:'multi', icon:'🏆', title:'Online g\'olib',                desc:'Multiplayer da 5 marta g\'alaba qozonish',   target:5,  reward:{coins:1000,stars:4} },
  { id:'q_mp_win_10',       cat:'multi', icon:'🏆', title:'Online master',                 desc:'Multiplayer da 10 marta g\'alaba qozonish',  target:10, reward:{coins:2000,stars:6} },

  // SINGLEPLAYER
  { id:'q_sp_play_1',       cat:'single',icon:'🤖', title:'Birinchi AI match',             desc:'1 ta singleplayer match o\'ynash',           target:1,  reward:{coins:150, stars:0} },
  { id:'q_sp_play_3',       cat:'single',icon:'🤖', title:'AI o\'yinchi',                  desc:'3 ta singleplayer match o\'ynash',           target:3,  reward:{coins:300, stars:1} },
  { id:'q_sp_play_5',       cat:'single',icon:'🤖', title:'AI veteran',                    desc:'5 ta singleplayer match o\'ynash',           target:5,  reward:{coins:500, stars:1} },
  { id:'q_sp_play_10',      cat:'single',icon:'🤖', title:'AI ustasi',                     desc:'10 ta singleplayer match o\'ynash',          target:10, reward:{coins:1000,stars:3} },
  { id:'q_sp_win_1',        cat:'single',icon:'🎯', title:'AI ni yengish',                 desc:'Singleplayer da 1 marta g\'alaba qozonish',  target:1,  reward:{coins:200, stars:1} },
  { id:'q_sp_win_5',        cat:'single',icon:'🎯', title:'AI qotili',                     desc:'Singleplayer da 5 marta g\'alaba qozonish',  target:5,  reward:{coins:700, stars:2} },
  { id:'q_sp_win_10',       cat:'single',icon:'🎯', title:'AI hukmdori',                   desc:'Singleplayer da 10 marta g\'alaba qozonish', target:10, reward:{coins:1500,stars:4} },

  // MATCH SONI
  { id:'q_total_1',         cat:'match', icon:'▶️', title:'Birinchi qadam',                desc:'Jami 1 ta match o\'ynash',                   target:1,  reward:{coins:100, stars:0} },
  { id:'q_total_3',         cat:'match', icon:'▶️', title:'O\'yin zavqi',                  desc:'Jami 3 ta match o\'ynash',                   target:3,  reward:{coins:200, stars:0} },
  { id:'q_total_5',         cat:'match', icon:'▶️', title:'Boshlang\'ich o\'yinchi',       desc:'Jami 5 ta match o\'ynash',                   target:5,  reward:{coins:350, stars:1} },
  { id:'q_total_10',        cat:'match', icon:'▶️', title:'O\'rta darajali',               desc:'Jami 10 ta match o\'ynash',                  target:10, reward:{coins:600, stars:1} },
  { id:'q_total_20',        cat:'match', icon:'▶️', title:'Tajribali o\'yinchi',           desc:'Jami 20 ta match o\'ynash',                  target:20, reward:{coins:1000,stars:2} },
  { id:'q_total_50',        cat:'match', icon:'▶️', title:'Veteran',                       desc:'Jami 50 ta match o\'ynash',                  target:50, reward:{coins:2000,stars:5} },
  { id:'q_total_100',       cat:'match', icon:'▶️', title:'Afsonviy o\'yinchi',            desc:'Jami 100 ta match o\'ynash',                 target:100,reward:{coins:5000,stars:10} },

  // BARABAN (spin)
  { id:'q_spin_1',          cat:'shop',  icon:'🎰', title:'Birinchi aylanish',             desc:'Baraban 1 marta aylantirish',                target:1,  reward:{coins:100, stars:0} },
  { id:'q_spin_5',          cat:'shop',  icon:'🎰', title:'Baraban sevuvchi',              desc:'Baraban 5 marta aylantirish',                target:5,  reward:{coins:300, stars:1} },
  { id:'q_spin_10',         cat:'shop',  icon:'🎰', title:'Baxt izlovchi',                 desc:'Baraban 10 marta aylantirish',               target:10, reward:{coins:600, stars:2} },
  { id:'q_spin_20',         cat:'shop',  icon:'🎰', title:'Baraban ustasi',                desc:'Baraban 20 marta aylantirish',               target:20, reward:{coins:1000,stars:3} },

  // VIP
  { id:'q_vip_buy',         cat:'shop',  icon:'👑', title:'VIP sotib olish',               desc:'Biror VIP statusini sotib olish',            target:1,  reward:{coins:500, stars:2} },

  // STATUS
  { id:'q_coins_500',       cat:'stat',  icon:'🪙', title:'Boylik to\'plash',              desc:'500 tanga to\'plash',                        target:500,  reward:{coins:100, stars:0} },
  { id:'q_coins_2000',      cat:'stat',  icon:'🪙', title:'Katta boylik',                  desc:'2000 tanga to\'plash',                       target:2000, reward:{coins:300, stars:1} },
  { id:'q_coins_5000',      cat:'stat',  icon:'🪙', title:'Badavlat o\'yinchi',            desc:'5000 tanga to\'plash',                       target:5000, reward:{coins:500, stars:2} },
  { id:'q_stars_5',         cat:'stat',  icon:'⭐', title:'Yulduz to\'plash',              desc:'5 yulduz to\'plash',                         target:5,    reward:{coins:200, stars:0} },
  { id:'q_stars_20',        cat:'stat',  icon:'⭐', title:'Yulduz yig\'uvchi',             desc:'20 yulduz to\'plash',                        target:20,   reward:{coins:500, stars:0} },

  // QO'SHIMCHA
  { id:'q_profile_img',     cat:'extra', icon:'📸', title:'Profil rasmi qo\'yish',         desc:'Profil rasmini o\'zgartirish',               target:1,  reward:{coins:150, stars:1} },
  { id:'q_google_login',    cat:'extra', icon:'🔑', title:'Google bilan kirish',           desc:'Google akkaunti orqali kirish',              target:1,  reward:{coins:200, stars:1} },
  { id:'q_night_mode',      cat:'extra', icon:'🌙', title:'Tungi rejim',                   desc:'Tungi rejimni yoqish',                       target:1,  reward:{coins:50,  stars:0} },
  { id:'q_win_streak_3',    cat:'extra', icon:'🔥', title:'G\'alabalar ketma-ket',         desc:'3 ta ketma-ket match yutish',                target:3,  reward:{coins:800, stars:3} },
  { id:'q_bot_add',         cat:'extra', icon:'🤖', title:'Bot qo\'shish',                 desc:'Xonaga bot qo\'shish',                       target:1,  reward:{coins:100, stars:0} },

  // EXTRA MATCH QUESTLARI (jami 80 ga yetkazish uchun)
  { id:'q_mp_mafia_1',      cat:'multi', icon:'🔫', title:'Online Mafia',                  desc:'Multiplayerda Mafia sifatida 1 g\'alaba',    target:1,  reward:{coins:300, stars:1} },
  { id:'q_mp_don_1',        cat:'multi', icon:'🕶️', title:'Online Don',                   desc:'Multiplayerda Don sifatida 1 g\'alaba',      target:1,  reward:{coins:350, stars:1} },
  { id:'q_mp_shifokor_1',   cat:'multi', icon:'💉', title:'Online Shifokor',               desc:'Multiplayerda Shifokor sifatida 1 g\'alaba', target:1,  reward:{coins:300, stars:1} },
  { id:'q_mp_komissar_1',   cat:'multi', icon:'🕵️', title:'Online Komissar',              desc:'Multiplayerda Komissar sifatida 1 g\'alaba', target:1,  reward:{coins:300, stars:1} },
  { id:'q_mp_aholi_1',      cat:'multi', icon:'👥', title:'Online Aholi',                  desc:'Multiplayerda Aholi sifatida 1 g\'alaba',    target:1,  reward:{coins:250, stars:1} },

  { id:'q_sp_mafia_win_3',  cat:'single',icon:'🔫', title:'SP Mafia 3x',                   desc:'Singleplayerda Mafia sifatida 3 g\'alaba',   target:3,  reward:{coins:400, stars:1} },
  { id:'q_sp_don_win_3',    cat:'single',icon:'🕶️', title:'SP Don 3x',                    desc:'Singleplayerda Don sifatida 3 g\'alaba',     target:3,  reward:{coins:450, stars:1} },
  { id:'q_sp_shifokor_3',   cat:'single',icon:'💉', title:'SP Shifokor 3x',                desc:'Singleplayerda Shifokor sifatida 3 g\'alaba',target:3,  reward:{coins:400, stars:1} },
  { id:'q_sp_komissar_3',   cat:'single',icon:'🕵️', title:'SP Komissar 3x',               desc:'Singleplayerda Komissar sifatida 3 g\'alaba',target:3,  reward:{coins:400, stars:1} },

  { id:'q_total_30',        cat:'match', icon:'▶️', title:'30 ta match',                   desc:'Jami 30 ta match o\'ynash',                  target:30, reward:{coins:1200,stars:3} },
  { id:'q_total_75',        cat:'match', icon:'▶️', title:'75 ta match',                   desc:'Jami 75 ta match o\'ynash',                  target:75, reward:{coins:3000,stars:7} },

  { id:'q_win_total_5',     cat:'extra', icon:'🏅', title:'5 ta g\'alaba',                 desc:'Jami (single+multi) 5 marta g\'alaba',       target:5,  reward:{coins:500, stars:2} },
  { id:'q_win_total_20',    cat:'extra', icon:'🥇', title:'20 ta g\'alaba',                desc:'Jami (single+multi) 20 marta g\'alaba',      target:20, reward:{coins:1500,stars:5} },
  { id:'q_win_total_50',    cat:'extra', icon:'🏆', title:'50 ta g\'alaba',                desc:'Jami (single+multi) 50 marta g\'alaba',      target:50, reward:{coins:3000,stars:8} },

  { id:'q_spin_30',         cat:'shop',  icon:'🎰', title:'Baraban 30x',                   desc:'Baraban 30 marta aylantirish',               target:30, reward:{coins:2000,stars:5} },
  { id:'q_coins_10000',     cat:'stat',  icon:'🪙', title:'10000 tanga',                   desc:'10000 tanga to\'plash',                      target:10000,reward:{coins:1000,stars:3}},
  { id:'q_stars_50',        cat:'stat',  icon:'⭐', title:'50 yulduz',                     desc:'50 yulduz to\'plash',                        target:50,  reward:{coins:1000,stars:0}},
  { id:'q_win_streak_5',    cat:'extra', icon:'🔥', title:'5 ta ketma-ket g\'alaba',       desc:'5 ta ketma-ket match yutish',                target:5,  reward:{coins:1500,stars:5} },
  { id:'q_win_streak_10',   cat:'extra', icon:'🔥', title:'10 ta ketma-ket g\'alaba',      desc:'10 ta ketma-ket match yutish',               target:10, reward:{coins:3000,stars:8} },
  { id:'q_buy_role_any',    cat:'shop',  icon:'🛒', title:'Rol sotib olish',               desc:'Istalgan roldan 1 ta sotib olish',           target:1,  reward:{coins:100, stars:0} },
  { id:'q_buy_role_5',      cat:'shop',  icon:'🛒', title:'5 ta rol',                      desc:'Jami 5 ta rol sotib olish',                  target:5,  reward:{coins:300, stars:1} },
  { id:'q_buy_role_20',     cat:'shop',  icon:'🛒', title:'20 ta rol',                     desc:'Jami 20 ta rol sotib olish',                 target:20, reward:{coins:800, stars:3} },
];

const CAT_LABELS = {
  all:    '📋 Hammasi',
  rol:    '🎭 Rollar',
  multi:  '🌐 Multiplayer',
  single: '🤖 Singleplayer',
  match:  '▶️ Match soni',
  shop:   '🛒 Do\'kon',
  stat:   '📊 Statistika',
  extra:  '⚡ Extra',
};

export default function Quest({ user }) {
  const [questData, setQuestData] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [claimMsg, setClaimMsg] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    const qRef = ref(database, `users/${user.uid}/quests`);
    const unsub = onValue(qRef, snap => {
      setQuestData(snap.exists() ? snap.val() : {});
    });
    return () => unsub();
  }, [user?.uid]);

  const getProgress = (q) => {
    const p = questData?.[q.id]?.progress || 0;
    return Math.min(p, q.target);
  };

  const isClaimed = (q) => questData?.[q.id]?.claimed === true;

  const claimReward = async (q) => {
    if (!user?.uid) return;
    const progress = getProgress(q);
    if (progress < q.target) return;
    if (isClaimed(q)) return;
    try {
      const updates = {};
      updates[`quests/${q.id}/claimed`] = true;
      updates['coins'] = (user.coins || 0) + q.reward.coins;
      if (q.reward.stars > 0) updates['stars'] = (user.stars || 0) + q.reward.stars;
      await update(ref(database, `users/${user.uid}`), updates);
      setClaimMsg(`✅ +${q.reward.coins}🪙 ${q.reward.stars > 0 ? '+'+q.reward.stars+'⭐' : ''} olindi!`);
      setTimeout(() => setClaimMsg(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = activeFilter === 'all'
    ? QUESTS_DEF
    : QUESTS_DEF.filter(q => q.cat === activeFilter);

  const totalQuests  = QUESTS_DEF.length;
  const doneCount    = QUESTS_DEF.filter(q => isClaimed(q)).length;
  const readyToClaim = QUESTS_DEF.filter(q => !isClaimed(q) && getProgress(q) >= q.target).length;

  return (
    <div className="quest_wrap">
      <div className="quest_header">
        <h2 className="quest_title">📋 QUESTLAR</h2>
        <div className="quest_stats_bar">
          <span>✅ Bajarilgan: {doneCount}/{totalQuests}</span>
          <span style={{ color:'#ffd700' }}>🎁 Olinishi mumkin: {readyToClaim}</span>
        </div>
        <div className="quest_progress_outer">
          <div className="quest_progress_inner" style={{ width: `${(doneCount/totalQuests)*100}%` }} />
        </div>
      </div>

      {claimMsg && <div className="quest_notify">{claimMsg}</div>}

      <div className="quest_filters">
        {Object.entries(CAT_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`quest_filter_btn ${activeFilter === key ? 'active' : ''}`}
            onClick={() => setActiveFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="quest_list">
        {filtered.map(q => {
          const progress = getProgress(q);
          const claimed  = isClaimed(q);
          const canClaim = progress >= q.target && !claimed;
          const pct      = Math.min((progress / q.target) * 100, 100);

          return (
            <div key={q.id} className={`quest_card ${claimed ? 'claimed' : canClaim ? 'ready' : ''}`}>
              <div className="quest_icon">{q.icon}</div>
              <div className="quest_info">
                <div className="quest_name">{q.title}</div>
                <div className="quest_desc">{q.desc}</div>
                <div className="quest_bar_wrap">
                  <div className="quest_bar_fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="quest_count">{progress} / {q.target}</div>
              </div>
              <div className="quest_right">
                <div className="quest_reward">
                  {q.reward.coins > 0 && <span>🪙{q.reward.coins}</span>}
                  {q.reward.stars > 0 && <span>⭐{q.reward.stars}</span>}
                </div>
                {claimed ? (
                  <div className="quest_done_badge">✓ OLINDI</div>
                ) : canClaim ? (
                  <button className="quest_claim_btn" onClick={() => claimReward(q)}>
                    🎁 Olish
                  </button>
                ) : (
                  <div className="quest_locked_badge">🔒</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
