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
        message.classList.remove("text-danger");
        message.classList.add("text-success");
        message.textContent = "Password matched";
    } else {
        message.classList.remove("text-success");
        message.classList.add("text-danger");
        message.textContent = "Both passwords must be same";
    }
}

function validateForm() {
    let password = document.getElementById("password").value.trim();
    let confirmPassword = document.getElementById("confirm-password").value.trim();

    if (password !== confirmPassword) {
        showToast('error', 'Passwords do not match!');
        return false;
    }
    return true;
}
