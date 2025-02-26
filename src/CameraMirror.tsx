import React, { useEffect, useRef, useState } from "react";
import { Download, Volume2, Square, Circle } from "lucide-react";
import ImageUpload from './ImageUpload';

const CameraMirror = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoURL, setRecordedVideoURL] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        });
  
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup Audio Analysis
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        // Configure analyser
        analyserRef.current.fftSize = 128;
        analyserRef.current.smoothingTimeConstant = 0.5;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Update volume function
        const updateVolume = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const maxVolume = Math.max(...Array.from(dataArray));
            setVolume(maxVolume);
            animationRef.current = requestAnimationFrame(updateVolume);
          }
        };
        
        updateVolume();

        // Setup MediaRecorder
        try {
          // Check supported formats
          const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
          ];
          
          let selectedMimeType = '';
          for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType;
              break;
            }
          }
          
          if (!selectedMimeType) {
            throw new Error('No supported video format found');
          }
          
          console.log('Using format:', selectedMimeType);
          
          const recorder = new MediaRecorder(stream, {
            mimeType: selectedMimeType
          });
          
          recorder.ondataavailable = (event) => {
            console.log('Data available:', event.data.size);
            if (event.data && event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          recorder.onstop = () => {
            console.log('Recorder stopped, chunks:', recordedChunksRef.current.length);
            if (recordedChunksRef.current.length > 0) {
              const blob = new Blob(recordedChunksRef.current, { 
                type: recordedChunksRef.current[0].type 
              });
              
              console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
              
              const url = URL.createObjectURL(blob);
              console.log('Created URL:', url);
              
              setRecordedVideoURL(url);
            }
          };
          
          mediaRecorderRef.current = recorder;
        } catch (recErr) {
          console.error('MediaRecorder error:', recErr);
          setError(`Recorder setup error: ${recErr}`);
        }

      } catch (err: any) {
        console.error('Camera/Mic error:', err);
        setError(`Device error: ${err.message}`);
      }
    };
  
    getMedia();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (recordedVideoURL) {
        URL.revokeObjectURL(recordedVideoURL);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!mediaRecorderRef.current || !streamRef.current) {
      console.error('MediaRecorder or stream not available');
      return;
    }
    
    // Reset recorded chunks and timer
    recordedChunksRef.current = [];
    setRecordingTime(0);
    setRecordedVideoURL(null);
    
    try {
      console.log('Starting recording...');
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update video playback when recordedVideoURL changes
  useEffect(() => {
    if (recordedVideoURL && playbackRef.current) {
      console.log('Setting playback source to:', recordedVideoURL);
      playbackRef.current.src = recordedVideoURL;
      playbackRef.current.load();
      
      const handleError = (e: any) => {
        console.error('Playback error:', e);
      };
      
      const handleCanPlay = () => {
        console.log('Video can play now');
      };
      
      playbackRef.current.addEventListener('error', handleError);
      playbackRef.current.addEventListener('canplay', handleCanPlay);
      
      return () => {
        if (playbackRef.current) {
          playbackRef.current.removeEventListener('error', handleError);
          playbackRef.current.removeEventListener('canplay', handleCanPlay);
        }
      };
    }
  }, [recordedVideoURL]);

  // Create 10 circles with brightness based on volume
  const renderVolumeCircles = () => {
    // Higher thresholds to avoid always being lit
    const thresholds = [35, 45, 55, 65, 75, 95, 115, 145, 175, 205];
    
    const circles = [];
    for (let i = 0; i < 10; i++) {
      const isActive = volume >= thresholds[i];
      circles.push(
        <div
          key={i}
          className={`w-6 h-6 rounded-full flex items-center justify-center mx-1 transition-all duration-100 ${
            isActive 
              ? "bg-green-500 opacity-100 shadow-lg shadow-green-500/50" 
              : "bg-gray-200 opacity-30"
          }`}
        />
      );
    }
    
    return circles;
  };

  return (
    <div className="min-h-screen text-white py-8">
      {error ? (
        <p className="text-red-400 bg-red-900/30 p-4 rounded-lg max-w-lg mx-auto">{error}</p>
      ) : (
        <div className="max-w-lg mx-auto px-4">
          {/* Camera section */}
          <div className="p-4 rounded-2xl shadow-xl backdrop-blur-sm border border-gray-700">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-lg mx-auto rounded-lg shadow-lg transform -scale-x-100"
            />
            <div className="w-full max-w-lg mx-auto p-3 mt-5">
              {/* Volume indicator */}
              <div className="flex justify-center items-center py-3">
                <div className="flex items-center mr-2">
                  <Volume2 size={20} className="text-green-500 mr-1" />
                </div>
                <div className="flex">
                  {renderVolumeCircles()}
                </div>
              </div>
              
              {/* Record controls */}
              <div className="flex justify-center items-center my-5 gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="relative outline-none focus:outline-none w-16 h-16 rounded-xl border-2 border-blue-500 flex items-center justify-center bg-gray-900"
                >
                  <div>
                    {isRecording ? (
                      <div className="w-9 h-9 bg-red-600 rounded-sm border-2 border-white"></div>
                    ) : (
                      <div className="w-9 h-9 bg-red-600 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                </button>
                
                {isRecording && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                    <span className="text-lg font-medium">{formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
                    {/* Playback video section */}
                    {recordedVideoURL && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-3 text-blue-300">Recorded Video ({formatTime(recordingTime)})</h3>
              <video
                ref={playbackRef}
                controls
                autoPlay
                playsInline
                className="w-full rounded-lg shadow-lg"
              />
              <div className="mt-5 flex justify-center">
                <a
                  href={recordedVideoURL}
                  download={`recorded-video-${new Date().getTime()}.webm`}
                  className="relative inline-flex items-center justify-center gap-2 px-8 py-3 
                    bg-black text-white font-medium rounded-md
                    border border-cyan-500/70 hover:border-cyan-400
                    shadow-[0_0_10px_1px_rgba(0,255,255,0.1)]
                    transition-all duration-300 hover:shadow-[0_0_15px_3px_rgba(0,255,255,0.15)]"
                >
                  <Download size={18} className="text-white" />
                  <span className="text-white">Download Video</span>
                </a>
              </div>
            </div>
          )}
          {/* Image Upload section */}
          <div className="p-4 rounded-2xl shadow-xl backdrop-blur-sm border border-gray-700 mt-8">
            <h3 className="text-xl font-semibold mb-3 text-blue-300">Image Upload</h3>
            <ImageUpload />
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraMirror;
