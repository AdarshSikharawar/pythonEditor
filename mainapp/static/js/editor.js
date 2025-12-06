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

const defaultCode = `# This part calculates mean and standard deviation
import numpy as np
data = [10, 20, 15, 25, 30, 12, 18, 22]
print("\\n--- Data Analysis ---")
print(f"Data points: {data}")
mean_val = np.mean(data)
std_dev = np.std(data)
print(f"Mean: {mean_val:.2f}")
print(f"Standard Deviation: {std_dev:.2f}")
`;

// ✅ CUSTOM STDIN (input() handler)
const customStdin = () => {
    return new Promise((resolve) => {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'd-flex align-items-center my-1 p-2 bg-dark';
        inputContainer.style.borderLeft = '3px solid #ffc107';

        const prompt = document.createElement('span');
        prompt.textContent = '>>> ';
        prompt.className = 'text-warning me-2';

        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.className = 'form-control form-control-sm bg-secondary text-white border-0';
        inputField.placeholder = 'Type your input and press Enter...';
        inputField.style.flex = '1';

        inputContainer.appendChild(prompt);
        inputContainer.appendChild(inputField);
        outputContent.appendChild(inputContainer);
        outputContent.scrollTop = outputContent.scrollHeight;
        setTimeout(() => inputField.focus(), 50);

        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const value = inputField.value;
                const echoSpan = document.createElement('span');
                echoSpan.textContent = value + '\n';
                echoSpan.className = 'text-info';
                inputContainer.remove();
                outputContent.appendChild(echoSpan);
                outputContent.scrollTop = outputContent.scrollHeight;
                resolve(value);
            }
        });
    });
};

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
        setStatusText('Unsaved changes...');
        autoSaveTimeout = setTimeout(() => {
            saveFileContent(currentFile, editor.getValue());
        }, AUTO_SAVE_DELAY);
    });
};

const saveFileContent = async (filename, content) => {
    setStatusText(`Saving ${filename}...`);
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
        setStatusText('Network Error!', 'error');
        addToOutput(`Network error: ${error}`, 'stderr');
        return false;
    }
};

const renderFileList = () => {
    fileList.innerHTML = '';
    userFiles.forEach(filename => {
        const li = document.createElement('li');
        li.className = `list-group-item list-group-item-action d-flex justify-content-between align-items-center ${filename === currentFile ? 'active' : ''}`;
        li.dataset.filename = filename;
        li.style.cursor = 'pointer';
        li.style.backgroundColor = '#6a62d2';

        const fileNameSpan = document.createElement('span');
        fileNameSpan.innerHTML = `<i class="bi bi-filetype-py"></i> ${filename}`;
        li.appendChild(fileNameSpan);

        // if (filename !== 'main.py') {
        //     const deleteIcon = document.createElement('i');
        //     deleteIcon.className = 'bi bi-trash-fill delete-icon';
        //     deleteIcon.dataset.filename = filename;
        //     li.appendChild(deleteIcon);
        // }

        fileList.appendChild(li);
    });
};

const loadFileContent = async (filename) => {
    setStatusText(`Loading ${filename}...`);
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
        pyodide = await loadPyodide({ stdin: customStdin });
        setStatusText('Loading NumPy...');
        await pyodide.loadPackage('numpy');
        setStatusText('Ready', 'success');
        addToOutput('✅ Python environment ready! Run your code with the "Run" button.\n', 'success');
    } catch (error) {
        setStatusText('Pyodide Failed!', 'error');
        addToOutput(`❌ Fatal Error: ${error.message}`, 'stderr');
    }
};

const runCode = async () => {
    if (!pyodide) {
        addToOutput('⚠️ Pyodide is not ready yet. Please wait...', 'stderr');
        return;
    }
    addToOutput(`\n▶️ Running ${currentFile}...\n`, 'success');
    try {
        pyodide.setStdout({ batched: (s) => addToOutput(s, 'stdout') });
        pyodide.setStderr({ batched: (s) => addToOutput(s, 'stderr') });
        await pyodide.runPythonAsync(editor.getValue());
        addToOutput('\n✅ Execution Finished\n', 'success');
    } catch (err) {
        addToOutput(`\n❌ Error:\n${err.toString()}`, 'stderr');
    }
};

// ✅ Dialog-based File Creation
const createNewFile = async () => {
    let filename = newFilenameInput.value.trim();
    if (!filename) {
        alert('Please enter a filename.');
        return;
    }
    if (!filename.endsWith('.py')) filename += '.py';
    if (userFiles.includes(filename)) {
        alert('File already exists!');
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
        const newTopHeight = e.clientY - editorArea.getBoundingClientRect().top;
        const totalHeight = editorArea.clientHeight;

        if (newTopHeight > 100 && (totalHeight - newTopHeight - resizer.offsetHeight) > 100) {
            editorContainer.style.height = `${newTopHeight}px`;
            outputConsole.style.height = `${totalHeight - newTopHeight - resizer.offsetHeight}px`;
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



// ✅ INITIALIZE APP
const initializeApp = () => {
    setupResizer();

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
        }
    });
    saveBtn.addEventListener('click', () => saveFileContent(currentFile, editor.getValue()));

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([editor.getValue()], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentFile;
        a.click();
        URL.revokeObjectURL(a.href);
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
        editor = monaco.editor.create(editorContainer, {
            value: '',
            language: 'python',
            theme: 'vs-light',
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: 'on'
        });

        setupAutoSave(editor);
        await loadInitialFiles();
        initPyodide();
    });
};

// ✅ START WHEN DOM READY
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
