// src/utils/mathCleaner.ts
/**
 * Robust LaTeX content cleaner for math rendering
 * Handles common issues from streaming and parsing
 */

export interface MathCleaningOptions {
  removeDelimiters?: boolean;
  trimWhitespace?: boolean;
  fixCommonErrors?: boolean;
  validateSyntax?: boolean;
}

export class MathCleaner {
  private static readonly DELIMITER_PAIRS = [
    { start: '$$', end: '$$', type: 'display' },
    { start: '$', end: '$', type: 'inline' },
    { start: '\\[', end: '\\]', type: 'display' },
    { start: '\\(', end: '\\)', type: 'inline' },
    { start: '[', end: ']', type: 'display' },
    // Remove plain parentheses as they're too aggressive and cause issues
    // { start: '(', end: ')', type: 'inline' },
  ];

  /**
   * Clean LaTeX content for rendering
   */
  public static clean(content: string, options: MathCleaningOptions = {}): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    let cleaned = content;

    // Step 1: Trim whitespace
    if (options.trimWhitespace !== false) {
      cleaned = cleaned.trim();
    }

    // Step 2: Remove delimiters if they wrap the entire content
    if (options.removeDelimiters !== false) {
      cleaned = this.removeWrappingDelimiters(cleaned);
    }

    // Step 3: Fix common streaming/parsing errors
    if (options.fixCommonErrors !== false) {
      cleaned = this.fixCommonErrors(cleaned);
    }

    // Step 4: Validate basic syntax
    if (options.validateSyntax) {
      cleaned = this.validateAndFix(cleaned);
    }

    return cleaned;
  }

  /**
   * Remove delimiters that wrap the entire content
   */
  private static removeWrappingDelimiters(content: string): string {
    for (const { start, end } of this.DELIMITER_PAIRS) {
      if (content.length > start.length + end.length &&
          content.startsWith(start) && 
          content.endsWith(end)) {
        
        // Check if these are actually wrapping delimiters (not part of the math)
        const inner = content.slice(start.length, -end.length);
        if (inner.trim()) {
          return inner;
        }
      }
    }
    return content;
  }

  /**
   * Fix common errors from streaming/parsing
   */
  private static fixCommonErrors(content: string): string {
    return content
      // Remove trailing backslashes (but preserve valid LaTeX commands)
      .replace(/\\+$/, '')
      // Remove trailing whitespace
      .replace(/\s+$/, '')
      // Fix double backslashes that should be single
      .replace(/\\\\(?![a-zA-Z])/g, '\\')
      // Remove stray markup artifacts
      .replace(/_{2,}/g, '_')  // Multiple underscores
      .replace(/\^{2,}/g, '^') // Multiple carets
      // Fix common fraction issues
      .replace(/\\\\/g, '\\') // Double backslashes in commands
      // Remove null characters or control characters
      .replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Basic LaTeX syntax validation and fixing
   */
  private static validateAndFix(content: string): string {
    let fixed = content;

    // Balance braces
    fixed = this.balanceBraces(fixed);
    
    // Fix common command issues
    fixed = this.fixCommands(fixed);

    return fixed;
  }

  /**
   * Attempt to balance unmatched braces
   */
  private static balanceBraces(content: string): string {
    let openBraces = 0;
    let result = '';

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';

      if (char === '{' && prevChar !== '\\') {
        openBraces++;
      } else if (char === '}' && prevChar !== '\\') {
        if (openBraces > 0) {
          openBraces--;
        } else {
          // Skip unmatched closing brace
          continue;
        }
      }
      result += char;
    }

    // Add missing closing braces
    result += '}'.repeat(openBraces);

    return result;
  }

  /**
   * Fix common LaTeX command issues
   */
  private static fixCommands(content: string): string {
    return content
      // Fix incomplete commands
      .replace(/\\([a-zA-Z]+)(?![a-zA-Z{])/g, '\\$1{}')
      // Don't automatically add spaces around operators in variable lists
      // .replace(/([+\-=])/g, ' $1 ')  // Commented out - too aggressive
      // Clean up excessive spaces
      .replace(/\s+/g, ' ');
  }

  /**
   * Check if content looks like valid LaTeX
   */
  public static isValidLaTeX(content: string): boolean {
    if (!content || !content.trim()) return false;

    try {
      const cleaned = this.clean(content);
      
      // Basic checks
      const hasUnmatchedBraces = this.countUnmatchedBraces(cleaned) !== 0;
      const hasInvalidCommands = /\\[^a-zA-Z\s\\{}]/.test(cleaned);
      
      return !hasUnmatchedBraces && !hasInvalidCommands;
    } catch {
      return false;
    }
  }

  private static countUnmatchedBraces(content: string): number {
    let count = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      if (char === '{' && prevChar !== '\\') count++;
      if (char === '}' && prevChar !== '\\') count--;
    }
    return Math.abs(count);
  }
}

// Convenience functions
export const cleanMathContent = (content: string, options?: MathCleaningOptions) => 
  MathCleaner.clean(content, options);

export const isValidMath = (content: string) => 
  MathCleaner.isValidLaTeX(content);
