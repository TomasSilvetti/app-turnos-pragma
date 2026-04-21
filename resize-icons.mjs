import sharp from "sharp";

await sharp("public/icon-192.png").resize(192, 192).toFile("public/icon-192-out.png");
await sharp("public/icon-512.png").resize(512, 512).toFile("public/icon-512-out.png");

console.log("Listo. Revisá icon-192-out.png e icon-512-out.png y renombralos.");
