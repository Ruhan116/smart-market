# Story 3.4: Transaction List Endpoint (No Redis)

**Story ID:** STORY-3.4
**Epic:** Epic 3 - Data Ingestion Pipeline
**Effort:** 2 hours
**Dependencies:** Story 3.2 complete
**Status:** Draft

## User Story

As a **SME user**,
I want to **view a filterable, paginated list of my transactions**,
So that **I can analyze sales data and track historical transactions**.

---

## Story Context

**Existing System Integration:**
- Integrates with: Transaction model (from Story 3.2)
- Technology: Django ORM, DRF Pagination
- Follows pattern: Standard REST list endpoint
- Touch points: Read-only, no dependencies on async processing

---

## Acceptance Criteria

### Transaction List Endpoint

1. **Endpoint Implementation**
   - [ ] `GET /api/v1/transactions` returns paginated list
   - [ ] Requires JWT authentication
   - [ ] Default pagination: limit=50, max_limit=100
   - [ ] Response structure:
     ```json
     {
       "count": 1250,
       "next": "http://api.example.com/transactions?limit=50&offset=50",
       "previous": null,
       "results": [
         {
           "id": "uuid-xxxx",
           "date": "2025-11-07",
           "product_name": "Shirt",
           "quantity": 2,
           "amount": 600,
           "customer_name": "Ahmed",
           "payment_method": "bkash",
           "created_at": "2025-11-07T12:00:00Z"
         }
       ],
       "summary": {
         "total_revenue": 450000,
         "average_value": 360,
         "transaction_count": 50,
         "period": "all_time"
       }
     }
     ```

### Query Parameters & Filtering

2. **Pagination Parameters**
   - [ ] `limit`: Max items per page (default 50, max 100)
   - [ ] `offset`: Pagination offset (default 0)
   - [ ] Example: `/transactions?limit=25&offset=50`

3. **Filter Parameters (All optional)**
   - [ ] `product_id`: UUID of specific product
   - [ ] `date_from`: ISO 8601 date (inclusive), e.g., "2025-11-01"
   - [ ] `date_to`: ISO 8601 date (inclusive), e.g., "2025-11-07"
   - [ ] `payment_method`: Single enum value (cash, bkash, nagad, rocket, card, credit, other)
   - [ ] `customer_id`: UUID of specific customer

4. **Sorting Parameters**
   - [ ] `sort_by`: Field to sort on (default: "date")
     - Allowed: `date`, `amount`, `created_at`
   - [ ] `sort_order`: "asc" or "desc" (default "desc")
   - [ ] Example: `/transactions?sort_by=amount&sort_order=desc`

### Data Isolation & Security

5. **Multi-Tenant Data Isolation**
   - [ ] Only return transactions for authenticated user's business
   - [ ] Filter: `Transaction.objects.filter(business_id=request.user.business_id)`
   - [ ] User cannot access other business's data

### Query Optimization

6. **Performance Optimization**
   - [ ] Use `select_related('product', 'customer')` to prevent N+1 queries
   - [ ] Add database indices:
     - `(business_id, date)` for sorting/filtering
     - `(business_id, created_at)` for creation tracking
   - [ ] P95 response time < 500ms for typical business (1000 transactions)
   - [ ] Test query count with Django Debug Toolbar (max 2 queries)

### Summary Stats Endpoint

7. **Summary Statistics**
   - [ ] `GET /api/v1/transactions/summary` returns aggregate data
   - [ ] Requires JWT authentication
   - [ ] Response:
     ```json
     {
       "business_id": "uuid",
       "total_revenue": 450000,
       "total_transactions": 1250,
       "average_transaction_value": 360,
       "revenue_by_product": [
         {"product_name": "Shirt", "count": 500, "total": 150000},
         {"product_name": "Pants", "count": 300, "total": 150000}
       ],
       "revenue_by_payment_method": [
         {"method": "cash", "count": 700, "total": 252000},
         {"method": "bkash", "count": 400, "total": 144000}
       ],
       "last_transaction_date": "2025-11-07",
       "first_transaction_date": "2025-01-01"
     }
     ```
   - [ ] Support same filters as list endpoint (date_from, date_to, etc.)

### Serializer & View

8. **TransactionSerializer**
   ```python
   class TransactionSerializer(serializers.ModelSerializer):
       product_name = serializers.CharField(source='product.name', read_only=True)
       customer_name = serializers.CharField(source='customer.name', read_only=True)

       class Meta:
           model = Transaction
           fields = [
               'id', 'date', 'product_name', 'quantity', 'amount',
               'customer_name', 'payment_method', 'created_at'
           ]
   ```

9. **TransactionViewSet**
   - [ ] Implement as DRF ViewSet with list and summary actions
   - [ ] Filtering: Use `django-filter` or manual filtering
   - [ ] Pagination: Use DRF PageNumberPagination
   - [ ] Permissions: IsAuthenticated

### Testing Requirements

10. **Test Coverage (Minimum 10 tests)**
    - [ ] Test list all transactions (pagination works)
    - [ ] Test filter by product_id
    - [ ] Test filter by date_from and date_to
    - [ ] Test filter by payment_method
    - [ ] Test sorting by date (ascending/descending)
    - [ ] Test sorting by amount
    - [ ] Test summary stats endpoint
    - [ ] Test data isolation (user A cannot see user B's transactions)
    - [ ] Test pagination limits (max 100)
    - [ ] Test unauthenticated request (401)
    - [ ] **Minimum 10 tests, all passing**

---

## Definition of Done

- [ ] TransactionViewSet and serializer implemented
- [ ] Filtering and sorting work correctly
- [ ] Data isolation enforced
- [ ] Database indices created and migrated
- [ ] Summary stats endpoint functional
- [ ] Query count optimized (max 2 queries)
- [ ] All 10+ tests passing
- [ ] Code reviewed and approved
- [ ] API documentation updated (Swagger)

---

**Story Status:** ✅ Ready for Development
**Created:** 2025-11-07
