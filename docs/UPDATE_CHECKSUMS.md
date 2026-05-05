# Update Checksums

Audion requires a SHA-256 checksum before it will auto-install a downloaded update.

For each `.msi` or `.exe` release asset, upload one of these checksum assets to the same GitHub Release:

- `<installer filename>.sha256`
- `<installer filename>.sha256sum`
- `SHA256SUMS`
- `SHA256SUMS.txt`
- `checksums.txt`

Single-file checksum assets can contain either just the hash or the common `hash filename` format:

```text
0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef Audion_1.0.3_x64_ja-JP.msi
```

Aggregate checksum files must include the installer filename on the same line as the hash.
