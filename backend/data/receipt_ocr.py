import hashlib
import logging
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Any, Optional, Set
from django.db import transaction as db_transaction
from django.utils import timezone
from .models import ReceiptUploadRecord, Transaction, Product, Customer
from accounts.models import Business

logger = logging.getLogger(__name__)


class ReceiptOCRService:
    """Service to process receipt images with mocked OCR"""

    # Mocked OCR sample data (Phase 2: Replace with actual Tesseract/Google Vision)
    MOCK_RECEIPT_DATA = {
        "date": datetime.now().date().isoformat(),
        "items": [
            {"name": "Lay's Chips", "qty": 2, "price": 150},
            {"name": "Cold Drink", "qty": 1, "price": 100},
            {"name": "Bread", "qty": 3, "price": 75},
        ],
        "total": 595,
        "confidence": 95
    }

    def __init__(self, receipt_upload: ReceiptUploadRecord) -> None:
        """Initialize OCR service with ReceiptUploadRecord instance"""
        self.receipt_upload = receipt_upload
        self.business = receipt_upload.business
        self.created_transactions = 0
        self.failed_items = 0
        self.errors: List[Dict[str, Any]] = []
        self.affected_products: Set[str] = set()  # Track affected product IDs
        self.affected_customers: Set[str] = set()  # Track affected customer IDs

    def process_receipt(self) -> Dict[str, Any]:
        """
        Process receipt image and create transactions

        Returns:
            Dictionary with processing results including extracted data and counts
        """
        try:
            logger.info(f"Receipt upload started: image_id={self.receipt_upload.image_id}, "
                       f"business={self.business.name}, filename={self.receipt_upload.original_filename}")

            # Update status to processing
            self.receipt_upload.status = 'processing'
            self.receipt_upload.processing_started_at = timezone.now()
            self.receipt_upload.save()

            # Extract receipt data (mocked for MVP)
            extracted_data = self._extract_receipt_data()

            # Parse receipt date
            receipt_date = self._parse_date(extracted_data['date'])

            # Process each item in receipt
            for item_idx, item in enumerate(extracted_data.get('items', []), start=1):
                try:
                    self._process_receipt_item(item, receipt_date)
                except Exception as e:
                    self.failed_items += 1
                    self.errors.append({
                        'item': item_idx,
                        'name': item.get('name', 'Unknown'),
                        'error': str(e)
                    })

            # Mark as completed
            self.receipt_upload.status = 'completed'
            self.receipt_upload.processing_completed_at = timezone.now()
            self.receipt_upload.extracted_data = extracted_data
            self.receipt_upload.created_transactions = self.created_transactions
            self.receipt_upload.save()

            logger.info(
                f"Receipt processing: Created {self.created_transactions} transactions, "
                f"failed {self.failed_items} items"
            )

            # Publish event to trigger downstream processing
            self._publish_transaction_parsed_event()

            return {
                'created_count': self.created_transactions,
                'failed_count': self.failed_items,
                'extracted_data': extracted_data,
                'errors': self.errors
            }

        except Exception as e:
            # Critical error - mark as failed
            logger.error(f"Receipt processing failed: {str(e)}")
            self.receipt_upload.status = 'failed'
            self.receipt_upload.error_message = str(e)
            self.receipt_upload.processing_completed_at = timezone.now()
            self.receipt_upload.save()
            return {
                'created_count': 0,
                'failed_count': 0,
                'extracted_data': None,
                'errors': [{'error': str(e)}]
            }

    def _extract_receipt_data(self) -> Dict[str, Any]:
        """
        Extract receipt data from image (mocked for MVP)

        In Phase 2, replace with:
        - Tesseract OCR library
        - Google Cloud Vision API
        - AWS Textract

        Returns:
            Dictionary with date, items (list of dicts), total, confidence
        """
        # For MVP: Return mocked data
        # In production, this would call actual OCR service
        return {
            "date": datetime.now().date().isoformat(),
            "items": [
                {"name": "Lay's Chips", "qty": 2, "price": 150},
                {"name": "Cold Drink", "qty": 1, "price": 100},
                {"name": "Bread", "qty": 3, "price": 75},
            ],
            "total": 595,
            "confidence": 95
        }

    def _process_receipt_item(self, item: Dict[str, Any], receipt_date: date) -> None:
        """
        Process a single receipt item and create transaction

        Args:
            item: Dictionary with keys: name, qty, price
            receipt_date: Date of receipt
        """
        item_name = item.get('name', '').strip()
        quantity = int(item.get('qty', 1))
        amount = Decimal(str(item.get('price', 0)))

        # Validate item
        if not item_name:
            raise ValueError("Item name is required")
        if quantity <= 0:
            raise ValueError("Quantity must be > 0")
        if amount <= 0:
            raise ValueError("Amount must be > 0")

        # Calculate unit price
        unit_price = amount / quantity

        # Compute hash for duplicate detection
        # Use receipt date + item name + qty + amount + "walk-in" (walk-in customer)
        row_hash = self._compute_row_hash(receipt_date, item_name, quantity, amount)

        # Check for duplicates
        if self._is_duplicate(row_hash):
            # Skip duplicate
            return

        # Use atomic transaction for consistency
        with db_transaction.atomic():
            # Get or create product
            product = self._get_or_create_product(item_name, unit_price)
            self.affected_products.add(str(product.product_id))

            # Get or create walk-in customer
            customer = self._get_or_create_customer("Walk-in")
            if customer:
                self.affected_customers.add(str(customer.customer_id))

            # Create transaction
            transaction = Transaction.objects.create(
                business=self.business,
                product=product,
                customer=customer,
                date=receipt_date,
                quantity=quantity,
                unit_price=unit_price,
                amount=amount,
                payment_method='cash',
                csv_import_hash=row_hash,
                notes=f"From receipt: {self.receipt_upload.original_filename}"
            )

            # Update product stock
            product.current_stock -= quantity
            product.save()

            # Update customer stats
            customer.total_purchases += amount
            customer.last_purchase = receipt_date
            customer.save()

        self.created_transactions += 1

    def _parse_date(self, date_str: str) -> date:
        """Parse and validate date field"""
        try:
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if parsed_date > timezone.now().date():
                raise ValueError(f"Date cannot be in the future: {date_str}")
            return parsed_date
        except ValueError:
            raise ValueError(f"Invalid date format (use YYYY-MM-DD): {date_str}")

    def _compute_row_hash(self, date: date, product: str, qty: int, amount: Decimal) -> str:
        """Compute MD5 hash for duplicate detection"""
        hash_input = f"{date}|{product}|{qty}|{amount}|walk-in"
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
                'sku': f'SKU-OCR-{hashlib.md5(product_name.encode()).hexdigest()[:8].upper()}',
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
            logger.warning("Event adapter not available for receipt processing")
        except Exception as e:
            logger.error(f"Failed to publish transaction.parsed event: {e}")
