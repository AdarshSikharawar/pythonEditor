from django.shortcuts import render, redirect , get_object_or_404
from .models import OurUser, OTPVerification
from django.http import JsonResponse, FileResponse, Http404 ,HttpResponseNotFound
from django.contrib import messages
import google.generativeai as genai
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
import os
from django.conf import settings
import json
from django.views.decorators.csrf import csrf_exempt
from .models import UserFile
import mimetypes
import random
from django.core.mail import send_mail
from django.utils import timezone
import threading


genai.configure(api_key="YOUR_API_KEY_HERE")

def index(request):
    return render(request, 'index.html')



def send_otp_email(email, otp, purpose):
    if purpose == 'password_reset':
        subject = 'PyGenix Password Reset OTP'
        message = f'Hi there,\n\nYour One-Time Password for resetting your password is: {otp}\n\nThis OTP is valid for 10 minutes. If you did not request this, please ignore this email.'
    else:
        subject = f"Your {purpose.capitalize()} OTP - PyGenix Editor"
        message = f"Your One-Time Password (OTP) for {purpose} is: {otp}\n\nThis OTP is valid for 10 minutes.\nDo not share this with anyone."
    from_email = settings.EMAIL_HOST_USER if hasattr(settings, 'EMAIL_HOST_USER') else 'noreply@pygenix.com'
    print(f"[OTP DEBUG] Generated OTP for {email} ({purpose}): {otp}")
    try:
        send_mail(subject, message, from_email, [email], fail_silently=False)
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def auth_view(request):
    if request.method == "POST":
        form_type = request.POST.get("form_type")

        if form_type == "signup":
            name = request.POST.get('name')
            email = request.POST.get('email')
            password = request.POST.get('password')
            confirm_password = request.POST.get('confirm-password')
            
            if password != confirm_password:
                messages.error(request, "Passwords do not match")
            elif OurUser.objects.filter(email=email).exists():
                messages.error(request, "Email already registered")
            else:
                # Generate OTP and store temporary signup data
                otp = str(random.randint(100000, 999999))
                OTPVerification.objects.filter(email=email, purpose='signup').delete()
                OTPVerification.objects.create(
                    email=email, 
                    otp=otp, 
                    purpose='signup',
                    temp_data={'name': name, 'password': password}
                )
                
                # Send email
                send_otp_email(email, otp, 'signup')
                
                request.session['verify_email'] = email
                request.session['verify_purpose'] = 'signup'
                messages.info(request, f"Please check your email ({email}) for an OTP to complete registration.")
                return redirect("verify_otp")
            
            return redirect("auth")
        
        elif form_type == "login":
            email = request.POST.get('email')
            password = request.POST.get('password')

            user = authenticate(request, email=email, password=password)

            if user is not None:
                # User authenticated, generate OTP instead of logging in
                otp = str(random.randint(100000, 999999))
                OTPVerification.objects.filter(email=email, purpose='login').delete()
                OTPVerification.objects.create(
                    email=email, 
                    otp=otp, 
                    purpose='login'
                )
                
                # Send email
                send_otp_email(email, otp, 'login')
                
                request.session['verify_email'] = email
                request.session['verify_purpose'] = 'login'
                messages.info(request, f"Please check your email ({email}) for an OTP to login.")
                return redirect("verify_otp")
            else:
                messages.error(request, "Invalid email or password")
            
            return redirect("auth")
            
    return render(request, 'authentication.html')

def forgot_password(request):
    if request.method == "POST":
        email = request.POST.get('email')
        
        # Check if user exists
        if not OurUser.objects.filter(email=email).exists():
            messages.error(request, "This email is not registered with PyGenix.")
            return redirect("forgot_password")
            
        # OTP generate karo
        otp = str(random.randint(100000, 999999))
        
        # Purana OTP delete karo
        OTPVerification.objects.filter(email=email, purpose='password_reset').delete()
        
        # Naya OTP save karo
        OTPVerification.objects.create(
            email=email, 
            otp=otp, 
            purpose='password_reset'
        )
        
        # Background thread mein email bhejo - request block nahi hogi
        t = threading.Thread(
            target=send_otp_email,
            args=(email, otp, 'password_reset'),
            daemon=True
        )
        t.start()
        
        # Seedha redirect karo - email background mein jayegi
        request.session['verify_email'] = email
        request.session['verify_purpose'] = 'password_reset'
        messages.info(request, f"OTP is sent on {email}, please check.")
        return redirect("verify_otp")
        
    return render(request, 'forgot_password.html')

def verify_otp(request):
    email = request.session.get('verify_email')
    purpose = request.session.get('verify_purpose')
    
    if not email or not purpose:
        messages.error(request, "No active verification session found. Please try again.")
        return redirect('auth')
        
    if request.method == "POST":
        submitted_otp = request.POST.get('otp')
        
        try:
            # Find the latest valid OTP
            otp_record = OTPVerification.objects.filter(email=email, purpose=purpose).order_by('-created_at').first()
            
            if not otp_record:
                messages.error(request, "No OTP found. Please request a new one.")
            elif not otp_record.is_valid():
                messages.error(request, "OTP has expired. Please request a new one.")
            elif otp_record.otp != submitted_otp:
                messages.error(request, "Invalid OTP. Please try again.")
            else:
                # OTP is valid!
                if purpose == 'signup':
                    temp_data = otp_record.temp_data
                    user = OurUser.objects.create_user(
                        email=email, 
                        password=temp_data['password'], 
                        name=temp_data['name']
                    )
                    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                    messages.success(request, "Account created and verified successfully!")
                    
                elif purpose == 'login':
                    user = OurUser.objects.get(email=email)
                    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                    messages.success(request, "Login verified successfully!")
                    
                elif purpose == 'password_reset':
                    # Allow user to reset their password
                    request.session['can_reset_password'] = True
                    request.session['reset_email'] = email
                    
                    # Clean up OTP and verification session 
                    del request.session['verify_email']
                    del request.session['verify_purpose']
                    OTPVerification.objects.filter(email=email).delete()
                    
                    messages.success(request, "OTP verified. Please enter your new password.")
                    return redirect('reset_password')
                
                # Clean up session and OTP records for login/signup
                if 'verify_email' in request.session:
                    del request.session['verify_email']
                if 'verify_purpose' in request.session:
                    del request.session['verify_purpose']
                OTPVerification.objects.filter(email=email).delete()
                
                return redirect('dashboard')
                
        except Exception as e:
            print(f"Verification error: {e}")
            messages.error(request, "An error occurred during verification.")
            
    return render(request, 'verify_otp.html', {'email': email, 'purpose': purpose})


def reset_password(request):
    # Check if user went through OTP verification for password_reset
    if not request.session.get('can_reset_password'):
        messages.error(request, "Unauthorized access. Please verify your email first.")
        return redirect('forgot_password')
        
    if request.method == "POST":
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm-password')
        email = request.session.get('reset_email')
        
        if password != confirm_password:
            messages.error(request, "Passwords do not match!")
            return redirect('reset_password')
            
        try:
            user = OurUser.objects.get(email=email)
            user.set_password(password)
            user.save()
            
            # Clean up session
            del request.session['can_reset_password']
            del request.session['reset_email']
            
            messages.success(request, "Password reset successfully! You can now log in.")
            return redirect('auth')
            
        except OurUser.DoesNotExist:
            messages.error(request, "An error occurred. User not found.")
            return redirect('forgot_password')
            
    return render(request, 'reset_password.html')


def logout_view(request):
    logout(request)
    messages.success(request, "logged out successfully.")
    return redirect('auth')

def dashboard(request):
    if request.user.is_authenticated:
        user = request.user
        files = UserFile.objects.filter(user=request.user)
        return render(request, "editor.html", {'user_data': user , 'user_files': files, 'is_guest': False})
    else:
        # Guest User Logic
        guest_user = {
            'name': 'Guest',
            'email': 'guest@example.com',
            'profile_photo': {'url': ''}, # Will handle default G in template
            'editor_theme': 'vs-dark' # Default theme, will be overridden by client-side if needed
        }
        # Guest only gets main.py in memory mostly, but passing it for template loop if needed
        return render(request, "editor.html", {
            'user_data': guest_user, 
            'user_files': [], # Empty initially, JS handles default main.py creation for guest
            'is_guest': True
        })


def get_user_code_dir(user):
    media_root = str(settings.MEDIA_ROOT or "")
    user_email = str(user.email or "")
    return os.path.join(media_root, 'user_files', user_email)

@csrf_exempt
@login_required
def save_code_api(request):
    if request.method == "POST":
        data = json.loads(request.body)
        filename = data.get("filename")
        content = data.get("content")

        media_root = str(settings.MEDIA_ROOT or "")
        user_folder = os.path.join(media_root, f"user_{request.user.id}")
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
def update_file(request):
    import json, os
    data = json.loads(request.body)
    filename = data.get("file_name")
    content = data.get("content")
    file_size = data.get("file_size")

    media_root = str(settings.MEDIA_ROOT or "")
    user_dir = os.path.join(media_root, f"user_{request.user.id}")
    file_path = os.path.join(user_dir, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    # update DB record
    UserFile.objects.filter(user=request.user, file_name=filename).update(file_size=file_size)
    return JsonResponse({"status": "success"})

@login_required
def load_code_api(request):
    filename = request.GET.get('filename')
    
    if not filename:
        # Query database for user's files instead of filesystem
        try:
            user_files = UserFile.objects.filter(user=request.user).values_list('file_name', flat=True)
            files = list(user_files)
            return JsonResponse({'files': files})
        except Exception as e:
            return JsonResponse({'files': [], 'message': str(e)})

    # Load file content from filesystem
    try:
        user_file = UserFile.objects.get(user=request.user, file_name=filename)
        file_path = user_file.file_path
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return JsonResponse({'content': content})
        else:
            return JsonResponse({'content': None, 'message': 'File not found on disk.'})
    except UserFile.DoesNotExist:
        return JsonResponse({'content': None, 'message': 'File not found in database.'})
    except Exception as e:
        return JsonResponse({'content': None, 'message': str(e)}, status=500)


@csrf_exempt
@login_required
def delete_file(request, file_id):
    user_file = get_object_or_404(UserFile, id= file_id)
    if user_file.user != request.user:
        return redirect('profile')
    
    if request.method == 'POST':
        user_file.delete()
        messages.success(request, f"File '{user_file.file_name}' deleted successfully.")

    return redirect('profile')


@csrf_exempt
@login_required
def delete_file_api(request):
    """Delete file from editor - accepts filename via POST"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            filename = data.get("filename")
            
            if not filename:
                return JsonResponse({"status": "error", "message": "Filename required"}, status=400)
            
            # Find and delete the file
            user_file = UserFile.objects.get(user=request.user, file_name=filename)
            
            # Delete physical file if it exists
            if os.path.exists(user_file.file_path):
                os.remove(user_file.file_path)
            
            # Delete database record
            user_file.delete()
            
            return JsonResponse({"status": "success", "message": f"File {filename} deleted"})
            
        except UserFile.DoesNotExist:
            return JsonResponse({"status": "error", "message": "File not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)



def download_file(request, file_id):
    user_file = get_object_or_404(UserFile, id=file_id)

    # user verify
    if user_file.user != request.user:
        return redirect('profile')

    file_path = user_file.file_path   # <-- yahi use hoga

    # path exist check
    if not os.path.exists(file_path):
        return redirect('profile')

    # MIME type detect
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'

    # return file response
    response = FileResponse(open(file_path, 'rb'), content_type=mime_type)
    response['Content-Disposition'] = f'attachment; filename="{user_file.file_name}"'

    return response



def chat_api(request):
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

    return JsonResponse({'error': 'Method not allowed'}, status=405)



@login_required
def profilepage(request):
    files = UserFile.objects.filter(user=request.user)
    return render(request, 'profile.html', {'files': files})

@login_required
def update_profile(request):
    if request.method == "POST":
        user = request.user
        name = request.POST.get('name')
        email = request.POST.get('email')
        profile_photo = request.FILES.get('profile_photo')

        if name:
            user.name = name
        if email:
            # Simple check if email is taken by another user
            if OurUser.objects.filter(email=email).exclude(id=user.id).exists():
                messages.error(request, "This email is already in use.")
                return redirect('profile')
            user.email = email
        if profile_photo:
            user.profile_photo = profile_photo
        
        user.save()
        messages.success(request, "Profile updated successfully!")
        return redirect('profile')
    
    return redirect('profile')

@csrf_exempt
@login_required
def update_theme(request):
    if request.method == "POST":
        data = json.loads(request.body)
        theme = data.get("theme")
        if theme:
            request.user.editor_theme = theme
            request.user.save()
            return JsonResponse({"status": "success", "theme": theme})
    return JsonResponse({"status": "error"}, status=400)


# --- FRIEND SYSTEM AND MESSAGING APIs ---
from django.db.models import Q
from .models import FriendRequest, Friendship, Message

@login_required
@csrf_exempt
def send_friend_request(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            email = data.get("email")
            if email == request.user.email:
                return JsonResponse({"status": "error", "message": "You cannot send a request to yourself."}, status=400)
            
            try:
                to_user = OurUser.objects.get(email=email)
            except OurUser.DoesNotExist:
                return JsonResponse({"status": "error", "message": "User with this email does not exist."}, status=404)
            
            # Check if already friends
            if Friendship.objects.filter(Q(user1=request.user, user2=to_user) | Q(user1=to_user, user2=request.user)).exists():
                return JsonResponse({"status": "error", "message": "You are already friends."}, status=400)
            
            # Check if request already sent or pending
            if FriendRequest.objects.filter(from_user=request.user, to_user=to_user, status='pending').exists():
                return JsonResponse({"status": "error", "message": "Friend request already sent."}, status=400)
            if FriendRequest.objects.filter(from_user=to_user, to_user=request.user, status='pending').exists():
                return JsonResponse({"status": "error", "message": "This user has already sent you a request. Please accept it."}, status=400)
            
            FriendRequest.objects.create(from_user=request.user, to_user=to_user)
            return JsonResponse({"status": "success", "message": "Friend request sent!"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

@login_required
def list_friend_requests(request):
    incoming = FriendRequest.objects.filter(to_user=request.user, status='pending')
    outgoing = FriendRequest.objects.filter(from_user=request.user, status='pending')
    
    in_data = [{"id": req.id, "email": req.from_user.email, "name": req.from_user.name} for req in incoming]
    out_data = [{"id": req.id, "email": req.to_user.email, "name": req.to_user.name} for req in outgoing]
    
    return JsonResponse({"incoming": in_data, "outgoing": out_data})

@login_required
@csrf_exempt
def respond_friend_request(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            request_id = data.get("request_id")
            action = data.get("action") # 'accept' or 'reject'
            
            req = get_object_or_404(FriendRequest, id=request_id, to_user=request.user, status='pending')
            
            if action == 'accept':
                req.status = 'accepted'
                req.save()
                Friendship.objects.create(user1=req.from_user, user2=req.to_user)
                return JsonResponse({"status": "success", "message": "Friend request accepted."})
            elif action == 'reject':
                req.status = 'rejected'
                req.save()
                return JsonResponse({"status": "success", "message": "Friend request rejected."})
            return JsonResponse({"status": "error", "message": "Invalid action."}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

@login_required
def list_friends(request):
    friendships = Friendship.objects.filter(Q(user1=request.user) | Q(user2=request.user))
    friends = []
    for f in friendships:
        friend_obj = f.user2 if f.user1 == request.user else f.user1
        friends.append({"id": friend_obj.id, "email": friend_obj.email, "name": friend_obj.name})
    return JsonResponse({"friends": friends})

@login_required
def get_messages(request, friend_id):
    friend = get_object_or_404(OurUser, id=friend_id)
    # Ensure they are friends
    if not Friendship.objects.filter(Q(user1=request.user, user2=friend) | Q(user1=friend, user2=request.user)).exists():
        return JsonResponse({"status": "error", "message": "Not friends."}, status=403)
        
    msgs = Message.objects.filter(
        Q(sender=request.user, receiver=friend) | Q(sender=friend, receiver=request.user)
    ).order_by('timestamp')
    
    data = []
    for m in msgs:
        data.append({
            "id": m.id,
            "sender_id": m.sender.id,
            "sender_name": m.sender.name,
            "content": m.content,
            "is_file": m.is_file,
            "file_name": m.file_name,
            "file_content": m.file_content,
            "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
    return JsonResponse({"messages": data})

@login_required
@csrf_exempt
def send_message(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            friend_id = data.get("friend_id")
            content = data.get("content", "")
            is_file = data.get("is_file", False)
            user_file_id = data.get("file_id")
            file_name_from_js = data.get("file_name")
            
            friend = get_object_or_404(OurUser, id=friend_id)
            if not Friendship.objects.filter(Q(user1=request.user, user2=friend) | Q(user1=friend, user2=request.user)).exists():
                return JsonResponse({"status": "error", "message": "Not friends."}, status=403)
                
            msg = Message(sender=request.user, receiver=friend, is_file=is_file)
            
            if is_file:
                if user_file_id:
                    user_file = get_object_or_404(UserFile, id=user_file_id, user=request.user)
                    with open(user_file.file_path, 'r', encoding='utf-8') as f:
                        file_text = f.read()
                    msg.file_name = user_file.file_name
                    msg.file_content = file_text
                elif file_name_from_js:
                    msg.file_name = file_name_from_js
                    msg.file_content = content
            else:
                msg.content = content
                
            msg.save()
            return JsonResponse({"status": "success", "message": "Message sent."})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

@login_required
@csrf_exempt
def save_received_file(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            message_id = data.get("message_id")
            
            msg = get_object_or_404(Message, id=message_id, receiver=request.user, is_file=True)
            
            # Use existing logic to save code
            media_root = str(settings.MEDIA_ROOT or "")
            user_folder = os.path.join(media_root, f"user_{request.user.id}")
            os.makedirs(user_folder, exist_ok=True)

            filename = getattr(msg, 'file_name', 'received_file.py')
            # ensure no overwrite of existing exact names, or just overwrite
            # let's just let it overwrite or we can append something.
            # to keep it simple, overwrite or save as is
            file_path = os.path.join(user_folder, filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(msg.file_content)

            file_size = os.path.getsize(file_path) / 1024  # KB

            # Save or update in DB
            UserFile.objects.update_or_create(
                user=request.user,
                file_name=filename,
                defaults={
                    'file_path': file_path,
                    'file_size': file_size
                }
            )
            return JsonResponse({"status": "success", "message": "File saved to your PyGenix."})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "Invalid method"}, status=405)

