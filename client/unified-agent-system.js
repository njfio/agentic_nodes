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

                // 8. Add localStorage quota management
                this.addLocalStorageQuotaManagement();

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
                let originalUrl = url;

                // Comprehensive URL fixing
                if (typeof url === 'string') {
                    // Fix v2 API endpoints that don't exist - redirect to v1 FIRST
                    if (url.includes('/api/v2/openai/chat')) {
                        url = url.replace('/api/v2/openai/chat', '/api/openai/chat');
                        console.log('[UnifiedAgentSystem] Redirected v2 OpenAI chat endpoint to v1');
                    }

                    // Fix v2 workflows endpoint to v1
                    if (url.includes('/api/v2/workflows/')) {
                        url = url.replace('/api/v2/workflows/', '/api/workflows/');
                        console.log('[UnifiedAgentSystem] Redirected v2 workflows endpoint to v1');
                    }

                    if (url.includes('/api/v2/mcp/')) {
                        // For now, disable MCP v2 endpoints that cause SSL errors
                        console.warn('[UnifiedAgentSystem] Blocking v2 MCP endpoint to prevent SSL errors:', url);
                        return Promise.reject(new Error('MCP v2 endpoints temporarily disabled to prevent SSL errors'));
                    }

                    // Fix double API path issue (e.g., /api/v2/api/images -> /api/images)
                    if (url.includes('/api/v2/api/')) {
                        url = url.replace('/api/v2/api/', '/api/');
                        console.log('[UnifiedAgentSystem] Fixed double API path in URL');
                    }

                    // Fix any HTTPS localhost URLs to HTTP BEFORE adding base URL
                    if (url.startsWith('https://localhost')) {
                        url = url.replace('https://localhost', 'http://localhost');
                        console.log('[UnifiedAgentSystem] Fixed HTTPS localhost URL to HTTP');
                    }
                }

                // Convert relative URLs to absolute and fix protocol issues
                if (typeof url === 'string' && url.startsWith('/')) {
                    // Always use HTTP for localhost to avoid SSL issues
                    const protocol = 'http:';
                    const baseUrl = `${protocol}//${window.location.host}`;
                    url = baseUrl + url;
                }

                // Final check for any remaining HTTPS localhost URLs
                if (typeof url === 'string' && url.includes('https://localhost')) {
                    url = url.replace('https://localhost', 'http://localhost');
                    console.log('[UnifiedAgentSystem] Final fix: HTTPS localhost URL to HTTP');
                }

                // Log URL transformation if it changed
                if (url !== originalUrl) {
                    console.log(`[UnifiedAgentSystem] URL transformed: ${originalUrl} -> ${url}`);
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

            // Create AgentNodes if it doesn't exist, or extend existing one
            if (!window.AgentNodes) {
                console.log('[UnifiedAgentSystem] Creating new AgentNodes object');
                window.AgentNodes = this.createAgentNodesSystem();
            } else {
                console.log('[UnifiedAgentSystem] Extending existing AgentNodes object');
                // Extend existing AgentNodes with our methods
                const agentNodesSystem = this.createAgentNodesSystem();
                Object.assign(window.AgentNodes, agentNodesSystem);
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
                    if (!btn) {
                        console.warn('[AgentNodes] Agent node button not found');
                        return;
                    }

                    btn.addEventListener('click', () => {
                        console.log('[AgentNodes] Agent node button clicked');

                        // Use AgentProcessor to create the agent node
                        if (window.AgentProcessor && typeof window.AgentProcessor.createAgentNode === 'function') {
                            try {
                                console.log('[AgentNodes] Using AgentProcessor to create agent node');
                                const node = window.AgentProcessor.createAgentNode();

                                if (node) {
                                    console.log(`[AgentNodes] Successfully created agent node ${node.id} with type: ${node.type || node.nodeType}, isAgentNode: ${node.isAgentNode}`);

                                    // Force a redraw of the canvas
                                    if (window.App && window.App.draw) {
                                        window.App.draw();
                                    }
                                } else {
                                    console.error('[AgentNodes] AgentProcessor.createAgentNode returned null');
                                }
                            } catch (error) {
                                console.error('[AgentNodes] Error using AgentProcessor:', error);

                                // Fallback to the old method
                                this.fallbackCreateAgentNode();
                            }
                        } else {
                            console.warn('[AgentNodes] AgentProcessor not available, using fallback method');
                            this.fallbackCreateAgentNode();
                        }
                    });
                },

                // Fallback method for creating agent nodes when AgentProcessor is not available
                fallbackCreateAgentNode() {
                    console.log('[AgentNodes] Using fallback agent node creation method');

                    if (window.App && window.App.addNode) {
                        // Try calling addNode with 'agent' parameter first
                        let node = null;
                        try {
                            console.log('[AgentNodes] Trying to create agent node with type parameter');
                            node = window.App.addNode('agent');
                        } catch (error) {
                            console.warn('[AgentNodes] Failed to create agent node with type parameter, trying without:', error);
                            // Fallback to calling without parameters
                            try {
                                node = window.App.addNode();
                            } catch (fallbackError) {
                                console.error('[AgentNodes] Failed to create node even without parameters:', fallbackError);
                            }
                        }

                        if (node) {
                            // Set all the agent node properties
                            node.type = 'agent';
                            node.nodeType = 'agent';
                            node._nodeType = 'agent';
                            node.isAgentNode = true;
                            node.title = 'Agent Node';
                            node.systemPrompt = 'You are a helpful AI assistant with access to various tools.';
                            node.content = '';
                            node.maxIterations = 5;
                            node.color = '#9c27b0';

                            console.log(`[AgentNodes] Created fallback agent node ${node.id} with type: ${node.type}, nodeType: ${node.nodeType}, isAgentNode: ${node.isAgentNode}`);

                            // Force a redraw of the canvas
                            if (window.App && window.App.draw) {
                                window.App.draw();
                            }
                        } else {
                            console.error('[AgentNodes] Failed to create node using fallback method');
                        }
                    } else {
                        console.error('[AgentNodes] App or App.addNode not available for fallback');
                    }
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
        },

        // Add localStorage quota management
        addLocalStorageQuotaManagement() {
            console.log('[UnifiedAgentSystem] Adding localStorage quota management');

            // Override localStorage.setItem to handle quota exceeded errors
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = function(key, value) {
                try {
                    originalSetItem.call(this, key, value);
                } catch (error) {
                    if (error.name === 'QuotaExceededError' || error.message.includes('quota exceeded')) {
                        console.warn('[UnifiedAgentSystem] localStorage quota exceeded, attempting cleanup');

                        // Clear old workflow data and image cache
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const storageKey = localStorage.key(i);
                            if (storageKey && (
                                storageKey.startsWith('workflow_') ||
                                storageKey.startsWith('image_') ||
                                storageKey.startsWith('cache_') ||
                                storageKey.includes('_old') ||
                                storageKey.includes('_backup')
                            )) {
                                keysToRemove.push(storageKey);
                            }
                        }

                        // Remove old data
                        keysToRemove.forEach(key => {
                            try {
                                localStorage.removeItem(key);
                            } catch (e) {
                                console.warn('Error removing localStorage key:', key, e);
                            }
                        });

                        console.log(`[UnifiedAgentSystem] Cleaned up ${keysToRemove.length} localStorage items`);

                        // Try to save again after cleanup
                        try {
                            originalSetItem.call(this, key, value);
                            console.log('[UnifiedAgentSystem] Successfully saved after cleanup');
                        } catch (retryError) {
                            console.error('[UnifiedAgentSystem] Still unable to save after cleanup:', retryError);
                            // Truncate the value if it's too large
                            if (typeof value === 'string' && value.length > 1000000) {
                                const truncatedValue = value.substring(0, 1000000);
                                try {
                                    originalSetItem.call(this, key, truncatedValue);
                                    console.log('[UnifiedAgentSystem] Saved truncated value');
                                } catch (truncateError) {
                                    console.error('[UnifiedAgentSystem] Unable to save even truncated value:', truncateError);
                                }
                            }
                        }
                    } else {
                        throw error;
                    }
                }
            };

            // Add periodic cleanup
            setInterval(() => {
                try {
                    const usage = this.getLocalStorageUsage();
                    if (usage.percentage > 80) {
                        console.log(`[UnifiedAgentSystem] localStorage usage at ${usage.percentage}%, performing cleanup`);
                        this.cleanupOldData();
                    }
                } catch (error) {
                    console.warn('[UnifiedAgentSystem] Error during periodic cleanup:', error);
                }
            }, 300000); // Check every 5 minutes
        },

        // Get localStorage usage information
        getLocalStorageUsage() {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }

            // Estimate quota (usually 5-10MB)
            const estimatedQuota = 5 * 1024 * 1024; // 5MB
            const percentage = Math.round((totalSize / estimatedQuota) * 100);

            return {
                used: totalSize,
                estimated: estimatedQuota,
                percentage: percentage
            };
        },

        // Clean up old data from localStorage
        cleanupOldData() {
            const keysToRemove = [];
            const now = Date.now();
            const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('workflow_') ||
                    key.startsWith('image_') ||
                    key.startsWith('cache_') ||
                    key.includes('_temp') ||
                    key.includes('_backup')
                )) {
                    try {
                        const item = localStorage.getItem(key);
                        if (item) {
                            const parsed = JSON.parse(item);
                            if (parsed.timestamp && parsed.timestamp < oneWeekAgo) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (e) {
                        // If we can't parse it, it might be old data
                        keysToRemove.push(key);
                    }
                }
            }

            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn('Error removing old localStorage key:', key, e);
                }
            });

            console.log(`[UnifiedAgentSystem] Cleaned up ${keysToRemove.length} old localStorage items`);
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