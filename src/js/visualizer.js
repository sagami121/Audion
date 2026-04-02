/**
 * Web Audio API Visualizer
 */

let audioCtx = null;
let analyser = null;
let source = null;
let dataArray = null;
let bufferLength = null;
let canvas = null;
let ctx = null;
let animationId = null;
let isVisualizing = false;

// Global theme color references
let primaryColor = 'var(--accent-color, #a78bfa)';
let secondaryColor = 'var(--glow-color, #38bdf8)';

export function initVisualizer(audioElement) {
  canvas = document.getElementById('visualizerCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Set canvas size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  try {
    // Only initialize AudioContext once
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      
      // Connect to audio element
      // Need crossorigin="anonymous" on <audio> which we added in index.html
      source = audioCtx.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      
      analyser.fftSize = 128; // gives 64 frequency bins
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }
  } catch (e) {
    console.error("Visualizer initialization failed:", e);
  }
}

function resizeCanvas() {
  if (!canvas) return;
  const parent = canvas.parentElement;
  // Increase resolution slightly for crisp lines
  canvas.width = parent.clientWidth * 1.5;
  canvas.height = parent.clientHeight * 1.5;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

export function startVisualizer() {
  if (!audioCtx || !canvas || isVisualizing) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  isVisualizing = true;
  draw();
}

export function stopVisualizer() {
  isVisualizing = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  if (ctx && canvas) {
    // Smoothly clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function setVisualizerColors(primary, secondary) {
  primaryColor = primary;
  secondaryColor = secondary;
}

function draw() {
  if (!isVisualizing) return;
  
  animationId = requestAnimationFrame(draw);
  
  if (!analyser || !ctx || !canvas) return;
  
  analyser.getByteFrequencyData(dataArray);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  // Radius of the circle where bars originate
  // Album art is ~280px, canvas is slightly bigger
  const radius = Math.min(centerX, centerY) * 0.55; 
  
  const bars = bufferLength;
  const angleStep = (Math.PI * 2) / bars;
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);
  
  ctx.lineCap = 'round';
  
  // Smooth out the top values and ignore the highest frequencies which are often empty
  const activeBars = Math.floor(bars * 0.8);
  const adjustedAngleStep = (Math.PI * 2) / activeBars;

  for (let i = 0; i < activeBars; i++) {
    // Get frequency value (0-255)
    const value = dataArray[i];
    
    // Scale amplitude (visual multiplier)
    const amplitude = (value / 255.0) * (radius * 0.6);
    
    // Start angle
    const angle = i * adjustedAngleStep - Math.PI / 2;
    
    // Calculate start position (on the circle)
    const startX = centerX + Math.cos(angle) * radius;
    const startY = centerY + Math.sin(angle) * radius;
    
    // Calculate end position (extending outward)
    const endX = centerX + Math.cos(angle) * (radius + amplitude);
    const endY = centerY + Math.sin(angle) * (radius + amplitude);
    
    // Draw bar
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 4;
    
    // If we're using CSS variables, canvas gradient might fail parsing them, 
    // so we handle it by setting strokeStyle directly if it's a CSS var
    if (primaryColor.startsWith('var(')) {
      // Fallback if computed style isn't ready
      ctx.strokeStyle = '#a78bfa';
    } else {
      ctx.strokeStyle = primaryColor; // or gradient
    }
    
    // Attempt gradient fill
    const canvasColor = primaryColor.startsWith('rgb') ? primaryColor : gradient;
    ctx.strokeStyle = canvasColor;
    
    ctx.stroke();
  }
}
