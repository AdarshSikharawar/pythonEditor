from django.shortcuts import render, redirect
from .models import *
from django.contrib import messages
import google.generativeai as genai
genai.configure(api_key="AIzaSyDCZkxZO6CVxyjH-kHNFNkICPx4POuSXN0")
from django.core.files.storage import default_storage
from django.http import HttpResponse, JsonResponse

# Create your views here.

def index (request):
    return render (request, 'index.html')

def signup(request):
    if request.method == "POST":
        name = request.POST.get['name']
        email = request.POST.get['email']
        number = request.POST.get['number']
        password = request.POST.get['password']
        user = Ouruser.objects.create(name=name , email = email , number = number , password = password)
        user.save()
        messages.success(request, "You are registered successfully!")
        return render(request, 'login.html')
        
    return render (request, 'signup.html') 

def login(request):
    if request.method == "POST":
        email = request.POST.get('email', '')
        password = request.POST.get('password', '')

        if (email == "" or password == ""):
            
            return render (request, 'login.html')
        
        else:
            user = Ouruser.objects.get(email = email)
            if (user.email == email and user.password == password):
                return redirect('gemini_chat')
            
    
    return render (request, 'login.html')









def gemini_chat(request):
    # This part handles the form submission via JavaScript (AJAX)
    if request.method == "POST":
        try:
            user_input = request.POST.get("message", "").strip()
            image_file = request.FILES.get("image")

            if not user_input and not image_file:
                return JsonResponse({'error': 'No input provided.'}, status=400)
            
            model = genai.GenerativeModel("gemini-1.5-flash-latest") # Using the correct model name
            
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