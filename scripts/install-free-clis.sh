#!/usr/bin/env bash
# Instala CLIs gratuitas (código aberto ou de uso livre, sem licença paga).
# Idempotente: o que já está no PATH é mantido.
set -euo pipefail

failures=()

note_fail() {
  echo "FAIL: $*"
  failures+=("$*")
}

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo "Este script cobre linux/x86_64. Arquitetura atual: $(uname -m)" >&2
  exit 1
fi

echo "==> apt"
sudo apt-get update -qq

APT_PKGS=(
  build-essential
  ca-certificates
  pkg-config
  gnupg
  unzip
  zip
  xz-utils
  python3-pip
  python3-venv
  ripgrep
  fd-find
  fzf
  bat
  btop
  ncdu
  httpie
  neovim
  tree
  pipx
  postgresql-client
  redis-tools
  imagemagick
  shellcheck
  shfmt
  direnv
  entr
  moreutils
  miller
  pandoc
  poppler-utils
  eza
  git-delta
  zoxide
  just
  hyperfine
  duf
  tealdeer
  neofetch
  docker-compose-v2
)

for extra in git-lfs tig; do
  cand="$(apt-cache policy "$extra" 2>/dev/null | awk '/Candidate:/{print $2}')"
  if [[ -n "$cand" && "$cand" != "(none)" ]]; then
    APT_PKGS+=("$extra")
  fi
done

sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "${APT_PKGS[@]}"

if ! sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io; then
  note_fail "docker.io"
fi

link_bin() {
  local name="$1" target="$2"
  if [[ -x "$target" ]]; then
    sudo ln -sfn "$target" "/usr/local/bin/${name}"
  fi
}

link_bin fd /usr/bin/fdfind
link_bin bat /usr/bin/batcat
if [[ -x /usr/libexec/docker/cli-plugins/docker-compose ]]; then
  link_bin docker-compose /usr/libexec/docker/cli-plugins/docker-compose
fi

echo "==> runtimes (bun, deno, uv, starship, flyctl)"
if [[ ! -x "${HOME}/.bun/bin/bun" ]]; then
  curl -fsSL https://bun.sh/install | bash
fi
link_bin bun "${HOME}/.bun/bin/bun"

if [[ ! -x "${HOME}/.deno/bin/deno" ]]; then
  curl -fsSL https://deno.land/install.sh | sh
fi
link_bin deno "${HOME}/.deno/bin/deno"

if [[ ! -x "${HOME}/.local/bin/uv" ]]; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
link_bin uv "${HOME}/.local/bin/uv"
link_bin uvx "${HOME}/.local/bin/uvx"

if ! command -v starship >/dev/null 2>&1; then
  curl -fsSL https://starship.rs/install.sh | sudo sh -s -- -y -b /usr/local/bin
fi

if [[ ! -x "${HOME}/.fly/bin/flyctl" ]]; then
  curl -fsSL https://fly.io/install.sh | sh
fi
link_bin flyctl "${HOME}/.fly/bin/flyctl"
link_bin fly "${HOME}/.fly/bin/flyctl"

echo "==> Kubernetes, Helm, Terraform, AWS, Stripe"
if ! command -v kubectl >/dev/null 2>&1; then
  kver="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
  tmp="$(mktemp)"
  curl -fsSL -o "$tmp" "https://dl.k8s.io/release/${kver}/bin/linux/amd64/kubectl"
  sudo install -m 0755 "$tmp" /usr/local/bin/kubectl
  rm -f "$tmp"
fi

if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

if ! command -v terraform >/dev/null 2>&1; then
  tver="$(curl -fsSL https://checkpoint-api.hashicorp.com/v1/check/terraform | jq -r .current_version)"
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/terraform.zip" "https://releases.hashicorp.com/terraform/${tver}/terraform_${tver}_linux_amd64.zip"
  sudo unzip -qo "${tmp}/terraform.zip" -d /usr/local/bin
  sudo chmod 0755 /usr/local/bin/terraform
  rm -rf "$tmp"
fi

if ! command -v aws >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/aws.zip" "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
  unzip -q "${tmp}/aws.zip" -d "$tmp"
  sudo "${tmp}/aws/install" --update
  rm -rf "$tmp"
fi

install_gh_bin() {
  local repo="$1" regex="$2" bin="$3"
  local url tmp found json force="${4:-}"
  if [[ "$force" != "force" ]] && command -v "$bin" >/dev/null 2>&1; then
    echo "skip ${bin}"
    return 0
  fi
  json="$(gh api "repos/${repo}/releases/latest")" || {
    note_fail "${bin} (github api)"
    return 0
  }
  url="$(jq -r --arg re "$regex" '[.assets[].browser_download_url | select(test($re))][0] // empty' <<<"$json")" || {
    note_fail "${bin} (jq)"
    return 0
  }
  if [[ -z "$url" ]]; then
    note_fail "${bin} (asset ${regex})"
    return 0
  fi
  tmp="$(mktemp -d)"
  if ! curl -fsSL -L "$url" -o "${tmp}/asset"; then
    note_fail "${bin} (download)"
    rm -rf "$tmp"
    return 0
  fi
  case "$url" in
    *.tar.gz) tar -xzf "${tmp}/asset" -C "$tmp" ;;
    *.tar.xz) tar -xJf "${tmp}/asset" -C "$tmp" ;;
    *.zip) unzip -qo "${tmp}/asset" -d "$tmp" ;;
    *) mv "${tmp}/asset" "${tmp}/${bin}" ;;
  esac
  found="$(find "$tmp" -type f -name "$bin" -print -quit)"
  if [[ -z "$found" ]]; then
    note_fail "${bin} (binário ausente em ${url})"
    rm -rf "$tmp"
    return 0
  fi
  sudo install -m 0755 "$found" "/usr/local/bin/${bin}"
  rm -rf "$tmp"
  echo "ok ${bin}"
}

install_gh_bin jesseduffield/lazygit 'linux_x86_64\.tar\.gz$' lazygit
install_gh_bin jesseduffield/lazydocker 'Linux_x86_64\.tar\.gz$' lazydocker
install_gh_bin charmbracelet/glow 'Linux_x86_64\.tar\.gz$' glow
install_gh_bin charmbracelet/gum 'Linux_x86_64\.tar\.gz$' gum
install_gh_bin bootandy/dust 'x86_64-unknown-linux-musl\.tar\.gz$' dust
install_gh_bin ClementTsang/bottom 'bottom_x86_64-unknown-linux-musl\.tar\.gz$' btm
install_gh_bin watchexec/watchexec 'x86_64-unknown-linux-musl\.tar\.xz$' watchexec
install_gh_bin stripe/stripe-cli 'linux_x86_64\.tar\.gz$' stripe
if /usr/local/bin/yq --version 2>/dev/null | grep -q 'mikefarah/yq'; then
  echo "skip yq"
else
  install_gh_bin mikefarah/yq 'yq_linux_amd64$' yq force
fi

echo "==> CLIs npm"
mkdir -p "${HOME}/.local"
npm install -g --prefix "${HOME}/.local" --no-fund --no-audit --loglevel=error \
  vercel \
  netlify-cli \
  wrangler \
  firebase-tools \
  supabase \
  prisma \
  neonctl \
  apify-cli \
  serve \
  npm-check-updates \
  prettier \
  typescript \
  tsx \
  degit

echo "==> CLIs Python (pipx)"
pipx ensurepath >/dev/null || true
for tool in ruff yt-dlp poetry; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "skip ${tool}"
    continue
  fi
  if ! pipx install "$tool"; then
    note_fail "pipx:${tool}"
  fi
done

shopt -s nullglob
for f in "${HOME}/.local/bin"/*; do
  if [[ -f "$f" && -x "$f" ]]; then
    sudo ln -sfn "$f" "/usr/local/bin/$(basename "$f")"
  fi
done

if getent group docker >/dev/null 2>&1; then
  sudo usermod -aG docker "${USER}" || true
fi

echo "==> versões"
EXPECTED=(
  rg fd bat fzf btop ncdu http nvim tree psql redis-cli
  shellcheck shfmt direnv entr mlr pandoc pdftotext
  eza delta zoxide just hyperfine duf tldr neofetch
  lazygit lazydocker glow gum dust btm watchexec
  bun deno uv starship flyctl
  kubectl helm terraform aws stripe
  vercel netlify wrangler firebase supabase prisma neonctl apify
  serve ncu prettier tsc tsx degit
  ruff yt-dlp poetry
  docker docker-compose yq
)
missing=0
for cmd in "${EXPECTED[@]}"; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "OK   %s\n" "$cmd"
  else
    printf "MISS %s\n" "$cmd"
    missing=1
  fi
done

if ((${#failures[@]})); then
  printf 'Falhas registradas:\n'
  printf ' - %s\n' "${failures[@]}"
  exit 1
fi
if ((missing)); then
  exit 1
fi
echo "CLIs gratuitas instaladas."
