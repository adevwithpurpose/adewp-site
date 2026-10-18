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

OLD=$(git rev-parse HEAD 2>/dev/null)
git fetch origin main --quiet || exit 1
git reset --hard origin/main --quiet || exit 1
NEW=$(git rev-parse HEAD 2>/dev/null)

# nothing new -> nothing to do
[ "$OLD" = "$NEW" ] && exit 0

echo "$(date '+%Y-%m-%d %H:%M:%S') deploying $NEW"

/bin/cp index.html "$DEPLOYPATH"
/bin/mkdir -p "$DEPLOYPATH/assets/css" "$DEPLOYPATH/assets/js/vendor" "$DEPLOYPATH/assets/fonts"
/bin/cp assets/css/styles.css "$DEPLOYPATH/assets/css/"
/bin/cp assets/js/main.js "$DEPLOYPATH/assets/js/"
/bin/cp assets/js/vendor/gsap.min.js assets/js/vendor/ScrollTrigger.min.js assets/js/vendor/three.module.min.js "$DEPLOYPATH/assets/js/vendor/"
/bin/cp assets/fonts/space-grotesk-latin.woff2 assets/fonts/space-grotesk-latinext.woff2 assets/fonts/jetbrains-mono-latin.woff2 assets/fonts/jetbrains-mono-latinext.woff2 "$DEPLOYPATH/assets/fonts/"
/bin/cp assets/favicon.svg assets/favicon-32.png assets/apple-touch-icon.png assets/og.png "$DEPLOYPATH/assets/" 2>/dev/null || true

echo "$(date '+%Y-%m-%d %H:%M:%S') done"
