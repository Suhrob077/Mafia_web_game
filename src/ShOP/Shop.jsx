import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, database } from "../firebase";
import { ref, onValue, update, runTransaction, get } from "firebase/database";
import './Shop.css';

// FIX: user prop qabul qilindi (App.jsx dan uzatiladi)
const Shop = ({ user: userProp }) => {
  const { t } = useTranslation();
  const [isSpinning, setIsSpinning]   = useState(false);
  const [userData, setUserData]       = useState({ coins: 0, stars: 0, inventory: { roles: {} }, vip: 'None' });
  const [showPrize, setShowPrize]     = useState(null);
  const [notification, setNotification] = useState('');

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const userRef = ref(database, `users/${currentUser.uid}`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.val());
    });
    return () => unsub();
  }, []);

  const handlePurchase = async (price, type, itemId, options = {}) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return notify('Avval tizimga kiring!');

    if (type === 'coin' && (userData.coins || 0) < price)
      return notify(`Yetarli tanga yo'q! Kerak: ${price} 🪙`);
    if (type === 'star' && (userData.stars || 0) < price)
      return notify(`Yetarli yulduz yo'q! Kerak: ${price} ⭐`);

    try {
      const userRef = ref(database, `users/${currentUser.uid}`);
      const updates = {};

      if (type === 'coin') updates['/coins'] = (userData.coins || 0) - price;
      else if (type === 'star') updates['/stars'] = (userData.stars || 0) - price;

      if (options.isRole) { trackShopQuest('q_buy_role_any'); trackShopQuest('q_buy_role_5'); trackShopQuest('q_buy_role_20'); const current = userData.inventory?.roles?.[itemId] || 0; updates[`/inventory/roles/${itemId}`] = current + (options.count || 1); }
      if (options.isStatus) { updates['/vip'] = options.statusName; trackShopQuest('q_vip_buy'); }
      if (itemId === 'ex_star') updates['/stars'] = (userData.stars || 0) + 5;
      if (itemId === 'ex_coin') updates['/coins'] = (userData.coins || 0) + 2500;
      if (options.customUpdate) Object.assign(updates, options.customUpdate);

      await update(userRef, updates);
      if (!options.silent) notify('✅ Xarid muvaffaqiyatli!');
    } catch (err) {
      console.error('Purchase error:', err);
      notify('❌ Xatolik yuz berdi');
    }
  };

  const trackShopQuest = async (questId, inc=1) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await get(ref(database, `users/${uid}/quests/${questId}`));
      const cur = snap.exists() ? (snap.val().progress || 0) : 0;
      await update(ref(database, `users/${uid}`), { [`quests/${questId}/progress`]: cur + inc });
    } catch(e) { console.error(e); }
  };

  const handleSpin = () => {
    if ((userData.stars || 0) < 5) return notify('Yetarli yulduz yo\'q! 5 ⭐ kerak.');
    setIsSpinning(true);
    setShowPrize(null);
    handlePurchase(5, 'star', 'wheel_spin', { silent: true });
    trackShopQuest('q_spin_1'); trackShopQuest('q_spin_5'); trackShopQuest('q_spin_10'); trackShopQuest('q_spin_20'); trackShopQuest('q_spin_30');

    const prizes = [
      { id: 'shifokor', name: 'Shifokor (1x)',  type: 'role', img: '💉', count: 1 },
      { id: 'mafia',    name: 'Mafia (2x)',      type: 'role', img: '🔫', count: 2 },
      { id: 'kamissar', name: 'Kamissar (1x)',   type: 'role', img: '🕵️', count: 1 },
      { id: 'don',      name: 'Don (1x)',         type: 'role', img: '🕶️', count: 1 },
      { id: 'coins',    name: '1000 Tanga',       type: 'currency', img: '🪙', value: 1000 },
      { id: 'coins2',   name: '500 Tanga',        type: 'currency', img: '🪙', value: 500 },
    ];
    const prize = prizes[Math.floor(Math.random() * prizes.length)];

    setTimeout(() => {
      setIsSpinning(false);
      setShowPrize(prize);
      const prizeUpdate = {};
      if (prize.type === 'role') {
        const cur = userData.inventory?.roles?.[prize.id] || 0;
        prizeUpdate[`/inventory/roles/${prize.id}`] = cur + prize.count;
      } else {
        prizeUpdate['/coins'] = (userData.coins || 0) + prize.value;
      }
      handlePurchase(0, 'none', 'win', { silent: true, customUpdate: prizeUpdate });
    }, 2500);
  };

  const statuses = [
    { id: 'bronze',  name: 'Bronze',  price: 5000,  type: 'coin', icon: '🥉' },
    { id: 'gold',    name: 'Gold',    price: 15000, type: 'coin', icon: '🥇' },
    { id: 'diamond', name: 'Diamond', price: 50,    type: 'star', icon: '💎' },
    { id: 'vip',     name: 'VIP',     price: 100,   type: 'star', icon: '👑' },
  ];

  const roles = [
    { id: 'don',      name: 'Don',      price: 2000, type: 'coin', img: '🕶️', desc: 'Mafia boshlig\'i' },
    { id: 'mafia',    name: 'Mafia',    price: 3000, type: 'coin', img: '🔫', desc: 'Tunda o\'ldiradi' },
    { id: 'kamissar', name: 'Komissar', price: 2,   type: 'star', img: '🕵️', desc: 'Tekshiradi/Otadi' },
    { id: 'shifokor', name: 'Shifokor', price: 1,    type: 'star', img: '💉', desc: 'Himoyalaydi' },
  ];

  const donates = [
    { id: 'd1', amount: '100 ⭐',   cost: '$0.99', popular: false },
    { id: 'd2', amount: '500 ⭐',   cost: '$4.99', popular: true  },
    { id: 'd3', amount: '1,200 ⭐', cost: '$9.99', popular: false },
    { id: 'd4', amount: '2,500 ⭐', cost: '$19.99',popular: false },
  ];

  return (
    <div className="shop_container">
      {/* NOTIFICATION */}
      {notification && (
        <div className="shop_notification">{notification}</div>
      )}

      {/* PRIZE POPUP */}
      {showPrize && (
        <div className="shop_prize_overlay" onClick={() => setShowPrize(null)}>
          <div className="shop_prize_card" onClick={e => e.stopPropagation()}>
            <div className="shop_prize_confetti">🎊 🎉 🎊</div>
            <h2>Tabriklaymiz!</h2>
            <div className="shop_prize_icon">{showPrize.img}</div>
            <p className="shop_prize_name">{showPrize.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Inventaringizga qo'shildi</p>
            <button className="shop_buy_btn" onClick={() => setShowPrize(null)}>✓ OK</button>
          </div>
        </div>
      )}

      <header className="shop_header">
        <h1 className="shop_title">🏪 DO'KON</h1>
        <div className="shop_user_balance">
          <span className="balance_item">🪙 {(userData.coins || 0).toLocaleString()}</span>
          <span className="balance_item">⭐ {userData.stars || 0}</span>
          {userData.vip && userData.vip !== 'None' && (
            <span className="balance_item" style={{ color: 'gold' }}>
              {userData.vip === 'VIP' ? '👑' : userData.vip === 'Diamond' ? '💎' : userData.vip === 'Gold' ? '🥇' : '🥉'} {userData.vip}
            </span>
          )}
        </div>
      </header>

      {/* INVENTAR HOLATI */}
      <section className="shop_section" style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '8px' }}>
        <h2 className="shop_section_title" style={{ marginBottom: '10px' }}>🎒 Inventaringizdagi Rollar</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['don','mafia','kamissar','shifokor'].map(r => {
            const count = userData.inventory?.roles?.[r] || 0;
            return (
              <div key={r} style={{ background: count > 0 ? 'rgba(249,199,79,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${count > 0 ? 'rgba(249,199,79,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '8px 14px', fontSize: '0.82rem', color: count > 0 ? '#f9c74f' : 'rgba(255,255,255,0.3)' }}>
                {r.toUpperCase()}: {count > 0 ? `${count} dona` : '—'}
              </div>
            );
          })}
        </div>
        {userData.active_role && userData.active_role !== 'none' && (
          <p style={{ color: '#81c784', fontSize: '0.82rem', marginTop: '8px', margin: '8px 0 0' }}>
            🎭 Aktiv rol: <strong>{userData.active_role.toUpperCase()}</strong> — Profildan o'zgartirish mumkin
          </p>
        )}
      </section>

      {/* VALYUTA AYIRBOSHLASH */}
      <section className="shop_section exchange_section">
        <h2 className="shop_section_title">🔄 Valyuta Ayirboshlash</h2>
        <div className="exchange_grid">
          <div className="exchange_card">
            <span>1,000 🪙 → 5 ⭐</span>
            <button className="exchange_btn" onClick={() => handlePurchase(1000,'coin','ex_star')}>AYIRBOSHLA</button>
          </div>
          <div className="exchange_card">
            <span>10 ⭐ → 2,500 🪙</span>
            <button className="exchange_btn" onClick={() => handlePurchase(10,'star','ex_coin')}>AYIRBOSHLA</button>
          </div>
        </div>
      </section>

      {/* ROLLAR (1 martalik) */}
      <section className="shop_section">
        <h2 className="shop_section_title">🎭 Rollar <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'normal' }}>(1 o'yinda ishlatiladi)</span></h2>
        <div className="shop_grid">
          {roles.map(role => {
            const owned = userData.inventory?.roles?.[role.id] || 0;
            return (
              <div key={role.id} className="shop_card shop_role_card">
                <div className="shop_role_img">{role.img}</div>
                <h3 className="shop_card_name">{role.name}</h3>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>{role.desc}</p>
                <p style={{ color: '#f9c74f', fontSize: '0.8rem', margin: '0 0 8px' }}>
                  Sizda: <strong>{owned}</strong> dona
                </p>
                <p className="shop_role_price">
                  {role.price.toLocaleString()} {role.type === 'star' ? '⭐' : '🪙'}
                </p>
                <button className="shop_buy_btn_outline"
                  onClick={() => handlePurchase(role.price, role.type, role.id, { isRole: true })}>
                  SOTIB OLISH
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* OMAD BARABANI */}
      <section className="shop_section wheel_section">
        <h2 className="shop_section_title">🎡 Omad Barabani</h2>
        <div className="wheel_container">
          <div className={`wheel_graphic ${isSpinning ? 'spinning' : ''}`}>
            <div className="wheel_sector">💉</div>
            <div className="wheel_sector">🔫</div>
            <div className="wheel_sector">🕵️</div>
            <div className="wheel_sector">🪙</div>
            <div className="wheel_sector">🕶️</div>
            <div className="wheel_sector">🎁</div>
            <div className="wheel_pointer">▼</div>
          </div>
          <div className="wheel_info">
            <p>Har spin: <strong>5 ⭐</strong></p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Rol kartasi yoki tanga yutasiz!</p>
            <button onClick={handleSpin} disabled={isSpinning} className="wheel_spin_btn">
              {isSpinning ? '🎯 Aylanmoqda...' : '5 ⭐ — AYLANTIRISH'}
            </button>
          </div>
        </div>
      </section>

      {/* STATUSLAR */}
      <section className="shop_section">
        <h2 className="shop_section_title">✨ Status</h2>
        <div className="shop_grid">
          {statuses.map(item => (
            <div key={item.id} className={`shop_card shop_status_${item.id}`}>
              <div className="shop_card_icon">{item.icon}</div>
              <h3 className="shop_card_name">{item.name}</h3>
              {userData.vip === item.name && (
                <p style={{ color: '#4caf50', fontSize: '0.75rem', margin: '0 0 6px' }}>✓ Faol</p>
              )}
              <button className="shop_buy_btn"
                onClick={() => handlePurchase(item.price, item.type, item.id, { isStatus: true, statusName: item.name })}>
                {item.price.toLocaleString()} {item.type === 'star' ? '⭐' : '🪙'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* DONAT — Google Pay */}
      <section className="shop_section">
        <h2 className="shop_section_title">💳 Donat</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginBottom: '12px' }}>
          Google Pay orqali to'liq xavfsiz to'lov.
        </p>
        <div className="shop_grid_alt">
          {donates.map(pack => (
            <div key={pack.id} className={`shop_donate_card ${pack.popular ? 'best_deal' : ''}`}>
              {pack.popular && <span className="popular_tag">🔥 Eng Yaxshi</span>}
              <span className="shop_donate_amount">{pack.amount}</span>
              <GooglePayButton
                pack={pack}
                onSuccess={(amount) => {
                  // Muvaffaqiyatli to'lovdan keyin yulduz qo'shish
                  const starsMap = { d1: 100, d2: 500, d3: 1200, d4: 2500 };
                  const earnedStars = starsMap[pack.id] || 100;
                  handlePurchase(0, 'none', pack.id, {
                    silent: false,
                    customUpdate: { '/stars': (userData.stars || 0) + earnedStars }
                  });
                  notify(`✅ +${earnedStars}⭐ qo'shildi! To'lov muvaffaqiyatli!`);
                }}
              />
            </div>
          ))}
        </div>
        <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.72rem', marginTop:'12px', textAlign:'center' }}>
          🔒 Barcha to'lovlar Google Pay orqali xavfsiz amalga oshiriladi
        </p>
      </section>
    </div>
  );
};


// ============================================================
// Google Pay Button komponenti
// ============================================================
const GooglePayButton = ({ pack, onSuccess }) => {
  const handleGooglePay = async () => {
    // Google Pay Payment Request
    if (!window.PaymentRequest) {
      alert('Brauzeringiz Google Pay ni qo\'llab-quvvatlamaydi. Iltimos yangi brauzer ishlating.');
      return;
    }
    try {
      const paymentMethods = [{
        supportedMethods: 'https://google.com/pay',
        data: {
          environment: 'TEST', // Ishlab chiqishda 'TEST', real loyihada 'PRODUCTION'
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'example', // O'zingizning payment gateway'ingiz
                gatewayMerchantId: 'exampleMerchantId',
              },
            },
          }],
          merchantInfo: {
            merchantId: '01234567890123456789', // Google Merchant ID
            merchantName: 'Mafia Game',
          },
          transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: pack.cost.replace('$', ''),
            currencyCode: 'USD',
            countryCode: 'US',
          },
        },
      }];

      const details = {
        total: {
          label: `${pack.amount} — Mafia Game`,
          amount: { currency: 'USD', value: pack.cost.replace('$', '') },
        },
      };

      const request = new PaymentRequest(paymentMethods, details);
      const canPay = await request.canMakePayment();
      if (!canPay) {
        alert('Google Pay mavjud emas. Kartangizni Google Pay ga qo\'shing.');
        return;
      }
      const paymentResponse = await request.show();
      await paymentResponse.complete('success');
      onSuccess?.(pack.cost);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Google Pay error:', err);
        alert('To\'lovda xato: ' + err.message);
      }
    }
  };

  return (
    <button
      className="shop_donate_btn"
      onClick={handleGooglePay}
      style={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
        background:'#000', color:'#fff', border:'none', borderRadius:'8px',
        padding:'10px 16px', cursor:'pointer', fontWeight:'bold', width:'100%'
      }}
    >
      <img
        src="https://www.gstatic.com/instantbuy/svg/dark_gpay.svg"
        alt="Google Pay"
        style={{ height:22 }}
        onError={e => e.target.style.display='none'}
      />
      <span>{pack.cost}</span>
    </button>
  );
};

export default Shop;
