from django.urls import path
from . import views

urlpatterns = [
    path('upload-csv', views.upload_csv, name='upload_csv'),
    path('upload-csv/<uuid:file_id>', views.get_upload_status, name='get_upload_status'),
]
