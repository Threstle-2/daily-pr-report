#!/usr/bin/env node

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY environment variable is not set');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('Fetching available models...\n');

    const models = await genAI.listModels();

    console.log('Available models:');
    console.log('=================\n');

    for await (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
      console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error listing models:', error.message);
    process.exit(1);
  }
}

listModels();
