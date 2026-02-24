# Daily PR Report

Generate a compact PR status report from the JSON data below.

## Output format

One line per PR:
```
<status_icon> <status_label>  <title> — [<repo>#<number>](<url>) (<daysOpen>d)
```

If `otfUrl` is present: append `· [OTF](<otfUrl>)`

If `statusChangedInLast24h` is false and `reviewStatus` is not `pending`: append `⚠️ stalling`

Status icons and labels:
- `reviewStatus: draft` → `📝 draft`
- `reviewStatus: approved` → `✅ approved`
- `reviewStatus: changes_requested` → `🔄 changes requested`
- `reviewStatus: pending` → `🕐 pending`

Header (single line):
```
📋 <date> — <N> open PR(s)
```

If `totalPRs` is 0, output only:
```
📋 <date> — no open PRs
```

## Rules
- No extra sections, summaries, or action items
- One blank line between PRs
- Links as plain URLs
