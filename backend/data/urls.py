from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register the TransactionViewSet
router = DefaultRouter()
router.register(r'transactions', views.TransactionViewSet, basename='transaction')

urlpatterns = [
    # CSV upload endpoints
    path('upload-csv', views.upload_csv, name='upload_csv'),
    path('upload-csv/<uuid:file_id>', views.get_upload_status, name='get_upload_status'),

    # Receipt upload endpoints
    path('upload-receipt', views.upload_receipt, name='upload_receipt'),
    path('upload-receipt/<uuid:image_id>', views.get_receipt_status, name='get_receipt_status'),

    # Admin endpoints
    path('admin/failed-jobs', views.list_failed_jobs, name='list_failed_jobs'),
    path('admin/failed-jobs/<uuid:job_id>/retry', views.retry_failed_job, name='retry_failed_job'),
    path('admin/upload-status', views.upload_status_monitoring, name='upload_status_monitoring'),

    # Transaction ViewSet routes
    path('', include(router.urls)),
]
