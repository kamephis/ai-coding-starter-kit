/**
 * Sanitize search input for safe use in Supabase PostgREST .or() filters.
 * Removes characters that could manipulate PostgREST filter syntax.
 * Preserves: letters (incl. umlauts/accents), digits, spaces, hyphens.
 * Limits length to 200 characters.
 */
export function sanitizeSearch(input: string): string {
  return input
    .replace(/[,.()"'\\%_]/g, '')
    .slice(0, 200)
}
