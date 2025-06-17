document.addEventListener('DOMContentLoaded', () => {
    // Authentication Check
    if (!localStorage.getItem('loggedInUser')) {
        window.location.href = 'index.html';
        return;
    }

    // DOM Elements
    const logoutButton = document.getElementById('logoutButton');
    const patientNameInput = document.getElementById('patientName');
    const patientNumberInput = document.getElementById('patientNumber');
    const addPatientButton = document.getElementById('addPatientButton');
    const patientFormMessage = document.getElementById('patientFormMessage');
    const patientCardsContainer = document.getElementById('patientCardsContainer');

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

    // App State
    let patients = JSON.parse(localStorage.getItem('patients')) || [];
    let currentPatientIdForViewer = null;
    let currentImageIndexForViewer = null;
    let currentImagesForViewer = [];
    let zoomLevel = 1;
    let rotationAngle = 0;
    let isPanning = false;
    let panStartX, panStartY, initialImageX, initialImageY;

    // --- UTILITY FUNCTIONS ---
    function savePatients() {
        localStorage.setItem('patients', JSON.stringify(patients));
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
    function displayPatientCards() {
        if (!patientCardsContainer) {
            console.error("patientCardsContainer not found in DOM.");
            return;
        }
        patientCardsContainer.innerHTML = ''; // Clear existing cards

        if (patients.length === 0) {
            patientCardsContainer.innerHTML = '<p class="no-images-text" style="text-align:center; width:100%;">No patients added yet.</p>';
            return;
        }

        patients.forEach(patient => {
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
                return; // Skip this card if essential parts are missing
            }

            renderImageThumbnails(patient, thumbnailsContainerElement);
            attachUploadListeners(patient, uploadAreaElement, fileInputElement);
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
        if (!uploadAreaEl || !fileInputEl) return;

        uploadAreaEl.addEventListener('click', (event) => {
            if (event.target === uploadAreaEl || (event.target.tagName === 'P' && event.target.parentElement === uploadAreaEl)) {
                 fileInputEl.click();
            }
        });

        uploadAreaEl.addEventListener('dragover', (event) => {
            event.preventDefault();
            uploadAreaEl.classList.add('dragover');
        });
        uploadAreaEl.addEventListener('dragleave', (event) => {
            // No preventDefault needed on dragleave itself
            uploadAreaEl.classList.remove('dragover');
        });
        uploadAreaEl.addEventListener('drop', (event) => {
            event.preventDefault();
            uploadAreaEl.classList.remove('dragover');
            handleFileUpload(patient.id, event.dataTransfer.files);
        });
        fileInputEl.addEventListener('change', (event) => {
            handleFileUpload(patient.id, event.target.files);
            event.target.value = null;
        });
    }

    function handleFileUpload(patientId, files) {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const newImage = {
                    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
                    src: e.target.result,
                    name: file.name,
                    uploadDate: new Date().toLocaleDateString()
                };
                patient.images.push(newImage);
                savePatients();
                displayPatientCards();
            };
            reader.readAsDataURL(file);
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

    // --- LOGOUT ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'index.html';
        });
    }

    // --- INITIALIZATION ---
    if (closeModalButton) closeModalButton.addEventListener('click', closeImageViewer);
    displayPatientCards();
});
