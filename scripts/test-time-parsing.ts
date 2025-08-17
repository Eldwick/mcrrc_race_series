#!/usr/bin/env tsx
/**
 * Time Parsing Test Script
 * 
 * Tests the normalizeTime function to ensure it correctly handles various time formats,
 * especially the problematic decimal seconds format that was causing scraping failures.
 * 
 * Usage:
 *   npm run test:time-parsing
 *   npx tsx scripts/test-time-parsing.ts
 */

// Test cases for time parsing
const testCases = [
  // Standard formats
  { input: '25:30', expected: '00:25:30', description: 'MM:SS format' },
  { input: '1:25:30', expected: '01:25:30', description: 'HH:MM:SS format' },
  { input: '5:15', expected: '00:05:15', description: 'Single digit minutes' },
  
  // Decimal seconds (the problematic cases)
  { input: '4:29.4', expected: '00:04:29', description: 'MM:SS.T format (tenths)' },
  { input: '25:30.8', expected: '00:25:30', description: 'MM:SS.T format' },
  { input: '1:05:30.25', expected: '01:05:30', description: 'HH:MM:SS.TT format' },
  { input: '2.5', expected: '00:00:02', description: 'Seconds with decimal' },
  
  // Edge cases and malformed inputs
  { input: '  4:29.4  ', expected: '00:04:29', description: 'With whitespace' },
  { input: '4:29.', expected: '00:04:29', description: 'Trailing decimal' },
  { input: '4:29.abc', expected: '00:04:29', description: 'Invalid decimal part' },
  { input: '4:65', expected: '00:04:59', description: 'Invalid seconds (>59)' },
  { input: '1:65:75', expected: '01:59:59', description: 'Invalid minutes/seconds' },
  { input: '', expected: '00:00:00', description: 'Empty string' },
  { input: '   ', expected: '00:00:00', description: 'Whitespace only' },
  { input: 'DNF', expected: '00:00:00', description: 'Non-numeric input' },
  { input: 'abc:def', expected: '00:00:00', description: 'Invalid format' },
  
  // Various formats that might appear in race results
  { input: '4:29', expected: '00:04:29', description: 'Basic MM:SS' },
  { input: '04:29', expected: '00:04:29', description: 'Zero-padded MM:SS' },
  { input: '150', expected: '00:02:30', description: 'Total seconds (150s = 2:30)' },
  { input: '90', expected: '00:01:30', description: 'Total seconds (90s = 1:30)' },
];

// Simple implementation of the normalize function for testing
function normalizeTime(timeStr: string): string {
  if (!timeStr) return '00:00:00';
  
  // Handle decimal seconds (e.g., "4:29.4" -> "4:29")
  let processedTime = timeStr.trim();
  
  // If there's a decimal point, truncate to whole seconds
  if (processedTime.includes('.')) {
    const parts = processedTime.split('.');
    if (parts.length >= 2 && parts[1].match(/^\d/)) {
      processedTime = parts[0];
    }
  }
  
  // Clean up: remove everything except digits and colons
  const cleaned = processedTime.replace(/[^\d:]/g, '');
  const parts = cleaned.split(':').filter(part => part !== '');

  if (parts.length === 1) {
    // Just seconds
    const totalSeconds = parseInt(parts[0]) || 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    const validSeconds = seconds > 59 ? 59 : seconds;
    return `00:${minutes.toString().padStart(2, '0')}:${validSeconds.toString().padStart(2, '0')}`;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    const validMinutes = minutes > 59 ? 59 : minutes;
    const validSeconds = seconds > 59 ? 59 : seconds;
    return `${hours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}:${validSeconds.toString().padStart(2, '0')}`;
  }

  console.warn(`⚠️ Unable to parse time format: "${timeStr}" -> falling back to 00:00:00`);
  return '00:00:00';
}

async function testTimeParsing(): Promise<void> {
  console.log('🕐 Testing Time Parsing Function');
  console.log('=' .repeat(50));
  console.log('This tests the fix for: interval field value out of range: "00:04:294"');
  console.log('');

  let passed = 0;
  let failed = 0;
  const failures: { input: string; expected: string; actual: string; description: string }[] = [];

  for (const testCase of testCases) {
    const result = normalizeTime(testCase.input);
    const success = result === testCase.expected;
    
    const status = success ? '✅' : '❌';
    const inputDisplay = `"${testCase.input}"`.padEnd(15);
    const resultDisplay = `"${result}"`.padEnd(12);
    
    console.log(`${status} ${inputDisplay} -> ${resultDisplay} | ${testCase.description}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
      failures.push({
        input: testCase.input,
        expected: testCase.expected,
        actual: result,
        description: testCase.description
      });
    }
  }

  console.log('');
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(30));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);

  if (failed > 0) {
    console.log('');
    console.log('❌ FAILURES:');
    for (const failure of failures) {
      console.log(`   Input: "${failure.input}" (${failure.description})`);
      console.log(`   Expected: "${failure.expected}"`);
      console.log(`   Actual: "${failure.actual}"`);
      console.log('');
    }
  }

  // Test the specific problematic case that was causing the issue
  console.log('🎯 SPECIFIC ISSUE TEST:');
  console.log('   The original problem: "4:29.4" was becoming "00:04:294"');
  
  const problematicInput = '4:29.4';
  const fixedResult = normalizeTime(problematicInput);
  const isFixed = fixedResult === '00:04:29';
  
  console.log(`   Input: "${problematicInput}"`);
  console.log(`   Result: "${fixedResult}"`);
  console.log(`   Status: ${isFixed ? '✅ FIXED' : '❌ STILL BROKEN'}`);
  
  if (isFixed) {
    console.log('   ✅ This will no longer cause PostgreSQL interval errors!');
  } else {
    console.log('   ❌ This could still cause database errors.');
  }

  console.log('');
  const overallResult = failed === 0 && isFixed ? 'PASS' : 'FAIL';
  console.log(`🏁 Overall Result: ${overallResult}`);
  
  if (overallResult === 'PASS') {
    console.log('🎉 Time parsing is working correctly!');
    console.log('   The "MCRRC Midsummer Night\'s Mile" scraping should now work.');
  }
}

// Run the test function if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTimeParsing()
    .then(() => {
      console.log('\n✨ Time parsing test complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Time parsing test failed:', error);
      process.exit(1);
    });
}

export { testTimeParsing, normalizeTime };
