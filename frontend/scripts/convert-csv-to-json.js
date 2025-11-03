const fs = require('fs');
const path = require('path');

// Function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });

    data.push(row);
  }

  return data;
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// Function to convert AC name to key
function convertToKey(acName) {
  // Extract AC name from "AC No. - AC Name [District]" format
  // Example: "1-Valmiki Nagar [1-Paschim Champaran]" -> "valmiki-nagar"
  const match = acName.match(/\d+-(.+?)\s*\[/);
  if (match) {
    return match[1].trim().toLowerCase().replace(/\s+/g, '-');
  }
  return acName.toLowerCase().replace(/\s+/g, '-');
}

// Function to extract AC name without district
function extractACName(acName) {
  // Extract "Valmiki Nagar" from "1-Valmiki Nagar [1-Paschim Champaran]"
  const match = acName.match(/\d+-(.+?)\s*\[/);
  if (match) {
    return match[1].trim();
  }
  return acName;
}

// Function to extract district name
function extractDistrict(acName) {
  // Extract "Paschim Champaran" from "1-Valmiki Nagar [1-Paschim Champaran]"
  const match = acName.match(/\[.*?-(.+?)\]/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

// Main conversion function
function convertCSVToJSON(csvFilePath, mobileNumbers = []) {
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const rows = parseCSV(csvContent);

  const constituencies = {};

  // Group by AC and Polling Station No., tracking Main and Auxiliary entries
  rows.forEach(row => {
    const acFullName = row['AC No. & Name'];
    const pollingStationNo = row['Polling Station No.'];
    const pollingStationName = row['Polling Station Name'];
    const mainOrAux = row['Main/Auxiliary Polling Station (M/A)'];
    const electorToRaw = row['Elector Serial No. To'];
    const electorTo = Number.isFinite(parseInt(electorToRaw)) ? parseInt(electorToRaw) : 0;

    if (!acFullName || !pollingStationNo) return;

    const acKey = convertToKey(acFullName);
    const acName = extractACName(acFullName);
    const district = extractDistrict(acFullName);

    // Initialize constituency if not exists
    if (!constituencies[acKey]) {
      constituencies[acKey] = {
        name: acName,
        district: district,
        mobileNumbers: mobileNumbers,
        booths: {}
      };
    }

    // Initialize booth group if not exists
    if (!constituencies[acKey].booths[pollingStationNo]) {
      constituencies[acKey].booths[pollingStationNo] = {
        main: null,
        auxiliaries: []
      };
    }

    const boothGroup = constituencies[acKey].booths[pollingStationNo];
    const entry = {
      name: pollingStationName,
      voters: electorTo
    };

    // Store Main or Auxiliary entry
    if (mainOrAux === 'Main') {
      boothGroup.main = entry;
    } else if (mainOrAux === 'Auxiliary') {
      boothGroup.auxiliaries.push(entry);
    }
  });

  // Finalize structure: Main becomes the booth, Auxiliaries become polling stations
  Object.keys(constituencies).forEach(key => {
    const boothGroups = constituencies[key].booths;
    const finalBooths = [];

    // Sort booth numbers numerically
    const sortedBoothNos = Object.keys(boothGroups).sort((a, b) => parseInt(a) - parseInt(b));

    sortedBoothNos.forEach(boothNo => {
      const group = boothGroups[boothNo];

      if (!group.main) return; // Skip if no Main entry

      const pollingStations = [];

      // If there are auxiliary stations, add Main and Auxiliaries as separate polling stations
      if (group.auxiliaries.length > 0) {
        // Add Main as first polling station
        pollingStations.push({
          name: group.main.name,
          number: `${boothNo}-A`,
          totalVoters: group.main.voters
        });

        // Add Auxiliaries as subsequent polling stations
        group.auxiliaries.forEach((aux, index) => {
          pollingStations.push({
            name: aux.name,
            number: `${boothNo}-${String.fromCharCode(66 + index)}`, // B, C, D, etc.
            totalVoters: aux.voters
          });
        });
      } else {
        // No auxiliaries, just add Main as single polling station
        pollingStations.push({
          name: 'मतदान केंद्र 1',
          number: `${boothNo}-A`,
          totalVoters: group.main.voters
        });
      }

      // Calculate max voters for the booth (max of all polling stations)
      const maxVoters = Math.max(...pollingStations.map(ps => ps.totalVoters));

      finalBooths.push({
        name: group.main.name,
        number: boothNo,
        pollingStations: pollingStations
      });
    });

    constituencies[key].booths = finalBooths;
  });

  return constituencies;
}

// Main execution
const csvFilePath = process.argv[2] || '/Users/bearer/Downloads/Jan Suraaj/vote-count/frontend/data/1-Paschim Champaran - Sheet1.csv';
const outputFilePath = process.argv[3] || '/Users/bearer/Downloads/Jan Suraaj/vote-count/frontend/data/generated-constituencies.json';

// You can add default mobile numbers here
const defaultMobileNumbers = [
  "8302524658",
  "9518074060"
];

console.log(`Reading CSV from: ${csvFilePath}`);

try {
  const result = convertCSVToJSON(csvFilePath, defaultMobileNumbers);

  fs.writeFileSync(outputFilePath, JSON.stringify(result, null, 2));

  console.log(`\nConversion successful!`);
  console.log(`Output written to: ${outputFilePath}`);
  console.log(`\nSummary:`);

  Object.keys(result).forEach(key => {
    const constituency = result[key];
    const totalBooths = constituency.booths.length;
    const totalPS = constituency.booths.reduce((sum, booth) => sum + booth.pollingStations.length, 0);
    const totalVoters = constituency.booths.reduce((sum, booth) => {
      return sum + booth.pollingStations.reduce((pSum, ps) => pSum + ps.totalVoters, 0);
    }, 0);

    console.log(`\n${constituency.name} (${constituency.district}):`);
    console.log(`  - Key: ${key}`);
    console.log(`  - Total Booths: ${totalBooths}`);
    console.log(`  - Total Polling Stations: ${totalPS}`);
    console.log(`  - Total Voters: ${totalVoters}`);
  });

} catch (error) {
  console.error('Error converting CSV:', error.message);
  process.exit(1);
}
