from django.urls import path
from . import views
from django.views.generic import RedirectView

urlpatterns = [
    path('', views.index, name="index"),
    path('auth/', views.auth_view, name="auth"),
    path('logout/', views.logout_view, name='logout'),

    # URL for the editor page
    path('editor/', views.gemini_chat, name="gemini_chat"),
    path('profile',views.profilepage, name="profile"),
    
    # API URLs
    path('api/save_code/', views.save_code_api, name='save_code_api'),
    path('api/load_code/', views.load_code_api, name='load_code_api'),
   
    path("save-file-info/", views.save_file_info, name="save_file_info"),

    path('download/<int:file_id>/', views.download_file, name='download_file'),
    path('delete/<int:file_id>/', views.delete_file, name='delete_file'),

    
    
]
    
