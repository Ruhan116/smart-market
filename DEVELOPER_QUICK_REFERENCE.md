# CSV Upload Integration: Developer Quick Reference

## Quick Start

### For Backend Developers

**Transaction CSV Processing**
```python
# Entry point: views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_csv(request):
    # → Creates FileUploadRecord
    # → Spawns background thread with _process_csv_file()
    # → Returns record_id for status polling

# Processing function
def _process_csv_file(file_id: uuid):
    # Uses CSVParserService
    # Creates Transaction records
    # Creates FailedJob records on errors
```

**Inventory CSV Processing**
```python
# Entry point: views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_inventory_csv(request):
    # → Creates InventoryUploadRecord
    # → Spawns background thread with _process_inventory_upload()
    # → Returns record_id for status polling

# Processing function
def _process_inventory_upload(record_id: uuid):
    # Uses InventoryUploadService
    # Creates/Updates Product records
    # Creates StockMovement records
    # Creates StockAlert records
```

**Recording a Sale**
```python
# Entry point: views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_sale(request):
    # Uses SaleRecorderService
    # Returns new_stock after decreasing inventory
    # Atomically updates with database locking
```

### For Frontend Developers

**Using Upload Hooks**
```typescript
// Transaction CSV
const uploadTransactionMutation = useUploadCsv();
await uploadTransactionMutation.mutateAsync(file);

// Inventory CSV
const uploadInventoryMutation = useUploadInventoryCsv();
await uploadInventoryMutation.mutateAsync(file);

// Check status
const { data: uploadStatusData } = useUploadStatus();
```

**Recording a Sale**
```typescript
// Modal component handles it all
import SaleRecorder from '@/components/SaleRecorder';

<SaleRecorder
  open={isOpen}
  onOpenChange={setIsOpen}
  onSaleRecorded={() => refetchInventory()}
/>
```

## Key Files Reference

| File | Purpose | Key Functions/Classes |
|------|---------|----------------------|
| `backend/data/views.py` | API endpoints | `upload_csv()`, `upload_inventory_csv()`, `record_sale()` |
| `backend/data/inventory_service.py` | Business logic | `InventoryUploadService`, `SaleRecorderService`, `InventoryReportService` |
| `backend/data/models.py` | Database models | `InventoryUploadRecord`, `StockMovement`, `StockAlert` |
| `frontend/src/pages/DataUpload.tsx` | Upload interface | 3-tab interface with separate handlers |
| `frontend/src/pages/Inventory.tsx` | Inventory dashboard | Overview, Products, Movements, Alerts tabs |
| `frontend/src/components/SaleRecorder.tsx` | Sale form modal | Modal dialog for recording sales |
| `frontend/src/hooks/useDataUpload.ts` | API hooks | `useUploadCsv()`, `useUploadInventoryCsv()`, etc. |

## Common Tasks

### Add a New Column to Transaction CSV
1. Update CSV validation in `CSVParserService`
2. Update frontend format guide in `DataUpload.tsx`
3. Handle new column in transaction creation logic
4. Update sample_transaction_data.csv

### Add a New Column to Inventory CSV
1. Update `InventoryUploadService` validation
2. Update frontend format guide in `DataUpload.tsx`
3. Handle column in product creation/update logic
4. Update sample_inventory_data.csv

### Add a New Stock Movement Type
1. Add to `MOVEMENT_TYPE_CHOICES` in `StockMovement` model
2. Update service that creates movements
3. Add UI indicator for new type in Movements tab
4. Update audit logging if needed

### Change Alert Threshold
1. Modify `reorder_point` on Product model
2. Update `InventoryUploadService` alert creation logic
3. Update Alert UI to show new threshold
4. Re-run inventory uploads to trigger alerts

### Add a New Product Endpoint Filter
1. Create FilterSet class in views.py
2. Add to ProductListViewSet
3. Update `useInventoryProducts()` hook with filter params
4. Update Products tab UI with filter UI

## Database Queries Reference

### Find all products for a business
```python
Product.objects.filter(business_id=business_id)
```

### Find recent stock movements
```python
StockMovement.objects.filter(
    business_id=business_id
).order_by('-created_at')[:50]
```

### Find low-stock alerts
```python
StockAlert.objects.filter(
    business_id=business_id,
    alert_type='low_stock',
    is_acknowledged=False
)
```

### Find failed inventory uploads
```python
InventoryUploadRecord.objects.filter(
    business_id=business_id,
    status='failed'
)
```

### Find upload errors
```python
upload = InventoryUploadRecord.objects.get(record_id=record_id)
errors = upload.processing_errors  # Returns dict of row_number: error_message
```

## API Call Examples

### Upload Transaction CSV
```bash
curl -X POST http://localhost:8000/api/data/upload-csv/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@transactions.csv"
```

### Check Upload Status
```bash
curl -X GET http://localhost:8000/api/data/upload-csv/{file_id}/ \
  -H "Authorization: Bearer $TOKEN"
```

### Upload Inventory CSV
```bash
curl -X POST http://localhost:8000/api/inventory/upload-stock/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@inventory.csv"
```

### Record a Sale
```bash
curl -X POST http://localhost:8000/api/inventory/transactions/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "uuid",
    "quantity": 5,
    "unit_price": 50.00,
    "customer_id": "uuid",
    "payment_method": "cash"
  }'
```

### Get Products with Stock
```bash
curl -X GET http://localhost:8000/api/inventory/products/ \
  -H "Authorization: Bearer $TOKEN"
```

### Get Stock Movements
```bash
curl -X GET "http://localhost:8000/api/inventory/movements/?product_id=uuid&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Stock Alerts
```bash
curl -X GET http://localhost:8000/api/inventory/alerts/ \
  -H "Authorization: Bearer $TOKEN"
```

## Debugging Checklist

### Upload not appearing in Recent Uploads
- [ ] Check `useUploadStatus()` is being called
- [ ] Verify user is staff (required to see uploads)
- [ ] Check network tab for API errors
- [ ] Verify business association: `request.user.business` exists

### Sale not decreasing stock
- [ ] Check product exists: `Product.objects.get(product_id=...)`
- [ ] Verify quantity ≤ available stock
- [ ] Check StockMovement created: `StockMovement.objects.filter(product_id=...)`
- [ ] Verify database transaction committed (no rollback)

### CSV parsing failing
- [ ] Check file encoding (should be UTF-8)
- [ ] Verify required columns present
- [ ] Check for special characters in numeric fields
- [ ] Look at FailedJob records for detailed errors
- [ ] Check file size < 10MB

### Alerts not generating
- [ ] Verify `reorder_point` is set on Product
- [ ] Check if stock actually below threshold
- [ ] Look for StockAlert records created
- [ ] Check alert acknowledgment status

## Performance Tips

1. **Batch Operations**: Process CSVs in background (already implemented)
2. **Database Indexing**: Check indexes on (business_id, status), (product_id)
3. **Query Optimization**: Use `select_related()` for foreign keys
4. **Pagination**: Always paginate large result sets
5. **Caching**: Use React Query's staleTime and gcTime wisely

## Testing Patterns

### Unit Test Pattern
```python
def test_inventory_upload_valid_csv():
    business = create_test_business()
    file = create_csv_file(["Product,Quantity", "Rice,100"])

    service = InventoryUploadService()
    result = service.process(file, business)

    assert result['status'] == 'success'
    assert Product.objects.count() == 1
```

### Integration Test Pattern
```python
def test_sale_recording_decreases_stock():
    business = create_test_business()
    product = create_product(business, stock=100)
    user = create_user(business)

    client.post('/api/inventory/transactions/', {
        'product_id': product.id,
        'quantity': 10,
        'unit_price': 50
    }, headers={'Authorization': f'Bearer {user.token}'})

    product.refresh_from_db()
    assert product.current_stock == 90
```

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 400 NO_BUSINESS | User has no business | User must create/join business first |
| 400 INVALID_FILE_FORMAT | Wrong file type/size | Check file is CSV ≤ 10MB |
| 400 MISSING_COLUMN | CSV missing required column | Check format guide |
| 404 RECORD_NOT_FOUND | Upload ID invalid/expired | Verify upload completed successfully |
| 429 RATE_LIMIT_EXCEEDED | Too many uploads | Wait before uploading again |
| 500 DATABASE_ERROR | Transaction failed | Check database logs, may need rollback |

## Code Style Guide

### Backend (Django)
```python
# Views: Use explicit decorators
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def endpoint(request):
    business = _get_business(request.user)
    if not business:
        return error_response()

# Services: Use dataclasses for configuration
@dataclass
class Config:
    max_rows_per_file: int = 10000
    timeout: int = 300

# Models: Use explicit field options
class Model(models.Model):
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='models'
    )
```

### Frontend (React/TypeScript)
```typescript
// Use explicit types
interface Product {
  product_id: string;
  name: string;
  current_stock: number;
}

// Use hooks consistently
const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => api.get('/api/inventory/products/')
});

// Separate concerns
const handleUpload = async (file: File) => {
  try {
    await uploadMutation.mutateAsync(file);
    toast.success('Success');
  } catch (error) {
    toast.error('Error');
  }
};
```

## Important Notes

⚠️ **Do NOT**:
- Modify CSV processing without checking for backward compatibility
- Change database field names without migrations
- Remove endpoints without deprecating first
- Hard-code business IDs (always get from request.user)
- Skip authorization checks on endpoints

✅ **DO**:
- Always wrap background operations in try-catch
- Use database transactions for atomic operations
- Include detailed error messages in responses
- Log important operations for debugging
- Document API changes
- Test with multi-tenant scenarios

## Release Checklist

Before releasing to production:
- [ ] Run test suite: `python manage.py test`
- [ ] Check for migrations: `python manage.py makemigrations --check`
- [ ] Test transaction CSV upload end-to-end
- [ ] Test inventory CSV upload end-to-end
- [ ] Test sale recording
- [ ] Test alert generation
- [ ] Verify no errors in server.log
- [ ] Check with multiple businesses (multi-tenant)
- [ ] Load test with concurrent uploads
- [ ] Verify database backups

## Helpful Links

- [E2E Testing Guide](./E2E_TESTING_GUIDE.md) - Comprehensive testing procedures
- [Integration Summary](./CSV_UPLOAD_INTEGRATION_SUMMARY.md) - Full architecture documentation
- [Sample Data](./sample_transaction_data.csv) - Transaction CSV examples
- [Sample Data](./sample_inventory_data.csv) - Inventory CSV examples

---

**Last Updated**: November 7, 2024
**Version**: 1.0
**Status**: Production Ready (after testing)
