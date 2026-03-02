import { spawn } from 'child_process';
import { createLogger } from '../logger.js';

const log = createLogger('claude-ai');

const CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude';
const DEFAULT_TIMEOUT = 300000; // 5 minutos (opus es más lento)

/**
 * Ejecuta un prompt con Claude Code CLI en modo headless (-p)
 * Usa la suscripción Max del usuario, sin coste de API
 * Pasa el prompt por stdin para evitar problemas con prompts largos
 */
export async function askClaude(prompt, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, maxTurns = 1 } = options;

  log.info(`Enviando prompt a Claude CLI (${prompt.length} chars, maxTurns=${maxTurns})`);

  return new Promise((resolve, reject) => {
    const args = [
      '-p', '-',
      '--output-format', 'text',
      '--max-turns', String(maxTurns),
      '--model', 'opus',
    ];

    // Quitar variables de Claude Code del entorno para evitar error de nested sessions
    const cleanEnv = { ...process.env };
    for (const key of Object.keys(cleanEnv)) {
      if (key.startsWith('CLAUDE_CODE_') || key === 'CLAUDECODE') {
        delete cleanEnv[key];
      }
    }

    let stdout = '';
    let stderr = '';

    const child = spawn(CLAUDE_PATH, args, {
      env: cleanEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    // Enviar prompt por stdin y cerrar
    child.stdin.write(prompt);
    child.stdin.end();

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      log.error('Claude CLI timeout');
      reject(new Error('Claude CLI timeout — la petición tardó demasiado'));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        const errMsg = stderr.trim() || `Exit code ${code}`;
        log.error(`Claude CLI error (code ${code}): ${errMsg.substring(0, 200)}`);
        return reject(new Error(`Claude CLI error: ${errMsg}`));
      }

      const result = stdout.trim();
      if (!result) {
        log.warn('Claude CLI devolvió respuesta vacía');
        return reject(new Error('Claude CLI devolvió respuesta vacía'));
      }

      log.info(`Respuesta recibida (${result.length} chars)`);
      resolve(result);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      log.error(`Claude CLI spawn error: ${err.message}`);
      reject(new Error(`Claude CLI error: ${err.message}`));
    });
  });
}

/**
 * Pide a Claude que devuelva JSON estructurado
 * Parsea automáticamente la respuesta
 */
export async function askClaudeJSON(prompt, options = {}) {
  const text = await askClaude(prompt + '\n\nResponde SOLO con JSON válido, sin texto adicional ni markdown.', options);

  // Intentar parsear directamente
  try {
    return JSON.parse(text);
  } catch {
    // Intentar extraer JSON de la respuesta
    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        log.error(`No se pudo parsear JSON de la respuesta: ${text.substring(0, 200)}`);
        throw new Error('La respuesta de Claude no contiene JSON válido');
      }
    }
    throw new Error('La respuesta de Claude no contiene JSON válido');
  }
}
