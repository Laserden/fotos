document.addEventListener('DOMContentLoaded', () => {
    // Login form elements (existing)
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginMessage = document.getElementById('loginMessage');

    // Registration Modal elements
    const registrationModal = document.getElementById('registrationModal');
    const openRegistrationModalButton = document.getElementById('openRegistrationModalButton');
    const closeRegModalButton = document.getElementById('closeRegModalButton');
    const modalRegistrationForm = document.getElementById('modalRegistrationForm');
    const modalRegUsernameInput = document.getElementById('modalRegUsername');
    const modalRegPasswordInput = document.getElementById('modalRegPassword');
    // const modalRegConfirmPasswordInput = document.getElementById('modalRegConfirmPassword'); // If using confirm password
    const modalRegMessage = document.getElementById('modalRegMessage');

    // --- Modal Open/Close Logic ---
    function closeModal() {
        if (registrationModal) {
            registrationModal.style.display = 'none';
        }
    }

    if (openRegistrationModalButton && registrationModal) {
        openRegistrationModalButton.addEventListener('click', () => {
            if (modalRegistrationForm) modalRegistrationForm.reset(); // Clear form fields
            if (modalRegMessage) {
                modalRegMessage.textContent = ''; // Clear messages
                modalRegMessage.className = 'message-area'; // Reset class
            }
            registrationModal.style.display = 'flex';
        });
    }

    if (closeRegModalButton) {
        closeRegModalButton.addEventListener('click', closeModal);
    }

    if (registrationModal) {
        registrationModal.addEventListener('click', (event) => {
            // Close if clicked on the modal backdrop itself
            if (event.target === registrationModal) {
                closeModal();
            }
        });
    }

    window.addEventListener('keydown', (event) => {
        // Close if Escape key is pressed and modal is visible
        if (event.key === 'Escape' && registrationModal && registrationModal.style.display === 'flex') {
            closeModal();
        }
    });

    // --- New Registration Form Submission Logic (for Modal) ---
    if (modalRegistrationForm) {
        modalRegistrationForm.addEventListener('submit', (event) => {
            event.preventDefault();

            // Ensure input elements are valid before accessing their value
            if (!modalRegUsernameInput || !modalRegPasswordInput) {
                console.error("Registration form input elements not found.");
                if (modalRegMessage) {
                    modalRegMessage.textContent = 'An unexpected error occurred. Please try again.';
                    modalRegMessage.className = 'message-area error';
                }
                return;
            }

            const username = modalRegUsernameInput.value.trim();
            const password = modalRegPasswordInput.value.trim();

            // Reset message area
            if (modalRegMessage) {
                modalRegMessage.textContent = '';
                modalRegMessage.className = 'message-area';
            } else {
                console.warn("modalRegMessage element not found.");
            }


            if (!username || !password) {
                if (modalRegMessage) {
                    modalRegMessage.textContent = 'Username and password cannot be empty.';
                    modalRegMessage.classList.add('error');
                }
                return;
            }
            // Optional: Add confirm password check here if field was added
            // if (password !== modalRegConfirmPasswordInput.value.trim()) {
            //     if (modalRegMessage) {
            //         modalRegMessage.textContent = 'Passwords do not match.';
            //         modalRegMessage.classList.add('error');
            //     }
            //     return;
            // }

            let users = JSON.parse(localStorage.getItem('users')) || [];
            if (users.find(user => user.username === username)) {
                if (modalRegMessage) {
                    modalRegMessage.textContent = 'Username already exists. Please choose another.';
                    modalRegMessage.classList.add('error');
                }
                return;
            }

            users.push({ username, password });
            localStorage.setItem('users', JSON.stringify(users));

            if (modalRegMessage) {
                modalRegMessage.textContent = 'Registration successful! You can now log in.';
                modalRegMessage.classList.add('success');
            }

            setTimeout(() => {
                closeModal();
                // modalRegistrationForm.reset(); // Form is reset when modal opens next time
            }, 1500); // Close modal after 1.5 seconds
        });
    }

    // --- Existing Login Form Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            // Ensure login input elements are valid
            if (!loginUsernameInput || !loginPasswordInput) {
                console.error("Login form input elements not found.");
                 if (loginMessage) {
                    loginMessage.textContent = 'An unexpected error occurred. Please try again.';
                    loginMessage.className = 'message-area error';
                }
                return;
            }

            // Reset message area
            if (loginMessage) {
                loginMessage.className = 'message-area';
                loginMessage.textContent = '';
            } else {
                console.warn("loginMessage element not found.");
            }


            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!username || !password) {
                if (loginMessage) {
                    loginMessage.textContent = 'Username and password cannot be empty.';
                    loginMessage.classList.add('error');
                }
                return;
            }

            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                if (loginMessage) {
                    loginMessage.textContent = 'Login successful!';
                    loginMessage.classList.add('success');
                }
                localStorage.setItem('loggedInUser', username);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000); // Give a moment for the user to see the message
            } else {
                if (loginMessage) {
                    loginMessage.textContent = 'Invalid username or password.';
                    loginMessage.classList.add('error');
                }
            }
        });
    }
});
