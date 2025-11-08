# Quick Start Guide: CSV Upload Integration

## 🎯 What Changed?

You now have a unified upload system that handles two different CSV types:

### Before ❌
- Transaction and inventory uploads were confusing
- No clear separation between upload types
- Inventory management was incomplete

### After ✅
- **Separate tabs** for each upload type
- **Clear labels** and format guides
- **Full inventory management** system
- **Automatic stock tracking** and alerts

---

## 📍 Where to Go

### For Users
1. **Upload Data**: `/upload` page
   - Tab 1: 📊 Sales History (Transaction CSV)
   - Tab 2: 📦 Inventory Stock (Inventory CSV)
   - Tab 3: 📸 Receipt OCR (Image uploads)

2. **Manage Inventory**: `/inventory` page
   - View products and stock levels
   - See stock movement history
   - Manage low-stock alerts
   - Record individual sales

### For Developers
1. Read: `DEVELOPER_QUICK_REFERENCE.md`
2. Review: `CSV_UPLOAD_INTEGRATION_SUMMARY.md`
3. Test: Follow `E2E_TESTING_GUIDE.md`

---

## 🚀 Quick Start (5 minutes)

### Step 1: Navigate to Upload Page
```
Go to: http://localhost:5173/upload
```

### Step 2: Upload Transaction CSV
```
1. Click "📊 Sales History" tab
2. Click "Choose File" button
3. Select: sample_transaction_data.csv
4. Click "✅ Upload" button
5. Watch progress in "Recent Uploads" section
```

### Step 3: Upload Inventory CSV
```
1. Click "📦 Inventory Stock" tab
2. Click "Choose File" button
3. Select: sample_inventory_data.csv
4. Click "✅ Upload" button
5. Watch progress in "Recent Uploads" section
```

### Step 4: View Inventory
```
1. Go to: http://localhost:5173/inventory
2. View products in "📦 Products" tab
3. See stock movements in "📊 Movements" tab
4. Check alerts in "🔔 Alerts" tab
```

### Step 5: Record a Sale
```
1. Click "➕ Record Sale" button
2. Select a product
3. Enter quantity
4. Choose payment method
5. Click "✓ Record Sale"
6. See updated stock
```

---

## 📊 Transaction CSV Format

**Required Columns** (must have):
- `Date` - YYYY-MM-DD format
- `Product` - Product name
- `Quantity` - Number sold
- `Amount` - Total price

**Optional Columns**:
- `Customer` - Customer name
- `PaymentMethod` - cash, bkash, nagad, rocket, card, credit, other

**Example**:
```csv
Date,Product,Quantity,Amount,Customer,PaymentMethod
2024-11-01,Rice,5,250.00,Rshid Ahmed,cash
2024-11-01,Flour,3,90.00,Shahin Akter,bkash
2024-11-02,Rice,10,500.00,,nagad
```

---

## 📦 Inventory CSV Format

**Required Columns** (must have):
- `Product` - Product name
- `Quantity` - Current stock count

**Optional Columns**:
- `Unit Price` - Price per unit
- `SKU` - Stock keeping unit code

**Example**:
```csv
Product,Quantity,Unit Price,SKU
Rice,150,50.00,SKU-RICE-001
Flour,200,30.00,SKU-FLOUR-001
Sugar,120,40.00,SKU-SUGAR-001
```

---

## 🔗 Key Endpoints

### Upload Endpoints
```
POST /api/data/upload-csv/              → Upload transaction CSV
POST /api/inventory/upload-stock/       → Upload inventory CSV
GET  /api/data/upload-csv/{file_id}/    → Check transaction upload status
GET  /api/inventory/upload-stock/{id}/  → Check inventory upload status
```

### Inventory Endpoints
```
POST /api/inventory/transactions/       → Record a sale
GET  /api/inventory/products/           → List products
GET  /api/inventory/movements/          → Stock movement history
GET  /api/inventory/alerts/             → List alerts
GET  /api/inventory/report/             → Inventory report
```

---

## 📁 Important Files

### Backend
| File | Purpose |
|------|---------|
| `backend/data/models.py` | Database models (InventoryUploadRecord, StockMovement, StockAlert) |
| `backend/data/inventory_service.py` | Business logic for inventory |
| `backend/data/views.py` | API endpoints |
| `backend/data/urls.py` | URL routing |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/pages/DataUpload.tsx` | Upload interface (3 tabs) |
| `frontend/src/pages/Inventory.tsx` | Inventory dashboard (4 tabs) |
| `frontend/src/components/SaleRecorder.tsx` | Sale recording modal |
| `frontend/src/hooks/useDataUpload.ts` | API hooks |

### Documentation
| File | Purpose |
|------|---------|
| `E2E_TESTING_GUIDE.md` | How to test everything |
| `CSV_UPLOAD_INTEGRATION_SUMMARY.md` | Full architecture docs |
| `DEVELOPER_QUICK_REFERENCE.md` | Developer guide |
| `IMPLEMENTATION_COMPLETE.md` | Completion summary |

---

## ✅ Testing Checklist

- [ ] Transaction CSV uploads successfully
- [ ] Inventory CSV uploads successfully
- [ ] Products appear in inventory page
- [ ] Stock movements tracked
- [ ] Sales can be recorded
- [ ] Stock decreases after sale
- [ ] Alerts generated for low stock
- [ ] Recent uploads show status correctly
- [ ] All error messages helpful
- [ ] Multi-tab navigation works

---

## 🆘 Common Issues

### CSV won't upload
- ✅ File size < 10MB?
- ✅ File format is .csv?
- ✅ Columns match format guide?
- ✅ No special characters in numbers?

### Products not appearing
- ✅ Inventory CSV uploaded successfully?
- ✅ Page refreshed after upload?
- ✅ Check "Recent Uploads" shows "✅ Completed"?
- ✅ User has permission to view products?

### Stock not updating
- ✅ Product selected with available stock?
- ✅ Quantity < available stock?
- ✅ Sale recorded successfully (toast confirmation)?
- ✅ Page refreshed after sale?

### Can't see uploads
- ✅ User is staff? (required for uploads list)
- ✅ Same business? (data isolation)
- ✅ Recent uploads section visible? (may be below fold)

---

## 🔍 Debug Tips

### View server logs
```bash
cd d:\Thesis\Hoes\Sheba\SME
tail -f backend/server.log
```

### Check database
```bash
python manage.py shell
>>> from data.models import Product, InventoryUploadRecord
>>> Product.objects.count()  # Check product count
>>> InventoryUploadRecord.objects.latest('uploaded_at')  # Latest upload
```

### Check API directly
```bash
curl http://localhost:8000/api/inventory/products/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Full Documentation

For complete information:
- **Testing**: See `E2E_TESTING_GUIDE.md`
- **Architecture**: See `CSV_UPLOAD_INTEGRATION_SUMMARY.md`
- **Development**: See `DEVELOPER_QUICK_REFERENCE.md`
- **Status**: See `IMPLEMENTATION_COMPLETE.md`

---

## 🎓 Learning Path

1. **First Time**: Quick Start (this guide)
2. **More Details**: `DEVELOPER_QUICK_REFERENCE.md`
3. **Full Understanding**: `CSV_UPLOAD_INTEGRATION_SUMMARY.md`
4. **Test Everything**: `E2E_TESTING_GUIDE.md`
5. **Troubleshoot**: Check relevant section in quick reference

---

## 💡 Pro Tips

1. **Bulk Upload**: You can upload both CSVs and let them process together
2. **Check Status**: "Recent Uploads" section updates in real-time
3. **Format Matters**: Use exact column names in your CSV
4. **Sample Data**: Use provided CSV files to learn the format
5. **Error Details**: Check upload status for specific error messages
6. **Alerts**: Low-stock alerts auto-generate, you just acknowledge them
7. **Audit Trail**: Every stock change is tracked in Movements tab

---

## 📞 Quick Links

| Link | Description |
|------|-------------|
| [Upload Page](/upload) | Go to data upload |
| [Inventory Page](/inventory) | Go to inventory management |
| [Home](/home) | Back to home |

---

## Version Info

- **Implementation Date**: November 7, 2024
- **Status**: Ready for Testing
- **Version**: 1.0
- **Last Updated**: November 7, 2024

---

**Ready to get started?** 👉 Go to `/upload` and upload your first CSV!
