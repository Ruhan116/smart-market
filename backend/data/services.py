import csv
import hashlib
import logging
import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple, Set
from django.db import transaction as db_transaction
from django.utils import timezone
from .models import FileUploadRecord, Transaction, Product, Customer, FailedJob
from accounts.models import Business

logger = logging.getLogger(__name__)


class CSVParserService:
    """Service to parse and validate CSV files with comprehensive validation and duplicate detection"""

    # Configuration constants
    VALID_PAYMENT_METHODS = ['cash', 'bkash', 'nagad', 'rocket', 'card', 'credit', 'other']
    MAX_QUANTITY = 1000
    MAX_AMOUNT = 10000000  # 10 million TK

    # Required and optional columns
    REQUIRED_COLUMNS = {'Date', 'Product', 'Quantity', 'Amount'}
    OPTIONAL_COLUMNS = {'Time', 'Customer', 'PaymentMethod', 'UnitPrice', 'Notes'}

    def __init__(self, file_upload_record: FileUploadRecord) -> None:
        """Initialize parser with FileUploadRecord instance"""
        self.file_upload = file_upload_record
        self.business = file_upload_record.business
        self.processed_rows = 0
        self.failed_rows = 0
        self.created_transactions = 0
        self.skipped_duplicates = 0
        self.errors: List[Dict[str, Any]] = []
        self.affected_products: Set[str] = set()  # Track affected product IDs
        self.affected_customers: Set[str] = set()  # Track affected customer IDs

    def parse_csv(self) -> Dict[str, Any]:
        """Parse CSV file and create transactions

        Returns:
            Dictionary with parsing results including counts and errors
        """
        try:
            file_path = self.file_upload.file_path
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            logger.info(f"CSV upload started: file_id={self.file_upload.file_id}, "
                       f"business={self.business.name}, filename={self.file_upload.original_filename}")

            self.file_upload.status = 'processing'
            self.file_upload.processing_started_at = timezone.now()
            self.file_upload.save()

            with open(file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)

                if not reader.fieldnames:
                    raise ValueError("CSV file is empty")

                # Validate required columns exist (case-insensitive)
                fieldnames_set = set(reader.fieldnames) if reader.fieldnames else set()
                fieldnames_lower = {name.lower() for name in fieldnames_set}
                required_lower = {name.lower() for name in self.REQUIRED_COLUMNS}
                missing_columns = required_lower - fieldnames_lower
                if missing_columns:
                    raise ValueError(f"Missing required columns: {', '.join(sorted(missing_columns))}")

                rows = list(reader)
                self.file_upload.row_count = len(rows)
                self.file_upload.save()

                # Process each row
                for row_num, row in enumerate(rows, start=2):  # Start at 2 (header is row 1)
                    try:
                        self._process_row(row, row_num)
                    except Exception as e:
                        self.failed_rows += 1
                        self.errors.append({
                            'row': row_num,
                            'error': str(e)
                        })
                        # Create FailedJob record for audit trail
                        self._store_failed_row(row_num, row, str(e))

            # Mark as completed
            self.file_upload.status = 'completed'
            self.file_upload.processing_completed_at = timezone.now()
            self.file_upload.rows_processed = self.processed_rows
            self.file_upload.rows_failed = self.failed_rows
            self.file_upload.created_transactions = self.created_transactions
            self.file_upload.processing_errors = self.errors
            self.file_upload.save()

            logger.info(
                f"CSV parsing: Created {self.created_transactions} transactions, "
                f"skipped {self.skipped_duplicates} duplicates, failed {self.failed_rows}"
            )

            # Verify data consistency
            self._verify_data_consistency()

            # Publish event to trigger downstream processing
            self._publish_transaction_parsed_event()

            return {
                'created_count': self.created_transactions,
                'skipped_count': self.skipped_duplicates,
                'failed_count': self.failed_rows,
                'duplicates_count': self.skipped_duplicates,
                'errors': self.errors
            }

        except Exception as e:
            # Critical error - mark as failed
            logger.error(f"CSV parsing failed: {str(e)}")
            self.file_upload.status = 'failed'
            self.file_upload.error_message = str(e)
            self.file_upload.processing_completed_at = timezone.now()
            self.file_upload.save()
            return {
                'created_count': 0,
                'skipped_count': 0,
                'failed_count': 0,
                'duplicates_count': 0,
                'errors': [{'error': str(e), 'row': 0}]
            }

    def _process_row(self, row: Dict[str, str], row_num: int) -> None:
        """Process a single CSV row

        Args:
            row: Dictionary representing a CSV row
            row_num: Row number in CSV file

        Raises:
            ValueError: If any validation fails
        """
        # Normalize field names (case-insensitive)
        normalized_row = {k.strip(): v.strip() if isinstance(v, str) else v
                         for k, v in row.items()}

        # Extract required fields
        date_str = self._get_field(normalized_row, 'Date')
        product_name = self._get_field(normalized_row, 'Product')
        quantity_str = self._get_field(normalized_row, 'Quantity')
        amount_str = self._get_field(normalized_row, 'Amount')

        # Validate required fields
        if not date_str:
            raise ValueError("Date is required")
        if not product_name:
            raise ValueError("Product is required")
        if not quantity_str:
            raise ValueError("Quantity is required")
        if not amount_str:
            raise ValueError("Amount is required")

        # Parse and validate date
        date = self._parse_date(date_str)

        # Parse and validate quantity
        quantity = self._parse_quantity(quantity_str)

        # Parse and validate amount
        amount = self._parse_amount(amount_str)

        # Extract optional fields
        time_str = self._get_field(normalized_row, 'Time')
        unit_price_str = self._get_field(normalized_row, 'UnitPrice')
        customer_name = self._get_field(normalized_row, 'Customer') or 'Walk-in'
        payment_method = (self._get_field(normalized_row, 'PaymentMethod') or 'cash').lower()
        notes = self._get_field(normalized_row, 'Notes')

        # Parse time (optional)
        time_obj = self._parse_time(time_str) if time_str else None

        # Parse unit price
        unit_price = self._parse_unit_price(unit_price_str) if unit_price_str else (amount / quantity)

        # Validate and normalize payment method
        if payment_method not in self.VALID_PAYMENT_METHODS:
            payment_method = 'other'

        # Compute hash for duplicate detection
        row_hash = self._compute_row_hash(date, product_name, quantity, amount, customer_name)

        # Check for duplicates
        if self._is_duplicate(row_hash):
            self.skipped_duplicates += 1
            self.processed_rows += 1
            logger.info(f"Duplicate detected: hash={row_hash}, skipped")
            return

        # Use atomic transaction for consistency
        with db_transaction.atomic():
            # Get or create product
            product = self._get_or_create_product(product_name, unit_price)
            self.affected_products.add(str(product.product_id))

            # Get or create customer (only if not "Walk-in")
            customer = None
            if customer_name and customer_name.lower() != 'walk-in':
                customer = self._get_or_create_customer(customer_name)
                if customer:
                    self.affected_customers.add(str(customer.customer_id))

            # Create transaction
            transaction = Transaction.objects.create(
                business=self.business,
                product=product,
                customer=customer,
                date=date,
                time=time_obj,
                quantity=quantity,
                unit_price=unit_price,
                amount=amount,
                payment_method=payment_method,
                notes=notes or None,
                file_upload=self.file_upload,
                csv_import_hash=row_hash
            )

            # Update product stock
            product.current_stock -= quantity
            product.save()

            # Update customer stats if applicable
            if customer:
                customer.total_purchases += amount
                customer.last_purchase = date
                customer.save()

        self.processed_rows += 1
        self.created_transactions += 1

    def _get_field(self, row: Dict[str, str], field_name: str) -> Optional[str]:
        """Get field value from row (case-insensitive)"""
        for key, value in row.items():
            if key.lower() == field_name.lower():
                return value
        return None

    def _parse_date(self, date_str: str) -> datetime.date:
        """Parse and validate date field"""
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if date > timezone.now().date():
                raise ValueError(f"Date cannot be in the future: {date_str}")
            return date
        except ValueError:
            raise ValueError(f"Invalid date format (use YYYY-MM-DD): {date_str}")

    def _parse_quantity(self, quantity_str: str) -> int:
        """Parse and validate quantity field"""
        try:
            quantity = int(quantity_str)
            if quantity <= 0:
                raise ValueError("Quantity must be > 0")
            if quantity > self.MAX_QUANTITY:
                raise ValueError(f"Quantity exceeds maximum ({self.MAX_QUANTITY})")
            return quantity
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid quantity: {quantity_str}")

    def _parse_amount(self, amount_str: str) -> Decimal:
        """Parse and validate amount field"""
        try:
            amount = Decimal(amount_str)
            if amount <= 0:
                raise ValueError("Amount must be > 0")
            if amount > self.MAX_AMOUNT:
                raise ValueError(f"Amount exceeds maximum ({self.MAX_AMOUNT})")
            return amount
        except Exception:
            raise ValueError(f"Invalid amount: {amount_str}")

    def _parse_time(self, time_str: str) -> Optional[datetime.time]:
        """Parse and validate time field"""
        try:
            return datetime.strptime(time_str, '%H:%M').time()
        except ValueError:
            raise ValueError(f"Invalid time format (use HH:MM): {time_str}")

    def _parse_unit_price(self, unit_price_str: str) -> Decimal:
        """Parse and validate unit price field"""
        try:
            return Decimal(unit_price_str)
        except Exception:
            raise ValueError(f"Invalid unit price: {unit_price_str}")

    def _compute_row_hash(self, date: datetime.date, product: str, qty: int,
                         amount: Decimal, customer: str) -> str:
        """Compute MD5 hash for duplicate detection"""
        hash_input = f"{date}|{product}|{qty}|{amount}|{customer}"
        return hashlib.md5(hash_input.encode()).hexdigest()

    def _is_duplicate(self, row_hash: str) -> bool:
        """Check if transaction hash already exists for this business"""
        return Transaction.objects.filter(
            business=self.business,
            csv_import_hash=row_hash
        ).exists()

    def _get_or_create_product(self, product_name: str, unit_price: Decimal) -> Product:
        """Get or create product with auto-generated SKU"""
        product, created = Product.objects.get_or_create(
            business=self.business,
            name=product_name,
            defaults={
                'unit_price': unit_price,
                'sku': f'SKU-{uuid.uuid4().hex[:8].upper()}',
                'reorder_point': 50
            }
        )
        return product

    def _get_or_create_customer(self, customer_name: str) -> Customer:
        """Get or create customer"""
        customer, created = Customer.objects.get_or_create(
            business=self.business,
            name=customer_name,
            defaults={
                'phone': None,
                'email': None
            }
        )
        return customer

    def _store_failed_row(self, row_num: int, row: Dict[str, str], error_message: str) -> None:
        """Store failed row in FailedJob table for debugging"""
        try:
            FailedJob.objects.create(
                business=self.business,
                file_upload=self.file_upload,
                row_number=row_num,
                row_data=dict(row),
                error_message=error_message
            )
        except Exception:
            # Log but don't fail if we can't store the failed job
            pass

    def _publish_transaction_parsed_event(self) -> None:
        """Publish event to trigger downstream processing"""
        try:
            from apps.events.adapter import publish_event

            payload = {
                'business_id': str(self.business.id),
                'affected_products': list(self.affected_products),
                'affected_customers': list(self.affected_customers),
                'transaction_count': self.created_transactions
            }

            logger.info(f"Event published: topic=transaction.parsed, payload={payload}")
            publish_event('transaction.parsed', payload)
        except ImportError:
            logger.warning("Event adapter not available for CSV parsing")
        except Exception as e:
            logger.error(f"Failed to publish transaction.parsed event: {e}")

    def _verify_data_consistency(self) -> None:
        """Verify data consistency after parsing completes"""
        logger.info("Verifying data consistency...")

        try:
            # 1. Assert all transactions belong to correct business
            bad_transactions = Transaction.objects.filter(
                file_upload=self.file_upload
            ).exclude(business=self.business)

            if bad_transactions.exists():
                logger.warning(
                    f"Data consistency issue: {bad_transactions.count()} transactions "
                    f"belong to different business than upload"
                )

            # 2. Verify product stock consistency
            for product_id in self.affected_products:
                try:
                    product = Product.objects.get(product_id=product_id, business=self.business)

                    # Calculate expected stock from all transactions for this product
                    # Expected stock = initial stock - sum of quantities
                    # Since we don't track initial stock, we just verify stock is non-negative
                    if product.current_stock < 0:
                        logger.warning(
                            f"Data consistency issue: Product {product.name} "
                            f"(ID: {product_id}) has negative stock: {product.current_stock}"
                        )
                except Product.DoesNotExist:
                    logger.warning(f"Data consistency issue: Product {product_id} not found")

            # 3. Verify all customers referenced in transactions exist
            from_file = Transaction.objects.filter(
                file_upload=self.file_upload,
                customer__isnull=False
            ).values_list('customer_id', flat=True).distinct()

            missing_customers = []
            for customer_id in from_file:
                if not Customer.objects.filter(customer_id=customer_id).exists():
                    missing_customers.append(customer_id)

            if missing_customers:
                logger.warning(
                    f"Data consistency issue: {len(missing_customers)} customers "
                    f"referenced in transactions but not found: {missing_customers}"
                )

            logger.info("Data consistency verification completed")

        except Exception as e:
            logger.error(f"Error during data consistency verification: {e}")
