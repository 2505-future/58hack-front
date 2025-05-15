/**
 * Phaserゲームと連携するクライアントサイドのゲーム状態管理
 * このモジュールはクライアントサイドでのみ利用可能
 */

// ゲーム状態を定義
export interface GameState {
	players: Record<string, PlayerState>;
	gameStatus: "waiting" | "countdown" | "playing" | "finished";
	countdownValue?: number;
}

// プレイヤー状態を定義
export interface PlayerState {
	id: string;
	icon?: string;
	power: number;
	weight: number;
	volume: number;
	cooldown: number;
	position: { x: number; y: number };
	isActive: boolean;
}

// イベントの定義
type GameEvent =
	| { type: "playerAdded"; player: PlayerState }
	| { type: "playerUpdated"; player: PlayerState }
	| { type: "playerRemoved"; playerId: string }
	| {
			type: "gameStatusChanged";
			status: "waiting" | "countdown" | "playing" | "finished";
			countdownValue?: number;
	  }
	| { type: "stateReset" };

// イベントリスナーの型
type GameEventListener = (event: GameEvent) => void;

/**
 * クライアントサイドで利用可能なゲームステートマネージャー
 */
class ClientGameStateManager {
	private static instance: ClientGameStateManager;
	private _state: GameState = {
		players: {},
		gameStatus: "waiting",
		countdownValue: undefined,
	};
	private listeners: GameEventListener[] = [];

	private constructor() {
		// シングルトンのコンストラクタ
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): ClientGameStateManager {
		// クライアントサイドでのみインスタンス化
		if (typeof window !== "undefined") {
			if (!ClientGameStateManager.instance) {
				ClientGameStateManager.instance = new ClientGameStateManager();
			}
			return ClientGameStateManager.instance;
		}

		return {
			getState: () => ({ players: {}, gameStatus: "waiting" }),
			addPlayer: () => {},
			updatePlayer: () => {},
			removePlayer: () => {},
			setGameStatus: () => {},
			resetState: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
		} as unknown as ClientGameStateManager;
	}

	/**
	 * 現在の状態を取得
	 */
	public getState(): GameState {
		return this._state;
	}

	/**
	 * プレイヤーを追加
	 */
	public addPlayer(player: PlayerState): void {
		this._state.players[player.id] = player;
		this.notifyListeners({
			type: "playerAdded",
			player,
		});
	}

	/**
	 * プレイヤーを更新
	 */
	public updatePlayer(playerId: string, updates: Partial<PlayerState>): void {
		if (this._state.players[playerId]) {
			this._state.players[playerId] = {
				...this._state.players[playerId],
				...updates,
			};

			this.notifyListeners({
				type: "playerUpdated",
				player: this._state.players[playerId],
			});
		}
	}

	/**
	 * プレイヤーを削除
	 */
	public removePlayer(playerId: string): void {
		if (this._state.players[playerId]) {
			delete this._state.players[playerId];
			this.notifyListeners({
				type: "playerRemoved",
				playerId,
			});
		}
	}

	/**
	 * ゲームステータスを設定
	 */
	public setGameStatus(
		status: "waiting" | "countdown" | "playing" | "finished",
		countdownValue?: number,
	): void {
		this._state.gameStatus = status;
		this._state.countdownValue = countdownValue;
		this.notifyListeners({
			type: "gameStatusChanged",
			status,
			countdownValue,
		});
	}

	/**
	 * ゲーム状態をリセット
	 */
	public resetState(): void {
		this._state = {
			players: {},
			gameStatus: "waiting",
			countdownValue: undefined,
		};
		this.notifyListeners({ type: "stateReset" });
	}

	/**
	 * イベントリスナーを追加
	 */
	public addEventListener(listener: GameEventListener): void {
		this.listeners.push(listener);
	}

	/**
	 * イベントリスナーを削除
	 */
	public removeEventListener(listener: GameEventListener): void {
		this.listeners = this.listeners.filter((l) => l !== listener);
	}

	/**
	 * リスナーに通知
	 */
	private notifyListeners(event: GameEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}

export default ClientGameStateManager;
