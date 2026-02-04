# Daily PR Report

Automated daily pull request report generator that tracks your open PRs across all accessible repositories and generates human-readable reports using Google Gemini AI.

## Features

- Lists all open pull requests authored by you across all accessible repositories
- Tracks recent activity (comments, reviews) from the last 24 hours
- Calculates how many days each PR has been open
- Outputs structured JSON data
- Generates concise markdown reports using Google Gemini AI
- Delivers reports directly to Slack
- Runs automatically on a daily schedule via GitHub Actions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
GITHUB_TOKEN=your_github_personal_access_token
GOOGLE_API_KEY=your_google_api_key
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

**GitHub Token:** Generate a personal access token at https://github.com/settings/tokens with `repo` and `read:user` scopes.

**Google API Key:** Get your free API key from https://aistudio.google.com/app/apikey (no credit card required)

**Slack Webhook URL:** Create an incoming webhook at https://api.slack.com/messaging/webhooks

### 3. Configure GitHub Actions

Add the following secrets to your repository (Settings → Secrets and variables → Actions):

- `GH_PAT`: Your GitHub personal access token (note: cannot be named GITHUB_TOKEN due to GitHub's reserved prefix)
- `GOOGLE_API_KEY`: Your Google AI Studio API key
- `SLACK_WEBHOOK_URL`: Your Slack incoming webhook URL

## Usage

### Local Development

**Collect PR data only:**
```bash
npm run list-prs
```

**Generate full report (JSON + Markdown):**
```bash
npm run generate-report
```

**Send report to Slack:**
```bash
npm run send-to-slack
```

**Generate and send to Slack (complete workflow):**
```bash
npm run full-report
```

This will create:
- `pr-report.json` - Structured data with all PR information
- `daily-report.md` - Human-readable markdown report
- Automatically posts the report to your Slack channel

### GitHub Actions

The workflow runs automatically:
- **Daily at 9:00 AM UTC** (configurable in `.github/workflows/daily-workflow.yml`)
- **Manual trigger** via Actions tab

The workflow:
1. Collects PR data from GitHub API
2. Generates JSON report
3. Uses Claude AI to create markdown report
4. Uploads both files as artifacts (retained for 30 days)

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── daily-workflow.yml    # GitHub Actions workflow
├── scripts/
│   ├── list-my-prs.js            # PR data collection script
│   └── generate-report.sh        # Report generation script
├── prompts/
│   └── daily-pr-report.md        # Claude prompt template
├── package.json                   # Project dependencies
├── .env                          # Environment variables (local only)
└── README.md                     # This file
```

## Output Examples

### JSON Output (`pr-report.json`)
```json
{
  "generatedAt": "2026-02-04T10:30:00.000Z",
  "user": "username",
  "totalPRs": 5,
  "pullRequests": [
    {
      "number": 123,
      "title": "Fix authentication bug",
      "repository": "owner/repo",
      "url": "https://github.com/owner/repo/pull/123",
      "daysOpen": 5,
      "recentActivity": {
        "issueComments": [...],
        "reviewComments": [...],
        "reviews": [...],
        "totalCount": 3
      }
    }
  ]
}
```

### Markdown Output (`daily-report.md`)
A formatted report with:
- Summary statistics
- Active PRs with recent activity
- Stale PRs grouped by age
- Prioritized action items

## Customization

### Change Schedule

Edit the cron expression in `.github/workflows/daily-workflow.yml`:

```yaml
schedule:
  - cron: '0 9 * * *'  # Change time here
```

### Modify Report Format

Edit `prompts/daily-pr-report.md` to customize how Gemini formats the report.

### Adjust Activity Window

Edit `getYesterdayTimestamp()` in `scripts/list-my-prs.js` to change the activity detection window from 24 hours to your preferred timeframe.

## Troubleshooting

**"GITHUB_TOKEN environment variable is not set"**
- Ensure `.env` file exists locally with `GITHUB_TOKEN`
- For GitHub Actions, verify the secret is added in repository settings

**"Authentication failed"**
- Check that your GitHub token has the correct scopes (`repo`, `read:user`)
- Verify the token hasn't expired

**Gemini API errors**
- Ensure `GOOGLE_API_KEY` is set correctly
- Verify your API key is valid at https://aistudio.google.com/app/apikey
- Check you haven't exceeded the free tier rate limits (60 requests/minute)

## License

MIT
