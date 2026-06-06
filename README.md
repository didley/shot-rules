```
 ███████╗██╗  ██╗ ██████╗ ████████╗
 ██╔════╝██║  ██║██╔═══██╗╚══██╔══╝
 ███████╗███████║██║   ██║   ██║   
 ╚════██║██╔══██║██║   ██║   ██║   
 ███████║██║  ██║╚██████╔╝   ██║   
 ╚══════╝╚═╝  ╚═╝ ╚═════╝    ╚═╝   
 TypeScript, one way.
```
Shot extracts features from TypeScript, applying Go's "one canonical way" philosophy to the TS/JS ecosystem.
Making coding easier for humans and LLMs.

--

Echosystem:

**[ShotScript](https://github.com/didley/ShotScript)** — Full opinionated toolchain: `.shot` file extension, `shot` CLI, Bun runtime, `shot:std` stdlib, and import allowlist. Start new projects with `shot init` — no config, no overrides.

**[ShotLint](https://github.com/didley/ShotLint)** — Bring Shot principles to existing TypeScript projects: 90+ lint rules as `tsc` errors via TypeScript plugin, shareable Biome config, and safe util wrappers. No new extension or runtime required.

# ShotLint

This Package:

| | |
|---|---|
| **Rules** | 90+ AST rules enforced via TypeScript plugin — surfaces as `tsc` errors in CI and editor squiggles locally, no ESLint, no Biome lock-in |
| **Formatting** | Shareable Biome config — no semicolons, single quotes, 4-space indent |
| **Utils** | Safe replacements for every banned global (`jsonParse`, `safeFetch`, `tryCatch`, …) |
| **`AGENTS.md`** | Drop-in context file so AI coding assistants generate compliant code from the start |

---

## Install

**npm** · [npmjs.com/package/shot-lint](https://www.npmjs.com/package/shot-lint)
```sh
npm install --save-dev shot-lint
```

Add the plugin and extend the strict tsconfig in `tsconfig.json`:
```json
{
    "extends": "shot-lint/tsconfig/shot-lint.json",
    "compilerOptions": {
        "plugins": [{ "name": "shot-lint/plugin" }]
    }
}
```

Violations surface as `tsc` errors — caught in CI automatically and as red squiggles in any editor that uses tsserver.

## What changes

**Errors as values — failure is in the return type**
```ts
// ❌ before — caller can't see this throws; nothing in the type says so
async function getUser(id: number): Promise<User> {
    const res = await fetch(`/users/${id}`)
    return res.json() as User
}

// ✅ after — every failure path is explicit; the compiler tracks it
async function getUser(id: number): Promise<[User | null, Error | null]> {
    const [res, fetchErr] = await safeFetch(`/users/${id}`)
    if (fetchErr !== null) { return [null, fetchErr] }
    return jsonParse<User>(await res.text())
}
```

**`null` only — no `undefined`**
```ts
// ❌ before — three ways to say "nothing": undefined, ?, | undefined
type User = { id: number; avatar?: string; deletedAt?: Date }
function findUser(id?: number): User | undefined { ... }

// ✅ after — one absence value, used consistently everywhere
type User = { readonly id: number; readonly avatar: string | null; readonly deletedAt: Date | null }
function findUser(id: number): [User | null, Error | null] { ... }
```

**No complex types — compose, don't extend**
```ts
// ❌ before — intersection to "extend" a base type
type User = { readonly id: number; readonly name: string }
type AdminUser = User & { readonly role: 'admin' }

// ✅ after — embed as a named field (Go/Rust-style composition)
type User = { readonly id: number; readonly name: string }
type AdminUser = { readonly user: User; readonly role: 'admin' }

// access: admin.user.id  not  admin.id
```

**Immutable by default**
```ts
// ❌ before — any function can mutate these; nothing in the type stops it
type Config = { host: string; port: number }
const ids: number[] = []

// ✅ after — readonly at the type level; the compiler enforces it
type Config = { readonly host: string; readonly port: number }
const ids: ReadonlyArray<number> = []
```

**No escape hatches**
```ts
// ❌ before — type safety is optional; any and as let you opt out silently
function parseConfig(raw: any): Config { return raw as Config }
const el = document.getElementById('app')!

// ✅ after — unknown at boundaries; no casting, no non-null assertions
function parseConfig(raw: unknown): [Config | null, Error | null] { ... }
const el = document.getElementById('app')
if (el === null) { return [null, new Error('missing #app')] }
```

## Rules

| Category | Highlights |
|---|---|
| Functions | `no-arrow-functions` `require-named-functions` `require-explicit-return-type` |
| Variables | `no-var` `no-let-outside-for` `no-increment-decrement` |
| Error handling | `no-throw` `no-try` `no-promise` `no-promise-chain` `no-floating-promises` `require-tuple-destructure` |
| Types | `no-any` `no-assertion` `no-non-null` `no-ts-comment` `no-interface` `no-enum` |
| Immutability | `require-readonly-property` `require-readonly-arrays` |
| Type shape | `no-optional-property` `no-optional-parameter` `no-undefined-type` |
| OOP / meta | `no-class` `no-abstract` `no-decorators` `no-this` `no-metaprogramming-globals` |
| Type complexity | `no-conditional-type` `no-mapped-type` `no-infer` `no-intersection-types` |
| Control flow | `no-ternary` `no-do-while` `no-for-in` `switch-no-fallthrough` |
| Operators | `no-bitwise` `no-eval` `no-generators` `no-comma-operator` |
| Lint | `no-shadow` `no-param-reassign` `no-multi-var-decl` |
| Hygiene | `no-empty` `no-loop-func` `no-self-compare` `prefer-template` |
| Globals | `no-throwing-globals` — bans `JSON.parse`, `JSON.stringify`, `fetch` |
| Imports | `no-require` `no-default-export` `no-index-import` |
| Canonical forms | `no-array-generic` `no-banned-utility-types` `no-primitive-wrapper-types` |

Full rationale and before/after examples for every rule: [`docs/LANGUAGE.md`](https://github.com/didley/ShotScript/blob/main/docs/LANGUAGE.md).

> **VSCode**: open the command palette → _TypeScript: Select TypeScript Version_ → _Use Workspace Version_. Without this, VSCode uses its bundled TypeScript which won't load the plugin.

---

## Formatting

Shot's format: **no semicolons · single quotes · 4-space indent · 80 char lines**.

Linting and formatting are separate concerns — shot-lint owns the rules, your formatter of choice owns the presentation. Pick one:

**Biome** (recommended — fast, one tool)
```json
{ "extends": ["shot-lint/biome"] }
```
Biome's linter is disabled in the exported config — shot-lint handles linting.

---

## Strict tsconfig

Ships a `tsconfig/shot-lint.json` with everything above `strict: true` — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and more.

## Runtime utils

The rules ban `JSON.parse`, `JSON.stringify`, and `fetch` because they throw. `shot-lint/utils` provides the safe replacements — all return `[value, null] | [null, Error]`.

```ts
import { toResult, toPromiseResult, jsonParse, jsonStringify, safeFetch } from "shot-lint/utils"

// third-party calls that might throw or reject
const [val, err] = toResult(() => someLib.parse(input))
const [val, err] = await toPromiseResult(() => db.query(sql))

// banned globals → safe wrappers
const [data, err]  = jsonParse<Config>(text)
const [json, err]  = jsonStringify(payload)
const [res, err]   = await safeFetch("https://api.example.com/users/1")
```

`Result<T>` and `PromiseResult<T>` are exported for typing your own fallible functions:
```ts
import type { Result, PromiseResult } from "shot-lint/utils"

function divide(a: number, b: number): Result<number> {
    if (b === 0) { return [null, new Error("division by zero")] }
    return [a / b, null]
}

async function fetchUser(id: number): PromiseResult<User> {
    const [res, err] = await safeFetch(`/users/${id.toString()}`)
    if (err !== null) { return [null, err] }
    return jsonParse<User>(await res.text())
}
```

## Examples

Working projects in [`examples/`](./examples/):

| | |
|---|---|
| [`hello-world`](./examples/hello-world/) | Minimal setup |
| [`fetch-user`](./examples/fetch-user/) | `safeFetch` + `jsonParse` error chain |
| [`calculator`](./examples/calculator/) | `Result<T>` tuple returns |

## Replacing existing tools

shot-lint replaces ESLint entirely, and replaces the linter portion of Biome. Keep whichever formatter you prefer.

**Replacing ESLint**
```sh
npm uninstall eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
rm -f eslint.config.js .eslintrc.js .eslintrc.json .eslintignore
```

**Disabling Biome's linter** (keep Biome for formatting only)

In `biome.json`, set `"linter": { "enabled": false }` — or extend `shot-lint/biome` which sets this automatically.


---

## Development

```sh
git clone https://github.com/didley/shot-lint
cd shot-lint && npm install
npm run build && npm test
```

## License

MIT
