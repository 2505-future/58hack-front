type player = {
  players: {
    id: string
    iconUrl: string
  }[]
}

import React from 'react';

interface Player {
  id: string;
  iconUrl: string;
}

interface PlayerCardProps {
  player: Player;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  return (
    <div style={styles.card}>
      <div style={styles.idContainer}>
        <span style={styles.id}>{player.id}</span>
      </div>
      <div style={styles.iconContainer}>
        <img src={player.iconUrl} alt={`Icon for player ${player.id}`} style={styles.icon} />
      </div>
      {/* 必要に応じて他のプレイヤー情報をここに追加できます */}
    </div>
  );
};

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'row' as const, // ← as const を追加
    alignItems: 'center' as const, // ← as const を追加
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    margin: '5px',
    width: '300px',
  },
  idContainer: {
    marginRight: '15px',
  },
  id: {
    fontSize: '1em',
    fontWeight: 'bold' as const, // ← as const を追加
  },
  iconContainer: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    overflow: 'hidden' as const, // ← as const を追加
  },
  icon: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const, // ← as const を追加
  },
};








export function WaitingRoom({ players }: player) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "60vh"
    }}>
      <h1 style={{ marginBottom: "32px" }}>待合室</h1>
      <div style={{ marginTop: "24px", color: "#666", fontSize: "18px" }}>
        しばらくお待ちください...
      </div>
      <div>
        <div>
          {Array.isArray(players) && players.map((player: Player) => (
            <PlayerCard key={player.id} player={player}/>
          ))}
        </div>
      </div>
    </div>
  );
}


const Waiting = (player: player) => {
  return (
    <WaitingRoom players={player.players} />
  );
};

export default Waiting;