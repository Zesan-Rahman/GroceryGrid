import React, { useState, useEffect } from "react";
import "./UploadReceipt.css";

// ─── Types ───────────────────────────────────────────────────────────────────


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
    const [step, setStep] = useState(1);

    //Scanning
    const [image, setImage] = useState<UploadedReceipt | null>(null);
    const [scanResult, setScanResult] = useState<TabScannerResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    //Add and Edit prices
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editTotalPrice, setEditTotalPrice] = useState<string>("");
    const [editQty, setEditQty] = useState<string>("");
    const [newItemDesc, setNewItemDesc] = useState<string>("");
    const [newItemPrice, setNewItemPrice] = useState<string>("");
    const [items, setItems] = useState<LineItem[]>([]);
    const [newItemQty, setNewItemQty] = useState<string>("1");

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

    useEffect(() => {
        if (scanResult) {
            const source = (scanResult.lineItems && scanResult.lineItems.length > 0)
                ? scanResult.lineItems
                : scanResult.summaryItems ?? [];
            setItems(source.map((item) => ({
                ...item,
                price: item.qty > 0 ? item.lineTotal / item.qty : item.price,
            })));
        }
    }, [scanResult]);

    //Scanning functions
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const newImage = {
            file,
            previewUrl: URL.createObjectURL(file),
        };
        setImage(newImage);
        setScanResult(null);
        setError(null);
        setUploadStatus(null);
    };

    const handleRemove = () => {
        setImage(null);
        setScanResult(null);
    };

    const handleUploadAndScan = async () => {
        if (!image) return;

        setLoading(true);
        setError(null);
        setScanResult(null);
        setUploadStatus("Uploading image...");

        const formData = new FormData();
        formData.append("images", image.file);

        try {
            const response = await fetch(`/api/upload`, {
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
                setTimeout(() => setStep(2), 500);
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
        const editedTotal = item.editedPrice !== undefined ? item.editedPrice * item.qty : item.lineTotal;
        setEditTotalPrice(editedTotal.toFixed(2));
        setEditQty(String(item.qty || 1));
    };

    const handleEditSave = (index: number) => {
        const newTotal = parseFloat(editTotalPrice);
        const newQty = parseInt(editQty);
        if (!isNaN(newTotal) && newTotal > 0 && !isNaN(newQty) && newQty > 0) {
            setItems((prev) => prev.map((item, i) =>
                i === index ? { ...item, editedPrice: newTotal / newQty, qty: newQty } : item
            ));
        }
        setEditingIndex(null);
    };

    //Item removal
    const handleRemoveItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    //Item adding
    const handleAddItem = () => {
        if (!newItemDesc.trim() || !newItemPrice.trim()) return;
        const price = parseFloat(newItemPrice);
        const qty = parseInt(newItemQty);
        if (isNaN(price) || price < 0 || isNaN(qty) || qty <= 0) return;
        const newItem: LineItem = {
            descClean: newItemDesc,
            qty: qty,
            price: price / qty,
            lineTotal: price,
        };
        setItems((prev) => [...prev, newItem]);
        setNewItemDesc("");
        setNewItemPrice("");
        setNewItemQty("1");
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
        if (!selectedStore || !image) return;
        setSubmitLoading(true);
        setSubmitError(null);

        try {
            const formData = new FormData();
            formData.append("storeName", selectedStore.name);
            formData.append("storeAddress", selectedStore.address);
            formData.append("rawImageFile", image.file.name);
            const itemsPayload = JSON.stringify(items.map((item) => ({
                descClean: item.descClean,
                price: item.editedPrice !== undefined ? item.editedPrice : item.price,
                date: scanResult?.date ?? null,
            })));
            formData.append("items", itemsPayload);
            const response = await fetch(`/api/receipts/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");
            setStep(4);
        } catch (err) {
            setSubmitError("Failed to upload receipt to database.");
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="page wizard-page">
            <div className="progress-bar">
                <div className={`progress-step ${step >= 1 ? "active" : ""}`}>1. Upload</div>
                <div className={`progress-step ${step >= 2 ? "active" : ""}`}>2. Verify</div>
                <div className={`progress-step ${step >= 3 ? "active" : ""}`}>3. Store</div>
                <div className={`progress-step ${step >= 4 ? "active" : ""}`}>4. Done</div>
            </div>

            {step === 1 && (
                <div className="wizard-step step-upload">
                    <h1 className="wizard-title">Upload Receipt</h1>
                    <p className="step-desc">Help the community by contributing to our price database!</p>

                    {!image ? (
                        <label className="uploadBox">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                            <span className="material-icons">attach_file</span>
                            <span className="uploadText">Click to select receipt image</span>
                        </label>
                    ) : (
                        <div className="full-size-preview">
                            <img src={image.previewUrl} alt="Receipt Preview" className="large-receipt-img" />
                            <div className="image-overlay-actions">
                                <button className="button-secondary" onClick={handleRemove}>Change Image</button>
                            </div>
                        </div>
                    )}

                    {image && (
                        <div className="step-actions">
                            <button
                                onClick={handleUploadAndScan}
                                className="uploadBtn main-action-btn"
                                disabled={loading}
                            >
                                {loading ? "Processing..." : "Scan Receipt"}
                            </button>
                            {uploadStatus && <p className="statusText">{uploadStatus}</p>}
                            {error && <p className="errorText">{error}</p>}
                        </div>
                    )}
                </div>
            )}

            {step === 2 && scanResult && (
                <div className="wizard-step step-verify">
                    <h1 className="wizard-title">Does this look right?</h1>
                    <p className="step-desc">We've extracted the items below. Please verify prices and quantities.</p>

                    <div className="resultsContainer">
                        <table className="lineItemsTable">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const total = item.editedPrice !== undefined
                                        ? item.editedPrice * (item.qty || 1)
                                        : item.lineTotal;
                                    const unitPrice = item.editedPrice !== undefined
                                        ? item.editedPrice
                                        : item.price;

                                    return (
                                        <tr key={index}>
                                            <td>{item.descClean}</td>
                                            <td>
                                                {editingIndex === index ? (
                                                    <input
                                                        type="number"
                                                        value={editQty}
                                                        onChange={(e) => setEditQty(e.target.value)}
                                                        className="editInput"
                                                    />
                                                ) : (
                                                    item.qty || "-"
                                                )}
                                            </td>
                                            <td>{`${scanResult?.currency ?? ""}${unitPrice.toFixed(2)}`}</td>
                                            <td>
                                                {editingIndex === index ? (
                                                    <div className="inline-edit">
                                                        <input
                                                            type="number"
                                                            value={editTotalPrice}
                                                            onChange={(e) => setEditTotalPrice(e.target.value)}
                                                            className="editInput"
                                                        />
                                                        <button onClick={() => handleEditSave(index)} className="saveBtn">
                                                            Save
                                                        </button>
                                                    </div>
                                                ) : (
                                                    `${scanResult?.currency ?? ""}${total.toFixed(2)}`
                                                )}
                                            </td>
                                            <td>
                                                {editingIndex !== index && (
                                                    <div className="action-btns">
                                                        <button onClick={() => handleEditClick(index)} className="editBtn">
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleRemoveItem(index)} className="editBtn">
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="missing-item-section">
                            <h3 className="resultsSectionTitle">Missing item? Add it here</h3>
                            <div className="addItemRow">
                                <span>Item Name:</span>
                                <input
                                    type="text"
                                    placeholder="Item Name"
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
                                    className="addItemInput"
                                />
                                <span>Quantity:</span>
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={newItemQty}
                                    onChange={(e) => setNewItemQty(e.target.value)}
                                    className="addItemInput"
                                />
                                <span>Total Price:</span>
                                <input
                                    type="number"
                                    placeholder="Total Price"
                                    value={newItemPrice}
                                    onChange={(e) => setNewItemPrice(e.target.value)}
                                    className="addItemInput"
                                />
                                <button onClick={handleAddItem} className="addItemBtn">
                                    Add Item
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="step-actions wizard-nav">
                        <button className="button-secondary" onClick={() => setStep(1)}>Back</button>
                        <button className="main-action-btn" onClick={() => setStep(3)}>Next</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="wizard-step step-store">
                    <h1 className="wizard-title">Select Store</h1>
                    <p className="step-desc">Which store is this receipt from?</p>

                    <div className="storeSearchSection">
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
                    </div>

                    <div className="step-actions wizard-nav">
                        <button className="button-secondary" onClick={() => setStep(2)}>Back</button>
                        <button
                            className="main-action-btn"
                            disabled={!selectedStore || submitLoading}
                            onClick={handleSubmitReceipt}
                        >
                            {submitLoading ? "Uploading..." : "Finish: Save Receipt"}
                        </button>
                    </div>
                    {submitError && <p className="errorText">{submitError}</p>}
                </div>
            )}

            {step === 4 && (
                <div className="wizard-step step-success">
                    <h1 className="wizard-title">Thank You!</h1>
                    <p className="step-desc">Your receipt has been uploaded and prices have been updated.</p>
                    <div className="step-actions">
                        <button className="main-action-btn" onClick={() => {
                            setStep(1);
                            setImage(null);
                            setScanResult(null);
                            setSelectedStore(null);
                            setSearched(false);
                            setStoreResults([]);
                            setStoreQuery("");
                        }}>Upload Another Receipt</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadReceipts;
