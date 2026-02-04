#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

async function sendToSlack() {
  // Check for Slack webhook URL
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('Error: SLACK_WEBHOOK_URL environment variable is not set');
    console.error('Please set up a Slack webhook at https://api.slack.com/messaging/webhooks');
    process.exit(1);
  }

  // Check if report file exists
  const reportPath = path.join(process.cwd(), 'daily-report.md');
  if (!fs.existsSync(reportPath)) {
    console.error('Error: daily-report.md not found. Generate the report first.');
    process.exit(1);
  }

  try {
    console.log('Sending report to Slack...');

    // Read the markdown report
    let reportContent = fs.readFileSync(reportPath, 'utf8');

    // Check if content is wrapped in a code block and unwrap it
    const codeBlockMatch = reportContent.match(/^```[\w]*\n([\s\S]*?)\n```$/);
    if (codeBlockMatch) {
      reportContent = codeBlockMatch[1];
    }

    // Convert markdown to Slack-friendly format
    let slackFormatted = reportContent
      // Convert headers
      .replace(/^# (.*?)$/gm, '*$1*\n')  // H1 to bold
      .replace(/^## (.*?)$/gm, '\n*$1*') // H2 to bold with spacing
      .replace(/^### (.*?)$/gm, '_$1_')   // H3 to italic
      // Convert bold/italic
      .replace(/\*\*(.*?)\*\*/g, '*$1*')  // Bold
      // Convert links to Slack format
      .replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Split into chunks if needed (Slack has 3000 char limit per block)
    const chunks = [];
    const lines = slackFormatted.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > 2800) {
        chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // Parse webhook URL
    const url = new URL(webhookUrl);

    // Prepare the Slack message blocks
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📊 Daily PR Report",
          emoji: true
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
          }
        ]
      },
      {
        type: "divider"
      }
    ];

    // Add content chunks
    chunks.forEach(chunk => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: chunk
        }
      });
    });

    const payload = JSON.stringify({
      text: `📊 Daily PR Report - ${new Date().toLocaleDateString()}`,
      blocks: blocks
    });

    // Send to Slack webhook
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Report sent to Slack successfully!');
            resolve();
          } else {
            reject(new Error(`Slack API returned status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(payload);
      req.end();
    });

  } catch (error) {
    console.error('Error sending to Slack:', error.message);
    process.exit(1);
  }
}

// Run the script
sendToSlack();
