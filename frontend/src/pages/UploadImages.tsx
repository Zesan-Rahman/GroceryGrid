import React, { useState } from "react";
import "./UploadImages.css"

interface UploadedImage {
  file: File;
  previewUrl: string;
}

const UploadImages: React.FC = () => {
  {/*
    Creates images, an array of UploadedImages, and a setter function setImages.
    Parameter for useState is the initial value
  */}
  const [images, setImages] = useState<UploadedImage[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
  <div className="page">
    <h1 className="title">Upload Images</h1>

    <label className="uploadBox">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <span className="uploadText">Click to select images</span>
    </label>

    {images.length > 0 && (
      <div className="previewGrid">
        {images.map((img, index) => (
          <div key={index} className="previewCard">
            <img src={img.previewUrl} alt={img.file.name} className="previewImg" />
            <p className="fileName">{img.file.name}</p>
            <button onClick={() => handleRemove(index)} className="removeBtn">
              Remove
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

export default UploadImages;
