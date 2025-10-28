from django.shortcuts import render, redirect
from .models import OurUser
from django.contrib import messages
import google.generativeai as genai
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
import os
from django.conf import settings
import json
from django.views.decorators.csrf import csrf_exempt

# ⚠️ SECURITY WARNING: API Key ko code mein direct na likhein.
# Ise environment variables se load karein.
# Example: genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
genai.configure(api_key="YOUR_API_KEY_HERE")

def index(request):
    return render(request, 'index.html')

def auth_view(request):
    if request.method == "POST":
        form_type = request.POST.get("form_type")

        if form_type == "signup":
            name = request.POST.get('name')
            email = request.POST.get('email')
            password = request.POST.get('password')
            
            if OurUser.objects.filter(email=email).exists():
                messages.error(request, "Email already registered")
            else:
                OurUser.objects.create_user(email=email, password=password, name=name)
                messages.success(request, "You are registered successfully!")
            
            return redirect("auth")
        
        elif form_type == "login":
            email = request.POST.get('email')
            password = request.POST.get('password')

            user = authenticate(request, email=email, password=password)

            if user is not None:
                login(request, user)
                return redirect("gemini_chat")
            else:
                messages.error(request, "Invalid email or password")
            
            return redirect("auth")
            
    return render(request, 'authentication.html')

def logout_view(request):
    logout(request)
    messages.success(request, "logged out successfully.")
    return redirect('auth')

@login_required
def gemini_chat(request):
    return render(request, "editor.html")


def get_user_code_dir(user):
    """Helper function to get the unique directory for a user."""
    user_dir = os.path.join(settings.MEDIA_ROOT, 'user_files', str(user.id))
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

@csrf_exempt
@login_required
def save_code_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            filename = data.get('filename')
            content = data.get('content')

            if not filename or content is None:
                return JsonResponse({'status': 'error', 'message': 'Missing filename or content.'}, status=400)
            
            if '..' in filename or '/' in filename or '\\' in filename:
                return JsonResponse({'status': 'error', 'message': 'Invalid filename.'}, status=400)

            user_dir = get_user_code_dir(request.user)
            file_path = os.path.join(user_dir, filename)

            with open(file_path, 'w') as f:
                f.write(content)
            
            return JsonResponse({'status': 'success', 'message': f'File {filename} saved.'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method.'}, status=405)



@login_required
def load_code_api(request):
    filename = request.GET.get('filename')
    user_dir = get_user_code_dir(request.user)
    
    if not filename:
        try:
            files = [f for f in os.listdir(user_dir) if os.path.isfile(os.path.join(user_dir, f))]
            return JsonResponse({'files': files})
        except Exception as e:
            return JsonResponse({'files': [], 'message': str(e)})

    file_path = os.path.join(user_dir, filename)
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        return JsonResponse({'content': content})
    except FileNotFoundError:
        return JsonResponse({'content': None, 'message': 'File not found.'})
    except Exception as e:
        return JsonResponse({'content': None, 'message': str(e)}, status=500)


@csrf_exempt
@login_required
def delete_file_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            filename = data.get('filename')

            if not filename or filename == 'main.py':
                return JsonResponse({'status': 'error', 'message': 'Invalid or protected file.'}, status=400)

            user_dir = get_user_code_dir(request.user)
            file_path = os.path.join(user_dir, filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                return JsonResponse({'status': 'success', 'message': f'File {filename} deleted.'})
            else:
                return JsonResponse({'status': 'error', 'message': 'File not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'Invalid request method.'}, status=405)