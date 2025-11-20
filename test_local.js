// Test LOCAL server to prove the code works correctly
// This will test on http://localhost:3001

const LOCAL_URL = 'http://localhost:3001';

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

const minimalPrompt = `Provide ONLY: Program name, Purpose (1 sentence), Input files, Output files. Be extremely brief.`;

const detailedPrompt = `Provide comprehensive documentation with:
1. Complete program overview
2. Detailed file operations
3. Business rules
4. Full pseudocode
5. Data flow analysis
Be extremely detailed.`;

async function test(num, prompt, desc) {
  console.log('\n' + '='.repeat(70));
  console.log(`TEST ${num}: ${desc}`);
  console.log('='.repeat(70));
  console.log('Prompt:', prompt.length, 'chars');

  const start = Date.now();

  try {
    const res = await fetch(`${LOCAL_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rpgCode, messageList: '', customPrompt: prompt }),
    });

    const data = await res.json();
    const time = ((Date.now() - start) / 1000).toFixed(2);

    console.log('Status:', res.status, res.ok ? '✓' : '✗');
    console.log('Time:', time + 's (server:', data.timeTaken + 's)');
    console.log('Tokens:', data.tokensUsed);
    console.log('Output:', data.documentation?.length || 0, 'chars');

    if (data.error) {
      console.log('ERROR:', data.error);
      return { error: data.error };
    }

    console.log('\nPreview:', data.documentation.substring(0, 200) + '...');

    if (parseFloat(data.timeTaken) < 3) {
      console.log('⚠️  TOO FAST! Possible hardcoded output!');
    } else {
      console.log('✓ Good timing (real AI processing)');
    }

    return { output: data.documentation, time: data.timeTaken, tokens: data.tokensUsed, len: data.documentation.length };
  } catch (err) {
    console.log('ERROR:', err.message);
    return { error: err.message };
  }
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        TESTING LOCAL SERVER - PROOF PROMPT IS USED              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('Testing:', LOCAL_URL);

  const r1 = await test(1, minimalPrompt, 'MINIMAL PROMPT');
  await new Promise(r => setTimeout(r, 2000));
  const r2 = await test(2, detailedPrompt, 'DETAILED PROMPT');

  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON');
  console.log('='.repeat(70));

  if (r1.error || r2.error) {
    console.log('❌ ERRORS:', r1.error || r2.error);
    console.log('\nCheck: Is local server running? Is .env.local configured?');
  } else {
    console.log('Test 1:', r1.len, 'chars,', r1.time + 's,', r1.tokens, 'tokens');
    console.log('Test 2:', r2.len, 'chars,', r2.time + 's,', r2.tokens, 'tokens');

    if (r1.output === r2.output) {
      console.log('\n❌ FAIL: Outputs IDENTICAL - prompt not being used!');
    } else {
      console.log('\n✓ PASS: Outputs DIFFERENT - prompt is being used!');
      console.log('  Difference:', Math.abs(r2.len - r1.len), 'chars');

      if (r2.len > r1.len * 1.5) {
        console.log('✓ PASS: Detailed prompt produced', (r2.len / r1.len).toFixed(1) + 'x longer output');
        console.log('  This PROVES the prompt controls the output!');
      }
    }

    const avg = (parseFloat(r1.time) + parseFloat(r2.time)) / 2;
    console.log('\nAverage time:', avg.toFixed(2) + 's');
    if (avg >= 5) {
      console.log('✓ PASS: Takes 5+ seconds - real AI processing!');
    } else if (avg >= 3) {
      console.log('✓ OK: Takes 3+ seconds - acceptable');
    } else {
      console.log('❌ FAIL: Too fast - possible hardcoded output!');
    }
  }

  console.log('='.repeat(70) + '\n');
}

run();
