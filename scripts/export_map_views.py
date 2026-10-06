import os
import sys
import time
from playwright.sync_api import sync_playwright

def render_map_views():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "map_views")
    os.makedirs(output_dir, exist_ok=True)
    print(f"Exporting pristine architectural views to: {output_dir}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        print("Navigating to http://localhost:8080/ ...")
        page.goto("http://localhost:8080/")
        page.wait_for_selector("#start-menu")
        time.sleep(1.0)

        # 1. Clean UI and Scene
        page.evaluate("""() => {
            const hideIds = [
                'start-menu', 'hud', 'crosshair', 'hitmarker', 'sniper-scope',
                'kill-medal-container', 'speedometer', 'floating-damage-container',
                'customize-modal', 'contact-modal', 'top-right-leaderboard', 'top-left-status'
            ];
            hideIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            if (window.game && window.game.lobbyPreviewCharacter) {
                window.game.lobbyPreviewCharacter.visible = false;
            }
            if (window.weaponSystem && window.weaponSystem.viewmodelRoot) {
                window.weaponSystem.viewmodelRoot.visible = false;
            }

            // Hide floating clouds for pristine geometric clarity
            window.game.scene.children.forEach(obj => {
                if (obj.isGroup && obj.position.y >= 40) {
                    obj.visible = false;
                }
            });
        }""")

        # -------------------------------------------------------------
        # 1. TOP-DOWN PLAN VIEW (Orthographic / Zenith Plan)
        # -------------------------------------------------------------
        print("Rendering Top-Down Plan View...")
        page.evaluate("""() => {
            const cam = window.game.camera;
            cam.position.set(0, 135, 0.01);
            cam.up.set(0, 0, -1);
            cam.lookAt(0, 0, 0);
            window.game.renderer.render(window.game.scene, cam);
        }""")
        time.sleep(0.5)
        top_down_path = os.path.join(output_dir, "top_down_plan_view.png")
        page.screenshot(path=top_down_path)
        print(f"Saved: {top_down_path}")

        # -------------------------------------------------------------
        # 2. SIDE ELEVATION VIEW (Profile Cross-Section)
        # Hide the facing West perimeter wall so interior verticality is fully visible
        # -------------------------------------------------------------
        print("Rendering Side Elevation Cross-Section View...")
        page.evaluate("""() => {
            // Find and temporarily hide the west perimeter wall meshes
            window._hiddenMeshes = [];
            window.game.scene.traverse(obj => {
                if (obj.isMesh && obj.position.x < -70 && Math.abs(obj.position.z) < 82) {
                    obj.visible = false;
                    window._hiddenMeshes.push(obj);
                }
            });

            const cam = window.game.camera;
            cam.position.set(-105, 14, 0);
            cam.up.set(0, 1, 0);
            cam.lookAt(0, 10, 0);
            window.game.renderer.render(window.game.scene, cam);
        }""")
        time.sleep(0.5)
        side_view_path = os.path.join(output_dir, "side_elevation_view.png")
        page.screenshot(path=side_view_path)
        print(f"Saved: {side_view_path}")

        # Restore hidden west wall
        page.evaluate("""() => {
            if (window._hiddenMeshes) {
                window._hiddenMeshes.forEach(m => m.visible = true);
                window._hiddenMeshes = [];
            }
        }""")

        # -------------------------------------------------------------
        # 3. ISOMETRIC / 3D PERSPECTIVE VIEW (Diagonal Arena Overview)
        # -------------------------------------------------------------
        print("Rendering Isometric / 3D Perspective View...")
        page.evaluate("""() => {
            const cam = window.game.camera;
            cam.position.set(95, 75, 95);
            cam.up.set(0, 1, 0);
            cam.lookAt(0, 4, 0);
            window.game.renderer.render(window.game.scene, cam);
        }""")
        time.sleep(0.5)
        iso_view_path = os.path.join(output_dir, "isometric_perspective_view.png")
        page.screenshot(path=iso_view_path)
        print(f"Saved: {iso_view_path}")

        browser.close()
        print("All architectural map views successfully rendered!")

if __name__ == "__main__":
    render_map_views()
