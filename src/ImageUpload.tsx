import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

const ImageUpload = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mt-8">
      <div className="flex justify-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        
        {!selectedImage ? (
          <button
            onClick={triggerFileInput}
            className="relative inline-flex items-center justify-center gap-2 px-8 py-3 
              bg-black text-white font-medium rounded-md
              border border-cyan-500/50 hover:border-cyan-400
              shadow-[0_0_10px_1px_rgba(0,255,255,0.1)]
              transition-all duration-300 hover:shadow-[0_0_15px_3px_rgba(0,255,255,0.15)]"
          >
            <Upload size={18} className="text-white" />
            <span className="text-white">Upload Image</span>
          </button>
        ) : (
          <div className="relative max-w-lg">
            <img 
              src={selectedImage} 
              alt="Uploaded preview" 
              className="rounded-lg shadow-lg max-h-[500px] w-auto"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 
                rounded-full text-white transition-colors duration-200
                border border-cyan-500/30 hover:border-cyan-400/50"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload; 