import os

weapons_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "js", "weapons.js")

with open(weapons_path, "r", encoding="utf-8") as f:
    content = f.read()

# Marker 1: Start of Sniper
start_marker = "// 2. Sniper Rifle (Marksman) - High Fidelity Voxel Bolt-Action Overhaul"
# Marker 2: Start of Muzzle Flash (end of shotgun)
end_marker = "// Muzzle Flash\n        this.muzzleLight = new THREE.PointLight(0xffea78, 0, 8);"

idx_start = content.find(start_marker)
idx_end = content.find(end_marker)

if idx_start == -1 or idx_end == -1:
    print(f"Error locating markers: start={idx_start}, end={idx_end}")
    exit(1)

replacement_block = """// 2. Sniper Rifle (Marksman) - Precision Tactical Chassis Overhaul
        const sniperGroup = new THREE.Group();

        // --- Tactical Composite Chassis (Sleek AWM / M200 Profile) ---
        // Main receiver bedding block & forend
        const snChassis = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.068, 0.58), sniperChassisMat);
        snChassis.position.set(0, -0.010, -0.06);
        sniperGroup.add(snChassis);

        // M-LOK side ventilation slots along the forend
        for (let s = 0; s < 4; s++) {
            const slotL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.048), darkSteelMat);
            slotL.position.set(-0.0295, -0.008, -0.16 - s * 0.065);
            sniperGroup.add(slotL);

            const slotR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.048), darkSteelMat);
            slotR.position.set(0.0295, -0.008, -0.16 - s * 0.065);
            sniperGroup.add(slotR);
        }

        // --- Iconic Skeletonized Thumbhole Sniper Stock ---
        // Upper stock spine leading to cheek rest
        const stockSpine = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.042, 0.28), sniperChassisMat);
        stockSpine.position.set(0, 0.018, 0.35);
        sniperGroup.add(stockSpine);

        // Lower strut connecting pistol grip to rear butt (creating authentic negative space thumbhole!)
        const stockStrut = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.032, 0.26), sniperChassisMat);
        stockStrut.position.set(0, -0.076, 0.33);
        stockStrut.rotation.x = -0.15;
        sniperGroup.add(stockStrut);

        // Rear vertical butt frame uniting spine and strut
        const buttFrame = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.118, 0.06), sniperChassisMat);
        buttFrame.position.set(0, -0.015, 0.49);
        sniperGroup.add(buttFrame);

        // Bottom monopod rail on underside of butt
        const monoRail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.12), darkSteelMat);
        monoRail.position.set(0, -0.078, 0.44);
        sniperGroup.add(monoRail);

        // Adjustable Raised Sniper Cheek Rest Comb
        const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.034, 0.16), sniperChassisMat);
        cheekRest.position.set(0, 0.054, 0.35);
        sniperGroup.add(cheekRest);

        // Dual Knurled Cheekpiece Height Adjustment Thumbwheels
        const thumbWheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.054, 12), titaniumMat);
        thumbWheel1.rotation.z = Math.PI / 2;
        thumbWheel1.position.set(0, 0.040, 0.30);
        sniperGroup.add(thumbWheel1);

        const thumbWheel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.054, 12), titaniumMat);
        thumbWheel2.rotation.z = Math.PI / 2;
        thumbWheel2.position.set(0, 0.040, 0.40);
        sniperGroup.add(thumbWheel2);

        // Multi-segment Ribbed Rubber Buttpad with White Accent Spacer
        const snSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.053, 0.122, 0.008), cuffMat);
        snSpacer.position.set(0, -0.015, 0.524);
        sniperGroup.add(snSpacer);

        const snButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.128, 0.034), rubberMat);
        snButtpad.position.set(0, -0.015, 0.545);
        sniperGroup.add(snButtpad);

        // Match Vertical Pistol Grip
        const snGrip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.122, 0.062), sniperChassisMat);
        snGrip.position.set(0, -0.082, 0.13);
        snGrip.rotation.x = -0.32;
        sniperGroup.add(snGrip);

        const gripPalmShelf = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 0.072), darkSteelMat);
        gripPalmShelf.position.set(0, -0.138, 0.15);
        sniperGroup.add(gripPalmShelf);

        // Winter Trigger Guard & Flat Match Trigger
        const snTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.048, 0.076), darkSteelMat);
        snTriggerGuard.position.set(0, -0.052, 0.05);
        sniperGroup.add(snTriggerGuard);

        const snTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.012), titaniumMat);
        snTrigger.position.set(0, -0.044, 0.055);
        snTrigger.rotation.x = -0.12;
        sniperGroup.add(snTrigger);

        // Detachable 5-Round Box Magazine with Stamped Ribs
        const snMag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.095, 0.082), darkSteelMat);
        snMag.position.set(0, -0.078, -0.06);
        sniperGroup.add(snMag);

        const snMagBase = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.014, 0.088), rubberMat);
        snMagBase.position.set(0, -0.128, -0.06);
        sniperGroup.add(snMagBase);

        // --- Action Receiver & Chrome Fluted Bolt Carrier ---
        const snReceiver = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.36, 14), darkSteelMat);
        snReceiver.rotation.x = Math.PI / 2;
        snReceiver.position.set(0, 0.032, 0.02);
        sniperGroup.add(snReceiver);

        // Ejection Port Cutout
        const snEjectionCut = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.034, 0.12), gunmetalMat);
        snEjectionCut.position.set(0.024, 0.034, 0.04);
        sniperGroup.add(snEjectionCut);

        // Chrome Fluted Bolt Body
        const snChromeBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.30, 12), chromeBoltMat);
        snChromeBolt.rotation.x = Math.PI / 2;
        snChromeBolt.position.set(0, 0.032, 0.02);
        sniperGroup.add(snChromeBolt);

        // Swept-back Bolt Handle with Knurled Ball Knob
        const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.065, 8), chromeBoltMat);
        boltStem.position.set(0.044, 0.014, 0.12);
        boltStem.rotation.z = -0.72;
        sniperGroup.add(boltStem);

        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), chromeBoltMat);
        boltKnob.position.set(0.082, -0.002, 0.12);
        sniperGroup.add(boltKnob);

        // Rear Cocking Indicator Shroud
        const cockingShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.038, 10), darkSteelMat);
        cockingShroud.rotation.x = Math.PI / 2;
        cockingShroud.position.set(0, 0.032, 0.20);
        sniperGroup.add(cockingShroud);

        // --- Heavy Match Bull Barrel with Recessed Flutes ---
        const barrelShank = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.023, 0.14, 12), darkSteelMat);
        barrelShank.rotation.x = Math.PI / 2;
        barrelShank.position.set(0, 0.032, -0.23);
        sniperGroup.add(barrelShank);

        const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.58, 12), gunmetalMat);
        snBarrel.rotation.x = Math.PI / 2;
        snBarrel.position.set(0, 0.032, -0.58);
        sniperGroup.add(snBarrel);

        // Longitudinal Barrel Fluting (6 deep flutes)
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.46, 6), darkSteelMat);
            flute.rotation.x = Math.PI / 2;
            flute.position.set(Math.cos(angle) * 0.017, 0.032 + Math.sin(angle) * 0.017, -0.58);
            sniperGroup.add(flute);
        }

        // Heavy Tactical Dual-Baffle Muzzle Brake
        const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.038, 0.095), darkSteelMat);
        muzzleBrake.position.set(0, 0.032, -0.91);
        sniperGroup.add(muzzleBrake);

        // Lateral gas ports
        const portL1 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.024), rubberMat);
        portL1.position.set(0, 0.032, -0.89);
        sniperGroup.add(portL1);

        const portL2 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.024), rubberMat);
        portL2.position.set(0, 0.032, -0.93);
        sniperGroup.add(portL2);

        // --- Folded Tactical Bipod Assembly ---
        const bipodBlock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.030, 0.052), darkSteelMat);
        bipodBlock.position.set(0, -0.044, -0.32);
        sniperGroup.add(bipodBlock);

        // Telescoping Legs with Knurled Collars & Rubber Feet
        for (let side of [-1, 1]) {
            const legUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), darkSteelMat);
            legUpper.rotation.x = Math.PI / 2;
            legUpper.position.set(side * 0.026, -0.044, -0.22);
            sniperGroup.add(legUpper);

            const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.018, 8), titaniumMat);
            collar.rotation.x = Math.PI / 2;
            collar.position.set(side * 0.026, -0.044, -0.14);
            sniperGroup.add(collar);

            const legLower = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8), titaniumMat);
            legLower.rotation.x = Math.PI / 2;
            legLower.position.set(side * 0.026, -0.044, -0.07);
            sniperGroup.add(legLower);

            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.026, 8), rubberMat);
            foot.rotation.x = Math.PI / 2;
            foot.position.set(side * 0.026, -0.044, 0.01);
            sniperGroup.add(foot);
        }

        // --- High-Power Telescopic Tactical Scope & Cantilever Mount ---
        const scopeRoot = new THREE.Group();
        scopeRoot.position.set(0, 0.108, 0.02);

        // Picatinny Base Rail
        const scopeRail = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.014, 0.34), darkSteelMat);
        scopeRail.position.set(0, -0.042, 0);
        scopeRoot.add(scopeRail);

        // Heavy Skeletonized Dual Ring Cantilever Mount with Cross-bolts
        const ringRear = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.032), gunmetalMat);
        ringRear.position.set(0, -0.014, 0.08);
        scopeRoot.add(ringRear);

        const boltRear = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.052, 6), titaniumMat);
        boltRear.rotation.z = Math.PI / 2;
        boltRear.position.set(0, -0.026, 0.08);
        scopeRoot.add(boltRear);

        const ringFront = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.032), gunmetalMat);
        ringFront.position.set(0, -0.014, -0.08);
        scopeRoot.add(ringFront);

        const boltFront = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.052, 6), titaniumMat);
        boltFront.rotation.z = Math.PI / 2;
        boltFront.position.set(0, -0.026, -0.08);
        scopeRoot.add(boltFront);

        // 34mm Main Tube
        const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.32, 16), darkSteelMat);
        scopeTube.rotation.x = Math.PI / 2;
        scopeRoot.add(scopeTube);

        // Rear Ocular Bell & Ribbed Rubber Eye Cup
        const ocularBell = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.09, 16), darkSteelMat);
        ocularBell.rotation.x = Math.PI / 2;
        ocularBell.position.set(0, 0, 0.185);
        scopeRoot.add(ocularBell);

        const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.026, 16), rubberMat);
        eyeCup.rotation.x = Math.PI / 2;
        eyeCup.position.set(0, 0, 0.235);
        scopeRoot.add(eyeCup);

        // Forward Flared Objective Bell & Sunshade
        const objectiveBell = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.026, 0.13, 16), darkSteelMat);
        objectiveBell.rotation.x = Math.PI / 2;
        objectiveBell.position.set(0, 0, -0.19);
        scopeRoot.add(objectiveBell);

        const sunshade = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.065, 16), darkSteelMat);
        sunshade.rotation.x = Math.PI / 2;
        sunshade.position.set(0, 0, -0.27);
        scopeRoot.add(sunshade);

        // Luminous Anti-Reflective Front Lens
        const frontLens = new THREE.Mesh(new THREE.CircleGeometry(0.040, 16), scopeLensMat);
        frontLens.position.set(0, 0, -0.268);
        frontLens.rotation.y = Math.PI;
        scopeRoot.add(frontLens);

        // Tactical Target Turrets (Elevation, Windage, Parallax) with Brass Index Rings
        const elevTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 12), darkSteelMat);
        elevTurret.position.set(0, 0.028, 0);
        scopeRoot.add(elevTurret);
        const elevRing = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 12), brassMat);
        elevRing.position.set(0, 0.022, 0);
        scopeRoot.add(elevRing);

        const windTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 12), darkSteelMat);
        windTurret.rotation.z = Math.PI / 2;
        windTurret.position.set(0, 0.028, 0);
        scopeRoot.add(windTurret);
        const windRing = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 12), brassMat);
        windRing.rotation.z = Math.PI / 2;
        windRing.position.set(0, 0.022, 0);
        scopeRoot.add(windRing);

        const paraTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 12), darkSteelMat);
        paraTurret.rotation.z = -Math.PI / 2;
        paraTurret.position.set(-0.028, 0, 0);
        scopeRoot.add(paraTurret);

        sniperGroup.add(scopeRoot);

        // Character Arms
        sniperGroup.add(buildStrikerArms('sniper'));
        this.viewmodelRoot.add(sniperGroup);
        this.weaponMeshes.sniper = { root: sniperGroup, mag: snMag, muzzlePos: new THREE.Vector3(0, 0.032, -0.96) };

        // 3. SMG (Skirmisher) - HK MP5 / UMP Tactical Submachine Gun Overhaul
        const smgGroup = new THREE.Group();

        // --- Upper Stamped Receiver & Cocking Tube ---
        const smgReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.082, 0.34), smgReceiverMat);
        smgReceiver.position.set(0, 0, 0);
        smgGroup.add(smgReceiver);

        // Cylindrical Top Cocking Tube
        const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 12), darkSteelMat);
        cockingTube.rotation.x = Math.PI / 2;
        cockingTube.position.set(0, 0.046, -0.04);
        smgGroup.add(cockingTube);

        // Iconic HK Cocking Notch & Charging Handle locked in rear detent
        const cockingDetent = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.040), gunmetalMat);
        cockingDetent.position.set(-0.022, 0.054, -0.16);
        smgGroup.add(cockingDetent);

        const cockingHandleStem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.020), darkSteelMat);
        cockingHandleStem.position.set(-0.032, 0.062, -0.16);
        cockingHandleStem.rotation.z = 0.52;
        smgGroup.add(cockingHandleStem);

        const cockingKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 8), rubberMat);
        cockingKnob.rotation.z = Math.PI / 2;
        cockingKnob.position.set(-0.046, 0.076, -0.16);
        smgGroup.add(cockingKnob);

        // Recessed Ejection Port on Right Side with Brass Cartridge
        const smgEjectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.11), darkSteelMat);
        smgEjectionPort.position.set(0.028, 0.014, -0.02);
        smgGroup.add(smgEjectionPort);

        const smgChamberBrass = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.048, 8), brassMat);
        smgChamberBrass.rotation.x = Math.PI / 2;
        smgChamberBrass.position.set(0.024, 0.014, -0.02);
        smgGroup.add(smgChamberBrass);

        // --- Polymer Lower Receiver & Fire Selector ---
        const smgLower = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.064, 0.22), rubberMat);
        smgLower.position.set(0, -0.052, 0.04);
        smgGroup.add(smgLower);

        // Molded Pistol Grip with Palm Swell
        const smgPistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.124, 0.065), rubberMat);
        smgPistolGrip.position.set(0, -0.116, 0.088);
        smgPistolGrip.rotation.x = -0.32;
        smgGroup.add(smgPistolGrip);

        const smgGripCap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.068), darkSteelMat);
        smgGripCap.position.set(0, -0.170, 0.108);
        smgGripCap.rotation.x = -0.32;
        smgGroup.add(smgGripCap);

        // Enlarged Trigger Guard & Polished Trigger
        const smgTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.046, 0.066), darkSteelMat);
        smgTriggerGuard.position.set(0, -0.078, 0.048);
        smgGroup.add(smgTriggerGuard);

        const smgTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.012), titaniumMat);
        smgTrigger.position.set(0, -0.068, 0.052);
        smgTrigger.rotation.x = -0.22;
        smgGroup.add(smgTrigger);

        // Fire Selector Switch with Markings
        const selectorSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.012, 0.026), darkSteelMat);
        selectorSwitch.position.set(0, -0.038, 0.07);
        selectorSwitch.rotation.z = -0.28;
        smgGroup.add(selectorSwitch);

        // --- Curved 30-Round 9mm Banana Magazine ---
        const smgMagWell = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.048, 0.084), darkSteelMat);
        smgMagWell.position.set(0, -0.048, -0.06);
        smgGroup.add(smgMagWell);

        const smgMagRelease = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.012), titaniumMat);
        smgMagRelease.position.set(0, -0.052, -0.015);
        smgGroup.add(smgMagRelease);

        const smgMag = new THREE.Group();
        smgMag.position.set(0, -0.06, -0.06);

        // Curved Mag Segment 1
        const smgMagSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.10, 0.064), darkSteelMat);
        smgMagSeg1.position.set(0, -0.04, 0.008);
        smgMagSeg1.rotation.x = -0.16;
        smgMag.add(smgMagSeg1);

        // Curved Mag Segment 2
        const smgMagSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.10, 0.062), darkSteelMat);
        smgMagSeg2.position.set(0, -0.125, -0.012);
        smgMagSeg2.rotation.x = -0.28;
        smgMag.add(smgMagSeg2);

        // Magazine Bumper Baseplate with Grip Ribs
        const smgMagBumper = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.018, 0.070), rubberMat);
        smgMagBumper.position.set(0, -0.174, -0.026);
        smgMagBumper.rotation.x = -0.28;
        smgMag.add(smgMagBumper);

        // 3 Round Witness Holes (brass accents)
        for (let h = 0; h < 3; h++) {
            const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.035, 6), brassMat);
            hole.rotation.z = Math.PI / 2;
            hole.position.set(0, -0.05 - h * 0.035, 0.026 - h * 0.008);
            smgMag.add(hole);
        }
        smgGroup.add(smgMag);

        // --- Tactical Vented Handguard & Stubby CQB Foregrip ---
        const smgHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.074, 0.22), rubberMat);
        smgHandguard.position.set(0, 0.006, -0.22);
        smgGroup.add(smgHandguard);

        // Lateral Heat Ventilation Slots
        for (let i = 0; i < 3; i++) {
            const zSlot = -0.16 - i * 0.048;
            const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.028), darkSteelMat);
            ventL.position.set(-0.030, 0.012, zSlot);
            smgGroup.add(ventL);
            const ventR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.028), darkSteelMat);
            ventR.position.set(0.030, 0.012, zSlot);
            smgGroup.add(ventR);
        }

        // Lower Picatinny Accessory Rail
        const smgRail = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.18), darkSteelMat);
        smgRail.position.set(0, -0.036, -0.22);
        smgGroup.add(smgRail);

        // Ergonomic Stubby CQB Foregrip
        const smgForegrip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.092, 0.044), rubberMat);
        smgForegrip.position.set(0, -0.086, -0.22);
        smgGroup.add(smgForegrip);

        const foregripStop = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.014, 0.052), darkSteelMat);
        foregripStop.position.set(0, -0.134, -0.22);
        smgGroup.add(foregripStop);

        // --- Barrel, 3-Lug Collar & Birdcage Flash Hider ---
        const smgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 10), darkSteelMat);
        smgBarrel.rotation.x = Math.PI / 2;
        smgBarrel.position.set(0, 0.012, -0.38);
        smgGroup.add(smgBarrel);

        // HK 3-Lug Collar
        const triLug = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.035, 10), gunmetalMat);
        triLug.rotation.x = Math.PI / 2;
        triLug.position.set(0, 0.012, -0.44);
        smgGroup.add(triLug);

        // Slotted Birdcage Flash Hider
        const smgFlashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.055, 12), darkSteelMat);
        smgFlashHider.rotation.x = Math.PI / 2;
        smgFlashHider.position.set(0, 0.012, -0.49);
        smgGroup.add(smgFlashHider);

        // Flash Hider Muzzle Recess
        const muzzleBore = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.02, 10), rubberMat);
        muzzleBore.rotation.x = Math.PI / 2;
        muzzleBore.position.set(0, 0.012, -0.52);
        smgGroup.add(muzzleBore);

        // --- Authentic Sights (Hooded Front + Hollow Diopter Rear) ---
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
        smgGroup.add(sightPost);

        // --- Retractable Tactical PDW Wire Stock ---
        const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 8), darkSteelMat);
        strutL.rotation.x = Math.PI / 2;
        strutL.position.set(-0.033, 0.01, 0.11);
        smgGroup.add(strutL);

        const strutR = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 8), darkSteelMat);
        strutR.rotation.x = Math.PI / 2;
        strutR.position.set(0.033, 0.01, 0.11);
        smgGroup.add(strutR);

        const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.096, 0.024), rubberMat);
        buttPad.position.set(0, 0.01, 0.24);
        smgGroup.add(buttPad);

        // Character Arms
        smgGroup.add(buildStrikerArms('smg'));
        this.viewmodelRoot.add(smgGroup);
        this.weaponMeshes.smg = { root: smgGroup, mag: smgMag, muzzlePos: new THREE.Vector3(0, 0.012, -0.53) };

        // 4. Tactical Magnum Revolver (Enforcer) - Heavy Hand Cannon Overhaul
        const revGroup = new THREE.Group();

        // --- Solid Magnum Steel Frame with Brushed Sheen & Contours ---
        const revFrame = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.084, 0.24), revolverSteelMat);
        revGroup.add(revFrame);

        // Top strap sight channel with anti-glare serrations
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.018, 0.22), darkSteelMat);
        topStrap.position.set(0, 0.046, -0.01);
        revGroup.add(topStrap);

        // Cylinder Latch Slide Button (Left Side)
        const cylLatch = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.028), titaniumMat);
        cylLatch.position.set(-0.028, 0.022, 0.06);
        revGroup.add(cylLatch);

        // Crane / Yoke Assembly
        const cylinderCrane = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.034, 0.054), darkSteelMat);
        cylinderCrane.position.set(0, -0.024, -0.04);
        revGroup.add(cylinderCrane);

        // Micro-adjustable Rear Sight Notch
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.016, 0.022), darkSteelMat);
        rearSight.position.set(0, 0.054, 0.09);
        revGroup.add(rearSight);

        const rearSightNotch = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.024), titaniumMat);
        rearSightNotch.position.set(0, 0.058, 0.09);
        revGroup.add(rearSightNotch);

        // --- 6-Chamber Fluted Titanium Cylinder ---
        const revCylinderGroup = new THREE.Group();
        revCylinderGroup.position.set(0, 0.006, -0.015);

        const revCylinderBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.116, 16), titaniumMat);
        revCylinderBody.rotation.x = Math.PI / 2;
        revCylinderGroup.add(revCylinderBody);

        // Center Ratchet Ejector Star
        const centerEjector = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.124, 10), chromeBoltMat);
        centerEjector.rotation.x = Math.PI / 2;
        revCylinderGroup.add(centerEjector);

        // 6 fluted scallops & gold brass cartridge rims
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const xPos = Math.cos(angle) * 0.026;
            const yPos = Math.sin(angle) * 0.026;

            // Fluted scallop groove
            const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.118, 8), darkSteelMat);
            flute.rotation.x = Math.PI / 2;
            flute.position.set(xPos, yPos, 0);
            revCylinderGroup.add(flute);

            // Brass cartridge rim
            const brassCase = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 10), brassMat);
            brassCase.rotation.x = Math.PI / 2;
            brassCase.position.set(xPos, yPos, 0.058);
            revCylinderGroup.add(brassCase);

            // Nickel center primer
            const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.016, 8), chromeBoltMat);
            primer.rotation.x = Math.PI / 2;
            primer.position.set(xPos, yPos, 0.059);
            revCylinderGroup.add(primer);
        }
        revGroup.add(revCylinderGroup);

        // --- Slab-Sided Bull Barrel with Ventilated Rib ---
        // Slab-sided barrel core
        const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.054, 0.30), revolverSteelMat);
        revBarrel.position.set(0, 0.016, -0.24);
        revGroup.add(revBarrel);

        // Full-length underlug shroud enclosing ejector rod
        const revUnderlug = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.032, 0.28), revolverSteelMat);
        revUnderlug.position.set(0, -0.022, -0.23);
        revGroup.add(revUnderlug);

        // Knurled ejector rod tip
        const ejectorRod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 8), darkSteelMat);
        ejectorRod.rotation.x = Math.PI / 2;
        ejectorRod.position.set(0, -0.016, -0.14);
        revGroup.add(ejectorRod);

        // Recessed target muzzle crown
        const revMuzzleBore = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), rubberMat);
        revMuzzleBore.rotation.x = Math.PI / 2;
        revMuzzleBore.position.set(0, 0.018, -0.392);
        revGroup.add(revMuzzleBore);

        // Ventilated Top Barrel Rib with 3 Open Cooling Slots
        const revRib = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.28), darkSteelMat);
        revRib.position.set(0, 0.048, -0.23);
        revGroup.add(revRib);

        for (let s = 0; s < 3; s++) {
            const ribSlot = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.010, 0.044), gunmetalMat);
            ribSlot.position.set(0, 0.046, -0.15 - s * 0.08);
            revGroup.add(ribSlot);
        }

        // High-Visibility Fluorescent Orange Fiber-Optic Front Sight
        const frontSightRamp = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.024, 0.048), darkSteelMat);
        frontSightRamp.position.set(0, 0.054, -0.36);
        revGroup.add(frontSightRamp);

        const frontBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.034, 8), opticOrangeMat);
        frontBlade.rotation.x = Math.PI / 2;
        frontBlade.position.set(0, 0.062, -0.365);
        revGroup.add(frontBlade);

        // Wide Target Spur Hammer (Cocked)
        const revHammer = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.042, 0.034), darkSteelMat);
        revHammer.position.set(0, 0.044, 0.105);
        revHammer.rotation.x = -0.42;
        revGroup.add(revHammer);

        const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.010, 0.022), titaniumMat);
        hammerSpur.position.set(0, 0.058, 0.120);
        hammerSpur.rotation.x = -0.42;
        revGroup.add(hammerSpur);

        // Combat Trigger Guard & Smooth Face Trigger
        const revTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.050, 0.070), darkSteelMat);
        revTriggerGuard.position.set(0, -0.050, 0.01);
        revGroup.add(revTriggerGuard);

        const revTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.014), titaniumMat);
        revTrigger.position.set(0, -0.042, 0.018);
        revTrigger.rotation.x = -0.25;
        revGroup.add(revTrigger);

        // --- Sculpted Walnut Combat Grip with Finger Grooves & Gold Medallion ---
        const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.138, 0.074), walnutGripMat);
        revGrip.position.set(0, -0.092, 0.088);
        revGrip.rotation.x = -0.36;
        revGroup.add(revGrip);

        // Curved backstrap contour
        const backstrap = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.020), walnutGripMat);
        backstrap.position.set(0, -0.096, 0.128);
        backstrap.rotation.x = -0.36;
        revGroup.add(backstrap);

        // 3 Finger Grooves on Front of Grip
        for (let g = 0; g < 3; g++) {
            const groove = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.016, 0.014), woodMat);
            groove.position.set(0, -0.066 - g * 0.030, 0.058 + g * 0.014);
            groove.rotation.x = -0.36;
            revGroup.add(groove);
        }

        // Gold Medallion Seal Embedded on Grip
        const goldMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.048, 12), brassMat);
        goldMedallion.rotation.z = Math.PI / 2;
        goldMedallion.position.set(0, -0.092, 0.088);
        revGroup.add(goldMedallion);

        // Two-Handed Stance Arms
        revGroup.add(buildStrikerArms('revolver'));
        this.viewmodelRoot.add(revGroup);
        this.weaponMeshes.revolver = {
            root: revGroup,
            cylinder: revCylinderGroup,
            mag: null,
            muzzlePos: new THREE.Vector3(0, 0.018, -0.41)
        };

        // 5. Double-Barrel Shotgun (Breacher) - Heavy Coach Gun Overhaul
        const shotgunGroup = new THREE.Group();

        // --- Machined Box-Lock Steel Receiver ---
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
        shotgunGroup.add(shSafetySwitch);

        // Heavy Trigger Guard & Twin Brass Triggers
        const shTriggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.050, 0.076), darkSteelMat);
        shTriggerGuard.position.set(0, -0.050, 0.03);
        shotgunGroup.add(shTriggerGuard);

        const shTrigger1 = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.026, 0.012), brassMat);
        shTrigger1.position.set(0, -0.043, 0.042);
        shTrigger1.rotation.x = -0.25;
        shotgunGroup.add(shTrigger1);

        const shTrigger2 = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.024, 0.012), brassMat);
        shTrigger2.position.set(0, -0.041, 0.020);
        shTrigger2.rotation.x = -0.25;
        shotgunGroup.add(shTrigger2);

        // --- Twin Blued Steel Barrels & Solid Monobloc ---
        const shMonobloc = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.044, 0.08), gunmetalMat);
        shMonobloc.position.set(0, 0.018, -0.11);
        shotgunGroup.add(shMonobloc);

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

        // Dark hollow bore recesses at muzzle tips
        const shBoreL = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12), rubberMat);
        shBoreL.rotation.x = Math.PI / 2;
        shBoreL.position.set(-0.018, 0.018, -0.455);
        shotgunGroup.add(shBoreL);

        const shBoreR = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 12), rubberMat);
        shBoreR.rotation.x = Math.PI / 2;
        shBoreR.position.set(0.018, 0.018, -0.455);
        shotgunGroup.add(shBoreR);

        // Ventilated Top Center Rib with Cooling Slots
        const shRib = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.013, 0.36), gunmetalMat);
        shRib.position.set(0, 0.034, -0.27);
        shotgunGroup.add(shRib);

        for (let s = 0; s < 3; s++) {
            const shSlot = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.007, 0.035), darkSteelMat);
            shSlot.position.set(0, 0.036, -0.17 - s * 0.08);
            shotgunGroup.add(shSlot);
        }

        // Bottom rib uniting barrels
        const bottomRib = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.32), darkSteelMat);
        bottomRib.position.set(0, 0.003, -0.27);
        shotgunGroup.add(bottomRib);

        // Brass Bead Front Sight
        const shBead = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), brassMat);
        shBead.position.set(0, 0.043, -0.448);
        shotgunGroup.add(shBead);

        // --- Sculpted Beavertail Walnut Forend ---
        const shForend = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.048, 0.22), woodMat);
        shForend.position.set(0, -0.014, -0.19);
        shotgunGroup.add(shForend);

        // Forend checkering side panels
        const shCheckL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.16), walnutGripMat);
        shCheckL.position.set(-0.029, -0.012, -0.19);
        shotgunGroup.add(shCheckL);

        const shCheckR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.16), walnutGripMat);
        shCheckR.position.set(0.029, -0.012, -0.19);
        shotgunGroup.add(shCheckR);

        // Inlaid steel forend release iron latch
        const shForendIron = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.010, 0.16), darkSteelMat);
        shForendIron.position.set(0, -0.036, -0.19);
        shotgunGroup.add(shForendIron);

        // --- Flowing Walnut Coach Gun Stock ---
        const shStockGroup = new THREE.Group();
        shStockGroup.position.set(0, 0, 0.11);

        // Wrist / Grip neck
        const shWrist = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.088, 0.14), woodMat);
        shWrist.position.set(0, -0.038, 0.06);
        shWrist.rotation.x = -0.28;
        shStockGroup.add(shWrist);

        // Main stock body flowing into comb
        const shBody = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.108, 0.22), woodMat);
        shBody.position.set(0, -0.022, 0.18);
        shBody.rotation.x = 0.04;
        shStockGroup.add(shBody);

        // Raised cheek comb
        const shComb = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.028, 0.16), woodMat);
        shComb.position.set(0, 0.036, 0.18);
        shStockGroup.add(shComb);

        // White accent line spacer
        const shSpacer = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.116, 0.008), cuffMat);
        shSpacer.position.set(0, -0.020, 0.294);
        shStockGroup.add(shSpacer);

        // Ribbed rubber recoil buttpad
        const shButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.122, 0.032), rubberMat);
        shButtpad.position.set(0, -0.020, 0.312);
        shStockGroup.add(shButtpad);

        shotgunGroup.add(shStockGroup);

        // Striker Character Arms
        shotgunGroup.add(buildStrikerArms('shotgun'));
        this.viewmodelRoot.add(shotgunGroup);
        this.weaponMeshes.shotgun = {
            root: shotgunGroup,
            mag: null,
            muzzlePos: new THREE.Vector3(0, 0.018, -0.46)
        };

        """

new_content = content[:idx_start] + replacement_block + content[idx_end:]

with open(weapons_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Successfully overhauled Sniper, SMG, Revolver, and Shotgun in {weapons_path}!")
