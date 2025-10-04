/**
 * Optimized visitor with batching and memoization
 */

import type {
    Node,
    Alternative,
    Assertion,
    Backreference,
    CapturingGroup,
    Character,
    CharacterClass,
    CharacterClassRange,
    CharacterSet,
    ClassIntersection,
    ClassStringDisjunction,
    ClassSubtraction,
    ExpressionCharacterClass,
    Flags,
    Group,
    ModifierFlags,
    Modifiers,
    Pattern,
    Quantifier,
    RegExpLiteral,
    StringAlternative,
} from "./ast"
import { RegExpVisitor } from "./visitor"

/**
 * Optimized visitor that reduces handler lookups and function calls by
 * caching handler references and performing an inlined traversal.
 */
export class OptimizedRegExpVisitor extends RegExpVisitor {
    private handlerCache = new Map<string, Function | null>()

    private getHandler(type: string, phase: "Enter" | "Leave"): Function | null {
        const key = `${type}${phase}`
        let handler = this.handlerCache.get(key)
        if (handler !== undefined) {
            // touch for simple LRU behavior
            this.handlerCache.delete(key)
            this.handlerCache.set(key, handler)
            return handler
        }
        const handlers = (this as any)._handlers
        handler =
            (handlers as any)[`on${type}${phase}`] ||
            (handlers as any)[
                `on${type.charAt(0).toLowerCase() + type.slice(1)}${phase}`
            ] ||
            null
        this.handlerCache.set(key, handler)
        return handler
    }

    // eslint-disable-next-line complexity
    public visit(node: Node): void {
        const type = node.type
        const onEnter = this.getHandler(type, "Enter")
        const onLeave = this.getHandler(type, "Leave")

        // call enter
        if (onEnter) onEnter(node as any)

        switch (type) {
            case "Alternative": {
                const n = node as Alternative
                for (let i = 0; i < n.elements.length; i++) this.visit(n.elements[i])
                break
            }
            case "Assertion": {
                const n = node as Assertion
                if (n.kind === "lookahead" || n.kind === "lookbehind") {
                    for (let i = 0; i < n.alternatives.length; i++)
                        this.visit(n.alternatives[i])
                }
                break
            }
            case "Backreference":
                // leaf
                break
            case "CapturingGroup": {
                const n = node as CapturingGroup
                for (let i = 0; i < n.alternatives.length; i++)
                    this.visit(n.alternatives[i])
                break
            }
            case "Character":
                // leaf
                break
            case "CharacterClass": {
                const n = node as CharacterClass
                for (let i = 0; i < n.elements.length; i++)
                    this.visit(n.elements[i] as Node)
                break
            }
            case "CharacterClassRange": {
                const n = node as CharacterClassRange
                this.visit(n.min as Character)
                this.visit(n.max as Character)
                break
            }
            case "CharacterSet":
                // leaf
                break
            case "ClassIntersection": {
                const n = node as ClassIntersection
                this.visit(n.left as Node)
                this.visit(n.right as Node)
                break
            }
            case "ClassStringDisjunction": {
                const n = node as ClassStringDisjunction
                for (let i = 0; i < n.alternatives.length; i++)
                    this.visit(n.alternatives[i] as Node)
                break
            }
            case "ClassSubtraction": {
                const n = node as ClassSubtraction
                this.visit(n.left as Node)
                this.visit(n.right as Node)
                break
            }
            case "ExpressionCharacterClass": {
                const n = node as ExpressionCharacterClass
                this.visit(n.expression as Node)
                break
            }
            case "Flags":
                // leaf
                break
            case "Group": {
                const n = node as Group
                if (n.modifiers) this.visit(n.modifiers as Modifiers)
                for (let i = 0; i < n.alternatives.length; i++)
                    this.visit(n.alternatives[i])
                break
            }
            case "Modifiers": {
                const n = node as Modifiers
                if (n.add) this.visit(n.add as ModifierFlags)
                if (n.remove) this.visit(n.remove as ModifierFlags)
                break
            }
            case "ModifierFlags":
                // leaf
                break
            case "Pattern": {
                const n = node as Pattern
                for (let i = 0; i < n.alternatives.length; i++)
                    this.visit(n.alternatives[i])
                break
            }
            case "Quantifier": {
                const n = node as Quantifier
                this.visit(n.element as Node)
                break
            }
            case "RegExpLiteral": {
                const n = node as RegExpLiteral
                this.visit(n.pattern as Pattern)
                this.visit(n.flags as Flags)
                break
            }
            case "StringAlternative": {
                const n = node as StringAlternative
                for (let i = 0; i < n.elements.length; i++)
                    this.visit(n.elements[i] as Node)
                break
            }
            default:
                // fallback to parent if a new node type appears
                super.visit(node)
        }

        // call leave
        if (onLeave) onLeave(node as any)
    }

    /** Batch visit multiple nodes */
    visitBatch(nodes: Node[]): void {
        for (let i = 0; i < nodes.length; i++) this.visit(nodes[i])
    }

    /** Clear handler cache */
    clearCache(): void {
        this.handlerCache.clear()
    }
}

/** Create visitor with common optimizations */
export function createOptimizedVisitor(
    handlers: RegExpVisitor.Handlers,
): OptimizedRegExpVisitor {
    return new OptimizedRegExpVisitor(handlers)
}
