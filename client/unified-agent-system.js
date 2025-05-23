/**
 * Unified Agent System
 * 
 * This file consolidates all agent-related functionality and fixes,
 * replacing the numerous individual fix scripts.
 */

(function() {
    'use strict';

    console.log('[UnifiedAgentSystem] Initializing...');

    // Create the unified agent system
    window.UnifiedAgentSystem = {
        initialized: false,
        
        // Initialize the system
        async init() {
            if (this.initialized) {
                console.log('[UnifiedAgentSystem] Already initialized');
                return;
            }

            console.log('[UnifiedAgentSystem] Starting initialization');

            try {
                // 1. Fix API base URL
                this.fixApiBaseUrl();
                
                // 2. Fix tool names and schemas
                this.fixToolNames();
                this.fixMCPToolSchemas();
                
                // 3. Initialize MCP tools
                await this.initializeMCPTools();
                
                // 4. Initialize agent nodes
                await this.initializeAgentNodes();
                
                // 5. Fix network resilience
                this.addNetworkResilience();
                
                // 6. Add agent node button
                this.addAgentNodeButton();
                
                // 7. Fix Perplexity configuration
                this.fixPerplexityConfiguration();
                
                this.initialized = true;
                console.log('[UnifiedAgentSystem] Initialization complete');
                
            } catch (error) {
                console.error('[UnifiedAgentSystem] Initialization error:', error);
                throw error;
            }
        },

        // Fix API base URL for Docker environments
        fixApiBaseUrl() {
            console.log('[UnifiedAgentSystem] Fixing API base URL');
            
            // Store original fetch
            const originalFetch = window.fetch;
            
            // Override fetch to handle Docker environment
            window.fetch = function(url, options = {}) {
                // Convert relative URLs to absolute
                if (typeof url === 'string' && url.startsWith('/')) {
                    const baseUrl = window.location.origin;
                    url = baseUrl + url;
                }
                
                // Add timeout handling
                const timeout = options.timeout || 300000; // 5 minutes default
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                options.signal = controller.signal;
                
                return originalFetch(url, options)
                    .finally(() => clearTimeout(timeoutId))
                    .catch(error => {
                        if (error.name === 'AbortError') {
                            throw new Error('Request timeout');
                        }
                        throw error;
                    });
            };
        },

        // Fix tool names for OpenAI compatibility
        fixToolNames() {
            console.log('[UnifiedAgentSystem] Fixing tool names');
            
            // Function to sanitize tool names
            window.sanitizeToolName = function(name) {
                if (!name || typeof name !== 'string') return 'unknown_tool';
                
                // Remove MCP prefix if present
                name = name.replace(/^mcp__/, '');
                
                // Replace invalid characters with underscores
                return name.replace(/[^a-zA-Z0-9_-]/g, '_')
                          .replace(/^-+/, '')
                          .replace(/-+$/, '')
                          .replace(/_{2,}/g, '_')
                          .toLowerCase();
            };
        },

        // Fix MCP tool schemas
        fixMCPToolSchemas() {
            console.log('[UnifiedAgentSystem] Fixing MCP tool schemas');
            
            if (window.MCPTools && window.MCPTools.tools) {
                window.MCPTools.tools = window.MCPTools.tools.map(tool => {
                    // Ensure tool has required fields
                    if (!tool.function?.name) {
                        console.warn('[UnifiedAgentSystem] Tool missing name:', tool);
                        return null;
                    }
                    
                    // Sanitize tool name
                    const sanitizedName = window.sanitizeToolName(tool.function.name);
                    
                    // Create properly formatted tool
                    return {
                        type: 'function',
                        function: {
                            name: sanitizedName,
                            description: tool.function.description || 'No description available',
                            parameters: tool.function.parameters || {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        }
                    };
                }).filter(Boolean);
            }
        },

        // Initialize MCP tools
        async initializeMCPTools() {
            console.log('[UnifiedAgentSystem] Initializing MCP tools');
            
            if (!window.MCPTools) {
                console.warn('[UnifiedAgentSystem] MCPTools not available');
                return;
            }
            
            try {
                await window.MCPTools.init();
                
                // Register with AgentTools
                if (window.AgentTools && window.MCPTools.registerWithAgentTools) {
                    window.MCPTools.registerWithAgentTools();
                    console.log('[UnifiedAgentSystem] MCP tools registered with AgentTools');
                }
            } catch (error) {
                console.error('[UnifiedAgentSystem] Error initializing MCP tools:', error);
            }
        },

        // Initialize agent nodes
        async initializeAgentNodes() {
            console.log('[UnifiedAgentSystem] Initializing agent nodes');
            
            // Create AgentNodes if it doesn't exist
            if (!window.AgentNodes) {
                window.AgentNodes = this.createAgentNodesSystem();
            }
            
            // Initialize agent nodes
            if (window.AgentNodes && typeof window.AgentNodes.init === 'function') {
                try {
                    await window.AgentNodes.init();
                    console.log('[UnifiedAgentSystem] Agent nodes initialized');
                } catch (error) {
                    console.error('[UnifiedAgentSystem] Error initializing agent nodes:', error);
                }
            }
        },

        // Create agent nodes system
        createAgentNodesSystem() {
            console.log('[UnifiedAgentSystem] Creating agent nodes system');
            
            return {
                initialized: false,
                
                init() {
                    if (this.initialized) return;
                    
                    console.log('[AgentNodes] Initializing');
                    
                    // Set up agent node processing
                    this.setupAgentProcessing();
                    
                    // Update tools list
                    this.updateToolsList();
                    
                    this.initialized = true;
                },
                
                setupAgentProcessing() {
                    // Override processNode for agent nodes
                    const originalProcessNode = window.App?.processNode;
                    if (originalProcessNode) {
                        window.App.processNode = async function(node) {
                            if (node.type === 'agent') {
                                return window.AgentNodes.processAgentNode(node);
                            }
                            return originalProcessNode.call(this, node);
                        };
                    }
                },
                
                async processAgentNode(node) {
                    console.log('[AgentNodes] Processing agent node:', node.id);
                    
                    try {
                        // Get available tools
                        const tools = window.AgentTools?.getAllTools() || [];
                        
                        // Prepare messages
                        const messages = [
                            {
                                role: 'system',
                                content: node.systemPrompt || 'You are a helpful AI assistant.'
                            },
                            {
                                role: 'user',
                                content: node.content || ''
                            }
                        ];
                        
                        // Make API call with tools
                        const response = await window.ApiService.callOpenAI({
                            messages,
                            tools: tools.length > 0 ? tools : undefined,
                            temperature: 0.7,
                            max_tokens: 2000
                        });
                        
                        // Handle tool calls if present
                        if (response.tool_calls && response.tool_calls.length > 0) {
                            const toolResults = await window.AgentTools.executeTools(response.tool_calls);
                            
                            // Add tool results to messages
                            messages.push({
                                role: 'assistant',
                                content: response.content || '',
                                tool_calls: response.tool_calls
                            });
                            
                            toolResults.forEach(result => {
                                messages.push({
                                    role: 'tool',
                                    content: result.content,
                                    tool_call_id: result.tool_call_id
                                });
                            });
                            
                            // Get final response
                            const finalResponse = await window.ApiService.callOpenAI({
                                messages,
                                temperature: 0.7,
                                max_tokens: 2000
                            });
                            
                            return finalResponse.content;
                        }
                        
                        return response.content;
                        
                    } catch (error) {
                        console.error('[AgentNodes] Processing error:', error);
                        throw error;
                    }
                },
                
                updateToolsList() {
                    const tools = window.AgentTools?.getAllTools() || [];
                    console.log(`[AgentNodes] Available tools: ${tools.length}`);
                },
                
                addAgentNodeButton() {
                    const btn = document.getElementById('addAgentNodeBtn');
                    if (!btn) return;
                    
                    btn.addEventListener('click', () => {
                        if (window.App && window.App.addNode) {
                            const node = window.App.addNode();
                            if (node) {
                                node.type = 'agent';
                                node.title = 'Agent Node';
                                node.systemPrompt = 'You are a helpful AI assistant with access to various tools.';
                                node.content = '';
                                node.maxIterations = 5;
                                node.color = '#9c27b0';
                                
                                // Redraw the node
                                if (window.App.drawNode) {
                                    window.App.drawNode(node);
                                }
                            }
                        }
                    });
                }
            };
        },

        // Add network resilience
        addNetworkResilience() {
            console.log('[UnifiedAgentSystem] Adding network resilience');
            
            // Add retry logic to ApiService
            if (window.ApiService) {
                const originalCallOpenAI = window.ApiService.callOpenAI;
                
                window.ApiService.callOpenAI = async function(payload) {
                    const maxRetries = 3;
                    let lastError;
                    
                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            return await originalCallOpenAI.call(this, payload);
                        } catch (error) {
                            lastError = error;
                            console.warn(`[UnifiedAgentSystem] API call failed (attempt ${i + 1}/${maxRetries}):`, error);
                            
                            if (i < maxRetries - 1) {
                                // Wait before retrying
                                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                            }
                        }
                    }
                    
                    throw lastError;
                };
            }
        },

        // Add agent node button to toolbar
        addAgentNodeButton() {
            console.log('[UnifiedAgentSystem] Adding agent node button');
            
            // Wait for DOM and App to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.addAgentNodeButton());
                return;
            }
            
            if (!window.App) {
                setTimeout(() => this.addAgentNodeButton(), 100);
                return;
            }
            
            // Set up the button handler
            if (window.AgentNodes && window.AgentNodes.addAgentNodeButton) {
                window.AgentNodes.addAgentNodeButton();
            }
        },

        // Fix Perplexity configuration
        fixPerplexityConfiguration() {
            console.log('[UnifiedAgentSystem] Fixing Perplexity configuration');
            
            // Override the save config function to properly save Perplexity key
            const originalSaveConfig = window.saveConfig;
            if (originalSaveConfig) {
                window.saveConfig = function() {
                    // Get Perplexity API key
                    const perplexityKey = document.getElementById('perplexityApiKey')?.value;
                    if (perplexityKey) {
                        localStorage.setItem('perplexityApiKey', perplexityKey);
                        
                        // Update MCPTools if available
                        if (window.MCPTools && window.MCPTools.updatePerplexityKey) {
                            window.MCPTools.updatePerplexityKey(perplexityKey);
                        }
                    }
                    
                    // Call original save config
                    return originalSaveConfig.call(this);
                };
            }
            
            // Load Perplexity key on startup
            const savedPerplexityKey = localStorage.getItem('perplexityApiKey');
            if (savedPerplexityKey) {
                const perplexityInput = document.getElementById('perplexityApiKey');
                if (perplexityInput) {
                    perplexityInput.value = savedPerplexityKey;
                }
                
                // Update MCPTools
                if (window.MCPTools && window.MCPTools.updatePerplexityKey) {
                    window.MCPTools.updatePerplexityKey(savedPerplexityKey);
                }
            }
        }
    };

    // Auto-initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.UnifiedAgentSystem.init(), 100);
        });
    } else {
        setTimeout(() => window.UnifiedAgentSystem.init(), 100);
    }

})();