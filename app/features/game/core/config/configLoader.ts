import type { Player } from "../objects/player";
import ClientGameStateManager from "../state/ClientGameStateManager";
import { COLORS, FIELD_HEIGHT, FIELD_WIDTH } from "./config";
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
	apiUrl: string,
	roomId: string,
	ws: WebSocket,
): Promise<Phaser.Types.Core.GameConfig> => {
	const players = gameSettings.players;

	// Phaserはクライアント側でのみインポート
	// @ts-expect-error 動的インポート(tsconfig.jsonでのmodules設定に依存)
	const Phaser = (await import("phaser")).default;

	// ゲーム開始時に状態を初期化
	stateManager.resetState();

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
				// フィールド用とフィールド外用のテクスチャをプリロード
				this.load.image('floor', '/floor.png');
				this.load.image('ocean', '/ocean.png');
				
				for (const player of players) {
					// プレイヤーのアイコンをプリロード
					this.load.image(player.id, player.icon);
				}
			},
			create: async function (this: Phaser.Scene) {
				// 背景色を設定（オーシャンテクスチャが表示されない場合のフォールバック）
				this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
				
				// オーシャンテクスチャを背景に設定
				const ocean = this.add.image(
					this.cameras.main.centerX,
					this.cameras.main.centerY,
					'ocean'
				);
				
				// 画面全体にオーシャンテクスチャを表示
				ocean.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
				ocean.setOrigin(0.5, 0.5);
				ocean.setDepth(-1); // 最背面に配置

				// カウントダウン機能の実装
				let countdownValue = 3;
				const countdownText = this.add
					.text(
						this.cameras.main.centerX,
						this.cameras.main.centerY - 50,
						`${countdownValue}`,
						{
							font: "bold 96px Arial",
							color: "#FF0000",
							stroke: "#FFFFFF",
							strokeThickness: 8,
							padding: { left: 16, right: 16, top: 8, bottom: 8 },
						}
					)
					.setOrigin(0.5, 0.5)
					.setDepth(2000)
					.setAlpha(0);

				// 準備テキストの追加
				const readyText = this.add
					.text(
						this.cameras.main.centerX,
						this.cameras.main.centerY - 150,
						"READY?",
						{
							font: "bold 64px Arial",
							color: "#FF0000",
							stroke: "#FFFFFF",
							strokeThickness: 6,
							padding: { left: 16, right: 16, top: 8, bottom: 8 },
						}
					)
					.setOrigin(0.5, 0.5)
					.setDepth(2000)
					.setAlpha(0);

				// アニメーションでReadyテキストをフェードイン
				this.tweens.add({
					targets: readyText,
					alpha: 1,
					duration: 500,
					ease: "Power2",
					onComplete: () => {
						// Readyテキストが表示された後、カウントダウンを開始
						this.tweens.add({
							targets: countdownText,
							alpha: 1,
							duration: 500,
							ease: "Power2",
							onComplete: () => {
								// カウントダウンのインターバルを設定
								const countdownInterval = this.time.addEvent({
									delay: 1000,
									callback: () => {
										countdownValue--;
										if (countdownValue > 0) {
											// カウントダウンの数字を更新
											countdownText.setText(`${countdownValue}`);
											
											// 数字変更時のアニメーション効果
											this.tweens.add({
												targets: countdownText,
												scaleX: 1.2,
												scaleY: 1.2,
												duration: 200,
												yoyo: true,
												ease: "Power2",
											});
										} else {
											// カウントダウン終了時の処理
											countdownText.setText("GO!");
											
											// GOのアニメーション
											this.tweens.add({
												targets: countdownText,
												scaleX: 1.5,
												scaleY: 1.5,
												duration: 300,
												yoyo: true,
												ease: "Power2",
												onComplete: () => {
													// カウントダウン表示を消す
													this.tweens.add({
														targets: [countdownText, readyText],
														alpha: 0,
														duration: 500,
														ease: "Power2",
														onComplete: () => {
															// テキストを破棄
															countdownText.destroy();
															readyText.destroy();
															
															// ゲーム状態を「プレイ中」に変更
															stateManager.setGameStatus("playing");
														}
													});
												}
											});
											
											// インターバルを停止
											countdownInterval.remove();
										}
									},
									loop: true
								});
							}
						});
					}
				});

				// 物理世界の境界をフィールドサイズに一致させる（重要）
				this.physics.world.setBounds(
					this.cameras.main.centerX - FIELD_WIDTH / 2,
					this.cameras.main.centerY - FIELD_HEIGHT / 2,
					FIELD_WIDTH,
					FIELD_HEIGHT,
				);

				// 物理境界のデバッグ出力
				console.log("Physics World Bounds:", this.physics.world.bounds);

				// フィールドにテクスチャを設定
				const field = this.add.image(
					this.cameras.main.centerX,
					this.cameras.main.centerY,
					'floor'
				);
				
				// フィールドのサイズをFIELD_WIDTHとFIELD_HEIGHTに合わせる
				field.setDisplaySize(FIELD_WIDTH, FIELD_HEIGHT);
				field.setOrigin(0.5, 0.5);
				field.setDepth(0); // オーシャンよりも前に表示

				// フィールドの境界線を作成 - より目立つように
				const fieldBorder = this.add.graphics();
				fieldBorder.lineStyle(5, COLORS.FIELD_BORDER, 1);
				fieldBorder.strokeRect(
					this.cameras.main.centerX - FIELD_WIDTH / 2,
					this.cameras.main.centerY - FIELD_HEIGHT / 2,
					FIELD_WIDTH,
					FIELD_HEIGHT,
				);
				fieldBorder.setDepth(1); // フィールドの上に表示

				try {
					// Playerクラスを動的にインポート
					// @ts-expect-error 動的インポート(tsconfig.jsonでのmodules設定に依存)
					const { Player } = await import("../objects/player");
					const playerObjects: Player[] = [];

					// 設定からプレイヤーデータを取得
					const playerDataArray = gameSettings.players;

					// メインプレイヤーが見つかったかどうか追跡する変数
					let mainPlayer: Player | null = null;

					if (playerDataArray.length === 0) {
						throw new Error(
							"No player data found. please provide player data.",
						);
					}

					for (const playerData of playerDataArray) {
						// プレイヤー位置の決定
						const { x, y } = playerData;
						if(!x || !y) {
							// ありえない
							throw new Error("Player position (x, y) is required.");
						}

						// volume に基づいて半径を計算（最小10、最大40）
						const baseRadius = 10;
						const volumeEffect = (playerData.volume / 100) * 30; // volume最大(100)で+30
						const radius = Math.floor(baseRadius + volumeEffect);

						const player = new Player(
							this,
							this.cameras.main.centerX - FIELD_WIDTH/2 + x,
							this.cameras.main.centerY - FIELD_HEIGHT/2 + y,
							radius, // volumeに基づいた半径
							playerData.id,
							playerData.icon,
							playerData.power,
							playerData.weight,
							playerData.volume,
							playerData.cd,
						);

						if (playerData.isMainPlayer) {
							mainPlayer = player;
							// メインプレイヤーの視覚強調を設定
							player.setAsMainPlayer();
						} else {
							player.setFillStyle(COLORS.ENEMY, 1);
						}

						playerObjects.push(player);
					}

					// プレイヤー配列をシーンのデータとして保存（update内で使用するため）
					this.data.set("playerObjects", playerObjects);

					// アクションキューを保存するための配列を初期化
					const actionQueue: Array<{id: string, angle: number, pull_power: number}> = [];
					this.data.set("actionQueue", actionQueue);
					
					// 最後の更新時刻を記録
					const lastUpdateTime = 0;
					this.data.set("lastUpdateTime", lastUpdateTime);

					ws.onmessage = (event) => {
						const data = JSON.parse(event.data);
						if (data.type !== "action") return;
						
						// アクションをキューに追加するだけで、即座には適用しない
						const actionQueue = this.data.get("actionQueue") as Array<{id: string, angle: number, pull_power: number}>;
						actionQueue.push({
							id: data.message.id,
							angle: data.message.angle[0],
							pull_power: data.message.pull_power
						});
					}

					// プレイヤー同士の衝突を設定
					this.physics.add.collider(
						playerObjects,
						playerObjects,
						(obj1, obj2) => {
							const p1 = obj1 as unknown as Player;
							const p2 = obj2 as unknown as Player;

							if (p1.id && p2.id) {
								// プレイヤー同士の衝突をコンソールに出力（デバッグ用）
								// console.log(`${p1.id} collided with ${p2.id}`);

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
						// カウントダウン中やゲーム終了時は操作を無効化
						if (stateManager.getState().gameStatus !== "playing") {
							return;
						}
						
						// メインプレイヤーが存在する場合のみ処理を実行
						if (mainPlayer) {
							if (isFirstClick) {
								// 1回目のクリック：ひっぱりを開始
								mainPlayer.startDrag(pointer.x, pointer.y);
								isFirstClick = false;
							} else {
								// 2回目のクリック：ひっぱりを完了して移動
								const didMove = mainPlayer.completeDrag(
									pointer.x,
									pointer.y,
									apiUrl,
									roomId,
								);
								isFirstClick = true;

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
			},
			update: function (this: Phaser.Scene) {
				const statusTextKey = "gameStatusText";
				const status = stateManager.getState().gameStatus;					let statusText = this.children.getByName(
					statusTextKey,
				) as Phaser.GameObjects.Text | null;
				if (!statusText) {
					statusText = this.add
						.text(0, 0, `status: ${status}`, {
							font: "15px",
							color: COLORS.UI_TEXT,
							padding: { left: 8, right: 8, top: 4, bottom: 4 },
						})
						.setOrigin(0, 0)
						.setName(statusTextKey)
						.setDepth(1000);
				} else {
					statusText.setText(`status: ${status}`);
				}

				// カウントダウン中はプレイヤーの操作や状態の更新をスキップ
				if (status === "countdown") {
					return;
				}

				// 保存されたプレイヤーオブジェクトを取得
				const players = this.data.get("playerObjects");
				
				// アクションキューと最後の更新時刻を取得
				const actionQueue = this.data.get("actionQueue") as Array<{id: string, angle: number, pull_power: number}> || [];
				const lastUpdateTime = this.data.get("lastUpdateTime") as number || 0;
				
				// 現在の時刻
				const currentTime = this.time.now;
				
				// 100ms(0.1秒)ごとに更新
				if (currentTime - lastUpdateTime >= 100) {
					// キューに溜まったアクションを処理
					if (actionQueue.length > 0 && players && Array.isArray(players)) {
						for (const action of actionQueue) {
							const target = players.find((player) => player.id === action.id);
							if (target) {
								// 受信したデータを元にプレイヤーの状態を更新
								target.setVelocityWithAngle(action.angle, action.pull_power);
							}
						}
						
						// キューをクリア
						actionQueue.length = 0;
					}
					
					// 最後の更新時刻を更新
					this.data.set("lastUpdateTime", currentTime);
				}

				// プレイヤーごとの更新処理
				if (players && Array.isArray(players)) {
					for (const player of players) {
						if (player && typeof player.update === "function") {
							// プレイヤーのアップデート関数を呼び出し
							player.update();
						}
					}

					// ゲームが進行中の場合のみ終了判定を行う
					if (status === "playing") {
						// 生存プレイヤー数をカウント
						const alivePlayers = players.filter((player) => player.isAlive);

						// 生存プレイヤーが1名のみになった場合、ゲーム終了
						if (alivePlayers.length === 1) {
							// 既にゲーム終了イベントが発生していないことを確認
							if (!this.data.get("gameFinished")) {
								console.log("Game finished! Winner:", alivePlayers[0].id);

								// ゲーム終了フラグを立てる
								this.data.set("gameFinished", true);

								// ゲーム状態を終了に設定
								stateManager.setGameStatus("finished");

								// 勝者情報を記録
								stateManager.setWinner(alivePlayers[0].id);

								// GAME SETの表示
								const gameSetText = this.add
									.text(
										this.cameras.main.centerX,
										this.cameras.main.centerY,
										"GAME SET",
										{
											font: "bold 64px Arial",
											color: "#FF0000",
											stroke: "#FFFFFF",
											strokeThickness: 6,
											padding: { left: 16, right: 16, top: 8, bottom: 8 },
										},
									)
									.setOrigin(0.5, 0.5)
									.setDepth(2000);

								// テキストアニメーション
								this.tweens.add({
									targets: gameSetText,
									scaleX: 1.2,
									scaleY: 1.2,
									duration: 500,
									yoyo: true,
									repeat: 1,
									ease: "Sine.easeInOut",
								});

								// 3秒後に結果画面へリダイレクト
								this.time.delayedCall(3000, () => {
									// リダイレクトイベントを発火
									const event = new CustomEvent("gameRedirectToResult");
									window.dispatchEvent(event);
								});
							}
						}
					}
				}
			},
		},
	};
};
