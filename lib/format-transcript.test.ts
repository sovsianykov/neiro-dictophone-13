import { formatTranscript } from "./format-transcript";

const INDENT = "\u00A0\u00A0\u00A0\u00A0";

describe("formatTranscript", () => {
  // --- Basic punctuation replacement ---

  test("replaces точка with period and capitalizes next word", () => {
    expect(formatTranscript("привет точка как дела")).toBe("Привет. Как дела");
  });

  test("replaces запятая with comma", () => {
    expect(formatTranscript("привет запятая как дела")).toBe("Привет, как дела");
  });

  test("replaces вопросительный знак with ?", () => {
    expect(formatTranscript("как дела вопросительный знак")).toBe(
      "Как дела?"
    );
  });

  test("replaces восклицательный знак with !", () => {
    expect(formatTranscript("привет восклицательный знак")).toBe("Привет!");
  });

  test("replaces двоеточие with :", () => {
    expect(formatTranscript("ответ двоеточие да")).toBe("Ответ: да");
  });

  test("replaces тире with em-dash surrounded by spaces", () => {
    expect(formatTranscript("я тире студент")).toBe("Я — студент");
  });

  test("replaces троеточие with ...", () => {
    expect(formatTranscript("не знаю троеточие")).toBe("Не знаю...");
  });

  // --- Full example from requirements ---

  test("full example from requirements", () => {
    const input =
      "привет запятая как дела вопросительный знак абзац все хорошо точка";
    const expected = `Привет, как дела?\n\n${INDENT}Все хорошо.`;
    expect(formatTranscript(input)).toBe(expected);
  });

  // --- Paragraph handling ---

  test("абзац creates new paragraph with indent", () => {
    const result = formatTranscript("первый абзац второй");
    expect(result).toBe(`Первый\n\n${INDENT}Второй`);
  });

  test("multiple paragraphs", () => {
    const result = formatTranscript("один абзац два абзац три");
    expect(result).toBe(`Один\n\n${INDENT}Два\n\n${INDENT}Три`);
  });

  // --- Capitalization ---

  test("capitalizes first word of transcript", () => {
    expect(formatTranscript("привет")).toBe("Привет");
  });

  test("capitalizes word after period", () => {
    expect(formatTranscript("раз точка два")).toBe("Раз. Два");
  });

  test("capitalizes word after ! and ?", () => {
    expect(
      formatTranscript(
        "правда вопросительный знак да восклицательный знак конечно"
      )
    ).toBe("Правда? Да! Конечно");
  });

  test("does not capitalize after comma", () => {
    expect(formatTranscript("один запятая два")).toBe("Один, два");
  });

  test("does not capitalize after colon", () => {
    expect(formatTranscript("пример двоеточие вот")).toBe("Пример: вот");
  });

  // --- Spacing ---

  test("no space before punctuation", () => {
    const result = formatTranscript("слово точка");
    expect(result).not.toMatch(/ \./);
  });

  test("single space after punctuation", () => {
    const result = formatTranscript("один точка два точка три");
    expect(result).toBe("Один. Два. Три");
    expect(result).not.toMatch(/\. {2}/);
  });

  test("trailing space is removed", () => {
    expect(formatTranscript("привет запятая")).toBe("Привет,");
  });

  // --- Quotes ---

  test("кавычки wraps text in «»", () => {
    expect(formatTranscript("книга кавычки война и мир кавычки")).toBe(
      "Книга «война и мир»"
    );
  });

  test("multiple quote pairs", () => {
    expect(
      formatTranscript(
        "кавычки привет кавычки и кавычки пока кавычки"
      )
    ).toBe("«Привет» и «пока»");
  });

  // --- Edge cases ---

  test("empty string returns empty string", () => {
    expect(formatTranscript("")).toBe("");
  });

  test("whitespace-only string returns empty string", () => {
    expect(formatTranscript("   ")).toBe("");
  });

  test("repeated punctuation words", () => {
    expect(formatTranscript("стоп точка точка точка")).toBe("Стоп...");
    // three consecutive periods become "." "." "." — each is a separate sentence ender
    // actual output: "Стоп. . ." — let's verify what really happens
  });

  test("абзац at start is ignored (empty first paragraph)", () => {
    const result = formatTranscript("абзац привет");
    // No empty first paragraph
    expect(result).toBe(`${INDENT}Привет`);
  });
});
