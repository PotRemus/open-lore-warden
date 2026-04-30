import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { yzeRoll, pushRoll, applyTrauma } from '@open-lore-warden/rules-engine'

export const yzeRollTool = createTool({
  id: 'yze-roll',
  description:
    'Roll a Year Zero Engine dice pool (base + skill + gear dice). ' +
    'Each 6 = 1 success. ' +
    'Reads base pool from statsJson.attributes[attrKey], ' +
    'skill pool from statsJson.skills[skillKey], ' +
    'gear pool from statsJson.gear[gearKey] (all default to 0 if absent). ' +
    'Set push=true to re-roll non-6 dice; 1s on base dice after a push ' +
    'are automatically applied as trauma to the character.',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the acting character'),
    attrKey: z
      .string()
      .optional()
      .describe('Key in statsJson.attributes for the base dice pool (e.g. "strength", "agility")'),
    skillKey: z
      .string()
      .optional()
      .describe('Key in statsJson.skills for the skill dice pool (e.g. "ranged", "stealth")'),
    gearKey: z
      .string()
      .optional()
      .describe('Key in statsJson.gear for the gear dice pool (e.g. "rifle", "knife")'),
    push: z
      .boolean()
      .default(false)
      .describe(
        'true to push (re-roll non-6 dice). ' +
          '1s on base dice after a push are automatically applied as trauma.',
      ),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    pool: z.object({ base: z.number().int(), skill: z.number().int(), gear: z.number().int() }),
    baseDice: z.array(z.number().int()),
    skillDice: z.array(z.number().int()),
    gearDice: z.array(z.number().int()),
    successes: z.number().int(),
    pushed: z.boolean(),
    baseTragedy: z.number().int().describe('1s on base dice (trauma gained if pushed)'),
    traumaApplied: z.number().int().describe('Trauma actually applied to the character (0 if not pushed)'),
  }),
  execute: async ({ characterId, attrKey, skillKey, gearKey, push }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    const getPool = (blob: unknown, key: string | undefined): number => {
      if (!key || !blob || typeof blob !== 'object') return 0
      const v = (blob as Record<string, unknown>)[key]
      return typeof v === 'number' ? v : 0
    }

    const pool = {
      base: getPool(stats['attributes'], attrKey),
      skill: getPool(stats['skills'], skillKey),
      gear: getPool(stats['gear'], gearKey),
    }

    let result = yzeRoll(pool)
    if (push) result = pushRoll(result)

    let traumaApplied = 0
    if (push && result.baseTragedy > 0) {
      const traumaResult = applyTrauma(stats, result.baseTragedy)
      traumaApplied = traumaResult.traumaGained
      const updated = { ...stats, stress: traumaResult.stressAfter }
      characterRepository.update(characterId, { statsJson: JSON.stringify(updated) })
    }

    return {
      characterId,
      pool: result.pool,
      baseDice: result.baseDice,
      skillDice: result.skillDice,
      gearDice: result.gearDice,
      successes: result.successes,
      pushed: result.pushed,
      baseTragedy: result.baseTragedy,
      traumaApplied,
    }
  },
})
