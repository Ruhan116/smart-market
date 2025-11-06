from django.contrib import admin
from .models import Product, Customer, Transaction, FileUploadRecord, FailedJob, ReceiptUploadRecord


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'current_stock', 'unit_price', 'created_at']
    list_filter = ['business', 'created_at']
    search_fields = ['name', 'business__name']
    readonly_fields = ['product_id', 'created_at', 'updated_at']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'total_purchases', 'last_purchase', 'created_at']
    list_filter = ['business', 'created_at']
    search_fields = ['name', 'business__name']
    readonly_fields = ['customer_id', 'created_at', 'updated_at']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['product', 'customer', 'quantity', 'amount', 'date', 'payment_method']
    list_filter = ['business', 'date', 'payment_method']
    search_fields = ['product__name', 'customer__name']
    readonly_fields = ['transaction_id', 'created_at']
    date_hierarchy = 'date'


@admin.register(FileUploadRecord)
class FileUploadRecordAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'business', 'status', 'row_count', 'created_transactions', 'uploaded_at']
    list_filter = ['business', 'status', 'uploaded_at']
    search_fields = ['original_filename', 'business__name']
    readonly_fields = ['file_id', 'uploaded_at', 'processing_started_at', 'processing_completed_at']

    fieldsets = (
        ('File Info', {
            'fields': ('file_id', 'original_filename', 'file_path', 'file_size', 'business', 'user')
        }),
        ('Status', {
            'fields': ('status', 'error_message')
        }),
        ('Processing Stats', {
            'fields': ('row_count', 'rows_processed', 'rows_failed', 'created_transactions')
        }),
        ('Timestamps', {
            'fields': ('uploaded_at', 'processing_started_at', 'processing_completed_at')
        }),
        ('Errors', {
            'fields': ('processing_errors',)
        }),
    )


@admin.register(FailedJob)
class FailedJobAdmin(admin.ModelAdmin):
    list_display = ['row_number', 'business', 'file_upload', 'error_message', 'created_at']
    list_filter = ['business', 'file_upload', 'created_at']
    search_fields = ['error_message', 'file_upload__original_filename']
    readonly_fields = ['id', 'created_at', 'row_data']
    date_hierarchy = 'created_at'


@admin.register(ReceiptUploadRecord)
class ReceiptUploadRecordAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'business', 'status', 'created_transactions', 'uploaded_at']
    list_filter = ['business', 'status', 'uploaded_at']
    search_fields = ['original_filename', 'business__name']
    readonly_fields = ['image_id', 'uploaded_at', 'processing_started_at', 'processing_completed_at']

    fieldsets = (
        ('File Info', {
            'fields': ('image_id', 'original_filename', 'file_path', 'file_size', 'business', 'user')
        }),
        ('Status', {
            'fields': ('status', 'error_message')
        }),
        ('Processing Stats', {
            'fields': ('created_transactions',)
        }),
        ('Extracted Data', {
            'fields': ('extracted_data',)
        }),
        ('Timestamps', {
            'fields': ('uploaded_at', 'processing_started_at', 'processing_completed_at')
        }),
    )
