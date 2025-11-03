'use client';

export default function Home() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Route</h1>
            <p className="text-gray-700 text-base">You have accessed an incorrect route.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-800 font-medium mb-2">
              Please use the proper constituency link provided to you.
            </p>
            <p className="text-xs text-gray-600">
              If you don&apos;t have a valid link, please contact your Assembly Constituency coordinator or your AI to get the correct hashed URL.
            </p>
          </div>

          <div className="text-left space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Need Help?</p>
            <p className="text-sm text-gray-600">
              Ask your AI : &quot;Please provide me with the constituency link for [Your AC Name]&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
