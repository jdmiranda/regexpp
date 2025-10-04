/**
 * Optimized visitor with batching and memoization
 */

import type { Node } from "./ast"
import { RegExpVisitor } from "./visitor"

/**
 * Optimized visitor that reduces handler lookups and function calls
 */
export class OptimizedRegExpVisitor extends RegExpVisitor {
    private handlerCache = new Map<string, Function | null>()

    /**
     * Optimized visit with cached handler lookups
     */
    // eslint-disable-next-line complexity
    public visit(node: Node): void {
        const type = node.type
        const enterKey = `${type}Enter`
        const leaveKey = `${type}Leave`

        // Cache handler lookups
        let enterHandler = this.handlerCache.get(enterKey)
        let leaveHandler = this.handlerCache.get(leaveKey)

        if (enterHandler === undefined) {
            const handlers = (this as any)._handlers
            enterHandler =
                (handlers as any)[`on${type}Enter`] ||
                (handlers as any)[`on${type.charAt(0).toLowerCase() + type.slice(1)}Enter`] ||
                null
            this.handlerCache.set(enterKey, enterHandler || null)
        }

        if (leaveHandler === undefined) {
            const handlers = (this as any)._handlers
            leaveHandler =
                (handlers as any)[`on${type}Leave`] ||
                (handlers as any)[`on${type.charAt(0).toLowerCase() + type.slice(1)}Leave`] ||
                null
            this.handlerCache.set(leaveKey, leaveHandler || null)
        }

        // Call parent implementation
        super.visit(node)
    }

    /**
     * Batch visit multiple nodes
     */
    visitBatch(nodes: Node[]): void {
        for (let i = 0; i < nodes.length; i++) {
            this.visit(nodes[i])
        }
    }

    /**
     * Clear handler cache
     */
    clearCache(): void {
        this.handlerCache.clear()
    }
}

/**
 * Create visitor with common optimizations
 */
export function createOptimizedVisitor(
    handlers: RegExpVisitor.Handlers,
): OptimizedRegExpVisitor {
    return new OptimizedRegExpVisitor(handlers)
}
