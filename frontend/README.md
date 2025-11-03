# Jan Suraaj - Assembly Constituency Voting System

A Next.js application for assembly constituency-based voting count tracking and complaint management.

## Features

- Dynamic constituency-based routing with hash support
- Mobile number authentication with OTP verification
- Booth and Polling Station selection with dependent dropdowns
- Vote counting by party/alliance
- Real-time cumulative vote tracking
- Complaint registration system
- Mobile-friendly responsive design with light theme
- Mock OTP system (no actual SMS sent)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Flow

### 1. Login Page (`/[constituency]`)
- User receives a hashed constituency link
- Page displays the Assembly Constituency name and district
- User enters their mobile number
- System validates if mobile number exists in the constituency's authorized list
- Mock OTP is sent (displayed in alert for testing)
- User enters OTP to authenticate

### 2. Booth Selection Page (`/[constituency]/select-booth`)
- User searches and selects their booth by name or number
- If booth has multiple polling stations, user selects their specific polling station
- System shows total registered voters for selected polling station

### 3. Home Page (`/[constituency]/home`)
- Displays location information: District, AC, Booth, and Polling Station
- Shows Total Voters Count and Cumulative Votes Submitted
- Vote entry form for: Total Votes, NDA Votes, JS Votes, MGB Votes, Others
- Submit button to record vote counts
- **Complaint Button** at top opens dialog for registering complaints

### 4. Complaint Dialog
- Dropdown with predefined complaint types (EVM Tampering, Voter Intimidation, etc.)
- Optional remarks field
- Validates that vote counts are submitted before allowing complaint registration

## Test Credentials

**Patna Sahib (`/patna-sahib`):**
- Valid mobile numbers: 9876543210, 9876543211, 9876543212
- District: Patna
- 3 booths with polling stations

**Bankipore (`/bankipore`):**
- Valid mobile numbers: 9876543213, 9876543214, 9876543215
- District: Patna
- 2 booths with polling stations

## Project Structure

```
my-app/
├── app/
│   ├── [constituency]/
│   │   ├── page.tsx              # Login with OTP
│   │   ├── select-booth/
│   │   │   └── page.tsx          # Booth & PS selection
│   │   └── home/
│   │       └── page.tsx          # Vote counting & complaints
│   ├── page.tsx                  # Landing page
│   └── layout.tsx                # Root layout
├── data/
│   └── constituencies.json       # Constituency data
├── lib/
│   └── utils.ts                  # Utility functions
└── public/
    └── Screenshot...png          # UI reference
```

## Adding New Constituencies

Edit `data/constituencies.json`:

```json
{
  "constituency-key": {
    "name": "Constituency Name",
    "district": "District Name",
    "mobileNumbers": ["9876543210"],
    "booths": [
      {
        "name": "Booth Name",
        "number": "001",
        "pollingStations": [
          {
            "name": "PS 1",
            "number": "001-A",
            "totalVoters": 1500
          }
        ]
      }
    ]
  }
}
```

## Design

- Light theme with gray-50 background
- White cards with rounded corners (rounded-2xl)
- Blue accent color for primary actions
- Red accent for complaints
- Fully responsive and mobile-friendly
- Clean, minimal interface without animations

## Technologies

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- sessionStorage for state management

## Notes

- Mock OTP displayed in browser alert (console.log for dev)
- No backend required - all data in JSON
- SHA256 hashing utility available for secure links
- First-time complaint requires vote submission
