/**
 * Realistic performance benchmark showing cache benefits
 */

import { parseRegExpLiteral, globalParseCache } from "../src/index"

// Simulate realistic usage: same patterns parsed multiple times
const commonPatterns = [
    "/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/",
    "/^\\d{3}-\\d{3}-\\d{4}$/",
    "/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$/",
    "/^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/",
    "/\\b[A-Z][a-z]+\\b/g",
]

function runRealisticBenchmark(): void {
    console.log("=== Realistic Performance Benchmark ===\n")

    // Test 1: Parse same patterns 1000 times WITHOUT cache
    globalParseCache.clear()
    const noCacheStart = performance.now()
    for (let i = 0; i < 1000; i++) {
        globalParseCache.clear() // Force re-parse every time
        for (const pattern of commonPatterns) {
            parseRegExpLiteral(pattern)
        }
    }
    const noCacheEnd = performance.now()
    const noCacheTime = noCacheEnd - noCacheStart

    // Test 2: Parse same patterns 1000 times WITH cache
    globalParseCache.clear()
    const withCacheStart = performance.now()
    for (let i = 0; i < 1000; i++) {
        for (const pattern of commonPatterns) {
            parseRegExpLiteral(pattern)
        }
    }
    const withCacheEnd = performance.now()
    const withCacheTime = withCacheEnd - withCacheStart

    const speedup = noCacheTime / withCacheTime
    const parsesPerSecond = (1000 * commonPatterns.length) / (withCacheTime / 1000)

    console.log("Results:")
    console.log("-".repeat(60))
    console.log(`Without cache: ${noCacheTime.toFixed(2)}ms`)
    console.log(`With cache: ${withCacheTime.toFixed(2)}ms`)
    console.log(`Speedup: ${speedup.toFixed(2)}x faster`)
    console.log(`Patterns/sec (cached): ${Math.round(parsesPerSecond).toLocaleString()}`)
    console.log(`Cache stats:`, globalParseCache.stats)
    console.log("\n" + "=".repeat(60) + "\n")

    // Test 3: Mixed patterns (some repeated, some new)
    const mixedPatterns = [
        ...commonPatterns,
        "/new1/",
        "/new2/",
        ...commonPatterns, // Repeat common patterns
        "/new3/",
        ...commonPatterns, // Repeat again
    ]

    globalParseCache.clear()
    const mixedNoCacheStart = performance.now()
    for (let i = 0; i < 100; i++) {
        globalParseCache.clear()
        for (const pattern of mixedPatterns) {
            parseRegExpLiteral(pattern)
        }
    }
    const mixedNoCacheEnd = performance.now()
    const mixedNoCacheTime = mixedNoCacheEnd - mixedNoCacheStart

    globalParseCache.clear()
    const mixedWithCacheStart = performance.now()
    for (let i = 0; i < 100; i++) {
        for (const pattern of mixedPatterns) {
            parseRegExpLiteral(pattern)
        }
    }
    const mixedWithCacheEnd = performance.now()
    const mixedWithCacheTime = mixedWithCacheEnd - mixedWithCacheStart

    const mixedSpeedup = mixedNoCacheTime / mixedWithCacheTime

    console.log("Mixed Pattern Results (realistic usage):")
    console.log("-".repeat(60))
    console.log(`Without cache: ${mixedNoCacheTime.toFixed(2)}ms`)
    console.log(`With cache: ${mixedWithCacheTime.toFixed(2)}ms`)
    console.log(`Speedup: ${mixedSpeedup.toFixed(2)}x faster`)
    console.log("\n=== Benchmark Complete ===\n")
}

runRealisticBenchmark()
