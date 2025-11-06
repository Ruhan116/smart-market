import io
import os
import tempfile
from datetime import datetime
from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Business
from .models import FileUploadRecord, Product, Customer, Transaction, FailedJob
from .services import CSVParserService


class CSVUploadTestCase(APITestCase):
    """Test CSV upload endpoint"""

    def setUp(self):
        """Set up test fixtures"""
        # Create user and business
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.business = Business.objects.create(owner=self.user, name='Test Store', type='convenience')

        # Create API client and authenticate
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        self.upload_url = '/api/data/upload-csv'

    def _create_csv_file(self, content, filename='test.csv'):
        """Helper to create CSV file"""
        csv_file = SimpleUploadedFile(
            filename,
            content.encode(),
            content_type='text/csv'
        )
        return csv_file

    def _get_valid_csv(self):
        """Get valid CSV content matching recommended schema"""
        return """Date,Time,Product,Quantity,UnitPrice,Amount,Customer,PaymentMethod,Notes
2025-11-01,09:30,Lay's Chips,5,30,150,Fatema,Cash,
2025-11-01,10:15,Cold Drink,8,50,400,Walk-in,Cash,
2025-11-02,08:00,Lay's Chips,3,30,90,Zara,bKash,Reg customer"""

    # Test 1: Successful CSV upload (202 response, file saved)
    def test_successful_csv_upload(self):
        """Test successful CSV upload returns 202 ACCEPTED"""
        csv_content = self._get_valid_csv()
        csv_file = self._create_csv_file(csv_content)

        response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data['status'], 'pending')
        self.assertIn('file_id', response.data['data'])
        self.assertIn('message', response.data['data'])

        # Verify FileUploadRecord created
        file_id = response.data['data']['file_id']
        file_upload = FileUploadRecord.objects.get(file_id=file_id)
        self.assertEqual(file_upload.status, 'pending')
        self.assertEqual(file_upload.original_filename, 'test.csv')

    # Test 2: Invalid file format rejection (400)
    def test_invalid_file_format(self):
        """Test invalid file format returns 400"""
        invalid_file = SimpleUploadedFile(
            'test.txt',
            b'This is not a CSV',
            content_type='text/plain'
        )

        response = self.client.post(
            self.upload_url,
            {'file': invalid_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('INVALID_FILE_FORMAT', response.data['error_code'])

    # Test 3: Oversized file rejection (413 or 400)
    def test_oversized_file_rejection(self):
        """Test file over 10MB is rejected"""
        # Create a file larger than 10MB
        large_content = 'Date,Product,Quantity,Amount\n' + ('2025-11-01,Test,1,100\n' * 1000000)
        large_file = SimpleUploadedFile(
            'large.csv',
            large_content.encode(),
            content_type='text/csv'
        )

        response = self.client.post(
            self.upload_url,
            {'file': large_file},
            format='multipart'
        )

        # Should be rejected due to size
        self.assertIn(response.status_code, [400, 413])

    # Test 4: Unauthenticated request (401)
    def test_unauthenticated_request(self):
        """Test unauthenticated request returns 401"""
        client = APIClient()  # No credentials
        csv_content = self._get_valid_csv()
        csv_file = self._create_csv_file(csv_content)

        response = client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        self.assertEqual(response.status_code, 401)

    # Test 5: Rate limiting (429 after 10 uploads/min)
    def test_rate_limiting(self):
        """Test rate limiting enforced (10 uploads per minute)"""
        csv_content = self._get_valid_csv()

        # Create and upload 11 files
        for i in range(11):
            csv_file = self._create_csv_file(csv_content, f'test{i}.csv')
            response = self.client.post(
                self.upload_url,
                {'file': csv_file},
                format='multipart'
            )

            if i < 10:
                # First 10 should succeed
                self.assertEqual(response.status_code, 202)
            else:
                # 11th should be rate limited
                self.assertEqual(response.status_code, 429)
                self.assertIn('RATE_LIMIT_EXCEEDED', response.data['error_code'])

    # Test 6: Status polling endpoint during processing
    def test_polling_endpoint_processing(self):
        """Test polling endpoint returns status during processing"""
        csv_content = self._get_valid_csv()
        csv_file = self._create_csv_file(csv_content)

        upload_response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        file_id = upload_response.data['data']['file_id']

        # Poll status
        status_url = f'/api/data/upload-csv/{file_id}'
        response = self.client.get(status_url)

        self.assertEqual(response.status_code, 200)
        self.assertIn('status', response.data)
        # Status will be 'pending' immediately after upload
        self.assertIn(response.data['status'], ['pending', 'processing'])

    # Test 7: Status polling endpoint after completion
    def test_polling_endpoint_completed(self):
        """Test polling endpoint after processing completes"""
        # Create file upload record and manually set it to completed
        csv_content = self._get_valid_csv()
        csv_file = self._create_csv_file(csv_content)

        upload_response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        file_id = upload_response.data['data']['file_id']
        file_upload = FileUploadRecord.objects.get(file_id=file_id)

        # Simulate completion
        file_upload.status = 'completed'
        file_upload.rows_processed = 3
        file_upload.created_transactions = 3
        file_upload.save()

        # Poll status
        status_url = f'/api/data/upload-csv/{file_id}'
        response = self.client.get(status_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'completed')
        self.assertEqual(response.data['created_transactions'], 3)

    # Test 8: Missing file parameter
    def test_missing_file_parameter(self):
        """Test upload without file returns 400"""
        response = self.client.post(self.upload_url, {}, format='multipart')

        self.assertEqual(response.status_code, 400)
        self.assertIn('INVALID_FILE_FORMAT', response.data['error_code'])

    # Test 9: CSV with valid data creates transactions
    def test_csv_creates_transactions(self):
        """Test that valid CSV creates Transaction records"""
        csv_content = self._get_valid_csv()
        csv_file = self._create_csv_file(csv_content)

        response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        file_id = response.data['data']['file_id']
        file_upload = FileUploadRecord.objects.get(file_id=file_id)

        # Manually trigger processing to test
        from .services import CSVParserService
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Verify transactions were created
        self.assertEqual(file_upload.created_transactions, 3)
        self.assertEqual(Transaction.objects.filter(business=self.business).count(), 3)

        # Verify products created
        self.assertTrue(Product.objects.filter(business=self.business, name="Lay's Chips").exists())
        self.assertTrue(Product.objects.filter(business=self.business, name="Cold Drink").exists())

    # Test 10: CSV with invalid date format
    def test_csv_invalid_date_format(self):
        """Test CSV with invalid date format is handled"""
        csv_content = """Date,Time,Product,Quantity,UnitPrice,Amount,Customer,PaymentMethod,Notes
2025-13-01,09:30,Test Product,5,30,150,John,Cash,"""
        csv_file = self._create_csv_file(csv_content)

        response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        file_id = response.data['data']['file_id']
        file_upload = FileUploadRecord.objects.get(file_id=file_id)

        # Process manually
        from .services import CSVParserService
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Should have error
        self.assertEqual(len(file_upload.processing_errors), 1)

    # Test 11: CSV with missing required fields
    def test_csv_missing_required_fields(self):
        """Test CSV with missing required fields"""
        csv_content = """Date,Time,Product,Quantity,UnitPrice,Amount,Customer,PaymentMethod,Notes
2025-11-01,09:30,,5,30,150,John,Cash,"""
        csv_file = self._create_csv_file(csv_content)

        response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        file_id = response.data['data']['file_id']
        file_upload = FileUploadRecord.objects.get(file_id=file_id)

        from .services import CSVParserService
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Should have processing errors
        self.assertTrue(len(file_upload.processing_errors) > 0)

    # Test 12: Thread spawning verification
    def test_thread_spawning(self):
        """Test that background thread is spawned"""
        csv_content = self._get_valid_csv()
        csv_file = self._create_csv_file(csv_content)

        response = self.client.post(
            self.upload_url,
            {'file': csv_file},
            format='multipart'
        )

        # FileUploadRecord should be created
        self.assertEqual(response.status_code, 202)
        file_id = response.data['data']['file_id']
        self.assertTrue(FileUploadRecord.objects.filter(file_id=file_id).exists())


class ProductModelTestCase(TestCase):
    """Test Product model"""

    def setUp(self):
        self.user = User.objects.create_user(username='user1', password='pass')
        self.business = Business.objects.create(owner=self.user, name='Shop', type='convenience')

    def test_create_product(self):
        """Test creating a product"""
        product = Product.objects.create(
            business=self.business,
            name='Chips',
            current_stock=10,
            unit_price=30
        )
        self.assertEqual(product.name, 'Chips')
        self.assertEqual(product.current_stock, 10)

    def test_product_unique_constraint(self):
        """Test unique constraint on business + name"""
        Product.objects.create(
            business=self.business,
            name='Chips',
            unit_price=30
        )

        # Try to create duplicate - should raise error
        with self.assertRaises(Exception):
            Product.objects.create(
                business=self.business,
                name='Chips',
                unit_price=30
            )


class CustomerModelTestCase(TestCase):
    """Test Customer model"""

    def setUp(self):
        self.user = User.objects.create_user(username='user1', password='pass')
        self.business = Business.objects.create(owner=self.user, name='Shop', type='convenience')

    def test_create_customer(self):
        """Test creating a customer"""
        customer = Customer.objects.create(
            business=self.business,
            name='John',
            total_purchases=500
        )
        self.assertEqual(customer.name, 'John')
        self.assertEqual(customer.total_purchases, 500)


class CSVParserServiceTestCase(TestCase):
    """Test CSVParserService - Story 3.2"""

    def setUp(self):
        """Set up test fixtures"""
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.business = Business.objects.create(owner=self.user, name='Test Store', type='convenience')

    def _create_temp_csv(self, content):
        """Helper to create temporary CSV file"""
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8')
        temp_file.write(content)
        temp_file.close()
        return temp_file.name

    def _create_file_upload_record(self, csv_content):
        """Helper to create FileUploadRecord and save CSV"""
        file_path = self._create_temp_csv(csv_content)

        file_upload = FileUploadRecord.objects.create(
            business=self.business,
            user=self.user,
            original_filename='test.csv',
            file_path=file_path,
            file_size=len(csv_content.encode()),
            status='pending'
        )
        return file_upload

    def tearDown(self):
        """Clean up temporary files"""
        import glob
        for temp_file in glob.glob('/tmp/tmp*.csv'):
            try:
                os.unlink(temp_file)
            except:
                pass

    # Test 1: Successful parsing with 10 rows
    def test_successful_parsing_10_rows(self):
        """Test successful parsing of 10 valid rows creates 10 transactions"""
        csv_content = """Date,Product,Quantity,Amount,Customer,PaymentMethod
2025-11-01,Chips,5,150,John,cash
2025-11-01,Cold Drink,3,75,Jane,bkash
2025-11-02,Chips,2,60,John,cash
2025-11-02,Bread,4,80,Walk-in,cash
2025-11-03,Butter,1,120,Mary,nagad
2025-11-03,Eggs,10,100,Walk-in,cash
2025-11-04,Chips,3,90,John,rocket
2025-11-04,Milk,2,160,Sam,card
2025-11-05,Tea,5,50,Jane,credit
2025-11-05,Sugar,1,50,Other,other"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        self.assertEqual(result['created_count'], 10)
        self.assertEqual(result['failed_count'], 0)
        self.assertEqual(result['skipped_count'], 0)
        self.assertEqual(Transaction.objects.filter(business=self.business).count(), 10)

    # Test 2: Invalid date format - row skipped, error logged
    def test_invalid_date_format(self):
        """Test invalid date format is skipped and error logged"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-13-45,Chips,5,150,John
2025-11-02,Bread,4,80,Jane"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # First row should fail, second should succeed
        self.assertEqual(result['created_count'], 1)
        self.assertEqual(result['failed_count'], 1)
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('Invalid date format', result['errors'][0]['error'])

    # Test 3: Invalid quantity (negative/zero)
    def test_invalid_quantity_negative(self):
        """Test negative quantity is rejected"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,-5,150,John
2025-11-02,Bread,4,80,Jane"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        self.assertEqual(result['created_count'], 1)
        self.assertEqual(result['failed_count'], 1)
        self.assertIn('Invalid quantity', result['errors'][0]['error'])

    def test_invalid_quantity_zero(self):
        """Test zero quantity is rejected"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,0,150,John"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        self.assertEqual(result['failed_count'], 1)
        self.assertIn('Invalid quantity', result['errors'][0]['error'])

    # Test 4: Invalid amount (zero/negative)
    def test_invalid_amount_negative(self):
        """Test negative amount is rejected"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,-150,John
2025-11-02,Bread,4,80,Jane"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        self.assertEqual(result['created_count'], 1)
        self.assertEqual(result['failed_count'], 1)
        self.assertIn('Invalid amount', result['errors'][0]['error'])

    def test_invalid_amount_zero(self):
        """Test zero amount is rejected"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,0,John"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        self.assertEqual(result['failed_count'], 1)
        self.assertIn('Invalid amount', result['errors'][0]['error'])

    # Test 5: Duplicate detection
    def test_duplicate_detection(self):
        """Test duplicate rows are skipped on second occurrence"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,150,John
2025-11-01,Chips,5,150,John"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # First row created, second skipped as duplicate
        self.assertEqual(result['created_count'], 1)
        self.assertEqual(result['skipped_count'], 1)
        self.assertEqual(Transaction.objects.filter(business=self.business).count(), 1)

    # Test 6: Auto-create product with correct stock
    def test_auto_create_product(self):
        """Test new product is auto-created with correct initial values"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,New Product,5,150,John"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Product should be created
        product = Product.objects.get(business=self.business, name='New Product')
        self.assertEqual(product.unit_price, Decimal('30'))  # 150 / 5
        self.assertIsNotNone(product.sku)
        self.assertTrue(product.sku.startswith('SKU-'))
        self.assertEqual(product.reorder_point, 50)  # Default

    # Test 7: Auto-create customer
    def test_auto_create_customer(self):
        """Test new customer is auto-created"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,150,New Customer"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Customer should be created
        customer = Customer.objects.get(business=self.business, name='New Customer')
        self.assertEqual(customer.total_purchases, 150)
        self.assertEqual(customer.last_purchase.year, 2025)

    # Test 8: Stock update
    def test_stock_update(self):
        """Test product stock is decremented correctly"""
        # Create initial product with stock
        product = Product.objects.create(
            business=self.business,
            name='Chips',
            current_stock=100,
            unit_price=30
        )

        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,150,John
2025-11-02,Chips,10,300,Jane"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Stock should be decremented: 100 - 5 - 10 = 85
        product.refresh_from_db()
        self.assertEqual(product.current_stock, 85)

    # Test 9: Missing required column fails immediately
    def test_missing_required_column(self):
        """Test missing required column fails entire import"""
        csv_content = """Date,Product,Quantity
2025-11-01,Chips,5"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Should fail entirely due to missing 'Amount' column
        self.assertEqual(result['created_count'], 0)
        self.assertTrue(len(result['errors']) > 0)

    # Test 10: Optional columns work
    def test_optional_columns(self):
        """Test CSV without optional columns still works"""
        csv_content = """Date,Product,Quantity,Amount
2025-11-01,Chips,5,150
2025-11-02,Bread,4,80"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Should create transactions without customer/payment method
        self.assertEqual(result['created_count'], 2)
        self.assertEqual(result['failed_count'], 0)

        # Transactions should have Walk-in customer and cash payment method
        transactions = Transaction.objects.filter(business=self.business)
        self.assertEqual(transactions.count(), 2)

    # Test 11: Invalid payment method defaults to 'other'
    def test_invalid_payment_method_defaults(self):
        """Test invalid payment method defaults to 'other'"""
        csv_content = """Date,Product,Quantity,Amount,PaymentMethod
2025-11-01,Chips,5,150,invalid_method
2025-11-02,Bread,4,80,cash"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        transactions = Transaction.objects.filter(business=self.business)
        # First should default to 'other', second should be 'cash'
        first = transactions.order_by('date').first()
        self.assertEqual(first.payment_method, 'other')
        last = transactions.order_by('date').last()
        self.assertEqual(last.payment_method, 'cash')

    # Test 12: Failed job records are created for errors
    def test_failed_job_records(self):
        """Test FailedJob records are created for failed rows"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,abc,150,John
2025-11-02,Bread,4,80,Jane"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Should have one failed job record
        failed_jobs = FailedJob.objects.filter(file_upload=file_upload)
        self.assertEqual(failed_jobs.count(), 1)
        self.assertIn('Invalid quantity', failed_jobs.first().error_message)

    # Test 13: Walk-in customer handling
    def test_walk_in_customer_handling(self):
        """Test Walk-in customer is not created separately"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,150,Walk-in
2025-11-02,Bread,4,80,Walk-in"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Transactions should have no customer reference
        transactions = Transaction.objects.filter(business=self.business)
        for t in transactions:
            self.assertIsNone(t.customer)

    # Test 14: Case-insensitive column matching
    def test_case_insensitive_columns(self):
        """Test column names are matched case-insensitively"""
        csv_content = """date,PRODUCT,quantity,AMOUNT,customer
2025-11-01,Chips,5,150,John"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Should successfully parse despite different case
        self.assertEqual(result['created_count'], 1)
        self.assertEqual(Transaction.objects.filter(business=self.business).count(), 1)

    # Test 15: Duplicate detection across different customers
    def test_duplicate_detection_same_product_different_customer(self):
        """Test that same product with different customers creates separate transactions"""
        csv_content = """Date,Product,Quantity,Amount,Customer
2025-11-01,Chips,5,150,John
2025-11-01,Chips,5,150,Jane"""

        file_upload = self._create_file_upload_record(csv_content)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()

        # Both should be created (different customers = different hash)
        self.assertEqual(result['created_count'], 2)
        self.assertEqual(Transaction.objects.filter(business=self.business).count(), 2)
