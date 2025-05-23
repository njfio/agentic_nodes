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
          case 'collector':
            return LogicNodes.createCollectorNode();
          case 'conditional':
            return LogicNodes.createConditionalNode();
          case 'programmatic':
            return LogicNodes.createProgrammaticNode();
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
        if (this.nodeType === 'splitter' || this.nodeType === 'collector' || this.nodeType === 'conditional') {
          const iconX = this.x + 10;
          const iconY = this.y + 10;
          const iconSize = 16;

          ctx.save();

          // Set color based on node type
          if (this.nodeType === 'splitter') {
            ctx.fillStyle = '#e74c3c'; // Red for splitter
          } else if (this.nodeType === 'collector') {
            ctx.fillStyle = '#2ecc71'; // Green for collector
          } else {
            ctx.fillStyle = '#f39c12'; // Orange for conditional
          }

          ctx.beginPath();

          if (this.nodeType === 'splitter') {
            // Draw split icon (fork)
            ctx.moveTo(iconX, iconY);
            ctx.lineTo(iconX + iconSize, iconY);
            ctx.lineTo(iconX + iconSize/2, iconY + iconSize);
            ctx.closePath();
          } else if (this.nodeType === 'collector') {
            // Draw collector icon (funnel)
            ctx.moveTo(iconX, iconY);
            ctx.lineTo(iconX + iconSize, iconY);
            ctx.lineTo(iconX + iconSize - 4, iconY + iconSize);
            ctx.lineTo(iconX + 4, iconY + iconSize);
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
        } else if (this.nodeType === 'collector') {
          return LogicNodes.processCollectorNode(this, input);
        } else if (this.nodeType === 'conditional') {
          return LogicNodes.processConditionalNode(this, input);
        } else if (this.nodeType === 'programmatic') {
          return LogicNodes.processProgrammaticNode(this, input);
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

      // Add Collector Node button
      const collectorBtn = document.createElement('button');
      collectorBtn.id = 'addCollectorNodeBtn';
      collectorBtn.type = 'button';
      collectorBtn.textContent = 'Add Collector Node';
      collectorBtn.title = 'Add a node that collects and combines results from multiple sources';

      collectorBtn.addEventListener('click', () => {
        App.addNode('collector');
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

      // Add Programmatic Node button
      const programmaticBtn = document.createElement('button');
      programmaticBtn.id = 'addProgrammaticNodeBtn';
      programmaticBtn.type = 'button';
      programmaticBtn.textContent = 'Add Programmatic Node';
      programmaticBtn.title = 'Add a node that processes content programmatically';

      programmaticBtn.addEventListener('click', () => {
        App.addNode('programmatic');
      });

      // Insert the buttons after the Add Node button
      const addNodeBtn = document.getElementById('addNodeBtn');
      if (addNodeBtn && addNodeBtn.parentNode) {
        addNodeBtn.parentNode.insertBefore(splitterBtn, addNodeBtn.nextSibling);
        addNodeBtn.parentNode.insertBefore(collectorBtn, splitterBtn.nextSibling);
        addNodeBtn.parentNode.insertBefore(conditionalBtn, collectorBtn.nextSibling);
        addNodeBtn.parentNode.insertBefore(programmaticBtn, conditionalBtn.nextSibling);
      } else {
        toolbar.appendChild(splitterBtn);
        toolbar.appendChild(collectorBtn);
        toolbar.appendChild(conditionalBtn);
        toolbar.appendChild(programmaticBtn);
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

      // Add Collector Node: Shift + L (for coLlector)
      if (e.key === 'L' && e.shiftKey) {
        App.addNode('collector');
        e.preventDefault();
      }

      // Add Conditional Node: Shift + C
      if (e.key === 'C' && e.shiftKey) {
        App.addNode('conditional');
        e.preventDefault();
      }

      // Add Programmatic Node: Shift + P
      if (e.key === 'P' && e.shiftKey) {
        App.addNode('programmatic');
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
    node.splitMethod = 'delimiter'; // Options: delimiter, regex, json, csv, custom
    node.splitRegex = '';           // For regex splitting
    node.cleanupClones = true;      // Automatically cleanup cloned nodes
    node.clonedNodes = [];          // Track cloned nodes for cleanup

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

  // Create a Collector Node
  createCollectorNode() {
    const id = App.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);

    // Configure as a collector node
    node.title = "Collector Node " + id;
    node.nodeType = 'collector';
    node.contentType = 'text';
    node.aiProcessor = 'text-to-text';
    node.inputType = 'text';
    node.outputType = 'text';
    node.systemPrompt = "Collect and combine all inputs into a cohesive output.";
    node.width = 240;
    node.height = 200;

    // Add collector-specific properties
    node.collectedItems = {};
    node.combineMethod = 'concatenate'; // Options: concatenate, summarize, list, merge-json, aggregate, custom
    node.waitForAllInputs = true;      // Whether to wait for all inputs
    node.collectionTimeout = 30000;    // Timeout in milliseconds (30 seconds)
    node.collectionStartTime = null;   // Track when collection started
    node.expectedItemCount = 0;        // Expected number of items
    node.processPartialResults = false; // Process even if not all items collected
    node.separator = '\n\n';
    node.waitForAllInputs = true;       // Wait for all inputs before processing

    // Add the node to the canvas
    App.nodes.push(node);

    // Select the new node
    App.nodes.forEach(n => n.selected = false);
    node.selected = true;

    // Log the creation
    DebugManager.addLog(`Added new Collector Node "${node.title}" (ID: ${node.id})`, 'info');
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
    node.conditionExpression = 'true'; // JavaScript expression to evaluate
    node.conditionType = 'simple';      // Options: simple, complex, ai-evaluate, custom
    node.conditionCriteria = 'PASS';   // What to look for in AI evaluation
    node.conditionPaths = {             // Multiple condition paths
      'true': [],                       // Nodes to process when true
      'false': [],                      // Nodes to process when false
      'error': []                       // Nodes to process on error
    };
    node.maxIterations = 3;             // Maximum number of iterations
    node.currentIteration = 0;          // Current iteration count
    node.feedbackNode = null;           // Node to send feedback to on failure
    node.loopActive = false;            // Whether a loop is currently active
    node.conditionVariables = {};       // Variables available in condition evaluation

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

  // Create a Programmatic Node
  createProgrammaticNode() {
    const id = App.nodes.length + 1;
    const x = window.innerWidth/2 - 80;
    const y = window.innerHeight/2 - 40;
    const node = new Node(x, y, id);

    // Configure as a programmatic node
    node.title = "Programmatic Node " + id;
    node.nodeType = 'programmatic';
    node.contentType = 'text';
    node.aiProcessor = 'text-to-text';
    node.inputType = 'text';
    node.outputType = 'text';
    node.systemPrompt = "Process the input programmatically according to the selected program type.";
    node.width = 240;
    node.height = 200;

    // Add programmatic-specific properties
    node.programType = 'custom';  // Options: transform, filter, aggregate, custom
    node.programCode = '// Process the input\\n// Available: input, node, utils\\nreturn input;'; // Default code
    node.sandboxed = true;        // Run in sandboxed environment
    node.allowedModules = [];     // Modules allowed in sandbox
    node.programTimeout = 5000;   // Execution timeout (5 seconds)
    node.customCode = '';         // Legacy property for compatibility
    node.programUtils = {         // Utility functions available in sandbox
      log: (msg) => DebugManager.addLog(`[Programmatic ${node.id}] ${msg}`, 'info'),
      parse: {
        json: (str) => JSON.parse(str),
        csv: (str) => str.split('\\n').map(line => line.split(',')),
        number: (str) => Number(str)
      },
      format: {
        json: (obj) => JSON.stringify(obj, null, 2),
        currency: (num) => `$${num.toFixed(2)}`,
        percentage: (num) => `${(num * 100).toFixed(2)}%`
      }
    };

    // Add the node to the canvas
    App.nodes.push(node);

    // Select the new node
    App.nodes.forEach(n => n.selected = false);
    node.selected = true;

    // Log the creation
    DebugManager.addLog(`Added new Programmatic Node "${node.title}" (ID: ${node.id})`, 'info');
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

      // Get all outgoing connections from this splitter node
      const connections = App.connections.filter(conn => conn.fromNode === node);

      if (connections.length > 0) {
        // For each item, create a separate processing path for each outgoing connection
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Log the item being processed
          DebugManager.addLog(`Processing item ${i+1}/${items.length}: ${item.substring(0, 30)}${item.length > 30 ? '...' : ''}`, 'info');

          // Create a unique path ID for this item
          const pathId = `split_${node.id}_${i}`;

          // Create a metadata wrapper for the item
          const itemWithMetadata = {
            content: item,
            sourceNodeId: node.id,
            sourceItemIndex: i,
            itemNumber: i + 1,
            totalItems: items.length,
            splitPathId: pathId
          };

          // Create a separate processing path for each outgoing connection
          for (const connection of connections) {
            const toNode = connection.toNode;

            // Check if the target node is a collector
            if (toNode.nodeType === 'collector') {
              // For collector nodes, we send the metadata directly
              if (node.splitParallel) {
                // Process in parallel (don't await)
                App.processNodeAndConnections(toNode, itemWithMetadata, node).catch(err => {
                  DebugManager.addLog(`Error processing item ${i+1} in collector node "${toNode.title}": ${err.message}`, 'error');
                });
              } else {
                // Process sequentially (await)
                try {
                  await App.processNodeAndConnections(toNode, itemWithMetadata, node);
                } catch (err) {
                  DebugManager.addLog(`Error processing item ${i+1} in collector node "${toNode.title}": ${err.message}`, 'error');
                }
              }
            } else {
              // For regular nodes, we create a cloned path for this specific item
              // First, check if we've already created a cloned path for this connection and item
              const existingClonedNode = App.nodes.find(n =>
                n.isCloned &&
                n.pathId === pathId &&
                n.originalNodeId === toNode.id
              );

              if (existingClonedNode) {
                // We've already created a cloned path for this item, skip
                continue;
              }

              // Clone the entire path starting from this node for this specific item
              const clonedNodes = this.cloneProcessingPath(toNode, pathId, i, item);

              if (clonedNodes.length === 0) {
                DebugManager.addLog(`Failed to create cloned path for item ${i+1}`, 'error');
                continue;
              }

              // Get the first node in the cloned path
              const firstClonedNode = clonedNodes[0];

              // Format the content with metadata
              const formattedItem = `ITEM ${i+1} OF ${items.length}:\n\n${item}`;

              // Process the cloned node with this specific item
              if (node.splitParallel) {
                // Process in parallel (don't await)
                App.processNodeAndConnections(firstClonedNode, formattedItem, node).catch(err => {
                  DebugManager.addLog(`Error processing item ${i+1} in node "${firstClonedNode.title}": ${err.message}`, 'error');
                });
              } else {
                // Process sequentially (await)
                try {
                  await App.processNodeAndConnections(firstClonedNode, formattedItem, node);
                } catch (err) {
                  DebugManager.addLog(`Error processing item ${i+1} in node "${firstClonedNode.title}": ${err.message}`, 'error');
                }
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

  // Clone a processing path starting from a node
  cloneProcessingPath(startNode, pathId, itemIndex, item) {
    // Keep track of original to cloned node mapping
    const nodeMap = new Map();

    // Keep track of nodes to process
    const nodesToProcess = [startNode];

    // Keep track of processed nodes
    const processedNodes = new Set();

    // Keep track of cloned nodes
    const clonedNodes = [];

    // Process nodes until the queue is empty
    while (nodesToProcess.length > 0) {
      const node = nodesToProcess.shift();

      // Skip if already processed
      if (processedNodes.has(node.id)) {
        continue;
      }

      // Mark as processed
      processedNodes.add(node.id);

      // Clone the node
      const clonedNode = this.cloneNode(node, pathId, itemIndex, item);

      // Add to the list of cloned nodes
      clonedNodes.push(clonedNode);

      // Add to the node map
      nodeMap.set(node.id, clonedNode);

      // Find all outgoing connections
      const connections = App.connections.filter(conn => conn.fromNode === node);

      // Add connected nodes to the queue
      for (const connection of connections) {
        const toNode = connection.toNode;

        // Skip collector nodes - we don't clone them
        if (toNode.nodeType === 'collector') {
          // Create a connection from the cloned node to the collector
          const clonedFromNode = nodeMap.get(node.id);

          // Check if this connection already exists
          const existingConnection = App.connections.find(conn =>
            conn.fromNode === clonedFromNode &&
            conn.toNode === toNode
          );

          if (!existingConnection && clonedFromNode) {
            App.connections.push(new Connection(clonedFromNode, toNode));
          }
          continue;
        }

        // Add to the queue if not already processed
        if (!processedNodes.has(toNode.id)) {
          nodesToProcess.push(toNode);
        }
      }
    }

    // Create connections between cloned nodes
    for (const nodeId of processedNodes) {
      const originalNode = App.nodes.find(n => n.id === nodeId);
      const clonedNode = nodeMap.get(nodeId);

      if (originalNode && clonedNode) {
        // Find all outgoing connections
        const connections = App.connections.filter(conn => conn.fromNode === originalNode);

        // Create connections to cloned nodes
        for (const connection of connections) {
          const toNode = connection.toNode;

          // Skip collector nodes - already handled
          if (toNode.nodeType === 'collector') {
            continue;
          }

          const clonedToNode = nodeMap.get(toNode.id);

          if (clonedToNode) {
            // Check if this connection already exists
            const existingConnection = App.connections.find(conn =>
              conn.fromNode === clonedNode &&
              conn.toNode === clonedToNode
            );

            if (!existingConnection) {
              // Create a connection between cloned nodes
              App.connections.push(new Connection(clonedNode, clonedToNode));
            }
          }
        }
      }
    }

    return clonedNodes;
  },

  // Clone a node for a specific processing path
  cloneNode(node, pathId, itemIndex, item) {
    // Create a unique ID for the cloned node
    const clonedNodeId = `${node.id}_${pathId}`;

    // Check if this node has already been cloned for this path
    const existingClone = App.nodes.find(n => n.id === clonedNodeId);
    if (existingClone) {
      return existingClone;
    }

    // Create a new node with the same properties
    const clonedNode = new Node(node.x, node.y, clonedNodeId);

    // Copy all properties from the original node
    Object.assign(clonedNode, node);

    // Set the unique ID
    clonedNode.id = clonedNodeId;

    // Mark this as a cloned node
    clonedNode.isCloned = true;
    clonedNode.originalNodeId = node.id;
    clonedNode.pathId = pathId;
    clonedNode.itemIndex = itemIndex;
    clonedNode.splitItem = item;

    // Update the title to indicate which item it's processing
    clonedNode.title = `${node.title} (Item ${itemIndex + 1})`;

    // Adjust position to make it clear this is a cloned node
    // Offset based on the item index to avoid overlap
    clonedNode.x += 20 * (itemIndex + 1);
    clonedNode.y += 20 * (itemIndex + 1);

    // Reset processing state
    clonedNode.hasBeenProcessed = false;
    clonedNode.content = '';
    clonedNode.error = null;

    // Add the cloned node to the App
    App.nodes.push(clonedNode);

    return clonedNode;
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

  // Process a Programmatic Node
  async processProgrammaticNode(node, input) {
    if (!input) {
      throw new Error('No input provided to Programmatic Node');
    }

    // Log the start of processing
    DebugManager.addLog(`Processing Programmatic Node "${node.title}" (ID: ${node.id})`, 'info');

    try {
      // Handle different program types
      switch (node.programType) {
        case 'chapterProcessor':
          return await this.processChapterProcessor(node, input);
        case 'custom':
          return await this.processCustomCode(node, input);
        default:
          throw new Error(`Unknown program type: ${node.programType}`);
      }
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Programmatic Node "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Process a Chapter Processor
  async processChapterProcessor(node, input) {
    // Log the start of processing
    DebugManager.addLog(`Processing Chapter Processor "${node.title}" (ID: ${node.id})`, 'info');

    try {
      // First, use the node's system prompt to process the input
      // This allows users to customize how the chapters are processed
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

      // Split the processed input into chapters
      // First, try to split by "Chapter X:" pattern
      let chapters = processedInput.split(/Chapter \d+:/);

      // If that didn't work well, try splitting by newlines
      if (chapters.length <= 1) {
        chapters = processedInput.split(/\n\n+/);
      }

      // Filter out empty chapters
      chapters = chapters.filter(chapter => chapter.trim());

      // Limit the number of chapters if needed
      if (node.maxItems && chapters.length > node.maxItems) {
        DebugManager.addLog(`Limiting Chapter Processor to ${node.maxItems} chapters (${chapters.length} found)`, 'warning');
        chapters = chapters.slice(0, node.maxItems);
      }

      // Log the number of chapters
      DebugManager.addLog(`Chapter Processor "${node.title}" (ID: ${node.id}) found ${chapters.length} chapters`, 'info');

      // Store the chapters in the node for reference
      node.chapters = chapters;

      // Store the original input
      node.originalInput = input;

      // Mark the node as processed
      node.hasBeenProcessed = true;

      // Get visual guide information if specified
      let visualGuide = null;
      if (node.visualGuideNodeId) {
        const visualGuideNode = App.nodes.find(n => n.id === node.visualGuideNodeId);
        if (visualGuideNode && visualGuideNode.content) {
          visualGuide = visualGuideNode.content;
        }
      }

      // Process each chapter
      const processedChapters = [];

      // Get all outgoing connections from this node
      const connections = App.connections.filter(conn => conn.fromNode === node);

      if (connections.length > 0) {
        // For each chapter, create a separate processing path
        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];

          // Log the chapter being processed
          DebugManager.addLog(`Processing chapter ${i+1}/${chapters.length}: ${chapter.substring(0, 30)}${chapter.length > 30 ? '...' : ''}`, 'info');

          // Create a unique path ID for this chapter
          const pathId = `chapter_${node.id}_${i}`;

          // Create a metadata wrapper for the chapter
          const chapterWithMetadata = {
            content: chapter,
            sourceNodeId: node.id,
            sourceItemIndex: i,
            chapterNumber: i + 1,
            totalChapters: chapters.length,
            chapterPathId: pathId,
            visualGuide: visualGuide
          };

          // Process each step for this chapter
          let processedChapter = await this.processChapterSteps(node, chapterWithMetadata, connections, pathId, i);
          processedChapters.push(processedChapter);
        }
      }

      // Combine the processed chapters
      const result = processedChapters.join('\n\n---\n\n');

      // Store the result in the node's content
      node.content = result;

      return result;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Chapter Processor "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Process the steps for a chapter
  async processChapterSteps(node, chapterWithMetadata, connections, pathId, chapterIndex) {
    // Initialize the chapter processing result
    let chapterResult = {
      chapterNumber: chapterWithMetadata.chapterNumber,
      chapterTitle: `Chapter ${chapterWithMetadata.chapterNumber}`,
      chapterText: chapterWithMetadata.content,
      illustrationPrompt: '',
      illustration: null,
      formattedChapter: ''
    };

    // Process each step
    for (const step of node.processingSteps) {
      try {
        switch (step) {
          case 'write':
            // Write the full chapter
            chapterResult.chapterText = await this.processChapterWriting(node, chapterWithMetadata);
            break;

          case 'createIllustrationPrompt':
            // Create an illustration prompt
            chapterResult.illustrationPrompt = await this.processIllustrationPrompt(node, chapterResult, chapterWithMetadata);
            break;

          case 'generateIllustration':
            // Generate an illustration
            chapterResult.illustration = await this.processIllustrationGeneration(node, chapterResult.illustrationPrompt, chapterWithMetadata);
            break;

          case 'formatChapter':
            // Format the chapter
            chapterResult.formattedChapter = await this.processChapterFormatting(node, chapterResult, chapterWithMetadata);
            break;
        }
      } catch (error) {
        DebugManager.addLog(`Error processing step ${step} for chapter ${chapterWithMetadata.chapterNumber}: ${error.message}`, 'error');
      }
    }

    // For each connection, create a cloned path
    for (const connection of connections) {
      const toNode = connection.toNode;

      // Check if the target node is a collector
      if (toNode.nodeType === 'collector') {
        // For collector nodes, we send the formatted chapter directly
        if (node.processInParallel) {
          // Process in parallel (don't await)
          App.processNodeAndConnections(toNode, chapterResult.formattedChapter, node).catch(err => {
            DebugManager.addLog(`Error processing chapter ${chapterWithMetadata.chapterNumber} in collector node "${toNode.title}": ${err.message}`, 'error');
          });
        } else {
          // Process sequentially (await)
          try {
            await App.processNodeAndConnections(toNode, chapterResult.formattedChapter, node);
          } catch (err) {
            DebugManager.addLog(`Error processing chapter ${chapterWithMetadata.chapterNumber} in collector node "${toNode.title}": ${err.message}`, 'error');
          }
        }
      } else {
        // For other nodes, we clone the processing path
        const clonedNodes = this.cloneProcessingPath(toNode, pathId, chapterIndex, chapterResult.formattedChapter);

        if (clonedNodes.length > 0) {
          // Get the first node in the cloned path
          const firstClonedNode = clonedNodes[0];

          // Process the cloned node with this specific chapter
          if (node.processInParallel) {
            // Process in parallel (don't await)
            App.processNodeAndConnections(firstClonedNode, chapterResult.formattedChapter, node).catch(err => {
              DebugManager.addLog(`Error processing chapter ${chapterWithMetadata.chapterNumber} in node "${firstClonedNode.title}": ${err.message}`, 'error');
            });
          } else {
            // Process sequentially (await)
            try {
              await App.processNodeAndConnections(firstClonedNode, chapterResult.formattedChapter, node);
            } catch (err) {
              DebugManager.addLog(`Error processing chapter ${chapterWithMetadata.chapterNumber} in node "${firstClonedNode.title}": ${err.message}`, 'error');
            }
          }
        }
      }
    }

    return chapterResult.formattedChapter;
  },

  // Process chapter writing
  async processChapterWriting(node, chapterWithMetadata) {
    // Use the OpenAI API to write the chapter
    const config = ApiService.openai.getConfig();

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a children's book author. Write a full chapter for a children's book based on the chapter outline.
Use language appropriate for children aged 4-8, with engaging dialogue, descriptive scenes, and a clear narrative flow.
This is Chapter ${chapterWithMetadata.chapterNumber} of ${chapterWithMetadata.totalChapters}.`;

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
          { role: 'user', content: chapterWithMetadata.content }
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
    return data.choices[0].message.content;
  },

  // Process illustration prompt creation
  async processIllustrationPrompt(node, chapterResult, chapterWithMetadata) {
    // Use the OpenAI API to create an illustration prompt
    const config = ApiService.openai.getConfig();

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a children's book illustrator. Create a detailed illustration prompt for this chapter.
Identify the key scene that best represents this chapter. The prompt should be specific enough to generate a cohesive illustration that matches the story.
This is for Chapter ${chapterWithMetadata.chapterNumber} of ${chapterWithMetadata.totalChapters}.`;

    const userPrompt = `Chapter: ${chapterResult.chapterText}

${chapterWithMetadata.visualGuide ? `Visual Guide: ${chapterWithMetadata.visualGuide}` : ''}

Create a detailed illustration prompt for the key scene in this chapter.`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: config.maxTokens || 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  // Process illustration generation
  async processIllustrationGeneration(node, illustrationPrompt, chapterWithMetadata) {
    // Use the OpenAI API to generate an illustration
    const config = ApiService.openai.getConfig();

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('/api/openai/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openai-api-key': config.apiKey
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: illustrationPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data[0].url;
  },

  // Process chapter formatting
  async processChapterFormatting(node, chapterResult, chapterWithMetadata) {
    // Use the OpenAI API to format the chapter
    const config = ApiService.openai.getConfig();

    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a children's book editor. Format this chapter with proper layout for a children's book.
Include placeholders for the illustration. Format the text with appropriate paragraph breaks, dialogue formatting, and page layout considerations.
This is Chapter ${chapterWithMetadata.chapterNumber} of ${chapterWithMetadata.totalChapters}.`;

    const userPrompt = `Chapter: ${chapterResult.chapterText}

Illustration Prompt: ${chapterResult.illustrationPrompt}

Format this chapter with proper layout for a children's book.`;

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
          { role: 'user', content: userPrompt }
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
    return data.choices[0].message.content;
  },

  // Process custom code
  async processCustomCode(node, input) {
    // Log the start of processing
    DebugManager.addLog(`Processing Custom Code in "${node.title}" (ID: ${node.id})`, 'info');

    try {
      // Check if custom code is provided
      if (!node.customCode) {
        throw new Error('No custom code provided');
      }

      // Create a function from the custom code
      const customFunction = new Function('input', 'node', 'App', 'DebugManager', 'ApiService', node.customCode);

      // Execute the custom function
      const result = await customFunction(input, node, App, DebugManager, ApiService);

      // Store the result in the node's content
      node.content = result;
      node.hasBeenProcessed = true;

      return result;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Custom Code "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Process a Collector Node
  async processCollectorNode(node, input) {
    if (!input) {
      throw new Error('No input provided to Collector Node');
    }

    // Log the start of processing
    DebugManager.addLog(`Processing Collector Node "${node.title}" (ID: ${node.id})`, 'info');

    try {
      // Get the source node ID from the input metadata if available
      let sourceNodeId = null;
      let sourceItemIndex = null;
      let splitPathId = null;
      let fromClonedNode = false;
      let originalContent = input;

      // Check if the input is coming from a split path
      if (typeof input === 'object' && input !== null) {
        if (input.sourceNodeId && input.sourceItemIndex !== undefined) {
          sourceNodeId = input.sourceNodeId;
          sourceItemIndex = input.sourceItemIndex;
          splitPathId = input.splitPathId;
          originalContent = input.content; // Store the original content
          input = input.content; // Extract the actual content
        } else if (input.splitPathId) {
          // Legacy format
          splitPathId = input.splitPathId;
          const pathParts = input.splitPathId.split('_');
          sourceNodeId = pathParts[1];
          sourceItemIndex = parseInt(pathParts[2], 10);
          originalContent = input.content;
          input = input.content;
        }
      }

      // Check if the input is coming from a cloned node
      const incomingConnections = App.connections.filter(conn => conn.toNode === node);
      for (const conn of incomingConnections) {
        if (conn.fromNode.isCloned && conn.fromNode.pathId) {
          // This is a connection from a cloned node
          const pathParts = conn.fromNode.pathId.split('_');
          if (pathParts.length >= 3 && pathParts[0] === 'split') {
            // Extract the source information from the path ID
            sourceNodeId = pathParts[1];
            sourceItemIndex = parseInt(pathParts[2], 10);
            splitPathId = conn.fromNode.pathId;
            fromClonedNode = true;

            // If we don't have explicit metadata, use the cloned node's item
            if (!originalContent) {
              originalContent = conn.fromNode.splitItem;
            }

            break;
          }
        }
      }

      // Initialize collectedItems as an object if it's not already
      if (!node.collectedItems) {
        node.collectedItems = {};
      } else if (Array.isArray(node.collectedItems)) {
        // Convert array to object
        const tempItems = {};
        node.collectedItems.forEach((item, index) => {
          tempItems[`item_${index}`] = item;
        });
        node.collectedItems = tempItems;
      }

      // Add the input to the collected items
      if (sourceNodeId && sourceItemIndex !== null) {
        // Store with metadata
        const itemKey = `${sourceNodeId}_${sourceItemIndex}`;
        node.collectedItems[itemKey] = input;

        // Log the collection
        DebugManager.addLog(`Collector Node "${node.title}" (ID: ${node.id}) collected item from path ${splitPathId || itemKey}`, 'info');
      } else {
        // Just add to the object with a generic key
        const itemKey = `item_${Object.keys(node.collectedItems).length}`;
        node.collectedItems[itemKey] = input;

        // Log the collection
        DebugManager.addLog(`Collector Node "${node.title}" (ID: ${node.id}) collected item ${itemKey}`, 'info');
      }

      // Check if we've collected all expected items
      let allItemsCollected = true;
      let expectedItemCount = 0;

      // Find all splitter nodes that feed into this collector
      const splitterNodes = new Set();
      const clonedNodeSources = new Map(); // Map cloned node IDs to their original source

      // First, identify all splitter nodes and cloned nodes
      for (const conn of incomingConnections) {
        const fromNode = conn.fromNode;

        // Check if this is a cloned node
        if (fromNode.isCloned && fromNode.originalNodeId && fromNode.pathId) {
          // Extract the splitter node ID from the path ID
          const pathParts = fromNode.pathId.split('_');
          if (pathParts.length >= 3 && pathParts[0] === 'split') {
            const splitterId = pathParts[1];
            splitterNodes.add(splitterId);
            clonedNodeSources.set(fromNode.id, {
              splitterId,
              itemIndex: parseInt(pathParts[2], 10)
            });
          }
        }
        // Check if this is a direct splitter node
        else if (fromNode.nodeType === 'splitter' && fromNode.splitItems) {
          splitterNodes.add(fromNode.id);
        }
      }

      // If we have splitter nodes feeding in, check if we have all items
      if (splitterNodes.size > 0) {
        // Check if we have all items from all splitters
        for (const splitterId of splitterNodes) {
          const splitterNode = App.nodes.find(n => n.id === splitterId);
          if (splitterNode && splitterNode.splitItems) {
            for (let i = 0; i < splitterNode.splitItems.length; i++) {
              const itemKey = `${splitterId}_${i}`;
              if (!node.collectedItems[itemKey]) {
                allItemsCollected = false;
                break;
              }
            }
          }
        }

        // Count expected items from all splitters
        for (const splitterId of splitterNodes) {
          const splitterNode = App.nodes.find(n => n.id === splitterId);
          if (splitterNode && splitterNode.splitItems) {
            expectedItemCount += splitterNode.splitItems.length;
          }
        }
      } else {
        // No splitters, just check if we have at least one item from each incoming connection
        const sourceNodeIds = new Set();
        for (const key in node.collectedItems) {
          if (key.includes('_')) {
            sourceNodeIds.add(key.split('_')[0]);
          }
        }

        // Count direct connections from non-cloned nodes
        const directConnections = incomingConnections.filter(conn => !conn.fromNode.isCloned);

        // Count unique cloned node sources
        const clonedSources = new Set();
        for (const conn of incomingConnections) {
          if (conn.fromNode.isCloned && conn.fromNode.pathId) {
            const pathParts = conn.fromNode.pathId.split('_');
            if (pathParts.length >= 3 && pathParts[0] === 'split') {
              clonedSources.add(pathParts[1] + '_' + pathParts[2]);
            }
          }
        }

        allItemsCollected = sourceNodeIds.size >= (directConnections.length + clonedSources.size);
        expectedItemCount = directConnections.length + clonedSources.size;
      }

      // If we're not waiting for all inputs, process what we have
      if (!node.waitForAllInputs) {
        allItemsCollected = true;
      }

      if (!allItemsCollected) {
        // Not all items have been collected yet
        DebugManager.addLog(`Collector Node "${node.title}" (ID: ${node.id}) waiting for more items (${Object.keys(node.collectedItems).length}/${expectedItemCount})`, 'info');

        // Return a status message
        return `Collected ${Object.keys(node.collectedItems).length} of ${expectedItemCount} expected items. Waiting for more...`;
      }

      // All items have been collected, combine them
      let combinedOutput = '';

      // Sort the collected items by their keys to ensure consistent ordering
      const sortedItems = {};
      Object.keys(node.collectedItems).sort().forEach(key => {
        sortedItems[key] = node.collectedItems[key];
      });

      // Get the values to combine
      const itemsToProcess = Object.values(sortedItems);

      switch (node.combineMethod) {
        case 'concatenate':
          // Simply concatenate all items with the separator
          combinedOutput = itemsToProcess.join(node.separator);
          break;

        case 'summarize':
          // Use the OpenAI API to summarize the collected items
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
                { role: 'user', content: itemsToProcess.join(node.separator) }
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
          combinedOutput = data.choices[0].message.content;
          break;

        case 'list':
          // Format as a numbered list
          combinedOutput = itemsToProcess.map((item, i) => `${i+1}. ${item}`).join('\n');
          break;

        default:
          // Default to concatenation
          combinedOutput = itemsToProcess.join(node.separator);
      }

      // Log the combined output
      DebugManager.addLog(`Collector Node "${node.title}" (ID: ${node.id}) combined ${Object.keys(node.collectedItems).length} items`, 'success');

      // Store the combined output
      node.content = combinedOutput;
      node.hasBeenProcessed = true;

      // Return the combined output
      return combinedOutput;
    } catch (error) {
      // Log the error
      DebugManager.addLog(`Error in Collector Node "${node.title}" (ID: ${node.id}): ${error.message}`, 'error');

      // Set the error on the node
      node.error = error.message;

      // Throw the error to be handled by the caller
      throw error;
    }
  },

  // Update the node editor to show logic node options
  updateNodeEditor(node) {
    if (!node || (node.nodeType !== 'splitter' && node.nodeType !== 'collector' && node.nodeType !== 'conditional' && node.nodeType !== 'programmatic')) {
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
    } else if (node.nodeType === 'collector') {
      // Add collector options

      // Combine method option
      const combineMethodGroup = document.createElement('div');
      combineMethodGroup.className = 'form-group';

      const combineMethodLabel = document.createElement('label');
      combineMethodLabel.htmlFor = 'combineMethod';
      combineMethodLabel.textContent = 'Combine Method:';

      const combineMethodSelect = document.createElement('select');
      combineMethodSelect.id = 'combineMethod';

      const methods = [
        { value: 'concatenate', text: 'Concatenate (join with separator)' },
        { value: 'summarize', text: 'Summarize (use AI to combine)' },
        { value: 'list', text: 'List (numbered list format)' }
      ];

      methods.forEach(method => {
        const option = document.createElement('option');
        option.value = method.value;
        option.textContent = method.text;
        option.selected = node.combineMethod === method.value;
        combineMethodSelect.appendChild(option);
      });

      combineMethodGroup.appendChild(combineMethodLabel);
      combineMethodGroup.appendChild(combineMethodSelect);
      logicOptionsSection.appendChild(combineMethodGroup);

      // Separator option (for concatenate method)
      const separatorGroup = document.createElement('div');
      separatorGroup.className = 'form-group';
      separatorGroup.style.display = node.combineMethod === 'concatenate' ? 'block' : 'none';

      const separatorLabel = document.createElement('label');
      separatorLabel.htmlFor = 'separator';
      separatorLabel.textContent = 'Separator:';

      const separatorInput = document.createElement('input');
      separatorInput.type = 'text';
      separatorInput.id = 'separator';
      separatorInput.value = node.separator || '\n\n';
      separatorInput.placeholder = 'Enter separator (\\n for newline)';

      separatorGroup.appendChild(separatorLabel);
      separatorGroup.appendChild(separatorInput);
      logicOptionsSection.appendChild(separatorGroup);

      // Wait for all inputs option
      const waitForAllGroup = document.createElement('div');
      waitForAllGroup.className = 'form-group';

      const waitForAllCheckbox = document.createElement('div');
      waitForAllCheckbox.className = 'checkbox-group';

      const waitForAllInput = document.createElement('input');
      waitForAllInput.type = 'checkbox';
      waitForAllInput.id = 'waitForAllInputs';
      waitForAllInput.checked = node.waitForAllInputs !== false;

      const waitForAllLabel = document.createElement('label');
      waitForAllLabel.htmlFor = 'waitForAllInputs';
      waitForAllLabel.textContent = 'Wait for all inputs before processing';

      waitForAllCheckbox.appendChild(waitForAllInput);
      waitForAllCheckbox.appendChild(waitForAllLabel);
      waitForAllGroup.appendChild(waitForAllCheckbox);
      logicOptionsSection.appendChild(waitForAllGroup);

      // Collected items display
      const collectedItemsGroup = document.createElement('div');
      collectedItemsGroup.className = 'form-group';

      const collectedItemsLabel = document.createElement('label');
      collectedItemsLabel.textContent = 'Collected Items:';

      const collectedItemsValue = document.createElement('span');
      collectedItemsValue.id = 'collectedItems';

      // Count the collected items
      let itemCount = 0;
      if (Array.isArray(node.collectedItems)) {
        itemCount = node.collectedItems.length;
      } else if (node.collectedItems) {
        itemCount = Object.keys(node.collectedItems).length;
      }

      collectedItemsValue.textContent = itemCount;

      collectedItemsGroup.appendChild(collectedItemsLabel);
      collectedItemsGroup.appendChild(collectedItemsValue);
      logicOptionsSection.appendChild(collectedItemsGroup);

      // Add event listeners to update the node properties
      combineMethodSelect.addEventListener('change', () => {
        node.combineMethod = combineMethodSelect.value;

        // Show/hide separator input based on the selected method
        separatorGroup.style.display = node.combineMethod === 'concatenate' ? 'block' : 'none';
      });

      separatorInput.addEventListener('change', () => {
        node.separator = separatorInput.value;
      });

      waitForAllInput.addEventListener('change', () => {
        node.waitForAllInputs = waitForAllInput.checked;
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
    } else if (node.nodeType === 'programmatic') {
      // Add programmatic options

      // Program type option
      const programTypeGroup = document.createElement('div');
      programTypeGroup.className = 'form-group';

      const programTypeLabel = document.createElement('label');
      programTypeLabel.htmlFor = 'programType';
      programTypeLabel.textContent = 'Program Type:';

      const programTypeSelect = document.createElement('select');
      programTypeSelect.id = 'programType';

      const programTypes = [
        { value: 'chapterProcessor', text: 'Chapter Processor' },
        { value: 'custom', text: 'Custom Code' }
      ];

      programTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        option.selected = node.programType === type.value;
        programTypeSelect.appendChild(option);
      });

      programTypeGroup.appendChild(programTypeLabel);
      programTypeGroup.appendChild(programTypeSelect);
      logicOptionsSection.appendChild(programTypeGroup);

      // Parallel processing option
      const parallelGroup = document.createElement('div');
      parallelGroup.className = 'form-group';

      const parallelCheckbox = document.createElement('div');
      parallelCheckbox.className = 'checkbox-group';

      const parallelInput = document.createElement('input');
      parallelInput.type = 'checkbox';
      parallelInput.id = 'processInParallel';
      parallelInput.checked = node.processInParallel !== false;

      const parallelLabel = document.createElement('label');
      parallelLabel.htmlFor = 'processInParallel';
      parallelLabel.textContent = 'Process items in parallel';

      parallelCheckbox.appendChild(parallelInput);
      parallelCheckbox.appendChild(parallelLabel);
      parallelGroup.appendChild(parallelCheckbox);
      logicOptionsSection.appendChild(parallelGroup);

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

      // Program-specific options
      if (node.programType === 'chapterProcessor') {
        // Visual guide node option
        const visualGuideGroup = document.createElement('div');
        visualGuideGroup.className = 'form-group';

        const visualGuideLabel = document.createElement('label');
        visualGuideLabel.htmlFor = 'visualGuideNodeId';
        visualGuideLabel.textContent = 'Visual Guide Node ID:';

        const visualGuideInput = document.createElement('input');
        visualGuideInput.type = 'number';
        visualGuideInput.id = 'visualGuideNodeId';
        visualGuideInput.value = node.visualGuideNodeId || '';
        visualGuideInput.placeholder = 'ID of node with visual guide info';

        visualGuideGroup.appendChild(visualGuideLabel);
        visualGuideGroup.appendChild(visualGuideInput);
        logicOptionsSection.appendChild(visualGuideGroup);

        // Processing steps option
        const stepsGroup = document.createElement('div');
        stepsGroup.className = 'form-group';

        const stepsLabel = document.createElement('label');
        stepsLabel.textContent = 'Processing Steps:';
        stepsGroup.appendChild(stepsLabel);

        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'checkbox-group';

        const allSteps = [
          { value: 'write', text: 'Write Chapter' },
          { value: 'createIllustrationPrompt', text: 'Create Illustration Prompt' },
          { value: 'generateIllustration', text: 'Generate Illustration' },
          { value: 'formatChapter', text: 'Format Chapter' }
        ];

        allSteps.forEach(step => {
          const stepDiv = document.createElement('div');
          stepDiv.className = 'form-check';

          const stepInput = document.createElement('input');
          stepInput.type = 'checkbox';
          stepInput.className = 'form-check-input';
          stepInput.id = `step-${step.value}`;
          stepInput.checked = node.processingSteps && node.processingSteps.includes(step.value);

          const stepLabel = document.createElement('label');
          stepLabel.className = 'form-check-label';
          stepLabel.htmlFor = `step-${step.value}`;
          stepLabel.textContent = step.text;

          stepDiv.appendChild(stepInput);
          stepDiv.appendChild(stepLabel);
          stepsContainer.appendChild(stepDiv);

          // Add event listener for this step
          stepInput.addEventListener('change', () => {
            if (!node.processingSteps) {
              node.processingSteps = [];
            }

            if (stepInput.checked && !node.processingSteps.includes(step.value)) {
              node.processingSteps.push(step.value);
            } else if (!stepInput.checked && node.processingSteps.includes(step.value)) {
              node.processingSteps = node.processingSteps.filter(s => s !== step.value);
            }
          });
        });

        stepsGroup.appendChild(stepsContainer);
        logicOptionsSection.appendChild(stepsGroup);

        // Add event listener for visual guide node ID
        visualGuideInput.addEventListener('change', () => {
          node.visualGuideNodeId = parseInt(visualGuideInput.value, 10) || null;
        });
      } else if (node.programType === 'custom') {
        // Custom code option
        const customCodeGroup = document.createElement('div');
        customCodeGroup.className = 'form-group';

        const customCodeLabel = document.createElement('label');
        customCodeLabel.htmlFor = 'customCode';
        customCodeLabel.textContent = 'Custom Code:';

        const customCodeTextarea = document.createElement('textarea');
        customCodeTextarea.id = 'customCode';
        customCodeTextarea.className = 'form-control';
        customCodeTextarea.rows = 10;
        customCodeTextarea.value = node.customCode || '';
        customCodeTextarea.placeholder = '// Custom JavaScript code\n// Available variables: input, node, App, DebugManager, ApiService\n// Return the processed result\nreturn input;';

        customCodeGroup.appendChild(customCodeLabel);
        customCodeGroup.appendChild(customCodeTextarea);
        logicOptionsSection.appendChild(customCodeGroup);

        // Add event listener for custom code
        customCodeTextarea.addEventListener('change', () => {
          node.customCode = customCodeTextarea.value;
        });
      }

      // Add event listeners to update the node properties
      programTypeSelect.addEventListener('change', () => {
        node.programType = programTypeSelect.value;

        // Refresh the node editor to show/hide relevant options
        LogicNodes.updateNodeEditor(node);
      });

      parallelInput.addEventListener('change', () => {
        node.processInParallel = parallelInput.checked;
      });

      maxItemsInput.addEventListener('change', () => {
        node.maxItems = parseInt(maxItemsInput.value, 10);
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
      if (node && (node.nodeType === 'splitter' || node.nodeType === 'collector' || node.nodeType === 'conditional' || node.nodeType === 'programmatic')) {
        LogicNodes.updateNodeEditor(node);
      }
    };
  }
});
