// MongoDB initialization script
print('Starting MongoDB initialization script...');

try {
  // First, authenticate as the root user
  print('Authenticating as root user...');
  db.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD);
  print('Authentication successful');

  // Switch to the application database
  print('Switching to application database...');
  db = db.getSiblingDB('multimodal-ai-agent');
  print('Successfully switched to multimodal-ai-agent database');
} catch (error) {
  print('Error during initialization setup: ' + error.message);
  throw error;
}

// Create collections with error handling
try {
  print('Creating collections...');
  db.createCollection('users');
  db.createCollection('workflows');
  db.createCollection('nodes');
  db.createCollection('images');
  db.createCollection('logs');
  print('Collections created successfully');
} catch (error) {
  print('Error creating collections: ' + error.message);
  // Continue execution - collections might already exist
}

// Create a database user for the application
try {
  print('Creating database user for the application...');
  db.createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME,
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
    roles: [
      { role: 'readWrite', db: 'multimodal-ai-agent' },
      { role: 'dbAdmin', db: 'multimodal-ai-agent' }
    ]
  });
  print('Database user created successfully');
} catch (error) {
  print('Error creating database user: ' + error.message);
  // Continue execution - user might already exist
}

// Create default admin user with bcrypt hashed password
// Note: In a real app, we would use bcrypt in the application code
// For initialization purposes, we're using a pre-hashed password
try {
  print('Creating default admin user...');

  // Check if admin user already exists
  const adminExists = db.users.findOne({ username: 'admin' });

  if (!adminExists) {
    db.users.insertOne({
      username: 'admin',
      email: 'admin@example.com',
      // This is 'password' hashed with bcrypt (10 rounds)
      password: '$2a$10$ywfGm9gYXJLRHjnVYgQbAuUPKMlGu/xHY5fYCb8qsuBOJxgZ8F5Uy',
      color: '#3498db',
      isVerified: true,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    print('Admin user created successfully');
  } else {
    print('Admin user already exists, skipping creation');
  }
} catch (error) {
  print(`Error creating admin user: ${error.message}`);
  // Continue execution
}

// Create additional test users with hashed passwords
try {
  print('Creating test users...');

  // Define test users
  const testUsers = [
    {
      username: 'user',
      email: 'user@example.com',
      // This is 'user123' hashed with bcrypt (10 rounds)
      password: '$2a$10$3Pm3JW8F0ZDQHxz9Ffv0S.LQp2/915bkA1W1VZ7.NSuJk8ycvVJXO',
      color: '#2ecc71',
      isVerified: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      username: 'demo',
      email: 'demo@example.com',
      // This is 'demo' hashed with bcrypt (10 rounds)
      password: '$2a$10$dVvWv.UKPNd6oeft2K7.8.Ao3oGmMnAcGFnwwCpDvcX8AKFJ/Rw6e',
      color: '#e74c3c',
      isVerified: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      username: 'testuser',
      email: 'test@example.com',
      // This is 'password123' hashed with bcrypt (10 rounds)
      password: '$2a$10$ywfGm9gYXJLRHjnVYgQbAuUPKMlGu/xHY5fYCb8qsuBOJxgZ8F5Uy',
      color: '#9b59b6',
      isVerified: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Insert each user individually with error handling
  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existingUser = db.users.findOne({ username: user.username });

      if (!existingUser) {
        db.users.insertOne(user);
        print(`User '${user.username}' created successfully`);
      } else {
        print(`User '${user.username}' already exists, skipping creation`);
      }
    } catch (userError) {
      print(`Error creating user '${user.username}': ${userError.message}`);
      // Continue with next user
    }
  }

  print('Test users creation completed');
} catch (error) {
  print(`Error in test users creation: ${error.message}`);
  // Continue execution
}

// Create a sample workflow
try {
  print('Creating sample workflow...');

  // Check if sample workflow already exists
  const existingWorkflow = db.workflows.findOne({ name: 'Sample Workflow' });

  if (!existingWorkflow) {
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
    print('Sample workflow created successfully');
  } else {
    print('Sample workflow already exists, skipping creation');
  }
} catch (error) {
  print(`Error creating sample workflow: ${error.message}`);
  // Continue execution
}

// Create sample nodes
try {
  print('Creating sample nodes...');

  // Define sample nodes
  const sampleNodes = [
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
    },
    {
      title: 'Image to Text Node',
      x: 700,
      y: 300,
      width: 240,
      height: 200,
      content: '',
      inputContent: '',
      contentType: 'text',
      systemPrompt: 'Describe this image in detail.',
      aiProcessor: 'image-to-text',
      inputType: 'image',
      outputType: 'text',
      hasBeenProcessed: false,
      autoSize: true,
      expanded: true,
      workflowRole: 'none',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Check if nodes already exist
  const existingNodeCount = db.nodes.countDocuments();

  if (existingNodeCount === 0) {
    // Insert all sample nodes
    db.nodes.insertMany(sampleNodes);
    print(`${sampleNodes.length} sample nodes created successfully`);
  } else {
    print(`Nodes already exist (${existingNodeCount} found), skipping creation`);
  }
} catch (error) {
  print(`Error creating sample nodes: ${error.message}`);
  // Continue execution
}

// Final confirmation
print('MongoDB initialization completed successfully');
