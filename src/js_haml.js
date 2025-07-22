class JSHaml {
  constructor() {
    this.indentSize = 2;
  }

  parse(template) {
    const lines = template.split('\n');
    const ast = [];
    const stack = [{ children: ast, indent: -1 }];

    lines.forEach((line, index) => {
      if (!line.trim()) return; // Skip empty lines
      
      const indent = this.getIndent(line);
      const trimmed = line.trim();
      
      // Pop stack items until we find the parent
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      const node = this.parseLine(trimmed);
      
      if (node) {
        node.indent = indent;
        parent.children.push(node);
        
        if (node.type === 'element' || node.type === 'if' || node.type === 'else' || node.type === 'else-if') {
          stack.push({ children: node.children || [], indent, node });
        }
      }
    });

    return ast;
  }

  getIndent(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
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
      }
      
      return { type: 'js', code: jsCode };
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
      
      // Parse attributes and find where content starts
      const { attributes, contentStartIndex } = this.parseElementAttributes(remainingLine);
      
      // Add classes and id to attributes
      if (classes.length > 0) {
        attributes.class = classes.join(' ');
      }
      if (id) {
        attributes.id = id;
      }
      
      const node = { type: 'element', tag, attributes, children: [] };
      
      // Check for inline content
      if (contentStartIndex !== -1) {
        const content = remainingLine.substring(contentStartIndex).trim();
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
          // Text content
          node.children = [{ type: 'text', value: content }];
        }
      }
      
      return node;
    }

    // Handle standalone expression
    if (line.startsWith('= ')) {
      return { type: 'expression', value: line.substring(2).trim() };
    }

    // Handle text
    return { type: 'text', value: line };
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
              html += evalExpression(node.value, ctx);
              break;
            case 'js':
              evalExpression(node.code, ctx);
              break;
            case 'if':
              if (evalExpression(node.condition, ctx)) {
                html += render(node.children, ctx);
              }
              break;
            case 'else':
              // This is handled by the previous if
              break;
            case 'if-chain':
              // Handle if-chain nodes
              for (const cond of node.conditions) {
                if (evalExpression(cond.condition, ctx)) {
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
            const result = evalExpression(value.value, ctx);
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

      const evalExpression = (expr, ctx) => {
        try {
          // Create a function that has access to context properties
          const keys = Object.keys(ctx);
          const values = keys.map(k => ctx[k]);
          const func = new Function(...keys, `return ${expr}`);
          return func(...values);
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
}

module.exports = JSHaml;