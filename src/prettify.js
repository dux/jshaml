// HTML Prettifier - Enhanced version with better formatting
class HTMLPrettifier {
  constructor(options = {}) {
    this.indentSize = options.indentSize || 2;
    this.indentChar = options.indentChar || ' ';
    this.maxLineLength = options.maxLineLength || 120;

    // HTML void elements that don't have closing tags
    this.voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);

    // Inline elements that should stay on the same line with their content
    this.inlineElements = new Set([
      'a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'button', 'cite', 'code',
      'dfn', 'em', 'i', 'kbd', 'label', 'map', 'object', 'q', 'samp',
      'script', 'select', 'small', 'span', 'strong', 'sub', 'sup',
      'textarea', 'tt', 'var'
    ]);
  }

  prettify(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Clean up the HTML first
    html = html.trim();

    // Tokenize the HTML
    const tokens = this.tokenize(html);

    // Format the tokens
    return this.formatTokens(tokens);
  }

  tokenize(html) {
    const tokens = [];
    const regex = /<\/?[^>]+>|[^<]+/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const token = match[0].trim();
      if (token) {
        if (token.startsWith('<')) {
          tokens.push(this.parseTag(token));
        } else {
          tokens.push({
            type: 'text',
            content: token
          });
        }
      }
    }

    return tokens;
  }

  parseTag(tagString) {
    if (tagString.startsWith('</')) {
      // Closing tag
      const tagName = tagString.match(/<\/([^>\s]+)/)?.[1]?.toLowerCase();
      return {
        type: 'closing',
        tagName,
        content: tagString
      };
    } else if (tagString.endsWith('/>')) {
      // Self-closing tag
      const tagName = tagString.match(/<([^>\s\/]+)/)?.[1]?.toLowerCase();
      return {
        type: 'self-closing',
        tagName,
        content: tagString
      };
    } else {
      // Opening tag
      const tagName = tagString.match(/<([^>\s]+)/)?.[1]?.toLowerCase();
      const isVoid = this.voidElements.has(tagName);
      return {
        type: isVoid ? 'void' : 'opening',
        tagName,
        content: tagString,
        isInline: this.inlineElements.has(tagName)
      };
    }
  }

  formatTokens(tokens) {
    let result = '';
    let indentLevel = 0;
    let previousToken = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1] || null;

      switch (token.type) {
        case 'opening':
          // Add indent for opening tags
          if (previousToken && previousToken.type !== 'text') {
            result += '\n' + this.getIndent(indentLevel);
          } else if (!previousToken) {
            result += this.getIndent(indentLevel);
          }

          result += token.content;

          // Check if next token is text and this is an inline element
          if (token.isInline && nextToken && nextToken.type === 'text') {
            // Keep inline elements with their text content on the same line
          } else if (nextToken && nextToken.type !== 'text') {
            result += '\n';
          }

          indentLevel++;
          break;

        case 'closing':
          indentLevel = Math.max(0, indentLevel - 1);

          // If previous was text, don't add indent
          if (previousToken && previousToken.type === 'text') {
            result += token.content;
          } else {
            result += this.getIndent(indentLevel) + token.content;
          }

          // Add newline unless this is the last token
          if (nextToken) {
            result += '\n';
          }
          break;

        case 'void':
        case 'self-closing':
          if (previousToken && previousToken.type !== 'text') {
            result += '\n' + this.getIndent(indentLevel);
          } else if (!previousToken) {
            result += this.getIndent(indentLevel);
          }

          result += token.content;

          if (nextToken) {
            result += '\n';
          }
          break;

        case 'text':
          // Only add text if it's not just whitespace, unless it's significant whitespace
          const trimmedContent = token.content.trim();
          if (trimmedContent) {
            result += trimmedContent;
          }
          break;
      }

      previousToken = token;
    }

    // Remove blank lines and return
    return result.trim().replace(/\n\s*\n/g, '\n');
  }

  getIndent(level) {
    return this.indentChar.repeat(level * this.indentSize);
  }
}

// Create a simple prettify function for easy use
function prettifyHtml(html, options = {}) {
  const prettifier = new HTMLPrettifier(options);
  return prettifier.prettify(html);
}

export default prettifyHtml;
