import type { UserStatus } from "~/utils/calcStatus";
import StatusChart from "./StatusChart";

interface StatusCardProps {
	status: UserStatus;
}

export default function StatusCard({ status }: StatusCardProps) {
	// 総合評価を計算（単純な平均）
	const calculateOverallRating = () => {
		// CDは逆数で評価（値が小さいほど良い）
		const normalizedCD = 100 - ((status.cd - 1) / 999) * 100;
		return Math.round(
			(status.power + status.weight + status.volume + normalizedCD) / 4,
		);
	};

	const overallRating = calculateOverallRating();

	// 評価に基づくランク
	const getRank = (rating: number) => {
		if (rating >= 90) return { label: "S", color: "bg-purple-500" };
		if (rating >= 80) return { label: "A", color: "bg-red-500" };
		if (rating >= 70) return { label: "B", color: "bg-orange-500" };
		if (rating >= 60) return { label: "C", color: "bg-yellow-500" };
		if (rating >= 50) return { label: "D", color: "bg-green-500" };
		return { label: "E", color: "bg-blue-500" };
	};

	const rank = getRank(overallRating);

	return (
		<div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg text-white overflow-hidden">
			<div className="p-4 border-b border-gray-700">
				<div className="flex justify-between items-center">
					<h3 className="text-xl font-bold">エンジニア戦闘力</h3>
					<span
						className={`${rank.color} text-white text-lg px-3 py-1 rounded-full font-bold`}
					>
						ランク {rank.label}
					</span>
				</div>
				<p className="text-sm text-gray-400">総合評価: {overallRating}/100</p>
			</div>

			{/* 横長レイアウト - モバイルでは縦積み、md以上で横並び */}
			<div className="p-5 flex flex-col md:flex-row gap-6">
				{/* 左側：チャート */}
				<div className="md:w-1/2 flex items-center justify-center">
					<StatusChart status={status} />
				</div>

				{/* 右側：ステータス一覧 */}
				<div className="md:w-1/2 space-y-4">
                {[
                {
                    title: 'パワー',
                    value: `${status.power}/100`,
                    description: '直近1年の総コミット数 × ストリーク日数から計算。活動の勢いが強いほど「ふきとばしやすさ」が上昇。',
                    percent: status.power,
                    icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                    </svg>
                    ),
                    iconBg: 'bg-red-500/20',
                    iconText: 'text-red-400',
                    barColor: 'bg-red-500',
                },
                {
                    title: '体重',
                    value: `${status.weight}/100`,
                    description: '直近1年のコミット日数に基づいて算出。継続的に活動している人ほど「ふきとばされにくく」なります。',
                    percent: status.weight,
                    icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                    </svg>
                    ),
                    iconBg: 'bg-blue-500/20',
                    iconText: 'text-blue-400',
                    barColor: 'bg-blue-500',
                },
                {
                    title: 'ボリューム',
                    value: `${status.volume}/100`,
                    description: 'こちらもコミット日数から計算。毎日積み重ねていると「体が大きく」なり、存在感が増します。',
                    percent: status.volume,
                    icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 18.12V6.48a3 3 0 0 0-1.7-2.71L12 0 3.7 3.77A3 3 0 0 0 2 6.48v11.64a3 3 0 0 0 1.7 2.71L12 24l8.3-3.77a3 3 0 0 0 1.7-2.71Z" />
                        <path d="M12 12v12" />
                        <path d="M12 12 2.1 6.88" />
                        <path d="m12 12 9.9-5.12" />
                    </svg>
                    ),
                    iconBg: 'bg-green-500/20',
                    iconText: 'text-green-400',
                    barColor: 'bg-green-500',
                },
                {
                    title: 'クールダウン',
                    value: `${status.cd}/1000`,
                    description: '直近1年のPR・レビュー数をもとに調整。アウトプットが多い人ほど「動き出しが早く」なります。',
                    percent: (status.cd / 1000) * 100,
                    icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    ),
                    iconBg: 'bg-yellow-500/20',
                    iconText: 'text-yellow-400',
                    barColor: 'bg-yellow-500',
                }
                ].map((item, idx) => (
                <div key={idx} className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr] items-center gap-4 bg-gray-700 p-3 rounded-lg">
                    {/* アイコン */}
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full ${item.iconBg} ${item.iconText}`}>
                    {item.icon}
                    </div>

                    {/* 内容（左・中・右） */}
                    <div className="grid grid-cols-1 md:grid-cols-[120px_minmax(0,300px)_120px] gap-2 md:gap-4 items-center w-full">
                    {/* 左：タイトル */}
                    <div>
                        <div className="text-xs text-gray-300">{item.title}</div>
                        <div className="font-bold text-lg">{item.value}</div>
                    </div>

                    {/* 中：説明 */}
                    <div className="text-xs text-gray-400">{item.description}</div>

                    {/* 右：バー */}
                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                        <div
                        className={`${item.barColor} h-2.5 rounded-full`}
                        style={{ width: `${item.percent}%` }}
                        ></div>
                    </div>
                    </div>
                </div>
                ))}
					<div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
						<div className="text-center mb-2">総合評価</div>
						<div className="flex items-center justify-center gap-3">
							<div
								className={`${rank.color} w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-bold`}
							>
								{rank.label}
							</div>
							<div className="text-4xl font-bold">{overallRating}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
