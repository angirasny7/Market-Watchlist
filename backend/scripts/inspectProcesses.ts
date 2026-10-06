import { execSync } from 'child_process';

try {
  const out = execSync('powershell -Command "Get-Process node | Select-Object Id, Path, StartTime | Format-Table -AutoSize"', { encoding: 'utf8' });
  console.log(out);
} catch (e: any) {
  console.error(e.message);
}
