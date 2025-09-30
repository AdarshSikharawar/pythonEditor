from django.db import models

# Create your models here.

class Ouruser(models.Model):
    uid= models.AutoField(primary_key=True)
    name= models.CharField(max_length=30)
    email= models.EmailField(max_length=50,unique=True)
    password= models.CharField(max_length=30)
