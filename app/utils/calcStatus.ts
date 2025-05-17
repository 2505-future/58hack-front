import type { GitHubGraphQL } from "~/types/github";

export type UserStatus = {
	power: number; // 1~100
	weight: number; // 1~100
	volume: number; // 1~100
	cd: number; // 1~1000 (ms)
};

const normalize = (
	value: number,
	maxValue: number,
	min = 1,
	max = 100,
): number => {
	if (value <= 0) return min;
	const normalized = (value / maxValue) * (max - min) + min;
	return Math.min(Math.max(Math.round(normalized), min), max);
};

const calcStatus = (info: GitHubGraphQL | null): UserStatus => {
	if (!info) {
		return {
			power: 0,
			weight: 0,
			volume: 0,
			cd: 0,
		};
	}

	const {
		contributionCount,
		commitStreak,
		commitDays,
		totalPullRequestContributions,
		totalIssueContributions,
	} = info;

	const rawPower = contributionCount * commitStreak;
	const power = normalize(rawPower, 20000);

	const weight = normalize(commitDays, 365);
	const volume = normalize(commitDays, 365);

	const prAndIssue = totalPullRequestContributions + totalIssueContributions;
	const cdRaw = 1000 - normalize(prAndIssue, 500, 0, 900);
	const cd = Math.min(Math.max(Math.round(cdRaw), 100), 1000);

	return {
		power,
		weight,
		volume,
		cd,
	};
};

export default calcStatus;
