import { parentPort } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';

if (!parentPort) {
  throw new Error('This script must be run as a worker thread.');
}

parentPort.on(
  'message',
  async ({ files, root }: { files: string[]; root: string }) => {
    try {
      // Read files concurrently
      const results = await Promise.all(
        files.map(async (filePath) => {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { filePath, content, error: null };
          } catch (err: any) {
            return {
              filePath,
              content: null,
              error: err.message || 'Failed to read file',
            };
          }
        }),
      );

      let compiledText = '';
      results.forEach(({ filePath, content, error }) => {
        const relativePath = path.relative(root, filePath);
        if (content !== null) {
          compiledText += `"${relativePath}"\n\n\n`;
          compiledText += `${content}\n`;
          compiledText += '******** END OF FILE **********\n\n';
        } else {
          compiledText += `// Error reading file: ${relativePath}\n// ${error}\n\n`;
        }
      });
      parentPort!.postMessage({ compiledText });
    } catch (error: any) {
      parentPort!.postMessage({
        error: error.message || 'An unknown error occurred during compilation.',
      });
    }
  },
);
