document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard JS: SCRIPT EXECUTION STARTED (DOMContentLoaded) - v2'); // Version marker

    console.log('Dashboard JS: Attempting to find imageViewerModal for initial check (v2)...');
    const imageViewerModalAtStart = document.getElementById('imageViewerModal');
    if (imageViewerModalAtStart) {
        console.log('Dashboard JS: imageViewerModal element WAS FOUND at the start of the script (v2).');
    } else {
        console.error('Dashboard JS: imageViewerModal element WAS NOT FOUND at the start of the script (v2)!');
    }

    // Authentication Check
    if (!localStorage.getItem('loggedInUser')) {
        console.warn('Dashboard JS: User not logged in. Redirecting to index.html. Further script execution on dashboard.js will stop. (v2)'); // NEW LOG
        window.location.href = 'index.html';
        return;
    }
    console.log('Dashboard JS: User is logged in. Proceeding with dashboard script. (v2)'); // NEW LOG

    // DOM Elements
    const logoutButton = document.getElementById('logoutButton');
    const patientNameInput = document.getElementById('patientName');
    const patientNumberInput = document.getElementById('patientNumber');
    const addPatientButton = document.getElementById('addPatientButton');
    const patientFormMessage = document.getElementById('patientFormMessage');
    const patientCardsContainer = document.getElementById('patientCardsContainer');
    const searchInput = document.getElementById('searchInput'); // Added search input

    // Image Viewer Modal Elements
    const imageViewerModal = document.getElementById('imageViewerModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const fullImageView = document.getElementById('fullImageView');
    const imageNameInfo = document.getElementById('imageNameInfo');
    const imageDateInfo = document.getElementById('imageDateInfo');
    const prevImageButton = document.getElementById('prevImageButton');
    const nextImageButton = document.getElementById('nextImageButton');
    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const rotateLeftButton = document.getElementById('rotateLeftButton');
    const rotateRightButton = document.getElementById('rotateRightButton');
    const deleteImageButton = document.getElementById('deleteImageButton');

    // Change Password Modal Elements
    const openChangePasswordModalButton = document.getElementById('openChangePasswordModalButton');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeChangePasswordModalButton = document.getElementById('closeChangePasswordModalButton');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const changePasswordMessage = document.getElementById('changePasswordMessage');

    // App State
    let patients = [];
    console.log('Dashboard JS: About to call loadPatients() (v2)...');
    loadPatients(); // Existing call
    console.log('Dashboard JS: Returned from loadPatients() (v2). Current patients count:', patients.length);
    let currentPatientIdForViewer = null;
    let currentImageIndexForViewer = null;
    let currentImagesForViewer = [];
    let zoomLevel = 1;
    let rotationAngle = 0;
    let isPanning = false;
    let panStartX, panStartY, initialImageX, initialImageY;

    // --- UTILITY FUNCTIONS ---
    function loadPatients() {
        console.log('Dashboard JS: loadPatients() called (v2).');
        try {
            const storedPatients = localStorage.getItem('patients');
            if (storedPatients) {
                patients = JSON.parse(storedPatients);
                console.log('Dashboard JS: Patients loaded successfully from localStorage (v2). Count:', patients.length);
            } else {
                patients = [];
                console.log('Dashboard JS: No patients found in localStorage. Initializing empty array (v2).');
            }
        } catch (e) {
            console.error('Dashboard JS: Error loading/parsing patients from localStorage (v2):', e.name, e.message, e);
            patients = [];
            // Error display to user:
            const msgDisplayEl = document.getElementById('patientFormMessage');
            if (typeof displayMessage === 'function' && msgDisplayEl) {
                displayMessage(msgDisplayEl, 'Error: Could not load patient data. Starting with a fresh session.', 'error');
            } else {
                // alert('Error: Could not load patient data. Starting with a fresh session.');
                console.warn('Dashboard JS: displayMessage or msgDisplayEl not available for loadPatients error (v2). Alert fallback commented out.');
            }
        }
    }

    function savePatients() {
        // 'patients' global array, 'displayMessage', and 'patientFormMessage'
        // are assumed to be accessible from the same scope.

        try {
            localStorage.setItem('patients', JSON.stringify(patients));
            console.log('Dashboard: Patients saved successfully to localStorage.');
            return true; // Indicate success
        } catch (e) {
            // Log the error immediately in all cases
            console.error('Dashboard: Error saving patients to localStorage. Error name:', e.name, 'Message:', e.message, 'Full error object:', e);

            let userMessage = 'An error occurred while saving data. New changes might not be persisted.';
            let messageType = 'error'; // Default message type

            // Check for QuotaExceededError (common names and messages)
            // DOMException names for quota errors can be:
            // 'QuotaExceededError' (standard)
            // 'NS_ERROR_DOM_QUOTA_REACHED' (Firefox)
            // Some browsers might just throw a generic Error with a message containing "quota".
            const isQuotaError = e.name === 'QuotaExceededError' ||
                                 e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                                 (e.message && typeof e.message === 'string' && e.message.toLowerCase().includes('quota')) ||
                                 (e.message && typeof e.message === 'string' && e.message.toLowerCase().includes('storage'));

            if (isQuotaError) {
                userMessage = 'Storage Full: Browser storage quota exceeded! Unable to save changes. Please delete existing items to free up space.';
                console.warn('Dashboard: QuotaExceededError detected.');
            } else {
                console.warn('Dashboard: A non-quota error occurred during save:', e.name);
            }

            // Attempt to display the user message, but don't let this fail the function
            try {
                if (typeof displayMessage === 'function' && patientFormMessage) {
                    displayMessage(patientFormMessage, userMessage, messageType);
                } else {
                    // Fallback if displayMessage or patientFormMessage is not available
                    alert(userMessage);
                    console.log('Dashboard: Alert fallback used for user message as displayMessage or patientFormMessage was unavailable.');
                }
            } catch (displayError) {
                console.error('Dashboard: Error trying to display the save error message to the user:', displayError);
                // Fallback to alert if displayMessage itself fails
                alert(userMessage);
            }

            return false; // Indicate failure in all catch scenarios
        }
    }

    function displayMessage(element, message, type = 'error') {
        element.textContent = message;
        element.className = `message-area ${type}`; // This will make it visible due to CSS
        setTimeout(() => {
            element.textContent = '';
            element.className = 'message-area'; // This will hide it again
        }, 3000);
    }

    // --- PATIENT MANAGEMENT ---
    function displayPatientCards(patientsToDisplay = patients) { // Modified signature
        if (!patientCardsContainer) {
            console.error("Dashboard: patientCardsContainer not found in DOM.");
            return;
        }
        patientCardsContainer.innerHTML = ''; // Clear existing cards

        if (patientsToDisplay.length === 0) {
            const currentSearchTerm = searchInput ? searchInput.value.trim() : '';
            if (currentSearchTerm !== '') {
                patientCardsContainer.innerHTML = '<p class="no-images-text" style="text-align:center; width:100%;">No patients found matching your search.</p>';
            } else {
                patientCardsContainer.innerHTML = '<p class="no-images-text" style="text-align:center; width:100%;">No patients added yet.</p>';
            }
            return;
        }

        patientsToDisplay.forEach(patient => { // Use patientsToDisplay
            const card = document.createElement('div');
            card.className = 'patient-card';
            // Ensure IDs are unique and valid for querySelector
            const uploadAreaId = `upload-area-${patient.id}`;
            const fileInputId = `file-input-${patient.id}`;
            const thumbnailsId = `thumbnails-${patient.id}`;

            card.innerHTML = `
                <h3>${patient.name}</h3>
                <p>Patient Number: ${patient.number}</p>
                <div class="image-upload-area" id="${uploadAreaId}">
                    <p>Drag & Drop images here or click to select</p>
                    <input type="file" class="hidden-file-input" id="${fileInputId}" accept="image/*" multiple>
                    <div class="image-thumbnails-container" id="${thumbnailsId}"></div>
                </div>
            `;
            patientCardsContainer.appendChild(card);

            const uploadAreaElement = card.querySelector(`#${uploadAreaId}`);
            const fileInputElement = card.querySelector(`#${fileInputId}`);
            const thumbnailsContainerElement = card.querySelector(`#${thumbnailsId}`);

            if (!uploadAreaElement || !fileInputElement || !thumbnailsContainerElement) {
                console.error(`Core elements missing for patient card ${patient.id}. Uploads or thumbnails may not work.`);
                // return; // Don't skip card, just log error for missing parts. Delete button should still work.
            }

            renderImageThumbnails(patient, thumbnailsContainerElement);
            attachUploadListeners(patient, uploadAreaElement, fileInputElement);

            // Create and append the delete patient button
            const deletePatientBtn = document.createElement('button');
            deletePatientBtn.className = 'delete-patient-button button-style danger-button';
            deletePatientBtn.textContent = 'Delete Patient';
            deletePatientBtn.setAttribute('data-patient-id', patient.id);
            // Inline styles for margin, display, width removed as they are now in CSS

            card.appendChild(deletePatientBtn);

            // Event listener for deleting this specific patient will be added later (next subtask)
        });
    }

    if (addPatientButton) {
        addPatientButton.addEventListener('click', () => {
            const name = patientNameInput.value.trim();
            const number = patientNumberInput.value.trim();

            if (!name || !number) {
                displayMessage(patientFormMessage, 'Both name and number are required.');
                return;
            }

            const newPatient = {
                id: Date.now().toString(), // Ensure ID is a string
                name: name,
                number: number,
                images: []
            };
            patients.push(newPatient);
            savePatients();
            displayPatientCards();
            patientNameInput.value = '';
            patientNumberInput.value = '';
            displayMessage(patientFormMessage, 'Patient added successfully.', 'success');
        });
    }


    // --- IMAGE UPLOAD ---
    function renderImageThumbnails(patient, containerElement) {
        containerElement.innerHTML = ''; // Clear existing thumbnails
        if (!patient.images || patient.images.length === 0) {
            containerElement.innerHTML = '<p class="no-images-text">No images uploaded yet.</p>';
            return;
        }

        patient.images.forEach((image, index) => {
            const thumbnailItem = document.createElement('div');
            thumbnailItem.className = 'thumbnail-item';
            thumbnailItem.innerHTML = `
                <img src="${image.src}" alt="${image.name}" class="thumbnail-img">
                <p class="thumbnail-name" title="${image.name}">${image.name}</p>
                <p class="thumbnail-date">${image.uploadDate}</p>
            `;
            thumbnailItem.addEventListener('click', (event) => {
                event.stopPropagation(); // CRITICAL: Prevent bubbling to upload area click
                openImageViewer(patient.id, index);
            });
            containerElement.appendChild(thumbnailItem);
        });
    }

    function attachUploadListeners(patient, uploadAreaEl, fileInputEl) {
        if (!uploadAreaEl || !fileInputEl) {
            console.error(`Dashboard: Could not find upload elements for patient ${patient.id || 'unknown'}`);
            return;
        }

        // Clear any existing listeners by replacing the element with its clone (simple way)
        // Note: This is a bit heavy-handed. For very complex apps, manage listeners individually.
        // const newUploadAreaEl = uploadAreaEl.cloneNode(true);
        // uploadAreaEl.parentNode.replaceChild(newUploadAreaEl, uploadAreaEl);
        // uploadAreaEl = newUploadAreaEl;
        // For this app's scale, direct addEventListener is okay if displayPatientCards clears innerHTML.

        // Click to select file
        uploadAreaEl.addEventListener('click', (event) => {
            console.log(`Dashboard: Upload area clicked for patient ${patient.id}`);
            // Check if the click was on the upload area itself or the direct P child for the prompt
            if (event.target === uploadAreaEl || (event.target.tagName === 'P' && event.target.parentElement === uploadAreaEl)) {
                 fileInputEl.click();
            }
        });

        // Drag and Drop listeners
        uploadAreaEl.addEventListener('dragenter', (event) => {
            console.log(`Dashboard: dragenter event on upload area for patient ${patient.id}`);
            event.preventDefault();
            event.stopPropagation();
            uploadAreaEl.classList.add('dragover');
        });

        uploadAreaEl.addEventListener('dragover', (event) => {
            console.log(`Dashboard: dragover event on upload area for patient ${patient.id}`);
            event.preventDefault();
            event.stopPropagation();
            uploadAreaEl.classList.add('dragover');
        });

        uploadAreaEl.addEventListener('dragleave', (event) => {
            console.log(`Dashboard: dragleave event on upload area for patient ${patient.id}`);
            event.preventDefault();
            event.stopPropagation();
            // Smart detection for leaving the actual element vs. entering a child
            // A common issue: if dragging over a child, parent fires dragleave.
            // This check attempts to mitigate it. If relatedTarget is null, it means it left the window.
            // If relatedTarget is not part of uploadAreaEl, then it truly left.
            if (event.relatedTarget === null || !uploadAreaEl.contains(event.relatedTarget)) {
                uploadAreaEl.classList.remove('dragover');
            }
        });

        uploadAreaEl.addEventListener('drop', (event) => {
            console.log(`Dashboard: drop event on upload area for patient ${patient.id}`);
            event.preventDefault();
            event.stopPropagation();
            uploadAreaEl.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files && files.length > 0) {
                console.log(`Dashboard: Dropped ${files.length} files for patient ${patient.id}. First file: ${files[0].name}`);
                handleFileUpload(patient.id, files);
            } else {
                console.log(`Dashboard: Drop event occurred but no files found for patient ${patient.id}.`);
            }
        });

        // File input change listener
        fileInputEl.addEventListener('change', (event) => {
            console.log(`Dashboard: fileInput change event for patient ${patient.id}`);
            const files = event.target.files;
            if (files && files.length > 0) {
                handleFileUpload(patient.id, files);
            }
            event.target.value = null;
        });
    }

    function handleFileUpload(patientId, files) {
        // 'patients' array, 'savePatients' and 'displayPatientCards' functions
        // are assumed to be accessible from the same scope this function is defined in
        // (e.g., within the DOMContentLoaded listener).

        const patient = patients.find(p => p.id === patientId);
        if (!patient) {
            console.error('Dashboard: Patient not found for ID:', patientId);
            return;
        }

        const imageFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                console.log(`Dashboard: Skipped non-image file: ${file.name}`);
                return false;
            }
            return true;
        });

        if (imageFiles.length === 0) {
            console.log('Dashboard: No valid image files selected or dropped.');
            return;
        }

        console.log(`Dashboard: Processing ${imageFiles.length} image files for patient ${patient.id}.`);

        // Define helper function inside handleFileUpload to have access to its scope if needed,
        // or define it in the broader scope if it's generally useful.
        const readFileAsDataURL = (file) => {
            return new Promise((resolve, reject) => {
                console.log(`Dashboard: Preparing to read file. Name: ${file.name}, Size: ${file.size}, Type: ${file.type}, LastModified: ${new Date(file.lastModified).toISOString()}`);

                const reader = new FileReader();
                reader.onload = () => {
                    resolve({
                        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11) + '-' + encodeURIComponent(file.name).replace(/[^a-zA-Z0-9_.-]/g, ''),
                        src: reader.result,
                        name: file.name,
                        uploadDate: new Date().toLocaleDateString()
                    });
                };
                reader.onerror = (errorEvent) => {
                    console.error(`Dashboard: FileReader error for file '${file.name}'. Error object:`, reader.error, 'Event:', errorEvent);
                    reject(reader.error || new Error(`FileReader error for ${file.name}`));
                };
                reader.readAsDataURL(file);
            });
        };

        Promise.all(imageFiles.map(file => readFileAsDataURL(file)))
            .then(newImages => {
                if (!patient.images) {
                    patient.images = [];
                }
                const originalImageCount = patient.images.length; // Store original length

                patient.images.push(...newImages); // Add new images to the in-memory array

                console.log(`Dashboard: Attempting to save ${newImages.length} new images for patient ${patient.id}.`);

                const saveSuccess = savePatients(); // Attempt to save

                if (saveSuccess) {
                    console.log(`Dashboard: Successfully saved ${newImages.length} images for patient ${patient.id}. Total images now: ${patient.images.length}`);
                    displayPatientCards(); // Call once to refresh UI
                    if (typeof displayMessage === 'function' && patientFormMessage) {
                        displayMessage(patientFormMessage, `${newImages.length} image(s) uploaded and saved successfully!`, 'success');
                    }
                } else {
                    // Save failed (likely QuotaExceededError, message already shown by savePatients)
                    console.warn(`Dashboard: Failed to save images for patient ${patient.id} due to storage quota (or other save error). Reverting in-memory addition.`);
                    patient.images.splice(originalImageCount, newImages.length); // Revert the in-memory addition
                    // Do not call displayPatientCards() here if the goal is to keep UI reflecting last good save.
                    // However, if an error occurs and the user is notified, they might expect the UI to reflect the reverted state.
                    // For now, let's call displayPatientCards() to show the reverted state.
                    // This ensures the UI doesn't show thumbnails for images that couldn't be saved.
                    displayPatientCards();
                }
            })
            .catch(error => { // This catch is for FileReader errors primarily
                console.error('Dashboard: Error during Promise.all for file uploads (FileReader stage). The error object was:', error);
                if (typeof displayMessage === 'function' && patientFormMessage) {
                    displayMessage(patientFormMessage, 'Error reading one or more files. Upload failed.', 'error');
                }
            });
    }

    // --- IMAGE VIEWER ---
    function openImageViewer(patientId, imageIndex) {
        currentPatientIdForViewer = patientId;
        const patient = patients.find(p => p.id === patientId);
        if (!patient || !patient.images || patient.images.length === 0) return;

        currentImagesForViewer = patient.images;
        currentImageIndexForViewer = imageIndex;

        const image = currentImagesForViewer[currentImageIndexForViewer];
        if (!image) return;

        if (!fullImageView || !imageNameInfo || !imageDateInfo || !imageViewerModal) {
            console.error("Image viewer DOM elements not found.");
            return;
        }

        fullImageView.src = image.src;
        imageNameInfo.textContent = image.name;
        imageDateInfo.textContent = `Uploaded: ${image.uploadDate}`;

        zoomLevel = 1;
        rotationAngle = 0;
        fullImageView.style.left = '';
        fullImageView.style.top = '';
        applyTransform();
        updateViewerControls();
        imageViewerModal.style.display = 'flex';
    }

    function closeImageViewer() {
        if (!imageViewerModal || !fullImageView) return;
        imageViewerModal.style.display = 'none';
        fullImageView.src = '';
        currentPatientIdForViewer = null;
        currentImageIndexForViewer = null;
        currentImagesForViewer = [];
    }

    function applyTransform() {
        if (!fullImageView) return;
        if (zoomLevel === 1) {
            fullImageView.style.left = '';
            fullImageView.style.top = '';
            fullImageView.style.maxWidth = '100%';
            fullImageView.style.maxHeight = '100%';
            fullImageView.style.cursor = 'default';
        } else {
            fullImageView.style.maxWidth = 'none';
            fullImageView.style.maxHeight = 'none';
            fullImageView.style.cursor = 'grab';
        }
        fullImageView.style.transform = `scale(${zoomLevel}) rotate(${rotationAngle}deg)`;
    }

    function updateViewerControls() {
        if (!prevImageButton || !nextImageButton) return;
        prevImageButton.disabled = currentImageIndexForViewer === 0;
        nextImageButton.disabled = currentImageIndexForViewer >= currentImagesForViewer.length - 1;
    }

    if (prevImageButton) prevImageButton.addEventListener('click', () => {
        if (currentImageIndexForViewer > 0) {
            openImageViewer(currentPatientIdForViewer, currentImageIndexForViewer - 1);
        }
    });

    if (nextImageButton) nextImageButton.addEventListener('click', () => {
        if (currentImageIndexForViewer < currentImagesForViewer.length - 1) {
            openImageViewer(currentPatientIdForViewer, currentImageIndexForViewer + 1);
        }
    });

    if (zoomInButton) zoomInButton.addEventListener('click', () => {
        zoomLevel = Math.min(5, zoomLevel + 0.2);
        applyTransform();
    });

    if (zoomOutButton) zoomOutButton.addEventListener('click', () => {
        zoomLevel = Math.max(0.2, zoomLevel - 0.2);
        applyTransform();
    });

    if (rotateLeftButton) rotateLeftButton.addEventListener('click', () => {
        rotationAngle = (rotationAngle - 90) % 360;
        applyTransform();
    });

    if (rotateRightButton) rotateRightButton.addEventListener('click', () => {
        rotationAngle = (rotationAngle + 90) % 360;
        applyTransform();
    });

    if (deleteImageButton) deleteImageButton.addEventListener('click', () => {
        if (!currentPatientIdForViewer || currentImageIndexForViewer === null || currentImageIndexForViewer < 0) return;
        if (!confirm('Are you sure you want to delete this image?')) return;

        const patientIndex = patients.findIndex(p => p.id === currentPatientIdForViewer);
        if (patientIndex !== -1 && patients[patientIndex].images) {
            patients[patientIndex].images.splice(currentImageIndexForViewer, 1);
            savePatients();
            closeImageViewer();
            displayPatientCards();
        }
    });

    // Panning Logic
    if (fullImageView) {
        fullImageView.addEventListener('mousedown', (e) => {
            if (zoomLevel > 1) {
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
                initialImageX = parseFloat(fullImageView.style.left) || 0;
                initialImageY = parseFloat(fullImageView.style.top) || 0;
                fullImageView.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning && zoomLevel > 1) {
                const dx = e.clientX - panStartX;
                const dy = e.clientY - panStartY;
                fullImageView.style.left = `${initialImageX + dx}px`;
                fullImageView.style.top = `${initialImageY + dy}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                if (fullImageView) { // Check if fullImageView still exists
                    if (zoomLevel > 1) {
                        fullImageView.style.cursor = 'grab';
                    } else {
                        fullImageView.style.cursor = 'default';
                    }
                }
            }
        });
         document.addEventListener('mouseleave', (e) => {
            // Check if mouse left the document body, not just the image
            if (e.target.nodeName === 'BODY' && e.relatedTarget === null) {
                 if (isPanning) {
                    isPanning = false;
                    if (fullImageView) {
                        if (zoomLevel > 1) {
                            fullImageView.style.cursor = 'grab';
                        } else {
                            fullImageView.style.cursor = 'default';
                        }
                    }
                }
            }
        });
    }

    // --- PATIENT DELETION HANDLER ---
    function handleDeletePatient(patientIdToDelete) {
        console.log(`Dashboard: Attempting to delete patient with ID: ${patientIdToDelete}`);

        // 'patients' variable is from the parent DOMContentLoaded scope
        const patientToDelete = patients.find(p => p.id === patientIdToDelete);
        const patientName = patientToDelete ? patientToDelete.name : 'this patient';

        if (!confirm(`Are you sure you want to delete ${patientName} and all associated data? This action cannot be undone.`)) {
            console.log('Dashboard: Patient deletion cancelled by user.');
            return;
        }

        // Modify the 'patients' array from the parent scope
        patients = patients.filter(patient => patient.id !== patientIdToDelete);

        savePatients(); // Uses 'savePatients' from parent scope
        displayPatientCards(); // Uses 'displayPatientCards' from parent scope

        // Uses 'displayMessage' and 'patientFormMessage' from parent scope
        if (typeof displayMessage === 'function' && patientFormMessage) {
            displayMessage(patientFormMessage, `Patient '${patientName}' and all their data have been deleted.`, 'success');
        }
        console.log(`Dashboard: Patient ${patientIdToDelete} deleted successfully.`);
    }

    // --- LOGOUT ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'index.html';
        });
    }

    // --- INITIALIZATION ---
    console.log('Dashboard JS: About to attach main event listeners (v2)...');
    if (closeModalButton) closeModalButton.addEventListener('click', closeImageViewer);

    // Delegated event listener for deleting patients
    if (patientCardsContainer) {
        patientCardsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-patient-button')) {
                const patientIdToDelete = event.target.getAttribute('data-patient-id');
                if (patientIdToDelete) {
                    handleDeletePatient(patientIdToDelete);
                }
            }
        });
    }

    // Search Input Event Listener
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm === '') {
                displayPatientCards(); // Display all patients (uses default global 'patients')
            } else {
                const filteredPatients = patients.filter(patient => {
                    const nameMatch = patient.name.toLowerCase().includes(searchTerm);
                    const numberMatch = String(patient.number).toLowerCase().includes(searchTerm);
                    return nameMatch || numberMatch;
                });
                displayPatientCards(filteredPatients);
            }
        });
    }
    console.log('Dashboard JS: Finished attaching main event listeners (v2).');

    // --- Change Password Modal Logic ---
    function openChangePassModal() {
        if (changePasswordForm) changePasswordForm.reset();
        if (changePasswordMessage) {
            changePasswordMessage.textContent = '';
            changePasswordMessage.className = 'message-area';
        }
        if (changePasswordModal) changePasswordModal.style.display = 'flex';
    }

    function closeChangePassModal() {
        if (changePasswordModal) changePasswordModal.style.display = 'none';
    }

    if (openChangePasswordModalButton) {
        openChangePasswordModalButton.addEventListener('click', openChangePassModal);
    }
    if (closeChangePasswordModalButton) {
        closeChangePasswordModalButton.addEventListener('click', closeChangePassModal);
    }
    if (changePasswordModal) {
        changePasswordModal.addEventListener('click', (event) => {
            if (event.target === changePasswordModal) {
                closeChangePassModal();
            }
        });
    }
    // Close change password modal with Escape key - added to existing listener
    // The existing keydown listener for image viewer modal escape needs to be made more general or duplicated.
    // For now, let's add a specific one for this modal, then consider refactoring.
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && changePasswordModal && changePasswordModal.style.display === 'flex') {
            closeChangePassModal();
        }
    });

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const currentPassword = currentPasswordInput.value; // No .trim() for passwords
            const newPassword = newPasswordInput.value;
            const confirmNewPassword = confirmNewPasswordInput.value;

            if (!currentPassword || !newPassword || !confirmNewPassword) {
                displayMessage(changePasswordMessage, 'All password fields are required.', 'error');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                displayMessage(changePasswordMessage, 'New passwords do not match.', 'error');
                return;
            }
            if (newPassword.length < 1) { // Basic check, can be more complex (e.g. min length)
                displayMessage(changePasswordMessage, 'New password cannot be empty.', 'error');
                return;
            }

            const loggedInUsername = localStorage.getItem('loggedInUser');
            let users = JSON.parse(localStorage.getItem('users')) || [];
            const userIndex = users.findIndex(u => u.username === loggedInUsername);

            if (!loggedInUsername || userIndex === -1) {
                displayMessage(changePasswordMessage, 'Error: User not found. Please log out and log back in.', 'error');
                return;
            }

            if (users[userIndex].password !== currentPassword) {
                displayMessage(changePasswordMessage, 'Incorrect current password.', 'error');
                return;
            }

            // All checks passed, update password
            users[userIndex].password = newPassword;

            try {
                localStorage.setItem('users', JSON.stringify(users));
                displayMessage(changePasswordMessage, 'Password updated successfully!', 'success');
                setTimeout(closeChangePassModal, 1500);
            } catch (e) {
                console.error("Dashboard: Error saving updated users array for password change:", e);
                let userMsg = "Failed to save new password. Storage might be full or another error occurred.";
                 if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('quota'))) {
                    userMsg = 'Storage Full: Could not save new password. Please try again after freeing up space.';
                 }
                displayMessage(changePasswordMessage, userMsg, 'error');
                 // If save failed, consider if we need to revert the in-memory 'users' array change for this session.
                 // For now, the in-memory 'users' array is changed, but it won't persist if this save failed.
                 // This could be an issue if other parts of the app read 'users' array expecting it to be persisted.
            }
        });
    }


    console.log('Dashboard JS: About to make initial call to displayPatientCards() (v2)...');
    displayPatientCards(); // Initial display of all patients
    console.log('Dashboard JS: Returned from initial call to displayPatientCards() (v2).');

    // Defensive hide for imageViewerModal at the very end
    console.log('Dashboard JS: Reached defensive hiding code for modal (v2)...');
    const imageViewerModalInstance = document.getElementById('imageViewerModal');
    if (imageViewerModalInstance) {
        const computedStyle = window.getComputedStyle(imageViewerModalInstance);
        if (computedStyle.display !== 'none') {
            console.log('Dashboard JS: END SCRIPT: imageViewerModal was not display:none (computed style). Forcing hide via inline style. Current computed display:', computedStyle.display);
            imageViewerModalInstance.style.display = 'none';
        } else {
            console.log('Dashboard JS: END SCRIPT: imageViewerModal was already display:none (computed style) as expected.');
        }
    } else {
        console.warn('Dashboard JS: END SCRIPT: imageViewerModal element not found for defensive hide.');
    }
});
