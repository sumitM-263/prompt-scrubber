import { readFileSync } from 'node:fs';
import type { Command } from 'commander';
import { rehydrate } from '../../core/rehydrate.js';

export function handleRehydrate(text: string, options: { sessionId: string }) {
  const result = rehydrate({
    content: text,
    sessionId: options.sessionId,
  });
  return result;
}

export function setupRehydrateCommand(program: Command) {
  program
    .command('rehydrate')
    .description('Rehydrate a file using stored session')
    .argument('[file]', 'File to rehydrate. If omitted, reads from stdin.')
    .requiredOption('--session-id <id>', 'Resume or target a specific session')
    .option('--json', 'Output results as a structured JSON object')
    .action((file, options) => {
      let input = '';

      if (file) {
        try {
          input = readFileSync(file, 'utf8');
        } catch (err: unknown) {
          if (options.json) {
            console.error(JSON.stringify({ error: `Error reading file: ${(err as Error).message}` }));
          } else {
            console.error(`Error reading file: ${(err as Error).message}`);
          }
          process.exit(1);
          return;
        }
      } else {
        // Read from stdin
        try {
          input = readFileSync(0, 'utf-8');
        } catch {
         if (options.json) {
            console.error(JSON.stringify({ error: 'No input provided.' }));
          } else {
            console.error('No input provided.');
          }
          process.exit(1);
          return;
        }
      }

      if (!input) {
        if (options.json) {
          process.stdout.write(
            JSON.stringify(
              {
                content: '',
                sessionId: options.sessionId,
                warnings: [],
              },
              null,
              2,
            ) + '\n',
          );
        }
        process.exit(0);
        return;
      }

      try {
        const result = handleRehydrate(input, options);

        if (options.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + '\n');
          return;
        }

        // Print rehydrated content to stdout
        const outStr =
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content, null, 2);
        process.stdout.write(outStr);

        // Print any warnings to stderr
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            console.error(warning);
          }
        }
      } catch (err: unknown) {
        if (options.json) {
          console.error(JSON.stringify({ error: (err as Error).message }));
        } else {
          console.error(`Rehydration failed: ${(err as Error).message}`);
        }
        process.exit(1);
      }
    });
}
