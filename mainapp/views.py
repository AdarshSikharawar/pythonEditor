from django.shortcuts import render, redirect
from .models import OurUser
from django.http import JsonResponse, FileResponse, Http404 ,HttpResponseNotFound
from django.contrib import messages
import google.generativeai as genai
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
import os
from django.conf import settings
import json
from django.views.decorators.csrf import csrf_exempt
from .models import UserFile


genai.configure(api_key="YOUR_API_KEY_HERE")

def index(request):
    return render(request, 'index.html')



def index (request):
    return render (request, 'index.html')


def auth_view(request):
    # form_to_show = request.GET.get('form', 'login')
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
    user = request.user
    files = request.user.files
    return render(request, "editor.html", {'user_data': user , 'user_files': files})


def get_user_code_dir(user):
    return os.path.join(settings.MEDIA_ROOT, 'user_files', user.email)

@csrf_exempt
@login_required
def save_code_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        filename = data.get("filename")
        content = data.get("content")

        user_folder = os.path.join(settings.MEDIA_ROOT, f"user_{request.user.id}")
        os.makedirs(user_folder, exist_ok=True)

        file_path = os.path.join(user_folder, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        file_size = os.path.getsize(file_path) / 1024  # KB

        # Save or update in DB
        file_record, created = UserFile.objects.update_or_create(
            user=request.user,
            file_name=filename,
            defaults={
                'file_path': file_path,
                'file_size': file_size
            }
        )

        return JsonResponse({"status": "success", "message": "File saved"})
    return JsonResponse({"status": "error", "message": "Invalid request"})

@csrf_exempt
def save_file_info(request):
    if request.method == "POST":
        data = json.loads(request.body)
        file_name = data.get("file_name")
        file_size = data.get("file_size", 0)

        if request.user.is_authenticated:
            UserFile.objects.create(
                user=request.user,
                file_name=file_name,
                file_size=file_size
            )
            return JsonResponse({"status": "success"})
        else:
            return JsonResponse({"status": "error", "message": "User not logged in"}, status=401)

def get_file_content(request, filename):
    user_dir = get_user_code_dir(request.user)
    file_path = os.path.join(user_dir, filename)
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return JsonResponse({'content': content})
    else:
        return HttpResponseNotFound('File not found')

@csrf_exempt
def delete_file(request, filename):
    user_dir = get_user_code_dir(request.user)
    file_path = os.path.join(user_dir, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return JsonResponse({'status': 'success'})
    else:
        return HttpResponseNotFound('File not found')

def download_file(request, filename):
    import os
    user_dir = os.path.join(settings.MEDIA_ROOT, f"user_{request.user.id}")
    file_path = os.path.join(user_dir, filename)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, "rb"), as_attachment=True, filename=filename)
    else:
        raise Http404("File not found")


@csrf_exempt
def update_file(request):
    import json, os
    data = json.loads(request.body)
    filename = data.get("file_name")
    content = data.get("content")
    file_size = data.get("file_size")

    user_dir = os.path.join(settings.MEDIA_ROOT, f"user_{request.user.id}")
    file_path = os.path.join(user_dir, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    # update DB record
    UserFile.objects.filter(user=request.user, file_name=filename).update(file_size=file_size)
    return JsonResponse({"status": "success"})

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







def gemini_chat(request):
    # This part handles the form submission via JavaScript (AJAX)
    if request.method == "POST":
        try:
            user_input = request.POST.get("message", "").strip()
            image_file = request.FILES.get("image")

            if not user_input and not image_file:
                return JsonResponse({'error': 'No input provided.'}, status=400)
            
            model = genai.GenerativeModel("gemini-1.5-flash-latest") 
            
            content_to_send = []
            if user_input:
                content_to_send.append(user_input)
            if image_file:
                content_to_send.append({
                    "mime_type": image_file.content_type,
                    "data": image_file.read()
                })

            response = model.generate_content(content_to_send)
            
            # Return the response as JSON
            return JsonResponse({
                'question': user_input,
                'reply': response.text
            })

        except Exception as e:
            print(f"API Error: {e}")
            return JsonResponse({'error': 'An error occurred with the AI model.'}, status=500)

    # This part loads the initial page with the chat popup
    context = {}
    return render(request, "editor.html", context)



@login_required
def profilepage(request):
    files = UserFile.objects.filter(user=request.user)
    return render(request, 'profile.html', {'files': files})

