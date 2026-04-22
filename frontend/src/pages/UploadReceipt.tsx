import React, { useState, useEffect } from "react";
import "./UploadReceipt.css";

interface UploadedReceipt {
    file: File;
    previewUrl: string;
}

interface LineItem {
    descClean: string;
    qty: number;
    price: number;
    lineTotal: number;
    editedPrice?: number;
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
    summaryItems?: LineItem[];
}

interface TabScannerResponse {
    success: boolean;
    status: string;
    status_code: number;
    result?: TabScannerResult;
    message?: string;
}

interface Store {
    name: string;
    address: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const UploadReceipts: React.FC = () => {
    //Scanning
    const [images, setImages] = useState<UploadedReceipt[]>([]);
    const [scanResult, setScanResult] = useState<TabScannerResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    //Add and Edit prices
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [newItemDesc, setNewItemDesc] = useState<string>("");
    const [newItemPrice, setNewItemPrice] = useState<string>("");
    const [items, setItems] = useState<LineItem[]>([]);

    //Store searching
    const [storeQuery, setStoreQuery] = useState<string>("");
    const [storeResults, setStoreResults] = useState<Store[]>([]);
    const [storeLoading, setStoreLoading] = useState(false);
    const [storeError, setStoreError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    //Upload to db
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const lineItems = (scanResult?.lineItems && scanResult.lineItems.length > 0)
        ? scanResult.lineItems
        : (scanResult?.summaryItems && scanResult.summaryItems.length > 0)
            ? scanResult.summaryItems
            : null;

    useEffect(() => {
        if (scanResult) {
            const source = (scanResult.lineItems && scanResult.lineItems.length > 0)
                ? scanResult.lineItems
                : scanResult.summaryItems ?? [];
            setItems(source);
        }
    }, [scanResult]);

    //Scanning functions
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
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            setUploadStatus("Scanning receipt...");
            const data: TabScannerResponse = await response.json();
            console.log("Full response:", JSON.stringify(data, null, 2));

            if (data.success && data.result) {
                setScanResult(data.result);
                setUploadStatus("Scan complete!");
            } else {
                setError(data.message || "Failed to scan receipt");
                setUploadStatus(null);
            }
        } catch (err) {
            setError("Error connecting to server: Check drogon running");
            setUploadStatus(null);
        } finally {
            setLoading(false);
        }
    };

    //Price edits
    const handleEditClick = (index: number) => {
        setEditingIndex(index);
        const item = items[index];
        const unitPrice = item.qty > 0 ? item.price / item.qty : item.price;
        setEditValue(unitPrice.toFixed(2));
    };

    const handleEditSave = (index: number) => {
        const newPrice = parseFloat(editValue);
        if (!isNaN(newPrice) && newPrice > 0) {
            setItems((prev) => prev.map((item, i) =>
                i === index ? { ...item, editedPrice: newPrice } : item
            ));
        }
        setEditingIndex(null);
    };

    //Item adding
    const handleAddItem = () => {
        if (!newItemDesc.trim() || !newItemPrice.trim()) return;
        const price = parseFloat(newItemPrice);
        if (isNaN(price) || price < 0) return;
        const newItem: LineItem = {
            descClean: newItemDesc,
            qty: 1,
            price: price,
            lineTotal: price,
        };
        setItems((prev) => [...prev, newItem]);
        setNewItemDesc("");
        setNewItemPrice("");
    };
    //Search
    const handleStoreSearch = async () => {
        if (!storeQuery.trim()) return;
        setStoreLoading(true);
        setStoreError(null);
        setSearched(true);

        try {
            const response = await fetch(
                `/api/stores/search?q=${encodeURIComponent(storeQuery)}`
            );
            if (!response.ok) throw new Error("Search failed");
            const data: Store[] = await response.json();
            setStoreResults(data);
        } catch (err) {
            setStoreError("Error connecting to server: Check Drogon running");
        } finally {
            setStoreLoading(false);
        }
    };

    const handleStoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleStoreSearch();
    };

    //Upload to db
    const handleSubmitReceipt = async () => {
        if (!selectedStore || images.length === 0) return;
        setSubmitLoading(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            const formData = new FormData();
            formData.append("storeName", selectedStore.name);
            formData.append("storeAddress", selectedStore.address);
            formData.append("rawImageFile", images[images.length - 1].file.name);
            // send items as a JSON string
            formData.append("items", JSON.stringify(items.map((item) => ({
                descClean: item.descClean,
                price: item.editedPrice !== undefined
                    ? item.editedPrice
                    : item.qty > 0 ? item.price / item.qty : item.price,
                date: scanResult?.date ?? null,
            }))));

            const response = await fetch("/api/receipts/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");
            setSubmitSuccess(true);
        } catch (err) {
            setSubmitError("Failed to upload receipt to database.");
        } finally {
            setSubmitLoading(false);
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
                        {loading ? "Processing..." : "Scan Receipt"}
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

                    {/* Line Items */}
                    {items.length > 0 && (
                        <div className="resultsSection">
                            <h3 className="resultsSectionTitle">Items Bought</h3>
                            <table className="lineItemsTable">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                        <th>Edit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        const unitPrice = item.editedPrice !== undefined
                                            ? item.editedPrice
                                            : item.qty > 0 ? item.price / item.qty : item.price;
                                        const total = item.editedPrice !== undefined
                                            ? item.editedPrice * (item.qty || 1)
                                            : item.lineTotal;

                                        return (
                                            <tr key={index}>
                                                <td>{item.descClean}</td>
                                                <td>{item.qty || "-"}</td>
                                                <td>
                                                    {editingIndex === index ? (
                                                        <span>
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="editInput"
                                                            />
                                                            <button onClick={() => handleEditSave(index)} className="saveBtn">
                                                                Save
                                                            </button>
                                                        </span>
                                                    ) : (
                                                        `${scanResult?.currency ?? ""}${unitPrice.toFixed(2)}`
                                                    )}
                                                </td>
                                                <td>{`${scanResult?.currency ?? ""}${total.toFixed(2)}`}</td>
                                                <td>
                                                    {editingIndex !== index && (
                                                        <button onClick={() => handleEditClick(index)} className="editBtn">
                                                            Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Adding items */}
                            <div className="addItemRow">
                                <input
                                    type="text"
                                    placeholder="Item Name"
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
                                    className="addItemInput"
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={newItemPrice}
                                    onChange={(e) => setNewItemPrice(e.target.value)}
                                    className="addItemInput"
                                />
                                <button onClick={handleAddItem} className="addItemBtn">
                                    Add Item
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Store Search */}
            {scanResult && (
                <div className="storeSearchSection">
                    <h2 className="storeSearchTitle">Find the Store</h2>
                    <p className="storeSearchSubtitle">Search for the store this receipt is from</p>

                    <div className="searchBar">
                        <input
                            type="text"
                            placeholder="Search by name or address..."
                            value={storeQuery}
                            onChange={(e) => setStoreQuery(e.target.value)}
                            onKeyDown={handleStoreKeyDown}
                            className="searchInput"
                        />
                        <button
                            onClick={handleStoreSearch}
                            className="searchBtn"
                            disabled={storeLoading}
                        >
                            {storeLoading ? "Searching..." : "Search"}
                        </button>
                    </div>

                    {storeError && <p className="searchError">{storeError}</p>}

                    {searched && !storeLoading && storeResults.length === 0 && (
                        <p className="noResults">No stores found for "{storeQuery}"</p>
                    )}

                    {storeResults.length > 0 && (
                        <div className="storeResultsList">
                            {storeResults.map((store, index) => (
                                <div
                                    key={index}
                                    className={`storeCard ${selectedStore?.name === store.name ? "storeCardSelected" : ""}`}
                                    onClick={() => setSelectedStore(store)}
                                >
                                    <p className="storeName">{store.name}</p>
                                    <p className="storeAddress">{store.address}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedStore && (
                        <div className="submitSection">
                            <p className="selectedStoreText">
                                Selected store: <strong>{selectedStore.name}</strong>
                            </p>
                            <button
                                onClick={handleSubmitReceipt}
                                className="submitBtn"
                                disabled={submitLoading || submitSuccess}
                            >
                                {submitLoading ? "Uploading..." : "Upload Receipt to Database"}
                            </button>
                            {submitError && <p className="searchError">{submitError}</p>}
                            {submitSuccess && <p className="submitSuccess">Receipt uploaded successfully!</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UploadReceipts;
