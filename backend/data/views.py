import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.db import models as db_models
from django.db.models import Sum, Count, Avg, Q, Min, Max
from django.db import transaction as db_transaction
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_202_ACCEPTED, HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND, HTTP_429_TOO_MANY_REQUESTS, HTTP_201_CREATED
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import PageNumberPagination
from .models import (
    FileUploadRecord, Transaction, ReceiptUploadRecord, Product, Customer, FailedJob,
    InventoryUploadRecord, StockMovement, StockAlert
)
from .serializers import (
    FileUploadStatusSerializer, TransactionSerializer, ReceiptStatusSerializer,
    InventoryUploadStatusSerializer, ProductDetailSerializer, StockMovementSerializer,
    StockAlertSerializer, InventoryReportSerializer
)
from .services import CSVParserService
from .receipt_ocr import ReceiptOCRService
from .inventory_service import InventoryUploadService, SaleRecorderService, InventoryReportService

# Thread pool executor for background processing
# Max 5 concurrent uploads as per requirements
_executor = ThreadPoolExecutor(max_workers=5)


def _get_business(user):
    """Helper to get user's business"""
    try:
        return user.business
    except Exception:
        # User doesn't have a business (RelatedObjectDoesNotExist)
        return None


def _update_stock_alerts_for_product(product, business, user):
    """Ensure stock alerts reflect current inventory state"""
    now = timezone.now()

    if product.current_stock == 0:
        alert, created = StockAlert.objects.get_or_create(
            business=business,
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
            alert.threshold = 0
            alert.is_acknowledged = False
            alert.acknowledged_at = None
            alert.acknowledged_by = None
            alert.save()

        # Mark any low stock alerts as acknowledged
        StockAlert.objects.filter(
            business=business,
            product=product,
            alert_type='low_stock'
        ).update(
            current_stock=product.current_stock,
            is_acknowledged=True,
            acknowledged_at=now,
            acknowledged_by=user
        )

    elif product.current_stock <= product.reorder_point:
        alert, created = StockAlert.objects.get_or_create(
            business=business,
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
            alert.threshold = product.reorder_point
            alert.is_acknowledged = False
            alert.acknowledged_at = None
            alert.acknowledged_by = None
            alert.save()

        # Mark out of stock alerts as acknowledged
        StockAlert.objects.filter(
            business=business,
            product=product,
            alert_type='out_of_stock'
        ).update(
            current_stock=product.current_stock,
            is_acknowledged=True,
            acknowledged_at=now,
            acknowledged_by=user
        )

    else:
        # Stock healthy - mark any alerts as acknowledged
        StockAlert.objects.filter(
            business=business,
            product=product
        ).update(
            current_stock=product.current_stock,
            is_acknowledged=True,
            acknowledged_at=now,
            acknowledged_by=user
        )

def _validate_csv_file(file_obj):
    """Validate CSV file before processing"""
    if not file_obj:
        return False, "No file provided"

    # Check file extension
    filename = file_obj.name
    if not filename.lower().endswith('.csv'):
        return False, "File must be a CSV file"

    # Check file size (10MB max)
    if file_obj.size > 10 * 1024 * 1024:
        return False, "File exceeds maximum size of 10MB"

    # Check MIME type (more flexible for testing)
    allowed_types = ['text/csv', 'application/csv', 'text/plain']
    if file_obj.content_type and file_obj.content_type not in allowed_types:
        return False, "Invalid MIME type. Expected text/csv"

    # Try to read first 10 rows
    try:
        import csv
        import io

        file_obj.seek(0)
        raw_bytes = file_obj.read()
        if not raw_bytes:
            return False, "CSV file appears to be empty"

        preview_stream = io.StringIO(raw_bytes.decode('utf-8', errors='replace'))
        reader = csv.DictReader(preview_stream)
        row_count = 0
        for _ in reader:
            row_count += 1
            if row_count >= 10:
                break
        if row_count == 0:
            return False, "CSV file appears to be empty"
    except Exception as e:
        return False, f"Invalid CSV format: {str(e)}"
    finally:
        file_obj.seek(0)

    return True, "Valid"


def _check_rate_limit(business_id):
    """Check rate limit for uploads (10 per minute)"""
    cache_key = f"csv_uploads_{business_id}"
    count = cache.get(cache_key, 0)

    limit = getattr(settings, 'RATE_LIMIT_UPLOADS_PER_MINUTE', 10)
    if count >= limit:
        return False, count

    # Increment and set expiry to 60 seconds
    cache.set(cache_key, count + 1, 60)
    return True, count + 1


def _save_uploaded_file(file_obj, business_id):
    """Save uploaded file to media directory"""
    # Create directory structure: media/uploads/{business_id}/{uuid}/
    upload_dir = os.path.join(
        settings.MEDIA_ROOT,
        'uploads',
        str(business_id)
    )
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_uuid = uuid.uuid4()
    filename = f"{file_uuid}_{file_obj.name}"
    filepath = os.path.join(upload_dir, filename)

    # Save file
    with open(filepath, 'wb') as f:
        for chunk in file_obj.chunks():
            f.write(chunk)

    return filepath


def _process_csv_file(file_upload_id):
    """Background task to process CSV file"""
    try:
        file_upload = FileUploadRecord.objects.get(file_id=file_upload_id)
        parser = CSVParserService(file_upload)
        result = parser.parse_csv()
        return result
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_csv(request):
    """
    Upload CSV file endpoint
    POST /data/upload-csv
    """
    if request.method != 'POST':
        return Response(
            {'error_code': 'METHOD_NOT_ALLOWED', 'message': 'POST method required'},
            status=405
        )

    # Get business
    business = _get_business(request.user)
    if not business:
        return Response(
            {'error_code': 'NO_BUSINESS', 'message': 'User has no associated business'},
            status=HTTP_400_BAD_REQUEST
        )

    # Check rate limit
    allowed, _ = _check_rate_limit(business.id)
    if not allowed:
        return Response(
            {
                'error_code': 'RATE_LIMIT_EXCEEDED',
                'message': f'Maximum {getattr(settings, "RATE_LIMIT_UPLOADS_PER_MINUTE", 10)} uploads per minute allowed'
            },
            status=HTTP_429_TOO_MANY_REQUESTS
        )

    # Get file
    file_obj = request.FILES.get('file')
    data_source_name = request.data.get('data_source_name', 'Default')

    # Validate file
    is_valid, message = _validate_csv_file(file_obj)
    if not is_valid:
        return Response(
            {'error_code': 'INVALID_FILE_FORMAT', 'message': message},
            status=HTTP_400_BAD_REQUEST
        )

    # Save file
    file_path = _save_uploaded_file(file_obj, business.id)

    # Create FileUploadRecord
    file_upload = FileUploadRecord.objects.create(
        business=business,
        user=request.user,
        file_path=file_path,
        original_filename=file_obj.name,
        file_size=file_obj.size,
        status='pending'
    )

    # Spawn background thread to process file
    _executor.submit(_process_csv_file, file_upload.file_id)

    return Response(
        {
            'status': 'pending',
            'data': {
                'message': 'Processing file...',
                'file_id': str(file_upload.file_id),
                'file_name': file_obj.name,
                'rows_detected': 0,  # Will be updated during processing
                'estimated_processing_time': 5
            }
        },
        status=HTTP_202_ACCEPTED
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_upload_status(request, file_id):
    """
    Get upload status
    GET /data/upload-csv/{file_id}
    """
    try:
        # Verify user owns this business
        business = _get_business(request.user)
        file_upload = FileUploadRecord.objects.get(file_id=file_id, business=business)
    except FileUploadRecord.DoesNotExist:
        return Response(
            {'error': 'File upload not found'},
            status=HTTP_404_NOT_FOUND
        )

    serializer = FileUploadStatusSerializer(file_upload)
    data = serializer.data

    if file_upload.status == 'completed':
        # Include transaction errors if any
        data['errors'] = file_upload.processing_errors

    return Response(data)


def _validate_receipt_image(file_obj):
    """Validate receipt image file before processing"""
    if not file_obj:
        return False, "No file provided"

    # Check file extension
    filename = file_obj.name.lower()
    if not (filename.endswith('.jpg') or filename.endswith('.jpeg') or filename.endswith('.png')):
        return False, "File must be JPG or PNG image"

    # Check file size (5MB max)
    if file_obj.size > 5 * 1024 * 1024:
        return False, "File exceeds maximum size of 5MB"

    # Check MIME type
    allowed_types = ['image/jpeg', 'image/png']
    if file_obj.content_type and file_obj.content_type not in allowed_types:
        return False, "Invalid MIME type. Expected image/jpeg or image/png"

    return True, "Valid"


def _save_receipt_file(file_obj, business_id):
    """Save uploaded receipt image to media directory"""
    # Create directory structure: media/receipts/{business_id}/{uuid}/
    upload_dir = os.path.join(
        settings.MEDIA_ROOT,
        'receipts',
        str(business_id)
    )
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_uuid = uuid.uuid4()
    filename = f"{file_uuid}_{file_obj.name}"
    filepath = os.path.join(upload_dir, filename)

    # Save file
    with open(filepath, 'wb') as f:
        for chunk in file_obj.chunks():
            f.write(chunk)

    return filepath


def _process_receipt_image(receipt_upload_id):
    """Background task to process receipt image"""
    try:
        receipt_upload = ReceiptUploadRecord.objects.get(image_id=receipt_upload_id)
        ocr_service = ReceiptOCRService(receipt_upload)
        result = ocr_service.process_receipt()
        return result
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_receipt(request):
    """
    Upload receipt image endpoint
    POST /data/upload-receipt
    """
    if request.method != 'POST':
        return Response(
            {'error_code': 'METHOD_NOT_ALLOWED', 'message': 'POST method required'},
            status=405
        )

    # Get business
    business = _get_business(request.user)
    if not business:
        return Response(
            {'error_code': 'NO_BUSINESS', 'message': 'User has no associated business'},
            status=HTTP_400_BAD_REQUEST
        )

    # Get file
    file_obj = request.FILES.get('image')

    # Validate file
    is_valid, message = _validate_receipt_image(file_obj)
    if not is_valid:
        return Response(
            {'error_code': 'INVALID_FILE_FORMAT', 'message': message},
            status=HTTP_400_BAD_REQUEST
        )

    # Save file
    file_path = _save_receipt_file(file_obj, business.id)

    # Create ReceiptUploadRecord
    receipt_upload = ReceiptUploadRecord.objects.create(
        business=business,
        user=request.user,
        file_path=file_path,
        original_filename=file_obj.name,
        file_size=file_obj.size,
        status='pending'
    )

    # Spawn background thread to process receipt
    _executor.submit(_process_receipt_image, receipt_upload.image_id)

    return Response(
        {
            'status': 'pending',
            'data': {
                'message': 'Extracting receipt data...',
                'image_id': str(receipt_upload.image_id),
                'file_name': file_obj.name,
                'estimated_processing_time': 10
            }
        },
        status=HTTP_202_ACCEPTED
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_receipt_status(request, image_id):
    """
    Get receipt processing status
    GET /data/upload-receipt/{image_id}
    """
    try:
        # Verify user owns this business
        business = _get_business(request.user)
        receipt_upload = ReceiptUploadRecord.objects.get(image_id=image_id, business=business)
    except ReceiptUploadRecord.DoesNotExist:
        return Response(
            {'error': 'Receipt upload not found'},
            status=HTTP_404_NOT_FOUND
        )

    serializer = ReceiptStatusSerializer(receipt_upload)
    return Response(serializer.data)


class IsStaff(IsAuthenticated):
    """Permission class to require staff access"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff


@api_view(['GET'])
@permission_classes([IsStaff])
def list_failed_jobs(request):
    """
    List all failed jobs with filtering and sorting
    GET /admin/api/v1/failed-jobs
    """
    # Get all failed jobs
    queryset = FailedJob.objects.all()

    # Optional filters
    business_id = request.query_params.get('business_id')
    if business_id:
        queryset = queryset.filter(business_id=business_id)

    file_id = request.query_params.get('file_id')
    if file_id:
        queryset = queryset.filter(file_upload_id=file_id)

    # Date range filtering
    date_from = request.query_params.get('date_from')
    if date_from:
        try:
            from_date = datetime.strptime(date_from, '%Y-%m-%d').date()
            queryset = queryset.filter(created_at__date__gte=from_date)
        except ValueError:
            pass

    date_to = request.query_params.get('date_to')
    if date_to:
        try:
            to_date = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(created_at__date__lte=to_date)
        except ValueError:
            pass

    # Sorting
    sort_by = request.query_params.get('sort_by', 'created_at')
    sort_order = request.query_params.get('sort_order', 'desc')

    if sort_by in ['created_at', 'file_id']:
        order_field = f"{'-' if sort_order == 'desc' else ''}{sort_by}"
        queryset = queryset.order_by(order_field)

    # Pagination
    page_size = int(request.query_params.get('limit', 50))
    offset = int(request.query_params.get('offset', 0))
    total_count = queryset.count()

    items = queryset[offset:offset + page_size]

    results = []
    for job in items:
        results.append({
            'id': str(job.id),
            'file_id': str(job.file_upload.file_id),
            'row_number': job.row_number,
            'row_data': job.row_data,
            'error_message': job.error_message,
            'created_at': job.created_at,
            'file_name': job.file_upload.original_filename,
            'business_name': job.business.name
        })

    return Response({
        'count': total_count,
        'results': results
    })


@api_view(['POST'])
@permission_classes([IsStaff])
def retry_failed_job(request, job_id):
    """
    Retry a failed job by reprocessing the row
    POST /admin/api/v1/failed-jobs/{id}/retry
    """
    try:
        failed_job = FailedJob.objects.get(id=job_id)
    except FailedJob.DoesNotExist:
        return Response(
            {'error': 'Failed job not found'},
            status=HTTP_404_NOT_FOUND
        )

    # Get the associated file upload
    file_upload = failed_job.file_upload

    # Spawn a new thread to reprocess the row
    def reprocess_row():
        try:
            csv_service = CSVParserService(file_upload)
            # Reprocess the specific row
            csv_service._process_row(failed_job.row_data, failed_job.row_number)
            # Update or delete the failed job if successful
            failed_job.delete()
        except Exception as e:
            # Log the error but don't fail
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to retry job {job_id}: {str(e)}")

    _executor.submit(reprocess_row)

    return Response({
        'status': 'pending',
        'message': 'Row will be reprocessed',
        'retry_count': getattr(failed_job, 'retry_count', 0) + 1
    })


@api_view(['GET'])
@permission_classes([IsStaff])
def upload_status_monitoring(request):
    """
    Monitor active and recent uploads
    GET /admin/api/v1/upload-status
    """
    # Get active uploads (processing or pending)
    active_uploads = FileUploadRecord.objects.filter(
        status__in=['processing', 'pending']
    ).order_by('-uploaded_at')

    # Get recent uploads (completed or failed within last 24 hours)
    from django.utils import timezone
    from datetime import timedelta
    recent_threshold = timezone.now() - timedelta(hours=24)
    recent_uploads = FileUploadRecord.objects.filter(
        status__in=['completed', 'failed'],
        processing_completed_at__gte=recent_threshold
    ).order_by('-processing_completed_at')[:10]

    active_results = []
    for upload in active_uploads:
        elapsed = None
        if upload.processing_started_at:
            elapsed = (timezone.now() - upload.processing_started_at).total_seconds()

        active_results.append({
            'file_id': str(upload.file_id),
            'file_name': upload.original_filename,
            'status': upload.status,
            'rows_processed': upload.rows_processed or 0,
            'rows_total': upload.row_count or 0,
            'percent_complete': int((upload.rows_processed / max(upload.row_count, 1)) * 100) if upload.row_count else 0,
            'started_at': upload.processing_started_at,
            'elapsed_seconds': elapsed
        })

    recent_results = []
    for upload in recent_uploads:
        recent_results.append({
            'file_id': str(upload.file_id),
            'file_name': upload.original_filename,
            'status': upload.status,
            'rows_processed': upload.rows_processed or 0,
            'rows_total': upload.row_count or 0,
            'percent_complete': int((upload.rows_processed / max(upload.row_count, 1)) * 100) if upload.row_count else 0,
            'started_at': upload.processing_started_at,
            'completed_at': upload.processing_completed_at
        })

    return Response({
        'active_uploads': len(active_uploads),
        'active_uploads_list': active_results,
        'recent_uploads': recent_results
    })


class TransactionPagination(PageNumberPagination):
    """Custom pagination for transactions"""
    page_size = 50
    page_size_query_param = 'limit'
    page_size_query_max = 100
    page_query_param = 'offset'

    def get_paginated_response(self, data):
        """Override to include summary in paginated response"""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class TransactionViewSet(ModelViewSet):
    """ViewSet for listing and filtering transactions with multi-tenant isolation"""
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TransactionPagination
    http_method_names = ['get', 'head', 'options']  # Read-only

    def get_queryset(self):
        """Get transactions for authenticated user's business with optimizations"""
        business = _get_business(self.request.user)
        queryset = Transaction.objects.filter(business=business).select_related('product', 'customer')

        # Apply filters
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=from_date)
            except ValueError:
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=to_date)
            except ValueError:
                pass

        # Apply sorting
        sort_by = self.request.query_params.get('sort_by', 'date')
        sort_order = self.request.query_params.get('sort_order', 'desc')

        if sort_by in ['date', 'amount', 'created_at']:
            order_field = f"{'-' if sort_order == 'desc' else ''}{sort_by}"
            queryset = queryset.order_by(order_field)

        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get transaction summary statistics
        GET /api/v1/transactions/summary/
        """
        business = _get_business(request.user)
        queryset = self._get_filtered_summary_queryset(business)

        total_revenue = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
        transaction_count = queryset.count()
        avg_value = queryset.aggregate(Avg('amount'))['amount__avg'] or 0

        # Revenue by product
        revenue_by_product = queryset.values('product__name').annotate(
            count=Count('product_id'),
            total=Sum('amount')
        ).order_by('-total')

        # Revenue by payment method
        revenue_by_payment = queryset.values('payment_method').annotate(
            count=Count('payment_method'),
            total=Sum('amount')
        ).order_by('-total')

        # Date range
        date_range = queryset.aggregate(
            first_date=Min('date'),
            last_date=Max('date')
        )

        return Response({
            'business_id': str(business.id),
            'total_revenue': float(total_revenue),
            'total_transactions': transaction_count,
            'average_transaction_value': float(avg_value),
            'revenue_by_product': [
                {
                    'product_name': item['product__name'],
                    'count': item['count'],
                    'total': float(item['total']) if item['total'] else 0
                }
                for item in revenue_by_product
            ],
            'revenue_by_payment_method': [
                {
                    'method': item['payment_method'],
                    'count': item['count'],
                    'total': float(item['total']) if item['total'] else 0
                }
                for item in revenue_by_payment
            ],
            'first_transaction_date': date_range['first_date'],
            'last_transaction_date': date_range['last_date'],
        })

    def _get_filtered_summary_queryset(self, business):
        """Get filtered queryset for summary endpoint"""
        queryset = Transaction.objects.filter(business=business)

        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=from_date)
            except ValueError:
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=to_date)
            except ValueError:
                pass

        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_receipt_preview(request, image_id):
    """
    Get receipt OCR preview data
    GET /data/receipts/{image_id}/
    """
    try:
        # Verify user owns this business
        business = _get_business(request.user)
        receipt_upload = ReceiptUploadRecord.objects.get(image_id=image_id, business=business)
    except ReceiptUploadRecord.DoesNotExist:
        return Response(
            {'error': 'Receipt not found'},
            status=HTTP_404_NOT_FOUND
        )

    # Get extracted items if available
    extracted_data = receipt_upload.extracted_data or {}

    return Response({
        'id': str(receipt_upload.image_id),
        'image_url': receipt_upload.file_path,  # or serve the actual media file
        'extracted_items': extracted_data.get('items', []),
        'total_amount': extracted_data.get('total_amount', 0),
        'vendor_name': extracted_data.get('vendor_name'),
        'transaction_date': extracted_data.get('transaction_date'),
        'confidence_score': extracted_data.get('confidence_score', 0),
        'status': receipt_upload.status,
        'created_at': receipt_upload.uploaded_at
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_receipt(request, image_id):
    """
    Confirm receipt OCR data and create transaction
    POST /data/receipts/{image_id}/confirm/
    """
    try:
        # Verify user owns this business
        business = _get_business(request.user)
        receipt_upload = ReceiptUploadRecord.objects.get(image_id=image_id, business=business)
    except ReceiptUploadRecord.DoesNotExist:
        return Response(
            {'error': 'Receipt not found'},
            status=HTTP_404_NOT_FOUND
        )

    # Get items from request
    items = request.data.get('items', [])

    # Create transaction from receipt data
    try:
        extracted_data = receipt_upload.extracted_data or {}

        # Create transaction
        transaction = Transaction.objects.create(
            business=business,
            user=request.user,
            product_id=extracted_data.get('product_id'),  # This may need adjustment
            customer_id=extracted_data.get('customer_id'),  # This may need adjustment
            quantity=sum(item.get('quantity', 1) for item in items),
            amount=extracted_data.get('total_amount', 0),
            payment_method='receipt_scan',
            date=timezone.now().date(),
            reference=f'RECEIPT_{receipt_upload.image_id}'
        )

        # Update receipt status
        receipt_upload.status = 'confirmed'
        receipt_upload.save()

        return Response({
            'status': 'confirmed',
            'transaction_id': str(transaction.id),
            'message': 'Transaction created from receipt'
        }, status=HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_receipt(request, image_id):
    """
    Reject receipt OCR processing
    POST /data/receipts/{image_id}/reject/
    """
    try:
        # Verify user owns this business
        business = _get_business(request.user)
        receipt_upload = ReceiptUploadRecord.objects.get(image_id=image_id, business=business)
    except ReceiptUploadRecord.DoesNotExist:
        return Response(
            {'error': 'Receipt not found'},
            status=HTTP_404_NOT_FOUND
        )

    # Update receipt status
    receipt_upload.status = 'rejected'
    receipt_upload.save()

    return Response({
        'status': 'rejected',
        'message': 'Receipt rejected'
    })


# ============================================================================
# INVENTORY MANAGEMENT ENDPOINTS
# ============================================================================


def _process_inventory_upload(record_id):
    """Background task to process inventory CSV file"""
    try:
        inventory_upload = InventoryUploadRecord.objects.get(record_id=record_id)
        service = InventoryUploadService(inventory_upload)
        result = service.process_csv()
        return result
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_inventory_csv(request):
    """
    Upload inventory/stock CSV file
    POST /api/inventory/upload-stock/

    Expected CSV columns: Product, Quantity, Unit Price (optional), SKU (optional)
    """
    business = _get_business(request.user)
    if not business:
        return Response(
            {'error_code': 'NO_BUSINESS', 'message': 'User has no associated business'},
            status=HTTP_400_BAD_REQUEST
        )

    # Get file
    file_obj = request.FILES.get('file')

    # Validate file
    is_valid, message = _validate_csv_file(file_obj)
    if not is_valid:
        return Response(
            {'error_code': 'INVALID_FILE_FORMAT', 'message': message},
            status=HTTP_400_BAD_REQUEST
        )

    # Save file
    file_path = _save_uploaded_file(file_obj, business.id)

    # Create InventoryUploadRecord
    inventory_upload = InventoryUploadRecord.objects.create(
        business=business,
        user=request.user,
        file_path=file_path,
        original_filename=file_obj.name,
        file_size=file_obj.size,
        status='pending'
    )

    # Spawn background thread to process file
    _executor.submit(_process_inventory_upload, inventory_upload.record_id)

    return Response(
        {
            'status': 'pending',
            'data': {
                'message': 'Processing inventory file...',
                'record_id': str(inventory_upload.record_id),
                'file_name': file_obj.name,
            }
        },
        status=HTTP_202_ACCEPTED
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_inventory_upload_status(request, record_id):
    """
    Get inventory upload status
    GET /api/inventory/upload-stock/{record_id}/
    """
    try:
        business = _get_business(request.user)
        inventory_upload = InventoryUploadRecord.objects.get(record_id=record_id, business=business)
    except InventoryUploadRecord.DoesNotExist:
        return Response(
            {'error': 'Upload record not found'},
            status=HTTP_404_NOT_FOUND
        )

    serializer = InventoryUploadStatusSerializer(inventory_upload)
    data = serializer.data

    if inventory_upload.status == 'completed':
        data['errors'] = inventory_upload.processing_errors

    return Response(data)


class ProductListViewSet(ModelViewSet):
    """ViewSet for listing and managing products with inventory"""
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        """Get products for authenticated user's business"""
        business = _get_business(self.request.user)
        return Product.objects.filter(business=business).order_by('-current_stock')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_sale(request):
    """
    Record a sale transaction and decrease product stock
    POST /api/inventory/transactions/

    Request body:
    {
        "product_id": "uuid",
        "customer_id": "uuid" | null,
        "customer_name": "optional name",
        "quantity": 5,
        "unit_price": 100.00,
        "payment_method": "cash",
        "notes": "optional notes",
        "date": "YYYY-MM-DD",
        "time": "HH:MM"
    }
    """
    business = _get_business(request.user)
    if not business:
        return Response(
            {'error': 'No business found'},
            status=HTTP_400_BAD_REQUEST
        )

    product_id = request.data.get('product_id')
    if not product_id:
        return Response({'error': 'product_id is required'}, status=HTTP_400_BAD_REQUEST)

    customer_id = request.data.get('customer_id')
    customer_name = request.data.get('customer_name')
    quantity_raw = request.data.get('quantity', 0)
    unit_price = request.data.get('unit_price')
    payment_method = request.data.get('payment_method', 'cash')
    notes = request.data.get('notes')
    date_str = request.data.get('date')
    time_str = request.data.get('time')

    try:
        quantity = int(quantity_raw)
    except (TypeError, ValueError):
        return Response({'error': 'Quantity must be an integer greater than 0'}, status=HTTP_400_BAD_REQUEST)

    sale_date = None
    if date_str:
        try:
            sale_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=HTTP_400_BAD_REQUEST)

    sale_time = None
    if time_str:
        try:
            time_format = '%H:%M:%S' if len(time_str.split(':')) == 3 else '%H:%M'
            sale_time = datetime.strptime(time_str, time_format).time()
        except ValueError:
            return Response({'error': 'Invalid time format. Use HH:MM or HH:MM:SS.'}, status=HTTP_400_BAD_REQUEST)

    service = SaleRecorderService(business, request.user)

    try:
        result = service.record_sale(
            product_id=product_id,
            customer_id=customer_id,
            customer_name=customer_name,
            quantity=quantity,
            unit_price=unit_price,
            payment_method=payment_method,
            notes=notes,
            date=sale_date,
            time=sale_time
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=HTTP_400_BAD_REQUEST)
    except Exception as exc:  # pragma: no cover - safeguard
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error recording sale: {exc}")
        return Response({'error': 'Failed to record sale'}, status=HTTP_400_BAD_REQUEST)

    if not result.get('success'):
        return Response(result, status=HTTP_400_BAD_REQUEST)

    transaction = result.get('transaction')
    serializer = TransactionSerializer(transaction, context={'request': request})

    response_payload = {
        'transaction': serializer.data,
        'movement_id': result.get('movement_id'),
        'new_stock': result.get('new_stock'),
        'amount': str(result.get('amount')) if result.get('amount') is not None else None
    }

    return Response(response_payload, status=HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adjust_inventory(request):
    """Manually adjust product inventory levels"""
    business = _get_business(request.user)
    if not business:
        return Response({'error': 'No business found'}, status=HTTP_400_BAD_REQUEST)

    product_id = request.data.get('product_id')
    adjustment_type = request.data.get('adjustment_type', 'decrease')
    notes = request.data.get('notes', '')

    try:
        quantity = int(request.data.get('quantity', 0))
    except (TypeError, ValueError):
        return Response({'error': 'Invalid quantity'}, status=HTTP_400_BAD_REQUEST)

    if not product_id:
        return Response({'error': 'product_id is required'}, status=HTTP_400_BAD_REQUEST)
    if quantity <= 0:
        return Response({'error': 'Quantity must be greater than 0'}, status=HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(product_id=product_id, business=business)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=HTTP_404_NOT_FOUND)

    if adjustment_type not in ['increase', 'decrease']:
        return Response({'error': 'adjustment_type must be "increase" or "decrease"'}, status=HTTP_400_BAD_REQUEST)

    with db_transaction.atomic():
        old_stock = product.current_stock

        if adjustment_type == 'decrease':
            if quantity > product.current_stock:
                return Response(
                    {'error': f'Insufficient stock. Available: {product.current_stock}'},
                    status=HTTP_400_BAD_REQUEST
                )
            product.current_stock -= quantity
            movement_type = 'adjustment'
            quantity_changed = -quantity
        else:
            product.current_stock += quantity
            movement_type = 'restock'
            quantity_changed = quantity

        product.save()

        StockMovement.objects.create(
            business=business,
            product=product,
            movement_type=movement_type,
            quantity_changed=quantity_changed,
            stock_before=old_stock,
            stock_after=product.current_stock,
            reference_type='manual_adjustment',
            reference_id=str(uuid.uuid4()),
            notes=notes or None,
            created_by=request.user
        )

        # Update stock alerts based on new stock level
        _update_stock_alerts_for_product(product, business, request.user)

    return Response({
        'success': True,
        'new_stock': product.current_stock,
        'movement_type': movement_type
    }, status=HTTP_200_OK)


class StockMovementViewSet(ModelViewSet):
    """ViewSet for viewing stock movements"""
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']
    pagination_class = TransactionPagination

    def get_queryset(self):
        """Get stock movements for authenticated user's business"""
        business = _get_business(self.request.user)
        queryset = StockMovement.objects.filter(business=business).select_related('product', 'created_by')

        # Apply filters
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        movement_type = self.request.query_params.get('movement_type')
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                pass

        return queryset.order_by('-created_at')


class StockAlertViewSet(ModelViewSet):
    """ViewSet for managing stock alerts"""
    serializer_class = StockAlertSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """Get stock alerts for authenticated user's business"""
        business = _get_business(self.request.user)
        queryset = StockAlert.objects.filter(business=business).select_related('product', 'acknowledged_by')

        # Filter unacknowledged alerts by default
        is_acknowledged = self.request.query_params.get('is_acknowledged')
        if is_acknowledged is not None:
            queryset = queryset.filter(is_acknowledged=is_acknowledged.lower() == 'true')
        else:
            queryset = queryset.filter(is_acknowledged=False)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a stock alert"""
        business = _get_business(request.user)
        try:
            alert = StockAlert.objects.get(alert_id=pk, business=business)
            alert.is_acknowledged = True
            alert.acknowledged_at = timezone.now()
            alert.acknowledged_by = request.user
            alert.save()
            return Response({
                'status': 'acknowledged',
                'message': 'Alert acknowledged',
                'alert_id': str(alert.alert_id)
            })
        except StockAlert.DoesNotExist:
            return Response(
                {'error': 'Alert not found'},
                status=HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_inventory_report(request):
    """
    Get comprehensive inventory report
    GET /api/inventory/report/
    """
    business = _get_business(request.user)
    if not business:
        return Response(
            {'error': 'No business found'},
            status=HTTP_400_BAD_REQUEST
        )

    service = InventoryReportService(business)
    report = service.get_inventory_report()

    return Response(report)
