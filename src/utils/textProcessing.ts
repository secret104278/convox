// Utility function to match Japanese text with hiragana readings
export function matchTextWithReadings(text: string, hiragana: string): string {
  const result: string[] = [];
  let textPos = 0;
  let hiraganaPos = 0;

  while (textPos < text.length && hiraganaPos < hiragana.length) {
    // If characters are the same, no ruby needed
    if (text[textPos] === hiragana[hiraganaPos]) {
      const char = text[textPos];
      if (char) result.push(char);
      textPos++;
      hiraganaPos++;
      continue;
    }

    // Look ahead to find the next matching position
    let lookAhead = 1;
    let found = false;
    let matchLength = 0;

    while (textPos + lookAhead <= text.length && !found) {
      let hiraganaLength = 0;

      // Find how many hiragana characters correspond to this text part
      for (let i = hiraganaPos; i < hiragana.length; i++) {
        hiraganaLength++;
        if (text[textPos + lookAhead] === hiragana[i + 1]) {
          found = true;
          break;
        }
      }

      if (found || textPos + lookAhead === text.length) {
        matchLength = hiraganaLength;
        break;
      }
      lookAhead++;
    }

    // Create ruby tag for the matched section
    const textPart = text.slice(textPos, textPos + lookAhead);
    const readingPart = hiragana.slice(hiraganaPos, hiraganaPos + matchLength);
    result.push(`<ruby>${textPart}<rt>${readingPart}</rt></ruby>`);

    textPos += lookAhead;
    hiraganaPos += matchLength;
  }

  // Add any remaining characters
  while (textPos < text.length) {
    const char = text[textPos];
    if (char) result.push(char);
    textPos++;
  }

  return result.join("");
}
