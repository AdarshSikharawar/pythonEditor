function toggleForm(formId) {
    // Hide all forms
    document.querySelectorAll('.form-section').forEach(form => {
        form.classList.remove('active');
    });

    // Show selected form
    document.getElementById(formId).classList.add('active');

}

setTimeout(function(){
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => msg.style.display = 'none');
}, 3000);