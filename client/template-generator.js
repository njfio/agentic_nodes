/**
 * Template Generator
 * 
 * This module provides functionality to generate workflow templates using natural language
 * descriptions and the OpenAI API. It allows users to describe a workflow in plain language
 * and get a JSON template that can be loaded into the canvas.
 */

// Initialize the Template Generator when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Template Generator
  TemplateGenerator.init();
});

const TemplateGenerator = {
  // Sample templates
  sampleTemplates: {
    'image-analysis': {
      description: "A workflow that takes an image, analyzes it for objects, and generates a detailed description of what's in the image.",
      template: {
        nodes: [
          {
            id: 1,
            title: "Image Input",
            x: 100,
            y: 100,
            contentType: "image",
            aiProcessor: "image-to-text",
            systemPrompt: "Analyze this image and identify all objects, people, and elements visible.",
            workflowRole: "input"
          },
          {
            id: 2,
            title: "Detailed Analysis",
            x: 400,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Based on the image analysis, provide a detailed description with context and relationships between elements."
          },
          {
            id: 3,
            title: "Output Description",
            x: 700,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Format the analysis into a well-structured, readable description.",
            workflowRole: "output"
          }
        ],
        connections: [
          { fromNodeId: 1, toNodeId: 2 },
          { fromNodeId: 2, toNodeId: 3 }
        ]
      }
    },
    'text-summarization': {
      description: "A workflow that takes a long text document and creates a concise summary highlighting the key points.",
      template: {
        nodes: [
          {
            id: 1,
            title: "Text Input",
            x: 100,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "You will receive a document that needs to be summarized.",
            workflowRole: "input"
          },
          {
            id: 2,
            title: "Key Points Extraction",
            x: 400,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Extract the 5-7 most important points from the text."
          },
          {
            id: 3,
            title: "Summary Generation",
            x: 700,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Create a concise summary (3-4 paragraphs) based on the key points.",
            workflowRole: "output"
          }
        ],
        connections: [
          { fromNodeId: 1, toNodeId: 2 },
          { fromNodeId: 2, toNodeId: 3 }
        ]
      }
    },
    'chat-bot': {
      description: "A workflow that implements a chat bot with memory of the conversation history.",
      template: {
        nodes: [
          {
            id: 1,
            title: "User Input",
            x: 100,
            y: 100,
            contentType: "chat",
            aiProcessor: "text-to-text",
            systemPrompt: "You are receiving user messages for a chatbot.",
            workflowRole: "input"
          },
          {
            id: 2,
            title: "Context Processing",
            x: 400,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Process the user's message and conversation history to understand context and intent."
          },
          {
            id: 3,
            title: "Response Generation",
            x: 700,
            y: 100,
            contentType: "chat",
            aiProcessor: "text-to-text",
            systemPrompt: "Generate a helpful, conversational response based on the processed context.",
            workflowRole: "output"
          }
        ],
        connections: [
          { fromNodeId: 1, toNodeId: 2 },
          { fromNodeId: 2, toNodeId: 3 }
        ]
      }
    },
    'content-generator': {
      description: "A workflow that generates creative content based on a topic or prompt, including both text and images.",
      template: {
        nodes: [
          {
            id: 1,
            title: "Topic Input",
            x: 100,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "You will receive a topic or prompt for content generation.",
            workflowRole: "input"
          },
          {
            id: 2,
            title: "Content Outline",
            x: 400,
            y: 50,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Create a detailed outline for content on this topic."
          },
          {
            id: 3,
            title: "Text Content",
            x: 700,
            y: 50,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Generate full text content based on the outline."
          },
          {
            id: 4,
            title: "Image Prompt",
            x: 400,
            y: 200,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Create a detailed image prompt related to the topic."
          },
          {
            id: 5,
            title: "Image Generation",
            x: 700,
            y: 200,
            contentType: "image",
            aiProcessor: "text-to-image",
            systemPrompt: "Generate an image based on the provided prompt."
          },
          {
            id: 6,
            title: "Combined Output",
            x: 1000,
            y: 100,
            contentType: "text",
            aiProcessor: "text-to-text",
            systemPrompt: "Combine the text content with a reference to the generated image.",
            workflowRole: "output"
          }
        ],
        connections: [
          { fromNodeId: 1, toNodeId: 2 },
          { fromNodeId: 1, toNodeId: 4 },
          { fromNodeId: 2, toNodeId: 3 },
          { fromNodeId: 4, toNodeId: 5 },
          { fromNodeId: 3, toNodeId: 6 },
          { fromNodeId: 5, toNodeId: 6 }
        ]
      }
    }
  },

  // Initialize the Template Generator
  init() {
    // Get DOM elements
    this.modal = document.getElementById('templateGeneratorModal');
    this.descriptionInput = document.getElementById('templateDescription');
    this.generatedTemplate = document.getElementById('generatedTemplate');
    this.loadingIndicator = document.querySelector('.template-loading');
    
    // Add event listeners
    this.addEventListeners();
    
    // Log initialization
    console.log('Template Generator initialized');
  },
  
  // Add event listeners
  addEventListeners() {
    // Button to open the modal
    const openBtn = document.getElementById('templateGeneratorBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal());
    }
    
    // Button to close the modal
    const closeBtn = document.getElementById('closeTemplateGenerator');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    
    // Button to generate template
    const generateBtn = document.getElementById('generateTemplateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateTemplate());
    }
    
    // Button to copy template to clipboard
    const copyBtn = document.getElementById('copyTemplateBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }
    
    // Button to save template as file
    const saveBtn = document.getElementById('saveTemplateBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveAsFile());
    }
    
    // Button to load template to canvas
    const loadBtn = document.getElementById('loadTemplateBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.loadToCanvas());
    }
    
    // Sample template buttons
    const sampleBtns = document.querySelectorAll('.sample-template-btn');
    sampleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateKey = e.target.getAttribute('data-template');
        this.loadSampleTemplate(templateKey);
      });
    });
  },
  
  // Open the modal
  openModal() {
    if (this.modal) {
      this.modal.style.display = 'block';
    }
  },
  
  // Close the modal
  closeModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  },
  
  // Load a sample template
  loadSampleTemplate(templateKey) {
    if (this.sampleTemplates[templateKey]) {
      // Set the description
      this.descriptionInput.value = this.sampleTemplates[templateKey].description;
      
      // Set the template with syntax highlighting
      const templateJson = JSON.stringify(this.sampleTemplates[templateKey].template, null, 2);
      this.generatedTemplate.innerHTML = this.highlightJson(templateJson);
      
      // Highlight the active button
      document.querySelectorAll('.sample-template-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-template') === templateKey) {
          btn.classList.add('active');
        }
      });
    }
  },
  
  // Generate a template based on the description
  async generateTemplate() {
    const description = this.descriptionInput.value.trim();
    
    if (!description) {
      DebugManager.addLog('Please enter a description for your workflow', 'error');
      return;
    }
    
    // Show loading indicator
    this.showLoading(true);
    
    try {
      // Get OpenAI config
      const config = ApiService.openai.getConfig();
      
      if (!config.apiKey) {
        throw new Error('OpenAI API key not configured. Please set it in the OpenAI Configuration.');
      }
      
      // Prepare the prompt
      const prompt = `
I need you to create a JSON template for a workflow in a node-based AI application. The workflow should be based on this description:

"${description}"

The template should follow this structure:
{
  "nodes": [
    {
      "id": number,
      "title": string,
      "x": number,
      "y": number,
      "contentType": "text" | "image" | "audio" | "video" | "chat",
      "aiProcessor": "text-to-text" | "text-to-image" | "image-to-text" | "audio-to-text",
      "systemPrompt": string,
      "workflowRole": "input" | "output" | "none" (optional)
    }
  ],
  "connections": [
    {
      "fromNodeId": number,
      "toNodeId": number
    }
  ]
}

Guidelines:
1. Create a logical flow with appropriate node types
2. Position nodes with sensible x,y coordinates (start around 100,100 and space them out by ~300 pixels)
3. Include descriptive system prompts for each node
4. Designate one node as "input" and one as "output" using the workflowRole property
5. Create appropriate connections between nodes
6. Use 3-7 nodes depending on the complexity of the workflow
7. Only include the properties shown in the example structure

Respond with ONLY the valid JSON object, no explanations or other text.
`;
      
      // Call the OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // Extract the generated template
      let templateJson = data.choices[0].message.content.trim();
      
      // Remove any markdown code block markers if present
      templateJson = templateJson.replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
      
      try {
        // Validate the JSON
        const parsedTemplate = JSON.parse(templateJson);
        
        // Display the template with syntax highlighting
        this.generatedTemplate.innerHTML = this.highlightJson(JSON.stringify(parsedTemplate, null, 2));
        
        // Log success
        DebugManager.addLog('Template generated successfully', 'success');
      } catch (jsonError) {
        // If JSON parsing fails, show the raw response
        this.generatedTemplate.textContent = templateJson;
        throw new Error('Generated template is not valid JSON');
      }
    } catch (error) {
      // Handle errors
      DebugManager.addLog(`Error generating template: ${error.message}`, 'error');
      this.generatedTemplate.textContent = `Error: ${error.message}`;
    } finally {
      // Hide loading indicator
      this.showLoading(false);
    }
  },
  
  // Copy the template to clipboard
  copyToClipboard() {
    const templateText = this.generatedTemplate.textContent;
    
    if (!templateText || templateText === 'Your generated template will appear here...') {
      DebugManager.addLog('No template to copy', 'error');
      return;
    }
    
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = templateText;
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.select();
    document.execCommand('copy');
    
    // Remove the textarea
    document.body.removeChild(textarea);
    
    // Show success message
    DebugManager.addLog('Template copied to clipboard', 'success');
  },
  
  // Save the template as a file
  saveAsFile() {
    const templateText = this.generatedTemplate.textContent;
    
    if (!templateText || templateText === 'Your generated template will appear here...') {
      DebugManager.addLog('No template to save', 'error');
      return;
    }
    
    try {
      // Create a blob with the JSON data
      const blob = new Blob([templateText], { type: 'application/json' });
      
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `workflow-template-${new Date().toISOString().slice(0, 10)}.json`;
      
      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Show success message
      DebugManager.addLog('Template saved as file', 'success');
    } catch (error) {
      DebugManager.addLog(`Error saving template: ${error.message}`, 'error');
    }
  },
  
  // Load the template to the canvas
  loadToCanvas() {
    const templateText = this.generatedTemplate.textContent;
    
    if (!templateText || templateText === 'Your generated template will appear here...') {
      DebugManager.addLog('No template to load', 'error');
      return;
    }
    
    try {
      // Parse the template
      const template = JSON.parse(templateText);
      
      // Check if the template has the required structure
      if (!template.nodes || !template.connections) {
        throw new Error('Invalid template format');
      }
      
      // Clear the current canvas
      App.nodes = [];
      App.connections = [];
      
      // Create nodes
      template.nodes.forEach(nodeData => {
        const node = new Node(
          nodeData.x,
          nodeData.y,
          nodeData.title || 'Untitled Node'
        );
        
        // Set node properties
        node.id = nodeData.id;
        node.contentType = nodeData.contentType || 'text';
        node.aiProcessor = nodeData.aiProcessor || 'text-to-text';
        node.systemPrompt = nodeData.systemPrompt || '';
        node.workflowRole = nodeData.workflowRole || 'none';
        
        // Add the node to the canvas
        App.nodes.push(node);
      });
      
      // Create connections
      template.connections.forEach(connData => {
        const fromNode = App.nodes.find(node => node.id === connData.fromNodeId);
        const toNode = App.nodes.find(node => node.id === connData.toNodeId);
        
        if (fromNode && toNode) {
          App.connections.push(new Connection(fromNode, toNode));
        }
      });
      
      // Redraw the canvas
      App.draw();
      
      // Close the modal
      this.closeModal();
      
      // Show success message
      DebugManager.addLog('Template loaded to canvas', 'success');
    } catch (error) {
      DebugManager.addLog(`Error loading template: ${error.message}`, 'error');
    }
  },
  
  // Show or hide the loading indicator
  showLoading(show) {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  },
  
  // Highlight JSON syntax
  highlightJson(json) {
    return json
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
  }
};
