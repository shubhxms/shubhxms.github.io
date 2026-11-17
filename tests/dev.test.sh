#!/usr/bin/env bash
# Tests bin/dev's restarts with a stand-in for hugo (HUGO=…), so no real
# server runs. Each case: what the stand-in prints, and how bin/dev must
# respond.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

# A stand-in hugo: counts its runs in $TMP/runs; on the run named by
# CRASH_ON it prints a Go runtime error from a rebuild and waits to be
# killed, otherwise it prints what $SAYS holds and exits 0 (as hugo server
# does on Ctrl-C).
cat >"$TMP/hugo" <<'EOF'
#!/usr/bin/env bash
runs=$(( $(cat "$TMP/runs" 2>/dev/null || echo 0) + 1 ))
echo "$runs" >"$TMP/runs"
if [ "$runs" = "${CRASH_ON:-0}" ]; then
	echo 'ERROR Rebuild failed: render: failed to render pages: error calling Summary: runtime error: slice bounds out of range [:587] with capacity 576'
	exec sleep 30 # one process, as hugo is, so a kill ends it
fi
echo "${SAYS:-Web Server is available}"
exit 0
EOF
chmod +x "$TMP/hugo"

run_dev() {
	rm -f "$TMP/runs"
	TMP="$TMP" HUGO="$TMP/hugo" "$ROOT/bin/dev" >"$TMP/out" 2>&1 &
	local pid=$!
	for _ in $(seq 1 50); do
		kill -0 "$pid" 2>/dev/null || break
		sleep 0.1
	done
	if kill -0 "$pid" 2>/dev/null; then
		kill "$pid"
		fail "bin/dev did not finish: $(cat "$TMP/out")"
	fi
	wait "$pid" || fail "bin/dev exited with $?: $(cat "$TMP/out")"
}

# A runtime error during a rebuild: Hugo's state is broken, so bin/dev
# starts it again from scratch, and says so.
CRASH_ON=1 run_dev
[ "$(cat "$TMP/runs")" = 2 ] || fail "a rebuild crash should restart hugo once (ran $(cat "$TMP/runs"))"
grep -q 'runtime error' "$TMP/out" || fail 'the crash should still be shown'
grep -q 'bin/dev: Hugo crashed' "$TMP/out" || fail 'bin/dev should say why it restarted'

# An ordinary error (a template mistake) is shown and left alone: the
# server stays up for the fix, no restart.
CRASH_ON=0 SAYS='ERROR Rebuild failed: template: partials/x.html:3: unexpected EOF' run_dev
[ "$(cat "$TMP/runs")" = 1 ] || fail 'an ordinary error should not restart hugo'
grep -q 'unexpected EOF' "$TMP/out" || fail 'the error should be shown'

echo 'bin/dev tests passed'
