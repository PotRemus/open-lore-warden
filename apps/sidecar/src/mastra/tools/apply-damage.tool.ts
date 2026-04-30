import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characterRepository } from '@/repositories/character.repository'
import { applyDamage, applyHealing } from '@open-lore-warden/rules-engine'

/**
 * Reads a numeric stat from a parsed statsJson object.
 * Returns undefined if the key is absent or not a number.
 */
function readStat(stats: Record<string, unknown>, key: string): number | undefined {
  const v = stats[key]
  return typeof v === 'number' ? v : undefined
}

export const applyDamageTool = createTool({
  id: 'apply-damage',
  description:
    'Apply damage or healing to a character. Reads hpCurrent / hpMax from statsJson and persists the new value. ' +
    'Use a negative amount for healing. Only works for systems that store hpCurrent and hpMax in statsJson ' +
    '(D&D 5e, CoC); throws for systems that do not use explicit HP (e.g. Fate stress tracks).',
  inputSchema: z.object({
    characterId: z.string().min(1).describe('UUID of the target character'),
    amount: z
      .number()
      .int()
      .describe('Damage to apply (positive) or healing (negative)'),
  }),
  outputSchema: z.object({
    characterId: z.string(),
    previousHp: z.number().int(),
    newHp: z.number().int(),
    isDead: z.boolean(),
  }),
  execute: async ({ characterId, amount }) => {
    const character = characterRepository.findById(characterId)
    if (!character) throw new Error(`Character ${characterId} not found`)

    let stats: Record<string, unknown>
    try {
      stats = JSON.parse(character.statsJson) as Record<string, unknown>
    } catch {
      throw new Error(`Character ${characterId} has invalid statsJson`)
    }

    const hpCurrent = readStat(stats, 'hpCurrent')
    const hpMax = readStat(stats, 'hpMax')

    // HP fields are optional — systems that don't use explicit HP (Fate, etc.)
    // should track vitality differently and not call this tool.
    if (hpCurrent === undefined || hpMax === undefined) {
      throw new Error(
        `Character ${characterId} does not have hpCurrent / hpMax in statsJson. ` +
          'Store HP in statsJson for systems that use it (D&D 5e, CoC).',
      )
    }

    const hpTarget = { id: character.id, name: character.name, hpCurrent, hpMax }
    const result = amount >= 0 ? applyDamage(hpTarget, amount) : applyHealing(hpTarget, Math.abs(amount))
    if (!result.success) throw new Error(result.error)

    const newHp = result.value
    const updatedStats = { ...stats, hpCurrent: newHp }
    characterRepository.update(characterId, { statsJson: JSON.stringify(updatedStats) })

    return { characterId, previousHp: hpCurrent, newHp, isDead: newHp === 0 }
  },
})
