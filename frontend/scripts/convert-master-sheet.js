const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Function to parse CSV properly handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Function to create a URL-friendly key from assembly name
function createAssemblyKey(assemblyName) {
  // Transliterate common Hindi words to English or create simple key
  const transliterationMap = {
    'सिंहेश्वर': 'sinheshwar',
    'पटना साहिब': 'patna-sahib',
    'बांकीपुर': 'bankipore'
    // Add more mappings as needed
  };

  if (transliterationMap[assemblyName]) {
    return transliterationMap[assemblyName];
  }

  // Fallback: create a simple key
  return assemblyName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '');
}

// Function to generate SHA256 hash
function generateSHA256Hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Read the CSV file
const csvPath = path.join(__dirname, 'data', 'masterSheet.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const lines = csvContent.split('\n');
const headers = parseCSVLine(lines[0]);

console.log('Processing masterSheet.csv...');
console.log('Headers:', headers);

// Parse all rows
const rows = [];
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim()) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 8) {
      const row = {
        assemblyNo: values[0],
        assemblyName: values[1],
        panchayat: values[2],
        boothNo: values[3],
        boothName: values[4],
        totalVoters: parseInt(values[5]) || 0,
        maleVoters: parseInt(values[6]) || 0,
        femaleVoters: parseInt(values[7]) || 0
      };
      rows.push(row);
    }
  }
}

console.log(`Parsed ${rows.length} rows`);

// Group by assembly
const assembliesMap = {};

rows.forEach(row => {
  const assemblyKey = createAssemblyKey(row.assemblyName);

  if (!assembliesMap[assemblyKey]) {
    assembliesMap[assemblyKey] = {
      name: row.assemblyName,
      district: '', // Will need to be filled manually or from another source
      mobileNumbers: ["8302524658", "9518074060"], // Default mobile numbers
      booths: {}
    };
  }

  const assembly = assembliesMap[assemblyKey];

  // Group by booth number
  if (!assembly.booths[row.boothNo]) {
    assembly.booths[row.boothNo] = {
      name: row.boothName,
      number: row.boothNo,
      panchayat: row.panchayat,
      totalVoters: row.totalVoters
    };
  }
});

// Convert to final format
const finalConstituencies = {};

Object.keys(assembliesMap).sort().forEach(key => {
  const assembly = assembliesMap[key];
  const booths = [];

  // Sort booth numbers
  const sortedBoothNos = Object.keys(assembly.booths).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  sortedBoothNos.forEach(boothNo => {
    const booth = assembly.booths[boothNo];

    // Pad booth number to 3 digits
    const paddedBoothNo = boothNo.padStart(3, '0');

    booths.push({
      name: booth.name,
      number: paddedBoothNo,
      pollingStations: [
        {
          name: booth.name,
          number: `${paddedBoothNo}-A`,
          totalVoters: booth.totalVoters
        }
      ]
    });
  });

  // You can update district manually here or read from a config
  const districtName = assembly.district || 'मधुबनी'; // Default district

  finalConstituencies[key] = {
    name: assembly.name,
    district: districtName,
    mobileNumbers: assembly.mobileNumbers,
    booths: booths
  };
});

// Write constituencies JSON
const constituenciesOutputPath = path.join(__dirname, 'data', 'constituencies.json');
fs.writeFileSync(constituenciesOutputPath, JSON.stringify(finalConstituencies, null, 2), 'utf-8');

console.log('\n✅ Conversion complete!');
console.log(`Constituencies JSON saved to: ${constituenciesOutputPath}`);

// Generate hashes
const constituencyLinks = {
  constituencies: []
};

Object.keys(finalConstituencies).sort().forEach(key => {
  const constituency = finalConstituencies[key];
  const hash = generateSHA256Hash(key);
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  const totalBooths = constituency.booths.length;
  const totalVoters = constituency.booths.reduce((sum, booth) => {
    return sum + booth.pollingStations.reduce((pSum, ps) => pSum + ps.totalVoters, 0);
  }, 0);

  constituencyLinks.constituencies.push({
    name: constituency.name,
    key: key,
    district: constituency.district,
    hashedUrl: `${baseUrl}/${hash}`,
    hash: hash,
    totalBooths: totalBooths,
    totalVoters: totalVoters
  });
});

// Write constituency links JSON
const linksOutputPath = path.join(__dirname, 'data', 'constituency-links.json');
fs.writeFileSync(linksOutputPath, JSON.stringify(constituencyLinks, null, 2), 'utf-8');

console.log(`Constituency links saved to: ${linksOutputPath}`);
console.log(`\n📊 Summary:\n`);

constituencyLinks.constituencies.forEach(c => {
  console.log(`${c.name} (${c.district || 'District TBD'})`);
  console.log(`  Key: ${c.key}`);
  console.log(`  Hash: ${c.hash}`);
  console.log(`  URL: ${c.hashedUrl}`);
  console.log(`  Booths: ${c.totalBooths} | Voters: ${c.totalVoters.toLocaleString()}`);
  console.log('');
});

console.log(`\n🎯 Total Assemblies: ${constituencyLinks.constituencies.length}`);
console.log(`🎯 Total Booths: ${constituencyLinks.constituencies.reduce((sum, c) => sum + c.totalBooths, 0)}`);
console.log(`🎯 Total Voters: ${constituencyLinks.constituencies.reduce((sum, c) => sum + c.totalVoters, 0).toLocaleString()}`);
