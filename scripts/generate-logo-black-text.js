const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a canvas with exact dimensions
const width = 480;
const height = 116;
const canvas = createCanvas(width, height, 'png');
const ctx = canvas.getContext('2d', { alpha: true });

// Ensure transparent background
ctx.clearRect(0, 0, width, height);

// Draw the blue rounded square "B" icon
const iconSize = 100;
const iconRadius = 12;
const iconX = 10;
const iconY = (height - iconSize) / 2;

// Blue color from your theme
ctx.fillStyle = '#4169E1';
ctx.beginPath();
ctx.roundRect(iconX, iconY, iconSize, iconSize, iconRadius);
ctx.fill();

// Draw the "B" letter in white
ctx.fillStyle = '#FAFAFA';
ctx.font = 'bold 70px Arial, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('FI', iconX + iconSize / 2, iconY + iconSize / 2);

// Draw "BragDoc" text in BLACK - LARGE TEXT
const textX = iconX + iconSize + 20;
const textY = height / 2;
ctx.fillStyle = 'rgb(0, 0, 0)'; // Pure black
ctx.font = 'bold 85px Arial, sans-serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillText('FrameIt', textX, textY);

// Save the PNG
const outputPath = path.join(
  __dirname,
  '../apps/marketing/public/frameit-logo-black-text.png',
);
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`Logo generated: ${outputPath}`);
console.log(`Dimensions: ${width}x${height}`);
