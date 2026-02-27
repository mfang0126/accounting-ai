import 'dotenv/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const { text } = await generateText({
  model: anthropic.chat('claude-sonnet-4-5'),
  prompt: 'Say "accounting AI works" and nothing else.',
});

console.log(text);
