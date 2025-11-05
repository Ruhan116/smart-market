from django.urls import path
from .views import RegisterView, LoginView, TokenRefreshView, BusinessProfileView

urlpatterns = [
    path('auth/register', RegisterView.as_view()),
    path('auth/login', LoginView.as_view()),
    path('auth/token/refresh', TokenRefreshView.as_view()),
    path('business/profile', BusinessProfileView.as_view()),
]

