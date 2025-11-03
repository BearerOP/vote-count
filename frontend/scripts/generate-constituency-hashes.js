const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Function to generate SHA256 hash
function generateSHA256Hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Read the generated constituencies data
const constituenciesPath = path.join(__dirname, 'data', 'generated-constituencies.json');
const constituencies = JSON.parse(fs.readFileSync(constituenciesPath, 'utf-8'));

// Generate hashes for each constituency
const constituencyLinks = {
  constituencies: []
};

Object.keys(constituencies).sort().forEach(key => {
  const constituency = constituencies[key];
  const hash = generateSHA256Hash(key);
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  constituencyLinks.constituencies.push({
    name: constituency.name,
    key: key,
    district: constituency.district,
    hashedUrl: `${baseUrl}/${hash}`,
    hash: hash,
    totalBooths: constituency.booths.length,
    totalVoters: constituency.booths.reduce((sum, booth) => {
      return sum + booth.pollingStations.reduce((pSum, ps) => pSum + ps.totalVoters, 0);
    }, 0)
  });
});

// Write to output file
const outputPath = path.join(__dirname, 'data', 'generated-constituency-links.json');
fs.writeFileSync(outputPath, JSON.stringify(constituencyLinks, null, 2), 'utf-8');

console.log('\n✅ Hash generation complete!');
console.log(`Generated links saved to: ${outputPath}`);
console.log(`\nGenerated hashes for ${constituencyLinks.constituencies.length} constituencies:\n`);

constituencyLinks.constituencies.forEach(c => {
  console.log(`${c.name} (${c.district})`);
  console.log(`  Key: ${c.key}`);
  console.log(`  Hash: ${c.hash}`);
  console.log(`  URL: ${c.hashedUrl}`);
  console.log(`  Booths: ${c.totalBooths} | Voters: ${c.totalVoters.toLocaleString()}`);
  console.log('');
});
