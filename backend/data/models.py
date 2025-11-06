import uuid
from django.db import models
from django.contrib.auth.models import User
from accounts.models import Business


class Product(models.Model):
    """Product catalog for a business"""
    product_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True)  # Auto-generated or manual
    current_stock = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reorder_point = models.IntegerField(default=50)  # Configurable threshold
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business', 'name')

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class Customer(models.Model):
    """Customer records for a business"""
    customer_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_purchase = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business', 'name')

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class Transaction(models.Model):
    """Sales transactions imported from CSV"""
    transaction_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='transactions')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='transactions')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Cash'),
            ('bkash', 'bKash'),
            ('nagad', 'Nagad'),
            ('rocket', 'Rocket'),
            ('card', 'Card'),
            ('credit', 'Credit'),
            ('other', 'Other'),
        ],
        default='cash'
    )
    notes = models.TextField(blank=True, null=True)

    # Duplicate detection hash
    csv_import_hash = models.CharField(max_length=32, blank=True, null=True, db_index=True)

    # Track which file upload this came from
    file_upload = models.ForeignKey('FileUploadRecord', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ('business', 'csv_import_hash')  # Prevent duplicates per business

    def __str__(self):
        return f"{self.product.name} x{self.quantity} on {self.date}"


class FileUploadRecord(models.Model):
    """Track CSV file uploads and their processing status"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    file_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='file_uploads')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='file_uploads')

    file_path = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    row_count = models.IntegerField(default=0)
    rows_processed = models.IntegerField(default=0)
    rows_failed = models.IntegerField(default=0)
    created_transactions = models.IntegerField(default=0)

    error_message = models.TextField(blank=True, null=True)
    processing_errors = models.JSONField(default=list, blank=True)  # Store per-row errors

    uploaded_at = models.DateTimeField(auto_now_add=True)
    processing_started_at = models.DateTimeField(blank=True, null=True)
    processing_completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_filename} ({self.status})"


class FailedJob(models.Model):
    """Track failed CSV rows for debugging and retry"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='failed_jobs')
    file_upload = models.ForeignKey(FileUploadRecord, on_delete=models.CASCADE, related_name='failed_rows')
    row_number = models.IntegerField()
    row_data = models.JSONField()  # Original CSV row as JSON
    error_message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Failed Jobs"

    def __str__(self):
        return f"Failed row {self.row_number} from {self.file_upload.original_filename}"
