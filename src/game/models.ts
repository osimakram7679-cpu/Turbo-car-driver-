import * as THREE from 'three';

export interface PlayerCarRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  wheels: THREE.Group[];
  frontWheelPivots: THREE.Group[];
  flames: THREE.Mesh[];
  headlightBeamMat: THREE.MeshBasicMaterial;
  paintMaterial: THREE.MeshPhysicalMaterial;
  accentMaterial: THREE.MeshStandardMaterial;
  tailLightMaterial: THREE.MeshStandardMaterial;
}

export interface TrafficRig {
  kind: 'sedan' | 'suv' | 'truck';
  group: THREE.Group;
  wheels: THREE.Mesh[];
  halfWidth: number;
  halfLength: number;
  bodyMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  blinkerLMat: THREE.MeshBasicMaterial;
  blinkerRMat: THREE.MeshBasicMaterial;
}

// Shared static geometries & materials so pooled traffic/pickups never cause GC or shader hitches
interface SharedAssetCache {
  shadowPlaneGeo: THREE.PlaneGeometry;
  shadowMat: THREE.MeshBasicMaterial;
  trimMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshStandardMaterial;
  headLightMat: THREE.MeshStandardMaterial;
  cargoMat: THREE.MeshStandardMaterial;
  tireMat: THREE.MeshStandardMaterial;

  // Traffic geometries
  sedanLowerGeo: THREE.BoxGeometry;
  sedanCabinGeo: THREE.BoxGeometry;
  sedanRoofGeo: THREE.BoxGeometry;
  sedanBumperGeo: THREE.BoxGeometry;
  sedanTailGeo: THREE.BoxGeometry;
  sedanHeadGeo: THREE.BoxGeometry;

  suvLowerGeo: THREE.BoxGeometry;
  suvCabinGeo: THREE.BoxGeometry;
  suvRoofGeo: THREE.BoxGeometry;
  suvBumperGeo: THREE.BoxGeometry;
  suvTailGeo: THREE.BoxGeometry;

  truckCabGeo: THREE.BoxGeometry;
  truckWindshieldGeo: THREE.BoxGeometry;
  truckCargoGeo: THREE.BoxGeometry;
  truckChassisGeo: THREE.BoxGeometry;
  truckTailGeo: THREE.BoxGeometry;

  blinkerGeo: THREE.BoxGeometry;
  wheelGeoSedan: THREE.CylinderGeometry;
  wheelGeoSuv: THREE.CylinderGeometry;
  wheelGeoTruck: THREE.CylinderGeometry;

  // Pickup geometries & materials
  coinGeo: THREE.CylinderGeometry;
  coinInnerGeo: THREE.CylinderGeometry;
  coinMat: THREE.MeshStandardMaterial;
  coinInnerMat: THREE.MeshStandardMaterial;
  nitroGeo: THREE.CylinderGeometry;
  nitroCapGeo: THREE.CylinderGeometry;
  nitroMat: THREE.MeshStandardMaterial;
  nitroCapMat: THREE.MeshStandardMaterial;
  shieldGeo: THREE.OctahedronGeometry;
  shieldMat: THREE.MeshStandardMaterial;
  magnetRingGeo: THREE.TorusGeometry;
  magnetCoreGeo: THREE.OctahedronGeometry;
  magnetRingMat: THREE.MeshStandardMaterial;
  magnetCoreMat: THREE.MeshBasicMaterial;
}

let _cache: SharedAssetCache | null = null;

function getSharedCache(shadowTex: THREE.Texture): SharedAssetCache {
  if (_cache) return _cache;

  const shadowPlaneGeo = new THREE.PlaneGeometry(1, 1);
  shadowPlaneGeo.rotateX(-Math.PI / 2);

  const wheelGeoSedan = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12);
  wheelGeoSedan.rotateZ(Math.PI / 2);
  const wheelGeoSuv = new THREE.CylinderGeometry(0.39, 0.39, 0.26, 12);
  wheelGeoSuv.rotateZ(Math.PI / 2);
  const wheelGeoTruck = new THREE.CylinderGeometry(0.44, 0.44, 0.28, 12);
  wheelGeoTruck.rotateZ(Math.PI / 2);

  const coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16);
  coinGeo.rotateX(Math.PI / 2);
  const coinInnerGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.17, 14);
  coinInnerGeo.rotateX(Math.PI / 2);

  _cache = {
    shadowPlaneGeo,
    shadowMat: new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    }),
    trimMat: new THREE.MeshStandardMaterial({
      color: 0x181c24,
      roughness: 0.78,
      metalness: 0.15,
    }),
    glassMat: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.14,
      metalness: 0.3,
    }),
    headLightMat: new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 1.2,
    }),
    cargoMat: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.62,
      metalness: 0.1,
    }),
    tireMat: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }),

    sedanLowerGeo: new THREE.BoxGeometry(1.86, 0.56, 4.2),
    sedanCabinGeo: new THREE.BoxGeometry(1.6, 0.46, 2.05),
    sedanRoofGeo: new THREE.BoxGeometry(1.56, 0.08, 1.78),
    sedanBumperGeo: new THREE.BoxGeometry(1.9, 0.18, 0.2),
    sedanTailGeo: new THREE.BoxGeometry(0.42, 0.12, 0.08),
    sedanHeadGeo: new THREE.BoxGeometry(0.36, 0.11, 0.08),

    suvLowerGeo: new THREE.BoxGeometry(2.02, 0.68, 4.55),
    suvCabinGeo: new THREE.BoxGeometry(1.82, 0.58, 2.85),
    suvRoofGeo: new THREE.BoxGeometry(1.84, 0.1, 2.82),
    suvBumperGeo: new THREE.BoxGeometry(2.04, 0.2, 0.22),
    suvTailGeo: new THREE.BoxGeometry(0.42, 0.16, 0.08),

    truckCabGeo: new THREE.BoxGeometry(2.14, 1.48, 1.65),
    truckWindshieldGeo: new THREE.BoxGeometry(1.94, 0.62, 0.1),
    truckCargoGeo: new THREE.BoxGeometry(2.26, 2.15, 4.45),
    truckChassisGeo: new THREE.BoxGeometry(2.0, 0.28, 6.2),
    truckTailGeo: new THREE.BoxGeometry(0.46, 0.16, 0.08),

    blinkerGeo: new THREE.BoxGeometry(0.16, 0.14, 0.09),
    wheelGeoSedan,
    wheelGeoSuv,
    wheelGeoTruck,

    coinGeo,
    coinInnerGeo,
    coinMat: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.45,
      metalness: 0.9,
      roughness: 0.2,
    }),
    coinInnerMat: new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      metalness: 0.8,
      roughness: 0.25,
    }),
    nitroGeo: new THREE.CylinderGeometry(0.28, 0.28, 1.0, 12),
    nitroCapGeo: new THREE.CylinderGeometry(0.16, 0.24, 0.22, 10),
    nitroMat: new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.85,
      metalness: 0.75,
      roughness: 0.18,
    }),
    nitroCapMat: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.85,
      roughness: 0.2,
    }),
    shieldGeo: new THREE.OctahedronGeometry(0.55, 0),
    shieldMat: new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.75,
      metalness: 0.5,
      roughness: 0.16,
    }),
    magnetRingGeo: new THREE.TorusGeometry(0.46, 0.13, 10, 20),
    magnetCoreGeo: new THREE.OctahedronGeometry(0.24, 0),
    magnetRingMat: new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 0.95,
      metalness: 0.7,
      roughness: 0.18,
    }),
    magnetCoreMat: new THREE.MeshBasicMaterial({ color: 0xf5d0fe }),
  };
  return _cache;
}

export function disposeSharedAssetCache(): void {
  if (!_cache) return;
  Object.values(_cache).forEach((item) => {
    if (item && typeof (item as { dispose?: () => void }).dispose === 'function') {
      (item as { dispose: () => void }).dispose();
    }
  });
  _cache = null;
}

function makeWheelAssembly(
  radius: number,
  width: number,
  rimColor = 0xd4d8e0,
): THREE.Group {
  const wheelGroup = new THREE.Group();

  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.88,
    metalness: 0.05,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheelGroup.add(tire);

  const rimGeo = new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, width + 0.02, 14);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.22,
    metalness: 0.9,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheelGroup.add(rim);

  const spokeGeo = new THREE.BoxGeometry(width + 0.03, radius * 1.18, 0.055);
  const spokeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.7,
  });
  const spokeA = new THREE.Mesh(spokeGeo, spokeMat);
  const spokeB = new THREE.Mesh(spokeGeo, spokeMat);
  spokeB.rotation.x = Math.PI / 2;
  wheelGroup.add(spokeA, spokeB);

  const hubGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.04, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.6,
  });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  wheelGroup.add(hub);

  return wheelGroup;
}

function makeContactShadowPlane(
  shadowTex: THREE.Texture,
  width: number,
  length: number,
): THREE.Mesh {
  const c = getSharedCache(shadowTex);
  const mesh = new THREE.Mesh(c.shadowPlaneGeo, c.shadowMat);
  mesh.scale.set(width, 1, length);
  mesh.position.y = 0.022;
  return mesh;
}

export function createPlayerCar(
  bodyColor: number,
  accentColor: number,
  shadowTex: THREE.Texture,
  beamTex: THREE.Texture,
): PlayerCarRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  root.add(makeContactShadowPlane(shadowTex, 2.55, 5.1));

  const headlightBeamMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.55,
  });
  const beamGeo = new THREE.PlaneGeometry(3.4, 15.0);
  beamGeo.rotateX(-Math.PI / 2);
  const beamL = new THREE.Mesh(beamGeo, headlightBeamMat);
  beamL.position.set(-0.68, 0.035, -9.6);
  const beamR = new THREE.Mesh(beamGeo, headlightBeamMat);
  beamR.position.set(0.68, 0.035, -9.6);
  root.add(beamL, beamR);

  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.64,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.68,
    metalness: 0.25,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    metalness: 0.1,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const chassisShape = new THREE.Shape();
  chassisShape.moveTo(-2.15, 0.24);
  chassisShape.lineTo(-2.1, 0.56);
  chassisShape.lineTo(-1.1, 0.74);
  chassisShape.lineTo(-0.35, 1.14);
  chassisShape.lineTo(0.85, 1.12);
  chassisShape.lineTo(1.75, 0.84);
  chassisShape.lineTo(2.12, 0.76);
  chassisShape.lineTo(2.15, 0.26);
  chassisShape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(chassisShape, {
    depth: 1.72,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  bodyGeo.translate(0, 0, -0.86);
  bodyGeo.rotateY(-Math.PI / 2);

  const mainHull = new THREE.Mesh(bodyGeo, paintMaterial);
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  bodyPivot.add(mainHull);

  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.3,
  });
  const hoodStripeGeo = new THREE.BoxGeometry(0.14, 0.02, 1.15);
  const hStripeL = new THREE.Mesh(hoodStripeGeo, stripeMat);
  hStripeL.position.set(-0.18, 0.73, -1.52);
  hStripeL.rotation.x = -0.17;
  const hStripeR = new THREE.Mesh(hoodStripeGeo, stripeMat);
  hStripeR.position.set(0.18, 0.73, -1.52);
  hStripeR.rotation.x = -0.17;
  bodyPivot.add(hStripeL, hStripeR);

  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.02, 0.74);
  cabinShape.lineTo(-0.32, 1.11);
  cabinShape.lineTo(0.82, 1.09);
  cabinShape.lineTo(1.52, 0.84);
  cabinShape.lineTo(1.52, 0.72);
  cabinShape.closePath();

  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: 1.4,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  cabinGeo.translate(0, 0, -0.7);
  cabinGeo.rotateY(-Math.PI / 2);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
  cabinMesh.position.y = 0.02;
  bodyPivot.add(cabinMesh);

  const splitterGeo = new THREE.BoxGeometry(1.94, 0.08, 0.42);
  const splitter = new THREE.Mesh(splitterGeo, accentMaterial);
  splitter.position.set(0, 0.22, -2.06);
  splitter.castShadow = true;
  bodyPivot.add(splitter);

  const skirtGeo = new THREE.BoxGeometry(1.98, 0.1, 2.75);
  const skirts = new THREE.Mesh(skirtGeo, accentMaterial);
  skirts.position.set(0, 0.24, 0.04);
  bodyPivot.add(skirts);

  const diffuserGeo = new THREE.BoxGeometry(1.78, 0.16, 0.24);
  const diffuser = new THREE.Mesh(diffuserGeo, accentMaterial);
  diffuser.position.set(0, 0.28, 2.08);
  bodyPivot.add(diffuser);

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const exhaustGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustL.position.set(-0.48, 0.27, 2.18);
  const exhaustR = new THREE.Mesh(exhaustGeo, chromeMat);
  exhaustR.position.set(0.48, 0.27, 2.18);
  bodyPivot.add(exhaustL, exhaustR);

  const strutGeo = new THREE.BoxGeometry(0.06, 0.28, 0.22);
  const strutL = new THREE.Mesh(strutGeo, accentMaterial);
  strutL.position.set(-0.56, 0.94, 1.88);
  const strutR = new THREE.Mesh(strutGeo, accentMaterial);
  strutR.position.set(0.56, 0.94, 1.88);
  const wingGeo = new THREE.BoxGeometry(1.92, 0.055, 0.34);
  const wing = new THREE.Mesh(wingGeo, paintMaterial);
  wing.position.set(0, 1.09, 1.94);
  wing.rotation.x = 0.08;
  wing.castShadow = true;
  bodyPivot.add(strutL, strutR, wing);

  const mirrorGeo = new THREE.BoxGeometry(0.22, 0.09, 0.14);
  const mirrorL = new THREE.Mesh(mirrorGeo, paintMaterial);
  mirrorL.position.set(-0.96, 0.8, -0.52);
  const mirrorR = new THREE.Mesh(mirrorGeo, paintMaterial);
  mirrorR.position.set(0.96, 0.8, -0.52);
  bodyPivot.add(mirrorL, mirrorR);

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  const headGeo = new THREE.BoxGeometry(0.36, 0.09, 0.1);
  const headL = new THREE.Mesh(headGeo, headMat);
  headL.position.set(-0.62, 0.52, -2.14);
  const headR = new THREE.Mesh(headGeo, headMat);
  headR.position.set(0.62, 0.52, -2.14);
  bodyPivot.add(headL, headR);

  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2244,
    emissive: 0xff1133,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  const tailStripGeo = new THREE.BoxGeometry(1.66, 0.075, 0.08);
  const tailStrip = new THREE.Mesh(tailStripGeo, tailLightMaterial);
  tailStrip.position.set(0, 0.66, 2.15);
  bodyPivot.add(tailStrip);

  const flameGeo = new THREE.ConeGeometry(0.13, 1.05, 10);
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.48, 0.27, 2.72);
  flameL.visible = false;
  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(0.48, 0.27, 2.72);
  flameR.visible = false;
  bodyPivot.add(flameL, flameR);

  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const wheels: THREE.Group[] = [];
  const frontWheelPivots: THREE.Group[] = [];

  const wheelPositions: Array<{ x: number; z: number; front: boolean }> = [
    { x: -0.92, z: -1.32, front: true },
    { x: 0.92, z: -1.32, front: true },
    { x: -0.94, z: 1.32, front: false },
    { x: 0.94, z: 1.32, front: false },
  ];

  for (const wp of wheelPositions) {
    const w = makeWheelAssembly(wheelRadius, wheelWidth, 0xe2e8f0);
    wheels.push(w);
    if (wp.front) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wheelRadius, wp.z);
      steerPivot.add(w);
      frontWheelPivots.push(steerPivot);
      root.add(steerPivot);
    } else {
      w.position.set(wp.x, wheelRadius, wp.z);
      root.add(w);
    }
  }

  return {
    group: root,
    bodyPivot,
    wheels,
    frontWheelPivots,
    flames: [flameL, flameR],
    headlightBeamMat,
    paintMaterial,
    accentMaterial,
    tailLightMaterial,
  };
}

export function createTrafficVehicle(
  kind: 'sedan' | 'suv' | 'truck',
  colorHex: number,
  shadowTex: THREE.Texture,
): TrafficRig {
  const c = getSharedCache(shadowTex);
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  // Per-instance paint & signal materials (lightweight StandardMaterial, reused across pool!)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: kind === 'truck' ? 0.25 : 0.55,
    roughness: kind === 'truck' ? 0.45 : 0.24,
  });

  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const blinkerLMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });
  const blinkerRMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });

  let halfWidth = 0.96;
  let halfLength = 2.15;
  let rearZ = 2.12;
  let blinkerX = 0.86;
  let blinkerY = 0.58;

  if (kind === 'sedan') {
    group.add(makeContactShadowPlane(shadowTex, 2.35, 4.7));

    const lower = new THREE.Mesh(c.sedanLowerGeo, bodyMat);
    lower.position.y = 0.52;
    lower.castShadow = true;
    lower.receiveShadow = true;
    group.add(lower);

    const cabin = new THREE.Mesh(c.sedanCabinGeo, c.glassMat);
    cabin.position.set(0, 0.98, 0.12);
    group.add(cabin);

    const roof = new THREE.Mesh(c.sedanRoofGeo, bodyMat);
    roof.position.set(0, 1.22, 0.12);
    group.add(roof);

    const bumperF = new THREE.Mesh(c.sedanBumperGeo, c.trimMat);
    bumperF.position.set(0, 0.3, -2.08);
    const bumperR = new THREE.Mesh(c.sedanBumperGeo, c.trimMat);
    bumperR.position.set(0, 0.3, 2.08);
    group.add(bumperF, bumperR);

    const tailL = new THREE.Mesh(c.sedanTailGeo, tailLightMat);
    tailL.position.set(-0.62, 0.62, 2.11);
    const tailR = new THREE.Mesh(c.sedanTailGeo, tailLightMat);
    tailR.position.set(0.62, 0.62, 2.11);
    group.add(tailL, tailR);

    const headL = new THREE.Mesh(c.sedanHeadGeo, c.headLightMat);
    headL.position.set(-0.66, 0.56, -2.11);
    const headR = new THREE.Mesh(c.sedanHeadGeo, c.headLightMat);
    headR.position.set(0.66, 0.56, -2.11);
    group.add(headL, headR);
  } else if (kind === 'suv') {
    halfWidth = 1.04;
    halfLength = 2.35;
    rearZ = 2.3;
    blinkerX = 0.92;
    blinkerY = 0.68;
    group.add(makeContactShadowPlane(shadowTex, 2.55, 5.1));

    const lower = new THREE.Mesh(c.suvLowerGeo, bodyMat);
    lower.position.y = 0.62;
    lower.castShadow = true;
    lower.receiveShadow = true;
    group.add(lower);

    const cabin = new THREE.Mesh(c.suvCabinGeo, c.glassMat);
    cabin.position.set(0, 1.24, 0.32);
    group.add(cabin);

    const roof = new THREE.Mesh(c.suvRoofGeo, bodyMat);
    roof.position.set(0, 1.56, 0.32);
    group.add(roof);

    const bumperR = new THREE.Mesh(c.suvBumperGeo, c.trimMat);
    bumperR.position.set(0, 0.36, 2.25);
    group.add(bumperR);

    const tailL = new THREE.Mesh(c.suvTailGeo, tailLightMat);
    tailL.position.set(-0.7, 0.72, 2.29);
    const tailR = new THREE.Mesh(c.suvTailGeo, tailLightMat);
    tailR.position.set(0.7, 0.72, 2.29);
    group.add(tailL, tailR);
  } else {
    halfWidth = 1.15;
    halfLength = 3.25;
    rearZ = 3.16;
    blinkerX = 1.02;
    blinkerY = 0.56;
    group.add(makeContactShadowPlane(shadowTex, 2.8, 7.0));

    const cab = new THREE.Mesh(c.truckCabGeo, bodyMat);
    cab.position.set(0, 1.06, -2.18);
    cab.castShadow = true;
    group.add(cab);

    const windshield = new THREE.Mesh(c.truckWindshieldGeo, c.glassMat);
    windshield.position.set(0, 1.38, -2.98);
    group.add(windshield);

    const cargo = new THREE.Mesh(c.truckCargoGeo, c.cargoMat);
    cargo.position.set(0, 1.55, 0.92);
    cargo.castShadow = true;
    cargo.receiveShadow = true;
    group.add(cargo);

    const chassis = new THREE.Mesh(c.truckChassisGeo, c.trimMat);
    chassis.position.set(0, 0.44, 0);
    group.add(chassis);

    const tailL = new THREE.Mesh(c.truckTailGeo, tailLightMat);
    tailL.position.set(-0.76, 0.56, 3.16);
    const tailR = new THREE.Mesh(c.truckTailGeo, tailLightMat);
    tailR.position.set(0.76, 0.56, 3.16);
    group.add(tailL, tailR);
  }

  const blinkerL = new THREE.Mesh(c.blinkerGeo, blinkerLMat);
  blinkerL.position.set(-blinkerX, blinkerY, rearZ);
  const blinkerR = new THREE.Mesh(c.blinkerGeo, blinkerRMat);
  blinkerR.position.set(blinkerX, blinkerY, rearZ);
  group.add(blinkerL, blinkerR);

  const wRad = kind === 'truck' ? 0.44 : kind === 'suv' ? 0.39 : 0.34;
  const wGeo = kind === 'truck' ? c.wheelGeoTruck : kind === 'suv' ? c.wheelGeoSuv : c.wheelGeoSedan;

  const xOff = kind === 'truck' ? 1.04 : kind === 'suv' ? 0.96 : 0.88;
  const zFront = kind === 'truck' ? -2.2 : -1.3;
  const zRear = kind === 'truck' ? 2.1 : 1.32;

  for (const [wx, wz] of [
    [-xOff, zFront],
    [xOff, zFront],
    [-xOff, zRear],
    [xOff, zRear],
  ]) {
    const wm = new THREE.Mesh(wGeo, c.tireMat);
    wm.position.set(wx, wRad, wz);
    wheels.push(wm);
    group.add(wm);
  }

  return {
    kind,
    group,
    wheels,
    halfWidth,
    halfLength,
    bodyMat,
    tailLightMat,
    blinkerLMat,
    blinkerRMat,
  };
}

export function createPickupMesh(
  kind: 'coin' | 'nitro' | 'shield' | 'magnet',
  shadowTex: THREE.Texture,
): THREE.Group {
  const c = getSharedCache(shadowTex);
  const group = new THREE.Group();

  if (kind === 'coin') {
    const coin = new THREE.Mesh(c.coinGeo, c.coinMat);
    coin.position.y = 0.85;
    const inner = new THREE.Mesh(c.coinInnerGeo, c.coinInnerMat);
    inner.position.y = 0.85;
    group.add(coin, inner);
  } else if (kind === 'nitro') {
    const canister = new THREE.Mesh(c.nitroGeo, c.nitroMat);
    canister.position.y = 0.9;
    canister.rotation.z = 0.35;
    const cap = new THREE.Mesh(c.nitroCapGeo, c.nitroCapMat);
    cap.position.set(-0.19, 1.42, 0);
    cap.rotation.z = 0.35;
    group.add(canister, cap);
  } else if (kind === 'shield') {
    const shield = new THREE.Mesh(c.shieldGeo, c.shieldMat);
    shield.position.y = 0.95;
    group.add(shield);
  } else {
    const ring = new THREE.Mesh(c.magnetRingGeo, c.magnetRingMat);
    ring.position.y = 0.95;
    const core = new THREE.Mesh(c.magnetCoreGeo, c.magnetCoreMat);
    core.position.y = 0.95;
    group.add(ring, core);
  }

  return group;
}
