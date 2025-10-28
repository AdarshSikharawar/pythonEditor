from django.urls import path
from . import views
from django.views.generic import RedirectView

urlpatterns = [
    path('', views.index, name="index"),
    path('auth/', views.auth_view, name="auth"),
    path('logout/', views.logout_view, name='logout'),

    # URL for the editor page
    path('editor/', views.gemini_chat, name="gemini_chat"),
    
    # API URLs
    path('api/save_code/', views.save_code_api, name='save_code_api'),
    path('api/load_code/', views.load_code_api, name='load_code_api'),
    path('api/delete_file/', views.delete_file_api, name='delete_file_api'),
    
]