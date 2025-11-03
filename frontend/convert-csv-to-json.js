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

  rows.forEach(row => {
    const acFullName = row['AC No. & Name'];
    const pollingStationNo = row['Polling Station No.'];
    const pollingStationName = row['Polling Station Name'];
    const mainAux = row['Main/Auxiliary Polling Station (M/A)'];
    const electorTo = parseInt(row['Elector Serial No. To']);

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
        booths: []
      };
    }

    // Find or create booth
    let booth = constituencies[acKey].booths.find(b => b.number === pollingStationNo);
    if (!booth) {
      booth = {
        name: pollingStationName,
        number: pollingStationNo,
        pollingStations: []
      };
      constituencies[acKey].booths.push(booth);
    }

    // Determine polling station label
    let psLabel;
    if (mainAux === 'Main' && booth.pollingStations.length === 0) {
      psLabel = 'मुख्य मतदान केंद्र';
    } else {
      psLabel = `मतदान केंद्र ${booth.pollingStations.length + 1}`;
    }

    // Add polling station
    const psNumber = `${pollingStationNo}-${String.fromCharCode(65 + booth.pollingStations.length)}`;
    booth.pollingStations.push({
      name: psLabel,
      number: psNumber,
      totalVoters: electorTo
    });
  });

  // Clean up: For booths with single polling station, keep the max voter count
  // For booths with multiple polling stations, keep individual counts
  Object.keys(constituencies).forEach(key => {
    constituencies[key].booths.forEach(booth => {
      if (booth.pollingStations.length === 1) {
        // Single polling station - keep as is
      } else {
        // Multiple polling stations - ensure proper numbering
        booth.pollingStations.forEach((ps, index) => {
          ps.name = `मतदान केंद्र ${index + 1}`;
        });
      }
    });

    // Sort booths by number
    constituencies[key].booths.sort((a, b) => {
      return parseInt(a.number) - parseInt(b.number);
    });
  });

  return constituencies;
}

// Main execution
const csvFilePath = process.argv[2] || '/Users/bearer/Downloads/Jan Suraaj/my-app/data/1-Paschim Champaran - Sheet1.csv';
const outputFilePath = process.argv[3] || '/Users/bearer/Downloads/Jan Suraaj/my-app/data/generated-constituencies.json';

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
