/**
 * Node.js test runner for VB6 Exact Port
 * Run with: node test-vb6-exact.js
 */

// Import the test module
import('./src/domain/physics/vb6/testVB6Exact.ts').then(module => {
  module.runAllTests();
}).catch(err => {
  console.error('Failed to load test module:', err);
  process.exit(1);
});
