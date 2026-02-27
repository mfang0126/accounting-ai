import 'dotenv/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { text } = await generateText({
  model: openai.chat('gpt-4o-mini'),
  prompt: 'Say "accounting AI works" and nothing else.',
});

console.log(text);
