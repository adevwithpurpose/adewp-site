#!/bin/bash
# adewp-site auto-deploy (cPanel cron). Pulls latest main and publishes to the
# addon-domain docroot. Mirrors the tasks in .cpanel.yml. No secrets, safe to run often.
set -u

# one run at a time
exec 9>/tmp/adewp-deploy.lock
flock -n 9 || exit 0

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYPATH=/home/dronecul/adevwithpurpose.com/

cd "$REPO_DIR" || exit 1

MARKER=/home/dronecul/adewp-deploy.commit

SELF_BEFORE=$(md5sum "$0" | cut -d' ' -f1)
git fetch origin main --quiet || exit 1
git reset --hard origin/main --quiet || exit 1
NEW=$(git rev-parse HEAD 2>/dev/null)

# the reset may have replaced this script mid-run; re-exec the fresh copy once
if [ -z "${ADWP_REEXEC:-}" ] && [ "$(md5sum "$0" | cut -d' ' -f1)" != "$SELF_BEFORE" ]; then
  export ADWP_REEXEC=1
  exec /bin/bash "$0"
fi

# deploy whenever the docroot is behind main, no matter how the repo got updated
DEPLOYED=$(cat "$MARKER" 2>/dev/null || echo none)
[ "$NEW" = "$DEPLOYED" ] && exit 0

echo "$(date '+%Y-%m-%d %H:%M:%S') deploying $NEW"

/bin/cp index.html "$DEPLOYPATH"
/bin/mkdir -p "$DEPLOYPATH/assets/css" "$DEPLOYPATH/assets/js/vendor" "$DEPLOYPATH/assets/fonts" "$DEPLOYPATH/assets/videos"
/bin/cp assets/css/styles.css assets/css/v4.css assets/css/v5.css "$DEPLOYPATH/assets/css/"
/bin/cp assets/js/main.js assets/js/main-v5.js "$DEPLOYPATH/assets/js/"
/bin/cp assets/js/vendor/gsap.min.js assets/js/vendor/ScrollTrigger.min.js assets/js/vendor/three.module.min.js "$DEPLOYPATH/assets/js/vendor/"
/bin/cp assets/fonts/space-grotesk-latin.woff2 assets/fonts/space-grotesk-latinext.woff2 assets/fonts/jetbrains-mono-latin.woff2 assets/fonts/jetbrains-mono-latinext.woff2 "$DEPLOYPATH/assets/fonts/"
/bin/cp assets/favicon.svg assets/favicon-32.png assets/apple-touch-icon.png assets/og.png assets/opengrammar-demo.gif "$DEPLOYPATH/assets/" 2>/dev/null || true

/bin/cp assets/videos/northwind.mp4 assets/videos/harbor.mp4 assets/videos/fernwood.mp4 assets/videos/atlas.mp4 "$DEPLOYPATH/assets/videos/"
/bin/cp assets/videos/northwind-poster.jpg assets/videos/harbor-poster.jpg assets/videos/fernwood-poster.jpg assets/videos/atlas-poster.jpg "$DEPLOYPATH/assets/videos/"

echo "$NEW" > "$MARKER"
echo "$(date '+%Y-%m-%d %H:%M:%S') done"
