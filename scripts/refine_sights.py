import os

weapons_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "js", "weapons.js")

with open(weapons_path, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Update this.weapons adsPos
old_ads_ar = "adsPos: new THREE.Vector3(0.0, -0.084, -0.28),"
new_ads_ar = "adsPos: new THREE.Vector3(0.0, -0.084, -0.34),"

old_ads_smg = "adsPos: new THREE.Vector3(0.0, -0.062, -0.26),"
new_ads_smg = "adsPos: new THREE.Vector3(0.0, -0.090, -0.34),"

old_ads_rev = "adsPos: new THREE.Vector3(0.0, -0.058, -0.26),"
new_ads_rev = "adsPos: new THREE.Vector3(0.0, -0.074, -0.34),"

old_ads_sh = "adsPos: new THREE.Vector3(0.0, -0.043, -0.30),"
new_ads_sh = "adsPos: new THREE.Vector3(0.0, -0.049, -0.34),"

for old, new in [(old_ads_ar, new_ads_ar), (old_ads_smg, new_ads_smg), (old_ads_rev, new_ads_rev), (old_ads_sh, new_ads_sh)]:
    if old in c:
        c = c.replace(old, new, 1)
        print(f"Replaced {old[:15]} -> {new[:15]}")
    else:
        print(f"Warning: could not find {old}")

# 2. Refine SMG sights: add sleek tactical reflex CQB sight and lower cocking tube
old_smg_sights = """        // --- Authentic Sights (Hooded Front + Hollow Diopter Rear) ---
        // Rear Rotary Diopter Drum Sight with Hollow Peep Notch
        const diopterBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.028), darkSteelMat);
        diopterBase.position.set(0, 0.046, 0.10);
        smgGroup.add(diopterBase);

        const diopterDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), gunmetalMat);
        diopterDrum.position.set(0, 0.058, 0.10);
        smgGroup.add(diopterDrum);

        // Hollow peep aperture through which the player sights
        const diopterAperture = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.026, 8), darkSteelMat);
        diopterAperture.rotation.x = Math.PI / 2;
        diopterAperture.position.set(0, 0.062, 0.10);
        smgGroup.add(diopterAperture);

        // Iconic Hooded Circular Front Sight
        const hoodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.018, 12, 1, true);
        const sightHood = new THREE.Mesh(hoodGeo, darkSteelMat);
        sightHood.rotation.x = Math.PI / 2;
        sightHood.position.set(0, 0.062, -0.38);
        smgGroup.add(sightHood);

        const sightPost = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.018, 0.005), cyanTrimMat);
        sightPost.position.set(0, 0.058, -0.38);
        smgGroup.add(sightPost);"""

new_smg_sights = """        // --- Tactical Top Optic Rail & CQB Reflex Holographic Sight ---
        // Raised top Picatinny rail
        const smgTopRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.16), darkSteelMat);
        smgTopRail.position.set(0, 0.058, -0.02);
        smgGroup.add(smgTopRail);

        // Tactical Reflex Optic Base Mount
        const smgOpticBase = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.014, 0.072), gunmetalMat);
        smgOpticBase.position.set(0, 0.069, -0.02);
        smgGroup.add(smgOpticBase);

        // Hooded Reflex Sight Frame (protective hood with open center window)
        // Left upright post
        const reflexPostL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.038, 0.022), darkSteelMat);
        reflexPostL.position.set(-0.018, 0.090, -0.02);
        smgGroup.add(reflexPostL);

        // Right upright post
        const reflexPostR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.038, 0.022), darkSteelMat);
        reflexPostR.position.set(0.018, 0.090, -0.02);
        smgGroup.add(reflexPostR);

        // Top bridging crossbar
        const reflexPostTop = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.006, 0.022), darkSteelMat);
        reflexPostTop.position.set(0, 0.109, -0.02);
        smgGroup.add(reflexPostTop);

        // Transparent Glass Lens inside reflex window
        const reflexLens = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.032, 0.004), glassLensMat);
        reflexLens.position.set(0, 0.090, -0.02);
        smgGroup.add(reflexLens);

        // Luminous Fluorescent Green Reticle Dot
        const reflexDot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.006), luminousPipMat);
        reflexDot.position.set(0, 0.090, -0.02);
        smgGroup.add(reflexDot);

        // Front Cowitness Sight Post
        const smgFrontBase = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.036, 0.024), darkSteelMat);
        smgFrontBase.position.set(0, 0.062, -0.38);
        smgGroup.add(smgFrontBase);

        const smgFrontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.004), cyanTrimMat);
        smgFrontPost.position.set(0, 0.086, -0.38);
        smgGroup.add(smgFrontPost);"""

if old_smg_sights in c:
    c = c.replace(old_smg_sights, new_smg_sights, 1)
    print("Replaced SMG sights with CQB reflex optic!")
else:
    print("Warning: could not find old_smg_sights")

# 3. Refine Revolver sights: elevate rear notch and front fiber-optic blade
old_rev_sights = """        // Micro-adjustable Rear Sight Notch
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.016, 0.022), darkSteelMat);
        rearSight.position.set(0, 0.054, 0.09);
        revGroup.add(rearSight);

        const rearSightNotch = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.024), titaniumMat);
        rearSightNotch.position.set(0, 0.058, 0.09);
        revGroup.add(rearSightNotch);

        // High-Visibility Fluorescent Orange Fiber-Optic Front Sight
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.024, 0.048), darkSteelMat);
        frontSightRamp.position.set(0, 0.054, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.034, 8), opticOrangeMat);
        frontBlade.rotation.x = Math.PI / 2;
        frontBlade.position.set(0, 0.062, -0.365);
        revGroup.add(frontBlade);"""

new_rev_sights = """        // Micro-adjustable Elevated Rear Target Sight Notch
        const rearSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.028), darkSteelMat);
        rearSightBase.position.set(0, 0.056, 0.09);
        revGroup.add(rearSightBase);

        const rearSightBladeL = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.016, 0.012), darkSteelMat);
        rearSightBladeL.position.set(-0.009, 0.071, 0.09);
        revGroup.add(rearSightBladeL);

        const rearSightBladeR = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.016, 0.012), darkSteelMat);
        rearSightBladeR.position.set(0.009, 0.071, 0.09);
        revGroup.add(rearSightBladeR);

        // High-Visibility Fluorescent Orange Fiber-Optic Front Sight
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.036, 0.052), darkSteelMat);
        frontSightRamp.position.set(0, 0.060, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.038, 8), opticOrangeMat);
        frontBlade.rotation.x = Math.PI / 2;
        frontBlade.position.set(0, 0.074, -0.365);
        revGroup.add(frontBlade);"""

if old_rev_sights in c:
    c = c.replace(old_rev_sights, new_rev_sights, 1)
    print("Replaced Revolver sights with elevated target notch and fiber-optic bead!")
else:
    print("Warning: could not find old_rev_sights")

# 4. Refine Shotgun sights: raise ventilated top rib and brass bead above receiver
old_sh_sights = """        // Machined Receiver Top Tang Groove
        const shTang = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.12), darkSteelMat);
        shTang.position.set(0, 0.048, 0.03);
        shotgunGroup.add(shTang);

        // Top Tang Break Lever with Knurled Brass Knob
        const shBreakLever = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.016, 0.046), darkSteelMat);
        shBreakLever.position.set(0.008, 0.052, 0.04);
        shBreakLever.rotation.y = 0.22;
        shotgunGroup.add(shBreakLever);

        // Tang Safety Slide Switch
        const shSafetySwitch = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.009, 0.020), titaniumMat);
        shSafetySwitch.position.set(0, 0.050, 0.088);
        shotgunGroup.add(shSafetySwitch);

        // --- Twin Blued Steel Barrels & Solid Monobloc ---
        // Left barrel (slight forward choke taper)
        const shBarrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelL.rotation.x = Math.PI / 2;
        shBarrelL.position.set(-0.018, 0.018, -0.27);
        shotgunGroup.add(shBarrelL);

        // Right barrel
        const shBarrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelR.rotation.x = Math.PI / 2;
        shBarrelR.position.set(0.018, 0.018, -0.27);
        shotgunGroup.add(shBarrelR);

        // Ventilated Top Center Rib with Cooling Slots
        const shRib = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.013, 0.36), gunmetalMat);
        shRib.position.set(0, 0.034, -0.27);
        shotgunGroup.add(shRib);

        // Bottom rib uniting barrels
        const bottomRib = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.32), darkSteelMat);
        bottomRib.position.set(0, 0.003, -0.27);
        shotgunGroup.add(bottomRib);

        // Brass Bead Front Sight
        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), brassMat);
        shBead.position.set(0, 0.043, -0.448);
        shotgunGroup.add(shBead);"""

new_sh_sights = """        // Machined Receiver Sighting Channel Groove
        const shTang = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.12), darkSteelMat);
        shTang.position.set(0, 0.044, 0.03);
        shotgunGroup.add(shTang);

        // Top Tang Break Lever with Knurled Brass Knob (recessed below sighting plane)
        const shBreakLever = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.010, 0.042), darkSteelMat);
        shBreakLever.position.set(0.008, 0.045, 0.04);
        shBreakLever.rotation.y = 0.22;
        shotgunGroup.add(shBreakLever);

        // Tang Safety Slide Switch
        const shSafetySwitch = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.018), titaniumMat);
        shSafetySwitch.position.set(0, 0.045, 0.088);
        shotgunGroup.add(shSafetySwitch);

        // --- Twin Blued Steel Barrels & Solid Monobloc ---
        // Left barrel
        const shBarrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelL.rotation.x = Math.PI / 2;
        shBarrelL.position.set(-0.018, 0.022, -0.27);
        shotgunGroup.add(shBarrelL);

        // Right barrel
        const shBarrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelR.rotation.x = Math.PI / 2;
        shBarrelR.position.set(0.018, 0.022, -0.27);
        shotgunGroup.add(shBarrelR);

        // Elevated Ventilated Top Center Rib
        const shRib = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.36), gunmetalMat);
        shRib.position.set(0, 0.040, -0.27);
        shotgunGroup.add(shRib);

        // Bottom rib uniting barrels
        const bottomRib = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.32), darkSteelMat);
        bottomRib.position.set(0, 0.007, -0.27);
        shotgunGroup.add(bottomRib);

        // Brass Bead Front Sight (proudly perched atop muzzle rib)
        const shBeadPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.012), gunmetalMat);
        shBeadPedestal.position.set(0, 0.046, -0.448);
        shotgunGroup.add(shBeadPedestal);

        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), brassMat);
        shBead.position.set(0, 0.051, -0.448);
        shotgunGroup.add(shBead);"""

if old_sh_sights in c:
    c = c.replace(old_sh_sights, new_sh_sights, 1)
    print("Replaced Shotgun sights with elevated ventilated rib and brass bead!")
else:
    print("Warning: could not find old_sh_sights")

with open(weapons_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Saved refined weapons.js successfully!")
