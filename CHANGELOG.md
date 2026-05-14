# Changelog

All notable changes to this project will be documented in this file.

## [0.12.0] - 2026-01-09

### Features

- Add Antigravity editor support with flat workflow files (#39)
  - Creates `.agent/workflows/speclife-<cmd>.md` symlinks
  - Follows OpenSpec's Antigravity implementation pattern

## [0.11.1] and earlier

See [GitHub Releases](https://github.com/malarbase/speclife/releases) for previous versions.

## [0.14.0] - 2026-05-14

### Features

- Add mise task management and node environment pinning (#41)

### Refactor

- Minimize CLI to bootstrap-only commands
  - Remove `worktree`, `view`, `status`, `list`, `validate`, `config` CLI commands
  - All workflow operations now happen via slash commands using raw git
  - Delete dead code: `global-config.ts`, `worktree.ts` workflow

### Chore

- Cleanup openspec/changes - archive completed, remove leftover shells (#40)
