#!/bin/bash
# Codes - Development Environment Setup Script
# This script sets up a development environment for projects in the Codex environment
# where internet access may be limited or disabled.

set -e  # Exit immediately if a command exits with a non-zero status

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}                CODES STARTUP SCRIPT                  ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}Setting up development environment in Codex...${NC}"
echo ""

# Create workspace directory if it doesn't exist
WORKSPACE_DIR="/workspace"
if [ ! -d "$WORKSPACE_DIR" ]; then
    echo -e "${YELLOW}Creating workspace directory at $WORKSPACE_DIR...${NC}"
    mkdir -p "$WORKSPACE_DIR"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect project type
detect_project_type() {
    if [ -f "Cargo.toml" ]; then
        echo "rust"
    elif [ -f "package.json" ]; then
        echo "node"
    elif [ -f "requirements.txt" ]; then
        echo "python"
    elif [ -f "pom.xml" ]; then
        echo "java"
    elif [ -f "go.mod" ]; then
        echo "go"
    else
        echo "unknown"
    fi
}

# Setup Rust project
setup_rust_project() {
    echo -e "${GREEN}Setting up Rust project...${NC}"
    
    # Create Rust project structure if it doesn't exist
    if [ ! -f "Cargo.toml" ]; then
        echo -e "${YELLOW}Creating new Rust project structure...${NC}"
        
        # Create Cargo.toml
        cat > Cargo.toml << EOF
[package]
name = "codes_project"
version = "0.1.0"
edition = "2021"

[dependencies]
# Add your dependencies here

[dev-dependencies]
# Add your test dependencies here

[features]
# Define features here

[profile.release]
opt-level = 3
debug = false
strip = true
lto = true
codegen-units = 1
EOF
        
        # Create src directory and main.rs
        mkdir -p src
        cat > src/main.rs << EOF
fn main() {
    println!("Hello from Codes!");
}
EOF
        
        # Create tests directory
        mkdir -p tests
        cat > tests/integration_test.rs << EOF
#[test]
fn it_works() {
    assert_eq!(2 + 2, 4);
}
EOF
    fi
    
    # Create .cargo/config.toml for custom settings
    mkdir -p .cargo
    cat > .cargo/config.toml << EOF
[build]
# Custom build settings

[target.'cfg(debug_assertions)']
# Debug settings

[target.'cfg(not(debug_assertions))']
# Release settings

[alias]
b = "build"
t = "test"
r = "run"
c = "check"
EOF

    # Create rustfmt.toml for code formatting
    cat > rustfmt.toml << EOF
max_width = 100
tab_spaces = 4
edition = "2021"
EOF

    echo -e "${GREEN}Rust project setup complete!${NC}"
}

# Setup Node.js project
setup_node_project() {
    echo -e "${GREEN}Setting up Node.js project...${NC}"
    
    # Create package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        echo -e "${YELLOW}Creating new Node.js project structure...${NC}"
        
        # Create package.json
        cat > package.json << EOF
{
  "name": "codes_project",
  "version": "1.0.0",
  "description": "Project created with Codes",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
EOF
        
        # Create index.js
        cat > index.js << EOF
console.log('Hello from Codes!');
EOF
        
        # Create directories
        mkdir -p src
        mkdir -p tests
        
        # Create test file
        cat > tests/index.test.js << EOF
test('basic test', () => {
  expect(2 + 2).toBe(4);
});
EOF
    fi
    
    # Create .eslintrc.js for linting
    cat > .eslintrc.js << EOF
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Custom rules
  },
};
EOF

    # Create .prettierrc for code formatting
    cat > .prettierrc << EOF
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
EOF

    # Create jest.config.js
    cat > jest.config.js << EOF
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
EOF

    echo -e "${GREEN}Node.js project setup complete!${NC}"
}

# Setup Python project
setup_python_project() {
    echo -e "${GREEN}Setting up Python project...${NC}"
    
    # Create requirements.txt if it doesn't exist
    if [ ! -f "requirements.txt" ]; then
        echo -e "${YELLOW}Creating new Python project structure...${NC}"
        
        # Create requirements.txt
        cat > requirements.txt << EOF
# Core dependencies
pytest==7.3.1
black==23.3.0
flake8==6.0.0
EOF
        
        # Create main.py
        cat > main.py << EOF
def main():
    print("Hello from Codes!")

if __name__ == "__main__":
    main()
EOF
        
        # Create directories
        mkdir -p src
        mkdir -p tests
        
        # Create __init__.py files
        touch src/__init__.py
        touch tests/__init__.py
        
        # Create test file
        cat > tests/test_main.py << EOF
def test_basic():
    assert 2 + 2 == 4
EOF
    fi
    
    # Create setup.py
    cat > setup.py << EOF
from setuptools import setup, find_packages

setup(
    name="codes_project",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        # Add dependencies here
    ],
)
EOF

    # Create pyproject.toml for black
    cat > pyproject.toml << EOF
[tool.black]
line-length = 88
target-version = ['py38']
include = '\.pyi?$'

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
EOF

    echo -e "${GREEN}Python project setup complete!${NC}"
}

# Main execution
echo -e "${BLUE}Detecting project type...${NC}"
PROJECT_TYPE=$(detect_project_type)
echo -e "${GREEN}Detected project type: ${PROJECT_TYPE}${NC}"

case $PROJECT_TYPE in
    "rust")
        setup_rust_project
        ;;
    "node")
        setup_node_project
        ;;
    "python")
        setup_python_project
        ;;
    *)
        echo -e "${YELLOW}Unknown project type. Setting up a multi-language environment...${NC}"
        # Ask user which project type to set up
        echo -e "${BLUE}Which project type would you like to set up?${NC}"
        echo "1. Rust"
        echo "2. Node.js"
        echo "3. Python"
        read -p "Enter your choice (1-3): " choice
        
        case $choice in
            1)
                setup_rust_project
                ;;
            2)
                setup_node_project
                ;;
            3)
                setup_python_project
                ;;
            *)
                echo -e "${RED}Invalid choice. Exiting.${NC}"
                exit 1
                ;;
        esac
        ;;
esac

# Create a .codes directory for configuration
mkdir -p .codes
cat > .codes/config.json << EOF
{
  "version": "1.0.0",
  "projectType": "${PROJECT_TYPE}",
  "setupDate": "$(date)",
  "features": {
    "linting": true,
    "testing": true,
    "formatting": true
  }
}
EOF

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}Codes setup complete! Your development environment is ready.${NC}"
echo -e "${YELLOW}To run your project:${NC}"
echo -e "  - Rust: ${BLUE}cargo run${NC}"
echo -e "  - Node.js: ${BLUE}npm start${NC}"
echo -e "  - Python: ${BLUE}python main.py${NC}"
echo -e "${BLUE}======================================================${NC}"
