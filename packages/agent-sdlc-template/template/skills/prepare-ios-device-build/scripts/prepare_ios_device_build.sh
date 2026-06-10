#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s <repo-name-or-path> [--no-open]\n' "$0" >&2
}

open_xcode=1
repo_arg=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-open)
      open_xcode=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      printf 'Unknown option: %s\n' "$1" >&2
      usage
      exit 2
      ;;
    *)
      if [[ -n "$repo_arg" ]]; then
        printf 'Only one repo name/path is supported.\n' >&2
        usage
        exit 2
      fi
      repo_arg="$1"
      shift
      ;;
  esac
done

if [[ -z "$repo_arg" ]]; then
  usage
  exit 2
fi

if [[ "$repo_arg" = /* || "$repo_arg" = .* || "$repo_arg" = */* ]]; then
  repo_path="$repo_arg"
else
  repo_path="$HOME/code/$repo_arg"
fi

if [[ ! -d "$repo_path" ]]; then
  printf 'Repo path does not exist: %s\n' "$repo_path" >&2
  exit 1
fi

cd "$repo_path"
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  printf 'Not a git repository: %s\n' "$repo_path" >&2
  exit 1
fi
cd "$repo_root"

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  printf 'Refusing to continue: root checkout is on %s, not main.\n' "$current_branch" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Refusing to update: working tree is dirty.\n' >&2
  git status --short >&2
  exit 1
fi

printf 'Repo: %s\n' "$repo_root"
printf 'Fetching latest origin/main...\n'
git fetch origin main

read -r local_only remote_only < <(git rev-list --left-right --count main...origin/main)
if [[ "$local_only" != "0" ]]; then
  printf 'Refusing to update: local main has %s commit(s) not on origin/main.\n' "$local_only" >&2
  exit 1
fi

if [[ "$remote_only" != "0" ]]; then
  printf 'Fast-forwarding main by %s commit(s)...\n' "$remote_only"
  git merge --ff-only origin/main
else
  printf 'main is already up to date with origin/main.\n'
fi

if [[ -f .gitmodules ]]; then
  printf 'Updating git submodules...\n'
  git submodule update --init --recursive
fi

ios_dir="$repo_root"
if [[ -d "$repo_root/ios" ]]; then
  ios_dir="$repo_root/ios"
fi

run_in_dir() {
  local dir="$1"
  shift
  printf '+ (cd %s && %s)\n' "$dir" "$*"
  (cd "$dir" && "$@")
}

if [[ -f "$repo_root/package.json" ]]; then
  if [[ -f "$repo_root/pnpm-lock.yaml" ]] && command -v pnpm >/dev/null 2>&1; then
    run_in_dir "$repo_root" pnpm install --frozen-lockfile
  elif [[ -f "$repo_root/yarn.lock" ]] && command -v yarn >/dev/null 2>&1; then
    run_in_dir "$repo_root" yarn install --frozen-lockfile
  elif [[ -f "$repo_root/package-lock.json" ]] && command -v npm >/dev/null 2>&1; then
    run_in_dir "$repo_root" npm ci
  else
    printf 'Skipped JavaScript install: no supported lockfile/tool pair found.\n'
  fi
fi

bundle_dir=""
if [[ -f "$ios_dir/Gemfile" ]]; then
  bundle_dir="$ios_dir"
elif [[ -f "$repo_root/Gemfile" ]]; then
  bundle_dir="$repo_root"
fi

if [[ -n "$bundle_dir" ]] && command -v bundle >/dev/null 2>&1; then
  run_in_dir "$bundle_dir" bundle check || run_in_dir "$bundle_dir" bundle install
elif [[ -n "$bundle_dir" ]]; then
  printf 'Bundler is not installed; skipping Gemfile setup.\n'
fi

if [[ -f "$ios_dir/Podfile" ]]; then
  if [[ -n "$bundle_dir" ]] && command -v bundle >/dev/null 2>&1; then
    if [[ "$bundle_dir" = "$ios_dir" ]]; then
      run_in_dir "$ios_dir" bundle exec pod install
    else
      printf '+ (cd %s && BUNDLE_GEMFILE=%s/Gemfile bundle exec pod install)\n' "$ios_dir" "$bundle_dir"
      (cd "$ios_dir" && BUNDLE_GEMFILE="$bundle_dir/Gemfile" bundle exec pod install)
    fi
  elif command -v pod >/dev/null 2>&1; then
    run_in_dir "$ios_dir" pod install
  else
    printf 'Podfile exists but CocoaPods is not available. Install CocoaPods or run bundle install, then pod install.\n' >&2
    exit 1
  fi
fi

workspace="$(find "$ios_dir" "$repo_root" -maxdepth 1 -name '*.xcworkspace' -print | sort | head -n 1)"
project=""
if [[ -z "$workspace" ]]; then
  project="$(find "$ios_dir" "$repo_root" -maxdepth 1 -name '*.xcodeproj' -print | sort | head -n 1)"
fi

if [[ -z "$workspace" && -z "$project" ]]; then
  printf 'No .xcworkspace or .xcodeproj found in %s or %s.\n' "$ios_dir" "$repo_root" >&2
  exit 1
fi

printf '\nPrepared commit: %s\n' "$(git rev-parse --short HEAD)"
if [[ -n "$workspace" ]]; then
  printf 'Xcode workspace: %s\n' "$workspace"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -list -workspace "$workspace" || true
  fi
  if [[ "$open_xcode" = "1" ]]; then
    open "$workspace"
  fi
  printf '\nNext: open "%s", select a real device, confirm Signing & Capabilities, then Run.\n' "$workspace"
else
  printf 'Xcode project: %s\n' "$project"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -list -project "$project" || true
  fi
  if [[ "$open_xcode" = "1" ]]; then
    open "$project"
  fi
  printf '\nNext: open "%s", select a real device, confirm Signing & Capabilities, then Run.\n' "$project"
fi

if command -v xcrun >/dev/null 2>&1; then
  printf '\nConnected devices visible to Xcode:\n'
  xcrun xctrace list devices 2>/dev/null | grep -E '^[[:space:]]*[^=].*\([0-9A-Fa-f-]{8,}\)' || printf 'No physical devices listed. Attach, unlock, and trust the iPhone/iPad if needed.\n'
fi
