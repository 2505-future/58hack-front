import type { Player } from "../objects/player";
import ClientGameStateManager from "../state/ClientGameStateManager";
import type { GameSettings } from "./gameSettings";

const stateManager = ClientGameStateManager.getInstance();

/**
 * Phaserゲーム設定を生成する関数。
 * **必ずクライアントサイド（useEffect内）で呼び出す** こと！！
 *
 * @param gameSettings ゲーム設定
 * @param parent コンテナ要素
 * @returns Phaser.Types.Core.GameConfig
 */
export const createGameConfig = async (
	gameSettings: GameSettings,
	parent: HTMLElement | undefined,
): Promise<Phaser.Types.Core.GameConfig> => {
	// Phaserはクライアント側でのみインポート
	// @ts-expect-error 動的インポート(tsconfig.jsonでのmodules設定に依存)
	const Phaser = (await import("phaser")).default;

	// ゲーム開始時に状態を初期化
	stateManager.resetState();
	stateManager.setGameStatus("waiting");

	return {
		type: Phaser.AUTO,
		width: gameSettings.display.width,
		height: gameSettings.display.height,
		parent: parent || undefined,
		physics: {
			default: "arcade",
			arcade: {
				gravity: gameSettings.physics.gravity,
				debug: gameSettings.physics.debug,
			},
		},
		scene: {
			preload: function (this: Phaser.Scene) {
				this.load.setBaseURL(gameSettings.assets.baseUrl);
				for (const img of gameSettings.assets.images) {
					this.load.image(img.key, img.path);
				}
			},
			create: async function (this: Phaser.Scene) {
				this.cameras.main.setBackgroundColor("#BBFBFF");

				// フィールドの寸法
				const fieldWidth = 600;
				const fieldHeight = 400;

				// 物理世界の境界をフィールドサイズに一致させる（重要）
				this.physics.world.setBounds(
					this.cameras.main.centerX - fieldWidth / 2,
					this.cameras.main.centerY - fieldHeight / 2,
					fieldWidth,
					fieldHeight,
				);

				// 物理境界のデバッグ出力
				console.log("Physics World Bounds:", this.physics.world.bounds);

				// 緑のフィールドを作成
				const field = this.add.rectangle(
					this.cameras.main.centerX,
					this.cameras.main.centerY,
					fieldWidth,
					fieldHeight,
					0x00ff00,
				);
				field.setOrigin(0.5, 0.5);

				// フィールドの境界線を作成
				const fieldBorder = this.add.graphics();
				fieldBorder.lineStyle(5, 0x00ee00, 1);
				fieldBorder.strokeRect(
					this.cameras.main.centerX - fieldWidth / 2,
					this.cameras.main.centerY - fieldHeight / 2,
					fieldWidth,
					fieldHeight,
				);

				try {
					// Playerクラスを動的にインポート
					// @ts-expect-error 動的インポート(tsconfig.jsonでのmodules設定に依存)
					const { Player } = await import("../objects/player");
					const playerObjects = [];

					// 設定からプレイヤーデータを取得
					const playerDataArray = gameSettings.players;

					// メインプレイヤーが見つかったかどうか追跡する変数
					let mainPlayer: Player | null = null;

					if (playerDataArray.length > 0) {
						// プレイヤーデータが設定されている場合はそれを使用
						for (const playerData of playerDataArray) {
							// プレイヤー位置の決定
							let x: number;
							if (playerData.x !== undefined) {
								x = playerData.x;
							} else {
								x = Phaser.Math.Between(
									this.cameras.main.centerX - fieldWidth / 2 + 40,
									this.cameras.main.centerX + fieldWidth / 2 - 40,
								);
							}

							let y: number;
							if (playerData.y !== undefined) {
								y = playerData.y;
							} else {
								y = Phaser.Math.Between(
									this.cameras.main.centerY - fieldHeight / 2 + 40,
									this.cameras.main.centerY + fieldHeight / 2 - 40,
								);
							}

							const player = new Player(
								this,
								x,
								y,
								20, // 半径
								playerData.id,
								playerData.icon,
								playerData.power,
								playerData.weight,
								playerData.volume,
								playerData.cd,
							);

							// メインプレイヤーは赤色、その他は白色
							if (playerData.isMainPlayer) {
								player.setFillStyle(0xff0000, 1);
								mainPlayer = player;
							} else {
								player.setFillStyle(0xffffff, 1);
							}

							playerObjects.push(player);
						}
					} else {
						// プレイヤーデータが設定されていない場合はデフォルト値を使用
						// メインプレイヤーを赤い円として描画
						mainPlayer = new Player(
							this,
							this.cameras.main.centerX,
							this.cameras.main.centerY,
							20,
							"player1",
							"",
							50,
							50,
							50,
							500,
						);

						// メインプレイヤーを配列に追加
						playerObjects.push(mainPlayer);

						// 適当な敵プレイヤーを作成
						for (let i = 0; i < 5; i++) {
							const enemyPlayer = new Player(
								this,
								Phaser.Math.Between(
									this.cameras.main.centerX - fieldWidth / 2 + 40,
									this.cameras.main.centerX + fieldWidth / 2 - 40,
								),
								Phaser.Math.Between(
									this.cameras.main.centerY - fieldHeight / 2 + 40,
									this.cameras.main.centerY + fieldHeight / 2 - 40,
								),
								20, // 半径
								`enemy${i}`,
								"",
								Phaser.Math.Between(10, 100), // power
								Phaser.Math.Between(10, 100), // weight
								Phaser.Math.Between(10, 100), // volume
								500, // cooldown
							);

							enemyPlayer.setFillStyle(0xffffff, 1);

							// 敵プレイヤーを配列に追加
							playerObjects.push(enemyPlayer);
						}
					}

					// プレイヤー配列をシーンのデータとして保存（update内で使用するため）
					this.data.set("playerObjects", playerObjects);

					// プレイヤー同士の衝突を設定
					this.physics.add.collider(
						playerObjects,
						playerObjects,
						(obj1, obj2) => {
							const p1 = obj1 as unknown as Player;
							const p2 = obj2 as unknown as Player;

							if (p1.id && p2.id) {
								// プレイヤー同士の衝突をコンソールに出力（デバッグ用）
								console.log(`${p1.id} collided with ${p2.id}`);

								// 衝突時のエネルギー転移処理
								const impact1to2 = p1.applyCollisionImpactTo(p2);

								if (impact1to2 > 0) {
									// 衝突が有効だった場合のログ（デバッグ用）
									console.log(
										`Impact force: ${p1.id}->${p2.id}: ${impact1to2}`,
									);
								}
							}
						},
					);

					// 画面クリック時の処理を設定
					let isFirstClick = true;
					this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
						// メインプレイヤーが存在する場合のみ処理を実行
						if (mainPlayer) {
							if (isFirstClick) {
								// 1回目のクリック：ひっぱりを開始
								mainPlayer.startDrag(pointer.x, pointer.y);
								isFirstClick = false;
							} else {
								// 2回目のクリック：ひっぱりを完了して移動
								const didMove = mainPlayer.completeDrag(pointer.x, pointer.y);
								isFirstClick = true; // 次回のクリックに備えてリセット

								if (!didMove) {
									// 移動できなかった場合は直接新しいドラッグを開始
									mainPlayer.startDrag(pointer.x, pointer.y);
									isFirstClick = false;
								}
							}
						}
					});
				} catch (error) {
					console.error("Failed to load Player:", error);
				}

				stateManager.setGameStatus("playing");
			},
			update: function (this: Phaser.Scene) {
				const statusTextKey = "gameStatusText";
				const status = stateManager.getState().gameStatus;

				let statusText = this.children.getByName(
					statusTextKey,
				) as Phaser.GameObjects.Text | null;
				if (!statusText) {
					statusText = this.add
						.text(0, 0, `status: ${status}`, {
							font: "15px",
							color: "#222",
							padding: { left: 8, right: 8, top: 4, bottom: 4 },
						})
						.setOrigin(0, 0)
						.setName(statusTextKey)
						.setDepth(1000);
				} else {
					statusText.setText(`status: ${status}`);
				}

				// 保存されたプレイヤーオブジェクトを取得
				const players = this.data.get("playerObjects");

				// プレイヤーごとの更新処理
				if (players && Array.isArray(players)) {
					for (const player of players) {
						if (player && typeof player.update === "function") {
							// プレイヤーのアップデート関数を呼び出し
							player.update();
							console.log(
								`Updating player ${player.id} at (${player.x}, ${player.y})`,
							);
						}
					}
				}
			},
		},
	};
};
