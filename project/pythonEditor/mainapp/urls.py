from django.urls import path
from . import views
from django.views.generic import RedirectView

urlpatterns = [
    path('', views.index, name='index'),
    path('auth/', views.auth_view, name='auth'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('logout/', views.logout_view, name='logout'),
    
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),

    # URL for the editor page
    
    path('api/chat/', views.chat_api, name="chat_api"),
    path('profile/', views.profilepage, name="profile"),
    path('profile/update/', views.update_profile, name='update_profile'),
    
    # API URLs
    path('api/save_code/', views.save_code_api, name='save_code_api'),
    path('api/load_code/', views.load_code_api, name='load_code_api'),
    path('api/update_theme/', views.update_theme, name='update_theme'),
    path('api/delete_file/', views.delete_file_api, name='delete_file_api'),
   
    path("save-file-info/", views.save_file_info, name="save_file_info"),

    path('download/<int:file_id>/', views.download_file, name='download_file'),
    path('delete/<int:file_id>/', views.delete_file, name='delete_file'),

    # Friend System and Messaging APIs
    path('api/friends/request/send/', views.send_friend_request, name='send_friend_request'),
    path('api/friends/request/list/', views.list_friend_requests, name='list_friend_requests'),
    path('api/friends/request/respond/', views.respond_friend_request, name='respond_friend_request'),
    path('api/friends/list/', views.list_friends, name='list_friends'),
    path('api/messages/history/<int:friend_id>/', views.get_messages, name='get_messages'),
    path('api/messages/send/', views.send_message, name='send_message'),
    path('api/messages/save_file/', views.save_received_file, name='save_received_file'),
]
    
