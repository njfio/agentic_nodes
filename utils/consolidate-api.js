/**
 * API Consolidation Script
 * Helps identify and consolidate duplicate API routes
 */

const fs = require('fs');
const path = require('path');

class APIConsolidator {
  constructor() {
    this.routes = new Map();
    this.duplicates = [];
    this.recommendations = [];
  }

  /**
   * Analyze route files
   */
  analyzeRoutes() {
    const routesDir = path.join(__dirname, '../routes');
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

    console.log(`\n📁 Analyzing ${files.length} route files...\n`);

    files.forEach(file => {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      this.extractRoutes(file, content);
    });

    this.findDuplicates();
    this.generateRecommendations();
    this.printReport();
  }

  /**
   * Extract routes from file content
   */
  extractRoutes(filename, content) {
    // Match route definitions
    const routePattern = /router\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const key = `${method} ${path}`;

      if (!this.routes.has(key)) {
        this.routes.set(key, []);
      }

      this.routes.get(key).push({
        file: filename,
        method,
        path,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }

  /**
   * Find duplicate routes
   */
  findDuplicates() {
    this.routes.forEach((locations, route) => {
      if (locations.length > 1) {
        this.duplicates.push({
          route,
          locations
        });
      }
    });
  }

  /**
   * Generate consolidation recommendations
   */
  generateRecommendations() {
    // Group routes by resource
    const resources = new Map();

    this.routes.forEach((locations, route) => {
      const [method, path] = route.split(' ');
      
      // Extract resource from path
      const pathParts = path.split('/').filter(p => p && !p.startsWith(':'));
      if (pathParts.length > 0) {
        const resource = pathParts[1] || pathParts[0];
        
        if (!resources.has(resource)) {
          resources.set(resource, []);
        }
        
        resources.get(resource).push({
          method,
          path,
          files: locations.map(l => l.file)
        });
      }
    });

    // Generate recommendations
    resources.forEach((routes, resource) => {
      const files = new Set();
      routes.forEach(r => r.files.forEach(f => files.add(f)));

      if (files.size > 1) {
        this.recommendations.push({
          resource,
          routes: routes.length,
          files: Array.from(files),
          suggestion: `Consolidate all ${resource} routes into a single file`
        });
      }
    });
  }

  /**
   * Print analysis report
   */
  printReport() {
    console.log('📊 API Routes Analysis Report');
    console.log('================================\n');

    console.log(`Total Routes: ${this.routes.size}`);
    console.log(`Duplicate Routes: ${this.duplicates.length}\n`);

    if (this.duplicates.length > 0) {
      console.log('⚠️  Duplicate Routes Found:');
      console.log('-------------------------');
      
      this.duplicates.forEach(dup => {
        console.log(`\n${dup.route}:`);
        dup.locations.forEach(loc => {
          console.log(`  - ${loc.file}:${loc.line}`);
        });
      });
    }

    if (this.recommendations.length > 0) {
      console.log('\n\n💡 Consolidation Recommendations:');
      console.log('--------------------------------');
      
      this.recommendations.forEach(rec => {
        console.log(`\n${rec.resource.toUpperCase()}:`);
        console.log(`  Routes: ${rec.routes}`);
        console.log(`  Files: ${rec.files.join(', ')}`);
        console.log(`  ✅ ${rec.suggestion}`);
      });
    }

    // Generate migration plan
    console.log('\n\n📋 Migration Plan:');
    console.log('------------------');
    console.log('1. Create routes/v1/ directory for version 1 routes');
    console.log('2. Create routes/v2/ directory for version 2 routes');
    console.log('3. Move and consolidate routes by resource:');
    
    const uniqueResources = new Set();
    this.routes.forEach((_, route) => {
      const [, path] = route.split(' ');
      const parts = path.split('/').filter(p => p && !p.startsWith(':'));
      if (parts.length > 0) {
        uniqueResources.add(parts[1] || parts[0]);
      }
    });

    Array.from(uniqueResources).sort().forEach(resource => {
      console.log(`   - routes/v2/${resource}.js`);
    });

    console.log('\n4. Update server.js to use versioned routes:');
    console.log('   app.use("/api/v1", require("./routes/v1"));');
    console.log('   app.use("/api/v2", require("./routes/v2"));');
    console.log('\n5. Add deprecation headers to v1 routes');
    console.log('6. Update documentation with new API structure\n');
  }

  /**
   * Generate consolidated route file
   */
  generateConsolidatedFile(resource, version = 'v2') {
    const template = `/**
 * ${resource.charAt(0).toUpperCase() + resource.slice(1)} Routes
 * Version: ${version}
 */

const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/security/rateLimiter');
const {
  validate${resource.charAt(0).toUpperCase() + resource.slice(1)},
  validateObjectId
} = require('../../middleware/validation');

// Import controller
const ${resource}Controller = require('../../controllers/${resource}Controller');

/**
 * @route   GET /api/${version}/${resource}
 * @desc    Get all ${resource}
 * @access  Public
 */
router.get('/', optionalAuth, ${resource}Controller.getAll);

/**
 * @route   GET /api/${version}/${resource}/:id
 * @desc    Get ${resource} by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, validateObjectId('id'), ${resource}Controller.getById);

/**
 * @route   POST /api/${version}/${resource}
 * @desc    Create new ${resource}
 * @access  Private
 */
router.post('/', auth, apiLimiter, validate${resource.charAt(0).toUpperCase() + resource.slice(1)}, ${resource}Controller.create);

/**
 * @route   PUT /api/${version}/${resource}/:id
 * @desc    Update ${resource}
 * @access  Private
 */
router.put('/:id', auth, apiLimiter, validateObjectId('id'), validate${resource.charAt(0).toUpperCase() + resource.slice(1)}, ${resource}Controller.update);

/**
 * @route   DELETE /api/${version}/${resource}/:id
 * @desc    Delete ${resource}
 * @access  Private
 */
router.delete('/:id', auth, apiLimiter, validateObjectId('id'), ${resource}Controller.delete);

module.exports = router;
`;

    const dir = path.join(__dirname, `../routes/${version}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `${resource}.js`);
    fs.writeFileSync(filePath, template);
    console.log(`✅ Generated: ${filePath}`);
  }
}

// Run analysis
const consolidator = new APIConsolidator();
consolidator.analyzeRoutes();

// Optionally generate example files
if (process.argv.includes('--generate')) {
  console.log('\n🔨 Generating example consolidated files...\n');
  ['workflows', 'nodes', 'users'].forEach(resource => {
    consolidator.generateConsolidatedFile(resource);
  });
}

module.exports = APIConsolidator;