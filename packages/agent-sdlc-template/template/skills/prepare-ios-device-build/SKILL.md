---
name: prepare-ios-device-build
description: Prepare an iOS app repository for running on a real iPhone or iPad from the latest main branch. Use when the user gives a repo name/path and asks to prep, update, set up, or get an iOS build ready for a physical device, including Xcode workspace/project discovery, dependency installation, CocoaPods setup, and launch instructions. This skill is for preparation only; do not change code, create feature branches, or switch the root checkout away from main.
---

# Prepare iOS Device Build

## Environment

You have access to:

- **AWS CLI** — `AWS_PROFILE=your-aws-profile` is the org credential. Org secrets (App Store Connect, Apple signing assets, bot tokens) live in AWS Parameter Store (`us-east-1`).
- **App Store Connect API** — credentials at `/appstore/connect-api` in AWS Parameter Store. Use for ASC reads (app metadata, bundle ID lookups, build status) when verifying the prepared build.
- **GitHub CLI (`gh`)** — defaults to `YourGithubOrg` for ambiguous repo names.
- **All org repositories** under `/YOUR/WORKSPACE/DIR/`. Resolve a bare repo name as `/YOUR/WORKSPACE/DIR/<repo-name>`. Routing map: [`/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml`](/YOUR/WORKSPACE/DIR/agent-config/context/repositories.yaml).
- **Xcode CLI** — `xcodebuild`, `xcrun simctl`, and CocoaPods (`pod`) when a Podfile exists.

## Workflow

Use the helper first unless the repo has special project instructions that define a different setup command:

```bash
/YOUR/WORKSPACE/DIR/skills/prepare-ios-device-build/scripts/prepare_ios_device_build.sh <repo-name-or-path>
```

The helper updates only a clean root checkout already on `main`, installs common locked dependencies, runs CocoaPods when a Podfile exists, detects the preferred Xcode workspace/project, and prints the next command for opening Xcode.

## Rules

- Resolve a bare repo name as `$HOME/code/<repo-name>`.
- Read the repo's `AGENTS.md` and/or `CLAUDE.md` before running project-specific setup.
- Keep the root checkout on `main`. If it is on any other branch, stop and tell the user.
- Do not discard, stash, reset, or overwrite local changes. If the working tree is dirty, stop and tell the user what is dirty.
- Fetch `origin/main` and fast-forward local `main`; if local `main` has unpublished commits or cannot fast-forward, stop.
- Prefer `.xcworkspace` over `.xcodeproj`, especially when CocoaPods is present.
- Do not attempt to fix signing by editing project files unless the user explicitly asks. Real-device signing often requires the human's Apple ID/team selection in Xcode.

## Completion

Report:

- The repo path and current `main` commit.
- Dependency/setup commands that ran.
- The workspace/project to open.
- Any attached-device or signing blockers.
- The shortest next step for the user, usually opening the workspace in Xcode, selecting the physical device, choosing the signing team if needed, and pressing Run.
