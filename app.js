document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('preview-container');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Global variables
    let selectedFiles = [];
    
    // Event Listeners
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    convertBtn.addEventListener('click', convertToPdf);
    clearBtn.addEventListener('click', clearAllImages);
    
    // Functions
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('highlight');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('highlight');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('highlight');
        
        const files = e.dataTransfer.files;
        processFiles(files);
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        processFiles(files);
    }
    
    function processFiles(files) {
        if (files.length === 0) return;
        
        // Filter only image files
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            showNotification('Please select valid image files', 'error');
            return;
        }
        
        // Add to selected files array
        imageFiles.forEach(file => {
            // Check if file already exists in the array
            const fileExists = selectedFiles.some(existingFile => 
                existingFile.name === file.name && 
                existingFile.size === file.size && 
                existingFile.lastModified === file.lastModified
            );
            
            if (!fileExists) {
                selectedFiles.push(file);
            }
        });
        
        // Update UI
        updateImagePreview();
        updateButtonStates();
        
        // Show notification
        showNotification(`${imageFiles.length} image(s) added successfully`, 'success');
    }
    
    function updateImagePreview() {
        // Clear current preview
        imagePreview.innerHTML = '';
        
        // Show preview container if there are files
        if (selectedFiles.length > 0) {
            previewContainer.style.display = 'block';
        } else {
            previewContainer.style.display = 'none';
            return;
        }
        
        // Add each image to preview
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = file.name;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeImage(index);
                });
                
                imageItem.appendChild(img);
                imageItem.appendChild(removeBtn);
                imagePreview.appendChild(imageItem);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    function removeImage(index) {
        selectedFiles.splice(index, 1);
        updateImagePreview();
        updateButtonStates();
    }
    
    function updateButtonStates() {
        if (selectedFiles.length > 0) {
            convertBtn.disabled = false;
            clearBtn.disabled = false;
        } else {
            convertBtn.disabled = true;
            clearBtn.disabled = true;
        }
    }
    
    function clearAllImages() {
        selectedFiles = [];
        updateImagePreview();
        updateButtonStates();
        showNotification('All images cleared', 'info');
    }
    
    function convertToPdf() {
        if (selectedFiles.length === 0) return;
        
        // Show loading state
        convertBtn.disabled = true;
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        
        setTimeout(() => {
            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                let currentPage = 0;
                
                const processImage = (index) => {
                    if (index >= selectedFiles.length) {
                        // All images processed, save the PDF
                        pdf.save('converted_images.pdf');
                        
                        // Reset button state
                        convertBtn.disabled = false;
                        convertBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Convert to PDF';
                        
                        showNotification('PDF created successfully!', 'success');
                        return;
                    }
                    
                    const file = selectedFiles[index];
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        const imgData = e.target.result;
                        
                        // Add new page if not the first image
                        if (currentPage > 0) {
                            pdf.addPage();
                        }
                        
                        // Calculate dimensions to fit the image properly
                        const img = new Image();
                        img.src = imgData;
                        
                        img.onload = function() {
                            const imgWidth = img.width;
                            const imgHeight = img.height;
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = pdf.internal.pageSize.getHeight();
                            
                            let finalWidth, finalHeight;
                            
                            if (imgWidth > imgHeight) {
                                // Landscape image
                                finalWidth = pdfWidth;
                                finalHeight = (imgHeight * pdfWidth) / imgWidth;
                            } else {
                                // Portrait image
                                finalHeight = pdfHeight;
                                finalWidth = (imgWidth * pdfHeight) / imgHeight;
                            }
                            
                            // Center the image
                            const xOffset = (pdfWidth - finalWidth) / 2;
                            const yOffset = (pdfHeight - finalHeight) / 2;
                            
                            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
                            currentPage++;
                            
                            // Process next image
                            processImage(index + 1);
                        };
                    };
                    
                    reader.readAsDataURL(file);
                };
                
                // Start processing from the first image
                processImage(0);
                
            } catch (error) {
                console.error('Error creating PDF:', error);
                showNotification('Error creating PDF. Please try again.', 'error');
                
                // Reset button state
                convertBtn.disabled = false;
                convertBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Convert to PDF';
            }
        }, 500); // Small delay to show loading state
    }
    
    // Notification system
    function showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
            
            // Add styles for notification container
            const style = document.createElement('style');
            style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                }
                
                .notification {
                    padding: 12px 20px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    color: white;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 300px;
                    max-width: 400px;
                    animation: slideIn 0.3s ease-out forwards;
                }
                
                .notification.success {
                    background-color: #28a745;
                }
                
                .notification.error {
                    background-color: #dc3545;
                }
                
                .notification.info {
                    background-color: #17a2b8;
                }
                
                .notification.warning {
                    background-color: #ffc107;
                    color: #343a40;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    margin-left: 10px;
                    font-size: 16px;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon based on type
        let icon;
        switch (type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            default:
                icon = 'fas fa-info-circle';
        }
        
        notification.innerHTML = `
            <div>
                <i class="${icon}"></i> ${message}
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Add close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.3s forwards';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }
});