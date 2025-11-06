import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_202_ACCEPTED, HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND, HTTP_429_TOO_MANY_REQUESTS, HTTP_201_CREATED
)
from rest_framework.permissions import IsAuthenticated
from .models import FileUploadRecord, Transaction
from .serializers import FileUploadStatusSerializer, TransactionSerializer
from .services import CSVParserService

# Thread pool executor for background processing
# Max 5 concurrent uploads as per requirements
_executor = ThreadPoolExecutor(max_workers=5)


def _get_business(user):
    """Helper to get user's business"""
    return user.business


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
        file_obj.seek(0)
        import csv
        reader = csv.DictReader(file_obj)
        row_count = 0
        for row in reader:
            row_count += 1
            if row_count >= 10:
                break
        file_obj.seek(0)
        if row_count == 0:
            return False, "CSV file appears to be empty"
    except Exception as e:
        return False, f"Invalid CSV format: {str(e)}"

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
    try:
        business = _get_business(request.user)
    except AttributeError:
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
