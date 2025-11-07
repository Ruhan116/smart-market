# CSV Upload Integration: Transaction vs Inventory

## Summary
Successfully implemented a unified yet distinct CSV upload system that handles two different upload types: Transaction History (past sales data) and Inventory Stock (current product levels). Both are accessible from a single Data Upload page with clear separation and distinct processing pipelines.

## Key Changes

### 1. Backend Endpoints

#### Transaction CSV Endpoint (Existing)
- **Endpoint**: `POST /api/data/upload-csv/`
- **Status Endpoint**: `GET /api/data/upload-csv/{file_id}/`
- **Purpose**: Import historical sales transactions
- **Required Columns**: Date, Product, Quantity, Amount
- **Optional Columns**: Customer, PaymentMethod
- **Processing**: Creates Transaction records, updates Product revenue/sales stats
- **Output Model**: `FileUploadRecord` (stores with `file_type: 'csv'`)

#### Inventory CSV Endpoint (New)
- **Endpoint**: `POST /api/inventory/upload-stock/`
- **Status Endpoint**: `GET /api/inventory/upload-stock/{record_id}/`
- **Purpose**: Set current inventory stock levels and prices
- **Required Columns**: Product, Quantity
- **Optional Columns**: Unit Price, SKU
- **Processing**: Creates/Updates Product records, generates StockMovement records, creates alerts
- **Output Model**: `InventoryUploadRecord` (new model for inventory uploads)

#### Supporting Endpoints
- `POST /api/inventory/transactions/` - Record individual sales
- `GET /api/inventory/products/` - List all products with stock info
- `GET /api/inventory/movements/` - View stock movement history
- `GET /api/inventory/alerts/` - View and manage stock alerts
- `GET /api/inventory/report/` - Get inventory summary report

### 2. Backend Database Models

#### New Models
- **InventoryUploadRecord**: Tracks inventory CSV uploads with processing status, row counts, error tracking
- **StockMovement**: Complete audit trail of all inventory changes (sales, adjustments, returns, damage, restock, initial_load)
- **StockAlert**: Tracks low-stock and out-of-stock alerts with acknowledgment tracking

#### Updated Models
- **Product**: Enhanced with fields for stock management (current_stock, reorder_point)
- **Transaction**: Unchanged, still used for transaction history

### 3. Backend Services

#### InventoryUploadService
Handles CSV parsing for inventory stock uploads:
- Validates Product and Quantity (required columns)
- Validates Unit Price and SKU (optional columns)
- Auto-creates or updates Product records
- Generates StockMovement records with type: 'initial_load'
- Creates alerts for products with low/out of stock levels
- Handles CSV parsing errors gracefully with detailed error tracking

#### SaleRecorderService
Records individual sales and updates inventory atomically:
- Validates stock availability before recording sale
- Creates StockMovement records with type: 'sale'
- Auto-creates alerts if stock drops below threshold
- Uses database-level locking (select_for_update) to prevent race conditions
- Returns new stock level after sale

#### InventoryReportService
Generates comprehensive inventory reports:
- Total stock value calculation
- Low-stock and out-of-stock product counts
- Product breakdown by status

### 4. Frontend Components

#### DataUpload Page (Rewritten)
- **File**: `frontend/src/pages/DataUpload.tsx`
- **Tabs**: Three distinct tabs with separate functionality
  1. **📊 Sales History Tab** (Transactions)
     - Upload historical sales CSV data
     - Format guide for transaction CSV columns
     - Separate file input and upload handler
     - Uses `useUploadCsv()` hook

  2. **📦 Inventory Stock Tab** (Inventory)
     - Upload current inventory stock and prices
     - Format guide for inventory CSV columns
     - Separate file input and upload handler
     - Uses `useUploadInventoryCsv()` hook

  3. **📸 Receipt OCR Tab** (Existing)
     - Upload receipt images for OCR processing
     - Uses `useUploadReceipt()` hook

- **Common Features** (All tabs)
  - Error banner at top of page
  - File selection with drag-and-drop support (text-based UI)
  - File size validation (10MB for CSV, 5MB for images)
  - File type validation (CSV for transactions/inventory, JPG/PNG for receipts)
  - Upload progress tracking with Recent Uploads section
  - Status indicators with emoji icons (✅ Completed, ⏳ Processing, ❌ Failed)
  - Detailed error messages on upload failure
  - Toast notifications for success/failure

#### Inventory Page (Full Implementation)
- **File**: `frontend/src/pages/Inventory.tsx`
- **Tabs**:
  1. **📊 Overview** - Summary statistics and top products
  2. **📦 Products** - Complete product list with stock levels
  3. **📊 Movements** - Historical stock movements with visual indicators
  4. **🔔 Alerts** - Low-stock and out-of-stock alerts with acknowledgment
- **Features**:
  - Real-time inventory data
  - Stock level indicators with progress bars
  - "Record Sale" modal for manual transactions
  - Stock movement history with reasons
  - Alert management with acknowledgment tracking

#### SaleRecorder Component (New)
- **File**: `frontend/src/components/SaleRecorder.tsx`
- **Purpose**: Modal dialog for recording individual sales
- **Form Fields**:
  - Product selection with stock availability display
  - Quantity with validation (must be ≤ available stock)
  - Customer selection (optional)
  - Payment method selection
  - Notes (optional)
- **Features**:
  - Real-time total calculation
  - Stock availability validation
  - Type-safe error handling
  - Auto-populated unit price from product

### 5. Frontend Hooks

#### useDataUpload.ts (Enhanced)
- **useUploadCsv()** - Upload transaction CSV to `/api/data/upload-csv/`
- **useUploadInventoryCsv()** (New) - Upload inventory CSV to `/api/inventory/upload-stock/`
- **useUploadReceipt()** - Upload receipt image to `/api/data/upload-receipt/`
- **useUploadStatus()** - Get status of all uploads (staff-only, auto-refetch)
- **useTransactionsList()** - Get list of transactions with filtering
- **useFailedJobs()** - Get list of failed upload jobs
- **useRetryFailedJob()** - Retry a failed job
- **useReceiptPreview()** - Get extracted data from uploaded receipt
- **useConfirmReceipt()** - Confirm and save receipt data
- **useRejectReceipt()** - Reject a receipt

### 6. Key Design Decisions

#### 1. Separate Endpoints
- **Why**: Different data sources (transactions vs. inventory) have different validation rules, processing requirements, and outputs
- **Benefit**: Cleaner API contracts, better error handling, easier to maintain

#### 2. Unified UI (Single DataUpload Page)
- **Why**: User only needs to know about "uploading data", the system categorizes it
- **Benefit**: Simpler mental model, discoverable in one place, consistent design language

#### 3. Tab-Based Organization
- **Why**: Clearly separates three distinct upload types without cluttering the UI
- **Benefit**: Scalable (can add more upload types), organized, clear visual hierarchy

#### 4. Database-Level Stock Locking
- **Why**: Prevents race conditions when multiple sales are recorded simultaneously
- **Benefit**: Data integrity guaranteed, no overselling possible

#### 5. Movement Audit Trail
- **Why**: Tracks every inventory change with reason and user
- **Benefit**: Complete audit trail, enables reconciliation, helps with troubleshooting

#### 6. Alert System
- **Why**: Proactively notifies about low stock or stock-outs
- **Benefit**: Reduces manual monitoring, prevents stockouts, improves business operations

## File Changes

### Backend Files
```
backend/data/models.py
  ├─ Added: InventoryUploadRecord model
  ├─ Added: StockMovement model
  └─ Added: StockAlert model

backend/data/inventory_service.py (NEW)
  ├─ InventoryUploadService
  ├─ SaleRecorderService
  └─ InventoryReportService

backend/data/views.py
  ├─ Modified: Added inventory endpoints
  ├─ Added: upload_inventory_csv()
  ├─ Added: get_inventory_upload_status()
  ├─ Added: record_sale()
  ├─ Added: ProductListViewSet
  ├─ Added: StockMovementViewSet
  ├─ Added: StockAlertViewSet
  └─ Added: get_inventory_report()

backend/data/urls.py
  └─ Modified: Added inventory endpoint routes

backend/data/serializers.py
  ├─ Added: InventoryUploadStatusSerializer
  ├─ Added: ProductDetailSerializer
  ├─ Added: StockMovementSerializer
  ├─ Added: StockAlertSerializer
  └─ Added: InventoryReportSerializer

backend/data/admin.py
  ├─ Added: InventoryUploadRecordAdmin
  ├─ Added: StockMovementAdmin
  └─ Added: StockAlertAdmin
```

### Frontend Files
```
frontend/src/pages/DataUpload.tsx
  └─ Rewritten: 3-tab interface with distinct CSV upload types

frontend/src/pages/Inventory.tsx (NEW)
  ├─ Overview tab with summary stats
  ├─ Products tab with stock listing
  ├─ Movements tab with audit trail
  └─ Alerts tab with acknowledgment

frontend/src/components/SaleRecorder.tsx (NEW)
  └─ Modal dialog for recording individual sales

frontend/src/components/InventoryUploader.tsx
  └─ DELETED: Consolidated into DataUpload page inventory tab

frontend/src/hooks/useDataUpload.ts
  └─ Added: useUploadInventoryCsv() hook

frontend/src/App.tsx
  ├─ Added: Inventory page import
  └─ Added: /inventory route with bottom tab icon
```

### Documentation Files (NEW)
```
E2E_TESTING_GUIDE.md
  └─ Comprehensive testing guide for all upload scenarios

CSV_UPLOAD_INTEGRATION_SUMMARY.md (This file)
  └─ Architecture and implementation details

sample_transaction_data.csv
  └─ Sample data for testing transaction uploads

sample_inventory_data.csv
  └─ Sample data for testing inventory uploads
```

## Testing

See [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) for comprehensive testing procedures covering:

1. ✅ Transaction CSV uploads
2. ✅ Inventory CSV uploads
3. ✅ Recording individual sales
4. ✅ Alert generation and management
5. ✅ CSV format validation
6. ✅ Concurrent upload handling
7. ✅ UI/UX consistency

Sample data files provided:
- `sample_transaction_data.csv` - 15 transaction records
- `sample_inventory_data.csv` - 10 product inventory records

## API Request/Response Examples

### Upload Transaction CSV
```bash
curl -X POST http://localhost:8000/api/data/upload-csv/ \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@sample_transaction_data.csv"

# Response (202 Accepted)
{
  "status": "pending",
  "data": {
    "message": "Processing file...",
    "file_id": "uuid-here",
    "file_name": "sample_transaction_data.csv"
  }
}
```

### Upload Inventory CSV
```bash
curl -X POST http://localhost:8000/api/inventory/upload-stock/ \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@sample_inventory_data.csv"

# Response (202 Accepted)
{
  "status": "pending",
  "data": {
    "message": "Processing inventory file...",
    "record_id": "uuid-here",
    "file_name": "sample_inventory_data.csv"
  }
}
```

### Record a Sale
```bash
curl -X POST http://localhost:8000/api/inventory/transactions/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "product-uuid",
    "quantity": 5,
    "unit_price": 50.00,
    "customer_id": "customer-uuid",
    "payment_method": "cash",
    "notes": "Sample sale"
  }'

# Response (201 Created)
{
  "new_stock": 95
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  DataUpload Page                                              │
│  ├─ 📊 Sales History Tab → useUploadCsv()                   │
│  ├─ 📦 Inventory Stock Tab → useUploadInventoryCsv()        │
│  └─ 📸 Receipt OCR Tab → useUploadReceipt()                 │
│                                                               │
│  Inventory Page (Full Dashboard)                             │
│  ├─ Overview Tab                                             │
│  ├─ Products Tab                                             │
│  ├─ Movements Tab                                            │
│  ├─ Alerts Tab                                               │
│  └─ SaleRecorder Modal                                       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway (Django)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Transaction Pipeline              Inventory Pipeline        │
│  ├─ POST /api/data/upload-csv/     ├─ POST /api/inventory/  │
│  │                                   upload-stock/           │
│  ├─ CSVParserService               ├─ InventoryUploadService│
│  │  (Transaction validation)        │  (Product validation)  │
│  │                                   │                       │
│  ├─ Create Transaction records      ├─ Create/Update        │
│  │  + FailedJob on error           │  Product records       │
│  │                                   ├─ Create StockMovement │
│  └─ FileUploadRecord               │  (type: initial_load)  │
│     (file_type: 'csv')             ├─ Create StockAlert     │
│                                      │  if needed            │
│                                      │                       │
│                                      └─ InventoryUploadRecord│
│                                                               │
│  Sale Recording                    Alert Management          │
│  ├─ POST /api/inventory/           ├─ GET /api/inventory/   │
│  │  transactions/                  │  alerts/               │
│  ├─ SaleRecorderService            ├─ Acknowledge action    │
│  │  (Stock validation +            └─ Auto-generation based │
│  │   database locking)                on thresholds         │
│  ├─ Create StockMovement                                    │
│  │  (type: sale)                                             │
│  └─ Auto-decrease product stock                              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                   Database (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FileUploadRecord    InventoryUploadRecord                    │
│  (Transaction CSVs)  (Inventory CSVs)                        │
│        ↓                      ↓                               │
│     Transaction         Product                              │
│                            ↓                                  │
│                      StockMovement                            │
│                            ↓                                  │
│                       StockAlert                              │
│                                                               │
│  All entities isolated by: business_id (multi-tenant)       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Transaction CSV Upload Flow
```
1. User selects transaction CSV
2. Frontend validates: format, size (≤10MB)
3. Frontend shows file preview
4. User clicks Upload
5. POST /api/data/upload-csv/ with file
6. Backend creates FileUploadRecord (status: pending)
7. Background thread starts CSV parsing
8. For each row:
   - Find/create Product
   - Create Transaction record
   - Calculate revenue
   - On error: create FailedJob record
9. Update FileUploadRecord status (completed/failed)
10. Frontend polls for status updates
11. User sees progress in Recent Uploads
```

### Inventory CSV Upload Flow
```
1. User selects inventory CSV
2. Frontend validates: format, size (≤10MB)
3. Frontend shows file preview
4. User clicks Upload
5. POST /api/inventory/upload-stock/ with file
6. Backend creates InventoryUploadRecord (status: pending)
7. Background thread processes CSV
8. For each row:
   - Find or create Product
   - Update/set current_stock = quantity
   - Set/update unit_price (if provided)
   - Create StockMovement (type: initial_load)
   - Create StockAlert if stock < reorder_point
   - On error: record in processing_errors
9. Update InventoryUploadRecord status (completed/failed)
10. Frontend polls for status updates
11. User sees progress in Recent Uploads
```

### Sale Recording Flow
```
1. User clicks "Record Sale" on Inventory page
2. SaleRecorder modal opens
3. User selects product (auto-fills stock, price)
4. User enters quantity
5. Validation: quantity ≤ available_stock
6. User selects customer, payment method
7. User clicks "Record Sale"
8. POST /api/inventory/transactions/ with sale data
9. Backend (SaleRecorderService):
   - Lock product record (database-level)
   - Check stock availability (atomic check)
   - Decrease stock
   - Create StockMovement (type: sale)
   - Create StockAlert if stock < threshold
   - Unlock product
10. Response includes new_stock
11. Modal closes, inventory refreshed
12. User sees updated stock level
```

## Multi-Tenancy Implementation

Every upload operation is isolated by `business_id`:

```python
# Get user's business
business = request.user.business

# Transaction CSV
FileUploadRecord.objects.filter(business=business, ...)

# Inventory CSV
InventoryUploadRecord.objects.filter(business=business, ...)

# Products
Product.objects.filter(business=business, ...)

# All data isolated at query level
```

## Performance Considerations

1. **Batch Processing**: Background threads use ThreadPoolExecutor (max 5 workers)
2. **Database Locking**: Sales use `select_for_update()` to prevent race conditions
3. **Indexing**: Created on:
   - (business_id, status) for FileUploadRecord
   - (business_id, product_id) for StockMovement
   - (business_id, product_id) for StockAlert
4. **Caching**: Upload status uses 2-5 second staleTime for real-time feel
5. **Pagination**: Products and movements support pagination (default 20 items)

## Security Considerations

1. **Authentication**: All endpoints require JWT token
2. **Authorization**: All queries filtered by business_id (user's business)
3. **File Validation**:
   - File type checking (MIME type + extension)
   - File size limits (10MB CSV, 5MB images)
   - CSV parsing with error handling
4. **SQL Injection**: Protected by Django ORM
5. **Race Conditions**: Prevented by database-level locking in sale recording
6. **Rate Limiting**: 10 uploads per minute per business

## Future Enhancements

1. **Barcode Scanning**: Replace form-based sale recording with barcode scanner
2. **Batch Sales Recording**: Record multiple sales at once
3. **Inventory Adjustments**: UI for inventory corrections (damage, loss, found items)
4. **Historical Reports**: Detailed inventory analytics and trends
5. **Low Stock Notifications**: Email/SMS alerts to staff
6. **Supplier Integration**: Auto-reorder when stock hits threshold
7. **Stock Transfer**: Between locations/warehouses
8. **Product Variants**: Support for product variants (sizes, colors)

## Troubleshooting

### Transaction CSV not creating records
- Check that products exist first
- Verify CSV format matches guide exactly
- Look for FailedJob records for detailed error info

### Inventory CSV failing to process
- Verify "Product" and "Quantity" columns exist
- Check numeric values don't have special characters
- Ensure file encoding is UTF-8

### Stock not decreasing after sale
- Verify product exists and has stock
- Check that quantity entered ≤ available stock
- Look for StockMovement record in database

### Alerts not generating
- Verify reorder_point is set on products
- Check if stock level is actually below threshold
- Review StockAlert creation in InventoryUploadService

## Rollback Procedure

If issues occur, rollback steps:

```bash
# 1. Revert database migrations (if any)
python manage.py migrate data <last-working-migration>

# 2. Revert frontend code (git)
git checkout <last-working-commit> -- frontend/

# 3. Restart services
docker-compose restart
```

## Sign-Off

**Implementation Date**: November 7, 2024
**Status**: ✅ Complete
**Testing Status**: Pending (see E2E_TESTING_GUIDE.md)
**Ready for Production**: After testing completion
