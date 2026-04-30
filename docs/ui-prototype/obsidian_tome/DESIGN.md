# Stratégie du Système de Design : Les Archives Obsidiennes

## 1. Vue d'ensemble & Étoile du Nord Créative
**Étoile du Nord Créative : Le Grimoire Vivant**

Ce système de design n'est pas un simple utilitaire ; c'est un artefact numérique. Pour dépasser l'aspect stérile "SaaS", nous traitons l'interface du Maître de Jeu comme un tome ancien et évolutif, illuminé d'une énergie éthérée. Nous évitons une UI "standard" en rejetant la grille rigide au profit de la **Superposition Organique** — où les éléments semblent flotter dans un vide sombre et infini, ou reposer sur du vélin épais et feuilleté.

L'expérience brise l'aspect "template" grâce à :
*   **Asymétrie Intentionnelle :** Éviter les divisions parfaites 50/50. Utiliser des ratios 60/40 ou 70/30 pour créer un rendu dynamique, éditorial.
*   **Profondeur Tonale :** Plutôt que des lignes, on utilise la lumière. La hiérarchie est établie par la "proximité" d'un objet avec la source lumineuse, représentée par des variations de luminosité de surface.
*   **Tension Atmosphérique :** Une typographie à fort contraste (grands titres Serif face à de petits labels Sans-serif) crée un environnement autoritaire et narratif.

---

## 2. Couleurs : Noir Mystique & Lumière Éthérée
La palette est enracinée dans les ombres (`surface`), avec une vie insufflée par `secondary` (Or Ancien) et `primary` (Bleu Éthéré).

*   **La Règle "Sans Ligne" :** Les sections ne doivent jamais être délimitées par des bordures solides d'1px. Pour séparer la "Carte du Monde" des "Notes de Session", passer de `surface` à `surface-container-low`. Les frontières sont ressenties, pas vues.
*   **Hiérarchie des Surfaces :**
    *   **Niveau 0 (Le Vide) :** `surface` (#111316) pour l'arrière-plan principal.
    *   **Niveau 1 (Le Bureau) :** `surface-container-low` (#1a1c1f) pour les barres latérales.
    *   **Niveau 2 (Le Tome) :** `surface-container` (#1e2023) pour les cartes de l'espace de travail principal.
    *   **Niveau 3 (L'Insight) :** `surface-container-highest` (#333538) pour les pop-overs actifs ou les infobulles.
*   **La Règle "Verre & Dégradé" :** Les modales flottantes ou les barres de navigation doivent utiliser le Glassmorphisme. Utiliser `surface_variant` à 60% d'opacité avec un `backdrop-blur` de `24px`.
*   **Textures Signatures :** Pour les appels à l'action principaux, appliquer un dégradé linéaire subtil : `primary` (#94ccff) vers `primary_container` (#4197d6) à un angle de 135 degrés. Cela produit un "éclat" que les couleurs plates ne peuvent pas reproduire.

---

## 3. Typographie : La Main du Chroniqueur
Nous associons le monde ancien à la précision moderne.

*   **Affichage & Titres (Newsreader) :** Cette police serif est notre "Âme". Utiliser `display-lg` pour les titres de chapitres et `headline-md` pour les noms de monstres. Elle doit évoquer l'impression à l'encre et l'autorité. Garder un espacement des lettres légèrement serré (-0.02em) pour un rendu plus dramatique, éditorial.
*   **Interface & Narration (Manrope) :** Cette police sans-serif est notre "Fonction". Utiliser `body-md` pour les descriptions narratives longues et `label-md` pour les stats techniques (FOR, DEX, INT). La clarté géométrique de Manrope assure la lisibilité sur des fonds sombres et texturés.
*   **Conseil de Hiérarchie :** Toujours associer un `headline-sm` (Serif) avec un `label-sm` (Sans-serif, Majuscules, espacement de 0.1em) placé immédiatement au-dessus comme marqueur de catégorie.

---

## 4. Élévation & Profondeur : Superposition Tonale
Dans ce système, les ombres ne sont pas noires ; elles sont de l'"Occlusion Ambiante".

*   **Le Principe de Superposition :** Empiler des cartes `surface-container-lowest` sur un fond `surface-container-low`. Cela crée un aspect "en retrait", comme si la carte était un plateau creusé dans une table de pierre sombre.
*   **Ombres Ambiantes :** Pour les éléments flottants (comme un résultat de dé), utiliser une ombre avec un flou de `40px`, un décalage de 0px, et 6% d'opacité en utilisant la couleur `on-surface`. Cela imite la douce lueur d'une bougie plutôt qu'un soleil brutal.
*   **Repli "Bordure Fantôme" :** Si une distinction est critique (ex. : un champ de saisie), utiliser le token `outline-variant` à **15% d'opacité**. Ce doit être un murmure de ligne, à peine perceptible.
*   **Lueur Éthérée :** Les éléments interactifs ne doivent pas simplement "s'allumer". Utiliser une lueur extérieure `0px 0px 12px` avec le token `primary` à 30% d'opacité au survol d'une carte.

---

## 5. Composants : Forgés dans les Archives

*   **Boutons :**
    *   **Principal :** Remplissage en dégradé (`primary` vers `primary_container`), arrondi `md` (0.375rem). Pas de bordure. Texte en `on_primary`.
    *   **Secondaire :** Style fantôme. Pas de remplissage, `outline` à 20% d'opacité. Au survol, le fond se remplit avec `secondary_container` à 10% d'opacité.
*   **Cartes de Journal :**
    *   Interdire les lignes de séparation. Utiliser `surface-container-high` pour l'en-tête et `surface-container` pour le corps. Utiliser un espacement vertical de `16px` (échelle d'espacement) pour séparer les idées.
    *   *Ajout Signature :* Appliquer une texture "noise" en superposition à 2% d'opacité sur les cartes pour évoquer le toucher du parchemin vieilli.
*   **Champs de Saisie :**
    *   Bordure en bas uniquement (style "souligné"). Utiliser `outline_variant`. Au focus, la bordure passe à `primary` et une douce lueur `surface_tint` apparaît derrière le texte.
*   **Puces (Effets de Statut) :**
    *   Utiliser `tertiary_container` pour le fond et `on_tertiary_container` pour le texte. L'arrondi doit être `full` pour un aspect "pilule" qui contraste avec les cartes rectangulaires.

---

## 6. Ce qu'il faut faire et ne pas faire

### À faire :
*   **Exploiter l'Espace Négatif :** Laisser de la place à la typographie `display` pour respirer. Le design haut de gamme se définit par ce que l'on enlève.
*   **Utiliser la Couleur avec Intention :** Réserver `secondary` (Or) pour les moments de "Découverte" (butin, montées de niveau) et `primary` (Bleu) pour les moments d'"Action" (sorts, navigation).
*   **Superposer avec Intention :** S'assurer que chaque "palier" d'élévation correspond à un déplacement de token `surface-container`.

### À ne pas faire :
*   **Ne pas utiliser le pur #000000 :** Cela tue le "brouillard" atmosphérique de la palette charbon. Utiliser `surface` (#111316).
*   **Ne pas utiliser des Bordures à 100% d'Opacité :** Cela brise l'immersion et donne à l'application l'air d'un tableur.
*   **Ne pas Surcharger les Animations :** Les transitions doivent être lentes et "lourdes" (300ms–500ms), comme une lourde porte qui s'ouvre ou une page qui se tourne. Éviter les animations "vives" ou "rebondissantes".