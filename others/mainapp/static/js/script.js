function validate() {
    let pas = document.getElementById("pas").value;
    let cpas = document.getElementById("cpas").value;
    let msg = document.getElementById("msg");

    if (cpas === "") {
        msg.innerText = "";
        msg.className = "";
        return;
    }

    if (pas === cpas) {
        msg.innerText = "matched";

    } else {
        msg.innerText = "does not matched";

    }
}