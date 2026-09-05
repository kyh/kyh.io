#!/bin/zsh
# End-to-end run against a deployed station, driven with agent-browser.
#
#   BASE_URL=https://autoplay.kyh.io OWNER_COOKIE=/tmp/owner-cookie zsh e2e/station.sh
#
# OWNER_COOKIE is the file e2e/owner-cookie.mjs prints. With LIVE=1 the run
# opens ONE real director session as the owner (~75 seconds, billed at fal's
# 60s minimum), records it, and then watches the replay anonymously; the
# default LIVE=0 skips the session and checks the replay of whatever is
# already recorded — free, and enough unless the live path itself changed.
# Against a development server, TESTPATTERN=1 goes live on the test card
# instead of fal, which exercises recording and the tail for nothing.
# Screenshots land in OUT_DIR (default: a temp directory).
set -u
H=${BASE_URL:?BASE_URL is required}
LIVE=${LIVE:-0}
LIVE_URL=$H${TESTPATTERN:+/?testpattern}
OWNER=$(cat "${OWNER_COOKIE:?OWNER_COOKIE is required}")
OUT=${OUT_DIR:-$(mktemp -d)}; mkdir -p "$OUT"
COOKIE_NAME=${OWNER%%=*}
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix autoplay-e2e)"

ab() { agent-browser "$@" 2>&1; }
unquote() { tr -d '"'; }
title() { ab eval "document.querySelector('.win-title p')?.textContent" | tail -1 | unquote; }
screen() { ab eval "document.querySelector('main .bevel-in')?.innerText.replace(/\\s+/g,' ').slice(0,120)" | tail -1; }
ticker() { ab eval "document.querySelector('.status-field')?.innerText.replace(/\\s+/g,' ').slice(0,70)" | tail -1; }
badge() { ab eval "document.body.innerText.match(/● LIVE|REPLAY/)?.[0] ?? 'none'" | tail -1 | unquote; }
# One line of plain JSON: the eval returns a JSON-encoded string, so unwrap it.
vid() { ab eval "(()=>{const v=document.querySelector('main video'); if(!v) return 'no video'; return JSON.stringify({live: !!v.srcObject, src: v.src.slice(0,5), t:+v.currentTime.toFixed(1), w:v.videoWidth, h:v.videoHeight})})()" | tail -1 | sed -E 's/^"//; s/"$//; s/\\"/"/g'; }
vidt() { node -e "try{console.log(JSON.parse(process.argv[1]).t)}catch{console.log(0)}" "$1"; }
setcookie() { ab eval "document.cookie = '${OWNER}; path=/; secure'" >/dev/null; }
clearcookie() { ab eval "document.cookie = '${COOKIE_NAME}=; path=/; max-age=0; secure'" >/dev/null; }
open() { ab open "$H" >/dev/null; ab wait --load networkidle >/dev/null; ab wait 3000 >/dev/null; }
# The newest session and its chunk count; totals shrink when retention drops an old session.
newest() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const n=j.sessions[0];console.log(n?n.sessionId+" "+n.chunks.length:"none 0")})'; }
pass=0; fail=0
check() { if [ "$2" = "$3" ]; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ $1 — got '$2', wanted '$3'"; fail=$((fail+1)); fi; }
checkmatch() { if [[ "$2" =~ $3 ]]; then echo "  ✓ $1"; pass=$((pass+1)); else echo "  ✗ $1 — got '$2'"; fail=$((fail+1)); fi; }

echo "### guards"
check "proxy refuses anonymous" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$H/api/fal/proxy" -H 'x-fal-target-url: https://wma.fal.run/session' -H 'Content-Type: application/json' -d '{"app_id":"minimax/h3-max/director"}')" 401
check "proxy refuses another model for the owner" "$(curl -s -o /dev/null -w '%{http_code}' -b "$OWNER" -X POST "$H/api/fal/proxy" -H 'x-fal-target-url: https://queue.fal.run/fal-ai/flux/dev' -H 'Content-Type: application/json' -d '{"prompt":"x"}')" 400
check "live refuses anonymous" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$H/api/live" -H 'Content-Type: application/json' -d '{"sourceId":"owner","opening":true}')" 401
check "upload token refuses anonymous" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$H/api/recordings/upload" -H 'Content-Type: application/json' -d '{"type":"blob.generate-client-token","payload":{"pathname":"recordings/owner/x.webm","callbackUrl":"","clientPayload":null,"multipart":false}}')" 403
check "recording register refuses a foreign url" "$(curl -s -o /dev/null -w '%{http_code}' -b "$OWNER" -X POST "$H/api/recordings" -H 'Content-Type: application/json' -d '{"sourceId":"owner","itemId":"x:1","url":"https://evil.example/x.webm","formatLabel":"x","text":"x","authorName":"x","authorUsername":"x","seconds":10,"bytes":1}')" 400
BEFORE=$(curl -s "$H/api/replay?sourceId=owner" | newest)
echo "  newest session before: $BEFORE"

echo; echo "### anonymous"
open; clearcookie; open
checkmatch "title is CH 01" "$(title)" '^AUTOPLAY.TV — CH 01'
echo "  screen: $(screen)"
ab screenshot "$OUT/anon-before.png" | tail -1

if [ "$LIVE" = "1" ]; then
echo; echo "### owner live on CH 01 (~75s, records)${TESTPATTERN:+ — test pattern}"
setcookie; ab open "$LIVE_URL" >/dev/null; ab wait --load networkidle >/dev/null; ab wait 3000 >/dev/null
check "signed in" "$(ab eval "!!document.body.innerText.match(/sign out/)" | tail -1)" "true"
LIVE_AT=""
for i in $(seq 1 15); do
  ab wait 5000 >/dev/null
  b=$(badge); [ "$b" = "● LIVE" ] && [ -z "$LIVE_AT" ] && LIVE_AT=$((i*5))
  echo "  t+$((i*5))s $b | $(ticker) | $(vid)"
done
checkmatch "went live" "$LIVE_AT" '^[0-9]+$'
echo "  programs: $(ab network requests --filter /api/live | grep -c POST), uploads: $(ab network requests --filter /api/recordings | grep -c POST)"
[ "$(badge)" != "● LIVE" ] && echo "  not live at the end — screen: $(screen)"
echo "  console: $(ab console 2>&1 | grep -E '\[live\]' | sed -E 's/.*\[live\]//' | head -3 | tr '\n' ' ')"
ab screenshot "$OUT/owner-live.png" | tail -1
ab find role button click --name "Pause" >/dev/null; ab wait 36000 >/dev/null
AFTER=$(curl -s "$H/api/replay?sourceId=owner" | newest)
echo "  newest session after: $AFTER"
checkmatch "a new session was recorded" "$([ "${AFTER%% *}" != "${BEFORE%% *}" ] && [ "${AFTER##* }" -ge 3 ] && echo yes || echo no)" '^yes$'
else
echo; echo "### owner live — skipped (LIVE=0)"
setcookie; open
fi

echo; echo "### owner: sources dialog"
ab find role button click --name "sources" >/dev/null; ab wait 1500 >/dev/null
check "dialog opens" "$(ab eval "document.querySelector('[role=dialog] h2')?.textContent" | tail -1 | unquote)" "Sources"
ab find label "Feed URL" fill "https://hnrss.org/frontpage" >/dev/null
ab find role button click --name "add feed" >/dev/null
for i in $(seq 1 10); do ab wait 1000 >/dev/null; ab eval "document.querySelectorAll('[role=dialog] li').length" | tail -1 | grep -q 2 && break; done
checkmatch "feed added as CH 02" "$(ab eval "Array.from(document.querySelectorAll('[role=dialog] li')).map(l=>l.innerText.replace(/\\s+/g,' ')).join(' || ')" | tail -1)" 'CH 02 FEED Hacker News'
echo "  dialog error: $(ab eval "document.querySelector('[role=dialog] .text-red-700')?.textContent ?? 'none'" | tail -1)"
ab find role button click --name "remove" >/dev/null; ab wait --load networkidle >/dev/null; ab wait 1500 >/dev/null
check "feed removed" "$(ab eval "document.querySelectorAll('[role=dialog] li').length" | tail -1)" 1
ab press Escape >/dev/null; ab wait 500 >/dev/null
check "escape closes dialog" "$(ab eval "document.querySelector('[role=dialog]') ? 'open' : 'closed'" | tail -1 | unquote)" "closed"

echo; echo "### anonymous replay"
clearcookie; open; ab wait 5000 >/dev/null
if [ "$(curl -s "$H/api/replay?sourceId=owner" | newest)" = "none 0" ]; then
  echo "  nothing recorded — skipped"
else
# Within a minute of the owner's last chunk the viewer is on the live tail.
checkmatch "badge is REPLAY (or the live tail)" "$(badge)" '^(REPLAY|● LIVE)$'
echo "  ticker: $(ticker)"
v1=$(vid); echo "  video: $v1"
checkmatch "plays a MediaSource stream" "$v1" '"src":"blob:"'
ab wait 25000 >/dev/null
v2=$(vid); echo "  after 25s: $v2"
t1=$(vidt "$v1"); t2=$(vidt "$v2")
checkmatch "kept playing through chunk boundaries" "$(node -e "console.log($t2 - $t1 > 15 ? 'yes' : 'no')")" '^yes$'
ab screenshot "$OUT/anon-replay.png" | tail -1
fi
clearcookie; ab close >/dev/null
echo; echo "pass $pass fail $fail (screenshots in $OUT)"
[ "$fail" -eq 0 ]
