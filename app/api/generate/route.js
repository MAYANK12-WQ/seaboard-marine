import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request) {
  try {
    const { rpgCode, messageList, customPrompt } = await request.json();

    if (!rpgCode || !rpgCode.trim()) {
      return NextResponse.json(
        { error: 'RPG code is required' },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey || groqApiKey === 'gsk_your_api_key_here') {
      return NextResponse.json(
        { error: 'Valid GROQ_API_KEY not configured in environment variables.' },
        { status: 500 }
      );
    }

    console.log('[API] Starting AI documentation generation');
    console.log('[API] RPG Code length:', rpgCode.length);
    console.log('[API] Using custom prompt:', !!customPrompt);
    console.log('[API] Prompt length:', customPrompt?.length || 0);

    const groq = new Groq({ apiKey: groqApiKey });

    let userMessage = `Analyze this RPG program code:\n\n${rpgCode}`;

    if (messageList && messageList.trim()) {
      userMessage += `\n\nMessage List:\n${messageList}`;
    }

    userMessage += `\n\nGenerate documentation following the system prompt instructions exactly.`;

    console.log('[API] Sending request to Groq AI (llama-3.3-70b-versatile)...');
    const startTime = Date.now();

    const completion = await groq.chat.completions.create({
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
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 8000,
      top_p: 1,
      stream: false,
    });

    const documentation = completion.choices[0]?.message?.content;
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!documentation) {
      throw new Error('AI returned empty response');
    }

    console.log('[API] Documentation generated successfully');
    console.log('[API] Time taken:', elapsedTime + 's');
    console.log('[API] Tokens used:', completion.usage?.total_tokens || 0);
    console.log('[API] Output length:', documentation.length, 'characters');

    return NextResponse.json({
      documentation,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
      timeTaken: elapsedTime
    });

  } catch (error) {
    console.error('[API] Error:', error.message);

    let errorMessage = 'AI generation failed: ' + error.message;

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid Groq API key';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Wait 1 minute.';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
