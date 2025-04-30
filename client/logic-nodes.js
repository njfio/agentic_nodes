/**
 * Logic Nodes
 * 
 * This module provides specialized node types for implementing logic operations
 * in workflows, such as splitting content into multiple items and conditional
 * processing with feedback loops.
 */

// Initialize the Logic Nodes when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Logic Nodes
  LogicNodes.init();
});

const LogicNodes = {
  // Initialize the Logic Nodes
  init() {
    // Register node types with the application
    this.registerNodeTypes();
    
    // Add event listeners
    this.addEventListeners();
    
    // Log initialization
    console.log('Logic Nodes initialized');
  },
  
  // Register node types with the application
  registerNodeTypes() {
    // Add the logic node types to the App object if it exists
    if (window.App) {
      // Store the original addNode method
      const originalAddNode = App.addNode;
      
      // Override the addNode method to add our custom node types
      App.addNode = function(nodeType) {
        if (!nodeType || nodeType === 'default') {
          // Call the original method for default nodes
          return originalAddNode.call(App);
        }
        
        // Handle custom node types
        switch (nodeType) {
          case 'splitter':
            return LogicNodes.createSplitterNode();
          case 'conditional':
            return LogicNodes.createConditionalNode();
          default:
            // Call the original method for unknown types
            return originalAddNode.call(App);
        }
      };
      
      // Add the node type to the Node class
      if (!Node.prototype.hasOwnProperty('nodeType')) {
        Object.defineProperty(Node.prototype, 'nodeType', {
          get: function() {
            return this._nodeType || 'default';
          },
          set: function(value) {
            this._nodeType = value;
          }
        });
      }
      
      // Extend the Node's draw method to show logic node indicators
      const originalNodeDraw = Node.prototype.draw;
      Node.prototype.draw = function(ctx) {
        // Call the original draw method
        originalNodeDraw.call(this, ctx);
        
        // Add logic node indicators
        if (this.nodeType === 'splitter' || this.nodeType === 'conditional') {
          const iconX = this.x + 10;
          const iconY = this.y + 10;
          const iconSize = 16;
          
          ctx.save();
          ctx.fillStyle = this.nodeType === 'splitter' ? '#e74c3c' : '#f39c12';
          ctx.beginPath();
          
          if (this.nodeType === 'splitter') {
            // Draw split icon (fork)
            ctx.moveTo(iconX, iconY);
            ctx.lineTo(iconX + iconSize, iconY);
            ctx.lineTo(iconX + iconSize/2, iconY + iconSize);
            ctx.closePath();
          } else {
            // Draw conditional icon (diamond)
            ctx.moveTo(iconX + iconSize/2, iconY);
            ctx.lineTo(iconX + iconSize, iconY + iconSize/2);
            ctx.lineTo(iconX + iconSize/2, iconY + iconSize);
            ctx.lineTo(iconX, iconY + iconSize/2);
            ctx.closePath();
          }
          
          ctx.fill();
          ctx.restore();
        }
      };
      
      // Extend the Node's process method to handle logic node processing
      const originalNodeProcess = Node.prototype.process;
      Node.prototype.process = function(input) {
        // Handle logic node processing
        if (this.nodeType === 'splitter') {
          return LogicNodes.processSplitterNode(this, input);
        } else if (this.nodeType === 'conditional') {
          return LogicNodes.processConditionalNode(this, input);
        }
        
        // Call the original process method for regular nodes
        return originalNodeProcess.call(this, input);
      };
    }
  },
  
  // Add event listeners
  addEventListeners() {
    // Add buttons to the toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      // Add Splitter Node button
      const splitterBtn = document.createElement('button');
      splitterBtn.id = 'addSplitterNodeBtn';
      splitterBtn.type = 'button';
      splitterBtn.textContent = 'Add Splitter Node';
      splitterBtn.title = 'Add a node that splits content into multiple items';
      
      splitterBtn.addEventListener('click', () => {
        App.addNode('splitter');
      });
      
      // Add Conditional Node button
      const conditionalBtn = document.createElement('button');
      conditionalBtn.id = 'addConditionalNodeBtn';
      conditionalBtn.type = 'button';
      conditionalBtn.textContent = 'Add Conditional Node';
      conditionalBtn.title = 'Add a node that evaluates content and can loop back';
      
      conditionalBtn.addEventListener('click', () => {
        App.addNode('conditional');
      });
      
      // Insert the buttons after the Add Node button
      const addNodeBtn = document.getElementById('addNodeBtn');
      if (addNodeBtn && addNodeBtn.parentNode) {
        addNodeBtn.parentNode.insertBefore(splitterBtn, addNodeBtn.nextSibling);
        addNodeBtn.parentNode.insertBefore(conditionalBtn, splitterBtn.nextSibling);
      } else {
        toolbar.appendChild(splitterBtn);
        toolbar.appendChild(conditionalBtn);
      }
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Add Splitter Node: Shift + S
      if (e.key === 'S' && e.shiftKey) {
        App.addNode('splitter');
        e.preventDefault();
      }
      
      // Add Conditional Node: Shift + C
      if (e.key === 'C' && e.shiftKey) {
        App.addNode('conditional');
        e.preventDefault();
      }
    });
  },
  
  // Create a Splitter Node
  createSplitterNode() {
    const id = App.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);
    
    // Configure as a splitter node
    node.title = "Splitter Node " + id;
    node.nodeType = 'splitter';
    node.contentType = 'text';
    node.aiProcessor = 'text-to-text';
    node.inputType = 'text';
    node.outputType = 'text';
    node.systemPrompt = "Split the input into separate items. Each item should be on a new line.";
    node.width = 240;
    node.height = 200;
    
    // Add splitter-specific properties
    node.splitDelimiter = '\\n'; // Default to newline
    node.splitParallel = true;   // Process items in parallel by default
    node.maxItems = 10;          // Maximum number of items to process
    
    // Add the node to the canvas
    App.nodes.push(node);
    
    // Select the new node
    App.nodes.forEach(n => n.selected = false);
    node.selected = true;
    
    // Log the creation
    DebugManager.addLog(`Added new Splitter Node "${node.title}" (ID: ${node.id})`, 'info');
    DebugManager.updateCanvasStats();
    
    // Redraw the canvas
    App.draw();
    
    return node;
  },
  
  // Create a Conditional Node
  createConditionalNode() {
    const id = App.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);
    
    // Configure as a conditional node
    node.title = "Conditional Node " + id;
    node.nodeType = 'conditional';
    node.contentType = 'text';
    node.aiProcessor = 'text-to-text';
    node.inputType = 'text';
    node.outputType = 'text';
    node.systemPrompt = "Evaluate the input and determine if it meets the criteria. Return 'PASS' if it meets criteria, or 'FAIL: [reason]' if it doesn't.";
    node.width = 240;
    node.height = 200;
    
    // Add conditional-specific properties
    node.conditionCriteria = 'PASS';  // Text to check for success
    node.maxIterations = 3;           // Maximum number of iterations
    node.currentIteration = 0;        // Current iteration count
    node.feedbackNode = null;         // Node to send feedback to
    node.loopActive = false;          // Whether a loop is currently active
    
    // Add the node to the canvas
    App.nodes.push(node);
    
    // Select the new node
    App.nodes.forEach(n => n.selected = false);
    node.selected = true;
    
    // Log the creation
    DebugManager.addLog(`Added new Conditional Node "${node.title}" (ID: ${node.id})`, 'info');
    DebugManager.updateCanvasStats();
    
    // Redraw the canvas
    App.draw();
    
    return node;
  },
  
  // Process a Splitter Node
  async processSplitterNode(node, input) {
    if (!input) {
      throw new Error('No input provided to Splitter Node');
    }
    
    // Log the start of processing
    DebugManager.addLog(`Processing Splitter Node "${node.title}" (ID: ${node.id})`, 'info');
    
    try {
      // First, use the node's system prompt to process the input
      // This allows users to customize how the splitting is done
      let processedInput = input;
      
      if (node.systemPrompt) {
        // Use the OpenAI API to process the input according to the system prompt
        const config = ApiService.openai.getConfig();
        
        if (!config.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        
        const response = await fetch('/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openai-api-key': config.apiKey
          },
          body: JSON.stringify({
            model: config.model || 'gpt-4o',
            messages: [
              { role: 'system', content: node.systemPrompt },
              { role: 'user', content: input }
            ],
            temperature: 0.7,
            max_tokens: config.maxTokens || 2000
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        processedInput = data.choices[0].message.content;
      }
      
      // Split the processed input into items
      let delimiter = node.splitDelimiter || '\\n';
      
      // Handle escaped characters
      if (delimiter === '\\n') delimiter = '\n';
      if (delimiter === '\\t') delimiter = '\t';
      
      // Split the input
      let items = processedInput.split(delimiter).map(item => item.trim()).filter(item => item);
      
      // Limit the number of items if needed
      if (node.maxItems && items.length > node.maxItems) {
        DebugManager.addLog(`Limiting Splitter Node to ${node.maxItems} items (${items.length} found)`, 'warning');
        items = items.slice(0, node.maxItems);
      }
      
      // Log the number of items
      DebugManager.addLog(`Splitter Node "${node.title}" (ID: ${node.id}) found ${items.length} items`, 'info');
      
      // Store the items in the node for reference
      node.splitItems = items;
      
      // Store the original input
      node.originalInput = input;
      
      // Mark the node as processed
      node.hasBeenProcessed = true;
      
      // Process connected nodes with each item
      const connections = App.connections.filter(conn => conn.fromNode === node);
      
      if (connections.length > 0) {
        // Process each item with each connected node
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Log the item being processed
          DebugManager.addLog(`Processing item ${i+1}/${items.length}: ${item.substring(0, 30)}${item.length > 30 ? '...' : ''}`, 'info');
          
          // Process each connected node with this item
          for (const connection of connections) {
            const toNode = connection.toNode;
            
            // Add metadata about the split
            const itemWithMetadata = `ITEM ${i+1} OF ${items.length}:\n\n${item}`;
            
            // Process the connected node
            if (node.splitParallel) {
              // Process in parallel (don't await)
              App.processNodeAndConnections(toNode, itemWithMetadata, node).catch(err => {
                DebugManager.addLog(`Error processing item ${i+1} in node "${toNode.title}": ${err.message}`, 'error');
              });
            } else {
              // Process sequentially (await)
              try {
                await App.processNodeAndConnections(toNode, itemWithMetadata, node);
              } catch (err) {
                DebugManager.addLog(`Error processing item ${i+1} in node "${toNode.title}": ${err.message}`, 'error');
              }
            }
          }
        }
      }
      
      // Return a summary of the split operation
      return `Split input into ${items.length} items:\n\n${items.map((item, i) => `${i+1}. ${item.substring(0, 50)}${item.length > 50 ? '...' : ''}`).join('\n')}`;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Splitter Node "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');
      
      // Set the error on the node
      node.error = error.message;
      
      // Throw the error to be handled by the caller
      throw error;
    }
  },
  
  // Process a Conditional Node
  async processConditionalNode(node, input) {
    if (!input) {
      throw new Error('No input provided to Conditional Node');
    }
    
    // Log the start of processing
    DebugManager.addLog(`Processing Conditional Node "${node.title}" (ID: ${node.id})`, 'info');
    
    try {
      // Reset iteration count if this is a new input
      if (!node.loopActive) {
        node.currentIteration = 0;
        node.loopActive = true;
      }
      
      // Increment iteration count
      node.currentIteration++;
      
      // Check if we've exceeded the maximum number of iterations
      if (node.currentIteration > node.maxIterations) {
        // Log the maximum iterations reached
        DebugManager.addLog(`Conditional Node "${node.title}" (ID: ${node.id}) reached maximum iterations (${node.maxIterations})`, 'warning');
        
        // Reset the loop
        node.loopActive = false;
        
        // Return a message indicating the maximum iterations were reached
        return `LOOP TERMINATED: Maximum iterations (${node.maxIterations}) reached. Final input:\n\n${input}`;
      }
      
      // Process the input with the system prompt
      const config = ApiService.openai.getConfig();
      
      if (!config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      // Add iteration information to the system prompt
      const systemPrompt = `${node.systemPrompt}\n\nThis is iteration ${node.currentIteration} of a maximum ${node.maxIterations} iterations.`;
      
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-api-key': config.apiKey
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          temperature: 0.7,
          max_tokens: config.maxTokens || 2000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const result = data.choices[0].message.content;
      
      // Log the result
      DebugManager.addLog(`Conditional Node "${node.title}" (ID: ${node.id}) result: ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`, 'info');
      
      // Check if the result meets the criteria
      const passCondition = node.conditionCriteria || 'PASS';
      const passed = result.includes(passCondition);
      
      // Store the result in the node
      node.content = result;
      node.hasBeenProcessed = true;
      
      // Process connected nodes based on the result
      const connections = App.connections.filter(conn => conn.fromNode === node);
      
      if (connections.length > 0) {
        if (passed) {
          // If the condition passed, process forward connections
          DebugManager.addLog(`Condition PASSED for node "${node.title}" (ID: ${node.id})`, 'success');
          
          // Reset the loop
          node.loopActive = false;
          
          // Process each connected node
          for (const connection of connections) {
            const toNode = connection.toNode;
            
            // Skip feedback nodes (we only process them on failure)
            if (toNode === node.feedbackNode) continue;
            
            // Process the connected node
            App.processNodeAndConnections(toNode, result, node).catch(err => {
              DebugManager.addLog(`Error processing node "${toNode.title}": ${err.message}`, 'error');
            });
          }
        } else {
          // If the condition failed, check if we have a feedback node
          DebugManager.addLog(`Condition FAILED for node "${node.title}" (ID: ${node.id})`, 'warning');
          
          // Extract the feedback from the result
          let feedback = result;
          if (result.includes('FAIL:')) {
            feedback = result.split('FAIL:')[1].trim();
          }
          
          // Find the feedback node (the node that provided input to this node)
          const incomingConnections = App.connections.filter(conn => conn.toNode === node);
          if (incomingConnections.length > 0) {
            // Use the first incoming node as the feedback node
            node.feedbackNode = incomingConnections[0].fromNode;
            
            // Log the feedback node
            DebugManager.addLog(`Sending feedback to node "${node.feedbackNode.title}" (ID: ${node.feedbackNode.id})`, 'info');
            
            // Process the feedback node with the feedback
            const feedbackInput = `FEEDBACK (Iteration ${node.currentIteration}/${node.maxIterations}):\n${feedback}\n\nPlease revise your previous output based on this feedback.`;
            
            // Process the feedback node
            App.processNodeAndConnections(node.feedbackNode, feedbackInput, node).catch(err => {
              DebugManager.addLog(`Error processing feedback: ${err.message}`, 'error');
            });
          } else {
            // No feedback node found
            DebugManager.addLog(`No feedback node found for conditional node "${node.title}" (ID: ${node.id})`, 'warning');
            
            // Reset the loop
            node.loopActive = false;
          }
        }
      }
      
      // Return the result
      return result;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Conditional Node "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');
      
      // Set the error on the node
      node.error = error.message;
      
      // Reset the loop
      node.loopActive = false;
      
      // Throw the error to be handled by the caller
      throw error;
    }
  },
  
  // Update the node editor to show logic node options
  updateNodeEditor(node) {
    if (!node || (node.nodeType !== 'splitter' && node.nodeType !== 'conditional')) {
      return;
    }
    
    // Get the node editor form
    const form = document.getElementById('nodeEditorForm');
    if (!form) return;
    
    // Check if the logic options section already exists
    let logicOptionsSection = document.getElementById('logicOptionsSection');
    
    // Create the section if it doesn't exist
    if (!logicOptionsSection) {
      logicOptionsSection = document.createElement('div');
      logicOptionsSection.id = 'logicOptionsSection';
      logicOptionsSection.className = 'form-group';
      
      // Add a header
      const header = document.createElement('h3');
      header.textContent = 'Logic Node Options';
      logicOptionsSection.appendChild(header);
      
      // Add the section to the form before the button group
      const buttonGroup = form.querySelector('.button-group');
      if (buttonGroup) {
        form.insertBefore(logicOptionsSection, buttonGroup);
      } else {
        form.appendChild(logicOptionsSection);
      }
    }
    
    // Clear the section
    logicOptionsSection.innerHTML = '';
    
    // Add a header
    const header = document.createElement('h3');
    header.textContent = 'Logic Node Options';
    logicOptionsSection.appendChild(header);
    
    // Add options based on the node type
    if (node.nodeType === 'splitter') {
      // Add splitter options
      
      // Delimiter option
      const delimiterGroup = document.createElement('div');
      delimiterGroup.className = 'form-group';
      
      const delimiterLabel = document.createElement('label');
      delimiterLabel.htmlFor = 'splitDelimiter';
      delimiterLabel.textContent = 'Split Delimiter:';
      
      const delimiterInput = document.createElement('input');
      delimiterInput.type = 'text';
      delimiterInput.id = 'splitDelimiter';
      delimiterInput.value = node.splitDelimiter || '\\n';
      delimiterInput.placeholder = 'Enter delimiter (\\n for newline)';
      
      delimiterGroup.appendChild(delimiterLabel);
      delimiterGroup.appendChild(delimiterInput);
      logicOptionsSection.appendChild(delimiterGroup);
      
      // Max items option
      const maxItemsGroup = document.createElement('div');
      maxItemsGroup.className = 'form-group';
      
      const maxItemsLabel = document.createElement('label');
      maxItemsLabel.htmlFor = 'maxItems';
      maxItemsLabel.textContent = 'Maximum Items:';
      
      const maxItemsInput = document.createElement('input');
      maxItemsInput.type = 'number';
      maxItemsInput.id = 'maxItems';
      maxItemsInput.value = node.maxItems || 10;
      maxItemsInput.min = 1;
      maxItemsInput.max = 100;
      
      maxItemsGroup.appendChild(maxItemsLabel);
      maxItemsGroup.appendChild(maxItemsInput);
      logicOptionsSection.appendChild(maxItemsGroup);
      
      // Parallel processing option
      const parallelGroup = document.createElement('div');
      parallelGroup.className = 'form-group';
      
      const parallelCheckbox = document.createElement('div');
      parallelCheckbox.className = 'checkbox-group';
      
      const parallelInput = document.createElement('input');
      parallelInput.type = 'checkbox';
      parallelInput.id = 'splitParallel';
      parallelInput.checked = node.splitParallel !== false;
      
      const parallelLabel = document.createElement('label');
      parallelLabel.htmlFor = 'splitParallel';
      parallelLabel.textContent = 'Process items in parallel';
      
      parallelCheckbox.appendChild(parallelInput);
      parallelCheckbox.appendChild(parallelLabel);
      parallelGroup.appendChild(parallelCheckbox);
      logicOptionsSection.appendChild(parallelGroup);
      
      // Add event listeners to update the node properties
      delimiterInput.addEventListener('change', () => {
        node.splitDelimiter = delimiterInput.value;
      });
      
      maxItemsInput.addEventListener('change', () => {
        node.maxItems = parseInt(maxItemsInput.value, 10);
      });
      
      parallelInput.addEventListener('change', () => {
        node.splitParallel = parallelInput.checked;
      });
    } else if (node.nodeType === 'conditional') {
      // Add conditional options
      
      // Criteria option
      const criteriaGroup = document.createElement('div');
      criteriaGroup.className = 'form-group';
      
      const criteriaLabel = document.createElement('label');
      criteriaLabel.htmlFor = 'conditionCriteria';
      criteriaLabel.textContent = 'Success Criteria:';
      
      const criteriaInput = document.createElement('input');
      criteriaInput.type = 'text';
      criteriaInput.id = 'conditionCriteria';
      criteriaInput.value = node.conditionCriteria || 'PASS';
      criteriaInput.placeholder = 'Text that indicates success';
      
      criteriaGroup.appendChild(criteriaLabel);
      criteriaGroup.appendChild(criteriaInput);
      logicOptionsSection.appendChild(criteriaGroup);
      
      // Max iterations option
      const maxIterationsGroup = document.createElement('div');
      maxIterationsGroup.className = 'form-group';
      
      const maxIterationsLabel = document.createElement('label');
      maxIterationsLabel.htmlFor = 'maxIterations';
      maxIterationsLabel.textContent = 'Maximum Iterations:';
      
      const maxIterationsInput = document.createElement('input');
      maxIterationsInput.type = 'number';
      maxIterationsInput.id = 'maxIterations';
      maxIterationsInput.value = node.maxIterations || 3;
      maxIterationsInput.min = 1;
      maxIterationsInput.max = 10;
      
      maxIterationsGroup.appendChild(maxIterationsLabel);
      maxIterationsGroup.appendChild(maxIterationsInput);
      logicOptionsSection.appendChild(maxIterationsGroup);
      
      // Current iteration display
      const currentIterationGroup = document.createElement('div');
      currentIterationGroup.className = 'form-group';
      
      const currentIterationLabel = document.createElement('label');
      currentIterationLabel.textContent = 'Current Iteration:';
      
      const currentIterationValue = document.createElement('span');
      currentIterationValue.id = 'currentIteration';
      currentIterationValue.textContent = node.currentIteration || 0;
      
      currentIterationGroup.appendChild(currentIterationLabel);
      currentIterationGroup.appendChild(currentIterationValue);
      logicOptionsSection.appendChild(currentIterationGroup);
      
      // Add event listeners to update the node properties
      criteriaInput.addEventListener('change', () => {
        node.conditionCriteria = criteriaInput.value;
      });
      
      maxIterationsInput.addEventListener('change', () => {
        node.maxIterations = parseInt(maxIterationsInput.value, 10);
      });
    }
  }
};

// Extend the App object to update the node editor for logic nodes
document.addEventListener('DOMContentLoaded', function() {
  if (window.App) {
    // Store the original openNodeEditor method
    const originalOpenNodeEditor = App.openNodeEditor;
    
    // Override the openNodeEditor method to add logic node options
    App.openNodeEditor = function(node) {
      // Call the original method
      originalOpenNodeEditor.call(App, node);
      
      // Add logic node options if needed
      if (node && (node.nodeType === 'splitter' || node.nodeType === 'conditional')) {
        LogicNodes.updateNodeEditor(node);
      }
    };
  }
});
