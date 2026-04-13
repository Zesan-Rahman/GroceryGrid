## GET /api/stores

### Description
Retrives all grocery stores

### Response
| Field | Type | Description |
| :--- | :--- | :--- |
| store_id | integer | Store PK |
| name | string | The retail brand or location name. |
| address | string | Full physical address. |
| latitude | number | Latitude for GPS/Map placement. |
| longitude | number | Longitude for GPS/Map placement. |
| phone | string? | Contact phone number. |
| website | string? | Official store website URL. |
| hours | object | A JSONB object where keys are days `"mon" | "tue" | "wed" | ...` and values are objects containing "open" and "close" mapping to "HH:MM". |
| parking | string? | Description of parking type. |

## GET /api/stores/:id/catalog

### Description
Gets the product catalog for a specific store

### Response
| Field | Type | Description |
| :--- | :--- | :--- |
| item_id | integer | Item PK |
| name | string | Product name. |
| category | string? | The department or category the item belongs to. |
| price | number | The latest recorded price found in price_entries. |
| last_updated | string | The date the price was logged (ISO 8601 format). |
