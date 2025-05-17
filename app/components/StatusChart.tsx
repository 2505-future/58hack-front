import { useEffect, useRef } from "react";
import type { UserStatus } from "~/utils/calcStatus";

interface StatusChartProps {
	status: UserStatus;
}

export default function StatusChart({ status }: StatusChartProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// キャンバスのサイズを設定
		const size = canvas.width;
		const centerX = size / 2;
		const centerY = size / 2;
		const radius = size * 0.4;

		// キャンバスをクリア
		ctx.clearRect(0, 0, size, size);

		// 背景の円を描画
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(30, 30, 30, 0.5)";
		ctx.fill();

		// グリッドを描画
		for (let i = 1; i <= 5; i++) {
			const gridRadius = (radius / 5) * i;
			ctx.beginPath();
			ctx.arc(centerX, centerY, gridRadius, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
			ctx.stroke();
		}

		// 軸を描画
		const axes = [
			{ label: "パワー", angle: 0 },
			{ label: "重量", angle: Math.PI / 2 },
			{ label: "ボリューム", angle: Math.PI },
			{ label: "CD", angle: (Math.PI * 3) / 2 },
		];

		for (const axis of axes) {
			const x = centerX + Math.cos(axis.angle) * radius;
			const y = centerY + Math.sin(axis.angle) * radius;

			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.lineTo(x, y);
			ctx.strokeStyle = "rgba(150, 150, 150, 0.5)";
			ctx.stroke();

			// 軸ラベルを描画
			ctx.fillStyle = "rgba(200, 200, 200, 0.8)";
			ctx.font = "12px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			const labelX = centerX + Math.cos(axis.angle) * (radius + 20);
			const labelY = centerY + Math.sin(axis.angle) * (radius + 20);
			ctx.fillText(axis.label, labelX, labelY);
		}

		// ステータス値を正規化（0〜1の範囲に）
		const normalizedPower = status.power / 100;
		const normalizedWeight = status.weight / 100;
		const normalizedVolume = status.volume / 100;
		// CDは逆数で評価（値が小さいほど良い）
		const normalizedCD = 1 - (status.cd - 1) / 999;

		// ステータスポイントの座標を計算
		const points = [
			{
				x: centerX + Math.cos(0) * radius * normalizedPower,
				y: centerY + Math.sin(0) * radius * normalizedPower,
			},
			{
				x: centerX + Math.cos(Math.PI / 2) * radius * normalizedWeight,
				y: centerY + Math.sin(Math.PI / 2) * radius * normalizedWeight,
			},
			{
				x: centerX + Math.cos(Math.PI) * radius * normalizedVolume,
				y: centerY + Math.sin(Math.PI) * radius * normalizedVolume,
			},
			{
				x: centerX + Math.cos((Math.PI * 3) / 2) * radius * normalizedCD,
				y: centerY + Math.sin((Math.PI * 3) / 2) * radius * normalizedCD,
			},
		];

		// ステータス領域を描画
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}
		ctx.closePath();
		ctx.fillStyle = "rgba(99, 102, 241, 0.3)";
		ctx.fill();
		ctx.strokeStyle = "rgba(99, 102, 241, 0.8)";
		ctx.lineWidth = 2;
		ctx.stroke();

		// ステータスポイントを描画
		const colors = [
			"rgba(239, 68, 68, 1)",
			"rgba(59, 130, 246, 1)",
			"rgba(34, 197, 94, 1)",
			"rgba(234, 179, 8, 1)",
		];
		for (let index = 0; index < points.length; index++) {
			const point = points[index];
			ctx.beginPath();
			ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);

			// 各ステータスに異なる色を使用
			ctx.fillStyle = colors[index];
			ctx.fill();
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 1;
			ctx.stroke();
		}
	}, [status]);

	return (
		<canvas
			ref={canvasRef}
			width={500}
			height={500}
			className="w-full h-auto max-w-[500px] mx-auto"
		/>
	);
}
