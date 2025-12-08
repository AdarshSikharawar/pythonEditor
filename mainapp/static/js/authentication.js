function toggleForm(formId) {
    // Hide all forms
    document.querySelectorAll('.form-section').forEach(form => {
        form.classList.remove('active');
    });

    // Show selected form
    document.getElementById(formId).classList.add('active');

    // Toggle compact mode for Signup form
    const contentWrapper = document.querySelector('.content-wrapper');
    if (formId === 'signupForm') {
        contentWrapper.classList.add('compact-mode');
    } else {
        contentWrapper.classList.remove('compact-mode');
    }
}

setTimeout(function () {
    const messages = document.querySelectorAll('.message');
    messages.forEach(mssg => mssg.style.display = 'none');
}, 3000);

function validate() {
    let password = document.getElementById("password").value.trim();
    let confirmPassword = document.getElementById("confirm-password").value.trim();
    let message = document.getElementById("msg");

    message.textContent = "";

    if (confirmPassword === "") {
        return;
    }

    if (password === confirmPassword) {
        message.style.color = "green";
        message.textContent = "Password matched";
    } else {
        message.style.color = "red";
        message.textContent = "Password and confirm password must be same";
    }
}