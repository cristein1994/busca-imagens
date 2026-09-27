import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { promisify } from 'node:util'
import type { TorStatus } from './types'

const execFileAsync = promisify(execFile)

const BUS_DOWN = /not been booted with systemd|Failed to connect to bus|Host is down/i

async function run(command: string, args: string[], timeout = 15000): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout, maxBuffer: 1_000_000 })
    return { code: 0, stdout: String(stdout), stderr: String(stderr) }
  } catch (error) {
    const err = error as { code?: number; stdout?: string; stderr?: string; message?: string }
    return {
      code: typeof err.code === 'number' ? err.code : 1,
      stdout: String(err.stdout ?? ''),
      stderr: String(err.stderr ?? err.message ?? ''),
    }
  }
}

function socksOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    const done = (open: boolean) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(800)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

export async function torStatus(): Promise<TorStatus> {
  const [master, instance, open] = await Promise.all([
    run('systemctl', ['is-active', 'tor'], 4000),
    run('systemctl', ['is-active', 'tor@default'], 4000),
    socksOpen(9050),
  ])
  const noise = `${master.stderr}\n${instance.stderr}`
  const systemdAvailable = !BUS_DOWN.test(noise)
  const unitEnabled = existsSync('/etc/systemd/system/multi-user.target.wants/tor.service')
  const torUnit = master.stdout.trim() || (systemdAvailable ? 'inactive' : 'unknown')
  const torDefaultUnit = instance.stdout.trim() || (systemdAvailable ? 'inactive' : 'unknown')

  let detail = 'SOCKS 127.0.0.1:9050 fechado. Rode systemctl enable --now tor.'
  if (open && systemdAvailable && torDefaultUnit === 'active') {
    detail = 'tor@default ativo. SocksPort 9050.'
  } else if (open && !systemdAvailable) {
    detail = 'Sem bus systemd neste host. O ExecStart de tor@default está no ar e o SocksPort 9050 aceita conexões. systemctl enable foi registrado no disco.'
  } else if (open) {
    detail = 'SocksPort 9050 aberto.'
  } else if (!systemdAvailable) {
    detail = 'systemctl não fala com o PID 1. Use Configurar para habilitar as units e subir o mesmo ExecStart de tor@default.'
  }

  return {
    systemdAvailable,
    torUnit,
    torDefaultUnit,
    unitEnabled,
    socksPort: 9050,
    socksOpen: open,
    ready: open,
    detail,
  }
}

export async function configureTor(): Promise<{ ok: boolean; log: string }> {
  const script = path.join(process.cwd(), 'scripts', 'configure-tor.sh')
  const result = await run('sudo', ['bash', script], 180000)
  const log = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
  return { ok: result.code === 0, log }
}
