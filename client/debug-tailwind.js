/**
 * Tailwind CSS Debug Script
 * Helps identify sources of Tailwind CSS warnings and ensures proper setup
 */

(function() {
  'use strict';

  // Track all console messages related to Tailwind
  const tailwindLogs = [];
  
  // Override console methods to capture Tailwind-related messages
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (message.toLowerCase().includes('tailwind')) {
      tailwindLogs.push({
        type: 'warn',
        message: message,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    }
    originalConsoleWarn.apply(console, args);
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.toLowerCase().includes('tailwind')) {
      tailwindLogs.push({
        type: 'error',
        message: message,
        timestamp: new Date().toISOString(),
        stack: new Error().stack
      });
    }
    originalConsoleError.apply(console, args);
  };
  
  // Function to analyze CSS sources
  function analyzeCSSources() {
    const stylesheets = Array.from(document.styleSheets);
    const analysis = {
      total: stylesheets.length,
      sources: [],
      tailwindSources: [],
      errors: []
    };
    
    stylesheets.forEach((sheet, index) => {
      try {
        const href = sheet.href || 'inline';
        const rules = sheet.cssRules ? sheet.cssRules.length : 'N/A';
        
        const source = {
          index: index + 1,
          href: href,
          rules: rules,
          isTailwind: false,
          isLocal: href.includes(window.location.origin) || href === 'inline'
        };
        
        // Check if this might be Tailwind CSS
        if (href.includes('tailwind') || href.includes('cdn') || href.includes('unpkg')) {
          source.isTailwind = true;
          analysis.tailwindSources.push(source);
        }
        
        // Try to check CSS content for Tailwind signatures
        try {
          if (sheet.cssRules && sheet.cssRules.length > 0) {
            const firstRule = sheet.cssRules[0];
            if (firstRule && firstRule.cssText && firstRule.cssText.includes('tailwindcss')) {
              source.isTailwind = true;
              source.tailwindVersion = 'detected in CSS';
              analysis.tailwindSources.push(source);
            }
          }
        } catch (e) {
          // CORS or other access issues
        }
        
        analysis.sources.push(source);
      } catch (error) {
        analysis.errors.push({
          index: index + 1,
          error: error.message
        });
      }
    });
    
    return analysis;
  }
  
  // Function to check for dynamic script/link injection
  function monitorDynamicLoading() {
    const originalCreateElement = document.createElement;
    const dynamicElements = [];
    
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName);
      
      if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
        const originalSetAttribute = element.setAttribute;
        
        element.setAttribute = function(name, value) {
          if ((name === 'src' || name === 'href') && 
              (value.includes('tailwind') || value.includes('cdn') || value.includes('unpkg'))) {
            
            dynamicElements.push({
              type: tagName.toLowerCase(),
              attribute: name,
              value: value,
              timestamp: new Date().toISOString(),
              stack: new Error().stack
            });
            
            console.warn('🚫 Blocked dynamic Tailwind CSS loading:', value);
            return; // Block the loading
          }
          originalSetAttribute.call(this, name, value);
        };
      }
      
      return element;
    };
    
    return dynamicElements;
  }
  
  // Function to generate debug report
  function generateDebugReport() {
    const cssAnalysis = analyzeCSSources();
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      cssAnalysis: cssAnalysis,
      tailwindLogs: tailwindLogs,
      recommendations: []
    };
    
    // Generate recommendations
    if (cssAnalysis.tailwindSources.length === 0) {
      report.recommendations.push('✅ No external Tailwind CSS sources detected');
    } else {
      report.recommendations.push('⚠️ External Tailwind CSS sources found - these may cause warnings');
      cssAnalysis.tailwindSources.forEach(source => {
        report.recommendations.push(`  - ${source.href}`);
      });
    }
    
    if (tailwindLogs.length === 0) {
      report.recommendations.push('✅ No Tailwind-related console messages detected');
    } else {
      report.recommendations.push('⚠️ Tailwind-related console messages found');
      tailwindLogs.forEach(log => {
        report.recommendations.push(`  - ${log.type.toUpperCase()}: ${log.message}`);
      });
    }
    
    // Check if our production CSS is loaded
    const hasProductionCSS = cssAnalysis.sources.some(source => 
      source.href.includes('dist/styles.css')
    );
    
    if (hasProductionCSS) {
      report.recommendations.push('✅ Production Tailwind CSS (dist/styles.css) is loaded');
    } else {
      report.recommendations.push('❌ Production Tailwind CSS (dist/styles.css) not found');
    }
    
    return report;
  }
  
  // Initialize monitoring
  const dynamicElements = monitorDynamicLoading();
  
  // Wait for DOM to be ready, then run analysis
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAnalysis);
  } else {
    runAnalysis();
  }
  
  function runAnalysis() {
    // Wait a bit for all resources to load
    setTimeout(() => {
      const report = generateDebugReport();
      
      console.group('🔍 Tailwind CSS Debug Report');
      console.log('Report generated at:', report.timestamp);
      console.log('URL:', report.url);
      
      console.group('📊 CSS Analysis');
      console.log('Total stylesheets:', report.cssAnalysis.total);
      console.log('Sources:', report.cssAnalysis.sources);
      if (report.cssAnalysis.tailwindSources.length > 0) {
        console.warn('Tailwind sources found:', report.cssAnalysis.tailwindSources);
      }
      console.groupEnd();
      
      if (report.tailwindLogs.length > 0) {
        console.group('📝 Tailwind Console Messages');
        report.tailwindLogs.forEach(log => {
          console.log(`[${log.type.toUpperCase()}] ${log.message}`);
        });
        console.groupEnd();
      }
      
      console.group('💡 Recommendations');
      report.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
      
      console.groupEnd();
      
      // Store report globally for manual inspection
      window.tailwindDebugReport = report;
      window.tailwindDynamicElements = dynamicElements;
      
      console.log('💾 Debug data stored in window.tailwindDebugReport and window.tailwindDynamicElements');
    }, 2000);
  }
  
  // Expose utility functions globally
  window.tailwindDebug = {
    generateReport: generateDebugReport,
    analyzeSources: analyzeCSSources,
    getLogs: () => tailwindLogs,
    getDynamicElements: () => dynamicElements
  };
  
  console.log('🔧 Tailwind CSS Debug Script loaded');
})();
