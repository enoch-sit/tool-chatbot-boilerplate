import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface AuthenticatedLinkProps {
  href: string;
  children: React.ReactNode;
  download?: string | boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const AuthenticatedLink: React.FC<AuthenticatedLinkProps> = ({
  href,
  children,
  download,
  className,
  style,
  onClick
}) => {
  const tokens = useAuthStore(state => state.tokens);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (onClick) {
      onClick(e);
      return;
    }

    try {
      const token = tokens?.accessToken;
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      console.log('🔐 AuthenticatedLink: Fetching file with auth token');
      console.log('🔗 AuthenticatedLink: URL:', href);

      const response = await fetch(href, {
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
              const retryResponse = await fetch(href, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${newTokens.accessToken}`,
                },
              });
              
              if (!retryResponse.ok) {
                throw new Error(`Failed to fetch file: ${retryResponse.status} ${retryResponse.statusText}`);
              }
              
              await handleDownload(retryResponse);
              return;
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            throw new Error('Authentication failed');
          }
        }
        
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      await handleDownload(response);
    } catch (error) {
      console.error('❌ AuthenticatedLink error:', error);
    }
  };

  const handleDownload = async (response: Response) => {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    if (download) {
      link.download = typeof download === 'string' ? download : '';
    } else {
      link.target = '_blank';
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    URL.revokeObjectURL(url);
  };

  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

export default AuthenticatedLink;
