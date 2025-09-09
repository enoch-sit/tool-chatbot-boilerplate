import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/joy';
import CodeBlock from './CodeBlock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

interface HtmlPreviewProps {
  htmlContent: string;
  isHistorical?: boolean; // Flag to indicate this is from completed stream
  messageId?: string; // Message ID for pinning
  onPin?: () => void; // Pin callback
  onCopy?: () => void; // Copy callback
  isPinned?: boolean; // Whether this HTML section is pinned
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ 
  htmlContent, 
  isHistorical = false, 
  messageId, 
  onPin, 
  onCopy, 
  isPinned = false 
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(300);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  // Function to resize iframe based on content
  const resizeIframe = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        // Check if user is near bottom before resizing
        const scrollThreshold = 100; // pixels from bottom
        const isNearBottom = window.innerHeight + window.scrollY >= 
                           document.documentElement.scrollHeight - scrollThreshold;
        
        // Store current scroll position before resizing
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        // Wait a bit for content to render and scripts to execute
        setTimeout(() => {
          const contentWindow = iframe.contentWindow;
          if (contentWindow) {
            const doc = iframe.contentDocument || contentWindow.document;
            if (doc) {
              const height = Math.max(
                doc.body.scrollHeight,
                doc.body.offsetHeight,
                doc.documentElement.scrollHeight,
                doc.documentElement.offsetHeight
              );
              // Set minimum height of 200px and maximum of 800px for reasonable display
              const newHeight = Math.max(200, Math.min(height + 20, 800));
              setIframeHeight(newHeight);
              
              // Only restore scroll position if user was near bottom
              if (isNearBottom) {
                requestAnimationFrame(() => {
                  window.scrollTo(scrollX, scrollY);
                });
              }
            }
          }
        }, 500); // Increased delay to allow scripts like MathJax to render
      } catch (error) {
        // Fallback if we can't access iframe content due to CORS
        console.warn('Could not resize iframe automatically:', error);
        setIframeHeight(400);
      }
    }
  };

  // Create a version of the HTML with a MathJax configuration script injected.
  const enhancedHtmlContent = React.useMemo(() => {
    // Detect if MathJax is used via multiple indicators
    const hasMathJax = 
      htmlContent.includes('mathjax') || // CDN or script references (case-insensitive)
      htmlContent.includes('MathJax') || // Case variations
      htmlContent.includes('\\(') ||     // LaTeX inline math delimiters
      htmlContent.includes('\\[') ||     // LaTeX display math delimiters
      htmlContent.includes('$$') ||      // Display math delimiters
      /\$[^$\n]+\$/.test(htmlContent) || // Inline math with $ delimiters (more robust)
      htmlContent.includes('\\dfrac') || // LaTeX fraction commands
      htmlContent.includes('\\frac') ||  // LaTeX fraction commands
      htmlContent.includes('\\times') || // LaTeX multiplication
      htmlContent.includes('\\cdot') ||  // LaTeX dot product
      htmlContent.includes('\\alpha') || // Greek letters (common in math)
      htmlContent.includes('\\beta') ||
      htmlContent.includes('\\gamma') ||
      htmlContent.includes('\\sum') ||   // Summation symbols
      htmlContent.includes('\\int');     // Integral symbols

    // Debug logging (remove in production)
    console.log('MathJax Detection Debug:', {
      hasMathJax,
      hasMathjax: htmlContent.includes('mathjax'),
      hasMathJax_caps: htmlContent.includes('MathJax'),
      hasParens: htmlContent.includes('\\('),
      hasBrackets: htmlContent.includes('\\['),
      hasDoubleDollar: htmlContent.includes('$$'),
      hasDollarMath: /\$[^$\n]+\$/.test(htmlContent),
      hasDfrac: htmlContent.includes('\\dfrac'),
      hasFrac: htmlContent.includes('\\frac')
    });

    if (!hasMathJax) {
      return htmlContent;
    }

    // Different handling based on whether MathJax is already loaded via CDN
    const hasCDNMathJax = htmlContent.includes('cdn.jsdelivr.net/npm/mathjax') || 
                          htmlContent.includes('cdnjs.cloudflare.com/ajax/libs/mathjax') ||
                          (htmlContent.includes('polyfill.io') && htmlContent.includes('cdn.jsdelivr.net/npm/mathjax')); // polyfill + jsdelivr combination

    // Debug logging (remove in production)
    console.log('CDN Detection Debug:', {
      hasCDNMathJax,
      hasJsdelivr: htmlContent.includes('cdn.jsdelivr.net/npm/mathjax'),
      hasCdnjs: htmlContent.includes('cdnjs.cloudflare.com/ajax/libs/mathjax'),
      hasPolyfill: htmlContent.includes('polyfill.io')
    });

    let mathJaxConfigScript;

    if (hasCDNMathJax) {
      // MathJax is loaded via CDN - add a more robust configuration and trigger
      mathJaxConfigScript = `
        <script>
          // Configure MathJax if not already configured
          window.MathJax = window.MathJax || {
            tex: {
              inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
              processEscapes: true,
              processEnvironments: true
            },
            options: {
              skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
              ignoreHtmlClass: 'no-mathjax'
            }
          };
          
          // Function to process MathJax when ready
          function processMathJax() {
            if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
              // Process all math on the page
              MathJax.typesetPromise()
                .then(() => {
                  // Notify parent after rendering is complete
                  setTimeout(() => {
                    if (window.parent) {
                      window.parent.postMessage('mathjax-rendered', '*');
                    }
                  }, 200);
                })
                .catch((err) => console.log('MathJax error:', err));
            } else if (typeof MathJax !== 'undefined' && MathJax.Hub) {
              // MathJax v2 compatibility
              MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
              MathJax.Hub.Queue(() => {
                if (window.parent) {
                  window.parent.postMessage('mathjax-rendered', '*');
                }
              });
            } else {
              // MathJax not yet loaded, try again
              setTimeout(processMathJax, 100);
            }
          }
          
          // Start processing when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', processMathJax);
          } else {
            // DOM already loaded, process immediately
            processMathJax();
          }
        </script>
      `;
    } else {
      // No CDN MathJax detected - inject full configuration AND load MathJax
      mathJaxConfigScript = `
        <script>
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
              processEscapes: true,
              processEnvironments: true
            },
            options: {
              skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
              ignoreHtmlClass: 'no-mathjax'
            },
            startup: {
              ready: () => {
                MathJax.startup.defaultReady();
                // Small delay to ensure DOM is updated after typesetting
                setTimeout(() => {
                  if (window.parent) {
                    // Notify parent window to resize the iframe
                    window.parent.postMessage('mathjax-rendered', '*');
                  }
                }, 100);
              }
            }
          };
        </script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      `;
    }

    // Inject the configuration script inside the <head> tag.
    const headIndex = htmlContent.indexOf('<head>');
    if (headIndex > -1) {
      const insertionPoint = headIndex + '<head>'.length;
      return `${htmlContent.slice(0, insertionPoint)}${mathJaxConfigScript}${htmlContent.slice(insertionPoint)}`;
    }
    
    // Fallback if no <head> tag is found
    return mathJaxConfigScript + htmlContent;
  }, [htmlContent]);

  // Listen for the message from the iframe to resize it.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow && event.data === 'mathjax-rendered') {
        resizeIframe();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Reset height when switching to preview mode
  useEffect(() => {
    if (isPreviewMode) {
      setIframeHeight(300); // Reset to default while loading
    }
  }, [isPreviewMode]);

  // Auto-switch to preview mode when stream ends
  useEffect(() => {
    if (isHistorical && !hasAutoSwitched && !isPreviewMode) {
      // Check if user is near bottom
      const scrollThreshold = 100; // pixels from bottom
      const isNearBottom = window.innerHeight + window.scrollY >= 
                         document.documentElement.scrollHeight - scrollThreshold;
      
      // Store scroll position before switching
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // Wait 1 second after stream ends, then switch to preview mode
      const timer = setTimeout(() => {
        setIsPreviewMode(true);
        setHasAutoSwitched(true);
        
        // Only restore scroll position if user was near bottom
        if (isNearBottom) {
          requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
          });
        }
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [isHistorical, hasAutoSwitched, isPreviewMode]);

  const handleOpenInNewTab = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{ position: 'relative' }}
    >
      {/* Floating controls for HTML blocks */}
      {(isHovered || isPinned) && (onPin || onCopy) && (
        <Box sx={{ 
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 1,
          zIndex: 10,
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 'md',
          p: 0.5,
          boxShadow: 'sm',
          opacity: (isHovered || isPinned) ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}>
          {onCopy && (
            <Tooltip title="Copy HTML">
              <IconButton
                size="sm"
                variant="soft"
                color="neutral"
                onClick={onCopy}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.8)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  minHeight: '24px',
                  minWidth: '24px',
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onPin && messageId && (
            <Tooltip title={isPinned ? "Unpin HTML" : "Pin HTML"}>
              <IconButton
                size="sm"
                variant="soft"
                color={isPinned ? 'primary' : 'neutral'}
                onClick={onPin}
                sx={{ 
                  bgcolor: isPinned ? 'rgba(25,118,210,0.8)' : 'rgba(255,255,255,0.8)',
                  '&:hover': { 
                    bgcolor: isPinned ? 'rgba(25,118,210,1)' : 'rgba(255,255,255,1)'
                  },
                  minHeight: '24px',
                  minWidth: '24px',
                }}
              >
                {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Toggle between code and preview */}
      {isPreviewMode ? (
        <Box 
          sx={{ 
            border: '1px solid #ccc', 
            borderRadius: 1,
            overflow: 'hidden',
            backgroundColor: 'white',
            transition: 'height 0.3s ease-in-out', // Add smooth transition
            height: `${iframeHeight}px` // Control height at container level
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={enhancedHtmlContent}
            style={{
              width: '100%',
              height: '100%', // Change to 100% of container
              border: 'none',
            }}
            sandbox="allow-scripts allow-same-origin"
            title="HTML Preview"
            onLoad={resizeIframe}
          />
        </Box>
      ) : (
        <CodeBlock 
          code={htmlContent} 
          language="html" 
        />
      )}
      
      {/* Action Buttons */}
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button 
          size="sm" 
          variant="outlined" 
          onClick={togglePreview}
        >
          {isPreviewMode ? '📝 Show Code' : '📱 Show Preview'}
        </Button>
        <Button 
          size="sm" 
          variant="outlined" 
          onClick={handleOpenInNewTab}
        >
          🚀 Open in New Tab
        </Button>
      </Box>
    </Box>
  );
};

export default HtmlPreview;