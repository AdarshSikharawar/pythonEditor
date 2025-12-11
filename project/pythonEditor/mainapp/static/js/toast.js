/**
 * Toast Notification System
 * Handles creation and animation of toast notifications.
 */

const ToastType = {
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
};

const ToastIcons = {
    'success': 'bi-check-circle',
    'info': 'bi-info-circle',
    'warning': 'bi-exclamation-circle',
    'error': 'bi-x-circle'
};

const ToastTitles = {
    'success': 'Success',
    'info': 'Info',
    'warning': 'Warning',
    'error': 'Error'
};

function showToast(type, message) {
    // Ensure container exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Validate type (default to info if invalid)
    if (!['success', 'info', 'warning', 'error'].includes(type)) {
        type = 'info';
    }

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    // HTML Structure
    toast.innerHTML = `
        <div class="toast-content">
            <i class="bi ${ToastIcons[type]} toast-icon"></i>
            <div class="toast-body">
                <span class="toast-title">${ToastTitles[type]}</span>
                <span class="toast-message">${message}</span>
            </div>
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    // Close Handler
    const closeBtn = toast.querySelector('.toast-close');

    const removeToast = () => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        });
    };

    closeBtn.onclick = removeToast;

    // Auto-dismiss
    setTimeout(() => {
        if (toast.parentElement) {
            removeToast();
        }
    }, 4000);

    // Append to container
    container.appendChild(toast);
}

// Global exposure
window.showToast = showToast;
