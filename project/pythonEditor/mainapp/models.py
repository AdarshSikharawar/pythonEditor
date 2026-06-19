# mainapp/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings
from django.utils import timezone
import datetime

# --- YEH MANAGER ADD KARNA ZAROORI THA ---
class CustomUserManager(BaseUserManager):
    """
    Custom user model manager jahan email unique identifier hai
    authentication ke liye username ke bajaye.
    """
    def create_user(self, email, password,  **extra_fields):
        """
        Ek User banayein aur save karein diye gaye email aur password ke saath.
        """
        if not email:
            raise ValueError('The Email must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password) # Password ko hash karne ke liye set_password ka istemal karein
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        Ek Superuser banayein aur save karein.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)
# -----------------------------------------------

class OurUser(AbstractUser):
    DoesNotExist = models.ObjectDoesNotExist

    username = None  # type: ignore
    email: str = models.EmailField(unique=True)  # type: ignore
    name: str = models.CharField(max_length=100)  # type: ignore

    profile_photo = models.ImageField(
        upload_to='profile_photos/', 
        default='profile_photos/default.png', 
        blank=True, 
        null=True
    )

    editor_theme: str = models.CharField(max_length=50, default='vs-dark')  # type: ignore

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    # --- YEH LINE AAPKE PURANE CODE MEIN MISSING THI ---
    objects = CustomUserManager()
    # ----------------------------------------------------

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        try:
            old_user = OurUser.objects.get(pk=self.pk)
            old_photo = old_user.profile_photo

            # Purani photo thi, nayi alag hai, aur default nahi hai
            if (old_photo and 
                old_photo.name != self.profile_photo.name and 
                old_photo.name != 'profile_photos/default.png'):
                
                old_photo.delete(save=False)  # Supabase bucket se delete

        except OurUser.DoesNotExist:
            pass  # Naya user, kuch nahi karna

        super().save(*args, **kwargs)    
    

class UserFile(models.Model):
    DoesNotExist = models.ObjectDoesNotExist
    objects = models.Manager()

    user: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)  # type: ignore
    file_name: str = models.CharField(max_length=255)  # type: ignore
    file_path: str = models.CharField(max_length=500)  # type: ignore
    file_size: float = models.FloatField(default=0.0)  # size in KB  # type: ignore
    created_at: datetime.datetime = models.DateTimeField(auto_now_add=True)  # type: ignore
    #uploaded_file = models.FileField(upload_to='user_files/')

    def __str__(self):
        return f"{self.file_name} ({self.user.email})"

    def size_in_kb(self):
        return round(self.file_size, 2)


class OTPVerification(models.Model):
    DoesNotExist = models.ObjectDoesNotExist
    objects = models.Manager()

    email: str = models.EmailField()  # type: ignore
    otp: str = models.CharField(max_length=6)  # type: ignore
    purpose: str = models.CharField(max_length=20, choices=[('login', 'Login'), ('signup', 'Signup')])  # type: ignore
    created_at: datetime.datetime = models.DateTimeField(auto_now_add=True)  # type: ignore
    
    # Store temporary user data during signup
    temp_data: dict | None = models.JSONField(null=True, blank=True)  # type: ignore

    def is_valid(self):
        # OTP is valid for 10 minutes
        return (timezone.now() - self.created_at).total_seconds() < 600

    def __str__(self):
        return f"{self.email} - {self.otp} ({self.purpose})"

class FriendRequest(models.Model):
    DoesNotExist = models.ObjectDoesNotExist
    objects = models.Manager()

    from_user: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_requests', on_delete=models.CASCADE)  # type: ignore
    to_user: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_requests', on_delete=models.CASCADE)  # type: ignore
    status: str = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], default='pending')  # type: ignore
    created_at: datetime.datetime = models.DateTimeField(auto_now_add=True)  # type: ignore

    def __str__(self):
        return f"From {self.from_user.email} to {self.to_user.email} ({self.status})"

class Friendship(models.Model):
    DoesNotExist = models.ObjectDoesNotExist
    objects = models.Manager()

    user1: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friendships1', on_delete=models.CASCADE)  # type: ignore
    user2: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friendships2', on_delete=models.CASCADE)  # type: ignore
    created_at: datetime.datetime = models.DateTimeField(auto_now_add=True)  # type: ignore

    def __str__(self):
        return f"{self.user1.email} & {self.user2.email}"

class Message(models.Model):
    DoesNotExist = models.ObjectDoesNotExist
    objects = models.Manager()

    sender: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_messages', on_delete=models.CASCADE)  # type: ignore
    receiver: OurUser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_messages', on_delete=models.CASCADE)  # type: ignore
    content: str | None = models.TextField(blank=True, null=True) # Text message  # type: ignore
    is_file: bool = models.BooleanField(default=False)  # type: ignore
    file_name: str | None = models.CharField(max_length=255, blank=True, null=True)  # type: ignore
    file_content: str | None = models.TextField(blank=True, null=True) # Full code snippet  # type: ignore
    timestamp: datetime.datetime = models.DateTimeField(auto_now_add=True)  # type: ignore

    def __str__(self):
        return f"From {self.sender.email} to {self.receiver.email} at {self.timestamp}"
