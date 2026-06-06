/**
 * shot-rules/utils — safe wrappers for globals that throw.
 *
 * Every function here returns [value, error] instead of throwing.
 * These are the canonical replacements for the globals banned by
 * the no-throwing-globals rule.
 *
 * Usage:
 *   import { tryCatch, tryCatchAsync, jsonParse, jsonStringify, safeFetch } from "shot-rules/utils"
 */

export type Result<T> = [T, null] | [null, Error]

/**
 * Wraps any synchronous call that might throw.
 * Use for third-party library calls that shot-rules can't detect.
 *
 *   const [value, err] = tryCatch(() => someLib.parse(input))
 */
export function tryCatch<T>(fn: () => T): Result<T> {
    try {
        return [fn(), null]
    } catch (e) {
        if (e instanceof Error) {
            return [null, e]
        }
        return [null, new Error(String(e))]
    }
}

/**
 * Wraps any async call that might reject.
 * Use for third-party async functions that shot-rules can't detect.
 *
 *   const [value, err] = await tryCatchAsync(() => someLib.fetchData(id))
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
    try {
        return [await fn(), null]
    } catch (e) {
        if (e instanceof Error) {
            return [null, e]
        }
        return [null, new Error(String(e))]
    }
}

/**
 * Safe JSON.parse — replaces the banned JSON.parse global.
 * Returns [parsed, null] on success, [null, Error] on invalid JSON.
 *
 *   const [data, err] = jsonParse<User>(text)
 */
export function jsonParse<T>(text: string): Result<T> {
    try {
        return [JSON.parse(text) as T, null]
    } catch (e) {
        if (e instanceof Error) {
            return [null, e]
        }
        return [null, new Error(`JSON.parse failed: ${String(e)}`)]
    }
}

/**
 * Safe JSON.stringify — replaces the banned JSON.stringify global.
 * Throws only on circular references or BigInt values; both are surfaced as Error.
 *
 *   const [json, err] = jsonStringify(value)
 */
export function jsonStringify(value: unknown, indent: number | null = null): Result<string> {
    try {
        return [JSON.stringify(value, null, indent ?? undefined), null]
    } catch (e) {
        if (e instanceof Error) {
            return [null, e]
        }
        return [null, new Error(`JSON.stringify failed: ${String(e)}`)]
    }
}

/**
 * Safe fetch — replaces the banned global fetch.
 * Network errors (DNS failure, timeout, etc.) surface as Error.
 * HTTP error status codes are NOT treated as errors here — check res.ok yourself.
 *
 *   const [res, err] = await safeFetch("https://api.example.com/users/1")
 *   if (err !== null) { return [null, err] }
 *   if (!res.ok) { return [null, new Error(`HTTP ${res.status.toString()}`)] }
 */
export async function safeFetch(url: string | URL, init: RequestInit | null = null): Promise<Result<Response>> {
    try {
        const res = await fetch(url, init ?? undefined)
        return [res, null]
    } catch (e) {
        if (e instanceof Error) {
            return [null, e]
        }
        return [null, new Error(`fetch failed: ${String(e)}`)]
    }
}
