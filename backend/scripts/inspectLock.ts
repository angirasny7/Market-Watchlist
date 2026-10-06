import { execSync } from 'child_process';

try {
  const ps = `Get-Process node | ForEach-Object { $proc = $_; foreach ($mod in $proc.Modules) { if ($mod.FileName -like '*query_engine*') { Write-Host \"Locked by PID $($proc.Id): $($mod.FileName)\" } } }`;
  const out = execSync(`powershell -Command "${ps}"`, { encoding: 'utf8' });
  console.log('Processes with query_engine locked:\n', out);
} catch (e: any) {
  console.error(e.message);
}
