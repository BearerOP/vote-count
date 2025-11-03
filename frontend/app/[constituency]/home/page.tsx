'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import constituencies from '@/data/constituencies.json';

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  const constituencyHash = params.constituency as string;

  const [constituency, setConstituency] = useState<any>(null);
  const [selectedBooth, setSelectedBooth] = useState<any>(null);
  const [selectedPS, setSelectedPS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [hasSubmittedVotes, setHasSubmittedVotes] = useState(false);

  // Vote counts
  const [totalVotes, setTotalVotes] = useState('');
  const [ndaVotes, setNdaVotes] = useState('');
  const [jsVotes, setJsVotes] = useState('');
  const [agbVotes, setMgbVotes] = useState('');
  const [othersVotes, setOthersVotes] = useState('');
  const [cumulativeVotes, setCumulativeVotes] = useState(0);
  const [voteError, setVoteError] = useState('');

  // Last submitted votes
  const [lastSubmittedVotes, setLastSubmittedVotes] = useState<any>(null);

  // Complaint fields
  const [complaintType, setComplaintType] = useState('');
  const [remarks, setRemarks] = useState('');

  const complaintOptions = [
    'ईवीएम छेड़छाड़ / EVM Tampering',
    'मतदाता धमकी / Voter Intimidation',
    'बूथ कैप्चरिंग / Booth Capturing',
    'अवैध प्रचार / Illegal Campaigning',
    'फर्जी मतदाता / Fake Voters',
    'अन्य / Other'
  ];

  useEffect(() => {
    async function loadConstituency() {
      const isAuth = sessionStorage.getItem('authenticated');
      const storedConstituency = sessionStorage.getItem('constituency');
      const boothData = sessionStorage.getItem('selectedBooth');
      const psData = sessionStorage.getItem('selectedPS');

      if (!isAuth || storedConstituency !== constituencyHash || !boothData || !psData) {
        router.push(`/${constituencyHash}`);
        return;
      }

      // First, try direct match
      let constituencyData = Object.entries(constituencies).find(
        ([key]) => key === constituencyHash
      );

      // If no direct match, check if it's a hash
      if (!constituencyData) {
        for (const [key, value] of Object.entries(constituencies)) {
          const encoder = new TextEncoder();
          const data = encoder.encode(key);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          if (hashHex === constituencyHash) {
            constituencyData = [key, value];
            break;
          }
        }
      }

      if (constituencyData) {
        setConstituency(constituencyData[1]);
      }

      setSelectedBooth(JSON.parse(boothData));
      setSelectedPS(JSON.parse(psData));
      setLoading(false);
    }

    loadConstituency();
  }, [constituencyHash, router]);

  // Debounce timer ref
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleNumberInput = (value: string, setter: (val: string) => void) => {
    // Only allow numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    setter(numericValue);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Re-validate with debounce (300ms delay)
    debounceTimer.current = setTimeout(() => {
      validateVoteCountsRealtime();
    }, 300);
  };

  const validateVoteCountsRealtime = () => {
    const total = totalVotes ? parseInt(totalVotes) : 0;
    const nda = ndaVotes ? parseInt(ndaVotes) : 0;
    const js = jsVotes ? parseInt(jsVotes) : 0;
    const agb = agbVotes ? parseInt(agbVotes) : 0;
    const others = othersVotes ? parseInt(othersVotes) : 0;

    const sum = nda + js + agb + others;
    const maxAllowedVotes = (selectedPS?.totalVoters || 0) + cumulativeVotes;

    // Check if total votes exceeds (registered voters + cumulative votes)
    if (total > maxAllowedVotes) {
      setVoteError(
        `कुल वोट (${total}) अधिकतम अनुमत वोटों (${maxAllowedVotes}) से अधिक नहीं हो सकते। [पंजीकृत: ${selectedPS?.totalVoters || 0} + संचयी: ${cumulativeVotes}]`
      );
      return false;
    }

    if (total > 0 && sum > total) {
      setVoteError(
        `कृपया कुल वोटों की दोबारा जांच करें। वोटों का योग (${sum}) आपके द्वारा दर्ज किए गए कुल वोटों (${total}) से अधिक है।`
      );
      return false;
    }

    setVoteError('');
    return true;
  };

  const validateVoteCounts = () => {
    const total = totalVotes ? parseInt(totalVotes) : 0;
    const nda = ndaVotes ? parseInt(ndaVotes) : 0;
    const js = jsVotes ? parseInt(jsVotes) : 0;
    const agb = agbVotes ? parseInt(agbVotes) : 0;
    const others = othersVotes ? parseInt(othersVotes) : 0;

    const sum = nda + js + agb + others;
    const maxAllowedVotes = (selectedPS?.totalVoters || 0) + cumulativeVotes;

    // Check if total votes exceeds (registered voters + cumulative votes)
    if (total > maxAllowedVotes) {
      setVoteError(
        `कुल वोट (${total}) अधिकतम अनुमत वोटों (${maxAllowedVotes}) से अधिक नहीं हो सकते। [पंजीकृत: ${selectedPS?.totalVoters || 0} + संचयी: ${cumulativeVotes}]`
      );
      return false;
    }

    if (total > 0 && sum > total) {
      setVoteError(
        `कृपया कुल वोटों की दोबारा जांच करें। वोटों का योग (${sum}) आपके द्वारा दर्ज किए गए कुल वोटों (${total}) से अधिक है।`
      );
      return false;
    }

    setVoteError('');
    return true;
  };

  const handleSubmitVotes = () => {
    // Total votes is mandatory
    if (!totalVotes) {
      alert('कुल वोट दर्ज करना अनिवार्य है / Total votes is mandatory');
      return;
    }

    // Check if all fields are empty
    if (!totalVotes && !ndaVotes && !jsVotes && !agbVotes && !othersVotes) {
      alert('कृपया कम से कम एक वोट गणना दर्ज करें / Please enter at least one vote count');
      return;
    }

    if (!validateVoteCounts()) {
      return;
    }

    const total = totalVotes ? parseInt(totalVotes) : 0;
    const js = jsVotes ? parseInt(jsVotes) : 0;
    const submittedData = {
      timestamp: new Date().toLocaleString('hi-IN'),
      jsVotes: js
    };

    setLastSubmittedVotes(submittedData);
    setCumulativeVotes(prev => prev + total);
    setHasSubmittedVotes(true);
    alert('वोट गणना सफलतापूर्वक सबमिट की गई! / Vote counts submitted successfully!');

    // Clear form fields
    setTotalVotes('');
    setNdaVotes('');
    setJsVotes('');
    setMgbVotes('');
    setOthersVotes('');

    // Redirect to booth selection page after 3 seconds
    setTimeout(() => {
      router.push(`/${constituencyHash}/select-booth`);
    }, 3000);
  };

  const handleRegisterComplaint = () => {
    if (!complaintType) {
      alert('कृपया शिकायत का प्रकार चुनें / Please select a complaint type');
      return;
    }

    if (!hasSubmittedVotes) {
      const confirmSubmit = window.confirm(
        'आपने अभी तक मतदान गणना सबमिट नहीं की है। क्या आप वोट विवरण सबमिट किए बिना शिकायत दर्ज करना चाहते हैं?\n\nYou have not submitted voting counts yet. Are you sure you want to register a complaint without submitting vote details?'
      );
      if (!confirmSubmit) {
        return;
      }
    }

    const complaintData = {
      type: complaintType,
      remarks,
      booth: selectedBooth,
      ps: selectedPS,
      timestamp: new Date().toISOString(),
      mobile: sessionStorage.getItem('mobile'),
    };

    console.log('Complaint registered:', complaintData);

    // Directly register and close - no second confirmation
    setShowComplaintDialog(false);
    alert('शिकायत सफलतापूर्वक दर्ज की गई! / Complaint registered successfully!');
    setComplaintType('');
    setRemarks('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="text-gray-800">लोड हो रहा है...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-2xl mx-auto py-4 space-y-3">
        {/* Header with Complaint Button */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-gray-900">
            मतदान गणना
          </h1>
          <button
            onClick={() => setShowComplaintDialog(true)}
            className="bg-red-600 text-white rounded-xl px-5 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            शिकायत
          </button>
        </div>

        {/* Hourly Reminder */}
        <div className="bg-amber-100 border border-amber-300 rounded-xl p-3">
          <p className="text-xs text-amber-900 font-medium">
            ⏰ अनुस्मारक: कृपया प्रत्येक घंटे मतदान गणना अपडेट करें
          </p>
        </div>

        {/* Location Info - No Labels */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="text-base font-semibold text-gray-900">
                {constituency?.district} • {constituency?.name}
              </div>
              <div className="text-sm text-gray-700">
                {selectedBooth?.name} - {selectedBooth?.number}
              </div>
              <div className="text-sm text-gray-600">
                {selectedPS?.name} ({selectedPS?.number})
              </div>
            </div>
            {lastSubmittedVotes && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <div className="text-xs text-green-700 text-center">जन सुराज</div>
                <div className="text-2xl font-bold text-green-900 text-center">
                  {lastSubmittedVotes.jsVotes || 0}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voter Count Summary - Compact */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-amber-50 rounded-xl p-2">
              <div className="text-lg font-bold text-amber-900">
                {selectedPS?.totalVoters || 0}
              </div>
              <div className="text-xs text-amber-700">
                पंजीकृत
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-2">
              <div className="text-lg font-bold text-green-900">
                {cumulativeVotes}
              </div>
              <div className="text-xs text-green-700">
                सबमिट किए गए
              </div>
            </div>
          </div>
        </div>

        {/* Last Submitted Votes - Timestamp Only */}
        {lastSubmittedVotes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2">
            <div className="flex items-center justify-center">
              <span className="text-xs text-blue-900 font-medium">
                पिछली सबमिशन: {lastSubmittedVotes.timestamp}
              </span>
            </div>
          </div>
        )}

        {/* Vote Entry Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            वोट गणना दर्ज करें
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                कुल वोट
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={totalVotes}
                onChange={(e) => handleNumberInput(e.target.value, setTotalVotes)}
                placeholder="0"
                className="w-28 bg-white border border-amber-300 rounded-lg px-3 py-2 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                NDA वोट
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={ndaVotes}
                onChange={(e) => handleNumberInput(e.target.value, setNdaVotes)}
                placeholder="0"
                className="w-28 bg-white border border-amber-300 rounded-lg px-3 py-2 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                जन सुराज वोट
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={jsVotes}
                onChange={(e) => handleNumberInput(e.target.value, setJsVotes)}
                placeholder="0"
                className="w-28 bg-white border border-amber-300 rounded-lg px-3 py-2 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                MGB वोट
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={agbVotes}
                onChange={(e) => handleNumberInput(e.target.value, setMgbVotes)}
                placeholder="0"
                className="w-28 bg-white border border-amber-300 rounded-lg px-3 py-2 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                अन्य
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={othersVotes}
                onChange={(e) => handleNumberInput(e.target.value, setOthersVotes)}
                placeholder="0"
                className="w-28 bg-white border border-amber-300 rounded-lg px-3 py-2 text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {voteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="text-xs text-red-700">{voteError}</p>
              </div>
            )}

            <button
              onClick={handleSubmitVotes}
              className="w-full bg-amber-500 text-white rounded-xl py-3 font-medium hover:bg-amber-600 transition-colors mt-2"
            >
              वोट गणना सबमिट करें
            </button>
          </div>
        </div>
      </div>

      {/* Complaint Dialog */}
      {showComplaintDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border-2 border-amber-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                शिकायत दर्ज करें
              </h2>
              <button
                onClick={() => setShowComplaintDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  शिकायत का प्रकार
                </label>
                <select
                  value={complaintType}
                  onChange={(e) => setComplaintType(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">शिकायत का प्रकार चुनें</option>
                  {complaintOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  टिप्पणी (वैकल्पिक)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="अतिरिक्त विवरण..."
                  rows={3}
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={handleRegisterComplaint}
                className="w-full bg-red-600 text-white rounded-xl py-3 font-medium hover:bg-red-700 transition-colors"
              >
                शिकायत दर्ज करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
