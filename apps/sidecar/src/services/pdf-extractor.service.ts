import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

import { PDFParse } from 'pdf-parse'

export type PageSection = {
  id: string
  page: number
  content: string
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type PdfExtractError =
  | { kind: 'not_found'; filePath: string }
  | { kind: 'invalid_extension'; filePath: string }
  | { kind: 'parse_error'; cause: Error }

// ---------------------------------------------------------------------------
// Nettoyage niveau 1 — appliqué au texte brut de chaque page
// ---------------------------------------------------------------------------

function cleanPageText(text: string): string {
  return text
    .replace(/\t/g, ' ')                    // tabulations → espaces
    .replace(/\n{3,}/g, '\n\n')             // 3+ sauts de ligne → double saut
    .replace(/[ \t]+$/gm, '')              // espaces en fin de ligne
    .trim()
}

/**
 * Extrait les sections d'un PDF page par page.
 *
 * @param filePath      Chemin vers le fichier PDF source
 * @param stem          Nom de base (sans extension) utilisé pour nommer les artefacts
 * @param originalFilename Nom original du fichier (affiché dans le JSON raw)
 * @param importDir     Dossier racine de l'import ({DATA_DIR}/scenario-imports/{importId}).
 *                      Si absent, les artefacts intermédiaires ne sont pas écrits.
 */
export async function extractPdfSections(
  filePath: string,
  stem: string,
  originalFilename?: string,
  importDir?: string,
): Promise<{ ok: true; sections: PageSection[]; coverImagePath?: string } | { ok: false; error: PdfExtractError }> {
  if (extname(filePath).toLowerCase() !== '.pdf') {
    return { ok: false, error: { kind: 'invalid_extension', filePath } }
  }

  if (!existsSync(filePath)) {
    return { ok: false, error: { kind: 'not_found', filePath } }
  }

  try {
    const buffer = readFileSync(filePath)
    const parser = new PDFParse({ data: buffer })
    const parsed = await parser.getText()

    const sections: PageSection[] = parsed.pages.map((page, index) => ({
      id: `page-${index + 1}`,
      page: page.num,
      content: cleanPageText(page.text),
    }))

    // ── Extraction de l'image de couverture (page 1, non-fatale) ─────────────
    let coverImagePath: string | undefined
    if (importDir) {
      try {
        const imageResult = await parser.getImage({ partial: [1], imageBuffer: true })
        const pageImages = imageResult.pages[0]?.images ?? []
        if (pageImages.length > 0) {
          const cover = pageImages.reduce((best, img) =>
            img.width * img.height > best.width * best.height ? img : best,
          )
          const imgDir = join(importDir, 'images')
          mkdirSync(imgDir, { recursive: true })
          coverImagePath = join(imgDir, 'cover.png')
          writeFileSync(coverImagePath, Buffer.from(cover.data))
        }
      } catch {
        // Non-fatal
      }

      // ── Persistance du texte brut extrait ───────────────────────────────────
      try {
        const rawDir = join(importDir, 'debug', 'raw')
        mkdirSync(rawDir, { recursive: true })
        const outputPath = join(rawDir, `${stem}.json`)
        writeFileSync(
          outputPath,
          JSON.stringify({ filePath: originalFilename ?? filePath, sections }, null, 2),
          'utf-8',
        )
      } catch {
        // Non-fatal
      }
    }

    return { ok: true, sections, coverImagePath }
  } catch (err) {
    const cause = err instanceof Error ? err : new Error(String(err))
    return { ok: false, error: { kind: 'parse_error', cause } }
  }
}
