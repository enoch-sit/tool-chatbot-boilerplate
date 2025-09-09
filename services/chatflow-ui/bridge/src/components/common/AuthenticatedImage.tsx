import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/joy';
import { useAuthStore } from '../../store/authStore';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  onError?: (error: Error) => void;
  size?: 'small' | 'medium' | 'large';
}

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ 
  src, 
  alt, 
  style, 
  className,
  onClick, 
  onError,
  size = 'medium'
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Get auth token from the auth store
  const tokens = useAuthStore(state => state.tokens);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get JWT token from auth store
        const token = tokens?.accessToken;
        
        if (!token) {
          throw new Error('No authentication token found');
        }

    console.log('🔐 AuthenticatedImage: Fetching image with auth token');
    console.log('🖼️ AuthenticatedImage: URL:', src);
    
    // Let's see what the server actually returns as text
    const debugResponse = await fetch(src, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const debugText = await debugResponse.text();
    console.log('🔍 DEBUG: Server response as text:', debugText.substring(0, 500));
    
    // Reset for actual fetch

        const response = await fetch(src, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Try to refresh token and retry
            try {
              await useAuthStore.getState().refreshToken();
              const newTokens = useAuthStore.getState().tokens;
              
              if (newTokens?.accessToken) {
                const retryResponse = await fetch(src, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${newTokens.accessToken}`,
                  },
                });
                
                if (!retryResponse.ok) {
                  throw new Error(`Failed to load image: ${retryResponse.status} ${retryResponse.statusText}`);
                }
                
                const blob = await retryResponse.blob();
                const objectUrl = URL.createObjectURL(blob);
                setImageSrc(objectUrl);
                console.log('✅ AuthenticatedImage: Image loaded successfully after token refresh');
                return;
              }
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError);
              throw new Error('Authentication failed');
            }
          }
          
          throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
        }

        // Convert response to blob and create object URL
        const blob = await response.blob();
        console.log('🔍 DEBUG: Blob details:', {
          size: blob.size,
          type: blob.type,
          fileId: src.split('/').pop()?.split('?')[0] // Extract file ID from URL
        });
        
        // Log first few bytes of the blob for debugging
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const firstBytes = Array.from(uint8Array.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('🔍 DEBUG: First 20 bytes (hex):', firstBytes);
        
        // Create new blob for object URL (since we consumed the original)
        const newBlob = new Blob([arrayBuffer], { type: blob.type });
        const objectUrl = URL.createObjectURL(newBlob);
        console.log('🔍 DEBUG: Object URL created:', objectUrl);
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

    if (src && tokens?.accessToken) {
      fetchImage();
    } else if (!tokens?.accessToken) {
      setError('No authentication token available');
      setLoading(false);
    }

    // Cleanup object URL on unmount or when src changes
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, tokens?.accessToken, onError]);

  // Get size-based dimensions
  const getSizeDimensions = () => {
    switch (size) {
      case 'small':
        return { minHeight: '60px', maxHeight: '120px' };
      case 'medium':
        return { minHeight: '100px', maxHeight: '200px' };
      case 'large':
        return { minHeight: '150px', maxHeight: '400px' };
      default:
        return { minHeight: '100px', maxHeight: '200px' };
    }
  };

  const sizeDimensions = getSizeDimensions();

  if (loading) {
    return (
      <div 
        className={className}
        style={{ 
          ...style, 
          ...sizeDimensions,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px'
        }}
      >
        <CircularProgress size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={className}
        style={{ 
          ...style, 
          ...sizeDimensions,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#fff0f0',
          border: '2px dashed #ff6b6b',
          borderRadius: '8px',
          color: '#d63031',
          fontSize: '12px',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <span>🖼️</span>
        <span>Image not available</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>{error}</span>
      </div>
    );
  }

  // Add debug info when image src is available
  console.log('🔍 DEBUG: About to render img element with src:', imageSrc);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={imageSrc}
        alt={alt}
        style={{
          ...style,
          maxHeight: sizeDimensions.maxHeight,
          objectFit: 'contain',
          borderRadius: '8px'
        }}
        className={className}
        onClick={onClick}
        onLoad={() => {
          console.log('✅ DEBUG: Image onLoad fired for:', imageSrc);
        }}
        onError={(e) => {
          console.log('❌ DEBUG: Image onError fired for:', imageSrc);
          console.log('❌ DEBUG: Error event:', e);
        }}
      />
      {/* Debug overlay */}
      <div style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        background: 'rgba(0,255,0,0.7)',
        color: 'white',
        fontSize: '10px',
        padding: '2px 4px',
        borderRadius: '2px',
        pointerEvents: 'none'
      }}>
        AUTH
      </div>
    </div>
  );
};

export default AuthenticatedImage;
