from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

class MySocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        # This is executed before any social login occurs (even for existing users)
        user = sociallogin.user
        
        # Check if the user already exists and does not have a name set
        if user and user.id and not user.name:
            extra_data = sociallogin.account.extra_data
            email = extra_data.get('email', '')
            
            # Extract name depending on provider
            name = extra_data.get('name')
            if not name and sociallogin.account.provider == 'github':
                name = extra_data.get('login')
            if not name:
                name = extra_data.get('given_name', 'User')

            if email and name == 'User':
                user.name = email.split('@')[0]
            else:
                user.name = name
            
            # Save the updated user name
            user.save()

    def populate_user(self, request, sociallogin, data):
        # Call the parent class's method to populate the default fields
        user = super().populate_user(request, sociallogin, data)
        # Extract the username from the Google/GitHub data
        name = data.get('name')
        
        # GitHub specific fallback
        if not name and sociallogin.account.provider == 'github':
            name = data.get('login', '')
            
        # Google specific fallback
        if not name:
            first = data.get('given_name', '')
            last = data.get('family_name', '')
            name = f"{first} {last}".strip()
            
        if not name:
            email = data.get('email', '')
            name = email.split('@')[0] if email else 'User'

        # Set the name field on our custom user model
        user.name = name
        
        return user
