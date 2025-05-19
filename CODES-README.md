# Codes - Development Environment Setup Tool

## Overview

Codes is a development environment setup tool designed to work in the Codex environment where internet access may be limited or disabled. It focuses on using pre-installed tools and creating proper configuration files for development, testing, and linting.

## Features

- **Automatic Project Detection**: Automatically detects the type of project (Rust, Node.js, Python) based on existing files
- **Project Structure Setup**: Creates appropriate directory structures and configuration files
- **Development Configuration**: Sets up linting, formatting, and testing configurations
- **No Internet Required**: Works entirely with pre-installed tools

## Getting Started

### Prerequisites

The Codes tool works with the following pre-installed languages and tools:
- Rust
- Node.js
- Python
- Git
- Docker (optional)

### Installation

1. Clone this repository or copy the `codes-startup.sh` script to your project directory
2. Make the script executable:
   ```bash
   chmod +x codes-startup.sh
   ```

### Usage

Run the script in your project directory:

```bash
./codes-startup.sh
```

The script will:
1. Detect your project type automatically
2. Set up appropriate configuration files
3. Create necessary directory structures
4. Configure testing and linting

If no project type is detected, you'll be prompted to choose one.

## Project Types

### Rust Project

For Rust projects, the script will:
- Create or use existing `Cargo.toml`
- Set up src and tests directories
- Configure `.cargo/config.toml` for build settings
- Add `rustfmt.toml` for code formatting

### Node.js Project

For Node.js projects, the script will:
- Create or use existing `package.json`
- Set up src and tests directories
- Configure ESLint for linting
- Add Prettier for code formatting
- Configure Jest for testing

### Python Project

For Python projects, the script will:
- Create or use existing `requirements.txt`
- Set up src and tests directories
- Configure pytest for testing
- Add Black for code formatting
- Configure Flake8 for linting

## Configuration

The script creates a `.codes` directory with a `config.json` file that stores information about your project setup. This can be used by other tools or extensions that integrate with Codes.

## Docker Integration

If your project uses Docker, the script will detect existing Docker files and configure them appropriately. You can also manually set up Docker integration by creating a `docker-compose.yml` file in your project root.

## Customization

You can customize the Codes setup by editing the generated configuration files:

- **Rust**: Edit `.cargo/config.toml` and `rustfmt.toml`
- **Node.js**: Edit `.eslintrc.js`, `.prettierrc`, and `jest.config.js`
- **Python**: Edit `pyproject.toml` and `setup.py`

## Troubleshooting

If you encounter any issues with the Codes setup:

1. Check that you have the necessary language runtimes installed
2. Verify that you have appropriate permissions in the project directory
3. Check the generated configuration files for any errors

## License

This project is licensed under the MIT License - see the LICENSE file for details.
