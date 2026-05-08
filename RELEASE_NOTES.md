# NetNode Mobile Release Notes

## 1.06
- Reworked mobile SSH terminal into an inline console-style flow, closer to the web terminal UX.
- Added Socket.IO transport hardening with endpoint/path fallback, upgrade handling, and long-polling fallback when websocket upgrade is blocked.
- Added interactive in-terminal login/password sequence and keyboard Enter submission flow for commands.

## 1.05
- Added inventory category and branch filtering from backend metadata.
- Added per-device quick actions in inventory cards: open web UI and open in-app SSH terminal.
- Improved list key uniqueness and rendering stability in dashboard and alerts lists.

## 1.04
- Adapted dashboard/alerts data loading to current backend response shape to resolve zero metrics and empty alert feeds.
- Hardened authenticated API requests with session headers and cookie-based credentials handling.
- Added inventory metadata API integration used by mobile filters.

## 1.03
- Implemented two-step authentication flow: server setup first, credentials second.
- Added persistent session and API URL storage flow to preserve login state.
- Updated login/settings defaults to HTTPS placeholder format (`https://netnode.domain.com`).

## 1.02
- Fixed iPhone tab interaction issues by replacing default tab behavior with deterministic custom tab handling.
- Improved tab layer ordering, safe-area behavior, and screen host padding to prevent hidden touch interception.
- Restored full tab content screens after diagnostics while keeping touch stability fixes.

## 1.01
- Added visible app version marker in Settings for build verification during iterative testing.
- Updated project TypeScript include patterns for Expo generated types compatibility.
