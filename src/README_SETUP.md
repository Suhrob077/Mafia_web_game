# 🔧 MAFIA GAME — Server va Firebase Sozlash Qo'llanmasi

## ✅ Nima o'zgardi (yangiliklar):

### 1. 🔑 Google Auth
- Kirish va Ro'yxatdan o'tishda **Google bilan kirish** tugmasi qo'shildi
- Google orqali kirganda profil rasmi avtomatik olinadi

### 2. 📸 Profil rasmi
- Sidebar va Profil sahifasida rasmni bosib o'zgartirish mumkin
- Firebase Storage ga yuklanadi (max 3MB)

### 3. 📋 Quest tizimi (80 ta quest)
- Menuga `📋 Quest` tugmasi qo'shildi
- Kategoriyalar: Rollar, Multiplayer, Singleplayer, Match soni, Do'kon, Statistika, Extra
- Questlar bajarilganda 🪙 tanga va ⭐ yulduz mukofoti beriladi

### 4. 🏠 Admin chiqish logikasi
- Admin "Chiqish" bosganda — admin boshqa o'yinchiga o'tadi
- Admin "Xonani yopish" bosganda — barcha chiqariladi (confirm so'raladi)

### 5. 🤖 Bot + Classic mode
- Xonada bot bo'lsa — aktiv rol ishlamaydi (Classic mode)
- Xonada bot yo'q bo'lsa — aktiv rol beriladi

### 6. 🎭 Active rol taqsimlash
- 2 ta o'yinchida bir xil rol aktiv bo'lsa — tasodifiy bittasiga beriladi
- O'yin boshlanayotganda xabar: "Aktiv rolingiz berildi" yoki "Aktiv rol boshqaga berildi"

### 7. 💳 Google Pay (Donat)
- Do'kon donat bo'limida Google Pay tugmalari qo'shildi
- To'lov muvaffaqiyatli bo'lsa yulduz avtomatik qo'shiladi

### 8. 📊 To'g'ri statistika
- `runTransaction` bilan statistika to'g'ri increment qilinadi
- O'yin tugaganda quest progress avtomatik yangilanadi

---

## 🔥 Firebase Console da nima qilish kerak:

### A) Google Authentication yoqish:
1. [Firebase Console](https://console.firebase.google.com/) → Loyihangizni oching
2. **Authentication** → **Sign-in method** → **Google** → **Enable**
3. Support email kiriting → **Save**
4. **Authorized domains** da saytingiz domenini qo'shing (masalan: `localhost`, `yourdomain.com`)

### B) Firebase Storage yoqish (profil rasmi uchun):
1. Firebase Console → **Storage** → **Get started**
2. Production mode tanlang → **Next** → **Done**
3. **Rules** tabiga boring, quyidagi qoidani yozing:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 3 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### C) Realtime Database qoidalari (agar hali qo'shilmagan bo'lsa):
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

### D) Google Pay uchun (production uchun):
1. [Google Pay & Wallet Console](https://pay.google.com/business/console) da ro'yxatdan o'ting
2. Merchant ID oling
3. `Shop.jsx` da `environment: 'TEST'` ni `'PRODUCTION'` ga va `merchantId` ni real ID ga almashtiring
4. Payment gateway ulash uchun Stripe, Braintree yoki boshqa provayderga murojaat qiling

### E) Supabase (Multiplayer uchun — o'zgarmagan):
- `supabaseClient.js` dagi URL va KEY ni tekshiring
- `rooms` jadvalida `creator_id`, `creator_name` ustunlari bo'lishi kerak
- `room_players` jadvalida `user_id`, `username`, `user_image`, `is_ready`, `role`, `is_alive`, `votes` ustunlari kerak

---

## 📦 Loyihani ishga tushirish:
```bash
npm install
npm install firebase zustand react-i18next i18next @supabase/supabase-js
npm run dev
```

## 🆕 Yangi paketlar (agar yo'q bo'lsa):
```bash
npm install firebase  # (allaqachon bor, lekin storage uchun versiyani tekshiring)
```
