
function editFile(fileId) {
    // एडिट पेज पर redirect कर दो
    window.location.href = `/edit/${fileId}/`;
}

function deleteFile(fileId) {
    if (confirm("Kya tum sure ho file delete karna chahti ho?")) {
        fetch(`/delete/${fileId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            }
        })
        .then(response => {
            if (response.ok) {
                alert("File deleted successfully!");
                location.reload();
            } else {
                alert("Error deleting file!");
            }
        })
        .catch(() => alert("Something went wrong!"));
    }
}

// ✅ Django CSRF token fetch करने के लिए helper function
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
