import { useEffect, useState, type FormEvent } from "react";

import NavBar from "../components/NavBar";
import { getOwnerStore, updateOwnerStore, type OwnerStore } from "../api/stores";

interface StoreFormState {
  name: string;
  website: string;
  phone: string;
  parking: string;
}

function formStateFromStore(store: OwnerStore): StoreFormState {
  return {
    name: store.name,
    website: store.website ?? "",
    phone: store.phone ?? "",
    parking: store.parking ?? "",
  };
}

export default function MyStorePage() {
  const [store, setStore] = useState<OwnerStore | null>(null);
  const [form, setForm] = useState<StoreFormState>({
    name: "",
    website: "",
    phone: "",
    parking: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      setLoading(true);
      try {
        const ownerStore = await getOwnerStore();
        if (cancelled) {
          return;
        }

        setStore(ownerStore);
        setForm(formStateFromStore(ownerStore));
        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load store details");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStore();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleFieldChange(field: keyof StoreFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updatedStore = await updateOwnerStore(form);
      setStore(updatedStore);
      setForm(formStateFromStore(updatedStore));
      setSuccess("Store details updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update store");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="owner-store-page">
        <section className="owner-store-shell">
          <div className="owner-store-header">
            <div>
              <p className="owner-store-eyebrow">Store Owner Dashboard</p>
              <h1>My Store Page</h1>
              <p className="owner-store-lead">
                Update the public details shoppers see for your store and monitor store
                activity at a glance.
              </p>
            </div>
          </div>

          {loading ? <p>Loading store details...</p> : null}
          {error ? <p className="status-error">{error}</p> : null}
          {success ? <p className="status-success">{success}</p> : null}

          {!loading && store ? (
            <div className="owner-store-grid">
              <section className="owner-store-panel">
                <h2>Store Info</h2>
                <p className="owner-store-address">{store.address}</p>
                <form onSubmit={(event) => void handleSubmit(event)}>
                  <div>
                    <label htmlFor="store-name">Store Name</label>
                    <input
                      id="store-name"
                      value={form.name}
                      onChange={(event) => handleFieldChange("name", event.target.value)}
                      maxLength={255}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="store-website">Website</label>
                    <input
                      id="store-website"
                      value={form.website}
                      onChange={(event) => handleFieldChange("website", event.target.value)}
                      maxLength={255}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="store-phone">Phone</label>
                    <input
                      id="store-phone"
                      value={form.phone}
                      onChange={(event) => handleFieldChange("phone", event.target.value)}
                      maxLength={20}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label htmlFor="store-parking">Parking</label>
                    <input
                      id="store-parking"
                      value={form.parking}
                      onChange={(event) => handleFieldChange("parking", event.target.value)}
                      maxLength={50}
                      placeholder="Lot available, street parking, valet, etc."
                    />
                  </div>

                  <button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Store Details"}
                  </button>
                </form>
              </section>

              <section className="owner-store-panel">
                <h2>Store Analytics</h2>
                <div className="owner-store-metrics">
                  <article className="owner-store-metric-card">
                    <span className="owner-store-metric-label">Price Entries</span>
                    <strong>{store.entry_count}</strong>
                    <p>Total price records currently linked to this store.</p>
                  </article>

                  <article className="owner-store-metric-card">
                    <span className="owner-store-metric-label">Unique Items</span>
                    <strong>{store.item_count}</strong>
                    <p>Distinct items that currently appear in your catalog data.</p>
                  </article>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
