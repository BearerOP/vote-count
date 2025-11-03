'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import constituencies from '@/data/constituencies.json';
import { validateMobileNumber, generateMockOTP } from '@/lib/utils';

export default function ConstituencyLoginPage() {
  const router = useRouter();
  const params = useParams();
  const constituencyHash = params.constituency as string;

  const [constituency, setConstituency] = useState<any>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [mockOtp, setMockOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyConstituency() {
      try {
        // First, try to find direct match
        let matchedConstituency = Object.entries(constituencies).find(([key]) => {
          return key === constituencyHash;
        });

        // If no direct match, check if the URL is a SHA256 hash
        if (!matchedConstituency) {
          // Generate SHA256 hash for each constituency key and compare
          for (const [key, value] of Object.entries(constituencies)) {
            const encoder = new TextEncoder();
            const data = encoder.encode(key);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (hashHex === constituencyHash) {
              matchedConstituency = [key, value];
              break;
            }
          }
        }

        if (matchedConstituency) {
          setConstituency(matchedConstituency[1]);
        } else {
          setError('Invalid constituency link');
        }
      } catch (err) {
        setError('Error loading constituency data');
      } finally {
        setLoading(false);
      }
    }

    verifyConstituency();
  }, [constituencyHash]);

  const handleSendOtp = () => {
    setError('');

    if (!validateMobileNumber(mobileNumber)) {
      setError('कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें');
      return;
    }

    if (!constituency.mobileNumbers.includes(mobileNumber)) {
      setError('यह मोबाइल नंबर इस विधानसभा क्षेत्र के लिए मान्य नहीं है');
      return;
    }

    const generatedOtp = generateMockOTP();
    setMockOtp(generatedOtp);
    setShowOtpInput(true);

    console.log('Mock OTP:', generatedOtp);
    alert(`OTP भेजा गया: ${generatedOtp}`);
  };

  const handleVerifyOtp = () => {
    setError('');

    if (otp === mockOtp) {
      sessionStorage.setItem('authenticated', 'true');
      sessionStorage.setItem('constituency', constituencyHash);
      sessionStorage.setItem('mobile', mobileNumber);

      router.push(`/${constituencyHash}/select-booth`);
    } else {
      setError('गलत OTP। कृपया पुनः प्रयास करें।');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="text-gray-800">लोड हो रहा है...</div>
      </div>
    );
  }

  if (error && !constituency) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="text-red-600 text-center">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              {constituency?.name}
            </h1>
            <p className="text-sm text-gray-600">
              विधानसभा क्षेत्र
            </p>
            <p className="text-xs text-gray-500 mt-2">
              जिला: {constituency?.district}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                मोबाइल नंबर
              </label>
              <input
                type="tel"
                placeholder="मोबाइल नंबर दर्ज करें"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                maxLength={10}
                disabled={showOtpInput}
                className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {showOtpInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP
                </label>
                <input
                  type="text"
                  placeholder="OTP दर्ज करें"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3">
                {error}
              </div>
            )}

            {!showOtpInput ? (
              <button
                onClick={handleSendOtp}
                className="w-full bg-amber-500 text-white rounded-xl py-3 font-medium hover:bg-amber-600 transition-colors"
              >
                OTP भेजें
              </button>
            ) : (
              <button
                onClick={handleVerifyOtp}
                className="w-full bg-amber-500 text-white rounded-xl py-3 font-medium hover:bg-amber-600 transition-colors"
              >
                OTP सत्यापित करें
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
