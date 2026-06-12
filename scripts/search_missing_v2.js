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
    console.log(`--- ${provider} Search ---`);
    terms.forEach(term => {
        const matches = keys.filter(k => k.toLowerCase().includes(term.toLowerCase()));
        console.log(`Matches for "${term}":`, matches.slice(0, 10));
    });
}

search('aws', ['efs', 'glacier', 'elasticache', 'cache']);
search('gcp', ['iam', 'identity']);
search('azure', ['monitor', 'entra', 'active-directory']);
