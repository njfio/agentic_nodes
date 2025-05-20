/**
 * Agent Draw Module
 * Provides drawing functionality for agent nodes
 */

// Create a self-executing function to avoid polluting the global scope
(function() {
  console.log('Initializing Agent Draw module');
  
  // Create the AgentDraw object
  const AgentDraw = {
    // Draw an agent node
    drawAgentNode: function(node, ctx) {
      console.log(`Drawing agent node ${node.id} with AgentDraw.drawAgentNode`);
      
      try {
        // Save the original styles
        const originalFill = ctx.fillStyle;
        const originalStroke = ctx.strokeStyle;
        const originalLineWidth = ctx.lineWidth;
        
        // Use purple gradient for agent nodes
        const gradient = ctx.createLinearGradient(node.x, node.y, node.x, node.y + node.height);
        gradient.addColorStop(0, '#9c27b0');  // Purple top
        gradient.addColorStop(1, '#7b1fa2');  // Darker purple bottom
        
        // Apply the gradient to the node
        ctx.fillStyle = node.selected ? '#4a90e2' :
                       node.processing ? '#d4af37' :
                       node.error ? '#e74c3c' : gradient;
        
        ctx.strokeStyle = '#ff00ff'; // Bright purple border for agent nodes
        ctx.lineWidth = 2; // Thicker border
        
        // Draw the node background and border
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, node.width, node.height, 5);
        ctx.fill();
        ctx.stroke();
        
        // Draw the node title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x + node.width / 2, node.y + 20);
        
        // Draw agent badge in the top-right corner
        const badgeX = node.x + node.width - 20;
        const badgeY = node.y + 20;
        const badgeRadius = 12;
        
        // Draw the badge circle
        ctx.fillStyle = '#9c27b0'; // Purple for agent nodes
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw the badge icon (robot emoji)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤖', badgeX, badgeY);
        
        // Reset text alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        
        // Draw iteration count if iterating
        if (node.isIterating) {
          const iterX = node.x + node.width - 20;
          const iterY = node.y + node.height - 20;
          
          // Draw iteration badge
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.arc(iterX, iterY, 15, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw iteration text
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${node.currentIteration}/${node.maxIterations}`, iterX, iterY);
          
          // Reset text alignment
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
        
        // Draw input and output areas
        const contentAreaX = node.x + 10;
        const inputAreaY = node.y + 40;
        const outputAreaY = node.y + node.height / 2 + 5;
        const contentAreaWidth = node.width - 20;
        const inputAreaHeight = node.inputCollapsed ? 20 : (node.height / 2) - 50;
        const outputAreaHeight = node.outputCollapsed ? 20 : (node.height / 2) - 25;
        
        // Draw input area
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);
        
        // Draw input label
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.fillText('INPUT:', contentAreaX + 5, inputAreaY - 2);
        
        // Draw input content if not collapsed
        if (!node.inputCollapsed && typeof node.drawInputContent === 'function') {
          node.drawInputContent(ctx, contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);
        } else {
          // Draw collapsed indicator
          ctx.fillStyle = '#666';
          ctx.font = '10px Arial';
          ctx.fillText('(collapsed)', contentAreaX + 50, inputAreaY + 15);
        }
        
        // Draw input border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(contentAreaX, inputAreaY, contentAreaWidth, inputAreaHeight);
        
        // Draw output area
        ctx.fillStyle = '#222';
        ctx.fillRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
        
        // Draw output label
        ctx.fillStyle = node.hasBeenProcessed ? '#4a90e2' : '#888';
        ctx.font = '10px Arial';
        ctx.fillText('OUTPUT:', contentAreaX + 5, outputAreaY - 2);
        
        // Make sure content is preloaded
        if (typeof node.preloadAllContent === 'function') {
          node.preloadAllContent();
        }
        
        // Draw output content based on type if not collapsed
        if (!node.outputCollapsed) {
          if (typeof node.drawTextContent === 'function' && 
              typeof node.drawImageContent === 'function' && 
              typeof node.drawVideoContent === 'function' && 
              typeof node.drawAudioContent === 'function' && 
              typeof node.drawChatContent === 'function') {
            
            switch (node.contentType) {
              case 'text':
                node.drawTextContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
                break;
              case 'image':
                node.drawImageContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
                break;
              case 'video':
                node.drawVideoContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
                break;
              case 'audio':
                node.drawAudioContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
                break;
              case 'chat':
                node.drawChatContent(ctx, contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
                break;
            }
          } else {
            // Fallback if drawing methods are not available
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText('(content)', contentAreaX + 50, outputAreaY + 15);
          }
        } else {
          // Draw collapsed indicator
          ctx.fillStyle = '#666';
          ctx.font = '10px Arial';
          ctx.fillText('(collapsed)', contentAreaX + 50, outputAreaY + 15);
        }
        
        // Draw output border
        ctx.strokeStyle = node.hasBeenProcessed ? '#4a90e2' : '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(contentAreaX, outputAreaY, contentAreaWidth, outputAreaHeight);
        
        // Draw node toolbar if available
        if (typeof node.drawNodeToolbar === 'function') {
          node.drawNodeToolbar(ctx);
        }
        
        // Draw connectors
        const radius = window.App && App.hoveredNode === node && App.hoveredConnector ?
                    App.CONNECTOR_HOVER_RADIUS || 10 :
                    App.CONNECTOR_RADIUS || 8;
        
        // Output connector
        const outputColor = window.App && App.hoveredNode === node && App.hoveredConnector === 'output' ?
                       '#6ab0ff' :
                       window.App && App.connectingNode && App.connectingNode !== node ?
                       (node.canAcceptInput && typeof node.canAcceptInput === 'function' && node.canAcceptInput(App.connectingNode) ? '#2ecc71' : '#e74c3c') :
                       '#4a90e2';
        
        ctx.fillStyle = outputColor;
        ctx.beginPath();
        ctx.arc(node.x + node.width, node.y + node.height/2, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Input connector
        const inputColor = window.App && App.hoveredNode === node && App.hoveredConnector === 'input' ?
                      '#6ab0ff' :
                      window.App && App.connectingNode === node ?
                      '#e74c3c' :
                      window.App && App.connectingNode ?
                      (node.canAcceptInput && typeof node.canAcceptInput === 'function' && node.canAcceptInput(App.connectingNode) ? '#2ecc71' : '#e74c3c') :
                      '#4a90e2';
        
        ctx.fillStyle = inputColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y + node.height/2, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Tooltip
        if (window.App && App.hoveredNode === node && !App.isDragging && !App.connectingNode) {
          const tooltipText = node.error ? node.error :
                           node.processing ? 'Processing...' :
                           'Double-click to edit';
          
          if (window.Utils && typeof Utils.drawTooltip === 'function') {
            Utils.drawTooltip(ctx, tooltipText, node.x + node.width/2, node.y);
          } else {
            // Fallback tooltip drawing
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(node.x + node.width/2 - 75, node.y - 30, 150, 25);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(tooltipText, node.x + node.width/2, node.y - 15);
            ctx.textAlign = 'left';
          }
        }
        
        // Restore the original styles
        ctx.fillStyle = originalFill;
        ctx.strokeStyle = originalStroke;
        ctx.lineWidth = originalLineWidth;
        
        console.log(`Successfully drew agent node ${node.id}`);
      } catch (error) {
        console.error(`Error drawing agent node ${node.id}:`, error);
        if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
          DebugManager.addLog(`Error drawing agent node ${node.id}: ${error.message}`, 'error');
        }
        
        // Try to restore the context to prevent cascading errors
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    }
  };
  
  // Ensure the AgentNodes object exists
  if (!window.AgentNodes) {
    console.log('Creating AgentNodes object in agent-draw.js');
    window.AgentNodes = {};
  }
  
  // Add the drawAgentNode method to the AgentNodes object
  window.AgentNodes.drawAgentNode = AgentDraw.drawAgentNode;
  
  console.log('Agent Draw module initialized, drawAgentNode method added to AgentNodes');
  
  // Log to debug panel if available
  if (typeof DebugManager !== 'undefined' && DebugManager.addLog) {
    DebugManager.addLog('Agent Draw module initialized, drawAgentNode method added to AgentNodes', 'success');
  }
})();
