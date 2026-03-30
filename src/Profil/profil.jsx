import React, { useEffect, useState, useRef } from "react";
import { auth, database, storage } from "../firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { ref, onValue, update, runTransaction } from "firebase/database";
import { useTranslation } from "react-i18next";
import "./profil.css";

const ROLE_INFO = {
  don:      { icon: "🕶️", color: "#e63946", desc: "Mafia boshlig'i. Tunda o'ldiradi." },
  mafia:    { icon: "🔫", color: "#6c5ce7", desc: "Tunda o'ldiradi." },
  kamissar: { icon: "🕵️", color: "#3498db", desc: "Tekshiradi yoki otadi." },
  shifokor: { icon: "💉", color: "#2ecc71", desc: "Himoyalaydi." },
};

const LOGOS = {
  mafia:    "https://img.icons8.com/ios-filled/100/6c5ce7/mafia.png",
  don:      "https://img.icons8.com/ios-filled/100/ff4757/security-configuration.png",
  citizen:  "https://img.icons8.com/ios-filled/100/2ecc71/person-male.png",
  kamissar: "https://img.icons8.com/ios-filled/100/3498db/police-badge.png",
  shifokor: "https://img.icons8.com/ios-filled/100/e67e22/medical-heart.png",
  coin:     "https://img.icons8.com/color/48/000000/gold-bars.png",
  star:     "https://img.icons8.com/fluency/48/000000/star--v1.png",
};

const Profile = () => {
  const [user, setUser]           = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading]     = useState(true);
  const [activating, setActivating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setLoading(false); return; }
    const userRef = ref(database, `users/${currentUser.uid}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        if (!data.inventory) data.inventory = { roles: {} };
        setUser({ ...data, uid: currentUser.uid });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Aktiv rolni tanlash — inventardan 1 dona kamayadi emas (faqat belgilash)
  const activateRole = async (roleName) => {
    if (activating) return;
    const roleCount = user.inventory?.roles?.[roleName] || 0;
    if (roleCount <= 0) { alert("Sizda bu roldan mavjud emas. Do'kondan sotib oling!"); return; }
    
    setActivating(true);
    try {
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      // Agar allaqachon tanlangan bo'lsa — o'chirish (toggle)
      const newRole = user.active_role === roleName ? "none" : roleName;
      await update(userRef, { active_role: newRole });
      alert(newRole === "none" 
        ? "Aktiv rol bekor qilindi." 
        : `${roleName.toUpperCase()} roli keyingi o'yin uchun tanlandi! ✅`);
    } catch (err) {
      console.error("activateRole error:", err);
    }
    setActivating(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) { alert("Rasm 3MB dan katta bo\'lmasin!"); return; }
    setUploadingAvatar(true);
    try {
      const sRef = storageRef(storage, `avatars/${user.uid}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      await update(ref(database, `users/${user.uid}`), { image: url, "quests/q_profile_img/progress": 1 });
      alert("Profil rasmi yangilandi! ✅");
    } catch (err) {
      alert("Xato: " + err.message);
    }
    setUploadingAvatar(false);
  };

  if (loading) return <div className="P_loading_screen">IDENTIFYING AGENT...</div>;
  if (!user)   return <div className="P_loading_screen">NO AGENT LOGGED IN</div>;

  const totalGames = (user.aholi?.aholi_all_game || 0) + (user.mafia?.mafia_all_game || 0);
  const totalWins  = (user.aholi?.wins || 0) + (user.mafia?.wins || 0);
  const winRate    = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0;

  return (
    <div className="P_gaming_ui_wrapper">
      {/* HEADER */}
      <header className="P_main_header_bar">
        <div className="P_user_identity">
          <div className="P_avatar_container" style={{position:'relative', cursor:'pointer'}} onClick={() => fileInputRef.current?.click()}>
            <img src={user.image || "/avatars/default.jpg"} alt="Profile" className="P_avatar_img" />
            <div style={{position:'absolute',bottom:4,right:4,background:'rgba(0,0,0,0.75)',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',border:'1px solid rgba(255,255,255,0.3)'}}>✏️</div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload} />
            {uploadingAvatar && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',color:'#81c784'}}>⏳</div>}
          </div>
          <div className={`P_vip_badge P_vip_${user.vip?.toLowerCase()}`}>{user.vip || "None"}</div>
          <div className="P_user_text">
            <h1 className="P_display_name">{user.username}</h1>
            <div className="P_sub_details">
              <span>ID: #{user.uid?.slice(0, 6)}</span>
              <span className="P_divider">|</span>
              <span style={{ color: user.active_role && user.active_role !== "none" ? "#81c784" : "cyan" }}>
                {user.active_role && user.active_role !== "none"
                  ? `🎭 Aktiv: ${user.active_role.toUpperCase()}`
                  : "Rol tanlanmagan"}
              </span>
            </div>
          </div>
        </div>
        <div className="P_currency_group">
          <div className="P_currency_item">
            <img src={LOGOS.coin} alt="Coins" />
            <div className="P_val_box">
              <span className="P_val_text">{(user.coins || 0).toLocaleString()}</span>
              <small>Tanga</small>
            </div>
          </div>
          <div className="P_currency_item">
            <img src={LOGOS.star} alt="Stars" />
            <div className="P_val_box">
              <span className="P_val_text">{user.stars || 0}</span>
              <small>Yulduz</small>
            </div>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="P_side_nav">
        {["all","inventory","mafia","aholi"].map(tab => (
          <button key={tab}
            className={activeTab === tab ? "P_btn_active" : ""}
            onClick={() => setActiveTab(tab)}>
            {tab === "all" ? "DASHBOARD" : tab === "inventory" ? "INVENTAR" : tab === "mafia" ? "SYNDICATE" : "DEFENSE"}
          </button>
        ))}
      </nav>

      <div className="P_content_area">

        {/* DASHBOARD */}
        {activeTab === "all" && (
          <div className="P_view_fade">
            <div className="P_stats_grid">
              <div className="P_hero_card">
                <div className="P_card_tag">{t("winrate") || "WIN RATE"}</div>
                <div className="P_big_stat">{winRate}%</div>
                <div className="P_progress_bg">
                  <div className="P_progress_fill" style={{ width: `${winRate}%` }} />
                </div>
              </div>
              <div className="P_hero_card">
                <div className="P_card_tag">AKTIV ROL</div>
                <div className="P_big_stat" style={{ fontSize: "1.4rem", color: user.active_role && user.active_role !== "none" ? "#81c784" : "rgba(255,255,255,0.4)" }}>
                  {user.active_role && user.active_role !== "none" ? user.active_role.toUpperCase() : "YO'Q"}
                </div>
                {user.active_role && user.active_role !== "none" && (
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>
                    Keyingi o'yinda ishlatiladi
                  </p>
                )}
              </div>
              <div className="P_hero_card">
                <div className="P_card_tag">{t("total_ops") || "JAMI O'YINLAR"}</div>
                <div className="P_big_stat">{totalGames}</div>
              </div>
              <div className="P_hero_card">
                <div className="P_card_tag">G'ALABALAR</div>
                <div className="P_big_stat" style={{ color: "#4caf50" }}>{totalWins}</div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTAR */}
        {activeTab === "inventory" && (
          <div className="P_view_fade">
            <h2 className="P_section_title">🎭 Sizdagi Rollar (1 martalik)</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Rol tanlanganda o'yin boshida o'sha rol sizga beriladi. Har o'yinda 1 dona sarflanadi.
            </p>
            <div className="P_roles_grid_compact">
              {["don","mafia","kamissar","shifokor"].map((roleKey) => {
                const count    = user.inventory?.roles?.[roleKey] || 0;
                const isActive = user.active_role === roleKey;
                const info     = ROLE_INFO[roleKey];
                return (
                  <div key={roleKey} className={`P_mini_card ${isActive ? "P_active_border" : ""} ${count === 0 ? "P_empty_card" : ""}`}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{info.icon}</div>
                    <h4 style={{ color: info.color, margin: "0 0 4px" }}>{roleKey.toUpperCase()}</h4>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", margin: "0 0 8px", textAlign: "center" }}>
                      {info.desc}
                    </p>
                    <div className="P_inv_count" style={{ color: count > 0 ? "#f9c74f" : "rgba(255,255,255,0.3)" }}>
                      {count > 0 ? `${count} dona` : "Mavjud emas"}
                    </div>
                    <button
                      className={`P_activate_btn ${isActive ? "P_active_btn" : ""}`}
                      onClick={() => activateRole(roleKey)}
                      disabled={count === 0 || activating}
                    >
                      {isActive ? "✓ TANLANGAN" : count === 0 ? "Mavjud emas" : "TANLASH"}
                    </button>
                  </div>
                );
              })}
            </div>

            {user.active_role && user.active_role !== "none" && (
              <div style={{ marginTop: "20px", background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.3)", borderRadius: "8px", padding: "12px 16px", color: "#81c784" }}>
                ✅ Keyingi o'yinizda <strong>{user.active_role.toUpperCase()}</strong> roli sizga beriladi.
                <br />
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>O'yin tugagach inventardan 1 dona kamayadi.</span>
              </div>
            )}
          </div>
        )}

        {/* MAFIA STATS */}
        {activeTab === "mafia" && (
          <div className="P_view_fade">
            <div className="P_faction_banner P_theme_mafia">
              <img src={LOGOS.mafia} alt="Mafia" className="P_faction_icon" />
              <div className="P_faction_info">
                <h2>MAFIA SINDIKAT</h2>
                <p>Qorong'u tomonning statistikasi</p>
              </div>
              <div className="P_win_count">G'alaba: {user.mafia?.wins || 0}</div>
            </div>
            <div className="P_roles_list">
              <div className="P_role_card">
                <img src={LOGOS.don} alt="Don" />
                <div className="P_role_detail">
                  <span className="P_role_title">Don</span>
                  <span className="P_role_played">{user.mafia?.mafia_rollar?.Don || 0} o'yin</span>
                </div>
              </div>
              <div className="P_role_card">
                <img src={LOGOS.mafia} alt="Mafia" />
                <div className="P_role_detail">
                  <span className="P_role_title">Mafia</span>
                  <span className="P_role_played">{user.mafia?.mafia_rollar?.Mafia || 0} o'yin</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="P_hero_card" style={{ padding: "16px" }}>
                <div className="P_card_tag">Jami o'yinlar</div>
                <div className="P_big_stat" style={{ fontSize: "1.8rem" }}>{user.mafia?.mafia_all_game || 0}</div>
              </div>
              <div className="P_hero_card" style={{ padding: "16px" }}>
                <div className="P_card_tag">Win rate</div>
                <div className="P_big_stat" style={{ fontSize: "1.8rem", color: "#4caf50" }}>
                  {user.mafia?.mafia_all_game > 0
                    ? ((user.mafia.wins / user.mafia.mafia_all_game) * 100).toFixed(0) + "%"
                    : "0%"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AHOLI STATS */}
        {activeTab === "aholi" && (
          <div className="P_view_fade">
            <div className="P_faction_banner" style={{ background: "linear-gradient(135deg,rgba(46,204,113,0.2),rgba(52,152,219,0.2))", borderColor: "rgba(46,204,113,0.3)" }}>
              <img src={LOGOS.citizen} alt="Citizen" className="P_faction_icon" />
              <div className="P_faction_info">
                <h2>MUDOFAA KUCHLARI</h2>
                <p>Tinch aholining statistikasi</p>
              </div>
              <div className="P_win_count" style={{ color: "#2ecc71" }}>G'alaba: {user.aholi?.wins || 0}</div>
            </div>
            <div className="P_roles_grid_compact" style={{ marginTop: "16px" }}>
              {[
                { key: "tinchaholi", icon: LOGOS.citizen,  label: "Aholi",    val: user.aholi?.rollar?.tinchaholi || 0 },
                { key: "kamissar",   icon: LOGOS.kamissar, label: "Komissar", val: user.aholi?.rollar?.kamissar   || 0 },
                { key: "shifokor",   icon: LOGOS.shifokor, label: "Shifokor", val: user.aholi?.rollar?.shifokor   || 0 },
              ].map(({ key, icon, label, val }) => (
                <div key={key} className="P_mini_card">
                  <img src={icon} alt={label} className="P_inv_img" />
                  <h4>{label}</h4>
                  <p>{val} o'yin</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="P_system_footer">
        <div className="P_sys_status"><span className="P_pulse_dot"></span> TIZIM ONLINE</div>
        <div className="P_version">v5.0.0_STABLE</div>
      </footer>
    </div>
  );
};

export default Profile;
