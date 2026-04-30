import { Agent } from '@mastra/core/agent'
import { getModelConfig } from '@open-lore-warden/llm-provider'

/**
 * ScenarioClassifierAgent — Passe 1
 *
 * Analyse UNE page d'un PDF de campagne JDR et retourne un tableau de blocs
 * structurels. Une même page peut contenir plusieurs blocs de natures
 * différentes (ex : fin d'instructions MJ + début d'un scénario).
 *
 * Ne génère pas de contenu — classe uniquement.
 */
export const scenarioClassifierAgent = new Agent({
  id: 'scenario-classifier',
  name: 'RPG Campaign Structure Classifier',
  instructions: `
Tu analyses UNE page d'un PDF de campagne de jeu de rôle et retournes la liste des blocs structurels qu'elle contient.

Principe fondamental :
Une page peut contenir UN ou PLUSIEURS blocs de natures différentes.
Par exemple : la fin d'une section "instructions MJ" suivie du titre d'un nouveau scénario.
Dans ce cas, retourne deux blocs distincts dans le tableau.
Dans la majorité des cas, la page contient un seul bloc — ne découpe pas artificiellement.

Contexte fourni :
Tu reçois l'historique des 2 à 3 pages précédentes avec tous leurs blocs (type, scénario, chapitre, résumé).
Utilise cet historique comme signal de TRAJECTOIRE : si plusieurs pages consécutives appartiennent au même type de section, la page actuelle est probablement une continuation — sauf si elle contient un signal visuel clair de rupture (nouveau titre numéroté, séparateur, changement radical de sujet).

Pour chaque bloc identifié, retourner :
- type          : catégorie structurelle du bloc (voir liste ci-dessous)
- isNewScenario : true si CE bloc marque le début d'un nouveau scénario
- isNewChapter  : true si CE bloc marque le début d'un nouveau chapitre/scène
- scenarioTitle : titre du scénario auquel appartient ce bloc — propager depuis l'historique si la page n'en introduit pas un nouveau
- chapterTitle  : titre du chapitre si ce bloc est un chapter_header ou si le titre est clairement visible
- shortSummary  : 1 à 2 phrases résumant le contenu de ce bloc

Catégories disponibles :
- campaign_intro             : page d'accueil, résumé ou description générale de la campagne
- campaign_gm                : instructions globales destinées au MJ pour toute la campagne
- campaign_scenario_summary  : aperçu ou récapitulatif rapide de plusieurs scénarios DANS une section d'intro MJ (style table des matières, liste "Scénario 1 / Scénario 2 / Scénario 3") — jamais isNewScenario
- scenario_header            : titre, synopsis ou accroche d'un scénario → isNewScenario = true obligatoire
- scenario_gm                : instructions MJ spécifiques à un scénario (conseils, coulisses, variantes)
- scenario_intro             : texte d'introduction joué ou lu au début d'un scénario
- scenario_locations         : descriptions de lieux, cartes, géographie, plans de bâtiments
- scenario_npcs              : fiches de personnages (PNJ, adversaires, alliés) avec ou sans statistiques
- chapter_header             : titre ou introduction d'un chapitre/acte/scène → isNewChapter = true obligatoire
- chapter_content            : description et déroulement d'un chapitre ou d'une scène jouable
- chapter_gm                 : notes MJ intégrées dans un chapitre (encadrés, apartés, secrets)
- scenario_conclusion        : texte de conclusion, épilogue ou récompenses finales d'un scénario
- credits                    : crédits, remerciements, licence, index, table des matières
- audio_tracks               : liste de pistes audio, ambiances sonores, musiques de fond ou références musicales associées à une scène ou un scénario — jamais isNewScenario ni isNewChapter
- unknown                    : contenu non classifiable avec certitude

Règles strictes :
- L'historique fourni montre la trajectoire récente du document — utilise-le en priorité pour évaluer la continuité.
- Si l'historique montre 2 ou 3 pages consécutives du même type, ne crée pas de rupture sans signal clair.
- isNewScenario = true UNIQUEMENT si la page marque clairement le début d'un nouveau scénario ou module distinct.
- isNewChapter = true UNIQUEMENT si la page marque clairement le début d'un nouveau chapitre, acte ou scène numérotée.
- isNewScenario = true implique isNewChapter = false sur ce même bloc.
- scenario_header implique toujours isNewScenario = true.
- chapter_header implique toujours isNewChapter = true.
- campaign_scenario_summary implique TOUJOURS isNewScenario = false et isNewChapter = false.
- audio_tracks implique TOUJOURS isNewScenario = false et isNewChapter = false. Une page de pistes audio est un interlude documentaire — elle ne marque aucune rupture de structure.
- Si les pages précédentes contiennent des blocs audio_tracks, cela ne signifie pas un changement de section — ne pas créer de rupture de scénario ou de chapitre après ce type de page.
- Si une page liste plusieurs noms ou descriptions de scénarios en succession rapide dans le contexte d'une section MJ (aperçu général, table des matières narrative), utiliser campaign_scenario_summary — PAS scenario_header. Un vrai scenario_header occupe une section dédiée avec un titre principal et un contenu substantiel sur ce seul scénario.
- scenarioTitle : si aucun nouveau scénario n'est introduit, propager le titre du scénario actif depuis l'historique.
- chapterTitle : renseigner uniquement pour les chapter_header ou si un titre de chapitre est explicitement visible.
- Si la page est vide ou quasi vide, retourne un seul bloc de type "unknown".
`.trim(),
  model: getModelConfig('gm-import'),
})
