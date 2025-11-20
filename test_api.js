// Test script to verify:
// 1. Prompt is being used
// 2. Takes 5-10 seconds
// 3. No hardcoded output
// 4. Output changes when prompt changes

const fs = require('fs');

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

const customPrompt1 = `Analyze this RPG code and provide ONLY the following sections:
1. Program Name
2. Purpose (one sentence)
3. Input Files
4. Output Files

Be extremely brief. No pseudocode. No detailed analysis.`;

const customPrompt2 = `Analyze this RPG code and provide extensive documentation with:
1. Complete program overview
2. Detailed file operations with all key fields
3. Business rules and validations
4. Full pseudocode for every operation
5. Data flow diagrams
6. Security considerations
7. Performance analysis

Be extremely detailed and thorough.`;

async function testAPI(promptNumber, customPrompt) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST ${promptNumber}: Testing with ${promptNumber === 1 ? 'SHORT' : 'LONG'} prompt`);
  console.log(`${'='.repeat(70)}`);
  console.log('Prompt length:', customPrompt.length, 'characters');

  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rpgCode,
        messageList: '',
        customPrompt,
      }),
    });

    const data = await response.json();
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n[RESULTS]');
    console.log('Status:', response.ok ? 'SUCCESS' : 'FAILED');
    console.log('Total time:', elapsedTime + 's');
    console.log('Server reported time:', data.timeTaken + 's');
    console.log('Tokens used:', data.tokensUsed);
    console.log('Model:', data.model);
    console.log('Output length:', data.documentation?.length || 0, 'characters');

    if (data.documentation) {
      console.log('\n[OUTPUT PREVIEW (first 300 chars)]');
      console.log(data.documentation.substring(0, 300) + '...');

      // Save to file
      fs.writeFileSync(`test_output_${promptNumber}.txt`, data.documentation);
      console.log(`\nFull output saved to: test_output_${promptNumber}.txt`);
    }

    // Validate time taken
    if (parseFloat(data.timeTaken) < 3) {
      console.log('\n[WARNING] Generation too fast! Possible hardcoded output!');
    } else {
      console.log('\n[PASS] Generation took appropriate time (5-10s expected)');
    }

    return data;
  } catch (error) {
    console.error('[ERROR]', error.message);
    return null;
  }
}

async function runTests() {
  console.log('Starting comprehensive API tests...\n');

  // Test 1: Short prompt
  const result1 = await testAPI(1, customPrompt1);

  // Wait 2 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Long prompt
  const result2 = await testAPI(2, customPrompt2);

  // Compare outputs
  console.log(`\n${'='.repeat(70)}`);
  console.log('COMPARISON');
  console.log(`${'='.repeat(70)}`);

  if (result1 && result2) {
    const output1 = result1.documentation;
    const output2 = result2.documentation;

    console.log('Output 1 length:', output1.length);
    console.log('Output 2 length:', output2.length);
    console.log('Outputs are different:', output1 !== output2);

    if (output1 === output2) {
      console.log('\n[FAIL] Outputs are identical! Prompt is NOT being used!');
    } else if (output2.length > output1.length * 1.5) {
      console.log('\n[PASS] Output 2 is significantly longer, proving prompt is being used!');
    } else {
      console.log('\n[PARTIAL] Outputs differ but not significantly');
    }
  }

  console.log('\n[TESTS COMPLETE]');
}

runTests();
