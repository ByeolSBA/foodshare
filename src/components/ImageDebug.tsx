import { resolveDonationImageUrl, getServerOrigin } from '../services/apiClient';

export function ImageDebug() {
  // Probar diferentes URLs de imágenes
  const testUrls = [
    '/images/donations/test-image.svg',
    '/images/donations/7bd04e51-019f-4ea2-a6fb-5c182e47e9f6.jpeg',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80'
  ];

  return (
    <div className="p-4 bg-gray-50 rounded-lg mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Debug de Imágenes</h3>
      
      <div className="text-xs text-gray-500 mb-2">
        <p>Server Origin: {getServerOrigin()}</p>
      </div>

      <div className="space-y-2">
        {testUrls.map((url, index) => {
          const resolvedUrl = resolveDonationImageUrl(url);
          return (
            <div key={index} className="border border-gray-200 rounded p-2">
              <p className="text-xs text-gray-600 mb-1">Original: {url}</p>
              <p className="text-xs text-gray-600 mb-1">Resuelta: {resolvedUrl}</p>
              <img 
                src={resolvedUrl} 
                alt={`Test ${index}`}
                className="w-16 h-16 object-cover border border-gray-300"
                onLoad={() => console.log(`Image ${index} loaded successfully`)}
                onError={() => console.error(`Image ${index} failed to load`)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
