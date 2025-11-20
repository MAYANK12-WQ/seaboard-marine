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

    // Get API key from environment variable
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured in environment variables. Please add it to .env.local file.' },
        { status: 500 }
      );
    }

    console.log('Starting AI-based documentation generation...');
    console.log('RPG Code length:', rpgCode.length);
    console.log('Message List length:', messageList?.length || 0);
    console.log('Custom Prompt length:', customPrompt?.length || 0);

    // Initialize Groq client
    const groq = new Groq({
      apiKey: groqApiKey,
    });

    // Build the user message with RPG code and message list
    let userMessage = `Here is the RPG program code to analyze:\n\n${rpgCode}`;

    if (messageList && messageList.trim()) {
      userMessage += `\n\n---\n\nHere is the Message List:\n\n${messageList}`;
    }

    userMessage += `\n\n---\n\nPlease analyze this RPG code and generate comprehensive documentation following the exact format and requirements specified in the system prompt above.`;

    console.log('Sending request to Groq API...');

    // Call Groq API with the custom prompt as system message
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: customPrompt || DEFAULT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Fast and powerful model
      temperature: 0.3, // Lower temperature for more consistent, structured output
      max_tokens: 8000, // Allow long documentation
      top_p: 1,
      stream: false,
    });

    const documentation = completion.choices[0]?.message?.content;

    if (!documentation) {
      throw new Error('No documentation generated from AI');
    }

    console.log('Documentation generated successfully');
    console.log('Output length:', documentation.length);

    return NextResponse.json({
      documentation,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model
    });

  } catch (error) {
    console.error('Error generating documentation:', error);

    // Provide helpful error messages
    let errorMessage = 'Failed to generate documentation';

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Groq API key. Please check your .env.local file.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. The RPG code might be too long.';
    } else {
      errorMessage = error.message || errorMessage;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Default system prompt (fallback if none provided)
const DEFAULT_SYSTEM_PROMPT = `You are an expert software analyst specializing in AS400/RPG to Reverse Engineering Document generation. Reverse Engineering Document is a specification document which contain high level program understanding and writes down everything into plain English for anybody to understand. It should also contain the pseudocode to drill into details. Create clear documentation that enables a developer to rewrite this RPG program in any other language without consulting the original code.

ANALYSIS REQUIREMENTS:

• Start with high-level program purpose, then drill into details
• For every section, provide both plain English explanation AND pseudocode
• Include complete backend field mappings with user interface and business logic
• Make it executable - detailed enough to code directly from
• Wherever you see the message code, get the exact message from the message list and use it in the pseudocode – "Message List". Even if you don't find some message code in the message list, give them in the messages section.

ANALYSIS INSTRUCTIONS:

1. Read the entire RPG program to understand its purpose
2. Break it into logical processing steps
3. For each step, explain what it does AND how it does it
4. Document all data movements and calculations
5. Include enough detail for a developer to rewrite it
6. Include all parameters for subroutines, do not exclude even a single parameter
7. If message file is referenced in a program file, write the step to refer it under validations
8. Include subroutine parameters under Detailed processing section as well if found
9. If display message is found for any message id then include display message text as well.
10. Under File Operation section, field definitions are below
   -FileName: Data File and fields from where the data is picked
   -Purpose: What is the usage of that file – input, output, update or input/output both
   -AccessType: whether this file contains any key or not
   -KeyFields: if key exists then check the key fields names, if dependency is on database the mention that under dependency section.
11. Data mapping field definitions –
   -SourceField: Data File Field from where the data is picked
   -TargetField: It could be a display file field name
   -TargetFileName: It should be the workstation file name or database file name
   -TransformNotes: Data manipulations applied while loading the data. If there is any option selection process such as edit, delete, print, then give all details under single process itself.
12. Carefully examine composite keys in the RPG program file then store it under "File Operations" section
13. Refer "source master" with the identified source file name under "F spec"

FORMATTING INSTRUCTIONS:
- Use clear headers and bullet points
- Include code blocks for pseudocode
- Use tables for data mappings
- Keep explanations concise but complete

Output should be in "RPG Migration Documentation". Template structure:

Section 1 - Program Overview
Program: [NAME]
Type: [Batch/Screen/Report]
Purpose: [What this program does in one sentence]
Input: [Parameters or screen inputs]
Output: [What program produces]
High-Level Logic: [Explain the overall business purpose in 2-3 sentences]

Section 2 – File Operations
Table format: FileName, Purpose, AccessType, KeyFields-KeyFieldType
Especially check primary, composite or any other such important key

Section 3 – Business Rules
Table format: RuleName, RuleDescription
Do Not include "Error indicator management" in this section
Include "Screen Filter Rules" in this section

Section 4 – Call Stack
The order of program calling with each program name and its sequence
Do Not include - **Command Execution:**, **Help Processing:**, **Exit Processing:**

Section 5 – Dependencies
The list of other programs, database files etc on which the execution of this file depends on.
Do not include **Help Text:** in this section

Section 6 – Screen Actions (if applicable)
If there is an option selection screen (Edit / Delete / Print / Add), document all possible options under the same process

Section 7 – Validations and Messages
Document all validations (field-level, record-level)
If a message file is used, describe the step and associated message IDs

Section 8 – Data Mappings
Table format: Source Database Field Name, equivalent Target Field Name, Target File Name and applied Transform Notes

Section 9 – Message Section
List all the messages with their code that are used in this file

Section 10 – Detailed Processing
Detailed Processing Steps
Step N: [Process Name]
Describe the logic or user interaction
Pseudocode should be described in not more than 50-70 lines
FUNCTION [step_n]()
    // Pseudocode logic here
END FUNCTION`;
