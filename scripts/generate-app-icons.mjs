import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const sourcePath = process.argv[2]

if (!sourcePath) {
  throw new Error("Usage: node scripts/generate-app-icons.mjs <source-logo-image>")
}

const workspace = process.cwd()
const iconDirectory = path.join(workspace, "public", "icons")
const transparentLogoPath = path.join(workspace, "public", "orm-logo-transparent-v2.png")
const marineBlue = { r: 11, g: 47, b: 91, alpha: 1 }
const signatureGold = { r: 177, g: 143, b: 47 }

await fs.mkdir(iconDirectory, { recursive: true })

const source = await sharp(sourcePath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const rgba = Buffer.alloc(source.info.width * source.info.height * 4)

for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.data.length; sourceIndex += 3, targetIndex += 4) {
  const red = source.data[sourceIndex]
  const green = source.data[sourceIndex + 1]
  const blue = source.data[sourceIndex + 2]
  const distanceFromWhite = Math.sqrt(
    (255 - red) ** 2 +
    (255 - green) ** 2 +
    (255 - blue) ** 2,
  )
  const alpha = Math.max(0, Math.min(255, Math.round(((distanceFromWhite - 8) / 80) * 255)))

  rgba[targetIndex] = signatureGold.r
  rgba[targetIndex + 1] = signatureGold.g
  rgba[targetIndex + 2] = signatureGold.b
  rgba[targetIndex + 3] = alpha
}

await sharp(rgba, {
  raw: {
    width: source.info.width,
    height: source.info.height,
    channels: 4,
  },
})
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(transparentLogoPath)

async function createSquareIcon(size, outputPath) {
  const logo = await sharp(transparentLogoPath)
    .resize({
      width: Math.round(size * 0.82),
      height: Math.round(size * 0.82),
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: marineBlue,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath)
}

await createSquareIcon(192, path.join(iconDirectory, "icon-192.png"))
await createSquareIcon(512, path.join(iconDirectory, "icon-512.png"))
await createSquareIcon(512, path.join(workspace, "app", "icon.png"))
await createSquareIcon(180, path.join(workspace, "app", "apple-icon.png"))

const faviconPng = await sharp(path.join(iconDirectory, "icon-512.png"))
  .resize(64, 64)
  .png()
  .toBuffer()

const icoHeader = Buffer.alloc(22)
icoHeader.writeUInt16LE(0, 0)
icoHeader.writeUInt16LE(1, 2)
icoHeader.writeUInt16LE(1, 4)
icoHeader.writeUInt8(64, 6)
icoHeader.writeUInt8(64, 7)
icoHeader.writeUInt8(0, 8)
icoHeader.writeUInt8(0, 9)
icoHeader.writeUInt16LE(1, 10)
icoHeader.writeUInt16LE(32, 12)
icoHeader.writeUInt32LE(faviconPng.length, 14)
icoHeader.writeUInt32LE(22, 18)

await fs.writeFile(path.join(workspace, "app", "favicon.ico"), Buffer.concat([icoHeader, faviconPng]))

console.log(JSON.stringify({
  transparentLogoPath,
  icons: [
    path.join(iconDirectory, "icon-192.png"),
    path.join(iconDirectory, "icon-512.png"),
    path.join(workspace, "app", "icon.png"),
    path.join(workspace, "app", "apple-icon.png"),
    path.join(workspace, "app", "favicon.ico"),
  ],
}, null, 2))
