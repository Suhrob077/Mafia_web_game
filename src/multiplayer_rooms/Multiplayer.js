import { create } from 'zustand';
import { supabase } from './supabaseClient';

const useMultiplayerStore = create((set, get) => ({
    gameState: "waiting", // waiting, playing, ended
    players: [],
    currentRoom: null,
    userRole: null,
    isDay: true,
    timeLeft: 30,
    logs: [],
    
    // Xonaga ulanish va Realtime obunani boshlash
    subscribeToRoom: (roomId) => {
        const channel = supabase
            .channel(`room_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, 
                () => get().syncPlayers(roomId))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_id=eq.${roomId}` }, 
                (payload) => set({ 
                    gameState: payload.new.status,
                    isDay: payload.new.is_day,
                    timeLeft: payload.new.time_left 
                }))
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    syncPlayers: async (roomId) => {
        const { data } = await supabase.from("room_players").select("*").eq("room_id", roomId);
        set({ players: data || [] });
    },

    // O'yinni boshlash (Faqat Admin uchun)
    startGame: async (roomId) => {
        const players = get().players;
        if (players.length < 4) return alert("Kamida 4 kishi kerak!");

        const roles = ["Don", "Mafia", "Komissar", "Shifokor", "Aholi", "Aholi", "Aholi", "Aholi"]
            .slice(0, players.length)
            .sort(() => Math.random() - 0.5);

        // Rollarni bazaga yozish
        for (let i = 0; i < players.length; i++) {
            await supabase.from("room_players")
                .update({ role: roles[i], is_alive: true, votes: 0 })
                .eq("id", players[i].id);
        }

        await supabase.from("rooms")
            .update({ status: "playing", is_day: true, time_left: 60 })
            .eq("room_id", roomId);
    },

    // Ovoz berish tizimi
    handleVote: async (targetId, userId) => {
        const { isDay, players } = get();
        const me = players.find(p => p.user_id === userId);
        if (!me?.is_alive) return;

        if (isDay) {
            // Kunduzgi ovoz (+1)
            const target = players.find(p => p.id === targetId);
            await supabase.from("room_players")
                .update({ votes: (target.votes || 0) + 1 })
                .eq("id", targetId);
        } else {
            // Tungi harakat (Mafia nishoni yoki Shifokor davosi)
            // Bu qismda room_players'dagi maxsus 'night_target' ustunini yangilaymiz
            await supabase.from("room_players")
                .update({ night_target: targetId })
                .eq("user_id", userId);
        }
    },

    addLog: (text) => set(state => ({ 
        logs: [...state.logs, { id: Date.now(), text }] 
    }))
}));

export default useMultiplayerStore;