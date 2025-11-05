from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Business

User = get_user_model()

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField()
    business_name = serializers.CharField()
    business_type = serializers.CharField()
    language = serializers.CharField(required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already exists')
        return value

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        first_name = validated_data['first_name']
        business_name = validated_data['business_name']
        business_type = validated_data['business_type']
        user = User.objects.create_user(username=email, email=email, password=password, first_name=first_name)
        business = Business.objects.create(name=business_name, business_type=business_type, owner=user)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'business_type', 'data_sources', 'created_at']

class BusinessProfileResponseSerializer(serializers.Serializer):
    business = BusinessProfileSerializer()
    stats = serializers.DictField()

