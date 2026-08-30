/**
 * Safe Jexl-based Expression Evaluator for Guard Conditions & Branch Rules.
 *
 * Runs synchronously without eval() or new Function() to prevent code injection.
 */

import jexl from 'jexl';

export interface EvalContext {
  variables?: Record<string, unknown>;
  fragments?: string[];
  vector?: Record<string, number>;
  history?: string[];
  [key: string]: unknown;
}

// Instantiate and configure custom Jexl instance
const jexlInstance = new jexl.Jexl();

// Custom helper: check if an array contains an item
jexlInstance.addTransform('has', (arr: unknown, item: unknown) => {
  if (Array.isArray(arr)) {
    return arr.includes(item);
  }
  return false;
});

// Custom helper: check fragment ownership
jexlInstance.addTransform('hasFragment', (context: EvalContext, fragmentId: string) => {
  return Array.isArray(context?.fragments) && context.fragments.includes(fragmentId);
});

/**
 * Safely evaluates a boolean condition against runtime context.
 *
 * @param expression Jexl condition expression (e.g. "variables.affection >= 80 && fragments|has('key')")
 * @param context Current runtime game context
 * @returns boolean evaluation result
 */
export function evaluateGuard(expression: string | undefined | null, context: EvalContext): boolean {
  if (!expression || typeof expression !== 'string' || expression.trim() === '') {
    return true;
  }

  try {
    const expr = jexlInstance.createExpression(expression.trim());
    const result = expr.evalSync({
      variables: context.variables || {},
      fragments: context.fragments || [],
      vector: context.vector || {},
      history: context.history || [],
      ...context,
    });
    return Boolean(result);
  } catch (err) {
    // If evaluation fails (e.g. syntax error in custom expression), log and block by default
    console.warn(`[SafeEval] Failed to evaluate expression: "${expression}"`, err);
    return false;
  }
}
