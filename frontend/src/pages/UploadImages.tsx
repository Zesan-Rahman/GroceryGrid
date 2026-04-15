import React, { useState } from "react";
import "./UploadImages.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UploadedImage {
  file: File;
  previewUrl: string;
}

interface LineItem {
  descClean: string;
  qty: number;
  price: number;
  lineTotal: number;
}

interface TabScannerResult {
  establishment?: string;
  date?: string;
  total?: number;
  subTotal?: number;
  tax?: number;
  tip?: number;
  discount?: number;
  paymentMethod?: string;
  address?: string;
  currency?: string;
  lineItems?: LineItem[];
}

interface TabScannerResponse {
  success: boolean;
  status: string;
  status_code: number;
  result?: TabScannerResult;
  message?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const UploadImages: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [scanResult, setScanResult] = useState<TabScannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    // Clear previous results when new images are selected
    setScanResult(null);
    setError(null);
    setUploadStatus(null);
  };

  const handleRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndScan = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setError(null);
    setScanResult(null);
    setUploadStatus("Uploading image...");

    const formData = new FormData();
    // Only send the most recently added image to TabScanner
    formData.append("images", images[images.length - 1].file);

    try {
      const response = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setUploadStatus("Scanning receipt...");
      const data: TabScannerResponse = await response.json();

      if (data.success && data.result) {
        setScanResult(data.result);
        setUploadStatus("Scan complete!");
      } else {
        setError(data.message || "Failed to scan receipt");
        setUploadStatus(null);
      }
    } catch (err) {
      setError("Error connecting to server. Is Drogon running?");
      setUploadStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="title">Upload Receipt</h1>

      {/* Upload Box */}
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

      {/* Image Previews */}
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

      {/* Upload & Scan Button */}
      {images.length > 0 && (
        <div className="uploadBtnContainer">
          <button
            onClick={handleUploadAndScan}
            className="uploadBtn"
            disabled={loading}
          >
            {loading ? "Processing..." : "Upload & Scan Receipt"}
          </button>
          {uploadStatus && <p className="statusText">{uploadStatus}</p>}
        </div>
      )}

      {/* Error Message */}
      {error && <p className="errorText">{error}</p>}

      {/* TabScanner Results */}
      {scanResult && (
        <div className="resultsContainer">
          <h2 className="resultsTitle">Scan Results</h2>

          {/* General Info */}
          <div className="resultsSection">
            <h3 className="resultsSectionTitle">General Info</h3>
            <div className="resultsGrid">
              {scanResult.establishment && (
                <div className="resultItem">
                  <span className="resultLabel">Establishment</span>
                  <span className="resultValue">{scanResult.establishment}</span>
                </div>
              )}
              {scanResult.date && (
                <div className="resultItem">
                  <span className="resultLabel">Date</span>
                  <span className="resultValue">{scanResult.date}</span>
                </div>
              )}
              {scanResult.paymentMethod && (
                <div className="resultItem">
                  <span className="resultLabel">Payment Method</span>
                  <span className="resultValue">{scanResult.paymentMethod}</span>
                </div>
              )}
              {scanResult.address && (
                <div className="resultItem">
                  <span className="resultLabel">Address</span>
                  <span className="resultValue">{scanResult.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          {scanResult.lineItems && scanResult.lineItems.length > 0 && (
            <div className="resultsSection">
              <h3 className="resultsSectionTitle">Line Items</h3>
              <table className="lineItemsTable">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResult.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.descClean}</td>
                      <td>{item.qty || "-"}</td>
                      <td>{item.price ? `${scanResult.currency ?? ""}${item.price.toFixed(2)}` : "-"}</td>
                      <td>{item.lineTotal ? `${scanResult.currency ?? ""}${item.lineTotal.toFixed(2)}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="resultsSection">
            <h3 className="resultsSectionTitle">Totals</h3>
            <div className="totalsGrid">
              {scanResult.subTotal !== undefined && (
                <div className="totalRow">
                  <span>Subtotal</span>
                  <span>{scanResult.currency ?? ""}{scanResult.subTotal?.toFixed(2)}</span>
                </div>
              )}
              {scanResult.tax !== undefined && (
                <div className="totalRow">
                  <span>Tax</span>
                  <span>{scanResult.currency ?? ""}{scanResult.tax?.toFixed(2)}</span>
                </div>
              )}
              {scanResult.tip !== undefined && scanResult.tip > 0 && (
                <div className="totalRow">
                  <span>Tip</span>
                  <span>{scanResult.currency ?? ""}{scanResult.tip?.toFixed(2)}</span>
                </div>
              )}
              {scanResult.discount !== undefined && scanResult.discount > 0 && (
                <div className="totalRow">
                  <span>Discount</span>
                  <span>-{scanResult.currency ?? ""}{scanResult.discount?.toFixed(2)}</span>
                </div>
              )}
              {scanResult.total !== undefined && (
                <div className="totalRow totalRowFinal">
                  <span>Total</span>
                  <span>{scanResult.currency ?? ""}{scanResult.total?.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadImages;
