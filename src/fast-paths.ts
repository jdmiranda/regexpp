/**
 * Fast paths for simple regex patterns
 */

import type { Pattern, Alternative, Character } from "./ast"

/**
 * Detect if pattern is a simple literal string (no special chars)
 */
export function isSimpleLiteral(pattern: string): boolean {
    // Fast check for common simple patterns
    return /^[a-zA-Z0-9_]+$/.test(pattern)
}

/**
 * Detect if pattern is a simple character class
 */
export function isSimpleCharClass(pattern: string): boolean {
    return /^\[[a-zA-Z0-9_\-]+\]$/.test(pattern)
}

/**
 * Detect if pattern is a simple alternation
 */
export function isSimpleAlternation(pattern: string): boolean {
    return (
        /^[a-zA-Z0-9_]+(\|[a-zA-Z0-9_]+)+$/.test(pattern) &&
        !pattern.includes("(") &&
        !pattern.includes("[")
    )
}

/**
 * Create optimized AST for simple literal
 */
export function createSimpleLiteralAST(
    pattern: string,
    start: number,
    end: number,
): Pattern {
    const characters: Character[] = []

    for (let i = 0; i < pattern.length; i++) {
        const char: Character = {
            type: "Character",
            parent: null as any,
            start: start + i,
            end: start + i + 1,
            raw: pattern[i],
            value: pattern.charCodeAt(i),
        }
        characters.push(char)
    }

    const alternative: Alternative = {
        type: "Alternative",
        parent: null as any,
        start,
        end,
        raw: pattern,
        elements: characters,
    }

    // Fix parent references
    for (const char of characters) {
        char.parent = alternative
    }

    const result: Pattern = {
        type: "Pattern",
        parent: null,
        start,
        end,
        raw: pattern,
        alternatives: [alternative],
    }

    alternative.parent = result

    return result
}

/**
 * Fast path detection and routing
 */
export function tryFastPath(
    pattern: string,
    start: number,
    end: number,
): Pattern | null {
    const patternStr = pattern.slice(start, end)

    if (isSimpleLiteral(patternStr)) {
        return createSimpleLiteralAST(patternStr, start, end)
    }

    // More fast paths can be added here
    return null
}

/**
 * Pattern complexity score (lower is simpler)
 */
export function getPatternComplexity(pattern: string): number {
    let score = 0

    // Count special characters
    if (pattern.includes("(")) score += 10
    if (pattern.includes("[")) score += 5
    if (pattern.includes("{")) score += 5
    if (pattern.includes("\\")) score += 3
    if (pattern.includes("|")) score += 2
    if (pattern.includes("*") || pattern.includes("+")) score += 2
    if (pattern.includes("?")) score += 1

    return score
}

/**
 * Determine if pattern should use cache based on complexity
 */
export function shouldCache(pattern: string): boolean {
    const complexity = getPatternComplexity(pattern)
    return complexity >= 5 || pattern.length > 10
}
