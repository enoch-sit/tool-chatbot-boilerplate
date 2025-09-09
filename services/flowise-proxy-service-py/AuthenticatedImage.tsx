import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/joy';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onError?: (error: Error) => void;
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ 
  src, 
  alt, 
  style, 
  onClick, 
  onError 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get JWT token from localStorage or sessionStorage
        // Adjust this based on where your app stores the auth token
        const token = localStorage.getItem('access_token') || 
                     sessionStorage.getItem('access_token') ||
                     localStorage.getItem('authToken') ||
                     sessionStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log('🔐 AuthenticatedImage: Fetching image with auth token');
        console.log('🖼️ AuthenticatedImage: URL:', src);

        const response = await fetch(src, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
        }

        // Convert response to blob and create object URL
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        
        console.log('✅ AuthenticatedImage: Image loaded successfully');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load image');
        setError(error.message);
        onError?.(error);
        console.error('❌ AuthenticatedImage error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchImage();
    }

    // Cleanup object URL on unmount or when src changes
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, onError]);

  if (loading) {
    return (
      <div style={{ 
        ...style, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100px',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px'
      }}>
        <CircularProgress size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        ...style, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f0f0f0',
        border: '1px dashed #ccc',
        borderRadius: '4px',
        color: '#666',
        fontSize: '12px',
        minHeight: '100px',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <span>🖼️</span>
        <span>Image not available</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>{error}</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      style={style}
      onClick={onClick}
    />
  );
};

export default AuthenticatedImage;
