const request = require('supertest');
const app = require('../../../server');
const User = require('../../../models/User');
const Workflow = require('../../../models/Workflow');
const jwt = require('jsonwebtoken');

describe('Workflow API Integration Tests', () => {
  let server;
  let authToken;
  let testUser;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Workflow.deleteMany({});

    // Create test user
    testUser = await User.create({
      username: 'workflowtest',
      email: 'workflow@example.com',
      password: 'Test123!@#'
    });

    // Generate auth token
    authToken = jwt.sign(
      { _id: testUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/v2/workflows', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          { id: 'node1', type: 'input', position: { x: 100, y: 100 } },
          { id: 'node2', type: 'output', position: { x: 300, y: 100 } }
        ],
        connections: [
          { sourceId: 'node1', targetId: 'node2' }
        ]
      };

      const response = await request(server)
        .post('/api/v2/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.workflow).toBeDefined();
      expect(response.body.workflow.name).toBe(workflowData.name);
      expect(response.body.workflow.nodes).toHaveLength(2);
      expect(response.body.workflow.user).toBe(testUser._id.toString());

      // Verify in database
      const workflow = await Workflow.findById(response.body.workflow._id);
      expect(workflow).toBeTruthy();
      expect(workflow.name).toBe(workflowData.name);
    });

    it('should validate workflow structure', async () => {
      const response = await request(server)
        .post('/api/v2/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Workflow'
          // Missing nodes and connections
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should require authentication', async () => {
      const response = await request(server)
        .post('/api/v2/workflows')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should handle rate limiting', async () => {
      const requests = Array(30).fill(null).map(() =>
        request(server)
          .post('/api/v2/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test',
            nodes: [],
            connections: []
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);

      expect(rateLimited).toBeDefined();
    });
  });

  describe('GET /api/v2/workflows', () => {
    beforeEach(async () => {
      // Create test workflows
      const workflows = [
        { name: 'Workflow 1', user: testUser._id },
        { name: 'Workflow 2', user: testUser._id },
        { name: 'Workflow 3', user: testUser._id }
      ];

      for (const workflow of workflows) {
        await Workflow.create({
          ...workflow,
          nodes: [],
          connections: []
        });
      }

      // Create workflow for another user
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'Test123!@#'
      });

      await Workflow.create({
        name: 'Other User Workflow',
        user: otherUser._id,
        nodes: [],
        connections: []
      });
    });

    it('should get user workflows with pagination', async () => {
      const response = await request(server)
        .get('/api/v2/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.workflows).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(2);

      // Should only see own workflows
      response.body.workflows.forEach(workflow => {
        expect(workflow.user).toBe(testUser._id.toString());
      });
    });

    it('should sort workflows by creation date', async () => {
      const response = await request(server)
        .get('/api/v2/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sort: '-createdAt' })
        .expect(200);

      const dates = response.body.workflows.map(w => new Date(w.createdAt));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should search workflows by name', async () => {
      const response = await request(server)
        .get('/api/v2/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Workflow 2' })
        .expect(200);

      expect(response.body.workflows).toHaveLength(1);
      expect(response.body.workflows[0].name).toBe('Workflow 2');
    });
  });

  describe('GET /api/v2/workflows/:id', () => {
    let testWorkflow;

    beforeEach(async () => {
      testWorkflow = await Workflow.create({
        name: 'Test Workflow',
        user: testUser._id,
        nodes: [
          { id: 'node1', type: 'input', data: { value: 10 } }
        ],
        connections: []
      });
    });

    it('should get specific workflow', async () => {
      const response = await request(server)
        .get(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.workflow._id).toBe(testWorkflow._id.toString());
      expect(response.body.workflow.name).toBe(testWorkflow.name);
      expect(response.body.workflow.nodes).toHaveLength(1);
    });

    it('should not access other users workflows', async () => {
      const otherUser = await User.create({
        username: 'otheruser2',
        email: 'other2@example.com',
        password: 'Test123!@#'
      });

      const otherWorkflow = await Workflow.create({
        name: 'Other Workflow',
        user: otherUser._id,
        nodes: [],
        connections: []
      });

      const response = await request(server)
        .get(`/api/v2/workflows/${otherWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should handle non-existent workflow', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(server)
        .get(`/api/v2/workflows/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should validate workflow ID format', async () => {
      const response = await request(server)
        .get('/api/v2/workflows/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('PUT /api/v2/workflows/:id', () => {
    let testWorkflow;

    beforeEach(async () => {
      testWorkflow = await Workflow.create({
        name: 'Original Name',
        user: testUser._id,
        nodes: [],
        connections: []
      });
    });

    it('should update workflow', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
        nodes: [
          { id: 'node1', type: 'input', position: { x: 0, y: 0 } },
          { id: 'node2', type: 'transform', position: { x: 200, y: 0 } }
        ],
        connections: [
          { sourceId: 'node1', targetId: 'node2' }
        ]
      };

      const response = await request(server)
        .put(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.workflow.name).toBe(updates.name);
      expect(response.body.workflow.description).toBe(updates.description);
      expect(response.body.workflow.nodes).toHaveLength(2);
      expect(response.body.workflow.connections).toHaveLength(1);

      // Verify in database
      const updated = await Workflow.findById(testWorkflow._id);
      expect(updated.name).toBe(updates.name);
      expect(updated.lastModified).toBeGreaterThan(testWorkflow.lastModified);
    });

    it('should validate workflow updates', async () => {
      const response = await request(server)
        .put(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nodes: 'not-an-array' // Invalid type
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should increment version on update', async () => {
      const originalVersion = testWorkflow.version;

      await request(server)
        .put(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Version 2' })
        .expect(200);

      const updated = await Workflow.findById(testWorkflow._id);
      expect(updated.version).toBe(originalVersion + 1);
    });
  });

  describe('DELETE /api/v2/workflows/:id', () => {
    let testWorkflow;

    beforeEach(async () => {
      testWorkflow = await Workflow.create({
        name: 'To Delete',
        user: testUser._id,
        nodes: [],
        connections: []
      });
    });

    it('should delete workflow', async () => {
      const response = await request(server)
        .delete(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/deleted/i);

      // Verify deleted from database
      const deleted = await Workflow.findById(testWorkflow._id);
      expect(deleted).toBeNull();
    });

    it('should not delete other users workflows', async () => {
      const otherUser = await User.create({
        username: 'otheruser3',
        email: 'other3@example.com',
        password: 'Test123!@#'
      });

      const otherWorkflow = await Workflow.create({
        name: 'Other Workflow',
        user: otherUser._id,
        nodes: [],
        connections: []
      });

      const response = await request(server)
        .delete(`/api/v2/workflows/${otherWorkflow._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Verify not deleted
      const stillExists = await Workflow.findById(otherWorkflow._id);
      expect(stillExists).toBeTruthy();
    });
  });

  describe('POST /api/v2/workflows/:id/execute', () => {
    let testWorkflow;

    beforeEach(async () => {
      testWorkflow = await Workflow.create({
        name: 'Executable Workflow',
        user: testUser._id,
        nodes: [
          { id: 'input1', type: 'input', data: { value: 5 } },
          { id: 'multiply', type: 'transform', data: { operation: 'multiply', factor: 2 } },
          { id: 'output1', type: 'output', data: {} }
        ],
        connections: [
          { sourceId: 'input1', targetId: 'multiply', sourceSocket: 'output', targetSocket: 'input' },
          { sourceId: 'multiply', targetId: 'output1', sourceSocket: 'output', targetSocket: 'input' }
        ]
      });
    });

    it('should execute workflow', async () => {
      const response = await request(server)
        .post(`/api/v2/workflows/${testWorkflow._id}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inputs: { startValue: 10 }
        })
        .expect(200);

      expect(response.body).toHaveProperty('executionId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('result');
    });

    it('should validate execution inputs', async () => {
      const response = await request(server)
        .post(`/api/v2/workflows/${testWorkflow._id}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          inputs: 'not-an-object' // Invalid type
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle execution errors', async () => {
      // Create workflow with invalid node
      const errorWorkflow = await Workflow.create({
        name: 'Error Workflow',
        user: testUser._id,
        nodes: [
          { id: 'error1', type: 'unknown-type', data: {} }
        ],
        connections: []
      });

      const response = await request(server)
        .post(`/api/v2/workflows/${errorWorkflow._id}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v2/workflows/:id/duplicate', () => {
    let testWorkflow;

    beforeEach(async () => {
      testWorkflow = await Workflow.create({
        name: 'Original Workflow',
        description: 'To be duplicated',
        user: testUser._id,
        nodes: [
          { id: 'node1', type: 'input' },
          { id: 'node2', type: 'output' }
        ],
        connections: [
          { sourceId: 'node1', targetId: 'node2' }
        ]
      });
    });

    it('should duplicate workflow', async () => {
      const response = await request(server)
        .post(`/api/v2/workflows/${testWorkflow._id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicated Workflow' })
        .expect(201);

      expect(response.body.workflow.name).toBe('Duplicated Workflow');
      expect(response.body.workflow._id).not.toBe(testWorkflow._id.toString());
      expect(response.body.workflow.nodes).toHaveLength(2);
      expect(response.body.workflow.connections).toHaveLength(1);

      // Verify both exist in database
      const original = await Workflow.findById(testWorkflow._id);
      const duplicate = await Workflow.findById(response.body.workflow._id);
      expect(original).toBeTruthy();
      expect(duplicate).toBeTruthy();
    });

    it('should auto-generate name if not provided', async () => {
      const response = await request(server)
        .post(`/api/v2/workflows/${testWorkflow._id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expect(response.body.workflow.name).toMatch(/Original Workflow \(Copy/);
    });
  });

  describe('Workflow Sharing and Collaboration', () => {
    let testWorkflow;
    let collaborator;
    let collaboratorToken;

    beforeEach(async () => {
      testWorkflow = await Workflow.create({
        name: 'Shared Workflow',
        user: testUser._id,
        nodes: [],
        connections: []
      });

      collaborator = await User.create({
        username: 'collaborator',
        email: 'collab@example.com',
        password: 'Test123!@#'
      });

      collaboratorToken = jwt.sign(
        { _id: collaborator._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should add collaborator to workflow', async () => {
      const response = await request(server)
        .post(`/api/v2/workflows/${testWorkflow._id}/collaborators`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: collaborator._id,
          role: 'editor'
        })
        .expect(200);

      expect(response.body.collaborator.user).toBe(collaborator._id.toString());
      expect(response.body.collaborator.role).toBe('editor');

      // Verify collaborator can access workflow
      const accessResponse = await request(server)
        .get(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .expect(200);

      expect(accessResponse.body.workflow._id).toBe(testWorkflow._id.toString());
    });

    it('should list workflow collaborators', async () => {
      // Add collaborator first
      await Workflow.findByIdAndUpdate(testWorkflow._id, {
        $push: {
          collaborators: {
            user: collaborator._id,
            role: 'viewer'
          }
        }
      });

      const response = await request(server)
        .get(`/api/v2/workflows/${testWorkflow._id}/collaborators`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.collaborators).toHaveLength(1);
      expect(response.body.collaborators[0].user._id).toBe(collaborator._id.toString());
      expect(response.body.collaborators[0].user.username).toBe('collaborator');
    });

    it('should remove collaborator', async () => {
      // Add collaborator first
      await Workflow.findByIdAndUpdate(testWorkflow._id, {
        $push: {
          collaborators: {
            user: collaborator._id,
            role: 'editor'
          }
        }
      });

      const response = await request(server)
        .delete(`/api/v2/workflows/${testWorkflow._id}/collaborators/${collaborator._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/removed/i);

      // Verify collaborator can't access anymore
      await request(server)
        .get(`/api/v2/workflows/${testWorkflow._id}`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .expect(403);
    });
  });
});