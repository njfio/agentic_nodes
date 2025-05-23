/**
 * Workflow versioning service for managing workflow versions and history
 */
// const mongoose = require('mongoose');
const Workflow = require('../models/Workflow');
const { logger } = require('./loggingService');
const { v4: uuidv4 } = require('uuid');

/**
 * Service for managing workflow versions
 */
class VersioningService {
  /**
   * Create a new version of a workflow
   * @param {string} workflowId - Workflow ID
   * @param {Object} workflow - Workflow data
   * @param {Object} user - User making the change
   * @param {string} commitMessage - Description of changes
   * @returns {Promise<Object>} - Updated workflow with version info
   */
  async createVersion(workflowId, workflow, user, commitMessage = 'Updated workflow') {
    try {
      // Get current workflow
      const existingWorkflow = await Workflow.findById(workflowId);
      
      if (!existingWorkflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      
      // Initialize versions array if it doesn't exist
      if (!existingWorkflow.versions) {
        existingWorkflow.versions = [];
      }
      
      // Generate a version number (use timestamp-based approach)
      const versionNumber = existingWorkflow.versions.length + 1;
      const versionId = uuidv4();
      
      // Create snapshot of current workflow nodes and connections
      const snapshot = {
        nodes: workflow.nodes || existingWorkflow.nodes,
        connections: workflow.connections || existingWorkflow.connections,
        metadata: workflow.metadata || existingWorkflow.metadata
      };
      
      // Create version entry
      const versionEntry = {
        version: versionNumber,
        versionId: versionId,
        createdAt: new Date(),
        createdBy: {
          userId: user.id || user._id,
          username: user.username
        },
        commitMessage: commitMessage,
        snapshot: snapshot
      };
      
      // Add version to workflow
      existingWorkflow.versions.push(versionEntry);
      
      // Update current workflow data (if provided)
      if (workflow.name) existingWorkflow.name = workflow.name;
      if (workflow.description) existingWorkflow.description = workflow.description;
      if (workflow.nodes) existingWorkflow.nodes = workflow.nodes;
      if (workflow.connections) existingWorkflow.connections = workflow.connections;
      if (workflow.metadata) existingWorkflow.metadata = workflow.metadata;
      
      // Always update the lastModified field
      existingWorkflow.lastModified = new Date();
      
      // Save workflow
      await existingWorkflow.save();
      
      logger.info(`Created workflow version ${versionNumber} for workflow ${workflowId}`, { 
        userId: user.id || user._id,
        versionId
      });
      
      return existingWorkflow;
    } catch (error) {
      logger.error(`Error creating workflow version for ${workflowId}`, { error });
      throw error;
    }
  }
  
  /**
   * Get a specific version of a workflow
   * @param {string} workflowId - Workflow ID
   * @param {number|string} versionIdentifier - Version number or version ID
   * @returns {Promise<Object>} - Workflow version data
   */
  async getVersion(workflowId, versionIdentifier) {
    try {
      const workflow = await Workflow.findById(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      
      if (!workflow.versions || workflow.versions.length === 0) {
        throw new Error(`No versions found for workflow: ${workflowId}`);
      }
      
      let version;
      
      // Check if versionIdentifier is a number or a version ID
      if (!isNaN(versionIdentifier)) {
        // It's a version number
        version = workflow.versions.find(v => v.version === parseInt(versionIdentifier));
      } else {
        // It's a version ID
        version = workflow.versions.find(v => v.versionId === versionIdentifier);
      }
      
      if (!version) {
        throw new Error(`Version ${versionIdentifier} not found for workflow: ${workflowId}`);
      }
      
      logger.info(`Retrieved workflow version ${version.version} for workflow ${workflowId}`);
      
      return version;
    } catch (error) {
      logger.error(`Error getting workflow version for ${workflowId}`, { error });
      throw error;
    }
  }
  
  /**
   * Restore a workflow to a specific version
   * @param {string} workflowId - Workflow ID
   * @param {number|string} versionIdentifier - Version number or version ID
   * @param {Object} user - User making the change
   * @returns {Promise<Object>} - Restored workflow
   */
  async restoreVersion(workflowId, versionIdentifier, user) {
    try {
      const workflow = await Workflow.findById(workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      
      // Get the version to restore
      const version = await this.getVersion(workflowId, versionIdentifier);
      
      // Create a new version first to save the current state before restoring
      await this.createVersion(
        workflowId, 
        workflow, 
        user, 
        `Checkpoint before restoring to version ${version.version}`
      );
      
      // Restore the workflow from the version snapshot
      workflow.nodes = version.snapshot.nodes;
      workflow.connections = version.snapshot.connections;
      workflow.metadata = version.snapshot.metadata;
      workflow.lastModified = new Date();
      
      // Save the restored workflow
      await workflow.save();
      
      logger.info(`Restored workflow ${workflowId} to version ${version.version}`, { 
        userId: user.id || user._id,
        versionId: version.versionId
      });
      
      return workflow;
    } catch (error) {
      logger.error(`Error restoring workflow version for ${workflowId}`, { error });
      throw error;
    }
  }
  
  /**
   * Get version history for a workflow
   * @param {string} workflowId - Workflow ID
   * @param {Object} options - Options for pagination and filtering
   * @returns {Promise<Array>} - Version history
   */
  async getVersionHistory(workflowId, options = {}) {
    try {
      const { limit = 10, skip = 0 } = options;
      
      const workflow = await Workflow.findById(workflowId, {
        versions: { $slice: [skip, limit] },
        _id: 1,
        name: 1
      });
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      
      if (!workflow.versions) {
        return [];
      }
      
      // Return simplified version info (without full snapshots to reduce payload size)
      const history = workflow.versions.map(v => ({
        version: v.version,
        versionId: v.versionId,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
        commitMessage: v.commitMessage
      }));
      
      logger.info(`Retrieved version history for workflow ${workflowId}`, { 
        count: history.length
      });
      
      return history;
    } catch (error) {
      logger.error(`Error getting version history for workflow ${workflowId}`, { error });
      throw error;
    }
  }
  
  /**
   * Compare two versions of a workflow
   * @param {string} workflowId - Workflow ID
   * @param {number|string} version1 - First version to compare
   * @param {number|string} version2 - Second version to compare
   * @returns {Promise<Object>} - Differences between versions
   */
  async compareVersions(workflowId, version1, version2) {
    try {
      const v1 = await this.getVersion(workflowId, version1);
      const v2 = await this.getVersion(workflowId, version2);
      
      // Compare nodes
      const addedNodes = [];
      const removedNodes = [];
      const modifiedNodes = [];
      
      // Find added and modified nodes
      v2.snapshot.nodes.forEach(node2 => {
        const node1 = v1.snapshot.nodes.find(n => n.id === node2.id);
        
        if (!node1) {
          addedNodes.push(node2);
        } else if (JSON.stringify(node1) !== JSON.stringify(node2)) {
          modifiedNodes.push({
            before: node1,
            after: node2
          });
        }
      });
      
      // Find removed nodes
      v1.snapshot.nodes.forEach(node1 => {
        const node2 = v2.snapshot.nodes.find(n => n.id === node1.id);
        
        if (!node2) {
          removedNodes.push(node1);
        }
      });
      
      // Compare connections
      const addedConnections = [];
      const removedConnections = [];
      
      // Find added connections
      v2.snapshot.connections.forEach(conn2 => {
        const conn1 = v1.snapshot.connections.find(
          c => c.source === conn2.source && c.target === conn2.target
        );
        
        if (!conn1) {
          addedConnections.push(conn2);
        }
      });
      
      // Find removed connections
      v1.snapshot.connections.forEach(conn1 => {
        const conn2 = v2.snapshot.connections.find(
          c => c.source === conn1.source && c.target === conn1.target
        );
        
        if (!conn2) {
          removedConnections.push(conn1);
        }
      });
      
      // Compare metadata
      const metadataChanges = {};
      const metadata1 = v1.snapshot.metadata || {};
      const metadata2 = v2.snapshot.metadata || {};
      
      // Find all keys from both objects
      const allKeys = new Set([
        ...Object.keys(metadata1),
        ...Object.keys(metadata2)
      ]);
      
      // Check each key for differences
      allKeys.forEach(key => {
        if (!metadata1[key] && metadata2[key]) {
          metadataChanges[key] = { 
            added: true, 
            value: metadata2[key]
          };
        } else if (metadata1[key] && !metadata2[key]) {
          metadataChanges[key] = { 
            removed: true, 
            value: metadata1[key]
          };
        } else if (JSON.stringify(metadata1[key]) !== JSON.stringify(metadata2[key])) {
          metadataChanges[key] = {
            changed: true,
            before: metadata1[key],
            after: metadata2[key]
          };
        }
      });
      
      const comparison = {
        nodes: {
          added: addedNodes,
          removed: removedNodes,
          modified: modifiedNodes
        },
        connections: {
          added: addedConnections,
          removed: removedConnections
        },
        metadata: metadataChanges,
        summary: {
          nodesAdded: addedNodes.length,
          nodesRemoved: removedNodes.length,
          nodesModified: modifiedNodes.length,
          connectionsAdded: addedConnections.length,
          connectionsRemoved: removedConnections.length,
          metadataChanges: Object.keys(metadataChanges).length
        }
      };
      
      logger.info(`Compared versions ${v1.version} and ${v2.version} for workflow ${workflowId}`);
      
      return comparison;
    } catch (error) {
      logger.error(`Error comparing workflow versions for ${workflowId}`, { error });
      throw error;
    }
  }
}

module.exports = new VersioningService();