// MongoDB initialization script
db = db.getSiblingDB('multimodal-ai-agent');

// Create collections
db.createCollection('users');
db.createCollection('workflows');
db.createCollection('nodes');

// Create default admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin123', // In a real app, this would be hashed
  color: '#3498db',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create a sample workflow
const workflowId = ObjectId();
db.workflows.insertOne({
  _id: workflowId,
  name: 'Sample Workflow',
  description: 'A sample workflow to demonstrate the application',
  nodes: [
    {
      id: 1,
      x: 100,
      y: 100,
      width: 240,
      height: 200,
      title: 'Input Node',
      content: '',
      inputContent: '',
      contentType: 'text',
      systemPrompt: 'You are a helpful assistant.',
      aiProcessor: 'text-to-text',
      inputType: 'text',
      outputType: 'text',
      hasBeenProcessed: false,
      autoSize: true,
      expanded: true
    },
    {
      id: 2,
      x: 400,
      y: 100,
      width: 240,
      height: 200,
      title: 'Output Node',
      content: '',
      inputContent: '',
      contentType: 'text',
      systemPrompt: 'Summarize the input in a concise way.',
      aiProcessor: 'text-to-text',
      inputType: 'text',
      outputType: 'text',
      hasBeenProcessed: false,
      autoSize: true,
      expanded: true
    }
  ],
  connections: [
    {
      fromNodeId: 1,
      toNodeId: 2
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create sample nodes
db.nodes.insertMany([
  {
    title: 'Text to Text Node',
    x: 100,
    y: 300,
    width: 240,
    height: 200,
    content: '',
    inputContent: '',
    contentType: 'text',
    systemPrompt: 'You are a helpful assistant.',
    aiProcessor: 'text-to-text',
    inputType: 'text',
    outputType: 'text',
    hasBeenProcessed: false,
    autoSize: true,
    expanded: true,
    workflowRole: 'none',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: 'Text to Image Node',
    x: 400,
    y: 300,
    width: 240,
    height: 200,
    content: '',
    inputContent: '',
    contentType: 'text',
    systemPrompt: 'Generate an image based on this description.',
    aiProcessor: 'text-to-image',
    inputType: 'text',
    outputType: 'image',
    hasBeenProcessed: false,
    autoSize: true,
    expanded: true,
    workflowRole: 'none',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);
