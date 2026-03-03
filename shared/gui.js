/**
 * Painter's Illumination — Shared GUI
 *
 * Provides the control panel (mesh buttons, color pickers, sliders)
 * common to all demos.  Demo-specific sliders are passed as a
 * configuration array so each page only declares what is unique.
 */
window.PaintersIllumination = window.PaintersIllumination || {};

// ── GUI helper factories ────────────────────────────────────────

/** Create a small section-label TextBlock. */
PaintersIllumination.makeLabel = function (text) {
    var t = new BABYLON.GUI.TextBlock(); t.text = text; t.color = "#bbb"; t.fontSize = 11;
    t.height = "22px"; t.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    t.paddingLeft = "6px"; t.paddingTop = "10px"; return t;
};

/** Create a horizontal separator line between sections. */
PaintersIllumination.makeSeparator = function () {
    var sep = new BABYLON.GUI.Rectangle();
    sep.width = "160px"; sep.height = "1px"; sep.thickness = 0;
    sep.background = "rgba(255,255,255,0.08)";
    sep.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    sep.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    // Container provides vertical breathing room above and below
    var wrapper = new BABYLON.GUI.Container();
    wrapper.width = "240px"; wrapper.height = "20px";
    wrapper.addControl(sep);
    return wrapper;
};

/** Create a horizontal row with label left and value right. */
PaintersIllumination.makeLabelRow = function (labelText, valueLabel) {
    var row = new BABYLON.GUI.StackPanel();
    row.isVertical = false; row.height = "22px"; row.width = "230px";
    row.paddingTop = "6px";
    var lbl = new BABYLON.GUI.TextBlock(); lbl.text = labelText; lbl.color = "#bbb";
    lbl.fontSize = 11; lbl.width = "170px";
    lbl.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    lbl.paddingLeft = "6px";
    valueLabel.width = "60px";
    valueLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    valueLabel.paddingRight = "6px";
    row.addControl(lbl); row.addControl(valueLabel);
    return row;
};

/** Create a themed Slider control. */
PaintersIllumination.makeSlider = function (min, max, value, onChange) {
    var s = new BABYLON.GUI.Slider();
    s.minimum = min; s.maximum = max; s.value = value;
    s.height = "20px"; s.width = "220px"; s.color = "#e94560"; s.background = "#333";
    s.thumbWidth = 14; s.paddingLeft = "6px"; s.paddingRight = "6px";
    s.onValueChangedObservable.add(onChange); return s;
};

/** Create a right-aligned value TextBlock (shows current slider value). */
PaintersIllumination.makeValueLabel = function (initial) {
    var t = new BABYLON.GUI.TextBlock(); t.text = initial; t.color = "#00d4ff"; t.fontSize = 11;
    t.height = "16px"; t.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    t.paddingRight = "10px"; return t;
};

// ── Main GUI builder ────────────────────────────────────────────

/**
 * Creates the full control-panel GUI.
 *
 * @param {object} ctx        - Scene context from setupScene
 * @param {object} lightCtx   - Light context from createLightIndicator
 * @param {Array}  sliderDefs - Demo-specific slider definitions, each:
 *   { label: string, min: number, max: number, value: number,
 *     format: function(v)->string, onChange: function(v) }
 * @returns {object} { advTex, panel }
 */
PaintersIllumination.createGUI = function (ctx, lightCtx, sliderDefs) {
    var makeLabel = PaintersIllumination.makeLabel;
    var makeSlider = PaintersIllumination.makeSlider;
    var makeValueLabel = PaintersIllumination.makeValueLabel;

    var advTex = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // ── Loading overlay ─────────────────────────────────────────
    ctx.loadingText = new BABYLON.GUI.TextBlock("loadingText", "Loading...");
    ctx.loadingText.color = "#00d4ff"; ctx.loadingText.fontSize = 28;
    ctx.loadingText.fontWeight = "bold";
    ctx.loadingText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    ctx.loadingText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    ctx.loadingText.isVisible = false;
    advTex.addControl(ctx.loadingText);

    // ── Panel toggle ────────────────────────────────────────────
    var panelVisible = true;
    var toggleBtn = BABYLON.GUI.Button.CreateSimpleButton("toggleBtn", "\u2699");
    toggleBtn.width = "40px"; toggleBtn.height = "40px"; toggleBtn.fontSize = 22;
    toggleBtn.color = "#ccc"; toggleBtn.background = "rgba(10,10,30,0.85)";
    toggleBtn.cornerRadius = 8; toggleBtn.thickness = 0;
    toggleBtn.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    toggleBtn.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    toggleBtn.paddingTop = "10px"; toggleBtn.paddingRight = "10px";
    toggleBtn.isVisible = false;
    advTex.addControl(toggleBtn);

    // ── Scroll viewer (panel container) ─────────────────────────
    var scrollViewer = new BABYLON.GUI.ScrollViewer();
    scrollViewer.width = "260px"; scrollViewer.height = "95%";
    scrollViewer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    scrollViewer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    scrollViewer.paddingTop = "10px"; scrollViewer.paddingRight = "10px";
    scrollViewer.background = "rgba(10,10,30,0.85)";
    scrollViewer.barSize = 8; scrollViewer.barColor = "#e94560";
    scrollViewer.barBackground = "#222244"; scrollViewer.thickness = 0;
    advTex.addControl(scrollViewer);

    // ── Block wheel events from zooming the camera while over the panel ──
    // The camera's mouse-wheel input is a direct DOM listener on the canvas,
    // so we must detach it while the pointer is over the GUI panel.
    var wheelInput = ctx.camera.inputs.attached.mousewheel;
    scrollViewer.onPointerEnterObservable.add(function () {
        if (wheelInput) wheelInput.detachControl();
    });
    scrollViewer.onPointerOutObservable.add(function () {
        if (wheelInput) wheelInput.attachControl(ctx.canvas);
    });

    var hideBtn = BABYLON.GUI.Button.CreateSimpleButton("hideBtn", "\u2715  Hide Panel");
    hideBtn.height = "30px"; hideBtn.width = "220px"; hideBtn.fontSize = 12;
    hideBtn.color = "#ccc"; hideBtn.background = "#222244";
    hideBtn.cornerRadius = 4; hideBtn.thickness = 0;
    hideBtn.paddingTop = "6px";

    function togglePanel() {
        panelVisible = !panelVisible;
        scrollViewer.isVisible = panelVisible;
        toggleBtn.isVisible = !panelVisible;
    }
    hideBtn.onPointerClickObservable.add(togglePanel);
    toggleBtn.onPointerClickObservable.add(togglePanel);

    var panel = new BABYLON.GUI.StackPanel();
    panel.width = "240px"; panel.isVertical = true;
    panel.adaptHeightToChildren = true;
    scrollViewer.addControl(panel);

    panel.addControl(hideBtn);

    // ── Mesh buttons ────────────────────────────────────────────
    panel.addControl(makeLabel("MESH SHAPE"));
    var btnGrid = new BABYLON.GUI.StackPanel();
    btnGrid.isVertical = false; btnGrid.height = "30px"; btnGrid.width = "230px"; btnGrid.paddingLeft = "4px";
    ["box", "sphere", "cylinder"].forEach(function (t) {
        var b = BABYLON.GUI.Button.CreateSimpleButton("btn_" + t, t.charAt(0).toUpperCase() + t.slice(1));
        b.width = "74px"; b.height = "26px"; b.fontSize = 11;
        b.color = "#ccc"; b.background = t === ctx.activeMesh ? "#e94560" : "#222244";
        b.cornerRadius = 4; b.thickness = 1;
        b.onPointerClickObservable.add(function () { ctx.selectMesh(t); });
        ctx.meshBtns[t] = b; btnGrid.addControl(b);
    });
    panel.addControl(btnGrid);

    var btnGrid2 = new BABYLON.GUI.StackPanel();
    btnGrid2.isVertical = false; btnGrid2.height = "30px"; btnGrid2.width = "230px"; btnGrid2.paddingLeft = "4px";
    var bMan = BABYLON.GUI.Button.CreateSimpleButton("btn_man", "Man");
    bMan.width = "112px"; bMan.height = "26px"; bMan.fontSize = 11;
    bMan.color = "#ccc"; bMan.background = "#222244";
    bMan.cornerRadius = 4; bMan.thickness = 1;
    bMan.onPointerClickObservable.add(function () {
        ctx.loadHumanModel("man", "https://playground.babylonjs.com/scenes/", "dummy3.babylon");
    });
    ctx.meshBtns["man"] = bMan; btnGrid2.addControl(bMan);
    panel.addControl(btnGrid2);

    var btnGrid3 = new BABYLON.GUI.StackPanel();
    btnGrid3.isVertical = false; btnGrid3.height = "30px"; btnGrid3.width = "230px"; btnGrid3.paddingLeft = "4px";
    var bMaleFace = BABYLON.GUI.Button.CreateSimpleButton("btn_maleFace", "Male Face");
    bMaleFace.width = "112px"; bMaleFace.height = "26px"; bMaleFace.fontSize = 11;
    bMaleFace.color = "#ccc"; bMaleFace.background = "#222244";
    bMaleFace.cornerRadius = 4; bMaleFace.thickness = 1;
    bMaleFace.onPointerClickObservable.add(function () {
        ctx.loadHumanModel("maleFace", "models/", "head.OBJ");
    });
    ctx.meshBtns["maleFace"] = bMaleFace; btnGrid3.addControl(bMaleFace);

    var bFemaleFace = BABYLON.GUI.Button.CreateSimpleButton("btn_femaleFace", "Female Face");
    bFemaleFace.width = "112px"; bFemaleFace.height = "26px"; bFemaleFace.fontSize = 11;
    bFemaleFace.color = "#ccc"; bFemaleFace.background = "#222244";
    bFemaleFace.cornerRadius = 4; bFemaleFace.thickness = 1;
    bFemaleFace.onPointerClickObservable.add(function () {
        ctx.loadHumanModel("femaleFace", "models/", "Emily_2_1.obj");
    });
    ctx.meshBtns["femaleFace"] = bFemaleFace; btnGrid3.addControl(bFemaleFace);
    panel.addControl(btnGrid3);

    // ── Color pickers ───────────────────────────────────────────
    var makeSeparator = PaintersIllumination.makeSeparator;
    var makeLabelRow = PaintersIllumination.makeLabelRow;
    var meshColor = new BABYLON.Color3(0.9, 0.25, 0.35);

    panel.addControl(makeSeparator());
    panel.addControl(makeLabel("MESH COLOR"));
    var picker = new BABYLON.GUI.ColorPicker();
    picker.value = meshColor; picker.height = "120px"; picker.width = "120px"; picker.paddingTop = "4px";
    picker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    picker.onValueChangedObservable.add(function (c) {
        meshColor = c;
        ctx.mat.setColor3("uDiffuse", new BABYLON.Color3(c.r, c.g, c.b));
    });
    panel.addControl(picker);

    panel.addControl(makeSeparator());
    panel.addControl(makeLabel("LIGHT COLOR"));
    var lightPicker = new BABYLON.GUI.ColorPicker();
    lightPicker.value = new BABYLON.Color3(1, 1, 1);
    lightPicker.height = "80px"; lightPicker.width = "80px"; lightPicker.paddingTop = "4px";
    lightPicker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    lightPicker.onValueChangedObservable.add(function (c) {
        ctx.mat.setColor3("uLightColor", new BABYLON.Color3(c.r, c.g, c.b));
        lightCtx.planeMat.emissiveColor = new BABYLON.Color3(c.r, c.g, c.b);
        if (lightCtx.gridLines) lightCtx.gridLines.color = new BABYLON.Color3(c.r, c.g, c.b);
    });
    panel.addControl(lightPicker);

    panel.addControl(makeSeparator());
    panel.addControl(makeLabel("AMBIENT COLOR"));
    var ambPicker = new BABYLON.GUI.ColorPicker();
    ambPicker.value = new BABYLON.Color3(0.06, 0.04, 0.08);
    ambPicker.height = "80px"; ambPicker.width = "80px"; ambPicker.paddingTop = "4px";
    ambPicker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    ambPicker.onValueChangedObservable.add(function (c) {
        ctx.mat.setColor3("uAmbient", new BABYLON.Color3(c.r, c.g, c.b));
    });
    panel.addControl(ambPicker);

    // ── Demo-specific sliders ───────────────────────────────────
    if (sliderDefs.length > 0) panel.addControl(makeSeparator());
    sliderDefs.forEach(function (def, idx) {
        if (idx > 0) panel.addControl(makeSeparator());
        var val = makeValueLabel(def.format(def.value));
        panel.addControl(makeLabelRow(def.label, val));
        panel.addControl(makeSlider(def.min, def.max, def.value, function (v) {
            def.onChange(v);
            val.text = def.format(v);
        }));
    });

    // ── Light direction sliders ─────────────────────────────────
    panel.addControl(makeSeparator());
    var laVal = makeValueLabel(Math.round(lightCtx.lightAzimuth) + "\u00B0");
    panel.addControl(makeLabelRow("LIGHT DIR (horizontal)", laVal));
    panel.addControl(makeSlider(0, 360, lightCtx.lightAzimuth, function (v) {
        lightCtx.lightAzimuth = v; lightCtx.updateLight();
        laVal.text = Math.round(v) + "\u00B0";
    }));

    panel.addControl(makeSeparator());
    var leVal = makeValueLabel(Math.round(lightCtx.lightElevation) + "\u00B0");
    panel.addControl(makeLabelRow("LIGHT DIR (vertical)", leVal));
    panel.addControl(makeSlider(-90, 90, lightCtx.lightElevation, function (v) {
        lightCtx.lightElevation = v; lightCtx.updateLight();
        leVal.text = Math.round(v) + "\u00B0";
    }));

    // ── Rotation sliders ────────────────────────────────────────
    ["X", "Y", "Z"].forEach(function (axis) {
        panel.addControl(makeSeparator());
        var val = makeValueLabel("0\u00B0");
        panel.addControl(makeLabelRow("ROTATION " + axis, val));
        panel.addControl(makeSlider(0, 360, 0, function (v) {
            ctx.parent.rotation[axis.toLowerCase()] = v * Math.PI / 180;
            val.text = Math.round(v) + "\u00B0";
        }));
    });

    return { advTex: advTex, panel: panel };
};
