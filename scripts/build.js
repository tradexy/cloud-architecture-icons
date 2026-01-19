const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { importDirectory, cleanupSVG, runSVGO, isEmptyColor, parseColors } = require('@iconify/tools');

const CONFIG = require('./naming-conventions.json');
const SOURCE_DIR = path.join(__dirname, '../source');
const DIST_DIR = path.join(__dirname, '../dist');

async function downloadFile(url, dest) {
    console.log(`Downloading ${url}...`);
    const writer = fs.createWriteStream(dest);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function prepareSource(provider) {
    const providerDir = path.join(SOURCE_DIR, provider);
    await fs.ensureDir(providerDir);

    // Azure: Download if empty
    if (provider === 'azure' && (await fs.readdir(providerDir)).length === 0) {
        console.log('Fetching official Azure icons...');
        const zipPath = path.join(SOURCE_DIR, 'azure.zip');
        await downloadFile(CONFIG.azure.sourceUrl, zipPath);

        console.log('Extracting Azure icons...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(providerDir, true); // Extract basic

        // Flatten: Azure zip is often nested. Find SVGs and move them to root of providerDir
        // Simple flatten strategy
        const files = await fs.readdir(providerDir, { recursive: true });
        // This is complex because AdmZip extract might vary. 
        // Let's rely on importDirectory's recursive ability if possible, or just flatten now.
    }

    // AWS: Download from official source
    if (provider === 'aws' && (await fs.readdir(providerDir)).length === 0) {
        console.log('Fetching official AWS icons...');
        const zipPath = path.join(SOURCE_DIR, 'aws.zip');
        await downloadFile(CONFIG.aws.sourceUrl, zipPath);

        console.log('Extracting AWS icons...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(providerDir, true);
    }

    // GCP: Download from Community Mirror
    if (provider === 'gcp' && (await fs.readdir(providerDir)).length === 0) {
        console.log('Fetching generic GCP icons (Community)...');
        // Using AwesomeLogos repo which is a clean source of SVGs
        const zipPath = path.join(SOURCE_DIR, 'gcp.zip');
        await downloadFile('https://github.com/AwesomeLogos/google-cloud-icons/archive/refs/heads/master.zip', zipPath);

        console.log('Extracting GCP icons...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(providerDir, true);

        // Flatten logic might be needed if they are deeply nested, 
        // but importDirectory with includeSubDirs: true usually handles it.
    }
}

async function buildProvider(provider) {
    console.log(`\n--- Building ${provider} ---`);
    const providerConfig = CONFIG[provider];
    const sourcePath = path.join(SOURCE_DIR, provider);

    // 1. Prepare
    await prepareSource(provider);

    // 2. Import
    // Check if dir exists and has files
    if (!fs.existsSync(sourcePath) || (await fs.readdir(sourcePath)).length === 0) {
        console.log(`Skipping ${provider}: No source files.`);
        return;
    }

    const iconSet = await importDirectory(sourcePath, {
        prefix: provider, // Use provider name as prefix (aws, azure, gcp)
        includeSubDirs: true // Azure/GCP/AWS often use subfolders
    });

    // 3. Process
    await iconSet.forEach(async (name, type) => {
        if (type !== 'icon') return;
        const svg = iconSet.toSVG(name);

        // Cleanup
        try {
            await cleanupSVG(svg);
            await runSVGO(svg);
            await parseColors(svg, {
                defaultColor: 'currentColor',
                callback: (attr, colorStr, color) => {
                    // Force colored icons to keep color? Or standard mono?
                    // For Architecture diagrams, we usually WANT original colors.
                    // So we might return colorStr (unchanged).
                    return colorStr;
                }
            });
            iconSet.fromSVG(name, svg);
        } catch (err) {
            console.error(`Error processing ${name}:`, err);
            iconSet.remove(name);
        }
    });

    // 4. Aliases
    if (providerConfig.aliases) {
        Object.entries(providerConfig.aliases).forEach(([file, alias]) => {
            // Find the key that matches this filename (Iconify import might sanitize names)
            // This part is tricky without knowing exact sanitized names.
            // Simple match:
            const saneName = file.replace('.svg', '').toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (iconSet.exists(saneName)) {
                iconSet.setAlias(alias, saneName);
                console.log(`Alias: ${alias} -> ${saneName}`);
            } else {
                // Try looking for it
                const found = iconSet.list().find(i => i.includes(saneName));
                if (found) {
                    iconSet.setAlias(alias, found);
                    console.log(`Alias (fuzzy): ${alias} -> ${found}`);
                }
            }
        });
    }

    // 5. Export
    const output = iconSet.export();
    const destFile = path.join(DIST_DIR, `${provider}-icons.json`);
    await fs.writeJSON(destFile, output);
    console.log(`✅ Generated ${provider}-icons.json with ${iconSet.count()} icons`);
}

(async () => {
    await fs.ensureDir(SOURCE_DIR);
    await fs.ensureDir(DIST_DIR);

    await buildProvider('aws');
    await buildProvider('azure');
    await buildProvider('gcp');
})();
