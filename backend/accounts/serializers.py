from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Business
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    business_name = serializers.CharField(required=True)
    business_type = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', '')
        )
        business = Business.objects.create(owner=user, name=validated_data['business_name'], type=validated_data.get('business_type',''))
        return {'user': user, 'business': business}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'type', 'created_at']
