#!/usr/bin/env node

require('dotenv').config();
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Get timestamp for 24 hours ago
function getYesterdayTimestamp() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

// Check if a date is from the last 24 hours
function isRecent(dateString) {
  const date = new Date(dateString);
  const yesterday = getYesterdayTimestamp();
  return date >= yesterday;
}

// Calculate days since a date
function getDaysOpen(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Fetch comments and reviews for a PR
const OTF_REGEX = /bot: Deploy on-the-fly env.*?playplay\/frontend#(\d+)/i;

function detectOtfUrl(texts) {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(OTF_REGEX);
    if (match) return `https://fe-${match[1]}-app.playplay.dev/`;
  }
  return null;
}

async function fetchPRActivity(octokit, owner, repo, prNumber, prBody) {
  try {
    // Fetch issue comments (general PR comments)
    const { data: issueComments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100
    });

    // Fetch review comments (code-specific comments)
    const { data: reviewComments } = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100
    });

    // Fetch reviews
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100
    });

    // Filter for recent activity (last 24 hours)
    const recentIssueComments = issueComments.filter(c => isRecent(c.created_at));
    const recentReviewComments = reviewComments.filter(c => isRecent(c.created_at));
    const recentReviews = reviews.filter(r => isRecent(r.submitted_at));

    const otfUrl = detectOtfUrl([prBody, ...issueComments.map(c => c.body)]);

    return {
      issueComments: recentIssueComments,
      reviewComments: recentReviewComments,
      reviews: recentReviews,
      allReviews: reviews,
      otfUrl,
      totalRecentActivity: recentIssueComments.length + recentReviewComments.length + recentReviews.length
    };
  } catch (error) {
    console.error(`   Error fetching activity: ${error.message}`);
    return {
      issueComments: [],
      reviewComments: [],
      reviews: [],
      allReviews: [],
      otfUrl: null,
      totalRecentActivity: 0
    };
  }
}

function computeReviewStatus(draft, allReviews) {
  if (draft) return 'draft';
  if (allReviews.length === 0) return 'pending';
  // Latest review per reviewer wins
  const latestByReviewer = {};
  for (const review of allReviews) {
    if (review.user.type === 'Bot') continue;
    if (review.state === 'APPROVED' || review.state === 'CHANGES_REQUESTED') {
      latestByReviewer[review.user.login] = review.state;
    }
  }
  const states = Object.values(latestByReviewer);
  if (states.includes('CHANGES_REQUESTED')) return 'changes_requested';
  if (states.length > 0 && states.every(s => s === 'APPROVED')) return 'approved';
  return 'pending';
}

async function listMyOpenPRs() {
  // Check for GitHub token
  const token = process.env.GH_PAT;
  if (!token) {
    console.error('Error: GH_PAT environment variable is not set');
    process.exit(1);
  }

  // Initialize Octokit
  const octokit = new Octokit({ auth: token });

  try {
    // Determine target user (env override or authenticated user)
    let targetUser;
    if (process.env.GH_USER) {
      targetUser = process.env.GH_USER;
      console.log(`\nUsing configured user: ${targetUser}`);
    } else {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      targetUser = user.login;
      console.log(`\nFetching open PRs for: ${targetUser}`);
    }

    console.log(`Checking for activity in the last 24 hours...\n`);

    // Fetch open PRs: use pulls API directly for a specific repo (works with private repos),
    // fall back to search API when no repo filter is set.
    let items;
    let repoName;
    if (process.env.GH_REPO) {
      repoName = process.env.GH_REPO.trim();
      const [owner, repo] = repoName.split('/');
      console.log(`Filtering by repo: ${repoName}`);
      const { data: pulls } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 100
      });
      items = pulls
        .filter(pr => pr.user.login === targetUser)
        .map(pr => ({ ...pr, repoName }));
    } else {
      const query = `is:pr is:open author:${targetUser}`;
      const { data: searchResults } = await octokit.rest.search.issuesAndPullRequests({
        q: query,
        sort: 'updated',
        order: 'desc',
        per_page: 100
      });
      items = searchResults.items.map(pr => ({
        ...pr,
        repoName: pr.repository_url.split('/').slice(-2).join('/')
      }));
    }

    if (items.length === 0) {
      console.log('No open pull requests found.');
      const emptyReport = {
        generatedAt: new Date().toISOString(),
        user: targetUser,
        totalPRs: 0,
        pullRequests: []
      };
      const outputPath = path.join(process.cwd(), 'pr-report.json');
      fs.writeFileSync(outputPath, JSON.stringify(emptyReport, null, 2));
      console.log(`\nReport saved to: ${outputPath}`);
      return;
    }

    console.log(`Found ${items.length} open pull request(s):\n`);

    // Collect PR data for JSON output
    const reportData = {
      generatedAt: new Date().toISOString(),
      user: targetUser,
      totalPRs: items.length,
      pullRequests: []
    };

    // Process each PR
    for (let index = 0; index < items.length; index++) {
      const pr = items[index];
      const repoName = pr.repoName;
      const [owner, repo] = repoName.split('/');

      const daysOpen = getDaysOpen(pr.created_at);

      console.log(`${index + 1}. ${pr.title}`);
      console.log(`   Repository: ${repoName}`);
      console.log(`   URL: ${pr.html_url}`);
      console.log(`   Created: ${new Date(pr.created_at).toLocaleDateString()} (${daysOpen} day${daysOpen !== 1 ? 's' : ''} open)`);
      console.log(`   Updated: ${new Date(pr.updated_at).toLocaleDateString()}`);

      // Fetch activity
      console.log(`   Fetching recent activity...`);
      const activity = await fetchPRActivity(octokit, owner, repo, pr.number, pr.body);

      // Prepare PR data for JSON
      const prData = {
        number: pr.number,
        title: pr.title,
        repository: repoName,
        url: pr.html_url,
        draft: pr.draft ?? false,
        reviewStatus: computeReviewStatus(pr.draft, activity.allReviews),
        statusChangedInLast24h: activity.reviews.length > 0,
        otfUrl: activity.otfUrl,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        daysOpen: daysOpen,
        recentActivity: {
          issueComments: activity.issueComments.map(c => ({
            author: c.user.login,
            body: c.body,
            createdAt: c.created_at,
            url: c.html_url
          })),
          reviewComments: activity.reviewComments.map(c => ({
            author: c.user.login,
            body: c.body,
            createdAt: c.created_at,
            url: c.html_url
          })),
          reviews: activity.reviews.map(r => ({
            author: r.user.login,
            state: r.state,
            submittedAt: r.submitted_at,
            url: r.html_url
          })),
          totalCount: activity.totalRecentActivity
        }
      };

      reportData.pullRequests.push(prData);

      if (activity.totalRecentActivity > 0) {
        console.log(`   \n   📊 Recent Activity (last 24h):`);

        if (activity.issueComments.length > 0) {
          console.log(`   💬 ${activity.issueComments.length} new comment(s):`);
          activity.issueComments.forEach(comment => {
            console.log(`      - ${comment.user.login}: "${comment.body.substring(0, 80)}${comment.body.length > 80 ? '...' : ''}"`);
          });
        }

        if (activity.reviewComments.length > 0) {
          console.log(`   🔍 ${activity.reviewComments.length} new review comment(s):`);
          activity.reviewComments.forEach(comment => {
            console.log(`      - ${comment.user.login}: "${comment.body.substring(0, 80)}${comment.body.length > 80 ? '...' : ''}"`);
          });
        }

        if (activity.reviews.length > 0) {
          console.log(`   ✅ ${activity.reviews.length} new review(s):`);
          activity.reviews.forEach(review => {
            const state = review.state === 'APPROVED' ? '✅' : review.state === 'CHANGES_REQUESTED' ? '🔄' : '💭';
            console.log(`      ${state} ${review.user.login}: ${review.state}`);
          });
        }
      } else {
        console.log(`   No recent activity in the last 24 hours.`);
      }

      console.log('');
    }

    console.log(`Total: ${items.length} open PR(s)`);

    // Write JSON report to file
    const outputPath = path.join(process.cwd(), 'pr-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
    console.log(`\n✅ Report saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error fetching pull requests:', error.message);
    if (error.status === 401) {
      console.error('Authentication failed. Please check your GH_PAT.');
    }
    process.exit(1);
  }
}

// Run the script
listMyOpenPRs();
