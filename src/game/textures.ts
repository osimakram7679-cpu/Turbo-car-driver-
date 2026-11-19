import * as THREE from 'three';

export function createRoadTexture(
  asphaltBase: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = asphaltBase;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},0.035)`;
    ctx.fillRect(x, y, 2, 2);
  }

  const laneCenters = [84, 198, 314, 428];
  for (const cx of laneCenters) {
    const grad = ctx.createLinearGradient(cx - 28, 0, cx + 28, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.28, 'rgba(0,0,0,0.14)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.03)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.14)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 28, 0, 56, 512);
  }

  ctx.fillStyle = '#EAB308';
  ctx.fillRect(16, 0, 6, 512);
  ctx.fillRect(490, 0, 6, 512);

  const dividers = [141, 256, 371];
  ctx.fillStyle = '#E2E8F0';
  for (const dx of dividers) {
    ctx.fillRect(dx - 3, 28, 6, 172);
    ctx.fillRect(dx - 3, 284, 6, 172);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createShoulderTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2B303B';
  ctx.fillRect(0, 0, 128, 256);

  for (let y = 0; y < 256; y += 64) {
    ctx.fillStyle = (y / 64) % 2 === 0 ? '#DC2626' : '#F1F5F9';
    ctx.fillRect(0, y, 20, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 256);
  ctx.save();
  ctx.translate(64, 128);
  ctx.scale(1, 2);
  const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 56);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHeadlightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
  grad.addColorStop(0.45, 'rgba(224, 242, 254, 0.16)');
  grad.addColorStop(1, 'rgba(224, 242, 254, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(108, 256);
  ctx.lineTo(148, 256);
  ctx.lineTo(246, 0);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSignBoardTexture(
  title: string,
  subtitle: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#065F46';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 60);

  ctx.fillStyle = '#FDE047';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(subtitle, 256, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBuildingFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 128, 256);

  for (let y = 14; y < 246; y += 18) {
    for (let x = 12; x < 116; x += 18) {
      const lit = Math.random();
      if (lit > 0.62) {
        ctx.fillStyle = lit > 0.88 ? '#38BDF8' : '#FDE68A';
        ctx.fillRect(x, y, 10, 10);
      } else {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(x, y, 10, 10);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSkyGradientTexture(topHex: string, horizonHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, topHex);
  grad.addColorStop(0.42, topHex);
  grad.addColorStop(0.54, horizonHex);
  grad.addColorStop(1.0, horizonHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
