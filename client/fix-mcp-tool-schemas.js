// Fix MCP tool schemas to be OpenAI-compatible
console.log('🔧 Fixing MCP tool schemas...');

// Wait for MCP tools to be loaded
setTimeout(() => {
  if (window.MCPTools && window.MCPTools.tools) {
    console.log('🔧 Checking MCP tool schemas...');
    
    // Fix each MCP tool's schema
    window.MCPTools.tools.forEach(tool => {
      if (tool.parameters && tool.parameters.properties) {
        // Check for array properties without items
        Object.keys(tool.parameters.properties).forEach(propName => {
          const prop = tool.parameters.properties[propName];
          
          // If it's an array type without items, fix it
          if (prop.type === 'array' && !prop.items) {
            console.log(`🔧 Fixing array schema for ${tool.name}.${propName}`);
            
            // Add a generic items schema based on the property name
            if (propName === 'entities') {
              prop.items = {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' }
                }
              };
            } else if (propName === 'relations') {
              prop.items = {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  type: { type: 'string' }
                }
              };
            } else {
              // Generic object array
              prop.items = { type: 'object' };
            }
          }
        });
      }
    });
    
    console.log('✅ Fixed MCP tool schemas');
    
    // Also update AgentTools if they've been registered
    if (window.AgentTools && window.AgentTools.tools) {
      window.AgentTools.tools.forEach(tool => {
        if (tool.id && tool.id.startsWith('mcp-') && tool.parameters && tool.parameters.properties) {
          Object.keys(tool.parameters.properties).forEach(propName => {
            const prop = tool.parameters.properties[propName];
            if (prop.type === 'array' && !prop.items) {
              if (propName === 'entities') {
                prop.items = {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    description: { type: 'string' }
                  }
                };
              } else if (propName === 'relations') {
                prop.items = {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' },
                    type: { type: 'string' }
                  }
                };
              } else {
                prop.items = { type: 'object' };
              }
            }
          });
        }
      });
      
      console.log('✅ Updated AgentTools schemas');
    }
  }
}, 500);

// Also fix the MCP client integration schemas
if (window.MCP_SERVERS) {
  window.MCP_SERVERS.forEach(server => {
    if (server.tools) {
      server.tools.forEach(tool => {
        if (tool.inputSchema && tool.inputSchema.properties) {
          Object.keys(tool.inputSchema.properties).forEach(propName => {
            const prop = tool.inputSchema.properties[propName];
            if (prop.type === 'array' && !prop.items) {
              console.log(`🔧 Fixing MCP_SERVERS schema for ${tool.name}.${propName}`);
              if (propName === 'entities') {
                prop.items = {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    description: { type: 'string' }
                  }
                };
              } else {
                prop.items = { type: 'object' };
              }
            }
          });
        }
      });
    }
  });
}

console.log('✅ MCP tool schema fixes complete');