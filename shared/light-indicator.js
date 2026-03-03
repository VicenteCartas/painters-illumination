/**
 * Painter's Illumination — Light Plane Indicator
 *
 * Creates the semi-transparent light-plane visualization (plane + grid)
 * and provides an updateLight function for syncing direction/position.
 */
window.PaintersIllumination = window.PaintersIllumination || {};

/**
 * Creates the light-plane indicator and returns a light context object.
 *
 * @param {object} ctx      - Scene context from setupScene (must have mat set)
 * @param {object} [options]
 * @param {number} [options.lightAzimuth=45]   - Initial azimuth in degrees
 * @param {number} [options.lightElevation=30] - Initial elevation in degrees
 * @param {number} [options.planeDist=3]       - Initial light-plane distance
 * @param {boolean} [options.hasPlaneDist]     - If true, also sets uPlaneDist uniform
 * @returns {object} lightCtx
 */
PaintersIllumination.createLightIndicator = function (ctx, options) {
    options = options || {};
    var scene = ctx.scene;

    var lightCtx = {
        lightAzimuth: options.lightAzimuth !== undefined ? options.lightAzimuth : 45,
        lightElevation: options.lightElevation !== undefined ? options.lightElevation : 30,
        planeDist: options.planeDist !== undefined ? options.planeDist : 3.0,
        hasPlaneDist: !!options.hasPlaneDist
    };

    // Dummy Babylon light (intensity 0, just for scene)
    lightCtx.light = new BABYLON.DirectionalLight("dir",
        new BABYLON.Vector3(0, -1, 0), scene);
    lightCtx.light.intensity = 0;

    // Semi-transparent plane + grid indicator
    lightCtx.planeAnchor = new BABYLON.TransformNode("planeAnchor", scene);

    var planeIndicator = BABYLON.MeshBuilder.CreatePlane("lightPlane",
        { size: 5 }, scene);
    lightCtx.planeMat = new BABYLON.StandardMaterial("planeMat", scene);
    lightCtx.planeMat.emissiveColor = new BABYLON.Color3(1, 1, 0.3);
    lightCtx.planeMat.alpha = 0.12;
    lightCtx.planeMat.disableLighting = true;
    lightCtx.planeMat.backFaceCulling = false;
    planeIndicator.material = lightCtx.planeMat;
    planeIndicator.parent = lightCtx.planeAnchor;

    // Build grid lines in local space (on the XY plane, centered at origin)
    (function buildLocalGrid() {
        var lines = [];
        var halfSize = 2.5;
        var steps = 6;
        for (var i = 0; i <= steps; i++) {
            var t = -halfSize + (i / steps) * halfSize * 2;
            lines.push([
                new BABYLON.Vector3(t, -halfSize, 0),
                new BABYLON.Vector3(t, halfSize, 0)
            ]);
            lines.push([
                new BABYLON.Vector3(-halfSize, t, 0),
                new BABYLON.Vector3(halfSize, t, 0)
            ]);
        }
        lightCtx.gridLines = BABYLON.MeshBuilder.CreateLineSystem("planeGrid",
            { lines: lines }, scene);
        lightCtx.gridLines.color = new BABYLON.Color3(1, 1, 0.3);
        lightCtx.gridLines.alpha = 0.2;
        lightCtx.gridLines.parent = lightCtx.planeAnchor;
    })();

    /** Recompute light direction vector and reposition the plane indicator. */
    lightCtx.updateLight = function () {
        var az = lightCtx.lightAzimuth * Math.PI / 180;
        var el = lightCtx.lightElevation * Math.PI / 180;
        var fromDir = new BABYLON.Vector3(
            Math.cos(el) * Math.sin(az),
            Math.sin(el),
            Math.cos(el) * Math.cos(az));

        ctx.mat.setVector3("uLightDir", fromDir.clone());
        if (lightCtx.hasPlaneDist) {
            ctx.mat.setFloat("uPlaneDist", lightCtx.planeDist);
        }

        var planeCenter = fromDir.scale(lightCtx.planeDist);
        lightCtx.planeAnchor.position = planeCenter;
        lightCtx.planeAnchor.lookAt(planeCenter.add(fromDir));

        lightCtx.light.direction = fromDir.scale(-1);
    };

    lightCtx.updateLight();
    return lightCtx;
};
