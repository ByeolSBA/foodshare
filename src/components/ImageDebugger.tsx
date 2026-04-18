import { useState, useEffect } from 'react';
import { resolveDonationImageUrl, getServerOrigin } from '../services/apiClient';

interface ImageDebuggerProps {
  donations: any[];
}

export function ImageDebugger({ donations }: ImageDebuggerProps) {
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    const results = donations.map((donation, index) => {
      const imageUrl = donation.imageUrl;
      const resolvedUrl = resolveDonationImageUrl(imageUrl);
      
      return {
        index,
        id: donation.id,
        title: donation.title,
        originalUrl: imageUrl,
        resolvedUrl,
        serverOrigin: getServerOrigin(),
        isUploads: imageUrl?.includes('/images/'),
        isExternal: imageUrl?.startsWith('http'),
        isData: imageUrl?.startsWith('data:')
      };
    });
    
    setTestResults(results);
  }, [donations]);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto z-50">
      <h3 className="text-sm font-bold text-gray-800 mb-2">Image Debugger</h3>
      <div className="text-xs text-gray-600 mb-2">Server Origin: {getServerOrigin()}</div>
      
      {testResults.map((result) => (
        <div key={result.index} className="mb-3 p-2 border border-gray-200 rounded">
          <div className="text-xs font-medium text-gray-700">{result.title}</div>
          <div className="text-xs text-gray-500">ID: {result.id}</div>
          
          <div className="mt-1">
            <div className="text-xs text-gray-600">Original: {result.originalUrl || 'null'}</div>
            <div className="text-xs text-gray-600">Resolved: {result.resolvedUrl}</div>
            <div className="text-xs text-gray-600">Type: 
              {result.isUploads ? ' Uploads' : ''}
              {result.isExternal ? ' External' : ''}
              {result.isData ? ' Data' : ''}
              {!result.originalUrl ? ' None' : ''}
            </div>
          </div>
          
          <div className="mt-2">
            <img 
              src={result.resolvedUrl}
              alt={result.title}
              className="w-16 h-16 object-cover border border-gray-300"
              onLoad={() => console.log(`Image ${result.index} loaded successfully`)}
              onError={(e) => {
                console.error(`Image ${result.index} failed to load:`, result.resolvedUrl);
                e.currentTarget.style.border = '2px solid red';
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
