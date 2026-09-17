# FIFA Cup Local — Design Spec

**Date:** 2026-09-16  
**Status:** Approved

## Goal

Local web app to run FIFA (EA FC) friend tournaments: register players, draw brackets/groups, enter scores, show standings. Data persists as JSON on disk with export/import.

## Decisions

| Topic | Choice |
|-------|--------|
| Formats | `groups_knockout` and `double_elimination` (chooser at create) |
| Scale | Flexible player count; byes and uneven groups |
| Usage | Single PC, admin only |
| MVP features | Players, matchups, scores, standings; no historical ranking / clubs |
| Persistence | `data/store.json` + export/import |
| Group draws | Allowed (1 point each) |
| Knockout draws | Forbidden (scores must differ) |
| Double elim final | Single final match |
| Group tiebreak | Points → goal difference → goals for |

## Product flow

1. Manage player pool (CRUD)
2. Create tournament (name + format)
3. Draw groups/bracket
4. Enter scores; auto standings / advance
5. Persist locally; export/import in-progress tournament

## Data model

Store root: `version`, `players[]`, `tournaments[]`, `activeTournamentId`.

Tournament: `id`, `name`, `format`, `status`, `createdAt`, `settings`, `playerIds`, `groups`, `matches`, `bracket`.

## Architecture

- **Client:** React + Vite
- **Server:** Express — `GET/PUT /api/store` with atomic JSON write
- **Shared:** Pure TS tournament logic (draw, standings, bracket, validate)

## Out of scope (MVP)

Login, multiplayer network, historical ranking, FIFA clubs, double-elim “grand final” rematch.
