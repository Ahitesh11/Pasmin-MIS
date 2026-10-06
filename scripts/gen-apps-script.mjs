// Generates src/constants/appsScriptCode.ts from apps-script/Code.gs (the source of truth).
// Usage: npm run gen:apps-script
import { readFileSync, writeFileSync } from 'node:fs';

const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
new Function(code); // fail fast on a syntax error

const escaped = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const out = `/**
 * Google Apps Script backend for the Pasmin MIS Ranking app.
 * GENERATED from apps-script/Code.gs by scripts/gen-apps-script.mjs - do not edit by hand.
 */
export const APPS_SCRIPT_CODE = \`${escaped}\`;
`;

writeFileSync(new URL('../src/constants/appsScriptCode.ts', import.meta.url), out);
console.log(`appsScriptCode.ts generated (${code.split('\n').length} lines)`);
