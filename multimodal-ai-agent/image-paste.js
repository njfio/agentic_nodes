/**
 * Image Paste functionality
 * Allows pasting images directly from clipboard
 */

const ImagePaste = {
  // Initialize the image paste functionality
  init() {
    // Set up event listeners
    this.setupEventListeners();
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Add paste event listener to the document
    document.addEventListener('paste', (e) => {
      // Only handle paste events when editing a node
      if (!App.editingNode) return;
      
      // Check if the node editor is open and the image content section is visible
      const imageContentSection = document.getElementById('imageContentSection');
      if (!imageContentSection || imageContentSection.style.display === 'none') return;
      
      // Get the clipboard items
      const items = e.clipboardData.items;
      
      // Find an image item
      let imageItem = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          imageItem = items[i];
          break;
        }
      }
      
      // If an image was found, process it
      if (imageItem) {
        const blob = imageItem.getAsFile();
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const imageUrl = event.target.result;
          
          // Update the image preview
          const imagePreview = document.getElementById('imagePreview');
          if (imagePreview) {
            imagePreview.src = imageUrl;
            imagePreview.style.display = 'block';
            
            // Update image info
            App.updateImageInfo(imageUrl);
          }
          
          // Update the node content
          App.editingNode.content = imageUrl;
          App.editingNode.contentType = 'image';
          
          // Preload the image for the node
          App.editingNode.contentImage = new Image();
          App.editingNode.contentImage.src = imageUrl;
          
          // Add load event listener to redraw when image loads
          App.editingNode.contentImage.onload = () => {
            // When image loads, update node size if auto-sizing is enabled
            if (App.editingNode.autoSize) {
              App.editingNode.calculateOptimalSize();
            }
          };
          
          DebugManager.addLog('Image pasted from clipboard', 'success');
        };
        
        reader.readAsDataURL(blob);
        
        // Prevent the default paste behavior
        e.preventDefault();
      }
    });
    
    // Add a paste button to the image content section
    const imageControls = document.querySelector('.image-controls');
    if (imageControls) {
      const pasteButton = document.createElement('button');
      pasteButton.id = 'pasteImageBtn';
      pasteButton.className = 'secondary-btn';
      pasteButton.type = 'button';
      pasteButton.textContent = 'Paste Image';
      
      pasteButton.addEventListener('click', () => {
        DebugManager.addLog('Press Ctrl+V to paste an image from clipboard', 'info');
      });
      
      imageControls.appendChild(pasteButton);
    }
  }
};

// Initialize the image paste functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    ImagePaste.init();
  }, 100);
});
