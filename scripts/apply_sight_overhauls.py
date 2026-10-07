import os

weapons_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "js", "weapons.js")

with open(weapons_path, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Update Revolver ADS and sight heights
# Replace rear sight and front sight in Revolver
old_rev_block = """        // Micro-adjustable Rear Sight Notch
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.016, 0.022), darkSteelMat);
        rearSight.position.set(0, 0.054, 0.09);
        revGroup.add(rearSight);

        const rearSightNotch = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.024), titaniumMat);
        rearSightNotch.position.set(0, 0.058, 0.09);
        revGroup.add(rearSightNotch);"""

new_rev_block = """        // Micro-adjustable Elevated Rear Target Sight Notch
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.018, 0.024), darkSteelMat);
        rearSight.position.set(0, 0.060, 0.09);
        revGroup.add(rearSight);

        const rearSightPostL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.022), darkSteelMat);
        rearSightPostL.position.set(-0.009, 0.072, 0.09);
        revGroup.add(rearSightPostL);

        const rearSightPostR = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.014, 0.022), darkSteelMat);
        rearSightPostR.position.set(0.009, 0.072, 0.09);
        revGroup.add(rearSightPostR);"""

old_rev_front = """        // High-Visibility Fluorescent Orange Fiber-Optic Front Sight
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.024, 0.048), darkSteelMat);
        frontSightRamp.position.set(0, 0.054, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.034, 8), opticOrangeMat);
        frontBlade.rotation.x = Math.PI / 2;
        frontBlade.position.set(0, 0.062, -0.365);
        revGroup.add(frontBlade);"""

new_rev_front = """        // High-Visibility Fluorescent Orange Fiber-Optic Front Sight
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.048), darkSteelMat);
        frontSightRamp.position.set(0, 0.060, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.036, 8), opticOrangeMat);
        frontBlade.rotation.x = Math.PI / 2;
        frontBlade.position.set(0, 0.072, -0.365);
        revGroup.add(frontBlade);"""

if old_rev_block in c:
    c = c.replace(old_rev_block, new_rev_block, 1)
    print("Replaced revolver rear sight!")
else:
    print("Warning: old_rev_block not found")

if old_rev_front in c:
    c = c.replace(old_rev_front, new_rev_front, 1)
    print("Replaced revolver front sight!")
else:
    print("Warning: old_rev_front not found")

# 2. Update Shotgun Receiver, Barrels, Rib, and Bead
old_sh_section = """        // --- Machined Box-Lock Steel Receiver ---
        const shReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.082, 0.19), gunmetalMat);
        shReceiver.position.set(0, 0.005, 0.02);
        shotgunGroup.add(shReceiver);

        // Beveled Engraved Side Plates
        const shSidePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.072, 0.16), darkSteelMat);
        shSidePlateL.position.set(-0.030, 0.005, 0.02);
        shotgunGroup.add(shSidePlateL);

        const shSidePlateR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.072, 0.16), darkSteelMat);
        shSidePlateR.position.set(0.030, 0.005, 0.02);
        shotgunGroup.add(shSidePlateR);

        // Break-Action Hinge Trunnion Pin
        const shHingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.066, 12), chromeBoltMat);
        shHingePin.rotation.z = Math.PI / 2;
        shHingePin.position.set(0, -0.024, -0.06);
        shotgunGroup.add(shHingePin);

        // Curved Recoil Shield Fences at Breech
        const recoilFenceL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.024, 10), gunmetalMat);
        recoilFenceL.position.set(-0.018, 0.024, -0.05);
        shotgunGroup.add(recoilFenceL);

        const recoilFenceR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.024, 10), gunmetalMat);
        recoilFenceR.position.set(0.018, 0.024, -0.05);
        shotgunGroup.add(recoilFenceR);

        // Top Tang Break Lever with Knurled Brass Knob
        const shBreakLever = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.016, 0.046), darkSteelMat);
        shBreakLever.position.set(0.008, 0.052, 0.04);
        shBreakLever.rotation.y = 0.22;
        shotgunGroup.add(shBreakLever);

        const shBreakKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 8), brassMat);
        shBreakKnob.position.set(0.014, 0.059, 0.058);
        shotgunGroup.add(shBreakKnob);

        // Tang Safety Slide Switch
        const shSafetySwitch = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.009, 0.020), titaniumMat);
        shSafetySwitch.position.set(0, 0.050, 0.088);
        shotgunGroup.add(shSafetySwitch);"""

new_sh_section = """        // --- Machined Box-Lock Steel Receiver ---
        const shReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.070, 0.19), gunmetalMat);
        shReceiver.position.set(0, -0.006, 0.02);
        shotgunGroup.add(shReceiver);

        // Beveled Engraved Side Plates
        const shSidePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.062, 0.16), darkSteelMat);
        shSidePlateL.position.set(-0.030, -0.006, 0.02);
        shotgunGroup.add(shSidePlateL);

        const shSidePlateR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.062, 0.16), darkSteelMat);
        shSidePlateR.position.set(0.030, -0.006, 0.02);
        shotgunGroup.add(shSidePlateR);

        // Break-Action Hinge Trunnion Pin
        const shHingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.066, 12), chromeBoltMat);
        shHingePin.rotation.z = Math.PI / 2;
        shHingePin.position.set(0, -0.028, -0.06);
        shotgunGroup.add(shHingePin);

        // Curved Recoil Shield Fences at Breech
        const recoilFenceL = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 10), gunmetalMat);
        recoilFenceL.position.set(-0.018, 0.016, -0.05);
        shotgunGroup.add(recoilFenceL);

        const recoilFenceR = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.024, 10), gunmetalMat);
        recoilFenceR.position.set(0.018, 0.016, -0.05);
        shotgunGroup.add(recoilFenceR);

        // Top Tang Break Lever with Knurled Brass Knob (lowered below sight plane)
        const shBreakLever = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.010, 0.042), darkSteelMat);
        shBreakLever.position.set(0.008, 0.032, 0.04);
        shBreakLever.rotation.y = 0.22;
        shotgunGroup.add(shBreakLever);

        const shBreakKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8), brassMat);
        shBreakKnob.position.set(0.014, 0.036, 0.058);
        shotgunGroup.add(shBreakKnob);

        // Tang Safety Slide Switch
        const shSafetySwitch = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.018), titaniumMat);
        shSafetySwitch.position.set(0, 0.032, 0.088);
        shotgunGroup.add(shSafetySwitch);"""

if old_sh_section in c:
    c = c.replace(old_sh_section, new_sh_section, 1)
    print("Replaced shotgun receiver section!")
else:
    print("Warning: old_sh_section not found")

# Shotgun Barrels & Elevated Rib
old_sh_barrels = """        // --- Twin Blued Steel Barrels & Solid Monobloc ---
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
        shotgunGroup.add(shRib);"""

new_sh_barrels = """        // --- Twin Blued Steel Barrels & Solid Monobloc ---
        // Left barrel (slight forward choke taper)
        const shBarrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelL.rotation.x = Math.PI / 2;
        shBarrelL.position.set(-0.018, 0.022, -0.27);
        shotgunGroup.add(shBarrelL);

        // Right barrel
        const shBarrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.38, 12), darkSteelMat);
        shBarrelR.rotation.x = Math.PI / 2;
        shBarrelR.position.set(0.018, 0.022, -0.27);
        shotgunGroup.add(shBarrelR);

        // Ventilated Top Center Rib with Cooling Slots (elevated)
        const shRib = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.36), gunmetalMat);
        shRib.position.set(0, 0.040, -0.27);
        shotgunGroup.add(shRib);"""

if old_sh_barrels in c:
    c = c.replace(old_sh_barrels, new_sh_barrels, 1)
    print("Replaced shotgun barrels and rib!")
else:
    print("Warning: old_sh_barrels not found")

# Shotgun bead
old_sh_bead = """        // Brass Bead Front Sight
        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), brassMat);
        shBead.position.set(0, 0.043, -0.448);
        shotgunGroup.add(shBead);"""

new_sh_bead = """        // Brass Bead Front Sight (perched cleanly atop ventilated rib)
        const shBeadPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.012), gunmetalMat);
        shBeadPedestal.position.set(0, 0.046, -0.448);
        shotgunGroup.add(shBeadPedestal);

        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), brassMat);
        shBead.position.set(0, 0.052, -0.448);
        shotgunGroup.add(shBead);"""

if old_sh_bead in c:
    c = c.replace(old_sh_bead, new_sh_bead, 1)
    print("Replaced shotgun bead!")
else:
    print("Warning: old_sh_bead not found")

# Update adsPos for revolver and shotgun
c = c.replace(
    "adsPos: new THREE.Vector3(0.0, -0.074, -0.34),",
    "adsPos: new THREE.Vector3(0.0, -0.072, -0.36),",
    1
)
c = c.replace(
    "adsPos: new THREE.Vector3(0.0, -0.049, -0.34),",
    "adsPos: new THREE.Vector3(0.0, -0.052, -0.34),",
    1
)

with open(weapons_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Finished applying sight overhauls!")
