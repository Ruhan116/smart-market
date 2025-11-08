from rest_framework import serializers
from .models import (
    FileUploadRecord, Transaction, Product, Customer, ReceiptUploadRecord,
    InventoryUploadRecord, StockMovement, StockAlert
)


class FileUploadResponseSerializer(serializers.Serializer):
    """Serializer for initial upload response"""
    status = serializers.CharField()
    data = serializers.DictField()


class FileUploadStatusSerializer(serializers.ModelSerializer):
    """Serializer for file upload status polling"""
    class Meta:
        model = FileUploadRecord
        fields = [
            'file_id', 'status', 'original_filename', 'row_count',
            'rows_processed', 'rows_failed', 'created_transactions',
            'percent_complete', 'processing_started_at', 'error_message'
        ]
        read_only_fields = fields

    percent_complete = serializers.SerializerMethodField()

    def get_percent_complete(self, obj):
        """Calculate completion percentage"""
        if obj.row_count == 0:
            return 0
        return int((obj.rows_processed / obj.row_count) * 100)


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions"""
    product_id = serializers.UUIDField(source='product.product_id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_id = serializers.UUIDField(source='customer.customer_id', read_only=True, allow_null=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)

    class Meta:
        model = Transaction
        fields = [
            'transaction_id', 'product_id', 'product_name', 'customer_id', 'customer_name',
            'date', 'time', 'quantity', 'unit_price', 'amount', 'payment_method',
            'notes', 'created_at'
        ]
        read_only_fields = fields


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for products"""
    class Meta:
        model = Product
        fields = ['product_id', 'name', 'current_stock', 'unit_price', 'created_at']
        read_only_fields = fields


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for customers"""
    class Meta:
        model = Customer
        fields = ['customer_id', 'name', 'total_purchases', 'last_purchase', 'created_at']
        read_only_fields = fields


class ReceiptStatusSerializer(serializers.ModelSerializer):
    """Serializer for receipt upload status polling"""
    class Meta:
        model = ReceiptUploadRecord
        fields = [
            'image_id', 'status', 'original_filename', 'file_size',
            'extracted_data', 'created_transactions', 'error_message',
            'processing_started_at', 'processing_completed_at', 'percent_complete'
        ]
        read_only_fields = fields

    percent_complete = serializers.SerializerMethodField()

    def get_percent_complete(self, obj):
        """Calculate completion percentage based on status"""
        if obj.status == 'pending':
            return 0
        elif obj.status == 'processing':
            return 50
        elif obj.status == 'completed':
            return 100
        else:  # failed
            return 0


class InventoryUploadStatusSerializer(serializers.ModelSerializer):
    """Serializer for inventory upload status polling"""
    class Meta:
        model = InventoryUploadRecord
        fields = [
            'record_id', 'status', 'original_filename', 'row_count',
            'rows_processed', 'rows_failed', 'products_updated',
            'percent_complete', 'processing_started_at', 'error_message'
        ]
        read_only_fields = fields

    percent_complete = serializers.SerializerMethodField()

    def get_percent_complete(self, obj):
        """Calculate completion percentage"""
        if obj.row_count == 0:
            return 0
        return int((obj.rows_processed / obj.row_count) * 100)


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer for product with detailed info"""
    current_stock = serializers.IntegerField(read_only=True)
    total_sales = serializers.SerializerMethodField()
    reorder_point = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'product_id', 'name', 'sku', 'current_stock', 'unit_price',
            'reorder_point', 'total_sales', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_total_sales(self, obj):
        """Get total sales quantity for this product"""
        from django.db.models import Sum
        total = obj.transactions.aggregate(Sum('quantity'))['quantity__sum'] or 0
        return total


class StockMovementSerializer(serializers.ModelSerializer):
    """Serializer for stock movements"""
    product_id = serializers.UUIDField(source='product.product_id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'movement_id', 'movement_type', 'product_id', 'product_name', 'quantity_changed',
            'stock_before', 'stock_after', 'reference_type', 'reference_id',
            'notes', 'created_by_name', 'created_at'
        ]
        read_only_fields = fields


class StockAlertSerializer(serializers.ModelSerializer):
    """Serializer for stock alerts"""
    product_id = serializers.UUIDField(source='product.product_id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = StockAlert
        fields = [
            'alert_id', 'alert_type', 'product_id', 'product_name', 'current_stock', 'threshold',
            'is_acknowledged', 'acknowledged_by_name', 'created_at', 'acknowledged_at'
        ]
        read_only_fields = fields


class InventoryReportSerializer(serializers.Serializer):
    """Serializer for inventory report"""
    total_products = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    low_stock_count = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()
    products_by_stock = serializers.ListField(child=serializers.DictField())
    alerts = StockAlertSerializer(many=True)
