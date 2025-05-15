import {
	cloudflareDevProxyVitePlugin,
	vitePlugin as remix,
} from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { getLoadContext } from "./load-context";
import { cjsInterop } from "vite-plugin-cjs-interop";

declare module "@remix-run/cloudflare" {
	interface Future {
		v3_singleFetch: true;
	}
}

export default defineConfig({
	plugins: [
		cloudflareDevProxyVitePlugin({
			getLoadContext,
		}),
		remix({
			future: {
				v3_fetcherPersist: true,
				v3_relativeSplatPath: true,
				v3_throwAbortReason: true,
				v3_singleFetch: true,
				v3_lazyRouteDiscovery: true,
			},
		}),
		tsconfigPaths(),

		// CommonJS ライブラリを ESModule 環境で使用するためのプラグイン
		cjsInterop({
			dependencies: [
				"react-loader-spinner",
				// ここにライブラリ名を追加
			]
		})
	],
	ssr: {
		resolve: {
			conditions: ["workerd", "worker", "browser"],
		},
	},
	resolve: {
		mainFields: ["browser", "module", "main"],
	},
	build: {
		minify: true,
	},
});
