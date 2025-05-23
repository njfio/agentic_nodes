// Force agents to use tools when appropriate
(function() {
    console.log('🎯 Setting up forced tool usage for agents');
    
    // Wait for AgentProcessor to be available
    const waitForProcessor = setInterval(() => {
        if (window.AgentProcessor && window.AgentProcessor.processAgentNode) {
            clearInterval(waitForProcessor);
            
            // Override processAgentNode to enhance prompts
            const originalProcessAgentNode = window.AgentProcessor.processAgentNode;
            
            window.AgentProcessor.processAgentNode = async function(node, input) {
                console.log(`🎯 Enhancing agent node ${node.id} to force tool usage`);
                
                // Check if the input mentions current events, real-time info, or web search
                const needsSearch = /current|today|recent|latest|this week|this month|2025|2024|what happened|news|update|blockchain|crypto|search|find|look up/i.test(input);
                
                if (needsSearch) {
                    console.log('🔍 Detected need for web search based on query');
                    
                    // Enhance the system prompt to be more forceful about tool usage
                    const originalSystemPrompt = node.systemPrompt;
                    node.systemPrompt = `You are an AI agent with access to real-time web search capabilities through the browser_search tool.

CRITICAL INSTRUCTIONS:
1. When asked about current events, recent happenings, or anything time-sensitive, you MUST use the browser_search tool.
2. The query "${input}" requires current information. You MUST search for this information.
3. DO NOT say you cannot access current information - you have the browser_search tool for this purpose.
4. DO NOT provide generic responses - use the tools to get specific, current information.
5. If the first search doesn't yield enough information, perform additional searches with refined queries.

Your available tools include browser_search which can search the web for any current information.

IMPORTANT: Start by using browser_search with the query: "${input}"

${originalSystemPrompt || ''}`;
                    
                    try {
                        // Call the original function
                        const result = await originalProcessAgentNode.call(this, node, input);
                        
                        // Restore original prompt
                        node.systemPrompt = originalSystemPrompt;
                        
                        return result;
                    } catch (error) {
                        // Restore original prompt
                        node.systemPrompt = originalSystemPrompt;
                        throw error;
                    }
                }
                
                // For non-search queries, use the original function
                return originalProcessAgentNode.call(this, node, input);
            };
            
            console.log('✅ Forced tool usage system initialized');
        }
    }, 100);
    
    // Also enhance the request payload to make tool usage more likely
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options] = args;
        
        if (url && url.includes('/api/openai/chat') && options && options.body) {
            try {
                const body = JSON.parse(options.body);
                
                // Check if this is an agent request with tools
                if (body.tools && body.tools.length > 0 && body.messages) {
                    // Check if the user message needs search
                    const userMessage = body.messages.find(m => m.role === 'user');
                    if (userMessage && /current|today|recent|latest|this week|this month|2025|2024|what happened|news|update|blockchain|crypto/i.test(userMessage.content)) {
                        console.log('🔍 Enhancing OpenAI request to encourage tool usage');
                        
                        // Add a more specific tool_choice if not already set
                        if (!body.tool_choice || body.tool_choice === 'auto') {
                            // Find the browser_search tool
                            const searchTool = body.tools.find(t => 
                                t.function.name === 'browser_search' || 
                                t.function.name === 'browser.search' ||
                                t.function.name === 'search_perplexity-server'
                            );
                            
                            if (searchTool) {
                                // Force the model to use the search tool first
                                body.tool_choice = {
                                    type: 'function',
                                    function: {
                                        name: searchTool.function.name
                                    }
                                };
                                console.log(`🎯 Forcing use of tool: ${searchTool.function.name}`);
                            }
                        }
                        
                        // Also enhance the system message if present
                        const systemMessage = body.messages.find(m => m.role === 'system');
                        if (systemMessage && !systemMessage.content.includes('CRITICAL INSTRUCTIONS')) {
                            systemMessage.content = `CRITICAL: The user is asking about current/recent information. You MUST use the browser_search or search tools to find this information. Do NOT say you cannot access current information.\n\n${systemMessage.content}`;
                        }
                        
                        // Update the request body
                        options.body = JSON.stringify(body);
                    }
                }
            } catch (e) {
                // Not a JSON body or not our concern
            }
        }
        
        return originalFetch.apply(this, args);
    };
})();