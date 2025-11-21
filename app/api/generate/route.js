import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { rpgCode, messageList, customPrompt, documentContext } = await request.json();

    if (!rpgCode || !rpgCode.trim()) {
      return NextResponse.json(
        { error: 'RPG code is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey || openaiApiKey.includes('your_api_key_here')) {
      return NextResponse.json(
        { error: 'Valid OPENAI_API_KEY not configured in environment variables.' },
        { status: 500 }
      );
    }

    console.log('[API] Starting AI documentation generation');
    console.log('[API] RPG Code length:', rpgCode.length);
    console.log('[API] Using custom prompt:', !!customPrompt);
    console.log('[API] Prompt length:', customPrompt?.length || 0);

    let userMessage = `Analyze this RPG program code:\n\n${rpgCode}`;

    if (messageList && messageList.trim()) {
      userMessage += `\n\nMessage List:\n${messageList}`;
    }

    // Add document context if provided (from the 8 specific document type boxes)
    if (documentContext && documentContext.trim()) {
      userMessage += `\n\n
████████████████████████████████████████████████████████████████████████████████
█                        REFERENCE DOCUMENTS FOR ANALYSIS                      █
████████████████████████████████████████████████████████████████████████████████

CRITICAL INSTRUCTIONS FOR AI - READ CAREFULLY:

1. DOCUMENT CATEGORIES PROVIDED:
   • Program Calling Tree - Use for understanding program flow and call hierarchy
   • File Fields Reference - Use for field definitions and data dictionary lookups
   • Message File - Use for error messages, status messages, and message ID references
   • Program Files (RPG/CLP/RPGLE/CLLE/SQLRPG/SQLRPGLE) - Main source code to analyze
   • DDS/DDL Files - Use for database structure and file definitions
   • Copy Files - Use for copybook references and shared code
   • Module Files - Use for ILE module dependencies
   • Service Program Files - Use for service program bindings

2. ANALYSIS RULES:
   ✓ Each category is CLEARLY MARKED with BEGIN/END tags
   ✓ DO NOT mix content from different categories
   ✓ When referencing data, ALWAYS cite the source category
   ✓ Use Message File for exact message text when you see message IDs
   ✓ Use File Fields Reference for field descriptions in data mappings
   ✓ Use Program Calling Tree for the Call Stack section

3. CROSS-REFERENCE PROPERLY:
   - Message IDs → Look up in MESSAGE FILE section
   - Field names → Look up in FILE FIELDS REFERENCE section
   - Called programs → Reference PROGRAM CALLING TREE section
   - File structures → Reference DDS/DDL FILES section

${documentContext}

████████████████████████████████████████████████████████████████████████████████
█                         END OF REFERENCE DOCUMENTS                           █
████████████████████████████████████████████████████████████████████████████████`;
    }

    userMessage += `\n\nGenerate documentation following the system prompt instructions exactly.

FINAL REMINDERS:
- Use the reference documents to provide ACCURATE information
- Cross-reference message IDs with the Message File for exact message text
- Use File Fields Reference for accurate field descriptions
- Cite sources when using reference document information
- Keep each document category's information separate and properly attributed`;

    console.log('[API] Sending request to OpenAI API (gpt-4o)...');
    const startTime = Date.now();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: customPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const documentation = data.choices[0]?.message?.content;
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!documentation) {
      throw new Error('AI returned empty response');
    }

    // Calculate cost based on GPT-4o pricing
    // GPT-4o pricing: $2.50 per 1M input tokens, $10.00 per 1M output tokens
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const inputCost = (inputTokens / 1000000) * 2.50;
    const outputCost = (outputTokens / 1000000) * 10.00;
    const totalCost = inputCost + outputCost;

    console.log('[API] Documentation generated successfully');
    console.log('[API] Time taken:', elapsedTime + 's');
    console.log('[API] Tokens used:', data.usage?.total_tokens || 0);
    console.log('[API] Cost: $' + totalCost.toFixed(4));
    console.log('[API] Output length:', documentation.length, 'characters');

    return NextResponse.json({
      documentation,
      tokensUsed: data.usage?.total_tokens || 0,
      inputTokens,
      outputTokens,
      cost: totalCost.toFixed(4),
      costBreakdown: {
        input: inputCost.toFixed(4),
        output: outputCost.toFixed(4)
      },
      model: data.model,
      timeTaken: elapsedTime
    });

  } catch (error) {
    console.error('[API] Error:', error.message);

    let errorMessage = 'AI generation failed: ' + error.message;

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid OpenAI API key';
    } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      errorMessage = 'Rate limit or quota exceeded';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
