'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import constituencies from '@/data/constituencies.json';

export default function SelectBoothPage() {
  const router = useRouter();
  const params = useParams();
  const constituencyHash = params.constituency as string;

  const [constituency, setConstituency] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooth, setSelectedBooth] = useState<any>(null);
  const [selectedPS, setSelectedPS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConstituency() {
      const isAuth = sessionStorage.getItem('authenticated');
      const storedConstituency = sessionStorage.getItem('constituency');

      if (!isAuth || storedConstituency !== constituencyHash) {
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

      setLoading(false);
    }

    loadConstituency();
  }, [constituencyHash, router]);

  const filteredBooths = constituency?.booths?.filter((booth: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      booth.name.toLowerCase().includes(searchLower) ||
      booth.number.includes(searchTerm)
    );
  }) || [];

  const handleBoothSelect = (booth: any) => {
    setSelectedBooth(booth);
    setSelectedPS(null);
  };

  const handlePSSelect = (ps: any) => {
    setSelectedPS(ps);
  };

  const handleProceed = () => {
    if (!selectedBooth) {
      alert('कृपया एक बूथ चुनें');
      return;
    }

    if (selectedBooth.pollingStations.length > 1 && !selectedPS) {
      alert('कृपया एक मतदान केंद्र चुनें');
      return;
    }

    const psToSave = selectedBooth.pollingStations.length === 1
      ? selectedBooth.pollingStations[0]
      : selectedPS;

    sessionStorage.setItem('selectedBooth', JSON.stringify(selectedBooth));
    sessionStorage.setItem('selectedPS', JSON.stringify(psToSave));

    router.push(`/${constituencyHash}/home`);
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
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            अपना बूथ चुनें
          </h1>
          <p className="text-sm text-gray-600">
            {constituency?.name}, {constituency?.district}
          </p>
          <p className="text-sm font-medium text-amber-600 mt-1 mb-6">
            कुल बूथ: {constituency?.booths?.length || 0}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                बूथ नाम या नंबर से खोजें
              </label>
              <input
                type="text"
                placeholder="बूथ खोजें..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBooths.map((booth: any) => (
                <div
                  key={booth.number}
                  onClick={() => handleBoothSelect(booth)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedBooth?.number === booth.number
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-200'
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {booth.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    बूथ नं: {booth.number}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {booth.pollingStations.length} मतदान केंद्र
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedBooth && selectedBooth.pollingStations.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              मतदान केंद्र चुनें
            </h2>
            <div className="space-y-2">
              {selectedBooth.pollingStations.map((ps: any) => (
                <div
                  key={ps.number}
                  onClick={() => handlePSSelect(ps)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPS?.number === ps.number
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-200'
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {ps.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    मतदान केंद्र नं: {ps.number}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    कुल मतदाता: {ps.totalVoters}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleProceed}
          disabled={!selectedBooth || (selectedBooth?.pollingStations.length > 1 && !selectedPS)}
          className="w-full bg-amber-500 text-white rounded-xl py-3 font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          आगे बढ़ें
        </button>
      </div>
    </div>
  );
}
