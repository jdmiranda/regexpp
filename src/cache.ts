/**
 * Parse cache with LRU eviction for regex patterns
 */

import type { Pattern, RegExpLiteral, Flags } from "./ast"

interface CacheEntry<T> {
    value: T
    timestamp: number
}

/**
 * LRU cache for parsed regex patterns
 */
class LRUCache<K, V> {
    private cache = new Map<K, CacheEntry<V>>()
    private readonly maxSize: number

    constructor(maxSize = 1000) {
        this.maxSize = maxSize
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key)
        if (entry) {
            // Update timestamp for LRU
            entry.timestamp = Date.now()
            return entry.value
        }
        return undefined
    }

    set(key: K, value: V): void {
        // Evict oldest entry if at capacity
        if (this.cache.size >= this.maxSize) {
            let oldestKey: K | undefined
            let oldestTime = Infinity

            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp < oldestTime) {
                    oldestTime = v.timestamp
                    oldestKey = k
                }
            }

            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey)
            }
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        })
    }

    has(key: K): boolean {
        return this.cache.has(key)
    }

    clear(): void {
        this.cache.clear()
    }

    get size(): number {
        return this.cache.size
    }
}

/**
 * Deep clone AST node with new parent references
 */
function cloneAST<T extends { parent: unknown }>(
    node: T,
    newParent: unknown = null,
): T {
    // Custom replacer to handle circular parent references and Infinity
    const seen = new WeakSet()
    const clonedStr = JSON.stringify(node, (key, value) => {
        if (key === "parent") {
            return undefined // Skip parent during serialization
        }
        if (value === Infinity) {
            return "___INFINITY___"
        }
        if (value === -Infinity) {
            return "___NEG_INFINITY___"
        }
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return undefined
            }
            seen.add(value)
        }
        return value
    })

    const cloned = JSON.parse(clonedStr, (key, value) => {
        if (value === "___INFINITY___") {
            return Infinity
        }
        if (value === "___NEG_INFINITY___") {
            return -Infinity
        }
        return value
    }) as T

    // Recursively fix parent references
    function fixParents(n: any, parent: any): void {
        if (n === null || typeof n !== "object") return

        if ("type" in n) {
            n.parent = parent
        }

        // Handle arrays
        if (Array.isArray(n)) {
            n.forEach((item) => fixParents(item, parent))
            return
        }

        // Handle objects
        for (const key of Object.keys(n)) {
            if (key === "parent") continue
            const value = n[key]
            if (value && typeof value === "object") {
                fixParents(value, n)
            }
        }
    }

    fixParents(cloned, newParent)
    return cloned
}

/**
 * Generate cache key from pattern string and options
 */
function generateCacheKey(
    source: string,
    start: number,
    end: number,
    options?: {
        strict?: boolean
        ecmaVersion?: number
        unicode?: boolean
        unicodeSets?: boolean
    },
): string {
    const optStr = options
        ? `|${options.strict ?? false}|${options.ecmaVersion ?? 2025}|${
              options.unicode ?? false
          }|${options.unicodeSets ?? false}`
        : ""
    return `${source.slice(start, end)}${optStr}`
}

/**
 * Parse cache for literal, pattern, and flags
 */
export class RegExpParseCache {
    private literalCache = new LRUCache<string, RegExpLiteral>(500)
    private patternCache = new LRUCache<string, Pattern>(1000)
    private flagsCache = new LRUCache<string, Flags>(200)
    private cacheHits = 0
    private cacheMisses = 0

    getCachedLiteral(
        source: string,
        start: number,
        end: number,
        options?: { strict?: boolean; ecmaVersion?: number },
    ): RegExpLiteral | undefined {
        const key = generateCacheKey(source, start, end, options)
        const cached = this.literalCache.get(key)
        if (cached) {
            this.cacheHits++
            return cloneAST(cached)
        }
        this.cacheMisses++
        return undefined
    }

    setCachedLiteral(
        source: string,
        start: number,
        end: number,
        literal: RegExpLiteral,
        options?: { strict?: boolean; ecmaVersion?: number },
    ): void {
        const key = generateCacheKey(source, start, end, options)
        this.literalCache.set(key, literal)
    }

    getCachedPattern(
        source: string,
        start: number,
        end: number,
        flags?: { unicode?: boolean; unicodeSets?: boolean },
        options?: { strict?: boolean; ecmaVersion?: number },
    ): Pattern | undefined {
        const key = generateCacheKey(source, start, end, {
            ...options,
            ...flags,
        })
        const cached = this.patternCache.get(key)
        return cached ? cloneAST(cached) : undefined
    }

    setCachedPattern(
        source: string,
        start: number,
        end: number,
        pattern: Pattern,
        flags?: { unicode?: boolean; unicodeSets?: boolean },
        options?: { strict?: boolean; ecmaVersion?: number },
    ): void {
        const key = generateCacheKey(source, start, end, {
            ...options,
            ...flags,
        })
        this.patternCache.set(key, pattern)
    }

    getCachedFlags(
        source: string,
        start: number,
        end: number,
    ): Flags | undefined {
        const key = source.slice(start, end)
        const cached = this.flagsCache.get(key)
        return cached ? cloneAST(cached) : undefined
    }

    setCachedFlags(
        source: string,
        start: number,
        end: number,
        flags: Flags,
    ): void {
        const key = source.slice(start, end)
        this.flagsCache.set(key, flags)
    }

    clear(): void {
        this.literalCache.clear()
        this.patternCache.clear()
        this.flagsCache.clear()
        this.cacheHits = 0
        this.cacheMisses = 0
    }

    get stats() {
        const hitRate = this.cacheHits + this.cacheMisses > 0
            ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2)
            : "0.00"
        return {
            literalCacheSize: this.literalCache.size,
            patternCacheSize: this.patternCache.size,
            flagsCacheSize: this.flagsCache.size,
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: `${hitRate}%`,
        }
    }
}

/**
 * Global parse cache instance
 */
export const globalParseCache = new RegExpParseCache()
