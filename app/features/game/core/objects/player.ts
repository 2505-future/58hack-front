import { GameObjects } from "phaser";
import { COLORS } from "../config/config";
import ClientGameStateManager from "../state/ClientGameStateManager";

/**
 * Phaserゲーム内のプレイヤーオブジェクトクラス
 * ゲーム内でのプレイヤーの振る舞いや状態を管理する
 */
export class Player extends GameObjects.Arc {
	public id: string;
	public icon: string;
	public power: number;
	public weight: number;
	public volume: number;
	public cd: number;
	public isAlive = true;

	private isCooldown = false;
	private moveSpeed = 0;
	private cooldownTimer: Phaser.Time.TimerEvent | null = null;

	// ひっぱり用の変数
	private dragStartPoint: Phaser.Math.Vector2 | null = null;

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		radius: number,
		id: string,
		icon: string,
		power: number,
		weight: number,
		volume: number,
		cd: number,
	) {
		// 赤い円としてプレイヤーを作成
		super(scene, x, y, radius, 0, 360, false, COLORS.PLAYER);

		// シーンに追加
		scene.add.existing(this);

		// ユーザー情報を保存
		this.id = id;
		this.icon = icon;
		this.power = power;
		this.weight = weight;
		this.volume = volume;
		this.cd = cd;

		// 物理演算を有効化
		if (scene.physics?.add) {
			scene.physics.add.existing(this);

			// 物理ボディがあれば円形に設定
			const body = this.body as Phaser.Physics.Arcade.Body;
			if (body) {
				body.setCircle(radius);

				// 境界との衝突を無効化（フィールド外に出られるようにする）
				body.setCollideWorldBounds(false);

				// フィールド境界をコンソールに出力
				console.log(
					`Player ${id} created, world bounds:`,
					this.scene.physics.world.bounds,
				);

				// 初期設定（質量と摩擦係数）
				const weightFactor = this.weight / 100;
				const volumeFactor = this.volume / 100;
				const mass = 1 + weightFactor * 4;
				const frictionFactor = (1 - weightFactor) * 0.7 + volumeFactor * 0.3;
				const dragCoefficient = 0.05 + frictionFactor * 0.15;

				body.setMass(mass);
				body.setDamping(true);
				body.setDrag(dragCoefficient);
				body.setBounce(0.3 - weightFactor * 0.2);
			}
		}

		// グローバルなゲーム状態に登録
		ClientGameStateManager.getInstance().addPlayer({
			id: this.id,
			icon: this.icon,
			power: this.power,
			weight: this.weight,
			volume: this.volume,
			cooldown: this.cd,
			position: { x: this.x, y: this.y },
			isAlive: this.isAlive,
			isActive: true,
		});

		// プレイヤーが更新されたときにゲーム状態も更新
		this.on("destroy", () => {
			ClientGameStateManager.getInstance().removePlayer(this.id);
		});
	}

	/**
	 * 状態更新のための関数（extends GameObject）
	 */
	public update(): void {
		// フィールド内にいるか確認（死亡判定用）
		if (this.isAlive && !this.isWithinField()) {
			this.die();
			console.log("Player died (out of bounds):", this.id);
		}

		// プレイヤーの位置情報をグローバル状態に同期
		ClientGameStateManager.getInstance().updatePlayer(this.id, {
			position: { x: this.x, y: this.y },
			isAlive: this.isAlive,
			isActive: this.isAlive && !this.isCooldown,
		});
	}

	/**
	 * プレイヤーの位置を更新し、状態マネージャーと同期する
	 * @param x X座標
	 * @param y Y座標
	 */
	public setPosition(x: number, y: number): this {
		super.setPosition(x, y);

		// グローバル状態を更新
		ClientGameStateManager.getInstance().updatePlayer(this.id, {
			position: { x, y },
		});

		return this;
	}

	/**
	 * プレイヤーの状態を更新する
	 * @param updates 更新するプロパティ
	 */
	public updatePlayerState(updates: {
		power?: number;
		weight?: number;
		volume?: number;
		cd?: number;
		isActive?: boolean;
	}): this {
		// プロパティを更新
		if (updates.power !== undefined) this.power = updates.power;
		if (updates.weight !== undefined) this.weight = updates.weight;
		if (updates.volume !== undefined) this.volume = updates.volume;
		if (updates.cd !== undefined) this.cd = updates.cd;

		// グローバル状態を更新
		ClientGameStateManager.getInstance().updatePlayer(this.id, {
			power: this.power,
			weight: this.weight,
			volume: this.volume,
			cooldown: this.cd,
			isActive: updates.isActive !== undefined ? updates.isActive : true,
		});

		return this;
	}

	/**
	 * 衝突エネルギーを他のプレイヤーに転移する
	 * このプレイヤー（衝突側）から相手プレイヤー（被衝突側）へエネルギーを転移
	 *
	 * @param target 衝突相手のプレイヤー（エネルギーを受け取る側）
	 * @returns 転移したエネルギー量（0以上の値、転移がなかった場合は0）
	 */
	public applyCollisionImpactTo(target: Player): number {
		// 物理ボディを取得
		const myBody = this.body as Phaser.Physics.Arcade.Body;
		const targetBody = target.body as Phaser.Physics.Arcade.Body;
		if (!myBody || !targetBody) return 0;

		// 速度ベクトルと速度の大きさを取得
		const myVelocity = new Phaser.Math.Vector2(
			myBody.velocity.x,
			myBody.velocity.y,
		);
		const mySpeed = myVelocity.length();

		// 衝突方向ベクトル（自分から相手への方向）
		const collisionVector = new Phaser.Math.Vector2(
			target.x - this.x,
			target.y - this.y,
		).normalize();
		const powerFactor = this.power / 100;

		// 運動エネルギー計算（速度の二乗に比例）
		const kineticEnergy = mySpeed * mySpeed * powerFactor;

		// 質量効果の計算（自分と相手の重さの比率を考慮）
		// 自分が重く相手が軽いほど、効果が大きい
		const massEffect = this.weight / (this.weight + target.weight);

		// 相手に転移する力の計算
		// 質量比を考慮（相手の重さの影響を反映）
		const impactForce =
			kineticEnergy * massEffect * (1 - target.weight / 100) * 0.9;

		// 力を適用して、相手プレイヤーを押し出す
		targetBody.velocity.x += collisionVector.x * impactForce;
		targetBody.velocity.y += collisionVector.y * impactForce;

		// 自分自身は反動で少し下がる（作用・反作用の法則）
		myBody.velocity.x -= collisionVector.x * impactForce * 0.3;
		myBody.velocity.y -= collisionVector.y * impactForce * 0.3;

		// 衝突エフェクトを表示（任意）
		this.showCollisionEffect(target, impactForce);

		return impactForce;
	}

	/**
	 * 衝突エフェクトを表示する
	 *
	 * @param target 衝突相手のプレイヤー
	 * @param impactForce 衝突の強さ
	 */
	private showCollisionEffect(target: Player, impactForce: number): void {
		// 衝突の強さが一定以上の場合のみエフェクト表示
		// if (impactForce < 50) return;

		// 衝突位置（両者の中間点）
		const midPoint = {
			x: (this.x + target.x) / 2,
			y: (this.y + target.y) / 2,
		};

		// 衝突円エフェクトを表示（衝突の強さに応じてサイズ変更）
		const collisionEffect = this.scene.add.circle(
			midPoint.x,
			midPoint.y,
			10 + impactForce / 20,
			0xffffff,
			0.7,
		);

		// エフェクトをアニメーション（フェードアウト）
		this.scene.tweens.add({
			targets: collisionEffect,
			alpha: 0,
			scale: 1.5,
			duration: 300,
			ease: "Power2",
			onComplete: () => {
				collisionEffect.destroy();
			},
		});
	}

	/**
	 * クールダウン中かどうかを確認する
	 * @returns クールダウン中ならtrue、そうでなければfalse
	 */
	public isInCooldown(): boolean {
		return this.isCooldown;
	}

	/**
	 * ひっぱり開始のポイントを設定する（一度目のクリック）
	 * @param x ひっぱり開始地点のX座標
	 * @param y ひっぱり開始地点のY座標
	 */
	public startDrag(x: number, y: number): void {
		// クールダウン中または死亡している場合は操作を受け付けない
		if (this.isInCooldown() || !this.isAlive) return;

		console.log("Drag started at:", x, y);
		this.dragStartPoint = new Phaser.Math.Vector2(x, y);
	}

	/**
	 * ひっぱりを完了し、プレイヤーを移動させる（二度目のクリック）
	 * @param x ひっぱり終了地点のX座標
	 * @param y ひっぱり終了地点のY座標
	 * @returns 移動が実行されたかどうか
	 */
	public completeDrag(x: number, y: number): boolean {
		// クールダウン中、ドラッグ中でない、または死亡している場合は操作を受け付けない
		if (this.isInCooldown() || !this.dragStartPoint || !this.isAlive)
			return false;

		// ドラッグの終点を作成
		const dragEndPoint = new Phaser.Math.Vector2(x, y);

		// ドラッグのベクトルを計算（始点から終点へのベクトル）
		const dragVector = new Phaser.Math.Vector2(
			this.dragStartPoint.x - dragEndPoint.x,
			this.dragStartPoint.y - dragEndPoint.y,
		);

		// ドラッグの距離（強さ）を計算
		const dragDistance = dragVector.length();

		// 最大強度を設定（強すぎると画面外に飛んでいくのを防止）
		const maxStrength = 500;
		const normalizedStrength = Math.min(dragDistance, maxStrength);

		// パワー値に基づいて強さを調整
		const powerFactor = this.power / 50; // パワーが50の時に1倍
		const finalStrength = normalizedStrength * powerFactor;

		// 移動方向の角度を計算
		const angle = dragVector.angle();

		// ベクトルを正規化して強さを適用
		const velocityX = Math.cos(angle) * finalStrength;
		const velocityY = Math.sin(angle) * finalStrength;

		// 物理ボディがあれば速度を設定
		const body = this.body as Phaser.Physics.Arcade.Body;
		if (body) {
			// 重さに応じたパラメータ調整
			const weightFactor = this.weight / 100; // 0～1の値

			// 質量の設定 - 重いほど質量が大きい（慣性が大きい）
			const mass = 1 + weightFactor * 4; // 1～5の間の質量
			body.setMass(mass);

			// 摩擦係数の設定 - 軽いプレイヤーほど摩擦が強い（早く止まる）
			// 体積が大きい場合も表面積が広くなるので摩擦が大きい
			const volumeFactor = this.volume / 100; // 0～1の値
			const frictionFactor = (1 - weightFactor) * 0.7 + volumeFactor * 0.3;
			const dragCoefficient = 0.05 + frictionFactor * 0.15; // 0.05～0.2の間

			// 物理パラメータの適用
			body.setDamping(true);
			body.setDrag(dragCoefficient);

			// バウンス（跳ね返り）を小さめに設定（重い方が跳ね返りが小さい）
			body.setBounce(0.3 - weightFactor * 0.2); // 0.1～0.3の間

			// 速度の適用
			body.setVelocity(velocityX, velocityY);
		}

		// クールダウンを開始
		this.startCooldown();

		// ドラッグ情報をリセット
		this.dragStartPoint = null;

		console.log("Drag completed. New velocity:", velocityX, velocityY);
		return true;
	}

	/**
	 * クールダウンを開始する
	 */
	private startCooldown(): void {
		this.isCooldown = true;

		// グローバル状態を更新
		ClientGameStateManager.getInstance().updatePlayer(this.id, {
			isActive: false,
		});

		// 既存のタイマーがあればキャンセル
		if (this.cooldownTimer) {
			this.cooldownTimer.remove();
		}

		// 新しいクールダウンタイマーを設定
		this.cooldownTimer = this.scene.time.delayedCall(this.cd, () => {
			this.isCooldown = false;
			this.cooldownTimer = null;

			// グローバル状態を更新
			ClientGameStateManager.getInstance().updatePlayer(this.id, {
				isActive: true,
			});
		});
	}

	/**
	 * ドラッグをキャンセルする
	 */
	public cancelDrag(): void {
		this.dragStartPoint = null;
	}

	/**
	 * プレイヤーを死亡状態にする
	 * フィールドから落下した場合などに呼び出される
	 */
	public die(): void {
		if (!this.isAlive) return;

		this.isAlive = false;

		this.setAlpha(0.5);
		this.cancelDrag();
		this.isCooldown = false;

		const body = this.body as Phaser.Physics.Arcade.Body;
		if (body) {
			body.setVelocity(0, 0);
		}

		// グローバル状態を更新
		ClientGameStateManager.getInstance().updatePlayer(this.id, {
			isAlive: false,
			isActive: false,
		});

		// 死亡エフェクトを表示
		this.showDeathEffect();
	}

	/**
	 * 死亡エフェクトを表示する
	 */
	private showDeathEffect(): void {
		// 物理ボディから半径を取得
		const body = this.body as Phaser.Physics.Arcade.Body;
		const radius = body ? body.width / 2 : 20;

		// 死亡位置にエフェクトを表示
		const deathEffect = this.scene.add.circle(
			this.x,
			this.y,
			radius,
			0xff0000,
			0.5,
		);

		// エフェクトをアニメーション（徐々に拡大してフェードアウト）
		this.scene.tweens.add({
			targets: deathEffect,
			alpha: 0,
			scale: 2.0,
			duration: 500,
			ease: "Power2",
			onComplete: () => {
				deathEffect.destroy();
			},
		});
	}

	/**
	 * プレイヤーがフィールド内にいるかどうかを判定する
	 * @returns フィールド内に少しでもいればtrue、完全にフィールド外ならfalse
	 */
	public isWithinField(): boolean {
		// 物理ボディを取得
		const body = this.body as Phaser.Physics.Arcade.Body;
		if (!body) return false;

		const radius = body.radius || body.width / 2;
		const bounds = this.scene.physics.world.bounds;

		// プレイヤーの中心座標
		const centerX = this.x;
		const centerY = this.y;

		// デバッグ用：座標とバウンド情報をログ出力
		console.log(
			`Player: ${this.id}, X: ${centerX}, Y: ${centerY}, Radius: ${radius}`,
		);
		console.log(
			`Bounds: X: ${bounds.x}, Y: ${bounds.y}, Width: ${bounds.width}, Height: ${bounds.height}`,
		);

		// プレイヤーの円形が完全にフィールド外に出ているかチェック
		// 円がフィールドと少しでも重なっていれば、フィールド内と判定
		const isCompletelyOutsideX =
			centerX + radius < bounds.x || centerX - radius > bounds.x + bounds.width;
		const isCompletelyOutsideY =
			centerY + radius < bounds.y ||
			centerY - radius > bounds.y + bounds.height;

		const isWithinField = !(isCompletelyOutsideX || isCompletelyOutsideY);

		// デバッグ用：判定結果をログ出力
		console.log(
			`Player: ${this.id}, isCompletelyOutsideX: ${isCompletelyOutsideX}, isCompletelyOutsideY: ${isCompletelyOutsideY}`,
		);
		console.log(`Player: ${this.id}, isWithinField: ${isWithinField}`);

		return isWithinField;
	}
}
