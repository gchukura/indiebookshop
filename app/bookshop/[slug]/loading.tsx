export default function BookshopLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>

      {/* Main Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header skeleton */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>

            {/* Contact skeleton */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/5"></div>
              </div>
            </div>

            {/* Hours skeleton */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column skeleton */}
          <div className="lg:col-span-1 space-y-6">
            {/* Map placeholder */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
            </div>

            {/* CTA skeleton */}
            <div className="bg-gray-200 rounded-lg p-6 h-40"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
