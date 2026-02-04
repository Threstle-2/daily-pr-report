# Daily PR Report Generator

## Purpose
Transform the structured JSON data from `pr-report.json` into a concise, human-readable daily report summarizing open pull requests and their recent activity.

## Input
You will receive a JSON file with the following structure:
```json
{
  "generatedAt": "ISO timestamp",
  "user": "GitHub username",
  "totalPRs": number,
  "pullRequests": [
    {
      "number": number,
      "title": "string",
      "repository": "owner/repo",
      "url": "string",
      "state": "open",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp",
      "daysOpen": number,
      "recentActivity": {
        "issueComments": [...],
        "reviewComments": [...],
        "reviews": [...],
        "totalCount": number
      }
    }
  ]
}
```

## Report Requirements

### Format
Generate a concise, well-formatted report with the following sections:

1. **Header**
   - Report date and time
   - Total number of open PRs
   - Summary of PRs with recent activity

2. **Active PRs** (PRs with activity in last 24h)
   - List PRs that have recent comments, reviews, or activity
   - Include: PR title, repository, days open, and activity summary
   - Highlight key actions needed (approvals received, changes requested, etc.)

3. **Stale PRs** (PRs without recent activity)
   - List PRs with no activity in last 24h
   - Group by age (e.g., "Less than 3 days", "3-7 days", "Over 7 days")
   - Flag PRs that might need attention

4. **Action Items**
   - Summarize what needs attention
   - Prioritize based on age and recent activity

### Style Guidelines
- Keep it concise and scannable
- Use bullet points and clear headings
- Highlight urgent items (e.g., PRs open >7 days, change requests)
- Use emojis sparingly for visual scanning (✅ approved, 🔄 changes requested, ⏰ stale)
- Include direct links to PRs

### Example Output

```markdown
# Daily PR Report - February 4, 2026

**Summary:** 5 open PRs | 2 with recent activity | 3 awaiting review

---

## 🔥 Active PRs (Recent Activity)

### Fix authentication bug
**Repository:** acme/web-app | **Days Open:** 5 | [View PR](https://github.com/...)

Recent Activity (24h):
- ✅ **Approved** by @reviewer1
- 💬 2 comments from @reviewer2
  - "LGTM, just one minor suggestion about error handling"
  - "Can you add a test for the edge case?"

**Action:** Address comments and merge

---

### Add user dashboard
**Repository:** acme/web-app | **Days Open:** 2 | [View PR](https://github.com/...)

Recent Activity (24h):
- 🔄 **Changes Requested** by @tech-lead
- 🔍 3 review comments on implementation details

**Action:** Address requested changes

---

## ⏸️ Stale PRs (No Recent Activity)

### Less than 3 days
- **Update API documentation** - acme/api | 1 day open | [View PR](https://github.com/...)
  - Waiting for initial review

### 3-7 days
- **Refactor payment service** - acme/backend | 6 days open | [View PR](https://github.com/...)
  - ⚠️ No activity - may need ping

### Over 7 days
- **Database migration** - acme/backend | 12 days open | [View PR](https://github.com/...)
  - ⚠️ **URGENT:** Requires attention

---

## 📋 Action Items

**High Priority:**
1. Address changes requested on "Add user dashboard" (2 days old)
2. Follow up on "Database migration" (12 days old - needs review)

**Medium Priority:**
3. Address comments and merge "Fix authentication bug" (approved)
4. Ping reviewers for "Refactor payment service" (6 days, no activity)

**Low Priority:**
5. Wait for review on "Update API documentation" (1 day old)

---

**Next Steps:** Focus on addressing the 2 PRs with requested changes, then follow up on stale PRs over 7 days old.
```

## Additional Instructions

- If there are no open PRs, generate a short message indicating this
- If there's no recent activity across any PRs, highlight this as a potential issue
- Adapt the tone to be professional but friendly
- Include statistics that provide insight (e.g., average days open, percentage with recent activity)
- Consider grouping PRs by repository if there are many across different repos
- Flag patterns that might indicate blockers (e.g., multiple PRs awaiting review from the same person)

## Usage

Provide this prompt along with the contents of `pr-report.json` to Claude, and it will generate a formatted daily report.
