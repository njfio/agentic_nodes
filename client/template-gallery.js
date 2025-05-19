/**
 * Template Gallery
 * 
 * This module provides a gallery of workflow templates that users can browse,
 * preview, and load into their canvas.
 */

// Initialize the Template Gallery when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Template Gallery
  TemplateGallery.init();
});

const TemplateGallery = {
  // Template categories
  categories: [
    { id: 'featured', name: 'Featured' },
    { id: 'text', name: 'Text Processing' },
    { id: 'image', name: 'Image Processing' },
    { id: 'chat', name: 'Conversational' },
    { id: 'multimodal', name: 'Multimodal' },
    { id: 'logic', name: 'Logic & Flow Control' },
    { id: 'community', name: 'Community' }
  ],
  
  // Current active category
  activeCategory: 'featured',
  
  // Initialize the Template Gallery
  init() {
    // Create the gallery modal
    this.createGalleryModal();
    
    // Add event listeners
    this.addEventListeners();
    
    // Log initialization
    console.log('Template Gallery initialized');
  },
  
  // Create the gallery modal
  createGalleryModal() {
    // Create the modal element if it doesn't exist
    if (!document.getElementById('templateGalleryModal')) {
      const modal = document.createElement('div');
      modal.id = 'templateGalleryModal';
      modal.className = 'modal';
      
      // Create the modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content template-gallery-modal';
      
      // Create the header
      const header = document.createElement('div');
      header.className = 'template-gallery-header';
      
      const title = document.createElement('h2');
      title.textContent = 'Template Gallery';
      
      const searchContainer = document.createElement('div');
      searchContainer.className = 'template-search-container';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.id = 'templateSearch';
      searchInput.placeholder = 'Search templates...';
      
      searchContainer.appendChild(searchInput);
      
      header.appendChild(title);
      header.appendChild(searchContainer);
      
      // Create the categories section
      const categoriesSection = document.createElement('div');
      categoriesSection.className = 'template-categories';
      
      this.categories.forEach(category => {
        const categoryBtn = document.createElement('button');
        categoryBtn.className = 'template-category-btn';
        categoryBtn.setAttribute('data-category', category.id);
        categoryBtn.textContent = category.name;
        
        if (category.id === this.activeCategory) {
          categoryBtn.classList.add('active');
        }
        
        categoriesSection.appendChild(categoryBtn);
      });
      
      // Create the templates container
      const templatesContainer = document.createElement('div');
      templatesContainer.className = 'templates-container';
      templatesContainer.id = 'templatesContainer';
      
      // Create the footer
      const footer = document.createElement('div');
      footer.className = 'template-gallery-footer';
      
      const closeBtn = document.createElement('button');
      closeBtn.id = 'closeTemplateGallery';
      closeBtn.className = 'secondary-btn';
      closeBtn.textContent = 'Close';
      
      const createBtn = document.createElement('button');
      createBtn.id = 'createCustomTemplate';
      createBtn.className = 'primary-btn';
      createBtn.textContent = 'Create Custom Template';
      
      footer.appendChild(closeBtn);
      footer.appendChild(createBtn);
      
      // Assemble the modal
      modalContent.appendChild(header);
      modalContent.appendChild(categoriesSection);
      modalContent.appendChild(templatesContainer);
      modalContent.appendChild(footer);
      
      modal.appendChild(modalContent);
      
      // Add the modal to the document
      document.body.appendChild(modal);
    }
  },
  
  // Add event listeners
  addEventListeners() {
    // Button to open the gallery
    const openGalleryBtn = document.getElementById('templateGalleryBtn');
    if (!openGalleryBtn) {
      // Create the button if it doesn't exist
      const toolbar = document.getElementById('toolbar');
      if (toolbar) {
        const galleryBtn = document.createElement('button');
        galleryBtn.id = 'templateGalleryBtn';
        galleryBtn.type = 'button';
        galleryBtn.title = 'Template Gallery';
        galleryBtn.textContent = 'Template Gallery';
        
        // Insert after the template generator button
        const templateGeneratorBtn = document.getElementById('templateGeneratorBtn');
        if (templateGeneratorBtn && templateGeneratorBtn.parentNode) {
          templateGeneratorBtn.parentNode.insertBefore(galleryBtn, templateGeneratorBtn.nextSibling);
        } else {
          toolbar.appendChild(galleryBtn);
        }
        
        galleryBtn.addEventListener('click', () => this.openGallery());
      }
    } else {
      openGalleryBtn.addEventListener('click', () => this.openGallery());
    }
    
    // Button to close the gallery
    const closeBtn = document.getElementById('closeTemplateGallery');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeGallery());
    }
    
    // Button to create a custom template
    const createBtn = document.getElementById('createCustomTemplate');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.closeGallery();
        if (typeof TemplateGenerator !== 'undefined') {
          TemplateGenerator.openModal();
        }
      });
    }
    
    // Category buttons
    const categoryBtns = document.querySelectorAll('.template-category-btn');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.getAttribute('data-category');
        this.setActiveCategory(category);
      });
    });
    
    // Search input
    const searchInput = document.getElementById('templateSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTemplates(e.target.value);
      });
    }
  },
  
  // Open the gallery
  openGallery() {
    const modal = document.getElementById('templateGalleryModal');
    if (modal) {
      modal.style.display = 'block';
      
      // Load templates for the active category
      this.loadTemplates(this.activeCategory);
    }
  },
  
  // Close the gallery
  closeGallery() {
    const modal = document.getElementById('templateGalleryModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },
  
  // Set the active category
  setActiveCategory(category) {
    this.activeCategory = category;
    
    // Update the active button
    const categoryBtns = document.querySelectorAll('.template-category-btn');
    categoryBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-category') === category) {
        btn.classList.add('active');
      }
    });
    
    // Load templates for the category
    this.loadTemplates(category);
  },
  
  // Load templates for a category
  loadTemplates(category) {
    const container = document.getElementById('templatesContainer');
    if (!container) return;
    
    // Clear the container
    container.innerHTML = '';
    
    // Show loading indicator
    const loading = document.createElement('div');
    loading.className = 'templates-loading';
    loading.innerHTML = '<div class="spinner"></div><p>Loading templates...</p>';
    container.appendChild(loading);
    
    // Get templates for the category
    this.getTemplatesForCategory(category)
      .then(templates => {
        // Remove loading indicator
        container.removeChild(loading);
        
        if (templates.length === 0) {
          // Show no templates message
          const noTemplates = document.createElement('div');
          noTemplates.className = 'no-templates';
          noTemplates.textContent = 'No templates found for this category.';
          container.appendChild(noTemplates);
          return;
        }
        
        // Create template cards
        templates.forEach(template => {
          const card = this.createTemplateCard(template);
          container.appendChild(card);
        });
      })
      .catch(error => {
        // Remove loading indicator
        container.removeChild(loading);
        
        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'templates-error';
        errorMsg.textContent = `Error loading templates: ${error.message}`;
        container.appendChild(errorMsg);
      });
  },
  
  // Get templates for a category
  async getTemplatesForCategory(category) {
    // For now, we'll use the sample templates from TemplateGenerator
    // In a real implementation, this would fetch templates from a server
    
    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get templates from TemplateGenerator
    let templates = [];
    
    if (typeof TemplateGenerator !== 'undefined' && TemplateGenerator.sampleTemplates) {
      // Convert sample templates to our format
      for (const [key, value] of Object.entries(TemplateGenerator.sampleTemplates)) {
        templates.push({
          id: key,
          name: this.formatTemplateName(key),
          description: value.description,
          category: this.getCategoryForTemplate(key),
          template: value.template,
          featured: ['image-analysis', 'chat-bot'].includes(key),
          author: 'System',
          created: new Date().toISOString()
        });
      }
      
      // Filter by category
      if (category !== 'featured') {
        templates = templates.filter(t => t.category === category);
      } else {
        templates = templates.filter(t => t.featured);
      }
    }
    
    // Add some additional templates for demonstration
    if (category === 'text' || category === 'featured') {
      templates.push({
        id: 'document-qa',
        name: 'Document Q&A',
        description: 'A workflow that allows users to ask questions about a document and get accurate answers.',
        category: 'text',
        featured: true,
        author: 'System',
        created: new Date().toISOString(),
        template: {
          nodes: [
            {
              id: 1,
              title: "Document Input",
              x: 100,
              y: 100,
              contentType: "text",
              aiProcessor: "text-to-text",
              systemPrompt: "This is the document that will be analyzed.",
              workflowRole: "input"
            },
            {
              id: 2,
              title: "Question Input",
              x: 100,
              y: 300,
              contentType: "text",
              aiProcessor: "text-to-text",
              systemPrompt: "This is the user's question about the document."
            },
            {
              id: 3,
              title: "Document Analysis",
              x: 400,
              y: 100,
              contentType: "text",
              aiProcessor: "text-to-text",
              systemPrompt: "Extract key information from the document that might be relevant to answering questions."
            },
            {
              id: 4,
              title: "Answer Generation",
              x: 700,
              y: 200,
              contentType: "text",
              aiProcessor: "text-to-text",
              systemPrompt: "Based on the document analysis and the user's question, provide a concise and accurate answer.",
              workflowRole: "output"
            }
          ],
          connections: [
            { fromNodeId: 1, toNodeId: 3 },
            { fromNodeId: 2, toNodeId: 4 },
            { fromNodeId: 3, toNodeId: 4 }
          ]
        }
      });
    }
    
    return templates;
  },
  
  // Create a template card
  createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.setAttribute('data-template-id', template.id);
    
    const header = document.createElement('div');
    header.className = 'template-card-header';
    
    const title = document.createElement('h3');
    title.className = 'template-card-title';
    title.textContent = template.name;
    
    const author = document.createElement('div');
    author.className = 'template-card-author';
    author.textContent = `By ${template.author}`;
    
    header.appendChild(title);
    header.appendChild(author);
    
    const description = document.createElement('div');
    description.className = 'template-card-description';
    description.textContent = template.description;
    
    const preview = document.createElement('div');
    preview.className = 'template-card-preview';
    
    // Create a simple preview of the template
    const nodeCount = template.template.nodes.length;
    const connectionCount = template.template.connections.length;
    
    preview.innerHTML = `
      <div class="template-preview-stats">
        <div class="preview-stat">
          <span class="preview-stat-value">${nodeCount}</span>
          <span class="preview-stat-label">Nodes</span>
        </div>
        <div class="preview-stat">
          <span class="preview-stat-value">${connectionCount}</span>
          <span class="preview-stat-label">Connections</span>
        </div>
      </div>
      <div class="template-preview-canvas">
        ${this.generatePreviewSVG(template.template)}
      </div>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'template-card-actions';
    
    const useBtn = document.createElement('button');
    useBtn.className = 'template-use-btn';
    useBtn.textContent = 'Use Template';
    useBtn.addEventListener('click', () => {
      this.useTemplate(template);
    });
    
    const previewBtn = document.createElement('button');
    previewBtn.className = 'template-preview-btn';
    previewBtn.textContent = 'Preview';
    previewBtn.addEventListener('click', () => {
      this.previewTemplate(template);
    });
    
    actions.appendChild(previewBtn);
    actions.appendChild(useBtn);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(preview);
    card.appendChild(actions);
    
    return card;
  },
  
  // Generate a simple SVG preview of the template
  generatePreviewSVG(template) {
    const nodes = template.nodes;
    const connections = template.connections;
    
    // Calculate the bounds of the template
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + 200); // Assuming node width is 200
      maxY = Math.max(maxY, node.y + 100); // Assuming node height is 100
    });
    
    // Add some padding
    minX -= 20;
    minY -= 20;
    maxX += 20;
    maxY += 20;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Create the SVG
    let svg = `<svg width="100%" height="100%" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add connections
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.fromNodeId);
      const toNode = nodes.find(n => n.id === conn.toNodeId);
      
      if (fromNode && toNode) {
        const fromX = fromNode.x + 200; // Right side of from node
        const fromY = fromNode.y + 50; // Middle of from node
        const toX = toNode.x; // Left side of to node
        const toY = toNode.y + 50; // Middle of to node
        
        svg += `<path d="M${fromX},${fromY} C${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}" stroke="#666" stroke-width="2" fill="none" />`;
      }
    });
    
    // Add nodes
    nodes.forEach(node => {
      const x = node.x;
      const y = node.y;
      const width = 200;
      const height = 100;
      
      // Determine node color based on type
      let color = '#555';
      if (node.workflowRole === 'input') {
        color = '#4CAF50';
      } else if (node.workflowRole === 'output') {
        color = '#2196F3';
      } else if (node.contentType === 'image') {
        color = '#9C27B0';
      } else if (node.contentType === 'chat') {
        color = '#FF9800';
      }
      
      svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" ry="5" fill="${color}" opacity="0.8" />`;
    });
    
    svg += '</svg>';
    
    return svg;
  },
  
  // Use a template
  useTemplate(template) {
    try {
      // Check if the template has the required structure
      if (!template.template.nodes || !template.template.connections) {
        throw new Error('Invalid template format');
      }
      
      // Confirm with the user if they want to clear the current canvas
      if (App.nodes.length > 0) {
        if (!confirm('This will clear your current canvas. Continue?')) {
          return;
        }
      }
      
      // Clear the current canvas
      App.nodes = [];
      App.connections = [];
      
      // Create nodes
      template.template.nodes.forEach(nodeData => {
        const node = new Node(
          nodeData.x,
          nodeData.y,
          nodeData.id
        );
        
        // Set node properties
        node.title = nodeData.title || 'Untitled Node';
        node.contentType = nodeData.contentType || 'text';
        node.aiProcessor = nodeData.aiProcessor || 'text-to-text';
        node.systemPrompt = nodeData.systemPrompt || '';
        node.workflowRole = nodeData.workflowRole || 'none';
        
        // Add the node to the canvas
        App.nodes.push(node);
      });
      
      // Create connections
      template.template.connections.forEach(connData => {
        const fromNode = App.nodes.find(node => node.id === connData.fromNodeId);
        const toNode = App.nodes.find(node => node.id === connData.toNodeId);
        
        if (fromNode && toNode) {
          App.connections.push(new Connection(fromNode, toNode));
        }
      });
      
      // Redraw the canvas
      App.draw();
      
      // Close the gallery
      this.closeGallery();
      
      // Show success message
      DebugManager.addLog(`Template "${template.name}" loaded successfully`, 'success');
    } catch (error) {
      DebugManager.addLog(`Error loading template: ${error.message}`, 'error');
    }
  },
  
  // Preview a template
  previewTemplate(template) {
    // Create a modal to preview the template
    const previewModal = document.createElement('div');
    previewModal.className = 'modal';
    previewModal.id = 'templatePreviewModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content template-preview-modal';
    
    const header = document.createElement('div');
    header.className = 'template-preview-header';
    
    const title = document.createElement('h2');
    title.textContent = `Template Preview: ${template.name}`;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'template-preview-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(previewModal);
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    const description = document.createElement('div');
    description.className = 'template-preview-description';
    description.textContent = template.description;
    
    const details = document.createElement('div');
    details.className = 'template-preview-details';
    
    details.innerHTML = `
      <div class="preview-detail">
        <span class="preview-detail-label">Author:</span>
        <span class="preview-detail-value">${template.author}</span>
      </div>
      <div class="preview-detail">
        <span class="preview-detail-label">Category:</span>
        <span class="preview-detail-value">${this.getCategoryName(template.category)}</span>
      </div>
      <div class="preview-detail">
        <span class="preview-detail-label">Nodes:</span>
        <span class="preview-detail-value">${template.template.nodes.length}</span>
      </div>
      <div class="preview-detail">
        <span class="preview-detail-label">Connections:</span>
        <span class="preview-detail-value">${template.template.connections.length}</span>
      </div>
    `;
    
    const previewCanvas = document.createElement('div');
    previewCanvas.className = 'template-preview-full-canvas';
    previewCanvas.innerHTML = this.generatePreviewSVG(template.template);
    
    const nodeList = document.createElement('div');
    nodeList.className = 'template-preview-node-list';
    
    const nodeListTitle = document.createElement('h3');
    nodeListTitle.textContent = 'Nodes';
    nodeList.appendChild(nodeListTitle);
    
    const nodeTable = document.createElement('table');
    nodeTable.className = 'template-node-table';
    
    // Add table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Type</th>
        <th>Role</th>
      </tr>
    `;
    nodeTable.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement('tbody');
    template.template.nodes.forEach(node => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${node.id}</td>
        <td>${node.title}</td>
        <td>${node.contentType}</td>
        <td>${node.workflowRole || 'none'}</td>
      `;
      tbody.appendChild(tr);
    });
    nodeTable.appendChild(tbody);
    
    nodeList.appendChild(nodeTable);
    
    const footer = document.createElement('div');
    footer.className = 'template-preview-footer';
    
    const useBtn = document.createElement('button');
    useBtn.className = 'primary-btn';
    useBtn.textContent = 'Use This Template';
    useBtn.addEventListener('click', () => {
      document.body.removeChild(previewModal);
      this.useTemplate(template);
    });
    
    footer.appendChild(useBtn);
    
    modalContent.appendChild(header);
    modalContent.appendChild(description);
    modalContent.appendChild(details);
    modalContent.appendChild(previewCanvas);
    modalContent.appendChild(nodeList);
    modalContent.appendChild(footer);
    
    previewModal.appendChild(modalContent);
    
    document.body.appendChild(previewModal);
  },
  
  // Search templates
  searchTemplates(query) {
    if (!query) {
      // If query is empty, load templates for the active category
      this.loadTemplates(this.activeCategory);
      return;
    }
    
    query = query.toLowerCase();
    
    // Get all templates
    this.getAllTemplates()
      .then(templates => {
        // Filter templates by query
        const filteredTemplates = templates.filter(template => {
          return template.name.toLowerCase().includes(query) ||
                 template.description.toLowerCase().includes(query) ||
                 template.category.toLowerCase().includes(query) ||
                 template.author.toLowerCase().includes(query);
        });
        
        // Update the templates container
        const container = document.getElementById('templatesContainer');
        if (!container) return;
        
        // Clear the container
        container.innerHTML = '';
        
        if (filteredTemplates.length === 0) {
          // Show no templates message
          const noTemplates = document.createElement('div');
          noTemplates.className = 'no-templates';
          noTemplates.textContent = `No templates found for "${query}".`;
          container.appendChild(noTemplates);
          return;
        }
        
        // Create template cards
        filteredTemplates.forEach(template => {
          const card = this.createTemplateCard(template);
          container.appendChild(card);
        });
      });
  },
  
  // Get all templates
  async getAllTemplates() {
    // Get templates for all categories
    const allTemplates = [];
    
    for (const category of this.categories) {
      const templates = await this.getTemplatesForCategory(category.id);
      allTemplates.push(...templates);
    }
    
    // Remove duplicates
    const uniqueTemplates = [];
    const ids = new Set();
    
    allTemplates.forEach(template => {
      if (!ids.has(template.id)) {
        ids.add(template.id);
        uniqueTemplates.push(template);
      }
    });
    
    return uniqueTemplates;
  },
  
  // Format template name from key
  formatTemplateName(key) {
    return key
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },
  
  // Get category for template
  getCategoryForTemplate(key) {
    if (key.includes('image')) {
      return 'image';
    } else if (key.includes('chat') || key.includes('conversation')) {
      return 'chat';
    } else if (key.includes('content') || key.includes('generator')) {
      return 'multimodal';
    } else {
      return 'text';
    }
  },
  
  // Get category name from id
  getCategoryName(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }
};
