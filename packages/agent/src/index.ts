import { Mastra } from '@mastra/core';
import { accountingAgent } from './agents/accountingAgent.js';

export const mastra = new Mastra({
  agents: {
    accountingAgent,
  },
});
