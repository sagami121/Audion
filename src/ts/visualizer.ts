import { CompSettings } from '../types';

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let makeupGain: GainNode | null = null;
let dataArray: Uint8Array | null = null;
let bufferLength: number | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animationId: number | null = null;
let isVisualizing = false;

let reverb: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let delay: DelayNode | null = null;
let delayGain: GainNode | null = null;
let delayFeedback: GainNode | null = null;

let primaryColor = '#a78bfa';
let secondaryColor = '#38bdf8';

let filters: BiquadFilterNode[] = [];
const FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export function initVisualizer(audioElement: HTMLAudioElement): void {
  canvas = document.getElementById('visualizerCanvas') as HTMLCanvasElement | null;
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
      if (!audioCtx) return;
      analyser = audioCtx.createAnalyser();

      source = audioCtx.createMediaElementSource(audioElement);
      
      // Create EQ filters
      filters = FREQUENCIES.map(freq => {
        const filter = audioCtx!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        return filter;
      });

      // Compressor
      compressor = audioCtx.createDynamicsCompressor();
      makeupGain = audioCtx.createGain();

      // Reverb
      reverb = audioCtx.createConvolver();
      reverb.buffer = generateImpulse(2.0, 2.0);
      reverbGain = audioCtx.createGain();
      
      // Delay
      delay = audioCtx.createDelay(2.0);
      delayGain = audioCtx.createGain();
      delayFeedback = audioCtx.createGain();
      delay.connect(delayFeedback);
      delayFeedback.connect(delay); // Feedback loop

      // Connect: Source -> FilterChain -> Compressor -> MakeupGain -> Reverb/Delay -> Analyser -> Destination
      let lastNode: AudioNode = source;
      filters.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });
      lastNode.connect(compressor);
      compressor.connect(makeupGain);

      // Parallel/Serial Effects Routing
      makeupGain.connect(analyser); // Dry signal to analyser
      
      makeupGain.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(analyser);

      makeupGain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(analyser);

      analyser.connect(audioCtx.destination);

      analyser.fftSize = 128;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }
  } catch (e) {
    console.error("Visualizer initialization failed:", e);
  }
}

export function updateEqGains(gains: number[], enabled: boolean): void {
  if (!filters.length || !audioCtx) return;
  filters.forEach((filter, i) => {
    filter.gain.setTargetAtTime(enabled ? gains[i] : 0, audioCtx!.currentTime, 0.05);
  });
}

export function updateCompSettings(settings: CompSettings, enabled: boolean): void {
  if (!compressor || !makeupGain || !audioCtx) return;

  const { threshold, knee, ratio, attack, release, makeup } = settings;
  const time = audioCtx.currentTime;

  if (enabled) {
    compressor.threshold.setTargetAtTime(threshold, time, 0.05);
    compressor.knee.setTargetAtTime(knee, time, 0.05);
    compressor.ratio.setTargetAtTime(ratio, time, 0.05);
    compressor.attack.setTargetAtTime(attack, time, 0.05);
    compressor.release.setTargetAtTime(release, time, 0.05);
    makeupGain.gain.setTargetAtTime(Math.pow(10, makeup / 20), time, 0.05);
  } else {
    compressor.ratio.setTargetAtTime(1, time, 0.05);
    makeupGain.gain.setTargetAtTime(1, time, 0.05);
  }
}

let currentReverbType: string = '';

export function updateEffectsSettings(
  reverbSettings: { enabled: boolean; level: number; type: 'room' | 'hall' | 'cave' },
  delaySettings: { enabled: boolean; level: number; time: number; feedback: number }
): void {
  if (!audioCtx || !reverb || !reverbGain || !delay || !delayGain || !delayFeedback) return;

  const time = audioCtx.currentTime;

  // Reverb Parameters
  if (reverbSettings.type !== currentReverbType) {
    const dur = reverbSettings.type === 'room' ? 0.8 : reverbSettings.type === 'hall' ? 2.5 : 5.0;
    const decay = reverbSettings.type === 'room' ? 2.0 : reverbSettings.type === 'hall' ? 1.5 : 1.0;
    reverb.buffer = generateImpulse(dur, decay);
    currentReverbType = reverbSettings.type;
  }
  
  if (reverbSettings.enabled) {
    reverbGain.gain.setTargetAtTime(reverbSettings.level, time, 0.05);
  } else {
    reverbGain.gain.setTargetAtTime(0, time, 0.05);
  }

  // Delay Parameters - update regardless of enabled state so there's no catch-up pitch sweep
  const safeFeedback = Math.min(Math.max(delaySettings.feedback, 0), 0.95);
  delay.delayTime.setTargetAtTime(delaySettings.time, time, 0.05);
  delayFeedback.gain.setTargetAtTime(safeFeedback, time, 0.05);

  if (delaySettings.enabled) {
    delayGain.gain.setTargetAtTime(delaySettings.level, time, 0.05);
  } else {
    delayGain.gain.setTargetAtTime(0, time, 0.05);
  }
}

function generateImpulse(duration: number, decay: number): AudioBuffer {
  if (!audioCtx) return new AudioBuffer({ length: 1, sampleRate: 44100 });
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioCtx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
        // White noise multiplied by exponential decay
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function resizeCanvas(): void {
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  canvas.width = parent.clientWidth * 1.5;
  canvas.height = parent.clientHeight * 1.5;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

export function startVisualizer(): void {
  if (!audioCtx || !canvas || isVisualizing) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  isVisualizing = true;
  draw();
}

export function stopVisualizer(): void {
  isVisualizing = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function setVisualizerColors(primary: string, secondary: string): void {
  primaryColor = primary;
  secondaryColor = secondary;
}

function draw(): void {
  if (!isVisualizing) return;

  animationId = requestAnimationFrame(draw);

  if (!analyser || !ctx || !canvas || !dataArray || !bufferLength) return;

  analyser.getByteFrequencyData(dataArray as any);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) * 0.55;

  const bars = bufferLength;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);

  ctx.lineCap = 'round';

  const activeBars = Math.floor(bars * 0.8);
  const adjustedAngleStep = (Math.PI * 2) / activeBars;

  for (let i = 0; i < activeBars; i++) {
    const value = dataArray[i];
    const amplitude = (value / 255.0) * (radius * 0.6);

    const angle = i * adjustedAngleStep - Math.PI / 2;

    const startX = centerX + Math.cos(angle) * radius;
    const startY = centerY + Math.sin(angle) * radius;
    const endX = centerX + Math.cos(angle) * (radius + amplitude);
    const endY = centerY + Math.sin(angle) * (radius + amplitude);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 4;
    ctx.strokeStyle = primaryColor.startsWith('rgb') ? primaryColor : gradient;
    ctx.stroke();
  }
}
