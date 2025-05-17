import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { FaRegCopy } from "react-icons/fa";
import * as pkg from "react-loader-spinner";
import { ClientOnly } from "remix-utils/client-only";
import { type User, getUsers } from "~/api/getUsers.server";
import { githubGraphQLAtom, githubUserAtom } from "~/atoms/githubUser";
import { websocketAtom } from "~/atoms/socket";
import StartButton from "~/components/StartButton";
import calcStatus from "~/utils/calcStatus";
import genPoint from "~/utils/genPoint.client";
const { Grid } = pkg;

type Player = {
	id: string;
	iconUrl: string;
};

interface PlayerCardProps {
	player: Player;
}

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
	const websocketUrl = context.cloudflare.env.WS_URL;
	const apiUrl = context.cloudflare.env.API_URL;

	const url = new URL(request.url);
	const roomID = url.searchParams.get("roomId");
	if (!roomID) {
		throw new Error("Room ID is required");
	}

	const result = await getUsers(roomID, apiUrl);

	return {
		websocketUrl,
		apiUrl,
		roomID,
		users: result.users,
	};
};

const PlayerCard = (props: PlayerCardProps) => {
	return (
		<div style={styles.card}>
			<div style={styles.iconContainer}>
				<img
					src={props.player.iconUrl}
					alt={`Icon for player ${props.player.id}`}
					style={styles.icon}
				/>
			</div>
			<div style={styles.idContainer}>
				<div>
					<span style={styles.id}>@{props.player.id}</span>
				</div>
			</div>
		</div>
	);
};

const styles = {
	card: {
		display: "flex",
		flexDirection: "row" as const,
		alignItems: "center" as const,
		border: "1px solid #ccc",
		borderRadius: "5px",
		padding: "10px",
		margin: "5px",
		width: "300px",
	},
	idContainer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "80%",
		height: "100%",
	},
	id: {
		fontSize: "0.9em",
		color: "#666",
	},
	iconContainer: {
		width: "50px",
		height: "50px",
		borderRadius: "50%",
		overflow: "hidden" as const,
	},
	icon: {
		width: "100%",
		height: "100%",
		objectFit: "cover" as const,
	},
};

const WaitingRoom = () => {
	const { websocketUrl, apiUrl, roomID, users } =
		useLoaderData<typeof loader>();
	const socketRef = useRef<WebSocket | null>(null);
	const [players, setPlayers] = useState<Player[]>(
		users.map((user: User) => ({
			id: user.userId,
			iconUrl: user.iconUrl,
		})),
	);
	const githubUser = useAtomValue(githubUserAtom);
	const githubStatus = useAtomValue(githubGraphQLAtom);
	const [, setWebsocket] = useAtom(websocketAtom);
	const router = useNavigate();
	const [isCopied, setIsCopied] = useState(false);
	const redirectRef = useRef(false);

	useEffect(() => {
		const { x, y } = genPoint();

		// GitHubの情報をもとに計算する
		const { power, weight, volume, cd } = calcStatus(githubStatus);

		// GitHubユーザー情報を使用する
		const userID = githubUser?.login || "guest";
		const iconUrl =
			githubUser?.avatar_url ||
			"https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";

		const params = new URLSearchParams({
			roomID,
			userID,
			iconUrl,
			power: power.toString(),
			weight: weight.toString(),
			volume: volume.toString(),
			cd: cd.toString(),
			x: x.toString(),
			y: y.toString(),
		});

		const ws = new WebSocket(`${websocketUrl}?${params.toString()}`);
		socketRef.current = ws;

		ws.onopen = async () => {
			console.log("WebSocket connected");
			setWebsocket(ws);
			setPlayers((prevPlayers) => [...prevPlayers, { id: userID, iconUrl }]);
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === "join") {
				if (data.message.id === githubUser?.login) {
					return;
				}
				setPlayers((prevPlayers) => [
					...prevPlayers,
					{
						id: data.message.id,
						iconUrl: data.message.icon_url,
					},
				]);
			} else if (data.type === "leave") {
				setPlayers((prevPlayers) =>
					prevPlayers.filter((player) => player.id !== data.message.id),
				);
			} else if (data.type === "start") {
				redirectRef.current = true;
				router(`/game?roomId=${roomID}`);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		ws.onclose = (event) => {
			console.warn("WebSocket closed", {
				code: event.code,
				reason: event.reason,
				wasClean: event.wasClean,
			});
		};

		return () => {
			if (!redirectRef.current) {
				ws.close();
			}
		};
	}, [websocketUrl, githubUser]);

	// クリップボードにコピー
	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => {
			setIsCopied(false);
		}, 2000);
		console.log("copied to clipboard");
	};

	return (
		<ClientOnly>
			{() => (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						marginTop: "80px",
					}}
				>
					<div style={{ marginBottom: "20px", fontSize: "20px" }}>
						合言葉をコピーして、友達と共有してください
					</div>
					{/* 部屋ID */}
					<div className="container">
						<div className="flex items-center justify-center gap-2">
							{roomID}
							<button
								onClick={() => copyToClipboard(roomID)}
								className="relative"
							>
								<FaRegCopy className={isCopied ? "text-green-500" : ""} />
								{isCopied && (
									<span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white text-xs py-1 px-4 rounded whitespace-nowrap min-w-90px] text-center">
										Copied!
									</span>
								)}
							</button>
						</div>
					</div>

					<div className="mt-3">
						<Grid
							height="50"
							width="50"
							color="#4fa94d"
							ariaLabel="audio-loading"
							wrapperStyle={{}}
							wrapperClass="wrapper-class"
							visible={true}
						/>
					</div>
					<div
						style={{
							marginTop: "24px",
							marginBottom: "24px",
							color: "#666",
							fontSize: "18px",
						}}
					>
						しばらくお待ちください...
					</div>
					<div>
						<div>
							{players.map((player: Player) => (
								<PlayerCard key={player.id} player={player} />
							))}
						</div>
					</div>
					{/* ゲーム開始ボタン */}
					<div style={{ margin: "20px" }}>
						<StartButton apiUrl={apiUrl} roomId={roomID} />
					</div>
				</div>
			)}
		</ClientOnly>
	);
};

export default WaitingRoom;
