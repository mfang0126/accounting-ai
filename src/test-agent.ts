import 'dotenv/config';
import { mastra } from './mastra/index.js';

const agent = mastra.getAgent('accountingAgent');

const response = await agent.generate(
  'Read the sample CSV files and reconcile bank vs GL. List all anomalies found, starting with HIGH severity. Also flag D Morrison invoice status.',
);

console.log(response.text);
