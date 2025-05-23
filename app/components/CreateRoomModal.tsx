import { useNavigate } from "@remix-run/react";
import type React from "react";
import { useState } from "react";
import { type CreateRoomRequest, createRoom } from "~/api/createRoom.client";
import * as pkg from "react-loader-spinner";
const { InfinitySpin } = pkg;
import { ClientOnly } from "remix-utils/client-only";

interface CreateRoomModalProps {
	open: boolean;
	onClose: () => void;
	apiUrl: string;
}

const maxPlayersOptions = [2, 3, 4, 5, 6, 7, 8];

const styles = {
	overlay: {
		position: "fixed" as const,
		top: 0,
		left: 0,
		width: "100vw",
		height: "100vh",
		background: "rgba(0,0,0,0.3)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
		color:"black",

	},
	modal: {
		background: "#f3f4f6",
		borderRadius: "12px",
		padding: "32px",
		minWidth: "340px",
		boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
		position: "relative" as const,
	},
	backButton: {
		position: "absolute" as const,
		top: 16,
		left: 16,
		background: "none",
		border: "none",
		fontSize: "16px",
		cursor: "pointer",
		color: "#333",
	},
	title: { margin: 0, fontSize: "1.7rem", fontWeight: 700, color: "black" }, // text-gray-700
	subtitle: { color: "#6b7280", marginBottom: 24 }, // text-gray-500
	formGroup: { marginBottom: 24 },
	input: {
		width: "100%",
		padding: "10px",
		border: "1px solid #ddd",
		borderRadius: "6px",
		fontSize: "16px",
		marginTop: 6,
		background: "#fff",
		color: "black",
	},
	submitButton: {
		width: "100%",
		padding: "12px 0",
		background: "#111",
		color: "#fff",
		border: "none",
		borderRadius: "8px",
		fontSize: "17px",
		fontWeight: 600,
		cursor: "pointer",
	},
};

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
	open,
	onClose,
	apiUrl,
}) => {
	const [roomName, setRoomName] = useState("");
	const [maxPlayers, setMaxPlayers] = useState(4);
	const [submitting, setSubmitting] = useState(false);

	const router = useNavigate();

	if (!open) return null;

	const handleSubmitting = () => {
		if (roomName.length > 0) {
			setSubmitting(true);
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const cookie = document.cookie
			.split("; ")
			.find((row) => row.startsWith("58hack-user-id="));
		const userId = cookie?.split("=")[1];

		if (!userId) {
			alert("ユーザーIDが見つかりません。");
			return;
		}

		const request: CreateRoomRequest = {
			host_id: userId,
			name: roomName,
			capacity: maxPlayers,
		};

		const data = await createRoom(request, apiUrl);
		if (data !== undefined || null) {
			router(`/waiting?roomId=${data.room_id}`);
		} else{
			window.alert("部屋の作成に失敗しました");
			setSubmitting(false);
			onClose();
		}
	};

	return (
		<ClientOnly>
			{() => (
				<div style={{...styles.overlay}}>
					<div style={{ ...styles.modal, background: "white" }}>
						<button
							type="button"
							style={{
								position: "absolute",
								top: 16,
								right: 16,
								background: "none",
								border: "none",
								fontSize: "20px",
								cursor: "pointer",
							}}
							aria-label="閉じる"
							onClick={onClose}
						>
							×
						</button>
						<h2 style={styles.title}>部屋を作成</h2>
						<p style={styles.subtitle}>あいことばを設定して部屋を作成しましょう</p>
						<form onSubmit={handleSubmit}>
							<div style={styles.formGroup}>
								<label htmlFor="roomName" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>部屋の名前</label>
								<input
									type="text"
									id="roomName"
									placeholder="例: 楽しいゲーム部屋"
									value={roomName}
									onChange={(e) => setRoomName(e.target.value)}
									style={styles.input}
									required
								/>
							</div>
							<div style={styles.formGroup}>
								<label htmlFor="maxPlayers" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>最大プレイヤー数</label>
								<select
									value={maxPlayers}
									id="maxPlayers"
									onChange={(e) => setMaxPlayers(Number(e.target.value))}
									style={styles.input}
								>
									{maxPlayersOptions.map((opt) => (
										<option key={opt} value={opt}>
											{opt}
										</option>
									))}
								</select>
							</div>
							<button type="submit" style={styles.submitButton} onClick={() => handleSubmitting()}>
								<div className="flex items-center justify-center h-10">
									{submitting && roomName.length > 0 ? <InfinitySpin width="200"/> : "部屋を作成"}
								</div>
							</button>
						</form>
					</div>
				</div>
			)}
		</ClientOnly>
	);
};

export default CreateRoomModal;
