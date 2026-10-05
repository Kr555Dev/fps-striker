/**
 * Procedural Stylized Asset & Texture Generator
 * Loads AI-generated high resolution tactical skins for AR, Sniper, Revolver, SMG, and Bot Armor.
 */

class TextureGenerator {
    constructor() {
        this.cache = {};
        this.loader = new THREE.TextureLoader();
        this.weaponTextures = {
            ar: null,
            sniper: null,
            revolver: null,
            smg: null,
            armor: null
        };
        this.loadWeaponSkins();
    }

    loadWeaponSkins() {
        const setupTex = (path, fallbackFn) => {
            return this.loader.load(
                path,
                (tex) => {
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.anisotropy = 8;
                    tex.generateMipmaps = true;
                    tex.needsUpdate = true;
                },
                undefined,
                (err) => {
                    console.warn(`Fallback texture used for ${path}`);
                    if (fallbackFn) fallbackFn();
                }
            );
        };

        this.weaponTextures.ar = setupTex('assets/ar_skin.png');
        this.weaponTextures.sniper = setupTex('assets/sniper_skin.png');
        this.weaponTextures.revolver = setupTex('assets/revolver_skin.png');
        this.weaponTextures.smg = setupTex('assets/smg_skin.png');
        this.weaponTextures.armor = setupTex('assets/bot_armor.png');
    }

    getRevolverSkin() {
        if (this.cache.revolverSkin) return this.cache.revolverSkin;
        const { canvas, ctx } = this.createCanvas(512, 512);

        // Brushed titanium metal base
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#8e97a3');
        grad.addColorStop(0.5, '#b0bac6');
        grad.addColorStop(1, '#717a86');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Brushed metal lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let y = 0; y < 512; y += 3) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Fluted cylinder grooves
        ctx.fillStyle = '#3a4049';
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(40 + i * 72, 80, 24, 240);
        }

        // Gold Magnum text engraving
        ctx.fillStyle = '#e5b838';
        ctx.font = 'bold 24px Rajdhani, sans-serif';
        ctx.fillText('.357 MAGNUM // ENFORCER', 50, 420);

        // Checkered grip pattern (bottom right)
        ctx.fillStyle = '#22160d';
        ctx.fillRect(340, 340, 160, 160);
        ctx.fillStyle = '#4a2f1b';
        for (let x = 340; x < 500; x += 12) {
            for (let y = 340; y < 500; y += 12) {
                if ((x + y) % 24 === 0) ctx.fillRect(x, y, 10, 10);
            }
        }

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.revolverSkin = tex;
        return tex;
    }

    createCanvas(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx };
    }

    toTexture(canvas, repeatX = 1, repeatY = 1) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        return texture;
    }

    getGrassVoxel(repeatX = 16, repeatY = 16) {
        const key = `grassVoxel_${repeatX}_${repeatY}`;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.createCanvas(512, 512);

        // Base rich olive green
        ctx.fillStyle = '#55782e';
        ctx.fillRect(0, 0, 512, 512);

        const gridSize = 128;
        for (let x = 0; x < 512; x += gridSize) {
            for (let y = 0; y < 512; y += gridSize) {
                const alt = ((x / gridSize + y / gridSize) % 2 === 0);
                ctx.fillStyle = alt ? '#5d8234' : '#4d6d29';
                ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);

                // Subtle edge highlight and shadow for voxel look
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.fillRect(x + 2, y + 2, gridSize - 4, 3);
                ctx.fillRect(x + 2, y + 2, 3, gridSize - 4);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                ctx.fillRect(x + 2, y + gridSize - 5, gridSize - 4, 3);
                ctx.fillRect(x + gridSize - 5, y + 2, 3, gridSize - 4);

                // Subtle grass speckle
                ctx.fillStyle = alt ? '#668f3a' : '#435e23';
                ctx.fillRect(x + 32, y + 40, 12, 12);
                ctx.fillRect(x + 80, y + 84, 14, 14);
            }
        }

        const tex = this.toTexture(canvas, repeatX, repeatY);
        this.cache[key] = tex;
        return tex;
    }

    getDirtPath(repeatX = 8, repeatY = 8) {
        const key = `dirtPath_${repeatX}_${repeatY}`;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.createCanvas(512, 512);

        // Warm earthy brown / clay
        ctx.fillStyle = '#b07e46';
        ctx.fillRect(0, 0, 512, 512);

        const sz = 128;
        for (let x = 0; x < 512; x += sz) {
            for (let y = 0; y < 512; y += sz) {
                const alt = ((x / sz + y / sz) % 2 === 0);
                ctx.fillStyle = alt ? '#b9874d' : '#a2713a';
                ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x + 2, y + 2, sz - 4, 3);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                ctx.fillRect(x + 2, y + sz - 5, sz - 4, 3);

                // Pebbles
                ctx.fillStyle = '#7a5127';
                ctx.fillRect(x + 44, y + 36, 16, 10);
                ctx.fillRect(x + 88, y + 92, 12, 14);
            }
        }

        const tex = this.toTexture(canvas, repeatX, repeatY);
        this.cache[key] = tex;
        return tex;
    }

    getStoneMasonry(repeatX = 8, repeatY = 2) {
        const key = `stoneMasonry_${repeatX}_${repeatY}`;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.createCanvas(512, 512);

        // Dark slate stone base
        ctx.fillStyle = '#2d3235';
        ctx.fillRect(0, 0, 512, 512);

        const rows = 8;
        const rowHeight = 512 / rows;
        const cols = 4;
        const colWidth = 512 / cols;

        for (let r = 0; r < rows; r++) {
            const y = r * rowHeight;
            const offset = (r % 2) * (colWidth / 2);
            for (let c = -1; c <= cols; c++) {
                const x = c * colWidth + offset;
                const shade = 48 + ((r * 7 + c * 13) % 15);
                ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 6})`;
                ctx.fillRect(x + 2, y + 2, colWidth - 4, rowHeight - 4);

                // Top beveled highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(x + 2, y + 2, colWidth - 4, 3);
                ctx.fillRect(x + 2, y + 2, 3, rowHeight - 4);

                // Bottom and right beveled shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
                ctx.fillRect(x + 2, y + rowHeight - 5, colWidth - 4, 3);
                ctx.fillRect(x + colWidth - 5, y + 2, 3, rowHeight - 4);
            }
            // Deep mortar line
            ctx.fillStyle = '#1e2123';
            ctx.fillRect(0, y - 2, 512, 4);
        }

        const tex = this.toTexture(canvas, repeatX, repeatY);
        this.cache[key] = tex;
        return tex;
    }

    getSandBrick(repeatX = 8, repeatY = 2) {
        return this.getStoneMasonry(repeatX, repeatY);
    }

    getConcrete(repeatX = 4, repeatY = 2) {
        const key = `concrete_${repeatX}_${repeatY}`;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.createCanvas(512, 512);

        ctx.fillStyle = '#96a0ab';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#606a75';
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 500, 500);
        ctx.beginPath();
        ctx.moveTo(256, 0); ctx.lineTo(256, 512);
        ctx.moveTo(0, 256); ctx.lineTo(512, 256);
        ctx.stroke();

        const bolts = [
            [24, 24], [240, 24], [272, 24], [488, 24],
            [24, 240], [240, 240], [272, 240], [488, 240],
            [24, 272], [240, 272], [272, 272], [488, 272],
            [24, 488], [240, 488], [272, 488], [488, 488]
        ];
        ctx.fillStyle = '#3a4149';
        bolts.forEach(([bx, by]) => {
            ctx.beginPath();
            ctx.arc(bx, by, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        const tex = this.toTexture(canvas, repeatX, repeatY);
        this.cache[key] = tex;
        return tex;
    }

    getGroundTiles(repeatX = 32, repeatY = 32) {
        const key = `ground_${repeatX}_${repeatY}`;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.createCanvas(512, 512);

        ctx.fillStyle = '#b5ab9e';
        ctx.fillRect(0, 0, 512, 512);

        const tileSize = 128;
        for (let x = 0; x < 512; x += tileSize) {
            for (let y = 0; y < 512; y += tileSize) {
                const isAlt = ((x / tileSize + y / tileSize) % 2 === 0);
                ctx.fillStyle = isAlt ? '#c2b6a7' : '#ada293';
                ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.fillRect(x + 2, y + 2, tileSize - 4, 3);
                ctx.fillRect(x + 2, y + 2, 3, tileSize - 4);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
                ctx.fillRect(x + 2, y + tileSize - 5, tileSize - 4, 3);
                ctx.fillRect(x + tileSize - 5, y + 2, 3, tileSize - 4);
            }
        }

        const tex = this.toTexture(canvas, repeatX, repeatY);
        this.cache[key] = tex;
        return tex;
    }

    getWoodCrate() {
        if (this.cache.woodCrate) return this.cache.woodCrate;
        const { canvas, ctx } = this.createCanvas(512, 512);

        ctx.fillStyle = '#a66838';
        ctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 4; i++) {
            const py = i * 128;
            ctx.fillStyle = i % 2 === 0 ? '#b87541' : '#9a5f33';
            ctx.fillRect(0, py, 512, 128);
            ctx.fillStyle = '#5c381c';
            ctx.fillRect(0, py, 512, 4);
        }

        const frameW = 48;
        ctx.fillStyle = '#874d23';
        ctx.fillRect(0, 0, 512, frameW);
        ctx.fillRect(0, 512 - frameW, 512, frameW);
        ctx.fillRect(0, 0, frameW, 512);
        ctx.fillRect(512 - frameW, 0, frameW, 512);

        ctx.save();
        ctx.translate(256, 256);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#874d23';
        ctx.fillRect(-280, -28, 560, 56);
        ctx.restore();

        ctx.fillStyle = '#3d444f';
        const cornerSize = 72;
        ctx.fillRect(0, 0, cornerSize, 18);
        ctx.fillRect(0, 0, 18, cornerSize);
        ctx.fillRect(512 - cornerSize, 0, cornerSize, 18);
        ctx.fillRect(512 - 18, 0, 18, cornerSize);
        ctx.fillRect(0, 512 - 18, cornerSize, 18);
        ctx.fillRect(0, 512 - cornerSize, 18, cornerSize);
        ctx.fillRect(512 - cornerSize, 512 - 18, cornerSize, 18);
        ctx.fillRect(512 - 18, 512 - cornerSize, 18, cornerSize);

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.woodCrate = tex;
        return tex;
    }

    getMilitaryCrate() {
        if (this.cache.militaryCrate) return this.cache.militaryCrate;
        const { canvas, ctx } = this.createCanvas(512, 512);

        ctx.fillStyle = '#4a5942';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#3c4735';
        ctx.fillRect(40, 40, 432, 432);

        ctx.save();
        ctx.beginPath();
        ctx.rect(40, 216, 432, 80);
        ctx.clip();
        ctx.fillStyle = '#e6af2e';
        ctx.fillRect(40, 216, 432, 80);
        ctx.fillStyle = '#222222';
        for (let i = -100; i < 600; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 216);
            ctx.lineTo(i + 30, 216);
            ctx.lineTo(i - 10, 296);
            ctx.lineTo(i - 40, 296);
            ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = 'bold 36px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TACTICAL SUPPLY', 256, 170);

        ctx.strokeStyle = '#6b7f60';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, 504, 504);

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.militaryCrate = tex;
        return tex;
    }

    getShippingContainer(baseColor = '#d95328') {
        const key = 'container_' + baseColor;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.createCanvas(512, 512);

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        const ridgeWidth = 32;
        for (let x = 0; x < 512; x += ridgeWidth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(x, 0, 6, 512);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(x + ridgeWidth - 6, 0, 6, 512);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, 512, 24);
        ctx.fillRect(0, 512 - 24, 512, 24);
        ctx.fillRect(0, 0, 24, 512);
        ctx.fillRect(512 - 24, 0, 24, 512);

        const tex = this.toTexture(canvas, 1, 1);
        this.cache[key] = tex;
        return tex;
    }

    getDiamondPlate() {
        if (this.cache.diamondPlate) return this.cache.diamondPlate;
        const { canvas, ctx } = this.createCanvas(256, 256);

        ctx.fillStyle = '#343b47';
        ctx.fillRect(0, 0, 256, 256);

        ctx.fillStyle = '#5c697a';
        for (let x = 16; x < 256; x += 32) {
            for (let y = 16; y < 256; y += 32) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-6, -2, 12, 4);
                ctx.restore();
            }
        }

        const tex = this.toTexture(canvas, 4, 4);
        this.cache.diamondPlate = tex;
        return tex;
    }

    getJumpPadTexture() {
        if (this.cache.jumpPad) return this.cache.jumpPad;
        const { canvas, ctx } = this.createCanvas(256, 256);

        ctx.fillStyle = '#111822';
        ctx.fillRect(0, 0, 256, 256);

        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, 246, 246);

        ctx.fillStyle = '#00ffcc';
        for (let y = 180; y >= 60; y -= 50) {
            ctx.beginPath();
            ctx.moveTo(128, y - 30);
            ctx.lineTo(190, y + 10);
            ctx.lineTo(170, y + 10);
            ctx.lineTo(128, y - 15);
            ctx.lineTo(86, y + 10);
            ctx.lineTo(66, y + 10);
            ctx.closePath();
            ctx.fill();
        }

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.jumpPad = tex;
        return tex;
    }

    getStoneTrim() {
        if (this.cache.stoneTrim) return this.cache.stoneTrim;
        const { canvas, ctx } = this.createCanvas(256, 256);
        ctx.fillStyle = '#222629';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(0, 0, 256, 8);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, 248, 256, 8);
        const tex = this.toTexture(canvas, 1, 1);
        this.cache.stoneTrim = tex;
        return tex;
    }

    getAKReceiver() {
        if (this.cache.akReceiver) return this.cache.akReceiver;
        const { canvas, ctx } = this.createCanvas(512, 512);
        // Dark slate gunmetal
        ctx.fillStyle = '#26292e';
        ctx.fillRect(0, 0, 512, 512);

        // Receiver top ribs
        ctx.fillStyle = '#1c1e22';
        for (let y = 40; y < 220; y += 30) {
            ctx.fillRect(20, y, 472, 10);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(20, y + 10, 472, 3);
            ctx.fillStyle = '#1c1e22';
        }

        // Fire selector switch
        ctx.fillStyle = '#3a3f47';
        ctx.fillRect(360, 260, 80, 24);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(360, 260, 80, 3);

        // Rivets
        const rivets = [[60, 60], [60, 440], [450, 60], [450, 440], [256, 320]];
        ctx.fillStyle = '#424852';
        rivets.forEach(([rx, ry]) => {
            ctx.beginPath();
            ctx.arc(rx, ry, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(rx - 2, ry - 5, 4, 2);
            ctx.fillStyle = '#424852';
        });

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.akReceiver = tex;
        return tex;
    }

    getWoodTexture() {
        if (this.cache.woodTexture) return this.cache.woodTexture;
        const { canvas, ctx } = this.createCanvas(512, 512);
        // Rich warm cedar/wood (Commando handguard & stock)
        ctx.fillStyle = '#b57038';
        ctx.fillRect(0, 0, 512, 512);

        // Wood grain stripes
        for (let y = 0; y < 512; y += 16) {
            const alt = (y % 32 === 0);
            ctx.fillStyle = alt ? '#c67e42' : '#a2622f';
            ctx.fillRect(0, y, 512, 16);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(0, y, 512, 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(0, y + 14, 512, 2);
        }

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.woodTexture = tex;
        return tex;
    }

    getSuitFabric() {
        if (this.cache.suitFabric) return this.cache.suitFabric;
        const { canvas, ctx } = this.createCanvas(256, 256);
        ctx.fillStyle = '#26292e';
        ctx.fillRect(0, 0, 256, 256);

        // Fine weave
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 256; i += 4) {
            ctx.fillRect(i, 0, 1, 256);
            ctx.fillRect(0, i, 256, 1);
        }

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.suitFabric = tex;
        return tex;
    }

    getFoliageTexture() {
        if (this.cache.foliage) return this.cache.foliage;
        const { canvas, ctx } = this.createCanvas(256, 256);
        ctx.fillStyle = '#3e6322';
        ctx.fillRect(0, 0, 256, 256);
        const sz = 32;
        for (let x = 0; x < 256; x += sz) {
            for (let y = 0; y < 256; y += sz) {
                const alt = (x / sz + y / sz) % 2 === 0;
                ctx.fillStyle = alt ? '#487228' : '#35541c';
                ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4);
            }
        }
        const tex = this.toTexture(canvas, 2, 2);
        this.cache.foliage = tex;
        return tex;
    }

    getSniperChassis() {
        if (this.cache.sniperChassis) return this.cache.sniperChassis;
        const { canvas, ctx } = this.createCanvas(512, 512);

        // Rich dark tactical composite / olive drab chassis
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#2e3530');
        grad.addColorStop(0.5, '#3b443e');
        grad.addColorStop(1, '#252a26');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Carbon weave / tactical texture pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let x = 0; x < 512; x += 8) {
            for (let y = 0; y < 512; y += 8) {
                if ((x + y) % 16 === 0) ctx.fillRect(x, y, 6, 6);
            }
        }

        // Action bedding block & receiver track
        ctx.fillStyle = '#1c1f1d';
        ctx.fillRect(40, 180, 432, 60);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(40, 180, 432, 3);
        ctx.fillRect(40, 237, 432, 3);

        // Golden Marksman Model Engraving
        ctx.fillStyle = '#e5b838';
        ctx.font = 'bold 22px Rajdhani, sans-serif';
        ctx.fillText('MARKSMAN .308 // PRECISION TACTICAL', 60, 220);

        // Grip stippling panel (bottom right)
        ctx.fillStyle = '#181b19';
        ctx.fillRect(320, 320, 160, 160);
        ctx.fillStyle = '#2d332f';
        for (let x = 324; x < 476; x += 8) {
            for (let y = 324; y < 476; y += 8) {
                ctx.fillRect(x, y, 4, 4);
            }
        }

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.sniperChassis = tex;
        return tex;
    }

    getSMGReceiver() {
        if (this.cache.smgReceiver) return this.cache.smgReceiver;
        const { canvas, ctx } = this.createCanvas(512, 512);

        // Deep matte parkerized steel
        ctx.fillStyle = '#22252a';
        ctx.fillRect(0, 0, 512, 512);

        // Horizontal receiver stamping grooves
        ctx.fillStyle = '#16181b';
        for (let y = 60; y < 460; y += 40) {
            ctx.fillRect(20, y, 472, 14);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(20, y, 472, 2);
            ctx.fillStyle = '#16181b';
        }

        // Fire Selector Pictograms (Iconic Safe / Semi / Full Auto)
        // Safe (White)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(80, 460, 24, 6);
        // Semi (White bullet)
        ctx.fillRect(130, 456, 8, 14);
        // Full Auto (Red triple bullets)
        ctx.fillStyle = '#ff2255';
        ctx.fillRect(180, 456, 6, 14);
        ctx.fillRect(190, 456, 6, 14);
        ctx.fillRect(200, 456, 6, 14);

        // Model Stamping
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 22px Rajdhani, sans-serif';
        ctx.fillText('SKIRMISHER // 9x19mm SUBMACHINE', 60, 200);

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.smgReceiver = tex;
        return tex;
    }

    getRevolverSteel() {
        if (this.cache.revolverSteel) return this.cache.revolverSteel;
        const { canvas, ctx } = this.createCanvas(512, 512);

        // High grade polished gunmetal gradient
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#5a626d');
        grad.addColorStop(0.3, '#8e98a5');
        grad.addColorStop(0.7, '#6b7480');
        grad.addColorStop(1, '#474d56');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Brushed metal directional sheen
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 1;
        for (let y = 0; y < 512; y += 2) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Cylinder stop recesses & flutes
        ctx.fillStyle = '#2c3138';
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(60 + i * 68, 120, 26, 160);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(60 + i * 68, 120, 26, 3);
            ctx.fillStyle = '#2c3138';
        }

        // Gold Magnum Crest
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 26px Rajdhani, sans-serif';
        ctx.fillText('.357 MAGNUM // ENFORCER', 60, 420);

        const tex = this.toTexture(canvas, 1, 1);
        this.cache.revolverSteel = tex;
        return tex;
    }
}

window.textureGen = new TextureGenerator();

