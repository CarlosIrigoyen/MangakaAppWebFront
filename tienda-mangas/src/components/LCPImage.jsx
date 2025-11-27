import React, { useState, useEffect, useRef } from 'react';

const LCPImage = ({ 
  src, 
  alt, 
  className = "", 
  width = 400, 
  height = 200,
  isLCP = false,
  priority = false
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  // Optimización AGRESIVA para Cloudinary
  const getOptimizedSrc = (baseSrc, quality = 60, format = 'webp') => {
    if (!baseSrc?.includes('cloudinary')) return baseSrc;
    
    // Forzar WebP y compresión agresiva
    return baseSrc.replace('/upload/', `/upload/w_${width},q_${quality},f_${format}/`);
  };

  const highQualitySrc = getOptimizedSrc(src, 70, 'webp');
  const lowQualitySrc = getOptimizedSrc(src, 20, 'webp'); // Placeholder de muy baja calidad

  // Precarga AGRESIVA para imagen LCP
  useEffect(() => {
    if (isLCP && highQualitySrc) {
      console.log('🔄 Precargando imagen LCP críticamente:', highQualitySrc);
      
      // Precargar con link preload (más efectivo)
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = highQualitySrc;
      link.setAttribute('fetchpriority', 'high');
      link.setAttribute('crossorigin', 'anonymous');
      document.head.appendChild(link);

      // También precargar con Image() como fallback
      const preloadImage = new Image();
      preloadImage.src = highQualitySrc;
      
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [isLCP, highQualitySrc]);

  const handleLoad = () => {
    console.log('✅ Imagen LCP cargada:', highQualitySrc);
    setLoaded(true);
  };

  const handleError = () => {
    console.error('❌ Error cargando imagen LCP:', highQualitySrc);
    setError(true);
    setLoaded(true);
  };

  return (
    <div 
      className={`lcp-image-container ${!loaded ? 'loading' : ''} ${error ? 'error' : ''} ${className}`}
      style={{ 
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f8f9fa'
      }}
    >
      {/* Placeholder de baja calidad (se carga instantáneamente) */}
      {!loaded && lowQualitySrc && (
        <img
          src={lowQualitySrc}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(15px)',
            transform: 'scale(1.1)',
            opacity: 0.6
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Imagen principal con prioridad máxima si es LCP */}
      <img
        ref={imgRef}
        src={highQualitySrc}
        alt={alt}
        width={width}
        height={height}
        loading={isLCP ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={isLCP ? "high" : "auto"}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'opacity 0.5s ease-in-out',
          opacity: loaded ? 1 : 0,
          position: 'relative',
          zIndex: 2
        }}
      />
    </div>
  );
};

export default React.memo(LCPImage);