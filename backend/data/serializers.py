from rest_framework import serializers
from .models import FileUploadRecord, Transaction, Product, Customer


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
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'transaction_id', 'product_name', 'customer_name', 'date', 'time',
            'quantity', 'unit_price', 'amount', 'payment_method', 'notes'
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
