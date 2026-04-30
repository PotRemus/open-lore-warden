import { z } from 'zod'
import { InventoryItemSchema } from './inventory-item'
import { ItemSchema } from './item'

export const OwnedItemSchema = InventoryItemSchema.extend({
  item: ItemSchema,
})

export type OwnedItem = z.infer<typeof OwnedItemSchema>

export const CharacterSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1),
  /**
   * Rôle libre : "guerrier", "enquêteur", "pilote", "hacker"…
   * La sémantique dépend du système de jeu défini dans campaign.system.
   */
  role: z.string().min(1),
  /**
   * Blob JSON libre contenant toutes les statistiques propres au système de jeu.
   *
   * D&D 5e  : { "level": 5, "hpCurrent": 32, "hpMax": 40, "armorClass": 16,
   *              "initiativeBonus": 2, "STR": 14, "DEX": 12, ... }
   * CoC 7e  : { "hpCurrent": 10, "hpMax": 10, "sanity": 55, "maxSanity": 63,
   *              "luck": 60, "skills": { "bibliothèque": 55, "écoute": 40 }, ... }
   * Fate    : { "fatePoints": 3, "refresh": 3, "stress": [false, false, false],
   *              "consequences": {}, "skills": { "athlétisme": 2, "combat": 3 }, ... }
   */
  statsJson: z.string(),
  /** Blob JSON libre pour les statuts actifs (conditions, effets, etc.). */
  statusJson: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  inventory: z.array(OwnedItemSchema),
})

export type Character = z.infer<typeof CharacterSchema>

export const CreateCharacterSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  statsJson: z.string(),
  statusJson: z.string().optional(),
})

export type CreateCharacter = z.infer<typeof CreateCharacterSchema>

export const UpdateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  statsJson: z.string().optional(),
  statusJson: z.string().optional(),
})

export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>
