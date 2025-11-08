from django.contrib import admin
from .models import (
    Product, Customer, Transaction, FileUploadRecord, FailedJob, ReceiptUploadRecord,
    InventoryUploadRecord, StockMovement, StockAlert
)


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


@admin.register(InventoryUploadRecord)
class InventoryUploadRecordAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'business', 'status', 'products_updated', 'uploaded_at']
    list_filter = ['business', 'status', 'uploaded_at']
    search_fields = ['original_filename', 'business__name']
    readonly_fields = ['record_id', 'uploaded_at', 'processing_started_at', 'processing_completed_at']

    fieldsets = (
        ('File Info', {
            'fields': ('record_id', 'original_filename', 'file_path', 'file_size', 'business', 'user')
        }),
        ('Status', {
            'fields': ('status', 'error_message')
        }),
        ('Processing Stats', {
            'fields': ('row_count', 'rows_processed', 'rows_failed', 'products_updated')
        }),
        ('Timestamps', {
            'fields': ('uploaded_at', 'processing_started_at', 'processing_completed_at')
        }),
        ('Errors', {
            'fields': ('processing_errors',)
        }),
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['movement_type', 'product', 'business', 'quantity_changed', 'stock_before', 'stock_after', 'created_at']
    list_filter = ['business', 'movement_type', 'created_at']
    search_fields = ['product__name', 'business__name', 'notes']
    readonly_fields = ['movement_id', 'created_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Movement Info', {
            'fields': ('movement_id', 'movement_type', 'business', 'product', 'created_by')
        }),
        ('Stock Changes', {
            'fields': ('quantity_changed', 'stock_before', 'stock_after')
        }),
        ('Reference', {
            'fields': ('reference_type', 'reference_id', 'notes')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )


@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ['alert_type', 'product', 'business', 'current_stock', 'threshold', 'is_acknowledged', 'created_at']
    list_filter = ['business', 'alert_type', 'is_acknowledged', 'created_at']
    search_fields = ['product__name', 'business__name']
    readonly_fields = ['alert_id', 'created_at', 'acknowledged_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Alert Info', {
            'fields': ('alert_id', 'alert_type', 'business', 'product')
        }),
        ('Stock Info', {
            'fields': ('current_stock', 'threshold')
        }),
        ('Acknowledgment', {
            'fields': ('is_acknowledged', 'acknowledged_at', 'acknowledged_by')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
