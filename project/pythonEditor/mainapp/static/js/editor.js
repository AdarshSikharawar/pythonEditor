// ✅ FINAL MERGED VERSION (Dialog-based file creation + clean variable setup)
let editor, pyodide;
let currentFile = 'main.py';
let userFiles = ['main.py'];
let autoSaveTimeout;
const AUTO_SAVE_DELAY = 2000;

// ✅ DOM ELEMENTS (Declared & Initialized Together)
const editorContainer = document.getElementById('editor-container');
const outputContent = document.getElementById('output-content');
const runBtn = document.getElementById('run-btn');
const clearBtn = document.getElementById('clear-btn');
const resetBtn = document.getElementById('reset-btn');
const saveBtn = document.getElementById('save-btn');
const downloadBtn = document.getElementById('download-btn');
const pyodideStatus = document.getElementById('pyodide-status');
const fileList = document.getElementById('file-list');
const createFileBtn = document.getElementById('create-file-btn');
const newFileDialog = document.getElementById('new-file-dialog');
const newFileForm = document.getElementById('new-file-form');
const newFilenameInput = document.getElementById('new-filename-input');
const confirmNewFileBtn = document.getElementById('confirm-new-file-btn');
const resizer = document.getElementById('resizer');
const outputConsole = document.getElementById('output-console');

// Mobile UI Elements
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const closeMenuBtn = document.getElementById('close-menu-btn');
const mobileFileList = document.getElementById('mobile-file-list');
const closeOutputBtn = document.getElementById('close-output-btn');

// Mobile Action Buttons
const mobileClearBtn = document.getElementById('mobile-clear-btn');
const mobileResetBtn = document.getElementById('mobile-reset-btn');
const mobileSaveBtn = document.getElementById('mobile-save-btn');
const mobileDownloadBtn = document.getElementById('mobile-download-btn');

const defaultCode = `# This part calculates mean and standard deviation
import numpy as np

print("Welcome to PyGenix, An online Python code Editor")
data = [10, 20, 15, 25, 30, 12, 18, 22]
print("\\n--- Data Analysis ---")
print(f"Data points: {data}")
mean_val = np.mean(data)
std_dev = np.std(data)
print(f"Mean: {mean_val:.2f}")
print(f"Standard Deviation: {std_dev:.2f}")
`;

// ✅ Helper Functions
const setStatusText = (text, type = 'info') => {
    pyodideStatus.textContent = text;
    pyodideStatus.className = 'navbar-text ms-auto fs-sm me-3';
    if (type === 'error') pyodideStatus.classList.add('text-danger');
    if (type === 'success') pyodideStatus.classList.add('text-success');
};

const addToOutput = (message, type = 'stdout') => {
    const span = document.createElement('span');
    span.textContent = message + '\n';
    if (type === 'stderr') span.classList.add('text-danger');
    else if (type === 'success') span.classList.add('text-success');
    else if (type === 'input') span.classList.add('text-warning');
    outputContent.appendChild(span);
    outputContent.scrollTop = outputContent.scrollHeight;
};

const setupAutoSave = (editor) => {
    editor.onDidChangeModelContent(() => {
        clearTimeout(autoSaveTimeout);
        if (!window.isGuest) {
            setStatusText('Unsaved changes...');
        }
        autoSaveTimeout = setTimeout(() => {
            saveFileContent(currentFile, editor.getValue());
        }, AUTO_SAVE_DELAY);
    });
};


const saveFileContent = async (filename, content) => {
    if (!window.isGuest) {
        setStatusText(`Saving ${filename}...`);
    }

    if (window.isGuest) {
        // Guest: Explicitly status that saving is disabled
        setStatusText('Not Saved (Guest Mode)', 'warning');
        return true;
    }

    try {
        const response = await fetch('/api/save_code/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content })
        });
        const result = await response.json();
        if (result.status === 'success') {
            setStatusText(`${filename} saved!`, 'success');
            setTimeout(() => setStatusText('Ready', 'success'), 2000);
            return true;
        } else {
            setStatusText(`Save failed!`, 'error');
            addToOutput(`Error saving file: ${result.message}`, 'stderr');
            return false;
        }
    } catch (error) {
        if (!window.isGuest) {
            setStatusText('Network Error!', 'error');
            showToast('error', 'Network error while saving!');
        }
        return false;
    }
};

const renderFileList = () => {
    // Clear both lists
    fileList.innerHTML = '';
    if (mobileFileList) mobileFileList.innerHTML = '';

    userFiles.forEach(filename => {
        // --- Desktop List Item ---
        const li = document.createElement('li');
        li.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${filename === currentFile ? 'active' : ''}`;
        li.dataset.filename = filename;
        li.style.cursor = 'pointer';

        const fileNameSpan = document.createElement('span');
        fileNameSpan.innerHTML = `<i class="bi bi-filetype-py"></i> ${filename}`;
        li.appendChild(fileNameSpan);

        // Create container for separator and icon/badge
        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        actionContainer.style.alignItems = 'center';
        actionContainer.style.gap = '8px';

        if (filename === 'main.py') {
            const separator = document.createElement('div');
            separator.style.width = '2px';
            separator.style.height = '20px';
            separator.style.backgroundColor = 'var(--glass-border)';
            separator.style.opacity = '1';
            actionContainer.appendChild(separator);

            // Show "Default" badge for main.py
            const defaultBadge = document.createElement('span');
            defaultBadge.textContent = 'Default';
            defaultBadge.style.fontSize = '0.75rem';
            defaultBadge.style.color = 'var(--text-light)';
            defaultBadge.style.opacity = '0.7';
            defaultBadge.style.fontWeight = '500';
            actionContainer.appendChild(defaultBadge);
        } else {
            // Add delete icon for other files
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'bi bi-trash-fill delete-icon';
            deleteIcon.dataset.filename = filename;
            deleteIcon.style.color = '#dc3545';
            deleteIcon.style.cursor = 'pointer';
            deleteIcon.title = 'Delete file';
            actionContainer.appendChild(deleteIcon);
        }

        li.appendChild(actionContainer);
        fileList.appendChild(li);

        // --- Mobile List Item (Clone logic for simplicity) ---
        if (mobileFileList) {
            const mobileLi = li.cloneNode(true);
            // Re-attach event listeners? No, cloneNode doesn't clone listeners.
            // We'll rely on delegation on the parent list.
            mobileLi.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${filename === currentFile ? 'active' : ''}`;

            // Fix delete icon listener in valid delegation
            mobileFileList.appendChild(mobileLi);
        }
    });
};


const deleteFile = async (filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
        return;
    }

    try {
        const response = await fetch('/api/delete_file/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Remove from userFiles array
            userFiles = userFiles.filter(f => f !== filename);

            // If deleted file was active, switch to main.py or first available file
            if (currentFile === filename) {
                currentFile = userFiles.includes('main.py') ? 'main.py' : (userFiles[0] || 'main.py');
                await loadFileContent(currentFile);
            }

            // Re-render file list
            renderFileList();
            showToast('success', `File "${filename}" deleted.`);
        } else {
            showToast('error', `Error deleting file: ${result.message}`);
        }
    } catch (error) {
        showToast('error', 'Network error while deleting!');
    }
};

const loadFileContent = async (filename) => {
    setStatusText(`Loading ${filename}...`);

    if (window.isGuest) {
        // Guest Load Logic: Always default (Ephemeral)
        if (filename === 'main.py') {
            editor.setValue(defaultCode);
        } else {
            editor.setValue('# Start your new Python code here!\n');
        }
        setStatusText('Ready', 'success');
        return;
    }

    try {
        const response = await fetch(`/api/load_code/?filename=${filename}`);
        const result = await response.json();
        if (result.content !== null) {
            editor.setValue(result.content);
        } else {
            if (filename === 'main.py') {
                addToOutput(`Welcome! Creating default main.py for you.`, 'stdout');
                editor.setValue(defaultCode);
                await saveFileContent('main.py', defaultCode);
            } else {
                editor.setValue('# Start your new Python code here!\n');
            }
        }
        setStatusText('Ready', 'success');
    } catch (error) {
        addToOutput(`Error loading ${filename}.`, 'stderr');
    }
};

const loadInitialFiles = async () => {
    if (window.isGuest) {
        // Guest only has main.py initially (virtual)
        userFiles = ['main.py'];
        renderFileList();
        await loadFileContent(currentFile);
        return;
    }

    try {
        const response = await fetch('/api/load_code/');
        const result = await response.json();
        if (result.files && result.files.length > 0) {
            userFiles = result.files;
        }
        renderFileList();
        await loadFileContent(currentFile);
    } catch (error) {
        addToOutput('Could not load file list from server.', 'stderr');
        renderFileList();
        await loadFileContent(currentFile);
    }
};

const initPyodide = async () => {
    try {
        setStatusText('Loading Pyodide...');
        if (typeof loadPyodide === 'undefined') {
            throw new Error('Pyodide CDN not loaded. Please refresh the page.');
        }
        pyodide = await loadPyodide();

        setStatusText('Loading NumPy...');
        await pyodide.loadPackage('numpy');
        setStatusText('Ready', 'success');
        addToOutput('✅ Python environment ready! Run your code with "CTRL+Alt+N" or "Run" button.\n', 'success');
    } catch (error) {
        setStatusText('Pyodide Failed!', 'error');
        addToOutput(`❌ Fatal Error: ${error.message}`, 'stderr');
    }
};

const runCode = async () => {
    if (!pyodide) {
        addToOutput('⚠️ Pyodide is not ready yet. Please wait...', 'stdout');
        return;
    }

    // Clear output and show running message
    outputContent.innerHTML = '';
    addToOutput(`▶️ Running ${currentFile}...\n`, 'success');

    // Show Mobile Output Overlay
    if (window.innerWidth < 768) {
        outputConsole.classList.add('active');
    }

    try {
        pyodide.setStdout({ batched: (s) => addToOutput(s, 'stdout') });
        pyodide.setStderr({ batched: (s) => addToOutput(s, 'stderr') });

        pyodide.setStdin({
            async batched(promptText) {
                return prompt(promptText); // browser popup se input
            }
        });

        // 1. Pehle input override inject karo

        await pyodide.runPythonAsync(`
from js import prompt as __prompt_js

class MagicInput(str):
    def __int__(self):
        return 0
    def __float__(self):
        return 0.0

def input(text=""):
    val = __prompt_js(text)
    if val is None or val == "":
        return MagicInput("NULL")
    return val
`);

        // 2. Ab user ka code run karo
        await pyodide.runPythonAsync(editor.getValue());

        // 3. Output show
        addToOutput('\n✅ Execution Finished', 'success');

    } catch (err) {
        addToOutput(`\n Error:\n${err.toString()}`, 'stderr');
    }
};

// ✅ Dialog-based File Creation
const createNewFile = async () => {
    let filename = newFilenameInput.value.trim();

    if (window.isGuest) {
        showToast('warning', 'Login required to create files');
        newFileDialog.close(); // Close dialog for cleanliness
        return;
    }

    if (!filename) {
        showToast('warning', 'Please enter a filename.');
        return;
    }
    if (!filename.endsWith('.py')) filename += '.py';
    if (userFiles.includes(filename)) {
        showToast('warning', 'File already exists!');
        return;
    }

    const success = await saveFileContent(filename, '# Start your new Python code here!\n');
    if (success) {
        userFiles.push(filename);
        currentFile = filename;
        renderFileList();
        editor.setValue('# Start your new Python code here!\n');
        newFileForm.reset();
        newFileDialog.close();
        showToast('success', `File "${filename}" created successfully.`);
    }
};


// ✅ RESIZER

const setupResizer = () => {
    let isResizing = false;
    const editorArea = resizer.parentElement;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const containerRect = editorArea.getBoundingClientRect();
        const newEditorHeight = e.clientY - containerRect.top;
        const totalHeight = containerRect.height;
        const resizerHeight = resizer.offsetHeight;
        const newOutputHeight = totalHeight - newEditorHeight - resizerHeight;

        // Minimum heights for both sections
        if (newEditorHeight > 100 && newOutputHeight > 100) {
            // Use flex-basis instead of height for better flex compatibility
            editorContainer.style.flexBasis = `${newEditorHeight}px`;
            editorContainer.style.flexGrow = '0';
            editorContainer.style.flexShrink = '0';

            outputConsole.style.flexBasis = `${newOutputHeight}px`;
            outputConsole.style.flexGrow = '0';
            outputConsole.style.flexShrink = '0';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });
};


const setupSidebarResizer = () => {
    const sidebarResizer = document.getElementById('sidebar-resizer');
    const sidebar = document.querySelector('aside');
    let isResizing = false;

    sidebarResizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const newWidth = e.clientX;

        // Set min and max width constraints
        if (newWidth > 150 && newWidth < 500) {
            sidebar.style.width = `${newWidth}px`;
            sidebar.style.flex = 'none'; // Override flex behavior
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });
};


function saveFileToServer(filename, content = "") {
    const fileSize = (new Blob([content]).size / 1024).toFixed(1); // KB me size

    fetch("/save-file-info/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken") // Django CSRF
        },
        body: JSON.stringify({
            file_name: filename,
            file_size: fileSize
        })
    })
        .then(res => res.json())
        .then(data => console.log("Saved:", data))
        .catch(err => console.error("Error:", err));
}

const themeColors = {
    'vs-dark': {
        '--bg-dark': '#1e1e1e',
        '--bg-dark-secondary': '#252526',
        '--text-light': '#d4d4d4',
        '--glass-border': 'rgba(255, 255, 255, 0.1)',
        '--card-bg': 'rgba(30, 30, 30, 0.95)',
        '--card-border': 'rgba(255, 255, 255, 0.1)'
    },
    'vs-light': {
        '--bg-dark': '#ffffff',
        '--bg-dark-secondary': '#f3f3f3',
        '--text-light': '#000000',
        '--glass-border': 'rgba(0, 0, 0, 0.1)',
        '--card-bg': 'rgba(255, 255, 255, 0.95)',
        '--card-border': 'rgba(0, 0, 0, 0.1)'
    },
    'hc-black': {
        '--bg-dark': '#000000',
        '--bg-dark-secondary': '#000000',
        '--text-light': '#ffffff',
        '--glass-border': '#ffffff',
        '--card-bg': '#000000',
        '--card-border': '#ffffff'
    },
    'monokai': {
        '--bg-dark': '#272822',
        '--bg-dark-secondary': '#1e1f1c',
        '--text-light': '#f8f8f2',
        '--glass-border': 'rgba(255, 255, 255, 0.1)',
        '--card-bg': 'rgba(39, 40, 34, 0.95)',
        '--card-border': 'rgba(255, 255, 255, 0.1)'
    },
    'night-owl': {
        '--bg-dark': '#011627',
        '--bg-dark-secondary': '#0b2942',
        '--text-light': '#d6deeb',
        '--glass-border': 'rgba(214, 222, 235, 0.1)',
        '--card-bg': 'rgba(1, 22, 39, 0.95)',
        '--card-border': 'rgba(214, 222, 235, 0.1)'
    }
};

const applyThemeStyles = (themeName) => {
    const colors = themeColors[themeName] || themeColors['vs-dark'];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(colors)) {
        root.style.setProperty(key, value);
    }
    // Toggle light class for Bootstrap/Scrollbars
    if (themeName === 'vs-light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
};

// ✅ THEME HANDLER
window.changeTheme = (themeName) => {
    console.log("Switching theme to:", themeName);
    if (typeof monaco === 'undefined') {
        console.error("Monaco is not defined.");
        return;
    }

    // Ensure custom themes are defined (if coming from cold start or different context)
    if (window.ensureThemesDefined) {
        window.ensureThemesDefined();
    }

    if (editor) {
        monaco.editor.setTheme(themeName);
    }

    // ✅ Apply Global Styles
    applyThemeStyles(themeName);

    // Save to server
    fetch("/api/update_theme/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.cookie.match(/csrftoken=([\w-]+)/)?.[1] || ""
        },
        body: JSON.stringify({ theme: themeName })
    })
        .then()
        .catch(err => {
            console.error("Error saving theme:", err);
            showToast('error', 'Failed to save theme preference');
        });
};



const setupMobileUI = () => {
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuOverlay.classList.add('active');
        });
    }

    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', () => {
            console.log('Close menu clicked');
            mobileMenuOverlay.classList.remove('active');
        });
    }

    if (closeOutputBtn) {
        closeOutputBtn.addEventListener('click', () => {
            outputConsole.classList.remove('active');
        });
    }

    // New File Button
    const mobileCreateFileBtn = document.getElementById('mobile-create-file-btn');
    if (mobileCreateFileBtn) {
        mobileCreateFileBtn.addEventListener('click', () => {
            newFileDialog.showModal();
            mobileMenuOverlay.classList.remove('active'); // Close menu to show dialog
        });
    }

    // Mobile File List Delegation
    if (mobileFileList) {
        mobileFileList.addEventListener('click', (e) => {
            const fileItem = e.target.closest('li');
            if (!fileItem) return;

            // Check for delete icon
            if (e.target.classList.contains('delete-icon')) {
                deleteFile(e.target.dataset.filename);
                return;
            }

            // File selection
            const filename = fileItem.dataset.filename;
            if (filename && filename !== currentFile) {
                currentFile = filename;
                loadFileContent(currentFile);
                renderFileList();
                // Optionally close menu
                mobileMenuOverlay.classList.remove('active');
            }
        });
    }

    // Connect Mobile Action Buttons
    if (mobileClearBtn) mobileClearBtn.addEventListener('click', () => {
        clearBtn.click();
        mobileMenuOverlay.classList.remove('active');
    });
    if (mobileResetBtn) mobileResetBtn.addEventListener('click', () => {
        resetBtn.click();
        mobileMenuOverlay.classList.remove('active');
    });
    if (mobileSaveBtn) mobileSaveBtn.addEventListener('click', () => {
        saveBtn.click();
        mobileMenuOverlay.classList.remove('active');
    });
    if (mobileDownloadBtn) mobileDownloadBtn.addEventListener('click', () => {
        downloadBtn.click();
        mobileMenuOverlay.classList.remove('active');
    });
};

// ✅ INITIALIZE APP
const initializeApp = () => {
    setupResizer();
    setupSidebarResizer();
    setupMobileUI();

    runBtn.addEventListener('click', runCode);
    clearBtn.addEventListener('click', () => {
        outputContent.innerHTML = '';
        addToOutput('Output cleared.\n', 'success');
    });
    resetBtn.addEventListener('click', () => {
        if (confirm('Reset this file? All unsaved changes will be lost.')) {
            const content = currentFile === 'main.py' ? defaultCode : '# Start your new Python code here!\n';
            editor.setValue(content);
            saveFileContent(currentFile, content);
            showToast('success', 'File reset to default');
        }
    });
    saveBtn.addEventListener('click', () => {
        if (window.isGuest) {
            showToast('warning', 'Please Login to save your code permanently.');
            saveFileContent(currentFile, editor.getValue()); // Silent save
            return;
        }
        saveFileContent(currentFile, editor.getValue());
    });

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([editor.getValue()], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentFile;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('success', 'Downloading ' + currentFile);
    });

    fileList.addEventListener('click', (e) => {
        const fileItem = e.target.closest('li');
        if (!fileItem) return;
        if (e.target.classList.contains('delete-icon')) {
            deleteFile(e.target.dataset.filename);
        } else {
            const filename = fileItem.dataset.filename;
            if (filename !== currentFile) {
                currentFile = filename;
                loadFileContent(currentFile);
                renderFileList();
            }
        }
    });

    // ✅ Dialog handling
    createFileBtn.addEventListener('click', () => newFileDialog.showModal());
    newFileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createNewFile();
    });
    newFileForm.addEventListener('reset', () => newFileDialog.close());

    // ✅ Load Monaco and Pyodide
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], async () => {

        // ✅ Define Custom Themes Helper
        const defineCustomThemes = () => {
            monaco.editor.defineTheme('monokai', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: '', background: '272822' },
                    { token: 'comment', foreground: '75715e' },
                    { token: 'keyword', foreground: 'f92672' },
                    { token: 'string', foreground: 'e6db74' },
                    { token: 'number', foreground: 'ae81ff' },
                    { token: 'type', foreground: '66d9ef' },
                    { token: 'operator', foreground: 'f92672' },
                    { token: 'delimiter', foreground: 'f8f8f2' }
                ],
                colors: {
                    'editor.background': '#272822',
                    'editor.foreground': '#f8f8f2',
                    'editorCursor.foreground': '#f8f8f0',
                    'editor.selectionBackground': '#49483e',
                    'editor.lineHighlightBackground': '#3e3d32'
                }
            });

            monaco.editor.defineTheme('night-owl', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: '', background: '011627' },
                    { token: 'comment', foreground: '637777', fontStyle: 'italic' },
                    { token: 'keyword', foreground: 'c792ea' },
                    { token: 'string', foreground: 'ecc48d' },
                    { token: 'number', foreground: 'f78c6c' },
                    { token: 'type', foreground: '82aaff' },
                    { token: 'operator', foreground: 'c792ea' },
                    { token: 'delimiter', foreground: 'd6deeb' }
                ],
                colors: {
                    'editor.background': '#011627',
                    'editor.foreground': '#d6deeb',
                    'editorCursor.foreground': '#80a4c2',
                    'editor.selectionBackground': '#1d3b53',
                    'editor.lineHighlightBackground': '#0b2942'
                }
            });
        };

        // Call it immediately
        defineCustomThemes();

        // Make it available globally just in case
        window.ensureThemesDefined = defineCustomThemes;

        editor = monaco.editor.create(editorContainer, {
            value: '',
            language: 'python',
            theme: window.userTheme || 'vs-dark', // Use saved theme or default
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: 'on'
        });

        // ✅ Apply initial global theme
        if (typeof applyThemeStyles !== 'undefined') {
            applyThemeStyles(window.userTheme || 'vs-dark');
        }

        setupAutoSave(editor);
        await loadInitialFiles();
        initPyodide();

        // Keyboard Shortcut: Ctrl+Alt+N to Run Code
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyN, runCode);
    });
};

// ✅ START WHEN DOM READY
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
