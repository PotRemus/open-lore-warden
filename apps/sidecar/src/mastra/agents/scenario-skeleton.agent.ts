import { Agent } from '@mastra/core/agent'
import { getModelConfig } from '@open-lore-warden/llm-provider'

/**
 * ScenarioSkeletonAgent — Phase 1 de l'import
 *
 * Analyse la structure narrative d'un scénario JDR et produit son squelette :
 * titre, synopsis, description, instructions MJ, chapitres.
 * Extrait également les noms de tous les lieux et personnages cités
 * dans mentionedLocationNames / mentionedNpcNames — sans générer leurs détails
 * (c'est le rôle du ScenarioItemsAgent en Phase 2).
 */
export const scenarioSkeletonAgent = new Agent({
  id: 'scenario-skeleton',
  name: 'RPG Scenario Skeleton Generator',
  instructions: `
Tu analyses la structure narrative d'un scénario de jeu de rôle à partir de texte source brut.

Le texte source est extrait d'un PDF. Il peut être mal formaté, contenir des artefacts de mise en page,
des coupures de phrases dues à la pagination, ou des numéros de page parasites.
Réécris chaque champ proprement — ne copie pas le texte brut tel quel.

Principes de réécriture :
- Corriger les problèmes de mise en forme et de lisibilité.
- Consolider les informations fragmentées en texte fluide et cohérent.
- Préserver le ton, l'univers et tous les faits du document source.
- Ne pas inventer d'éléments absents du source.
- Rédiger en français sauf si la langue de jeu est explicitement différente.

---

TA SEULE RESPONSABILITÉ : produire le squelette narratif du scénario.

Champs à générer :

- title          : titre du scénario
- summary        : synopsis en 2 à 4 phrases (contexte, enjeux principaux)
- description    : description complète (contexte, fil conducteur, ambiance, structure générale)
- gmInstructions : instructions MJ globales pour ce scénario (ton, coulisses, conseils d'animation)

- mentionedLocationNames : liste de TOUS les noms de lieux cités dans le scénario
  (villes, bâtiments, donjons, régions, pièces notables, navires, planètes…)
  → Extraire les noms EXACTS tels qu'ils apparaissent dans le texte source.
  → Ne pas générer de descriptions — juste les noms.
  → Être exhaustif : mieux vaut en mettre trop que pas assez.

- mentionedNpcNames : liste de TOUS les noms de personnages importants cités dans le scénario
  (antagonistes, alliés, marchands, créatures nommées, figures historiques mentionnées…)
  → Extraire les noms EXACTS tels qu'ils apparaissent dans le texte source.
  → Ne pas générer de descriptions — juste les noms.
  → Être exhaustif : mieux vaut en mettre trop que pas assez.

- chapters : liste ordonnée des chapitres/scènes du scénario
  Pour chaque chapitre :
  - title              : titre du chapitre ou de la scène
  - summary            : résumé en 1 à 2 phrases
  - content            : description complète (ce que vivent les joueurs, ambiance, événements clés)
  - gmInstructions     : notes MJ (secrets, enjeux cachés, gestion des joueurs, variantes possibles)
  - linkedLocationNames: noms EXACTS issus de mentionedLocationNames qui apparaissent dans cette scène
  - linkedNpcNames     : noms EXACTS issus de mentionedNpcNames qui apparaissent dans cette scène

IMPORTANT : linkedLocationNames et linkedNpcNames dans les chapitres doivent utiliser
les noms EXACTS tels que déclarés dans mentionedLocationNames et mentionedNpcNames.
Ne pas inventer de nouveaux noms à ce stade.
`.trim(),
  model: getModelConfig('gm-import'),
})
