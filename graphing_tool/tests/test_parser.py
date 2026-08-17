"""
Unit tests for the mathematical expression parser.
"""

import unittest
import math
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from parser import (
    Lexer, Token, TokenType, Parser, Evaluator,
    CompiledExpression, parse_expression,
    NumberNode, VariableNode, BinaryOpNode, UnaryOpNode, FunctionCallNode
)


class TestLexer(unittest.TestCase):
    """Tests for the lexical analyzer."""
    
    def test_number_token(self):
        lexer = Lexer("42")
        tokens = lexer.tokenize()
        self.assertEqual(tokens[0].type, TokenType.NUMBER)
        self.assertEqual(tokens[0].value, 42.0)
    
    def test_float_number(self):
        lexer = Lexer("3.14159")
        tokens = lexer.tokenize()
        self.assertAlmostEqual(tokens[0].value, 3.14159)
    
    def test_identifier(self):
        lexer = Lexer("x")
        tokens = lexer.tokenize()
        self.assertEqual(tokens[0].type, TokenType.IDENTIFIER)
        self.assertEqual(tokens[0].value, "x")
    
    def test_operators(self):
        lexer = Lexer("+ - * / ^")
        tokens = lexer.tokenize()
        expected = [TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY, 
                   TokenType.DIVIDE, TokenType.POWER, TokenType.EOF]
        self.assertEqual([t.type for t in tokens], expected)
    
    def test_parentheses(self):
        lexer = Lexer("( )")
        tokens = lexer.tokenize()
        expected = [TokenType.LPAREN, TokenType.RPAREN, TokenType.EOF]
        self.assertEqual([t.type for t in tokens], expected)
    
    def test_function_name(self):
        lexer = Lexer("sin(x)")
        tokens = lexer.tokenize()
        self.assertEqual(tokens[0].value, "sin")
        self.assertEqual(tokens[0].type, TokenType.IDENTIFIER)
    
    def test_constants(self):
        lexer = Lexer("pi e")
        tokens = lexer.tokenize()
        self.assertEqual(tokens[0].value, "pi")
        self.assertEqual(tokens[1].value, "e")
    
    def test_whitespace_handling(self):
        lexer = Lexer("  3  +  5  ")
        tokens = lexer.tokenize()
        # Should skip whitespace
        non_eof = [t for t in tokens if t.type != TokenType.EOF]
        self.assertEqual(len(non_eof), 3)


class TestParser(unittest.TestCase):
    """Tests for the Pratt parser."""
    
    def test_simple_number(self):
        expr = parse_expression("42")
        self.assertIsInstance(expr.ast, NumberNode)
        self.assertEqual(expr.ast.value, 42.0)
    
    def test_variable(self):
        expr = parse_expression("x")
        self.assertIsInstance(expr.ast, VariableNode)
        self.assertEqual(expr.ast.name, "x")
    
    def test_binary_operation(self):
        expr = parse_expression("3 + 5")
        self.assertIsInstance(expr.ast, BinaryOpNode)
        self.assertEqual(expr.ast.op, "+")
    
    def test_operator_precedence(self):
        # 3 + 5 * 2 should be parsed as 3 + (5 * 2)
        expr = parse_expression("3 + 5 * 2")
        self.assertIsInstance(expr.ast, BinaryOpNode)
        self.assertEqual(expr.ast.op, "+")
        # Right side should be the multiplication
        self.assertIsInstance(expr.ast.right, BinaryOpNode)
        self.assertEqual(expr.ast.right.op, "*")
    
    def test_parentheses_override(self):
        # (3 + 5) * 2
        expr = parse_expression("(3 + 5) * 2")
        self.assertIsInstance(expr.ast, BinaryOpNode)
        self.assertEqual(expr.ast.op, "*")
        # Left side should be the addition
        self.assertIsInstance(expr.ast.left, BinaryOpNode)
        self.assertEqual(expr.ast.left.op, "+")
    
    def test_exponentiation_right_assoc(self):
        # 2^3^2 should be parsed as 2^(3^2)
        expr = parse_expression("2^3^2")
        self.assertIsInstance(expr.ast, BinaryOpNode)
        self.assertEqual(expr.ast.op, "^")
        # Right side should be another exponentiation
        self.assertIsInstance(expr.ast.right, BinaryOpNode)
        self.assertEqual(expr.ast.right.op, "^")
    
    def test_unary_minus(self):
        expr = parse_expression("-5")
        self.assertIsInstance(expr.ast, UnaryOpNode)
        self.assertEqual(expr.ast.op, "-")
    
    def test_function_call(self):
        expr = parse_expression("sin(x)")
        self.assertIsInstance(expr.ast, FunctionCallNode)
        self.assertEqual(expr.ast.name, "sin")
        self.assertEqual(len(expr.ast.args), 1)
        self.assertIsInstance(expr.ast.args[0], VariableNode)
    
    def test_nested_functions(self):
        expr = parse_expression("sin(cos(x))")
        self.assertIsInstance(expr.ast, FunctionCallNode)
        self.assertEqual(expr.ast.name, "sin")
        # Argument should be another function call
        self.assertIsInstance(expr.ast.args[0], FunctionCallNode)
        self.assertEqual(expr.ast.args[0].name, "cos")


class TestEvaluator(unittest.TestCase):
    """Tests for the AST evaluator."""
    
    def test_evaluate_number(self):
        expr = parse_expression("42")
        self.assertEqual(expr.evaluate(), 42.0)
    
    def test_evaluate_variable(self):
        expr = parse_expression("x")
        self.assertEqual(expr.evaluate({'x': 5}), 5.0)
    
    def test_evaluate_addition(self):
        expr = parse_expression("3 + 5")
        self.assertEqual(expr.evaluate(), 8.0)
    
    def test_evaluate_subtraction(self):
        expr = parse_expression("10 - 4")
        self.assertEqual(expr.evaluate(), 6.0)
    
    def test_evaluate_multiplication(self):
        expr = parse_expression("6 * 7")
        self.assertEqual(expr.evaluate(), 42.0)
    
    def test_evaluate_division(self):
        expr = parse_expression("20 / 4")
        self.assertEqual(expr.evaluate(), 5.0)
    
    def test_evaluate_power(self):
        expr = parse_expression("2^10")
        self.assertEqual(expr.evaluate(), 1024.0)
    
    def test_evaluate_with_precedence(self):
        expr = parse_expression("3 + 5 * 2")
        self.assertEqual(expr.evaluate(), 13.0)  # 3 + 10
    
    def test_evaluate_with_parentheses(self):
        expr = parse_expression("(3 + 5) * 2")
        self.assertEqual(expr.evaluate(), 16.0)
    
    def test_evaluate_unary_minus(self):
        expr = parse_expression("-5")
        self.assertEqual(expr.evaluate(), -5.0)
    
    def test_evaluate_sine(self):
        expr = parse_expression("sin(0)")
        self.assertAlmostEqual(expr.evaluate(), 0.0)
        
        expr = parse_expression("sin(pi/2)")
        self.assertAlmostEqual(expr.evaluate(), 1.0)
    
    def test_evaluate_cosine(self):
        expr = parse_expression("cos(0)")
        self.assertAlmostEqual(expr.evaluate(), 1.0)
        
        expr = parse_expression("cos(pi)")
        self.assertAlmostEqual(expr.evaluate(), -1.0)
    
    def test_evaluate_tangent(self):
        expr = parse_expression("tan(0)")
        self.assertAlmostEqual(expr.evaluate(), 0.0)
    
    def test_evaluate_logarithm(self):
        expr = parse_expression("ln(e)")
        self.assertAlmostEqual(expr.evaluate(), 1.0)
        
        expr = parse_expression("log(100)")
        self.assertAlmostEqual(expr.evaluate(), 2.0)
    
    def test_evaluate_sqrt(self):
        expr = parse_expression("sqrt(16)")
        self.assertEqual(expr.evaluate(), 4.0)
    
    def test_evaluate_abs(self):
        expr = parse_expression("abs(-5)")
        self.assertEqual(expr.evaluate(), 5.0)
    
    def test_evaluate_complex_expression(self):
        expr = parse_expression("3 * x^2 + 2 * x + 1")
        self.assertEqual(expr.evaluate({'x': 2}), 3 * 4 + 2 * 2 + 1)
    
    def test_evaluate_constants(self):
        expr = parse_expression("pi")
        self.assertAlmostEqual(expr.evaluate(), math.pi)
        
        expr = parse_expression("e")
        self.assertAlmostEqual(expr.evaluate(), math.e)
    
    def test_division_by_zero(self):
        expr = parse_expression("1 / 0")
        with self.assertRaises(ZeroDivisionError):
            expr.evaluate()
    
    def test_undefined_variable(self):
        expr = parse_expression("x + y")
        with self.assertRaises(NameError):
            expr.evaluate({'x': 1})
    
    def test_undefined_function(self):
        expr = parse_expression("foo(x)")
        with self.assertRaises(NameError):
            expr.evaluate({'x': 1})


class TestCompiledExpression(unittest.TestCase):
    """Tests for the compiled expression interface."""
    
    def test_array_evaluation(self):
        expr = parse_expression("x^2")
        x_values = [0, 1, 2, 3, 4, 5]
        results = expr.evaluate_array(x_values)
        expected = [0, 1, 4, 9, 16, 25]
        for r, e in zip(results, expected):
            self.assertAlmostEqual(r, e)
    
    def test_default_variables(self):
        expr = CompiledExpression("a * x", default_vars={'a': 2})
        self.assertEqual(expr.evaluate({'x': 5}), 10.0)


class TestEdgeCases(unittest.TestCase):
    """Tests for edge cases and error handling."""
    
    def test_empty_expression(self):
        with self.assertRaises(SyntaxError):
            parse_expression("")
    
    def test_mismatched_parentheses(self):
        with self.assertRaises(SyntaxError):
            parse_expression("(3 + 5")
    
    def test_invalid_character(self):
        with self.assertRaises(SyntaxError):
            parse_expression("3 @ 5")
    
    def test_multiple_decimal_points(self):
        with self.assertRaises(SyntaxError):
            parse_expression("3.14.15")
    
    def test_very_large_numbers(self):
        expr = parse_expression("1e100")
        self.assertEqual(expr.evaluate(), 1e100)
    
    def test_negative_exponent(self):
        expr = parse_expression("1e-5")
        self.assertAlmostEqual(expr.evaluate(), 1e-5)
    
    def test_trigonometric_identity(self):
        # sin²(x) + cos²(x) = 1
        expr = parse_expression("sin(x)^2 + cos(x)^2")
        for angle in [0, 0.5, 1.0, math.pi/4, math.pi/2]:
            result = expr.evaluate({'x': angle})
            self.assertAlmostEqual(result, 1.0, places=10)


if __name__ == '__main__':
    unittest.main(verbosity=2)
