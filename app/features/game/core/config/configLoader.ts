import { Player } from "../objects/player";
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
  parent: HTMLElement | undefined
): Promise<Phaser.Types.Core.GameConfig> => {
  // Phaserはクライアント側でのみインポート
  // @ts-expect-error 動的インポート(tsconfig.jsonでのmodules設定に依存)
  const Phaser = (await import("phaser")).default;

  // ゲーム開始時に状態を初期化
  stateManager.resetState();
  stateManager.setGameStatus('waiting');

  return {
    type: Phaser.AUTO,
    width: gameSettings.display.width,
    height: gameSettings.display.height,
    parent: parent || undefined,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: gameSettings.physics.gravity,
        debug: gameSettings.physics.debug
      }
    },
    scene: {
      preload: function (this: Phaser.Scene) {
        this.load.setBaseURL(gameSettings.assets.baseUrl);
        gameSettings.assets.images.forEach(img => {
          this.load.image(img.key, img.path);
        });
      },
      create: async function (this: Phaser.Scene) {
        this.cameras.main.setBackgroundColor("#BBFBFF");

        // フィールドの寸法
        const fieldWidth = 600;
        const fieldHeight = 400;

        // 緑のフィールドを作成
        const field = this.add.rectangle(
          this.cameras.main.centerX,
          this.cameras.main.centerY,
          fieldWidth,
          fieldHeight,
          0x00ff00
        );
        field.setOrigin(0.5, 0.5);

        // フィールドの境界線を作成
        const fieldBorder = this.add.graphics();
        fieldBorder.lineStyle(5, 0x00ee00, 1);
        fieldBorder.strokeRect(
          this.cameras.main.centerX - fieldWidth / 2,
          this.cameras.main.centerY - fieldHeight / 2,
          fieldWidth,
          fieldHeight
        );

        try {
          // Playerクラスを動的にインポート
          // @ts-expect-error 動的インポート(tsconfig.jsonでのmodules設定に依存)
          const { Player } = await import("../objects/player");
          const players: Player[] = [];
          
          // メインプレイヤーを赤い円として描画
          // TODO: プレイヤーステータスを反映（とりあえず player1 で）
          // TODO: 自分のプレイヤーアイコンのみをハイライトするようにする
          const player = new Player(
            this,
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            20, // 半径
            'player1',
            '',
            50, // power
            50, // weight
            50, // volume
            500 // cooldown
          );
          
          // メインプレイヤーを配列に追加
          players.push(player);

          // 適当な敵プレイヤーを作成
          // TODO: プレイヤーを追加する処理を実装
          for (let i = 0; i < 5; i++) {
            const enemyPlayer = new Player(
              this,
              Phaser.Math.Between(0, fieldWidth),
              Phaser.Math.Between(0, fieldWidth),
              20, // 半径
              `enemy${i}`,
              '',
              Phaser.Math.Between(10, 100), // power
              Phaser.Math.Between(10, 100), // weight
              Phaser.Math.Between(10, 100), // volume
              500 // cooldown
            );
            
            enemyPlayer.setFillStyle(
              0xffffff,
              1
            );
            
            // 敵プレイヤーを配列に追加
            players.push(enemyPlayer);
          }
          
          // プレイヤーの操作を無効化（カウントダウン中）
          players.forEach(player => {
            player.setControlEnabled(false);
          });
          
          // プレイヤー同士の衝突を設定
          this.physics.add.collider(players, players, (obj1, obj2) => {
            const p1 = obj1 as unknown as Player;
            const p2 = obj2 as unknown as Player;
            
            if (p1.id && p2.id) {
              // プレイヤー同士の衝突をコンソールに出力（デバッグ用）
              console.log(`${p1.id} collided with ${p2.id}`);
              
              // 衝突時のエネルギー転移処理
              const impact1to2 = p1.applyCollisionImpactTo(p2);
              
              if (impact1to2 > 0) {
                // 衝突が有効だった場合のログ（デバッグ用）
                console.log(`Impact force: ${p1.id}->${p2.id}: ${impact1to2}`);
              }
            }
          });

          // 画面クリック時の処理を設定
          let isFirstClick = true;
          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // ゲームの状態が playing でない場合は操作を無効化
            const gameStatus = stateManager.getState().gameStatus;
            if (gameStatus !== 'playing') return;
            
            if (isFirstClick) {
              // 1回目のクリック：ひっぱりを開始
              player.startDrag(pointer.x, pointer.y);
              isFirstClick = false;
            } else {
              // 2回目のクリック：ひっぱりを完了して移動
              const didMove = player.completeDrag(pointer.x, pointer.y);
              isFirstClick = true; // 次回のクリックに備えてリセット

              if (!didMove) {
                // 移動できなかった場合は直接新しいドラッグを開始
                player.startDrag(pointer.x, pointer.y);
                isFirstClick = false;
              }
            }
          });

          // カウントダウンタイマーを実装
          const startCountdown = () => {
            const countdownDuration = 5; // 5秒のカウントダウン
            stateManager.setGameStatus('countdown', countdownDuration);
            
            // カウントダウンテキストを作成
            const countdownText = this.add.text(
              this.cameras.main.centerX,
              this.cameras.main.centerY - 50,
              countdownDuration.toString(),
              { 
                fontSize: '72px',
                fontFamily: 'Arial',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5,
                align: 'center'
              }
            ).setOrigin(0.5);
            
            const startText = this.add.text(
              this.cameras.main.centerX,
              this.cameras.main.centerY + 50,
              '',
              { 
                fontSize: '60px',
                fontFamily: 'Arial',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 5,
                align: 'center'
              }
            ).setOrigin(0.5).setAlpha(0);

            // カウントダウンのタイマーを設定
            let timeRemaining = countdownDuration;
            
            // 1秒ごとのカウントダウン
            const countdownTimer = this.time.addEvent({
              delay: 1000,
              callback: () => {
                timeRemaining--;
                
                if (timeRemaining > 0) {
                  // カウントダウン続行
                  countdownText.setText(timeRemaining.toString());
                  stateManager.setGameStatus('countdown', timeRemaining);
                  
                  // テキストを拡大して縮小するアニメーション
                  this.tweens.add({
                    targets: countdownText,
                    scale: { from: 1.5, to: 1 },
                    duration: 500,
                    ease: 'Cubic.out'
                  });
                } else {
                  // カウントダウン終了
                  countdownText.setVisible(false);
                  
                  // STARTテキストを表示
                  startText.setText('START!');
                  startText.setAlpha(1);
                  
                  // STARTテキストのアニメーション
                  this.tweens.add({
                    targets: startText,
                    scale: { from: 0.5, to: 1.5 },
                    alpha: { from: 1, to: 0 },
                    duration: 1000,
                    ease: 'Cubic.out',
                    onComplete: () => {
                      startText.destroy();
                    }
                  });
                  
                  // ゲーム開始！プレイヤーの操作を有効化
                  stateManager.setGameStatus('playing');
                  
                  // すべてのプレイヤーの操作を有効化
                  players.forEach(player => {
                    player.setControlEnabled(true);
                  });
                }
              },
              callbackScope: this,
              repeat: countdownDuration
            });
          };
          
          // プレイヤーが全てスポーンしたらカウントダウン開始
          startCountdown();
        } catch (error) {
          console.error("Failed to load Player:", error);
        }
      },
      update: function (this: Phaser.Scene) {
        const statusTextKey = 'gameStatusText';
        const gameState = stateManager.getState();
        const status = gameState.gameStatus;
        const countdownValue = gameState.countdownValue;
        
        let statusText = this.children.getByName(statusTextKey) as Phaser.GameObjects.Text | null;
        if (!statusText) {
          let statusStr = `status: ${status}`;
          if (status === 'countdown' && countdownValue !== undefined) {
            statusStr += ` (${countdownValue})`;
          }

          statusText = this.add.text(0, 0, statusStr, {
            font: '15px',
            color: '#222',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
          }).setOrigin(0, 0).setName(statusTextKey).setDepth(1000);
        } else {
          let statusStr = `status: ${status}`;
          if (status === 'countdown' && countdownValue !== undefined) {
            statusStr += ` (${countdownValue})`;
          }
          statusText.setText(statusStr);
        }
      }
    }
  };
};

