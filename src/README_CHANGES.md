# Mafia Game — Tuzatmalar Ro'yxati

## Yangi Fayllar
- `store/useMultiplayerGameStore.js` — Multiplayer game logikasi (Supabase Realtime)
- `multiplayer_rooms/MultiplayerGame.jsx` — Multiplayer o'yin UI
- `multiplayer_rooms/MultiplayerGame.css` — Uning stillari  
- `SUPABASE_SCHEMA.sql` — DB jadvallarini yaratish

## O'zgartirilgan Fayllar
- `store/useGameStore.js` — Singleplayer buglar tuzatildi
- `Single/SinglePlayer.jsx` — activeRole prop, qoidalar modal, chat toggle, taslim
- `multiplayer_rooms/mtt/multiplayerStore_rooms_.js` — Realtime, timer, auto-cleanup
- `multiplayer_rooms/mtt/Multiplayer_rooms.jsx` — To'liq qayta yozildi
- `multiplayer_rooms/mtt/multiplayer_rooms.css` — Yangi stillar
- `Profil/profil.jsx` — Inventar, aktiv rol tanlash
- `ShOP/Shop.jsx` — Notification, inventar holati
- `App.jsx` — Logout, activeRole uzatish, loading state

## Supabase'da Bajarish Kerak
1. Dashboard → SQL Editor → `SUPABASE_SCHEMA.sql` ni ishga tushiring
2. Dashboard → Database → Replication → `rooms` va `room_players` ni yoqing

## Firebase'da Kerak Bo'lgan Maydonlar (users/)
```
users/{uid}/
  active_role: "none" | "don" | "mafia" | "kamissar" | "shifokor"
  inventory/roles/
    don: 0
    mafia: 0
    kamissar: 0
    shifokor: 0
```
