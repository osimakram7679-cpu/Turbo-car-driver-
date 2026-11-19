import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundEngine } from './audio';
import {
  createPickupMesh,
  createPlayerCar,
  createTrafficVehicle,
  disposeSharedAssetCache,
  PlayerCarRig,
  TrafficRig,
} from './models';
import {
  createBuildingFacadeTexture,
  createContactShadowTexture,
  createHeadlightBeamTexture,
  createRoadTexture,
  createShoulderTexture,
  createSignBoardTexture,
  createSkyGradientTexture,
} from './textures';
import {
  CAR_SPECS,
  CarId,
  CameraMode,
  GameHudState,
  GameStatus,
  TRACK_THEMES,
  TrackTheme,
  TrackThemeId,
  UpgradeLevels,
} from './types';

interface PooledTraffic {
  rig: TrafficRig;
  active: boolean;
  lane: number;
  targetLane: number;
  laneChangeState: 'none' | 'signaling' | 'changing';
  signalTimer: number;
  speedMs: number;
  nearMissed: boolean;
}

interface PooledPickup {
  kind: 'coin' | 'nitro' | 'shield' | 'magnet';
  mesh: THREE.Group;
  active: boolean;
  lane: number;
}

interface SceneryProp {
  group: THREE.Group;
  bulbMat?: THREE.MeshStandardMaterial;
}

interface PooledParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  isSmoke: boolean;
  active: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  boost: boolean;
  brake: boolean;
}

const LANE_CENTERS = [-5.1, -1.7, 1.7, 5.1];
const ROAD_WIDTH = 14.2;
const ROAD_LENGTH = 300;
const BEST_SCORE_KEY = 'apex_velocity_best_score_v1';
const COINS_KEY = 'apex_velocity_total_coins_v1';
const UPGRADES_KEY = 'apex_velocity_upgrades_v1';
const TRAFFIC_PALETTE = [0xf8fafc, 0x64748b, 0x10b981, 0x6366f1, 0xeab308, 0xf97316, 0x94a3b8];

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class HighwayEngine {
  private container: HTMLElement;
  private onHudUpdate: (hud: GameHudState) => void;
  private onContextIssue: (lost: boolean) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private isSoftwareGl = false;

  private frameId = 0;
  private disposed = false;

  // Lighting & Atmosphere
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private sunOrb!: THREE.Mesh;
  private sunOrbMat!: THREE.MeshBasicMaterial;
  private currentTheme: TrackTheme = TRACK_THEMES[0];
  private skyTexture: THREE.CanvasTexture | null = null;
  private groundMat!: THREE.MeshStandardMaterial;

  // Road & Textures
  private roadTex!: THREE.CanvasTexture;
  private shoulderTex!: THREE.CanvasTexture;
  private contactShadowTex!: THREE.CanvasTexture;
  private headlightBeamTex!: THREE.CanvasTexture;
  private buildingTex!: THREE.CanvasTexture;
  private roadMat!: THREE.MeshStandardMaterial;

  // Player
  private playerRig!: PlayerCarRig;
  private selectedCarId: CarId = 'crimson';
  private customPaintHex: number | null = null;
  private upgrades: UpgradeLevels = { engine: 0, handling: 0, nitro: 0 };
  private playerX = 1.7;
  private playerVx = 0;
  private playerSpeedMs = 44;
  private invulnTimer = 0;
  private cameraMode: CameraMode = 'chase';
  private shakeIntensity = 0;
  private driftSmokeAccum = 0;

  // Pre-allocated Object Pools (Zero runtime allocations!)
  private trafficPool: PooledTraffic[] = [];
  private trafficSpawnTimer = 0;
  private pickupPool: PooledPickup[] = [];
  private pickupSpawnTimer = 1.4;
  private sceneryProps: SceneryProp[] = [];
  private gantries: THREE.Group[] = [];
  private particlePool: PooledParticle[] = [];
  private speedLines: THREE.Mesh[] = [];

  // Input & State
  public input: InputState = { left: false, right: false, boost: false, brake: false };
  private status: GameStatus = 'menu';
  private countdownTimer = 0;
  private lastBeepStep = 4;
  private score = 0;
  private bestScore = 0;
  private distanceM = 0;
  private nextCheckpointTargetM = 500;
  private nitro = 100;
  private isBoosting = false;
  private armor = 3;
  private readonly maxArmor = 3;
  private coins = 0;
  private totalCoins = 0;
  private nearMisses = 0;
  private comboMultiplier = 1;
  private comboTimer = 0;
  private magnetRemaining = 0;
  private topSpeedReached = 0;
  private eventBanner: string | null = null;
  private bannerTimer = 0;
  private hudEmitAccum = 0;

  private handleResizeBound: () => void;
  private handleVisibilityBound: () => void;
  private handleContextLostBound: (e: Event) => void;
  private handleContextRestoredBound: () => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (hud: GameHudState) => void,
    onContextIssue: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextIssue = onContextIssue;

    try {
      const savedBest = localStorage.getItem(BEST_SCORE_KEY);
      if (savedBest) this.bestScore = parseInt(savedBest, 10) || 0;
      const savedCoins = localStorage.getItem(COINS_KEY);
      if (savedCoins) this.totalCoins = parseInt(savedCoins, 10) || 0;
      const savedUpgrades = localStorage.getItem(UPGRADES_KEY);
      if (savedUpgrades) {
        const parsed = JSON.parse(savedUpgrades) as Partial<UpgradeLevels>;
        this.upgrades = {
          engine: parsed.engine || 0,
          handling: parsed.handling || 0,
          nitro: parsed.nitro || 0,
        };
      }
    } catch {
      // ignore storage errors
    }

    this.handleResizeBound = this.onResize.bind(this);
    this.handleVisibilityBound = () => {
      if (document.visibilityState === 'visible') {
        this.clock.getDelta();
      }
    };
    this.handleContextLostBound = (e: Event) => {
      e.preventDefault();
      this.onContextIssue(true);
    };
    this.handleContextRestoredBound = () => {
      this.onContextIssue(false);
    };

    this.initScene();
    this.emitHud();
    this.clock.start();
    this.startLoop();
  }

  public getUpgrades(): UpgradeLevels {
    return { ...this.upgrades };
  }

  public getTotalCoins(): number {
    return this.totalCoins;
  }

  public purchaseUpgrade(kind: keyof UpgradeLevels, cost: number): boolean {
    if (this.upgrades[kind] >= 3 || this.totalCoins < cost) return false;
    this.totalCoins -= cost;
    this.upgrades[kind] += 1;
    try {
      localStorage.setItem(COINS_KEY, String(this.totalCoins));
      localStorage.setItem(UPGRADES_KEY, JSON.stringify(this.upgrades));
    } catch {
      // ignore
    }
    soundEngine.unlock();
    soundEngine.playCheckpoint();
    this.emitHud();
    return true;
  }

  private initScene(): void {
    this.isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLostBound);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestoredBound);
    window.addEventListener('resize', this.handleResizeBound);
    document.addEventListener('visibilitychange', this.handleVisibilityBound);

    this.scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.2, 460);
    this.camera.position.set(this.playerX, 3.6, 8.2);
    this.camera.lookAt(this.playerX, 1.0, -14);

    this.hemiLight = new THREE.HemisphereLight(
      this.currentTheme.hemiSky,
      this.currentTheme.hemiGround,
      this.currentTheme.hemiIntensity,
    );
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(
      this.currentTheme.sunColor,
      this.currentTheme.sunIntensity,
    );
    this.sunLight.position.set(28, 42, 18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -22;
    this.sunLight.shadow.camera.right = 22;
    this.sunLight.shadow.camera.top = 26;
    this.sunLight.shadow.camera.bottom = -26;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    this.rimLight.position.set(-22, 16, -24);
    this.scene.add(this.rimLight);

    const orbGeo = new THREE.SphereGeometry(14, 24, 16);
    this.sunOrbMat = new THREE.MeshBasicMaterial({
      color: this.currentTheme.sunOrbColor,
      fog: false,
    });
    this.sunOrb = new THREE.Mesh(orbGeo, this.sunOrbMat);
    this.sunOrb.position.set(-24, 34, -270);
    this.scene.add(this.sunOrb);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.roadTex = createRoadTexture(this.currentTheme.asphaltTint, maxAniso);
    this.shoulderTex = createShoulderTexture(maxAniso);
    this.contactShadowTex = createContactShadowTexture();
    this.headlightBeamTex = createHeadlightBeamTexture();
    this.buildingTex = createBuildingFacadeTexture();

    this.buildEnvironment();
    this.buildSceneryPool(maxAniso);
    this.buildSpeedLines();
    this.buildPlayerCar();
    this.initObjectPools();
    this.applyTheme(this.currentTheme.id);

    if (!this.isSoftwareGl) {
      // Pre-compile all pooled meshes & shaders at boot so mid-race spawns never hitch!
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private initObjectPools(): void {
    // 1. Traffic Vehicle Pool (14 sedans, 7 SUVs, 5 trucks)
    const counts: Array<{ kind: 'sedan' | 'suv' | 'truck'; count: number }> = [
      { kind: 'sedan', count: 14 },
      { kind: 'suv', count: 7 },
      { kind: 'truck', count: 5 },
    ];
    for (const entry of counts) {
      for (let i = 0; i < entry.count; i++) {
        const rig = createTrafficVehicle(entry.kind, 0xf8fafc, this.contactShadowTex);
        rig.group.visible = false;
        this.scene.add(rig.group);
        this.trafficPool.push({
          rig,
          active: false,
          lane: 0,
          targetLane: 0,
          laneChangeState: 'none',
          signalTimer: 0,
          speedMs: 26,
          nearMissed: false,
        });
      }
    }

    // 2. Pickup Pool
    const pickupCounts: Array<{ kind: 'coin' | 'nitro' | 'shield' | 'magnet'; count: number }> = [
      { kind: 'coin', count: 14 },
      { kind: 'nitro', count: 4 },
      { kind: 'shield', count: 3 },
      { kind: 'magnet', count: 3 },
    ];
    for (const entry of pickupCounts) {
      for (let i = 0; i < entry.count; i++) {
        const mesh = createPickupMesh(entry.kind, this.contactShadowTex);
        mesh.visible = false;
        this.scene.add(mesh);
        this.pickupPool.push({
          kind: entry.kind,
          mesh,
          active: false,
          lane: 0,
        });
      }
    }

    // 3. Spark & Smoke Particle Pool
    const sparkGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const smokeGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });

    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(sparkGeo, sparkMat);
      m.visible = false;
      this.scene.add(m);
      this.particlePool.push({
        mesh: m,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.6,
        isSmoke: false,
        active: false,
      });
    }
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(smokeGeo, smokeMat);
      m.visible = false;
      this.scene.add(m);
      this.particlePool.push({
        mesh: m,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.28,
        isSmoke: true,
        active: false,
      });
    }
  }

  private buildEnvironment(): void {
    const groundGeo = new THREE.PlaneGeometry(540, ROAD_LENGTH + 160);
    groundGeo.rotateX(-Math.PI / 2);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.groundColor,
      roughness: 0.96,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, this.groundMat);
    ground.position.set(0, -0.04, -ROAD_LENGTH / 2 + 40);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);
    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.72,
      metalness: 0.08,
    });
    const road = new THREE.Mesh(roadGeo, this.roadMat);
    road.position.set(0, 0, -ROAD_LENGTH / 2 + 30);
    road.receiveShadow = true;
    this.scene.add(road);

    const shoulderGeo = new THREE.PlaneGeometry(1.6, ROAD_LENGTH);
    shoulderGeo.rotateX(-Math.PI / 2);
    const shoulderMat = new THREE.MeshStandardMaterial({
      map: this.shoulderTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const shoulderL = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderL.position.set(-ROAD_WIDTH / 2 - 0.8, 0.015, -ROAD_LENGTH / 2 + 30);
    shoulderL.receiveShadow = true;

    const shoulderR = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulderR.rotation.y = Math.PI;
    shoulderR.position.set(ROAD_WIDTH / 2 + 0.8, 0.015, -ROAD_LENGTH / 2 + 30);
    shoulderR.receiveShadow = true;
    this.scene.add(shoulderL, shoulderR);

    const railGeo = new THREE.BoxGeometry(0.18, 0.42, ROAD_LENGTH);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.78,
      roughness: 0.32,
    });
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-ROAD_WIDTH / 2 - 1.55, 0.45, -ROAD_LENGTH / 2 + 30);
    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(ROAD_WIDTH / 2 + 1.55, 0.45, -ROAD_LENGTH / 2 + 30);
    this.scene.add(railL, railR);
  }

  private buildSceneryPool(maxAniso: number): void {
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.7,
      roughness: 0.35,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.9,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x1e4620,
      roughness: 0.85,
    });
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x574c45,
      roughness: 0.92,
      flatShading: true,
    });
    const buildingMat = new THREE.MeshStandardMaterial({
      map: this.buildingTex,
      roughness: 0.55,
      metalness: 0.2,
    });

    const poleGeo = new THREE.CylinderGeometry(0.1, 0.13, 6.2, 8);
    const armGeo = new THREE.BoxGeometry(1.9, 0.1, 0.12);
    const bulbGeo = new THREE.BoxGeometry(0.45, 0.1, 0.24);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 7);
    const crownGeo = new THREE.ConeGeometry(1.6, 4.2, 7);
    const rockGeo = new THREE.DodecahedronGeometry(2.6, 0);
    const bldgGeo = new THREE.BoxGeometry(10, 28, 10);

    const count = 14;
    const spacing = 20;

    for (let i = 0; i < count; i++) {
      const z = 20 - i * spacing;

      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(0, 0, z);

        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(side * 9.2, 3.1, 0);
        g.add(pole);

        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(side * 8.35, 6.1, 0);
        g.add(arm);

        const bulbMat = new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: 0xfbbf24,
          emissiveIntensity: 1.8,
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(side * 7.55, 6.02, 0);
        g.add(bulb);

        const treeX = side * (13.5 + ((i * 7 + (side > 0 ? 3 : 0)) % 9));
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(treeX, 1.1, 4);
        const crown = new THREE.Mesh(crownGeo, foliageMat);
        crown.position.set(treeX, 4.1, 4);
        g.add(trunk, crown);

        if (i % 2 === 0) {
          const rock = new THREE.Mesh(rockGeo, rockMat);
          const rx = side * (24 + ((i * 11) % 14));
          rock.position.set(rx, 1.3, -4);
          rock.scale.set(1.4 + (i % 3) * 0.4, 0.9 + (i % 4) * 0.5, 1.5);
          rock.rotation.y = i * 0.8;
          g.add(rock);
        }

        if (i % 2 === 1) {
          const bldg = new THREE.Mesh(bldgGeo, buildingMat);
          const hScale = 0.7 + ((i * 5 + (side > 0 ? 2 : 0)) % 5) * 0.35;
          bldg.scale.set(1.0 + (i % 2) * 0.4, hScale, 1.0);
          bldg.position.set(side * (42 + ((i * 9) % 20)), 14 * hScale, 0);
          g.add(bldg);
        }

        this.scene.add(g);
        this.sceneryProps.push({ group: g, bulbMat });
      }
    }

    const gantryLabels = [
      { title: 'APEX EXPRESSWAY', sub: 'NO SPEED LIMIT · KEEP CLEAR' },
      { title: 'METRO SKYLINE 04', sub: 'CHECKPOINT AHEAD · 500M' },
    ];
    const gantryPostGeo = new THREE.CylinderGeometry(0.24, 0.28, 7.6, 10);
    const gantryBeamGeo = new THREE.BoxGeometry(19.2, 0.42, 0.42);
    const signGeo = new THREE.BoxGeometry(8.2, 2.05, 0.18);

    gantryLabels.forEach((lbl, idx) => {
      const gantry = new THREE.Group();
      gantry.position.set(0, 0, -90 - idx * 140);

      const postL = new THREE.Mesh(gantryPostGeo, poleMat);
      postL.position.set(-9.3, 3.8, 0);
      const postR = new THREE.Mesh(gantryPostGeo, poleMat);
      postR.position.set(9.3, 3.8, 0);
      const beam = new THREE.Mesh(gantryBeamGeo, poleMat);
      beam.position.set(0, 7.45, 0);

      const signTex = createSignBoardTexture(lbl.title, lbl.sub, maxAniso);
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, 7.45, 0.26);

      gantry.add(postL, postR, beam, sign);
      this.scene.add(gantry);
      this.gantries.push(gantry);
    });
  }

  private buildSpeedLines(): void {
    const lineGeo = new THREE.BoxGeometry(0.03, 0.03, 4.5);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.38,
    });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(lineGeo, lineMat);
      m.position.set(
        (Math.random() - 0.5) * 16,
        0.9 + Math.random() * 2.8,
        -Math.random() * 80,
      );
      m.visible = false;
      this.scene.add(m);
      this.speedLines.push(m);
    }
  }

  private buildPlayerCar(): void {
    const spec = CAR_SPECS.find((c) => c.id === this.selectedCarId) || CAR_SPECS[0];
    this.playerRig = createPlayerCar(
      this.customPaintHex ?? spec.hexBody,
      spec.hexAccent,
      this.contactShadowTex,
      this.headlightBeamTex,
    );
    this.playerRig.group.position.set(this.playerX, 0, 0);
    this.scene.add(this.playerRig.group);
  }

  public setCar(carId: CarId): void {
    this.selectedCarId = carId;
    const spec = CAR_SPECS.find((c) => c.id === carId) || CAR_SPECS[0];
    this.playerRig.paintMaterial.color.setHex(this.customPaintHex ?? spec.hexBody);
    this.playerRig.accentMaterial.color.setHex(spec.hexAccent);
  }

  public setPaint(hex: number | null): void {
    this.customPaintHex = hex;
    const spec = CAR_SPECS.find((c) => c.id === this.selectedCarId) || CAR_SPECS[0];
    this.playerRig.paintMaterial.color.setHex(hex ?? spec.hexBody);
  }

  public setTheme(themeId: TrackThemeId): void {
    this.applyTheme(themeId);
  }

  private applyTheme(themeId: TrackThemeId): void {
    const theme = TRACK_THEMES.find((t) => t.id === themeId) || TRACK_THEMES[0];
    this.currentTheme = theme;

    if (this.skyTexture) this.skyTexture.dispose();
    this.skyTexture = createSkyGradientTexture(theme.skyTop, theme.skyHorizon);
    this.scene.background = this.skyTexture;
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);

    this.sunLight.color.setHex(theme.sunColor);
    this.sunLight.intensity = theme.sunIntensity;
    this.hemiLight.color.setHex(theme.hemiSky);
    this.hemiLight.groundColor.setHex(theme.hemiGround);
    this.hemiLight.intensity = theme.hemiIntensity;
    this.groundMat.color.setHex(theme.groundColor);
    this.sunOrbMat.color.setHex(theme.sunOrbColor);

    this.playerRig.headlightBeamMat.opacity = theme.streetLightsOn ? 0.58 : 0.14;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const newRoadTex = createRoadTexture(theme.asphaltTint, maxAniso);
    newRoadTex.offset.copy(this.roadTex.offset);
    this.roadTex.dispose();
    this.roadTex = newRoadTex;
    this.roadMat.map = newRoadTex;
    this.roadMat.needsUpdate = true;

    for (const prop of this.sceneryProps) {
      if (prop.bulbMat) {
        prop.bulbMat.emissiveIntensity = theme.streetLightsOn ? 2.2 : 0.0;
        prop.bulbMat.color.setHex(theme.streetLightsOn ? 0xfef3c7 : 0x64748b);
      }
    }
  }

  public cycleCamera(): CameraMode {
    const order: CameraMode[] = ['chase', 'far', 'hood'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    return this.cameraMode;
  }

  public startRace(): void {
    soundEngine.unlock();
    this.clearEntities();

    this.status = 'countdown';
    this.countdownTimer = 2.4;
    this.lastBeepStep = 4;

    this.score = 0;
    this.distanceM = 0;
    this.nextCheckpointTargetM = 500;
    this.nitro = 100;
    this.isBoosting = false;
    this.armor = this.maxArmor;
    this.coins = 0;
    this.nearMisses = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.magnetRemaining = 0;
    this.topSpeedReached = 0;
    this.eventBanner = null;
    this.bannerTimer = 0;
    this.invulnTimer = 0;
    this.shakeIntensity = 0;
    this.playerX = 1.7;
    this.playerVx = 0;
    this.playerSpeedMs = 28;
    this.trafficSpawnTimer = 0.5;
    this.pickupSpawnTimer = 1.1;

    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.playerX, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);

    this.clock.getDelta();
    this.emitHud();
  }

  public togglePause(): GameStatus {
    if (this.status === 'playing') {
      this.status = 'paused';
      this.input.left = false;
      this.input.right = false;
      this.input.boost = false;
      this.input.brake = false;
      soundEngine.updateEngine(0, false, false);
    } else if (this.status === 'paused') {
      this.status = 'playing';
      this.clock.getDelta();
    }
    this.emitHud();
    return this.status;
  }

  public returnToMenu(): void {
    this.clearEntities();
    this.status = 'menu';
    this.playerX = 1.7;
    this.playerVx = 0;
    this.playerSpeedMs = 34;
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.playerX, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);
    for (const f of this.playerRig.flames) f.visible = false;
    soundEngine.updateEngine(0, false, false);
    this.emitHud();
  }

  private clearEntities(): void {
    for (const t of this.trafficPool) {
      t.active = false;
      t.rig.group.visible = false;
    }
    for (const p of this.pickupPool) {
      p.active = false;
      p.mesh.visible = false;
    }
    for (const s of this.particlePool) {
      s.active = false;
      s.mesh.visible = false;
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.045);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private getEffectiveStats() {
    const spec = CAR_SPECS.find((c) => c.id === this.selectedCarId) || CAR_SPECS[0];
    return {
      topSpeedKmh: spec.topSpeedKmh + this.upgrades.engine * 14,
      handling: spec.handling + this.upgrades.handling * 0.09,
      nitroCapacity: spec.nitroCapacity + this.upgrades.nitro * 0.14,
    };
  }

  private update(dt: number): void {
    if (this.status === 'paused') return;

    const stats = this.getEffectiveStats();
    const maxCruiseMs = (stats.topSpeedKmh / 3.6) * 0.78 + Math.min(20, this.distanceM * 0.0025);
    const boostMaxMs = (stats.topSpeedKmh / 3.6) * 1.15;

    if (this.status === 'menu') {
      this.playerSpeedMs = THREE.MathUtils.damp(this.playerSpeedMs, 34, 3, dt);
      this.scrollWorld(dt, this.playerSpeedMs);
      const t = this.clock.elapsedTime;
      const targetX = Math.sin(t * 0.45) * 2.2;
      this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 2.5, dt);
      this.playerRig.group.position.x = this.playerX;
      this.spinWheels(dt, this.playerSpeedMs);

      _camTargetPos.set(this.playerX * 0.7 + 3.1, 2.5, 6.4);
      _camLookAt.set(this.playerX * 0.4, 0.85, -8);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-3 * dt));
      this.camera.lookAt(_camLookAt);
      return;
    }

    if (this.status === 'countdown') {
      this.countdownTimer -= dt;
      const step = Math.ceil(this.countdownTimer / 0.8);
      if (step < this.lastBeepStep && step >= 1 && step <= 3) {
        this.lastBeepStep = step;
        soundEngine.playCountdown(false);
        this.emitHud();
      }

      this.playerSpeedMs = THREE.MathUtils.damp(this.playerSpeedMs, 38, 2.5, dt);
      this.scrollWorld(dt, this.playerSpeedMs);
      this.spinWheels(dt, this.playerSpeedMs);

      const tNorm = THREE.MathUtils.clamp(1 - this.countdownTimer / 2.4, 0, 1);
      const angle = (1 - tNorm) * 0.95;
      _camTargetPos.set(
        this.playerX + Math.sin(angle) * 5.2,
        THREE.MathUtils.lerp(2.2, 3.25, tNorm),
        THREE.MathUtils.lerp(4.6, 7.6, tNorm),
      );
      _camLookAt.set(this.playerX * 0.9, 1.0, -14);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
      this.camera.lookAt(_camLookAt);

      soundEngine.updateEngine(0.25 + tNorm * 0.25, false, true);

      if (this.countdownTimer <= 0) {
        this.status = 'playing';
        soundEngine.playCountdown(true);
        this.showBanner('GO! FULL THROTTLE');
        this.emitHud();
      }
      return;
    }

    if (this.status === 'gameover') {
      this.playerSpeedMs = THREE.MathUtils.damp(this.playerSpeedMs, 0, 2.5, dt);
      this.scrollWorld(dt, this.playerSpeedMs);
      this.updateParticles(dt);
      soundEngine.updateEngine(0, false, false);
      return;
    }

    // === PLAYING STATE ===
    const wantsBoost = this.input.boost && this.nitro > 1;
    this.isBoosting = wantsBoost;

    if (this.isBoosting) {
      const drainRate = 27 / stats.nitroCapacity;
      this.nitro = Math.max(0, this.nitro - drainRate * dt);
      this.playerSpeedMs = THREE.MathUtils.damp(this.playerSpeedMs, boostMaxMs, 4.4, dt);
    } else {
      const regenRate = 5.5 * stats.nitroCapacity;
      this.nitro = Math.min(100, this.nitro + regenRate * dt);
      const targetSpeed = this.input.brake ? maxCruiseMs * 0.56 : maxCruiseMs;
      this.playerSpeedMs = THREE.MathUtils.damp(
        this.playerSpeedMs,
        targetSpeed,
        this.input.brake ? 5.5 : 2.1,
        dt,
      );
    }

    for (const flame of this.playerRig.flames) {
      flame.visible = this.isBoosting;
      if (this.isBoosting) {
        flame.scale.set(
          0.9 + Math.random() * 0.35,
          0.9 + Math.random() * 0.35,
          0.85 + Math.random() * 0.5,
        );
      }
    }

    this.playerRig.tailLightMaterial.emissiveIntensity = this.input.brake ? 4.2 : 1.8;

    let steerInput = 0;
    if (this.input.left) steerInput -= 1;
    if (this.input.right) steerInput += 1;

    const maxLateralSpeed = 13.5 * stats.handling;
    const targetVx = steerInput * maxLateralSpeed;
    this.playerVx = THREE.MathUtils.damp(this.playerVx, targetVx, 11.5, dt);
    this.playerX += this.playerVx * dt;

    const maxBound = ROAD_WIDTH / 2 - 1.15;
    if (this.playerX < -maxBound) {
      this.playerX = -maxBound;
      this.playerVx = Math.max(0, this.playerVx);
    } else if (this.playerX > maxBound) {
      this.playerX = maxBound;
      this.playerVx = Math.min(0, this.playerVx);
    }

    this.playerRig.group.position.x = this.playerX;

    const targetRoll = -this.playerVx * 0.011;
    const targetYaw = -this.playerVx * 0.016;
    this.playerRig.bodyPivot.rotation.z = THREE.MathUtils.damp(
      this.playerRig.bodyPivot.rotation.z,
      targetRoll,
      12,
      dt,
    );
    this.playerRig.bodyPivot.rotation.y = THREE.MathUtils.damp(
      this.playerRig.bodyPivot.rotation.y,
      targetYaw,
      12,
      dt,
    );

    for (const pivot of this.playerRig.frontWheelPivots) {
      pivot.rotation.y = THREE.MathUtils.damp(
        pivot.rotation.y,
        -steerInput * 0.28,
        14,
        dt,
      );
    }

    if (Math.abs(this.playerVx) > 7.5 && this.playerSpeedMs > 36) {
      this.driftSmokeAccum += dt;
      if (this.driftSmokeAccum > 0.05) {
        this.driftSmokeAccum = 0;
        this.spawnDriftSmoke();
      }
    }

    this.spinWheels(dt, this.playerSpeedMs);

    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
      this.playerRig.group.visible = Math.floor(this.invulnTimer * 16) % 2 === 0;
    } else {
      this.playerRig.group.visible = true;
    }

    this.scrollWorld(dt, this.playerSpeedMs);
    this.distanceM += this.playerSpeedMs * dt;

    if (this.distanceM >= this.nextCheckpointTargetM) {
      this.nextCheckpointTargetM += 500;
      this.score += 500;
      this.nitro = Math.min(100, this.nitro + 25);
      this.showBanner('CHECKPOINT CLEARED · +500');
      soundEngine.playCheckpoint();
    }

    if (this.magnetRemaining > 0) {
      this.magnetRemaining = Math.max(0, this.magnetRemaining - dt);
    }

    const speedKmh = Math.round(this.playerSpeedMs * 3.6);
    if (speedKmh > this.topSpeedReached) this.topSpeedReached = speedKmh;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboMultiplier = 1;
      }
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.eventBanner = null;
      }
    }

    const boostMult = this.isBoosting ? 2 : 1;
    this.score += this.playerSpeedMs * dt * 1.4 * boostMult * this.comboMultiplier;
    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score);
    }

    this.updateTraffic(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateSpeedLines(dt);
    this.updateCamera(dt, speedKmh);

    const speedRatio = THREE.MathUtils.clamp((speedKmh - 80) / 240, 0, 1);
    soundEngine.updateEngine(speedRatio, this.isBoosting, true);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.066) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private scrollWorld(dt: number, speedMs: number): void {
    const tileMeters = ROAD_LENGTH / 3;
    this.roadTex.offset.y = (this.roadTex.offset.y + (speedMs * dt) / tileMeters) % 1;
    this.shoulderTex.offset.y = (this.shoulderTex.offset.y + (speedMs * dt) / 50) % 1;

    for (const prop of this.sceneryProps) {
      prop.group.position.z += speedMs * dt;
      if (prop.group.position.z > 28) {
        prop.group.position.z -= 280;
      }
    }

    for (const gantry of this.gantries) {
      gantry.position.z += speedMs * dt;
      if (gantry.position.z > 24) {
        gantry.position.z -= 280;
      }
    }
  }

  private spinWheels(dt: number, speedMs: number): void {
    const angularVel = speedMs / 0.36;
    for (const w of this.playerRig.wheels) {
      w.rotation.x -= angularVel * dt;
    }
  }

  private updateTraffic(dt: number): void {
    this.trafficSpawnTimer -= dt;
    const difficulty = Math.min(1, this.distanceM / 4500);
    const spawnInterval = THREE.MathUtils.lerp(1.12, 0.45, difficulty);

    if (this.trafficSpawnTimer <= 0) {
      this.trafficSpawnTimer = spawnInterval * (0.8 + Math.random() * 0.45);
      this.spawnTrafficWave(difficulty);
    }

    const playerHalfW = 0.92;
    const playerHalfL = 2.08;
    const blinkOn = Math.floor(this.clock.elapsedTime * 8) % 2 === 0;

    for (let i = 0; i < this.trafficPool.length; i++) {
      const t = this.trafficPool[i];
      if (!t.active) continue;

      // Prevent traffic cars from rear-ending / clipping inside slower vehicles in front
      let effectiveSpeed = t.speedMs;
      for (let j = 0; j < this.trafficPool.length; j++) {
        if (i === j) continue;
        const ahead = this.trafficPool[j];
        if (!ahead.active) continue;
        if (Math.abs(ahead.rig.group.position.x - t.rig.group.position.x) < 1.8) {
          const gap = t.rig.group.position.z - ahead.rig.group.position.z;
          const minGap = t.rig.halfLength + ahead.rig.halfLength + 4.5;
          if (gap > 0 && gap < minGap) {
            effectiveSpeed = Math.min(effectiveSpeed, ahead.speedMs);
          }
        }
      }

      const relSpeed = this.playerSpeedMs - effectiveSpeed;
      t.rig.group.position.z += relSpeed * dt;

      if (t.laneChangeState === 'signaling') {
        t.signalTimer -= dt;
        const goingLeft = t.targetLane < t.lane;
        t.rig.blinkerLMat.color.setHex(goingLeft && blinkOn ? 0xf59e0b : 0x451a03);
        t.rig.blinkerRMat.color.setHex(!goingLeft && blinkOn ? 0xf59e0b : 0x451a03);
        if (t.signalTimer <= 0) {
          // Verify destination lane is still clear before shifting
          let blocked = false;
          const destX = LANE_CENTERS[t.targetLane];
          for (let j = 0; j < this.trafficPool.length; j++) {
            if (i === j) continue;
            const other = this.trafficPool[j];
            if (!other.active) continue;
            if (
              Math.abs(other.rig.group.position.x - destX) < 1.8 &&
              Math.abs(other.rig.group.position.z - t.rig.group.position.z) < 12
            ) {
              blocked = true;
              break;
            }
          }
          if (blocked) {
            t.laneChangeState = 'none';
            t.rig.blinkerLMat.color.setHex(0x451a03);
            t.rig.blinkerRMat.color.setHex(0x451a03);
          } else {
            t.laneChangeState = 'changing';
          }
        }
      } else if (t.laneChangeState === 'changing') {
        const destX = LANE_CENTERS[t.targetLane];
        const goingLeft = t.targetLane < t.lane;
        t.rig.blinkerLMat.color.setHex(goingLeft && blinkOn ? 0xf59e0b : 0x451a03);
        t.rig.blinkerRMat.color.setHex(!goingLeft && blinkOn ? 0xf59e0b : 0x451a03);

        t.rig.group.position.x = THREE.MathUtils.damp(t.rig.group.position.x, destX, 4.5, dt);
        if (Math.abs(t.rig.group.position.x - destX) < 0.06) {
          t.rig.group.position.x = destX;
          t.lane = t.targetLane;
          t.laneChangeState = 'none';
          t.rig.blinkerLMat.color.setHex(0x451a03);
          t.rig.blinkerRMat.color.setHex(0x451a03);
        }
      }

      for (const w of t.rig.wheels) {
        w.rotation.x -= (effectiveSpeed / 0.36) * dt;
      }

      const dz = Math.abs(t.rig.group.position.z);
      const dx = Math.abs(t.rig.group.position.x - this.playerX);

      const closeBehind = t.rig.group.position.z < -2 && t.rig.group.position.z > -24 && dx < 2.2;
      t.rig.tailLightMat.emissiveIntensity = closeBehind ? 3.5 : 1.3;

      if (
        this.invulnTimer <= 0 &&
        dx < playerHalfW + t.rig.halfWidth - 0.16 &&
        dz < playerHalfL + t.rig.halfLength - 0.22
      ) {
        this.handleCollision(t);
        continue;
      } else if (
        !t.nearMissed &&
        t.rig.group.position.z > 0.8 &&
        t.rig.group.position.z < 5.5 &&
        dx < playerHalfW + t.rig.halfWidth + 1.15 &&
        this.playerSpeedMs > 32
      ) {
        t.nearMissed = true;
        this.nearMisses += 1;
        this.comboMultiplier = Math.min(5, this.comboMultiplier + 1);
        this.comboTimer = 4.5;
        const bonus = 150 * this.comboMultiplier;
        this.score += bonus;
        this.nitro = Math.min(100, this.nitro + 14);
        this.showBanner(`NEAR MISS +${bonus} · ${this.comboMultiplier}x COMBO`);
        soundEngine.playNearMiss();
      }

      if (t.rig.group.position.z > 28 || t.rig.group.position.z < -265) {
        t.active = false;
        t.rig.group.visible = false;
      }
    }
  }

  private spawnTrafficWave(difficulty: number): void {
    const spawnZ = -220 - Math.random() * 15;
    const occupiedLanes = new Set<number>();

    for (const existing of this.trafficPool) {
      if (!existing.active) continue;
      if (Math.abs(existing.rig.group.position.z - spawnZ) < 28 || existing.rig.group.position.z < -170) {
        occupiedLanes.add(existing.lane);
      }
    }
    if (occupiedLanes.size >= 3) return;

    const freeLanes = [0, 1, 2, 3].filter((l) => !occupiedLanes.has(l));
    if (freeLanes.length === 0) return;

    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    const r = Math.random();
    const kind: 'sedan' | 'suv' | 'truck' =
      r < 0.55 ? 'sedan' : r < 0.82 ? 'suv' : 'truck';

    // Pull an inactive vehicle of the requested kind from the pool
    const pooled = this.trafficPool.find((t) => !t.active && t.rig.kind === kind);
    if (!pooled) return;

    const color = TRAFFIC_PALETTE[Math.floor(Math.random() * TRAFFIC_PALETTE.length)];
    pooled.rig.bodyMat.color.setHex(color);
    pooled.rig.blinkerLMat.color.setHex(0x451a03);
    pooled.rig.blinkerRMat.color.setHex(0x451a03);
    pooled.rig.group.position.set(LANE_CENTERS[lane], 0, spawnZ);
    pooled.rig.group.visible = true;

    const baseLaneSpeed =
      kind === 'truck' ? 22 : 26 + (3 - lane) * 3.2 + difficulty * 6;

    let laneChangeState: 'none' | 'signaling' | 'changing' = 'none';
    let targetLane = lane;
    if (kind === 'sedan' && this.distanceM > 350 && Math.random() < 0.25) {
      const candidate = lane === 0 ? 1 : lane === 3 ? 2 : Math.random() > 0.5 ? lane + 1 : lane - 1;
      if (!occupiedLanes.has(candidate)) {
        targetLane = candidate;
        laneChangeState = 'signaling';
      }
    }

    pooled.active = true;
    pooled.lane = lane;
    pooled.targetLane = targetLane;
    pooled.laneChangeState = laneChangeState;
    pooled.signalTimer = 1.3 + Math.random() * 0.6;
    pooled.speedMs = baseLaneSpeed;
    pooled.nearMissed = false;
  }

  private updatePickups(dt: number): void {
    this.pickupSpawnTimer -= dt;
    if (this.pickupSpawnTimer <= 0) {
      this.pickupSpawnTimer = 1.45 + Math.random() * 1.2;
      this.spawnPickup();
    }

    for (let i = 0; i < this.pickupPool.length; i++) {
      const p = this.pickupPool[i];
      if (!p.active) continue;

      p.mesh.position.z += this.playerSpeedMs * dt;
      p.mesh.rotation.y += 2.6 * dt;

      if (
        this.magnetRemaining > 0 &&
        p.kind === 'coin' &&
        p.mesh.position.z > -32 &&
        p.mesh.position.z < 4
      ) {
        p.mesh.position.x = THREE.MathUtils.damp(p.mesh.position.x, this.playerX, 9.5, dt);
        p.mesh.position.z = THREE.MathUtils.damp(p.mesh.position.z, 0, 5.5, dt);
      }

      const dx = Math.abs(p.mesh.position.x - this.playerX);
      const dz = Math.abs(p.mesh.position.z);

      if (dx < 1.65 && dz < 2.4) {
        if (p.kind === 'coin') {
          this.coins += 1;
          this.totalCoins += 1;
          const pts = 100 * this.comboMultiplier;
          this.score += pts;
          soundEngine.playCoin();
        } else if (p.kind === 'nitro') {
          this.nitro = Math.min(100, this.nitro + 35);
          this.score += 120;
          this.showBanner('NITRO CHARGED +35%');
          soundEngine.playNitroPickup();
        } else if (p.kind === 'magnet') {
          this.magnetRemaining = 8.0;
          this.score += 150;
          this.showBanner('COIN MAGNET · 8s');
          soundEngine.playNitroPickup();
        } else {
          if (this.armor < this.maxArmor) {
            this.armor += 1;
            this.showBanner('ARMOR REPAIRED');
          } else {
            this.score += 300;
            this.showBanner('SHIELD BONUS +300');
          }
          soundEngine.playNitroPickup();
        }

        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      if (p.mesh.position.z > 18) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  private spawnPickup(): void {
    const lane = Math.floor(Math.random() * 4);
    const spawnZ = -210;

    for (const t of this.trafficPool) {
      if (t.active && t.lane === lane && Math.abs(t.rig.group.position.z - spawnZ) < 12) {
        return;
      }
    }

    const r = Math.random();
    const kind: 'coin' | 'nitro' | 'shield' | 'magnet' =
      r < 0.62 ? 'coin' : r < 0.82 ? 'nitro' : r < 0.92 ? 'magnet' : 'shield';

    const pooled = this.pickupPool.find((p) => !p.active && p.kind === kind);
    if (!pooled) return;

    pooled.active = true;
    pooled.lane = lane;
    pooled.mesh.position.set(LANE_CENTERS[lane], 0, spawnZ);
    pooled.mesh.rotation.y = 0;
    pooled.mesh.visible = true;
  }

  private handleCollision(t: PooledTraffic): void {
    this.armor -= 1;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.shakeIntensity = 0.65;
    this.spawnSparks(this.playerX, 0.7, -1.2);

    // Return hit traffic vehicle to pool immediately so player never snags inside it
    t.active = false;
    t.rig.group.visible = false;

    if (this.armor <= 0) {
      this.armor = 0;
      this.status = 'gameover';
      this.isBoosting = false;
      soundEngine.playCrash(true);
      this.savePersistentData();
      this.emitHud();
    } else {
      this.invulnTimer = 1.4;
      this.playerSpeedMs = Math.max(26, this.playerSpeedMs * 0.58);
      this.showBanner('IMPACT · ARMOR DAMAGED');
      soundEngine.playCrash(false);
    }
  }

  private spawnSparks(x: number, y: number, z: number): void {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (p.active || p.isSmoke) continue;
      p.active = true;
      p.life = 0.45 + Math.random() * 0.25;
      p.maxLife = 0.7;
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      p.vel.set(
        (Math.random() - 0.5) * 14,
        3 + Math.random() * 7,
        (Math.random() - 0.5) * 14,
      );
      if (++spawned >= 14) break;
    }
  }

  private spawnDriftSmoke(): void {
    for (const xOff of [-0.88, 0.88]) {
      const p = this.particlePool.find((item) => !item.active && item.isSmoke);
      if (!p) break;
      p.active = true;
      p.life = 0.28;
      p.maxLife = 0.28;
      p.mesh.position.set(this.playerX + xOff, 0.18, 1.55);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      p.vel.set((Math.random() - 0.5) * 1.4, 1.1, 8.5);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particlePool.length; i++) {
      const s = this.particlePool[i];
      if (!s.active) continue;

      s.life -= dt;
      if (!s.isSmoke) s.vel.y -= 18 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      const t = Math.max(0.01, s.life / s.maxLife);
      s.mesh.scale.setScalar(s.isSmoke ? 1 + (1 - t) * 1.4 : t);
      if (s.life <= 0) {
        s.active = false;
        s.mesh.visible = false;
      }
    }
  }

  private updateSpeedLines(dt: number): void {
    const show = this.isBoosting || this.playerSpeedMs > 62;
    for (const line of this.speedLines) {
      line.visible = show;
      if (show) {
        line.position.z += this.playerSpeedMs * 1.45 * dt;
        if (line.position.z > 10) {
          line.position.z = -90 - Math.random() * 40;
          line.position.x = this.playerX + (Math.random() - 0.5) * 14;
          line.position.y = 0.6 + Math.random() * 2.6;
        }
      }
    }
  }

  private updateCamera(dt: number, speedKmh: number): void {
    const targetFov = this.isBoosting
      ? 75
      : 58 + THREE.MathUtils.clamp((speedKmh - 120) / 180, 0, 1) * 9;

    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.4);
    }

    const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.6;

    if (this.cameraMode === 'chase') {
      _camTargetPos.set(this.playerX * 0.85, 3.25, 7.6);
      _camLookAt.set(this.playerX * 0.9, 1.0, -16);
    } else if (this.cameraMode === 'far') {
      _camTargetPos.set(this.playerX * 0.72, 5.2, 11.4);
      _camLookAt.set(this.playerX * 0.85, 0.9, -20);
    } else {
      _camTargetPos.set(this.playerX, 1.42, -0.45);
      _camLookAt.set(this.playerX, 1.12, -26);
    }

    const dampK = this.cameraMode === 'hood' ? 24 : 9.5;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, dampK, dt) + shakeX;
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, dampK, dt) + shakeY;
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, dampK, dt);
    this.camera.lookAt(_camLookAt);
  }

  private showBanner(text: string): void {
    this.eventBanner = text;
    this.bannerTimer = 1.65;
  }

  private savePersistentData(): void {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(this.bestScore)));
      localStorage.setItem(COINS_KEY, String(this.totalCoins));
    } catch {
      // ignore
    }
  }

  private emitHud(): void {
    const speedKmh = Math.round(this.playerSpeedMs * 3.6);
    const gear = Math.min(6, Math.max(1, Math.ceil(speedKmh / 48)));
    const gearSpan = 48;
    const rpmRatio = THREE.MathUtils.clamp(((speedKmh % gearSpan) / gearSpan) * 0.75 + 0.25, 0.15, 1);

    this.onHudUpdate({
      status: this.status,
      countdownValue: Math.max(0, Math.ceil(this.countdownTimer / 0.8)),
      score: Math.floor(this.score),
      bestScore: Math.floor(this.bestScore),
      distanceKm: Number((this.distanceM / 1000).toFixed(2)),
      nextCheckpointM: Math.max(0, Math.ceil(this.nextCheckpointTargetM - this.distanceM)),
      speedKmh,
      gear,
      rpmRatio,
      nitro: Math.round(this.nitro),
      isBoosting: this.isBoosting,
      armor: this.armor,
      maxArmor: this.maxArmor,
      coins: this.coins,
      totalCoins: this.totalCoins,
      nearMisses: this.nearMisses,
      comboMultiplier: this.comboMultiplier,
      magnetRemaining: Number(this.magnetRemaining.toFixed(1)),
      topSpeedReached: this.topSpeedReached,
      eventBanner: this.eventBanner,
    });
  }

  private onResize(): void {
    if (!this.container || this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    document.removeEventListener('visibilitychange', this.handleVisibilityBound);
    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLostBound);
      this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);
    }

    this.scene?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    disposeSharedAssetCache();
    this.roadTex?.dispose();
    this.shoulderTex?.dispose();
    this.contactShadowTex?.dispose();
    this.headlightBeamTex?.dispose();
    this.buildingTex?.dispose();
    this.skyTexture?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    soundEngine.updateEngine(0, false, false);
  }
}
