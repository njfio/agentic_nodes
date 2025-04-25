/**
 * Data Migration Client
 * Handles migrating data from localStorage to the server
 */

const DataMigration = {
  /**
   * Check if data needs to be migrated
   * @returns {boolean} - True if data needs to be migrated
   */
  needsMigration() {
    // Check if we have canvas state in localStorage but not in the database
    const canvasState = localStorage.getItem('canvas_state');
    const migrationComplete = localStorage.getItem('migration_complete');
    
    return canvasState && !migrationComplete;
  },
  
  /**
   * Migrate data from localStorage to the server
   * @returns {Promise} - Promise that resolves when migration is complete
   */
  async migrateData() {
    try {
      console.log('Starting data migration to server...');
      
      // Collect all data from localStorage
      const data = {
        canvasState: localStorage.getItem('canvas_state'),
        openAIConfig: localStorage.getItem('openai_config')
      };
      
      // Call the migration API
      const response = await fetch(`${Config.apiBaseUrl}/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Mark migration as complete
        localStorage.setItem('migration_complete', 'true');
        console.log('Data migration completed successfully');
      } else {
        console.error('Migration failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Error during data migration:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Initialize data migration
   * Checks if migration is needed and performs it if necessary
   */
  init() {
    // Check if we need to migrate data
    if (this.needsMigration()) {
      // Show migration notification
      this.showMigrationNotification();
    }
  },
  
  /**
   * Show migration notification
   * Displays a notification to the user about data migration
   */
  showMigrationNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'migration-notification';
    notification.innerHTML = `
      <div class="migration-content">
        <h3>Data Migration</h3>
        <p>We've detected data in your browser's storage that can be migrated to our database for better persistence.</p>
        <p>Would you like to migrate your data now?</p>
        <div class="migration-buttons">
          <button id="migrate-yes" class="migrate-btn migrate-yes">Yes, Migrate Data</button>
          <button id="migrate-no" class="migrate-btn migrate-no">No, Keep Local</button>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .migration-notification {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      .migration-content {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .migration-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      }
      .migrate-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      .migrate-yes {
        background-color: #3498db;
        color: white;
      }
      .migrate-no {
        background-color: #e74c3c;
        color: white;
      }
    `;
    
    // Add to document
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Add event listeners
    document.getElementById('migrate-yes').addEventListener('click', async () => {
      // Change notification content to show progress
      notification.querySelector('.migration-content').innerHTML = `
        <h3>Data Migration in Progress</h3>
        <p>Please wait while we migrate your data...</p>
        <div class="migration-progress">
          <div class="migration-progress-bar"></div>
        </div>
      `;
      
      // Add progress bar styles
      const progressStyle = document.createElement('style');
      progressStyle.textContent = `
        .migration-progress {
          height: 20px;
          background-color: #f1f1f1;
          border-radius: 10px;
          margin-top: 20px;
          overflow: hidden;
        }
        .migration-progress-bar {
          height: 100%;
          width: 0;
          background-color: #3498db;
          transition: width 0.5s;
        }
      `;
      document.head.appendChild(progressStyle);
      
      // Animate progress bar
      const progressBar = notification.querySelector('.migration-progress-bar');
      progressBar.style.width = '30%';
      
      // Perform migration
      try {
        progressBar.style.width = '60%';
        const result = await this.migrateData();
        progressBar.style.width = '100%';
        
        if (result.success) {
          // Show success message
          notification.querySelector('.migration-content').innerHTML = `
            <h3>Data Migration Complete</h3>
            <p>Your data has been successfully migrated to our database.</p>
            <div class="migration-buttons">
              <button id="migration-done" class="migrate-btn migrate-yes">Done</button>
            </div>
          `;
          
          document.getElementById('migration-done').addEventListener('click', () => {
            notification.remove();
          });
        } else {
          // Show error message
          notification.querySelector('.migration-content').innerHTML = `
            <h3>Data Migration Failed</h3>
            <p>There was an error migrating your data: ${result.error}</p>
            <p>Your local data is still safe.</p>
            <div class="migration-buttons">
              <button id="migration-done" class="migrate-btn migrate-yes">OK</button>
            </div>
          `;
          
          document.getElementById('migration-done').addEventListener('click', () => {
            notification.remove();
          });
        }
      } catch (error) {
        // Show error message
        notification.querySelector('.migration-content').innerHTML = `
          <h3>Data Migration Failed</h3>
          <p>There was an error migrating your data: ${error.message}</p>
          <p>Your local data is still safe.</p>
          <div class="migration-buttons">
            <button id="migration-done" class="migrate-btn migrate-yes">OK</button>
          </div>
        `;
        
        document.getElementById('migration-done').addEventListener('click', () => {
          notification.remove();
        });
      }
    });
    
    document.getElementById('migrate-no').addEventListener('click', () => {
      // Mark migration as skipped
      localStorage.setItem('migration_skipped', 'true');
      notification.remove();
    });
  }
};

// Initialize data migration when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Config to be loaded
  if (typeof Config !== 'undefined') {
    DataMigration.init();
  } else {
    // Wait for Config to be loaded
    const checkConfig = setInterval(() => {
      if (typeof Config !== 'undefined') {
        clearInterval(checkConfig);
        DataMigration.init();
      }
    }, 100);
  }
});
