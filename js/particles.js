/**
 * VFX & Particle Systems: Bullet Tracers, Impact Sparks, Voxel Death Shatter, Floating Damage
 */

class ParticleEngine {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.particles = [];       // Array of particle meshes with velocity & life
        this.tracers = [];         // Dynamic tracer lines
        this.floatingDamages = []; // { el, pos3D, life, maxLife }
        this.damageContainer = document.getElementById('floating-damage-container');

        // Shared materials for performance
        this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd000 });
        this.bloodMat = new THREE.MeshBasicMaterial({ color: 0xff1e46 });
        this.botDebrisMat = new THREE.MeshLambertMaterial({ color: 0x3388ff });
        this.sparkGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.bloodGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        this.debrisGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);

        // Screen shake trauma
        this.trauma = 0;
    }

    addTrauma(amount) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    // 1. Bullet Tracer Line
    createTracer(from, to, color = 0x00ffcc) {
        const material = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2,
            transparent: true,
            opacity: 0.9
        });
        const points = [from.clone(), to.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        this.tracers.push({
            mesh: line,
            material: material,
            life: 0.08,
            maxLife: 0.08
        });
    }

    // 2. Wall Impact Sparks
    createWallImpact(position, normal) {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat);
            mesh.position.copy(position);

            // Random bounce velocity biased towards normal
            const spread = 4.0;
            const vx = normal.x * 4 + (Math.random() - 0.5) * spread;
            const vy = normal.y * 4 + Math.random() * spread;
            const vz = normal.z * 4 + (Math.random() - 0.5) * spread;

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(vx, vy, vz),
                gravity: -16,
                life: 0.25 + Math.random() * 0.15,
                maxLife: 0.4
            });
        }
    }

    // 3. Enemy Hit Voxel Splatter
    createHitSplatter(position, isHeadshot = false) {
        const count = isHeadshot ? 16 : 8;
        const mat = isHeadshot ? new THREE.MeshBasicMaterial({ color: 0xff0044 }) : this.bloodMat;

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.bloodGeo, mat);
            mesh.position.copy(position);

            const spread = isHeadshot ? 6.5 : 4.5;
            const vx = (Math.random() - 0.5) * spread;
            const vy = 2.0 + Math.random() * spread;
            const vz = (Math.random() - 0.5) * spread;

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(vx, vy, vz),
                gravity: -18,
                life: 0.4 + Math.random() * 0.2,
                maxLife: 0.6
            });
        }
    }

    // 4. Enemy Voxel Shatter Explosion (Iconic Voxel Death)
    createDeathShatter(position, color = 0x3388ff) {
        const count = 20;
        const debrisMat = new THREE.MeshLambertMaterial({ color: color });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.debrisGeo, debrisMat);
            mesh.position.copy(position);
            mesh.position.x += (Math.random() - 0.5) * 1.2;
            mesh.position.y += Math.random() * 1.8;
            mesh.position.z += (Math.random() - 0.5) * 1.2;

            mesh.castShadow = true;
            mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);

            const vx = (Math.random() - 0.5) * 12;
            const vy = 4 + Math.random() * 8;
            const vz = (Math.random() - 0.5) * 12;

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(vx, vy, vz),
                rotVel: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
                gravity: -22,
                life: 1.2 + Math.random() * 0.5,
                maxLife: 1.7
            });
        }
    }

    // 5. Booster / Power-Up Activation Particle Burst
    createBoosterPickupEffect(position, color = 0x00ffcc) {
        const count = 22;
        const mat = new THREE.MeshBasicMaterial({ color: color });
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.sparkGeo, mat);
            mesh.position.copy(position);
            mesh.position.x += (Math.random() - 0.5) * 0.5;
            mesh.position.y += 0.8 + (Math.random() - 0.5) * 0.5;
            mesh.position.z += (Math.random() - 0.5) * 0.5;

            const angle = Math.random() * Math.PI * 2;
            const speed = 3.5 + Math.random() * 5.0;
            const vx = Math.cos(angle) * speed;
            const vy = 2.5 + Math.random() * 4.5;
            const vz = Math.sin(angle) * speed;

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(vx, vy, vz),
                rotVel: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
                gravity: -12,
                life: 0.5 + Math.random() * 0.35,
                maxLife: 0.85
            });
        }
    }

    // 6. Floating 3D Damage Indicator & Notifications
    addDamageNumber(damage, worldPos, isHeadshot = false) {
        if (!this.damageContainer) return;
        const div = document.createElement('div');
        let cls = 'dmg-number';
        let txt = damage;

        if (typeof damage === 'string' && (damage.includes('AMMO') || damage.includes('+') || damage.includes('FULL') || damage.includes('SHELL'))) {
            cls = damage.includes('FULL') ? 'dmg-number ammo-full' : 'dmg-number ammo-pickup';
        } else if (isHeadshot) {
            cls = 'dmg-number headshot';
            txt = `CRIT ${damage}!`;
        }
        div.className = cls;
        div.innerText = txt;
        this.damageContainer.appendChild(div);

        this.floatingDamages.push({
            el: div,
            pos3D: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.35, 1.1, (Math.random() - 0.5) * 0.35)),
            life: 0.85,
            maxLife: 0.85
        });
    }

    addFloatingText(text, worldPos, customClass = 'ammo-pickup') {
        if (!this.damageContainer) return;
        const div = document.createElement('div');
        div.className = `dmg-number ${customClass}`;
        div.innerText = text;
        this.damageContainer.appendChild(div);

        this.floatingDamages.push({
            el: div,
            pos3D: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.9, (Math.random() - 0.5) * 0.3)),
            life: 0.95,
            maxLife: 0.95
        });
    }

    update(dt) {
        // 1. Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry && p.mesh.geometry !== this.sparkGeo && p.mesh.geometry !== this.bloodGeo && p.mesh.geometry !== this.debrisGeo) {
                    p.mesh.geometry.dispose();
                }
                this.particles.splice(i, 1);
                continue;
            }

            p.velocity.y += p.gravity * dt;
            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.rotVel) {
                p.mesh.rotation.x += p.rotVel.x * dt;
                p.mesh.rotation.y += p.rotVel.y * dt;
                p.mesh.rotation.z += p.rotVel.z * dt;
            }

            // Floor bounce
            if (p.mesh.position.y <= 0.1) {
                p.mesh.position.y = 0.1;
                p.velocity.y = -p.velocity.y * 0.35;
                p.velocity.x *= 0.7;
                p.velocity.z *= 0.7;
            }

            // Fade scale towards end
            const scale = Math.max(0.01, p.life / p.maxLife);
            p.mesh.scale.set(scale, scale, scale);
        }

        // 2. Update Tracers
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const t = this.tracers[i];
            t.life -= dt;
            t.material.opacity = (t.life / t.maxLife);
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                t.mesh.geometry.dispose();
                t.material.dispose();
                this.tracers.splice(i, 1);
            }
        }

        // 3. Update Floating Damage Numbers (Project 3D to 2D Screen Space)
        for (let i = this.floatingDamages.length - 1; i >= 0; i--) {
            const fd = this.floatingDamages[i];
            fd.life -= dt;
            fd.pos3D.y += dt * 1.5; // Float up

            if (fd.life <= 0) {
                if (fd.el.parentNode) fd.el.parentNode.removeChild(fd.el);
                this.floatingDamages.splice(i, 1);
                continue;
            }

            // Project to screen
            const tempVec = fd.pos3D.clone();
            tempVec.project(this.camera);

            // Check if in front of camera
            if (tempVec.z > 1.0) {
                fd.el.style.display = 'none';
            } else {
                fd.el.style.display = 'block';
                const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-tempVec.y * 0.5 + 0.5) * window.innerHeight;
                fd.el.style.left = `${x}px`;
                fd.el.style.top = `${y}px`;
            }
        }

        // 4. Update Screen Shake Trauma Decay
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * 2.5);
        }
    }

    getShakeOffset() {
        if (this.trauma <= 0) return { x: 0, y: 0, roll: 0 };
        const shake = this.trauma * this.trauma; // Non-linear
        const x = (Math.random() - 0.5) * 0.08 * shake;
        const y = (Math.random() - 0.5) * 0.08 * shake;
        const roll = (Math.random() - 0.5) * 0.05 * shake;
        return { x, y, roll };
    }
}

window.ParticleEngine = ParticleEngine;
