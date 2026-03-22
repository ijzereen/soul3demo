import * as THREE from 'three';

// --- GAME STATE ---
const state = {
    health: 100,
    stamina: 100,
    maxHealth: 100,
    maxStamina: 100,
    isDead: false,
    isRolling: false,
    isAttacking: false,
    rollTimer: 0,
    attackTimer: 0,
    bossHealth: 1000,
    bossMaxHealth: 1000,
    bossDead: false,
    gameStarted: false,
    bossAttackTimer: 0,
    bossState: 'IDLE', // IDLE, CHASE, ATTACK, STUN, REST
    lockedOn: false,
    bossStamina: 100,
    bossMaxStamina: 100
};

// --- INIT THREE JS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);
scene.fog = new THREE.FogExp2(0x0a0a12, 0.018);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x445566, 1.8);
scene.add(ambientLight);

// Hemisphere light for natural fill
const hemiLight = new THREE.HemisphereLight(0x6688aa, 0x333344, 1.2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0x99aacc, 2.5);
dirLight.position.set(15, 30, 15);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
scene.add(dirLight);

// Magic Bonfire Light
const fireLight = new THREE.PointLight(0xff5500, 5, 20);
fireLight.position.set(0, 1, 0);
fireLight.castShadow = true;
scene.add(fireLight);

// --- ENVIRONMENT ---
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const gridHelper = new THREE.GridHelper(200, 100, 0x000000, 0x000000);
gridHelper.position.y = 0.01;
gridHelper.material.opacity = 0.2;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Decor: Ruins
const numPillars = 25;
const pGeo = new THREE.BoxGeometry(1.5, 8, 1.5);
const pMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 });
for(let i=0; i<numPillars; i++) {
    const mesh = new THREE.Mesh(pGeo, pMat);
    const r = 10 + Math.random() * 40;
    const a = Math.random() * Math.PI * 2;
    mesh.position.set(Math.cos(a)*r, 4, Math.sin(a)*r);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
}

// Bonfire mesh
const bonfireGeo = new THREE.ConeGeometry(1, 2, 8);
const bonfireMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff3300, emissiveIntensity: 2 });
const bonfire = new THREE.Mesh(bonfireGeo, bonfireMat);
bonfire.position.set(0, 1, 0);
scene.add(bonfire);

// --- HUMANOID GENERATOR ---
function createHumanoid(color, isBoss = false) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // Body
    const bodyGeo = new THREE.BoxGeometry(isBoss? 1.2: 0.7, isBoss? 1.5: 1.0, isBoss? 0.6: 0.35);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = isBoss? 2.2: 1.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(isBoss? 0.5: 0.3, isBoss? 0.5: 0.3, isBoss? 0.5: 0.3);
    const head = new THREE.Mesh(headGeo, detailMat);
    head.position.y = isBoss? 1.1: 0.7;
    head.castShadow = true;
    body.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(isBoss? 0.3: 0.2, isBoss? 1.2: 0.8, isBoss? 0.3: 0.2);
    
    const leftArmPivot = new THREE.Object3D();
    leftArmPivot.position.set(isBoss? -0.8: -0.45, isBoss? 0.6: 0.4, 0);
    body.add(leftArmPivot);
    const leftArm = new THREE.Mesh(armGeo, detailMat);
    leftArm.position.y = isBoss? -0.5: -0.3;
    leftArm.castShadow = true;
    leftArmPivot.add(leftArm);

    const rightArmPivot = new THREE.Object3D();
    rightArmPivot.position.set(isBoss? 0.8: 0.45, isBoss? 0.6: 0.4, 0);
    body.add(rightArmPivot);
    const rightArm = new THREE.Mesh(armGeo, detailMat);
    rightArm.position.y = isBoss? -0.5: -0.3;
    rightArm.castShadow = true;
    rightArmPivot.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(isBoss? 0.4: 0.25, isBoss? 1.5: 1.0, isBoss? 0.4: 0.25);
    
    const leftLegPivot = new THREE.Object3D();
    leftLegPivot.position.set(isBoss? -0.3: -0.2, isBoss? 1.5: 1.0, 0);
    group.add(leftLegPivot);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.y = isBoss? -0.75: -0.5;
    leftLeg.castShadow = true;
    leftLegPivot.add(leftLeg);

    const rightLegPivot = new THREE.Object3D();
    rightLegPivot.position.set(isBoss? 0.3: 0.2, isBoss? 1.5: 1.0, 0);
    group.add(rightLegPivot);
    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.y = isBoss? -0.75: -0.5;
    rightLeg.castShadow = true;
    rightLegPivot.add(rightLeg);

    // Weapon
    const weaponGeo = isBoss ? new THREE.BoxGeometry(0.2, 3.5, 0.4) : new THREE.BoxGeometry(0.05, 1.8, 0.15);
    const weaponMat = new THREE.MeshStandardMaterial({ color: isBoss? 0xff2222 : 0xcccccc, metalness: 0.8, roughness: 0.2, emissive: isBoss? 0x440000 : 0x000000 });
    const weapon = new THREE.Mesh(weaponGeo, weaponMat);
    weapon.position.set(0, isBoss? -1.2: -0.8, isBoss? 1.0 : 0.6);
    weapon.rotation.x = Math.PI / 2;
    weapon.castShadow = true;
    rightArmPivot.add(weapon);

    return { group, body, head, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot, weapon, mat };
}

// Instantiate Characters
const player = createHumanoid(0x334455, false);
player.group.position.set(0, 0, 10);
scene.add(player.group);

const boss = createHumanoid(0x661111, true);
boss.group.position.set(0, 0, -10);
scene.add(boss.group);

// --- PARTICLES ---
const particles = [];
function spawnParticles(pos, color, count=20) {
    for(let i=0; i<count; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), new THREE.MeshBasicMaterial({color}));
        mesh.position.copy(pos);
        const vel = new THREE.Vector3(
            (Math.random()-0.5)*15,
            (Math.random())*15,
            (Math.random()-0.5)*15
        );
        scene.add(mesh);
        particles.push({mesh, vel, life: 1.0});
    }
}

// --- CAMERA SETTINGS ---
let camYaw = 0;
let camPitch = 0.3; // Angle down slightly
const cameraOffset = new THREE.Vector3(0, 2.5, 5); // 3rd person offset

const targetDot = document.getElementById('target-dot');
const bossHealthContainer = document.getElementById('boss-health-container');

// --- INPUTS ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let pointerLocked = false;

const startScreen = document.getElementById('start-screen');
const hud = document.getElementById('hud');

document.addEventListener('click', () => {
    if (!pointerLocked && !state.isDead && !state.bossDead) {
        document.body.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === document.body;
    if (pointerLocked) {
        startScreen.style.opacity = '0';
        setTimeout(() => startScreen.style.display = 'none', 500);
        hud.style.display = 'block';
        state.gameStarted = true;
    } else {
        if (!state.isDead && !state.bossDead) {
            startScreen.style.display = 'flex';
            startScreen.style.opacity = '1';
            hud.style.display = 'none';
        }
    }
});

document.addEventListener('mousemove', (e) => {
    if (pointerLocked && !state.lockedOn) {
        camYaw -= e.movementX * 0.003;
        camPitch -= e.movementY * 0.003;
        camPitch = Math.max(-Math.PI/4, Math.min(Math.PI/3, camPitch));
    }
});

document.addEventListener('keydown', (e) => {
    if (!pointerLocked || state.isDead) return;
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': 
            if (!state.isRolling && state.stamina >= 25 && !state.isAttacking) {
                state.isRolling = true;
                state.rollTimer = 0.5; // 500ms
                state.stamina -= 25;
                
                // Determine roll direction
                const inputDir = new THREE.Vector3();
                if(moveForward) inputDir.z -= 1;
                if(moveBackward) inputDir.z += 1;
                if(moveLeft) inputDir.x -= 1;
                if(moveRight) inputDir.x += 1;
                
                if (inputDir.lengthSq() > 0.1) {
                    inputDir.normalize();
                    state.rollAngle = Math.atan2(inputDir.x, inputDir.z) + camYaw;
                } else {
                    // Backstep (roll backward relative to current facing or cam)
                    state.rollAngle = player.group.rotation.y + Math.PI;
                }
            }
            break;
        case 'KeyQ':
            if (!state.bossDead) {
                state.lockedOn = !state.lockedOn;
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
        case 'KeyR': 
            if (state.isDead || state.bossDead) location.reload();
            break;
    }
});

document.addEventListener('mousedown', (e) => {
    if (!pointerLocked || state.isDead || state.bossDead) return;
    if (e.button === 0 && !state.isAttacking && !state.isRolling && state.stamina >= 20) {
        state.isAttacking = true;
        state.attackTimer = 0.5;
        state.stamina -= 20;

        // Check hit mid-swing using setTimeout for simplistic sync
        setTimeout(() => {
            if(state.isDead) return;
            const dist = player.group.position.distanceTo(boss.group.position);
            // Check angle
            const toBoss = boss.group.position.clone().sub(player.group.position).normalize();
            const forward = new THREE.Vector3(Math.sin(player.group.rotation.y), 0, Math.cos(player.group.rotation.y));
            if (dist < 4.5 && forward.dot(toBoss) > 0.4) {
                bossHit();
            }
        }, 200);
    }
});

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpAngle(a, b, t) {
    const d = b - a;
    const dMod = (d + Math.PI) % (Math.PI * 2) - Math.PI;
    return a + dMod * t;
}

function bossHit() {
    state.bossHealth -= 80;
    boss.mat.color.setHex(0xffaaaa);
    boss.mat.emissive.setHex(0x550000);
    spawnParticles(boss.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffaa00, 30);
    
    // Slight knockback
    const pushDir = boss.group.position.clone().sub(player.group.position).normalize();
    boss.group.position.addScaledVector(pushDir, 0.5);

    setTimeout(() => { 
        if (!state.bossDead) {
            boss.mat.color.setHex(0x550000);
            boss.mat.emissive.setHex(0x000000); 
        }
    }, 150);
}

function takeDamage(amount) {
    if (state.isRolling || state.isDead) return; 
    state.health -= amount;
    
    document.body.style.boxShadow = "inset 0 0 150px rgba(255,0,0,0.9)";
    spawnParticles(player.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff0000, 30);
    setTimeout(() => { document.body.style.boxShadow = "inset 0 0 150px rgba(0,0,0,0.9)"; }, 200);

    if (state.health <= 0) {
        state.health = 0;
        state.isDead = true;
        document.exitPointerLock();
        hud.style.display = 'none';
        document.getElementById('game-over').style.display = 'block';
    }
}

function win() {
    state.bossDead = true;
    document.exitPointerLock();
    hud.style.display = 'none';
    document.getElementById('victory').style.display = 'block';
}

// --- GAME LOOP ---
let lastTime = performance.now();
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    if (!state.gameStarted) {
        // Orbit camera around bonfire on start screen
        camera.position.x = Math.sin(time * 0.2) * 15;
        camera.position.z = Math.cos(time * 0.2) * 15;
        camera.position.y = 5;
        camera.lookAt(0, 2, 0);
        renderer.render(scene, camera);
        return;
    }

    if (state.isDead) {
        player.body.rotation.x = -Math.PI/2;
        player.body.position.y = 0.4;
    } else if (state.bossDead) {
        boss.body.rotation.x = -Math.PI/2;
        boss.body.position.y = 0.5;
    }

    // -- UI UPDATE --
    document.getElementById('health-bar').style.width = Math.max(0, (state.health / state.maxHealth * 100)) + '%';
    document.getElementById('stamina-bar').style.width = Math.max(0, (state.stamina / state.maxStamina * 100)) + '%';
    document.getElementById('boss-health-bar').style.width = Math.max(0, (state.bossHealth / state.bossMaxHealth * 100)) + '%';

    // -- STAMINA REGEN --
    if (!state.isRolling && !state.isAttacking && !state.isDead) {
        state.stamina = Math.min(state.maxStamina, state.stamina + 20 * delta);
    }

    // -- PARTICLES --
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.life -= delta * 1.5;
        p.vel.y -= 25 * delta; 
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.scale.setScalar(p.life);
        if(p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    // -- PLAYER LOGIC --
    if (!state.isDead) {
        const inputDir = new THREE.Vector3();
        if(moveForward) inputDir.z -= 1;
        if(moveBackward) inputDir.z += 1;
        if(moveLeft) inputDir.x -= 1;
        if(moveRight) inputDir.x += 1;
        inputDir.normalize();

        const moveSpeed = state.isRolling ? 15 : 7;
        let isMoving = inputDir.lengthSq() > 0.1;

        if (state.isRolling) {
            state.rollTimer -= delta;
            const progress = 1 - (state.rollTimer / 0.5);
            
            // Forward tuck animation (dip down and lean forward, don't block camera)
            const tuckCurve = Math.sin(progress * Math.PI); // peaks at 0.5
            player.body.rotation.x = tuckCurve * 1.2; // lean forward, not full spin
            player.body.position.y = 1.5 - tuckCurve * 0.6; // dip body down
            player.leftLegPivot.rotation.x = -tuckCurve * 1.0;
            player.rightLegPivot.rotation.x = -tuckCurve * 1.0;
            player.leftArmPivot.rotation.x = tuckCurve * 0.8;
            player.rightArmPivot.rotation.x = tuckCurve * 0.8;
            
            // Instantly rotate player towards roll direction
            player.group.rotation.y = lerpAngle(player.group.rotation.y, state.rollAngle, 20*delta);

            player.group.position.x += Math.sin(state.rollAngle) * moveSpeed * delta;
            player.group.position.z += Math.cos(state.rollAngle) * moveSpeed * delta;
            
            if (state.rollTimer <= 0) {
                state.isRolling = false;
                player.body.rotation.x = 0;
                player.body.position.y = 1.5;
            }
        } else if (state.isAttacking) {
            state.attackTimer -= delta;
            const progress = 1 - (state.attackTimer / 0.5);
            
            // Step forward slightly
            if(progress < 0.5) {
                player.group.position.x += Math.sin(player.group.rotation.y) * 4 * delta;
                player.group.position.z += Math.cos(player.group.rotation.y) * 4 * delta;
            }

            // Swing arm
            player.rightArmPivot.rotation.x = lerp(-Math.PI/2, Math.PI/4, progress) - Math.sin(progress*Math.PI)*2;
            player.rightArmPivot.rotation.z = Math.sin(progress*Math.PI)*0.5;
            
            player.leftLegPivot.rotation.x = 0;
            player.rightLegPivot.rotation.x = 0;

            if (state.attackTimer <= 0) {
                state.isAttacking = false;
            }
        } else {
            // Normal Movement
            if (isMoving) {
                const targetAngle = Math.atan2(inputDir.x, inputDir.z) + camYaw;
                player.group.rotation.y = lerpAngle(player.group.rotation.y, targetAngle, 12 * delta);
                
                player.group.position.x += Math.sin(targetAngle) * moveSpeed * delta;
                player.group.position.z += Math.cos(targetAngle) * moveSpeed * delta;

                // Walk anim
                player.leftLegPivot.rotation.x = Math.sin(time * 10) * 0.6;
                player.rightLegPivot.rotation.x = -Math.sin(time * 10) * 0.6;
                player.leftArmPivot.rotation.x = -Math.sin(time * 10) * 0.4;
                player.rightArmPivot.rotation.x = Math.sin(time * 10) * 0.4;
            } else {
                // Idle
                player.leftLegPivot.rotation.x = lerp(player.leftLegPivot.rotation.x, 0, 10*delta);
                player.rightLegPivot.rotation.x = lerp(player.rightLegPivot.rotation.x, 0, 10*delta);
                player.leftArmPivot.rotation.x = lerp(player.leftArmPivot.rotation.x, 0, 10*delta);
                player.rightArmPivot.rotation.x = lerp(player.rightArmPivot.rotation.x, 0, 10*delta);
            }
        }
    }

    // -- LOCK-ON CAMERA --
    if (state.lockedOn && !state.bossDead) {
        const toBoss = boss.group.position.clone().sub(player.group.position);
        const targetYaw = Math.atan2(-toBoss.x, -toBoss.z);
        camYaw = lerpAngle(camYaw, targetYaw, 8 * delta);
        camPitch = lerp(camPitch, 0.25, 5 * delta);

        // Auto-face boss when locked on
        const faceAngle = Math.atan2(toBoss.x, toBoss.z);
        player.group.rotation.y = lerpAngle(player.group.rotation.y, faceAngle, 10 * delta);
    }

    // -- CAMERA FOLLOW --
    const idealOffset = cameraOffset.clone();
    idealOffset.applyAxisAngle(new THREE.Vector3(1,0,0), camPitch);
    idealOffset.applyAxisAngle(new THREE.Vector3(0,1,0), camYaw);
    
    // Raise camera target during roll so we don't lose sight
    const camTargetY = state.isRolling ? 2.5 : 1.5;
    const camLerpSpeed = state.isRolling ? 30 : 15;
    let cameraTargetPos = player.group.position.clone().add(new THREE.Vector3(0, camTargetY, 0));
    camera.position.lerp(cameraTargetPos.clone().add(idealOffset), camLerpSpeed*delta);
    
    // Look at player head
    camera.lookAt(cameraTargetPos);

    // -- TARGET DOT UI --
    if (state.lockedOn && !state.bossDead) {
        targetDot.style.display = 'block';
        const bossScreenPos = boss.group.position.clone().add(new THREE.Vector3(0, 2.5, 0));
        bossScreenPos.project(camera);
        const x = (bossScreenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-bossScreenPos.y * 0.5 + 0.5) * window.innerHeight;
        targetDot.style.left = x + 'px';
        targetDot.style.top = y + 'px';
    } else {
        targetDot.style.display = 'none';
    }

    // -- BOSS HEALTH BAR VISIBILITY --
    if (!state.bossDead) {
        const distToBoss = player.group.position.distanceTo(boss.group.position);
        bossHealthContainer.style.display = distToBoss < 25 ? 'flex' : 'none';
    } else {
        bossHealthContainer.style.display = 'none';
    }

    // -- BOSS AI --
    if (state.bossHealth <= 0 && !state.bossDead) {
        win();
    }

    // Phase 2 check (enrage at 50% HP)
    const isPhase2 = state.bossHealth <= state.bossMaxHealth * 0.5;
    const bossSpeedMult = isPhase2 ? 1.6 : 1.0;
    const bossDmgMult = isPhase2 ? 1.4 : 1.0;

    if (isPhase2 && !state.bossDead) {
        boss.mat.emissive.setHex(0x331100);
        boss.mat.emissiveIntensity = 0.5 + Math.sin(time * 8) * 0.3;
    }

    if (!state.bossDead && !state.isDead) {
        const dist = boss.group.position.distanceTo(player.group.position);
        
        // Look at player smoothly (faster tracking in phase 2)
        const bossTargetAngle = Math.atan2(player.group.position.x - boss.group.position.x, player.group.position.z - boss.group.position.z);
        boss.group.rotation.y = lerpAngle(boss.group.rotation.y, bossTargetAngle, (isPhase2 ? 10 : 5) * delta);

        // Reset limbs helper
        function bossResetPose(speed) {
            boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, 0, speed*delta);
            boss.rightArmPivot.rotation.z = lerp(boss.rightArmPivot.rotation.z, 0, speed*delta);
            boss.leftArmPivot.rotation.x = lerp(boss.leftArmPivot.rotation.x, 0, speed*delta);
            boss.leftLegPivot.rotation.x = lerp(boss.leftLegPivot.rotation.x, 0, speed*delta);
            boss.rightLegPivot.rotation.x = lerp(boss.rightLegPivot.rotation.x, 0, speed*delta);
        }

        // === SLASH: Quick single swing ===
        if (state.bossState === 'SLASH') {
            state.bossAttackTimer -= delta;
            const dur = 0.8 / bossSpeedMult;
            const progress = 1 - (state.bossAttackTimer / dur);
            
            if (progress < 0.3) {
                // Wind up - raise sword to the right
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, -Math.PI * 0.8, 15*delta);
                boss.rightArmPivot.rotation.z = lerp(boss.rightArmPivot.rotation.z, -0.5, 10*delta);
            } else if (progress < 0.55) {
                // Swing across
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, Math.PI/3, 25*delta);
                boss.rightArmPivot.rotation.z = lerp(boss.rightArmPivot.rotation.z, 0.8, 25*delta);
                // Lunge forward
                boss.group.position.x += Math.sin(boss.group.rotation.y) * 12 * bossSpeedMult * delta;
                boss.group.position.z += Math.cos(boss.group.rotation.y) * 12 * bossSpeedMult * delta;
                // Damage window
                if (progress > 0.4 && progress < 0.5 && dist < 4.5) {
                    takeDamage(Math.floor(30 * bossDmgMult));
                }
            } else {
                bossResetPose(8);
            }
            if (state.bossAttackTimer <= 0) state.bossState = 'IDLE';

        // === COMBO: 3-hit chain ===
        } else if (state.bossState === 'COMBO') {
            state.bossAttackTimer -= delta;
            const dur = 2.0 / bossSpeedMult;
            const progress = 1 - (state.bossAttackTimer / dur);
            const hitNum = Math.floor(progress * 3); // 0, 1, 2

            // Each hit: windup -> swing -> brief recovery
            const hitProgress = (progress * 3) % 1;
            
            if (hitProgress < 0.35) {
                // Raise
                const side = hitNum % 2 === 0 ? -1 : 1;
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, -Math.PI * 0.7, 20*delta);
                boss.rightArmPivot.rotation.z = side * 0.6;
                boss.body.rotation.y = lerp(boss.body.rotation.y, side * 0.3, 10*delta);
            } else if (hitProgress < 0.6) {
                // Swing
                const side = hitNum % 2 === 0 ? 1 : -1;
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, Math.PI/4, 30*delta);
                boss.rightArmPivot.rotation.z = side * 0.8;
                boss.body.rotation.y = lerp(boss.body.rotation.y, side * 0.3, 15*delta);
                // Step forward on each hit
                boss.group.position.x += Math.sin(boss.group.rotation.y) * 8 * bossSpeedMult * delta;
                boss.group.position.z += Math.cos(boss.group.rotation.y) * 8 * bossSpeedMult * delta;
                // Damage
                if (hitProgress > 0.45 && hitProgress < 0.55 && dist < 4.5) {
                    takeDamage(Math.floor(22 * bossDmgMult));
                }
            } else {
                boss.body.rotation.y = lerp(boss.body.rotation.y, 0, 10*delta);
                bossResetPose(12);
            }
            if (state.bossAttackTimer <= 0) {
                boss.body.rotation.y = 0;
                state.bossState = 'IDLE';
            }

        // === JUMP_SLAM: Leap into the air then slam down with AoE ===
        } else if (state.bossState === 'JUMP_SLAM') {
            state.bossAttackTimer -= delta;
            const dur = 1.8 / bossSpeedMult;
            const progress = 1 - (state.bossAttackTimer / dur);

            if (progress < 0.35) {
                // Crouch and prepare
                boss.group.position.y = lerp(boss.group.position.y, -0.3, 8*delta);
                boss.leftLegPivot.rotation.x = lerp(boss.leftLegPivot.rotation.x, 0.6, 10*delta);
                boss.rightLegPivot.rotation.x = lerp(boss.rightLegPivot.rotation.x, 0.6, 10*delta);
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, -Math.PI, 10*delta);
            } else if (progress < 0.55) {
                // Jump! Move towards player position and go up
                const jumpT = (progress - 0.35) / 0.2;
                boss.group.position.y = Math.sin(jumpT * Math.PI) * 4;
                // Track toward player mid-air, but stop if close
                const toPlayer = player.group.position.clone().sub(boss.group.position);
                toPlayer.y = 0;
                const horizDist = toPlayer.length();
                if (horizDist > 2.0) {
                    toPlayer.normalize();
                    const trackSpeed = Math.min(12 * bossSpeedMult, horizDist / delta);
                    boss.group.position.x += toPlayer.x * trackSpeed * delta;
                    boss.group.position.z += toPlayer.z * trackSpeed * delta;
                }
                boss.leftLegPivot.rotation.x = -0.4;
                boss.rightLegPivot.rotation.x = -0.4;
            } else if (progress < 0.7) {
                // SLAM DOWN
                boss.group.position.y = lerp(boss.group.position.y, 0, 30*delta);
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, Math.PI/2, 30*delta);
                boss.leftLegPivot.rotation.x = lerp(boss.leftLegPivot.rotation.x, 0.3, 15*delta);
                boss.rightLegPivot.rotation.x = lerp(boss.rightLegPivot.rotation.x, 0.3, 15*delta);
                // AoE damage on impact
                if (progress > 0.58 && progress < 0.65 && dist < 6.0) {
                    takeDamage(Math.floor(50 * bossDmgMult));
                    spawnParticles(boss.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xff4400, 40);
                }
            } else {
                // Recovery (slow — punish window for player)
                boss.group.position.y = lerp(boss.group.position.y, 0, 10*delta);
                bossResetPose(4);
            }
            if (state.bossAttackTimer <= 0) {
                boss.group.position.y = 0;
                state.bossState = 'IDLE';
            }

        // === DASH: Fast gap-close with a thrust ===
        } else if (state.bossState === 'DASH') {
            state.bossAttackTimer -= delta;
            const dur = 0.9 / bossSpeedMult;
            const progress = 1 - (state.bossAttackTimer / dur);

            if (progress < 0.25) {
                // Ready stance — lower weapon forward
                boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, -Math.PI/2, 15*delta);
                boss.body.rotation.x = lerp(boss.body.rotation.x, 0.3, 10*delta);
            } else if (progress < 0.6) {
                // DASH forward extremely fast
                boss.group.position.x += Math.sin(boss.group.rotation.y) * 28 * bossSpeedMult * delta;
                boss.group.position.z += Math.cos(boss.group.rotation.y) * 28 * bossSpeedMult * delta;
                boss.rightArmPivot.rotation.x = -Math.PI/2;
                boss.body.rotation.x = 0.4;
                // Damage in narrow window
                if (progress > 0.35 && progress < 0.5 && dist < 3.5) {
                    takeDamage(Math.floor(40 * bossDmgMult));
                    spawnParticles(player.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff2200, 25);
                }
            } else {
                boss.body.rotation.x = lerp(boss.body.rotation.x, 0, 8*delta);
                bossResetPose(6);
            }
            if (state.bossAttackTimer <= 0) {
                boss.body.rotation.x = 0;
                state.bossState = 'IDLE';
            }

        // === REST: Boss is exhausted and pants ===
        } else if (state.bossState === 'REST') {
            const regenSpeed = isPhase2 ? 40 : 25;
            state.bossStamina = Math.min(state.bossMaxStamina, state.bossStamina + regenSpeed * delta);
            
            // Rest animation (panting)
            boss.body.rotation.x = Math.sin(time * 3) * 0.1 + 0.2; // lean forward and pant
            boss.leftArmPivot.rotation.x = lerp(boss.leftArmPivot.rotation.x, 0.2, 5*delta);
            boss.rightArmPivot.rotation.x = lerp(boss.rightArmPivot.rotation.x, 0.2, 5*delta);
            boss.head.rotation.x = lerp(boss.head.rotation.x, 0.3, 5*delta); // head down
            
            // Stop walking
            boss.leftLegPivot.rotation.x = lerp(boss.leftLegPivot.rotation.x, 0, 5*delta);
            boss.rightLegPivot.rotation.x = lerp(boss.rightLegPivot.rotation.x, 0, 5*delta);

            if (state.bossStamina >= state.bossMaxStamina) {
                state.bossState = 'IDLE';
                boss.body.rotation.x = 0;
                boss.head.rotation.x = 0;
            }

        // === IDLE / CHASE ===
        } else {
            // Move or idle
            if (dist > 3.5) {
                state.bossState = 'CHASE';
                state.bossStamina = Math.min(state.bossMaxStamina, state.bossStamina + 5 * delta); // slow passive regen
                const chaseSpeed = (isPhase2 ? 5.5 : 3.5);
                boss.group.position.x += Math.sin(boss.group.rotation.y) * chaseSpeed * delta;
                boss.group.position.z += Math.cos(boss.group.rotation.y) * chaseSpeed * delta;
                
                // walk anim
                const walkFreq = isPhase2 ? 8 : 5;
                boss.leftLegPivot.rotation.x = Math.sin(time * walkFreq) * 0.5;
                boss.rightLegPivot.rotation.x = -Math.sin(time * walkFreq) * 0.5;
                boss.leftArmPivot.rotation.x = -Math.sin(time * walkFreq) * 0.3;
                boss.rightArmPivot.rotation.x = Math.sin(time * walkFreq) * 0.3;

                // If far away, sometimes dash to close gap
                if (dist > 10 && isPhase2 && Math.random() < 0.03) {
                    if (state.bossStamina <= 10) {
                        state.bossState = 'REST';
                    } else {
                        state.bossState = 'DASH';
                        state.bossAttackTimer = 0.9 / bossSpeedMult;
                        state.bossStamina -= 30;
                    }
                }
            } else {
                boss.leftLegPivot.rotation.x = lerp(boss.leftLegPivot.rotation.x, 0, 8*delta);
                boss.rightLegPivot.rotation.x = lerp(boss.rightLegPivot.rotation.x, 0, 8*delta);
                
                // Choose attack pattern
                const attackChance = isPhase2 ? 0.04 : 0.025;
                if (Math.random() < attackChance) {
                    if (state.bossStamina <= 0) {
                        state.bossState = 'REST';
                    } else {
                        const roll = Math.random();
                        if (isPhase2) {
                            if (roll < 0.2) { state.bossState = 'SLASH'; state.bossAttackTimer = 0.8/bossSpeedMult; state.bossStamina -= 25; }
                            else if (roll < 0.5) { state.bossState = 'COMBO'; state.bossAttackTimer = 2.0/bossSpeedMult; state.bossStamina -= 60; }
                            else if (roll < 0.75) { state.bossState = 'JUMP_SLAM'; state.bossAttackTimer = 1.8/bossSpeedMult; state.bossStamina -= 40; }
                            else { state.bossState = 'DASH'; state.bossAttackTimer = 0.9/bossSpeedMult; state.bossStamina -= 30; }
                        } else {
                            if (roll < 0.4) { state.bossState = 'SLASH'; state.bossAttackTimer = 0.8/bossSpeedMult; state.bossStamina -= 25; }
                            else if (roll < 0.7) { state.bossState = 'COMBO'; state.bossAttackTimer = 2.0/bossSpeedMult; state.bossStamina -= 60; }
                            else { state.bossState = 'JUMP_SLAM'; state.bossAttackTimer = 1.8/bossSpeedMult; state.bossStamina -= 40; }
                        }
                    }
                } else if (state.bossStamina < state.bossMaxStamina) {
                    state.bossStamina += 5 * delta;
                }
            }
        }
    }

    // Fire flicker
    fireLight.intensity = 4 + Math.random() * 2;

    renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
