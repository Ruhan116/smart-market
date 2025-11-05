from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate, get_user_model
from .serializers import RegisterSerializer, LoginSerializer, BusinessProfileSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Business

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({ 'access_token': str(refresh.access_token), 'refresh_token': str(refresh), 'expires_in': int(refresh.access_token.lifetime.total_seconds()) }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response({ 'access_token': str(refresh.access_token), 'refresh_token': str(refresh), 'expires_in': int(refresh.access_token.lifetime.total_seconds()) })

class TokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('refresh_token')
        if not token:
            return Response({'error': 'refresh_token required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            refresh = RefreshToken(token)
            access = str(refresh.access_token)
            return Response({'access_token': access, 'expires_in': int(refresh.access_token.lifetime.total_seconds())})
        except Exception as e:
            return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

class BusinessProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            business = Business.objects.get(owner=request.user)
        except Business.DoesNotExist:
            return Response({'error': 'Business not found'}, status=status.HTTP_404_NOT_FOUND)
        # For MVP, stats are simple counts (products/customers/transactions stored elsewhere). Return zeros
        serializer = BusinessProfileSerializer(business)
        stats = {
            'product_count': 0,
            'customer_count': 0,
            'transaction_count': 0,
            'total_revenue': 0,
            'last_transaction_date': None
        }
        return Response({'business': serializer.data, 'stats': stats})

