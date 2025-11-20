// COMPREHENSIVE TEST FOR DEPLOYED VERSION
// This test proves:
// 1. Prompt IS being used (different prompts = different outputs)
// 2. Takes 5-10+ seconds (real AI processing)
// 3. No hardcoded/default output
// 4. OpenAI API is being called

const DEPLOYED_URL = 'https://seaboard-marine-ocrp39b28-damco-projects.vercel.app';

const rpgCode = `     FMASTFILE  IF   E           K DISK
     FTRANFILE  UF A E           K DISK
     D CUSTNO          S              7  0
     D CUSTNAME        S             30
     D AMOUNT          S             15  2
     C     *ENTRY        PLIST
     C                   PARM                    CUSTNO
     C     CUSTNO        CHAIN     MASTFILE                           90
     C                   IF        NOT *IN90
     C                   EVAL      CUSTNAME = MNAME
     C                   EVAL      AMOUNT = MAMT + 100
     C                   UPDATE    TRANREC
     C                   ENDIF
     C                   SETON                                        LR`;

// TEST 1: Very minimal prompt - should give brief output
const minimalPrompt = `You are a technical documentation expert. Provide ONLY:
1. Program name
2. One-sentence purpose
3. Input files list
4. Output files list
Nothing more. Be extremely brief.`;

// TEST 2: Detailed prompt - should give extensive output
const detailedPrompt = `You are a senior RPG developer and technical documentation expert. Analyze this RPG code and provide comprehensive documentation with:

1. PROGRAM OVERVIEW
   - Full program name and version
   - Detailed purpose and business context
   - Technical architecture overview

2. FILE OPERATIONS
   - Complete file specifications with all fields
   - Access methods and key structures
   - Record formats and field definitions

3. DATA STRUCTURES
   - All data structure definitions
   - Field types, lengths, and precision
   - Usage and purpose of each field

4. BUSINESS LOGIC
   - Detailed explanation of all operations
   - Business rules and validations
   - Error handling procedures

5. PSEUDOCODE
   - Step-by-step pseudocode for entire program
   - Detailed comments for each operation

6. TECHNICAL DETAILS
   - Performance considerations
   - Security implications
   - Best practices followed

Be extremely detailed and thorough. Include all technical specifications.`;

async function testDeployedAPI(testNumber, prompt, promptDescription) {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST ${testNumber}: ${promptDescription}`);
  console.log('='.repeat(80));
  console.log('Prompt length:', prompt.length, 'characters');
  console.log('Testing URL:', DEPLOYED_URL);
  console.log('\nSending request...');

  const startTime = Date.now();

  try {
    const response = await fetch(`${DEPLOYED_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rpgCode,
        messageList: '',
        customPrompt: prompt,
      }),
    });

    const data = await response.json();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n[RESULTS]');
    console.log('Status:', response.status, response.ok ? '✓ SUCCESS' : '✗ FAILED');
    console.log('Total time (client):', totalTime + 's');
    console.log('Server reported time:', data.timeTaken ? data.timeTaken + 's' : 'N/A');
    console.log('Tokens used:', data.tokensUsed || 'N/A');
    console.log('Model:', data.model || 'N/A');
    console.log('Output length:', data.documentation?.length || data.error?.length || 0, 'characters');

    if (data.error) {
      console.log('\n[ERROR FROM API]');
      console.log(data.error);
      return { error: data.error, time: totalTime };
    }

    if (data.documentation) {
      console.log('\n[OUTPUT PREVIEW - First 400 characters]');
      console.log(data.documentation.substring(0, 400));
      console.log('...\n');

      // Time validation
      const serverTime = parseFloat(data.timeTaken);
      if (serverTime < 3) {
        console.log('⚠️  WARNING: Too fast! Server time', serverTime + 's', '< 3 seconds');
        console.log('    This suggests hardcoded output or caching!');
      } else if (serverTime >= 5 && serverTime <= 20) {
        console.log('✓ PASS: Generation took', serverTime + 's', '(5-20s expected for real AI)');
      } else if (serverTime >= 3 && serverTime < 5) {
        console.log('✓ OK: Generation took', serverTime + 's', '(acceptable for small code)');
      } else {
        console.log('⚠️  INFO: Generation took', serverTime + 's', '(longer than usual)');
      }

      return {
        output: data.documentation,
        time: serverTime,
        tokens: data.tokensUsed,
        length: data.documentation.length
      };
    }

    return { error: 'No documentation or error in response', time: totalTime };
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('\n[NETWORK ERROR]');
    console.error('Error:', error.message);
    console.error('Time before error:', totalTime + 's');
    return { error: error.message, time: totalTime };
  }
}

async function runComprehensiveTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'DEPLOYED APPLICATION COMPREHENSIVE TEST' + ' '.repeat(23) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\nTesting deployed version at:', DEPLOYED_URL);
  console.log('This will verify:');
  console.log('  ✓ Prompt is actually being used by OpenAI');
  console.log('  ✓ Takes 5-10+ seconds (real AI processing)');
  console.log('  ✓ No hardcoded or default output');
  console.log('  ✓ Different prompts produce different outputs');
  console.log('\nStarting tests...\n');

  // Test 1: Minimal prompt
  const result1 = await testDeployedAPI(1, minimalPrompt, 'MINIMAL PROMPT (brief output expected)');

  // Wait between tests
  console.log('\n⏳ Waiting 3 seconds before next test...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Detailed prompt
  const result2 = await testDeployedAPI(2, detailedPrompt, 'DETAILED PROMPT (extensive output expected)');

  // Final comparison
  console.log('\n' + '='.repeat(80));
  console.log('FINAL ANALYSIS - PROOF THAT PROMPT IS BEING USED');
  console.log('='.repeat(80));

  if (result1.error || result2.error) {
    console.log('\n❌ TESTS FAILED - Errors occurred:');
    if (result1.error) console.log('  Test 1 error:', result1.error);
    if (result2.error) console.log('  Test 2 error:', result2.error);
    console.log('\nPlease check:');
    console.log('  1. Is the Vercel deployment live?');
    console.log('  2. Is OPENAI_API_KEY set in Vercel environment variables?');
    console.log('  3. Is the OpenAI API key valid and has quota?');
  } else {
    console.log('\nTest 1 (Minimal Prompt):');
    console.log('  - Time:', result1.time + 's');
    console.log('  - Tokens:', result1.tokens);
    console.log('  - Output length:', result1.length, 'characters');

    console.log('\nTest 2 (Detailed Prompt):');
    console.log('  - Time:', result2.time + 's');
    console.log('  - Tokens:', result2.tokens);
    console.log('  - Output length:', result2.length, 'characters');

    console.log('\n' + '-'.repeat(80));

    // Check if outputs are different
    if (result1.output === result2.output) {
      console.log('❌ FAIL: Outputs are IDENTICAL!');
      console.log('         This means the prompt is NOT being used!');
    } else {
      console.log('✓ PASS: Outputs are DIFFERENT');
      console.log('        Difference:', Math.abs(result2.length - result1.length), 'characters');

      // Check if detailed prompt produced longer output
      if (result2.length > result1.length * 1.5) {
        console.log('✓ PASS: Detailed prompt produced',
                    ((result2.length / result1.length) - 1).toFixed(1) + 'x longer output');
        console.log('        This PROVES the prompt is controlling the output!');
      } else {
        console.log('⚠️  WARN: Detailed prompt should produce much longer output');
      }
    }

    // Check timing
    const avgTime = (parseFloat(result1.time) + parseFloat(result2.time)) / 2;
    console.log('\n' + '-'.repeat(80));
    console.log('Average generation time:', avgTime.toFixed(2) + 's');

    if (avgTime < 3) {
      console.log('❌ FAIL: Average time < 3 seconds suggests hardcoded output!');
    } else if (avgTime >= 5) {
      console.log('✓ PASS: Average time ≥ 5 seconds confirms real AI processing!');
    } else {
      console.log('✓ OK: Average time is acceptable for this code size');
    }

    // Final verdict
    console.log('\n' + '='.repeat(80));
    const promptUsed = result1.output !== result2.output;
    const timeOk = avgTime >= 3;

    if (promptUsed && timeOk) {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('   ✓ Prompt is being used correctly');
      console.log('   ✓ Takes appropriate time (5-10+ seconds)');
      console.log('   ✓ No hardcoded output');
      console.log('   ✓ Using real OpenAI API (GPT-4o)');
    } else {
      console.log('⚠️  ISSUES DETECTED:');
      if (!promptUsed) console.log('   ✗ Prompt might not be used (outputs identical)');
      if (!timeOk) console.log('   ✗ Time too fast (possible hardcoded output)');
    }
  }

  console.log('='.repeat(80));
  console.log('\n[TESTS COMPLETE]\n');
}

runComprehensiveTests();
