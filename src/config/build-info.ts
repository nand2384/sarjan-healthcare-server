import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// This project runs as native ESM ("type": "module") — __dirname isn't
// defined here (confirmed: tsx does not polyfill it), so it has to be
// derived from import.meta.url instead.
const currentDir = dirname(fileURLToPath(import.meta.url));

function readPackageVersion(): string {
    try {
        const pkgPath = join(currentDir, "..", "..", "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
        return pkg.version ?? "unknown";
    } catch {
        return "unknown";
    }
}

function readGitCommit(): string {
    try {
        return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
        return "unknown";
    }
}

// Computed once at module load — process.env-derived values (set explicitly by
// the hosting platform) take precedence in health.service.ts; these are only
// the fallback when APP_VERSION/GIT_COMMIT_SHA aren't configured.
export const buildInfo = Object.freeze({
    fallbackVersion: readPackageVersion(),
    fallbackCommit: readGitCommit(),
});
