import React, { useEffect } from "react";
import useMultiplayerStore from "../store/Multiplayer";
import "./Mpr.css";

const Mpr = ({ user, roomId }) => {
    const s = useMultiplayerStore();
    const me = s.players.find(p => p.user_id === user.uid);

    useEffect(() => {
        const unsubscribe = s.subscribeToRoom(roomId);
        s.syncPlayers(roomId);
        return () => unsubscribe();
    }, [roomId]);

    // O'yin boshlanish sharti (Admin ko'radi)
    const isAdmin = s.players[0]?.user_id === user.uid;
    const readyToStart = s.players.length >= 4 && s.players.every(p => p.is_ready);

    if (s.gameState === "waiting") {
        return (
            <div className="LobbyOverlay">
                <h1>XONA: {roomId}</h1>
                <div className="PlayerGrid">
                    {s.players.map(p => (
                        <div key={p.id} className={`P_Card ${p.is_ready ? "Ready" : ""}`}>
                            <img src={p.user_image} alt="avatar" />
                            <span>{p.username}</span>
                        </div>
                    ))}
                </div>
                {isAdmin && (
                    <button 
                        disabled={!readyToStart} 
                        onClick={() => s.startGame(roomId)}
                        className="StartBtn"
                    >
                        O'YINNI BOSHLASH
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`ArenaContainer ${!s.isDay ? "Night" : "Day"}`}>
            <div className="TopBar">
                <div className="Timer">{s.timeLeft}s</div>
                <div className="RoleInfo">ROLYINGIZ: {me?.role}</div>
            </div>

            <div className="CircleTable">
                {s.players.map((p, idx) => {
                    const angle = (360 / s.players.length) * idx;
                    const isDead = !p.is_alive;
                    
                    return (
                        <div 
                            key={p.id}
                            className={`PlayerSlot ${isDead ? "Dead" : ""}`}
                            style={{ transform: `rotate(${angle}deg) translate(250px) rotate(-${angle}deg)` }}
                            onClick={() => !isDead && s.handleVote(p.id, user.uid)}
                        >
                            <div className="Card">
                                {p.votes > 0 && <span className="VoteCount">{p.votes}</span>}
                                <img src={p.user_image} alt="p" />
                            </div>
                            <p>{p.username} {p.user_id === user.uid && "(SIZ)"}</p>
                        </div>
                    );
                })}
            </div>

            <div className="MiniChat">
                {s.logs.map(log => <p key={log.id}>{log.text}</p>)}
            </div>
        </div>
    );
};

export default Mpr;