const fs = require('fs');
const path = require('path');

function search(provider, terms) {
    const file = path.join(__dirname, `../dist/${provider}-icons.json`);
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return;
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const keys = Object.keys(data.icons);
    console.log(`\n--- ${provider} Search ---`);
    terms.forEach(term => {
        const matches = keys.filter(k => k.toLowerCase().includes(term.toLowerCase()));
        console.log(`Matches for "${term}":`, matches.slice(0, 5));
    });
}

// Azure missing
search('azure', ['purview', 'policy', 'bastion', 'waf', 'recovery', 'search', 'backup']);

// GCP missing
search('gcp', ['lb', 'load-balanc', 'retail', 'talent', 'source', 'transfer', 'interconnect', 'translation', 'vpc', 'vertex', 'platform', 'vision', 'spanner', 'trace']);
