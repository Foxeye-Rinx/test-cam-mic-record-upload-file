import React, { useEffect, useRef, useState } from 'react';

const StreamTest: React.FC = () => {
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('Starting camera');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        // Log chi tiết về stream
        console.log('Stream tracks:', stream.getTracks());
        console.log('Video tracks:', stream.getVideoTracks());
        console.log('Video track settings:', stream.getVideoTracks()[0]?.getSettings());
        console.log('Video track constraints:', stream.getVideoTracks()[0]?.getConstraints());
        console.log('Stream active:', stream.active);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Thêm event listener để kiểm tra khi video sẵn sàng
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            console.log('Video dimensions:', {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
          };
        }
      } catch (err) {
        console.log('Error accessing camera');
        console.error('Error accessing camera:', err);
        setError(err instanceof Error ? err.message : 'Failed to access camera');
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div>
      <h2 className='text-4xl font-bold text-white'>Camera Stream Test</h2>
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          maxWidth: '640px',
          transform: 'scaleX(-1)',
          backgroundColor: '#000',
        }}
        onPlay={() => console.log('Video playing')}
        onLoadedData={() => console.log('Video data loaded')}
      />
    </div>
  );
};

export default StreamTest;
