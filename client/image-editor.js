/**
 * Basic Image Editor functionality
 * Provides simple image editing capabilities for nodes
 */

const ImageEditor = {
  // Properties
  canvas: null,
  ctx: null,
  image: null,
  originalImage: null,
  isEditing: false,
  editingNode: null,
  
  // Initialize the image editor
  init() {
    // Create the image editor modal
    this.createImageEditorModal();
    
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Create the image editor modal
  createImageEditorModal() {
    // Create the modal HTML
    const modalHTML = `
      <div id="imageEditorModal" class="modal">
        <div class="modal-content image-editor-modal">
          <h2>Image Editor</h2>
          <div class="image-editor-container">
            <canvas id="imageEditorCanvas"></canvas>
            <div class="image-editor-controls">
              <div class="control-group">
                <label>Adjustments</label>
                <div class="slider-control">
                  <span>Brightness:</span>
                  <input type="range" id="brightnessSlider" min="-100" max="100" value="0">
                  <span id="brightnessValue">0</span>
                </div>
                <div class="slider-control">
                  <span>Contrast:</span>
                  <input type="range" id="contrastSlider" min="-100" max="100" value="0">
                  <span id="contrastValue">0</span>
                </div>
                <div class="slider-control">
                  <span>Saturation:</span>
                  <input type="range" id="saturationSlider" min="-100" max="100" value="0">
                  <span id="saturationValue">0</span>
                </div>
              </div>
              <div class="control-group">
                <label>Filters</label>
                <div class="filter-buttons">
                  <button id="filterNone" class="filter-btn active" type="button">None</button>
                  <button id="filterGrayscale" class="filter-btn" type="button">Grayscale</button>
                  <button id="filterSepia" class="filter-btn" type="button">Sepia</button>
                  <button id="filterInvert" class="filter-btn" type="button">Invert</button>
                </div>
              </div>
              <div class="control-group">
                <label>Crop & Resize</label>
                <div class="crop-controls">
                  <button id="cropBtn" class="secondary-btn" type="button">Crop</button>
                  <button id="resetCropBtn" class="secondary-btn" type="button">Reset</button>
                </div>
                <div class="resize-controls">
                  <div class="input-group">
                    <label for="resizeWidth">Width:</label>
                    <input type="number" id="resizeWidth" min="1" max="2000">
                  </div>
                  <div class="input-group">
                    <label for="resizeHeight">Height:</label>
                    <input type="number" id="resizeHeight" min="1" max="2000">
                  </div>
                  <button id="resizeBtn" class="secondary-btn" type="button">Resize</button>
                </div>
              </div>
            </div>
          </div>
          <div class="button-group">
            <button id="applyImageEdit" class="primary-btn" type="button">Apply</button>
            <button id="resetImageEdit" class="secondary-btn" type="button">Reset</button>
            <button id="cancelImageEdit" class="secondary-btn" type="button">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Get the canvas and context
    this.canvas = document.getElementById('imageEditorCanvas');
    this.ctx = this.canvas.getContext('2d');
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Add edit button to the image content section
    const imageControls = document.querySelector('.image-controls');
    if (imageControls) {
      const editButton = document.createElement('button');
      editButton.id = 'editImageBtn';
      editButton.className = 'secondary-btn';
      editButton.type = 'button';
      editButton.textContent = 'Edit Image';
      
      editButton.addEventListener('click', () => {
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview && imagePreview.src) {
          this.openEditor(imagePreview.src);
        } else {
          DebugManager.addLog('No image to edit', 'error');
        }
      });
      
      imageControls.appendChild(editButton);
    }
    
    // Set up modal buttons
    document.getElementById('applyImageEdit').addEventListener('click', () => {
      this.applyChanges();
    });
    
    document.getElementById('resetImageEdit').addEventListener('click', () => {
      this.resetChanges();
    });
    
    document.getElementById('cancelImageEdit').addEventListener('click', () => {
      this.closeEditor();
    });
    
    // Set up adjustment sliders
    document.getElementById('brightnessSlider').addEventListener('input', (e) => {
      document.getElementById('brightnessValue').textContent = e.target.value;
      this.applyFilters();
    });
    
    document.getElementById('contrastSlider').addEventListener('input', (e) => {
      document.getElementById('contrastValue').textContent = e.target.value;
      this.applyFilters();
    });
    
    document.getElementById('saturationSlider').addEventListener('input', (e) => {
      document.getElementById('saturationValue').textContent = e.target.value;
      this.applyFilters();
    });
    
    // Set up filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active');
        });
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Apply the selected filter
        this.applyFilters();
      });
    });
    
    // Set up crop button
    document.getElementById('cropBtn').addEventListener('click', () => {
      this.startCropping();
    });
    
    document.getElementById('resetCropBtn').addEventListener('click', () => {
      this.resetCrop();
    });
    
    // Set up resize button
    document.getElementById('resizeBtn').addEventListener('click', () => {
      this.resizeImage();
    });
  },
  
  // Open the image editor
  openEditor(imageSrc) {
    // Store the editing node
    this.editingNode = App.editingNode;
    
    // Load the image
    this.image = new Image();
    this.image.onload = () => {
      // Store the original image for reset
      this.originalImage = this.image.cloneNode(true);
      
      // Set the canvas size to match the image
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      
      // Draw the image on the canvas
      this.ctx.drawImage(this.image, 0, 0);
      
      // Set the resize input values
      document.getElementById('resizeWidth').value = this.image.width;
      document.getElementById('resizeHeight').value = this.image.height;
      
      // Show the modal
      ModalManager.openModal('imageEditorModal');
      
      // Set editing flag
      this.isEditing = true;
    };
    
    this.image.src = imageSrc;
  },
  
  // Close the image editor
  closeEditor() {
    ModalManager.closeModal('imageEditorModal');
    this.isEditing = false;
    this.editingNode = null;
    this.image = null;
    this.originalImage = null;
  },
  
  // Apply the current filters to the image
  applyFilters() {
    // Get the filter values
    const brightness = parseInt(document.getElementById('brightnessSlider').value);
    const contrast = parseInt(document.getElementById('contrastSlider').value);
    const saturation = parseInt(document.getElementById('saturationSlider').value);
    
    // Get the selected filter
    let filter = 'none';
    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.classList.contains('active')) {
        filter = btn.id.replace('filter', '').toLowerCase();
      }
    });
    
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw the original image
    this.ctx.drawImage(this.image, 0, 0);
    
    // Apply brightness/contrast/saturation
    if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        if (brightness !== 0) {
          data[i] = this.clamp(data[i] + brightness * 2.55);
          data[i + 1] = this.clamp(data[i + 1] + brightness * 2.55);
          data[i + 2] = this.clamp(data[i + 2] + brightness * 2.55);
        }
        
        // Apply contrast
        if (contrast !== 0) {
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          data[i] = this.clamp(factor * (data[i] - 128) + 128);
          data[i + 1] = this.clamp(factor * (data[i + 1] - 128) + 128);
          data[i + 2] = this.clamp(factor * (data[i + 2] - 128) + 128);
        }
        
        // Apply saturation
        if (saturation !== 0) {
          const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
          const factor = 1 + saturation / 100;
          
          data[i] = this.clamp(gray + factor * (data[i] - gray));
          data[i + 1] = this.clamp(gray + factor * (data[i + 1] - gray));
          data[i + 2] = this.clamp(gray + factor * (data[i + 2] - gray));
        }
      }
      
      this.ctx.putImageData(imageData, 0, 0);
    }
    
    // Apply selected filter
    if (filter !== 'none') {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        switch (filter) {
          case 'grayscale':
            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            break;
            
          case 'sepia':
            data[i] = this.clamp(0.393 * r + 0.769 * g + 0.189 * b);
            data[i + 1] = this.clamp(0.349 * r + 0.686 * g + 0.168 * b);
            data[i + 2] = this.clamp(0.272 * r + 0.534 * g + 0.131 * b);
            break;
            
          case 'invert':
            data[i] = 255 - r;
            data[i + 1] = 255 - g;
            data[i + 2] = 255 - b;
            break;
        }
      }
      
      this.ctx.putImageData(imageData, 0, 0);
    }
  },
  
  // Clamp a value between 0 and 255
  clamp(value) {
    return Math.max(0, Math.min(255, value));
  },
  
  // Start the cropping process
  startCropping() {
    // TODO: Implement cropping functionality
    DebugManager.addLog('Cropping functionality coming soon', 'info');
  },
  
  // Reset the crop
  resetCrop() {
    // TODO: Implement crop reset
    DebugManager.addLog('Crop reset functionality coming soon', 'info');
  },
  
  // Resize the image
  resizeImage() {
    const width = parseInt(document.getElementById('resizeWidth').value);
    const height = parseInt(document.getElementById('resizeHeight').value);
    
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      DebugManager.addLog('Invalid dimensions for resize', 'error');
      return;
    }
    
    // Create a temporary canvas for resizing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw the current canvas content onto the temporary canvas
    tempCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, width, height);
    
    // Update the editor canvas
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(tempCanvas, 0, 0);
    
    DebugManager.addLog(`Image resized to ${width}x${height}`, 'success');
  },
  
  // Apply the changes to the image
  applyChanges() {
    if (!this.isEditing || !this.editingNode) return;
    
    // Convert the canvas to a data URL
    const dataURL = this.canvas.toDataURL('image/png');
    
    // Update the image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
      imagePreview.src = dataURL;
      imagePreview.style.display = 'block';
    }
    
    // Update the node content
    this.editingNode.content = dataURL;
    this.editingNode.contentType = 'image';
    
    // Preload the image for the node
    this.editingNode.contentImage = new Image();
    this.editingNode.contentImage.src = dataURL;
    
    // Add load event listener to redraw when image loads
    this.editingNode.contentImage.onload = () => {
      // When image loads, update node size if auto-sizing is enabled
      if (this.editingNode.autoSize) {
        this.editingNode.calculateOptimalSize();
      }
      // Force a redraw to show the image
      App.draw();
    };
    
    // Close the editor
    this.closeEditor();
    
    DebugManager.addLog('Image changes applied', 'success');
  },
  
  // Reset the changes
  resetChanges() {
    if (!this.originalImage) return;
    
    // Reset the canvas size
    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    
    // Draw the original image
    this.ctx.drawImage(this.originalImage, 0, 0);
    
    // Reset the sliders
    document.getElementById('brightnessSlider').value = 0;
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastSlider').value = 0;
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationSlider').value = 0;
    document.getElementById('saturationValue').textContent = '0';
    
    // Reset the filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById('filterNone').classList.add('active');
    
    // Reset the resize input values
    document.getElementById('resizeWidth').value = this.originalImage.width;
    document.getElementById('resizeHeight').value = this.originalImage.height;
    
    DebugManager.addLog('Image changes reset', 'info');
  }
};

// Initialize the image editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    ImageEditor.init();
  }, 100);
});
