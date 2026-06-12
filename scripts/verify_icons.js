const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, '../../../a_cloud_provider_tests.md');
const DIST_DIR = path.join(__dirname, '../dist');

const providers = ['aws', 'azure', 'gcp'];
const iconPacks = {};

// Load JSON packs
providers.forEach(p => {
    const filePath = path.join(DIST_DIR, `${p}-icons.json`);
    if (fs.existsSync(filePath)) {
        iconPacks[p] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
});

function verify() {
    if (!fs.existsSync(TEST_FILE)) {
        console.error('Test file not found:', TEST_FILE);
        return;
    }

    const content = fs.readFileSync(TEST_FILE, 'utf8');
    const regex = /service\s+\w+\((aws|azure|gcp):([^)]+)\)/g;
    let match;
    const results = { ok: [], missing: [] };

    console.log('--- Icon Verification Report ---\n');

    while ((match = regex.exec(content)) !== null) {
        const provider = match[1];
        const key = match[2];
        const pack = iconPacks[provider];

        if (!pack) {
            console.error(`Pack not found for provider: ${provider}`);
            continue;
        }

        // Check icons and aliases (Iconify format)
        const exists = pack.icons[key] || (pack.aliases && pack.aliases[key]);

        if (exists) {
            results.ok.push(`${provider}:${key}`);
        } else {
            results.missing.push(`${provider}:${key}`);
        }
    }

    console.log(`✅ OK: ${results.ok.length}`);
    console.log(`❌ MISSING: ${results.missing.length}`);

    if (results.missing.length > 0) {
        console.log('\n--- Missing Icons Details ---');
        results.missing.forEach(m => console.log(`[ ] ${m}`));
    } else {
        console.log('\nAll icons verified successfully in JSON packs!');
    }
}

verify();
