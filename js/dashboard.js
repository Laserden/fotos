document.addEventListener('DOMContentLoaded', () => {
    // Authentication Check
    if (!localStorage.getItem('loggedInUser')) {
        window.location.href = 'index.html';
        return; // Stop script execution if not logged in
    }

    const logoutButton = document.getElementById('logoutButton');
    const newPatientForm = document.getElementById('newPatientForm');
    const patientNameInput = document.getElementById('patientName');
    const patientNumberInput = document.getElementById('patientNumber');
    const patientFormMessage = document.getElementById('patientFormMessage');
    const patientCardsContainer = document.getElementById('patientCardsContainer');

    // Logout Functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'index.html';
        });
    }

    // Function to display patient cards
    function displayPatientCards() {
        if (!patientCardsContainer) return;
        patientCardsContainer.innerHTML = ''; // Clear existing cards
        const patients = JSON.parse(localStorage.getItem('patients')) || [];

        if (patients.length === 0) {
            patientCardsContainer.innerHTML = '<p>No patient cards available. Add a new patient!</p>';
            return;
        }

        patients.forEach(patient => {
            const card = document.createElement('div');
            card.className = 'patient-card';
            card.innerHTML = `
                <h3>Patient Name: ${patient.name}</h3>
                <p>Patient Number: ${patient.number}</p>
                <div class="image-upload-area" id="upload-area-${patient.id}" data-patient-id="${patient.id}">
                    <p>Drag & Drop images here or click to select</p>
                    <input type="file" id="fileInput-${patient.id}" class="hidden-file-input" accept="image/*" multiple>
                    <div class="image-thumbnails-container" id="thumbnails-${patient.id}">
                        <!-- Thumbnails will be rendered here by renderImageThumbnails -->
                    </div>
                </div>
            `;
            patientCardsContainer.appendChild(card);

            const currentUploadArea = card.querySelector(`#upload-area-${patient.id}`);
            const currentFileInput = card.querySelector(`#fileInput-${patient.id}`);
            const currentThumbnailsContainer = card.querySelector(`#thumbnails-${patient.id}`);

            // Call renderImageThumbnails for this patient
            renderImageThumbnails(patient.id, currentThumbnailsContainer);

            // Setup event listeners for this card's upload area, passing elements directly
            setupUploadEventListeners(patient.id, currentUploadArea, currentFileInput);
        });
    }

    // Modified to accept elements directly
    function setupUploadEventListeners(patientId, uploadAreaElement, fileInputElement) {
        if (!uploadAreaElement || !fileInputElement) {
            console.error(`Could not find upload elements (uploadArea or fileInput) for patient ${patientId}. Listeners not attached.`);
            return;
        }

        // Click on area triggers file input
        // Replaced addEventListener with direct assignment for simplicity, can be reverted if specific listener features are needed
        uploadAreaElement.onclick = (e) => {
            // Prevent triggering click if a child element (like a button inside later) is clicked
            // or if the click is on an already uploaded image or its info.
            if (e.target === uploadAreaElement || e.target.tagName === 'P' && e.target.parentElement === uploadAreaElement) {
                 fileInputElement.click();
            }
        };

        fileInputElement.onchange = (event) => {
            handleImageUpload(patientId, event.target.files);
            event.target.value = null; // Reset file input
        };

        uploadAreaElement.ondragover = (event) => {
            event.preventDefault();
            uploadAreaElement.classList.add('dragover');
        };

        uploadAreaElement.ondragleave = (event) => {
            // No preventDefault needed here as it's not canceling a default action for dragleave itself
            uploadAreaElement.classList.remove('dragover');
        };

        uploadAreaElement.ondrop = (event) => {
            event.preventDefault();
            uploadAreaElement.classList.remove('dragover');
            const files = event.dataTransfer.files;
            handleImageUpload(patientId, files);
        };
    }


    function renderImageThumbnails(patientId, thumbnailsContainer) {
        if (!thumbnailsContainer) return;
        thumbnailsContainer.innerHTML = ''; // Clear existing thumbnails
        const patients = JSON.parse(localStorage.getItem('patients')) || [];
        const patient = patients.find(p => p.id === patientId);

        if (patient && patient.images && patient.images.length > 0) {
            patient.images.forEach(image => {
                const thumbnailWrapper = document.createElement('div');
                thumbnailWrapper.className = 'thumbnail-item';

                const imgElement = document.createElement('img');
                imgElement.src = image.src;
                imgElement.alt = image.name;
                imgElement.className = 'thumbnail-img';

                const nameElement = document.createElement('p');
                nameElement.textContent = image.name;
                nameElement.className = 'thumbnail-name';

                const dateElement = document.createElement('p');
                dateElement.textContent = `Uploaded: ${image.uploadDate}`;
                dateElement.className = 'thumbnail-date';

                thumbnailWrapper.appendChild(imgElement);
                thumbnailWrapper.appendChild(nameElement);
                thumbnailWrapper.appendChild(dateElement);
                thumbnailsContainer.appendChild(thumbnailWrapper);
            });
        } else {
            thumbnailsContainer.innerHTML = '<p class="no-images-text">No images uploaded yet.</p>';
        }
    }

    function handleImageUpload(patientId, files) {
        const patients = JSON.parse(localStorage.getItem('patients')) || [];
        const patientIndex = patients.findIndex(p => p.id === patientId);

        if (patientIndex === -1) {
            console.error("Patient not found for image upload");
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                // Optionally, display an error message to the user
                console.warn(`File ${file.name} is not an image.`);
                continue;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const newImage = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), // More unique ID
                    src: e.target.result,
                    name: file.name,
                    uploadDate: new Date().toLocaleDateString()
                };

                // Ensure patient.images array exists
                if (!patients[patientIndex].images) {
                    patients[patientIndex].images = [];
                }
                patients[patientIndex].images.push(newImage);
                localStorage.setItem('patients', JSON.stringify(patients));

                // Refresh only the specific patient's card or the whole list
                // For simplicity, re-rendering all cards. Could be optimized.
                displayPatientCards();
            };
            reader.onerror = (error) => {
                console.error("FileReader error: ", error);
            };
            reader.readAsDataURL(file);
        }
    }

    // "Add Patient" form submission
    if (newPatientForm) {
        newPatientForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = patientNameInput.value.trim();
            const number = patientNumberInput.value.trim();

            patientFormMessage.className = 'message-area'; // Reset classes
            patientFormMessage.textContent = '';

            if (!name || !number) {
                patientFormMessage.textContent = 'Patient name and number cannot be empty.';
                patientFormMessage.classList.add('error');
                return;
            }

            const newPatient = {
                id: Date.now(), // Simple unique ID
                name: name,
                number: number,
                images: [] // Initialize images array
            };

            let patients = JSON.parse(localStorage.getItem('patients')) || [];
            patients.push(newPatient);
            localStorage.setItem('patients', JSON.stringify(patients));

            patientFormMessage.textContent = 'Patient added successfully!';
            patientFormMessage.classList.add('success');
            newPatientForm.reset();
            displayPatientCards();

            // Clear message after a few seconds
            setTimeout(() => {
                patientFormMessage.textContent = '';
                patientFormMessage.className = 'message-area'; // Reset to base class
            }, 3000);
        });
    }

    // Initial Load
    displayPatientCards();

    // Image Viewer Modal Globals & Elements
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
    // const modifyImageButton = document.getElementById('modifyImageButton'); // For later

    let currentPatientIdForViewer = null;
    let currentImageIndexForViewer = -1;
    let currentImagesForViewer = [];
    let zoomLevel = 1;
    let rotationAngle = 0;

    // Panning state variables
    let isPanning = false;
    let panStartX, panStartY, initialImageX, initialImageY; // Renamed for clarity

    function applyTransform() {
        const fullImageView = document.getElementById('fullImageView');
        if (!fullImageView) return;

        if (zoomLevel === 1) {
            fullImageView.style.left = '';
            fullImageView.style.top = '';
            fullImageView.style.maxWidth = '100%'; // Restore initial fit constraint
            fullImageView.style.maxHeight = '100%';// Restore initial fit constraint
            fullImageView.style.transform = `scale(1) rotate(${rotationAngle}deg)`;
            fullImageView.style.cursor = 'default'; // Or 'grab' if preferred at 1x
        } else {
            fullImageView.style.maxWidth = 'none'; // Allow to exceed container for zoom
            fullImageView.style.maxHeight = 'none';// Allow to exceed container for zoom
            // Panning will set left/top. Transform only handles scale and rotate here.
            fullImageView.style.transform = `scale(${zoomLevel}) rotate(${rotationAngle}deg)`;
            fullImageView.style.cursor = 'grab';
        }
    }

    function openImageViewer(patientId, imageIndex) {
        if(fullImageView) { // Reset previous state if any
            fullImageView.style.left = '';
            fullImageView.style.top = '';
            delete fullImageView.originalPos; // If we were using this
        }
        currentPatientIdForViewer = patientId;
        const patients = JSON.parse(localStorage.getItem('patients')) || [];
        const patient = patients.find(p => p.id === patientId);

        if (!patient || !patient.images || patient.images.length === 0) {
            console.error("Patient or images not found for viewer.");
            return;
        }
        currentImagesForViewer = patient.images;
        currentImageIndexForViewer = imageIndex;

        if (currentImageIndexForViewer < 0 || currentImageIndexForViewer >= currentImagesForViewer.length) {
             console.error("Invalid image index.");
             currentImageIndexForViewer = 0; // Default to first image if index is bad
        }

        const image = currentImagesForViewer[currentImageIndexForViewer];

        zoomLevel = 1; // Reset zoom level for new image
        rotationAngle = 0; // Reset rotation for new image

        if(fullImageView) {
            fullImageView.src = image.src;
            // Initial cursor state will be set by applyTransform
        }
        if(imageNameInfo) imageNameInfo.textContent = image.name;
        if(imageDateInfo) imageDateInfo.textContent = image.uploadDate;

        applyTransform();
        updateViewerControls();
        if(imageViewerModal) imageViewerModal.style.display = 'flex';
    }

    function closeImageViewer() {
        if(imageViewerModal) imageViewerModal.style.display = 'none';
        if(fullImageView) {
            fullImageView.src = ''; // Clear image to free memory
            // Reset styles explicitly
            fullImageView.style.transform = 'scale(1) rotate(0deg)';
            fullImageView.style.left = '0px';
            fullImageView.style.top = '0px';
        }
        currentPatientIdForViewer = null;
        currentImageIndexForViewer = -1;
        currentImagesForViewer = [];
        isPanning = false; // Reset panning state
    }

    function updateViewerControls() {
        if(prevImageButton) prevImageButton.disabled = currentImageIndexForViewer <= 0;
        if(nextImageButton) nextImageButton.disabled = currentImageIndexForViewer >= currentImagesForViewer.length - 1;
    }

    if(closeModalButton) closeModalButton.addEventListener('click', closeImageViewer);

    if(prevImageButton) {
        prevImageButton.addEventListener('click', () => {
            if (currentImageIndexForViewer > 0) {
                openImageViewer(currentPatientIdForViewer, currentImageIndexForViewer - 1);
            }
        });
    }

    if(nextImageButton) {
        nextImageButton.addEventListener('click', () => {
            if (currentImageIndexForViewer < currentImagesForViewer.length - 1) {
                openImageViewer(currentPatientIdForViewer, currentImageIndexForViewer + 1);
            }
        });
    }

    if(zoomInButton) {
        zoomInButton.addEventListener('click', () => {
            zoomLevel = Math.min(5, zoomLevel + 0.2); // Cap at 5x, increment by 0.2
            applyTransform();
        });
    }

    if(zoomOutButton) {
        zoomOutButton.addEventListener('click', () => {
            zoomLevel = Math.max(0.2, zoomLevel - 0.2); // Min zoom 0.2x
            applyTransform();
        });
    }

    if(rotateLeftButton) {
        rotateLeftButton.addEventListener('click', () => {
            rotationAngle = (rotationAngle - 90) % 360;
            applyTransform();
        });
    }

    if(rotateRightButton) {
        rotateRightButton.addEventListener('click', () => {
            rotationAngle = (rotationAngle + 90) % 360;
            applyTransform();
        });
    }

    if(deleteImageButton) {
        deleteImageButton.addEventListener('click', () => {
            if (!currentPatientIdForViewer || currentImageIndexForViewer < 0) return;

            if (confirm('Are you sure you want to delete this image?')) {
                let patients = JSON.parse(localStorage.getItem('patients')) || [];
                const patientIndex = patients.findIndex(p => p.id === currentPatientIdForViewer);
                if (patientIndex !== -1) {
                    patients[patientIndex].images.splice(currentImageIndexForViewer, 1);
                    localStorage.setItem('patients', JSON.stringify(patients));
                    closeImageViewer();
                    displayPatientCards(); // Refresh the dashboard view
                }
            }
        });
    }

    // Panning Logic for fullImageView
    if(fullImageView) {
        fullImageView.addEventListener('mousedown', (e) => {
            if (zoomLevel > 1) {
                e.preventDefault();
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
                // Get current left/top. If not set (NaN), default to 0.
                initialImageX = parseFloat(fullImageView.style.left) || 0;
                initialImageY = parseFloat(fullImageView.style.top) || 0;
                fullImageView.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning && fullImageView && zoomLevel > 1) {
                e.preventDefault();
                const dx = e.clientX - panStartX;
                const dy = e.clientY - panStartY;
                fullImageView.style.left = `${initialImageX + dx}px`;
                fullImageView.style.top = `${initialImageY + dy}px`;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isPanning) {
                isPanning = false;
                if(fullImageView) {
                    fullImageView.style.cursor = (zoomLevel > 1) ? 'grab' : 'default';
                }
            }
        });

        // No need for mouseleave to stop panning if mouseup is on document.
        // If desired, it can be added to stop panning if mouse leaves modal content area.

        // Initial style for transform and position
        fullImageView.style.transformOrigin = 'center center';
        fullImageView.style.transition = 'transform 0.2s ease-out';
        fullImageView.style.position = 'relative'; // Needed for left/top panning
    }

});

// Update renderImageThumbnails to call openImageViewer
function renderImageThumbnails(patientId, thumbnailsContainer) {
    if (!thumbnailsContainer) return;
    thumbnailsContainer.innerHTML = ''; // Clear existing thumbnails
    const patients = JSON.parse(localStorage.getItem('patients')) || [];
    const patient = patients.find(p => p.id === patientId);

    if (patient && patient.images && patient.images.length > 0) {
        patient.images.forEach((image, index) => { // Added index
            const thumbnailWrapper = document.createElement('div');
            thumbnailWrapper.className = 'thumbnail-item';

            const imgElement = document.createElement('img');
            imgElement.src = image.src;
            imgElement.alt = image.name;
            imgElement.className = 'thumbnail-img';

            // Add click listener to the wrapper (thumbnailItem) to open viewer
            // and stop propagation to prevent uploadArea's click listener.
            thumbnailWrapper.addEventListener('click', (event) => {
                event.stopPropagation(); // Crucial to prevent event bubbling
                openImageViewer(patient.id, index);
            });

            const nameElement = document.createElement('p');
            nameElement.textContent = image.name;
            nameElement.className = 'thumbnail-name';

            const dateElement = document.createElement('p');
            dateElement.textContent = `Uploaded: ${image.uploadDate}`;
            dateElement.className = 'thumbnail-date';

            thumbnailWrapper.appendChild(imgElement);
            thumbnailWrapper.appendChild(nameElement);
            thumbnailWrapper.appendChild(dateElement);
            thumbnailsContainer.appendChild(thumbnailWrapper);
        });
    } else {
        thumbnailsContainer.innerHTML = '<p class="no-images-text">No images uploaded yet.</p>';
    }
}
