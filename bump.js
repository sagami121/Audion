import fs from 'fs';

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('\x1b[31mUsage: npm run bump <new-version>\x1b[0m');
  console.error('Example: npm run bump 0.1.2');
  process.exit(1);
}

//package.json
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated package.json');

//tauri.conf.json
const tauriConfPath = './src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('Updated src-tauri/tauri.conf.json');

//Cargo.toml
const cargoPath = './src-tauri/Cargo.toml';
let cargo = fs.readFileSync(cargoPath, 'utf8');
cargo = cargo.replace(/version = "(.*?)"/, `version = "${newVersion}"`);
fs.writeFileSync(cargoPath, cargo);
console.log('Updated src-tauri/Cargo.toml');

console.log(`\nSuccessfully bumped version to \x1b[32m${newVersion}\x1b[0m!`);
