/**
 * Post-processes raw Russian speech-to-text transcript:
 * - Replaces spoken punctuation words with symbols
 * - Capitalizes sentence starts
 * - Handles paragraph breaks ("абзац") with indentation
 * - Cleans up spacing
 */

const PARAGRAPH_INDENT = "\u00A0\u00A0\u00A0\u00A0"; // 4 non-breaking spaces

// Punctuation that ends a sentence (triggers capitalization of next word)
const SENTENCE_ENDERS = new Set([".", "!", "?"]);

type Token =
  | { type: "word"; value: string }
  | { type: "punct"; value: string; spaceAfter: boolean }
  | { type: "paragraph" }
  | { type: "openQuote" }
  | { type: "closeQuote" };

/**
 * Tokenize raw transcript into structured tokens.
 * Multi-word punctuation phrases are matched greedily left-to-right.
 */
function tokenize(raw: string): Token[] {
  // Normalize whitespace
  const words = raw.trim().toLowerCase().replace(/\s+/g, " ").split(" ");
  const tokens: Token[] = [];
  let i = 0;

  while (i < words.length) {
    // Two-word phrases first
    const twoWord = words.slice(i, i + 2).join(" ");
    if (twoWord === "вопросительный знак") {
      tokens.push({ type: "punct", value: "?", spaceAfter: true });
      i += 2;
      continue;
    }
    if (twoWord === "восклицательный знак") {
      tokens.push({ type: "punct", value: "!", spaceAfter: true });
      i += 2;
      continue;
    }

    const w = words[i];
    switch (w) {
      case "точка":
        tokens.push({ type: "punct", value: ".", spaceAfter: true });
        break;
      case "запятая":
        tokens.push({ type: "punct", value: ",", spaceAfter: true });
        break;
      case "двоеточие":
        tokens.push({ type: "punct", value: ":", spaceAfter: true });
        break;
      case "тире":
        tokens.push({ type: "punct", value: "—", spaceAfter: true });
        break;
      case "троеточие":
        tokens.push({ type: "punct", value: "...", spaceAfter: true });
        break;
      case "кавычки":
        // Toggle between open and close quote
        tokens.push({ type: "openQuote" });
        break;
      case "абзац":
        tokens.push({ type: "paragraph" });
        break;
      default:
        tokens.push({ type: "word", value: w });
    }
    i++;
  }

  return tokens;
}

/**
 * Resolve "кавычки" open/close tokens by pairing them up.
 * Odd occurrences open, even occurrences close.
 */
function resolveQuotes(tokens: Token[]): Token[] {
  let quoteOpen = false;
  return tokens.map((t) => {
    if (t.type === "openQuote") {
      const resolved: Token = quoteOpen
        ? { type: "closeQuote" }
        : { type: "openQuote" };
      quoteOpen = !quoteOpen;
      return resolved;
    }
    return t;
  });
}

/**
 * Render tokens into a formatted string.
 */
function render(tokens: Token[]): string {
  // Each entry: { text, indented }
  const paragraphs: Array<{ text: string; indented: boolean }> = [];
  let current: string[] = [];
  let capitalizeNext = true; // first word of transcript is capitalized
  let leadingBreaks = 0; // paragraph tokens before any content
  let seenContent = false;
  let pendingIndent = false; // indent for the next paragraph

  const flushParagraph = () => {
    const text = current.join("").trim();
    if (text) {
      paragraphs.push({ text, indented: pendingIndent });
      seenContent = true;
    }
    current = [];
    capitalizeNext = true;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "paragraph") {
      if (!seenContent && current.join("").trim() === "") {
        leadingBreaks++;
        pendingIndent = true;
      } else {
        flushParagraph();
        pendingIndent = true;
      }
      continue;
    }

    if (token.type === "openQuote") {
      // «  attaches directly to the following word (no space between « and word)
      // but keep any space before «
      current.push("«");
      continue;
    }

    if (token.type === "closeQuote") {
      // Remove trailing space before »
      if (current.length && current[current.length - 1] === " ") {
        current.pop();
      }
      current.push("»");
      current.push(" ");
      continue;
    }

    if (token.type === "punct") {
      // Remove trailing space before punctuation
      if (current.length && current[current.length - 1] === " ") {
        current.pop();
      }

      if (token.value === "—") {
        // Em-dash: space before, space after
        current.push(" —");
      } else {
        current.push(token.value);
      }

      if (token.spaceAfter) {
        current.push(" ");
      }

      if (SENTENCE_ENDERS.has(token.value)) {
        capitalizeNext = true;
      }
      continue;
    }

    if (token.type === "word") {
      let word = token.value;
      if (capitalizeNext) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
        capitalizeNext = false;
      }
      current.push(word);
      current.push(" ");
    }
  }

  flushParagraph();

  return paragraphs
    .map(({ text, indented }) =>
      indented ? PARAGRAPH_INDENT + text.trimEnd() : text.trimEnd()
    )
    .join("\n\n");
}

/**
 * Main entry point.
 * Accepts raw transcript text, returns formatted Russian text.
 */
export function formatTranscript(raw: string): string {
  if (!raw.trim()) return "";
  const tokens = tokenize(raw);
  const resolved = resolveQuotes(tokens);
  return render(resolved);
}
