#!/usr/bin/env bash
set -euo pipefail

REPO="anomalyco/OrchOS"
VERSION="${ORCHOS_CLI_VERSION:-latest}"
BIN_DIR="${ORCHOS_CLI_BIN_DIR:-/usr/local/bin}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { printf "${CYAN}%s${NC}\n" "$*"; }
ok()    { printf "${GREEN}%s${NC}\n" "$*"; }
warn()  { printf "${YELLOW}%s${NC}\n" "$*"; }
error() { printf "${RED}%s${NC}\n" "$*"; exit 1; }

detect_platform() {
  local os arch ext=""

  case "$(uname -s)" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    MINGW*|MSYS*|CYGWIN*)
      os="windows"
      ext=".exe"
      ;;
    *) error "Unsupported OS: $(uname -s). Only Linux, macOS, and Windows (Git Bash) are supported." ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) error "Unsupported architecture: $(uname -m). Only x86_64 and arm64 are supported." ;;
  esac

  echo "${os}-${arch} ${ext}"
}

install_prebuilt_binary() {
  local platform="$1" ext="$2" bin_name="orchos-cli${ext}"
  local url

  if [ "$VERSION" = "latest" ]; then
    url="https://github.com/${REPO}/releases/latest/download/orchos-cli-${platform}${ext}"
  else
    url="https://github.com/${REPO}/releases/download/${VERSION}/orchos-cli-${platform}${ext}"
  fi

  info "Downloading orchos-cli for ${platform}..."
  tmpdir=$(mktemp -d)
  trap 'rm -rf "$tmpdir"' EXIT

  if command -v curl &>/dev/null; then
    curl -fsSL "$url" -o "$tmpdir/${bin_name}"
  elif command -v wget &>/dev/null; then
    wget -q "$url" -O "$tmpdir/${bin_name}"
  else
    return 1
  fi

  chmod +x "$tmpdir/${bin_name}"
  cp "$tmpdir/${bin_name}" "${BIN_DIR}/${bin_name}"
  ok "Installed orchos-cli to ${BIN_DIR}/${bin_name}"
}

install_with_bun() {
  info "Building orchos-cli from source (requires Bun)..."

  if ! command -v bun &>/dev/null; then
    info "Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
  fi

  tmpdir=$(mktemp -d)
  trap 'rm -rf "$tmpdir"' EXIT

  info "Cloning ${REPO}..."
  git clone --depth 1 "https://github.com/${REPO}.git" "$tmpdir" 2>/dev/null || {
    error "Failed to clone repository. Make sure git is installed."
  }

  (cd "$tmpdir/apps/cli" && bun install && bun run build:binary)

  local binary
  binary=$(find "$tmpdir/apps/cli" -maxdepth 1 -name "orchos-cli*" -type f 2>/dev/null | head -1)
  if [ -z "$binary" ]; then
    error "Build failed: no binary found."
  fi

  cp "$binary" "${BIN_DIR}/orchos-cli"
  chmod +x "${BIN_DIR}/orchos-cli"
  ok "Built and installed orchos-cli to ${BIN_DIR}/orchos-cli"
}

main() {
  local platform ext
  read -r platform ext <<< "$(detect_platform)"

  if [ ! -w "$BIN_DIR" ]; then
    warn "Note: Installing to ${BIN_DIR} may require sudo."
    warn "Set ORCHOS_CLI_BIN_DIR to a writable directory to avoid this."
  fi

  if install_prebuilt_binary "$platform" "$ext"; then
    :
  else
    warn "Pre-built binary not available for ${platform}. Falling back to source build..."
    install_with_bun
  fi

  echo ""
  ok "OrchOS CLI installed!"
  echo ""
  info "Quick start:"
  info "  orchos-cli --help"
  info ""
  info "Pair with your dashboard:"
  info "  orchos-cli --api-url https://app.orchos.dev --pairing-token <token>"
}

main
