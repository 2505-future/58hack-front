import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	redirect,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Form } from "@remix-run/react";
import { serializeCookieHeader } from "@supabase/ssr";
import { Octokit } from "octokit";

import { signOut } from "~/utils/auth.server";
import { getGitHubToken } from "~/utils/cookies.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const token = await getGitHubToken(request);

	if (!token) {
		return {
			error: "No GitHub token found",
			status: 401,
		};
	}

	const response = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `token ${token}`,
			Accept: "application/json",
			"User-Agent": "58-supabase",
		},
	});

	if (response.status !== 200) {
		return {
			error: "Failed to fetch GitHub user info",
			status: response.status,
		};
	}

	const userData = await response.json();
	return { user: userData };
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
	const { data, headers } = await signOut(request, context);

	headers.append(
		"Set-Cookie",
		serializeCookieHeader("58hack-github-token", "", {
			httpOnly: true,
			secure: true,
			path: "/",
			sameSite: "lax",
			expires: new Date(0),
		}),
	);

	return redirect(data.url, { headers });
};

export default function AuthCode() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
				<h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
					認証完了
				</h2>

				{data && data.user && (
					<div className="mb-6 rounded-md bg-gray-100 p-4">
						<div className="flex items-center">
							<img
								src={data.user.avatar_url}
								alt="User Avatar"
								className="mr-4 h-12 w-12 rounded-full"
							/>
							<div>
								<h3 className="font-bold text-gray-800">{data.user.login}</h3>
							</div>
						</div>
					</div>
				)}

				<Form method="post">
					<button
						type="submit"
						className="flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-3 text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="mr-2 h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="text-base font-medium">ログアウト</span>
					</button>
				</Form>
			</div>
		</div>
	);
}
