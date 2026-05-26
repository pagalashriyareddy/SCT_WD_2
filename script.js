// --- DOM Elements ---
const display = document.getElementById('display');
const deltaDisplay = document.getElementById('deltaDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const lapsList = document.getElementById('lapsList');
const avgLapTimeEl = document.getElementById('avgLapTime');
const exportBtn = document.getElementById('exportBtn');
const progressCircle = document.querySelector('.progress-ring__circle');
const micStatus = document.getElementById('micStatus');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// --- Global Variables ---
let startTime = 0;
let elapsedTime = 0;
let timerInterval;
let isRunning = false;
let laps = [];
let lastLapTime = 0;
let averageLapMs = 0;

// --- SVG Ring Setup ---
const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = circumference;

// --- Chart.js Setup ---
const chartCtx = document.getElementById('lapChart').getContext('2d');
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = 'Outfit';
const lapChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Lap Time (s)',
            data: [],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#8b5cf6',
            pointRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: { legend: { display: false } }
    }
});

// --- Formatting ---
function formatTime(time) {
    const date = new Date(time);
    const h = Math.floor(time / 3600000).toString().padStart(2, '0');
    const m = date.getUTCMinutes().toString().padStart(2, '0');
    const s = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    return h === '00' ? `${m}:${s}.${ms}` : `${h}:${m}:${s}.${ms}`;
}

function formatDelta(ms) {
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const s = (absMs / 1000).toFixed(2);
    return isNegative ? `-${s}s` : `+${s}s`;
}

// --- Core Logic ---
function updateDisplay(time = elapsedTime) {
    display.textContent = formatTime(time);
    
    // Update Ring
    const progress = (time % 60000) / 60000;
    progressCircle.style.strokeDashoffset = circumference - (progress * circumference);
    
    // Update Delta Live
    if (isRunning && laps.length > 0 && averageLapMs > 0) {
        const currentLapCurrentTime = time - lastLapTime;
        const expectedTime = averageLapMs;
        const delta = currentLapCurrentTime - expectedTime;
        deltaDisplay.textContent = `Live Delta: ${formatDelta(delta)}`;
        
        if (delta > 0) {
            deltaDisplay.className = 'delta-display delta-bad';
        } else {
            deltaDisplay.className = 'delta-display delta-good';
        }
    } else {
        deltaDisplay.textContent = 'Delta: --';
        deltaDisplay.className = 'delta-display';
    }
}

function startTimer() {
    if (!isRunning) {
        startTime = Date.now() - elapsedTime;
        isRunning = true;
        timerInterval = requestAnimationFrame(updateTime);
        
        startBtn.textContent = 'Resume';
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        lapBtn.disabled = false;
        particles.speedMultiplier = 2.5; // Speed up background
    }
}

function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        cancelAnimationFrame(timerInterval);
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        lapBtn.disabled = true;
        particles.speedMultiplier = 0.2; // Slow down background
    }
}

function updateTime() {
    if (isRunning) {
        elapsedTime = Date.now() - startTime;
        updateDisplay(elapsedTime);
        timerInterval = requestAnimationFrame(updateTime);
    }
}

function recordLap() {
    if (isRunning) {
        const currentLapTime = elapsedTime - lastLapTime;
        laps.unshift({ total: elapsedTime, lap: currentLapTime });
        lastLapTime = elapsedTime;
        
        updateAnalytics();
        renderLaps();
        updateChart();
    }
}

function resetTimer() {
    isRunning = false;
    cancelAnimationFrame(timerInterval);
    elapsedTime = 0;
    startTime = 0;
    lastLapTime = 0;
    laps = [];
    averageLapMs = 0;
    
    updateDisplay();
    renderLaps();
    updateChart();
    
    startBtn.textContent = 'Start';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    lapBtn.disabled = true;
    progressCircle.style.strokeDashoffset = circumference;
    particles.speedMultiplier = 0.5;
    avgLapTimeEl.textContent = '--:--:--.--';
}

function updateAnalytics() {
    if (laps.length === 0) return { fastestIdx: 0, slowestIdx: 0 };
    let total = 0, fIdx = 0, sIdx = 0;
    
    laps.forEach((l, i) => {
        total += l.lap;
        if (l.lap < laps[fIdx].lap) fIdx = i;
        if (l.lap > laps[sIdx].lap) sIdx = i;
    });
    
    averageLapMs = total / laps.length;
    avgLapTimeEl.textContent = formatTime(averageLapMs);
    return { fIdx, sIdx };
}

function renderLaps() {
    lapsList.innerHTML = '';
    if (laps.length === 0) return;
    
    const stats = updateAnalytics();
    
    laps.forEach((lap, idx) => {
        const li = document.createElement('li');
        li.className = 'lap-item';
        if (laps.length > 1) {
            if (idx === stats.fIdx) li.classList.add('lap-fastest');
            if (idx === stats.sIdx) li.classList.add('lap-slowest');
        }
        
        li.innerHTML = `
            <span>${String(laps.length - idx).padStart(2, '0')}</span>
            <span>${formatTime(lap.lap)}</span>
            <span>${formatTime(lap.total)}</span>
        `;
        lapsList.appendChild(li);
    });
}

function updateChart() {
    if (laps.length === 0) {
        lapChart.data.labels = [];
        lapChart.data.datasets[0].data = [];
    } else {
        // Plot chronological
        const chrono = [...laps].reverse();
        lapChart.data.labels = chrono.map((_, i) => `L${i+1}`);
        lapChart.data.datasets[0].data = chrono.map(l => (l.lap / 1000).toFixed(2));
    }
    lapChart.update();
}

// --- Voice Control (SpeechRecognition) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.trim().toLowerCase();
        
        if (command.includes('start')) startTimer();
        else if (command.includes('stop') || command.includes('pause')) pauseTimer();
        else if (command.includes('lap') || command.includes('record')) recordLap();
        else if (command.includes('reset')) resetTimer();
    };
    
    recognition.onerror = () => {
        micStatus.classList.add('error');
        micStatus.querySelector('span').textContent = 'Mic Error';
    };
    
    try {
        recognition.start();
    } catch(e) {
        console.warn("Speech recognition error:", e);
    }
} else {
    micStatus.classList.add('error');
    micStatus.querySelector('span').textContent = 'Voice Unsupported';
}

// --- Particle Engine ---
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

class ParticleEngine {
    constructor() {
        this.particles = [];
        this.speedMultiplier = 0.5;
        this.init();
    }
    init() {
        for(let i=0; i<80; i++) {
            this.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                baseColor: Math.random() > 0.5 ? '#06b6d4' : '#8b5cf6'
            });
        }
    }
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        this.particles.forEach(p => {
            p.x += p.vx * this.speedMultiplier;
            p.y += p.vy * this.speedMultiplier;
            
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            // Color shifts towards red if fast
            if(this.speedMultiplier > 1) {
                ctx.fillStyle = `rgba(239, 68, 68, ${Math.random()*0.5 + 0.1})`;
            } else {
                ctx.fillStyle = p.baseColor + '80'; // 50% opacity hex
            }
            ctx.fill();
        });
        requestAnimationFrame(() => this.draw());
    }
}
const particles = new ParticleEngine();
particles.draw();

// --- Event Listeners ---
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
lapBtn.addEventListener('click', recordLap);
resetBtn.addEventListener('click', resetTimer);
exportBtn.addEventListener('click', () => {
    if (laps.length === 0) return;
    let csv = "Lap Number,Lap Time,Total Time\n";
    [...laps].reverse().forEach((l, i) => {
        csv += `${i + 1},${formatTime(l.lap)},${formatTime(l.total)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nxt_gen_laps.csv';
    a.click();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); isRunning ? pauseTimer() : startTimer(); }
    else if (e.code === 'Enter') { e.preventDefault(); recordLap(); }
    else if (e.code === 'Escape') resetTimer();
});
document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});