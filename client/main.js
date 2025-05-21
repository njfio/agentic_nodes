// OpenAI Configuration
let openAIConfig = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 150
};

// Load configuration from localStorage
try {
  const savedConfig = localStorage.getItem('openAIConfig');
  if (savedConfig) {
    openAIConfig = JSON.parse(savedConfig);
  }
} catch (e) {
  console.error('Error loading OpenAI config:', e);
}

// Status indicator
function showStatus(message, isError = false) {
  const statusDiv = document.createElement('div');
  statusDiv.className = `api-status ${isError ? 'error' : 'success'}`;
  statusDiv.textContent = message;
  document.body.appendChild(statusDiv);
  setTimeout(() => statusDiv.remove(), 3000);
}

// OpenAI API call
async function callOpenAI(messages, isVision = false) {
  try {
    if (!openAIConfig.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIConfig.apiKey}`
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: isVision ? 'gpt-4-vision-preview' : openAIConfig.model,
        messages,
        temperature: openAIConfig.temperature,
        max_tokens: openAIConfig.maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API call failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    showStatus(error.message, true);
    throw error;
  }
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// OpenAI Configuration Modal
const configModal = document.getElementById('configModal');
const configBtn = document.getElementById('configBtn');
const saveConfigBtn = document.getElementById('saveConfig');
const cancelConfigBtn = document.getElementById('cancelConfig');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('model');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokens');

// Update temperature value display
temperatureInput.addEventListener('input', () => {
  temperatureValue.textContent = temperatureInput.value;
});

// Load saved configuration and node data
apiKeyInput.value = openAIConfig.apiKey;
modelSelect.value = openAIConfig.model;
temperatureInput.value = openAIConfig.temperature;
temperatureValue.textContent = openAIConfig.temperature;
maxTokensInput.value = openAIConfig.maxTokens;


// Show configuration modal
configBtn.addEventListener('click', () => {
  configModal.style.display = 'block';
});

// Save configuration
saveConfigBtn.addEventListener('click', () => {
  openAIConfig = {
    apiKey: apiKeyInput.value,
    model: modelSelect.value,
    temperature: parseFloat(temperatureInput.value),
    maxTokens: parseInt(maxTokensInput.value)
  };
  
  localStorage.setItem('openAIConfig', JSON.stringify(openAIConfig));
  configModal.style.display = 'none';
  showStatus('Configuration saved successfully');
});

// Cancel configuration
cancelConfigBtn.addEventListener('click', () => {
  configModal.style.display = 'none';
});


let nodes = [];
let connections = [];

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

let isDragging = false;
let dragNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let cameraX = 0;
let cameraY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

class Node {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.title = "Node " + id;
    this.content = "";
    this.modality = "text";
    this.aiProcessor = "text-to-text";
    this.systemPrompt = "";
    this.outputs = [];
    this.inputs = [];
    this.selected = false;
    this.processed = false;

    // Reasoning pattern for AI processing
    this.reasoningPattern = 'chain-of-thought';
  }

  async processContent(inputContent, inputModality) {
    try {
      let messages = [];
      let isVision = false;

      // Add input content to chat history if text modality
      if (inputModality === 'text') {
        addChatMessage(inputContent, false);
      }

      switch(this.aiProcessor) {
        case "text-to-text":
          messages = [
            { role: "system", content: this.systemPrompt || "Process the following text according to the node's purpose." },
            { role: "user", content: inputContent }
          ];
          break;

        case "text-to-image":
          messages = [
            { role: "system", content: "Create a detailed image description based on the following text. This will be used for image generation." },
            { role: "user", content: inputContent }
          ];
          break;

        case "image-to-text":
          isVision = true;
          messages = [
            { role: "system", content: "Describe this image in detail." },
            { 
              role: "user", 
              content: [
                { type: "text", text: "Describe this image in detail:" },
                { 
                  type: "image_url", 
                  image_url: inputContent.startsWith('data:') ? inputContent : 'Invalid image data'
                }
              ]
            }
          ];
          break;

        case "audio-to-text":
          messages = [
            { role: "system", content: "Transcribe or describe the audio content." },
            { role: "user", content: "Audio content processing would go here. Currently using placeholder." }
          ];
          break;

        default:
          throw new Error("Unsupported conversion type");
      }

      showStatus('Processing content...');
      const result = await callOpenAI(messages, isVision);

      // Handle different output types
      switch(this.modality) {
        case "text":
          this.content = result;
          // Add AI response to chat history
          addChatMessage(result, true);
          break;

        case "image":
          if (this.aiProcessor === "text-to-image") {
            // Generate placeholder SVG (in real implementation, would use DALL-E or similar)
            this.content = "data:image/svg+xml;base64," + btoa(`
              <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#4a90e2"/>
                <text x="50%" y="50%" font-family="Arial" font-size="14" 
                      fill="white" text-anchor="middle" dy=".3em">
                  Generated: ${result.substring(0, 30)}...
                </text>
              </svg>
            `);
            // Update image preview
            imagePreview.src = this.content;
            imagePreview.style.display = 'block';
          } else {
            this.content = result;
          }
          break;

        case "audio":
          // In a real implementation, would handle text-to-speech here
          this.content = result;
          break;

        case "video":
          this.content = result;
          break;
      }

      this.processed = true;
      showStatus('Processing complete');
      return this.content;

    } catch (error) {
      this.content = `Error: ${error.message}`;
      this.processed = true;
      showStatus(error.message, true);
      throw error;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + cameraX, this.y + cameraY);

    // Node box
    ctx.fillStyle = this.selected ? '#4a90e2' : '#333';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.fillRect(0, 0, NODE_WIDTH, NODE_HEIGHT);
    ctx.strokeRect(0, 0, NODE_WIDTH, NODE_HEIGHT);

    // Title and modality
    ctx.fillStyle = '#eee';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(this.title, 10, 20);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText(this.modality, NODE_WIDTH - 50, 20);

    // Content
    if (this.modality === 'image' && this.content.startsWith('data:')) {
      // Draw image content
      const img = new Image();
      img.src = this.content;
      ctx.drawImage(img, 10, 25, 60, 40);
    } else {
      // Draw text content
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ccc';
      const displayContent = this.content || `${this.modality} content here...`;
      ctx.fillText(displayContent.substring(0, 20) + (displayContent.length > 20 ? '...' : ''), 10, 40);
    }

    // Processing indicator
    if (!this.processed && this.content) {
      ctx.fillStyle = '#ff9900';
      ctx.beginPath();
      ctx.arc(NODE_WIDTH - 15, NODE_HEIGHT - 15, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Output connector circle (right center)
    ctx.beginPath();
    ctx.fillStyle = '#4a90e2';
    ctx.arc(NODE_WIDTH, NODE_HEIGHT / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    // Input connector circle (left center)
    ctx.beginPath();
    ctx.fillStyle = '#4a90e2';
    ctx.arc(0, NODE_HEIGHT / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  containsPoint(x, y) {
    const localX = x - (this.x + cameraX);
    const localY = y - (this.y + cameraY);
    return localX >= 0 && localX <= NODE_WIDTH && localY >= 0 && localY <= NODE_HEIGHT;
  }

  outputConnectorContainsPoint(x, y) {
    const localX = x - (this.x + cameraX);
    const localY = y - (this.y + cameraY);
    const dx = localX - NODE_WIDTH;
    const dy = localY - NODE_HEIGHT / 2;
    return dx * dx + dy * dy <= 8 * 8;
  }

  inputConnectorContainsPoint(x, y) {
    const localX = x - (this.x + cameraX);
    const localY = y - (this.y + cameraY);
    const dx = localX;
    const dy = localY - NODE_HEIGHT / 2;
    return dx * dx + dy * dy <= 8 * 8;
  }
}

class Connection {
  constructor(fromNode, toNode) {
    this.fromNode = fromNode;
    this.toNode = toNode;
  }

  draw(ctx) {
    const startX = this.fromNode.x + NODE_WIDTH + cameraX;
    const startY = this.fromNode.y + NODE_HEIGHT / 2 + cameraY;
    const endX = this.toNode.x + cameraX;
    const endY = this.toNode.y + NODE_HEIGHT / 2 + cameraY;

    // Connection line
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Bezier curve for smooth connection
    const cp1X = startX + 50;
    const cp1Y = startY;
    const cp2X = endX - 50;
    const cp2Y = endY;
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    ctx.stroke();

    // Draw transformation type indicator
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    ctx.save();
    ctx.translate(midX, midY);
    
    // Background for the transformation type
    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1;
    
    const transformText = `${this.fromNode.modality} → ${this.toNode.modality}`;
    ctx.font = '12px Arial';
    const textWidth = ctx.measureText(transformText).width;
    const padding = 6;
    
    ctx.beginPath();
    ctx.roundRect(-textWidth/2 - padding, -10, textWidth + padding*2, 20, 5);
    ctx.fill();
    ctx.stroke();
    
    // Transformation type text
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(transformText, 0, 0);
    
    ctx.restore();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw connections first
  connections.forEach(conn => conn.draw(ctx));

  // Draw nodes
  nodes.forEach(node => node.draw(ctx));
}

function addNode() {
  const id = nodes.length + 1;
  const x = -cameraX + canvasWidth / 2 - NODE_WIDTH / 2;
  const y = -cameraY + canvasHeight / 2 - NODE_HEIGHT / 2;
  const node = new Node(x, y, id);
  nodes.push(node);
  draw();
}

function getNodeAt(x, y) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].containsPoint(x, y)) {
      return nodes[i];
    }
  }
  return null;
}

let connectingNode = null;

canvas.addEventListener('mousedown', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  // Check if clicking on output connector to start connection
  for (const node of nodes) {
    if (node.outputConnectorContainsPoint(x, y)) {
      connectingNode = node;
      return;
    }
  }

  // Check if clicking on node to drag
  const node = getNodeAt(x, y);
  if (node) {
    isDragging = true;
    dragNode = node;
    dragNode.selected = true;
    dragOffsetX = x - (node.x + cameraX);
    dragOffsetY = y - (node.y + cameraY);
  } else {
    // Start panning
    isPanning = true;
    panStartX = x;
    panStartY = y;
    nodes.forEach(n => n.selected = false);
  }
  draw();
});

canvas.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  if (isDragging && dragNode) {
    dragNode.x = x - dragOffsetX - cameraX;
    dragNode.y = y - dragOffsetY - cameraY;
    draw();
  } else if (isPanning) {
    const dx = x - panStartX;
    const dy = y - panStartY;
    cameraX += dx;
    cameraY += dy;
    panStartX = x;
    panStartY = y;
    draw();
  } else if (connectingNode) {
    draw();
    // Draw temporary connection line
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const startX = connectingNode.x + NODE_WIDTH + cameraX;
    const startY = connectingNode.y + NODE_HEIGHT / 2 + cameraY;
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
});

// Node editor modal elements
const nodeEditor = document.getElementById('nodeEditor');
const nodeTitleInput = document.getElementById('nodeTitle');
const nodeModalitySelect = document.getElementById('nodeModality');
const nodeContentInput = document.getElementById('nodeContent');
const nodeFileInput = document.getElementById('nodeFile');
const aiProcessorSelect = document.getElementById('aiProcessor');
const saveNodeBtn = document.getElementById('saveNode');
const cancelNodeBtn = document.getElementById('cancelNode');

let editingNode = null;

// Double click to edit node
canvas.addEventListener('dblclick', (e) => {
  const x = e.clientX;
  const y = e.clientY;
  const node = getNodeAt(x, y);
  
  if (node) {
    editingNode = node;
    nodeTitleInput.value = node.title;
    nodeModalitySelect.value = node.modality;
    nodeContentInput.value = node.content;
    aiProcessorSelect.value = node.aiProcessor;
    
    // Show/hide file input based on modality
    nodeFileInput.style.display = ['image', 'audio', 'video'].includes(node.modality) ? 'block' : 'none';
    nodeContentInput.style.display = node.modality === 'text' ? 'block' : 'none';
    
    nodeEditor.style.display = 'block';
  }
});

// DOM Elements
const elements = {
  // Content sections
  textContentSection: document.getElementById('textContentSection'),
  imageContentSection: document.getElementById('imageContentSection'),
  audioContentSection: document.getElementById('audioContentSection'),
  videoContentSection: document.getElementById('videoContentSection'),
  chatHistory: document.querySelector('.chat-history'),
  chatMessages: document.getElementById('chatMessages'),

  // File inputs and previews
  imageFile: document.getElementById('imageFile'),
  imagePreview: document.getElementById('imagePreview'),
  audioFile: document.getElementById('audioFile'),
  audioPreview: document.getElementById('audioPreview'),
  videoFile: document.getElementById('videoFile'),
  videoPreview: document.getElementById('videoPreview'),

  // Buttons
  uploadImageBtn: document.getElementById('uploadImageBtn'),
  generateImageBtn: document.getElementById('generateImageBtn'),
  recordAudioBtn: document.getElementById('recordAudioBtn'),
  uploadAudioBtn: document.getElementById('uploadAudioBtn'),
  uploadVideoBtn: document.getElementById('uploadVideoBtn'),
  startRecordingBtn: document.getElementById('startRecording'),
  stopRecordingBtn: document.getElementById('stopRecording')
};

// Ensure all DOM elements are available
function validateElements() {
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`Missing DOM element: ${key}`);
    }
  }
}

// Initialize after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  validateElements();
  initializeEventListeners();
  draw();
});

// Initialize all event listeners
function initializeEventListeners() {
  // Modality change handler
  nodeModalitySelect.addEventListener('change', () => {
    // Hide all content sections
    elements.textContentSection.style.display = 'none';
    elements.imageContentSection.style.display = 'none';
    elements.audioContentSection.style.display = 'none';
    elements.videoContentSection.style.display = 'none';
    elements.chatHistory.style.display = 'none';

    // Show relevant section
    switch (nodeModalitySelect.value) {
      case 'text':
        elements.textContentSection.style.display = 'block';
        elements.chatHistory.style.display = 'block';
        break;
      case 'image':
        elements.imageContentSection.style.display = 'block';
        break;
      case 'audio':
        elements.audioContentSection.style.display = 'block';
        break;
      case 'video':
        elements.videoContentSection.style.display = 'block';
        break;
    }

    updateAvailableProcessors();
  });

  // File input handlers
  if (elements.imageFile) {
    elements.imageFile.addEventListener('change', handleImageUpload);
  }
  if (elements.audioFile) {
    elements.audioFile.addEventListener('change', handleAudioUpload);
  }
  if (elements.videoFile) {
    elements.videoFile.addEventListener('change', handleVideoUpload);
  }

  // Button click handlers
  if (elements.generateImageBtn) {
    elements.generateImageBtn.addEventListener('click', handleImageGeneration);
  }
  if (elements.startRecordingBtn) {
    elements.startRecordingBtn.addEventListener('click', () => audioRecorder.start());
  }
  if (elements.stopRecordingBtn) {
    elements.stopRecordingBtn.addEventListener('click', () => audioRecorder.stop());
  }
}

// Audio recording
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;

// Compatible AI processors for each modality combination
const compatibleProcessors = {
  'text-text': ['text-to-text'],
  'text-image': ['text-to-image'],
  'image-text': ['image-to-text'],
  'audio-text': ['audio-to-text'],
  'video-text': ['video-to-text']
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Validate DOM elements
  validateElements();
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Draw initial canvas
  draw();
  
  // Show welcome message
  showStatus('Application initialized successfully');
});

// Update available AI processors based on input connections
function updateAvailableProcessors() {
  if (!editingNode) return;

  // Find input connections to this node
  const inputConnections = connections.filter(conn => conn.toNode === editingNode);
  
  // Clear current options
  while (aiProcessorSelect.options.length > 0) {
    aiProcessorSelect.remove(0);
  }

  if (inputConnections.length > 0) {
    // Get input modality from connected node
    const inputModality = inputConnections[0].fromNode.modality;
    const outputModality = editingNode.modality;
    const key = `${inputModality}-${outputModality}`;

    // Get compatible processors
    const processors = compatibleProcessors[key] || [];
    
    // Add compatible processor options
    processors.forEach(processor => {
      const option = document.createElement('option');
      option.value = processor;
      option.textContent = processor.split('-').join(' to ').toUpperCase();
      aiProcessorSelect.appendChild(option);
    });

    if (processors.length > 0) {
      editingNode.aiProcessor = processors[0];
    }
  } else {
    // No input connections, add default processors
    const defaultProcessors = {
      'text': ['text-to-text'],
      'image': ['text-to-image'],
      'audio': ['audio-to-text'],
      'video': ['video-to-text']
    };

    const processors = defaultProcessors[editingNode.modality] || [];
    processors.forEach(processor => {
      const option = document.createElement('option');
      option.value = processor;
      option.textContent = processor.split('-').join(' to ').toUpperCase();
      aiProcessorSelect.appendChild(option);
    });

    if (processors.length > 0) {
      editingNode.aiProcessor = processors[0];
    }
  }
}

// File upload handlers
function handleFileUpload(file, previewElement, type) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (previewElement) {
        previewElement.src = event.target.result;
        previewElement.style.display = 'block';
      }
      resolve(event.target.result);
    };
    reader.onerror = () => reject(new Error(`Failed to read ${type} file`));
    reader.readAsDataURL(file);
  });
}

async function handleImageUpload(e) {
  try {
    const file = e.target.files[0];
    editingNode.content = await handleFileUpload(
      file, 
      elements.imagePreview, 
      'image'
    );
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function handleAudioUpload(e) {
  try {
    const file = e.target.files[0];
    editingNode.content = await handleFileUpload(
      file, 
      elements.audioPreview, 
      'audio'
    );
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function handleVideoUpload(e) {
  try {
    const file = e.target.files[0];
    editingNode.content = await handleFileUpload(
      file, 
      elements.videoPreview, 
      'video'
    );
  } catch (error) {
    showStatus(error.message, true);
  }
}

// Image generation handler
async function handleImageGeneration() {
  const prompt = document.getElementById('imagePrompt').value;
  if (!prompt) {
    showStatus('Please enter an image generation prompt', true);
    return;
  }

  try {
    showStatus('Generating image...');
    const result = await callOpenAI([
      { role: "system", content: "Create a detailed description for image generation." },
      { role: "user", content: prompt }
    ]);

    const svgContent = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#4a90e2"/>
        <text x="50%" y="50%" font-family="Arial" font-size="14" 
              fill="white" text-anchor="middle" dy=".3em">
          Generated: ${prompt.substring(0, 30)}...
        </text>
      </svg>
    `;

    editingNode.content = "data:image/svg+xml;base64," + btoa(svgContent);
    elements.imagePreview.src = editingNode.content;
    elements.imagePreview.style.display = 'block';
    showStatus('Image generated successfully');
  } catch (error) {
    showStatus('Failed to generate image: ' + error.message, true);
  }
}

// Audio recorder
const audioRecorder = {
  start: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        try {
          editingNode.content = await handleFileUpload(
            audioBlob,
            elements.audioPreview,
            'audio'
          );
        } catch (error) {
          showStatus('Failed to process recorded audio: ' + error.message, true);
        }
      });

      mediaRecorder.start();
      elements.startRecordingBtn.disabled = true;
      elements.stopRecordingBtn.disabled = false;

      // Start timer
      let seconds = 0;
      recordingTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('recordingTime').textContent = 
          `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      }, 1000);

    } catch (error) {
      showStatus('Failed to start recording: ' + error.message, true);
    }
  },

  stop: () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      clearInterval(recordingTimer);
      elements.startRecordingBtn.disabled = false;
      elements.stopRecordingBtn.disabled = true;
      document.getElementById('recordingTime').textContent = '00:00';
    }
  }
};

// Chat history
function addChatMessage(content, isAI = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isAI ? 'ai' : 'user'}`;
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

const systemPromptInput = document.getElementById('systemPrompt');

// Save node changes
saveNodeBtn.addEventListener('click', () => {
  if (editingNode) {
    editingNode.title = nodeTitleInput.value;
    editingNode.modality = nodeModalitySelect.value;
    if (nodeModalitySelect.value === 'text') {
      editingNode.content = nodeContentInput.value;
    }
    editingNode.systemPrompt = systemPromptInput.value;
    editingNode.aiProcessor = aiProcessorSelect.value;
    editingNode.processed = false;
    nodeEditor.style.display = 'none';
    draw();
  }
});

// Cancel node editing
cancelNodeBtn.addEventListener('click', () => {
  nodeEditor.style.display = 'none';
});

canvas.addEventListener('mouseup', async (e) => {
  const x = e.clientX;
  const y = e.clientY;

  if (isDragging) {
    isDragging = false;
    dragNode = null;
  } else if (isPanning) {
    isPanning = false;
  } else if (connectingNode) {
    // Check if releasing on input connector of another node
    for (const node of nodes) {
      if (node !== connectingNode && node.inputConnectorContainsPoint(x, y)) {
        // Check if connection is compatible
        const key = `${connectingNode.modality}-${node.modality}`;
        const compatibleProcessors = compatibleProcessors[key] || [];
        
        if (compatibleProcessors.length === 0) {
          showStatus(`Cannot connect ${connectingNode.modality} to ${node.modality}`, true);
        } else {
          // Create connection and process content
          connections.push(new Connection(connectingNode, node));
          node.processed = false;
          
          // Update available processors for the target node
          if (node === editingNode) {
            updateAvailableProcessors();
          }
          
          // Process content through AI
          await node.processContent(connectingNode.content, connectingNode.modality);
          showStatus('Connection created and content processed');
        }
        break;
      }
    }
    connectingNode = null;
    draw();
  }
});

window.addEventListener('resize', () => {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  draw();
});

document.getElementById('addNodeBtn').addEventListener('click', () => {
  addNode();
});

// Save/Load functionality
const saveLoadModal = document.getElementById('saveLoadModal');
const canvasDataInput = document.getElementById('canvasData');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const copyCanvasBtn = document.getElementById('copyCanvas');
const loadCanvasBtn = document.getElementById('loadCanvas');
const cancelSaveLoadBtn = document.getElementById('cancelSaveLoad');

function serializeCanvas() {
  const canvasData = {
    nodes: nodes.map(node => ({
      x: node.x,
      y: node.y,
      id: node.id,
      title: node.title,
      content: node.content,
      modality: node.modality,
      aiProcessor: node.aiProcessor,
      systemPrompt: node.systemPrompt,
      processed: node.processed
    })),
    connections: connections.map(conn => ({
      fromNodeId: conn.fromNode.id,
      toNodeId: conn.toNode.id
    })),
    camera: {
      x: cameraX,
      y: cameraY
    }
  };
  return JSON.stringify(canvasData, null, 2);
}

function deserializeCanvas(data) {
  try {
    const canvasData = JSON.parse(data);
    
    // Clear current state
    nodes = [];
    connections = [];
    
    // Restore nodes
    canvasData.nodes.forEach(nodeData => {
      const node = new Node(nodeData.x, nodeData.y, nodeData.id);
      node.title = nodeData.title;
      node.content = nodeData.content;
      node.modality = nodeData.modality;
      node.aiProcessor = nodeData.aiProcessor;
      node.systemPrompt = nodeData.systemPrompt;
      node.processed = nodeData.processed;
      nodes.push(node);
    });
    
    // Restore connections
    canvasData.connections.forEach(connData => {
      const fromNode = nodes.find(n => n.id === connData.fromNodeId);
      const toNode = nodes.find(n => n.id === connData.toNodeId);
      if (fromNode && toNode) {
        connections.push(new Connection(fromNode, toNode));
      }
    });
    
    // Restore camera position
    if (canvasData.camera) {
      cameraX = canvasData.camera.x;
      cameraY = canvasData.camera.y;
    }
    
    draw();
    showStatus('Canvas loaded successfully');
  } catch (error) {
    showStatus('Error loading canvas: ' + error.message, true);
  }
}

saveBtn.addEventListener('click', () => {
  canvasDataInput.value = serializeCanvas();
  saveLoadModal.style.display = 'block';
});

loadBtn.addEventListener('click', () => {
  canvasDataInput.value = '';
  saveLoadModal.style.display = 'block';
});

copyCanvasBtn.addEventListener('click', () => {
  canvasDataInput.select();
  document.execCommand('copy');
  showStatus('Canvas data copied to clipboard');
});

loadCanvasBtn.addEventListener('click', () => {
  const data = canvasDataInput.value.trim();
  if (data) {
    deserializeCanvas(data);
    saveLoadModal.style.display = 'none';
  } else {
    showStatus('Please paste canvas data to load', true);
  }
});

cancelSaveLoadBtn.addEventListener('click', () => {
  saveLoadModal.style.display = 'none';
});

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Set initial canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Initialize core components
  validateElements();
  initializeEventListeners();
  
  // Initialize modal system
  initializeModalSystem();
  
  // Draw initial canvas and show welcome message
  draw();
  showStatus('Application initialized successfully');
});
