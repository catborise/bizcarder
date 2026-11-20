import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..');
const srcBase = path.join(frontendDir, 'src', 'i18n', 'locales');
const pubBase = path.join(frontendDir, 'public', 'locales');
const langs = ['en', 'tr'];
const checkOnly = process.argv.includes('--check');

function flattenKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
        const next = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            keys.push(...flattenKeys(v, next));
        } else {
            keys.push(next);
        }
    }
    return keys.sort();
}

let errors = 0;

// 1. Verify EN <-> TR key parity in source-of-truth files
const namespaces = fs
    .readdirSync(path.join(srcBase, 'en'))
    .filter((f) => f.endsWith('.json'))
    .sort();

for (const ns of namespaces) {
    const enJson = JSON.parse(fs.readFileSync(path.join(srcBase, 'en', ns), 'utf8'));
    const trJson = JSON.parse(fs.readFileSync(path.join(srcBase, 'tr', ns), 'utf8'));
    const enKeys = flattenKeys(enJson);
    const trKeys = flattenKeys(trJson);
    const missingInTr = enKeys.filter((k) => !trKeys.includes(k));
    const missingInEn = trKeys.filter((k) => !enKeys.includes(k));
    if (missingInTr.length || missingInEn.length) {
        console.error(`[i18n] Key mismatch in ${ns}:`, { missingInTr, missingInEn });
        errors++;
    }
}

// 2. Sync or check src/i18n/locales -> public/locales
for (const lang of langs) {
    const srcDir = path.join(srcBase, lang);
    const pubDir = path.join(pubBase, lang);
    if (!checkOnly) {
        fs.mkdirSync(pubDir, { recursive: true });
    }
    const files = fs
        .readdirSync(srcDir)
        .filter((f) => f.endsWith('.json'))
        .sort();
    for (const file of files) {
        const srcPath = path.join(srcDir, file);
        const pubPath = path.join(pubDir, file);
        const srcContent = fs.readFileSync(srcPath, 'utf8');
        if (checkOnly) {
            if (!fs.existsSync(pubPath)) {
                console.error(`[i18n] Missing public locale copy: ${lang}/${file}`);
                errors++;
                continue;
            }
            const srcObj = JSON.stringify(JSON.parse(srcContent));
            const pubObj = JSON.stringify(JSON.parse(fs.readFileSync(pubPath, 'utf8')));
            if (srcObj !== pubObj) {
                console.error(`[i18n] Public locale out of sync: ${lang}/${file}`);
                errors++;
            }
        } else {
            fs.writeFileSync(pubPath, srcContent, 'utf8');
        }
    }
}

if (errors > 0) {
    console.error(`[i18n] Failed with ${errors} error(s). Run "npm run sync:locales" to sync.`);
    process.exit(1);
}

console.log(
    checkOnly
        ? `[i18n] Verified ${namespaces.length} namespaces x ${langs.length} languages (100% parity & synced).`
        : `[i18n] Synced ${namespaces.length} namespaces x ${langs.length} languages to public/locales.`,
);
