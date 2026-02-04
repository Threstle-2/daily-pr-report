#!/usr/bin/env node

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function generateReport() {
  // Check for API key
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Check if required files exist
  const jsonPath = path.join(process.cwd(), 'pr-report.json');
  const promptPath = path.join(process.cwd(), 'prompts/daily-pr-report.md');

  if (!fs.existsSync(jsonPath)) {
    console.error('Error: pr-report.json not found. Run list-my-prs.js first.');
    process.exit(1);
  }

  if (!fs.existsSync(promptPath)) {
    console.error('Error: prompts/daily-pr-report.md not found.');
    process.exit(1);
  }

  try {
    console.log('Generating daily PR report with Gemini...');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

    // Read prompt and JSON data
    const prompt = fs.readFileSync(promptPath, 'utf8');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');

    // Combine prompt and data
    const fullPrompt = `${prompt}

---

Here is the JSON data to transform into a report:

${jsonData}`;

    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Write report to file
    const outputPath = path.join(process.cwd(), 'daily-report.md');
    fs.writeFileSync(outputPath, text);

    console.log('✅ Report generated successfully!');
    console.log('✅ Report saved to: daily-report.md');
  } catch (error) {
    console.error('Error generating report:', error.message);
    if (error.message.includes('API key')) {
      console.error('Please check your GOOGLE_API_KEY is valid.');
    }
    process.exit(1);
  }
}

// Run the script
generateReport();
