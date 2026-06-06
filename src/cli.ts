import { readFileSync } from "node:fs"
import { resolve, relative } from "node:path"
import { globSync } from "glob"
import { check } from "./checker/mod.ts"

function usage(): void {
    process.stderr.write("Usage: shot-rules <glob...>\n")
    process.stderr.write("  shot-rules 'src/**/*.ts'\n")
    process.stderr.write("  shot-rules src/index.ts src/lib.ts\n")
    process.exit(1)
}

const patterns = process.argv.slice(2).filter(function isNotFlag(a: string): boolean { return !a.startsWith("--") })
const flags = process.argv.slice(2).filter(function isFlag(a: string): boolean { return a.startsWith("--") })
const jsonOutput = flags.includes("--json")

if (patterns.length === 0) {
    usage()
}

const files: readonly string[] = patterns.flatMap(function expand(pattern: string): readonly string[] {
    return globSync(pattern, { absolute: true })
})

if (files.length === 0) {
    process.stderr.write(`shot-rules: no files matched patterns: ${patterns.join(", ")}\n`)
    process.exit(1)
}

let totalDiagnostics = 0

const results = files.map(function checkFile(file: string): readonly ReturnType<typeof check>[number][] {
    const source = readFileSync(file, "utf8")
    return check(relative(process.cwd(), resolve(file)), source)
})

if (jsonOutput) {
    const all = results.flat()
    process.stdout.write(JSON.stringify(all, null, 2) + "\n")
    process.exit(all.length > 0 ? 1 : 0)
}

for (const diags of results) {
    for (const d of diags) {
        process.stdout.write(`${d.file}:${d.line}:${d.col}: [${d.rule}] ${d.message}\n`)
        totalDiagnostics += 1
    }
}

if (totalDiagnostics > 0) {
    process.stderr.write(`\n${totalDiagnostics} violation${totalDiagnostics === 1 ? "" : "s"} found.\n`)
    process.exit(1)
}
