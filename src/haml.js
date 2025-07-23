
class JSHaml {
  constructor() {
    this.indentSize = 2;
  }

  // HTML escape function
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Parse text that may contain {{ expressions }}
  parseTextWithExpressions(text) {
    const nodes = [];
    let lastIndex = 0;
    const regex = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the expression
      if (match.index > lastIndex) {
        nodes.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }

      // Add the expression
      const expr = match[1].trim();
      nodes.push({ type: 'expression', value: expr });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      nodes.push({ type: 'text', value: text.substring(lastIndex) });
    }

    // If no expressions found, return original text node
    if (nodes.length === 0) {
      return [{ type: 'text', value: text }];
    }

    return nodes;
  }

  parse(template) {
    const lines = template.split('\n');
    const ast = [];
    const stack = [{ children: ast, indent: -1 }];

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line.trim()) continue; // Skip empty lines

      const indent = this.getIndent(line);
      const trimmed = line.trim();

      // Pop stack items until we find the parent
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      // Check if this looks like a multi-line attribute for the parent element
      if (this.isMultiLineAttribute(trimmed) && stack.length > 1) {
        const parentElement = stack[stack.length - 1].node;
        if (parentElement && parentElement.type === 'element' && indent > parentElement.indent) {
          // This is a multi-line attribute, collect all consecutive attribute lines
          const attributeLines = [];
          let currentIndex = index;

          while (currentIndex < lines.length) {
            const attrLine = lines[currentIndex];
            if (!attrLine.trim()) {
              currentIndex++;
              continue;
            }

            const attrIndent = this.getIndent(attrLine);
            const attrTrimmed = attrLine.trim();

            if (attrIndent === indent && this.isMultiLineAttribute(attrTrimmed)) {
              attributeLines.push(attrTrimmed);
              currentIndex++;
            } else {
              break;
            }
          }

          // Parse and merge these attributes into the parent element
          this.mergeMultiLineAttributes(parentElement, attributeLines);

          // Skip the processed lines
          index = currentIndex - 1;
          continue;
        }
      }

      const node = this.parseLine(trimmed);

      if (node) {
        node.indent = indent;
        parent.children.push(node);

        if (node.type === 'element' || node.type === 'if' || node.type === 'else' || node.type === 'else-if' || node.type === 'for') {
          stack.push({ children: node.children || [], indent, node });
        }
      }
    }

    return ast;
  }

  getIndent(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  isMultiLineAttribute(line) {
    // Check if line matches attribute pattern: word="value" or word={{ expression }} (no spaces before =)
    return /^\w+=((".+"|'.+'|\{\{.+\}\}))$/.test(line);
  }

  mergeMultiLineAttributes(elementNode, attributeLines) {
    // Parse each attribute line and merge into the element's attributes
    for (const attrLine of attributeLines) {
      const attrMatch = attrLine.match(/^(\w+)=(.+)$/);
      if (attrMatch) {
        const key = attrMatch[1];
        let value = attrMatch[2].trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
          elementNode.attributes[key] = value;
        } else if (value.startsWith('{{') && value.endsWith('}}')) {
          // Handle {{ expression }} format
          const expr = value.substring(2, value.length - 2).trim();
          elementNode.attributes[key] = { type: 'expression', value: expr };
        } else {
          elementNode.attributes[key] = value;
        }
      }
    }
  }

  parseLine(line) {
    // Handle escaped -
    if (line.startsWith('\\-')) {
      return { type: 'text', value: line.substring(1) };
    }

    // Handle JS execution (returns '')
    if (line.startsWith('- ')) {
      const jsCode = line.substring(2).trim();

      if (jsCode.startsWith('if ')) {
        const condition = jsCode.substring(3);
        return { type: 'if', condition, children: [] };
      } else if (jsCode === 'else') {
        return { type: 'else', children: [] };
      } else if (jsCode.startsWith('else if ')) {
        const condition = jsCode.substring(8);
        return { type: 'else-if', condition, children: [] };
      } else if (jsCode.startsWith('elsif ')) {
        const condition = jsCode.substring(6);
        return { type: 'else-if', condition, children: [] };
      } else if (jsCode.startsWith('for ')) {
        // Parse for loop: "for el in [1,2,3,4]" or "for el, index in [1,2,3,4]"
        const forMatch = jsCode.match(/^for\s+(\w+)(?:\s*,\s*(\w+))?\s+in\s+(.+)$/);
        if (forMatch) {
          return {
            type: 'for',
            variable: forMatch[1],
            indexVariable: forMatch[2] || null,
            expression: forMatch[3],
            children: []
          };
        }
      }

      return { type: 'js', code: jsCode };
    }

    // Handle div shorthand (.class or #id)
    if (line.startsWith('.') || line.startsWith('#')) {
      // Convert .class or #id to %div.class or %div#id
      const divMatch = line.match(/^([\.\#][\w\.\#\-]*)/);
      if (divMatch) {
        const tag = 'div';
        const classAndId = divMatch[1];
        let remainingLine = line.substring(divMatch[0].length);

        // Parse classes and id from the shorthand
        const classes = [];
        let id = null;

        const parts = classAndId.match(/[\.\#][\w\-]+/g) || [];
        for (const part of parts) {
          if (part.startsWith('.')) {
            classes.push(part.substring(1));
          } else if (part.startsWith('#')) {
            id = part.substring(1);
          }
        }

        return this.parseElementWithClassesAndId(tag, classes, id, remainingLine);
      }
    }

    // Handle element
    if (line.startsWith('%')) {
      // Extract tag name and classes/id
      const tagMatch = line.match(/^%(\w+)([\.\#][\w\.\#\-]*)?/);
      if (!tagMatch) return null;

      const tag = tagMatch[1];
      const classAndId = tagMatch[2] || '';
      let remainingLine = line.substring(tagMatch[0].length);

      // Parse classes and id from the tag
      const classes = [];
      let id = null;

      if (classAndId) {
        const parts = classAndId.match(/[\.\#][\w\-]+/g) || [];
        for (const part of parts) {
          if (part.startsWith('.')) {
            classes.push(part.substring(1));
          } else if (part.startsWith('#')) {
            id = part.substring(1);
          }
        }
      }

      return this.parseElementWithClassesAndId(tag, classes, id, remainingLine);
    }

    // Handle standalone expression
    if (line.startsWith('= ')) {
      return { type: 'expression', value: line.substring(2).trim(), source: 'equals' };
    }

    // Handle text - check for embedded expressions
    const textNodes = this.parseTextWithExpressions(line);
    if (textNodes.length === 1) {
      return textNodes[0];
    }
    // Return a container node for multiple nodes
    return { type: 'fragment', children: textNodes };
  }

  parseElementWithClassesAndId(tag, classes, id, remainingLine) {
    // First check for curly brace attributes { attr: "value" }
    let curlyAttributes = {};
    let afterCurlyIndex = 0;

    // Find matching closing brace, accounting for nested braces
    const trimmedLine = remainingLine.trim();
    if (trimmedLine.startsWith('{')) {
      let braceCount = 0;
      let endIndex = -1;

      for (let i = 0; i < trimmedLine.length; i++) {
        if (trimmedLine[i] === '{') braceCount++;
        if (trimmedLine[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex !== -1) {
        const attrString = trimmedLine.substring(1, endIndex).trim();
        afterCurlyIndex = remainingLine.indexOf('{') + endIndex + 1;

        // Smart split on commas (not inside braces or backticks)
        const attrPairs = [];
        let currentPair = '';
        let braceDepth = 0;
        let inBackticks = false;

        for (let i = 0; i < attrString.length; i++) {
          const char = attrString[i];
          if (char === '`') {
            inBackticks = !inBackticks;
          } else if (!inBackticks) {
            if (char === '{') braceDepth++;
            else if (char === '}') braceDepth--;
          }

          if (char === ',' && braceDepth === 0 && !inBackticks) {
            attrPairs.push(currentPair.trim());
            currentPair = '';
          } else {
            currentPair += char;
          }
        }

        if (currentPair.trim()) {
          attrPairs.push(currentPair.trim());
        }

        for (const pair of attrPairs) {
          // Find the first colon or equals that's not inside braces or backticks
          let separatorIndex = -1;
          let pairBraceDepth = 0;
          let pairInBackticks = false;

          for (let i = 0; i < pair.length; i++) {
            const char = pair[i];
            if (char === '`') {
              pairInBackticks = !pairInBackticks;
            } else if (!pairInBackticks) {
              if (char === '{') pairBraceDepth++;
              else if (char === '}') pairBraceDepth--;
              else if ((char === ':' || char === '=') && pairBraceDepth === 0 && separatorIndex === -1) {
                separatorIndex = i;
                break;
              }
            }
          }

          if (separatorIndex !== -1) {
            const key = pair.substring(0, separatorIndex).trim();
            let value = pair.substring(separatorIndex + 1).trim();

            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }

            // Check if value contains {{ }} expressions
            if (value.includes('{{') && value.includes('}}')) {
              // Check if entire value is a single {{ expression }}
              if (value.startsWith('{{') && value.endsWith('}}')) {
                // Extract everything between the outer {{ and }}
                const expr = value.substring(2, value.length - 2).trim();
                curlyAttributes[key] = { type: 'expression', value: expr };
              } else {
                // Complex case: string with embedded {{ }} expressions
                const processedValue = value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expr) => {
                  return `" + (${expr}) + "`;
                });
                curlyAttributes[key] = { type: 'expression', value: `"${processedValue}"` };
              }
            } else {
              curlyAttributes[key] = value;
            }
          }
        }
      }
    }

    // Parse regular attributes and find where content starts
    const remainingAfterCurly = remainingLine.substring(afterCurlyIndex);
    const { attributes, contentStartIndex } = this.parseElementAttributes(remainingAfterCurly);

    // Add classes and id to attributes first
    if (classes.length > 0) {
      attributes.class = classes.join(' ');
    }
    if (id) {
      attributes.id = id;
    }

    // Merge curly attributes, handling class specially
    for (const [key, value] of Object.entries(curlyAttributes)) {
      if (key === 'class' && attributes.class) {
        // Special handling for class: need to merge both static and dynamic classes
        if (typeof value === 'object' && value.type === 'expression') {
          // Create an expression that combines static classes with dynamic ones
          attributes.class = {
            type: 'expression',
            value: `"${attributes.class}" + ((${value.value}) ? " " + (${value.value}) : "")`
          };
        } else {
          // Simple string value, just concatenate
          attributes.class = `${attributes.class} ${value}`;
        }
      } else {
        attributes[key] = value;
      }
    }

    const node = { type: 'element', tag, attributes, children: [] };

    // Check for inline content
    if (contentStartIndex !== -1) {
      const content = remainingAfterCurly.substring(contentStartIndex).trim();
      if (content.startsWith('= ')) {
        // Expression content
        node.children = [{ type: 'expression', value: content.substring(2).trim() }];
      } else if (content === '=') {
        // Empty expression
        node.children = [];
      } else if (content.startsWith('=')) {
        // Expression without space
        node.children = [{ type: 'expression', value: content.substring(1).trim() }];
      } else if (content) {
        // Text content - check for embedded expressions
        node.children = this.parseTextWithExpressions(content);
      }
    }

    return node;
  }

  parseElementAttributes(str) {
    const attributes = {};
    let contentStartIndex = -1;
    let currentIndex = 0;

    // Skip leading whitespace
    while (currentIndex < str.length && /\s/.test(str[currentIndex])) {
      currentIndex++;
    }

    // Parse attributes until we hit content or end of string
    while (currentIndex < str.length) {
      // Check if we've hit content (text that's not an attribute)
      if (!this.looksLikeAttribute(str.substring(currentIndex))) {
        // Check for = which indicates expression content
        const remainingTrimmed = str.substring(currentIndex).trim();
        if (remainingTrimmed.startsWith('=') ||
            (remainingTrimmed && !remainingTrimmed.includes('=') && !remainingTrimmed.includes('{'))) {
          contentStartIndex = currentIndex;
          break;
        }
      }

      // Try to parse an attribute
      const attrResult = this.parseNextAttribute(str, currentIndex);
      if (attrResult) {
        attributes[attrResult.name] = attrResult.value;
        currentIndex = attrResult.endIndex;
      } else {
        // No more attributes, rest might be content
        const remaining = str.substring(currentIndex).trim();
        if (remaining) {
          contentStartIndex = currentIndex;
        }
        break;
      }

      // Skip whitespace between attributes
      while (currentIndex < str.length && /\s/.test(str[currentIndex])) {
        currentIndex++;
      }
    }

    return { attributes, contentStartIndex };
  }

  looksLikeAttribute(str) {
    return /^(\w+)=/.test(str) || /^(\w+)={{/.test(str);
  }

  parseNextAttribute(str, startIndex) {
    // Try to match attribute pattern
    const normalAttrMatch = str.substring(startIndex).match(/^(\w+)="([^"]*)"/);
    if (normalAttrMatch) {
      return {
        name: normalAttrMatch[1],
        value: normalAttrMatch[2],
        endIndex: startIndex + normalAttrMatch[0].length
      };
    }

    // Try to match expression attribute
    const exprAttrMatch = str.substring(startIndex).match(/^(\w+)={{([^}]+)}}/);
    if (exprAttrMatch) {
      return {
        name: exprAttrMatch[1],
        value: { type: 'expression', value: exprAttrMatch[2].trim() },
        endIndex: startIndex + exprAttrMatch[0].length
      };
    }

    return null;
  }

  compile(template) {
    const ast = this.parse(template);
    const self = this;

    return function(context) {
      const render = (nodes, ctx) => {
        let html = '';

        for (const node of nodes) {
          switch (node.type) {
            case 'element':
              html += renderElement(node, ctx);
              break;
            case 'text':
              html += node.value;
              break;
            case 'expression':
              // Check if this is a raw expression
              if (node.value.startsWith('raw ')) {
                html += evalExpression(node.value.substring(4).trim(), ctx, false);
              } else {
                html += evalExpression(node.value, ctx);
              }
              break;
            case 'js':
              evalExpression(node.code, ctx);
              break;
            case 'if':
              if (evalExpression(node.condition, ctx, false)) {
                html += render(node.children, ctx);
              }
              break;
            case 'else':
              // This is handled by the previous if
              break;
            case 'for':
              // Handle for loop
              const items = evalExpression(node.expression, ctx, false);
              if (Array.isArray(items)) {
                for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  const newContext = { ...ctx, [node.variable]: item };
                  if (node.indexVariable) {
                    newContext[node.indexVariable] = i;
                  }
                  html += render(node.children, newContext);
                }
              }
              break;
            case 'fragment':
              // Handle fragment (multiple nodes from text with expressions)
              html += render(node.children, ctx);
              break;
            case 'if-chain':
              // Handle if-chain nodes
              for (const cond of node.conditions) {
                if (evalExpression(cond.condition, ctx, false)) {
                  html += render(cond.children, ctx);
                  break;
                }
              }
              break;
          }
        }

        return html;
      };

      const renderElement = (node, ctx) => {
        let html = `<${node.tag}`;

        // Render attributes
        for (const [key, value] of Object.entries(node.attributes)) {
          if (typeof value === 'object' && value.type === 'expression') {
            // Check if this is a raw expression
            const isRaw = value.value.startsWith('raw ');
            const exprValue = isRaw ? value.value.substring(4).trim() : value.value;
            const result = evalExpression(exprValue, ctx, !isRaw);
            if (result !== false && result !== null && result !== undefined) {
              html += ` ${key}`;
              if (result !== true) {
                html += `="${result}"`;
              }
            }
          } else {
            html += ` ${key}="${value}"`;
          }
        }

        html += '>';

        if (node.children) {
          html += render(node.children, ctx);
        }

        html += `</${node.tag}>`;

        return html;
      };

      const evalExpression = (expr, ctx, escapeOutput = true) => {
        try {
          // Use 'with' to make context properties available directly
          const func = new Function('context', `with (context) { return ${expr} }`);
          const result = func(ctx);

          // Skip escaping for boolean values used in conditionals
          if (typeof result === 'boolean') return result;

          // Apply HTML escaping by default, unless escapeOutput is false
          if (escapeOutput) {
            return self.escapeHtml(result);
          }
          return result;
        } catch (e) {
          return '';
        }
      };

      // Process if-else chains at all levels
      const processIfChains = (nodes) => {
        const processed = [];
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];

          if (node.type === 'if') {
            const ifChain = { type: 'if-chain', conditions: [] };
            ifChain.conditions.push({
              condition: node.condition,
              children: processIfChains(node.children) // Recursively process children
            });

            // Look for else/else-if at the same level
            let j = i + 1;
            while (j < nodes.length && (nodes[j].type === 'else' || nodes[j].type === 'else-if')) {
              if (nodes[j].type === 'else') {
                ifChain.conditions.push({
                  condition: 'true',
                  children: processIfChains(nodes[j].children)
                });
                j++;
                break;
              } else if (nodes[j].type === 'else-if') {
                ifChain.conditions.push({
                  condition: nodes[j].condition,
                  children: processIfChains(nodes[j].children)
                });
              }
              j++;
            }

            processed.push(ifChain);
            i = j - 1;
          } else if (node.type === 'for') {
            // Process children of for loops too
            processed.push({
              ...node,
              children: processIfChains(node.children)
            });
          } else if (node.type === 'element' && node.children) {
            // Process children of elements too
            processed.push({
              ...node,
              children: processIfChains(node.children)
            });
          } else {
            processed.push(node);
          }
        }
        return processed;
      };

      const processedAst = processIfChains(ast);

      // Custom render for if-chains
      const renderWithIfChains = (nodes, ctx) => {
        let html = '';

        for (const node of nodes) {
          if (node.type === 'if-chain') {
            for (const cond of node.conditions) {
              if (evalExpression(cond.condition, ctx)) {
                html += render(cond.children, ctx);
                break;
              }
            }
          } else {
            html += render([node], ctx);
          }
        }

        return html;
      };

      return renderWithIfChains(processedAst, context);
    };
  }

  // Generate minimal JavaScript function from AST
  generateMinimalFunction(template) {
    const ast = this.parse(template);

    // Process if-else chains first
    const processedAst = this.processIfChainsForGeneration(ast);

    // Generate the function body
    const functionBody = this.generateCode(processedAst);

    // Include the escape function inline
    const escapeFunc = `function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }`;

    // Return the minimal function as a string
    return `function(context) {
  ${escapeFunc}
  with (context) {
    return ${functionBody};
  }
}`;
  }

  processIfChainsForGeneration(nodes) {
    const processed = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.type === 'if') {
        const ifChain = { type: 'if-chain', conditions: [] };
        ifChain.conditions.push({
          condition: node.condition,
          children: this.processIfChainsForGeneration(node.children)
        });

        // Look for else/else-if at the same level
        let j = i + 1;
        while (j < nodes.length && (nodes[j].type === 'else' || nodes[j].type === 'else-if')) {
          if (nodes[j].type === 'else') {
            ifChain.conditions.push({
              condition: 'true',
              children: this.processIfChainsForGeneration(nodes[j].children)
            });
            j++;
            break;
          } else if (nodes[j].type === 'else-if') {
            ifChain.conditions.push({
              condition: nodes[j].condition,
              children: this.processIfChainsForGeneration(nodes[j].children)
            });
          }
          j++;
        }

        processed.push(ifChain);
        i = j - 1;
      } else if (node.type === 'for') {
        processed.push({
          ...node,
          children: this.processIfChainsForGeneration(node.children)
        });
      } else if (node.type === 'element' && node.children) {
        processed.push({
          ...node,
          children: this.processIfChainsForGeneration(node.children)
        });
      } else {
        processed.push(node);
      }
    }
    return processed;
  }

  generateCode(nodes) {
    if (nodes.length === 0) return '""';
    if (nodes.length === 1) return this.generateNodeCode(nodes[0]);

    // Concatenate multiple nodes
    return nodes.map(node => this.generateNodeCode(node)).join(' + ');
  }

  generateNodeCode(node) {
    switch (node.type) {
      case 'element':
        return this.generateElementCode(node);
      case 'text':
        return JSON.stringify(node.value);
      case 'expression':
        // Check if this is a raw expression
        if (node.value.startsWith('raw ')) {
          return `(${node.value.substring(4).trim()})`;
        } else {
          return `escapeHtml(${node.value})`;
        }
      case 'js':
        // JS code that doesn't return anything
        return `(function() { ${node.code}; return ""; })()`;
      case 'if-chain':
        return this.generateIfChainCode(node);
      case 'for':
        return this.generateForCode(node);
      case 'fragment':
        return this.generateCode(node.children);
      default:
        return '""';
    }
  }

  generateElementCode(node) {
    let code = `"<${node.tag}"`;

    // Generate attributes
    for (const [key, value] of Object.entries(node.attributes)) {
      if (typeof value === 'object' && value.type === 'expression') {
        // Dynamic attribute
        const isRaw = value.value.startsWith('raw ');
        const exprValue = isRaw ? value.value.substring(4).trim() : value.value;
        code += ` + (function() {
          var val = ${exprValue};
          if (val === false || val === null || val === undefined) return "";
          if (val === true) return " ${key}";
          return " ${key}=\\"" + ${isRaw ? 'val' : 'escapeHtml(val)'} + "\\"";
        })()`;
      } else {
        // Static attribute
        code += ` + " ${key}=\\"${value}\\""`;
      }
    }

    code += ` + ">"`;

    // Generate children
    if (node.children && node.children.length > 0) {
      code += ` + ${this.generateCode(node.children)}`;
    }

    code += ` + "</${node.tag}>"`;

    return `(${code})`;
  }

  generateIfChainCode(node) {
    let code = '(';

    for (let i = 0; i < node.conditions.length; i++) {
      const cond = node.conditions[i];

      if (i === 0) {
        code += `${cond.condition} ? ${this.generateCode(cond.children)} : `;
      } else if (cond.condition === 'true') {
        // else case
        code += this.generateCode(cond.children);
      } else {
        // else if case
        code += `${cond.condition} ? ${this.generateCode(cond.children)} : `;
      }
    }

    // If no else clause, add empty string
    if (node.conditions[node.conditions.length - 1].condition !== 'true') {
      code += '""';
    }

    code += ')';
    return code;
  }

  generateForCode(node) {
    if (node.indexVariable) {
      return `(function() {
        var result = "";
        var items = ${node.expression};
        if (Array.isArray(items)) {
          for (var i = 0; i < items.length; i++) {
            var ${node.variable} = items[i];
            var ${node.indexVariable} = i;
            result += ${this.generateCode(node.children)};
          }
        }
        return result;
      })()`;
    } else {
      return `(function() {
        var result = "";
        var items = ${node.expression};
        if (Array.isArray(items)) {
          for (var ${node.variable} of items) {
            result += ${this.generateCode(node.children)};
          }
        }
        return result;
      })()`;
    }
  }
}

// ES6 exports
export default JSHaml;
