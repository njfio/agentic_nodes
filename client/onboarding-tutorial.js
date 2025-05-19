/**
 * Onboarding Tutorial
 * Provides an interactive tutorial for new users
 */
class OnboardingTutorial {
  constructor() {
    this.currentStep = 0;
    this.tutorialActive = false;
    this.tutorialCompleted = localStorage.getItem('tutorialCompleted') === 'true';
    this.tutorialSteps = [
      {
        title: 'Welcome to Multimodal AI Agent',
        content: 'This tutorial will guide you through the basics of using the application. Click "Next" to continue or "Skip Tutorial" to exit.',
        target: null,
        position: 'center'
      },
      {
        title: 'The Canvas',
        content: 'This is your workspace. You can pan by dragging the empty space and zoom using the mouse wheel or +/- keys.',
        target: '#canvasContainer',
        position: 'center'
      },
      {
        title: 'Adding Nodes',
        content: 'Click this button to add a new node to your workflow. Nodes are the building blocks of your AI workflows.',
        target: '#addNodeBtn',
        position: 'bottom'
      },
      {
        title: 'Adding Chat Nodes',
        content: 'Click this button to add a chat node, which allows conversational interactions with AI models.',
        target: '#addChatNodeBtn',
        position: 'bottom'
      },
      {
        title: 'Workflow Interface',
        content: 'This button opens the workflow interface panel, where you can interact with your workflow as a chat interface.',
        target: '#workflowInterfaceBtn',
        position: 'bottom'
      },
      {
        title: 'Testing Workflows',
        content: 'Click this button to test your workflow by selecting a starting node and running the flow.',
        target: '#testWorkflowBtn',
        position: 'bottom'
      },
      {
        title: 'OpenAI Configuration',
        content: 'Set up your OpenAI API key and configure model settings here.',
        target: '#configBtn',
        position: 'bottom'
      },
      {
        title: 'Workflows Menu',
        content: 'Access, create, and manage your saved workflows from this dropdown menu.',
        target: '#workflowsBtn',
        position: 'bottom'
      },
      {
        title: 'Saving Your Work',
        content: 'Save your current workflow to the database using this button.',
        target: '#saveWorkflowBtn',
        position: 'bottom'
      },
      {
        title: 'Connecting Nodes',
        content: 'To connect nodes, click and drag from the output connector (right side) of one node to the input connector (left side) of another node.',
        target: '#canvasContainer',
        position: 'center'
      },
      {
        title: 'Editing Nodes',
        content: 'Double-click on any node to edit its properties, content, and AI settings.',
        target: '#canvasContainer',
        position: 'center'
      },
      {
        title: 'Keyboard Shortcuts',
        content: 'Press "H" to view keyboard shortcuts that can speed up your workflow.',
        target: null,
        position: 'center'
      },
      {
        title: 'Tutorial Complete!',
        content: 'You\'ve completed the basic tutorial. Explore the application and create amazing AI workflows!',
        target: null,
        position: 'center'
      }
    ];
    
    this.init();
  }

  init() {
    // Create tutorial elements
    this.createTutorialElements();
    
    // Add event listeners
    this.addEventListeners();
    
    // Check if we should show the tutorial on startup
    this.checkForAutoStart();
  }

  createTutorialElements() {
    // Create the tutorial overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'tutorial-overlay';
    this.overlay.style.display = 'none';
    
    // Create the tutorial popup
    this.popup = document.createElement('div');
    this.popup.className = 'tutorial-popup';
    
    // Create the tutorial content
    this.titleElement = document.createElement('h3');
    this.titleElement.className = 'tutorial-title';
    
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'tutorial-content';
    
    // Create the tutorial navigation
    this.navigation = document.createElement('div');
    this.navigation.className = 'tutorial-navigation';
    
    this.prevButton = document.createElement('button');
    this.prevButton.className = 'tutorial-btn tutorial-prev';
    this.prevButton.textContent = 'Previous';
    this.prevButton.addEventListener('click', () => this.prevStep());
    
    this.nextButton = document.createElement('button');
    this.nextButton.className = 'tutorial-btn tutorial-next';
    this.nextButton.textContent = 'Next';
    this.nextButton.addEventListener('click', () => this.nextStep());
    
    this.skipButton = document.createElement('button');
    this.skipButton.className = 'tutorial-btn tutorial-skip';
    this.skipButton.textContent = 'Skip Tutorial';
    this.skipButton.addEventListener('click', () => this.endTutorial());
    
    // Assemble the tutorial popup
    this.navigation.appendChild(this.prevButton);
    this.navigation.appendChild(this.nextButton);
    this.navigation.appendChild(this.skipButton);
    
    this.popup.appendChild(this.titleElement);
    this.popup.appendChild(this.contentElement);
    this.popup.appendChild(this.navigation);
    
    // Add the tutorial elements to the document
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.popup);
    
    // Add tutorial styles
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9998;
      }
      
      .tutorial-popup {
        position: fixed;
        background-color: var(--bg-secondary, #fff);
        border: 1px solid var(--border-color, #ddd);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 20px;
        max-width: 400px;
        z-index: 9999;
        transition: all 0.3s ease;
      }
      
      .tutorial-title {
        margin-top: 0;
        color: var(--accent-color, #4285f4);
      }
      
      .tutorial-content {
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      .tutorial-navigation {
        display: flex;
        justify-content: space-between;
      }
      
      .tutorial-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .tutorial-next {
        background-color: var(--accent-color, #4285f4);
        color: white;
      }
      
      .tutorial-next:hover {
        background-color: var(--accent-hover, #3b78e7);
      }
      
      .tutorial-prev {
        background-color: var(--bg-tertiary, #eee);
        color: var(--text-color, #333);
      }
      
      .tutorial-prev:hover {
        background-color: var(--border-color, #ddd);
      }
      
      .tutorial-skip {
        background-color: transparent;
        color: var(--text-secondary, #666);
      }
      
      .tutorial-skip:hover {
        text-decoration: underline;
      }
      
      .tutorial-highlight {
        position: relative;
        z-index: 10000;
        box-shadow: 0 0 0 4px var(--accent-color, #4285f4), 0 0 0 10000px rgba(0, 0, 0, 0.5);
        border-radius: 4px;
      }
      
      .tutorial-pulse {
        animation: tutorial-pulse 1.5s infinite;
      }
      
      @keyframes tutorial-pulse {
        0% {
          box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.6), 0 0 0 10000px rgba(0, 0, 0, 0.5);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(66, 133, 244, 0.4), 0 0 0 10000px rgba(0, 0, 0, 0.5);
        }
        100% {
          box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.6), 0 0 0 10000px rgba(0, 0, 0, 0.5);
        }
      }
      
      /* Tutorial start button */
      .tutorial-start-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--accent-color, #4285f4);
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        transition: all 0.3s ease;
      }
      
      .tutorial-start-btn:hover {
        background-color: var(--accent-hover, #3b78e7);
        transform: scale(1.1);
      }
      
      /* Tutorial welcome modal */
      .tutorial-welcome-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .tutorial-welcome-content {
        background-color: var(--bg-secondary, #fff);
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }
      
      .tutorial-welcome-title {
        color: var(--accent-color, #4285f4);
        margin-top: 0;
      }
      
      .tutorial-welcome-text {
        margin-bottom: 30px;
        line-height: 1.6;
      }
      
      .tutorial-welcome-buttons {
        display: flex;
        justify-content: center;
        gap: 15px;
      }
      
      .tutorial-welcome-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
      }
      
      .tutorial-welcome-start {
        background-color: var(--accent-color, #4285f4);
        color: white;
      }
      
      .tutorial-welcome-start:hover {
        background-color: var(--accent-hover, #3b78e7);
        transform: scale(1.05);
      }
      
      .tutorial-welcome-skip {
        background-color: var(--bg-tertiary, #eee);
        color: var(--text-color, #333);
      }
      
      .tutorial-welcome-skip:hover {
        background-color: var(--border-color, #ddd);
      }
    `;
    document.head.appendChild(style);
    
    // Create the tutorial start button
    this.startButton = document.createElement('button');
    this.startButton.className = 'tutorial-start-btn';
    this.startButton.innerHTML = '?';
    this.startButton.title = 'Start Tutorial';
    this.startButton.addEventListener('click', () => this.startTutorial());
    
    // Add the start button to the document
    document.body.appendChild(this.startButton);
  }

  addEventListeners() {
    // Listen for window resize to reposition the popup
    window.addEventListener('resize', () => {
      if (this.tutorialActive) {
        this.positionPopup();
      }
    });
    
    // Listen for escape key to end tutorial
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.tutorialActive) {
        this.endTutorial();
      }
    });
    
    // Listen for theme changes to update styling
    window.addEventListener('themechange', () => {
      // No specific actions needed as we use CSS variables
    });
  }

  checkForAutoStart() {
    // Check if this is the first visit
    const firstVisit = localStorage.getItem('firstVisit') !== 'false';
    
    if (firstVisit && !this.tutorialCompleted) {
      // Set first visit flag
      localStorage.setItem('firstVisit', 'false');
      
      // Show welcome modal after a short delay
      setTimeout(() => {
        this.showWelcomeModal();
      }, 1000);
    }
  }

  showWelcomeModal() {
    // Create welcome modal
    const welcomeModal = document.createElement('div');
    welcomeModal.className = 'tutorial-welcome-modal';
    
    const welcomeContent = document.createElement('div');
    welcomeContent.className = 'tutorial-welcome-content';
    
    const welcomeTitle = document.createElement('h2');
    welcomeTitle.className = 'tutorial-welcome-title';
    welcomeTitle.textContent = 'Welcome to Multimodal AI Agent!';
    
    const welcomeText = document.createElement('p');
    welcomeText.className = 'tutorial-welcome-text';
    welcomeText.textContent = 'Would you like to take a quick tutorial to learn how to use this application? You can create powerful AI workflows with just a few clicks!';
    
    const welcomeButtons = document.createElement('div');
    welcomeButtons.className = 'tutorial-welcome-buttons';
    
    const startButton = document.createElement('button');
    startButton.className = 'tutorial-welcome-btn tutorial-welcome-start';
    startButton.textContent = 'Start Tutorial';
    startButton.addEventListener('click', () => {
      document.body.removeChild(welcomeModal);
      this.startTutorial();
    });
    
    const skipButton = document.createElement('button');
    skipButton.className = 'tutorial-welcome-btn tutorial-welcome-skip';
    skipButton.textContent = 'Skip for Now';
    skipButton.addEventListener('click', () => {
      document.body.removeChild(welcomeModal);
    });
    
    // Assemble welcome modal
    welcomeButtons.appendChild(startButton);
    welcomeButtons.appendChild(skipButton);
    
    welcomeContent.appendChild(welcomeTitle);
    welcomeContent.appendChild(welcomeText);
    welcomeContent.appendChild(welcomeButtons);
    
    welcomeModal.appendChild(welcomeContent);
    
    // Add to document
    document.body.appendChild(welcomeModal);
  }

  startTutorial() {
    this.tutorialActive = true;
    this.currentStep = 0;
    this.showStep(this.currentStep);
    
    // Hide the start button during the tutorial
    this.startButton.style.display = 'none';
  }

  endTutorial() {
    this.tutorialActive = false;
    this.overlay.style.display = 'none';
    this.popup.style.display = 'none';
    
    // Remove any highlights
    this.removeHighlights();
    
    // Show the start button again
    this.startButton.style.display = 'flex';
    
    // Mark tutorial as completed
    localStorage.setItem('tutorialCompleted', 'true');
    this.tutorialCompleted = true;
  }

  showStep(stepIndex) {
    const step = this.tutorialSteps[stepIndex];
    
    // Update popup content
    this.titleElement.textContent = step.title;
    this.contentElement.textContent = step.content;
    
    // Show/hide previous button based on step
    this.prevButton.style.display = stepIndex === 0 ? 'none' : 'block';
    
    // Update next button text for last step
    this.nextButton.textContent = stepIndex === this.tutorialSteps.length - 1 ? 'Finish' : 'Next';
    
    // Show the overlay and popup
    this.overlay.style.display = 'block';
    this.popup.style.display = 'block';
    
    // Remove any existing highlights
    this.removeHighlights();
    
    // Add highlight to target element if specified
    if (step.target) {
      const targetElement = document.querySelector(step.target);
      if (targetElement) {
        targetElement.classList.add('tutorial-highlight');
        targetElement.classList.add('tutorial-pulse');
      }
    }
    
    // Position the popup
    this.positionPopup();
  }

  positionPopup() {
    const step = this.tutorialSteps[this.currentStep];
    
    if (step.target && step.position !== 'center') {
      const targetElement = document.querySelector(step.target);
      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const popupRect = this.popup.getBoundingClientRect();
        
        let top, left;
        
        switch (step.position) {
          case 'top':
            top = targetRect.top - popupRect.height - 20;
            left = targetRect.left + (targetRect.width / 2) - (popupRect.width / 2);
            break;
          case 'bottom':
            top = targetRect.bottom + 20;
            left = targetRect.left + (targetRect.width / 2) - (popupRect.width / 2);
            break;
          case 'left':
            top = targetRect.top + (targetRect.height / 2) - (popupRect.height / 2);
            left = targetRect.left - popupRect.width - 20;
            break;
          case 'right':
            top = targetRect.top + (targetRect.height / 2) - (popupRect.height / 2);
            left = targetRect.right + 20;
            break;
          default:
            top = targetRect.bottom + 20;
            left = targetRect.left + (targetRect.width / 2) - (popupRect.width / 2);
        }
        
        // Ensure the popup stays within the viewport
        if (top < 20) top = 20;
        if (left < 20) left = 20;
        if (top + popupRect.height > window.innerHeight - 20) {
          top = window.innerHeight - popupRect.height - 20;
        }
        if (left + popupRect.width > window.innerWidth - 20) {
          left = window.innerWidth - popupRect.width - 20;
        }
        
        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
      } else {
        // Center the popup if target element not found
        this.centerPopup();
      }
    } else {
      // Center the popup for steps without a target or with center position
      this.centerPopup();
    }
  }

  centerPopup() {
    const popupRect = this.popup.getBoundingClientRect();
    const top = (window.innerHeight - popupRect.height) / 2;
    const left = (window.innerWidth - popupRect.width) / 2;
    
    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }

  removeHighlights() {
    // Remove highlight classes from all elements
    const highlightedElements = document.querySelectorAll('.tutorial-highlight');
    highlightedElements.forEach(element => {
      element.classList.remove('tutorial-highlight');
      element.classList.remove('tutorial-pulse');
    });
  }

  nextStep() {
    if (this.currentStep < this.tutorialSteps.length - 1) {
      this.currentStep++;
      this.showStep(this.currentStep);
    } else {
      // End tutorial on last step
      this.endTutorial();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  // Reset tutorial completion status
  resetTutorial() {
    localStorage.removeItem('tutorialCompleted');
    this.tutorialCompleted = false;
  }
}

// Initialize the onboarding tutorial when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.onboardingTutorial = new OnboardingTutorial();
});

// Export the OnboardingTutorial class
export default OnboardingTutorial;
