import csv
import io
import logging
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
from .models import (
    Product, InventoryUploadRecord, StockMovement, StockAlert,
    Transaction, Customer
)

logger = logging.getLogger(__name__)


class InventoryUploadService:
    """Service to handle inventory CSV uploads"""

    def __init__(self, inventory_upload):
        self.inventory_upload = inventory_upload
        self.business = inventory_upload.business
        self.errors = []

    def process_csv(self):
        """Main entry point to process inventory CSV"""
        try:
            # Update status
            self.inventory_upload.status = 'processing'
            self.inventory_upload.processing_started_at = timezone.now()
            self.inventory_upload.save()

            # Read and parse CSV
            with open(self.inventory_upload.file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)

                if not reader.fieldnames:
                    raise ValueError("CSV file is empty")

                # Validate headers
                self._validate_headers(reader.fieldnames)

                # Process each row
                for row_number, row in enumerate(reader, start=1):
                    self.inventory_upload.row_count = row_number
                    self.inventory_upload.save()

                    try:
                        self._process_row(row, row_number)
                        self.inventory_upload.rows_processed = row_number
                    except Exception as e:
                        self.inventory_upload.rows_failed += 1
                        error_msg = f"Row {row_number}: {str(e)}"
                        self.errors.append({
                            'row_number': row_number,
                            'error': str(e),
                            'data': row
                        })
                        logger.error(error_msg)

                    self.inventory_upload.save()

            # Mark as completed
            self.inventory_upload.status = 'completed'
            self.inventory_upload.processing_completed_at = timezone.now()
            self.inventory_upload.processing_errors = self.errors
            self.inventory_upload.save()

            return {
                'status': 'completed',
                'products_updated': self.inventory_upload.products_updated,
                'rows_processed': self.inventory_upload.rows_processed,
                'rows_failed': self.inventory_upload.rows_failed,
                'errors': self.errors
            }

        except Exception as e:
            self.inventory_upload.status = 'failed'
            self.inventory_upload.error_message = str(e)
            self.inventory_upload.processing_completed_at = timezone.now()
            self.inventory_upload.save()
            logger.error(f"CSV processing failed: {str(e)}")
            return {'status': 'failed', 'error': str(e)}

    def _validate_headers(self, headers):
        """Validate that required columns exist"""
        required_columns = {'Product', 'Quantity'}  # Case-insensitive
        headers_lower = [h.lower() for h in headers]

        for required in required_columns:
            if required.lower() not in headers_lower:
                raise ValueError(f"Missing required column: {required}")

    def _process_row(self, row, row_number):
        """Process a single inventory row"""
        # Extract fields
        product_name = row.get('Product', '').strip()
        quantity_str = row.get('Quantity', '').strip()
        unit_price_str = row.get('Unit Price', row.get('unit_price', '0')).strip()
        sku = row.get('SKU', row.get('sku', '')).strip()

        # Validate
        if not product_name:
            raise ValueError("Product name is required")

        try:
            quantity = int(quantity_str)
            if quantity < 0:
                raise ValueError("Quantity cannot be negative")
        except ValueError:
            raise ValueError(f"Invalid quantity: {quantity_str}")

        try:
            unit_price = Decimal(unit_price_str) if unit_price_str else Decimal('0')
            if unit_price < 0:
                raise ValueError("Unit price cannot be negative")
        except Exception:
            raise ValueError(f"Invalid unit price: {unit_price_str}")

        # Get or create product
        product, created = Product.objects.get_or_create(
            business=self.business,
            name=product_name,
            defaults={
                'current_stock': quantity,
                'unit_price': unit_price,
                'sku': sku if sku else self._generate_sku(product_name)
            }
        )

        if not created:
            # Update existing product - record the movement
            old_stock = product.current_stock
            product.current_stock = quantity
            product.unit_price = unit_price if unit_price > 0 else product.unit_price
            if sku:
                product.sku = sku
            product.save()

            # Record stock movement
            quantity_changed = quantity - old_stock
            StockMovement.objects.create(
                business=self.business,
                product=product,
                movement_type='adjustment',
                quantity_changed=quantity_changed,
                stock_before=old_stock,
                stock_after=quantity,
                reference_type='inventory_upload',
                reference_id=str(self.inventory_upload.record_id),
                created_by=self.inventory_upload.user
            )
        else:
            # Record initial load
            StockMovement.objects.create(
                business=self.business,
                product=product,
                movement_type='initial_load',
                quantity_changed=quantity,
                stock_before=0,
                stock_after=quantity,
                reference_type='inventory_upload',
                reference_id=str(self.inventory_upload.record_id),
                created_by=self.inventory_upload.user
            )

        # Check for alerts
        self._check_stock_alert(product)

        self.inventory_upload.products_updated += 1

    def _generate_sku(self, product_name):
        """Generate SKU from product name"""
        import uuid
        return f"SKU-{uuid.uuid4().hex[:8].upper()}"

    def _check_stock_alert(self, product):
        """Check and create stock alerts if needed"""
        if product.current_stock == 0:
            # Create out of stock alert
            alert, created = StockAlert.objects.get_or_create(
                business=self.business,
                product=product,
                alert_type='out_of_stock',
                defaults={
                    'threshold': 0,
                    'current_stock': product.current_stock,
                    'is_acknowledged': False
                }
            )
            if not created:
                alert.current_stock = product.current_stock
                alert.is_acknowledged = False
                alert.save()

        elif product.current_stock <= product.reorder_point:
            # Create low stock alert
            alert, created = StockAlert.objects.get_or_create(
                business=self.business,
                product=product,
                alert_type='low_stock',
                defaults={
                    'threshold': product.reorder_point,
                    'current_stock': product.current_stock,
                    'is_acknowledged': False
                }
            )
            if not created:
                alert.current_stock = product.current_stock
                alert.is_acknowledged = False
                alert.save()


class SaleRecorderService:
    """Service to record sales and update inventory"""

    def __init__(self, business, user):
        self.business = business
        self.user = user

    @db_transaction.atomic
    def record_sale(
        self,
        *,
        product_id,
        quantity,
        unit_price=None,
        payment_method='cash',
        customer_id=None,
        customer_name=None,
        notes=None,
        date=None,
        time=None
    ):
        """Record a sale, update stock, and persist transaction details"""
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            raise ValueError("Quantity must be an integer greater than 0")

        if quantity <= 0:
            raise ValueError("Quantity must be greater than 0")

        try:
            product = Product.objects.select_for_update().get(
                product_id=product_id,
                business=self.business
            )
        except Product.DoesNotExist as exc:
            raise ValueError('Product not found') from exc

        if quantity > product.current_stock:
            raise ValueError(f"Insufficient stock. Available: {product.current_stock}")

        # Resolve unit price
        if unit_price in [None, '', 0, '0', '0.00']:
            unit_price_value = product.unit_price
        else:
            try:
                unit_price_value = Decimal(str(unit_price))
            except Exception as exc:
                raise ValueError('Invalid unit price') from exc

        if unit_price_value <= 0:
            raise ValueError('Unit price must be greater than 0')

        # Validate payment method
        valid_methods = {choice[0] for choice in Transaction._meta.get_field('payment_method').choices}
        if payment_method not in valid_methods:
            raise ValueError('Invalid payment method')

        sale_date = date or timezone.now().date()
        sale_time = time or timezone.now().time().replace(microsecond=0)

        # Resolve customer
        customer = None
        if customer_id:
            try:
                customer = Customer.objects.get(customer_id=customer_id, business=self.business)
            except Customer.DoesNotExist as exc:
                raise ValueError('Customer not found') from exc
        elif customer_name:
            customer_name = customer_name.strip()
            if customer_name:
                customer, _ = Customer.objects.get_or_create(
                    business=self.business,
                    name=customer_name,
                    defaults={'total_purchases': Decimal('0'), 'last_purchase': sale_date}
                )

        old_stock = product.current_stock
        new_stock = old_stock - quantity
        amount = (unit_price_value * Decimal(quantity)).quantize(Decimal('0.01'))

        transaction = Transaction.objects.create(
            business=self.business,
            product=product,
            customer=customer,
            date=sale_date,
            time=sale_time,
            quantity=quantity,
            unit_price=unit_price_value,
            amount=amount,
            payment_method=payment_method,
            notes=notes or None
        )

        movement = StockMovement.objects.create(
            business=self.business,
            product=product,
            movement_type='sale',
            quantity_changed=-quantity,
            stock_before=old_stock,
            stock_after=new_stock,
            reference_type='transaction',
            reference_id=str(transaction.transaction_id),
            notes=notes or None,
            created_by=self.user
        )

        product.current_stock = new_stock
        product.save(update_fields=['current_stock', 'updated_at'])

        if customer:
            customer.total_purchases = (customer.total_purchases or Decimal('0')) + amount
            customer.last_purchase = sale_date
            customer.save(update_fields=['total_purchases', 'last_purchase', 'updated_at'])

        # Maintain stock alerts
        now = timezone.now()
        if new_stock == 0:
            alert, created = StockAlert.objects.get_or_create(
                business=self.business,
                product=product,
                alert_type='out_of_stock',
                defaults={
                    'threshold': 0,
                    'current_stock': new_stock,
                    'is_acknowledged': False
                }
            )
            if not created:
                alert.current_stock = new_stock
                alert.threshold = 0
                alert.is_acknowledged = False
                alert.acknowledged_at = None
                alert.acknowledged_by = None
                alert.save(update_fields=['current_stock', 'threshold', 'is_acknowledged', 'acknowledged_at', 'acknowledged_by'])

            StockAlert.objects.filter(
                business=self.business,
                product=product,
                alert_type='low_stock'
            ).update(
                current_stock=new_stock,
                is_acknowledged=True,
                acknowledged_at=now,
                acknowledged_by=self.user
            )
        elif new_stock <= product.reorder_point:
            alert, created = StockAlert.objects.get_or_create(
                business=self.business,
                product=product,
                alert_type='low_stock',
                defaults={
                    'threshold': product.reorder_point,
                    'current_stock': new_stock,
                    'is_acknowledged': False
                }
            )
            if not created:
                alert.current_stock = new_stock
                alert.threshold = product.reorder_point
                alert.is_acknowledged = False
                alert.acknowledged_at = None
                alert.acknowledged_by = None
                alert.save(update_fields=['current_stock', 'threshold', 'is_acknowledged', 'acknowledged_at', 'acknowledged_by'])

            StockAlert.objects.filter(
                business=self.business,
                product=product,
                alert_type='out_of_stock'
            ).update(
                current_stock=new_stock,
                is_acknowledged=True,
                acknowledged_at=now,
                acknowledged_by=self.user
            )
        else:
            StockAlert.objects.filter(
                business=self.business,
                product=product
            ).update(
                current_stock=new_stock,
                is_acknowledged=True,
                acknowledged_at=now,
                acknowledged_by=self.user
            )

        return {
            'success': True,
            'transaction': transaction,
            'movement_id': str(movement.movement_id),
            'new_stock': new_stock,
            'amount': amount
        }

    def _create_alert(self, product, alert_type, threshold):
        """Deprecated in favour of inline alert management (retained for compatibility)."""
        alert, created = StockAlert.objects.get_or_create(
            business=self.business,
            product=product,
            alert_type=alert_type,
            defaults={
                'threshold': threshold,
                'current_stock': product.current_stock,
                'is_acknowledged': False
            }
        )
        if not created:
            alert.current_stock = product.current_stock
            alert.is_acknowledged = False
            alert.save()


class InventoryReportService:
    """Service to generate inventory reports"""

    def __init__(self, business):
        self.business = business

    def get_inventory_report(self):
        """Generate comprehensive inventory report"""
        from django.db.models import Sum, Count, Q

        products = Product.objects.filter(business=self.business)

        # Calculate totals
        total_products = products.count()
        total_stock_value = sum(
            p.current_stock * p.unit_price for p in products
        )

        # Count alerts
        alerts = StockAlert.objects.filter(
            business=self.business,
            is_acknowledged=False
        )
        low_stock_count = alerts.filter(alert_type='low_stock').count()
        out_of_stock_count = alerts.filter(alert_type='out_of_stock').count()

        # Products by stock level
        products_by_stock = []
        for product in products.order_by('-current_stock'):
            products_by_stock.append({
                'product_id': str(product.product_id),
                'name': product.name,
                'sku': product.sku,
                'current_stock': product.current_stock,
                'unit_price': float(product.unit_price),
                'stock_value': float(product.current_stock * product.unit_price),
                'reorder_point': product.reorder_point,
                'status': self._get_stock_status(product)
            })

        return {
            'total_products': total_products,
            'total_stock_value': float(total_stock_value),
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'products_by_stock': products_by_stock,
            'alerts': list(alerts.values(
                'alert_id', 'alert_type', 'product__name',
                'current_stock', 'threshold', 'created_at'
            ))
        }

    def _get_stock_status(self, product):
        """Determine stock status"""
        if product.current_stock == 0:
            return 'out_of_stock'
        elif product.current_stock <= product.reorder_point:
            return 'low_stock'
        else:
            return 'in_stock'
