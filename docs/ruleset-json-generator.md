Oui, ta nouvelle approche est beaucoup plus réaliste. Si tu as déjà une liste de pages du type `PageSection[]`, le plus simple est d’utiliser Mastra pour faire une **classification page par page**, puis dans un second temps un **groupement logique** des pages appartenant à la même catégorie de règles. Mastra permet justement de demander une sortie structurée validée par **Zod**, et cette sortie est récupérable via `result.object`. [mastra](https://mastra.ai/docs/agents/structured-output)

## Idée générale

Ne cherche pas à faire classifier “tout le livre” d’un coup. La bonne stratégie est :
- une passe de **classification légère** sur chaque page ;
- une passe de **fusion** pour regrouper les pages voisines d’un même chapitre ;
- puis, seulement après, une passe d’**extraction métier** par bloc regroupé. [mastra](https://mastra.ai/docs/agents/overview)

Avec ton format actuel, tu peux donc considérer chaque `PageSection` comme une unité d’entrée pour un agent Mastra. [mintlify](https://www.mintlify.com/mastra-ai/mastra/agents/structured-output)

## Ce que doit faire la classification

Sur chaque page, tu peux demander au modèle :
- le **type principal** de la page ;
- les **types secondaires** éventuels ;
- un **score de confiance** ;
- un **titre détecté** ;
- une indication `shouldMergeWithPrevious` pour savoir si cette page continue la précédente. [mastra](https://mastra.ai/docs/agents/structured-output)

Ça te donne un résultat exploitable immédiatement par ton code sans devoir parser un texte libre. [mastra](https://mastra.ai/reference/workflows/step)

## Schéma Zod conseillé

Commence avec un schéma simple et robuste, parce que les structured outputs sont plus fiables avec des schémas peu profonds, et certains retours signalent des soucis sur des schémas Zod trop complexes ou avec certains champs optionnels selon les modèles. [github](https://github.com/mastra-ai/mastra/issues/7234)

Exemple :

```ts
import { z } from "zod";

export const PageClassificationSchema = z.object({
  pageId: z.string(),
  page: z.number(),
  title: z.string().nullable(),
  primaryType: z.enum([
    "cover",
    "toc",
    "introduction",
    "core_resolution",
    "attributes",
    "skills",
    "combat",
    "equipment",
    "spells",
    "character_creation",
    "advancement",
    "bestiary",
    "gm_rules",
    "table",
    "appendix",
    "unknown"
  ]),
  secondaryTypes: z.array(
    z.enum([
      "core_resolution",
      "attributes",
      "skills",
      "combat",
      "equipment",
      "spells",
      "character_creation",
      "advancement",
      "bestiary",
      "gm_rules",
      "table"
    ])
  ).default([]),
  confidence: z.number().min(0).max(1),
  shouldMergeWithPrevious: z.boolean(),
  shortSummary: z.string(),
  extractedKeywords: z.array(z.string()).default([]),
});
```

Ce schéma colle bien à l’usage “classification + pré-segmentation”. [mintlify](https://www.mintlify.com/mastra-ai/mastra/agents/structured-output)

## Agent Mastra

Mastra permet de définir un agent avec des instructions, puis d’appeler `generate()` avec `structuredOutput.schema`. [mastra](https://mastra.ai/docs/agents/structured-output)

Exemple :

```ts
import { Agent } from "@mastra/core/agent";

export const pageClassifierAgent = new Agent({
  id: "page-classifier",
  name: "RPG Rulebook Page Classifier",
  instructions: `
Tu analyses UNE page d'un livre de règles de jeu de rôle.

Objectif :
- classifier la page dans une catégorie métier,
- détecter si elle continue logiquement la page précédente,
- retourner uniquement des informations explicites ou hautement probables.

Règles :
- N'invente pas de règles absentes.
- Si la page est ambiguë, retourne "unknown".
- Si la page contient surtout des tableaux chiffrés ou des listes structurées, utilise "table" en type principal si c'est dominant.
- shouldMergeWithPrevious = true si la page semble être la suite directe du même chapitre ou de la même règle que la page précédente.
- Le résumé doit faire 1 à 2 phrases maximum.
`,
  model: myLocalModel,
});
```

La documentation Mastra montre explicitement ce pattern `new Agent(...)` puis `agent.generate(..., { structuredOutput: { schema } })`. [mintlify](https://www.mintlify.com/mastra-ai/mastra/agents/structured-output)

## Fonction de classification

Ensuite, tu classes chaque page :

```ts
type PageSection = {
  id: string;
  page: number;
  content: string;
};

export async function classifyPageSection(
  section: PageSection,
  previousSection?: PageSection
) {
  const prompt = `
Analyse cette page de livre de règles JDR.

PAGE ID: ${section.id}
PAGE NUMERO: ${section.page}

PAGE PRECEDENTE (optionnelle):
${previousSection ? previousSection.content.slice(0, 2500) : "Aucune"}

CONTENU DE LA PAGE:
${section.content.slice(0, 8000)}
`;

  const result = await pageClassifierAgent.generate(prompt, {
    structuredOutput: {
      schema: PageClassificationSchema,
    },
  });

  return {
    ...result.object,
    pageId: section.id,
    page: section.page,
  };
}
```

L’idée de fournir aussi la page précédente aide beaucoup le modèle à déterminer si une page est la continuité d’un bloc déjà commencé. [mastra](https://mastra.ai/docs/agents/overview)

## Traitement en lot

Fais ensuite un traitement séquentiel simple. Pas besoin de workflow Mastra au début ; une boucle applicative suffit très bien.

```ts
export async function classifyAllPages(pages: PageSection[]) {
  const results = [];

  for (let i = 0; i < pages.length; i++) {
    const current = pages[i];
    const previous = i > 0 ? pages[i - 1] : undefined;

    const classified = await classifyPageSection(current, previous);
    results.push(classified);
  }

  return results;
}
```

C’est plus simple à déboguer qu’un workflow complet dès le départ, tout en restant compatible avec une évolution future vers des steps Mastra. [khaledgarbaya](https://khaledgarbaya.net/blog/mastering-mastra-ai-workflows/)

## Fusion des pages

Une fois les pages classifiées, tu peux reconstruire des blocs logiques côté TypeScript. Par exemple :

```ts
type ClassifiedPage = z.infer<typeof PageClassificationSchema>;

type ClassifiedBlock = {
  id: string;
  type: ClassifiedPage["primaryType"];
  pages: number[];
  title: string | null;
  content: string;
  keywords: string[];
};

export function mergeClassifiedPages(
  rawPages: PageSection[],
  classifiedPages: ClassifiedPage[]
): ClassifiedBlock[] {
  const blocks: ClassifiedBlock[] = [];

  for (let i = 0; i < classifiedPages.length; i++) {
    const cls = classifiedPages[i];
    const raw = rawPages[i];
    const last = blocks[blocks.length - 1];

    const canMerge =
      last &&
      cls.shouldMergeWithPrevious &&
      last.type === cls.primaryType;

    if (canMerge) {
      last.pages.push(raw.page);
      last.content += "\n\n" + raw.content;
      last.keywords = Array.from(new Set([...last.keywords, ...cls.extractedKeywords]));
      if (!last.title && cls.title) last.title = cls.title;
    } else {
      blocks.push({
        id: crypto.randomUUID(),
        type: cls.primaryType,
        pages: [raw.page],
        title: cls.title,
        content: raw.content,
        keywords: cls.extractedKeywords,
      });
    }
  }

  return blocks;
}
```

Cette étape est essentielle : le LLM classe, mais c’est **ton code** qui décide de la structure finale. [khaledgarbaya](https://khaledgarbaya.net/blog/mastering-mastra-ai-workflows/)

## Prompt utile

Le prompt doit être très opérationnel. Par exemple :

```txt
Tu analyses une page OCR/textuelle d’un livre de règles de jeu de rôle.

Ta tâche :
1. Identifier le type principal de la page.
2. Identifier les types secondaires éventuels.
3. Déterminer si la page est la continuation logique de la précédente.
4. Déduire un titre si un titre est visible ou fortement probable.
5. Résumer la page en 1 ou 2 phrases.
6. Extraire 3 à 8 mots-clés.

Contraintes :
- Ne jamais inventer une règle absente.
- Si ambigu, mettre primaryType = "unknown".
- Base-toi uniquement sur le contenu fourni.
- Si la page est surtout une table de valeurs, "table" peut être le type principal.
```

Mastra structured output fonctionne mieux quand les instructions et le schéma sont alignés de façon très explicite. [mastra](https://mastra.ai/docs/agents/structured-output)

## Ce que je te recommande vraiment

Ajoute un peu de contexte local à chaque appel :
- page précédente ;
- éventuellement les 300 à 500 premiers caractères de la page suivante ;
- numéro de page ;
- nom supposé du système si tu le connais déjà.  

Ce petit contexte améliore souvent fortement la classification sans complexifier ton parser PDF. [mastra](https://mastra.ai/docs/agents/overview)

## Exemple enrichi

Tu peux passer un input plus riche que juste `content` :

```ts
function buildClassificationPrompt(
  current: PageSection,
  previous?: PageSection,
  next?: PageSection
) {
  return `
Contexte:
- page actuelle: ${current.page}
- page précédente: ${previous?.page ?? "aucune"}
- page suivante: ${next?.page ?? "aucune"}

Contenu page précédente:
${previous?.content.slice(0, 1500) ?? "Aucun"}

Contenu page actuelle:
${current.content.slice(0, 6000)}

Début page suivante:
${next?.content.slice(0, 1000) ?? "Aucun"}
`;
}
```

Ça aide particulièrement pour les pages coupées au milieu d’un chapitre ou d’un tableau. [mastra](https://mastra.ai/docs/agents/structured-output)

## Workflow Mastra ou simple service ?

Mastra propose bien les **workflows** avec des steps typés et structured outputs, donc tu pourrais transformer cela en pipeline formel plus tard. [mastra](https://mastra.ai/docs/workflows/agents-and-tools)

Mais honnêtement, pour ton cas actuel, je te conseille :
- **un service TypeScript classique** pour boucler sur les pages ;
- **un agent Mastra unique** pour classifier ;
- puis plus tard un **workflow Mastra** seulement si tu veux industrialiser plusieurs étapes IA. [mastra](https://mastra.ai/docs/workflows/overview)

## Gestion des erreurs

Prévoyez ces cas :
- réponse invalide au schéma ;
- `confidence` trop faible ;
- page vide ou OCR sale ;
- pages très longues qui dépassent ce que ton modèle local gère confortablement. [github](https://github.com/mastra-ai/mastra/issues/7234)

Dans ce cas :
- tu mets `primaryType: "unknown"` ;
- tu stockes le texte brut ;
- tu envoies éventuellement la page dans une file “review needed”.  

## Bon pattern de production

Je te conseille un résultat final en 2 fichiers :

- `pages.raw.json` : ton extraction `PageSection[]`
- `pages.classified.json` : la classification Mastra
- puis `ruleset.blocks.json` : les blocs fusionnés

Comme ça tu peux rejouer la pipeline sans tout refaire. [khaledgarbaya](https://khaledgarbaya.net/blog/mastering-mastra-ai-workflows/)

## Version minimale à coder tout de suite

Si tu veux aller au plus simple, code ces 4 morceaux :

1. `PageClassificationSchema`
2. `pageClassifierAgent`
3. `classifyAllPages(pages)`
4. `mergeClassifiedPages(rawPages, classifiedPages)`

Avec ça, tu auras déjà une vraie base exploitable pour l’étape suivante : l’extraction de règles depuis des blocs `combat`, `skills`, `spells`, etc. [mintlify](https://www.mintlify.com/mastra-ai/mastra/agents/structured-output)

## Ma recommandation pratique

Commence avec une classification **mono-label** très simple :
- `primaryType`
- `confidence`
- `shouldMergeWithPrevious`
- `title`
- `shortSummary` [mintlify](https://www.mintlify.com/mastra-ai/mastra/agents/structured-output)

Puis seulement après ajoute `secondaryTypes` et `keywords`. Plus le schéma est simple, plus ton modèle local aura de chances d’être stable. [github](https://github.com/mastra-ai/mastra/issues/7234)

Si tu veux, je peux te rédiger maintenant un **exemple complet TypeScript prêt à coller** avec :
- les types,
- le schéma Zod,
- l’agent Mastra,
- la boucle de classification,
- et la fusion des pages en blocs métier.