/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated April 5, 2025. Replaces all prior versions.
 *
 * Copyright (c) 2013-2025, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import { AnimationState, AnimationStateData, AtlasAttachmentLoader, Color, MathUtils, MixBlend, MixDirection, Physics, Skeleton, SkeletonBinary, SkeletonJson, TextureFilter, TimeKeeper, Vector2 } from "@esotericsoftware/spine-core";
import { AssetManager, Input, LoadingScreen, ManagedWebGLRenderingContext, ResizeMode, SceneRenderer, Vector3 } from "@esotericsoftware/spine-webgl";
export class SpinePlayer {
    config;
    parent;
    dom;
    canvas = null;
    context = null;
    sceneRenderer = null;
    loadingScreen = null;
    assetManager = null;
    bg = new Color();
    bgFullscreen = new Color();
    playerControls = null;
    timelineSlider = null;
    playButton = null;
    skinButton = null;
    animationButton = null;
    playTime = 0;
    selectedBones = [];
    cancelId = 0;
    popup = null;
    /* True if the player is unable to load or render the skeleton. */
    error = false;
    /* The player's skeleton. Null until loading is complete (access after config.success). */
    skeleton = null;
    /* The animation state controlling the skeleton. Null until loading is complete (access after config.success). */
    animationState = null;
    paused = true;
    speed = 1;
    time = new TimeKeeper();
    stopRequestAnimationFrame = false;
    disposed = false;
    viewport = {};
    currentViewport = {};
    previousViewport = {};
    viewportTransitionStart = 0;
    eventListeners = [];
    input;
    constructor(parent, config) {
        this.config = config;
        let parentDom = typeof parent === "string" ? document.getElementById(parent) : parent;
        if (parentDom == null)
            throw new Error("SpinePlayer parent not found: " + parent);
        this.parent = parentDom;
        if (config.showControls === void 0)
            config.showControls = true;
        let controls = config.showControls ? /*html*/ `
<div class="spine-player-controls spine-player-popup-parent spine-player-controls-hidden">
<div class="spine-player-timeline"></div>
<div class="spine-player-buttons">
<button class="spine-player-button spine-player-button-icon-pause"></button>
<div class="spine-player-button-spacer"></div>
<button class="spine-player-button spine-player-button-icon-speed"></button>
<button class="spine-player-button spine-player-button-icon-animations"></button>
<button class="spine-player-button spine-player-button-icon-skins"></button>
<button class="spine-player-button spine-player-button-icon-settings"></button>
<button class="spine-player-button spine-player-button-icon-fullscreen"></button>
<img class="spine-player-button-icon-spine-logo" src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20104%2031.16%22%3E%3Cpath%20d%3D%22M104%2012.68a1.31%201.31%200%200%201-.37%201%201.28%201.28%200%200%201-.85.31H91.57a10.51%2010.51%200%200%200%20.29%202.55%204.92%204.92%200%200%200%201%202%204.27%204.27%200%200%200%201.64%201.26%206.89%206.89%200%200%200%202.6.44%2010.66%2010.66%200%200%200%202.17-.2%2012.81%2012.81%200%200%200%201.64-.44q.69-.25%201.14-.44a1.87%201.87%200%200%201%20.68-.2.44.44%200%200%201%20.27.04.43.43%200%200%201%20.16.2%201.38%201.38%200%200%201%20.09.37%204.89%204.89%200%200%201%200%20.58%204.14%204.14%200%200%201%200%20.43v.32a.83.83%200%200%201-.09.26%201.1%201.1%200%200%201-.17.22%202.77%202.77%200%200%201-.61.34%208.94%208.94%200%200%201-1.32.46%2018.54%2018.54%200%200%201-1.88.41%2013.78%2013.78%200%200%201-2.28.18%2010.55%2010.55%200%200%201-3.68-.59%206.82%206.82%200%200%201-2.66-1.74%207.44%207.44%200%200%201-1.63-2.89%2013.48%2013.48%200%200%201-.55-4%2012.76%2012.76%200%200%201%20.57-3.94%208.35%208.35%200%200%201%201.64-3%207.15%207.15%200%200%201%202.58-1.87%208.47%208.47%200%200%201%203.39-.65%208.19%208.19%200%200%201%203.41.64%206.46%206.46%200%200%201%202.32%201.73%207%207%200%200%201%201.3%202.54%2011.17%2011.17%200%200%201%20.43%203.13zm-3.14-.93a5.69%205.69%200%200%200-1.09-3.86%204.17%204.17%200%200%200-3.42-1.4%204.52%204.52%200%200%200-2%20.44%204.41%204.41%200%200%200-1.47%201.15A5.29%205.29%200%200%200%2092%209.75a7%207%200%200%200-.36%202zM80.68%2021.94a.42.42%200%200%201-.08.26.59.59%200%200%201-.25.18%201.74%201.74%200%200%201-.47.11%206.31%206.31%200%200%201-.76%200%206.5%206.5%200%200%201-.78%200%201.74%201.74%200%200%201-.47-.11.59.59%200%200%201-.25-.18.42.42%200%200%201-.08-.26V12a9.8%209.8%200%200%200-.23-2.35%204.86%204.86%200%200%200-.66-1.53%202.88%202.88%200%200%200-1.13-1%203.57%203.57%200%200%200-1.6-.34%204%204%200%200%200-2.35.83A12.71%2012.71%200%200%200%2069.11%2010v11.9a.42.42%200%200%201-.08.26.59.59%200%200%201-.25.18%201.74%201.74%200%200%201-.47.11%206.51%206.51%200%200%201-.78%200%206.31%206.31%200%200%201-.76%200%201.88%201.88%200%200%201-.48-.11.52.52%200%200%201-.25-.18.46.46%200%200%201-.07-.26v-17a.53.53%200%200%201%20.03-.21.5.5%200%200%201%20.23-.19%201.28%201.28%200%200%201%20.44-.11%208.53%208.53%200%200%201%201.39%200%201.12%201.12%200%200%201%20.43.11.6.6%200%200%201%20.22.19.47.47%200%200%201%20.07.26V7.2a10.46%2010.46%200%200%201%202.87-2.36%206.17%206.17%200%200%201%202.88-.75%206.41%206.41%200%200%201%202.87.58%205.16%205.16%200%200%201%201.88%201.54%206.15%206.15%200%200%201%201%202.26%2013.46%2013.46%200%200%201%20.31%203.11z%22%20fill%3D%22%23fff%22%2F%3E%3Cpath%20d%3D%22M43.35%202.86c.09%202.6%201.89%204%205.48%204.61%203%20.48%205.79.24%206.69-2.37%201.75-5.09-2.4-3.82-6-4.39s-6.31-2.03-6.17%202.15zm1.08%2010.69c.33%201.94%202.14%203.06%204.91%203s4.84-1.16%205.13-3.25c.53-3.88-2.53-2.38-5.3-2.3s-5.4-1.26-4.74%202.55zM48%2022.44c.55%201.45%202.06%202.06%204.1%201.63s3.45-1.11%203.33-2.76c-.21-3.06-2.22-2.1-4.26-1.66S47%2019.6%2048%2022.44zm1.78%206.78c.16%201.22%201.22%202%202.88%201.93s2.92-.67%203.13-2c.4-2.43-1.46-1.53-3.12-1.51s-3.17-.82-2.89%201.58z%22%20fill%3D%22%23ff4000%22%2F%3E%3Cpath%20d%3D%22M35.28%2013.16a15.33%2015.33%200%200%201-.48%204%208.75%208.75%200%200%201-1.42%203%206.35%206.35%200%200%201-2.32%201.91%207.14%207.14%200%200%201-3.16.67%206.1%206.1%200%200%201-1.4-.15%205.34%205.34%200%200%201-1.26-.47%207.29%207.29%200%200%201-1.24-.81q-.61-.49-1.29-1.15v8.51a.47.47%200%200%201-.08.26.56.56%200%200%201-.25.19%201.74%201.74%200%200%201-.47.11%206.47%206.47%200%200%201-.78%200%206.26%206.26%200%200%201-.76%200%201.89%201.89%200%200%201-.48-.11.49.49%200%200%201-.25-.19.51.51%200%200%201-.07-.26V4.91a.57.57%200%200%201%20.06-.27.46.46%200%200%201%20.23-.18%201.47%201.47%200%200%201%20.44-.1%207.41%207.41%200%200%201%201.3%200%201.45%201.45%200%200%201%20.43.1.52.52%200%200%201%20.24.18.51.51%200%200%201%20.07.27V7.2a18.06%2018.06%200%200%201%201.49-1.38%209%209%200%200%201%201.45-1%206.82%206.82%200%200%201%201.49-.59%207.09%207.09%200%200%201%204.78.52%206%206%200%200%201%202.13%202%208.79%208.79%200%200%201%201.2%202.9%2015.72%2015.72%200%200%201%20.4%203.51zm-3.28.36a15.64%2015.64%200%200%200-.2-2.53%207.32%207.32%200%200%200-.69-2.17%204.06%204.06%200%200%200-1.3-1.51%203.49%203.49%200%200%200-2-.57%204.1%204.1%200%200%200-1.2.18%204.92%204.92%200%200%200-1.2.57%208.54%208.54%200%200%200-1.28%201A15.77%2015.77%200%200%200%2022.76%2010v6.77a13.53%2013.53%200%200%200%202.46%202.4%204.12%204.12%200%200%200%202.44.83%203.56%203.56%200%200%200%202-.57A4.28%204.28%200%200%200%2031%2018a7.58%207.58%200%200%200%20.77-2.12%2011.43%2011.43%200%200%200%20.23-2.36zM12%2017.3a5.39%205.39%200%200%201-.48%202.33%204.73%204.73%200%200%201-1.37%201.72%206.19%206.19%200%200%201-2.12%201.06%209.62%209.62%200%200%201-2.71.36%2010.38%2010.38%200%200%201-3.21-.5A7.63%207.63%200%200%201%201%2021.82a3.25%203.25%200%200%201-.66-.43%201.09%201.09%200%200%201-.3-.53%203.59%203.59%200%200%201-.04-.93%204.06%204.06%200%200%201%200-.61%202%202%200%200%201%20.09-.4.42.42%200%200%201%20.16-.22.43.43%200%200%201%20.24-.07%201.35%201.35%200%200%201%20.61.26q.41.26%201%20.56a9.22%209.22%200%200%200%201.41.55%206.25%206.25%200%200%200%201.87.26%205.62%205.62%200%200%200%201.44-.17%203.48%203.48%200%200%200%201.12-.5%202.23%202.23%200%200%200%20.73-.84%202.68%202.68%200%200%200%20.26-1.21%202%202%200%200%200-.37-1.21%203.55%203.55%200%200%200-1-.87%208.09%208.09%200%200%200-1.36-.66l-1.56-.61a16%2016%200%200%201-1.57-.73%206%206%200%200%201-1.37-1%204.52%204.52%200%200%201-1-1.4%204.69%204.69%200%200%201-.37-2%204.88%204.88%200%200%201%20.39-1.87%204.46%204.46%200%200%201%201.16-1.61%205.83%205.83%200%200%201%201.94-1.11A8.06%208.06%200%200%201%206.53%204a8.28%208.28%200%200%201%201.36.11%209.36%209.36%200%200%201%201.23.28%205.92%205.92%200%200%201%20.94.37%204.09%204.09%200%200%201%20.59.35%201%201%200%200%201%20.26.26.83.83%200%200%201%20.09.26%201.32%201.32%200%200%200%20.06.35%203.87%203.87%200%200%201%200%20.51%204.76%204.76%200%200%201%200%20.56%201.39%201.39%200%200%201-.09.39.5.5%200%200%201-.16.22.35.35%200%200%201-.21.07%201%201%200%200%201-.49-.21%207%207%200%200%200-.83-.44%209.26%209.26%200%200%200-1.2-.44%205.49%205.49%200%200%200-1.58-.16%204.93%204.93%200%200%200-1.4.18%202.69%202.69%200%200%200-1%20.51%202.16%202.16%200%200%200-.59.83%202.43%202.43%200%200%200-.2%201%202%202%200%200%200%20.38%201.24%203.6%203.6%200%200%200%201%20.88%208.25%208.25%200%200%200%201.38.68l1.58.62q.8.32%201.59.72a6%206%200%200%201%201.39%201%204.37%204.37%200%200%201%201%201.36%204.46%204.46%200%200%201%20.37%201.8z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E">
</div></div>` : "";
        this.parent.appendChild(this.dom = createElement(
        /*html*/ `<div class="spine-player" style="position:relative;height:100%"><canvas class="spine-player-canvas" style="display:block;width:100%;height:100%"></canvas>${controls}</div>`));
        try {
            this.validateConfig(config);
        }
        catch (e) {
            this.showError(e.message, e);
        }
        this.initialize();
        // Register a global resize handler to redraw, avoiding flicker.
        this.addEventListener(window, "resize", () => this.drawFrame(false));
        // Start the rendering loop.
        requestAnimationFrame(() => this.drawFrame());
    }
    dispose() {
        this.sceneRenderer?.dispose();
        this.loadingScreen?.dispose();
        this.assetManager?.dispose();
        this.context?.dispose();
        for (var i = 0; i < this.eventListeners.length; i++) {
            var eventListener = this.eventListeners[i];
            eventListener.target.removeEventListener(eventListener.event, eventListener.func);
        }
        this.input?.dispose();
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
        this.parent.removeChild(this.dom);
        this.disposed = true;
    }
    addEventListener(target, event, func) {
        this.eventListeners.push({ target: target, event: event, func: func });
        target.addEventListener(event, func);
    }
    validateConfig(config) {
        if (!config)
            throw new Error("A configuration object must be passed to to new SpinePlayer().");
        if (config.skelUrl)
            config.skeleton = config.skelUrl;
        if (!config.skeleton && !config.jsonUrl && !config.binaryUrl)
            throw new Error("A URL must be specified for the skeleton JSON or binary file.");
        if (!config.scale)
            config.scale = 1;
        if (!config.atlas && !config.atlasUrl)
            throw new Error("A URL must be specified for the atlas file.");
        if (config.jsonUrl && !config.skeleton)
            config.skeleton = config.jsonUrl;
        if (config.binaryUrl && !config.skeleton)
            config.skeleton = config.binaryUrl;
        if (config.atlasUrl && !config.atlas)
            config.atlas = config.atlasUrl;
        if (!config.backgroundColor)
            config.backgroundColor = config.alpha ? "00000000" : "000000";
        if (!config.fullScreenBackgroundColor)
            config.fullScreenBackgroundColor = config.backgroundColor;
        if (config.backgroundImage && !config.backgroundImage.url)
            config.backgroundImage = undefined;
        if (config.premultipliedAlpha === void 0)
            config.premultipliedAlpha = true;
        if (config.preserveDrawingBuffer === void 0)
            config.preserveDrawingBuffer = false;
        if (config.mipmaps === void 0)
            config.mipmaps = true;
        if (config.interactive === void 0)
            config.interactive = true;
        if (!config.debug)
            config.debug = {
                bones: false,
                clipping: false,
                bounds: false,
                hulls: false,
                meshes: false,
                paths: false,
                points: false,
                regions: false
            };
        if (config.animations && config.animation && config.animations.indexOf(config.animation) < 0)
            throw new Error("Animation '" + config.animation + "' is not in the config animation list: " + toString(config.animations));
        if (config.skins && config.skin && config.skins.indexOf(config.skin) < 0)
            throw new Error("Default skin '" + config.skin + "' is not in the config skins list: " + toString(config.skins));
        if (!config.viewport)
            config.viewport = {};
        if (!config.viewport.animations)
            config.viewport.animations = {};
        if (config.viewport.debugRender === void 0)
            config.viewport.debugRender = false;
        if (config.viewport.transitionTime === void 0)
            config.viewport.transitionTime = 0.25;
        if (!config.controlBones)
            config.controlBones = [];
        if (config.showLoading === void 0)
            config.showLoading = true;
        if (config.defaultMix === void 0)
            config.defaultMix = 0.25;
    }
    initialize() {
        let config = this.config;
        let dom = this.dom;
        if (!config.alpha) { // Prevents a flash before the first frame is drawn.
            let hex = config.backgroundColor;
            this.dom.style.backgroundColor = (hex.charAt(0) == '#' ? hex : "#" + hex).substr(0, 7);
        }
        try {
            // Setup the OpenGL context.
            this.canvas = findWithClass(dom, "spine-player-canvas");
            this.context = new ManagedWebGLRenderingContext(this.canvas, { alpha: config.alpha, preserveDrawingBuffer: config.preserveDrawingBuffer });
            // Setup the scene renderer and loading screen.
            this.sceneRenderer = new SceneRenderer(this.canvas, this.context, true);
            if (config.showLoading)
                this.loadingScreen = new LoadingScreen(this.sceneRenderer);
        }
        catch (e) {
            this.showError("Sorry, your browser does not support WebGL, or you have disabled WebGL in your browser settings.\nPlease use the latest version of Firefox, Chrome, Edge, or Safari.", e);
            return null;
        }
        // Load the assets.
        this.assetManager = new AssetManager(this.context, "", config.downloader);
        if (config.rawDataURIs) {
            for (let path in config.rawDataURIs)
                this.assetManager.setRawDataURI(path, config.rawDataURIs[path]);
        }
        if (config.skeleton.endsWith(".json"))
            this.assetManager.loadJson(config.skeleton);
        else
            this.assetManager.loadBinary(config.skeleton);
        this.assetManager.loadTextureAtlas(config.atlas);
        if (config.backgroundImage)
            this.assetManager.loadTexture(config.backgroundImage.url);
        // Setup the UI elements.
        this.bg.setFromString(config.backgroundColor);
        this.bgFullscreen.setFromString(config.fullScreenBackgroundColor);
        if (config.showControls) {
            this.playerControls = dom.children[1];
            let controls = this.playerControls.children;
            let timeline = controls[0];
            let buttons = controls[1].children;
            this.playButton = buttons[0];
            let speedButton = buttons[2];
            this.animationButton = buttons[3];
            this.skinButton = buttons[4];
            let settingsButton = buttons[5];
            let fullscreenButton = buttons[6];
            let logoButton = buttons[7];
            this.timelineSlider = new Slider();
            timeline.appendChild(this.timelineSlider.create());
            this.timelineSlider.change = (percentage) => {
                this.pause();
                let animationDuration = this.animationState.getCurrent(0).animation.duration;
                let time = animationDuration * percentage;
                this.animationState.update(time - this.playTime);
                this.animationState.apply(this.skeleton);
                this.skeleton.update(time - this.playTime);
                this.skeleton.updateWorldTransform(Physics.update);
                this.playTime = time;
            };
            this.playButton.onclick = () => (this.paused ? this.play() : this.pause());
            speedButton.onclick = () => this.showSpeedDialog(speedButton);
            this.animationButton.onclick = () => this.showAnimationsDialog(this.animationButton);
            this.skinButton.onclick = () => this.showSkinsDialog(this.skinButton);
            settingsButton.onclick = () => this.showSettingsDialog(settingsButton);
            let oldWidth = this.canvas.clientWidth, oldHeight = this.canvas.clientHeight;
            let oldStyleWidth = this.canvas.style.width, oldStyleHeight = this.canvas.style.height;
            let isFullscreen = false;
            fullscreenButton.onclick = () => {
                let fullscreenChanged = () => {
                    isFullscreen = !isFullscreen;
                    if (!isFullscreen) {
                        this.canvas.style.width = oldWidth + "px";
                        this.canvas.style.height = oldHeight + "px";
                        this.drawFrame(false);
                        // Got to reset the style to whatever the user set after the next layouting.
                        requestAnimationFrame(() => {
                            this.canvas.style.width = oldStyleWidth;
                            this.canvas.style.height = oldStyleHeight;
                        });
                    }
                };
                let player = dom;
                player.onfullscreenchange = fullscreenChanged;
                player.onwebkitfullscreenchange = fullscreenChanged;
                let doc = document;
                if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
                    if (doc.exitFullscreen)
                        doc.exitFullscreen();
                    else if (doc.mozCancelFullScreen)
                        doc.mozCancelFullScreen();
                    else if (doc.webkitExitFullscreen)
                        doc.webkitExitFullscreen();
                    else if (doc.msExitFullscreen)
                        doc.msExitFullscreen();
                }
                else {
                    oldWidth = this.canvas.clientWidth;
                    oldHeight = this.canvas.clientHeight;
                    oldStyleWidth = this.canvas.style.width;
                    oldStyleHeight = this.canvas.style.height;
                    if (player.requestFullscreen)
                        player.requestFullscreen();
                    else if (player.webkitRequestFullScreen)
                        player.webkitRequestFullScreen();
                    else if (player.mozRequestFullScreen)
                        player.mozRequestFullScreen();
                    else if (player.msRequestFullscreen)
                        player.msRequestFullscreen();
                }
            };
            logoButton.onclick = () => window.open("http://esotericsoftware.com");
        }
        return dom;
    }
    loadSkeleton() {
        if (this.error)
            return;
        if (this.assetManager.hasErrors())
            this.showError("Error: Assets could not be loaded.\n" + toString(this.assetManager.getErrors()));
        let config = this.config;
        // Configure filtering, don't use mipmaps in WebGL1 if the atlas page is non-POT
        let atlas = this.assetManager.require(config.atlas);
        let gl = this.context.gl, anisotropic = gl.getExtension("EXT_texture_filter_anisotropic");
        let isWebGL1 = gl.getParameter(gl.VERSION).indexOf("WebGL 1.0") != -1;
        for (let page of atlas.pages) {
            let minFilter = page.minFilter;
            var useMipMaps = config.mipmaps;
            var isPOT = MathUtils.isPowerOfTwo(page.width) && MathUtils.isPowerOfTwo(page.height);
            if (isWebGL1 && !isPOT)
                useMipMaps = false;
            if (useMipMaps) {
                if (anisotropic) {
                    gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, 8);
                    minFilter = TextureFilter.MipMapLinearLinear;
                }
                else
                    minFilter = TextureFilter.Linear; // Don't use mipmaps without anisotropic.
                page.texture.setFilters(minFilter, TextureFilter.Nearest);
            }
            if (minFilter != TextureFilter.Nearest && minFilter != TextureFilter.Linear)
                page.texture.update(true);
        }
        // Load skeleton data.
        let skeletonData;
        try {
            let loader, data, attachmentLoader = new AtlasAttachmentLoader(atlas);
            if (config.skeleton.endsWith(".json")) {
                data = this.assetManager.remove(config.skeleton);
                if (!data)
                    throw new Error("Empty JSON data.");
                if (config.jsonField) {
                    data = data[config.jsonField];
                    if (!data)
                        throw new Error("JSON field does not exist: " + config.jsonField);
                }
                loader = new SkeletonJson(attachmentLoader);
            }
            else {
                data = this.assetManager.remove(config.skeleton);
                loader = new SkeletonBinary(attachmentLoader);
            }
            loader.scale = config.scale;
            skeletonData = loader.readSkeletonData(data);
        }
        catch (e) {
            this.showError(`Error: Could not load skeleton data.\n${e.message}`, e);
            return;
        }
        this.skeleton = new Skeleton(skeletonData);
        let stateData = new AnimationStateData(skeletonData);
        stateData.defaultMix = config.defaultMix;
        this.animationState = new AnimationState(stateData);
        // Check if all control bones are in the skeleton
        config.controlBones.forEach(bone => {
            if (!skeletonData.findBone(bone))
                this.showError(`Error: Control bone does not exist in skeleton: ${bone}`);
        });
        // Setup skin.
        if (!config.skin && skeletonData.skins.length)
            config.skin = skeletonData.skins[0].name;
        if (config.skins && config.skin.length) {
            config.skins.forEach(skin => {
                if (!this.skeleton.data.findSkin(skin))
                    this.showError(`Error: Skin in config list does not exist in skeleton: ${skin}`);
            });
        }
        if (config.skin) {
            if (!this.skeleton.data.findSkin(config.skin))
                this.showError(`Error: Skin does not exist in skeleton: ${config.skin}`);
            this.skeleton.setSkinByName(config.skin);
            this.skeleton.setSlotsToSetupPose();
        }
        // Check if all animations given a viewport exist.
        Object.getOwnPropertyNames(config.viewport.animations).forEach((animation) => {
            if (!skeletonData.findAnimation(animation))
                this.showError(`Error: Animation for which a viewport was specified does not exist in skeleton: ${animation}`);
        });
        // Setup the animations after the viewport, so default bounds don't get messed up.
        if (config.animations && config.animations.length) {
            config.animations.forEach(animation => {
                if (!this.skeleton.data.findAnimation(animation))
                    this.showError(`Error: Animation in config list does not exist in skeleton: ${animation}`);
            });
            if (!config.animation)
                config.animation = config.animations[0];
        }
        if (config.animation && !skeletonData.findAnimation(config.animation))
            this.showError(`Error: Animation does not exist in skeleton: ${config.animation}`);
        // Setup input processing and control bones.
        this.setupInput();
        if (config.showControls) {
            // Hide skin and animation if there's only the default skin / no animation
            if (skeletonData.skins.length == 1 || (config.skins && config.skins.length == 1))
                this.skinButton.classList.add("spine-player-hidden");
            if (skeletonData.animations.length == 1 || (config.animations && config.animations.length == 1))
                this.animationButton.classList.add("spine-player-hidden");
        }
        if (config.success)
            config.success(this);
        let entry = this.animationState.getCurrent(0);
        if (!entry) {
            if (config.animation) {
                entry = this.setAnimation(config.animation);
                this.play();
            }
            else {
                entry = this.animationState.setEmptyAnimation(0);
                entry.trackEnd = 100000000;
                this.skeleton.updateWorldTransform(Physics.update);
                this.setViewport(entry.animation);
                this.pause();
            }
        }
        else {
            if (this.currentViewport.x === undefined) {
                this.setViewport(entry.animation);
            }
            if (!config.animation) {
                config.animation = entry.animation?.name;
            }
            this.play();
        }
    }
    setupInput() {
        let config = this.config;
        let controlBones = config.controlBones;
        if (!controlBones.length && !config.showControls)
            return;
        let selectedBones = this.selectedBones = new Array(controlBones.length);
        let canvas = this.canvas;
        let target = null;
        let offset = new Vector2();
        let coords = new Vector3();
        let mouse = new Vector3();
        let position = new Vector2();
        let skeleton = this.skeleton;
        let renderer = this.sceneRenderer;
        if (config.interactive) {
            let closest = function (x, y) {
                mouse.set(x, canvas.clientHeight - y, 0);
                offset.x = offset.y = 0;
                let bestDistance = 24, index = 0;
                let best = null;
                for (let i = 0; i < controlBones.length; i++) {
                    selectedBones[i] = null;
                    let bone = skeleton.findBone(controlBones[i]);
                    if (!bone)
                        continue;
                    let distance = renderer.camera.worldToScreen(coords.set(bone.worldX, bone.worldY, 0), canvas.clientWidth, canvas.clientHeight).distance(mouse);
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        best = bone;
                        index = i;
                        offset.x = coords.x - mouse.x;
                        offset.y = coords.y - mouse.y;
                    }
                }
                if (best)
                    selectedBones[index] = best;
                return best;
            };
            this.input = new Input(canvas);
            this.input.addListener({
                down: (x, y) => {
                    target = closest(x, y);
                },
                up: () => {
                    if (target)
                        target = null;
                    else if (config.showControls)
                        (this.paused ? this.play() : this.pause());
                },
                dragged: (x, y) => {
                    if (target) {
                        x = MathUtils.clamp(x + offset.x, 0, canvas.clientWidth);
                        y = MathUtils.clamp(y - offset.y, 0, canvas.clientHeight);
                        renderer.camera.screenToWorld(coords.set(x, y, 0), canvas.clientWidth, canvas.clientHeight);
                        if (target.parent) {
                            target.parent.worldToLocal(position.set(coords.x - skeleton.x, coords.y - skeleton.y));
                            target.x = position.x;
                            target.y = position.y;
                        }
                        else {
                            target.x = coords.x - skeleton.x;
                            target.y = coords.y - skeleton.y;
                        }
                    }
                },
                moved: (x, y) => closest(x, y)
            });
        }
        if (config.showControls) {
            // For manual hover to work, we need to disable hidding controls if the mouse/touch entered the clickable area of a child of the controls.
            // For this we need to register a mouse handler on the document and see if we are within the canvas area.
            this.addEventListener(document, "mousemove", (ev) => {
                if (ev instanceof MouseEvent)
                    handleHover(ev.clientX, ev.clientY);
            });
            this.addEventListener(document, "touchmove", (ev) => {
                if (ev instanceof TouchEvent) {
                    let touches = ev.changedTouches;
                    if (touches.length) {
                        let touch = touches[0];
                        handleHover(touch.clientX, touch.clientY);
                    }
                }
            });
            let overlap = (mouseX, mouseY, rect) => {
                let x = mouseX - rect.left, y = mouseY - rect.top;
                return x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
            };
            let mouseOverControls = true, mouseOverCanvas = false;
            let handleHover = (mouseX, mouseY) => {
                let popup = findWithClass(this.dom, "spine-player-popup");
                mouseOverControls = overlap(mouseX, mouseY, this.playerControls.getBoundingClientRect());
                mouseOverCanvas = overlap(mouseX, mouseY, canvas.getBoundingClientRect());
                clearTimeout(this.cancelId);
                let hide = !popup && !mouseOverControls && !mouseOverCanvas && !this.paused;
                if (hide)
                    this.playerControls.classList.add("spine-player-controls-hidden");
                else
                    this.playerControls.classList.remove("spine-player-controls-hidden");
                if (!mouseOverControls && !popup && !this.paused) {
                    this.cancelId = setTimeout(() => {
                        if (!this.paused)
                            this.playerControls.classList.add("spine-player-controls-hidden");
                    }, 1000);
                }
            };
        }
    }
    play() {
        this.paused = false;
        let config = this.config;
        if (config.showControls) {
            this.cancelId = setTimeout(() => {
                if (!this.paused)
                    this.playerControls.classList.add("spine-player-controls-hidden");
            }, 1000);
            this.playButton.classList.remove("spine-player-button-icon-play");
            this.playButton.classList.add("spine-player-button-icon-pause");
            // If no config animation, set one when first clicked.
            if (!config.animation) {
                if (config.animations && config.animations.length)
                    config.animation = config.animations[0];
                else if (this.skeleton.data.animations.length)
                    config.animation = this.skeleton.data.animations[0].name;
                if (config.animation)
                    this.setAnimation(config.animation);
            }
        }
    }
    pause() {
        this.paused = true;
        if (this.config.showControls) {
            this.playerControls.classList.remove("spine-player-controls-hidden");
            clearTimeout(this.cancelId);
            this.playButton.classList.remove("spine-player-button-icon-pause");
            this.playButton.classList.add("spine-player-button-icon-play");
        }
    }
    /* Sets a new animation and viewport on track 0. */
    setAnimation(animation, loop = true) {
        animation = this.setViewport(animation);
        return this.animationState.setAnimationWith(0, animation, loop);
    }
    /* Adds a new animation and viewport on track 0. */
    addAnimation(animation, loop = true, delay = 0) {
        animation = this.setViewport(animation);
        return this.animationState.addAnimationWith(0, animation, loop, delay);
    }
    /* Sets the viewport for the specified animation. */
    setViewport(animation) {
        if (typeof animation == "string") {
            let foundAnimation = this.skeleton.data.findAnimation(animation);
            if (!foundAnimation)
                throw new Error("Animation not found: " + animation);
            animation = foundAnimation;
        }
        this.previousViewport = this.currentViewport;
        // Determine the base viewport.
        let globalViewport = this.config.viewport;
        let viewport = this.currentViewport = {
            padLeft: globalViewport.padLeft !== void 0 ? globalViewport.padLeft : "10%",
            padRight: globalViewport.padRight !== void 0 ? globalViewport.padRight : "10%",
            padTop: globalViewport.padTop !== void 0 ? globalViewport.padTop : "10%",
            padBottom: globalViewport.padBottom !== void 0 ? globalViewport.padBottom : "10%"
        };
        if (globalViewport.x !== void 0 && globalViewport.y !== void 0 && globalViewport.width && globalViewport.height) {
            viewport.x = globalViewport.x;
            viewport.y = globalViewport.y;
            viewport.width = globalViewport.width;
            viewport.height = globalViewport.height;
        }
        else
            this.calculateAnimationViewport(animation, viewport);
        // Override with the animation specific viewport for the final result.
        let userAnimViewport = this.config.viewport.animations[animation.name];
        if (userAnimViewport) {
            if (userAnimViewport.x !== void 0 && userAnimViewport.y !== void 0 && userAnimViewport.width && userAnimViewport.height) {
                viewport.x = userAnimViewport.x;
                viewport.y = userAnimViewport.y;
                viewport.width = userAnimViewport.width;
                viewport.height = userAnimViewport.height;
            }
            if (userAnimViewport.padLeft !== void 0)
                viewport.padLeft = userAnimViewport.padLeft;
            if (userAnimViewport.padRight !== void 0)
                viewport.padRight = userAnimViewport.padRight;
            if (userAnimViewport.padTop !== void 0)
                viewport.padTop = userAnimViewport.padTop;
            if (userAnimViewport.padBottom !== void 0)
                viewport.padBottom = userAnimViewport.padBottom;
        }
        // Translate percentage padding to world units.
        viewport.padLeft = this.percentageToWorldUnit(viewport.width, viewport.padLeft);
        viewport.padRight = this.percentageToWorldUnit(viewport.width, viewport.padRight);
        viewport.padBottom = this.percentageToWorldUnit(viewport.height, viewport.padBottom);
        viewport.padTop = this.percentageToWorldUnit(viewport.height, viewport.padTop);
        this.viewportTransitionStart = performance.now();
        return animation;
    }
    percentageToWorldUnit(size, percentageOrAbsolute) {
        if (typeof percentageOrAbsolute === "string")
            return size * parseFloat(percentageOrAbsolute.substr(0, percentageOrAbsolute.length - 1)) / 100;
        return percentageOrAbsolute;
    }
    calculateAnimationViewport(animation, viewport) {
        this.skeleton.setToSetupPose();
        let steps = 100, stepTime = animation.duration ? animation.duration / steps : 0, time = 0;
        let minX = 100000000, maxX = -100000000, minY = 100000000, maxY = -100000000;
        let offset = new Vector2(), size = new Vector2();
        const tempArray = new Array(2);
        for (let i = 0; i < steps; i++, time += stepTime) {
            animation.apply(this.skeleton, time, time, false, [], 1, MixBlend.setup, MixDirection.mixIn);
            this.skeleton.updateWorldTransform(Physics.update);
            this.skeleton.getBounds(offset, size, tempArray, this.sceneRenderer.skeletonRenderer.getSkeletonClipping());
            if (!isNaN(offset.x) && !isNaN(offset.y) && !isNaN(size.x) && !isNaN(size.y)) {
                minX = Math.min(offset.x, minX);
                maxX = Math.max(offset.x + size.x, maxX);
                minY = Math.min(offset.y, minY);
                maxY = Math.max(offset.y + size.y, maxY);
            }
            else
                this.showError("Animation bounds are invalid: " + animation.name);
        }
        viewport.x = minX;
        viewport.y = minY;
        viewport.width = maxX - minX;
        viewport.height = maxY - minY;
    }
    drawFrame(requestNextFrame = true) {
        try {
            if (this.error)
                return;
            if (this.disposed)
                return;
            if (requestNextFrame && !this.stopRequestAnimationFrame)
                requestAnimationFrame(() => this.drawFrame());
            let doc = document;
            let isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
            let bg = isFullscreen ? this.bgFullscreen : this.bg;
            this.time.update();
            let delta = this.time.delta;
            // Load the skeleton if the assets are ready.
            let loading = !this.assetManager.isLoadingComplete();
            if (!this.skeleton && !loading)
                this.loadSkeleton();
            let skeleton = this.skeleton;
            let config = this.config;
            if (skeleton) {
                // Resize the canvas.
                let renderer = this.sceneRenderer;
                renderer.resize(ResizeMode.Expand);
                let playDelta = this.paused ? 0 : delta * this.speed;
                if (config.frame)
                    config.frame(this, playDelta);
                // Update animation time and pose the skeleton.
                if (!this.paused) {
                    skeleton.update(playDelta);
                    this.animationState.update(playDelta);
                    this.animationState.apply(skeleton);
                    if (config.updateWorldTransform)
                        config.updateWorldTransform(this, playDelta);
                    else
                        skeleton.updateWorldTransform(Physics.update);
                    if (config.showControls) {
                        this.playTime += playDelta;
                        let entry = this.animationState.getCurrent(0);
                        if (entry) {
                            let duration = entry.animation.duration;
                            while (this.playTime >= duration && duration != 0)
                                this.playTime -= duration;
                            this.playTime = Math.max(0, Math.min(this.playTime, duration));
                            this.timelineSlider.setValue(this.playTime / duration);
                        }
                    }
                }
                // Determine the viewport.
                let viewport = this.viewport;
                viewport.x = this.currentViewport.x - this.currentViewport.padLeft;
                viewport.y = this.currentViewport.y - this.currentViewport.padBottom;
                viewport.width = this.currentViewport.width + this.currentViewport.padLeft + this.currentViewport.padRight;
                viewport.height = this.currentViewport.height + this.currentViewport.padBottom + this.currentViewport.padTop;
                if (this.previousViewport) {
                    let transitionAlpha = (performance.now() - this.viewportTransitionStart) / 1000 / config.viewport.transitionTime;
                    if (transitionAlpha < 1) {
                        let x = this.previousViewport.x - this.previousViewport.padLeft;
                        let y = this.previousViewport.y - this.previousViewport.padBottom;
                        let width = this.previousViewport.width + this.previousViewport.padLeft + this.previousViewport.padRight;
                        let height = this.previousViewport.height + this.previousViewport.padBottom + this.previousViewport.padTop;
                        viewport.x = x + (viewport.x - x) * transitionAlpha;
                        viewport.y = y + (viewport.y - y) * transitionAlpha;
                        viewport.width = width + (viewport.width - width) * transitionAlpha;
                        viewport.height = height + (viewport.height - height) * transitionAlpha;
                    }
                }
                renderer.camera.zoom = this.canvas.height / this.canvas.width > viewport.height / viewport.width
                    ? viewport.width / this.canvas.width : viewport.height / this.canvas.height;
                renderer.camera.position.x = viewport.x + viewport.width / 2;
                renderer.camera.position.y = viewport.y + viewport.height / 2;
                // Clear the screen.
                let gl = this.context.gl;
                gl.clearColor(bg.r, bg.g, bg.b, bg.a);
                gl.clear(gl.COLOR_BUFFER_BIT);
                if (config.update)
                    config.update(this, playDelta);
                renderer.begin();
                // Draw the background image.
                let bgImage = config.backgroundImage;
                if (bgImage) {
                    let texture = this.assetManager.require(bgImage.url);
                    if (bgImage.x !== void 0 && bgImage.y !== void 0 && bgImage.width && bgImage.height)
                        renderer.drawTexture(texture, bgImage.x, bgImage.y, bgImage.width, bgImage.height);
                    else
                        renderer.drawTexture(texture, viewport.x, viewport.y, viewport.width, viewport.height);
                }
                // Draw the skeleton and debug output.
                renderer.drawSkeleton(skeleton, config.premultipliedAlpha);
                if (Number(renderer.skeletonDebugRenderer.drawBones = config.debug.bones ?? false)
                    + Number(renderer.skeletonDebugRenderer.drawBoundingBoxes = config.debug.bounds ?? false)
                    + Number(renderer.skeletonDebugRenderer.drawClipping = config.debug.clipping ?? false)
                    + Number(renderer.skeletonDebugRenderer.drawMeshHull = config.debug.hulls ?? false)
                    + Number(renderer.skeletonDebugRenderer.drawPaths = config.debug.paths ?? false)
                    + Number(renderer.skeletonDebugRenderer.drawRegionAttachments = config.debug.regions ?? false)
                    + Number(renderer.skeletonDebugRenderer.drawMeshTriangles = config.debug.meshes ?? false) > 0) {
                    renderer.drawSkeletonDebug(skeleton, config.premultipliedAlpha);
                }
                // Draw the control bones.
                let controlBones = config.controlBones;
                if (controlBones.length) {
                    let selectedBones = this.selectedBones;
                    gl.lineWidth(2);
                    for (let i = 0; i < controlBones.length; i++) {
                        let bone = skeleton.findBone(controlBones[i]);
                        if (!bone)
                            continue;
                        let colorInner = selectedBones[i] ? BONE_INNER_OVER : BONE_INNER;
                        let colorOuter = selectedBones[i] ? BONE_OUTER_OVER : BONE_OUTER;
                        renderer.circle(true, skeleton.x + bone.worldX, skeleton.y + bone.worldY, 20, colorInner);
                        renderer.circle(false, skeleton.x + bone.worldX, skeleton.y + bone.worldY, 20, colorOuter);
                    }
                }
                // Draw the viewport bounds.
                if (config.viewport.debugRender) {
                    gl.lineWidth(1);
                    renderer.rect(false, this.currentViewport.x, this.currentViewport.y, this.currentViewport.width, this.currentViewport.height, Color.GREEN);
                    renderer.rect(false, viewport.x, viewport.y, viewport.width, viewport.height, Color.RED);
                }
                renderer.end();
                if (config.draw)
                    config.draw(this, playDelta);
            }
            // Draw the loading screen.
            if (config.showLoading) {
                this.loadingScreen.backgroundColor.setFromColor(bg);
                this.loadingScreen.draw(!loading);
            }
            if (loading && config.loading)
                config.loading(this, delta);
        }
        catch (e) {
            this.showError(`Error: Unable to render skeleton.\n${e.message}`, e);
        }
    }
    startRendering() {
        this.stopRequestAnimationFrame = false;
        requestAnimationFrame(() => this.drawFrame());
    }
    stopRendering() {
        this.stopRequestAnimationFrame = true;
    }
    hidePopup(id) {
        return this.popup != null && this.popup.hide(id);
    }
    showSpeedDialog(speedButton) {
        let id = "speed";
        if (this.hidePopup(id))
            return;
        let popup = new Popup(id, speedButton, this, this.playerControls, /*html*/ `
<div class="spine-player-popup-title">Speed</div>
<hr>
<div class="spine-player-row" style="align-items:center;padding:8px">
<div class="spine-player-column">
	<div class="spine-player-speed-slider" style="margin-bottom:4px"></div>
	<div class="spine-player-row" style="justify-content:space-between"><div>0.1x</div><div>1x</div><div>2x</div></div>
</div>
</div>`);
        let slider = new Slider(2, 0.1, true);
        findWithClass(popup.dom, "spine-player-speed-slider").appendChild(slider.create());
        slider.setValue(this.speed / 2);
        slider.change = (percentage) => this.speed = percentage * 2;
        popup.show();
    }
    showAnimationsDialog(animationsButton) {
        let id = "animations";
        if (this.hidePopup(id))
            return;
        if (!this.skeleton || !this.skeleton.data.animations.length)
            return;
        let popup = new Popup(id, animationsButton, this, this.playerControls, 
        /*html*/ `<div class="spine-player-popup-title">Animations</div><hr><ul class="spine-player-list"></ul>`);
        let rows = findWithClass(popup.dom, "spine-player-list");
        this.skeleton.data.animations.forEach((animation) => {
            // Skip animations not whitelisted if a whitelist was given.
            if (this.config.animations && this.config.animations.indexOf(animation.name) < 0)
                return;
            let row = createElement(
            /*html*/ `<li class="spine-player-list-item selectable"><div class="selectable-circle"></div><div class="selectable-text"></div></li>`);
            if (animation.name == this.config.animation)
                row.classList.add("selected");
            findWithClass(row, "selectable-text").innerText = animation.name;
            rows.appendChild(row);
            row.onclick = () => {
                removeClass(rows.children, "selected");
                row.classList.add("selected");
                this.config.animation = animation.name;
                this.playTime = 0;
                this.setAnimation(animation.name);
                this.play();
            };
        });
        popup.show();
    }
    showSkinsDialog(skinButton) {
        let id = "skins";
        if (this.hidePopup(id))
            return;
        if (!this.skeleton || !this.skeleton.data.animations.length)
            return;
        let popup = new Popup(id, skinButton, this, this.playerControls, 
        /*html*/ `<div class="spine-player-popup-title">Skins</div><hr><ul class="spine-player-list"></ul>`);
        let rows = findWithClass(popup.dom, "spine-player-list");
        this.skeleton.data.skins.forEach((skin) => {
            // Skip skins not whitelisted if a whitelist was given.
            if (this.config.skins && this.config.skins.indexOf(skin.name) < 0)
                return;
            let row = createElement(/*html*/ `<li class="spine-player-list-item selectable"><div class="selectable-circle"></div><div class="selectable-text"></div></li>`);
            if (skin.name == this.config.skin)
                row.classList.add("selected");
            findWithClass(row, "selectable-text").innerText = skin.name;
            rows.appendChild(row);
            row.onclick = () => {
                removeClass(rows.children, "selected");
                row.classList.add("selected");
                this.config.skin = skin.name;
                this.skeleton.setSkinByName(this.config.skin);
                this.skeleton.setSlotsToSetupPose();
            };
        });
        popup.show();
    }
    showSettingsDialog(settingsButton) {
        let id = "settings";
        if (this.hidePopup(id))
            return;
        if (!this.skeleton || !this.skeleton.data.animations.length)
            return;
        let popup = new Popup(id, settingsButton, this, this.playerControls, /*html*/ `<div class="spine-player-popup-title">Debug</div><hr><ul class="spine-player-list"></li>`);
        let rows = findWithClass(popup.dom, "spine-player-list");
        let makeItem = (label, name) => {
            let row = createElement(/*html*/ `<li class="spine-player-list-item"></li>`);
            let s = new Switch(label);
            row.appendChild(s.create());
            let debug = this.config.debug;
            s.setEnabled(debug[name]);
            s.change = (value) => debug[name] = value;
            rows.appendChild(row);
        };
        makeItem("Bones", "bones");
        makeItem("Regions", "regions");
        makeItem("Meshes", "meshes");
        makeItem("Bounds", "bounds");
        makeItem("Paths", "paths");
        makeItem("Clipping", "clipping");
        makeItem("Points", "points");
        makeItem("Hulls", "hulls");
        popup.show();
    }
    showError(message, error) {
        if (this.error) {
            if (error)
                throw error; // Don't lose error if showError throws, is caught, and showError is called again.
        }
        else {
            this.error = true;
            this.dom.appendChild(createElement(
            /*html*/ `<div class="spine-player-error" style="background:#000;color:#fff;position:absolute;top:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;overflow:auto;z-index:999">`
                + message.replace("\n", "<br><br>") + `</div>`));
            if (this.config.error)
                this.config.error(this, message);
            throw (error ? error : new Error(message));
            console.log(error);
        }
    }
}
class Popup {
    id;
    button;
    player;
    dom;
    className;
    windowClickListener;
    constructor(id, button, player, parent, htmlContent) {
        this.id = id;
        this.button = button;
        this.player = player;
        this.dom = createElement(/*html*/ `<div class="spine-player-popup spine-player-hidden"></div>`);
        this.dom.innerHTML = htmlContent;
        parent.appendChild(this.dom);
        this.className = "spine-player-button-icon-" + id + "-selected";
    }
    dispose() {
    }
    hide(id) {
        this.dom.remove();
        this.button.classList.remove(this.className);
        if (this.id == id) {
            this.player.popup = null;
            return true;
        }
        return false;
    }
    show() {
        this.player.popup = this;
        this.button.classList.add(this.className);
        this.dom.classList.remove("spine-player-hidden");
        // Make sure the popup isn't bigger than the player.
        let dismissed = false;
        let resize = () => {
            if (!dismissed)
                requestAnimationFrame(resize);
            let playerDom = this.player.dom;
            let bottomOffset = Math.abs(playerDom.getBoundingClientRect().bottom - playerDom.getBoundingClientRect().bottom);
            let rightOffset = Math.abs(playerDom.getBoundingClientRect().right - playerDom.getBoundingClientRect().right);
            this.dom.style.maxHeight = (playerDom.clientHeight - bottomOffset - rightOffset) + "px";
        };
        requestAnimationFrame(resize);
        // Dismiss when clicking somewhere outside the popup.
        let justClicked = true;
        let windowClickListener = (event) => {
            if (justClicked || this.player.popup != this) {
                justClicked = false;
                return;
            }
            if (!this.dom.contains(event.target)) {
                this.dom.remove();
                window.removeEventListener("click", windowClickListener);
                this.button.classList.remove(this.className);
                this.player.popup = null;
                dismissed = true;
            }
        };
        this.player.addEventListener(window, "click", windowClickListener);
    }
}
class Switch {
    text;
    switch = null;
    enabled = false;
    change = () => { };
    constructor(text) {
        this.text = text;
    }
    create() {
        this.switch = createElement(/*html*/ `
<div class="spine-player-switch">
	<span class="spine-player-switch-text">${this.text}</span>
	<div class="spine-player-switch-knob-area">
		<div class="spine-player-switch-knob"></div>
	</div>
</div>`);
        this.switch.addEventListener("click", () => {
            this.setEnabled(!this.enabled);
            if (this.change)
                this.change(this.enabled);
        });
        return this.switch;
    }
    setEnabled(enabled) {
        if (enabled)
            this.switch?.classList.add("active");
        else
            this.switch?.classList.remove("active");
        this.enabled = enabled;
    }
    isEnabled() {
        return this.enabled;
    }
}
class Slider {
    snaps;
    snapPercentage;
    big;
    slider = null;
    value = null;
    knob = null;
    change = () => { };
    constructor(snaps = 0, snapPercentage = 0.1, big = false) {
        this.snaps = snaps;
        this.snapPercentage = snapPercentage;
        this.big = big;
    }
    create() {
        this.slider = createElement(/*html*/ `
<div class="spine-player-slider ${this.big ? "big" : ""}">
	<div class="spine-player-slider-value"></div>
	<!--<div class="spine-player-slider-knob"></div>-->
</div>`);
        this.value = findWithClass(this.slider, "spine-player-slider-value");
        // this.knob = findWithClass(this.slider, "spine-player-slider-knob");
        this.setValue(0);
        let dragging = false;
        new Input(this.slider).addListener({
            down: (x, y) => {
                dragging = true;
                this.value?.classList.add("hovering");
            },
            up: (x, y) => {
                dragging = false;
                if (this.change)
                    this.change(this.setValue(x / this.slider.clientWidth));
                this.value?.classList.remove("hovering");
            },
            moved: (x, y) => {
                if (dragging && this.change)
                    this.change(this.setValue(x / this.slider.clientWidth));
            },
            dragged: (x, y) => {
                if (this.change)
                    this.change(this.setValue(x / this.slider.clientWidth));
            }
        });
        return this.slider;
    }
    setValue(percentage) {
        percentage = Math.max(0, Math.min(1, percentage));
        if (this.snaps) {
            let snap = 1 / this.snaps;
            let modulo = percentage % snap;
            // floor
            if (modulo < snap * this.snapPercentage)
                percentage = percentage - modulo;
            else if (modulo > snap - snap * this.snapPercentage)
                percentage = percentage - modulo + snap;
            percentage = Math.max(0, Math.min(1, percentage));
        }
        this.value.style.width = "" + (percentage * 100) + "%";
        // this.knob.style.left = "" + (-8 + percentage * this.slider.clientWidth) + "px";
        return percentage;
    }
}
function findWithClass(element, className) {
    return element.getElementsByClassName(className)[0];
}
function createElement(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    return div.children[0];
}
function removeClass(elements, clazz) {
    for (let i = 0; i < elements.length; i++)
        elements[i].classList.remove(clazz);
}
function toString(object) {
    return JSON.stringify(object)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&#34;")
        .replace(/'/g, "&#39;");
}
const BONE_INNER_OVER = new Color(0.478, 0, 0, 0.25);
const BONE_OUTER_OVER = new Color(1, 1, 1, 1);
const BONE_INNER = new Color(0.478, 0, 0, 0.5);
const BONE_OUTER = new Color(1, 0, 0, 0.8);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGxheWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1BsYXllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFFL0UsT0FBTyxFQUFhLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBUSxLQUFLLEVBQTBCLFNBQVMsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFnQixZQUFZLEVBQTJCLGFBQWEsRUFBRSxVQUFVLEVBQWMsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDblUsT0FBTyxFQUFFLFlBQVksRUFBYSxLQUFLLEVBQUUsYUFBYSxFQUFFLDRCQUE0QixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUF3Sy9KLE1BQU0sT0FBTyxXQUFXO0lBMEM0QjtJQXpDNUMsTUFBTSxDQUFjO0lBQ3BCLEdBQUcsQ0FBYztJQUNqQixNQUFNLEdBQTZCLElBQUksQ0FBQztJQUN4QyxPQUFPLEdBQXdDLElBQUksQ0FBQztJQUNwRCxhQUFhLEdBQXlCLElBQUksQ0FBQztJQUMzQyxhQUFhLEdBQXlCLElBQUksQ0FBQztJQUMzQyxZQUFZLEdBQXdCLElBQUksQ0FBQztJQUN6QyxFQUFFLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUNqQixZQUFZLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUUxQixjQUFjLEdBQXVCLElBQUksQ0FBQztJQUMxQyxjQUFjLEdBQWtCLElBQUksQ0FBQztJQUNyQyxVQUFVLEdBQXVCLElBQUksQ0FBQztJQUN0QyxVQUFVLEdBQXVCLElBQUksQ0FBQztJQUN0QyxlQUFlLEdBQXVCLElBQUksQ0FBQztJQUUzQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ2IsYUFBYSxHQUFvQixFQUFFLENBQUM7SUFDcEMsUUFBUSxHQUFRLENB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LENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBTcGluZSBSdW50aW1lcyBMaWNlbnNlIEFncmVlbWVudFxuICogTGFzdCB1cGRhdGVkIEFwcmlsIDUsIDIwMjUuIFJlcGxhY2VzIGFsbCBwcmlvciB2ZXJzaW9ucy5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAyNSwgRXNvdGVyaWMgU29mdHdhcmUgTExDXG4gKlxuICogSW50ZWdyYXRpb24gb2YgdGhlIFNwaW5lIFJ1bnRpbWVzIGludG8gc29mdHdhcmUgb3Igb3RoZXJ3aXNlIGNyZWF0aW5nXG4gKiBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyBpcyBwZXJtaXR0ZWQgdW5kZXIgdGhlIHRlcm1zIGFuZFxuICogY29uZGl0aW9ucyBvZiBTZWN0aW9uIDIgb2YgdGhlIFNwaW5lIEVkaXRvciBMaWNlbnNlIEFncmVlbWVudDpcbiAqIGh0dHA6Ly9lc290ZXJpY3NvZnR3YXJlLmNvbS9zcGluZS1lZGl0b3ItbGljZW5zZVxuICpcbiAqIE90aGVyd2lzZSwgaXQgaXMgcGVybWl0dGVkIHRvIGludGVncmF0ZSB0aGUgU3BpbmUgUnVudGltZXMgaW50byBzb2Z0d2FyZVxuICogb3Igb3RoZXJ3aXNlIGNyZWF0ZSBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyAoY29sbGVjdGl2ZWx5LFxuICogXCJQcm9kdWN0c1wiKSwgcHJvdmlkZWQgdGhhdCBlYWNoIHVzZXIgb2YgdGhlIFByb2R1Y3RzIG11c3Qgb2J0YWluIHRoZWlyIG93blxuICogU3BpbmUgRWRpdG9yIGxpY2Vuc2UgYW5kIHJlZGlzdHJpYnV0aW9uIG9mIHRoZSBQcm9kdWN0cyBpbiBhbnkgZm9ybSBtdXN0XG4gKiBpbmNsdWRlIHRoaXMgbGljZW5zZSBhbmQgY29weXJpZ2h0IG5vdGljZS5cbiAqXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMgQVJFIFBST1ZJREVEIEJZIEVTT1RFUklDIFNPRlRXQVJFIExMQyBcIkFTIElTXCIgQU5EIEFOWVxuICogRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRFxuICogV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRVxuICogRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgRVNPVEVSSUMgU09GVFdBUkUgTExDIEJFIExJQUJMRSBGT1IgQU5ZXG4gKiBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICogKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTLFxuICogQlVTSU5FU1MgSU5URVJSVVBUSU9OLCBPUiBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUykgSE9XRVZFUiBDQVVTRUQgQU5EXG4gKiBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICogKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IEFuaW1hdGlvbiwgQW5pbWF0aW9uU3RhdGUsIEFuaW1hdGlvblN0YXRlRGF0YSwgQXRsYXNBdHRhY2htZW50TG9hZGVyLCBCb25lLCBDb2xvciwgRGlzcG9zYWJsZSwgRG93bmxvYWRlciwgTWF0aFV0aWxzLCBNaXhCbGVuZCwgTWl4RGlyZWN0aW9uLCBQaHlzaWNzLCBTa2VsZXRvbiwgU2tlbGV0b25CaW5hcnksIFNrZWxldG9uRGF0YSwgU2tlbGV0b25Kc29uLCBTdHJpbmdNYXAsIFRleHR1cmVBdGxhcywgVGV4dHVyZUZpbHRlciwgVGltZUtlZXBlciwgVHJhY2tFbnRyeSwgVmVjdG9yMiB9IGZyb20gXCJAZXNvdGVyaWNzb2Z0d2FyZS9zcGluZS1jb3JlXCJcbmltcG9ydCB7IEFzc2V0TWFuYWdlciwgR0xUZXh0dXJlLCBJbnB1dCwgTG9hZGluZ1NjcmVlbiwgTWFuYWdlZFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgUmVzaXplTW9kZSwgU2NlbmVSZW5kZXJlciwgVmVjdG9yMyB9IGZyb20gXCJAZXNvdGVyaWNzb2Z0d2FyZS9zcGluZS13ZWJnbFwiXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVQbGF5ZXJDb25maWcge1xuXHQvKiBUaGUgVVJMIG9mIHRoZSBza2VsZXRvbiBKU09OICguanNvbikgb3IgYmluYXJ5ICguc2tlbCkgZmlsZSAqL1xuXHRza2VsZXRvbj86IHN0cmluZztcblxuXHQvKiBAZGVwcmVjYXRlZCBVc2Ugc2tlbGV0b24gaW5zdGVhZC4gVGhlIFVSTCBvZiB0aGUgc2tlbGV0b24gSlNPTiBmaWxlICguanNvbikuIFVuZGVmaW5lZCBpZiBiaW5hcnlVcmwgaXMgZ2l2ZW4uICovXG5cdGpzb25Vcmw/OiBzdHJpbmdcblxuXHQvKiBPcHRpb25hbDogVGhlIG5hbWUgb2YgYSBmaWVsZCBpbiB0aGUgSlNPTiB0aGF0IGhvbGRzIHRoZSBza2VsZXRvbiBkYXRhLiBEZWZhdWx0OiBub25lICovXG5cdGpzb25GaWVsZD86IHN0cmluZ1xuXG5cdC8qIEBkZXByZWNhdGVkIFVzZSBza2VsZXRvbiBpbnN0ZWFkLiBUaGUgVVJMIG9mIHRoZSBza2VsZXRvbiBiaW5hcnkgZmlsZSAoLnNrZWwpLiBVbmRlZmluZWQgaWYganNvblVybCBpcyBnaXZlbi4gKi9cblx0YmluYXJ5VXJsPzogc3RyaW5nXG5cblx0LyogVGhlIHNjYWxlIHdoZW4gbG9hZGluZyB0aGUgc2tlbGV0b24gZGF0YS4gRGVmYXVsdDogMSAqL1xuXHRzY2FsZT86IG51bWJlclxuXG5cdC8qIEBkZXByZWNhdGVkIFVzZSBhdGxhcyBpbnN0ZWFkLiBUaGUgVVJMIG9mIHRoZSBza2VsZXRvbiBhdGxhcyBmaWxlICguYXRsYXMpLiBBdGxhcyBwYWdlIGltYWdlcyBhcmUgYXV0b21hdGljYWxseSByZXNvbHZlZC4gKi9cblx0YXRsYXNVcmw/OiBzdHJpbmdcblxuXHQvKiBUaGUgVVJMIG9mIHRoZSBza2VsZXRvbiBhdGxhcyBmaWxlICguYXRsYXMpLiBBdGxhcyBwYWdlIGltYWdlcyBhcmUgYXV0b21hdGljYWxseSByZXNvbHZlZC4gKi9cblx0YXRsYXM/OiBzdHJpbmc7XG5cblx0LyogUmF3IGRhdGEgVVJJcywgbWFwcGluZyBhIHBhdGggdG8gYmFzZTY0IGVuY29kZWQgcmF3IGRhdGEuIFdoZW4gcGxheWVyJ3MgYXNzZXQgbWFuYWdlciByZXNvbHZlcyB0aGUgc2tlbGV0b24sXG5cdCAgIGF0bGFzLCBvciB0aGUgaW1hZ2UgcGF0aHMgcmVmZXJlbmNlZCBpbiB0aGUgYXRsYXMsIGl0IHdpbGwgZmlyc3QgbG9vayBmb3IgdGhhdCBwYXRoIGluIHRoZSByYXcgZGF0YSBVUklzLiBUaGlzXG5cdCAgIGFsbG93cyBlbWJlZGRpbmcgYXNzZXRzIGRpcmVjdGx5IGluIEhUTUwvSlMuIERlZmF1bHQ6IG5vbmUgKi9cblx0cmF3RGF0YVVSSXM/OiBTdHJpbmdNYXA8c3RyaW5nPlxuXG5cdC8qIE9wdGlvbmFsOiBUaGUgbmFtZSBvZiB0aGUgYW5pbWF0aW9uIHRvIGJlIHBsYXllZC4gRGVmYXVsdDogZW1wdHkgYW5pbWF0aW9uICovXG5cdGFuaW1hdGlvbj86IHN0cmluZ1xuXG5cdC8qIE9wdGlvbmFsOiBMaXN0IG9mIGFuaW1hdGlvbiBuYW1lcyBmcm9tIHdoaWNoIHRoZSB1c2VyIGNhbiBjaG9vc2UuIERlZmF1bHQ6IGFsbCBhbmltYXRpb25zICovXG5cdGFuaW1hdGlvbnM/OiBzdHJpbmdbXVxuXG5cdC8qIE9wdGlvbmFsOiBUaGUgZGVmYXVsdCBtaXggdGltZSB1c2VkIHRvIHN3aXRjaCBiZXR3ZWVuIHR3byBhbmltYXRpb25zLiBEZWZhdWx0OiAwLjI1ICovXG5cdGRlZmF1bHRNaXg/OiBudW1iZXJcblxuXHQvKiBPcHRpb25hbDogVGhlIG5hbWUgb2YgdGhlIHNraW4gdG8gYmUgc2V0LiBEZWZhdWx0OiB0aGUgZGVmYXVsdCBza2luICovXG5cdHNraW4/OiBzdHJpbmdcblxuXHQvKiBPcHRpb25hbDogTGlzdCBvZiBza2luIG5hbWVzIGZyb20gd2hpY2ggdGhlIHVzZXIgY2FuIGNob29zZS4gRGVmYXVsdDogYWxsIHNraW5zICovXG5cdHNraW5zPzogc3RyaW5nW11cblxuXHQvKiBPcHRpb25hbDogV2hldGhlciB0aGUgc2tlbGV0b24ncyBhdGxhcyBpbWFnZXMgdXNlIHByZW11bHRpcGxpZWQgYWxwaGEuIERlZmF1bHQ6IHRydWUgKi9cblx0cHJlbXVsdGlwbGllZEFscGhhPzogYm9vbGVhblxuXG5cdC8qIE9wdGlvbmFsOiBXaGV0aGVyIHRvIHNob3cgdGhlIHBsYXllciBjb250cm9scy4gV2hlbiBmYWxzZSwgbm8gZXh0ZXJuYWwgQ1NTIGZpbGUgaXMgbmVlZGVkLiBEZWZhdWx0OiB0cnVlICovXG5cdHNob3dDb250cm9scz86IGJvb2xlYW5cblxuXHQvKiBPcHRpb25hbDogV2hldGhlciB0byBzaG93IHRoZSBsb2FkaW5nIGFuaW1hdGlvbi4gRGVmYXVsdDogdHJ1ZSAqL1xuXHRzaG93TG9hZGluZz86IGJvb2xlYW5cblxuXHQvKiBPcHRpb25hbDogV2hpY2ggZGVidWdnaW5nIHZpc3VhbGl6YXRpb25zIGFyZSBzaG93bi4gRGVmYXVsdDogbm9uZSAqL1xuXHRkZWJ1Zz86IHtcblx0XHRib25lczogYm9vbGVhblxuXHRcdHJlZ2lvbnM6IGJvb2xlYW5cblx0XHRtZXNoZXM6IGJvb2xlYW5cblx0XHRib3VuZHM6IGJvb2xlYW5cblx0XHRwYXRoczogYm9vbGVhblxuXHRcdGNsaXBwaW5nOiBib29sZWFuXG5cdFx0cG9pbnRzOiBib29sZWFuXG5cdFx0aHVsbHM6IGJvb2xlYW5cblx0fVxuXG5cdC8qIE9wdGlvbmFsOiBUaGUgcG9zaXRpb24gYW5kIHNpemUgb2YgdGhlIHZpZXdwb3J0IGluIHRoZSBza2VsZXRvbidzIHdvcmxkIGNvb3JkaW5hdGVzLiBEZWZhdWx0OiB0aGUgYm91bmRpbmcgYm94IHRoYXQgZml0c1xuXHQgIHRoZSBjdXJyZW50IGFuaW1hdGlvbiwgMTAlIHBhZGRpbmcsIDAuMjUgdHJhbnNpdGlvbiB0aW1lICovXG5cdHZpZXdwb3J0Pzoge1xuXHRcdC8qIE9wdGlvbmFsOiBUaGUgcG9zaXRpb24gYW5kIHNpemUgb2YgdGhlIHZpZXdwb3J0IGluIHRoZSBza2VsZXRvbidzIHdvcmxkIGNvb3JkaW5hdGVzLiBEZWZhdWx0OiB0aGUgYm91bmRpbmcgYm94IHRoYXRcblx0XHQgICBmaXRzIHRoZSBjdXJyZW50IGFuaW1hdGlvbiAqL1xuXHRcdHg/OiBudW1iZXJcblx0XHR5PzogbnVtYmVyXG5cdFx0d2lkdGg/OiBudW1iZXJcblx0XHRoZWlnaHQ/OiBudW1iZXJcblxuXHRcdC8qIE9wdGlvbmFsOiBQYWRkaW5nIGFyb3VuZCB0aGUgdmlld3BvcnQgc2l6ZSwgZ2l2ZW4gYXMgYSBudW1iZXIgb3IgcGVyY2VudGFnZSAoZWcgXCIyNSVcIikuIERlZmF1bHQ6IDEwJSAqL1xuXHRcdHBhZExlZnQ/OiBzdHJpbmcgfCBudW1iZXJcblx0XHRwYWRSaWdodD86IHN0cmluZyB8IG51bWJlclxuXHRcdHBhZFRvcD86IHN0cmluZyB8IG51bWJlclxuXHRcdHBhZEJvdHRvbT86IHN0cmluZyB8IG51bWJlclxuXG5cdFx0LyogT3B0aW9uYWw6IFdoZXRoZXIgdG8gZHJhdyBsaW5lcyBzaG93aW5nIHRoZSB2aWV3cG9ydCBib3VuZHMuIERlZmF1bHQ6IGZhbHNlICovXG5cdFx0ZGVidWdSZW5kZXI/OiBib29sZWFuLFxuXG5cdFx0LyogT3B0aW9uYWw6IFdoZW4gdGhlIGN1cnJlbnQgdmlld3BvcnQgY2hhbmdlcywgdGhlIHRpbWUgdG8gYW5pbWF0ZSB0byB0aGUgbmV3IHZpZXdwb3J0LiBEZWZhdWx0OiAwLjI1ICovXG5cdFx0dHJhbnNpdGlvblRpbWU/OiBudW1iZXJcblxuXHRcdC8qIE9wdGlvbmFsOiBWaWV3cG9ydHMgZm9yIHNwZWNpZmljIGFuaW1hdGlvbnMuIERlZmF1bHQ6IG5vbmUgKi9cblx0XHRhbmltYXRpb25zPzogU3RyaW5nTWFwPFZpZXdwb3J0PlxuXHR9XG5cblx0LyogT3B0aW9uYWw6IFdoZXRoZXIgdGhlIGNhbnZhcyBpcyB0cmFuc3BhcmVudCwgYWxsb3dpbmcgdGhlIHdlYiBwYWdlIGJlaGluZCB0aGUgY2FudmFzIHRvIHNob3cgdGhyb3VnaCB3aGVuXG5cdCAgIGJhY2tncm91bmRDb2xvciBhbHBoYSBpcyA8IGZmLiBEZWZhdWx0OiBmYWxzZSAqL1xuXHRhbHBoYT86IGJvb2xlYW5cblxuXHQvKiBPcHRpb25hbDogV2hldGhlciB0byBwcmVzZXJ2ZSB0aGUgZHJhd2luZyBidWZmZXIuIFRoaXMgaXMgbmVlZGVkIGlmIHlvdSB3YW50IHRvIHRha2UgYSBzY3JlZW5zaG90IHZpYSBjYW52YXMuZ2V0RGF0YVVSTCgpLCBEZWZhdWx0OiBmYWxzZSAqL1xuXHRwcmVzZXJ2ZURyYXdpbmdCdWZmZXI6IGJvb2xlYW5cblxuXHQvKiBPcHRpb25hbDogVGhlIGNhbnZhcyBiYWNrZ3JvdW5kIGNvbG9yLCBnaXZlbiBpbiB0aGUgZm9ybWF0ICNycmdnYmIgb3IgI3JyZ2diYmFhLiBEZWZhdWx0OiAjMDAwMDAwZmYgKGJsYWNrKSBvciB3aGVuXG5cdCAgIGFscGhhIGlzIHRydWUgIzAwMDAwMDAwICh0cmFuc3BhcmVudCkgKi9cblx0YmFja2dyb3VuZENvbG9yPzogc3RyaW5nXG5cblx0LyogT3B0aW9uYWw6IFRoZSBiYWNrZ3JvdW5kIGNvbG9yIHVzZWQgaW4gZnVsbHNjcmVlbiBtb2RlLCBnaXZlbiBpbiB0aGUgZm9ybWF0ICNycmdnYmIgb3IgI3JyZ2diYmFhLiBEZWZhdWx0OiBiYWNrZ3JvdW5kQ29sb3IgKi9cblx0ZnVsbFNjcmVlbkJhY2tncm91bmRDb2xvcj86IHN0cmluZ1xuXG5cdC8qIE9wdGlvbmFsOiBBbiBpbWFnZSB0byBkcmF3IGJlaGluZCB0aGUgc2tlbGV0b24uIERlZmF1bHQ6IG5vbmUgKi9cblx0YmFja2dyb3VuZEltYWdlPzoge1xuXHRcdHVybDogc3RyaW5nXG5cblx0XHQvKiBPcHRpb25hbDogVGhlIHBvc2l0aW9uIGFuZCBzaXplIG9mIHRoZSBiYWNrZ3JvdW5kIGltYWdlIGluIHRoZSBza2VsZXRvbidzIHdvcmxkIGNvb3JkaW5hdGVzLiBEZWZhdWx0OiBmaWxscyB0aGUgdmlld3BvcnQgKi9cblx0XHR4PzogbnVtYmVyXG5cdFx0eT86IG51bWJlclxuXHRcdHdpZHRoPzogbnVtYmVyXG5cdFx0aGVpZ2h0PzogbnVtYmVyXG5cdH1cblxuXHQvKiBPcHRpb25hbDogV2hldGhlciBtaXBtYXBwaW5nIGFuZCBhbmlzb3Ryb3BpYyBmaWx0ZXJpbmcgYXJlIHVzZWQgZm9yIGhpZ2hlc3QgcXVhbGl0eSBzY2FsaW5nIHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2UgdGhlXG5cdCAgIGZpbHRlciBzZXR0aW5ncyBmcm9tIHRoZSB0ZXh0dXJlIGF0bGFzIGFyZSB1c2VkLiBEZWZhdWx0OiB0cnVlICovXG5cdG1pcG1hcHM/OiBib29sZWFuXG5cblx0LyogT3B0aW9uYWw6IFdoZXRoZXIgdGhlIHBsYXllciByZXNwb25kcyB0byB1c2VyIGNsaWNrL3RvdWNoIChwbGF5L3BhdXNlLCBvciBjb250cm9sIGJvbmVzKS4gRGVmYXVsdDogdHJ1ZSAqL1xuXHRpbnRlcmFjdGl2ZT86IGJvb2xlYW5cblxuXHQvKiBPcHRpb25hbDogTGlzdCBvZiBib25lIG5hbWVzIHRoYXQgdGhlIHVzZXIgY2FuIGRyYWcgdG8gcG9zaXRpb24uIERlZmF1bHQ6IG5vbmUgKi9cblx0Y29udHJvbEJvbmVzPzogc3RyaW5nW11cblxuXHQvKiBPcHRpb25hbDogQ2FsbGJhY2sgd2hlbiB0aGUgc2tlbGV0b24gYW5kIGl0cyBhc3NldHMgaGF2ZSBiZWVuIHN1Y2Nlc3NmdWxseSBsb2FkZWQuIElmIGFuIGFuaW1hdGlvbiBpcyBzZXQgb24gdHJhY2sgMCxcblx0ICAgdGhlIHBsYXllciB3b24ndCBzZXQgaXRzIG93biBhbmltYXRpb24uIERlZmF1bHQ6IG5vbmUgKi9cblx0c3VjY2Vzcz86IChwbGF5ZXI6IFNwaW5lUGxheWVyKSA9PiB2b2lkXG5cblx0LyogT3B0aW9uYWw6IENhbGxiYWNrIHdoZW4gdGhlIHNrZWxldG9uIGNvdWxkIG5vdCBiZSBsb2FkZWQgb3IgcmVuZGVyZWQuIERlZmF1bHQ6IG5vbmUgKi9cblx0ZXJyb3I/OiAocGxheWVyOiBTcGluZVBsYXllciwgbXNnOiBzdHJpbmcpID0+IHZvaWRcblxuXHQvKiBPcHRpb25hbDogQ2FsbGJhY2sgYXQgdGhlIHN0YXJ0IG9mIGVhY2ggZnJhbWUsIGJlZm9yZSB0aGUgc2tlbGV0b24gaXMgcG9zZWQgb3IgZHJhd24uIERlZmF1bHQ6IG5vbmUgKi9cblx0ZnJhbWU/OiAocGxheWVyOiBTcGluZVBsYXllciwgZGVsdGE6IG51bWJlcikgPT4gdm9pZFxuXG5cdC8qIE9wdGlvbmFsOiBDYWxsYmFjayB0byB1cGRhdGUgdGhlIHNrZWxldG9uJ3Mgd29ybGQgdHJhbnNmb3JtLiBEZWZhdWx0OiBwbGF5ZXIuc2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oc3BpbmUuUGh5c2ljcy51cGRhdGUpIGlzIGNhbGxlZCAqL1xuXHR1cGRhdGVXb3JsZFRyYW5zZm9ybT86IChwbGF5ZXI6IFNwaW5lUGxheWVyLCBkZWx0YTogbnVtYmVyKSA9PiB2b2lkXG5cblx0LyogT3B0aW9uYWw6IENhbGxiYWNrIGFmdGVyIHRoZSBza2VsZXRvbiBpcyBwb3NlZCBlYWNoIGZyYW1lLCBiZWZvcmUgaXQgaXMgZHJhd24uIERlZmF1bHQ6IG5vbmUgKi9cblx0dXBkYXRlPzogKHBsYXllcjogU3BpbmVQbGF5ZXIsIGRlbHRhOiBudW1iZXIpID0+IHZvaWRcblxuXHQvKiBPcHRpb25hbDogQ2FsbGJhY2sgYWZ0ZXIgdGhlIHNrZWxldG9uIGlzIGRyYXduIGVhY2ggZnJhbWUuIERlZmF1bHQ6IG5vbmUgKi9cblx0ZHJhdz86IChwbGF5ZXI6IFNwaW5lUGxheWVyLCBkZWx0YTogbnVtYmVyKSA9PiB2b2lkXG5cblx0LyogT3B0aW9uYWw6IENhbGxiYWNrIGVhY2ggZnJhbWUgYmVmb3JlIHRoZSBza2VsZXRvbiBpcyBsb2FkZWQuIERlZmF1bHQ6IG5vbmUgKi9cblx0bG9hZGluZz86IChwbGF5ZXI6IFNwaW5lUGxheWVyLCBkZWx0YTogbnVtYmVyKSA9PiB2b2lkXG5cblx0LyogT3B0aW9uYWw6IFRoZSBkb3dubG9hZGVyIHVzZWQgYnkgdGhlIHBsYXllcidzIGFzc2V0IG1hbmFnZXIuIFBhc3NpbmcgdGhlIHNhbWUgZG93bmxvYWRlciB0byBtdWx0aXBsZSBwbGF5ZXJzIHVzaW5nIHRoZVxuXHQgICBzYW1lIGFzc2V0cyBlbnN1cmVzIHRoZSBhc3NldHMgYXJlIG9ubHkgZG93bmxvYWRlZCBvbmNlLiBEZWZhdWx0OiBuZXcgaW5zdGFuY2UgKi9cblx0ZG93bmxvYWRlcj86IERvd25sb2FkZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaWV3cG9ydCB7XG5cdC8qIE9wdGlvbmFsOiBUaGUgcG9zaXRpb24gYW5kIHNpemUgb2YgdGhlIHZpZXdwb3J0IGluIHRoZSBza2VsZXRvbidzIHdvcmxkIGNvb3JkaW5hdGVzLiBEZWZhdWx0OiB0aGUgYm91bmRpbmcgYm94IHRoYXQgZml0c1xuXHQgICB0aGUgY3VycmVudCBhbmltYXRpb24gKi9cblx0eDogbnVtYmVyLFxuXHR5OiBudW1iZXIsXG5cdHdpZHRoOiBudW1iZXIsXG5cdGhlaWdodDogbnVtYmVyLFxuXG5cdC8qIE9wdGlvbmFsOiBQYWRkaW5nIGFyb3VuZCB0aGUgdmlld3BvcnQgc2l6ZSwgZ2l2ZW4gYXMgYSBudW1iZXIgb3IgcGVyY2VudGFnZSAoZWcgXCIyNSVcIikuIERlZmF1bHQ6IDEwJSAqL1xuXHRwYWRMZWZ0OiBzdHJpbmcgfCBudW1iZXJcblx0cGFkUmlnaHQ6IHN0cmluZyB8IG51bWJlclxuXHRwYWRUb3A6IHN0cmluZyB8IG51bWJlclxuXHRwYWRCb3R0b206IHN0cmluZyB8IG51bWJlclxufVxuXG5leHBvcnQgY2xhc3MgU3BpbmVQbGF5ZXIgaW1wbGVtZW50cyBEaXNwb3NhYmxlIHtcblx0cHVibGljIHBhcmVudDogSFRNTEVsZW1lbnQ7XG5cdHB1YmxpYyBkb206IEhUTUxFbGVtZW50O1xuXHRwdWJsaWMgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwdWJsaWMgY29udGV4dDogTWFuYWdlZFdlYkdMUmVuZGVyaW5nQ29udGV4dCB8IG51bGwgPSBudWxsO1xuXHRwdWJsaWMgc2NlbmVSZW5kZXJlcjogU2NlbmVSZW5kZXJlciB8IG51bGwgPSBudWxsO1xuXHRwdWJsaWMgbG9hZGluZ1NjcmVlbjogTG9hZGluZ1NjcmVlbiB8IG51bGwgPSBudWxsO1xuXHRwdWJsaWMgYXNzZXRNYW5hZ2VyOiBBc3NldE1hbmFnZXIgfCBudWxsID0gbnVsbDtcblx0cHVibGljIGJnID0gbmV3IENvbG9yKCk7XG5cdHB1YmxpYyBiZ0Z1bGxzY3JlZW4gPSBuZXcgQ29sb3IoKTtcblxuXHRwcml2YXRlIHBsYXllckNvbnRyb2xzOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwcml2YXRlIHRpbWVsaW5lU2xpZGVyOiBTbGlkZXIgfCBudWxsID0gbnVsbDtcblx0cHJpdmF0ZSBwbGF5QnV0dG9uOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwcml2YXRlIHNraW5CdXR0b246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cdHByaXZhdGUgYW5pbWF0aW9uQnV0dG9uOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXG5cdHByaXZhdGUgcGxheVRpbWUgPSAwO1xuXHRwcml2YXRlIHNlbGVjdGVkQm9uZXM6IChCb25lIHwgbnVsbClbXSA9IFtdO1xuXHRwcml2YXRlIGNhbmNlbElkOiBhbnkgPSAwO1xuXHRwb3B1cDogUG9wdXAgfCBudWxsID0gbnVsbDtcblxuXHQvKiBUcnVlIGlmIHRoZSBwbGF5ZXIgaXMgdW5hYmxlIHRvIGxvYWQgb3IgcmVuZGVyIHRoZSBza2VsZXRvbi4gKi9cblx0cHVibGljIGVycm9yOiBib29sZWFuID0gZmFsc2U7XG5cdC8qIFRoZSBwbGF5ZXIncyBza2VsZXRvbi4gTnVsbCB1bnRpbCBsb2FkaW5nIGlzIGNvbXBsZXRlIChhY2Nlc3MgYWZ0ZXIgY29uZmlnLnN1Y2Nlc3MpLiAqL1xuXHRwdWJsaWMgc2tlbGV0b246IFNrZWxldG9uIHwgbnVsbCA9IG51bGw7XG5cdC8qIFRoZSBhbmltYXRpb24gc3RhdGUgY29udHJvbGxpbmcgdGhlIHNrZWxldG9uLiBOdWxsIHVudGlsIGxvYWRpbmcgaXMgY29tcGxldGUgKGFjY2VzcyBhZnRlciBjb25maWcuc3VjY2VzcykuICovXG5cdHB1YmxpYyBhbmltYXRpb25TdGF0ZTogQW5pbWF0aW9uU3RhdGUgfCBudWxsID0gbnVsbDtcblxuXHRwdWJsaWMgcGF1c2VkID0gdHJ1ZTtcblx0cHVibGljIHNwZWVkID0gMTtcblx0cHVibGljIHRpbWUgPSBuZXcgVGltZUtlZXBlcigpO1xuXHRwcml2YXRlIHN0b3BSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmYWxzZTtcblx0cHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuXG5cdHByaXZhdGUgdmlld3BvcnQ6IFZpZXdwb3J0ID0ge30gYXMgVmlld3BvcnQ7XG5cdHByaXZhdGUgY3VycmVudFZpZXdwb3J0OiBWaWV3cG9ydCA9IHt9IGFzIFZpZXdwb3J0O1xuXHRwcml2YXRlIHByZXZpb3VzVmlld3BvcnQ6IFZpZXdwb3J0ID0ge30gYXMgVmlld3BvcnQ7XG5cdHByaXZhdGUgdmlld3BvcnRUcmFuc2l0aW9uU3RhcnQgPSAwO1xuXHRwcml2YXRlIGV2ZW50TGlzdGVuZXJzOiBBcnJheTx7IHRhcmdldDogYW55LCBldmVudDogYW55LCBmdW5jOiBhbnkgfT4gPSBbXTtcblx0cHJpdmF0ZSBpbnB1dD86IElucHV0O1xuXG5cdGNvbnN0cnVjdG9yIChwYXJlbnQ6IEhUTUxFbGVtZW50IHwgc3RyaW5nLCBwcml2YXRlIGNvbmZpZzogU3BpbmVQbGF5ZXJDb25maWcpIHtcblx0XHRsZXQgcGFyZW50RG9tID0gdHlwZW9mIHBhcmVudCA9PT0gXCJzdHJpbmdcIiA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhcmVudCkgOiBwYXJlbnQ7XG5cdFx0aWYgKHBhcmVudERvbSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJTcGluZVBsYXllciBwYXJlbnQgbm90IGZvdW5kOiBcIiArIHBhcmVudCk7XG5cdFx0dGhpcy5wYXJlbnQgPSBwYXJlbnREb207XG5cblx0XHRpZiAoY29uZmlnLnNob3dDb250cm9scyA9PT0gdm9pZCAwKSBjb25maWcuc2hvd0NvbnRyb2xzID0gdHJ1ZTtcblx0XHRsZXQgY29udHJvbHMgPSBjb25maWcuc2hvd0NvbnRyb2xzID8gLypodG1sKi9gXG48ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLWNvbnRyb2xzIHNwaW5lLXBsYXllci1wb3B1cC1wYXJlbnQgc3BpbmUtcGxheWVyLWNvbnRyb2xzLWhpZGRlblwiPlxuPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci10aW1lbGluZVwiPjwvZGl2PlxuPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1idXR0b25zXCI+XG48YnV0dG9uIGNsYXNzPVwic3BpbmUtcGxheWVyLWJ1dHRvbiBzcGluZS1wbGF5ZXItYnV0dG9uLWljb24tcGF1c2VcIj48L2J1dHRvbj5cbjxkaXYgY2xhc3M9XCJzcGluZS1wbGF5ZXItYnV0dG9uLXNwYWNlclwiPjwvZGl2PlxuPGJ1dHRvbiBjbGFzcz1cInNwaW5lLXBsYXllci1idXR0b24gc3BpbmUtcGxheWVyLWJ1dHRvbi1pY29uLXNwZWVkXCI+PC9idXR0b24+XG48YnV0dG9uIGNsYXNzPVwic3BpbmUtcGxheWVyLWJ1dHRvbiBzcGluZS1wbGF5ZXItYnV0dG9uLWljb24tYW5pbWF0aW9uc1wiPjwvYnV0dG9uPlxuPGJ1dHRvbiBjbGFzcz1cInNwaW5lLXBsYXllci1idXR0b24gc3BpbmUtcGxheWVyLWJ1dHRvbi1pY29uLXNraW5zXCI+PC9idXR0b24+XG48YnV0dG9uIGNsYXNzPVwic3BpbmUtcGxheWVyLWJ1dHRvbiBzcGluZS1wbGF5ZXItYnV0dG9uLWljb24tc2V0dGluZ3NcIj48L2J1dHRvbj5cbjxidXR0b24gY2xhc3M9XCJzcGluZS1wbGF5ZXItYnV0dG9uIHNwaW5lLXBsYXllci1idXR0b24taWNvbi1mdWxsc2NyZWVuXCI+PC9idXR0b24+XG48aW1nIGNsYXNzPVwic3BpbmUtcGxheWVyLWJ1dHRvbi1pY29uLXNwaW5lLWxvZ29cIiBzcmM9XCJkYXRhOmltYWdlL3N2Zyt4bWwsJTNDc3ZnJTIweG1sbnMlM0QlMjJodHRwJTNBJTJGJTJGd3d3LnczLm9yZyUyRjIwMDAlMkZzdmclMjIlMjB2aWV3Qm94JTNEJTIyMCUyMDAlMjAxMDQlMjAzMS4xNiUyMiUzRSUzQ3BhdGglMjBkJTNEJTIyTTEwNCUyMDEyLjY4YTEuMzElMjAxLjMxJTIwMCUyMDAlMjAxLS4zNyUyMDElMjAxLjI4JTIwMS4yOCUyMDAlMjAwJTIwMS0uODUuMzFIOTEuNTdhMTAuNTElMjAxMC41MSUyMDAlMjAwJTIwMCUyMC4yOSUyMDIuNTUlMjA0LjkyJTIwNC45MiUyMDAlMjAwJTIwMCUyMDElMjAyJTIwNC4yNyUyMDQuMjclMjAwJTIwMCUyMDAlMjAxLjY0JTIwMS4yNiUyMDYuODklMjA2Ljg5JTIwMCUyMDAlMjAwJTIwMi42LjQ0JTIwMTAuNjYlMjAxMC42NiUyMDAlMjAwJTIwMCUyMDIuMTctLjIlMjAxMi44MSUyMDEyLjgxJTIwMCUyMDAlMjAwJTIwMS42NC0uNDRxLjY5LS4yNSUyMDEuMTQtLjQ0YTEuODclMjAxLjg3JTIwMCUyMDAlMjAxJTIwLjY4LS4yLjQ0LjQ0JTIwMCUyMDAlMjAxJTIwLjI3LjA0LjQzLjQzJTIwMCUyMDAlMjAxJTIwLjE2LjIlMjAxLjM4JTIwMS4zOCUyMDAlMjAwJTIwMSUyMC4wOS4zNyUyMDQuODklMjA0Ljg5JTIwMCUyMDAlMjAxJTIwMCUyMC41OCUyMDQuMTQlMjA0LjE0JTIwMCUyMDAlMjAxJTIwMCUyMC40M3YuMzJhLjgzLjgzJTIwMCUyMDAlMjAxLS4wOS4yNiUyMDEuMSUyMDEuMSUyMDAlMjAwJTIwMS0uMTcuMjIlMjAyLjc3JTIwMi43NyUyMDAlMjAwJTIwMS0uNjEuMzQlMjA4Ljk0JTIwOC45NCUyMDAlMjAwJTIwMS0xLjMyLjQ2JTIwMTguNTQlMjAxOC41NCUyMDAlMjAwJTIwMS0xLjg4LjQxJTIwMTMuNzglMjAxMy43OCUyMDAlMjAwJTIwMS0yLjI4LjE4JTIwMTAuNTUlMjAxMC41NSUyMDAlMjAwJTIwMS0zLjY4LS41OSUyMDYuODIlMjA2LjgyJTIwMCUyMDAlMjAxLTIuNjYtMS43NCUyMDcuNDQlMjA3LjQ0JTIwMCUyMDAlMjAxLTEuNjMtMi44OSUyMDEzLjQ4JTIwMTMuNDglMjAwJTIwMCUyMDEtLjU1LTQlMjAxMi43NiUyMDEyLjc2JTIwMCUyMDAlMjAxJTIwLjU3LTMuOTQlMjA4LjM1JTIwOC4zNSUyMDAlMjAwJTIwMSUyMDEuNjQtMyUyMDcuMTUlMjA3LjE1JTIwMCUyMDAlMjAxJTIwMi41OC0xLjg3JTIwOC40NyUyMDguNDclMjAwJTIwMCUyMDElMjAzLjM5LS42NSUyMDguMTklMjA4LjE5JTIwMCUyMDAlMjAxJTIwMy40MS42NCUyMDYuNDYlMjA2LjQ2JTIwMCUyMDAlMjAxJTIwMi4zMiUyMDEuNzMlMjA3JTIwNyUyMDAlMjAwJTIwMSUyMDEuMyUyMDIuNTQlMjAxMS4xNyUyMDExLjE3JTIwMCUyMDAlMjAxJTIwLjQzJTIwMy4xM3ptLTMuMTQtLjkzYTUuNjklMjA1LjY5JTIwMCUyMDAlMjAwLTEuMDktMy44NiUyMDQuMTclMjA0LjE3JTIwMCUyMDAlMjAwLTMuNDItMS40JTIwNC41MiUyMDQuNTIlMjAwJTIwMCUyMDAtMiUyMC40NCUyMDQuNDElMjA0LjQxJTIwMCUyMDAlMjAwLTEuNDclMjAxLjE1QTUuMjklMjA1LjI5JTIwMCUyMDAlMjAwJTIwOTIlMjA5Ljc1YTclMjA3JTIwMCUyMDAlMjAwLS4zNiUyMDJ6TTgwLjY4JTIwMjEuOTRhLjQyLjQyJTIwMCUyMDAlMjAxLS4wOC4yNi41OS41OSUyMDAlMjAwJTIwMS0uMjUuMTglMjAxLjc0JTIwMS43NCUyMDAlMjAwJTIwMS0uNDcuMTElMjA2LjMxJTIwNi4zMSUyMDAlMjAwJTIwMS0uNzYlMjAwJTIwNi41JTIwNi41JTIwMCUyMDAlMjAxLS43OCUyMDAlMjAxLjc0JTIwMS43NCUyMDAlMjAwJTIwMS0uNDctLjExLjU5LjU5JTIwMCUyMDAlMjAxLS4yNS0uMTguNDIuNDIlMjAwJTIwMCUyMDEtLjA4LS4yNlYxMmE5LjglMjA5LjglMjAwJTIwMCUyMDAtLjIzLTIuMzUlMjA0Ljg2JTIwNC44NiUyMDAlMjAwJTIwMC0uNjYtMS41MyUyMDIuODglMjAyLjg4JTIwMCUyMDAlMjAwLTEuMTMtMSUyMDMuNTclMjAzLjU3JTIwMCUyMDAlMjAwLTEuNi0uMzQlMjA0JTIwNCUyMDAlMjAwJTIwMC0yLjM1LjgzQTEyLjcxJTIwMTIuNzElMjAwJTIwMCUyMDAlMjA2OS4xMSUyMDEwdjExLjlhLjQyLjQyJTIwMCUyMDAlMjAxLS4wOC4yNi41OS41OSUyMDAlMjAwJTIwMS0uMjUuMTglMjAxLjc0JTIwMS43NCUyMDAlMjAwJTIwMS0uNDcuMTElMjA2LjUxJTIwNi41MSUyMDAlMjAwJTIwMS0uNzglMjAwJTIwNi4zMSUyMDYuMzElMjAwJTIwMCUyMDEtLjc2JTIwMCUyMDEuODglMjAxLjg4JTIwMCUyMDAlMjAxLS40OC0uMTEuNTIuNTIlMjAwJTIwMCUyMDEtLjI1LS4xOC40Ni40NiUyMDAlMjAwJTIwMS0uMDctLjI2di0xN2EuNTMuNTMlMjAwJTIwMCUyMDElMjAuMDMtLjIxLjUuNSUyMDAlMjAwJTIwMSUyMC4yMy0uMTklMjAxLjI4JTIwMS4yOCUyMDAlMjAwJTIwMSUyMC40NC0uMTElMjA4LjUzJTIwOC41MyUyMDAlMjAwJTIwMSUyMDEuMzklMjAwJTIwMS4xMiUyMDEuMTIlMjAwJTIwMCUyMDElMjAuNDMuMTEuNi42JTIwMCUyMDAlMjAxJTIwLjIyLjE5LjQ3LjQ3JTIwMCUyMDAlMjAxJTIwLjA3LjI2VjcuMmExMC40NiUyMDEwLjQ2JTIwMCUyMDAlMjAxJTIwMi44Ny0yLjM2JTIwNi4xNyUyMDYuMTclMjAwJTIwMCUyMDElMjAyLjg4LS43NSUyMDYuNDElMjA2LjQxJTIwMCUyMDAlMjAxJTIwMi44Ny41OCUyMDUuMTYlMjA1LjE2JTIwMCUyMDAlMjAxJTIwMS44OCUyMDEuNTQlMjA2LjE1JTIwNi4xNSUyMDAlMjAwJTIwMSUyMDElMjAyLjI2JTIwMTMuNDYlMjAxMy40NiUyMDAlMjAwJTIwMSUyMC4zMSUyMDMuMTF6JTIyJTIwZmlsbCUzRCUyMiUyM2ZmZiUyMiUyRiUzRSUzQ3BhdGglMjBkJTNEJTIyTTQzLjM1JTIwMi44NmMuMDklMjAyLjYlMjAxLjg5JTIwNCUyMDUuNDglMjA0LjYxJTIwMyUyMC40OCUyMDUuNzkuMjQlMjA2LjY5LTIuMzclMjAxLjc1LTUuMDktMi40LTMuODItNi00LjM5cy02LjMxLTIuMDMtNi4xNyUyMDIuMTV6bTEuMDglMjAxMC42OWMuMzMlMjAxLjk0JTIwMi4xNCUyMDMuMDYlMjA0LjkxJTIwM3M0Ljg0LTEuMTYlMjA1LjEzLTMuMjVjLjUzLTMuODgtMi41My0yLjM4LTUuMy0yLjNzLTUuNC0xLjI2LTQuNzQlMjAyLjU1ek00OCUyMDIyLjQ0Yy41NSUyMDEuNDUlMjAyLjA2JTIwMi4wNiUyMDQuMSUyMDEuNjNzMy40NS0xLjExJTIwMy4zMy0yLjc2Yy0uMjEtMy4wNi0yLjIyLTIuMS00LjI2LTEuNjZTNDclMjAxOS42JTIwNDglMjAyMi40NHptMS43OCUyMDYuNzhjLjE2JTIwMS4yMiUyMDEuMjIlMjAyJTIwMi44OCUyMDEuOTNzMi45Mi0uNjclMjAzLjEzLTJjLjQtMi40My0xLjQ2LTEuNTMtMy4xMi0xLjUxcy0zLjE3LS44Mi0yLjg5JTIwMS41OHolMjIlMjBmaWxsJTNEJTIyJTIzZmY0MDAwJTIyJTJGJTNFJTNDcGF0aCUyMGQlM0QlMjJNMzUuMjglMjAxMy4xNmExNS4zMyUyMDE1LjMzJTIwMCUyMDAlMjAxLS40OCUyMDQlMjA4Ljc1JTIwOC43NSUyMDAlMjAwJTIwMS0xLjQyJTIwMyUyMDYuMzUlMjA2LjM1JTIwMCUyMDAlMjAxLTIuMzIlMjAxLjkxJTIwNy4xNCUyMDcuMTQlMjAwJTIwMCUyMDEtMy4xNi42NyUyMDYuMSUyMDYuMSUyMDAlMjAwJTIwMS0xLjQtLjE1JTIwNS4zNCUyMDUuMzQlMjAwJTIwMCUyMDEtMS4yNi0uNDclMjA3LjI5JTIwNy4yOSUyMDAlMjAwJTIwMS0xLjI0LS44MXEtLjYxLS40OS0xLjI5LTEuMTV2OC41MWEuNDcuNDclMjAwJTIwMCUyMDEtLjA4LjI2LjU2LjU2JTIwMCUyMDAlMjAxLS4yNS4xOSUyMDEuNzQlMjAxLjc0JTIwMCUyMDAlMjAxLS40Ny4xMSUyMDYuNDclMjA2LjQ3JTIwMCUyMDAlMjAxLS43OCUyMDAlMjA2LjI2JTIwNi4yNiUyMDAlMjAwJTIwMS0uNzYlMjAwJTIwMS44OSUyMDEuODklMjAwJTIwMCUyMDEtLjQ4LS4xMS40OS40OSUyMDAlMjAwJTIwMS0uMjUtLjE5LjUxLjUxJTIwMCUyMDAlMjAxLS4wNy0uMjZWNC45MWEuNTcuNTclMjAwJTIwMCUyMDElMjAuMDYtLjI3LjQ2LjQ2JTIwMCUyMDAlMjAxJTIwLjIzLS4xOCUyMDEuNDclMjAxLjQ3JTIwMCUyMDAlMjAxJTIwLjQ0LS4xJTIwNy40MSUyMDcuNDElMjAwJTIwMCUyMDElMjAxLjMlMjAwJTIwMS40NSUyMDEuNDUlMjAwJTIwMCUyMDElMjAuNDMuMS41Mi41MiUyMDAlMjAwJTIwMSUyMC4yNC4xOC41MS41MSUyMDAlMjAwJTIwMSUyMC4wNy4yN1Y3LjJhMTguMDYlMjAxOC4wNiUyMDAlMjAwJTIwMSUyMDEuNDktMS4zOCUyMDklMjA5JTIwMCUyMDAlMjAxJTIwMS40NS0xJTIwNi44MiUyMDYuODIlMjAwJTIwMCUyMDElMjAxLjQ5LS41OSUyMDcuMDklMjA3LjA5JTIwMCUyMDAlMjAxJTIwNC43OC41MiUyMDYlMjA2JTIwMCUyMDAlMjAxJTIwMi4xMyUyMDIlMjA4Ljc5JTIwOC43OSUyMDAlMjAwJTIwMSUyMDEuMiUyMDIuOSUyMDE1LjcyJTIwMTUuNzIlMjAwJTIwMCUyMDElMjAuNCUyMDMuNTF6bS0zLjI4LjM2YTE1LjY0JTIwMTUuNjQlMjAwJTIwMCUyMDAtLjItMi41MyUyMDcuMzIlMjA3LjMyJTIwMCUyMDAlMjAwLS42OS0yLjE3JTIwNC4wNiUyMDQuMDYlMjAwJTIwMCUyMDAtMS4zLTEuNTElMjAzLjQ5JTIwMy40OSUyMDAlMjAwJTIwMC0yLS41NyUyMDQuMSUyMDQuMSUyMDAlMjAwJTIwMC0xLjIuMTglMjA0LjkyJTIwNC45MiUyMDAlMjAwJTIwMC0xLjIuNTclMjA4LjU0JTIwOC41NCUyMDAlMjAwJTIwMC0xLjI4JTIwMUExNS43NyUyMDE1Ljc3JTIwMCUyMDAlMjAwJTIwMjIuNzYlMjAxMHY2Ljc3YTEzLjUzJTIwMTMuNTMlMjAwJTIwMCUyMDAlMjAyLjQ2JTIwMi40JTIwNC4xMiUyMDQuMTIlMjAwJTIwMCUyMDAlMjAyLjQ0LjgzJTIwMy41NiUyMDMuNTYlMjAwJTIwMCUyMDAlMjAyLS41N0E0LjI4JTIwNC4yOCUyMDAlMjAwJTIwMCUyMDMxJTIwMThhNy41OCUyMDcuNTglMjAwJTIwMCUyMDAlMjAuNzctMi4xMiUyMDExLjQzJTIwMTEuNDMlMjAwJTIwMCUyMDAlMjAuMjMtMi4zNnpNMTIlMjAxNy4zYTUuMzklMjA1LjM5JTIwMCUyMDAlMjAxLS40OCUyMDIuMzMlMjA0LjczJTIwNC43MyUyMDAlMjAwJTIwMS0xLjM3JTIwMS43MiUyMDYuMTklMjA2LjE5JTIwMCUyMDAlMjAxLTIuMTIlMjAxLjA2JTIwOS42MiUyMDkuNjIlMjAwJTIwMCUyMDEtMi43MS4zNiUyMDEwLjM4JTIwMTAuMzglMjAwJTIwMCUyMDEtMy4yMS0uNUE3LjYzJTIwNy42MyUyMDAlMjAwJTIwMSUyMDElMjAyMS44MmEzLjI1JTIwMy4yNSUyMDAlMjAwJTIwMS0uNjYtLjQzJTIwMS4wOSUyMDEuMDklMjAwJTIwMCUyMDEtLjMtLjUzJTIwMy41OSUyMDMuNTklMjAwJTIwMCUyMDEtLjA0LS45MyUyMDQuMDYlMjA0LjA2JTIwMCUyMDAlMjAxJTIwMC0uNjElMjAyJTIwMiUyMDAlMjAwJTIwMSUyMC4wOS0uNC40Mi40MiUyMDAlMjAwJTIwMSUyMC4xNi0uMjIuNDMuNDMlMjAwJTIwMCUyMDElMjAuMjQtLjA3JTIwMS4zNSUyMDEuMzUlMjAwJTIwMCUyMDElMjAuNjEuMjZxLjQxLjI2JTIwMSUyMC41NmE5LjIyJTIwOS4yMiUyMDAlMjAwJTIwMCUyMDEuNDEuNTUlMjA2LjI1JTIwNi4yNSUyMDAlMjAwJTIwMCUyMDEuODcuMjYlMjA1LjYyJTIwNS42MiUyMDAlMjAwJTIwMCUyMDEuNDQtLjE3JTIwMy40OCUyMDMuNDglMjAwJTIwMCUyMDAlMjAxLjEyLS41JTIwMi4yMyUyMDIuMjMlMjAwJTIwMCUyMDAlMjAuNzMtLjg0JTIwMi42OCUyMDIuNjglMjAwJTIwMCUyMDAlMjAuMjYtMS4yMSUyMDIlMjAyJTIwMCUyMDAlMjAwLS4zNy0xLjIxJTIwMy41NSUyMDMuNTUlMjAwJTIwMCUyMDAtMS0uODclMjA4LjA5JTIwOC4wOSUyMDAlMjAwJTIwMC0xLjM2LS42NmwtMS41Ni0uNjFhMTYlMjAxNiUyMDAlMjAwJTIwMS0xLjU3LS43MyUyMDYlMjA2JTIwMCUyMDAlMjAxLTEuMzctMSUyMDQuNTIlMjA0LjUyJTIwMCUyMDAlMjAxLTEtMS40JTIwNC42OSUyMDQuNjklMjAwJTIwMCUyMDEtLjM3LTIlMjA0Ljg4JTIwNC44OCUyMDAlMjAwJTIwMSUyMC4zOS0xLjg3JTIwNC40NiUyMDQuNDYlMjAwJTIwMCUyMDElMjAxLjE2LTEuNjElMjA1LjgzJTIwNS44MyUyMDAlMjAwJTIwMSUyMDEuOTQtMS4xMUE4LjA2JTIwOC4wNiUyMDAlMjAwJTIwMSUyMDYuNTMlMjA0YTguMjglMjA4LjI4JTIwMCUyMDAlMjAxJTIwMS4zNi4xMSUyMDkuMzYlMjA5LjM2JTIwMCUyMDAlMjAxJTIwMS4yMy4yOCUyMDUuOTIlMjA1LjkyJTIwMCUyMDAlMjAxJTIwLjk0LjM3JTIwNC4wOSUyMDQuMDklMjAwJTIwMCUyMDElMjAuNTkuMzUlMjAxJTIwMSUyMDAlMjAwJTIwMSUyMC4yNi4yNi44My44MyUyMDAlMjAwJTIwMSUyMC4wOS4yNiUyMDEuMzIlMjAxLjMyJTIwMCUyMDAlMjAwJTIwLjA2LjM1JTIwMy44NyUyMDMuODclMjAwJTIwMCUyMDElMjAwJTIwLjUxJTIwNC43NiUyMDQuNzYlMjAwJTIwMCUyMDElMjAwJTIwLjU2JTIwMS4zOSUyMDEuMzklMjAwJTIwMCUyMDEtLjA5LjM5LjUuNSUyMDAlMjAwJTIwMS0uMTYuMjIuMzUuMzUlMjAwJTIwMCUyMDEtLjIxLjA3JTIwMSUyMDElMjAwJTIwMCUyMDEtLjQ5LS4yMSUyMDclMjA3JTIwMCUyMDAlMjAwLS44My0uNDQlMjA5LjI2JTIwOS4yNiUyMDAlMjAwJTIwMC0xLjItLjQ0JTIwNS40OSUyMDUuNDklMjAwJTIwMCUyMDAtMS41OC0uMTYlMjA0LjkzJTIwNC45MyUyMDAlMjAwJTIwMC0xLjQuMTglMjAyLjY5JTIwMi42OSUyMDAlMjAwJTIwMC0xJTIwLjUxJTIwMi4xNiUyMDIuMTYlMjAwJTIwMCUyMDAtLjU5LjgzJTIwMi40MyUyMDIuNDMlMjAwJTIwMCUyMDAtLjIlMjAxJTIwMiUyMDIlMjAwJTIwMCUyMDAlMjAuMzglMjAxLjI0JTIwMy42JTIwMy42JTIwMCUyMDAlMjAwJTIwMSUyMC44OCUyMDguMjUlMjA4LjI1JTIwMCUyMDAlMjAwJTIwMS4zOC42OGwxLjU4LjYycS44LjMyJTIwMS41OS43MmE2JTIwNiUyMDAlMjAwJTIwMSUyMDEuMzklMjAxJTIwNC4zNyUyMDQuMzclMjAwJTIwMCUyMDElMjAxJTIwMS4zNiUyMDQuNDYlMjA0LjQ2JTIwMCUyMDAlMjAxJTIwLjM3JTIwMS44eiUyMiUyMGZpbGwlM0QlMjIlMjNmZmYlMjIlMkYlM0UlM0MlMkZzdmclM0VcIj5cbjwvZGl2PjwvZGl2PmAgOiBcIlwiO1xuXG5cdFx0dGhpcy5wYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5kb20gPSBjcmVhdGVFbGVtZW50KFxuXHRcdFx0XHQvKmh0bWwqL2A8ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyXCIgc3R5bGU9XCJwb3NpdGlvbjpyZWxhdGl2ZTtoZWlnaHQ6MTAwJVwiPjxjYW52YXMgY2xhc3M9XCJzcGluZS1wbGF5ZXItY2FudmFzXCIgc3R5bGU9XCJkaXNwbGF5OmJsb2NrO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCVcIj48L2NhbnZhcz4ke2NvbnRyb2xzfTwvZGl2PmApKTtcblxuXHRcdHRyeSB7XG5cdFx0XHR0aGlzLnZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0dGhpcy5zaG93RXJyb3IoKGUgYXMgYW55KS5tZXNzYWdlLCBlIGFzIGFueSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5pbml0aWFsaXplKCk7XG5cblx0XHQvLyBSZWdpc3RlciBhIGdsb2JhbCByZXNpemUgaGFuZGxlciB0byByZWRyYXcsIGF2b2lkaW5nIGZsaWNrZXIuXG5cdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKHdpbmRvdywgXCJyZXNpemVcIiwgKCkgPT4gdGhpcy5kcmF3RnJhbWUoZmFsc2UpKTtcblxuXHRcdC8vIFN0YXJ0IHRoZSByZW5kZXJpbmcgbG9vcC5cblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5kcmF3RnJhbWUoKSk7XG5cdH1cblxuXHRkaXNwb3NlICgpOiB2b2lkIHtcblx0XHR0aGlzLnNjZW5lUmVuZGVyZXI/LmRpc3Bvc2UoKTtcblx0XHR0aGlzLmxvYWRpbmdTY3JlZW4/LmRpc3Bvc2UoKTtcblx0XHR0aGlzLmFzc2V0TWFuYWdlcj8uZGlzcG9zZSgpO1xuXHRcdHRoaXMuY29udGV4dD8uZGlzcG9zZSgpO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5ldmVudExpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGV2ZW50TGlzdGVuZXIgPSB0aGlzLmV2ZW50TGlzdGVuZXJzW2ldO1xuXHRcdFx0ZXZlbnRMaXN0ZW5lci50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudExpc3RlbmVyLmV2ZW50LCBldmVudExpc3RlbmVyLmZ1bmMpO1xuXHRcdH1cblx0XHR0aGlzLmlucHV0Py5kaXNwb3NlKCk7XG5cdFx0aWYgKHRoaXMuY2FudmFzKSB7XG5cdFx0XHR0aGlzLmNhbnZhcy53aWR0aCA9IDA7XG5cdFx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSAwO1xuXHRcdH1cblx0XHR0aGlzLnBhcmVudC5yZW1vdmVDaGlsZCh0aGlzLmRvbSk7XG5cdFx0dGhpcy5kaXNwb3NlZCA9IHRydWU7XG5cdH1cblxuXHRhZGRFdmVudExpc3RlbmVyICh0YXJnZXQ6IGFueSwgZXZlbnQ6IGFueSwgZnVuYzogYW55KSB7XG5cdFx0dGhpcy5ldmVudExpc3RlbmVycy5wdXNoKHsgdGFyZ2V0OiB0YXJnZXQsIGV2ZW50OiBldmVudCwgZnVuYzogZnVuYyB9KTtcblx0XHR0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZnVuYyk7XG5cdH1cblxuXHRwcml2YXRlIHZhbGlkYXRlQ29uZmlnIChjb25maWc6IFNwaW5lUGxheWVyQ29uZmlnKSB7XG5cdFx0aWYgKCFjb25maWcpIHRocm93IG5ldyBFcnJvcihcIkEgY29uZmlndXJhdGlvbiBvYmplY3QgbXVzdCBiZSBwYXNzZWQgdG8gdG8gbmV3IFNwaW5lUGxheWVyKCkuXCIpO1xuXHRcdGlmICgoY29uZmlnIGFzIGFueSkuc2tlbFVybCkgY29uZmlnLnNrZWxldG9uID0gKGNvbmZpZyBhcyBhbnkpLnNrZWxVcmw7XG5cdFx0aWYgKCFjb25maWcuc2tlbGV0b24gJiYgIWNvbmZpZy5qc29uVXJsICYmICFjb25maWcuYmluYXJ5VXJsKSB0aHJvdyBuZXcgRXJyb3IoXCJBIFVSTCBtdXN0IGJlIHNwZWNpZmllZCBmb3IgdGhlIHNrZWxldG9uIEpTT04gb3IgYmluYXJ5IGZpbGUuXCIpO1xuXHRcdGlmICghY29uZmlnLnNjYWxlKSBjb25maWcuc2NhbGUgPSAxO1xuXHRcdGlmICghY29uZmlnLmF0bGFzICYmICFjb25maWcuYXRsYXNVcmwpIHRocm93IG5ldyBFcnJvcihcIkEgVVJMIG11c3QgYmUgc3BlY2lmaWVkIGZvciB0aGUgYXRsYXMgZmlsZS5cIik7XG5cblx0XHRpZiAoY29uZmlnLmpzb25VcmwgJiYgIWNvbmZpZy5za2VsZXRvbikgY29uZmlnLnNrZWxldG9uID0gY29uZmlnLmpzb25Vcmw7XG5cdFx0aWYgKGNvbmZpZy5iaW5hcnlVcmwgJiYgIWNvbmZpZy5za2VsZXRvbikgY29uZmlnLnNrZWxldG9uID0gY29uZmlnLmJpbmFyeVVybDtcblx0XHRpZiAoY29uZmlnLmF0bGFzVXJsICYmICFjb25maWcuYXRsYXMpIGNvbmZpZy5hdGxhcyA9IGNvbmZpZy5hdGxhc1VybDtcblxuXHRcdGlmICghY29uZmlnLmJhY2tncm91bmRDb2xvcikgY29uZmlnLmJhY2tncm91bmRDb2xvciA9IGNvbmZpZy5hbHBoYSA/IFwiMDAwMDAwMDBcIiA6IFwiMDAwMDAwXCI7XG5cdFx0aWYgKCFjb25maWcuZnVsbFNjcmVlbkJhY2tncm91bmRDb2xvcikgY29uZmlnLmZ1bGxTY3JlZW5CYWNrZ3JvdW5kQ29sb3IgPSBjb25maWcuYmFja2dyb3VuZENvbG9yO1xuXHRcdGlmIChjb25maWcuYmFja2dyb3VuZEltYWdlICYmICFjb25maWcuYmFja2dyb3VuZEltYWdlLnVybCkgY29uZmlnLmJhY2tncm91bmRJbWFnZSA9IHVuZGVmaW5lZDtcblx0XHRpZiAoY29uZmlnLnByZW11bHRpcGxpZWRBbHBoYSA9PT0gdm9pZCAwKSBjb25maWcucHJlbXVsdGlwbGllZEFscGhhID0gdHJ1ZTtcblx0XHRpZiAoY29uZmlnLnByZXNlcnZlRHJhd2luZ0J1ZmZlciA9PT0gdm9pZCAwKSBjb25maWcucHJlc2VydmVEcmF3aW5nQnVmZmVyID0gZmFsc2U7XG5cdFx0aWYgKGNvbmZpZy5taXBtYXBzID09PSB2b2lkIDApIGNvbmZpZy5taXBtYXBzID0gdHJ1ZTtcblx0XHRpZiAoY29uZmlnLmludGVyYWN0aXZlID09PSB2b2lkIDApIGNvbmZpZy5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cdFx0aWYgKCFjb25maWcuZGVidWcpIGNvbmZpZy5kZWJ1ZyA9IHtcblx0XHRcdGJvbmVzOiBmYWxzZSxcblx0XHRcdGNsaXBwaW5nOiBmYWxzZSxcblx0XHRcdGJvdW5kczogZmFsc2UsXG5cdFx0XHRodWxsczogZmFsc2UsXG5cdFx0XHRtZXNoZXM6IGZhbHNlLFxuXHRcdFx0cGF0aHM6IGZhbHNlLFxuXHRcdFx0cG9pbnRzOiBmYWxzZSxcblx0XHRcdHJlZ2lvbnM6IGZhbHNlXG5cdFx0fTtcblx0XHRpZiAoY29uZmlnLmFuaW1hdGlvbnMgJiYgY29uZmlnLmFuaW1hdGlvbiAmJiBjb25maWcuYW5pbWF0aW9ucy5pbmRleE9mKGNvbmZpZy5hbmltYXRpb24pIDwgMClcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkFuaW1hdGlvbiAnXCIgKyBjb25maWcuYW5pbWF0aW9uICsgXCInIGlzIG5vdCBpbiB0aGUgY29uZmlnIGFuaW1hdGlvbiBsaXN0OiBcIiArIHRvU3RyaW5nKGNvbmZpZy5hbmltYXRpb25zKSk7XG5cdFx0aWYgKGNvbmZpZy5za2lucyAmJiBjb25maWcuc2tpbiAmJiBjb25maWcuc2tpbnMuaW5kZXhPZihjb25maWcuc2tpbikgPCAwKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRGVmYXVsdCBza2luICdcIiArIGNvbmZpZy5za2luICsgXCInIGlzIG5vdCBpbiB0aGUgY29uZmlnIHNraW5zIGxpc3Q6IFwiICsgdG9TdHJpbmcoY29uZmlnLnNraW5zKSk7XG5cdFx0aWYgKCFjb25maWcudmlld3BvcnQpIGNvbmZpZy52aWV3cG9ydCA9IHt9IGFzIGFueTtcblx0XHRpZiAoIWNvbmZpZy52aWV3cG9ydCEuYW5pbWF0aW9ucykgY29uZmlnLnZpZXdwb3J0IS5hbmltYXRpb25zID0ge307XG5cdFx0aWYgKGNvbmZpZy52aWV3cG9ydCEuZGVidWdSZW5kZXIgPT09IHZvaWQgMCkgY29uZmlnLnZpZXdwb3J0IS5kZWJ1Z1JlbmRlciA9IGZhbHNlO1xuXHRcdGlmIChjb25maWcudmlld3BvcnQhLnRyYW5zaXRpb25UaW1lID09PSB2b2lkIDApIGNvbmZpZy52aWV3cG9ydCEudHJhbnNpdGlvblRpbWUgPSAwLjI1O1xuXHRcdGlmICghY29uZmlnLmNvbnRyb2xCb25lcykgY29uZmlnLmNvbnRyb2xCb25lcyA9IFtdO1xuXHRcdGlmIChjb25maWcuc2hvd0xvYWRpbmcgPT09IHZvaWQgMCkgY29uZmlnLnNob3dMb2FkaW5nID0gdHJ1ZTtcblx0XHRpZiAoY29uZmlnLmRlZmF1bHRNaXggPT09IHZvaWQgMCkgY29uZmlnLmRlZmF1bHRNaXggPSAwLjI1O1xuXHR9XG5cblx0cHJpdmF0ZSBpbml0aWFsaXplICgpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuXHRcdGxldCBjb25maWcgPSB0aGlzLmNvbmZpZztcblx0XHRsZXQgZG9tID0gdGhpcy5kb207XG5cblx0XHRpZiAoIWNvbmZpZy5hbHBoYSkgeyAvLyBQcmV2ZW50cyBhIGZsYXNoIGJlZm9yZSB0aGUgZmlyc3QgZnJhbWUgaXMgZHJhd24uXG5cdFx0XHRsZXQgaGV4ID0gY29uZmlnLmJhY2tncm91bmRDb2xvciE7XG5cdFx0XHR0aGlzLmRvbS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAoaGV4LmNoYXJBdCgwKSA9PSAnIycgPyBoZXggOiBcIiNcIiArIGhleCkuc3Vic3RyKDAsIDcpO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHQvLyBTZXR1cCB0aGUgT3BlbkdMIGNvbnRleHQuXG5cdFx0XHR0aGlzLmNhbnZhcyA9IGZpbmRXaXRoQ2xhc3MoZG9tLCBcInNwaW5lLXBsYXllci1jYW52YXNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5cdFx0XHR0aGlzLmNvbnRleHQgPSBuZXcgTWFuYWdlZFdlYkdMUmVuZGVyaW5nQ29udGV4dCh0aGlzLmNhbnZhcywgeyBhbHBoYTogY29uZmlnLmFscGhhLCBwcmVzZXJ2ZURyYXdpbmdCdWZmZXI6IGNvbmZpZy5wcmVzZXJ2ZURyYXdpbmdCdWZmZXIgfSk7XG5cblx0XHRcdC8vIFNldHVwIHRoZSBzY2VuZSByZW5kZXJlciBhbmQgbG9hZGluZyBzY3JlZW4uXG5cdFx0XHR0aGlzLnNjZW5lUmVuZGVyZXIgPSBuZXcgU2NlbmVSZW5kZXJlcih0aGlzLmNhbnZhcywgdGhpcy5jb250ZXh0LCB0cnVlKTtcblx0XHRcdGlmIChjb25maWcuc2hvd0xvYWRpbmcpIHRoaXMubG9hZGluZ1NjcmVlbiA9IG5ldyBMb2FkaW5nU2NyZWVuKHRoaXMuc2NlbmVSZW5kZXJlcik7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0dGhpcy5zaG93RXJyb3IoXCJTb3JyeSwgeW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViR0wsIG9yIHlvdSBoYXZlIGRpc2FibGVkIFdlYkdMIGluIHlvdXIgYnJvd3NlciBzZXR0aW5ncy5cXG5QbGVhc2UgdXNlIHRoZSBsYXRlc3QgdmVyc2lvbiBvZiBGaXJlZm94LCBDaHJvbWUsIEVkZ2UsIG9yIFNhZmFyaS5cIiwgZSBhcyBhbnkpO1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXG5cdFx0Ly8gTG9hZCB0aGUgYXNzZXRzLlxuXHRcdHRoaXMuYXNzZXRNYW5hZ2VyID0gbmV3IEFzc2V0TWFuYWdlcih0aGlzLmNvbnRleHQsIFwiXCIsIGNvbmZpZy5kb3dubG9hZGVyKTtcblx0XHRpZiAoY29uZmlnLnJhd0RhdGFVUklzKSB7XG5cdFx0XHRmb3IgKGxldCBwYXRoIGluIGNvbmZpZy5yYXdEYXRhVVJJcylcblx0XHRcdFx0dGhpcy5hc3NldE1hbmFnZXIuc2V0UmF3RGF0YVVSSShwYXRoLCBjb25maWcucmF3RGF0YVVSSXNbcGF0aF0pO1xuXHRcdH1cblx0XHRpZiAoY29uZmlnLnNrZWxldG9uIS5lbmRzV2l0aChcIi5qc29uXCIpKVxuXHRcdFx0dGhpcy5hc3NldE1hbmFnZXIubG9hZEpzb24oY29uZmlnLnNrZWxldG9uISk7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5hc3NldE1hbmFnZXIubG9hZEJpbmFyeShjb25maWcuc2tlbGV0b24hKTtcblx0XHR0aGlzLmFzc2V0TWFuYWdlci5sb2FkVGV4dHVyZUF0bGFzKGNvbmZpZy5hdGxhcyEpO1xuXHRcdGlmIChjb25maWcuYmFja2dyb3VuZEltYWdlKSB0aGlzLmFzc2V0TWFuYWdlci5sb2FkVGV4dHVyZShjb25maWcuYmFja2dyb3VuZEltYWdlLnVybCk7XG5cblx0XHQvLyBTZXR1cCB0aGUgVUkgZWxlbWVudHMuXG5cdFx0dGhpcy5iZy5zZXRGcm9tU3RyaW5nKGNvbmZpZy5iYWNrZ3JvdW5kQ29sb3IhKTtcblx0XHR0aGlzLmJnRnVsbHNjcmVlbi5zZXRGcm9tU3RyaW5nKGNvbmZpZy5mdWxsU2NyZWVuQmFja2dyb3VuZENvbG9yISk7XG5cdFx0aWYgKGNvbmZpZy5zaG93Q29udHJvbHMpIHtcblx0XHRcdHRoaXMucGxheWVyQ29udHJvbHMgPSBkb20uY2hpbGRyZW5bMV0gYXMgSFRNTEVsZW1lbnQ7XG5cdFx0XHRsZXQgY29udHJvbHMgPSB0aGlzLnBsYXllckNvbnRyb2xzLmNoaWxkcmVuO1xuXHRcdFx0bGV0IHRpbWVsaW5lID0gY29udHJvbHNbMF0gYXMgSFRNTEVsZW1lbnQ7XG5cdFx0XHRsZXQgYnV0dG9ucyA9IGNvbnRyb2xzWzFdLmNoaWxkcmVuO1xuXHRcdFx0dGhpcy5wbGF5QnV0dG9uID0gYnV0dG9uc1swXSBhcyBIVE1MRWxlbWVudDtcblx0XHRcdGxldCBzcGVlZEJ1dHRvbiA9IGJ1dHRvbnNbMl0gYXMgSFRNTEVsZW1lbnQ7XG5cdFx0XHR0aGlzLmFuaW1hdGlvbkJ1dHRvbiA9IGJ1dHRvbnNbM10gYXMgSFRNTEVsZW1lbnQ7XG5cdFx0XHR0aGlzLnNraW5CdXR0b24gPSBidXR0b25zWzRdIGFzIEhUTUxFbGVtZW50O1xuXHRcdFx0bGV0IHNldHRpbmdzQnV0dG9uID0gYnV0dG9uc1s1XSBhcyBIVE1MRWxlbWVudDtcblx0XHRcdGxldCBmdWxsc2NyZWVuQnV0dG9uID0gYnV0dG9uc1s2XSBhcyBIVE1MRWxlbWVudDtcblx0XHRcdGxldCBsb2dvQnV0dG9uID0gYnV0dG9uc1s3XSBhcyBIVE1MRWxlbWVudDtcblxuXHRcdFx0dGhpcy50aW1lbGluZVNsaWRlciA9IG5ldyBTbGlkZXIoKTtcblx0XHRcdHRpbWVsaW5lLmFwcGVuZENoaWxkKHRoaXMudGltZWxpbmVTbGlkZXIuY3JlYXRlKCkpO1xuXHRcdFx0dGhpcy50aW1lbGluZVNsaWRlci5jaGFuZ2UgPSAocGVyY2VudGFnZSkgPT4ge1xuXHRcdFx0XHR0aGlzLnBhdXNlKCk7XG5cdFx0XHRcdGxldCBhbmltYXRpb25EdXJhdGlvbiA9IHRoaXMuYW5pbWF0aW9uU3RhdGUhLmdldEN1cnJlbnQoMCkhLmFuaW1hdGlvbiEuZHVyYXRpb247XG5cdFx0XHRcdGxldCB0aW1lID0gYW5pbWF0aW9uRHVyYXRpb24gKiBwZXJjZW50YWdlO1xuXHRcdFx0XHR0aGlzLmFuaW1hdGlvblN0YXRlIS51cGRhdGUodGltZSAtIHRoaXMucGxheVRpbWUpO1xuXHRcdFx0XHR0aGlzLmFuaW1hdGlvblN0YXRlIS5hcHBseSh0aGlzLnNrZWxldG9uISk7XG5cdFx0XHRcdHRoaXMuc2tlbGV0b24hLnVwZGF0ZSh0aW1lIC0gdGhpcy5wbGF5VGltZSk7XG5cdFx0XHRcdHRoaXMuc2tlbGV0b24hLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKFBoeXNpY3MudXBkYXRlKTtcblx0XHRcdFx0dGhpcy5wbGF5VGltZSA9IHRpbWU7XG5cdFx0XHR9O1xuXG5cdFx0XHR0aGlzLnBsYXlCdXR0b24ub25jbGljayA9ICgpID0+ICh0aGlzLnBhdXNlZCA/IHRoaXMucGxheSgpIDogdGhpcy5wYXVzZSgpKTtcblx0XHRcdHNwZWVkQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnNob3dTcGVlZERpYWxvZyhzcGVlZEJ1dHRvbik7XG5cdFx0XHR0aGlzLmFuaW1hdGlvbkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4gdGhpcy5zaG93QW5pbWF0aW9uc0RpYWxvZyh0aGlzLmFuaW1hdGlvbkJ1dHRvbiEpO1xuXHRcdFx0dGhpcy5za2luQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnNob3dTa2luc0RpYWxvZyh0aGlzLnNraW5CdXR0b24hKTtcblx0XHRcdHNldHRpbmdzQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnNob3dTZXR0aW5nc0RpYWxvZyhzZXR0aW5nc0J1dHRvbik7XG5cblx0XHRcdGxldCBvbGRXaWR0aCA9IHRoaXMuY2FudmFzLmNsaWVudFdpZHRoLCBvbGRIZWlnaHQgPSB0aGlzLmNhbnZhcy5jbGllbnRIZWlnaHQ7XG5cdFx0XHRsZXQgb2xkU3R5bGVXaWR0aCA9IHRoaXMuY2FudmFzLnN0eWxlLndpZHRoLCBvbGRTdHlsZUhlaWdodCA9IHRoaXMuY2FudmFzLnN0eWxlLmhlaWdodDtcblx0XHRcdGxldCBpc0Z1bGxzY3JlZW4gPSBmYWxzZTtcblx0XHRcdGZ1bGxzY3JlZW5CdXR0b24ub25jbGljayA9ICgpID0+IHtcblx0XHRcdFx0bGV0IGZ1bGxzY3JlZW5DaGFuZ2VkID0gKCkgPT4ge1xuXHRcdFx0XHRcdGlzRnVsbHNjcmVlbiA9ICFpc0Z1bGxzY3JlZW47XG5cdFx0XHRcdFx0aWYgKCFpc0Z1bGxzY3JlZW4pIHtcblx0XHRcdFx0XHRcdHRoaXMuY2FudmFzIS5zdHlsZS53aWR0aCA9IG9sZFdpZHRoICsgXCJweFwiO1xuXHRcdFx0XHRcdFx0dGhpcy5jYW52YXMhLnN0eWxlLmhlaWdodCA9IG9sZEhlaWdodCArIFwicHhcIjtcblx0XHRcdFx0XHRcdHRoaXMuZHJhd0ZyYW1lKGZhbHNlKTtcblx0XHRcdFx0XHRcdC8vIEdvdCB0byByZXNldCB0aGUgc3R5bGUgdG8gd2hhdGV2ZXIgdGhlIHVzZXIgc2V0IGFmdGVyIHRoZSBuZXh0IGxheW91dGluZy5cblx0XHRcdFx0XHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuY2FudmFzIS5zdHlsZS53aWR0aCA9IG9sZFN0eWxlV2lkdGg7XG5cdFx0XHRcdFx0XHRcdHRoaXMuY2FudmFzIS5zdHlsZS5oZWlnaHQgPSBvbGRTdHlsZUhlaWdodDtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRsZXQgcGxheWVyID0gZG9tIGFzIGFueTtcblx0XHRcdFx0cGxheWVyLm9uZnVsbHNjcmVlbmNoYW5nZSA9IGZ1bGxzY3JlZW5DaGFuZ2VkO1xuXHRcdFx0XHRwbGF5ZXIub253ZWJraXRmdWxsc2NyZWVuY2hhbmdlID0gZnVsbHNjcmVlbkNoYW5nZWQ7XG5cblx0XHRcdFx0bGV0IGRvYyA9IGRvY3VtZW50IGFzIGFueTtcblx0XHRcdFx0aWYgKGRvYy5mdWxsc2NyZWVuRWxlbWVudCB8fCBkb2Mud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgfHwgZG9jLm1vekZ1bGxTY3JlZW5FbGVtZW50IHx8IGRvYy5tc0Z1bGxzY3JlZW5FbGVtZW50KSB7XG5cdFx0XHRcdFx0aWYgKGRvYy5leGl0RnVsbHNjcmVlbikgZG9jLmV4aXRGdWxsc2NyZWVuKCk7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZG9jLm1vekNhbmNlbEZ1bGxTY3JlZW4pIGRvYy5tb3pDYW5jZWxGdWxsU2NyZWVuKCk7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZG9jLndlYmtpdEV4aXRGdWxsc2NyZWVuKSBkb2Mud2Via2l0RXhpdEZ1bGxzY3JlZW4oKVxuXHRcdFx0XHRcdGVsc2UgaWYgKGRvYy5tc0V4aXRGdWxsc2NyZWVuKSBkb2MubXNFeGl0RnVsbHNjcmVlbigpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG9sZFdpZHRoID0gdGhpcy5jYW52YXMhLmNsaWVudFdpZHRoO1xuXHRcdFx0XHRcdG9sZEhlaWdodCA9IHRoaXMuY2FudmFzIS5jbGllbnRIZWlnaHQ7XG5cdFx0XHRcdFx0b2xkU3R5bGVXaWR0aCA9IHRoaXMuY2FudmFzIS5zdHlsZS53aWR0aDtcblx0XHRcdFx0XHRvbGRTdHlsZUhlaWdodCA9IHRoaXMuY2FudmFzIS5zdHlsZS5oZWlnaHQ7XG5cdFx0XHRcdFx0aWYgKHBsYXllci5yZXF1ZXN0RnVsbHNjcmVlbikgcGxheWVyLnJlcXVlc3RGdWxsc2NyZWVuKCk7XG5cdFx0XHRcdFx0ZWxzZSBpZiAocGxheWVyLndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKSBwbGF5ZXIud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKTtcblx0XHRcdFx0XHRlbHNlIGlmIChwbGF5ZXIubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHBsYXllci5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuXHRcdFx0XHRcdGVsc2UgaWYgKHBsYXllci5tc1JlcXVlc3RGdWxsc2NyZWVuKSBwbGF5ZXIubXNSZXF1ZXN0RnVsbHNjcmVlbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRsb2dvQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB3aW5kb3cub3BlbihcImh0dHA6Ly9lc290ZXJpY3NvZnR3YXJlLmNvbVwiKTtcblx0XHR9XG5cdFx0cmV0dXJuIGRvbTtcblx0fVxuXG5cdHByaXZhdGUgbG9hZFNrZWxldG9uICgpIHtcblx0XHRpZiAodGhpcy5lcnJvcikgcmV0dXJuO1xuXG5cdFx0aWYgKHRoaXMuYXNzZXRNYW5hZ2VyIS5oYXNFcnJvcnMoKSlcblx0XHRcdHRoaXMuc2hvd0Vycm9yKFwiRXJyb3I6IEFzc2V0cyBjb3VsZCBub3QgYmUgbG9hZGVkLlxcblwiICsgdG9TdHJpbmcodGhpcy5hc3NldE1hbmFnZXIhLmdldEVycm9ycygpKSk7XG5cblx0XHRsZXQgY29uZmlnID0gdGhpcy5jb25maWc7XG5cblx0XHQvLyBDb25maWd1cmUgZmlsdGVyaW5nLCBkb24ndCB1c2UgbWlwbWFwcyBpbiBXZWJHTDEgaWYgdGhlIGF0bGFzIHBhZ2UgaXMgbm9uLVBPVFxuXHRcdGxldCBhdGxhcyA9IHRoaXMuYXNzZXRNYW5hZ2VyIS5yZXF1aXJlKGNvbmZpZy5hdGxhcyEpIGFzIFRleHR1cmVBdGxhcztcblx0XHRsZXQgZ2wgPSB0aGlzLmNvbnRleHQhLmdsLCBhbmlzb3Ryb3BpYyA9IGdsLmdldEV4dGVuc2lvbihcIkVYVF90ZXh0dXJlX2ZpbHRlcl9hbmlzb3Ryb3BpY1wiKTtcblx0XHRsZXQgaXNXZWJHTDEgPSBnbC5nZXRQYXJhbWV0ZXIoZ2wuVkVSU0lPTikuaW5kZXhPZihcIldlYkdMIDEuMFwiKSAhPSAtMTtcblx0XHRmb3IgKGxldCBwYWdlIG9mIGF0bGFzLnBhZ2VzKSB7XG5cdFx0XHRsZXQgbWluRmlsdGVyID0gcGFnZS5taW5GaWx0ZXI7XG5cdFx0XHR2YXIgdXNlTWlwTWFwczogYm9vbGVhbiA9IGNvbmZpZy5taXBtYXBzITtcblx0XHRcdHZhciBpc1BPVCA9IE1hdGhVdGlscy5pc1Bvd2VyT2ZUd28ocGFnZS53aWR0aCkgJiYgTWF0aFV0aWxzLmlzUG93ZXJPZlR3byhwYWdlLmhlaWdodCk7XG5cdFx0XHRpZiAoaXNXZWJHTDEgJiYgIWlzUE9UKSB1c2VNaXBNYXBzID0gZmFsc2U7XG5cblx0XHRcdGlmICh1c2VNaXBNYXBzKSB7XG5cdFx0XHRcdGlmIChhbmlzb3Ryb3BpYykge1xuXHRcdFx0XHRcdGdsLnRleFBhcmFtZXRlcmYoZ2wuVEVYVFVSRV8yRCwgYW5pc290cm9waWMuVEVYVFVSRV9NQVhfQU5JU09UUk9QWV9FWFQsIDgpO1xuXHRcdFx0XHRcdG1pbkZpbHRlciA9IFRleHR1cmVGaWx0ZXIuTWlwTWFwTGluZWFyTGluZWFyO1xuXHRcdFx0XHR9IGVsc2Vcblx0XHRcdFx0XHRtaW5GaWx0ZXIgPSBUZXh0dXJlRmlsdGVyLkxpbmVhcjsgLy8gRG9uJ3QgdXNlIG1pcG1hcHMgd2l0aG91dCBhbmlzb3Ryb3BpYy5cblx0XHRcdFx0cGFnZS50ZXh0dXJlIS5zZXRGaWx0ZXJzKG1pbkZpbHRlciwgVGV4dHVyZUZpbHRlci5OZWFyZXN0KTtcblx0XHRcdH1cblx0XHRcdGlmIChtaW5GaWx0ZXIgIT0gVGV4dHVyZUZpbHRlci5OZWFyZXN0ICYmIG1pbkZpbHRlciAhPSBUZXh0dXJlRmlsdGVyLkxpbmVhcikgKHBhZ2UudGV4dHVyZSBhcyBHTFRleHR1cmUpLnVwZGF0ZSh0cnVlKTtcblx0XHR9XG5cblx0XHQvLyBMb2FkIHNrZWxldG9uIGRhdGEuXG5cdFx0bGV0IHNrZWxldG9uRGF0YTogU2tlbGV0b25EYXRhO1xuXHRcdHRyeSB7XG5cdFx0XHRsZXQgbG9hZGVyOiBhbnksIGRhdGE6IGFueSwgYXR0YWNobWVudExvYWRlciA9IG5ldyBBdGxhc0F0dGFjaG1lbnRMb2FkZXIoYXRsYXMpO1xuXHRcdFx0aWYgKGNvbmZpZy5za2VsZXRvbiEuZW5kc1dpdGgoXCIuanNvblwiKSkge1xuXHRcdFx0XHRkYXRhID0gdGhpcy5hc3NldE1hbmFnZXIhLnJlbW92ZShjb25maWcuc2tlbGV0b24hKTtcblx0XHRcdFx0aWYgKCFkYXRhKSB0aHJvdyBuZXcgRXJyb3IoXCJFbXB0eSBKU09OIGRhdGEuXCIpO1xuXHRcdFx0XHRpZiAoY29uZmlnLmpzb25GaWVsZCkge1xuXHRcdFx0XHRcdGRhdGEgPSBkYXRhW2NvbmZpZy5qc29uRmllbGRdO1xuXHRcdFx0XHRcdGlmICghZGF0YSkgdGhyb3cgbmV3IEVycm9yKFwiSlNPTiBmaWVsZCBkb2VzIG5vdCBleGlzdDogXCIgKyBjb25maWcuanNvbkZpZWxkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsb2FkZXIgPSBuZXcgU2tlbGV0b25Kc29uKGF0dGFjaG1lbnRMb2FkZXIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGF0YSA9IHRoaXMuYXNzZXRNYW5hZ2VyIS5yZW1vdmUoY29uZmlnLnNrZWxldG9uISk7XG5cdFx0XHRcdGxvYWRlciA9IG5ldyBTa2VsZXRvbkJpbmFyeShhdHRhY2htZW50TG9hZGVyKTtcblx0XHRcdH1cblx0XHRcdGxvYWRlci5zY2FsZSA9IGNvbmZpZy5zY2FsZTtcblx0XHRcdHNrZWxldG9uRGF0YSA9IGxvYWRlci5yZWFkU2tlbGV0b25EYXRhKGRhdGEpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMuc2hvd0Vycm9yKGBFcnJvcjogQ291bGQgbm90IGxvYWQgc2tlbGV0b24gZGF0YS5cXG4keyhlIGFzIGFueSkubWVzc2FnZX1gLCBlIGFzIGFueSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuc2tlbGV0b24gPSBuZXcgU2tlbGV0b24oc2tlbGV0b25EYXRhKTtcblx0XHRsZXQgc3RhdGVEYXRhID0gbmV3IEFuaW1hdGlvblN0YXRlRGF0YShza2VsZXRvbkRhdGEpO1xuXHRcdHN0YXRlRGF0YS5kZWZhdWx0TWl4ID0gY29uZmlnLmRlZmF1bHRNaXghO1xuXHRcdHRoaXMuYW5pbWF0aW9uU3RhdGUgPSBuZXcgQW5pbWF0aW9uU3RhdGUoc3RhdGVEYXRhKTtcblxuXHRcdC8vIENoZWNrIGlmIGFsbCBjb250cm9sIGJvbmVzIGFyZSBpbiB0aGUgc2tlbGV0b25cblx0XHRjb25maWcuY29udHJvbEJvbmVzIS5mb3JFYWNoKGJvbmUgPT4ge1xuXHRcdFx0aWYgKCFza2VsZXRvbkRhdGEuZmluZEJvbmUoYm9uZSkpIHRoaXMuc2hvd0Vycm9yKGBFcnJvcjogQ29udHJvbCBib25lIGRvZXMgbm90IGV4aXN0IGluIHNrZWxldG9uOiAke2JvbmV9YCk7XG5cdFx0fSlcblxuXHRcdC8vIFNldHVwIHNraW4uXG5cdFx0aWYgKCFjb25maWcuc2tpbiAmJiBza2VsZXRvbkRhdGEuc2tpbnMubGVuZ3RoKSBjb25maWcuc2tpbiA9IHNrZWxldG9uRGF0YS5za2luc1swXS5uYW1lO1xuXHRcdGlmIChjb25maWcuc2tpbnMgJiYgY29uZmlnLnNraW4hLmxlbmd0aCkge1xuXHRcdFx0Y29uZmlnLnNraW5zLmZvckVhY2goc2tpbiA9PiB7XG5cdFx0XHRcdGlmICghdGhpcy5za2VsZXRvbiEuZGF0YS5maW5kU2tpbihza2luKSlcblx0XHRcdFx0XHR0aGlzLnNob3dFcnJvcihgRXJyb3I6IFNraW4gaW4gY29uZmlnIGxpc3QgZG9lcyBub3QgZXhpc3QgaW4gc2tlbGV0b246ICR7c2tpbn1gKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRpZiAoY29uZmlnLnNraW4pIHtcblx0XHRcdGlmICghdGhpcy5za2VsZXRvbi5kYXRhLmZpbmRTa2luKGNvbmZpZy5za2luKSlcblx0XHRcdFx0dGhpcy5zaG93RXJyb3IoYEVycm9yOiBTa2luIGRvZXMgbm90IGV4aXN0IGluIHNrZWxldG9uOiAke2NvbmZpZy5za2lufWApO1xuXHRcdFx0dGhpcy5za2VsZXRvbi5zZXRTa2luQnlOYW1lKGNvbmZpZy5za2luKTtcblx0XHRcdHRoaXMuc2tlbGV0b24uc2V0U2xvdHNUb1NldHVwUG9zZSgpO1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIGlmIGFsbCBhbmltYXRpb25zIGdpdmVuIGEgdmlld3BvcnQgZXhpc3QuXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY29uZmlnLnZpZXdwb3J0IS5hbmltYXRpb25zKS5mb3JFYWNoKChhbmltYXRpb246IHN0cmluZykgPT4ge1xuXHRcdFx0aWYgKCFza2VsZXRvbkRhdGEuZmluZEFuaW1hdGlvbihhbmltYXRpb24pKVxuXHRcdFx0XHR0aGlzLnNob3dFcnJvcihgRXJyb3I6IEFuaW1hdGlvbiBmb3Igd2hpY2ggYSB2aWV3cG9ydCB3YXMgc3BlY2lmaWVkIGRvZXMgbm90IGV4aXN0IGluIHNrZWxldG9uOiAke2FuaW1hdGlvbn1gKTtcblx0XHR9KTtcblxuXHRcdC8vIFNldHVwIHRoZSBhbmltYXRpb25zIGFmdGVyIHRoZSB2aWV3cG9ydCwgc28gZGVmYXVsdCBib3VuZHMgZG9uJ3QgZ2V0IG1lc3NlZCB1cC5cblx0XHRpZiAoY29uZmlnLmFuaW1hdGlvbnMgJiYgY29uZmlnLmFuaW1hdGlvbnMubGVuZ3RoKSB7XG5cdFx0XHRjb25maWcuYW5pbWF0aW9ucy5mb3JFYWNoKGFuaW1hdGlvbiA9PiB7XG5cdFx0XHRcdGlmICghdGhpcy5za2VsZXRvbiEuZGF0YS5maW5kQW5pbWF0aW9uKGFuaW1hdGlvbikpXG5cdFx0XHRcdFx0dGhpcy5zaG93RXJyb3IoYEVycm9yOiBBbmltYXRpb24gaW4gY29uZmlnIGxpc3QgZG9lcyBub3QgZXhpc3QgaW4gc2tlbGV0b246ICR7YW5pbWF0aW9ufWApO1xuXHRcdFx0fSk7XG5cdFx0XHRpZiAoIWNvbmZpZy5hbmltYXRpb24pIGNvbmZpZy5hbmltYXRpb24gPSBjb25maWcuYW5pbWF0aW9uc1swXTtcblx0XHR9XG5cblx0XHRpZiAoY29uZmlnLmFuaW1hdGlvbiAmJiAhc2tlbGV0b25EYXRhLmZpbmRBbmltYXRpb24oY29uZmlnLmFuaW1hdGlvbikpXG5cdFx0XHR0aGlzLnNob3dFcnJvcihgRXJyb3I6IEFuaW1hdGlvbiBkb2VzIG5vdCBleGlzdCBpbiBza2VsZXRvbjogJHtjb25maWcuYW5pbWF0aW9ufWApO1xuXG5cdFx0Ly8gU2V0dXAgaW5wdXQgcHJvY2Vzc2luZyBhbmQgY29udHJvbCBib25lcy5cblx0XHR0aGlzLnNldHVwSW5wdXQoKTtcblxuXHRcdGlmIChjb25maWcuc2hvd0NvbnRyb2xzKSB7XG5cdFx0XHQvLyBIaWRlIHNraW4gYW5kIGFuaW1hdGlvbiBpZiB0aGVyZSdzIG9ubHkgdGhlIGRlZmF1bHQgc2tpbiAvIG5vIGFuaW1hdGlvblxuXHRcdFx0aWYgKHNrZWxldG9uRGF0YS5za2lucy5sZW5ndGggPT0gMSB8fCAoY29uZmlnLnNraW5zICYmIGNvbmZpZy5za2lucy5sZW5ndGggPT0gMSkpIHRoaXMuc2tpbkJ1dHRvbiEuY2xhc3NMaXN0LmFkZChcInNwaW5lLXBsYXllci1oaWRkZW5cIik7XG5cdFx0XHRpZiAoc2tlbGV0b25EYXRhLmFuaW1hdGlvbnMubGVuZ3RoID09IDEgfHwgKGNvbmZpZy5hbmltYXRpb25zICYmIGNvbmZpZy5hbmltYXRpb25zLmxlbmd0aCA9PSAxKSkgdGhpcy5hbmltYXRpb25CdXR0b24hLmNsYXNzTGlzdC5hZGQoXCJzcGluZS1wbGF5ZXItaGlkZGVuXCIpO1xuXHRcdH1cblxuXHRcdGlmIChjb25maWcuc3VjY2VzcykgY29uZmlnLnN1Y2Nlc3ModGhpcyk7XG5cblx0XHRsZXQgZW50cnkgPSB0aGlzLmFuaW1hdGlvblN0YXRlLmdldEN1cnJlbnQoMCk7XG5cdFx0aWYgKCFlbnRyeSkge1xuXHRcdFx0aWYgKGNvbmZpZy5hbmltYXRpb24pIHtcblx0XHRcdFx0ZW50cnkgPSB0aGlzLnNldEFuaW1hdGlvbihjb25maWcuYW5pbWF0aW9uKTtcblx0XHRcdFx0dGhpcy5wbGF5KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlbnRyeSA9IHRoaXMuYW5pbWF0aW9uU3RhdGUuc2V0RW1wdHlBbmltYXRpb24oMCk7XG5cdFx0XHRcdGVudHJ5LnRyYWNrRW5kID0gMTAwMDAwMDAwO1xuXHRcdFx0XHR0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKFBoeXNpY3MudXBkYXRlKTtcblx0XHRcdFx0dGhpcy5zZXRWaWV3cG9ydChlbnRyeS5hbmltYXRpb24hKTtcblx0XHRcdFx0dGhpcy5wYXVzZSgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodGhpcy5jdXJyZW50Vmlld3BvcnQueCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRoaXMuc2V0Vmlld3BvcnQoZW50cnkuYW5pbWF0aW9uISk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIWNvbmZpZy5hbmltYXRpb24pIHtcblx0XHRcdFx0Y29uZmlnLmFuaW1hdGlvbiA9IGVudHJ5LmFuaW1hdGlvbj8ubmFtZVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5wbGF5KCk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBzZXR1cElucHV0ICgpIHtcblx0XHRsZXQgY29uZmlnID0gdGhpcy5jb25maWc7XG5cdFx0bGV0IGNvbnRyb2xCb25lcyA9IGNvbmZpZy5jb250cm9sQm9uZXMhO1xuXHRcdGlmICghY29udHJvbEJvbmVzLmxlbmd0aCAmJiAhY29uZmlnLnNob3dDb250cm9scykgcmV0dXJuO1xuXHRcdGxldCBzZWxlY3RlZEJvbmVzID0gdGhpcy5zZWxlY3RlZEJvbmVzID0gbmV3IEFycmF5PEJvbmUgfCBudWxsPihjb250cm9sQm9uZXMubGVuZ3RoKTtcblx0XHRsZXQgY2FudmFzID0gdGhpcy5jYW52YXMhO1xuXHRcdGxldCB0YXJnZXQ6IEJvbmUgfCBudWxsID0gbnVsbDtcblx0XHRsZXQgb2Zmc2V0ID0gbmV3IFZlY3RvcjIoKTtcblx0XHRsZXQgY29vcmRzID0gbmV3IFZlY3RvcjMoKTtcblx0XHRsZXQgbW91c2UgPSBuZXcgVmVjdG9yMygpO1xuXHRcdGxldCBwb3NpdGlvbiA9IG5ldyBWZWN0b3IyKCk7XG5cdFx0bGV0IHNrZWxldG9uID0gdGhpcy5za2VsZXRvbiE7XG5cdFx0bGV0IHJlbmRlcmVyID0gdGhpcy5zY2VuZVJlbmRlcmVyITtcblxuXHRcdGlmIChjb25maWcuaW50ZXJhY3RpdmUpIHtcblx0XHRcdGxldCBjbG9zZXN0ID0gZnVuY3Rpb24gKHg6IG51bWJlciwgeTogbnVtYmVyKTogQm9uZSB8IG51bGwge1xuXHRcdFx0XHRtb3VzZS5zZXQoeCwgY2FudmFzLmNsaWVudEhlaWdodCAtIHksIDApXG5cdFx0XHRcdG9mZnNldC54ID0gb2Zmc2V0LnkgPSAwO1xuXHRcdFx0XHRsZXQgYmVzdERpc3RhbmNlID0gMjQsIGluZGV4ID0gMDtcblx0XHRcdFx0bGV0IGJlc3Q6IEJvbmUgfCBudWxsID0gbnVsbDtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb250cm9sQm9uZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRzZWxlY3RlZEJvbmVzW2ldID0gbnVsbDtcblx0XHRcdFx0XHRsZXQgYm9uZSA9IHNrZWxldG9uLmZpbmRCb25lKGNvbnRyb2xCb25lc1tpXSk7XG5cdFx0XHRcdFx0aWYgKCFib25lKSBjb250aW51ZTtcblx0XHRcdFx0XHRsZXQgZGlzdGFuY2UgPSByZW5kZXJlci5jYW1lcmEud29ybGRUb1NjcmVlbihcblx0XHRcdFx0XHRcdGNvb3Jkcy5zZXQoYm9uZS53b3JsZFgsIGJvbmUud29ybGRZLCAwKSxcblx0XHRcdFx0XHRcdGNhbnZhcy5jbGllbnRXaWR0aCwgY2FudmFzLmNsaWVudEhlaWdodCkuZGlzdGFuY2UobW91c2UpO1xuXHRcdFx0XHRcdGlmIChkaXN0YW5jZSA8IGJlc3REaXN0YW5jZSkge1xuXHRcdFx0XHRcdFx0YmVzdERpc3RhbmNlID0gZGlzdGFuY2U7XG5cdFx0XHRcdFx0XHRiZXN0ID0gYm9uZTtcblx0XHRcdFx0XHRcdGluZGV4ID0gaTtcblx0XHRcdFx0XHRcdG9mZnNldC54ID0gY29vcmRzLnggLSBtb3VzZS54O1xuXHRcdFx0XHRcdFx0b2Zmc2V0LnkgPSBjb29yZHMueSAtIG1vdXNlLnk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChiZXN0KSBzZWxlY3RlZEJvbmVzW2luZGV4XSA9IGJlc3Q7XG5cdFx0XHRcdHJldHVybiBiZXN0O1xuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5pbnB1dCA9IG5ldyBJbnB1dChjYW52YXMpO1xuXHRcdFx0dGhpcy5pbnB1dC5hZGRMaXN0ZW5lcih7XG5cdFx0XHRcdGRvd246ICh4LCB5KSA9PiB7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gY2xvc2VzdCh4LCB5KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0dXA6ICgpID0+IHtcblx0XHRcdFx0XHRpZiAodGFyZ2V0KVxuXHRcdFx0XHRcdFx0dGFyZ2V0ID0gbnVsbDtcblx0XHRcdFx0XHRlbHNlIGlmIChjb25maWcuc2hvd0NvbnRyb2xzKVxuXHRcdFx0XHRcdFx0KHRoaXMucGF1c2VkID8gdGhpcy5wbGF5KCkgOiB0aGlzLnBhdXNlKCkpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRkcmFnZ2VkOiAoeCwgeSkgPT4ge1xuXHRcdFx0XHRcdGlmICh0YXJnZXQpIHtcblx0XHRcdFx0XHRcdHggPSBNYXRoVXRpbHMuY2xhbXAoeCArIG9mZnNldC54LCAwLCBjYW52YXMuY2xpZW50V2lkdGgpXG5cdFx0XHRcdFx0XHR5ID0gTWF0aFV0aWxzLmNsYW1wKHkgLSBvZmZzZXQueSwgMCwgY2FudmFzLmNsaWVudEhlaWdodCk7XG5cdFx0XHRcdFx0XHRyZW5kZXJlci5jYW1lcmEuc2NyZWVuVG9Xb3JsZChjb29yZHMuc2V0KHgsIHksIDApLCBjYW52YXMuY2xpZW50V2lkdGgsIGNhbnZhcy5jbGllbnRIZWlnaHQpO1xuXHRcdFx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0LnBhcmVudC53b3JsZFRvTG9jYWwocG9zaXRpb24uc2V0KGNvb3Jkcy54IC0gc2tlbGV0b24ueCwgY29vcmRzLnkgLSBza2VsZXRvbi55KSk7XG5cdFx0XHRcdFx0XHRcdHRhcmdldC54ID0gcG9zaXRpb24ueDtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0LnkgPSBwb3NpdGlvbi55O1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0LnggPSBjb29yZHMueCAtIHNrZWxldG9uLng7XG5cdFx0XHRcdFx0XHRcdHRhcmdldC55ID0gY29vcmRzLnkgLSBza2VsZXRvbi55O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0bW92ZWQ6ICh4LCB5KSA9PiBjbG9zZXN0KHgsIHkpXG5cdFx0XHR9KTtcblx0XHR9XG5cblxuXHRcdGlmIChjb25maWcuc2hvd0NvbnRyb2xzKSB7XG5cdFx0XHQvLyBGb3IgbWFudWFsIGhvdmVyIHRvIHdvcmssIHdlIG5lZWQgdG8gZGlzYWJsZSBoaWRkaW5nIGNvbnRyb2xzIGlmIHRoZSBtb3VzZS90b3VjaCBlbnRlcmVkIHRoZSBjbGlja2FibGUgYXJlYSBvZiBhIGNoaWxkIG9mIHRoZSBjb250cm9scy5cblx0XHRcdC8vIEZvciB0aGlzIHdlIG5lZWQgdG8gcmVnaXN0ZXIgYSBtb3VzZSBoYW5kbGVyIG9uIHRoZSBkb2N1bWVudCBhbmQgc2VlIGlmIHdlIGFyZSB3aXRoaW4gdGhlIGNhbnZhcyBhcmVhLlxuXHRcdFx0dGhpcy5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50LCBcIm1vdXNlbW92ZVwiLCAoZXY6IFVJRXZlbnQpID0+IHtcblx0XHRcdFx0aWYgKGV2IGluc3RhbmNlb2YgTW91c2VFdmVudCkgaGFuZGxlSG92ZXIoZXYuY2xpZW50WCwgZXYuY2xpZW50WSk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgXCJ0b3VjaG1vdmVcIiwgKGV2OiBVSUV2ZW50KSA9PiB7XG5cdFx0XHRcdGlmIChldiBpbnN0YW5jZW9mIFRvdWNoRXZlbnQpIHtcblx0XHRcdFx0XHRsZXQgdG91Y2hlcyA9IGV2LmNoYW5nZWRUb3VjaGVzO1xuXHRcdFx0XHRcdGlmICh0b3VjaGVzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0bGV0IHRvdWNoID0gdG91Y2hlc1swXTtcblx0XHRcdFx0XHRcdGhhbmRsZUhvdmVyKHRvdWNoLmNsaWVudFgsIHRvdWNoLmNsaWVudFkpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0bGV0IG92ZXJsYXAgPSAobW91c2VYOiBudW1iZXIsIG1vdXNlWTogbnVtYmVyLCByZWN0OiBET01SZWN0IHwgQ2xpZW50UmVjdCk6IGJvb2xlYW4gPT4ge1xuXHRcdFx0XHRsZXQgeCA9IG1vdXNlWCAtIHJlY3QubGVmdCwgeSA9IG1vdXNlWSAtIHJlY3QudG9wO1xuXHRcdFx0XHRyZXR1cm4geCA+PSAwICYmIHggPD0gcmVjdC53aWR0aCAmJiB5ID49IDAgJiYgeSA8PSByZWN0LmhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0bGV0IG1vdXNlT3ZlckNvbnRyb2xzID0gdHJ1ZSwgbW91c2VPdmVyQ2FudmFzID0gZmFsc2U7XG5cdFx0XHRsZXQgaGFuZGxlSG92ZXIgPSAobW91c2VYOiBudW1iZXIsIG1vdXNlWTogbnVtYmVyKSA9PiB7XG5cdFx0XHRcdGxldCBwb3B1cCA9IGZpbmRXaXRoQ2xhc3ModGhpcy5kb20sIFwic3BpbmUtcGxheWVyLXBvcHVwXCIpO1xuXHRcdFx0XHRtb3VzZU92ZXJDb250cm9scyA9IG92ZXJsYXAobW91c2VYLCBtb3VzZVksIHRoaXMucGxheWVyQ29udHJvbHMhLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpKTtcblx0XHRcdFx0bW91c2VPdmVyQ2FudmFzID0gb3ZlcmxhcChtb3VzZVgsIG1vdXNlWSwgY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpKTtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuY2FuY2VsSWQpO1xuXHRcdFx0XHRsZXQgaGlkZSA9ICFwb3B1cCAmJiAhbW91c2VPdmVyQ29udHJvbHMgJiYgIW1vdXNlT3ZlckNhbnZhcyAmJiAhdGhpcy5wYXVzZWQ7XG5cdFx0XHRcdGlmIChoaWRlKVxuXHRcdFx0XHRcdHRoaXMucGxheWVyQ29udHJvbHMhLmNsYXNzTGlzdC5hZGQoXCJzcGluZS1wbGF5ZXItY29udHJvbHMtaGlkZGVuXCIpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dGhpcy5wbGF5ZXJDb250cm9scyEuY2xhc3NMaXN0LnJlbW92ZShcInNwaW5lLXBsYXllci1jb250cm9scy1oaWRkZW5cIik7XG5cdFx0XHRcdGlmICghbW91c2VPdmVyQ29udHJvbHMgJiYgIXBvcHVwICYmICF0aGlzLnBhdXNlZCkge1xuXHRcdFx0XHRcdHRoaXMuY2FuY2VsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHRcdGlmICghdGhpcy5wYXVzZWQpIHRoaXMucGxheWVyQ29udHJvbHMhLmNsYXNzTGlzdC5hZGQoXCJzcGluZS1wbGF5ZXItY29udHJvbHMtaGlkZGVuXCIpO1xuXHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cGxheSAoKSB7XG5cdFx0dGhpcy5wYXVzZWQgPSBmYWxzZTtcblx0XHRsZXQgY29uZmlnID0gdGhpcy5jb25maWc7XG5cdFx0aWYgKGNvbmZpZy5zaG93Q29udHJvbHMpIHtcblx0XHRcdHRoaXMuY2FuY2VsSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0aWYgKCF0aGlzLnBhdXNlZCkgdGhpcy5wbGF5ZXJDb250cm9scyEuY2xhc3NMaXN0LmFkZChcInNwaW5lLXBsYXllci1jb250cm9scy1oaWRkZW5cIik7XG5cdFx0XHR9LCAxMDAwKTtcblx0XHRcdHRoaXMucGxheUJ1dHRvbiEuY2xhc3NMaXN0LnJlbW92ZShcInNwaW5lLXBsYXllci1idXR0b24taWNvbi1wbGF5XCIpO1xuXHRcdFx0dGhpcy5wbGF5QnV0dG9uIS5jbGFzc0xpc3QuYWRkKFwic3BpbmUtcGxheWVyLWJ1dHRvbi1pY29uLXBhdXNlXCIpO1xuXG5cdFx0XHQvLyBJZiBubyBjb25maWcgYW5pbWF0aW9uLCBzZXQgb25lIHdoZW4gZmlyc3QgY2xpY2tlZC5cblx0XHRcdGlmICghY29uZmlnLmFuaW1hdGlvbikge1xuXHRcdFx0XHRpZiAoY29uZmlnLmFuaW1hdGlvbnMgJiYgY29uZmlnLmFuaW1hdGlvbnMubGVuZ3RoKVxuXHRcdFx0XHRcdGNvbmZpZy5hbmltYXRpb24gPSBjb25maWcuYW5pbWF0aW9uc1swXTtcblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5za2VsZXRvbiEuZGF0YS5hbmltYXRpb25zLmxlbmd0aClcblx0XHRcdFx0XHRjb25maWcuYW5pbWF0aW9uID0gdGhpcy5za2VsZXRvbiEuZGF0YS5hbmltYXRpb25zWzBdLm5hbWU7XG5cdFx0XHRcdGlmIChjb25maWcuYW5pbWF0aW9uKSB0aGlzLnNldEFuaW1hdGlvbihjb25maWcuYW5pbWF0aW9uKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRwYXVzZSAoKSB7XG5cdFx0dGhpcy5wYXVzZWQgPSB0cnVlO1xuXHRcdGlmICh0aGlzLmNvbmZpZy5zaG93Q29udHJvbHMpIHtcblx0XHRcdHRoaXMucGxheWVyQ29udHJvbHMhLmNsYXNzTGlzdC5yZW1vdmUoXCJzcGluZS1wbGF5ZXItY29udHJvbHMtaGlkZGVuXCIpO1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuY2FuY2VsSWQpO1xuXHRcdFx0dGhpcy5wbGF5QnV0dG9uIS5jbGFzc0xpc3QucmVtb3ZlKFwic3BpbmUtcGxheWVyLWJ1dHRvbi1pY29uLXBhdXNlXCIpO1xuXHRcdFx0dGhpcy5wbGF5QnV0dG9uIS5jbGFzc0xpc3QuYWRkKFwic3BpbmUtcGxheWVyLWJ1dHRvbi1pY29uLXBsYXlcIik7XG5cdFx0fVxuXHR9XG5cblx0LyogU2V0cyBhIG5ldyBhbmltYXRpb24gYW5kIHZpZXdwb3J0IG9uIHRyYWNrIDAuICovXG5cdHNldEFuaW1hdGlvbiAoYW5pbWF0aW9uOiBzdHJpbmcgfCBBbmltYXRpb24sIGxvb3A6IGJvb2xlYW4gPSB0cnVlKTogVHJhY2tFbnRyeSB7XG5cdFx0YW5pbWF0aW9uID0gdGhpcy5zZXRWaWV3cG9ydChhbmltYXRpb24pO1xuXHRcdHJldHVybiB0aGlzLmFuaW1hdGlvblN0YXRlIS5zZXRBbmltYXRpb25XaXRoKDAsIGFuaW1hdGlvbiwgbG9vcCk7XG5cdH1cblxuXHQvKiBBZGRzIGEgbmV3IGFuaW1hdGlvbiBhbmQgdmlld3BvcnQgb24gdHJhY2sgMC4gKi9cblx0YWRkQW5pbWF0aW9uIChhbmltYXRpb246IHN0cmluZyB8IEFuaW1hdGlvbiwgbG9vcDogYm9vbGVhbiA9IHRydWUsIGRlbGF5OiBudW1iZXIgPSAwKTogVHJhY2tFbnRyeSB7XG5cdFx0YW5pbWF0aW9uID0gdGhpcy5zZXRWaWV3cG9ydChhbmltYXRpb24pO1xuXHRcdHJldHVybiB0aGlzLmFuaW1hdGlvblN0YXRlIS5hZGRBbmltYXRpb25XaXRoKDAsIGFuaW1hdGlvbiwgbG9vcCwgZGVsYXkpO1xuXHR9XG5cblx0LyogU2V0cyB0aGUgdmlld3BvcnQgZm9yIHRoZSBzcGVjaWZpZWQgYW5pbWF0aW9uLiAqL1xuXHRzZXRWaWV3cG9ydCAoYW5pbWF0aW9uOiBzdHJpbmcgfCBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuXHRcdGlmICh0eXBlb2YgYW5pbWF0aW9uID09IFwic3RyaW5nXCIpIHtcblx0XHRcdGxldCBmb3VuZEFuaW1hdGlvbiA9IHRoaXMuc2tlbGV0b24hLmRhdGEuZmluZEFuaW1hdGlvbihhbmltYXRpb24pO1xuXHRcdFx0aWYgKCFmb3VuZEFuaW1hdGlvbikgdGhyb3cgbmV3IEVycm9yKFwiQW5pbWF0aW9uIG5vdCBmb3VuZDogXCIgKyBhbmltYXRpb24pO1xuXHRcdFx0YW5pbWF0aW9uID0gZm91bmRBbmltYXRpb247XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c1ZpZXdwb3J0ID0gdGhpcy5jdXJyZW50Vmlld3BvcnQ7XG5cblx0XHQvLyBEZXRlcm1pbmUgdGhlIGJhc2Ugdmlld3BvcnQuXG5cdFx0bGV0IGdsb2JhbFZpZXdwb3J0ID0gdGhpcy5jb25maWcudmlld3BvcnQhO1xuXHRcdGxldCB2aWV3cG9ydCA9IHRoaXMuY3VycmVudFZpZXdwb3J0ID0ge1xuXHRcdFx0cGFkTGVmdDogZ2xvYmFsVmlld3BvcnQucGFkTGVmdCAhPT0gdm9pZCAwID8gZ2xvYmFsVmlld3BvcnQucGFkTGVmdCA6IFwiMTAlXCIsXG5cdFx0XHRwYWRSaWdodDogZ2xvYmFsVmlld3BvcnQucGFkUmlnaHQgIT09IHZvaWQgMCA/IGdsb2JhbFZpZXdwb3J0LnBhZFJpZ2h0IDogXCIxMCVcIixcblx0XHRcdHBhZFRvcDogZ2xvYmFsVmlld3BvcnQucGFkVG9wICE9PSB2b2lkIDAgPyBnbG9iYWxWaWV3cG9ydC5wYWRUb3AgOiBcIjEwJVwiLFxuXHRcdFx0cGFkQm90dG9tOiBnbG9iYWxWaWV3cG9ydC5wYWRCb3R0b20gIT09IHZvaWQgMCA/IGdsb2JhbFZpZXdwb3J0LnBhZEJvdHRvbSA6IFwiMTAlXCJcblx0XHR9IGFzIFZpZXdwb3J0O1xuXHRcdGlmIChnbG9iYWxWaWV3cG9ydC54ICE9PSB2b2lkIDAgJiYgZ2xvYmFsVmlld3BvcnQueSAhPT0gdm9pZCAwICYmIGdsb2JhbFZpZXdwb3J0LndpZHRoICYmIGdsb2JhbFZpZXdwb3J0LmhlaWdodCkge1xuXHRcdFx0dmlld3BvcnQueCA9IGdsb2JhbFZpZXdwb3J0Lng7XG5cdFx0XHR2aWV3cG9ydC55ID0gZ2xvYmFsVmlld3BvcnQueTtcblx0XHRcdHZpZXdwb3J0LndpZHRoID0gZ2xvYmFsVmlld3BvcnQud2lkdGg7XG5cdFx0XHR2aWV3cG9ydC5oZWlnaHQgPSBnbG9iYWxWaWV3cG9ydC5oZWlnaHQ7XG5cdFx0fSBlbHNlXG5cdFx0XHR0aGlzLmNhbGN1bGF0ZUFuaW1hdGlvblZpZXdwb3J0KGFuaW1hdGlvbiwgdmlld3BvcnQpO1xuXG5cdFx0Ly8gT3ZlcnJpZGUgd2l0aCB0aGUgYW5pbWF0aW9uIHNwZWNpZmljIHZpZXdwb3J0IGZvciB0aGUgZmluYWwgcmVzdWx0LlxuXHRcdGxldCB1c2VyQW5pbVZpZXdwb3J0ID0gdGhpcy5jb25maWcudmlld3BvcnQhLmFuaW1hdGlvbnMhW2FuaW1hdGlvbi5uYW1lXTtcblx0XHRpZiAodXNlckFuaW1WaWV3cG9ydCkge1xuXHRcdFx0aWYgKHVzZXJBbmltVmlld3BvcnQueCAhPT0gdm9pZCAwICYmIHVzZXJBbmltVmlld3BvcnQueSAhPT0gdm9pZCAwICYmIHVzZXJBbmltVmlld3BvcnQud2lkdGggJiYgdXNlckFuaW1WaWV3cG9ydC5oZWlnaHQpIHtcblx0XHRcdFx0dmlld3BvcnQueCA9IHVzZXJBbmltVmlld3BvcnQueDtcblx0XHRcdFx0dmlld3BvcnQueSA9IHVzZXJBbmltVmlld3BvcnQueTtcblx0XHRcdFx0dmlld3BvcnQud2lkdGggPSB1c2VyQW5pbVZpZXdwb3J0LndpZHRoO1xuXHRcdFx0XHR2aWV3cG9ydC5oZWlnaHQgPSB1c2VyQW5pbVZpZXdwb3J0LmhlaWdodDtcblx0XHRcdH1cblx0XHRcdGlmICh1c2VyQW5pbVZpZXdwb3J0LnBhZExlZnQgIT09IHZvaWQgMCkgdmlld3BvcnQucGFkTGVmdCA9IHVzZXJBbmltVmlld3BvcnQucGFkTGVmdDtcblx0XHRcdGlmICh1c2VyQW5pbVZpZXdwb3J0LnBhZFJpZ2h0ICE9PSB2b2lkIDApIHZpZXdwb3J0LnBhZFJpZ2h0ID0gdXNlckFuaW1WaWV3cG9ydC5wYWRSaWdodDtcblx0XHRcdGlmICh1c2VyQW5pbVZpZXdwb3J0LnBhZFRvcCAhPT0gdm9pZCAwKSB2aWV3cG9ydC5wYWRUb3AgPSB1c2VyQW5pbVZpZXdwb3J0LnBhZFRvcDtcblx0XHRcdGlmICh1c2VyQW5pbVZpZXdwb3J0LnBhZEJvdHRvbSAhPT0gdm9pZCAwKSB2aWV3cG9ydC5wYWRCb3R0b20gPSB1c2VyQW5pbVZpZXdwb3J0LnBhZEJvdHRvbTtcblx0XHR9XG5cblx0XHQvLyBUcmFuc2xhdGUgcGVyY2VudGFnZSBwYWRkaW5nIHRvIHdvcmxkIHVuaXRzLlxuXHRcdHZpZXdwb3J0LnBhZExlZnQgPSB0aGlzLnBlcmNlbnRhZ2VUb1dvcmxkVW5pdCh2aWV3cG9ydC53aWR0aCwgdmlld3BvcnQucGFkTGVmdCk7XG5cdFx0dmlld3BvcnQucGFkUmlnaHQgPSB0aGlzLnBlcmNlbnRhZ2VUb1dvcmxkVW5pdCh2aWV3cG9ydC53aWR0aCwgdmlld3BvcnQucGFkUmlnaHQpO1xuXHRcdHZpZXdwb3J0LnBhZEJvdHRvbSA9IHRoaXMucGVyY2VudGFnZVRvV29ybGRVbml0KHZpZXdwb3J0LmhlaWdodCwgdmlld3BvcnQucGFkQm90dG9tKTtcblx0XHR2aWV3cG9ydC5wYWRUb3AgPSB0aGlzLnBlcmNlbnRhZ2VUb1dvcmxkVW5pdCh2aWV3cG9ydC5oZWlnaHQsIHZpZXdwb3J0LnBhZFRvcCk7XG5cblx0XHR0aGlzLnZpZXdwb3J0VHJhbnNpdGlvblN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cdFx0cmV0dXJuIGFuaW1hdGlvbjtcblx0fVxuXG5cdHByaXZhdGUgcGVyY2VudGFnZVRvV29ybGRVbml0IChzaXplOiBudW1iZXIsIHBlcmNlbnRhZ2VPckFic29sdXRlOiBzdHJpbmcgfCBudW1iZXIpOiBudW1iZXIge1xuXHRcdGlmICh0eXBlb2YgcGVyY2VudGFnZU9yQWJzb2x1dGUgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRyZXR1cm4gc2l6ZSAqIHBhcnNlRmxvYXQocGVyY2VudGFnZU9yQWJzb2x1dGUuc3Vic3RyKDAsIHBlcmNlbnRhZ2VPckFic29sdXRlLmxlbmd0aCAtIDEpKSAvIDEwMDtcblx0XHRyZXR1cm4gcGVyY2VudGFnZU9yQWJzb2x1dGU7XG5cdH1cblxuXHRwcml2YXRlIGNhbGN1bGF0ZUFuaW1hdGlvblZpZXdwb3J0IChhbmltYXRpb246IEFuaW1hdGlvbiwgdmlld3BvcnQ6IFZpZXdwb3J0KSB7XG5cdFx0dGhpcy5za2VsZXRvbiEuc2V0VG9TZXR1cFBvc2UoKTtcblxuXHRcdGxldCBzdGVwcyA9IDEwMCwgc3RlcFRpbWUgPSBhbmltYXRpb24uZHVyYXRpb24gPyBhbmltYXRpb24uZHVyYXRpb24gLyBzdGVwcyA6IDAsIHRpbWUgPSAwO1xuXHRcdGxldCBtaW5YID0gMTAwMDAwMDAwLCBtYXhYID0gLTEwMDAwMDAwMCwgbWluWSA9IDEwMDAwMDAwMCwgbWF4WSA9IC0xMDAwMDAwMDA7XG5cdFx0bGV0IG9mZnNldCA9IG5ldyBWZWN0b3IyKCksIHNpemUgPSBuZXcgVmVjdG9yMigpO1xuXG5cdFx0Y29uc3QgdGVtcEFycmF5ID0gbmV3IEFycmF5PG51bWJlcj4oMik7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzdGVwczsgaSsrLCB0aW1lICs9IHN0ZXBUaW1lKSB7XG5cdFx0XHRhbmltYXRpb24uYXBwbHkodGhpcy5za2VsZXRvbiEsIHRpbWUsIHRpbWUsIGZhbHNlLCBbXSwgMSwgTWl4QmxlbmQuc2V0dXAsIE1peERpcmVjdGlvbi5taXhJbik7XG5cdFx0XHR0aGlzLnNrZWxldG9uIS51cGRhdGVXb3JsZFRyYW5zZm9ybShQaHlzaWNzLnVwZGF0ZSk7XG5cdFx0XHR0aGlzLnNrZWxldG9uIS5nZXRCb3VuZHMob2Zmc2V0LCBzaXplLCB0ZW1wQXJyYXksIHRoaXMuc2NlbmVSZW5kZXJlciEuc2tlbGV0b25SZW5kZXJlci5nZXRTa2VsZXRvbkNsaXBwaW5nKCkpO1xuXG5cdFx0XHRpZiAoIWlzTmFOKG9mZnNldC54KSAmJiAhaXNOYU4ob2Zmc2V0LnkpICYmICFpc05hTihzaXplLngpICYmICFpc05hTihzaXplLnkpKSB7XG5cdFx0XHRcdG1pblggPSBNYXRoLm1pbihvZmZzZXQueCwgbWluWCk7XG5cdFx0XHRcdG1heFggPSBNYXRoLm1heChvZmZzZXQueCArIHNpemUueCwgbWF4WCk7XG5cdFx0XHRcdG1pblkgPSBNYXRoLm1pbihvZmZzZXQueSwgbWluWSk7XG5cdFx0XHRcdG1heFkgPSBNYXRoLm1heChvZmZzZXQueSArIHNpemUueSwgbWF4WSk7XG5cdFx0XHR9IGVsc2Vcblx0XHRcdFx0dGhpcy5zaG93RXJyb3IoXCJBbmltYXRpb24gYm91bmRzIGFyZSBpbnZhbGlkOiBcIiArIGFuaW1hdGlvbi5uYW1lKTtcblx0XHR9XG5cblx0XHR2aWV3cG9ydC54ID0gbWluWDtcblx0XHR2aWV3cG9ydC55ID0gbWluWTtcblx0XHR2aWV3cG9ydC53aWR0aCA9IG1heFggLSBtaW5YO1xuXHRcdHZpZXdwb3J0LmhlaWdodCA9IG1heFkgLSBtaW5ZO1xuXHR9XG5cblx0cHJpdmF0ZSBkcmF3RnJhbWUgKHJlcXVlc3ROZXh0RnJhbWUgPSB0cnVlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGlmICh0aGlzLmVycm9yKSByZXR1cm47XG5cdFx0XHRpZiAodGhpcy5kaXNwb3NlZCkgcmV0dXJuO1xuXHRcdFx0aWYgKHJlcXVlc3ROZXh0RnJhbWUgJiYgIXRoaXMuc3RvcFJlcXVlc3RBbmltYXRpb25GcmFtZSkgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMuZHJhd0ZyYW1lKCkpO1xuXG5cdFx0XHRsZXQgZG9jID0gZG9jdW1lbnQgYXMgYW55O1xuXHRcdFx0bGV0IGlzRnVsbHNjcmVlbiA9IGRvYy5mdWxsc2NyZWVuRWxlbWVudCB8fCBkb2Mud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQgfHwgZG9jLm1vekZ1bGxTY3JlZW5FbGVtZW50IHx8IGRvYy5tc0Z1bGxzY3JlZW5FbGVtZW50O1xuXHRcdFx0bGV0IGJnID0gaXNGdWxsc2NyZWVuID8gdGhpcy5iZ0Z1bGxzY3JlZW4gOiB0aGlzLmJnO1xuXG5cdFx0XHR0aGlzLnRpbWUudXBkYXRlKCk7XG5cdFx0XHRsZXQgZGVsdGEgPSB0aGlzLnRpbWUuZGVsdGE7XG5cblx0XHRcdC8vIExvYWQgdGhlIHNrZWxldG9uIGlmIHRoZSBhc3NldHMgYXJlIHJlYWR5LlxuXHRcdFx0bGV0IGxvYWRpbmcgPSAhdGhpcy5hc3NldE1hbmFnZXIhLmlzTG9hZGluZ0NvbXBsZXRlKCk7XG5cdFx0XHRpZiAoIXRoaXMuc2tlbGV0b24gJiYgIWxvYWRpbmcpIHRoaXMubG9hZFNrZWxldG9uKCk7XG5cdFx0XHRsZXQgc2tlbGV0b24gPSB0aGlzLnNrZWxldG9uITtcblx0XHRcdGxldCBjb25maWcgPSB0aGlzLmNvbmZpZyE7XG5cdFx0XHRpZiAoc2tlbGV0b24pIHtcblx0XHRcdFx0Ly8gUmVzaXplIHRoZSBjYW52YXMuXG5cdFx0XHRcdGxldCByZW5kZXJlciA9IHRoaXMuc2NlbmVSZW5kZXJlciE7XG5cdFx0XHRcdHJlbmRlcmVyLnJlc2l6ZShSZXNpemVNb2RlLkV4cGFuZCk7XG5cblx0XHRcdFx0bGV0IHBsYXlEZWx0YSA9IHRoaXMucGF1c2VkID8gMCA6IGRlbHRhICogdGhpcy5zcGVlZDtcblx0XHRcdFx0aWYgKGNvbmZpZy5mcmFtZSkgY29uZmlnLmZyYW1lKHRoaXMsIHBsYXlEZWx0YSk7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIGFuaW1hdGlvbiB0aW1lIGFuZCBwb3NlIHRoZSBza2VsZXRvbi5cblx0XHRcdFx0aWYgKCF0aGlzLnBhdXNlZCkge1xuXHRcdFx0XHRcdHNrZWxldG9uLnVwZGF0ZShwbGF5RGVsdGEpO1xuXHRcdFx0XHRcdHRoaXMuYW5pbWF0aW9uU3RhdGUhLnVwZGF0ZShwbGF5RGVsdGEpO1xuXHRcdFx0XHRcdHRoaXMuYW5pbWF0aW9uU3RhdGUhLmFwcGx5KHNrZWxldG9uKTtcblx0XHRcdFx0XHRpZiAoY29uZmlnLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKVxuXHRcdFx0XHRcdFx0Y29uZmlnLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKHRoaXMsIHBsYXlEZWx0YSk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0c2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oUGh5c2ljcy51cGRhdGUpO1xuXG5cdFx0XHRcdFx0aWYgKGNvbmZpZy5zaG93Q29udHJvbHMpIHtcblx0XHRcdFx0XHRcdHRoaXMucGxheVRpbWUgKz0gcGxheURlbHRhO1xuXHRcdFx0XHRcdFx0bGV0IGVudHJ5ID0gdGhpcy5hbmltYXRpb25TdGF0ZSEuZ2V0Q3VycmVudCgwKTtcblx0XHRcdFx0XHRcdGlmIChlbnRyeSkge1xuXHRcdFx0XHRcdFx0XHRsZXQgZHVyYXRpb24gPSBlbnRyeS5hbmltYXRpb24hLmR1cmF0aW9uO1xuXHRcdFx0XHRcdFx0XHR3aGlsZSAodGhpcy5wbGF5VGltZSA+PSBkdXJhdGlvbiAmJiBkdXJhdGlvbiAhPSAwKVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMucGxheVRpbWUgLT0gZHVyYXRpb247XG5cdFx0XHRcdFx0XHRcdHRoaXMucGxheVRpbWUgPSBNYXRoLm1heCgwLCBNYXRoLm1pbih0aGlzLnBsYXlUaW1lLCBkdXJhdGlvbikpO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnRpbWVsaW5lU2xpZGVyIS5zZXRWYWx1ZSh0aGlzLnBsYXlUaW1lIC8gZHVyYXRpb24pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIERldGVybWluZSB0aGUgdmlld3BvcnQuXG5cdFx0XHRcdGxldCB2aWV3cG9ydCA9IHRoaXMudmlld3BvcnQ7XG5cdFx0XHRcdHZpZXdwb3J0LnggPSB0aGlzLmN1cnJlbnRWaWV3cG9ydC54IC0gKHRoaXMuY3VycmVudFZpZXdwb3J0LnBhZExlZnQgYXMgbnVtYmVyKTtcblx0XHRcdFx0dmlld3BvcnQueSA9IHRoaXMuY3VycmVudFZpZXdwb3J0LnkgLSAodGhpcy5jdXJyZW50Vmlld3BvcnQucGFkQm90dG9tIGFzIG51bWJlcik7XG5cdFx0XHRcdHZpZXdwb3J0LndpZHRoID0gdGhpcy5jdXJyZW50Vmlld3BvcnQud2lkdGggKyAodGhpcy5jdXJyZW50Vmlld3BvcnQucGFkTGVmdCBhcyBudW1iZXIpICsgKHRoaXMuY3VycmVudFZpZXdwb3J0LnBhZFJpZ2h0IGFzIG51bWJlcik7XG5cdFx0XHRcdHZpZXdwb3J0LmhlaWdodCA9IHRoaXMuY3VycmVudFZpZXdwb3J0LmhlaWdodCArICh0aGlzLmN1cnJlbnRWaWV3cG9ydC5wYWRCb3R0b20gYXMgbnVtYmVyKSArICh0aGlzLmN1cnJlbnRWaWV3cG9ydC5wYWRUb3AgYXMgbnVtYmVyKTtcblxuXHRcdFx0XHRpZiAodGhpcy5wcmV2aW91c1ZpZXdwb3J0KSB7XG5cdFx0XHRcdFx0bGV0IHRyYW5zaXRpb25BbHBoYSA9IChwZXJmb3JtYW5jZS5ub3coKSAtIHRoaXMudmlld3BvcnRUcmFuc2l0aW9uU3RhcnQpIC8gMTAwMCAvIGNvbmZpZy52aWV3cG9ydCEudHJhbnNpdGlvblRpbWUhO1xuXHRcdFx0XHRcdGlmICh0cmFuc2l0aW9uQWxwaGEgPCAxKSB7XG5cdFx0XHRcdFx0XHRsZXQgeCA9IHRoaXMucHJldmlvdXNWaWV3cG9ydC54IC0gKHRoaXMucHJldmlvdXNWaWV3cG9ydC5wYWRMZWZ0IGFzIG51bWJlcik7XG5cdFx0XHRcdFx0XHRsZXQgeSA9IHRoaXMucHJldmlvdXNWaWV3cG9ydC55IC0gKHRoaXMucHJldmlvdXNWaWV3cG9ydC5wYWRCb3R0b20gYXMgbnVtYmVyKTtcblx0XHRcdFx0XHRcdGxldCB3aWR0aCA9IHRoaXMucHJldmlvdXNWaWV3cG9ydC53aWR0aCArICh0aGlzLnByZXZpb3VzVmlld3BvcnQucGFkTGVmdCBhcyBudW1iZXIpICsgKHRoaXMucHJldmlvdXNWaWV3cG9ydC5wYWRSaWdodCBhcyBudW1iZXIpO1xuXHRcdFx0XHRcdFx0bGV0IGhlaWdodCA9IHRoaXMucHJldmlvdXNWaWV3cG9ydC5oZWlnaHQgKyAodGhpcy5wcmV2aW91c1ZpZXdwb3J0LnBhZEJvdHRvbSBhcyBudW1iZXIpICsgKHRoaXMucHJldmlvdXNWaWV3cG9ydC5wYWRUb3AgYXMgbnVtYmVyKTtcblx0XHRcdFx0XHRcdHZpZXdwb3J0LnggPSB4ICsgKHZpZXdwb3J0LnggLSB4KSAqIHRyYW5zaXRpb25BbHBoYTtcblx0XHRcdFx0XHRcdHZpZXdwb3J0LnkgPSB5ICsgKHZpZXdwb3J0LnkgLSB5KSAqIHRyYW5zaXRpb25BbHBoYTtcblx0XHRcdFx0XHRcdHZpZXdwb3J0LndpZHRoID0gd2lkdGggKyAodmlld3BvcnQud2lkdGggLSB3aWR0aCkgKiB0cmFuc2l0aW9uQWxwaGE7XG5cdFx0XHRcdFx0XHR2aWV3cG9ydC5oZWlnaHQgPSBoZWlnaHQgKyAodmlld3BvcnQuaGVpZ2h0IC0gaGVpZ2h0KSAqIHRyYW5zaXRpb25BbHBoYTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZW5kZXJlci5jYW1lcmEuem9vbSA9IHRoaXMuY2FudmFzIS5oZWlnaHQgLyB0aGlzLmNhbnZhcyEud2lkdGggPiB2aWV3cG9ydC5oZWlnaHQgLyB2aWV3cG9ydC53aWR0aFxuXHRcdFx0XHRcdD8gdmlld3BvcnQud2lkdGggLyB0aGlzLmNhbnZhcyEud2lkdGggOiB2aWV3cG9ydC5oZWlnaHQgLyB0aGlzLmNhbnZhcyEuaGVpZ2h0O1xuXHRcdFx0XHRyZW5kZXJlci5jYW1lcmEucG9zaXRpb24ueCA9IHZpZXdwb3J0LnggKyB2aWV3cG9ydC53aWR0aCAvIDI7XG5cdFx0XHRcdHJlbmRlcmVyLmNhbWVyYS5wb3NpdGlvbi55ID0gdmlld3BvcnQueSArIHZpZXdwb3J0LmhlaWdodCAvIDI7XG5cblx0XHRcdFx0Ly8gQ2xlYXIgdGhlIHNjcmVlbi5cblx0XHRcdFx0bGV0IGdsID0gdGhpcy5jb250ZXh0IS5nbDtcblx0XHRcdFx0Z2wuY2xlYXJDb2xvcihiZy5yLCBiZy5nLCBiZy5iLCBiZy5hKTtcblx0XHRcdFx0Z2wuY2xlYXIoZ2wuQ09MT1JfQlVGRkVSX0JJVCk7XG5cblx0XHRcdFx0aWYgKGNvbmZpZy51cGRhdGUpIGNvbmZpZy51cGRhdGUodGhpcywgcGxheURlbHRhKTtcblxuXHRcdFx0XHRyZW5kZXJlci5iZWdpbigpO1xuXG5cdFx0XHRcdC8vIERyYXcgdGhlIGJhY2tncm91bmQgaW1hZ2UuXG5cdFx0XHRcdGxldCBiZ0ltYWdlID0gY29uZmlnLmJhY2tncm91bmRJbWFnZTtcblx0XHRcdFx0aWYgKGJnSW1hZ2UpIHtcblx0XHRcdFx0XHRsZXQgdGV4dHVyZSA9IHRoaXMuYXNzZXRNYW5hZ2VyIS5yZXF1aXJlKGJnSW1hZ2UudXJsKTtcblx0XHRcdFx0XHRpZiAoYmdJbWFnZS54ICE9PSB2b2lkIDAgJiYgYmdJbWFnZS55ICE9PSB2b2lkIDAgJiYgYmdJbWFnZS53aWR0aCAmJiBiZ0ltYWdlLmhlaWdodClcblx0XHRcdFx0XHRcdHJlbmRlcmVyLmRyYXdUZXh0dXJlKHRleHR1cmUsIGJnSW1hZ2UueCwgYmdJbWFnZS55LCBiZ0ltYWdlLndpZHRoLCBiZ0ltYWdlLmhlaWdodCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cmVuZGVyZXIuZHJhd1RleHR1cmUodGV4dHVyZSwgdmlld3BvcnQueCwgdmlld3BvcnQueSwgdmlld3BvcnQud2lkdGgsIHZpZXdwb3J0LmhlaWdodCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBEcmF3IHRoZSBza2VsZXRvbiBhbmQgZGVidWcgb3V0cHV0LlxuXHRcdFx0XHRyZW5kZXJlci5kcmF3U2tlbGV0b24oc2tlbGV0b24sIGNvbmZpZy5wcmVtdWx0aXBsaWVkQWxwaGEpO1xuXHRcdFx0XHRpZiAoTnVtYmVyKHJlbmRlcmVyLnNrZWxldG9uRGVidWdSZW5kZXJlci5kcmF3Qm9uZXMgPSBjb25maWcuZGVidWchLmJvbmVzISA/PyBmYWxzZSlcblx0XHRcdFx0XHQrIE51bWJlcihyZW5kZXJlci5za2VsZXRvbkRlYnVnUmVuZGVyZXIuZHJhd0JvdW5kaW5nQm94ZXMgPSBjb25maWcuZGVidWchLmJvdW5kcyEgPz8gZmFsc2UpXG5cdFx0XHRcdFx0KyBOdW1iZXIocmVuZGVyZXIuc2tlbGV0b25EZWJ1Z1JlbmRlcmVyLmRyYXdDbGlwcGluZyA9IGNvbmZpZy5kZWJ1ZyEuY2xpcHBpbmchID8/IGZhbHNlKVxuXHRcdFx0XHRcdCsgTnVtYmVyKHJlbmRlcmVyLnNrZWxldG9uRGVidWdSZW5kZXJlci5kcmF3TWVzaEh1bGwgPSBjb25maWcuZGVidWchLmh1bGxzISA/PyBmYWxzZSlcblx0XHRcdFx0XHQrIE51bWJlcihyZW5kZXJlci5za2VsZXRvbkRlYnVnUmVuZGVyZXIuZHJhd1BhdGhzID0gY29uZmlnLmRlYnVnIS5wYXRocyEgPz8gZmFsc2UpXG5cdFx0XHRcdFx0KyBOdW1iZXIocmVuZGVyZXIuc2tlbGV0b25EZWJ1Z1JlbmRlcmVyLmRyYXdSZWdpb25BdHRhY2htZW50cyA9IGNvbmZpZy5kZWJ1ZyEucmVnaW9ucyEgPz8gZmFsc2UpXG5cdFx0XHRcdFx0KyBOdW1iZXIocmVuZGVyZXIuc2tlbGV0b25EZWJ1Z1JlbmRlcmVyLmRyYXdNZXNoVHJpYW5nbGVzID0gY29uZmlnLmRlYnVnIS5tZXNoZXMhID8/IGZhbHNlKSA+IDBcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0cmVuZGVyZXIuZHJhd1NrZWxldG9uRGVidWcoc2tlbGV0b24sIGNvbmZpZy5wcmVtdWx0aXBsaWVkQWxwaGEpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRHJhdyB0aGUgY29udHJvbCBib25lcy5cblx0XHRcdFx0bGV0IGNvbnRyb2xCb25lcyA9IGNvbmZpZy5jb250cm9sQm9uZXMhO1xuXHRcdFx0XHRpZiAoY29udHJvbEJvbmVzLmxlbmd0aCkge1xuXHRcdFx0XHRcdGxldCBzZWxlY3RlZEJvbmVzID0gdGhpcy5zZWxlY3RlZEJvbmVzO1xuXHRcdFx0XHRcdGdsLmxpbmVXaWR0aCgyKTtcblx0XHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNvbnRyb2xCb25lcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0bGV0IGJvbmUgPSBza2VsZXRvbi5maW5kQm9uZShjb250cm9sQm9uZXNbaV0pO1xuXHRcdFx0XHRcdFx0aWYgKCFib25lKSBjb250aW51ZTtcblx0XHRcdFx0XHRcdGxldCBjb2xvcklubmVyID0gc2VsZWN0ZWRCb25lc1tpXSA/IEJPTkVfSU5ORVJfT1ZFUiA6IEJPTkVfSU5ORVI7XG5cdFx0XHRcdFx0XHRsZXQgY29sb3JPdXRlciA9IHNlbGVjdGVkQm9uZXNbaV0gPyBCT05FX09VVEVSX09WRVIgOiBCT05FX09VVEVSO1xuXHRcdFx0XHRcdFx0cmVuZGVyZXIuY2lyY2xlKHRydWUsIHNrZWxldG9uLnggKyBib25lLndvcmxkWCwgc2tlbGV0b24ueSArIGJvbmUud29ybGRZLCAyMCwgY29sb3JJbm5lcik7XG5cdFx0XHRcdFx0XHRyZW5kZXJlci5jaXJjbGUoZmFsc2UsIHNrZWxldG9uLnggKyBib25lLndvcmxkWCwgc2tlbGV0b24ueSArIGJvbmUud29ybGRZLCAyMCwgY29sb3JPdXRlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRHJhdyB0aGUgdmlld3BvcnQgYm91bmRzLlxuXHRcdFx0XHRpZiAoY29uZmlnLnZpZXdwb3J0IS5kZWJ1Z1JlbmRlcikge1xuXHRcdFx0XHRcdGdsLmxpbmVXaWR0aCgxKTtcblx0XHRcdFx0XHRyZW5kZXJlci5yZWN0KGZhbHNlLCB0aGlzLmN1cnJlbnRWaWV3cG9ydC54LCB0aGlzLmN1cnJlbnRWaWV3cG9ydC55LCB0aGlzLmN1cnJlbnRWaWV3cG9ydC53aWR0aCwgdGhpcy5jdXJyZW50Vmlld3BvcnQuaGVpZ2h0LCBDb2xvci5HUkVFTik7XG5cdFx0XHRcdFx0cmVuZGVyZXIucmVjdChmYWxzZSwgdmlld3BvcnQueCwgdmlld3BvcnQueSwgdmlld3BvcnQud2lkdGgsIHZpZXdwb3J0LmhlaWdodCwgQ29sb3IuUkVEKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlbmRlcmVyLmVuZCgpO1xuXG5cdFx0XHRcdGlmIChjb25maWcuZHJhdykgY29uZmlnLmRyYXcodGhpcywgcGxheURlbHRhKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRHJhdyB0aGUgbG9hZGluZyBzY3JlZW4uXG5cdFx0XHRpZiAoY29uZmlnLnNob3dMb2FkaW5nKSB7XG5cdFx0XHRcdHRoaXMubG9hZGluZ1NjcmVlbiEuYmFja2dyb3VuZENvbG9yLnNldEZyb21Db2xvcihiZyk7XG5cdFx0XHRcdHRoaXMubG9hZGluZ1NjcmVlbiEuZHJhdyghbG9hZGluZyk7XG5cdFx0XHR9XG5cdFx0XHRpZiAobG9hZGluZyAmJiBjb25maWcubG9hZGluZykgY29uZmlnLmxvYWRpbmcodGhpcywgZGVsdGEpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHRoaXMuc2hvd0Vycm9yKGBFcnJvcjogVW5hYmxlIHRvIHJlbmRlciBza2VsZXRvbi5cXG4keyhlIGFzIGFueSkubWVzc2FnZX1gLCBlIGFzIGFueSk7XG5cdFx0fVxuXHR9XG5cblx0c3RhcnRSZW5kZXJpbmcgKCkge1xuXHRcdHRoaXMuc3RvcFJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZhbHNlO1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLmRyYXdGcmFtZSgpKTtcblx0fVxuXG5cdHN0b3BSZW5kZXJpbmcgKCkge1xuXHRcdHRoaXMuc3RvcFJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHRydWU7XG5cdH1cblxuXHRwcml2YXRlIGhpZGVQb3B1cCAoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLnBvcHVwICE9IG51bGwgJiYgdGhpcy5wb3B1cC5oaWRlKGlkKTtcblx0fVxuXG5cdHByaXZhdGUgc2hvd1NwZWVkRGlhbG9nIChzcGVlZEJ1dHRvbjogSFRNTEVsZW1lbnQpIHtcblx0XHRsZXQgaWQgPSBcInNwZWVkXCI7XG5cdFx0aWYgKHRoaXMuaGlkZVBvcHVwKGlkKSkgcmV0dXJuO1xuXG5cdFx0bGV0IHBvcHVwID0gbmV3IFBvcHVwKGlkLCBzcGVlZEJ1dHRvbiwgdGhpcywgdGhpcy5wbGF5ZXJDb250cm9scyEsIC8qaHRtbCovYFxuPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1wb3B1cC10aXRsZVwiPlNwZWVkPC9kaXY+XG48aHI+XG48ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLXJvd1wiIHN0eWxlPVwiYWxpZ24taXRlbXM6Y2VudGVyO3BhZGRpbmc6OHB4XCI+XG48ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLWNvbHVtblwiPlxuXHQ8ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLXNwZWVkLXNsaWRlclwiIHN0eWxlPVwibWFyZ2luLWJvdHRvbTo0cHhcIj48L2Rpdj5cblx0PGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1yb3dcIiBzdHlsZT1cImp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuXCI+PGRpdj4wLjF4PC9kaXY+PGRpdj4xeDwvZGl2PjxkaXY+Mng8L2Rpdj48L2Rpdj5cbjwvZGl2PlxuPC9kaXY+YCk7XG5cdFx0bGV0IHNsaWRlciA9IG5ldyBTbGlkZXIoMiwgMC4xLCB0cnVlKTtcblx0XHRmaW5kV2l0aENsYXNzKHBvcHVwLmRvbSwgXCJzcGluZS1wbGF5ZXItc3BlZWQtc2xpZGVyXCIpLmFwcGVuZENoaWxkKHNsaWRlci5jcmVhdGUoKSk7XG5cdFx0c2xpZGVyLnNldFZhbHVlKHRoaXMuc3BlZWQgLyAyKTtcblx0XHRzbGlkZXIuY2hhbmdlID0gKHBlcmNlbnRhZ2UpID0+IHRoaXMuc3BlZWQgPSBwZXJjZW50YWdlICogMjtcblx0XHRwb3B1cC5zaG93KCk7XG5cdH1cblxuXHRwcml2YXRlIHNob3dBbmltYXRpb25zRGlhbG9nIChhbmltYXRpb25zQnV0dG9uOiBIVE1MRWxlbWVudCkge1xuXHRcdGxldCBpZCA9IFwiYW5pbWF0aW9uc1wiO1xuXHRcdGlmICh0aGlzLmhpZGVQb3B1cChpZCkpIHJldHVybjtcblx0XHRpZiAoIXRoaXMuc2tlbGV0b24gfHwgIXRoaXMuc2tlbGV0b24uZGF0YS5hbmltYXRpb25zLmxlbmd0aCkgcmV0dXJuO1xuXG5cdFx0bGV0IHBvcHVwID0gbmV3IFBvcHVwKGlkLCBhbmltYXRpb25zQnV0dG9uLCB0aGlzLCB0aGlzLnBsYXllckNvbnRyb2xzISxcblx0XHRcdFx0LypodG1sKi9gPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1wb3B1cC10aXRsZVwiPkFuaW1hdGlvbnM8L2Rpdj48aHI+PHVsIGNsYXNzPVwic3BpbmUtcGxheWVyLWxpc3RcIj48L3VsPmApO1xuXG5cdFx0bGV0IHJvd3MgPSBmaW5kV2l0aENsYXNzKHBvcHVwLmRvbSwgXCJzcGluZS1wbGF5ZXItbGlzdFwiKTtcblx0XHR0aGlzLnNrZWxldG9uLmRhdGEuYW5pbWF0aW9ucy5mb3JFYWNoKChhbmltYXRpb24pID0+IHtcblx0XHRcdC8vIFNraXAgYW5pbWF0aW9ucyBub3Qgd2hpdGVsaXN0ZWQgaWYgYSB3aGl0ZWxpc3Qgd2FzIGdpdmVuLlxuXHRcdFx0aWYgKHRoaXMuY29uZmlnLmFuaW1hdGlvbnMgJiYgdGhpcy5jb25maWcuYW5pbWF0aW9ucy5pbmRleE9mKGFuaW1hdGlvbi5uYW1lKSA8IDApIHJldHVybjtcblxuXHRcdFx0bGV0IHJvdyA9IGNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0LypodG1sKi9gPGxpIGNsYXNzPVwic3BpbmUtcGxheWVyLWxpc3QtaXRlbSBzZWxlY3RhYmxlXCI+PGRpdiBjbGFzcz1cInNlbGVjdGFibGUtY2lyY2xlXCI+PC9kaXY+PGRpdiBjbGFzcz1cInNlbGVjdGFibGUtdGV4dFwiPjwvZGl2PjwvbGk+YCk7XG5cdFx0XHRpZiAoYW5pbWF0aW9uLm5hbWUgPT0gdGhpcy5jb25maWcuYW5pbWF0aW9uKSByb3cuY2xhc3NMaXN0LmFkZChcInNlbGVjdGVkXCIpO1xuXHRcdFx0ZmluZFdpdGhDbGFzcyhyb3csIFwic2VsZWN0YWJsZS10ZXh0XCIpLmlubmVyVGV4dCA9IGFuaW1hdGlvbi5uYW1lO1xuXHRcdFx0cm93cy5hcHBlbmRDaGlsZChyb3cpO1xuXHRcdFx0cm93Lm9uY2xpY2sgPSAoKSA9PiB7XG5cdFx0XHRcdHJlbW92ZUNsYXNzKHJvd3MuY2hpbGRyZW4sIFwic2VsZWN0ZWRcIik7XG5cdFx0XHRcdHJvdy5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XG5cdFx0XHRcdHRoaXMuY29uZmlnLmFuaW1hdGlvbiA9IGFuaW1hdGlvbi5uYW1lO1xuXHRcdFx0XHR0aGlzLnBsYXlUaW1lID0gMDtcblx0XHRcdFx0dGhpcy5zZXRBbmltYXRpb24oYW5pbWF0aW9uLm5hbWUpO1xuXHRcdFx0XHR0aGlzLnBsYXkoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRwb3B1cC5zaG93KCk7XG5cdH1cblxuXHRwcml2YXRlIHNob3dTa2luc0RpYWxvZyAoc2tpbkJ1dHRvbjogSFRNTEVsZW1lbnQpIHtcblx0XHRsZXQgaWQgPSBcInNraW5zXCI7XG5cdFx0aWYgKHRoaXMuaGlkZVBvcHVwKGlkKSkgcmV0dXJuO1xuXHRcdGlmICghdGhpcy5za2VsZXRvbiB8fCAhdGhpcy5za2VsZXRvbi5kYXRhLmFuaW1hdGlvbnMubGVuZ3RoKSByZXR1cm47XG5cblx0XHRsZXQgcG9wdXAgPSBuZXcgUG9wdXAoaWQsIHNraW5CdXR0b24sIHRoaXMsIHRoaXMucGxheWVyQ29udHJvbHMhLFxuXHRcdFx0XHQvKmh0bWwqL2A8ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLXBvcHVwLXRpdGxlXCI+U2tpbnM8L2Rpdj48aHI+PHVsIGNsYXNzPVwic3BpbmUtcGxheWVyLWxpc3RcIj48L3VsPmApO1xuXG5cdFx0bGV0IHJvd3MgPSBmaW5kV2l0aENsYXNzKHBvcHVwLmRvbSwgXCJzcGluZS1wbGF5ZXItbGlzdFwiKTtcblx0XHR0aGlzLnNrZWxldG9uLmRhdGEuc2tpbnMuZm9yRWFjaCgoc2tpbikgPT4ge1xuXHRcdFx0Ly8gU2tpcCBza2lucyBub3Qgd2hpdGVsaXN0ZWQgaWYgYSB3aGl0ZWxpc3Qgd2FzIGdpdmVuLlxuXHRcdFx0aWYgKHRoaXMuY29uZmlnLnNraW5zICYmIHRoaXMuY29uZmlnLnNraW5zLmluZGV4T2Yoc2tpbi5uYW1lKSA8IDApIHJldHVybjtcblxuXHRcdFx0bGV0IHJvdyA9IGNyZWF0ZUVsZW1lbnQoLypodG1sKi9gPGxpIGNsYXNzPVwic3BpbmUtcGxheWVyLWxpc3QtaXRlbSBzZWxlY3RhYmxlXCI+PGRpdiBjbGFzcz1cInNlbGVjdGFibGUtY2lyY2xlXCI+PC9kaXY+PGRpdiBjbGFzcz1cInNlbGVjdGFibGUtdGV4dFwiPjwvZGl2PjwvbGk+YCk7XG5cdFx0XHRpZiAoc2tpbi5uYW1lID09IHRoaXMuY29uZmlnLnNraW4pIHJvdy5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XG5cdFx0XHRmaW5kV2l0aENsYXNzKHJvdywgXCJzZWxlY3RhYmxlLXRleHRcIikuaW5uZXJUZXh0ID0gc2tpbi5uYW1lO1xuXHRcdFx0cm93cy5hcHBlbmRDaGlsZChyb3cpO1xuXHRcdFx0cm93Lm9uY2xpY2sgPSAoKSA9PiB7XG5cdFx0XHRcdHJlbW92ZUNsYXNzKHJvd3MuY2hpbGRyZW4sIFwic2VsZWN0ZWRcIik7XG5cdFx0XHRcdHJvdy5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XG5cdFx0XHRcdHRoaXMuY29uZmlnLnNraW4gPSBza2luLm5hbWU7XG5cdFx0XHRcdHRoaXMuc2tlbGV0b24hLnNldFNraW5CeU5hbWUodGhpcy5jb25maWcuc2tpbik7XG5cdFx0XHRcdHRoaXMuc2tlbGV0b24hLnNldFNsb3RzVG9TZXR1cFBvc2UoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRwb3B1cC5zaG93KCk7XG5cdH1cblxuXHRwcml2YXRlIHNob3dTZXR0aW5nc0RpYWxvZyAoc2V0dGluZ3NCdXR0b246IEhUTUxFbGVtZW50KSB7XG5cdFx0bGV0IGlkID0gXCJzZXR0aW5nc1wiO1xuXHRcdGlmICh0aGlzLmhpZGVQb3B1cChpZCkpIHJldHVybjtcblx0XHRpZiAoIXRoaXMuc2tlbGV0b24gfHwgIXRoaXMuc2tlbGV0b24uZGF0YS5hbmltYXRpb25zLmxlbmd0aCkgcmV0dXJuO1xuXG5cdFx0bGV0IHBvcHVwID0gbmV3IFBvcHVwKGlkLCBzZXR0aW5nc0J1dHRvbiwgdGhpcywgdGhpcy5wbGF5ZXJDb250cm9scyEsIC8qaHRtbCovYDxkaXYgY2xhc3M9XCJzcGluZS1wbGF5ZXItcG9wdXAtdGl0bGVcIj5EZWJ1ZzwvZGl2Pjxocj48dWwgY2xhc3M9XCJzcGluZS1wbGF5ZXItbGlzdFwiPjwvbGk+YCk7XG5cblx0XHRsZXQgcm93cyA9IGZpbmRXaXRoQ2xhc3MocG9wdXAuZG9tLCBcInNwaW5lLXBsYXllci1saXN0XCIpO1xuXHRcdGxldCBtYWtlSXRlbSA9IChsYWJlbDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpID0+IHtcblx0XHRcdGxldCByb3cgPSBjcmVhdGVFbGVtZW50KC8qaHRtbCovYDxsaSBjbGFzcz1cInNwaW5lLXBsYXllci1saXN0LWl0ZW1cIj48L2xpPmApO1xuXHRcdFx0bGV0IHMgPSBuZXcgU3dpdGNoKGxhYmVsKTtcblx0XHRcdHJvdy5hcHBlbmRDaGlsZChzLmNyZWF0ZSgpKTtcblx0XHRcdGxldCBkZWJ1ZyA9IHRoaXMuY29uZmlnLmRlYnVnIGFzIGFueTtcblx0XHRcdHMuc2V0RW5hYmxlZChkZWJ1Z1tuYW1lXSk7XG5cdFx0XHRzLmNoYW5nZSA9ICh2YWx1ZSkgPT4gZGVidWdbbmFtZV0gPSB2YWx1ZTtcblx0XHRcdHJvd3MuYXBwZW5kQ2hpbGQocm93KTtcblx0XHR9O1xuXHRcdG1ha2VJdGVtKFwiQm9uZXNcIiwgXCJib25lc1wiKTtcblx0XHRtYWtlSXRlbShcIlJlZ2lvbnNcIiwgXCJyZWdpb25zXCIpO1xuXHRcdG1ha2VJdGVtKFwiTWVzaGVzXCIsIFwibWVzaGVzXCIpO1xuXHRcdG1ha2VJdGVtKFwiQm91bmRzXCIsIFwiYm91bmRzXCIpO1xuXHRcdG1ha2VJdGVtKFwiUGF0aHNcIiwgXCJwYXRoc1wiKTtcblx0XHRtYWtlSXRlbShcIkNsaXBwaW5nXCIsIFwiY2xpcHBpbmdcIik7XG5cdFx0bWFrZUl0ZW0oXCJQb2ludHNcIiwgXCJwb2ludHNcIik7XG5cdFx0bWFrZUl0ZW0oXCJIdWxsc1wiLCBcImh1bGxzXCIpO1xuXHRcdHBvcHVwLnNob3coKTtcblx0fVxuXG5cdHByaXZhdGUgc2hvd0Vycm9yIChtZXNzYWdlOiBzdHJpbmcsIGVycm9yPzogRXJyb3IpIHtcblx0XHRpZiAodGhpcy5lcnJvcikge1xuXHRcdFx0aWYgKGVycm9yKSB0aHJvdyBlcnJvcjsgLy8gRG9uJ3QgbG9zZSBlcnJvciBpZiBzaG93RXJyb3IgdGhyb3dzLCBpcyBjYXVnaHQsIGFuZCBzaG93RXJyb3IgaXMgY2FsbGVkIGFnYWluLlxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmVycm9yID0gdHJ1ZTtcblx0XHRcdHRoaXMuZG9tLmFwcGVuZENoaWxkKGNyZWF0ZUVsZW1lbnQoXG5cdFx0XHRcdFx0LypodG1sKi9gPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1lcnJvclwiIHN0eWxlPVwiYmFja2dyb3VuZDojMDAwO2NvbG9yOiNmZmY7cG9zaXRpb246YWJzb2x1dGU7dG9wOjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTtkaXNwbGF5OmZsZXg7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7b3ZlcmZsb3c6YXV0bzt6LWluZGV4Ojk5OVwiPmBcblx0XHRcdFx0KyBtZXNzYWdlLnJlcGxhY2UoXCJcXG5cIiwgXCI8YnI+PGJyPlwiKSArIGA8L2Rpdj5gKSk7XG5cdFx0XHRpZiAodGhpcy5jb25maWcuZXJyb3IpIHRoaXMuY29uZmlnLmVycm9yKHRoaXMsIG1lc3NhZ2UpO1xuXHRcdFx0dGhyb3cgKGVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IobWVzc2FnZSkpO1xuXHRcdFx0Y29uc29sZS5sb2coZXJyb3IpO1xuXHRcdH1cblx0fVxufVxuXG5jbGFzcyBQb3B1cCB7XG5cdHB1YmxpYyBkb206IEhUTUxFbGVtZW50O1xuXHRwcml2YXRlIGNsYXNzTmFtZTogc3RyaW5nO1xuXHRwcml2YXRlIHdpbmRvd0NsaWNrTGlzdGVuZXI6IGFueTtcblxuXHRjb25zdHJ1Y3RvciAocHJpdmF0ZSBpZDogc3RyaW5nLCBwcml2YXRlIGJ1dHRvbjogSFRNTEVsZW1lbnQsIHByaXZhdGUgcGxheWVyOiBTcGluZVBsYXllciwgcGFyZW50OiBIVE1MRWxlbWVudCwgaHRtbENvbnRlbnQ6IHN0cmluZykge1xuXHRcdHRoaXMuZG9tID0gY3JlYXRlRWxlbWVudCgvKmh0bWwqL2A8ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLXBvcHVwIHNwaW5lLXBsYXllci1oaWRkZW5cIj48L2Rpdj5gKTtcblx0XHR0aGlzLmRvbS5pbm5lckhUTUwgPSBodG1sQ29udGVudDtcblx0XHRwYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5kb20pO1xuXHRcdHRoaXMuY2xhc3NOYW1lID0gXCJzcGluZS1wbGF5ZXItYnV0dG9uLWljb24tXCIgKyBpZCArIFwiLXNlbGVjdGVkXCI7XG5cdH1cblxuXHRkaXNwb3NlICgpIHtcblxuXHR9XG5cblx0aGlkZSAoaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuXHRcdHRoaXMuZG9tLnJlbW92ZSgpO1xuXHRcdHRoaXMuYnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5jbGFzc05hbWUpO1xuXHRcdGlmICh0aGlzLmlkID09IGlkKSB7XG5cdFx0XHR0aGlzLnBsYXllci5wb3B1cCA9IG51bGw7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0c2hvdyAoKSB7XG5cdFx0dGhpcy5wbGF5ZXIucG9wdXAgPSB0aGlzO1xuXHRcdHRoaXMuYnV0dG9uLmNsYXNzTGlzdC5hZGQodGhpcy5jbGFzc05hbWUpO1xuXHRcdHRoaXMuZG9tLmNsYXNzTGlzdC5yZW1vdmUoXCJzcGluZS1wbGF5ZXItaGlkZGVuXCIpO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIHRoZSBwb3B1cCBpc24ndCBiaWdnZXIgdGhhbiB0aGUgcGxheWVyLlxuXHRcdGxldCBkaXNtaXNzZWQgPSBmYWxzZTtcblx0XHRsZXQgcmVzaXplID0gKCkgPT4ge1xuXHRcdFx0aWYgKCFkaXNtaXNzZWQpIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZXNpemUpO1xuXHRcdFx0bGV0IHBsYXllckRvbSA9IHRoaXMucGxheWVyLmRvbTtcblx0XHRcdGxldCBib3R0b21PZmZzZXQgPSBNYXRoLmFicyhwbGF5ZXJEb20uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuYm90dG9tIC0gcGxheWVyRG9tLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmJvdHRvbSk7XG5cdFx0XHRsZXQgcmlnaHRPZmZzZXQgPSBNYXRoLmFicyhwbGF5ZXJEb20uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkucmlnaHQgLSBwbGF5ZXJEb20uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkucmlnaHQpO1xuXHRcdFx0dGhpcy5kb20uc3R5bGUubWF4SGVpZ2h0ID0gKHBsYXllckRvbS5jbGllbnRIZWlnaHQgLSBib3R0b21PZmZzZXQgLSByaWdodE9mZnNldCkgKyBcInB4XCI7XG5cdFx0fVxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShyZXNpemUpO1xuXG5cdFx0Ly8gRGlzbWlzcyB3aGVuIGNsaWNraW5nIHNvbWV3aGVyZSBvdXRzaWRlIHRoZSBwb3B1cC5cblx0XHRsZXQganVzdENsaWNrZWQgPSB0cnVlO1xuXHRcdGxldCB3aW5kb3dDbGlja0xpc3RlbmVyID0gKGV2ZW50OiBhbnkpID0+IHtcblx0XHRcdGlmIChqdXN0Q2xpY2tlZCB8fCB0aGlzLnBsYXllci5wb3B1cCAhPSB0aGlzKSB7XG5cdFx0XHRcdGp1c3RDbGlja2VkID0gZmFsc2U7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmICghdGhpcy5kb20uY29udGFpbnMoZXZlbnQudGFyZ2V0KSkge1xuXHRcdFx0XHR0aGlzLmRvbS5yZW1vdmUoKTtcblx0XHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB3aW5kb3dDbGlja0xpc3RlbmVyKTtcblx0XHRcdFx0dGhpcy5idXR0b24uY2xhc3NMaXN0LnJlbW92ZSh0aGlzLmNsYXNzTmFtZSk7XG5cdFx0XHRcdHRoaXMucGxheWVyLnBvcHVwID0gbnVsbDtcblx0XHRcdFx0ZGlzbWlzc2VkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdHRoaXMucGxheWVyLmFkZEV2ZW50TGlzdGVuZXIod2luZG93LCBcImNsaWNrXCIsIHdpbmRvd0NsaWNrTGlzdGVuZXIpO1xuXHR9XG59XG5cbmNsYXNzIFN3aXRjaCB7XG5cdHByaXZhdGUgc3dpdGNoOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwcml2YXRlIGVuYWJsZWQgPSBmYWxzZTtcblx0cHVibGljIGNoYW5nZTogKHZhbHVlOiBib29sZWFuKSA9PiB2b2lkID0gKCkgPT4geyB9O1xuXG5cdGNvbnN0cnVjdG9yIChwcml2YXRlIHRleHQ6IHN0cmluZykgeyB9XG5cblxuXHRjcmVhdGUgKCk6IEhUTUxFbGVtZW50IHtcblx0XHR0aGlzLnN3aXRjaCA9IGNyZWF0ZUVsZW1lbnQoLypodG1sKi9gXG48ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLXN3aXRjaFwiPlxuXHQ8c3BhbiBjbGFzcz1cInNwaW5lLXBsYXllci1zd2l0Y2gtdGV4dFwiPiR7dGhpcy50ZXh0fTwvc3Bhbj5cblx0PGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1zd2l0Y2gta25vYi1hcmVhXCI+XG5cdFx0PGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1zd2l0Y2gta25vYlwiPjwvZGl2PlxuXHQ8L2Rpdj5cbjwvZGl2PmApO1xuXHRcdHRoaXMuc3dpdGNoLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWQoIXRoaXMuZW5hYmxlZCk7XG5cdFx0XHRpZiAodGhpcy5jaGFuZ2UpIHRoaXMuY2hhbmdlKHRoaXMuZW5hYmxlZCk7XG5cdFx0fSlcblx0XHRyZXR1cm4gdGhpcy5zd2l0Y2g7XG5cdH1cblxuXHRzZXRFbmFibGVkIChlbmFibGVkOiBib29sZWFuKSB7XG5cdFx0aWYgKGVuYWJsZWQpIHRoaXMuc3dpdGNoPy5jbGFzc0xpc3QuYWRkKFwiYWN0aXZlXCIpO1xuXHRcdGVsc2UgdGhpcy5zd2l0Y2g/LmNsYXNzTGlzdC5yZW1vdmUoXCJhY3RpdmVcIik7XG5cdFx0dGhpcy5lbmFibGVkID0gZW5hYmxlZDtcblx0fVxuXG5cdGlzRW5hYmxlZCAoKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuZW5hYmxlZDtcblx0fVxufVxuXG5jbGFzcyBTbGlkZXIge1xuXHRwcml2YXRlIHNsaWRlcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblx0cHJpdmF0ZSB2YWx1ZTogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcblx0cHJpdmF0ZSBrbm9iOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuXHRwdWJsaWMgY2hhbmdlOiAocGVyY2VudGFnZTogbnVtYmVyKSA9PiB2b2lkID0gKCkgPT4geyB9O1xuXG5cdGNvbnN0cnVjdG9yIChwdWJsaWMgc25hcHMgPSAwLCBwdWJsaWMgc25hcFBlcmNlbnRhZ2UgPSAwLjEsIHB1YmxpYyBiaWcgPSBmYWxzZSkgeyB9XG5cblx0Y3JlYXRlICgpOiBIVE1MRWxlbWVudCB7XG5cdFx0dGhpcy5zbGlkZXIgPSBjcmVhdGVFbGVtZW50KC8qaHRtbCovYFxuPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1zbGlkZXIgJHt0aGlzLmJpZyA/IFwiYmlnXCIgOiBcIlwifVwiPlxuXHQ8ZGl2IGNsYXNzPVwic3BpbmUtcGxheWVyLXNsaWRlci12YWx1ZVwiPjwvZGl2PlxuXHQ8IS0tPGRpdiBjbGFzcz1cInNwaW5lLXBsYXllci1zbGlkZXIta25vYlwiPjwvZGl2Pi0tPlxuPC9kaXY+YCk7XG5cdFx0dGhpcy52YWx1ZSA9IGZpbmRXaXRoQ2xhc3ModGhpcy5zbGlkZXIsIFwic3BpbmUtcGxheWVyLXNsaWRlci12YWx1ZVwiKTtcblx0XHQvLyB0aGlzLmtub2IgPSBmaW5kV2l0aENsYXNzKHRoaXMuc2xpZGVyLCBcInNwaW5lLXBsYXllci1zbGlkZXIta25vYlwiKTtcblx0XHR0aGlzLnNldFZhbHVlKDApO1xuXG5cdFx0bGV0IGRyYWdnaW5nID0gZmFsc2U7XG5cdFx0bmV3IElucHV0KHRoaXMuc2xpZGVyKS5hZGRMaXN0ZW5lcih7XG5cdFx0XHRkb3duOiAoeCwgeSkgPT4ge1xuXHRcdFx0XHRkcmFnZ2luZyA9IHRydWU7XG5cdFx0XHRcdHRoaXMudmFsdWU/LmNsYXNzTGlzdC5hZGQoXCJob3ZlcmluZ1wiKTtcblx0XHRcdH0sXG5cdFx0XHR1cDogKHgsIHkpID0+IHtcblx0XHRcdFx0ZHJhZ2dpbmcgPSBmYWxzZTtcblx0XHRcdFx0aWYgKHRoaXMuY2hhbmdlKSB0aGlzLmNoYW5nZSh0aGlzLnNldFZhbHVlKHggLyB0aGlzLnNsaWRlciEuY2xpZW50V2lkdGgpKTtcblx0XHRcdFx0dGhpcy52YWx1ZT8uY2xhc3NMaXN0LnJlbW92ZShcImhvdmVyaW5nXCIpO1xuXHRcdFx0fSxcblx0XHRcdG1vdmVkOiAoeCwgeSkgPT4ge1xuXHRcdFx0XHRpZiAoZHJhZ2dpbmcgJiYgdGhpcy5jaGFuZ2UpIHRoaXMuY2hhbmdlKHRoaXMuc2V0VmFsdWUoeCAvIHRoaXMuc2xpZGVyIS5jbGllbnRXaWR0aCkpO1xuXHRcdFx0fSxcblx0XHRcdGRyYWdnZWQ6ICh4LCB5KSA9PiB7XG5cdFx0XHRcdGlmICh0aGlzLmNoYW5nZSkgdGhpcy5jaGFuZ2UodGhpcy5zZXRWYWx1ZSh4IC8gdGhpcy5zbGlkZXIhLmNsaWVudFdpZHRoKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gdGhpcy5zbGlkZXI7XG5cdH1cblxuXHRzZXRWYWx1ZSAocGVyY2VudGFnZTogbnVtYmVyKTogbnVtYmVyIHtcblx0XHRwZXJjZW50YWdlID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgcGVyY2VudGFnZSkpO1xuXHRcdGlmICh0aGlzLnNuYXBzKSB7XG5cdFx0XHRsZXQgc25hcCA9IDEgLyB0aGlzLnNuYXBzO1xuXHRcdFx0bGV0IG1vZHVsbyA9IHBlcmNlbnRhZ2UgJSBzbmFwO1xuXHRcdFx0Ly8gZmxvb3Jcblx0XHRcdGlmIChtb2R1bG8gPCBzbmFwICogdGhpcy5zbmFwUGVyY2VudGFnZSlcblx0XHRcdFx0cGVyY2VudGFnZSA9IHBlcmNlbnRhZ2UgLSBtb2R1bG87XG5cdFx0XHRlbHNlIGlmIChtb2R1bG8gPiBzbmFwIC0gc25hcCAqIHRoaXMuc25hcFBlcmNlbnRhZ2UpXG5cdFx0XHRcdHBlcmNlbnRhZ2UgPSBwZXJjZW50YWdlIC0gbW9kdWxvICsgc25hcDtcblx0XHRcdHBlcmNlbnRhZ2UgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBwZXJjZW50YWdlKSk7XG5cdFx0fVxuXHRcdHRoaXMudmFsdWUhLnN0eWxlLndpZHRoID0gXCJcIiArIChwZXJjZW50YWdlICogMTAwKSArIFwiJVwiO1xuXHRcdC8vIHRoaXMua25vYi5zdHlsZS5sZWZ0ID0gXCJcIiArICgtOCArIHBlcmNlbnRhZ2UgKiB0aGlzLnNsaWRlci5jbGllbnRXaWR0aCkgKyBcInB4XCI7XG5cdFx0cmV0dXJuIHBlcmNlbnRhZ2U7XG5cdH1cbn1cblxuZnVuY3Rpb24gZmluZFdpdGhDbGFzcyAoZWxlbWVudDogSFRNTEVsZW1lbnQsIGNsYXNzTmFtZTogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuXHRyZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGNsYXNzTmFtZSlbMF0gYXMgSFRNTEVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQgKGh0bWw6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcblx0bGV0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdGRpdi5pbm5lckhUTUwgPSBodG1sO1xuXHRyZXR1cm4gZGl2LmNoaWxkcmVuWzBdIGFzIEhUTUxFbGVtZW50O1xufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyAoZWxlbWVudHM6IEhUTUxDb2xsZWN0aW9uLCBjbGF6ejogc3RyaW5nKSB7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspXG5cdFx0ZWxlbWVudHNbaV0uY2xhc3NMaXN0LnJlbW92ZShjbGF6eik7XG59XG5cbmZ1bmN0aW9uIHRvU3RyaW5nIChvYmplY3Q6IGFueSkge1xuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkob2JqZWN0KVxuXHRcdC5yZXBsYWNlKC8mL2csIFwiJmFtcDtcIilcblx0XHQucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcblx0XHQucmVwbGFjZSgvPi9nLCBcIiZndDtcIilcblx0XHQucmVwbGFjZSgvXCIvZywgXCImIzM0O1wiKVxuXHRcdC5yZXBsYWNlKC8nL2csIFwiJiMzOTtcIik7XG59XG5cbmNvbnN0IEJPTkVfSU5ORVJfT1ZFUiA9IG5ldyBDb2xvcigwLjQ3OCwgMCwgMCwgMC4yNSk7XG5jb25zdCBCT05FX09VVEVSX09WRVIgPSBuZXcgQ29sb3IoMSwgMSwgMSwgMSk7XG5jb25zdCBCT05FX0lOTkVSID0gbmV3IENvbG9yKDAuNDc4LCAwLCAwLCAwLjUpO1xuY29uc3QgQk9ORV9PVVRFUiA9IG5ldyBDb2xvcigxLCAwLCAwLCAwLjgpO1xuIl19