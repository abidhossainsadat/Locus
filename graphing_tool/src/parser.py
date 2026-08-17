"""
Mathematical Expression Parser and AST Engine

This module implements a complete lexer, parser (using Pratt parsing), 
and evaluator for mathematical expressions.
"""

import math
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union
from enum import Enum, auto


class TokenType(Enum):
    """Enumeration of token types for lexical analysis."""
    NUMBER = auto()
    IDENTIFIER = auto()
    PLUS = auto()
    MINUS = auto()
    MULTIPLY = auto()
    DIVIDE = auto()
    POWER = auto()
    LPAREN = auto()
    RPAREN = auto()
    COMMA = auto()
    EOF = auto()


@dataclass
class Token:
    """Represents a single token from lexical analysis."""
    type: TokenType
    value: Any
    position: int


class Lexer:
    """
    Tokenizes mathematical expression strings into structured tokens.
    
    Supports:
    - Numbers (integers and floats)
    - Identifiers (variables and function names)
    - Operators: +, -, *, /, ^
    - Delimiters: (, ), ,
    - Constants: pi, e
    """
    
    # Built-in constants
    CONSTANTS = {
        'pi': math.pi,
        'e': math.e,
        'τ': math.tau,
    }
    
    # Built-in functions
    FUNCTIONS = {
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'asin': math.asin,
        'acos': math.acos,
        'atan': math.atan,
        'sinh': math.sinh,
        'cosh': math.cosh,
        'tanh': math.tanh,
        'log': math.log10,
        'ln': math.log,
        'log2': math.log2,
        'exp': math.exp,
        'sqrt': math.sqrt,
        'abs': abs,
        'floor': math.floor,
        'ceil': math.ceil,
        'round': round,
        'sign': lambda x: (x > 0) - (x < 0),
        'max': max,
        'min': min,
    }
    
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.length = len(text)
        
    def _skip_whitespace(self):
        """Skip whitespace characters."""
        while self.pos < self.length and self.text[self.pos].isspace():
            self.pos += 1
    
    def _read_number(self) -> Token:
        """Read a numeric literal (integer or float)."""
        start = self.pos
        
        # Handle negative numbers at the start or after an operator
        if self.pos < self.length and self.text[self.pos] == '-':
            self.pos += 1
        
        # Read integer part
        while self.pos < self.length and self.text[self.pos].isdigit():
            self.pos += 1
        
        # Read decimal part
        if self.pos < self.length and self.text[self.pos] == '.':
            self.pos += 1
            while self.pos < self.length and self.text[self.pos].isdigit():
                self.pos += 1
        
        # Read exponent part
        if self.pos < self.length and self.text[self.pos].lower() == 'e':
            exp_pos = self.pos
            self.pos += 1
            if self.pos < self.length and self.text[self.pos] in '+-':
                self.pos += 1
            if self.pos < self.length and self.text[self.pos].isdigit():
                while self.pos < self.length and self.text[self.pos].isdigit():
                    self.pos += 1
            else:
                self.pos = exp_pos  # Not a valid exponent, backtrack
        
        num_str = self.text[start:self.pos]
        return Token(TokenType.NUMBER, float(num_str), start)
    
    def _read_identifier(self) -> Token:
        """Read an identifier (variable name or function name)."""
        start = self.pos
        
        while self.pos < self.length and (
            self.text[self.pos].isalnum() or self.text[self.pos] == '_'
        ):
            self.pos += 1
        
        value = self.text[start:self.pos]
        return Token(TokenType.IDENTIFIER, value, start)
    
    def tokenize(self) -> List[Token]:
        """Convert the input string into a list of tokens."""
        tokens = []
        
        while self.pos < self.length:
            self._skip_whitespace()
            
            if self.pos >= self.length:
                break
            
            char = self.text[self.pos]
            start_pos = self.pos
            
            if char.isdigit() or (char == '.' and self.pos + 1 < self.length and self.text[self.pos + 1].isdigit()):
                tokens.append(self._read_number())
            elif char.isalpha() or char == '_':
                tokens.append(self._read_identifier())
            elif char == '+':
                tokens.append(Token(TokenType.PLUS, '+', start_pos))
                self.pos += 1
            elif char == '-':
                tokens.append(Token(TokenType.MINUS, '-', start_pos))
                self.pos += 1
            elif char == '*':
                tokens.append(Token(TokenType.MULTIPLY, '*', start_pos))
                self.pos += 1
            elif char == '/':
                tokens.append(Token(TokenType.DIVIDE, '/', start_pos))
                self.pos += 1
            elif char == '^':
                tokens.append(Token(TokenType.POWER, '^', start_pos))
                self.pos += 1
            elif char == '(':
                tokens.append(Token(TokenType.LPAREN, '(', start_pos))
                self.pos += 1
            elif char == ')':
                tokens.append(Token(TokenType.RPAREN, ')', start_pos))
                self.pos += 1
            elif char == ',':
                tokens.append(Token(TokenType.COMMA, ',', start_pos))
                self.pos += 1
            else:
                raise SyntaxError(f"Unexpected character '{char}' at position {start_pos}")
        
        tokens.append(Token(TokenType.EOF, None, self.pos))
        return tokens


# AST Node Types
@dataclass
class ASTNode:
    """Base class for AST nodes."""
    pass


@dataclass
class NumberNode(ASTNode):
    """AST node for numeric literals."""
    value: float


@dataclass
class VariableNode(ASTNode):
    """AST node for variables."""
    name: str


@dataclass
class BinaryOpNode(ASTNode):
    """AST node for binary operations."""
    op: str
    left: ASTNode
    right: ASTNode


@dataclass
class UnaryOpNode(ASTNode):
    """AST node for unary operations."""
    op: str
    operand: ASTNode


@dataclass
class FunctionCallNode(ASTNode):
    """AST node for function calls."""
    name: str
    args: List[ASTNode]


class Parser:
    """
    Pratt parser for converting tokens into an Abstract Syntax Tree.
    
    Implements operator precedence parsing with support for:
    - Binary operators: +, -, *, /, ^
    - Unary operators: +, -
    - Function calls
    - Parenthesized expressions
    """
    
    # Operator precedence (higher = binds tighter)
    PRECEDENCE = {
        '+': 10,
        '-': 10,
        '*': 20,
        '/': 20,
        '^': 30,
    }
    
    # Right-associative operators
    RIGHT_ASSOC = {'^'}
    
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
        
    def _current_token(self) -> Token:
        """Get the current token."""
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return self.tokens[-1]  # EOF
    
    def _consume(self, expected_type: TokenType = None) -> Token:
        """Consume and return the current token."""
        token = self._current_token()
        if expected_type and token.type != expected_type:
            raise SyntaxError(
                f"Expected {expected_type}, got {token.type} at position {token.position}"
            )
        self.pos += 1
        return token
    
    def _parse_expression(self, min_precedence: int = 0) -> ASTNode:
        """Parse an expression using Pratt parsing algorithm."""
        node = self._parse_prefix()
        
        while True:
            token = self._current_token()
            
            if token.type == TokenType.EOF:
                break
            
            if token.type not in (TokenType.PLUS, TokenType.MINUS, 
                                   TokenType.MULTIPLY, TokenType.DIVIDE, 
                                   TokenType.POWER):
                break
            
            op = token.value
            prec = self.PRECEDENCE.get(op, 0)
            
            if prec < min_precedence:
                break
            
            # Handle right-associativity
            if op in self.RIGHT_ASSOC:
                next_prec = prec
            else:
                next_prec = prec + 1
            
            self._consume()
            right = self._parse_expression(next_prec)
            node = BinaryOpNode(op, node, right)
        
        return node
    
    def _parse_prefix(self) -> ASTNode:
        """Parse prefix expressions (unary operators, numbers, identifiers)."""
        token = self._current_token()
        
        if token.type == TokenType.NUMBER:
            self._consume()
            return NumberNode(token.value)
        
        if token.type == TokenType.IDENTIFIER:
            name = token.value
            self._consume()
            
            # Check if it's a function call
            if self._current_token().type == TokenType.LPAREN:
                self._consume(TokenType.LPAREN)
                args = []
                
                if self._current_token().type != TokenType.RPAREN:
                    args.append(self._parse_expression())
                    
                    while self._current_token().type == TokenType.COMMA:
                        self._consume(TokenType.COMMA)
                        args.append(self._parse_expression())
                
                self._consume(TokenType.RPAREN)
                return FunctionCallNode(name, args)
            
            # Check if it's a constant
            if name in Lexer.CONSTANTS:
                return NumberNode(Lexer.CONSTANTS[name])
            
            # It's a variable
            return VariableNode(name)
        
        if token.type == TokenType.PLUS:
            self._consume()
            operand = self._parse_prefix()
            return UnaryOpNode('+', operand)
        
        if token.type == TokenType.MINUS:
            self._consume()
            operand = self._parse_prefix()
            return UnaryOpNode('-', operand)
        
        if token.type == TokenType.LPAREN:
            self._consume(TokenType.LPAREN)
            node = self._parse_expression()
            self._consume(TokenType.RPAREN)
            return node
        
        raise SyntaxError(f"Unexpected token {token.type} at position {token.position}")
    
    def parse(self) -> ASTNode:
        """Parse the token stream into an AST."""
        ast = self._parse_expression()
        
        if self._current_token().type != TokenType.EOF:
            raise SyntaxError(
                f"Unexpected token {self._current_token().type} at position {self._current_token().position}"
            )
        
        return ast


class Evaluator:
    """
    Evaluates an AST with given variable bindings.
    
    Provides fast numerical evaluation by traversing the pre-built AST.
    """
    
    def __init__(self):
        self.functions = Lexer.FUNCTIONS.copy()
        self.constants = Lexer.CONSTANTS.copy()
    
    def evaluate(self, node: ASTNode, variables: Dict[str, float] = None) -> float:
        """Evaluate an AST node with the given variable bindings."""
        variables = variables or {}
        
        if isinstance(node, NumberNode):
            return node.value
        
        if isinstance(node, VariableNode):
            if node.name in variables:
                return variables[node.name]
            if node.name in self.constants:
                return self.constants[node.name]
            raise NameError(f"Undefined variable: {node.name}")
        
        if isinstance(node, UnaryOpNode):
            operand = self.evaluate(node.operand, variables)
            if node.op == '+':
                return operand
            if node.op == '-':
                return -operand
            raise ValueError(f"Unknown unary operator: {node.op}")
        
        if isinstance(node, BinaryOpNode):
            left = self.evaluate(node.left, variables)
            right = self.evaluate(node.right, variables)
            
            if node.op == '+':
                return left + right
            if node.op == '-':
                return left - right
            if node.op == '*':
                return left * right
            if node.op == '/':
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                return left / right
            if node.op == '^':
                try:
                    result = left ** right
                    if isinstance(result, complex):
                        raise ValueError("Result is complex")
                    return result
                except (ValueError, OverflowError):
                    raise ValueError(f"Invalid power operation: {left}^{right}")
            
            raise ValueError(f"Unknown binary operator: {node.op}")
        
        if isinstance(node, FunctionCallNode):
            func_name = node.name.lower()
            
            if func_name not in self.functions:
                raise NameError(f"Undefined function: {func_name}")
            
            func = self.functions[func_name]
            args = [self.evaluate(arg, variables) for arg in node.args]
            
            try:
                return func(*args)
            except (ValueError, ZeroDivisionError, OverflowError) as e:
                raise ValueError(f"Function error in {func_name}: {e}")
        
        raise TypeError(f"Unknown node type: {type(node)}")


class CompiledExpression:
    """
    A compiled mathematical expression ready for fast evaluation.
    
    Combines lexing, parsing, and provides optimized evaluation methods.
    """
    
    def __init__(self, expression: str, default_vars: Dict[str, float] = None):
        self.expression = expression
        self.default_vars = default_vars or {}
        
        # Compile the expression
        lexer = Lexer(expression)
        tokens = lexer.tokenize()
        parser = Parser(tokens)
        self.ast = parser.parse()
        
        self.evaluator = Evaluator()
    
    def evaluate(self, variables: Dict[str, float] = None) -> float:
        """Evaluate the expression with optional variable overrides."""
        merged_vars = {**self.default_vars, **(variables or {})}
        return self.evaluator.evaluate(self.ast, merged_vars)
    
    def evaluate_array(self, x_values: List[float], 
                       var_name: str = 'x') -> List[float]:
        """Evaluate the expression over an array of values."""
        results = []
        for x in x_values:
            try:
                result = self.evaluate({var_name: x})
                results.append(result)
            except (ValueError, ZeroDivisionError, NameError):
                results.append(float('nan'))
        return results


def parse_expression(expression: str) -> CompiledExpression:
    """Convenience function to parse an expression string."""
    return CompiledExpression(expression)


if __name__ == "__main__":
    # Test the parser
    test_expressions = [
        "3 * x + sin(x)",
        "x^2 + 2*x + 1",
        "sin(x^2) + ln(x)",
        "sqrt(x^2 + y^2)",
        "pi * r^2",
        "tan(x)",
        "1 / (1 + x^2)",
    ]
    
    for expr_str in test_expressions:
        print(f"\nExpression: {expr_str}")
        try:
            expr = parse_expression(expr_str)
            print(f"  AST: {expr.ast}")
            
            # Test evaluation
            if 'y' not in expr_str and 'r' not in expr_str:
                test_val = 1.0
                result = expr.evaluate({'x': test_val})
                print(f"  f({test_val}) = {result}")
        except Exception as e:
            print(f"  Error: {e}")
