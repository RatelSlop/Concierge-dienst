// Core Game Engine for School Surveillance Duty

class SchoolSurveillanceGame {
    constructor() {
        this.cameras = window.CAMERAS_CONFIG;
        this.categories = window.ANOMALY_CATEGORIES;
        this.audio = window.surveillanceAudio;
        this.teacherMgr = window.teacherManager;

        // Game Settings
        this.settings = {
            nightDurationSeconds: 360, // 6 minutes real time = 6 hours in-game
            difficulty: 'normal',       // easy (slow spawns), normal, hard (fast spawns)
            filterMode: 'cctv',         // cctv, nightvision, bw, raw
            maxAnomalies: 3             // Strict cap: max 3 anomalies simultaneously!
        };

        // Game State
        this.isRunning = false;
        this.isPaused = false;
        this.gameTimeSeconds = 0; // 0 to nightDurationSeconds
        this.currentCamIndex = 0;
        this.activeAnomalies = [];
        this.overloadTimer = null;
        this.overloadSecondsLeft = 15;

        // Camera Pan/Zoom State
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Reporting State
        this.selectedReportRoom = 'cam1';
        this.selectedReportCategory = 'teacher';
        this.isReporting = false;

        // Statistics
        this.stats = {
            reportsTotal: 0,
            reportsSuccess: 0,
            reportsFailed: 0,
            anomaliesSpawned: 0
        };

        // Timing loops
        this.clockInterval = null;
        this.spawnTimeout = null;
        this.flickerAudioInterval = null;

        // DOM elements
        this.dom = {};
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.initNoiseCanvas();
        this.renderCameraButtons();
        this.renderReportOptions();
        this.renderLeaderboard();
        this.applyFilterMode(this.settings.filterMode);
        this.preloadAllImages();
        this.showCamera(0);
    }

    cacheDOM() {
        this.dom = {
            viewport: document.getElementById('camera-viewport'),
            feedContainer: document.getElementById('camera-feed-container'),
            baseImg: document.getElementById('camera-base-img'),
            anomalyLayer: document.getElementById('anomaly-layer'),
            lightOverlay: document.getElementById('light-overlay'),
            noiseCanvas: document.getElementById('noise-canvas'),
            switchGlitch: document.getElementById('switch-glitch-layer'),
            
            // OSD elements
            camTitle: document.getElementById('osd-cam-title'),
            camCode: document.getElementById('osd-cam-code'),
            clockTime: document.getElementById('osd-clock-time'),
            threatBadge: document.getElementById('threat-badge'),
            fpsCounter: document.getElementById('osd-fps'),
            
            // Dock & Navigation
            camNavGroup: document.getElementById('cam-nav-group'),
            btnReportMain: document.getElementById('btn-report-main'),
            
            // Report Tablet
            reportTablet: document.getElementById('report-tablet-modal'),
            roomGrid: document.getElementById('report-room-grid'),
            catGrid: document.getElementById('report-category-grid'),
            btnSendReport: document.getElementById('btn-send-report'),
            btnCloseTablet: document.getElementById('btn-close-tablet'),
            reportProcessing: document.getElementById('report-processing-box'),
            scanProgressFill: document.getElementById('scan-progress-fill'),
            scanStatusText: document.getElementById('scan-status-text'),
            
            // Toast
            toast: document.getElementById('notification-toast'),
            
            // Modals & Screens
            titleScreen: document.getElementById('title-screen-modal'),
            btnStartGame: document.getElementById('btn-start-game'),
            gameOverScreen: document.getElementById('game-over-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            btnRestartGameOver: document.getElementById('btn-restart-gameover'),
            btnRestartVictory: document.getElementById('btn-restart-victory'),
            
            // Leaderboard & Settings Modals
            leaderboardModal: document.getElementById('leaderboard-modal'),
            btnOpenLeaderboard: document.getElementById('btn-open-leaderboard'),
            btnCloseLeaderboard: document.getElementById('btn-close-leaderboard'),
            btnClearLeaderboard: document.getElementById('btn-clear-leaderboard'),
            leaderboardTbody: document.getElementById('leaderboard-tbody'),
            
            // Score entry elements
            gameoverPlayerName: document.getElementById('gameover-player-name'),
            btnSaveGameoverScore: document.getElementById('btn-save-gameover-score'),
            gameoverSaveStatus: document.getElementById('gameover-save-status'),
            victoryPlayerName: document.getElementById('victory-player-name'),
            btnSaveVictoryScore: document.getElementById('btn-save-victory-score'),
            victorySaveStatus: document.getElementById('victory-save-status'),
            
            settingsModal: document.getElementById('settings-modal'),
            btnOpenSettings: document.getElementById('btn-open-settings'),
            btnCloseSettings: document.getElementById('btn-close-settings'),
            
            // Settings controls
            selDuration: document.getElementById('setting-duration'),
            selDifficulty: document.getElementById('setting-difficulty'),
            selFilter: document.getElementById('setting-filter'),
            volSlider: document.getElementById('setting-volume')
        };
    }

    bindEvents() {
        // Start Game
        this.dom.btnStartGame.addEventListener('click', () => this.startGame());
        this.dom.btnRestartGameOver.addEventListener('click', () => this.startGame());
        this.dom.btnRestartVictory.addEventListener('click', () => this.startGame());

        // Leaderboard Modals & Score Saving
        this.dom.btnOpenLeaderboard.addEventListener('click', () => {
            this.renderLeaderboard();
            this.openModal(this.dom.leaderboardModal);
        });
        this.dom.btnCloseLeaderboard.addEventListener('click', () => this.closeModal(this.dom.leaderboardModal));
        this.dom.btnClearLeaderboard.addEventListener('click', () => this.clearLeaderboard());

        this.dom.btnSaveGameoverScore.addEventListener('click', () => {
            const name = this.dom.gameoverPlayerName.value.trim() || 'Conciërge';
            this.saveRunScore(name, false);
            this.dom.btnSaveGameoverScore.disabled = true;
            this.dom.gameoverSaveStatus.textContent = '✅ Score succesvol opgeslagen op het bord!';
            this.dom.gameoverSaveStatus.style.color = 'var(--cctv-green)';
        });

        this.dom.btnSaveVictoryScore.addEventListener('click', () => {
            const name = this.dom.victoryPlayerName.value.trim() || 'Meester Conciërge';
            this.saveRunScore(name, true);
            this.dom.btnSaveVictoryScore.disabled = true;
            this.dom.victorySaveStatus.textContent = '🏆 Score vereeuwigd op de erelijst!';
            this.dom.victorySaveStatus.style.color = 'var(--cctv-green)';
        });

        // Report Tablet Controls
        this.dom.btnReportMain.addEventListener('click', () => this.toggleReportTablet());
        this.dom.btnCloseTablet.addEventListener('click', () => this.toggleReportTablet(false));
        this.dom.btnSendReport.addEventListener('click', () => this.submitReport());

        // Pan and Zoom
        this.dom.viewport.addEventListener('wheel', (e) => this.handleZoom(e));
        this.dom.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        this.dom.viewport.addEventListener('dblclick', () => this.resetPanZoom());

        // Settings Modal
        this.dom.btnOpenSettings.addEventListener('click', () => this.openModal(this.dom.settingsModal));
        this.dom.btnCloseSettings.addEventListener('click', () => this.closeModal(this.dom.settingsModal));

        // Settings updates
        this.dom.selDuration.addEventListener('change', (e) => {
            this.settings.nightDurationSeconds = parseInt(e.target.value);
        });
        this.dom.selDifficulty.addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
        });
        this.dom.selFilter.addEventListener('change', (e) => {
            this.settings.filterMode = e.target.value;
            this.applyFilterMode(this.settings.filterMode);
        });
        this.dom.volSlider.addEventListener('input', (e) => {
            this.audio.setVolume(parseFloat(e.target.value));
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            if (e.key === '1') this.showCamera(0);
            if (e.key === '2') this.showCamera(1);
            if (e.key === '3') this.showCamera(2);
            if (e.key === '4') this.showCamera(3);
            if (e.key === 'ArrowRight') this.showCamera((this.currentCamIndex + 1) % this.cameras.length);
            if (e.key === 'ArrowLeft') this.showCamera((this.currentCamIndex - 1 + this.cameras.length) % this.cameras.length);
            if (e.code === 'Space' || e.key.toLowerCase() === 'r') {
                e.preventDefault();
                this.toggleReportTablet();
            }
            if (e.key.toLowerCase() === 'f') {
                this.toggleFullscreen();
            }
            if (e.key.toLowerCase() === 'm') {
                const muted = this.audio.toggleMute();
                this.showToast(muted ? '🔇 Geluid Gedempt' : '🔊 Geluid Aan');
            }
        });

        // Window resize
        window.addEventListener('resize', () => this.resizeNoiseCanvas());
    }

    startGame() {
        this.audio.init();
        this.audio.setDangerLevel(0);
        this.dom.titleScreen.style.display = 'none';
        this.dom.gameOverScreen.style.display = 'none';
        this.dom.victoryScreen.style.display = 'none';

        this.isRunning = true;
        this.isPaused = false;
        this.gameTimeSeconds = 0;
        this.activeAnomalies = [];
        this.stats = {
            reportsTotal: 0,
            reportsSuccess: 0,
            reportsFailed: 0,
            anomaliesSpawned: 0
        };
        this.overloadSecondsLeft = 15;
        if (this.overloadTimer) clearInterval(this.overloadTimer);

        // Reset score form states
        if (this.dom.gameoverPlayerName) this.dom.gameoverPlayerName.value = '';
        if (this.dom.gameoverSaveStatus) this.dom.gameoverSaveStatus.textContent = '';
        if (this.dom.btnSaveGameoverScore) this.dom.btnSaveGameoverScore.disabled = false;
        if (this.dom.victoryPlayerName) this.dom.victoryPlayerName.value = '';
        if (this.dom.victorySaveStatus) this.dom.victorySaveStatus.textContent = '';
        if (this.dom.btnSaveVictoryScore) this.dom.btnSaveVictoryScore.disabled = false;

        this.resetPanZoom();
        this.showCamera(0);
        this.updateThreatLevelDisplay();

        // Start clock
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => this.tickClock(), 1000);

        // Rustfase from 00:00 to 00:45 AM: No anomalies!
        this.showToast('DIENST GESTART - 00:00 AM // RUSTFASE: VERKEN DE CAMERAS (GEEN AFWIJKINGEN TOT 00:45)');

        // Schedule first anomaly spawn at exactly 00:45 AM
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);
        const timeUntil0045 = (45 / 360) * this.settings.nightDurationSeconds;
        this.spawnTimeout = setTimeout(() => {
            if (this.isRunning) {
                this.showToast('⚠️ 00:45 AM // NACHTDIENST INTENSIVERING: EERSTE AFWIJKINGEN GEDETECTEERD!');
                this.spawnRandomAnomaly();
                this.scheduleNextAnomaly();
            }
        }, timeUntil0045 * 1000);
    }

    tickClock() {
        if (!this.isRunning || this.isPaused) return;

        this.gameTimeSeconds += 1;
        const progress = this.gameTimeSeconds / this.settings.nightDurationSeconds;
        
        // Convert to simulated in-game time from 00:00 to 06:00
        const totalSimulatedSeconds = progress * (6 * 3600);
        const simHours = Math.floor(totalSimulatedSeconds / 3600);
        const simMins = Math.floor((totalSimulatedSeconds % 3600) / 60);
        const simSecs = Math.floor(totalSimulatedSeconds % 60);

        const pad = (n) => String(n).padStart(2, '0');
        this.dom.clockTime.textContent = `${pad(simHours)}:${pad(simMins)}:${pad(simSecs)} AM`;

        // Check for victory at 06:00 AM!
        if (this.gameTimeSeconds >= this.settings.nightDurationSeconds) {
            this.triggerVictory();
        }

        // Anomaly overload logic
        if (this.activeAnomalies.length >= this.settings.maxAnomalies) {
            this.overloadSecondsLeft -= 1;
            this.updateThreatLevelDisplay(); // Live countdown on badge!
            if (this.overloadSecondsLeft <= 0) {
                this.triggerGameOver('OVERVALT DOOR ANOMALIEËN // MAXIMALE CAPACITEIT OVERSCHREDEN');
            }
        } else {
            if (this.overloadSecondsLeft !== 15) {
                this.overloadSecondsLeft = 15;
                this.updateThreatLevelDisplay();
            }
        }

        // Periodic ambient crackle if light flicker anomaly active on current room
        const hasLightFlicker = this.activeAnomalies.some(a => a.type === 'light' && a.renderData.kind === 'flicker' && a.room === this.cameras[this.currentCamIndex].id);
        if (hasLightFlicker && Math.random() < 0.25) {
            this.audio.playLightFlicker();
        }
    }

    scheduleNextAnomaly() {
        if (!this.isRunning) return;

        // If before 00:45 AM, do NOT schedule spawns yet
        const threshold0045 = (45 / 360) * this.settings.nightDurationSeconds;
        if (this.gameTimeSeconds < threshold0045) return;

        // If already at max anomalies (3), pause spawns until player resolves one
        if (this.activeAnomalies.length >= this.settings.maxAnomalies) {
            return;
        }

        // Base spawn intervals - comfortable pacing so player is not overwhelmed!
        let baseDelay = 28; // seconds
        if (this.settings.difficulty === 'easy') baseDelay = 38;
        if (this.settings.difficulty === 'hard') baseDelay = 18;

        // If 2 anomalies are already active, add extra breathing room!
        if (this.activeAnomalies.length >= 2) {
            baseDelay += 15;
        }

        // Later in the night (03:00+), slightly increase frequency (up to 25% faster)
        const nightProgress = this.gameTimeSeconds / this.settings.nightDurationSeconds;
        const speedMultiplier = 1.0 - (nightProgress * 0.25);

        const delay = (baseDelay * speedMultiplier + (Math.random() * 6 - 3)) * 1000;

        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);
        this.spawnTimeout = setTimeout(() => {
            this.spawnRandomAnomaly();
            this.scheduleNextAnomaly();
        }, Math.max(12000, delay));
    }

    preloadAllImages() {
        const urls = [];
        this.cameras.forEach(c => {
            urls.push(c.src);
            c.anomalies.forEach(a => {
                if (a.renderData && a.renderData.imageSrc) urls.push(a.renderData.imageSrc);
                if (a.renderData && a.renderData.src) urls.push(a.renderData.src);
            });
        });
        urls.forEach(u => {
            const img = new Image();
            img.src = u;
        });
    }

    spawnRandomAnomaly() {
        if (!this.isRunning) return;

        // Strictly check 00:45 AM threshold
        const threshold0045 = (45 / 360) * this.settings.nightDurationSeconds;
        if (this.gameTimeSeconds < threshold0045) return;

        // Strict limit: NEVER exceed maxAnomalies (3)
        if (this.activeAnomalies.length >= this.settings.maxAnomalies) return;

        // Strict Camera Rule: A camera can ONLY have 1 active anomaly at a time!
        const roomsWithActiveAnomaly = new Set(this.activeAnomalies.map(a => a.room));
        const available = [];

        this.cameras.forEach(cam => {
            // If this room already has an active anomaly, SKIP IT completely!
            if (roomsWithActiveAnomaly.has(cam.id)) return;

            cam.anomalies.forEach(anomaly => {
                const isActive = this.activeAnomalies.some(a => a.configId === anomaly.id);
                if (isActive) return;
                available.push({ ...anomaly, cameraObj: cam });
            });
        });

        if (available.length === 0) return;

        // Prioritize preloaded image anomalies (docenten & missend object): 75% chance!
        const preloadedAnomalies = available.filter(a => a.renderData && a.renderData.kind === 'swap_image');
        let pool = available;
        if (preloadedAnomalies.length > 0 && Math.random() < 0.75) {
            pool = preloadedAnomalies;
        }

        // VARIETY ROTATION: prioritize anomalies that haven't spawned recently
        if (!this.spawnHistory) this.spawnHistory = [];
        const unseenOrOlder = pool.filter(a => !this.spawnHistory.slice(-5).includes(a.id));
        if (unseenOrOlder.length > 0) {
            pool = unseenOrOlder;
        }

        // Bias towards rooms player is NOT currently viewing (70%)
        const currentCamId = this.cameras[this.currentCamIndex].id;
        const otherRooms = pool.filter(a => a.targetRoom !== currentCamId);
        
        let chosen;
        if (otherRooms.length > 0 && Math.random() < 0.70) {
            chosen = otherRooms[Math.floor(Math.random() * otherRooms.length)];
        } else {
            chosen = pool[Math.floor(Math.random() * pool.length)];
            // If spawning in current room, give brief static flicker
            this.triggerSwitchGlitch();
        }

        this.spawnHistory.push(chosen.id);

        // Setup anomaly instance
        const instance = {
            instanceId: 'inst_' + Date.now() + '_' + Math.random(),
            configId: chosen.id,
            room: chosen.targetRoom,
            type: chosen.targetCategory,
            name: chosen.name,
            description: chosen.description,
            renderData: { ...chosen.renderData },
            spawnTime: this.gameTimeSeconds
        };

        if (instance.type === 'teacher') {
            instance.teacherData = this.teacherMgr ? this.teacherMgr.getRandomTeacher() : null;
        }

        this.activeAnomalies.push(instance);
        this.stats.anomaliesSpawned++;
        this.updateThreatLevelDisplay();

        // Update visuals if spawned on current camera
        if (instance.room === currentCamId) {
            this.renderAnomaliesForCurrentCamera();
            if (instance.type === 'light') {
                if (instance.renderData.kind === 'flicker') this.audio.playLightFlicker();
                if (instance.renderData.kind === 'blackout') this.audio.playBlackout();
            }
        }

        console.log(`[ANOMALY SPAWNED] Room: ${instance.room}, Type: ${instance.type}, Name: ${instance.name}`);
    }

    showCamera(index) {
        if (index < 0 || index >= this.cameras.length) return;
        
        this.currentCamIndex = index;
        const cam = this.cameras[index];

        // Trigger camera switch glitch & audio
        this.triggerSwitchGlitch();
        this.audio.playCameraSwitch();

        // Update OSD info
        this.dom.camTitle.textContent = cam.fullTitle;
        this.dom.camCode.textContent = `LOCATIE: ${cam.name.toUpperCase()} // CODE: ${cam.code}`;

        // Update Active Nav Button
        const buttons = this.dom.camNavGroup.querySelectorAll('.cam-btn');
        buttons.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        // Set default report room to this camera
        this.selectedReportRoom = cam.id;
        this.updateReportSelectionUI();

        // Render any active anomalies on this camera
        this.renderAnomaliesForCurrentCamera();
    }

    renderAnomaliesForCurrentCamera() {
        const cam = this.cameras[this.currentCamIndex];
        const anomaliesInThisRoom = this.activeAnomalies.filter(a => a.room === cam.id);

        // Clear previous overlays & anomaly effects
        this.dom.anomalyLayer.innerHTML = '';
        this.dom.lightOverlay.className = '';
        this.dom.lightOverlay.style.background = '';
        this.dom.lightOverlay.style.opacity = '0';
        this.dom.feedContainer.classList.remove('anomaly-camera-active');
        this.dom.noiseCanvas.style.opacity = '0.14';

        const existingSyncBar = this.dom.viewport.querySelector('.camera-sync-bar');
        if (existingSyncBar) existingSyncBar.remove();

        const existingOsdErr = document.getElementById('cam-osd-err');
        if (existingOsdErr) existingOsdErr.remove();

        // Check if there is an image swap anomaly active
        const swapAnomaly = anomaliesInThisRoom.find(a => a.renderData && a.renderData.kind === 'swap_image');
        if (swapAnomaly) {
            this.dom.baseImg.src = swapAnomaly.renderData.imageSrc;
        } else {
            this.dom.baseImg.src = cam.src;
        }

        anomaliesInThisRoom.forEach(anomaly => {
            // If swap_image, base image is already showing the anomaly
            if (anomaly.renderData && anomaly.renderData.kind === 'swap_image') {
                return;
            }

            // 1. Teacher Anomaly (cutout/sprite fallback)
            if (anomaly.type === 'teacher') {
                const img = document.createElement('img');
                img.className = 'teacher-anomaly-sprite';
                img.src = anomaly.renderData.src || (anomaly.teacherData ? anomaly.teacherData.src : 'assets/teachers/teacher_real.png');
                img.style.left = anomaly.renderData.x + '%';
                img.style.top = anomaly.renderData.y + '%';
                img.style.width = anomaly.renderData.width + '%';
                img.style.height = anomaly.renderData.height + '%';
                img.style.opacity = anomaly.renderData.opacity || 0.95;
                img.style.zIndex = anomaly.renderData.zIndex || 10;
                this.dom.anomalyLayer.appendChild(img);
            }

            // 2. Extra Object / Displacement Anomaly
            else if (anomaly.type === 'extra_object' || anomaly.type === 'displacement') {
                if (anomaly.renderData.src) {
                    const img = document.createElement('img');
                    img.className = 'object-anomaly-sprite' + (anomaly.renderData.floating ? ' floating-anomaly' : '');
                    img.src = anomaly.renderData.src;
                    img.style.left = anomaly.renderData.x + '%';
                    img.style.top = anomaly.renderData.y + '%';
                    img.style.width = anomaly.renderData.width + '%';
                    img.style.height = anomaly.renderData.height + '%';
                    img.style.zIndex = anomaly.renderData.zIndex || 12;
                    this.dom.anomalyLayer.appendChild(img);
                }
            }

            // 3. Light Anomaly (Fluorescent flicker or Blackout: authentic room voltage dips)
            else if (anomaly.type === 'light') {
                if (anomaly.renderData.kind === 'flicker') {
                    this.dom.lightOverlay.className = 'anomaly-flicker';
                } else if (anomaly.renderData.kind === 'blackout') {
                    this.dom.lightOverlay.className = 'anomaly-blackout';
                    this.dom.lightOverlay.style.background = anomaly.renderData.tint || 'radial-gradient(circle, rgba(3,6,8,0.92), rgba(1,2,3,0.99))';
                }
            }

            // 4. Camera Anomaly (Persistent horizontal VHS tracking glitch, rolling sync bar, heavy noise)
            else if (anomaly.type === 'camera') {
                this.dom.feedContainer.classList.add('anomaly-camera-active');
                this.dom.noiseCanvas.style.opacity = '0.45';

                // Rolling sync bar
                if (!this.dom.viewport.querySelector('.camera-sync-bar')) {
                    const syncBar = document.createElement('div');
                    syncBar.className = 'camera-sync-bar';
                    this.dom.viewport.appendChild(syncBar);
                }

                // OSD error indicator
                if (!document.getElementById('cam-osd-err')) {
                    const osdErr = document.createElement('span');
                    osdErr.id = 'cam-osd-err';
                    osdErr.className = 'osd-cam-error';
                    osdErr.textContent = '⚠️ SIGNAALFOUT';
                    const topRow = document.querySelector('.osd-top-row');
                    if (topRow) topRow.appendChild(osdErr);
                }
            }
        });
    }

    triggerSwitchGlitch() {
        this.dom.switchGlitch.classList.remove('trigger-switch-glitch');
        void this.dom.switchGlitch.offsetWidth; // trigger reflow
        this.dom.switchGlitch.classList.add('trigger-switch-glitch');
    }

    triggerTemporaryGlitchBurst() {
        const originalOpacity = this.dom.noiseCanvas.style.opacity;
        this.dom.noiseCanvas.style.opacity = '0.55';
        setTimeout(() => {
            this.dom.noiseCanvas.style.opacity = '0.14';
        }, 700);
    }

    updateThreatLevelDisplay() {
        const count = this.activeAnomalies.length;
        const max = this.settings.maxAnomalies;
        const badge = this.dom.threatBadge;

        badge.className = 'threat-badge';
        if (count === 0) {
            badge.classList.add('threat-safe');
            badge.textContent = `VEILIG (${count}/${max})`;
        } else if (count === 1) {
            badge.classList.add('threat-safe');
            badge.textContent = `VERHOOGD (${count}/${max})`;
        } else if (count === 2) {
            badge.classList.add('threat-warning');
            badge.textContent = `WAARSCHUWING (${count}/${max})`;
        } else {
            badge.classList.add('threat-danger');
            badge.textContent = `ALARM OVERLOAD! (${count}/${max}) [${this.overloadSecondsLeft}s]`;
        }

        // Sound intensity trigger
        this.audio.setDangerLevel(count);
    }

    // Report Tablet System
    toggleReportTablet(forceState) {
        const isOpen = this.dom.reportTablet.classList.contains('open');
        const nextState = forceState !== undefined ? forceState : !isOpen;

        this.dom.reportTablet.classList.toggle('open', nextState);
        this.audio.playBeep(nextState ? 660 : 440, 0.05);

        if (nextState) {
            // Default selected room to current camera
            this.selectedReportRoom = this.cameras[this.currentCamIndex].id;
            this.updateReportSelectionUI();
        }
    }

    submitReport() {
        if (this.isReporting) return;
        this.isReporting = true;

        this.dom.btnSendReport.disabled = true;
        this.dom.reportProcessing.style.display = 'block';
        this.dom.scanProgressFill.style.width = '0%';
        this.dom.scanStatusText.textContent = 'RAPPORT WORDT ONDERZOCHT...';

        this.audio.playReportScan();

        // 3.0 second inspection progress bar
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            this.dom.scanProgressFill.style.width = progress + '%';

            if (progress >= 100) {
                clearInterval(interval);
                this.evaluateReport();
            }
        }, 150);
    }

    evaluateReport() {
        this.isReporting = false;
        this.dom.btnSendReport.disabled = false;
        this.dom.reportProcessing.style.display = 'none';
        this.stats.reportsTotal++;

        // Find if an anomaly exists with matching room and category
        const matchIndex = this.activeAnomalies.findIndex(a => 
            a.room === this.selectedReportRoom && a.type === this.selectedReportCategory
        );

        if (matchIndex !== -1) {
            // SUCCESS!
            const removed = this.activeAnomalies.splice(matchIndex, 1)[0];
            this.stats.reportsSuccess++;
            this.audio.playSuccess();
            this.showToast(`✅ RAPPORT GOEDGEKEURD: ${removed.name.toUpperCase()} OPGERUIMD!`, 'success');

            // Trigger glitch if removed from currently viewed camera
            if (removed.room === this.cameras[this.currentCamIndex].id) {
                this.triggerSwitchGlitch();
                this.renderAnomaliesForCurrentCamera();
            }

            this.updateThreatLevelDisplay();
            this.toggleReportTablet(false);
        } else {
            // FAILED / FALSE REPORT
            this.stats.reportsFailed++;
            this.audio.playError();
            this.showToast('❌ GEEN ANOMALIE GEVONDEN: Vals alarm geregistreerd.', 'error');
            this.toggleReportTablet(false);
        }
    }

    showToast(message, type = 'info') {
        const t = this.dom.toast;
        t.textContent = message;
        t.className = 'show ' + (type === 'success' ? 'success' : (type === 'error' ? 'error' : ''));
        
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            t.className = '';
        }, 3400);
    }

    // Pan and Zoom
    handleZoom(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        this.zoom = Math.max(1.0, Math.min(2.5, this.zoom + delta));
        if (this.zoom === 1.0) {
            this.panX = 0;
            this.panY = 0;
        }
        this.applyPanZoom();
    }

    handleMouseDown(e) {
        if (this.zoom <= 1.0) return;
        this.isDragging = true;
        this.dragStartX = e.clientX - this.panX;
        this.dragStartY = e.clientY - this.panY;
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        const maxPanX = (this.dom.viewport.clientWidth * (this.zoom - 1)) / 2;
        const maxPanY = (this.dom.viewport.clientHeight * (this.zoom - 1)) / 2;
        
        this.panX = Math.max(-maxPanX, Math.min(maxPanX, e.clientX - this.dragStartX));
        this.panY = Math.max(-maxPanY, Math.min(maxPanY, e.clientY - this.dragStartY));
        this.applyPanZoom();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    resetPanZoom() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyPanZoom();
    }

    applyPanZoom() {
        this.dom.feedContainer.style.transform = `scale(${this.zoom}) translate(${this.panX / this.zoom}px, ${this.panY / this.zoom}px)`;
    }

    applyFilterMode(mode) {
        const img = this.dom.baseImg;
        img.className = '';
        if (mode === 'cctv') img.classList.add('filter-cctv');
        if (mode === 'nightvision') img.classList.add('filter-nightvision');
        if (mode === 'bw') img.classList.add('filter-bw');
        if (mode === 'raw') img.classList.add('filter-raw');
    }

    // Noise Generator Canvas
    initNoiseCanvas() {
        this.noiseCanvas = this.dom.noiseCanvas;
        this.noiseCtx = this.noiseCanvas.getContext('2d');
        this.resizeNoiseCanvas();
        this.renderNoiseLoop();
    }

    resizeNoiseCanvas() {
        if (!this.noiseCanvas) return;
        this.noiseCanvas.width = Math.floor(window.innerWidth / 3);
        this.noiseCanvas.height = Math.floor(window.innerHeight / 3);
    }

    renderNoiseLoop() {
        if (!this.noiseCtx) return;
        const w = this.noiseCanvas.width;
        const h = this.noiseCanvas.height;
        const imgData = this.noiseCtx.createImageData(w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const val = (Math.random() * 255) | 0;
            data[i] = val;
            data[i+1] = val;
            data[i+2] = val;
            data[i+3] = 45; // subtle transparency
        }

        this.noiseCtx.putImageData(imgData, 0, 0);
        requestAnimationFrame(() => this.renderNoiseLoop());
    }

    // End Game Screens
    triggerGameOver(reason) {
        this.isRunning = false;
        clearInterval(this.clockInterval);
        clearTimeout(this.spawnTimeout);
        this.audio.playGameOver();

        document.getElementById('gameover-reason').textContent = reason;
        document.getElementById('stat-time-survived').textContent = this.dom.clockTime.textContent;
        document.getElementById('stat-reports-sent').textContent = this.stats.reportsTotal;
        document.getElementById('stat-success-rate').textContent = this.stats.reportsTotal > 0 
            ? Math.round((this.stats.reportsSuccess / this.stats.reportsTotal) * 100) + '%' : '0%';

        this.dom.gameOverScreen.style.display = 'flex';
    }

    triggerVictory() {
        this.isRunning = false;
        clearInterval(this.clockInterval);
        clearTimeout(this.spawnTimeout);
        this.audio.playVictoryBell();

        document.getElementById('stat-vic-reports').textContent = this.stats.reportsTotal;
        document.getElementById('stat-vic-accuracy').textContent = this.stats.reportsTotal > 0 
            ? Math.round((this.stats.reportsSuccess / this.stats.reportsTotal) * 100) + '%' : '100%';
        document.getElementById('stat-vic-anomalies').textContent = this.stats.reportsSuccess;

        this.dom.victoryScreen.style.display = 'flex';
    }

    // UI Builders
    renderCameraButtons() {
        const container = this.dom.camNavGroup;
        container.innerHTML = '';

        this.cameras.forEach((cam, idx) => {
            const btn = document.createElement('button');
            btn.className = 'cam-btn' + (idx === 0 ? ' active' : '');
            btn.innerHTML = `<span class="cam-key-hint">${idx + 1}</span> ${cam.name.toUpperCase()}`;
            btn.addEventListener('click', () => this.showCamera(idx));
            container.appendChild(btn);
        });
    }

    renderReportOptions() {
        // Room selection buttons
        const roomGrid = this.dom.roomGrid;
        roomGrid.innerHTML = '';
        this.cameras.forEach(cam => {
            const btn = document.createElement('button');
            btn.className = 'room-opt-btn' + (cam.id === this.selectedReportRoom ? ' selected' : '');
            btn.textContent = cam.name;
            btn.dataset.roomId = cam.id;
            btn.addEventListener('click', () => {
                this.selectedReportRoom = cam.id;
                this.updateReportSelectionUI();
                this.audio.playBeep(700, 0.03);
            });
            roomGrid.appendChild(btn);
        });

        // Category selection buttons
        const catGrid = this.dom.catGrid;
        catGrid.innerHTML = '';
        this.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'cat-opt-btn' + (cat.id === this.selectedReportCategory ? ' selected' : '');
            btn.innerHTML = `<span class="cat-opt-icon">${cat.icon}</span><span>${cat.name}</span>`;
            btn.dataset.catId = cat.id;
            btn.addEventListener('click', () => {
                this.selectedReportCategory = cat.id;
                this.updateReportSelectionUI();
                this.audio.playBeep(750, 0.03);
            });
            catGrid.appendChild(btn);
        });
    }

    updateReportSelectionUI() {
        const roomBtns = this.dom.roomGrid.querySelectorAll('.room-opt-btn');
        roomBtns.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.roomId === this.selectedReportRoom);
        });

        const catBtns = this.dom.catGrid.querySelectorAll('.cat-opt-btn');
        catBtns.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.catId === this.selectedReportCategory);
        });
    }

    // Leaderboard System
    loadLeaderboard() {
        const stored = localStorage.getItem('concierge_leaderboard_v1');
        if (stored) {
            try { return JSON.parse(stored); } catch(e) {}
        }
        return [
            { name: 'Hoofdconciërge Bert', timeSurvived: '06:00 AM (OVERLEEFD)', survivedSeconds: 360, reportsSuccess: 9, accuracy: 100, date: 'Vast rooster', victory: true },
            { name: 'Conciërge Theo', timeSurvived: '05:18 AM', survivedSeconds: 318, reportsSuccess: 7, accuracy: 88, date: 'Ochtendploeg', victory: false },
            { name: 'Stagiair Rick', timeSurvived: '03:42 AM', survivedSeconds: 222, reportsSuccess: 4, accuracy: 75, date: 'Nachtdienst', victory: false },
            { name: 'Avondconciërge Jan', timeSurvived: '02:15 AM', survivedSeconds: 135, reportsSuccess: 2, accuracy: 50, date: 'Vrijdagavond', victory: false }
        ];
    }

    saveRunScore(playerName, isVictory) {
        const list = this.loadLeaderboard();
        const total = Math.max(1, this.stats.reportsTotal);
        const acc = Math.round((this.stats.reportsSuccess / total) * 100);
        const clockStr = this.dom.clockTime.textContent;
        const timeLabel = isVictory ? '06:00 AM (OVERLEEFD)' : clockStr;
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth()+1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const entry = {
            id: 'run_' + Date.now(),
            name: playerName,
            timeSurvived: timeLabel,
            survivedSeconds: this.gameTimeSeconds,
            reportsSuccess: this.stats.reportsSuccess,
            accuracy: isVictory && this.stats.reportsTotal === 0 ? 100 : acc,
            date: dateStr,
            victory: isVictory
        };

        list.push(entry);
        // Sort: victory runs first, then survivedSeconds desc, then accuracy desc
        list.sort((a, b) => {
            if (a.victory !== b.victory) return b.victory ? 1 : -1;
            if (b.survivedSeconds !== a.survivedSeconds) return b.survivedSeconds - a.survivedSeconds;
            return b.accuracy - a.accuracy;
        });

        // Save top 20
        const topList = list.slice(0, 20);
        localStorage.setItem('concierge_leaderboard_v1', JSON.stringify(topList));

        this.renderLeaderboard(entry.id);
        this.openModal(this.dom.leaderboardModal);
    }

    renderLeaderboard(highlightId = null) {
        const list = this.loadLeaderboard();
        const tbody = this.dom.leaderboardTbody;
        if (!tbody) return;
        tbody.innerHTML = '';

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #777; padding: 20px;">Nog geen conciërge runs geregistreerd.</td></tr>`;
            return;
        }

        const escapeHTML = (str) => String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);

        list.forEach((entry, idx) => {
            const tr = document.createElement('tr');
            if (entry.id && entry.id === highlightId) {
                tr.className = 'highlight-run';
            }

            let rankBadge = `${idx + 1}`;
            if (idx === 0) rankBadge = `<span class="rank-gold">🥇 1</span>`;
            else if (idx === 1) rankBadge = `<span class="rank-silver">🥈 2</span>`;
            else if (idx === 2) rankBadge = `<span class="rank-bronze">🥉 3</span>`;

            const statusBadge = entry.victory 
                ? `<span class="badge-survived">06:00 OVERLEEFD</span>`
                : `<span class="badge-failed">${entry.timeSurvived}</span>`;

            tr.innerHTML = `
                <td>${rankBadge}</td>
                <td><strong>${escapeHTML(entry.name)}</strong></td>
                <td>${statusBadge}</td>
                <td style="color: var(--cctv-green);">${entry.reportsSuccess} opgelost</td>
                <td>${entry.accuracy}%</td>
                <td style="font-size: 11px; opacity: 0.7;">${entry.date}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    clearLeaderboard() {
        if (confirm('Weet je zeker dat je het conciërge leaderboard wilt wissen?')) {
            localStorage.removeItem('concierge_leaderboard_v1');
            this.renderLeaderboard();
            this.showToast('Scorebord gewist.');
        }
    }

    openModal(modal) {
        modal.classList.add('open');
        this.audio.playBeep(600, 0.04);
    }

    closeModal(modal) {
        modal.classList.remove('open');
        this.audio.playBeep(450, 0.04);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }
}

// Instantiate and start on window load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new SchoolSurveillanceGame();
    window.game.init();
});
