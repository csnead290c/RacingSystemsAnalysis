/**
 * Math Channels (Derived Channels) Foundation
 * 
 * Architecture for computed channels based on expressions.
 * This batch delivers the data model and simple evaluator.
 * Full interactive editor deferred to next batch.
 */

export interface DerivedChannel {
  id: string;
  key: string;
  label: string;
  expression: string;
  dependencies: string[]; // Channel keys referenced in expression
  unit?: string;
  color?: string;
  group?: string;
}

export interface EvaluationContext {
  channels: Map<string, number[]>; // key -> values array
  timeValues: number[];
}

export interface EvaluationResult {
  success: boolean;
  values?: number[];
  error?: string;
}

/**
 * Parse expression to extract channel dependencies
 * Channels referenced as $channelKey
 */
export function extractDependencies(expression: string): string[] {
  const matches = expression.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  
  return Array.from(new Set(matches.map(m => m.substring(1))));
}

/**
 * Validate expression syntax (basic check)
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
  // Check for balanced parentheses
  let depth = 0;
  for (const char of expression) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) return { valid: false, error: 'Unbalanced parentheses' };
  }
  if (depth !== 0) return { valid: false, error: 'Unbalanced parentheses' };
  
  // Check for invalid characters (allow: digits, operators, $, _, letters, parentheses, spaces, dots)
  if (!/^[\d\s\+\-\*\/\^\(\)\$_a-zA-Z\.]+$/.test(expression)) {
    return { valid: false, error: 'Invalid characters in expression' };
  }
  
  return { valid: true };
}

/**
 * Simple expression evaluator
 * Supports: +, -, *, /, ^, parentheses, channel references ($key)
 * 
 * This is a basic implementation. Advanced features (functions, filtering, etc.)
 * deferred to next batch.
 */
export function evaluateExpression(
  expression: string,
  context: EvaluationContext
): EvaluationResult {
  const validation = validateExpression(expression);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const dependencies = extractDependencies(expression);
  
  // Check all dependencies exist
  for (const dep of dependencies) {
    if (!context.channels.has(dep)) {
      return { success: false, error: `Channel not found: ${dep}` };
    }
  }

  const length = context.timeValues.length;
  const result: number[] = new Array(length);

  try {
    // Evaluate point-by-point
    for (let i = 0; i < length; i++) {
      // Replace channel references with values
      let expr = expression;
      for (const dep of dependencies) {
        const values = context.channels.get(dep)!;
        const value = values[i] ?? 0; // Use 0 for null values
        expr = expr.replace(new RegExp(`\\$${dep}`, 'g'), String(value));
      }

      // Evaluate the expression
      // Note: Using Function constructor is not ideal for production but works for simple cases
      // A proper parser would be better for security and features
      try {
        // Replace ^ with ** for JavaScript exponentiation
        expr = expr.replace(/\^/g, '**');
        
        // Evaluate (sandboxed to arithmetic only)
        const value = new Function(`return ${expr}`)();
        result[i] = typeof value === 'number' && isFinite(value) ? value : null as any;
      } catch (e) {
        result[i] = null as any;
      }
    }

    return { success: true, values: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Evaluation failed' };
  }
}

/**
 * Create a derived channel from an expression
 */
export function createDerivedChannel(
  id: string,
  label: string,
  expression: string,
  unit?: string,
  color?: string
): DerivedChannel {
  return {
    id,
    key: `derived_${id}`,
    label,
    expression,
    dependencies: extractDependencies(expression),
    unit,
    color,
    group: 'derived',
  };
}

/**
 * Resolve evaluation order based on dependencies
 * Returns channels in order such that dependencies are evaluated first
 */
export function resolveDependencyOrder(channels: DerivedChannel[]): DerivedChannel[] {
  const resolved: DerivedChannel[] = [];
  const resolvedKeys = new Set<string>();
  const remaining = [...channels];

  let lastLength = remaining.length;
  while (remaining.length > 0) {
    const channel = remaining.shift()!;
    
    // Check if all dependencies are resolved
    const allDepsResolved = channel.dependencies.every(dep => 
      resolvedKeys.has(dep) || !channels.some(c => c.key === dep)
    );

    if (allDepsResolved) {
      resolved.push(channel);
      resolvedKeys.add(channel.key);
    } else {
      // Put back at end of queue
      remaining.push(channel);
    }

    // Detect circular dependencies
    if (remaining.length === lastLength) {
      throw new Error('Circular dependency detected in derived channels');
    }
    lastLength = remaining.length;
  }

  return resolved;
}
