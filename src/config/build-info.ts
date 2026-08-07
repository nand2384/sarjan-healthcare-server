import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPackageVersion(): string {
    try {
        const pkgPath = join(__dirname, "..", "..", "package.json");
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
