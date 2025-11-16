# mainapp/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings

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
    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    # --- YEH LINE AAPKE PURANE CODE MEIN MISSING THI ---
    objects = CustomUserManager()
    # ----------------------------------------------------

    def __str__(self):
        return self.email
    

class UserFile(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.FloatField(default=0.0)  # size in KB
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} ({self.user.email})"

    def size_in_kb(self):
        return round(self.file_size, 2)