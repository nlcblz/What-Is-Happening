/**
 * 生成 TabBar 图标的脚本
 * 使用 Node.js 内置模块创建 81x81 像素的纯色 PNG 图标
 * 无需任何外部依赖
 *
 * 颜色方案:
 *   normal (未选中): #999999
 *   active (选中):   #e94560
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICON_SIZE = 81;
const OUTPUT_DIR = path.join(__dirname, '..', 'images');

// PNG 使用 CRC32 校验
function crc32(buf) {
  // 预计算 CRC32 查找表
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// 创建 PNG chunk
function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBytes, data]);
  const crcValue = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcValue, 0);

  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

// 创建 81x81 纯色 PNG
function createPng(r, g, b) {
  // PNG 签名
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: 宽=81, 高=81, 位深=8, 颜色类型=2 (RGB), 压缩=0, 滤波=0, 隔行=0
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(ICON_SIZE, 0);  // width
  ihdrData.writeUInt32BE(ICON_SIZE, 4);  // height
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 2;   // color type: RGB
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk: 像素数据
  // 每行: 1 字节滤波器(0=None) + ICON_SIZE * 3 字节 RGB
  const rowSize = 1 + ICON_SIZE * 3;
  const rawData = Buffer.alloc(ICON_SIZE * rowSize);

  for (let y = 0; y < ICON_SIZE; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // 滤波器类型: None
    for (let x = 0; x < ICON_SIZE; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 颜色定义
const NORMAL_COLOR = { r: 0x99, g: 0x99, b: 0x99 };  // #999999
const ACTIVE_COLOR = { r: 0xe9, g: 0x45, b: 0x60 };   // #e94560

// 生成图标文件
const icons = [
  { name: 'tab-hot.png', color: NORMAL_COLOR },
  { name: 'tab-hot-active.png', color: ACTIVE_COLOR },
  { name: 'tab-discover.png', color: NORMAL_COLOR },
  { name: 'tab-discover-active.png', color: ACTIVE_COLOR },
  { name: 'tab-settings.png', color: NORMAL_COLOR },
  { name: 'tab-settings-active.png', color: ACTIVE_COLOR }
];

for (const icon of icons) {
  const png = createPng(icon.color.r, icon.color.g, icon.color.b);
  const filePath = path.join(OUTPUT_DIR, icon.name);
  fs.writeFileSync(filePath, png);
  console.log(`Created: ${icon.name} (${png.length} bytes)`);
}

console.log('\nAll icons generated successfully.');
