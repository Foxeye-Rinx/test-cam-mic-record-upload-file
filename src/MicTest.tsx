import React, { useEffect, useState, useRef } from 'react';

const MicTest: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [supported, setSupported] = useState<any>();
  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const getSupported = async () => {
      try {
        const supported = await navigator.mediaDevices.getSupportedConstraints();
        setSupported(supported);
      } catch (err) {
        console.error('Error accessing supported constraints:', err);
        setError(err instanceof Error ? err.message : 'Failed to access supported constraints');
      }
    };

    getSupported();
  }, []);

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log('Available audio devices:', audioDevices);
      } catch (err) {
        console.error('Error accessing audio devices:', err);
        setError(err instanceof Error ? err.message : 'Failed to access audio devices');
      }
    };

    getAudioDevices();
  }, []);

  useEffect(() => {
    const startMicrophone = async () => {
      try {
        console.log('Starting microphone');
        
        // Enumerate devices first to get audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        if (audioDevices.length === 0) {
          throw new Error('No audio input devices found');
        }
        
        console.log('Using audio device:', audioDevices[0].label || 'Unnamed device');
        
        // Use the first audio device explicitly
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: audioDevices[0].deviceId
          }
        });
        
        // Log chi tiết về stream
        console.log('Stream tracks:', stream.getTracks());
        console.log('Audio tracks:', stream.getAudioTracks());
        console.log('Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
        console.log('Audio track constraints:', stream.getAudioTracks()[0]?.getConstraints());
        console.log('Stream active:', stream.active);

        // Thiết lập Audio Analysis
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        // Cấu hình analyser
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Hàm cập nhật volume
        const updateVolume = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Tính toán volume trung bình
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const avgVolume = Math.round(sum / bufferLength);
            setVolume(avgVolume);
            
            animationRef.current = requestAnimationFrame(updateVolume);
          }
        };
        
        updateVolume();

      } catch (err) {
        console.log('Error accessing microphone');
        console.error('Error accessing microphone:', JSON.stringify(err));
        setError(err instanceof Error ? "[Handled error from website] " + err.name + " " + err.message : 'Failed to access microphone');
      }
    };

    startMicrophone();

    // Cleanup function
    return () => {
      // Dọn dẹp audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Dọn dẹp animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div>
      <h5 className='text-white max-w-md'>
        supported: {JSON.stringify(supported)}
      </h5>
      <h2 className='text-4xl font-bold text-white'>Microphone Test</h2>
      
      {/* Hiển thị volume */}
      <div className="my-4">
        <h3 className="text-2xl font-bold text-white mb-2">Volume: {volume}</h3>
        <div className="w-full max-w-md h-8 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-100"
            style={{ width: `${Math.min(volume * 100 / 255, 100)}%` }}
          />
        </div>
      </div>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default MicTest;
