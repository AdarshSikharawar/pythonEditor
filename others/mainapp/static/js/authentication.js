function toggleForm(formId) {
    // Hide all forms
    document.querySelectorAll('.form-section').forEach(form => {
        form.classList.remove('active');
    });

    // Show selected form
    document.getElementById(formId).classList.add('active');

}

setTimeout(function () {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => msg.style.display = 'none');
}, 3000);

function validate() {
    let pas = document.getElementById("password").value;
    let cpas = document.getElementById("confirm-password").value;
    let msg = document.getElementById("msg");

    if (cpas === "") {
        msg.innerText = "";
        msg.className = "";
        return;
    }


    if (pas === cpas) {
        msg.innerText = " ";

    } else {
        msg.innerText = "Password and Confirm Password Must Be Same";

    }

}