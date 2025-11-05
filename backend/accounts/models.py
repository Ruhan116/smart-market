from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # use email as unique identifier
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True, unique=True)
    first_name = models.CharField(max_length=150)
    # link to business via OneToOne created when registering
    # keep default Django fields for password

class Business(models.Model):
    name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=100)
    owner = models.OneToOneField('User', on_delete=models.CASCADE, related_name='business')
    data_sources = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.business_type})"
