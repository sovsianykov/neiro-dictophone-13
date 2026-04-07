/**
 * Generates a sanitized filename for a transcription.
 * Format: {bookTitle}-chapter-{chapter}.txt
 */
export function buildFilename(bookTitle: string, chapter: number): string {
  const sanitized = bookTitle
    .trim()
    .replace(/[^\w\s-]/g, "")   // remove special chars
    .replace(/\s+/g, "")        // collapse spaces
    .replace(/-+/g, "-")        // collapse dashes
    .replace(/^-|-$/g, "")      // trim leading/trailing dashes
    || "Untitled";

  return `${sanitized}-chapter-${chapter}.txt`;
}
