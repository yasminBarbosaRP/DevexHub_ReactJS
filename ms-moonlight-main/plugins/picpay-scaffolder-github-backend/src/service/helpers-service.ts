import { Writable } from 'stream';
import { spawn } from 'child_process';

/*
Que deus perdoe essa gambiarra mas a p** do backstage quando um resultado de um filtro do
handlebarsjs é um booleano e você tenta passar ele como imput de uma action ele vira uma string 'false' e 'true',
já tentei de tudo quanto é forma.

Se alguém tiver uma solução pode ficar a vontade pra tirar essa b***
 */
export function stringToBoolean(val: string | boolean): boolean {
  return typeof val === 'string' ? val === 'true' : val;
}

export async function runCommandInCwd(
  command: string,
  args: string[],
  cwd: string,
  logStream: Writable,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const process = spawn(command, args, { cwd });
    process.stdout.on('data', stream => {
      logStream.write(stream);
    });
    process.stderr.on('data', stream => {
      logStream.write(stream);
    });
    process.on('error', error => {
      return reject(error);
    });

    process.on('close', code => {
      if (code !== 0) {
        return reject(`Command failed, exit code: ${code}`);
      }
      return resolve();
    });
  });
}
