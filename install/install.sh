#!/usr/bin/env bash
# Install dsh-theme-triptych into a dsh deployment profile.
#
# Usage:
#   bash install/install.sh                 # default profile: $DSH_PROFILE or "web"
#   bash install/install.sh <profile>       # e.g. "web"
#   bash install/install.sh <profile> <source>   # source: npm name, git URL, or local path
#
# Steps: 1) pnpm/npm add the package inside the profile dir
#        2) append the loader insert to cordis.patch.yml (or replace `[]`)
#        3) print restart + verification instructions
set -euo pipefail

PROFILE="${1:-${DSH_PROFILE:-web}}"
SOURCE="${2:-dsh-theme-triptych}"
PKG_NAME="dsh-theme-triptych"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"

if [ ! -f "$PROFILE_DIR/package.json" ]; then
  echo "error: profile directory not found: $PROFILE_DIR (pass the profile name as first arg)" >&2
  exit 1
fi

echo "==> installing '$SOURCE' into profile '$PROFILE' ($PROFILE_DIR)"
if command -v pnpm >/dev/null 2>&1; then
  (cd "$PROFILE_DIR" && pnpm add "$SOURCE")
elif command -v npm >/dev/null 2>&1; then
  (cd "$PROFILE_DIR" && npm install "$SOURCE")
else
  echo "error: neither pnpm nor npm found on PATH" >&2
  exit 1
fi

PATCH="$PROFILE_DIR/cordis.patch.yml"
if grep -q "name: $PKG_NAME" "$PATCH"; then
  echo "==> cordis.patch.yml already contains $PKG_NAME — nothing to patch"
else
  if [ "$(tr -d '[:space:]' < "$PATCH")" = "[]" ]; then
    cat > "$PATCH" <<'YAML'
# dsh-theme-triptych — appearance themes (added by installer)
- insert:
    - id: dsh-theme-triptych
      name: dsh-theme-triptych
YAML
    echo "==> replaced empty patch with the $PKG_NAME insert"
  else
    cat >> "$PATCH" <<'YAML'

# dsh-theme-triptych — appearance themes (added by installer)
- insert:
    - id: dsh-theme-triptych
      name: dsh-theme-triptych
YAML
    echo "==> appended the $PKG_NAME insert to cordis.patch.yml"
  fi
fi

echo
echo "Done. Restart dsh, e.g.:  dsh --profile $PROFILE"
echo "Verify wallpaper route:   curl -I http://127.0.0.1:3080/dsh-theme-triptych/nexus.jpg"
echo "Then in the Web GUI: sidebar-footer palette button, or Settings -> General -> 外观主题"
