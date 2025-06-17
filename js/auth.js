document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const loginForm = document.getElementById('loginForm');

    const regUsernameInput = document.getElementById('regUsername');
    const regPasswordInput = document.getElementById('regPassword');
    const regMessage = document.getElementById('regMessage');

    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginMessage = document.getElementById('loginMessage');

    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = regUsernameInput.value.trim();
            const password = regPasswordInput.value.trim();

            regMessage.className = 'message-area'; // Reset classes
            regMessage.textContent = '';

            if (!username || !password) {
                regMessage.textContent = 'Username and password cannot be empty.';
                regMessage.classList.add('error');
                return;
            }

            let users = JSON.parse(localStorage.getItem('users')) || [];

            if (users.find(user => user.username === username)) {
                regMessage.textContent = 'Username already exists.';
                regMessage.classList.add('error');
                return;
            }

            users.push({ username, password });
            localStorage.setItem('users', JSON.stringify(users));
            regMessage.textContent = 'Registration successful!';
            regMessage.classList.add('success');
            registrationForm.reset();
            setTimeout(() => {
                regMessage.textContent = '';
                regMessage.className = 'message-area';
            }, 3000);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            loginMessage.className = 'message-area'; // Reset classes
            loginMessage.textContent = '';

            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!username || !password) {
                loginMessage.textContent = 'Username and password cannot be empty.';
                loginMessage.classList.add('error');
                return;
            }

            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                loginMessage.textContent = 'Login successful!';
                loginMessage.classList.add('success');
                localStorage.setItem('loggedInUser', username);
                // Give a moment for the user to see the message before redirect
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                loginMessage.textContent = 'Invalid username or password.';
                loginMessage.classList.add('error');
            }
        });
    }
});
