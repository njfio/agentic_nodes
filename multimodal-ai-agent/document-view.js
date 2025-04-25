/**
 * Document View functionality
 * Provides a consolidated view of all node outputs in a document format
 */

const DocumentView = {
  // Properties
  isOpen: false,
  includedNodes: new Set(),
  
  // Initialize the document view
  init() {
    // Create the document view modal
    this.createDocumentViewModal();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add the document view button to the toolbar
    this.addDocumentViewButton();
    
    // Add the include in document checkbox to the node editor
    this.addIncludeInDocumentCheckbox();
  },
  
  // Create the document view modal
  createDocumentViewModal() {
    // Create the modal HTML
    const modalHTML = `
      <div id="documentViewModal" class="modal">
        <div class="modal-content document-view-modal">
          <h2>Document View</h2>
          <div class="document-view-toolbar">
            <div class="document-view-actions">
              <button id="refreshDocumentBtn" class="secondary-btn" type="button">Refresh</button>
              <button id="exportDocumentBtn" class="secondary-btn" type="button">Export</button>
              <button id="copyDocumentBtn" class="secondary-btn" type="button">Copy</button>
            </div>
            <div class="document-view-options">
              <div class="checkbox-group">
                <input type="checkbox" id="showNodeTitles" checked>
                <label for="showNodeTitles">Show Node Titles</label>
              </div>
              <div class="checkbox-group">
                <input type="checkbox" id="showNodeIds">
                <label for="showNodeIds">Show Node IDs</label>
              </div>
              <div class="checkbox-group">
                <input type="checkbox" id="includeImages" checked>
                <label for="includeImages">Include Images</label>
              </div>
            </div>
          </div>
          <div class="document-view-container">
            <div id="documentContent" class="document-content"></div>
          </div>
          <div class="button-group">
            <button id="closeDocumentView" class="secondary-btn" type="button">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Add the modal to the document
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Close button
    document.getElementById('closeDocumentView').addEventListener('click', () => {
      this.closeDocumentView();
    });
    
    // Refresh button
    document.getElementById('refreshDocumentBtn').addEventListener('click', () => {
      this.refreshDocument();
    });
    
    // Export button
    document.getElementById('exportDocumentBtn').addEventListener('click', () => {
      this.exportDocument();
    });
    
    // Copy button
    document.getElementById('copyDocumentBtn').addEventListener('click', () => {
      this.copyDocument();
    });
    
    // Document view options
    document.getElementById('showNodeTitles').addEventListener('change', () => {
      this.refreshDocument();
    });
    
    document.getElementById('showNodeIds').addEventListener('change', () => {
      this.refreshDocument();
    });
    
    document.getElementById('includeImages').addEventListener('change', () => {
      this.refreshDocument();
    });
  },
  
  // Add the document view button to the toolbar
  addDocumentViewButton() {
    // Create the button
    const documentViewBtn = document.createElement('button');
    documentViewBtn.id = 'documentViewBtn';
    documentViewBtn.type = 'button';
    documentViewBtn.textContent = 'Document View';
    
    // Add click event listener
    documentViewBtn.addEventListener('click', () => {
      this.openDocumentView();
    });
    
    // Add the button to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      // Insert after the test workflow button
      const testWorkflowBtn = document.getElementById('testWorkflowBtn');
      if (testWorkflowBtn) {
        toolbar.insertBefore(documentViewBtn, testWorkflowBtn.nextSibling);
      } else {
        toolbar.appendChild(documentViewBtn);
      }
    }
  },
  
  // Add the include in document checkbox to the node editor
  addIncludeInDocumentCheckbox() {
    // Find the auto-size checkbox group in the node editor
    const autoSizeGroup = document.querySelector('#nodeEditorForm .checkbox-group');
    
    if (autoSizeGroup) {
      // Create a new checkbox group
      const includeInDocGroup = document.createElement('div');
      includeInDocGroup.className = 'checkbox-group';
      includeInDocGroup.innerHTML = `
        <input type="checkbox" id="includeInDocument" checked>
        <label for="includeInDocument">Include in document output</label>
      `;
      
      // Insert after the auto-size checkbox group
      autoSizeGroup.parentNode.insertBefore(includeInDocGroup, autoSizeGroup.nextSibling);
      
      // Add event listener to update the node property when the checkbox changes
      document.getElementById('includeInDocument').addEventListener('change', (e) => {
        if (App.editingNode) {
          App.editingNode.includeInDocument = e.target.checked;
        }
      });
    }
  },
  
  // Open the document view
  openDocumentView() {
    // Update the document content
    this.refreshDocument();
    
    // Show the modal
    ModalManager.openModal('documentViewModal');
    
    // Set the flag
    this.isOpen = true;
  },
  
  // Close the document view
  closeDocumentView() {
    // Hide the modal
    ModalManager.closeModal('documentViewModal');
    
    // Reset the flag
    this.isOpen = false;
  },
  
  // Refresh the document content
  refreshDocument() {
    const documentContent = document.getElementById('documentContent');
    if (!documentContent) return;
    
    // Clear the content
    documentContent.innerHTML = '';
    
    // Get the options
    const showNodeTitles = document.getElementById('showNodeTitles').checked;
    const showNodeIds = document.getElementById('showNodeIds').checked;
    const includeImages = document.getElementById('includeImages').checked;
    
    // Get all nodes that have been processed and are included in the document
    const includedNodes = App.nodes.filter(node => 
      node.hasBeenProcessed && 
      (node.includeInDocument === undefined || node.includeInDocument === true)
    );
    
    // Sort nodes by their position (top to bottom, left to right)
    includedNodes.sort((a, b) => {
      // First sort by y position (top to bottom)
      if (Math.abs(a.y - b.y) > 50) {
        return a.y - b.y;
      }
      // If y positions are similar, sort by x position (left to right)
      return a.x - b.x;
    });
    
    // If no nodes are included, show a message
    if (includedNodes.length === 0) {
      documentContent.innerHTML = '<div class="no-content-message">No processed nodes to display. Process some nodes first or check "Include in document output" for nodes.</div>';
      return;
    }
    
    // Create a document fragment to build the content
    const fragment = document.createDocumentFragment();
    
    // Add each node's content to the document
    includedNodes.forEach(node => {
      // Create a section for the node
      const section = document.createElement('div');
      section.className = 'document-section';
      
      // Add the node header if titles or IDs are shown
      if (showNodeTitles || showNodeIds) {
        const header = document.createElement('div');
        header.className = 'document-section-header';
        
        let headerText = '';
        if (showNodeTitles) {
          headerText += node.title || 'Untitled Node';
        }
        if (showNodeIds) {
          headerText += showNodeTitles ? ` (ID: ${node.id})` : `Node ID: ${node.id}`;
        }
        
        header.textContent = headerText;
        section.appendChild(header);
      }
      
      // Add the node content based on its type
      const content = document.createElement('div');
      content.className = 'document-section-content';
      
      switch (node.contentType) {
        case 'text':
          content.textContent = node.content || '';
          break;
          
        case 'image':
          if (includeImages && node.content) {
            const img = document.createElement('img');
            img.src = node.content;
            img.alt = node.title || `Image from node ${node.id}`;
            img.className = 'document-image';
            content.appendChild(img);
          } else if (!includeImages) {
            content.innerHTML = '<em>[Image content hidden]</em>';
          }
          break;
          
        case 'audio':
          content.innerHTML = '<em>[Audio content]</em>';
          break;
          
        case 'video':
          content.innerHTML = '<em>[Video content]</em>';
          break;
          
        default:
          content.textContent = node.content || '';
      }
      
      section.appendChild(content);
      fragment.appendChild(section);
    });
    
    // Add the fragment to the document content
    documentContent.appendChild(fragment);
  },
  
  // Export the document as HTML
  exportDocument() {
    // Get the document content
    const documentContent = document.getElementById('documentContent');
    if (!documentContent) return;
    
    // Create a new HTML document
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exported Document</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .document-section {
            margin-bottom: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
          }
          .document-section:last-child {
            border-bottom: none;
          }
          .document-section-header {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #4a90e2;
          }
          .document-section-content {
            white-space: pre-wrap;
          }
          .document-image {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        </style>
      </head>
      <body>
        <h1>Exported Document</h1>
        <div class="document-content">
          ${documentContent.innerHTML}
        </div>
      </body>
      </html>
    `;
    
    // Create a blob with the HTML content
    const blob = new Blob([html], { type: 'text/html' });
    
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `document-${new Date().toISOString().slice(0, 10)}.html`;
    
    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    DebugManager.addLog('Document exported as HTML', 'success');
  },
  
  // Copy the document content to clipboard
  copyDocument() {
    // Get the document content
    const documentContent = document.getElementById('documentContent');
    if (!documentContent) return;
    
    // Create a temporary textarea to copy the content
    const textarea = document.createElement('textarea');
    textarea.value = this.getPlainTextContent(documentContent);
    
    // Make the textarea invisible
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    
    // Add it to the document
    document.body.appendChild(textarea);
    
    // Select and copy the content
    textarea.select();
    document.execCommand('copy');
    
    // Remove the textarea
    document.body.removeChild(textarea);
    
    DebugManager.addLog('Document content copied to clipboard', 'success');
  },
  
  // Get plain text content from the document
  getPlainTextContent(element) {
    // Get the options
    const showNodeTitles = document.getElementById('showNodeTitles').checked;
    const showNodeIds = document.getElementById('showNodeIds').checked;
    
    // Get all sections
    const sections = element.querySelectorAll('.document-section');
    
    // Build the plain text content
    let text = '';
    
    sections.forEach(section => {
      // Add the header if present
      const header = section.querySelector('.document-section-header');
      if (header && (showNodeTitles || showNodeIds)) {
        text += header.textContent + '\n';
        text += '='.repeat(header.textContent.length) + '\n\n';
      }
      
      // Add the content
      const content = section.querySelector('.document-section-content');
      if (content) {
        // If it's an image, add a placeholder
        if (content.querySelector('.document-image')) {
          text += '[Image content]\n\n';
        } else {
          text += content.textContent + '\n\n';
        }
      }
    });
    
    return text;
  }
};

// Add the includeInDocument property to the Node class
Object.defineProperty(Node.prototype, 'includeInDocument', {
  get: function() {
    return this._includeInDocument !== false; // Default to true
  },
  set: function(value) {
    this._includeInDocument = value;
  }
});

// Modify the saveNode method to save the includeInDocument property
const originalSaveNode = App.saveNode;
App.saveNode = function() {
  // Get the includeInDocument checkbox value
  const includeInDocumentCheckbox = document.getElementById('includeInDocument');
  if (includeInDocumentCheckbox && this.editingNode) {
    this.editingNode.includeInDocument = includeInDocumentCheckbox.checked;
  }
  
  // Call the original saveNode method
  return originalSaveNode.call(this);
};

// Modify the openNodeEditor method to update the includeInDocument checkbox
const originalOpenNodeEditor = App.openNodeEditor;
App.openNodeEditor = function(node) {
  // Call the original openNodeEditor method
  originalOpenNodeEditor.call(this, node);
  
  // Update the includeInDocument checkbox
  const includeInDocumentCheckbox = document.getElementById('includeInDocument');
  if (includeInDocumentCheckbox && this.editingNode) {
    includeInDocumentCheckbox.checked = this.editingNode.includeInDocument;
  }
};

// Initialize the document view when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize after the App is initialized
  setTimeout(() => {
    DocumentView.init();
  }, 100);
});
