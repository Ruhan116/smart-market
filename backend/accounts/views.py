from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import authenticate, get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, BusinessSerializer

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        print(f"[RegisterView] Received data: {request.data}")
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[RegisterView] Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        result = serializer.save()
        user = result['user']
        business = result['business']
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name, 'business_id': business.id},
            'business': BusinessSerializer(business).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': int(refresh.access_token.lifetime.total_seconds())
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        business = getattr(user, 'business', None)
        return Response({
            'user': {'id': user.id, 'email': user.email, 'first_name': user.first_name, 'business_id': business.id if business else None},
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'expires_in': int(refresh.access_token.lifetime.total_seconds())
        })


class BusinessProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        business = getattr(request.user, 'business', None)
        if not business:
            return Response({'detail': 'Business not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(BusinessSerializer(business).data)
