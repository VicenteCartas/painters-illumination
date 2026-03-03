/**
 * Painter's Illumination — Shared Scene Setup
 *
 * Sets up the common Babylon.js scene infrastructure:
 * camera, primitive meshes, mesh selection, and human model loading.
 */
window.PaintersIllumination = window.PaintersIllumination || {};

/**
 * Creates a scene with camera and primitive meshes.
 * @param {HTMLCanvasElement} canvas
 * @param {BABYLON.Engine}   engine
 * @returns {object} ctx — scene context used by other shared modules
 */
PaintersIllumination.setupScene = function (canvas, engine) {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.1, 1);

    // ── Camera ──────────────────────────────────────────────────
    var camera = new BABYLON.ArcRotateCamera("cam",
        -Math.PI / 4, Math.PI / 3, 7, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 20;
    camera.wheelPrecision = 30;

    // ── Meshes ──────────────────────────────────────────────────
    var parent = new BABYLON.TransformNode("parent", scene);
    var meshes = {
        box: BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene),
        sphere: BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.1, segments: 32 }, scene),
        cylinder: BABYLON.MeshBuilder.CreateCylinder("cyl", { height: 1, diameter: 1, tessellation: 32 }, scene)
    };
    Object.keys(meshes).forEach(function (k) { meshes[k].parent = parent; });
    meshes.sphere.setEnabled(false);
    meshes.cylinder.setEnabled(false);

    var ctx = {
        scene: scene,
        canvas: canvas,
        engine: engine,
        camera: camera,
        parent: parent,
        meshes: meshes,
        humanRoots: {},
        meshBtns: {},
        isLoading: false,
        loadingText: null,
        activeMesh: "box",
        mat: null
    };

    /** Enable / disable all mesh-selection buttons (during loading). */
    ctx.setButtonsEnabled = function (enabled) {
        Object.keys(ctx.meshBtns).forEach(function (k) {
            ctx.meshBtns[k].alpha = enabled ? 1.0 : 0.4;
            ctx.meshBtns[k].isHitTestVisible = enabled;
        });
    };

    /** Activate a mesh by name – hides all others. */
    ctx.selectMesh = function (name) {
        if (ctx.isLoading) return;
        Object.keys(ctx.meshes).forEach(function (k) { ctx.meshes[k].setEnabled(false); });
        Object.keys(ctx.humanRoots).forEach(function (k) { ctx.humanRoots[k].setEnabled(false); });
        if (ctx.meshes[name]) ctx.meshes[name].setEnabled(true);
        else if (ctx.humanRoots[name]) ctx.humanRoots[name].setEnabled(true);
        ctx.activeMesh = name;
        Object.keys(ctx.meshBtns).forEach(function (k) {
            ctx.meshBtns[k].background = k === name ? "#e94560" : "#222244";
        });
    };

    /** Load (and cache) a human model from a URL. */
    ctx.loadHumanModel = function (name, rootUrl, fileName) {
        if (ctx.isLoading) return;
        if (ctx.humanRoots[name]) { ctx.selectMesh(name); return; }
        ctx.isLoading = true;
        ctx.setButtonsEnabled(false);
        if (ctx.loadingText) ctx.loadingText.isVisible = true;
        BABYLON.SceneLoader.ImportMesh("", rootUrl, fileName, scene, function (importedMeshes) {
            scene.animationGroups.forEach(function (ag) { ag.stop(); });
            var container = new BABYLON.TransformNode(name + "_root", scene);
            var bakedMeshes = [];
            importedMeshes.forEach(function (m, i) {
                if (!m.getTotalVertices || m.getTotalVertices() === 0) return;
                var positions = m.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                var normals = m.getVerticesData(BABYLON.VertexBuffer.NormalKind);
                var indices = m.getIndices();
                if (!positions || !normals || !indices) return;
                // Reverse triangle winding for GLB files (coordinate-system flip)
                if (fileName.match(/\.gl(b|tf)$/i)) {
                    for (var j = 0; j < indices.length; j += 3) {
                        var tmp = indices[j + 1];
                        indices[j + 1] = indices[j + 2];
                        indices[j + 2] = tmp;
                    }
                }
                var baked = new BABYLON.Mesh(name + "_baked_" + i, scene);
                var vd = new BABYLON.VertexData();
                vd.positions = positions;
                vd.normals = normals;
                vd.indices = indices;
                vd.applyToMesh(baked);
                baked.material = ctx.mat;
                baked.parent = container;
                bakedMeshes.push(baked);
            });
            importedMeshes.forEach(function (m) { m.dispose(); });
            scene.transformNodes.slice().forEach(function (tn) {
                if (tn.name && (tn.name.indexOf("mixamorig") >= 0 || tn.name === "Idle" || tn.name === "HVGirl")) tn.dispose();
            });
            var min = null, max = null;
            bakedMeshes.forEach(function (m) {
                m.computeWorldMatrix(true);
                var bi = m.getBoundingInfo();
                var bmin = bi.boundingBox.minimumWorld;
                var bmax = bi.boundingBox.maximumWorld;
                if (!min) { min = bmin.clone(); max = bmax.clone(); }
                else { min = BABYLON.Vector3.Minimize(min, bmin); max = BABYLON.Vector3.Maximize(max, bmax); }
            });
            if (min && max) {
                var size = max.subtract(min);
                var maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    var s = 2.2 / maxDim;
                    container.scaling = new BABYLON.Vector3(s, s, s);
                    var center = min.add(max).scale(0.5);
                    container.position = center.scale(-s);
                }
            }
            container.parent = parent;
            ctx.humanRoots[name] = container;
            ctx.isLoading = false;
            ctx.setButtonsEnabled(true);
            if (ctx.loadingText) ctx.loadingText.isVisible = false;
            ctx.selectMesh(name);
        }, null, function () {
            // on error
            ctx.isLoading = false;
            ctx.setButtonsEnabled(true);
            if (ctx.loadingText) ctx.loadingText.isVisible = false;
        });
    };

    /**
     * Assign a ShaderMaterial to all primitive meshes and store it on ctx.
     * @param {BABYLON.ShaderMaterial} mat
     */
    ctx.setMaterial = function (mat) {
        ctx.mat = mat;
        Object.keys(ctx.meshes).forEach(function (k) { ctx.meshes[k].material = mat; });
    };

    return ctx;
};
