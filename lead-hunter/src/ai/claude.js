import { execFile } from 'child_process';
import { createLogger } from '../logger.js';

const log = createLogger('claude-ai');

const CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude';
const DEFAULT_TIMEOUT = 120000; // 2 minutos

/**
 * Ejecuta un prompt con Claude Code CLI en modo headless (-p)
 * Usa la suscripción Max del usuario, sin coste de API
 *
 * @param {string} prompt - El prompt a enviar
 * @param {object} options - Opciones
 * @param {number} options.timeout - Timeout en ms (default 120s)
 * @param {number} options.maxTurns - Turnos máximos (default 1)
 * @returns {Promise<string>} Respuesta de Claude como texto
 */
export async function askClaude(prompt, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, maxTurns = 1 } = options;

  log.info(`Enviando prompt a Claude CLI (${prompt.length} chars, maxTurns=${maxTurns})`);

  return new Promise((resolve, reject) => {
    const args = [
      '-p', prompt,
      '--output-format', 'text',
      '--max-turns', String(maxTurns),
      '--no-session-persistence',
      '--model', 'opus',
    ];

    // Quitar variables de Claude Code del entorno para evitar error de nested sessions
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;
    // Eliminar cualquier otra variable CLAUDE_CODE_*
    for (const key of Object.keys(cleanEnv)) {
      if (key.startsWith('CLAUDE_CODE_') || key === 'CLAUDECODE') {
        delete cleanEnv[key];
      }
    }

    const child = execFile(CLAUDE_PATH, args, {
      timeout,
      maxBuffer: 1024 * 1024, // 1MB
      env: cleanEnv,
    }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          log.error('Claude CLI timeout');
          return reject(new Error('Claude CLI timeout — la petición tardó demasiado'));
        }
        log.error(`Claude CLI error: ${error.message}`);
        return reject(new Error(`Claude CLI error: ${error.message}`));
      }

      const result = stdout.trim();
      if (!result) {
        log.warn('Claude CLI devolvió respuesta vacía');
        return reject(new Error('Claude CLI devolvió respuesta vacía'));
      }

      log.info(`Respuesta recibida (${result.length} chars)`);
      resolve(result);
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
