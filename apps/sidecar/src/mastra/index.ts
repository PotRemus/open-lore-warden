import { Mastra } from '@mastra/core/mastra'
import { intentInterpreterAgent } from '@/mastra/agents/intent-interpreter.agent'
import { narratorAgent } from '@/mastra/agents/narrator.agent'
import { loreKeeperAgent } from '@/mastra/agents/lore-keeper.agent'
import { sceneDirectorAgent } from '@/mastra/agents/scene-director.agent'
import { scenarioClassifierAgent } from '@/mastra/agents/scenario-classifier.agent'
import { scenarioEnricherAgent } from '@/mastra/agents/scenario-enricher.agent'
import { resolveTurnWorkflow } from '@/mastra/workflows/resolve-turn.workflow'
import { sessionSummaryWorkflow } from '@/mastra/workflows/session-summary.workflow'
import { bootstrapCampaignWorkflow } from '@/mastra/workflows/bootstrap-campaign.workflow'
import { importScenarioWorkflow } from '@/mastra/workflows/import-scenario.workflow'

export const mastra: Mastra = new Mastra({
  agents: {
    'intent-interpreter': intentInterpreterAgent,
    narrator: narratorAgent,
    'lore-keeper': loreKeeperAgent,
    'scene-director': sceneDirectorAgent,
    'scenario-classifier': scenarioClassifierAgent,
    'scenario-enricher': scenarioEnricherAgent,
  },
  workflows: {
    resolveTurnWorkflow,
    sessionSummaryWorkflow,
    bootstrapCampaignWorkflow,
    importScenarioWorkflow,
  },
})
