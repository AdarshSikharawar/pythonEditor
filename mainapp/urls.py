from django.urls import path
from . import views

urlpatterns = [
    path('',views.index,name="index"),
    path('auth/', views.auth_view, name="auth"),
    path('ai/', views.gemini_chat, name="gemini_chat")
    
]
