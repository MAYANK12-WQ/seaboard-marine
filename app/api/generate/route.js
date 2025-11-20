import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { rpgCode, messageList, customPrompt } = await request.json();

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

    userMessage += `\n\nGenerate documentation following the system prompt instructions exactly.`;

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

    console.log('[API] Documentation generated successfully');
    console.log('[API] Time taken:', elapsedTime + 's');
    console.log('[API] Tokens used:', data.usage?.total_tokens || 0);
    console.log('[API] Output length:', documentation.length, 'characters');

    return NextResponse.json({
      documentation,
      tokensUsed: data.usage?.total_tokens || 0,
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
