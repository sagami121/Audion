import fs from 'fs';
import { execFileSync } from 'child_process';

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('\x1b[31mUsage: npm run bump <new-version>\x1b[0m');
  console.error('Example: npm run bump 0.1.2');
  process.exit(1);
}

function formatVersionFiles() {
  const prettierBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(prettierBin, ['prettier', '--write', 'package.json', 'src-tauri/tauri.conf.json'], {
    stdio: 'inherit'
  });
}

// package.json
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated package.json');

// package-lock.json
const lockPath = './package-lock.json';
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = newVersion;
  if (lock.packages?.['']) {
    lock.packages[''].version = newVersion;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  console.log('Updated package-lock.json');
}

// tauri.conf.json
const tauriConfPath = './src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('Updated src-tauri/tauri.conf.json');

// Cargo.toml
const cargoPath = './src-tauri/Cargo.toml';
let cargo = fs.readFileSync(cargoPath, 'utf8');
cargo = cargo.replace(/version = "(.*?)"/, `version = "${newVersion}"`);
fs.writeFileSync(cargoPath, cargo);
console.log('Updated src-tauri/Cargo.toml');

formatVersionFiles();

console.log(`\nSuccessfully bumped version to \x1b[32m${newVersion}\x1b[0m!`);
