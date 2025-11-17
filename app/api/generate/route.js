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

  // Extract program name
  const programName = extractProgramName(lines);

  // Extract file operations
  const fileOps = extractFileOperations(lines);

  // Extract messages
  const messages = extractMessages(lines, messageList);

  // Extract business rules
  const businessRules = extractBusinessRules(lines);

  // Extract dependencies
  const dependencies = extractDependencies(lines, fileOps);

  // Extract validations
  const validations = extractValidations(lines, messages);

  // Extract data mappings
  const dataMappings = extractDataMappings(lines);

  // Extract call stack
  const callStack = extractCallStack(lines);

  // Extract screen actions
  const screenActions = extractScreenActions(lines);

  // Generate detailed processing
  const detailedProcessing = generateDetailedProcessing(lines);

  return formatDocumentation({
    programName,
    messageList,
    fileOps,
    businessRules,
    callStack,
    dependencies,
    screenActions,
    validations,
    dataMappings,
    messages,
    detailedProcessing
  });
}

function extractProgramName(lines) {
  // Look for program name in various formats
  for (const line of lines) {
    const pgmMatch = line.match(/(?:PGM|PROGRAM)\s*:\s*(\w+)/i);
    if (pgmMatch) return pgmMatch[1];

    const hMatch = line.match(/^H\s+.*DFTNAME\((\w+)\)/i);
    if (hMatch) return hMatch[1];
  }
  return 'UNKNOWN_PROGRAM';
}

function extractFileOperations(lines) {
  const files = [];
  const fileMap = new Map();

  for (const line of lines) {
    // F-spec file declarations
    const fMatch = line.match(/^F(\w+)\s+(\w+)\s+(\w+)\s+(\w+)\s+(\w+)\s+DISK/i);
    if (fMatch) {
      const fileName = fMatch[1].trim();
      const fileType = fMatch[2].trim();
      const designation = fMatch[3].trim();

      let purpose = 'Input';
      if (fileType.includes('U') || designation.includes('U')) purpose = 'Update';
      else if (fileType.includes('O')) purpose = 'Output';
      else if (fileType.includes('I') && fileType.includes('O')) purpose = 'Input/Output';

      const accessType = line.includes('KEYED') ? 'Keyed' : 'Sequential';

      // Try to find key fields
      const keyFields = extractKeyFieldsForFile(lines, fileName);

      if (!fileMap.has(fileName)) {
        fileMap.set(fileName, {
          fileName,
          purpose,
          accessType,
          keyFields: keyFields.join(', ') || 'N/A'
        });
      }
    }
  }

  return Array.from(fileMap.values());
}

function extractKeyFieldsForFile(lines, fileName) {
  const keys = [];

  for (const line of lines) {
    // Look for KLIST definitions
    const klistMatch = line.match(/C\s+(\w+)\s+KLIST/i);
    if (klistMatch) {
      const klistName = klistMatch[1];
      // Look for KFLD entries following this KLIST
      const kfldPattern = new RegExp(`C\\s+KFLD\\s+(\\w+)`, 'gi');
      let match;
      while ((match = kfldPattern.exec(line)) !== null) {
        keys.push(match[1]);
      }
    }

    // Look for CHAIN/SETLL operations with keys
    const chainMatch = line.match(/C\s+(\w+)\s+CHAIN\s+(\w+)/i);
    if (chainMatch && chainMatch[2] === fileName) {
      keys.push(chainMatch[1]);
    }
  }

  return [...new Set(keys)];
}

function extractMessages(lines, messageList) {
  const messages = [];
  const msgMap = new Map();

  // Parse message list if provided
  if (messageList) {
    const msgLines = messageList.split('\n');
    for (const line of msgLines) {
      const match = line.match(/(\w+\d+)\s+\d+\s+(.+)/);
      if (match) {
        msgMap.set(match[1].trim(), match[2].trim());
      }
    }
  }

  // Find message IDs in RPG code
  for (const line of lines) {
    const msgMatch = line.match(/(?:MSGID|MESSAGE)\s*\(?\s*'?([A-Z]{3}\d{4})'?\)?/i);
    if (msgMatch) {
      const msgId = msgMatch[1];
      const msgText = msgMap.get(msgId) || 'Message text not found in message list';
      if (!messages.find(m => m.id === msgId)) {
        messages.push({ id: msgId, text: msgText });
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

    // Look for IF conditions
    if (line.match(/C\s+IF\s+/i)) {
      const condition = line.substring(line.indexOf('IF')).trim();
      rules.push({
        ruleName: `Business Rule ${ruleCounter++}`,
        ruleDescription: `Conditional check: ${condition}`
      });
    }

    // Look for DOW/DOU loops
    if (line.match(/C\s+DOW\s+|C\s+DOU\s+/i)) {
      const condition = line.substring(line.indexOf('DO')).trim();
      rules.push({
        ruleName: `Business Rule ${ruleCounter++}`,
        ruleDescription: `Loop condition: ${condition}`
      });
    }

    // Look for SELECT/WHEN
    if (line.match(/C\s+SELECT/i)) {
      rules.push({
        ruleName: `Business Rule ${ruleCounter++}`,
        ruleDescription: 'Selection structure for conditional processing'
      });
    }
  }

  return rules;
}

function extractDependencies(lines, fileOps) {
  const deps = new Set();

  // Add all files as dependencies
  fileOps.forEach(file => deps.add(`Database File: ${file.fileName}`));

  // Look for CALL operations
  for (const line of lines) {
    const callMatch = line.match(/C\s+CALL\s+'?(\w+)'?/i);
    if (callMatch) {
      deps.add(`Program: ${callMatch[1]}`);
    }

    // Look for display files
    const exfmtMatch = line.match(/C\s+EXFMT\s+(\w+)/i);
    if (exfmtMatch) {
      deps.add(`Display File: ${exfmtMatch[1]}`);
    }
  }

  return Array.from(deps);
}

function extractValidations(lines, messages) {
  const validations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for field validations
    if (line.match(/C\s+IF\s+.*=\s*['"]\s*['"]/i)) {
      validations.push({
        type: 'Empty Field Check',
        description: 'Validates that required field is not empty',
        messageId: messages.length > 0 ? messages[0].id : 'N/A'
      });
    }

    // Look for numeric validations
    if (line.match(/C\s+IF\s+.*>\s*\d+|C\s+IF\s+.*<\s*\d+/i)) {
      validations.push({
        type: 'Numeric Range Validation',
        description: 'Validates numeric field within acceptable range',
        messageId: messages.length > 0 ? messages[0].id : 'N/A'
      });
    }

    // Look for existence checks
    if (line.match(/C\s+CHAIN/i)) {
      validations.push({
        type: 'Record Existence Check',
        description: 'Validates if record exists in database',
        messageId: messages.length > 0 ? messages[0].id : 'N/A'
      });
    }
  }

  return validations;
}

function extractDataMappings(lines) {
  const mappings = [];

  for (const line of lines) {
    // Look for MOVE/MOVEL operations
    const moveMatch = line.match(/C\s+(?:MOVE|MOVEL|EVAL)\s+(\w+)\s+(\w+)/i);
    if (moveMatch) {
      mappings.push({
        sourceField: moveMatch[1],
        targetField: moveMatch[2],
        targetFileName: 'Determined by context',
        transformNotes: 'Direct assignment'
      });
    }

    // Look for EVAL with expressions
    const evalMatch = line.match(/C\s+EVAL\s+(\w+)\s*=\s*(.+)/i);
    if (evalMatch) {
      mappings.push({
        sourceField: 'Calculated',
        targetField: evalMatch[1],
        targetFileName: 'Determined by context',
        transformNotes: `Expression: ${evalMatch[2].trim()}`
      });
    }
  }

  return mappings;
}

function extractCallStack(lines) {
  const calls = [];
  let sequence = 1;

  for (const line of lines) {
    const callMatch = line.match(/C\s+CALL\s+'?(\w+)'?/i);
    if (callMatch) {
      calls.push({
        sequence: sequence++,
        programName: callMatch[1],
        description: 'Program call operation'
      });
    }

    const exfmtMatch = line.match(/C\s+EXFMT\s+(\w+)/i);
    if (exfmtMatch) {
      calls.push({
        sequence: sequence++,
        programName: exfmtMatch[1],
        description: 'Display file interaction'
      });
    }
  }

  return calls;
}

function extractScreenActions(lines) {
  const actions = [];

  for (const line of lines) {
    // Look for option handling
    if (line.match(/OPT|OPTION/i)) {
      const actionMatch = line.match(/(?:OPT|OPTION)\s*=\s*['"]?(\w+)['"]?/i);
      if (actionMatch) {
        actions.push({
          option: actionMatch[1],
          description: `Process option: ${actionMatch[1]}`,
          action: 'Determined by subsequent processing logic'
        });
      }
    }
  }

  return actions;
}

function generateDetailedProcessing(lines) {
  const steps = [];
  let stepCounter = 1;
  let currentSubroutine = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for subroutines
    const begSrMatch = line.match(/C\s+(\w+)\s+BEGSR/i);
    if (begSrMatch) {
      currentSubroutine = begSrMatch[1];
      const pseudocode = generateSubroutinePseudocode(lines, i);
      steps.push({
        stepNumber: stepCounter++,
        processName: currentSubroutine,
        description: `Subroutine: ${currentSubroutine}`,
        pseudocode
      });
    }

    // Look for main processing logic
    if (line.match(/C\s+READ\s+/i) && !currentSubroutine) {
      steps.push({
        stepNumber: stepCounter++,
        processName: 'Main Read Loop',
        description: 'Process records from file',
        pseudocode: `FUNCTION main_read_loop()\n  READ file_record\n  WHILE NOT end_of_file\n    PROCESS record\n    READ next_record\n  END WHILE\nEND FUNCTION`
      });
    }
  }

  // If no steps found, create a generic one
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      processName: 'Main Processing',
      description: 'Primary program logic',
      pseudocode: `FUNCTION main_processing()\n  INITIALIZE program\n  PROCESS business logic\n  PERFORM cleanup\n  RETURN\nEND FUNCTION`
    });
  }

  return steps;
}

function generateSubroutinePseudocode(lines, startIndex) {
  const pseudocodeLines = [];
  pseudocodeLines.push('FUNCTION subroutine()');

  let depth = 1;
  for (let i = startIndex + 1; i < lines.length && depth > 0; i++) {
    const line = lines[i];

    if (line.match(/C\s+ENDSR/i)) {
      depth--;
      if (depth === 0) break;
    }

    // Simplify the line for pseudocode
    if (line.match(/C\s+IF\s+/i)) {
      pseudocodeLines.push('  IF condition THEN');
    } else if (line.match(/C\s+ELSE/i)) {
      pseudocodeLines.push('  ELSE');
    } else if (line.match(/C\s+ENDIF/i)) {
      pseudocodeLines.push('  END IF');
    } else if (line.match(/C\s+DOW\s+/i)) {
      pseudocodeLines.push('  WHILE condition DO');
    } else if (line.match(/C\s+ENDDO/i)) {
      pseudocodeLines.push('  END WHILE');
    } else if (line.match(/C\s+EVAL\s+/i)) {
      pseudocodeLines.push('  ASSIGN value');
    } else if (line.match(/C\s+CHAIN/i)) {
      pseudocodeLines.push('  READ record by key');
    } else if (line.match(/C\s+UPDATE/i)) {
      pseudocodeLines.push('  UPDATE record');
    }

    if (pseudocodeLines.length > 15) break; // Keep it concise
  }

  pseudocodeLines.push('END FUNCTION');
  return pseudocodeLines.join('\n');
}

function formatDocumentation(data) {
  let doc = '';

  // Message List
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'MESSAGE LIST\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.messageList && data.messageList.trim()) {
    doc += data.messageList + '\n\n';
  } else {
    doc += 'No message list provided.\n\n';
  }

  // Section 1 - Program Overview
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 1 - PROGRAM OVERVIEW\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';
  doc += `Program Name: ${data.programName}\n`;
  doc += 'Program Type: Interactive/Batch Processing\n';
  doc += 'Purpose: Process business logic and maintain database records\n\n';
  doc += 'High-Level Logic:\n';
  doc += 'This RPG program processes business transactions by reading input data,\n';
  doc += 'performing validations, executing business rules, and updating database files.\n';
  doc += 'The program interacts with users through display files and maintains data integrity.\n\n';

  // Section 2 - File Operations
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 2 - FILE OPERATIONS\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.fileOps.length > 0) {
    doc += '┌──────────────┬──────────────┬─────────────┬────────────────────────┐\n';
    doc += '│ File Name    │ Purpose      │ Access Type │ Key Fields             │\n';
    doc += '├──────────────┼──────────────┼─────────────┼────────────────────────┤\n';

    data.fileOps.forEach(file => {
      doc += `│ ${padRight(file.fileName, 12)} │ ${padRight(file.purpose, 12)} │ ${padRight(file.accessType, 11)} │ ${padRight(file.keyFields, 22)} │\n`;
    });

    doc += '└──────────────┴──────────────┴─────────────┴────────────────────────┘\n\n';
  } else {
    doc += 'No file operations detected.\n\n';
  }

  // Section 3 - Business Rules
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 3 - BUSINESS RULES\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.businessRules.length > 0) {
    data.businessRules.forEach(rule => {
      doc += `• ${rule.ruleName}\n`;
      doc += `  ${rule.ruleDescription}\n\n`;
    });
  } else {
    doc += 'No explicit business rules detected.\n\n';
  }

  // Section 4 - Call Stack
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 4 - CALL STACK\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.callStack.length > 0) {
    data.callStack.forEach(call => {
      doc += `${call.sequence}. ${call.programName} - ${call.description}\n`;
    });
    doc += '\n';
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
    data.screenActions.forEach(action => {
      doc += `Option: ${action.option}\n`;
      doc += `Description: ${action.description}\n`;
      doc += `Action: ${action.action}\n\n`;
    });
  } else {
    doc += 'No screen actions detected.\n\n';
  }

  // Section 7 - Validations and Messages
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 7 - VALIDATIONS AND MESSAGES\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.validations.length > 0) {
    data.validations.forEach(val => {
      doc += `Validation Type: ${val.type}\n`;
      doc += `Description: ${val.description}\n`;
      doc += `Message ID: ${val.messageId}\n\n`;
    });
  } else {
    doc += 'No validations detected.\n\n';
  }

  // Section 8 - Data Mappings
  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'SECTION 8 - DATA MAPPINGS\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n\n';

  if (data.dataMappings.length > 0) {
    doc += '┌─────────────────┬─────────────────┬─────────────────┬──────────────────────┐\n';
    doc += '│ Source Field    │ Target Field    │ Target File     │ Transform Notes      │\n';
    doc += '├─────────────────┼─────────────────┼─────────────────┼──────────────────────┤\n';

    data.dataMappings.forEach(mapping => {
      doc += `│ ${padRight(mapping.sourceField, 15)} │ ${padRight(mapping.targetField, 15)} │ ${padRight(mapping.targetFileName, 15)} │ ${padRight(mapping.transformNotes, 20)} │\n`;
    });

    doc += '└─────────────────┴─────────────────┴─────────────────┴──────────────────────┘\n\n';
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
    doc += `${step.description}\n\n`;
    doc += 'Pseudocode:\n';
    doc += '```\n';
    doc += step.pseudocode;
    doc += '\n```\n\n';
  });

  doc += '═══════════════════════════════════════════════════════════════════════\n';
  doc += 'END OF DOCUMENTATION\n';
  doc += '═══════════════════════════════════════════════════════════════════════\n';

  return doc;
}

function padRight(str, length) {
  str = String(str);
  while (str.length < length) {
    str += ' ';
  }
  if (str.length > length) {
    str = str.substring(0, length - 3) + '...';
  }
  return str;
}
