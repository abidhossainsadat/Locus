/**
 * Mathematical Expression Parser
 * Implements a Pratt Parser for robust expression parsing
 */

class Parser {
    constructor() {
        this.functions = {
            'sin': Math.sin,
            'cos': Math.cos,
            'tan': Math.tan,
            'asin': Math.asin,
            'acos': Math.acos,
            'atan': Math.atan,
            'sinh': Math.sinh,
            'cosh': Math.cosh,
            'tanh': Math.tanh,
            'log': Math.log10,
            'ln': Math.log,
            'exp': Math.exp,
            'sqrt': Math.sqrt,
            'abs': Math.abs,
            'floor': Math.floor,
            'ceil': Math.ceil,
            'round': Math.round,
            'sign': Math.sign,
            'min': Math.min,
            'max': Math.max
        };
        
        this.constants = {
            'pi': Math.PI,
            'e': Math.E,
            'phi': (1 + Math.sqrt(5)) / 2
        };
    }

    /**
     * Tokenize the input string
     */
    tokenize(expr) {
        const tokens = [];
        let i = 0;
        const str = expr.replace(/\s+/g, '');
        
        while (i < str.length) {
            const char = str[i];
            
            // Numbers (including decimals and scientific notation)
            if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(str[i + 1]))) {
                let num = '';
                while (i < str.length && /[0-9.eE+-]/.test(str[i])) {
                    // Handle scientific notation
                    if ((str[i] === 'e' || str[i] === 'E') && i + 1 < str.length) {
                        if (/[0-9]/.test(str[i - 1]) && (/[0-9]/.test(str[i + 1]) || 
                            ((str[i + 1] === '+' || str[i + 1] === '-') && /[0-9]/.test(str[i + 2])))) {
                            num += str[i++];
                            continue;
                        }
                    }
                    if (str[i] === '+' || str[i] === '-') {
                        if (num.includes('e') || num.includes('E')) {
                            num += str[i++];
                            continue;
                        }
                    }
                    if (str[i] === '.' && num.includes('.')) break;
                    num += str[i++];
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(num) });
            }
            // Identifiers (functions, variables, constants)
            else if (/[a-zA-Z_]/.test(char)) {
                let id = '';
                while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
                    id += str[i++];
                }
                if (this.functions[id.toLowerCase()]) {
                    tokens.push({ type: 'FUNCTION', value: id.toLowerCase() });
                } else if (this.constants[id.toLowerCase()]) {
                    tokens.push({ type: 'CONSTANT', value: this.constants[id.toLowerCase()] });
                } else {
                    tokens.push({ type: 'VARIABLE', value: id });
                }
            }
            // Operators
            else if ('+-*/^'.includes(char)) {
                tokens.push({ type: 'OPERATOR', value: char });
                i++;
            }
            // Parentheses
            else if (char === '(') {
                tokens.push({ type: 'LPAREN', value: '(' });
                i++;
            }
            else if (char === ')') {
                tokens.push({ type: 'RPAREN', value: ')' });
                i++;
            }
            // Comma (for multi-argument functions)
            else if (char === ',') {
                tokens.push({ type: 'COMMA', value: ',' });
                i++;
            }
            else {
                throw new Error(`Unexpected character: ${char}`);
            }
        }
        
        return tokens;
    }

    /**
     * Parse tokens into an AST using Pratt Parser
     */
    parse(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        
        const ast = this.parseExpression();
        
        if (this.pos < this.tokens.length) {
            throw new Error(`Unexpected token: ${this.tokens[this.pos].value}`);
        }
        
        return ast;
    }

    parseExpression() {
        return this.parseAdditive();
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        
        while (this.peek() && this.peek().type === 'OPERATOR' && 
               (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.consume().value;
            const right = this.parseMultiplicative();
            left = { type: 'BINARY_OP', operator: op, left, right };
        }
        
        return left;
    }

    parseMultiplicative() {
        let left = this.parsePower();
        
        while (this.peek() && this.peek().type === 'OPERATOR' && 
               (this.peek().value === '*' || this.peek().value === '/')) {
            const op = this.consume().value;
            const right = this.parsePower();
            left = { type: 'BINARY_OP', operator: op, left, right };
        }
        
        return left;
    }

    parsePower() {
        let left = this.parseUnary();
        
        while (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '^') {
            const op = this.consume().value;
            const right = this.parseUnary();
            left = { type: 'BINARY_OP', operator: op, left, right };
        }
        
        return left;
    }

    parseUnary() {
        if (this.peek() && this.peek().type === 'OPERATOR' && 
            (this.peek().value === '-' || this.peek().value === '+')) {
            const op = this.consume().value;
            const operand = this.parseUnary();
            if (op === '-') {
                return { type: 'UNARY_OP', operator: '-', operand };
            }
            return operand;
        }
        return this.parsePrimary();
    }

    parsePrimary() {
        const token = this.peek();
        
        if (!token) {
            throw new Error('Unexpected end of expression');
        }
        
        switch (token.type) {
            case 'NUMBER':
                this.consume();
                return { type: 'NUMBER', value: token.value };
                
            case 'CONSTANT':
                this.consume();
                return { type: 'NUMBER', value: token.value };
                
            case 'VARIABLE':
                this.consume();
                return { type: 'VARIABLE', name: token.value };
                
            case 'FUNCTION':
                this.consume();
                if (!this.peek() || this.peek().type !== 'LPAREN') {
                    throw new Error('Expected opening parenthesis after function');
                }
                this.consume(); // consume '('
                
                const args = [this.parseExpression()];
                while (this.peek() && this.peek().type === 'COMMA') {
                    this.consume(); // consume ','
                    args.push(this.parseExpression());
                }
                
                if (!this.peek() || this.peek().type !== 'RPAREN') {
                    throw new Error('Expected closing parenthesis');
                }
                this.consume(); // consume ')'
                
                return { type: 'FUNCTION_CALL', name: token.value, args };
                
            case 'LPAREN':
                this.consume();
                const expr = this.parseExpression();
                if (!this.peek() || this.peek().type !== 'RPAREN') {
                    throw new Error('Expected closing parenthesis');
                }
                this.consume();
                return expr;
                
            default:
                throw new Error(`Unexpected token: ${token.value}`);
        }
    }

    peek() {
        return this.tokens[this.pos];
    }

    consume() {
        return this.tokens[this.pos++];
    }

    /**
     * Compile AST to an evaluatable function
     */
    compile(ast, variableName = 'x') {
        const code = this.generateCode(ast);
        
        // Create a safe evaluation function
        const funcBody = `
            const sin = Math.sin;
            const cos = Math.cos;
            const tan = Math.tan;
            const asin = Math.asin;
            const acos = Math.acos;
            const atan = Math.atan;
            const sinh = Math.sinh;
            const cosh = Math.cosh;
            const tanh = Math.tanh;
            const log = Math.log10;
            const ln = Math.log;
            const exp = Math.exp;
            const sqrt = Math.sqrt;
            const abs = Math.abs;
            const floor = Math.floor;
            const ceil = Math.ceil;
            const round = Math.round;
            const sign = Math.sign;
            const min = Math.min;
            const max = Math.max;
            const pi = ${Math.PI};
            const e = ${Math.E};
            const phi = ${(1 + Math.sqrt(5)) / 2};
            return (${code});
        `;
        
        try {
            const fn = new Function(variableName, funcBody);
            return { valid: true, fn };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }

    generateCode(node) {
        if (!node) return '';
        
        switch (node.type) {
            case 'NUMBER':
                return node.value.toString();
                
            case 'VARIABLE':
                return node.name;
                
            case 'UNARY_OP':
                return `(-${this.generateCode(node.operand)})`;
                
            case 'BINARY_OP':
                const left = this.generateCode(node.left);
                const right = this.generateCode(node.right);
                if (node.operator === '^') {
                    return `Math.pow(${left}, ${right})`;
                }
                return `(${left} ${node.operator} ${right})`;
                
            case 'FUNCTION_CALL':
                const args = node.args.map(arg => this.generateCode(arg)).join(', ');
                return `${node.name}(${args})`;
                
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    /**
     * Parse and compile in one step
     */
    parseAndCompile(expr, variableName = 'x') {
        try {
            const tokens = this.tokenize(expr);
            const ast = this.parse(tokens);
            return this.compile(ast, variableName);
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Parser;
}
