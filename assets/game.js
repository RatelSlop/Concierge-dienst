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
            maxAnomalies: 3,            // Strict cap: max 3 anomalies simultaneously!
            rustMins: 45                // In-game minutes before anomalies start (default: 45 = 00:45 AM)
        };

        // Game State
        this.isRunning = false;
        this.isPaused = false;
        this.gameTimeSeconds = 0; // 0 to nightDurationSeconds
        this.currentCamIndex = 0;
        this.activeAnomalies = [];
        this.overloadTimer = null;
        this.overloadSecondsLeft = 15;
        this.isEndless = false;
        this.playerName = localStorage.getItem('concierge_player_name') || '';
        this.runScoreSaved = false;

        // Camera Pan/Zoom State
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Mobile Touch State (pinch zoom, swipe cameras, pan)
        this.touchStartX = null;
        this.touchStartY = null;
        this.touchCurrentX = null;
        this.touchCurrentY = null;
        this.initialPinchDist = null;
        this.initialZoom = 1.0;
        this.lastTapTime = 0;

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
        if (this.dom.startPlayerName && this.playerName) {
            this.dom.startPlayerName.value = this.playerName;
        }
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
            startPlayerName: document.getElementById('start-player-name'),
            btnStartGame: document.getElementById('btn-start-game'),
            btnStartEndless: document.getElementById('btn-start-endless'),
            gameOverScreen: document.getElementById('game-over-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            btnRestartGameOver: document.getElementById('btn-restart-gameover'),
            btnRestartVictory: document.getElementById('btn-restart-victory'),
            btnRestartVictoryEndless: document.getElementById('btn-restart-victory-endless'),
            shiftProgress: document.querySelector('.osd-shift-progress'),
            
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
            selGamemode: document.getElementById('setting-gamemode'),
            selDuration: document.getElementById('setting-duration'),
            selRustfase: document.getElementById('setting-rustfase'),
            selDifficulty: document.getElementById('setting-difficulty'),
            selFilter: document.getElementById('setting-filter'),
            volSlider: document.getElementById('setting-volume')
        };
    }

    bindEvents() {
        // Start Game (Standard vs Endless)
        if (this.dom.btnStartGame) {
            this.dom.btnStartGame.addEventListener('click', () => {
                const name = (this.dom.startPlayerName && this.dom.startPlayerName.value.trim()) || this.playerName;
                if (name) {
                    this.playerName = name;
                    localStorage.setItem('concierge_player_name', name);
                }
                this.startGame(false);
            });
        }

        if (this.dom.btnStartEndless) {
            this.dom.btnStartEndless.addEventListener('click', () => {
                const name = (this.dom.startPlayerName && this.dom.startPlayerName.value.trim()) || this.playerName;
                if (name) {
                    this.playerName = name;
                    localStorage.setItem('concierge_player_name', name);
                }
                this.startGame(true);
            });
        }

        if (this.dom.btnRestartGameOver) {
            this.dom.btnRestartGameOver.addEventListener('click', () => {
                const name = (this.dom.gameoverPlayerName && this.dom.gameoverPlayerName.value.trim()) || this.playerName || 'Conciërge';
                if (!this.runScoreSaved) {
                    this.saveRunScore(name, false, this.isEndless, false);
                }
                this.startGame(this.isEndless);
            });
        }

        if (this.dom.btnRestartVictory) {
            this.dom.btnRestartVictory.addEventListener('click', () => this.startGame(false));
        }

        if (this.dom.btnRestartVictoryEndless) {
            this.dom.btnRestartVictoryEndless.addEventListener('click', () => this.startGame(true));
        }

        // Leaderboard Modals & Score Saving
        this.dom.btnOpenLeaderboard.addEventListener('click', () => {
            this.renderLeaderboard();
            this.openModal(this.dom.leaderboardModal);
        });
        this.dom.btnCloseLeaderboard.addEventListener('click', () => this.closeModal(this.dom.leaderboardModal));
        this.dom.btnClearLeaderboard.addEventListener('click', () => this.clearLeaderboard());

        this.dom.btnSaveGameoverScore.addEventListener('click', () => {
            const name = (this.dom.gameoverPlayerName && this.dom.gameoverPlayerName.value.trim()) || this.playerName || 'Conciërge';
            this.playerName = name;
            localStorage.setItem('concierge_player_name', name);
            this.lastRunId = this.saveRunScore(name, false, this.isEndless, true, this.lastRunId);
            this.runScoreSaved = true;
            this.dom.btnSaveGameoverScore.disabled = true;
            this.dom.gameoverSaveStatus.textContent = '✅ Resultaat opgeslagen op het bord!';
            this.dom.gameoverSaveStatus.style.color = 'var(--cctv-green)';
        });

        this.dom.btnSaveVictoryScore.addEventListener('click', () => {
            const name = (this.dom.victoryPlayerName && this.dom.victoryPlayerName.value.trim()) || this.playerName || 'Meester Conciërge';
            this.playerName = name;
            localStorage.setItem('concierge_player_name', name);
            this.lastRunId = this.saveRunScore(name, true, false, true, this.lastRunId);
            this.runScoreSaved = true;
            this.dom.btnSaveVictoryScore.disabled = true;
            this.dom.victorySaveStatus.textContent = '🏆 Score vereeuwigd op de erelijst!';
            this.dom.victorySaveStatus.style.color = 'var(--cctv-green)';
        });

        // Report Tablet Controls
        this.dom.btnReportMain.addEventListener('click', () => this.toggleReportTablet());
        this.dom.btnCloseTablet.addEventListener('click', () => this.toggleReportTablet(false));
        this.dom.btnSendReport.addEventListener('click', () => this.submitReport());

        // Pan and Zoom (Mouse)
        this.dom.viewport.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
        this.dom.viewport.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        this.dom.viewport.addEventListener('dblclick', () => this.resetPanZoom());

        // Touch Gestures for Mobile (Pinch zoom, drag pan, swipe camera switch, double tap reset)
        this.dom.viewport.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.dom.viewport.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.dom.viewport.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.dom.viewport.addEventListener('touchcancel', () => this.handleTouchEnd());

        // Settings Modal
        this.dom.btnOpenSettings.addEventListener('click', () => this.openModal(this.dom.settingsModal));
        this.dom.btnCloseSettings.addEventListener('click', () => this.closeModal(this.dom.settingsModal));

        // Settings updates
        if (this.dom.selGamemode) {
            this.dom.selGamemode.addEventListener('change', (e) => {
                this.isEndless = e.target.value === 'endless';
            });
        }
        this.dom.selDuration.addEventListener('change', (e) => {
            this.settings.nightDurationSeconds = parseInt(e.target.value);
        });
        if (this.dom.selRustfase) {
            this.dom.selRustfase.addEventListener('change', (e) => {
                this.settings.rustMins = parseInt(e.target.value);
            });
        }
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

    startGame(isEndless = false) {
        this.isEndless = !!isEndless;
        this.runScoreSaved = false;

        // Sync dropdown if present
        if (this.dom.selGamemode) {
            this.dom.selGamemode.value = this.isEndless ? 'endless' : 'standard';
        }

        // Grab player name from start input if provided
        if (this.dom.startPlayerName && this.dom.startPlayerName.value.trim()) {
            this.playerName = this.dom.startPlayerName.value.trim();
            localStorage.setItem('concierge_player_name', this.playerName);
        } else {
            this.playerName = localStorage.getItem('concierge_player_name') || '';
        }

        this.audio.init();
        this.audio.setDangerLevel(0);
        this.dom.titleScreen.style.display = 'none';
        this.dom.gameOverScreen.style.display = 'none';
        this.dom.victoryScreen.style.display = 'none';

        this.isRunning = true;
        this.isPaused = false;
        this.gameTimeSeconds = 0;
        this.anomaliesStarted = false;
        this.activeAnomalies = [];
        this.stats = {
            reportsTotal: 0,
            reportsSuccess: 0,
            reportsFailed: 0,
            anomaliesSpawned: 0
        };
        this.overloadSecondsLeft = 15;
        if (this.overloadTimer) clearInterval(this.overloadTimer);
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);

        // Pre-fill player name into game over & victory inputs
        if (this.dom.gameoverPlayerName) this.dom.gameoverPlayerName.value = this.playerName;
        if (this.dom.gameoverSaveStatus) this.dom.gameoverSaveStatus.textContent = '';
        if (this.dom.btnSaveGameoverScore) this.dom.btnSaveGameoverScore.disabled = false;
        if (this.dom.victoryPlayerName) this.dom.victoryPlayerName.value = this.playerName;
        if (this.dom.victorySaveStatus) this.dom.victorySaveStatus.textContent = '';
        if (this.dom.btnSaveVictoryScore) this.dom.btnSaveVictoryScore.disabled = false;

        this.resetPanZoom();
        this.showCamera(0);
        this.updateThreatLevelDisplay();

        // Update shift indicator on OSD
        if (this.dom.shiftProgress) {
            this.dom.shiftProgress.textContent = this.isEndless 
                ? '♾️ ENDLESS MODUS // OVERLEEF ZO LANG MOGELIJK'
                : 'CONCIËRGE NACHTDIENST 00:00 - 06:00 AM';
        }

        // Start clock
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => this.tickClock(), 1000);

        if (this.isEndless) {
            // Endless mode: action starts right away!
            this.anomaliesStarted = true;
            this.showToast('♾️ ENDLESS MODUS GESTART // ANOMALIEËN ZIJN ACTIEF!', 'warning');
            setTimeout(() => {
                if (this.isRunning) {
                    this.spawnRandomAnomaly();
                    this.scheduleNextAnomaly();
                }
            }, 2500);
        } else {
            const rustMinutes = this.settings.rustMins !== undefined ? this.settings.rustMins : 45;
            const rustThreshold = (rustMinutes / 360) * this.settings.nightDurationSeconds;
            if (rustThreshold <= 0) {
                // Instant action
                this.anomaliesStarted = true;
                this.showToast('DIENST GESTART - 00:00 AM // HOUD DE CAMERA\'S IN DE GATEN!');
                setTimeout(() => {
                    if (this.isRunning) {
                        this.spawnRandomAnomaly();
                        this.scheduleNextAnomaly();
                    }
                }, 2500);
            } else {
                this.showToast(`DIENST GESTART - 00:00 AM // RUSTFASE TOT 00:45 AM (VERKEN DE CAMERA'S)`);
            }
        }
    }

    tickClock() {
        if (!this.isRunning || this.isPaused) return;

        this.gameTimeSeconds += 1;
        const progress = this.gameTimeSeconds / this.settings.nightDurationSeconds;
        
        // Convert to simulated in-game time from 00:00
        const totalSimulatedSeconds = progress * (6 * 3600);
        const totalSimHours = Math.floor(totalSimulatedSeconds / 3600);
        const simHours = totalSimHours % 24;
        const simMins = Math.floor((totalSimulatedSeconds % 3600) / 60);
        const simSecs = Math.floor(totalSimulatedSeconds % 60);

        const pad = (n) => String(n).padStart(2, '0');
        const ampm = simHours >= 12 ? 'PM' : 'AM';
        this.dom.clockTime.textContent = `${pad(simHours)}:${pad(simMins)}:${pad(simSecs)} ${ampm}`;

        // Check for victory at 06:00 AM! (Only in standard mode)
        if (!this.isEndless && this.gameTimeSeconds >= this.settings.nightDurationSeconds) {
            this.triggerVictory();
            return;
        }

        // In endless mode, celebrate passing 06:00 AM!
        if (this.isEndless && this.gameTimeSeconds === this.settings.nightDurationSeconds) {
            this.showToast('🏆 06:00 AM BEREIKT! ENDLESS OVERLEVING GAAT DOOR...', 'success');
            this.audio.playVictoryBell();
        }

        if (this.isEndless && totalSimHours >= 6 && this.dom.shiftProgress) {
            this.dom.shiftProgress.textContent = `♾️ ENDLESS SURVIVAL // ${totalSimHours}u ${pad(simMins)}m OVERLEEFD`;
        }

        // Rustfase check: transition to active anomalies at 00:45 AM (only in standard mode)
        if (!this.isEndless && !this.anomaliesStarted) {
            const rustMinutes = this.settings.rustMins !== undefined ? this.settings.rustMins : 45;
            const rustThresholdSeconds = (rustMinutes / 360) * this.settings.nightDurationSeconds;

            if (this.gameTimeSeconds >= rustThresholdSeconds) {
                this.anomaliesStarted = true;
                this.showToast('⚠️ 00:45 AM // EERSTE AFWIJKING GEDETECTEERD! HOUD DE CAMERA\'S IN DE GATEN', 'warning');
                this.audio.playBlackout();
                this.spawnRandomAnomaly();
                this.scheduleNextAnomaly(true);
                this.updateThreatLevelDisplay();
            } else {
                // Update badge to clearly show live countdown
                const secondsLeft = Math.max(0, Math.ceil(rustThresholdSeconds - this.gameTimeSeconds));
                const badge = this.dom.threatBadge;
                badge.className = 'threat-badge threat-safe';
                badge.textContent = `RUSTFASE TOT 00:45 (${secondsLeft}s)`;
            }
        }

        // Anomaly overload logic
        if (this.anomaliesStarted) {
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
        }

        // Periodic ambient crackle if light flicker anomaly active on current room
        const hasLightFlicker = this.activeAnomalies.some(a => a.type === 'light' && a.renderData.kind === 'flicker' && a.room === this.cameras[this.currentCamIndex].id);
        if (hasLightFlicker && Math.random() < 0.25) {
            this.audio.playLightFlicker();
        }
    }

    scheduleNextAnomaly(faster = false) {
        if (!this.isRunning || !this.anomaliesStarted) return;

        // If already at max anomalies (3), pause spawns until player resolves one
        if (this.activeAnomalies.length >= this.settings.maxAnomalies) {
            return;
        }

        // Base spawn intervals - more active pacing
        let baseDelay = 10; // seconds (down from 13s)
        if (this.settings.difficulty === 'easy') baseDelay = 16;
        if (this.settings.difficulty === 'hard') baseDelay = 6;

        // If 2 anomalies are already active, add moderate buffer
        if (this.activeAnomalies.length >= 2) {
            baseDelay += 3;
        }

        // If triggered after clearing an anomaly, schedule the next one quickly
        if (faster) {
            baseDelay = Math.min(baseDelay, 4);
        }

        // Later in the night (03:00+), increase frequency (up to 40% faster in endless)
        const nightProgress = this.gameTimeSeconds / this.settings.nightDurationSeconds;
        const speedMultiplier = Math.max(0.45, 1.0 - (Math.min(2.0, nightProgress) * 0.30));

        const delay = (baseDelay * speedMultiplier + (Math.random() * 2.5 - 1.2)) * 1000;

        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);
        this.spawnTimeout = setTimeout(() => {
            this.spawnRandomAnomaly();
            this.scheduleNextAnomaly();
        }, Math.max(3500, delay));
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
        if (otherRooms.length > 0 && Math.random() < 0.65) {
            chosen = otherRooms[Math.floor(Math.random() * otherRooms.length)];
            // Subtle static flicker and blip to indicate activity on the CCTV network
            this.triggerTemporaryGlitchBurst();
            if (this.audio && this.audio.playBeep) this.audio.playBeep(280, 0.04);
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
        const rustMinutes = this.settings.rustMins !== undefined ? this.settings.rustMins : 45;
        const rustThresholdSeconds = (rustMinutes / 360) * this.settings.nightDurationSeconds;
        const badge = this.dom.threatBadge;

        if (!this.anomaliesStarted && this.gameTimeSeconds < rustThresholdSeconds && rustThresholdSeconds > 0) {
            const secondsLeft = Math.max(0, Math.ceil(rustThresholdSeconds - this.gameTimeSeconds));
            badge.className = 'threat-badge threat-safe';
            badge.textContent = `RUSTFASE TOT 00:45 (${secondsLeft}s)`;
            this.audio.setDangerLevel(0);
            return;
        }

        const count = this.activeAnomalies.length;
        const max = this.settings.maxAnomalies;

        badge.className = 'threat-badge';
        if (count === 0) {
            badge.classList.add('threat-safe');
            badge.textContent = `VEILIG (${count}/${max})`;
        } else if (count === 1) {
            badge.classList.add('threat-warning');
            badge.textContent = `AFWIJKING ACTIEF (1/${max})`;
        } else if (count === 2) {
            badge.classList.add('threat-warning');
            badge.textContent = `WAARSCHUWING (2/${max})`;
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

            // Keep the action moving: schedule next anomaly promptly
            this.scheduleNextAnomaly(true);
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
        this.applyPanZoom(true);
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    resetPanZoom() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyPanZoom(false);
    }

    // Mobile Touch Gesture Handlers (Swipe camera, pinch-zoom, pan, double-tap reset)
    handleTouchStart(e) {
        if (!this.isRunning || this.isReporting) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const now = Date.now();

            // Double tap to quickly reset zoom & pan
            if (now - this.lastTapTime < 320) {
                this.resetPanZoom();
                this.lastTapTime = 0;
                if (e.cancelable) e.preventDefault();
                return;
            }
            this.lastTapTime = now;

            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchCurrentX = touch.clientX;
            this.touchCurrentY = touch.clientY;

            if (this.zoom > 1.0) {
                this.isDragging = true;
                this.dragStartX = touch.clientX - this.panX;
                this.dragStartY = touch.clientY - this.panY;
            }
        } else if (e.touches.length === 2) {
            // Multi-touch pinch zoom init
            this.isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.initialPinchDist = Math.hypot(dx, dy);
            this.initialZoom = this.zoom;
            if (e.cancelable) e.preventDefault();
        }
    }

    handleTouchMove(e) {
        if (!this.isRunning || this.isReporting) return;

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchCurrentX = touch.clientX;
            this.touchCurrentY = touch.clientY;

            if (this.zoom > 1.0 && this.isDragging) {
                if (e.cancelable) e.preventDefault();
                const maxPanX = (this.dom.viewport.clientWidth * (this.zoom - 1)) / 2;
                const maxPanY = (this.dom.viewport.clientHeight * (this.zoom - 1)) / 2;
                this.panX = Math.max(-maxPanX, Math.min(maxPanX, touch.clientX - this.dragStartX));
                this.panY = Math.max(-maxPanY, Math.min(maxPanY, touch.clientY - this.dragStartY));
                this.applyPanZoom(true);
            } else if (this.zoom === 1.0 && this.touchStartX !== null) {
                // If user is swiping horizontally on unzoomed camera, prevent browser navigation/scrolling
                const dx = Math.abs(touch.clientX - this.touchStartX);
                const dy = Math.abs(touch.clientY - this.touchStartY);
                if (dx > 10 && dx > dy && e.cancelable) {
                    e.preventDefault();
                }
            }
        } else if (e.touches.length === 2 && this.initialPinchDist) {
            if (e.cancelable) e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDist = Math.hypot(dx, dy);
            if (this.initialPinchDist > 0) {
                const factor = currentDist / this.initialPinchDist;
                this.zoom = Math.max(1.0, Math.min(2.5, this.initialZoom * factor));
                if (this.zoom === 1.0) {
                    this.panX = 0;
                    this.panY = 0;
                }
                this.applyPanZoom(true);
            }
        }
    }

    handleTouchEnd(e) {
        if (e && e.changedTouches && e.changedTouches.length > 0) {
            this.touchCurrentX = e.changedTouches[0].clientX;
            this.touchCurrentY = e.changedTouches[0].clientY;
        }

        if (this.zoom === 1.0 && this.touchStartX !== null && this.touchCurrentX !== null) {
            const deltaX = this.touchCurrentX - this.touchStartX;
            const deltaY = this.touchCurrentY - this.touchStartY;
            // Horizontal swipe detection (> 30px threshold, horizontal dominance)
            if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
                if (deltaX < 0) {
                    // Swipe left -> Next camera
                    this.showCamera((this.currentCamIndex + 1) % this.cameras.length);
                } else {
                    // Swipe right -> Previous camera
                    this.showCamera((this.currentCamIndex - 1 + this.cameras.length) % this.cameras.length);
                }
            }
        }

        this.isDragging = false;
        this.touchStartX = null;
        this.touchStartY = null;
        this.touchCurrentX = null;
        this.touchCurrentY = null;
        this.initialPinchDist = null;
    }

    applyPanZoom(immediate = false) {
        if (immediate) {
            this.dom.feedContainer.style.transition = 'none';
        } else {
            this.dom.feedContainer.style.transition = 'transform 0.18s cubic-bezier(0.2, 0.9, 0.4, 1)';
        }
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

    // High Performance Static Noise Generator (Pre-computed frames, zero GC pauses)
    initNoiseCanvas() {
        this.noiseCanvas = this.dom.noiseCanvas;
        this.noiseCtx = this.noiseCanvas.getContext('2d');
        this.noiseFrames = [];
        this.noiseFrameIndex = 0;
        this.lastNoiseTime = 0;
        this.resizeNoiseCanvas();
        this.renderNoiseLoop();
    }

    resizeNoiseCanvas() {
        if (!this.noiseCanvas || !this.noiseCtx) return;
        const w = 240;
        const h = 135;
        this.noiseCanvas.width = w;
        this.noiseCanvas.height = h;

        this.noiseFrames = [];
        for (let f = 0; f < 5; f++) {
            const imgData = this.noiseCtx.createImageData(w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const val = (Math.random() * 255) | 0;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
                data[i + 3] = 40; // subtle authentic CRT grain
            }
            this.noiseFrames.push(imgData);
        }
    }

    renderNoiseLoop(timestamp) {
        if (!this.noiseCtx || !this.noiseFrames || this.noiseFrames.length === 0) return;
        
        // Refresh noise at ~15 FPS to eliminate CPU drain and keep touch 60 FPS smooth
        if (!timestamp || timestamp - this.lastNoiseTime > 60) {
            this.lastNoiseTime = timestamp || 0;
            this.noiseFrameIndex = (this.noiseFrameIndex + 1) % this.noiseFrames.length;
            this.noiseCtx.putImageData(this.noiseFrames[this.noiseFrameIndex], 0, 0);
        }

        requestAnimationFrame((t) => this.renderNoiseLoop(t));
    }

    // End Game Screens
    triggerGameOver(reason) {
        this.isRunning = false;
        clearInterval(this.clockInterval);
        clearTimeout(this.spawnTimeout);
        this.audio.playGameOver();

        const timeSurvivedText = this.dom.clockTime.textContent;
        document.getElementById('gameover-reason').textContent = reason;
        document.getElementById('stat-time-survived').textContent = timeSurvivedText;
        document.getElementById('stat-reports-sent').textContent = this.stats.reportsTotal;
        document.getElementById('stat-success-rate').textContent = this.stats.reportsTotal > 0 
            ? Math.round((this.stats.reportsSuccess / this.stats.reportsTotal) * 100) + '%' : '0%';

        // Get player name and ensure it's displayed
        const playerName = (this.dom.gameoverPlayerName && this.dom.gameoverPlayerName.value.trim())
            || (this.dom.startPlayerName && this.dom.startPlayerName.value.trim())
            || this.playerName
            || 'Conciërge';

        this.playerName = playerName;
        if (this.dom.gameoverPlayerName) {
            this.dom.gameoverPlayerName.value = playerName;
        }

        // Automatically record the defeat on the leaderboard!
        this.lastRunId = this.saveRunScore(playerName, false, this.isEndless, false);
        this.runScoreSaved = true;

        if (this.dom.gameoverSaveStatus) {
            this.dom.gameoverSaveStatus.textContent = `✅ Resultaat genoteerd op bord als: ${playerName}`;
            this.dom.gameoverSaveStatus.style.color = 'var(--cctv-green)';
        }

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

        const playerName = (this.dom.victoryPlayerName && this.dom.victoryPlayerName.value.trim())
            || (this.dom.startPlayerName && this.dom.startPlayerName.value.trim())
            || this.playerName
            || 'Meester Conciërge';

        this.playerName = playerName;
        if (this.dom.victoryPlayerName) {
            this.dom.victoryPlayerName.value = playerName;
        }

        // Automatically record the victory on the leaderboard!
        this.lastRunId = this.saveRunScore(playerName, true, false, false);
        this.runScoreSaved = true;

        if (this.dom.victorySaveStatus) {
            this.dom.victorySaveStatus.textContent = `🏆 Overwinning genoteerd op de erelijst als: ${playerName}`;
            this.dom.victorySaveStatus.style.color = 'var(--cctv-green)';
        }

        this.dom.victoryScreen.style.display = 'flex';
    }

    // UI Builders
    renderCameraButtons() {
        const container = this.dom.camNavGroup;
        container.innerHTML = '';

        const shortNames = [
            'Kluisjes',
            'Fietsen',
            'B011',
            'Trap'
        ];

        this.cameras.forEach((cam, idx) => {
            const btn = document.createElement('button');
            btn.className = 'cam-btn' + (idx === 0 ? ' active' : '');
            btn.innerHTML = `<span class="cam-key-hint">${idx + 1}</span> <span class="cam-btn-name">${shortNames[idx] || cam.name}</span>`;
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
        const dummyNames = ['Hoofdconciërge Bert', 'Conciërge Theo', 'Stagiair Rick', 'Avondconciërge Jan'];
        const cleanList = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.filter(item => item && item.name && !dummyNames.includes(item.name.trim()));
        };

        const storedV2 = localStorage.getItem('concierge_leaderboard_v2');
        if (storedV2) {
            try {
                return cleanList(JSON.parse(storedV2));
            } catch(e) {}
        }

        // Migrate from v1 if present, but strictly remove any preset dummy names
        const storedV1 = localStorage.getItem('concierge_leaderboard_v1');
        if (storedV1) {
            try {
                const migrated = cleanList(JSON.parse(storedV1));
                localStorage.setItem('concierge_leaderboard_v2', JSON.stringify(migrated));
                localStorage.removeItem('concierge_leaderboard_v1');
                return migrated;
            } catch(e) {}
        }

        // Strictly empty by default - no preset dummy names!
        return [];
    }

    saveRunScore(playerName, isVictory, isEndless = false, showModal = true, existingId = null) {
        const list = this.loadLeaderboard();
        const total = Math.max(1, this.stats.reportsTotal);
        const acc = Math.round((this.stats.reportsSuccess / total) * 100);
        const clockStr = this.dom.clockTime.textContent;

        let timeLabel = clockStr;
        if (isVictory) {
            timeLabel = '06:00 AM (OVERLEEFD)';
        } else if (isEndless) {
            timeLabel = `${clockStr} (Endless)`;
        }

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth()+1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let entryId = existingId;
        const existingIdx = existingId ? list.findIndex(e => e.id === existingId) : -1;

        if (existingIdx !== -1) {
            // Update existing entry if user customized their name
            list[existingIdx].name = playerName;
            list[existingIdx].timeSurvived = timeLabel;
            list[existingIdx].survivedSeconds = this.gameTimeSeconds;
            list[existingIdx].reportsSuccess = this.stats.reportsSuccess;
            list[existingIdx].accuracy = isVictory && this.stats.reportsTotal === 0 ? 100 : acc;
            list[existingIdx].victory = isVictory;
            list[existingIdx].isEndless = isEndless;
        } else {
            entryId = 'run_' + Date.now();
            const entry = {
                id: entryId,
                name: playerName,
                timeSurvived: timeLabel,
                survivedSeconds: this.gameTimeSeconds,
                reportsSuccess: this.stats.reportsSuccess,
                accuracy: isVictory && this.stats.reportsTotal === 0 ? 100 : acc,
                date: dateStr,
                victory: isVictory,
                isEndless: isEndless
            };
            list.push(entry);
        }

        // Sort: longest survivedSeconds first, then highest accuracy
        list.sort((a, b) => {
            if (b.survivedSeconds !== a.survivedSeconds) return b.survivedSeconds - a.survivedSeconds;
            return b.accuracy - a.accuracy;
        });

        // Save top 25
        const topList = list.slice(0, 25);
        localStorage.setItem('concierge_leaderboard_v2', JSON.stringify(topList));
        localStorage.removeItem('concierge_leaderboard_v1');

        this.renderLeaderboard(entryId);
        if (showModal) {
            this.openModal(this.dom.leaderboardModal);
        }
        return entryId;
    }

    renderLeaderboard(highlightId = null) {
        const list = this.loadLeaderboard();
        const tbody = this.dom.leaderboardTbody;
        if (!tbody) return;
        tbody.innerHTML = '';

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #777; padding: 25px; font-style: italic;">Nog geen conciërge runs geregistreerd.<br><span style="font-size: 11px; opacity: 0.8;">Start een dienst om je naam op het bord te zetten!</span></td></tr>`;
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

            let statusBadge = '';
            if (entry.isEndless) {
                statusBadge = `<span class="badge-endless">♾️ ${escapeHTML(entry.timeSurvived)}</span>`;
            } else if (entry.victory) {
                statusBadge = `<span class="badge-survived">🏆 06:00 OVERLEEFD</span>`;
            } else {
                statusBadge = `<span class="badge-failed">❌ ${escapeHTML(entry.timeSurvived)}</span>`;
            }

            tr.innerHTML = `
                <td>${rankBadge}</td>
                <td><strong>${escapeHTML(entry.name)}</strong></td>
                <td>${statusBadge}</td>
                <td style="color: var(--cctv-green);">${entry.reportsSuccess || 0} opgelost</td>
                <td>${entry.accuracy || 0}%</td>
                <td style="font-size: 11px; opacity: 0.7;">${entry.date || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    clearLeaderboard() {
        if (confirm('Weet je zeker dat je het conciërge leaderboard wilt wissen?')) {
            localStorage.removeItem('concierge_leaderboard_v2');
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
