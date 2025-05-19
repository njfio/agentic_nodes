/**
 * User Profile Management
 * Handles user profile viewing and editing
 */

const UserProfile = {
  // Initialize the user profile
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Add profile button to toolbar if not exists
    this.addProfileButton();
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Global event delegation for profile-related actions
    document.addEventListener('click', (e) => {
      // Profile button click
      if (e.target.id === 'profileBtn' || e.target.closest('#profileBtn')) {
        this.showProfileModal();
      }
      
      // Close profile modal
      if (e.target.id === 'closeProfileModal' || e.target.closest('#closeProfileModal')) {
        this.closeProfileModal();
      }
      
      // Save profile changes
      if (e.target.id === 'saveProfileBtn' || e.target.closest('#saveProfileBtn')) {
        this.saveProfile();
      }
      
      // Change password button
      if (e.target.id === 'changePasswordBtn' || e.target.closest('#changePasswordBtn')) {
        this.showChangePasswordForm();
      }
      
      // Save password changes
      if (e.target.id === 'savePasswordBtn' || e.target.closest('#savePasswordBtn')) {
        this.savePassword();
      }
      
      // Cancel password change
      if (e.target.id === 'cancelPasswordBtn' || e.target.closest('#cancelPasswordBtn')) {
        this.hideChangePasswordForm();
      }
    });
  },
  
  // Add profile button to toolbar
  addProfileButton() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;
    
    // Check if button already exists
    if (document.getElementById('profileBtn')) return;
    
    // Create profile button
    const profileBtn = document.createElement('button');
    profileBtn.id = 'profileBtn';
    profileBtn.type = 'button';
    profileBtn.title = 'User Profile';
    profileBtn.innerHTML = '<i class="fas fa-user"></i> Profile';
    
    // Add to toolbar (before the last item which is usually the logout button)
    const lastItem = toolbar.lastElementChild;
    if (lastItem) {
      toolbar.insertBefore(profileBtn, lastItem);
    } else {
      toolbar.appendChild(profileBtn);
    }
  },
  
  // Show profile modal
  async showProfileModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('profileModal')) {
      this.createProfileModal();
    }
    
    // Show modal
    const modal = document.getElementById('profileModal');
    if (modal) {
      modal.style.display = 'block';
      
      // Load user data
      await this.loadUserData();
    }
  },
  
  // Close profile modal
  closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },
  
  // Create profile modal
  createProfileModal() {
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal';
    
    // Create modal content
    modal.innerHTML = `
      <div class="modal-content profile-modal">
        <div class="modal-header">
          <h2>User Profile</h2>
          <button id="closeProfileModal" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="profile-section">
            <div class="profile-avatar">
              <div class="avatar-circle" id="avatarPreview"></div>
              <button id="changeAvatarBtn" class="small-button">Change Avatar</button>
            </div>
            <div class="profile-info">
              <form id="profileForm">
                <div class="form-group">
                  <label for="username">Username</label>
                  <input type="text" id="username" name="username" required>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="firstName">First Name</label>
                    <input type="text" id="firstName" name="firstName">
                  </div>
                  <div class="form-group">
                    <label for="lastName">Last Name</label>
                    <input type="text" id="lastName" name="lastName">
                  </div>
                </div>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                  <label for="bio">Bio</label>
                  <textarea id="bio" name="bio" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label for="color">Profile Color</label>
                  <input type="color" id="color" name="color">
                </div>
                <div class="form-group">
                  <label>Theme</label>
                  <div class="radio-group">
                    <label>
                      <input type="radio" name="theme" value="light"> Light
                    </label>
                    <label>
                      <input type="radio" name="theme" value="dark"> Dark
                    </label>
                    <label>
                      <input type="radio" name="theme" value="system"> System
                    </label>
                  </div>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" id="notifications" name="notifications">
                    Enable Notifications
                  </label>
                </div>
                <div class="form-actions">
                  <button type="button" id="changePasswordBtn" class="secondary-button">Change Password</button>
                  <button type="button" id="saveProfileBtn" class="primary-button">Save Changes</button>
                </div>
              </form>
              
              <form id="passwordForm" style="display: none;">
                <div class="form-group">
                  <label for="currentPassword">Current Password</label>
                  <input type="password" id="currentPassword" name="currentPassword" required>
                </div>
                <div class="form-group">
                  <label for="newPassword">New Password</label>
                  <input type="password" id="newPassword" name="newPassword" required>
                </div>
                <div class="form-group">
                  <label for="confirmPassword">Confirm New Password</label>
                  <input type="password" id="confirmPassword" name="confirmPassword" required>
                </div>
                <div class="form-actions">
                  <button type="button" id="cancelPasswordBtn" class="secondary-button">Cancel</button>
                  <button type="button" id="savePasswordBtn" class="primary-button">Update Password</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
  },
  
  // Load user data
  async loadUserData() {
    try {
      // Get user data from localStorage first (for faster loading)
      const userData = localStorage.getItem('user_profile');
      let user = userData ? JSON.parse(userData) : null;
      
      // Try to get fresh data from API
      try {
        const response = await ApiService.users.getProfile();
        if (response && response.user) {
          user = response.user;
          
          // Update localStorage
          localStorage.setItem('user_profile', JSON.stringify(user));
        }
      } catch (error) {
        console.warn('Could not fetch fresh user data:', error);
        // Continue with cached data
      }
      
      if (!user) {
        console.error('No user data available');
        return;
      }
      
      // Populate form fields
      const form = document.getElementById('profileForm');
      if (!form) return;
      
      // Basic fields
      form.username.value = user.username || '';
      form.email.value = user.email || '';
      form.firstName.value = user.firstName || '';
      form.lastName.value = user.lastName || '';
      form.bio.value = user.bio || '';
      form.color.value = user.color || '#3498db';
      
      // Settings
      if (user.settings) {
        // Theme
        const themeRadio = form.querySelector(`input[name="theme"][value="${user.settings.theme || 'system'}"]`);
        if (themeRadio) themeRadio.checked = true;
        
        // Notifications
        form.notifications.checked = user.settings.notifications !== false;
      }
      
      // Avatar preview
      const avatarPreview = document.getElementById('avatarPreview');
      if (avatarPreview) {
        if (user.avatar) {
          avatarPreview.style.backgroundImage = `url(${user.avatar})`;
        } else {
          // Use color and initials
          avatarPreview.style.backgroundColor = user.color || '#3498db';
          avatarPreview.textContent = this.getInitials(user);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },
  
  // Save profile changes
  async saveProfile() {
    try {
      const form = document.getElementById('profileForm');
      if (!form) return;
      
      // Validate form
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      // Get form data
      const profileData = {
        username: form.username.value,
        email: form.email.value,
        firstName: form.firstName.value,
        lastName: form.lastName.value,
        bio: form.bio.value,
        color: form.color.value,
        settings: {
          theme: form.querySelector('input[name="theme"]:checked')?.value || 'system',
          notifications: form.notifications.checked
        }
      };
      
      // Show loading state
      const saveBtn = document.getElementById('saveProfileBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }
      
      // Save to API
      const response = await ApiService.users.updateProfile(profileData);
      
      // Update localStorage
      if (response && response.user) {
        localStorage.setItem('user_profile', JSON.stringify(response.user));
      }
      
      // Show success message
      DebugManager.addLog(response.message || 'Profile updated successfully', 'success');
      
      // Close modal
      this.closeProfileModal();
    } catch (error) {
      console.error('Error saving profile:', error);
      DebugManager.addLog(`Error saving profile: ${error.message}`, 'error');
    } finally {
      // Reset button state
      const saveBtn = document.getElementById('saveProfileBtn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    }
  },
  
  // Show change password form
  showChangePasswordForm() {
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    
    if (profileForm && passwordForm) {
      profileForm.style.display = 'none';
      passwordForm.style.display = 'block';
    }
  },
  
  // Hide change password form
  hideChangePasswordForm() {
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    
    if (profileForm && passwordForm) {
      profileForm.style.display = 'block';
      passwordForm.style.display = 'none';
    }
  },
  
  // Save password changes
  async savePassword() {
    try {
      const form = document.getElementById('passwordForm');
      if (!form) return;
      
      // Validate form
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      // Check if passwords match
      const newPassword = form.newPassword.value;
      const confirmPassword = form.confirmPassword.value;
      
      if (newPassword !== confirmPassword) {
        DebugManager.addLog('New passwords do not match', 'error');
        return;
      }
      
      // Show loading state
      const saveBtn = document.getElementById('savePasswordBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating...';
      }
      
      // Save to API
      const response = await ApiService.users.updateProfile({
        password: newPassword
      });
      
      // Show success message
      DebugManager.addLog('Password updated successfully', 'success');
      
      // Go back to profile form
      this.hideChangePasswordForm();
      
      // Reset form
      form.reset();
    } catch (error) {
      console.error('Error updating password:', error);
      DebugManager.addLog(`Error updating password: ${error.message}`, 'error');
    } finally {
      // Reset button state
      const saveBtn = document.getElementById('savePasswordBtn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
      }
    }
  },
  
  // Get user initials for avatar
  getInitials(user) {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    } else if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    } else if (user.lastName) {
      return user.lastName.charAt(0).toUpperCase();
    } else if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return 'U';
  }
};

// Initialize the user profile when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Auth to be initialized
  if (typeof Auth !== 'undefined') {
    UserProfile.init();
  } else {
    // Wait for Auth to be loaded
    const checkAuth = setInterval(() => {
      if (typeof Auth !== 'undefined') {
        clearInterval(checkAuth);
        UserProfile.init();
      }
    }, 100);
  }
});
