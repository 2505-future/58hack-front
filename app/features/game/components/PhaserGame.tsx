import { useNavigate } from "@remix-run/react";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { websocketAtom } from "~/atoms/socket";
import { createGameConfig } from "../core/config/configLoader";
import type { GameSettings, PlayerData } from "../core/config/gameSettings";

interface PhaserGameProps {
	gameSettings: GameSettings;
	players?: PlayerData[];
	mainPlayerId?: string;
}

/**
 * Phaserゲームコンポーネント
 *
 * @param props.gameSettings ゲーム設定
 * @param props.players プレイヤーデータ配列
 * @param props.mainPlayerId メインプレイヤーID
 */
export default function PhaserGame({
	gameSettings,
	players = [],
	mainPlayerId,
}: PhaserGameProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const gameInitializedRef = useRef<boolean>(false);
	const ws = useAtomValue(websocketAtom);
	const navigate = useNavigate();

	// ゲーム終了時のリダイレクトイベントリスナー
	useEffect(() => {
		const handleGameRedirect = () => {
			console.log("Redirecting to result page");
			navigate("/result");
		};

		// イベントリスナーを追加
		window.addEventListener("gameRedirectToResult", handleGameRedirect);

		// クリーンアップ関数
		return () => {
			if (ws) {
				ws.close();
			}
			window.removeEventListener("gameRedirectToResult", handleGameRedirect);
		};
	}, [navigate]);

	// Phaserの初期化処理をClientOnlyの外に出し、コンテナ要素が存在する場合のみ実行する
	const initPhaser = async () => {
		if (!containerRef.current || gameInitializedRef.current) return;
		if (containerRef.current.querySelector("canvas")) return;

		try {
			// プレイヤーデータを加工してゲーム設定に追加
			const processedPlayers = players.map((player) => ({
				...player,
				isMainPlayer: player.id === mainPlayerId,
			}));

			// 設定をコピーしてプレイヤーデータを追加
			const gameSettingsWithPlayers = {
				...gameSettings,
				players: processedPlayers,
			};

			const config = await createGameConfig(
				gameSettingsWithPlayers,
				containerRef.current,
			);

			const game = new Phaser.Game(config);
			gameInitializedRef.current = true;

			// コンポーネントのアンマウント時にゲームを破棄するためにcleanup関数を返す
			return () => {
				if (game) {
					game.destroy(true);
					gameInitializedRef.current = false;
				}
			};
		} catch (error) {
			console.error("Failed to initialize Phaser:", error);
		}
	};

	// クライアントサイドの処理のため、useEffectを使用する
	useEffect(() => {
		// ClientOnlyの中でレンダリングされた後にPhaserを初期化するため、
		// setTimeout を使って非同期にする
		const timeoutId = setTimeout(() => {
			initPhaser();
		}, 0);

		return () => {
			clearTimeout(timeoutId);
		};
	}, []);

	return (
		<ClientOnly>
			{() => (
				<div
					ref={containerRef}
					id="phaser-container"
					className="w-[800px] h-[600px]"
				/>
			)}
		</ClientOnly>
	);
}
