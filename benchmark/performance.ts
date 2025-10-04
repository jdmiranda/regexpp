/**
 * Comprehensive performance benchmark for regex parsing
 */

import { parseRegExpLiteral, RegExpParser, globalParseCache } from "../src/index"

interface BenchmarkResult {
    name: string
    patternsPerSecond: number
    totalTime: number
    iterations: number
}

const testPatterns = [
    // Simple literals
    "/abc/",
    "/test123/",
    "/hello_world/",

    // Character classes
    "/[a-z]/",
    "/[A-Z0-9]/",
    "/[^a-z]/",

    // Quantifiers
    "/a+/",
    "/b*/",
    "/c{2,5}/",
    "/d{3}/",

    // Groups and captures
    "/(abc)/",
    "/(?:abc)/",
    "/(?<name>abc)/",

    // Alternation
    "/a|b|c/",
    "/cat|dog|bird/",

    // Anchors and assertions
    "/^start/",
    "/end$/",
    "/\\bword\\b/",

    // Lookahead/lookbehind
    "/(?=abc)/",
    "/(?!abc)/",
    "/(?<=abc)/",
    "/(?<!abc)/",

    // Complex patterns
    "/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/",
    "/^\\d{3}-\\d{3}-\\d{4}$/",
    "/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$/",

    // Unicode
    "/\\p{Letter}/u",
    "/\\p{Emoji}/u",
    "/[\\u{1F600}-\\u{1F64F}]/u",

    // Flags
    "/test/gi",
    "/pattern/gim",
    "/regex/gimsuy",
]

function benchmark(
    name: string,
    fn: () => void,
    iterations: number = 10000,
): BenchmarkResult {
    // Warmup
    for (let i = 0; i < 100; i++) {
        fn()
    }

    // Actual benchmark
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
        fn()
    }
    const end = performance.now()

    const totalTime = end - start
    const patternsPerSecond = (iterations / totalTime) * 1000

    return {
        name,
        patternsPerSecond,
        totalTime,
        iterations,
    }
}

function runBenchmarks(): void {
    console.log("=== RegExp Parser Performance Benchmark ===\n")

    // Individual pattern benchmarks
    console.log("Individual Pattern Performance:")
    console.log("-".repeat(60))

    for (const pattern of testPatterns) {
        const result = benchmark(
            pattern,
            () => {
                parseRegExpLiteral(pattern)
            },
            5000,
        )

        console.log(
            `${pattern.padEnd(50)} ${Math.round(result.patternsPerSecond).toLocaleString()} patterns/sec`,
        )
    }

    console.log("\n" + "=".repeat(60) + "\n")

    // Overall benchmark without cache
    globalParseCache.clear()
    const overallNoCacheResult = benchmark(
        "Overall (no cache)",
        () => {
            globalParseCache.clear()
            for (const pattern of testPatterns) {
                parseRegExpLiteral(pattern)
            }
        },
        1000,
    )

    console.log("Overall Performance (no cache):")
    console.log("-".repeat(60))
    console.log(
        `Patterns per second: ${Math.round(overallNoCacheResult.patternsPerSecond * testPatterns.length).toLocaleString()}`,
    )
    console.log(`Total time: ${overallNoCacheResult.totalTime.toFixed(2)}ms`)
    console.log(`Iterations: ${overallNoCacheResult.iterations}`)

    console.log("\n" + "=".repeat(60) + "\n")

    // Overall benchmark with cache
    globalParseCache.clear()
    // Prime the cache
    for (const pattern of testPatterns) {
        parseRegExpLiteral(pattern)
    }

    const overallWithCacheResult = benchmark(
        "Overall (with cache)",
        () => {
            for (const pattern of testPatterns) {
                parseRegExpLiteral(pattern)
            }
        },
        10000,
    )

    console.log("Overall Performance (with cache):")
    console.log("-".repeat(60))
    console.log(
        `Patterns per second: ${Math.round(overallWithCacheResult.patternsPerSecond * testPatterns.length).toLocaleString()}`,
    )
    console.log(`Total time: ${overallWithCacheResult.totalTime.toFixed(2)}ms`)
    console.log(`Iterations: ${overallWithCacheResult.iterations}`)

    // Calculate speedup
    const speedup =
        (overallWithCacheResult.patternsPerSecond * testPatterns.length) /
        (overallNoCacheResult.patternsPerSecond * testPatterns.length)

    console.log("\n" + "=".repeat(60) + "\n")
    console.log("Cache Performance:")
    console.log("-".repeat(60))
    console.log(`Cache speedup: ${speedup.toFixed(2)}x`)
    console.log(`Cache stats:`, globalParseCache.stats)

    console.log("\n" + "=".repeat(60) + "\n")

    // Parser creation overhead
    const parserCreationResult = benchmark(
        "Parser creation",
        () => {
            new RegExpParser()
        },
        10000,
    )

    console.log("Parser Creation Performance:")
    console.log("-".repeat(60))
    console.log(
        `Parsers per second: ${Math.round(parserCreationResult.patternsPerSecond).toLocaleString()}`,
    )

    console.log("\n=== Benchmark Complete ===\n")
}

// Run benchmarks
runBenchmarks()
