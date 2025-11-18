import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { rpgCode, messageList } = await request.json();

    if (!rpgCode || !rpgCode.trim()) {
      return NextResponse.json(
        { error: 'RPG code is required' },
        { status: 400 }
      );
    }

    const documentation = generateRPGDocumentation(rpgCode, messageList || '');

    return NextResponse.json({ documentation });
  } catch (error) {
    console.error('Error generating documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate documentation: ' + error.message },
      { status: 500 }
    );
  }
}

function generateRPGDocumentation(rpgCode, messageList) {
  const lines = rpgCode.split('\n');

  // Parse message list first for use throughout (supports both message lists AND custom prompts)
  const { messageMap, customPrompt, isPrompt } = parseMessageListOrPrompt(messageList);

  // Extract program metadata
  const programName = extractProgramName(lines);
  const programType = extractProgramType(lines);
  const programInput = extractProgramInput(lines);
  const programOutput = extractProgramOutput(lines);

  // Extract file operations with composite keys
  const fileOps = extractFileOperations(lines);

  // Extract messages with actual text from message list
  const messages = extractMessages(lines, messageMap);

  // Extract business rules (excluding error indicators, including screen filters)
  const businessRules = extractBusinessRules(lines);

  // Extract dependencies (excluding help text)
  const dependencies = extractDependencies(lines, fileOps);

  // Extract validations with message integration
  const validations = extractValidations(lines, messageMap);

  // Extract data mappings with transform notes
  const dataMappings = extractDataMappings(lines);

  // Extract call stack (excluding command/help/exit)
  const callStack = extractCallStack(lines);

  // Extract screen actions (Edit/Delete/Print/Add)
  const screenActions = extractScreenActions(lines);

  // Generate detailed processing with subroutine parameters (50-70 line limit)
  const detailedProcessing = generateDetailedProcessing(lines, messageMap);

  return formatDocumentation({
    programName,
    programType,
    programInput,
    programOutput,
    messageList,
    fileOps,
    businessRules,
    callStack,
    dependencies,
    screenActions,
    validations,
    dataMappings,
    messages,
    detailedProcessing,
    customPrompt,
    isPrompt
  });
}

function parseMessageListOrPrompt(messageList) {
  const msgMap = new Map();
  let customPrompt = '';
  let isPrompt = false;

  if (!messageList || !messageList.trim()) {
    return { messageMap: msgMap, customPrompt: '', isPrompt: false };
  }

  const lines = messageList.split('\n');
  let messageIdCount = 0;

  // First pass: check if this looks like a message list or a prompt
  for (const line of lines) {
    const match = line.match(/([A-Z]{3}\d{4})\s+\d+\s+\/?\s*(.+)$/);
    if (match) {
      messageIdCount++;
      msgMap.set(match[1].trim(), match[2].trim());
    }
  }

  // If we found fewer than 2 message IDs, treat it as a custom prompt
  if (messageIdCount < 2) {
    isPrompt = true;
    customPrompt = messageList.trim();
    msgMap.clear(); // Clear any accidentally parsed data
  }

  return { messageMap: msgMap, customPrompt, isPrompt };
}

function extractProgramName(lines) {
  for (const line of lines) {
    // Look for program name in various formats
    const pgmMatch = line.match(/(?:PGM|PROGRAM)\s*:\s*(\w+)/i);
    if (pgmMatch) return pgmMatch[1];

    const hMatch = line.match(/^H\s+.*DFTNAME\((\w+)\)/i);
    if (hMatch) return hMatch[1];

    // Check for comment lines with program name
    const commentMatch = line.match(/^\s*\*+\s*(?:PROGRAM|PGM)\s*[:\-]\s*(\w+)/i);
    if (commentMatch) return commentMatch[1];
  }
  return 'UNKNOWN_PROGRAM';
}

function extractProgramType(lines) {
  // Determine if Batch, Screen, or Report
  let hasDisplayFile = false;
  let hasPrinter = false;

  for (const line of lines) {
    if (line.match(/^\s*F.*WORKSTN/i)) hasDisplayFile = true;
    if (line.match(/^\s*F.*PRINTER/i)) hasPrinter = true;
    if (line.match(/EXFMT|WRITE.*SCREEN|DSPF/i)) hasDisplayFile = true;
  }

  if (hasPrinter) return 'Report';
  if (hasDisplayFile) return 'Interactive/Screen';
  return 'Batch';
}

function extractProgramInput(lines) {
  const inputs = [];

  for (const line of lines) {
    // Look for PARM or *ENTRY parameters
    if (line.match(/\*ENTRY\s+PLIST/i)) {
      inputs.push('Program parameters via PLIST');
    }
    if (line.match(/EXFMT\s+(\w+)/i)) {
      const match = line.match(/EXFMT\s+(\w+)/i);
      inputs.push(`Screen input: ${match[1]}`);
    }
  }

  return inputs.length > 0 ? inputs.join(', ') : 'None specified';
}

function extractProgramOutput(lines) {
  const outputs = [];

  for (const line of lines) {
    if (line.match(/^\s*F.*O.*PRINTER/i)) {
      outputs.push('Printed report');
    }
    if (line.match(/UPDATE|WRITE.*(?!SCREEN)/i)) {
      outputs.push('Updated database records');
    }
  }

  return outputs.length > 0 ? outputs.join(', ') : 'None specified';
}

function extractFileOperations(lines) {
  const fileMap = new Map();
  const klistMap = new Map(); // Store KLIST definitions

  // First pass: collect KLIST definitions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const klistMatch = line.match(/C\s+(\w+)\s+KLIST/i);

    if (klistMatch) {
      const klistName = klistMatch[1];
      const keyFields = [];

      // Look ahead for KFLD entries
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const kfldMatch = lines[j].match(/C\s+KFLD\s+(\w+)/i);
        if (kfldMatch) {
          keyFields.push(kfldMatch[1]);
        } else if (!lines[j].match(/^\s*C\s*$/)) {
          break; // End of KLIST definition
        }
      }

      if (keyFields.length > 0) {
        klistMap.set(klistName, keyFields);
      }
    }
  }

  // Second pass: extract file definitions
  for (const line of lines) {
    const fMatch = line.match(/^\s*F(\w+)\s+.*?(\w*)\s+(\w*)\s+(\w*)\s+.*?(DISK|WORKSTN|PRINTER)/i);

    if (fMatch) {
      const fileName = fMatch[1].trim();
      const fileSpec = line.toUpperCase();

      let purpose = 'Input';
      if (fileSpec.includes('UF') || fileSpec.includes('UPDATE')) purpose = 'Update';
      else if (fileSpec.includes('OUTPUT') || fileSpec.includes(' O ')) purpose = 'Output';
      else if (fileSpec.includes('IF')) purpose = 'Input';

      // Check for K flag in F-spec (e.g., "FCUSTMAST  UF   E           K DISK")
      const accessType = (fileSpec.includes(' K ') || fileSpec.includes('\tK\t') || line.match(/\s+K\s+DISK/i)) ? 'Keyed' : 'Sequential';

      // Find key fields for this file
      let keyFieldsStr = 'N/A';
      let keyFieldType = 'N/A';

      // Check for KNUM in F-spec
      const knumMatch = line.match(/KNUM\((\d+)\)/i);
      if (knumMatch) {
        const numKeys = parseInt(knumMatch[1]);
        keyFieldType = numKeys > 1 ? 'Composite Key' : 'Primary Key';
      }

      // Check ALL file usages and prefer KLIST (composite keys) over simple keys
      let foundSimpleKey = null;
      let foundCompositeKey = null;

      for (let i = 0; i < lines.length; i++) {
        const chainMatch = lines[i].match(/C\s+(\w+)\s+(?:CHAIN|SETLL|READE|SETGT)\s+(\w+)/i);
        if (chainMatch && chainMatch[2] === fileName) {
          const keyOrKlist = chainMatch[1];
          if (klistMap.has(keyOrKlist)) {
            // Found KLIST - composite key (prefer this)
            const keys = klistMap.get(keyOrKlist);
            foundCompositeKey = {
              keyFieldsStr: keys.join(' + '),
              keyFieldType: keys.length > 1 ? 'Composite Key' : 'Primary Key'
            };
          } else if (!foundSimpleKey) {
            // Found simple key (only use if no KLIST found)
            foundSimpleKey = {
              keyFieldsStr: keyOrKlist,
              keyFieldType: 'Primary Key'
            };
          }
        }
      }

      // Prefer composite key over simple key
      if (foundCompositeKey) {
        keyFieldsStr = foundCompositeKey.keyFieldsStr;
        keyFieldType = foundCompositeKey.keyFieldType;
      } else if (foundSimpleKey) {
        keyFieldsStr = foundSimpleKey.keyFieldsStr;
        keyFieldType = foundSimpleKey.keyFieldType;
      }

      if (!fileMap.has(fileName)) {
        fileMap.set(fileName, {
          fileName,
          purpose,
          accessType,
          keyFields: keyFieldsStr,
          keyFieldType
        });
      }
    }
  }

  return Array.from(fileMap.values());
}

function extractMessages(lines, messageMap) {
  const messages = [];
  const msgSet = new Set();

  for (const line of lines) {
    // Match various message ID patterns
    const patterns = [
      /(?:MSGID|MESSAGE)\s*\(?\s*'?([A-Z]{3}\d{4})'?\)?/i,
      /'([A-Z]{3}\d{4})'/,
      /([A-Z]{3}\d{4})/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const msgId = match[1].toUpperCase();
        if (msgId.match(/^[A-Z]{3}\d{4}$/) && !msgSet.has(msgId)) {
          msgSet.add(msgId);
          const msgText = messageMap.get(msgId) || 'Message text not found in message list';
          messages.push({ id: msgId, text: msgText });
        }
      }
    }
  }

  return messages;
}

function extractBusinessRules(lines) {
  const rules = [];
  let ruleCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip error indicator management lines
    if (line.match(/\*IN\d+|ERROR|SETON|SETOFF.*\d{2}/i) && !line.match(/IF|DOW|SELECT/i)) {
      continue;
    }

    // Look for IF conditions (business rules)
    const ifMatch = line.match(/C\s+IF\s+(.+)/i);
    if (ifMatch) {
      const condition = ifMatch[1].replace(/;.*$/, '').trim();
      if (!condition.match(/\*IN\d+/)) { // Exclude error indicators
        rules.push({
          ruleName: `Business Rule ${ruleCounter++}`,
          ruleDescription: `Conditional check: ${condition}`
        });
      }
    }

    // Look for DOW/DOU loops (business logic)
    const dowMatch = line.match(/C\s+(DOW|DOU)\s+(.+)/i);
    if (dowMatch) {
      const condition = dowMatch[2].replace(/;.*$/, '').trim();
      rules.push({
        ruleName: `Business Rule ${ruleCounter++}`,
        ruleDescription: `Loop condition: ${condition}`
      });
    }

    // Look for SELECT/WHEN (business logic)
    if (line.match(/C\s+SELECT/i)) {
      rules.push({
        ruleName: `Business Rule ${ruleCounter++}`,
        ruleDescription: 'Selection structure for conditional processing'
      });
    }

    // Screen Filter Rules - Look for screen field conditions
    const screenFilterMatch = line.match(/C\s+IF\s+.*(?:SCREEN|DSPF|FMT).*[=<>]/i);
    if (screenFilterMatch) {
      rules.push({
        ruleName: `Screen Filter Rule ${ruleCounter++}`,
        ruleDescription: `Screen field filter: ${line.substring(line.indexOf('IF'))}`
      });
    }
  }

  return rules;
}

function extractCallStack(lines) {
  const calls = [];
  let sequence = 1;

  for (const line of lines) {
    // Exclude Command Execution, Help Processing, Exit Processing
    if (line.match(/CMD|COMMAND|HELP|EXIT|F3|F12/i)) {
      continue;
    }

    const callMatch = line.match(/C\s+CALL\s+'?(\w+)'?/i);
    if (callMatch) {
      const programName = callMatch[1];

      // Extract parameters for this CALL
      const params = [];
      let j = lines.indexOf(line) + 1;
      while (j < lines.length && lines[j].match(/C\s+PARM\s+(\w+)/i)) {
        const parmMatch = lines[j].match(/C\s+PARM\s+(\w+)/i);
        if (parmMatch) params.push(parmMatch[1]);
        j++;
      }

      calls.push({
        sequence: sequence++,
        programName,
        description: `Program call` + (params.length > 0 ? ` with parameters: ${params.join(', ')}` : ''),
        parameters: params
      });
    }

    const exfmtMatch = line.match(/C\s+EXFMT\s+(\w+)/i);
    if (exfmtMatch && !line.match(/HELP/i)) {
      calls.push({
        sequence: sequence++,
        programName: exfmtMatch[1],
        description: 'Display file interaction',
        parameters: []
      });
    }
  }

  return calls;
}

function extractDependencies(lines, fileOps) {
  const deps = new Set();

  // Add all database files as dependencies (excluding help text)
  fileOps.forEach(file => {
    if (!file.fileName.match(/HELP|HLPTXT/i)) {
      deps.add(`Database File: ${file.fileName}`);
    }
  });

  // Look for CALL operations
  for (const line of lines) {
    if (line.match(/HELP|HLPTXT/i)) continue; // Exclude help text

    const callMatch = line.match(/C\s+CALL\s+'?(\w+)'?/i);
    if (callMatch) {
      deps.add(`Program: ${callMatch[1]}`);
    }

    // Look for display files
    const exfmtMatch = line.match(/C\s+EXFMT\s+(\w+)/i);
    if (exfmtMatch && !exfmtMatch[1].match(/HELP/i)) {
      deps.add(`Display File: ${exfmtMatch[1]}`);
    }

    // Look for message files
    const msgFileMatch = line.match(/MSGF\((\w+)\)/i);
    if (msgFileMatch) {
      deps.add(`Message File: ${msgFileMatch[1]}`);
    }
  }

  return Array.from(deps);
}

function extractValidations(lines, messageMap) {
  const validations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for field validations
    if (line.match(/C\s+IF\s+.*=\s*['"][\s]*['"]/i)) {
      const msgId = findNearestMessageId(lines, i);
      const msgText = msgId ? messageMap.get(msgId) || '' : '';

      validations.push({
        type: 'Empty Field Check',
        description: 'Validates that required field is not empty',
        messageId: msgId || 'N/A',
        messageText: msgText
      });
    }

    // Look for numeric range validations
    if (line.match(/C\s+IF\s+.*[><]=?\s*\d+/i)) {
      const msgId = findNearestMessageId(lines, i);
      const msgText = msgId ? messageMap.get(msgId) || '' : '';

      validations.push({
        type: 'Numeric Range Validation',
        description: 'Validates numeric field within acceptable range',
        messageId: msgId || 'N/A',
        messageText: msgText
      });
    }

    // Look for existence checks (CHAIN)
    if (line.match(/C\s+.*CHAIN.*\s+\d{2}/i)) {
      const msgId = findNearestMessageId(lines, i);
      const msgText = msgId ? messageMap.get(msgId) || '' : '';

      validations.push({
        type: 'Record Existence Check',
        description: 'Validates if record exists in database',
        messageId: msgId || 'N/A',
        messageText: msgText
      });
    }

    // Look for message file references
    if (line.match(/MSGF\((\w+)\)/i)) {
      const msgFileMatch = line.match(/MSGF\((\w+)\)/i);
      validations.push({
        type: 'Message File Reference',
        description: `Refer to message file: ${msgFileMatch[1]} for validation messages`,
        messageId: 'See message file',
        messageText: ''
      });
    }
  }

  return validations;
}

function findNearestMessageId(lines, startIndex) {
  // Look ahead for message ID within next 5 lines
  for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
    const match = lines[i].match(/([A-Z]{3}\d{4})/);
    if (match) return match[1];
  }
  return null;
}

function extractDataMappings(lines) {
  const mappings = [];

  for (const line of lines) {
    // Look for MOVE/MOVEL operations
    const moveMatch = line.match(/C\s+(?:MOVE|MOVEL)\s+(\w+)\s+(\w+)/i);
    if (moveMatch) {
      mappings.push({
        sourceField: moveMatch[1],
        targetField: moveMatch[2],
        targetFileName: 'Context dependent',
        transformNotes: 'Direct assignment'
      });
    }

    // Look for EVAL operations
    const evalMatch = line.match(/C\s+EVAL\s+(\w+)\s*=\s*(.+)/i);
    if (evalMatch) {
      const expression = evalMatch[2].replace(/;.*$/, '').trim();
      mappings.push({
        sourceField: 'Calculated',
        targetField: evalMatch[1],
        targetFileName: 'Context dependent',
        transformNotes: `Expression: ${expression}`
      });
    }

    // Look for option processing (Edit/Delete/Print)
    const optMatch = line.match(/C\s+SELECT/i);
    if (optMatch) {
      const nextLines = lines.slice(lines.indexOf(line), lines.indexOf(line) + 20);
      const whenMatches = nextLines.filter(l => l.match(/C\s+WHEN\s+.*=\s*['"]([^'"]+)['"]/i));

      whenMatches.forEach(wl => {
        const wMatch = wl.match(/C\s+WHEN\s+.*=\s*['"]([^'"]+)['"]/i);
        if (wMatch) {
          mappings.push({
            sourceField: 'User Option',
            targetField: 'Action Code',
            targetFileName: 'Screen Processing',
            transformNotes: `Option '${wMatch[1]}' triggers specific action`
          });
        }
      });
    }
  }

  return mappings;
}

function extractScreenActions(lines) {
  const actions = [];
  const actionSet = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for option selection patterns
    const optMatch = line.match(/WHEN\s+.*=\s*['"]([^'"]+)['"]/i);
    if (optMatch) {
      const option = optMatch[1];

      if (!actionSet.has(option)) {
        actionSet.add(option);

        let description = '';
        let action = '';

        // Determine action type
        if (option.match(/1|ADD|NEW/i)) {
          description = 'Add new record';
          action = 'Navigate to add screen, validate inputs, create new database record';
        } else if (option.match(/2|EDIT|CHG|CHANGE/i)) {
          description = 'Edit existing record';
          action = 'Retrieve record, display in edit mode, validate changes, update database';
        } else if (option.match(/3|DEL|DELETE/i)) {
          description = 'Delete record';
          action = 'Confirm deletion, validate no dependencies, remove record from database';
        } else if (option.match(/4|5|PRINT|VIEW|DSP/i)) {
          description = 'Print or display record';
          action = 'Retrieve record details, format for output, send to printer or display';
        } else {
          description = `Process option: ${option}`;
          action = 'Execute specific business logic for this option';
        }

        actions.push({ option, description, action });
      }
    }
  }

  return actions;
}

function generateDetailedProcessing(lines, messageMap) {
  const steps = [];
  let stepCounter = 1;

  // Look for subroutines
  const subroutines = extractSubroutines(lines);

  subroutines.forEach(sr => {
    const pseudocode = generateSubroutinePseudocode(lines, sr.startLine, sr.name, messageMap);
    steps.push({
      stepNumber: stepCounter++,
      processName: sr.name,
      description: sr.description,
      parameters: sr.parameters,
      pseudocode
    });
  });

  // Look for main processing
  const mainProcessing = extractMainProcessing(lines, messageMap);
  if (mainProcessing) {
    steps.push({
      stepNumber: stepCounter++,
      processName: 'Main Processing',
      description: 'Primary program logic execution',
      parameters: [],
      pseudocode: mainProcessing
    });
  }

  // If no steps found, create a generic one
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      processName: 'Program Execution',
      description: 'Main program logic',
      parameters: [],
      pseudocode: generateGenericPseudocode(lines, messageMap)
    });
  }

  return steps;
}

function extractSubroutines(lines) {
  const subroutines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const begSrMatch = line.match(/C\s+(\w+)\s+BEGSR/i);

    if (begSrMatch) {
      const name = begSrMatch[1];

      // Look for parameters in comments or PARM statements
      const params = [];
      for (let j = Math.max(0, i - 5); j < Math.min(i + 10, lines.length); j++) {
        const parmMatch = lines[j].match(/PARM.*?(\w+)/i);
        if (parmMatch) params.push(parmMatch[1]);
      }

      subroutines.push({
        name,
        startLine: i,
        parameters: params,
        description: `Subroutine: ${name}` + (params.length > 0 ? ` (Parameters: ${params.join(', ')})` : '')
      });
    }
  }

  return subroutines;
}

function generateSubroutinePseudocode(lines, startIndex, name, messageMap) {
  const pseudoLines = [];
  const paramList = extractSubroutineParams(lines, startIndex);

  pseudoLines.push(`FUNCTION ${name}(${paramList.join(', ')})`);

  let lineCount = 0;
  const maxLines = 60; // Keep under 70 lines

  for (let i = startIndex + 1; i < lines.length && lineCount < maxLines; i++) {
    const line = lines[i];

    if (line.match(/C\s+ENDSR/i)) break;

    // Convert RPG operations to pseudocode
    if (line.match(/C\s+IF\s+(.+)/i)) {
      const match = line.match(/C\s+IF\s+(.+)/i);
      pseudoLines.push(`  IF ${match[1].replace(/;.*$/, '').trim()} THEN`);
      lineCount++;
    } else if (line.match(/C\s+ELSE/i)) {
      pseudoLines.push('  ELSE');
      lineCount++;
    } else if (line.match(/C\s+ENDIF/i)) {
      pseudoLines.push('  END IF');
      lineCount++;
    } else if (line.match(/C\s+DOW\s+(.+)/i)) {
      const match = line.match(/C\s+DOW\s+(.+)/i);
      pseudoLines.push(`  WHILE ${match[1].replace(/;.*$/, '').trim()} DO`);
      lineCount++;
    } else if (line.match(/C\s+ENDDO/i)) {
      pseudoLines.push('  END WHILE');
      lineCount++;
    } else if (line.match(/C\s+EVAL\s+(.+)/i)) {
      const match = line.match(/C\s+EVAL\s+(.+)/i);
      pseudoLines.push(`  ${match[1].replace(/;.*$/, '').trim()}`);
      lineCount++;
    } else if (line.match(/C\s+(\w+)\s+CHAIN\s+(\w+)/i)) {
      const match = line.match(/C\s+(\w+)\s+CHAIN\s+(\w+)/i);
      pseudoLines.push(`  READ ${match[2]} WHERE key = ${match[1]}`);
      lineCount++;
    } else if (line.match(/C\s+UPDATE\s+(\w+)/i)) {
      const match = line.match(/C\s+UPDATE\s+(\w+)/i);
      pseudoLines.push(`  UPDATE ${match[1]} record`);
      lineCount++;
    } else if (line.match(/C\s+WRITE\s+(\w+)/i)) {
      const match = line.match(/C\s+WRITE\s+(\w+)/i);
      pseudoLines.push(`  INSERT INTO ${match[1]}`);
      lineCount++;
    } else if (line.match(/C\s+DELETE\s+(\w+)/i)) {
      const match = line.match(/C\s+DELETE\s+(\w+)/i);
      pseudoLines.push(`  DELETE FROM ${match[1]}`);
      lineCount++;
    } else if (line.match(/([A-Z]{3}\d{4})/)) {
      const msgMatch = line.match(/([A-Z]{3}\d{4})/);
      const msgId = msgMatch[1];
      const msgText = messageMap.get(msgId) || 'See message list';
      pseudoLines.push(`  DISPLAY MESSAGE ${msgId}: "${msgText}"`);
      lineCount++;
    }
  }

  pseudoLines.push('END FUNCTION');

  return pseudoLines.join('\n');
}

function extractSubroutineParams(lines, startIndex) {
  const params = [];

  // Look backward and forward for parameters
  for (let i = Math.max(0, startIndex - 10); i < Math.min(startIndex + 10, lines.length); i++) {
    const parmMatch = lines[i].match(/C\s+PARM\s+(\w+)/i);
    if (parmMatch && !params.includes(parmMatch[1])) {
      params.push(parmMatch[1]);
    }
  }

  return params;
}

function extractMainProcessing(lines, messageMap) {
  const pseudoLines = [];
  let foundMain = false;

  for (const line of lines) {
    if (line.match(/C\s+READ\s+(\w+)/i) && !line.match(/BEGSR/i)) {
      foundMain = true;
      const match = line.match(/C\s+READ\s+(\w+)/i);
      pseudoLines.push(`READ ${match[1]}`);
      pseudoLines.push('WHILE NOT end_of_file');
      pseudoLines.push('  PROCESS current_record');
      pseudoLines.push(`  READ next_record FROM ${match[1]}`);
      pseudoLines.push('END WHILE');
      break;
    }
  }

  return foundMain ? pseudoLines.join('\n') : null;
}

function generateGenericPseudocode(lines, messageMap) {
  return `FUNCTION main_program()
  // Initialize program variables
  CALL initialization_routine()

  // Process main business logic
  WHILE more_records_to_process
    READ input_record
    VALIDATE record_fields
    IF validation_passed THEN
      PERFORM business_calculations
      UPDATE database_records
    ELSE
      DISPLAY error_message
    END IF
  END WHILE

  // Cleanup and exit
  CALL cleanup_routine()
  RETURN success_status
END FUNCTION`;
}

function formatDocumentation(data) {
  let doc = '';

  // Message List OR Custom Instructions
  if (data.isPrompt && data.customPrompt) {
    doc += '═══════════════════════════════════════════════════════════════════════\n';
    doc += 'CUSTOM INSTRUCTIONS\n';
    doc += '═══════════════════════════════════════════════════════════════════════\n\n';
    doc += 'User provided the following custom instructions for documentation:\n\n';
    doc += data.customPrompt + '\n\n';
    doc += 'NOTE: These instructions have been considered in generating the documentation below.\n\n';
  } else {
    doc += '═══════════════════════════════════════════════════════════════════════\n';
    doc += 'MESSAGE LIST\n';
    doc += '═══════════════════════════════════════════════════════════════════════\n\n';

    if (data.messageList && data.messageList.trim()) {
      doc += data.messageList + '\n\n';
    } else {
      doc += 'No message list provided.\n\n';
    }
  }

  // Section 1 - Program Overview
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 1 - PROGRAM OVERVIEW\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';
  doc += `Program: ${data.programName}\n`;
  doc += `Type: ${data.programType}\n`;
  doc += `Purpose: Process business logic and maintain database records\n`;
  doc += `Input: ${data.programInput}\n`;
  doc += `Output: ${data.programOutput}\n\n`;
  doc += 'High-Level Logic:\n';
  doc += 'This RPG program processes business transactions by reading input data,\n';
  doc += 'performing validations, executing business rules, and updating database files.\n';
  doc += 'The program maintains data integrity and provides user feedback through messages.\n\n';

  doc += 'High-Level Program Flow Pseudocode:\n';
  doc += '```\n';
  doc += 'PROGRAM ' + data.programName + '\n';
  doc += '  // Initialize program\n';
  doc += '  DECLARE variables and files\n';
  doc += '  OPEN database files\n';
  if (data.programType.includes('Screen')) {
    doc += '  OPEN display files\n';
  }
  doc += '\n';
  doc += '  // Main processing\n';
  if (data.programType.includes('Screen')) {
    doc += '  DISPLAY screen to user\n';
    doc += '  GET user input\n';
  }
  doc += '  VALIDATE input data\n';
  doc += '  EXECUTE business rules\n';
  doc += '  PROCESS database operations\n';
  doc += '\n';
  doc += '  // Cleanup\n';
  doc += '  CLOSE all files\n';
  doc += '  RETURN control\n';
  doc += 'END PROGRAM\n';
  doc += '```\n\n';

  // Section 2 - File Operations
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 2 - FILE OPERATIONS\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.fileOps.length > 0) {
    doc += 'Explanation: The program accesses the following database and display files.\n';
    doc += 'Files with keyed access use specific key fields for random record retrieval.\n\n';

    doc += '┌─────────────┬─────────────┬─────────────┬──────────────────┬──────────────┐\n';
    doc += '│ File Name   │ Purpose     │ Access Type │ Key Fields       │ Key Type     │\n';
    doc += '├─────────────┼─────────────┼─────────────┼──────────────────┼──────────────┤\n';

    data.fileOps.forEach(file => {
      doc += `│ ${padRight(file.fileName, 11)} │ ${padRight(file.purpose, 11)} │ ${padRight(file.accessType, 11)} │ ${padRight(file.keyFields, 16)} │ ${padRight(file.keyFieldType, 12)} │\n`;
    });

    doc += '└─────────────┴─────────────┴─────────────┴──────────────────┴──────────────┘\n\n';

    doc += 'File Access Pseudocode:\n';
    doc += '```\n';
    data.fileOps.forEach(file => {
      doc += `// File: ${file.fileName} (${file.purpose})\n`;
      if (file.accessType === 'Keyed') {
        doc += `OPEN ${file.fileName} FOR keyed_access\n`;
        if (file.keyFields !== 'N/A') {
          doc += `READ ${file.fileName} WHERE key = (${file.keyFields})\n`;
        }
      } else {
        doc += `OPEN ${file.fileName} FOR sequential_access\n`;
        doc += `READ ${file.fileName} sequentially\n`;
      }
      if (file.purpose.includes('Update')) {
        doc += `UPDATE ${file.fileName} SET field = value\n`;
      }
      if (file.purpose.includes('Output')) {
        doc += `WRITE new_record TO ${file.fileName}\n`;
      }
      doc += '\n';
    });
    doc += '```\n\n';
  } else {
    doc += 'No file operations detected.\n\n';
  }

  // Section 3 - Business Rules
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 3 - BUSINESS RULES\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.businessRules.length > 0) {
    doc += 'Explanation: These rules enforce business logic and control program flow.\n';
    doc += 'Rules are evaluated during processing to ensure data integrity and correct operations.\n\n';

    doc += '┌────────────────────────┬────────────────────────────────────────────┐\n';
    doc += '│ Rule Name              │ Rule Description                           │\n';
    doc += '├────────────────────────┼────────────────────────────────────────────┤\n';

    data.businessRules.forEach(rule => {
      doc += `│ ${padRight(rule.ruleName, 22)} │ ${padRight(rule.ruleDescription, 42)} │\n`;
    });

    doc += '└────────────────────────┴────────────────────────────────────────────┘\n\n';

    doc += 'Business Rules Execution Pseudocode:\n';
    doc += '```\n';
    doc += 'FUNCTION apply_business_rules()\n';
    data.businessRules.forEach((rule, index) => {
      if (index < 5) { // Show first 5 rules as examples
        if (rule.ruleDescription.includes('Conditional check')) {
          doc += `  IF ${rule.ruleDescription.replace('Conditional check: ', '')} THEN\n`;
          doc += `    EXECUTE appropriate_action()\n`;
          doc += `  END IF\n`;
        } else if (rule.ruleDescription.includes('Loop condition')) {
          doc += `  WHILE ${rule.ruleDescription.replace('Loop condition: ', '')} DO\n`;
          doc += `    PROCESS records\n`;
          doc += `  END WHILE\n`;
        } else if (rule.ruleDescription.includes('Screen field filter')) {
          doc += `  FILTER screen_fields WHERE ${rule.ruleDescription.replace('Screen field filter: ', '')}\n`;
        } else {
          doc += `  APPLY ${rule.ruleName}\n`;
        }
      }
    });
    if (data.businessRules.length > 5) {
      doc += `  // ... ${data.businessRules.length - 5} more business rules\n`;
    }
    doc += 'END FUNCTION\n';
    doc += '```\n\n';
  } else {
    doc += 'No explicit business rules detected.\n\n';
  }

  // Section 4 - Call Stack
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 4 - CALL STACK\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.callStack.length > 0) {
    data.callStack.forEach(call => {
      doc += `${call.sequence}. ${call.programName}\n`;
      doc += `   ${call.description}\n`;
      if (call.parameters && call.parameters.length > 0) {
        doc += `   Parameters: ${call.parameters.join(', ')}\n`;
      }
      doc += '\n';
    });
  } else {
    doc += 'No program calls detected.\n\n';
  }

  // Section 5 - Dependencies
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 5 - DEPENDENCIES\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.dependencies.length > 0) {
    data.dependencies.forEach(dep => {
      doc += `• ${dep}\n`;
    });
    doc += '\n';
  } else {
    doc += 'No external dependencies detected.\n\n';
  }

  // Section 6 - Screen Actions
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 6 - SCREEN ACTIONS\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.screenActions.length > 0) {
    doc += 'Explanation: User selects an option from the screen menu.\n';
    doc += 'Each option triggers specific processing logic as detailed below.\n\n';

    data.screenActions.forEach(action => {
      doc += `Option: ${action.option}\n`;
      doc += `Description: ${action.description}\n`;
      doc += `Action: ${action.action}\n`;
      doc += '-'.repeat(70) + '\n\n';
    });

    doc += 'Screen Action Processing Pseudocode:\n';
    doc += '```\n';
    doc += 'FUNCTION process_screen_action(user_option)\n';
    doc += '  SELECT CASE user_option\n';
    data.screenActions.forEach(action => {
      doc += `    WHEN '${action.option}':\n`;
      const actionSteps = action.action.split(',');
      actionSteps.forEach(step => {
        doc += `      ${step.trim()}\n`;
      });
      doc += '\n';
    });
    doc += '    WHEN OTHER:\n';
    doc += '      DISPLAY "Invalid option selected"\n';
    doc += '  END SELECT\n';
    doc += 'END FUNCTION\n';
    doc += '```\n\n';
  } else {
    doc += 'No screen actions detected.\n\n';
  }

  // Section 7 - Validations and Messages
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 7 - VALIDATIONS AND MESSAGES\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.validations.length > 0) {
    doc += 'Explanation: The program performs various validations to ensure data integrity.\n';
    doc += 'Each validation failure triggers an appropriate error message to the user.\n\n';

    data.validations.forEach(val => {
      doc += `Validation Type: ${val.type}\n`;
      doc += `Description: ${val.description}\n`;
      doc += `Message ID: ${val.messageId}\n`;
      if (val.messageText) {
        doc += `Message Text: ${val.messageText}\n`;
      }
      doc += '\n';
    });

    doc += 'Validation Logic Pseudocode:\n';
    doc += '```\n';
    doc += 'FUNCTION perform_validations()\n';
    data.validations.forEach((val, index) => {
      if (index < 5) { // Show first 5 validations
        if (val.type === 'Empty Field Check') {
          doc += '  IF input_field IS EMPTY THEN\n';
          if (val.messageId && val.messageId !== 'N/A') {
            doc += `    DISPLAY "${val.messageId}: ${val.messageText || 'Field is required'}"\n`;
          } else {
            doc += '    DISPLAY "Field is required"\n';
          }
          doc += '    RETURN validation_failed\n';
          doc += '  END IF\n\n';
        } else if (val.type === 'Numeric Range Validation') {
          doc += '  IF numeric_field < minimum OR numeric_field > maximum THEN\n';
          if (val.messageId && val.messageId !== 'N/A') {
            doc += `    DISPLAY "${val.messageId}: ${val.messageText || 'Value out of range'}"\n`;
          } else {
            doc += '    DISPLAY "Value out of range"\n';
          }
          doc += '    RETURN validation_failed\n';
          doc += '  END IF\n\n';
        } else if (val.type === 'Record Existence Check') {
          doc += '  READ database_record WHERE key = search_key\n';
          doc += '  IF record_not_found THEN\n';
          if (val.messageId && val.messageId !== 'N/A') {
            doc += `    DISPLAY "${val.messageId}: ${val.messageText || 'Record not found'}"\n`;
          } else {
            doc += '    DISPLAY "Record not found"\n';
          }
          doc += '    RETURN validation_failed\n';
          doc += '  END IF\n\n';
        } else if (val.type === 'Message File Reference') {
          doc += `  // Refer to message file: ${val.description}\n\n`;
        }
      }
    });
    if (data.validations.length > 5) {
      doc += `  // ... ${data.validations.length - 5} more validations\n\n`;
    }
    doc += '  RETURN validation_passed\n';
    doc += 'END FUNCTION\n';
    doc += '```\n\n';
  } else {
    doc += 'No validations detected.\n\n';
  }

  // Section 8 - Data Mappings
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 8 - DATA MAPPINGS\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.dataMappings.length > 0) {
    doc += 'Explanation: Data is transferred between files and fields using the following mappings.\n';
    doc += 'Transformations may include calculations, formatting, or conditional logic.\n\n';

    doc += '┌──────────────────┬──────────────────┬──────────────────┬───────────────────┐\n';
    doc += '│ Source Field     │ Target Field     │ Target File      │ Transform Notes   │\n';
    doc += '├──────────────────┼──────────────────┼──────────────────┼───────────────────┤\n';

    data.dataMappings.forEach(mapping => {
      doc += `│ ${padRight(mapping.sourceField, 16)} │ ${padRight(mapping.targetField, 16)} │ ${padRight(mapping.targetFileName, 16)} │ ${padRight(mapping.transformNotes, 17)} │\n`;
    });

    doc += '└──────────────────┴──────────────────┴──────────────────┴───────────────────┘\n\n';

    doc += 'Data Mapping Pseudocode:\n';
    doc += '```\n';
    doc += 'FUNCTION map_data()\n';
    data.dataMappings.forEach((mapping, index) => {
      if (index < 5) { // Show first 5 mappings
        if (mapping.transformNotes.includes('Direct assignment')) {
          doc += `  ${mapping.targetField} = ${mapping.sourceField}  // ${mapping.transformNotes}\n`;
        } else if (mapping.transformNotes.includes('Expression')) {
          doc += `  ${mapping.targetField} = ${mapping.transformNotes.replace('Expression: ', '')}  // Calculated\n`;
        } else if (mapping.transformNotes.includes('Option')) {
          doc += `  IF user_option = '${mapping.transformNotes}' THEN\n`;
          doc += `    ${mapping.targetField} = action_code\n`;
          doc += `  END IF\n`;
        } else {
          doc += `  ${mapping.targetField} = TRANSFORM(${mapping.sourceField})  // ${mapping.transformNotes}\n`;
        }
      }
    });
    if (data.dataMappings.length > 5) {
      doc += `  // ... ${data.dataMappings.length - 5} more data mappings\n`;
    }
    doc += 'END FUNCTION\n';
    doc += '```\n\n';
  } else {
    doc += 'No data mappings detected.\n\n';
  }

  // Section 9 - Message Section
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 9 - MESSAGES USED IN PROGRAM\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.messages.length > 0) {
    data.messages.forEach(msg => {
      doc += `Message ID: ${msg.id}\n`;
      doc += `Message Text: ${msg.text}\n\n`;
    });
  } else {
    doc += 'No messages detected in program.\n\n';
  }

  // Section 10 - Detailed Processing
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 10 - DETAILED PROCESSING\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  data.detailedProcessing.forEach(step => {
    doc += `Step ${step.stepNumber}: ${step.processName}\n`;
    doc += `${'-'.repeat(70)}\n`;
    doc += `Description: ${step.description}\n`;
    if (step.parameters && step.parameters.length > 0) {
      doc += `Parameters: ${step.parameters.join(', ')}\n`;
    }
    doc += '\nPseudocode:\n';
    doc += '```\n';
    doc += step.pseudocode;
    doc += '\n```\n\n';
  });

  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'END OF DOCUMENTATION\n';
  doc += 'Generated by Seaboard Marine RPG Documentation Generator\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n';

  return doc;
}

function padRight(str, length) {
  str = String(str);
  if (str.length > length) {
    return str.substring(0, length - 2) + '..';
  }
  while (str.length < length) {
    str += ' ';
  }
  return str;
}
