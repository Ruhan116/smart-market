# End-to-End Testing Guide: CSV Upload Integration

## Overview
This guide provides step-by-step instructions for testing the integrated CSV upload system that distinguishes between Transaction CSVs and Inventory CSVs.

## System Architecture
- **Backend**: Django REST API with two distinct CSV processing pipelines
- **Frontend**: React with TanStack React Query for state management
- **Data Isolation**: Multi-tenant architecture with business_id-based isolation

## Test Environment Setup

### Prerequisites
1. Backend Django server running on `http://localhost:8000` (or configured port)
2. Frontend React app running on `http://localhost:5173` (or configured port)
3. User account with associated business created
4. Sample CSV files provided:
   - `sample_transaction_data.csv` - Transaction history
   - `sample_inventory_data.csv` - Current inventory stock

## Test Cases

### Test Case 1: Transaction CSV Upload
**Objective**: Verify that transaction history CSV uploads correctly create transaction records

**Steps**:
1. Navigate to Data Upload page (`/upload`)
2. Click "📊 Sales History" tab
3. Select `sample_transaction_data.csv`
4. Verify file details are displayed:
   - File name: `sample_transaction_data.csv`
   - File size shown in KB
5. Click "✅ Upload" button
6. Observe success toast notification: "Transaction CSV uploaded! Processing has started."
7. Wait for upload status to appear in "📜 Recent Uploads" section
8. Monitor progress bar as file processes

**Expected Results**:
- Upload status shows "⏳ Processing"
- File type shows "CSV"
- Progress bar advances
- After processing completes, status shows "✅ Completed"
- Processed rows matches total rows (15 rows in sample)
- Failed rows = 0
- No error message displayed

**Data Validation**:
1. Go to Products page or Inventory page
2. Verify that products from the transaction are listed:
   - Rice, Flour, Sugar, Oil, Wheat, Lentils, Salt
3. Go to Transactions/Transactions List page
4. Verify transaction records were created (should show 15 transactions)
5. Check data integrity:
   - Dates match CSV (all 2024-11-01 to 2024-11-05)
   - Quantities match (5, 3, 2, 10, 4, 6, etc.)
   - Amounts match (250.00, 90.00, 80.00, etc.)

---

### Test Case 2: Inventory CSV Upload
**Objective**: Verify that inventory stock CSV uploads correctly create/update product records and stock movements

**Steps**:
1. Navigate to Data Upload page (`/upload`)
2. Click "📦 Inventory Stock" tab
3. Select `sample_inventory_data.csv`
4. Verify file details are displayed:
   - File name: `sample_inventory_data.csv`
   - File size shown in KB
5. Click "✅ Upload" button
6. Observe success toast notification: "Inventory CSV uploaded! Processing has started."
7. Wait for upload status to appear in "📜 Recent Uploads" section
8. Monitor progress bar as file processes

**Expected Results**:
- Upload status shows "⏳ Processing"
- File type shows "CSV"
- Progress bar advances
- After processing completes, status shows "✅ Completed"
- Processed rows matches total rows (10 rows in sample)
- Failed rows = 0
- No error message displayed

**Data Validation**:
1. Navigate to Inventory page (`/inventory`)
2. Click "📦 Products" tab
3. Verify all 10 products are listed with correct data:
   - Rice: 150 units, ৳50.00, SKU-RICE-001
   - Flour: 200 units, ৳30.00, SKU-FLOUR-001
   - Sugar: 120 units, ৳40.00, SKU-SUGAR-001
   - Oil: 80 units, ৳100.00, SKU-OIL-001
   - Wheat: 100 units, ৳15.00, SKU-WHEAT-001
   - Lentils: 90 units, ৳150.00, SKU-LENTIL-001
   - Salt: 250 units, ৳10.00, SKU-SALT-001
   - Ghee: 60 units, ৳200.00, SKU-GHEE-001
   - Honey: 45 units, ৳300.00, SKU-HONEY-001
   - Spice Mix: 75 units, ৳80.00, SKU-SPICE-001

4. Click "📊 Movements" tab
5. Verify stock movements were created:
   - Movement type should be "initial_load" for the first inventory import
   - One movement record per product (10 total)
   - Quantities match the inventory CSV (150, 200, 120, etc.)

6. Verify alerts were generated if applicable:
   - Click "🔔 Alerts" tab
   - Check if any low-stock alerts were created (depends on reorder points)

---

### Test Case 3: Recording a Sale (Individual Transaction)
**Objective**: Verify that manual sales recording decreases inventory correctly

**Prerequisites**: Complete Test Case 2 first (need products in inventory)

**Steps**:
1. Navigate to Inventory page (`/inventory`)
2. Click "📊 Overview" tab
3. Click "➕ Record Sale" button
4. Modal dialog opens with "📊 Record a Sale" title
5. Fill in form:
   - Product: Select "Rice"
   - Quantity: Enter 10
   - Customer: Select a customer or "Walk-in Customer"
   - Payment Method: Select "cash"
   - Notes: Enter any notes (optional)
6. Observe:
   - Stock availability shown: "Stock: 150 units"
   - Price auto-filled: "৳50.00"
   - Total calculated: "৳500.00" (10 * 50)
7. Click "✓ Record Sale" button
8. Observe success toast: "Sale recorded! New stock: 140 units"

**Expected Results**:
- Modal closes
- Inventory for Rice is updated: 150 → 140 units
- Stock movement record created with type "sale"
- Sale quantity: 10
- Stock before: 150
- Stock after: 140

**Data Validation**:
1. Go to Inventory > Products
2. Verify Rice stock updated to 140
3. Go to Inventory > Movements
4. Verify new movement record:
   - Product: Rice
   - Movement Type: sale
   - Quantity Changed: -10
   - Stock Before: 150
   - Stock After: 140
   - Timestamp: recent

---

### Test Case 4: Alert Generation and Management
**Objective**: Verify that low-stock and out-of-stock alerts are generated

**Steps**:
1. Navigate to Inventory page > 🔔 Alerts tab
2. Observe any alerts generated from the inventory upload
3. If no alerts exist, manually adjust a product's reorder point:
   - Go to Products tab
   - Find a product with high stock (e.g., Salt: 250)
   - Manually record multiple sales to bring it below reorder point
4. After bringing stock below threshold, refresh the page
5. New alert should appear in Alerts tab

**Expected Results**:
- Alert type: "low_stock" or "out_of_stock"
- Product name displayed correctly
- Current stock and threshold shown
- "is_acknowledged" is false initially
- Timestamp shows when alert was created

---

### Test Case 5: CSV Format Validation
**Objective**: Verify that invalid CSVs are rejected with helpful error messages

**Test 5a: Missing Required Columns (Transactions)**
1. Create a CSV missing "Date" column:
   ```
   Product,Quantity,Amount,Customer
   Rice,5,250,John
   ```
2. Upload to "📊 Sales History" tab
3. Expect error: File should show as failed in upload history
4. Error message should indicate missing required column

**Test 5b: Missing Required Columns (Inventory)**
1. Create a CSV missing "Quantity" column:
   ```
   Product,Unit Price,SKU
   Rice,50.00,SKU-001
   ```
2. Upload to "📦 Inventory Stock" tab
3. Expect error: File should show as failed in upload history
4. Error message should indicate missing required column

**Test 5c: Invalid Data Types**
1. Create a CSV with invalid quantity (non-numeric):
   ```
   Date,Product,Quantity,Amount
   2024-11-01,Rice,abc,250
   ```
2. Upload to "📊 Sales History" tab
3. Expect error: Row should be marked as failed
4. Upload status shows partial success with error details

**Test 5d: File Size Limit**
1. Try uploading a CSV > 10MB
2. Expect immediate error: "CSV file exceeds maximum size of 10MB"
3. File is not accepted, not sent to backend

---

### Test Case 6: Concurrent Upload Handling
**Objective**: Verify that multiple uploads can be managed simultaneously

**Steps**:
1. Open two browser tabs, both on Data Upload page
2. Tab 1: Upload transaction CSV
3. Tab 1: Wait for upload to start processing
4. Tab 2: Upload inventory CSV
5. Both uploads should be processing simultaneously
6. Monitor Recent Uploads section showing both files
7. Both should eventually complete successfully

**Expected Results**:
- Both files process without interfering with each other
- Each maintains independent progress tracking
- Final results are accurate for both

---

### Test Case 7: UI/UX Consistency
**Objective**: Verify design language consistency across upload types

**Steps**:
1. Review DataUpload page layout:
   - Check emoji icons are consistent (📊, 📦, 📸)
   - Verify tab structure is clear
   - Confirm format guides are visible and helpful
2. Check error messages:
   - Are they displayed in ErrorBanner component?
   - Are they also shown in toast notifications?
   - Is dismissal possible?
3. Verify upload progress UI:
   - Progress bar visible and updating
   - Stats grid showing (Total, Processed, Failed)
   - Status badges use correct colors

---

## Quick Smoke Test (5 minutes)

1. **Start**: Login and navigate to `/upload`
2. **Transaction**: Upload `sample_transaction_data.csv` to "📊 Sales History" tab
3. **Verify**: Confirm success toast and appears in Recent Uploads
4. **Inventory**: Upload `sample_inventory_data.csv` to "📦 Inventory Stock" tab
5. **Verify**: Confirm success toast and appears in Recent Uploads
6. **Check**: Navigate to Inventory page and verify products are listed
7. **Sale**: Record one manual sale and verify inventory decreased
8. **Done**: All tests pass ✅

---

## Debugging Tips

### If transaction upload fails:
- Check backend logs: `server.log`
- Verify CSV format matches the format guide exactly
- Check if products exist in system before uploading transactions
- Verify business association: `user.business` should not be null

### If inventory upload fails:
- Verify CSV has "Product" and "Quantity" columns (minimum required)
- Check file encoding (should be UTF-8)
- Verify numbers don't have special characters
- Check backend inventory_service.py for processing errors

### If stock not updating after sale:
- Verify product_id is correct
- Check if selected quantity > available stock
- Verify StockMovement records exist in database
- Check if sale recorded successfully by looking at server.log

### If uploads not appearing:
- Check useUploadStatus() hook is being called (should auto-refetch)
- Verify uploadStatusData has results
- Try manual page refresh
- Check browser console for API errors

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Transaction CSV Upload | ✅/❌ | |
| 2. Inventory CSV Upload | ✅/❌ | |
| 3. Recording a Sale | ✅/❌ | |
| 4. Alert Generation | ✅/❌ | |
| 5. CSV Format Validation | ✅/❌ | |
| 6. Concurrent Uploads | ✅/❌ | |
| 7. UI/UX Consistency | ✅/❌ | |

---

## Sign-Off

- **Tested By**: _______________
- **Date**: _______________
- **Backend Version**: _________
- **Frontend Version**: _________
- **All Tests Passed**: ☐ Yes ☐ No
