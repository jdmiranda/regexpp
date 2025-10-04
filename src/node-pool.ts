/**
 * AST Node Object Pooling for performance optimization
 */

/**
 * Generic object pool for AST nodes
 */
class ObjectPool<T> {
    private pool: T[] = []
    private factory: () => T
    private reset: (obj: T) => void
    private maxSize: number

    constructor(factory: () => T, reset: (obj: T) => void, maxSize = 1000) {
        this.factory = factory
        this.reset = reset
        this.maxSize = maxSize
    }

    acquire(): T {
        const obj = this.pool.pop()
        if (obj !== undefined) {
            return obj
        }
        return this.factory()
    }

    release(obj: T): void {
        if (this.pool.length < this.maxSize) {
            this.reset(obj)
            this.pool.push(obj)
        }
    }

    releaseAll(objects: T[]): void {
        for (const obj of objects) {
            this.release(obj)
        }
    }

    clear(): void {
        this.pool.length = 0
    }

    get size(): number {
        return this.pool.length
    }
}

/**
 * Reset function for elements array nodes
 */
function resetElementsNode(node: { elements: unknown[] }): void {
    node.elements.length = 0
}

/**
 * Reset function for alternatives array nodes
 */
function resetAlternativesNode(node: { alternatives: unknown[] }): void {
    node.alternatives.length = 0
}

/**
 * AST Node pools for common node types
 */
export class ASTNodePools {
    private alternativePool = new ObjectPool(
        () => ({ elements: [] as unknown[] }),
        resetElementsNode,
    )

    private characterPool = new ObjectPool(
        () => ({}),
        () => {},
    )

    private assertionPool = new ObjectPool(
        () => ({ alternatives: [] as unknown[] }),
        resetAlternativesNode,
    )

    acquireAlternative() {
        return this.alternativePool.acquire()
    }

    releaseAlternative(node: { elements: unknown[] }): void {
        this.alternativePool.release(node)
    }

    acquireCharacter() {
        return this.characterPool.acquire()
    }

    releaseCharacter(node: object): void {
        this.characterPool.release(node)
    }

    acquireAssertion() {
        return this.assertionPool.acquire()
    }

    releaseAssertion(node: { alternatives: unknown[] }): void {
        this.assertionPool.release(node)
    }

    clear(): void {
        this.alternativePool.clear()
        this.characterPool.clear()
        this.assertionPool.clear()
    }

    get stats() {
        return {
            alternativePoolSize: this.alternativePool.size,
            characterPoolSize: this.characterPool.size,
            assertionPoolSize: this.assertionPool.size,
        }
    }
}

/**
 * Global node pools instance
 */
export const globalNodePools = new ASTNodePools()
