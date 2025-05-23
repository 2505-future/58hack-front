/**
 * Phaserゲームと連携するクライアントサイドのゲーム状態管理
 * このモジュールはクライアントサイドでのみ利用可能
 */

// ゲーム状態を定義
export interface GameState {
	players: Record<string, PlayerState>;
	gameStatus: "countdown" | "waiting" | "playing" | "finished";
	winner?: string;
	// 脱落順序（最後に残ったプレイヤーが先頭）
	eliminationOrder: string[];
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
	isAlive: boolean;
	// CD 中かどうか
	isActive: boolean;
}

// イベントの定義
type GameEvent =
	| { type: "playerAdded"; player: PlayerState }
	| { type: "playerUpdated"; player: PlayerState }
	| { type: "playerRemoved"; playerId: string }
	| { type: "gameStatusChanged"; status: "countdown" | "waiting" | "playing" | "finished" }
	| { type: "winnerSet"; winnerId: string }
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
		eliminationOrder: [],
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
			getState: () => ({
				players: {},
				gameStatus: "countdown",
				eliminationOrder: [],
			}),
			addPlayer: () => {},
			updatePlayer: () => {},
			removePlayer: () => {},
			setGameStatus: () => {},
			setWinner: () => {},
			addEliminatedPlayer: () => {},
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
	public setGameStatus(status: "countdown" | "waiting" | "playing" | "finished"): void {
		this._state.gameStatus = status;
		this.notifyListeners({
			type: "gameStatusChanged",
			status,
		});
	}

	/**
	 * 勝者IDを設定
	 */
	public setWinner(winnerId: string): void {
		this._state.winner = winnerId;

		// 勝者を脱落順序の先頭に追加（最後に脱落＝優勝）
		if (!this._state.eliminationOrder.includes(winnerId)) {
			this._state.eliminationOrder.unshift(winnerId);
		}

		this.notifyListeners({
			type: "winnerSet",
			winnerId,
		});
	}

	/**
	 * 脱落したプレイヤーを記録
	 * @param playerId 脱落したプレイヤーのID
	 */
	public addEliminatedPlayer(playerId: string): void {
		// すでに記録されている場合は追加しない
		if (!this._state.eliminationOrder.includes(playerId)) {
			this._state.eliminationOrder.push(playerId);
		}
	}

	/**
	 * ゲーム状態をリセット
	 */
	public resetState(): void {
		this._state = {
			players: {},
			gameStatus: "countdown", // "waiting" から "countdown" に変更
			eliminationOrder: [],
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
