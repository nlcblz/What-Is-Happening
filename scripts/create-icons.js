/**
 * 生成 TabBar 图标的脚本 - 带有真实图形
 * 使用 Node.js 内置模块创建 81x81 像素的 PNG 图标
 * 绘制真实的图形: 火焰、指南针、齿轮
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

// 创建像素缓冲区 (RGBA, 4 bytes per pixel)
function createPixelBuffer(width, height) {
  return Buffer.alloc(width * height * 4);
}

// 设置像素颜色
function setPixel(buffer, width, x, y, r, g, b, a = 255) {
  const idx = (y * width + x) * 4;
  buffer[idx] = r;
  buffer[idx + 1] = g;
  buffer[idx + 2] = b;
  buffer[idx + 3] = a;
}

// 获取像素颜色
function getPixel(buffer, width, x, y) {
  const idx = (y * width + x) * 4;
  return {
    r: buffer[idx],
    g: buffer[idx + 1],
    b: buffer[idx + 2],
    a: buffer[idx + 3]
  };
}

// 绘制圆形 (使用Bresenham圆算法)
function drawCircle(buffer, width, height, cx, cy, radius, r, g, b, a = 255) {
  let x = 0;
  let y = radius;
  let d = 3 - 2 * radius;

  while (x <= y) {
    // 8个方向的点
    const points = [
      [cx + x, cy + y],
      [cx - x, cy + y],
      [cx + x, cy - y],
      [cx - x, cy - y],
      [cx + y, cy + x],
      [cx - y, cy + x],
      [cx + y, cy - x],
      [cx - y, cy - x]
    ];

    for (const [px, py] of points) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        setPixel(buffer, width, px, py, r, g, b, a);
      }
    }

    if (d < 0) {
      d = d + 4 * x + 6;
    } else {
      d = d + 4 * (x - y) + 10;
      y--;
    }
    x++;
  }
}

// 填充圆形 (flood fill)
function fillCircle(buffer, width, height, cx, cy, radius, r, g, b, a = 255) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(buffer, width, x, y, r, g, b, a);
      }
    }
  }
}

// 填充三角形
function fillTriangle(buffer, width, height, x1, y1, x2, y2, x3, y3, r, g, b, a = 255) {
  const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y1, y2, y3)));

  for (let y = minY; y <= maxY; y++) {
    const intersections = [];

    // 检查与三条边的交点
    const edges = [[x1, y1, x2, y2], [x2, y2, x3, y3], [x3, y3, x1, y1]];

    for (const [ex1, ey1, ex2, ey2] of edges) {
      if ((ey1 <= y && y < ey2) || (ey2 <= y && y < ey1)) {
        const t = (y - ey1) / (ey2 - ey1);
        const x = ex1 + t * (ex2 - ex1);
        intersections.push(x);
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length - 1; i += 2) {
      const xStart = Math.max(0, Math.floor(intersections[i]));
      const xEnd = Math.min(width - 1, Math.ceil(intersections[i + 1]));

      for (let x = xStart; x <= xEnd; x++) {
        setPixel(buffer, width, x, y, r, g, b, a);
      }
    }
  }
}

// 绘制齿轮（齿轮轮廓）
function drawGear(buffer, width, height, cx, cy, outerRadius, color) {
  const { r, g, b, a } = color;
  const innerRadius = outerRadius * 0.5;
  const teeth = 8;

  // 绘制外圆
  drawCircle(buffer, width, height, cx, cy, outerRadius, r, g, b, a);

  // 绘制齿
  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const nextAngle = ((i + 1) / teeth) * Math.PI * 2;

    const x1 = cx + Math.cos(angle) * outerRadius;
    const y1 = cy + Math.sin(angle) * outerRadius;
    const x2 = cx + Math.cos(nextAngle) * outerRadius;
    const y2 = cy + Math.sin(nextAngle) * outerRadius;
    const x3 = cx + Math.cos((angle + nextAngle) / 2) * (outerRadius * 1.3);
    const y3 = cy + Math.sin((angle + nextAngle) / 2) * (outerRadius * 1.3);

    fillTriangle(buffer, width, height, x1, y1, x2, y2, x3, y3, r, g, b, a);
  }

  // 绘制内圆（挖空）
  fillCircle(buffer, width, height, cx, cy, innerRadius, 0, 0, 0, 0);
}

// 绘制指南针
function drawCompass(buffer, width, height, cx, cy, radius, color) {
  const { r, g, b, a } = color;

  // 外圆
  drawCircle(buffer, width, height, cx, cy, radius, r, g, b, a);

  // 四个方向的点
  const directions = [
    { angle: 0, label: 'N' },      // 北
    { angle: Math.PI / 2, label: 'E' }, // 东
    { angle: Math.PI, label: 'S' },     // 南
    { angle: 1.5 * Math.PI, label: 'W' } // 西
  ];

  for (const dir of directions) {
    const x = cx + Math.cos(dir.angle) * (radius * 0.8);
    const y = cy + Math.sin(dir.angle) * (radius * 0.8);
    
    // 绘制指针
    const x2 = cx + Math.cos(dir.angle) * (radius * 1.1);
    const y2 = cy + Math.sin(dir.angle) * (radius * 1.1);
    
    fillTriangle(buffer, width, height, x, y, x2, y2, cx, cy, r, g, b, a);
  }
}

// 绘制火焰
function drawFlame(buffer, width, height, cx, cy, size, color) {
  const { r, g, b, a } = color;

  // 火焰是个梨形，由多个圆组成
  // 主体
  fillCircle(buffer, width, height, cx, cy + 5, size * 0.6, r, g, b, a);
  fillCircle(buffer, width, height, cx - size * 0.4, cy - size * 0.3, size * 0.4, r, g, b, a);
  fillCircle(buffer, width, height, cx + size * 0.4, cy - size * 0.3, size * 0.4, r, g, b, a);
  fillCircle(buffer, width, height, cx, cy - size * 0.8, size * 0.35, r, g, b, a);
}

// 将像素缓冲区转换为 PNG
function pixelsToRGBA8Png(pixelBuffer, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 6;   // color type: RGBA
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // 转换为行数据格式（每行前面加滤波器字节）
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // 滤波器：None

    for (let x = 0; x < width; x++) {
      const pixelIdx = (y * width + x) * 4;
      const dataIdx = rowOffset + 1 + x * 4;

      rawData[dataIdx] = pixelBuffer[pixelIdx];         // R
      rawData[dataIdx + 1] = pixelBuffer[pixelIdx + 1]; // G
      rawData[dataIdx + 2] = pixelBuffer[pixelIdx + 2]; // B
      rawData[dataIdx + 3] = pixelBuffer[pixelIdx + 3]; // A
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 颜色定义
const NORMAL_COLOR = { r: 0x99, g: 0x99, b: 0x99, a: 255 };  // #999999
const ACTIVE_COLOR = { r: 0xe9, g: 0x45, b: 0x60, a: 255 };   // #e94560

// 生成图标
function generateIcon(name, color, drawFunc) {
  const buffer = createPixelBuffer(ICON_SIZE, ICON_SIZE);
  
  // 背景透明
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0;
  }

  // 绘制图形
  drawFunc(buffer, ICON_SIZE, ICON_SIZE, color);

  // 转换为 PNG
  const png = pixelsToRGBA8Png(buffer, ICON_SIZE, ICON_SIZE);
  const filePath = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(filePath, png);
  console.log(`Created: ${name} (${png.length} bytes)`);
}

// 生成所有图标
const cx = ICON_SIZE / 2;
const cy = ICON_SIZE / 2;

generateIcon('tab-hot.png', NORMAL_COLOR, (buf, w, h, color) => {
  drawFlame(buf, w, h, cx, cy - 2, 18, color);
});

generateIcon('tab-hot-active.png', ACTIVE_COLOR, (buf, w, h, color) => {
  drawFlame(buf, w, h, cx, cy - 2, 18, color);
});

generateIcon('tab-discover.png', NORMAL_COLOR, (buf, w, h, color) => {
  drawCompass(buf, w, h, cx, cy, 20, color);
});

generateIcon('tab-discover-active.png', ACTIVE_COLOR, (buf, w, h, color) => {
  drawCompass(buf, w, h, cx, cy, 20, color);
});

generateIcon('tab-settings.png', NORMAL_COLOR, (buf, w, h, color) => {
  drawGear(buf, w, h, cx, cy, 18, color);
});

generateIcon('tab-settings-active.png', ACTIVE_COLOR, (buf, w, h, color) => {
  drawGear(buf, w, h, cx, cy, 18, color);
});

console.log('\nAll icons generated successfully.');
