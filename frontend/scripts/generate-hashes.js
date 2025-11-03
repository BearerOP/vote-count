import crypto from 'crypto';

const constituencies = [
  'patna-sahib',
  'bankipore'
];

console.log('\n=== Constituency Hash URLs ===\n');

constituencies.forEach(constituency => {
  const hash = crypto.createHash('sha256').update(constituency).digest('hex');
  console.log(`${constituency}:`);
  console.log(`  Original URL: http://localhost:3000/${constituency}`);
  console.log(`  Hashed URL:   http://localhost:3000/${hash}`);
  console.log('');
});
