// friends.js

let chatPollingInterval = null;
let currentChatFriendId = null;

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

const csrfToken = getCookie('csrftoken');

// -- Friends Panel Functions --

function openFriendsPanel() {
    document.getElementById('friends-dialog').showModal();
    loadFriendsList();
    loadRequestsList();
}

function loadFriendsList() {
    fetch('/api/friends/list/')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('friends-list-container');
            container.innerHTML = '';
            if (data.friends.length === 0) {
                container.innerHTML = '<li class="list-group-item text-muted">No friends yet.</li>';
                return;
            }
            data.friends.forEach(f => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <div>
                        <strong>${f.name}</strong><br>
                        <small class="text-muted">${f.email}</small>
                    </div>
                    <button class="btn btn-sm btn-primary-glass" onclick="openChat(${f.id}, '${f.name}')">Chat</button>
                `;
                container.appendChild(li);
            });
        })
        .catch(err => console.error(err));
}

function loadRequestsList() {
    fetch('/api/friends/request/list/')
        .then(response => response.json())
        .then(data => {
            const incomingContainer = document.getElementById('incoming-requests-container');
            incomingContainer.innerHTML = '';
            if (data.incoming.length === 0) {
                incomingContainer.innerHTML = '<li class="list-group-item text-muted small">None</li>';
            } else {
                data.incoming.forEach(r => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex flex-column gap-2';
                    li.innerHTML = `
                        <div><strong>${r.name}</strong> <span class="text-muted">(${r.email})</span></div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-success flex-grow-1" onclick="respondRequest(${r.id}, 'accept')">Accept</button>
                            <button class="btn btn-sm btn-danger flex-grow-1" onclick="respondRequest(${r.id}, 'reject')">Reject</button>
                        </div>
                    `;
                    incomingContainer.appendChild(li);
                });
            }

            const outgoingContainer = document.getElementById('outgoing-requests-container');
            outgoingContainer.innerHTML = '';
            if (data.outgoing.length === 0) {
                outgoingContainer.innerHTML = '<li class="list-group-item text-muted small">None</li>';
            } else {
                data.outgoing.forEach(r => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.innerHTML = `<div><strong>${r.name}</strong> <span class="text-muted">(${r.email})</span></div>`;
                    outgoingContainer.appendChild(li);
                });
            }
        })
        .catch(err => console.error(err));
}

function sendFriendRequest() {
    const email = document.getElementById('add-friend-email').value.trim();
    if (!email) return;

    fetch('/api/friends/request/send/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (typeof showToast === 'function') showToast('success', data.message);
            document.getElementById('add-friend-email').value = '';
            loadRequestsList();
        } else {
            if (typeof showToast === 'function') showToast('error', data.message);
        }
    })
    .catch(err => console.error(err));
}

function respondRequest(requestId, action) {
    fetch('/api/friends/request/respond/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId, action: action })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (typeof showToast === 'function') showToast('success', data.message);
            loadRequestsList();
            loadFriendsList();
        } else {
            if (typeof showToast === 'function') showToast('error', data.message);
        }
    })
    .catch(err => console.error(err));
}

// -- Chat Functions --

function openChat(friendId, friendName) {
    document.getElementById('friends-dialog').close();
    document.getElementById('chat-friend-name').innerText = friendName;
    document.getElementById('chat-dialog').showModal();
    document.getElementById('chat-dialog').style.display = 'flex';
    currentChatFriendId = friendId;
    loadMessages();
    
    // Start polling
    if (chatPollingInterval) clearInterval(chatPollingInterval);
    chatPollingInterval = setInterval(loadMessages, 3000); // Polling every 3s
}

function closeChat() {
    document.getElementById('chat-dialog').close();
    document.getElementById('chat-dialog').style.display = 'none';
    currentChatFriendId = null;
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

function loadMessages() {
    if (!currentChatFriendId) return;
    
    fetch(`/api/messages/history/${currentChatFriendId}/`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('chat-messages');
            // rudimentary check to see if we should scroll to bottom
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
            
            container.innerHTML = '';
            if (data.messages && data.messages.length > 0) {
                // assume requesting user id can be determined by if message sender_id != currentChatFriendId
                data.messages.forEach(msg => {
                    const isMine = (msg.sender_id !== currentChatFriendId);
                    const bubble = document.createElement('div');
                    bubble.style.maxWidth = '80%';
                    bubble.style.alignSelf = isMine ? 'flex-end' : 'flex-start';
                    bubble.style.backgroundColor = isMine ? 'var(--primary-purple)' : 'var(--bg-dark-secondary)';
                    bubble.style.padding = '10px 15px';
                    bubble.style.borderRadius = '15px';
                    
                    if (msg.is_file) {
                        bubble.innerHTML = `
                            <div class="small fw-bold mb-1"><i class="bi bi-file-earmark-code"></i> ${msg.file_name}</div>
                            <pre class="mb-2 p-2 rounded" style="background: rgba(0,0,0,0.5); font-size: 0.8em; max-height: 150px; overflow-y: auto;"><code>${escapeHtml(msg.file_content)}</code></pre>
                            <div class="d-flex justify-content-end gap-2">
                                <button class="btn btn-sm btn-outline-light py-0" onclick="copyCodeFromChat(this)" title="Copy Code"><i class="bi bi-clipboard"></i></button>
                                ${!isMine ? `<button class="btn btn-sm btn-outline-light py-0" onclick="saveReceivedFile(${msg.id})" title="Save to My Project"><i class="bi bi-save"></i> Save</button>` : ''}
                            </div>
                        `;
                    } else {
                        bubble.innerText = msg.content;
                    }
                    container.appendChild(bubble);
                });
            } else {
                container.innerHTML = '<div class="text-center text-muted small mt-2">No messages yet. Send a message to start!</div>';
            }
            
            if (isAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        })
        .catch(err => console.error(err));
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !currentChatFriendId) return;

    fetch('/api/messages/send/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friend_id: currentChatFriendId, content: text, is_file: false })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            input.value = '';
            loadMessages();
        } else {
            if (typeof showToast === 'function') showToast('error', data.message);
        }
    })
    .catch(err => console.error(err));
}

// -- Send File Functions --

let userFilesCache = [];

function openSendFileModal() {
    document.getElementById('send-file-dialog').showModal();
    // Fetch files from existing list or via API
    fetch('/api/load_code/') // using existing load_code api which returns file list if no filename is passed
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('send-file-list');
            list.innerHTML = '';
            if (data.files && data.files.length > 0) {
                data.files.forEach(fileName => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerHTML = `
                        <span>${fileName}</span>
                        <button class="btn btn-sm btn-primary-glass" onclick="sendFileMessage('${fileName}')">Send</button>
                    `;
                    list.appendChild(li);
                });
            } else {
                list.innerHTML = '<li class="list-group-item text-muted">No files found in your project.</li>';
            }
        })
        .catch(err => console.error(err));
}

function sendFileMessage(fileName) {
    // We need the file_id, but our save API might not return it. If the backend load_code only gives filenames, we might need to alter it or pass filename directly.
    // Let's modify send_message backend to take either file_id or file_name since user.files are unique by name.
    // Alternatively, I'll send another API request to get content and send it as text, or modify send_message to look up by filename.
    // In my views.py, I assumed file_id was passed. I will update the JS to pass file_name and fix it there or we can change views.py.
    // Oh wait, I can send an API request to /api/load_code/?filename=... to get the text, then send it as file_content! This is easier and doesn't require backend change.
    
    // Actually, backend has: user_file_id = data.get("file_id")
    // If I don't have file_id, I can just read from my local editor UI, but best is to update views.py or let's just make another fetch.
    // Wait, let's fix the send_message api if we pass file_name, or we can just send the text directly.
    // Let's just get the code locally if it's open, OR fetch it.
    
    fetch('/api/load_code/?filename=' + encodeURIComponent(fileName))
        .then(res => res.json())
        .then(data => {
            if (data.content !== undefined) {
                // We send the file content directly in the API call
                fetch('/api/messages/send/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrfToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        friend_id: currentChatFriendId, 
                        is_file: true, 
                        // Instead of file_id, we just simulate the text content and filename in the backend?
                        // Actually, the backend expects file_id. Let's send the text to another endpoint or I can modify the backend to accept explicit file_name and file_content. 
                        // I will update the backend `send_message` or I can just use a modified approach: we send the raw content.
                        content: data.content,
                        file_name: fileName
                    })
                })
                .then(res => res.json())
                .then(resData => {
                    if (resData.status === 'success') {
                        if (typeof showToast === 'function') showToast('success', 'File sent!');
                        document.getElementById('send-file-dialog').close();
                        loadMessages();
                    } else {
                        if (typeof showToast === 'function') showToast('error', resData.message);
                    }
                });
            } else {
                if (typeof showToast === 'function') showToast('error', 'Could not load file content.');
            }
        });
}

function copyCodeFromChat(btnElem) {
    const codeElem = btnElem.closest('div').previousElementSibling.querySelector('code');
    if (codeElem) {
        navigator.clipboard.writeText(codeElem.innerText).then(() => {
            if (typeof showToast === 'function') showToast('success', 'Code copied!');
        });
    }
}

function saveReceivedFile(messageId) {
    fetch('/api/messages/save_file/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_id: messageId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            if (typeof showToast === 'function') showToast('success', data.message);
            // Reload sidebar files by triggering global function if available
            if (typeof fetchUserFiles === 'function') fetchUserFiles();
        } else {
            if (typeof showToast === 'function') showToast('error', data.message);
        }
    })
    .catch(err => console.error(err));
}

// Utility
function escapeHtml(unsafe) {
    return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
