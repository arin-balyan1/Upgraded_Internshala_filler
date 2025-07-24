document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const resumePathInput = document.getElementById('resumePath');
    const selectResumeBtn = document.getElementById('selectResumeBtn');
    const startAutomationBtn = document.getElementById('startAutomationBtn');
    const logArea = document.getElementById('logArea');
    const submittedList = document.getElementById('submittedList');

    emailInput.value = localStorage.getItem('internshala_email') || '';
    passwordInput.value = localStorage.getItem('internshala_password') || '';
    resumePathInput.value = localStorage.getItem('internshala_resume_path') || '';

    window.electronAPI.onAutomationProgress((message) => {
        const timestamp = new Date().toLocaleTimeString();
        logArea.innerHTML += `<div class="text-gray-400">${timestamp}</div><div>${message}</div>`;
        logArea.scrollTop = logArea.scrollHeight;
    });

    window.electronAPI.onInternshipSubmitted((internshipDetails) => {
        if (submittedList.querySelector('.italic')) {
            submittedList.innerHTML = '';
        }
        const li = document.createElement('li');
        li.className = 'py-2 px-3 border-b border-gray-200 last:border-b-0 text-gray-800';
        
        const link = document.createElement('a');
        link.href = internshipDetails.url;
        link.textContent = `${internshipDetails.title} at ${internshipDetails.company}`;
        link.target = '_blank';
        link.className = 'text-blue-600 hover:underline';

        li.appendChild(link);
        submittedList.appendChild(li);
    });

    selectResumeBtn.addEventListener('click', async () => {
        const filePath = await window.electronAPI.selectResume();
        if (filePath) {
            resumePathInput.value = filePath;
            localStorage.setItem('internshala_resume_path', filePath);
        }
    });

    startAutomationBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        const resumePath = resumePathInput.value;

        if (!email || !password || !resumePath) {
            alert('Please fill in all fields and select a resume file.');
            return;
        }

        localStorage.setItem('internshala_email', email);
        localStorage.setItem('internshala_password', password);

        startAutomationBtn.disabled = true;
        selectResumeBtn.disabled = true;
        logArea.innerHTML = '<div class="text-yellow-400">Starting automation...</div>';
        submittedList.innerHTML = '<li class="text-gray-600 italic">No internships submitted yet.</li>';

        try {
            const result = await window.electronAPI.startAutomation({ email, password, resumePath });
            if (result.success) {
                logArea.innerHTML += '<div class="text-green-400">Automation completed successfully!</div>';
            } else {
                logArea.innerHTML += `<div class="text-red-400">Automation failed: ${result.error}</div>`;
            }
        } catch (error) {
            logArea.innerHTML += `<div class="text-red-400">An unexpected error occurred: ${error.message}</div>`;
            console.error('Renderer error:', error);
        } finally {
            startAutomationBtn.disabled = false;
            selectResumeBtn.disabled = false;
        }
    });
});
