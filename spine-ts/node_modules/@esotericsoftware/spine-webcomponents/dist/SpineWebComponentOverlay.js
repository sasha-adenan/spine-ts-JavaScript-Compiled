/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated July 28, 2023. Replaces all prior versions.
 *
 * Copyright (c) 2013-2023, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software or
 * otherwise create derivative works of the Spine Runtimes (collectively,
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
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THE
 * SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import { AssetCache, AssetManager, Color, Input, LoadingScreen, ManagedWebGLRenderingContext, Physics, SceneRenderer, TimeKeeper, Vector2, Vector3 } from "@esotericsoftware/spine-webgl";
import { castValue } from "./wcUtils.js";
export class SpineWebComponentOverlay extends HTMLElement {
    static OVERLAY_ID = "spine-overlay-default-identifier";
    static OVERLAY_LIST = new Map();
    /**
     * @internal
     */
    static getOrCreateOverlay(overlayId) {
        const id = overlayId || SpineWebComponentOverlay.OVERLAY_ID;
        let overlay = SpineWebComponentOverlay.OVERLAY_LIST.get(id);
        if (!overlay) {
            overlay = document.createElement('spine-overlay');
            overlay.setAttribute('overlay-id', id);
            document.body.appendChild(overlay);
        }
        return overlay;
    }
    /**
     * If true, enables a top-left span showing FPS (it has black text)
     */
    static SHOW_FPS = false;
    /**
     * A list holding the widgets added to this overlay.
     */
    widgets = new Array();
    /**
     * The {@link SceneRenderer} used by this overlay.
     */
    renderer;
    /**
     * The {@link AssetManager} used by this overlay.
     */
    assetManager;
    /**
     * The identifier of this overlay. This is necessary when multiply overlay are created.
       * Connected to `overlay-id` attribute.
     */
    overlayId;
    /**
     * If `false` (default value), the overlay container style will be affected adding `transform: translateZ(0);` to it.
     * The `transform` is not affected if it already exists on the container.
     * This is necessary to make the scrolling works with containers that scroll in a different way with respect to the page, as explained in {@link appendedToBody}.
     * Connected to `no-auto-parent-transform` attribute.
     */
    noAutoParentTransform = false;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport height, the pixels to add to the top of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.2.
     * Connected to `overflow-top` attribute.
     */
    overflowTop = .2;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport height, the pixels to add to the bottom of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.
     * Connected to `overflow-bottom` attribute.
     */
    overflowBottom = .0;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport width, the pixels to add to the left of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.
     * Connected to `overflow-left` attribute.
     */
    overflowLeft = .0;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport width, the pixels to add to the right of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.
     * Connected to `overflow-right` attribute.
     */
    overflowRight = .0;
    root;
    div;
    boneFollowersParent;
    canvas;
    fps;
    fpsAppended = false;
    intersectionObserver;
    resizeObserver;
    input;
    overflowLeftSize = 0;
    overflowTopSize = 0;
    lastCanvasBaseWidth = 0;
    lastCanvasBaseHeight = 0;
    zIndex;
    disposed = false;
    loaded = false;
    running = false;
    visible = true;
    /**
     * appendedToBody is assegned in the connectedCallback.
     * When false, the overlay will have the size of the element container in contrast to the default behaviour where the
     * overlay has always the size of the viewport.
     * This is necessary when the overlay is inserted into a container that scroll in a different way with respect to the page.
     * Otherwise the following problems might occur:
     * 1) For containers appendedToBody, the widget will be slightly slower to scroll than the html behind. The effect is more evident for lower refresh rate display.
     * 2) For containers appendedToBody, the widget will overflow the container bounds until the widget html element container is visible
     * 3) For fixed containers, the widget will scroll in a jerky way
     *
     * In order to fix this behaviour, it is necessary to insert a dedicated `spine-overlay` webcomponent as a direct child of the container.
     * Moreover, it is necessary to perform the following actions:
     * 1) The appendedToBody container must have a `transform` css attribute. If it hasn't this attribute the `spine-overlay` will add it for you.
     * If your appendedToBody container has already this css attribute, or if you prefer to add it by yourself (example: `transform: translateZ(0);`), set the `no-auto-parent-transform` to the `spine-overlay`.
     * 2) The `spine-overlay` must have an `overlay-id` attribute. Choose the value you prefer.
     * 3) Each `spine-skeleton` must have an `overlay-id` attribute. The same as the hosting `spine-overlay`.
       * Connected to `appendedToBody` attribute.
     */
    appendedToBody = true;
    hasParentTransform = true;
    time = new TimeKeeper();
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.top = "0";
        this.div.style.left = "0";
        this.div.style.setProperty("pointer-events", "none");
        this.div.style.overflow = "hidden";
        // this.div.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
        this.root.appendChild(this.div);
        this.canvas = document.createElement("canvas");
        this.boneFollowersParent = document.createElement("div");
        this.div.appendChild(this.canvas);
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.div.appendChild(this.boneFollowersParent);
        this.boneFollowersParent.style.position = "absolute";
        this.boneFollowersParent.style.top = "0";
        this.boneFollowersParent.style.left = "0";
        this.boneFollowersParent.style.whiteSpace = "nowrap";
        this.boneFollowersParent.style.setProperty("pointer-events", "none");
        this.boneFollowersParent.style.transform = `translate(0px,0px)`;
        this.canvas.style.setProperty("pointer-events", "none");
        this.canvas.style.transform = `translate(0px,0px)`;
        // this.canvas.style.setProperty("will-change", "transform"); // performance seems to be even worse with this uncommented
        this.fps = document.createElement("span");
        this.fps.style.position = "fixed";
        this.fps.style.top = "0";
        this.fps.style.left = "0";
        const context = new ManagedWebGLRenderingContext(this.canvas, { alpha: true });
        this.renderer = new SceneRenderer(this.canvas, context);
        this.assetManager = new AssetManager(context);
    }
    connectedCallback() {
        this.appendedToBody = this.parentElement === document.body;
        let overlayId = this.getAttribute('overlay-id');
        if (!overlayId) {
            overlayId = SpineWebComponentOverlay.OVERLAY_ID;
            this.setAttribute('overlay-id', overlayId);
        }
        this.assetManager.setCache(AssetCache.getCache(overlayId));
        const existingOverlay = SpineWebComponentOverlay.OVERLAY_LIST.get(overlayId);
        if (existingOverlay && existingOverlay !== this) {
            throw new Error(`"SpineWebComponentOverlay - You cannot have two spine-overlay with the same overlay-id: ${overlayId}"`);
        }
        SpineWebComponentOverlay.OVERLAY_LIST.set(overlayId, this);
        // window.addEventListener("scroll", this.scrolledCallback);
        if (document.readyState !== "complete") {
            window.addEventListener("load", this.loadedCallback);
        }
        else {
            this.loadedCallback();
        }
        window.screen.orientation.addEventListener('change', this.orientationChangedCallback);
        this.intersectionObserver = new IntersectionObserver((widgets) => {
            for (const elem of widgets) {
                const { target, intersectionRatio } = elem;
                let { isIntersecting } = elem;
                for (const widget of this.widgets) {
                    if (widget.getHostElement() != target)
                        continue;
                    // old browsers do not have isIntersecting
                    if (isIntersecting === undefined) {
                        isIntersecting = intersectionRatio > 0;
                    }
                    widget.onScreen = isIntersecting;
                    if (isIntersecting) {
                        widget.onScreenFunction(widget);
                        widget.onScreenAtLeastOnce = true;
                    }
                }
            }
        }, { rootMargin: "30px 20px 30px 20px" });
        // if the element is not appendedToBody, the user does not disable translate tweak, and the parent did not have already a transform, add the tweak
        if (!this.appendedToBody) {
            if (this.hasCssTweakOff()) {
                this.hasParentTransform = false;
            }
            else {
                this.parentElement.style.transform = `translateZ(0)`;
            }
        }
        else {
            window.addEventListener("resize", this.windowResizeCallback);
        }
        this.resizeObserver = new ResizeObserver(() => this.resizedCallback());
        this.resizeObserver.observe(this.parentElement);
        for (const widget of this.widgets) {
            this.intersectionObserver?.observe(widget.getHostElement());
        }
        this.input = this.setupDragUtility();
        document.addEventListener('visibilitychange', this.visibilityChangeCallback);
        this.startRenderingLoop();
    }
    disconnectedCallback() {
        const id = this.getAttribute('overlay-id');
        if (id)
            SpineWebComponentOverlay.OVERLAY_LIST.delete(id);
        // window.removeEventListener("scroll", this.scrolledCallback);
        window.removeEventListener("load", this.loadedCallback);
        window.removeEventListener("resize", this.windowResizeCallback);
        document.removeEventListener('visibilitychange', this.visibilityChangeCallback);
        window.screen.orientation.removeEventListener('change', this.orientationChangedCallback);
        this.intersectionObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.input?.dispose();
    }
    static attributesDescription = {
        "overlay-id": { propertyName: "overlayId", type: "string" },
        "no-auto-parent-transform": { propertyName: "noAutoParentTransform", type: "boolean" },
        "overflow-top": { propertyName: "overflowTop", type: "number" },
        "overflow-bottom": { propertyName: "overflowBottom", type: "number" },
        "overflow-left": { propertyName: "overflowLeft", type: "number" },
        "overflow-right": { propertyName: "overflowRight", type: "number" },
    };
    static get observedAttributes() {
        return Object.keys(SpineWebComponentOverlay.attributesDescription);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        const { type, propertyName, defaultValue } = SpineWebComponentOverlay.attributesDescription[name];
        const val = castValue(type, newValue, defaultValue);
        this[propertyName] = val;
        return;
    }
    visibilityChangeCallback = () => {
        if (document.hidden) {
            this.visible = false;
        }
        else {
            this.visible = true;
            this.startRenderingLoop();
        }
    };
    windowResizeCallback = () => this.resizedCallback(true);
    resizedCallback = (onlyDiv = false) => {
        this.updateCanvasSize(onlyDiv);
    };
    orientationChangedCallback = () => {
        this.updateCanvasSize();
        // after an orientation change the scrolling changes, but the scroll event does not fire
        this.scrolledCallback();
    };
    // right now, we scroll the canvas each frame before rendering loop, that makes scrolling on mobile waaay more smoother
    // this is way scroll handler do nothing
    scrolledCallback = () => {
        // this.translateCanvas();
    };
    loadedCallback = () => {
        this.updateCanvasSize();
        this.scrolledCallback();
        if (!this.loaded) {
            this.loaded = true;
            this.parentElement.appendChild(this);
        }
    };
    hasCssTweakOff() {
        return this.noAutoParentTransform && getComputedStyle(this.parentElement).transform === "none";
    }
    /**
     * Remove the overlay from the DOM, dispose all the contained widgets, and dispose the renderer.
     */
    dispose() {
        for (const widget of [...this.widgets])
            widget.dispose();
        this.remove();
        this.widgets.length = 0;
        this.renderer.dispose();
        this.disposed = true;
        this.assetManager.dispose();
    }
    /**
     * Add the widget to the overlay.
     * If the widget is after the overlay in the DOM, the overlay is appended after the widget.
     * @param widget The widget to add to the overlay
     */
    addWidget(widget) {
        this.widgets.push(widget);
        this.intersectionObserver?.observe(widget.getHostElement());
        if (this.loaded) {
            const comparison = this.compareDocumentPosition(widget);
            // DOCUMENT_POSITION_DISCONNECTED is needed when a widget is inside the overlay (due to followBone)
            if ((comparison & Node.DOCUMENT_POSITION_FOLLOWING) && !(comparison & Node.DOCUMENT_POSITION_DISCONNECTED)) {
                this.parentElement.appendChild(this);
            }
        }
        this.updateZIndexIfNecessary(widget);
    }
    /**
     * Remove the widget from the overlay.
     * @param widget The widget to remove from the overlay
     */
    removeWidget(widget) {
        const index = this.widgets.findIndex(w => w === widget);
        if (index === -1)
            return false;
        this.widgets.splice(index, 1);
        this.intersectionObserver?.unobserve(widget.getHostElement());
        return true;
    }
    addSlotFollowerElement(element) {
        this.boneFollowersParent.appendChild(element);
        this.resizedCallback();
    }
    tempFollowBoneVector = new Vector3();
    startRenderingLoop() {
        if (this.running)
            return;
        const updateWidgets = () => {
            const delta = this.time.delta;
            for (const { skeleton, state, update, onScreen, offScreenUpdateBehaviour, beforeUpdateWorldTransforms, afterUpdateWorldTransforms } of this.widgets) {
                if (!skeleton || !state)
                    continue;
                if (!onScreen && offScreenUpdateBehaviour === "pause")
                    continue;
                if (update)
                    update(delta, skeleton, state);
                else {
                    // delta = 0
                    state.update(delta);
                    skeleton.update(delta);
                    if (onScreen || (!onScreen && offScreenUpdateBehaviour === "pose")) {
                        state.apply(skeleton);
                        beforeUpdateWorldTransforms(delta, skeleton, state);
                        skeleton.updateWorldTransform(Physics.update);
                        afterUpdateWorldTransforms(delta, skeleton, state);
                    }
                }
            }
            // fps top-left span
            if (SpineWebComponentOverlay.SHOW_FPS) {
                if (!this.fpsAppended) {
                    this.div.appendChild(this.fps);
                    this.fpsAppended = true;
                }
                this.fps.innerText = this.time.framesPerSecond.toFixed(2) + " fps";
            }
            else {
                if (this.fpsAppended) {
                    this.div.removeChild(this.fps);
                    this.fpsAppended = false;
                }
            }
        };
        const clear = (r, g, b, a) => {
            this.renderer.context.gl.clearColor(r, g, b, a);
            this.renderer.context.gl.clear(this.renderer.context.gl.COLOR_BUFFER_BIT);
        };
        const startScissor = (divBounds) => {
            this.renderer.end();
            this.renderer.begin();
            this.renderer.context.gl.enable(this.renderer.context.gl.SCISSOR_TEST);
            this.renderer.context.gl.scissor(this.screenToWorldLength(divBounds.x), this.canvas.height - this.screenToWorldLength(divBounds.y + divBounds.height), this.screenToWorldLength(divBounds.width), this.screenToWorldLength(divBounds.height));
        };
        const endScissor = () => {
            this.renderer.end();
            this.renderer.context.gl.disable(this.renderer.context.gl.SCISSOR_TEST);
            this.renderer.begin();
        };
        const renderWidgets = () => {
            clear(0, 0, 0, 0);
            let renderer = this.renderer;
            renderer.begin();
            let ref;
            let offsetLeftForOevrlay = 0;
            let offsetTopForOverlay = 0;
            if (!this.appendedToBody) {
                ref = this.parentElement.getBoundingClientRect();
                const computedStyle = getComputedStyle(this.parentElement);
                offsetLeftForOevrlay = ref.left + parseFloat(computedStyle.borderLeftWidth);
                offsetTopForOverlay = ref.top + parseFloat(computedStyle.borderTopWidth);
            }
            const tempVector = new Vector3();
            for (const widget of this.widgets) {
                const { skeleton, pma, bounds, debug, offsetX, offsetY, dragX, dragY, fit, spinner, loading, clip, drag } = widget;
                if (widget.isOffScreenAndWasMoved())
                    continue;
                const elementRef = widget.getHostElement();
                const divBounds = elementRef.getBoundingClientRect();
                // need to use left and top, because x and y are not available on older browser
                divBounds.x = divBounds.left + this.overflowLeftSize;
                divBounds.y = divBounds.top + this.overflowTopSize;
                if (!this.appendedToBody) {
                    divBounds.x -= offsetLeftForOevrlay;
                    divBounds.y -= offsetTopForOverlay;
                }
                const { padLeft, padRight, padTop, padBottom, xAxis, yAxis } = widget;
                const paddingShiftHorizontal = (padLeft - padRight) / 2;
                const paddingShiftVertical = (padTop - padBottom) / 2;
                // get the desired point into the the div (center by default) in world coordinate
                const divX = divBounds.x + divBounds.width * ((xAxis + .5) + paddingShiftHorizontal);
                const divY = divBounds.y + divBounds.height * ((-yAxis + .5) + paddingShiftVertical) - 1;
                this.screenToWorld(tempVector, divX, divY);
                let divOriginX = tempVector.x;
                let divOriginY = tempVector.y;
                const paddingShrinkWidth = 1 - (padLeft + padRight);
                const paddingShrinkHeight = 1 - (padTop + padBottom);
                const divWidthWorld = this.screenToWorldLength(divBounds.width * paddingShrinkWidth);
                const divHeightWorld = this.screenToWorldLength(divBounds.height * paddingShrinkHeight);
                if (clip)
                    startScissor(divBounds);
                if (loading) {
                    if (spinner) {
                        if (!widget.loadingScreen)
                            widget.loadingScreen = new LoadingScreen(renderer);
                        widget.loadingScreen.drawInCoordinates(divOriginX, divOriginY);
                    }
                    if (clip)
                        endScissor();
                    continue;
                }
                if (skeleton) {
                    if (fit !== "origin") {
                        let { x: ax, y: ay, width: aw, height: ah } = bounds;
                        if (aw <= 0 || ah <= 0)
                            continue;
                        // scale ratio
                        const scaleWidth = divWidthWorld / aw;
                        const scaleHeight = divHeightWorld / ah;
                        // default value is used for fit = none
                        let ratioW = skeleton.scaleX;
                        let ratioH = skeleton.scaleY;
                        if (fit === "fill") { // Fill the target box by distorting the source's aspect ratio.
                            ratioW = scaleWidth;
                            ratioH = scaleHeight;
                        }
                        else if (fit === "width") {
                            ratioW = scaleWidth;
                            ratioH = scaleWidth;
                        }
                        else if (fit === "height") {
                            ratioW = scaleHeight;
                            ratioH = scaleHeight;
                        }
                        else if (fit === "contain") {
                            // if scaled height is bigger than div height, use height ratio instead
                            if (ah * scaleWidth > divHeightWorld) {
                                ratioW = scaleHeight;
                                ratioH = scaleHeight;
                            }
                            else {
                                ratioW = scaleWidth;
                                ratioH = scaleWidth;
                            }
                        }
                        else if (fit === "cover") {
                            if (ah * scaleWidth < divHeightWorld) {
                                ratioW = scaleHeight;
                                ratioH = scaleHeight;
                            }
                            else {
                                ratioW = scaleWidth;
                                ratioH = scaleWidth;
                            }
                        }
                        else if (fit === "scaleDown") {
                            if (aw > divWidthWorld || ah > divHeightWorld) {
                                if (ah * scaleWidth > divHeightWorld) {
                                    ratioW = scaleHeight;
                                    ratioH = scaleHeight;
                                }
                                else {
                                    ratioW = scaleWidth;
                                    ratioH = scaleWidth;
                                }
                            }
                        }
                        // get the center of the bounds
                        const boundsX = (ax + aw / 2) * ratioW;
                        const boundsY = (ay + ah / 2) * ratioH;
                        // get vertices offset: calculate the distance between div center and bounds center
                        divOriginX = divOriginX - boundsX;
                        divOriginY = divOriginY - boundsY;
                        // scale the skeleton
                        if (fit !== "none" && (skeleton.scaleX !== ratioW || skeleton.scaleY !== ratioH)) {
                            skeleton.scaleX = ratioW;
                            skeleton.scaleY = ratioH;
                            skeleton.updateWorldTransform(Physics.update);
                        }
                    }
                    // const worldOffsetX = divOriginX + offsetX + dragX;
                    const worldOffsetX = divOriginX + offsetX * window.devicePixelRatio + dragX;
                    const worldOffsetY = divOriginY + offsetY * window.devicePixelRatio + dragY;
                    widget.worldX = worldOffsetX;
                    widget.worldY = worldOffsetY;
                    renderer.drawSkeleton(skeleton, pma, -1, -1, (vertices, size, vertexSize) => {
                        for (let i = 0; i < size; i += vertexSize) {
                            vertices[i] = vertices[i] + worldOffsetX;
                            vertices[i + 1] = vertices[i + 1] + worldOffsetY;
                        }
                    });
                    // drawing debug stuff
                    if (debug) {
                        // if (true) {
                        let { x: ax, y: ay, width: aw, height: ah } = bounds;
                        // show bounds and its center
                        if (drag) {
                            renderer.rect(true, ax * skeleton.scaleX + worldOffsetX, ay * skeleton.scaleY + worldOffsetY, aw * skeleton.scaleX, ah * skeleton.scaleY, transparentRed);
                        }
                        renderer.rect(false, ax * skeleton.scaleX + worldOffsetX, ay * skeleton.scaleY + worldOffsetY, aw * skeleton.scaleX, ah * skeleton.scaleY, blue);
                        const bbCenterX = (ax + aw / 2) * skeleton.scaleX + worldOffsetX;
                        const bbCenterY = (ay + ah / 2) * skeleton.scaleY + worldOffsetY;
                        renderer.circle(true, bbCenterX, bbCenterY, 10, blue);
                        // show skeleton root
                        const root = skeleton.getRootBone();
                        renderer.circle(true, root.x + worldOffsetX, root.y + worldOffsetY, 10, red);
                        // show shifted origin
                        renderer.circle(true, divOriginX, divOriginY, 10, green);
                        // show line from origin to bounds center
                        renderer.line(divOriginX, divOriginY, bbCenterX, bbCenterY, green);
                    }
                    if (clip)
                        endScissor();
                }
            }
            renderer.end();
        };
        const updateBoneFollowers = () => {
            for (const widget of this.widgets) {
                if (widget.isOffScreenAndWasMoved() || !widget.skeleton)
                    continue;
                for (const boneFollower of widget.boneFollowerList) {
                    const { slot, bone, element, followVisibility, followRotation, followOpacity, followScale } = boneFollower;
                    const { worldX, worldY } = widget;
                    this.worldToScreen(this.tempFollowBoneVector, bone.worldX + worldX, bone.worldY + worldY);
                    if (Number.isNaN(this.tempFollowBoneVector.x))
                        continue;
                    let x = this.tempFollowBoneVector.x - this.overflowLeftSize;
                    let y = this.tempFollowBoneVector.y - this.overflowTopSize;
                    if (this.appendedToBody) {
                        x += window.scrollX;
                        y += window.scrollY;
                    }
                    element.style.transform = `translate(calc(-50% + ${x.toFixed(2)}px),calc(-50% + ${y.toFixed(2)}px))`
                        + (followRotation ? ` rotate(${-bone.getWorldRotationX()}deg)` : "")
                        + (followScale ? ` scale(${bone.getWorldScaleX()}, ${bone.getWorldScaleY()})` : "");
                    element.style.display = "";
                    if (followVisibility && !slot.attachment) {
                        element.style.opacity = "0";
                    }
                    else if (followOpacity) {
                        element.style.opacity = `${slot.color.a}`;
                    }
                }
            }
        };
        const loop = () => {
            if (this.disposed || !this.isConnected || !this.visible) {
                this.running = false;
                return;
            }
            ;
            requestAnimationFrame(loop);
            if (!this.loaded)
                return;
            this.time.update();
            this.translateCanvas();
            updateWidgets();
            renderWidgets();
            updateBoneFollowers();
        };
        requestAnimationFrame(loop);
        this.running = true;
        const red = new Color(1, 0, 0, 1);
        const green = new Color(0, 1, 0, 1);
        const blue = new Color(0, 0, 1, 1);
        const transparentWhite = new Color(1, 1, 1, .3);
        const transparentRed = new Color(1, 0, 0, .3);
    }
    pointerCanvasX = 1;
    pointerCanvasY = 1;
    pointerWorldX = 1;
    pointerWorldY = 1;
    tempVector = new Vector3();
    updatePointer(input) {
        this.pointerCanvasX = input.x - window.scrollX;
        this.pointerCanvasY = input.y - window.scrollY;
        if (!this.appendedToBody) {
            const ref = this.parentElement.getBoundingClientRect();
            this.pointerCanvasX -= ref.left;
            this.pointerCanvasY -= ref.top;
        }
        let tempVector = this.tempVector;
        tempVector.set(this.pointerCanvasX, this.pointerCanvasY, 0);
        this.renderer.camera.screenToWorld(tempVector, this.canvas.clientWidth, this.canvas.clientHeight);
        if (Number.isNaN(tempVector.x) || Number.isNaN(tempVector.y))
            return;
        this.pointerWorldX = tempVector.x;
        this.pointerWorldY = tempVector.y;
    }
    updateWidgetPointer(widget) {
        if (widget.worldX === Infinity)
            return false;
        widget.pointerWorldX = this.pointerWorldX - widget.worldX;
        widget.pointerWorldY = this.pointerWorldY - widget.worldY;
        return true;
    }
    setupDragUtility() {
        // TODO: we should use document - body might have some margin that offset the click events - Meanwhile I take event pageX/Y
        const inputManager = new Input(document.body, false);
        const inputPointTemp = new Vector2();
        const getInput = (ev) => {
            const originalEvent = ev instanceof MouseEvent ? ev : ev.changedTouches[0];
            inputPointTemp.x = originalEvent.pageX + this.overflowLeftSize;
            inputPointTemp.y = originalEvent.pageY + this.overflowTopSize;
            return inputPointTemp;
        };
        let lastX = 0;
        let lastY = 0;
        inputManager.addListener({
            // moved is used to pass pointer position wrt to canvas and widget position and currently is EXPERIMENTAL
            moved: (x, y, ev) => {
                const input = getInput(ev);
                this.updatePointer(input);
                for (const widget of this.widgets) {
                    if (!this.updateWidgetPointer(widget) || !widget.onScreen)
                        continue;
                    widget.pointerEventUpdate("move", ev);
                }
            },
            down: (x, y, ev) => {
                const input = getInput(ev);
                this.updatePointer(input);
                for (const widget of this.widgets) {
                    if (!this.updateWidgetPointer(widget) || widget.isOffScreenAndWasMoved())
                        continue;
                    widget.pointerEventUpdate("down", ev);
                    if ((widget.interactive && widget.pointerInsideBounds) || (!widget.interactive && widget.isPointerInsideBounds())) {
                        if (!widget.drag)
                            continue;
                        widget.dragging = true;
                        ev?.preventDefault();
                    }
                }
                lastX = input.x;
                lastY = input.y;
            },
            dragged: (x, y, ev) => {
                const input = getInput(ev);
                let dragX = input.x - lastX;
                let dragY = input.y - lastY;
                this.updatePointer(input);
                for (const widget of this.widgets) {
                    if (!this.updateWidgetPointer(widget) || widget.isOffScreenAndWasMoved())
                        continue;
                    widget.pointerEventUpdate("drag", ev);
                    if (!widget.dragging)
                        continue;
                    const skeleton = widget.skeleton;
                    widget.dragX += this.screenToWorldLength(dragX);
                    widget.dragY -= this.screenToWorldLength(dragY);
                    skeleton.physicsTranslate(dragX, -dragY);
                    ev?.preventDefault();
                    ev?.stopPropagation();
                }
                lastX = input.x;
                lastY = input.y;
            },
            up: (x, y, ev) => {
                for (const widget of this.widgets) {
                    widget.dragging = false;
                    if (widget.pointerInsideBounds) {
                        widget.pointerEventUpdate("up", ev);
                    }
                }
            }
        });
        return inputManager;
    }
    /*
    * Resize/scroll utilities
    */
    updateCanvasSize(onlyDiv = false) {
        const { width, height } = this.getViewportSize();
        // if the target width/height changes, resize the canvas.
        if (!onlyDiv && this.lastCanvasBaseWidth !== width || this.lastCanvasBaseHeight !== height) {
            this.lastCanvasBaseWidth = width;
            this.lastCanvasBaseHeight = height;
            this.overflowLeftSize = this.overflowLeft * width;
            this.overflowTopSize = this.overflowTop * height;
            const totalWidth = width * (1 + (this.overflowLeft + this.overflowRight));
            const totalHeight = height * (1 + (this.overflowTop + this.overflowBottom));
            this.canvas.style.width = totalWidth + "px";
            this.canvas.style.height = totalHeight + "px";
            this.resize(totalWidth, totalHeight);
        }
        // temporarely remove the div to get the page size without considering the div
        // this is necessary otherwise if the bigger element in the page is remove and the div
        // was the second bigger element, now it would be the div to determine the page size
        // this.div?.remove(); is it better width/height to zero?
        // this.div!.style.width = 0 + "px";
        // this.div!.style.height = 0 + "px";
        this.div.style.display = "none";
        if (this.appendedToBody) {
            const { width, height } = this.getPageSize();
            this.div.style.width = width + "px";
            this.div.style.height = height + "px";
        }
        else {
            if (this.hasCssTweakOff()) {
                // this case lags if scrolls or position fixed. Users should never use tweak off
                this.div.style.width = this.parentElement.clientWidth + "px";
                this.div.style.height = this.parentElement.clientHeight + "px";
                this.canvas.style.transform = `translate(${-this.overflowLeftSize}px,${-this.overflowTopSize}px)`;
            }
            else {
                this.div.style.width = this.parentElement.scrollWidth + "px";
                this.div.style.height = this.parentElement.scrollHeight + "px";
            }
        }
        this.div.style.display = "";
        // this.root.appendChild(this.div!);
    }
    resize(width, height) {
        let canvas = this.canvas;
        canvas.width = Math.round(this.screenToWorldLength(width));
        canvas.height = Math.round(this.screenToWorldLength(height));
        this.renderer.context.gl.viewport(0, 0, canvas.width, canvas.height);
        this.renderer.camera.setViewport(canvas.width, canvas.height);
        this.renderer.camera.update();
    }
    // we need the bounding client rect otherwise decimals won't be returned
    // this means that during zoom it might occurs that the div would be resized
    // rounded 1px more making a scrollbar appear
    getPageSize() {
        return document.documentElement.getBoundingClientRect();
    }
    lastViewportWidth = 0;
    lastViewportHeight = 0;
    lastDPR = 0;
    static WIDTH_INCREMENT = 1.15;
    static HEIGHT_INCREMENT = 1.2;
    static MAX_CANVAS_WIDTH = 7000;
    static MAX_CANVAS_HEIGHT = 7000;
    // determine the target viewport width and height.
    // The target width/height won't change if the viewport shrink to avoid useless re render (especially re render bursts on mobile)
    getViewportSize() {
        if (!this.appendedToBody) {
            return {
                width: this.parentElement.clientWidth,
                height: this.parentElement.clientHeight,
            };
        }
        let width = window.innerWidth;
        let height = window.innerHeight;
        const dpr = this.getDevicePixelRatio();
        if (dpr !== this.lastDPR) {
            this.lastDPR = dpr;
            this.lastViewportWidth = this.lastViewportWidth === 0 ? width : width * SpineWebComponentOverlay.WIDTH_INCREMENT;
            this.lastViewportHeight = height * SpineWebComponentOverlay.HEIGHT_INCREMENT;
            this.updateWidgetScales();
        }
        else {
            if (width > this.lastViewportWidth)
                this.lastViewportWidth = width * SpineWebComponentOverlay.WIDTH_INCREMENT;
            if (height > this.lastViewportHeight)
                this.lastViewportHeight = height * SpineWebComponentOverlay.HEIGHT_INCREMENT;
        }
        // if the resulting canvas width/height is too high, scale the DPI
        if (this.lastViewportHeight * (1 + this.overflowTop + this.overflowBottom) * dpr > SpineWebComponentOverlay.MAX_CANVAS_HEIGHT ||
            this.lastViewportWidth * (1 + this.overflowLeft + this.overflowRight) * dpr > SpineWebComponentOverlay.MAX_CANVAS_WIDTH) {
            this.dprScale += .5;
            return this.getViewportSize();
        }
        return {
            width: this.lastViewportWidth,
            height: this.lastViewportHeight,
        };
    }
    /**
     * @internal
     */
    getDevicePixelRatio() {
        return window.devicePixelRatio / this.dprScale;
    }
    dprScale = 1;
    updateWidgetScales() {
        for (const widget of this.widgets) {
            // inside mode scale automatically to fit the skeleton within its parent
            if (widget.fit !== "origin" && widget.fit !== "none")
                continue;
            const skeleton = widget.skeleton;
            if (!skeleton)
                continue;
            // I'm not sure about this. With mode origin and fit none:
            // case 1) If I comment this scale code, the skeleton is never scaled and will be always at the same size and won't change size while zooming
            // case 2) Otherwise, the skeleton is loaded always at the same size, but changes size while zooming
            const scale = this.getDevicePixelRatio();
            skeleton.scaleX = skeleton.scaleX / widget.dprScale * scale;
            skeleton.scaleY = skeleton.scaleY / widget.dprScale * scale;
            widget.dprScale = scale;
        }
    }
    // this function is invoked each frame - pay attention to what you add here
    translateCanvas() {
        let scrollPositionX = -this.overflowLeftSize;
        let scrollPositionY = -this.overflowTopSize;
        if (this.appendedToBody) {
            scrollPositionX += window.scrollX;
            scrollPositionY += window.scrollY;
        }
        else {
            // Ideally this should be the only appendedToBody case (no-auto-parent-transform not enabled or at least an ancestor has transform)
            // I'd like to get rid of the else case
            if (this.hasParentTransform) {
                scrollPositionX += this.parentElement.scrollLeft;
                scrollPositionY += this.parentElement.scrollTop;
            }
            else {
                const { left, top } = this.parentElement.getBoundingClientRect();
                scrollPositionX += left + window.scrollX;
                scrollPositionY += top + window.scrollY;
                let offsetParent = this.offsetParent;
                do {
                    if (offsetParent === null || offsetParent === document.body)
                        break;
                    const htmlOffsetParentElement = offsetParent;
                    if (htmlOffsetParentElement.style.position === "fixed" || htmlOffsetParentElement.style.position === "sticky" || htmlOffsetParentElement.style.position === "absolute") {
                        const parentRect = htmlOffsetParentElement.getBoundingClientRect();
                        this.div.style.transform = `translate(${left - parentRect.left}px,${top - parentRect.top}px)`;
                        return;
                    }
                    offsetParent = htmlOffsetParentElement.offsetParent;
                } while (offsetParent);
                this.div.style.transform = `translate(${scrollPositionX + this.overflowLeftSize}px,${scrollPositionY + this.overflowTopSize}px)`;
                return;
            }
        }
        this.canvas.style.transform = `translate(${scrollPositionX}px,${scrollPositionY}px)`;
    }
    updateZIndexIfNecessary(element) {
        let parent = element;
        let zIndex;
        do {
            let currentZIndex = parseInt(getComputedStyle(parent).zIndex);
            // searching the shallowest z-index
            if (!isNaN(currentZIndex))
                zIndex = currentZIndex;
            parent = parent.parentElement;
        } while (parent && parent !== document.body);
        if (zIndex && (!this.zIndex || this.zIndex < zIndex)) {
            this.zIndex = zIndex;
            this.div.style.zIndex = `${this.zIndex}`;
        }
    }
    /*
    * Other utilities
    */
    screenToWorld(vec, x, y) {
        vec.set(x, y, 0);
        // pay attention that clientWidth/Height rounds the size - if we don't like it, we should use getBoundingClientRect as in getPagSize
        this.renderer.camera.screenToWorld(vec, this.canvas.clientWidth, this.canvas.clientHeight);
    }
    worldToScreen(vec, x, y) {
        vec.set(x, -y, 0);
        // pay attention that clientWidth/Height rounds the size - if we don't like it, we should use getBoundingClientRect as in getPagSize
        // this.renderer.camera.worldToScreen(vec, this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.camera.worldToScreen(vec, this.worldToScreenLength(this.renderer.camera.viewportWidth), this.worldToScreenLength(this.renderer.camera.viewportHeight));
    }
    screenToWorldLength(length) {
        return length * this.getDevicePixelRatio();
    }
    worldToScreenLength(length) {
        return length / this.getDevicePixelRatio();
    }
}
customElements.define("spine-overlay", SpineWebComponentOverlay);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BpbmVXZWJDb21wb25lbnRPdmVybGF5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFjLEtBQUssRUFBRSxhQUFhLEVBQUUsNEJBQTRCLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJNLE9BQU8sRUFBa0IsU0FBUyxFQUFvQixNQUFNLGNBQWMsQ0FBQTtBQVcxRSxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsV0FBVztJQUNoRCxNQUFNLENBQUMsVUFBVSxHQUFHLGtDQUFrQyxDQUFDO0lBQ3ZELE1BQU0sQ0FBQyxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQW9DLENBQUM7SUFFMUU7O09BRUc7SUFDSCxNQUFNLENBQUMsa0JBQWtCLENBQUUsU0FBd0I7UUFDbEQsTUFBTSxFQUFFLEdBQUcsU0FBUyxJQUFJLHdCQUF3QixDQUFDLFVBQVUsQ0FBQztRQUM1RCxJQUFJLE9BQU8sR0FBRyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBNkIsQ0FBQztZQUM5RSxPQUFPLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2QyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFD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QUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUNNLGFBQWEsQ0FBRSxHQUFZLEVBQUUsQ0FBUyxFQUFFLENBQVM7UUFDdkQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEIsb0lBQW9JO1FBQ3BJLDhGQUE4RjtRQUM5RixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUN0SyxDQUFDO0lBQ00sbUJBQW1CLENBQUUsTUFBYztRQUN6QyxPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0lBQ00sbUJBQW1CLENBQUUsTUFBYztRQUN6QyxPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QyxDQUFDOztBQUdGLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLHdCQUF3QixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBTcGluZSBSdW50aW1lcyBMaWNlbnNlIEFncmVlbWVudFxuICogTGFzdCB1cGRhdGVkIEp1bHkgMjgsIDIwMjMuIFJlcGxhY2VzIGFsbCBwcmlvciB2ZXJzaW9ucy5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAyMywgRXNvdGVyaWMgU29mdHdhcmUgTExDXG4gKlxuICogSW50ZWdyYXRpb24gb2YgdGhlIFNwaW5lIFJ1bnRpbWVzIGludG8gc29mdHdhcmUgb3Igb3RoZXJ3aXNlIGNyZWF0aW5nXG4gKiBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyBpcyBwZXJtaXR0ZWQgdW5kZXIgdGhlIHRlcm1zIGFuZFxuICogY29uZGl0aW9ucyBvZiBTZWN0aW9uIDIgb2YgdGhlIFNwaW5lIEVkaXRvciBMaWNlbnNlIEFncmVlbWVudDpcbiAqIGh0dHA6Ly9lc290ZXJpY3NvZnR3YXJlLmNvbS9zcGluZS1lZGl0b3ItbGljZW5zZVxuICpcbiAqIE90aGVyd2lzZSwgaXQgaXMgcGVybWl0dGVkIHRvIGludGVncmF0ZSB0aGUgU3BpbmUgUnVudGltZXMgaW50byBzb2Z0d2FyZSBvclxuICogb3RoZXJ3aXNlIGNyZWF0ZSBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyAoY29sbGVjdGl2ZWx5LFxuICogXCJQcm9kdWN0c1wiKSwgcHJvdmlkZWQgdGhhdCBlYWNoIHVzZXIgb2YgdGhlIFByb2R1Y3RzIG11c3Qgb2J0YWluIHRoZWlyIG93blxuICogU3BpbmUgRWRpdG9yIGxpY2Vuc2UgYW5kIHJlZGlzdHJpYnV0aW9uIG9mIHRoZSBQcm9kdWN0cyBpbiBhbnkgZm9ybSBtdXN0XG4gKiBpbmNsdWRlIHRoaXMgbGljZW5zZSBhbmQgY29weXJpZ2h0IG5vdGljZS5cbiAqXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMgQVJFIFBST1ZJREVEIEJZIEVTT1RFUklDIFNPRlRXQVJFIExMQyBcIkFTIElTXCIgQU5EIEFOWVxuICogRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRFxuICogV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRVxuICogRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgRVNPVEVSSUMgU09GVFdBUkUgTExDIEJFIExJQUJMRSBGT1IgQU5ZXG4gKiBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICogKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTLFxuICogQlVTSU5FU1MgSU5URVJSVVBUSU9OLCBPUiBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUykgSE9XRVZFUiBDQVVTRUQgQU5EXG4gKiBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICogKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GIFRIRVxuICogU1BJTkUgUlVOVElNRVMsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IEFzc2V0Q2FjaGUsIEFzc2V0TWFuYWdlciwgQ29sb3IsIERpc3Bvc2FibGUsIElucHV0LCBMb2FkaW5nU2NyZWVuLCBNYW5hZ2VkV2ViR0xSZW5kZXJpbmdDb250ZXh0LCBQaHlzaWNzLCBTY2VuZVJlbmRlcmVyLCBUaW1lS2VlcGVyLCBWZWN0b3IyLCBWZWN0b3IzIH0gZnJvbSBcIkBlc290ZXJpY3NvZnR3YXJlL3NwaW5lLXdlYmdsXCJcbmltcG9ydCB7IFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24gfSBmcm9tIFwiLi9TcGluZVdlYkNvbXBvbmVudFNrZWxldG9uLmpzXCJcbmltcG9ydCB7IEF0dHJpYnV0ZVR5cGVzLCBjYXN0VmFsdWUsIFBvaW50LCBSZWN0YW5nbGUgfSBmcm9tIFwiLi93Y1V0aWxzLmpzXCJcblxuaW50ZXJmYWNlIE92ZXJsYXlBdHRyaWJ1dGVzIHtcblx0b3ZlcmxheUlkPzogc3RyaW5nXG5cdG5vQXV0b1BhcmVudFRyYW5zZm9ybTogYm9vbGVhblxuXHRvdmVyZmxvd1RvcDogbnVtYmVyXG5cdG92ZXJmbG93Qm90dG9tOiBudW1iZXJcblx0b3ZlcmZsb3dMZWZ0OiBudW1iZXJcblx0b3ZlcmZsb3dSaWdodDogbnVtYmVyXG59XG5cbmV4cG9ydCBjbGFzcyBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkgZXh0ZW5kcyBIVE1MRWxlbWVudCBpbXBsZW1lbnRzIE92ZXJsYXlBdHRyaWJ1dGVzLCBEaXNwb3NhYmxlIHtcblx0cHJpdmF0ZSBzdGF0aWMgT1ZFUkxBWV9JRCA9IFwic3BpbmUtb3ZlcmxheS1kZWZhdWx0LWlkZW50aWZpZXJcIjtcblx0cHJpdmF0ZSBzdGF0aWMgT1ZFUkxBWV9MSVNUID0gbmV3IE1hcDxzdHJpbmcsIFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheT4oKTtcblxuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqL1xuXHRzdGF0aWMgZ2V0T3JDcmVhdGVPdmVybGF5IChvdmVybGF5SWQ6IHN0cmluZyB8IG51bGwpOiBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkge1xuXHRcdGNvbnN0IGlkID0gb3ZlcmxheUlkIHx8IFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS5PVkVSTEFZX0lEO1xuXHRcdGxldCBvdmVybGF5ID0gU3BpbmVXZWJDb21wb25lbnRPdmVybGF5Lk9WRVJMQVlfTElTVC5nZXQoaWQpO1xuXHRcdGlmICghb3ZlcmxheSkge1xuXHRcdFx0b3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwaW5lLW92ZXJsYXknKSBhcyBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXk7XG5cdFx0XHRvdmVybGF5LnNldEF0dHJpYnV0ZSgnb3ZlcmxheS1pZCcsIGlkKTtcblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG5cdFx0fVxuXHRcdHJldHVybiBvdmVybGF5O1xuXHR9XG5cblx0LyoqXG5cdCAqIElmIHRydWUsIGVuYWJsZXMgYSB0b3AtbGVmdCBzcGFuIHNob3dpbmcgRlBTIChpdCBoYXMgYmxhY2sgdGV4dClcblx0ICovXG5cdHB1YmxpYyBzdGF0aWMgU0hPV19GUFMgPSBmYWxzZTtcblxuXHQvKipcblx0ICogQSBsaXN0IGhvbGRpbmcgdGhlIHdpZGdldHMgYWRkZWQgdG8gdGhpcyBvdmVybGF5LlxuXHQgKi9cblx0cHVibGljIHdpZGdldHMgPSBuZXcgQXJyYXk8U3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbj4oKTtcblxuXHQvKipcblx0ICogVGhlIHtAbGluayBTY2VuZVJlbmRlcmVyfSB1c2VkIGJ5IHRoaXMgb3ZlcmxheS5cblx0ICovXG5cdHB1YmxpYyByZW5kZXJlcjogU2NlbmVSZW5kZXJlcjtcblxuXHQvKipcblx0ICogVGhlIHtAbGluayBBc3NldE1hbmFnZXJ9IHVzZWQgYnkgdGhpcyBvdmVybGF5LlxuXHQgKi9cblx0cHVibGljIGFzc2V0TWFuYWdlcjogQXNzZXRNYW5hZ2VyO1xuXG5cdC8qKlxuXHQgKiBUaGUgaWRlbnRpZmllciBvZiB0aGlzIG92ZXJsYXkuIFRoaXMgaXMgbmVjZXNzYXJ5IHdoZW4gbXVsdGlwbHkgb3ZlcmxheSBhcmUgY3JlYXRlZC5cblx0ICAgKiBDb25uZWN0ZWQgdG8gYG92ZXJsYXktaWRgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBvdmVybGF5SWQ/OiBzdHJpbmc7XG5cblx0LyoqXG5cdCAqIElmIGBmYWxzZWAgKGRlZmF1bHQgdmFsdWUpLCB0aGUgb3ZlcmxheSBjb250YWluZXIgc3R5bGUgd2lsbCBiZSBhZmZlY3RlZCBhZGRpbmcgYHRyYW5zZm9ybTogdHJhbnNsYXRlWigwKTtgIHRvIGl0LlxuXHQgKiBUaGUgYHRyYW5zZm9ybWAgaXMgbm90IGFmZmVjdGVkIGlmIGl0IGFscmVhZHkgZXhpc3RzIG9uIHRoZSBjb250YWluZXIuXG5cdCAqIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIG1ha2UgdGhlIHNjcm9sbGluZyB3b3JrcyB3aXRoIGNvbnRhaW5lcnMgdGhhdCBzY3JvbGwgaW4gYSBkaWZmZXJlbnQgd2F5IHdpdGggcmVzcGVjdCB0byB0aGUgcGFnZSwgYXMgZXhwbGFpbmVkIGluIHtAbGluayBhcHBlbmRlZFRvQm9keX0uXG5cdCAqIENvbm5lY3RlZCB0byBgbm8tYXV0by1wYXJlbnQtdHJhbnNmb3JtYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgbm9BdXRvUGFyZW50VHJhbnNmb3JtID0gZmFsc2U7XG5cblx0LyoqXG5cdCAqIFRoZSBjYW52YXMgaXMgY29udGludW91c2x5IHRyYW5zbGF0ZWQgc28gdGhhdCBpdCBjb3ZlcnMgdGhlIHZpZXdwb3J0LiBUaGlzIHRyYW5zbGF0aW9uIG1pZ2h0IGJlIHNsaWdodGx5IHNsb3dlciBkdXJpbmcgZmFzdCBzY3JvbGxpbmcuXG5cdCAqIElmIHRoZSBjYW52YXMgaGFzIHRoZSBzYW1lIHNpemUgYXMgdGhlIHZpZXdwb3J0LCB3aGlsZSBzY3JvbGxpbmcgaXQgbWlnaHQgYmUgc2xpZ2hsdHkgbWlzYWxpZ25lZCB3aXRoIHRoZSB2aWV3cG9ydC5cblx0ICogVGhpcyBwYXJhbWV0ZXIgZGVmaW5lcywgYXMgcGVyY2VudGFnZSBvZiB0aGUgdmlld3BvcnQgaGVpZ2h0LCB0aGUgcGl4ZWxzIHRvIGFkZCB0byB0aGUgdG9wIG9mIHRoZSBjYW52YXMgdG8gcHJldmVudCB0aGlzIGVmZmVjdC5cblx0ICogTWFraW5nIHRoZSBjYW52YXMgdG9vIGJpZyBtaWdodCByZWR1Y2UgcGVyZm9ybWFuY2UuXG5cdCAqIERlZmF1bHQgdmFsdWU6IDAuMi5cblx0ICogQ29ubmVjdGVkIHRvIGBvdmVyZmxvdy10b3BgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBvdmVyZmxvd1RvcCA9IC4yO1xuXG5cdC8qKlxuXHQgKiBUaGUgY2FudmFzIGlzIGNvbnRpbnVvdXNseSB0cmFuc2xhdGVkIHNvIHRoYXQgaXQgY292ZXJzIHRoZSB2aWV3cG9ydC4gVGhpcyB0cmFuc2xhdGlvbiBtaWdodCBiZSBzbGlnaHRseSBzbG93ZXIgZHVyaW5nIGZhc3Qgc2Nyb2xsaW5nLlxuXHQgKiBJZiB0aGUgY2FudmFzIGhhcyB0aGUgc2FtZSBzaXplIGFzIHRoZSB2aWV3cG9ydCwgd2hpbGUgc2Nyb2xsaW5nIGl0IG1pZ2h0IGJlIHNsaWdobHR5IG1pc2FsaWduZWQgd2l0aCB0aGUgdmlld3BvcnQuXG5cdCAqIFRoaXMgcGFyYW1ldGVyIGRlZmluZXMsIGFzIHBlcmNlbnRhZ2Ugb2YgdGhlIHZpZXdwb3J0IGhlaWdodCwgdGhlIHBpeGVscyB0byBhZGQgdG8gdGhlIGJvdHRvbSBvZiB0aGUgY2FudmFzIHRvIHByZXZlbnQgdGhpcyBlZmZlY3QuXG5cdCAqIE1ha2luZyB0aGUgY2FudmFzIHRvbyBiaWcgbWlnaHQgcmVkdWNlIHBlcmZvcm1hbmNlLlxuXHQgKiBEZWZhdWx0IHZhbHVlOiAwLlxuXHQgKiBDb25uZWN0ZWQgdG8gYG92ZXJmbG93LWJvdHRvbWAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIG92ZXJmbG93Qm90dG9tID0gLjA7XG5cblx0LyoqXG5cdCAqIFRoZSBjYW52YXMgaXMgY29udGludW91c2x5IHRyYW5zbGF0ZWQgc28gdGhhdCBpdCBjb3ZlcnMgdGhlIHZpZXdwb3J0LiBUaGlzIHRyYW5zbGF0aW9uIG1pZ2h0IGJlIHNsaWdodGx5IHNsb3dlciBkdXJpbmcgZmFzdCBzY3JvbGxpbmcuXG5cdCAqIElmIHRoZSBjYW52YXMgaGFzIHRoZSBzYW1lIHNpemUgYXMgdGhlIHZpZXdwb3J0LCB3aGlsZSBzY3JvbGxpbmcgaXQgbWlnaHQgYmUgc2xpZ2hsdHkgbWlzYWxpZ25lZCB3aXRoIHRoZSB2aWV3cG9ydC5cblx0ICogVGhpcyBwYXJhbWV0ZXIgZGVmaW5lcywgYXMgcGVyY2VudGFnZSBvZiB0aGUgdmlld3BvcnQgd2lkdGgsIHRoZSBwaXhlbHMgdG8gYWRkIHRvIHRoZSBsZWZ0IG9mIHRoZSBjYW52YXMgdG8gcHJldmVudCB0aGlzIGVmZmVjdC5cblx0ICogTWFraW5nIHRoZSBjYW52YXMgdG9vIGJpZyBtaWdodCByZWR1Y2UgcGVyZm9ybWFuY2UuXG5cdCAqIERlZmF1bHQgdmFsdWU6IDAuXG5cdCAqIENvbm5lY3RlZCB0byBgb3ZlcmZsb3ctbGVmdGAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIG92ZXJmbG93TGVmdCA9IC4wO1xuXG5cdC8qKlxuXHQgKiBUaGUgY2FudmFzIGlzIGNvbnRpbnVvdXNseSB0cmFuc2xhdGVkIHNvIHRoYXQgaXQgY292ZXJzIHRoZSB2aWV3cG9ydC4gVGhpcyB0cmFuc2xhdGlvbiBtaWdodCBiZSBzbGlnaHRseSBzbG93ZXIgZHVyaW5nIGZhc3Qgc2Nyb2xsaW5nLlxuXHQgKiBJZiB0aGUgY2FudmFzIGhhcyB0aGUgc2FtZSBzaXplIGFzIHRoZSB2aWV3cG9ydCwgd2hpbGUgc2Nyb2xsaW5nIGl0IG1pZ2h0IGJlIHNsaWdobHR5IG1pc2FsaWduZWQgd2l0aCB0aGUgdmlld3BvcnQuXG5cdCAqIFRoaXMgcGFyYW1ldGVyIGRlZmluZXMsIGFzIHBlcmNlbnRhZ2Ugb2YgdGhlIHZpZXdwb3J0IHdpZHRoLCB0aGUgcGl4ZWxzIHRvIGFkZCB0byB0aGUgcmlnaHQgb2YgdGhlIGNhbnZhcyB0byBwcmV2ZW50IHRoaXMgZWZmZWN0LlxuXHQgKiBNYWtpbmcgdGhlIGNhbnZhcyB0b28gYmlnIG1pZ2h0IHJlZHVjZSBwZXJmb3JtYW5jZS5cblx0ICogRGVmYXVsdCB2YWx1ZTogMC5cblx0ICogQ29ubmVjdGVkIHRvIGBvdmVyZmxvdy1yaWdodGAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIG92ZXJmbG93UmlnaHQgPSAuMDtcblxuXHRwcml2YXRlIHJvb3Q6IFNoYWRvd1Jvb3Q7XG5cblx0cHJpdmF0ZSBkaXY6IEhUTUxEaXZFbGVtZW50O1xuXHRwcml2YXRlIGJvbmVGb2xsb3dlcnNQYXJlbnQ6IEhUTUxEaXZFbGVtZW50O1xuXHRwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG5cdHByaXZhdGUgZnBzOiBIVE1MU3BhbkVsZW1lbnQ7XG5cdHByaXZhdGUgZnBzQXBwZW5kZWQgPSBmYWxzZTtcblxuXHRwcml2YXRlIGludGVyc2VjdGlvbk9ic2VydmVyPzogSW50ZXJzZWN0aW9uT2JzZXJ2ZXI7XG5cdHByaXZhdGUgcmVzaXplT2JzZXJ2ZXI/OiBSZXNpemVPYnNlcnZlcjtcblx0cHJpdmF0ZSBpbnB1dD86IElucHV0O1xuXG5cdHByaXZhdGUgb3ZlcmZsb3dMZWZ0U2l6ZSA9IDA7XG5cdHByaXZhdGUgb3ZlcmZsb3dUb3BTaXplID0gMDtcblxuXHRwcml2YXRlIGxhc3RDYW52YXNCYXNlV2lkdGggPSAwO1xuXHRwcml2YXRlIGxhc3RDYW52YXNCYXNlSGVpZ2h0ID0gMDtcblxuXHRwcml2YXRlIHpJbmRleD86IG51bWJlcjtcblxuXHRwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG5cdHByaXZhdGUgbG9hZGVkID0gZmFsc2U7XG5cdHByaXZhdGUgcnVubmluZyA9IGZhbHNlO1xuXHRwcml2YXRlIHZpc2libGUgPSB0cnVlO1xuXG5cdC8qKlxuXHQgKiBhcHBlbmRlZFRvQm9keSBpcyBhc3NlZ25lZCBpbiB0aGUgY29ubmVjdGVkQ2FsbGJhY2suXG5cdCAqIFdoZW4gZmFsc2UsIHRoZSBvdmVybGF5IHdpbGwgaGF2ZSB0aGUgc2l6ZSBvZiB0aGUgZWxlbWVudCBjb250YWluZXIgaW4gY29udHJhc3QgdG8gdGhlIGRlZmF1bHQgYmVoYXZpb3VyIHdoZXJlIHRoZVxuXHQgKiBvdmVybGF5IGhhcyBhbHdheXMgdGhlIHNpemUgb2YgdGhlIHZpZXdwb3J0LlxuXHQgKiBUaGlzIGlzIG5lY2Vzc2FyeSB3aGVuIHRoZSBvdmVybGF5IGlzIGluc2VydGVkIGludG8gYSBjb250YWluZXIgdGhhdCBzY3JvbGwgaW4gYSBkaWZmZXJlbnQgd2F5IHdpdGggcmVzcGVjdCB0byB0aGUgcGFnZS5cblx0ICogT3RoZXJ3aXNlIHRoZSBmb2xsb3dpbmcgcHJvYmxlbXMgbWlnaHQgb2NjdXI6XG5cdCAqIDEpIEZvciBjb250YWluZXJzIGFwcGVuZGVkVG9Cb2R5LCB0aGUgd2lkZ2V0IHdpbGwgYmUgc2xpZ2h0bHkgc2xvd2VyIHRvIHNjcm9sbCB0aGFuIHRoZSBodG1sIGJlaGluZC4gVGhlIGVmZmVjdCBpcyBtb3JlIGV2aWRlbnQgZm9yIGxvd2VyIHJlZnJlc2ggcmF0ZSBkaXNwbGF5LlxuXHQgKiAyKSBGb3IgY29udGFpbmVycyBhcHBlbmRlZFRvQm9keSwgdGhlIHdpZGdldCB3aWxsIG92ZXJmbG93IHRoZSBjb250YWluZXIgYm91bmRzIHVudGlsIHRoZSB3aWRnZXQgaHRtbCBlbGVtZW50IGNvbnRhaW5lciBpcyB2aXNpYmxlXG5cdCAqIDMpIEZvciBmaXhlZCBjb250YWluZXJzLCB0aGUgd2lkZ2V0IHdpbGwgc2Nyb2xsIGluIGEgamVya3kgd2F5XG5cdCAqXG5cdCAqIEluIG9yZGVyIHRvIGZpeCB0aGlzIGJlaGF2aW91ciwgaXQgaXMgbmVjZXNzYXJ5IHRvIGluc2VydCBhIGRlZGljYXRlZCBgc3BpbmUtb3ZlcmxheWAgd2ViY29tcG9uZW50IGFzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSBjb250YWluZXIuXG5cdCAqIE1vcmVvdmVyLCBpdCBpcyBuZWNlc3NhcnkgdG8gcGVyZm9ybSB0aGUgZm9sbG93aW5nIGFjdGlvbnM6XG5cdCAqIDEpIFRoZSBhcHBlbmRlZFRvQm9keSBjb250YWluZXIgbXVzdCBoYXZlIGEgYHRyYW5zZm9ybWAgY3NzIGF0dHJpYnV0ZS4gSWYgaXQgaGFzbid0IHRoaXMgYXR0cmlidXRlIHRoZSBgc3BpbmUtb3ZlcmxheWAgd2lsbCBhZGQgaXQgZm9yIHlvdS5cblx0ICogSWYgeW91ciBhcHBlbmRlZFRvQm9keSBjb250YWluZXIgaGFzIGFscmVhZHkgdGhpcyBjc3MgYXR0cmlidXRlLCBvciBpZiB5b3UgcHJlZmVyIHRvIGFkZCBpdCBieSB5b3Vyc2VsZiAoZXhhbXBsZTogYHRyYW5zZm9ybTogdHJhbnNsYXRlWigwKTtgKSwgc2V0IHRoZSBgbm8tYXV0by1wYXJlbnQtdHJhbnNmb3JtYCB0byB0aGUgYHNwaW5lLW92ZXJsYXlgLlxuXHQgKiAyKSBUaGUgYHNwaW5lLW92ZXJsYXlgIG11c3QgaGF2ZSBhbiBgb3ZlcmxheS1pZGAgYXR0cmlidXRlLiBDaG9vc2UgdGhlIHZhbHVlIHlvdSBwcmVmZXIuXG5cdCAqIDMpIEVhY2ggYHNwaW5lLXNrZWxldG9uYCBtdXN0IGhhdmUgYW4gYG92ZXJsYXktaWRgIGF0dHJpYnV0ZS4gVGhlIHNhbWUgYXMgdGhlIGhvc3RpbmcgYHNwaW5lLW92ZXJsYXlgLlxuXHQgICAqIENvbm5lY3RlZCB0byBgYXBwZW5kZWRUb0JvZHlgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHByaXZhdGUgYXBwZW5kZWRUb0JvZHkgPSB0cnVlO1xuXHRwcml2YXRlIGhhc1BhcmVudFRyYW5zZm9ybSA9IHRydWU7XG5cblx0cmVhZG9ubHkgdGltZSA9IG5ldyBUaW1lS2VlcGVyKCk7XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5yb290ID0gdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiBcIm9wZW5cIiB9KTtcblxuXHRcdHRoaXMuZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHR0aGlzLmRpdi5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcblx0XHR0aGlzLmRpdi5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHR0aGlzLmRpdi5zdHlsZS5sZWZ0ID0gXCIwXCI7XG5cdFx0dGhpcy5kaXYuc3R5bGUuc2V0UHJvcGVydHkoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cdFx0dGhpcy5kaXYuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiXG5cdFx0Ly8gdGhpcy5kaXYuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCJyZ2JhKDAsIDI1NSwgMCwgMC4xKVwiO1xuXG5cdFx0dGhpcy5yb290LmFwcGVuZENoaWxkKHRoaXMuZGl2KTtcblxuXHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcblx0XHR0aGlzLmJvbmVGb2xsb3dlcnNQYXJlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXG5cdFx0dGhpcy5kaXYuYXBwZW5kQ2hpbGQodGhpcy5jYW52YXMpO1xuXHRcdHRoaXMuY2FudmFzLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuXHRcdHRoaXMuY2FudmFzLnN0eWxlLnRvcCA9IFwiMFwiO1xuXHRcdHRoaXMuY2FudmFzLnN0eWxlLmxlZnQgPSBcIjBcIjtcblxuXHRcdHRoaXMuZGl2LmFwcGVuZENoaWxkKHRoaXMuYm9uZUZvbGxvd2Vyc1BhcmVudCk7XG5cdFx0dGhpcy5ib25lRm9sbG93ZXJzUGFyZW50LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuXHRcdHRoaXMuYm9uZUZvbGxvd2Vyc1BhcmVudC5zdHlsZS50b3AgPSBcIjBcIjtcblx0XHR0aGlzLmJvbmVGb2xsb3dlcnNQYXJlbnQuc3R5bGUubGVmdCA9IFwiMFwiO1xuXHRcdHRoaXMuYm9uZUZvbGxvd2Vyc1BhcmVudC5zdHlsZS53aGl0ZVNwYWNlID0gXCJub3dyYXBcIjtcblx0XHR0aGlzLmJvbmVGb2xsb3dlcnNQYXJlbnQuc3R5bGUuc2V0UHJvcGVydHkoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cdFx0dGhpcy5ib25lRm9sbG93ZXJzUGFyZW50LnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoMHB4LDBweClgO1xuXG5cdFx0dGhpcy5jYW52YXMuc3R5bGUuc2V0UHJvcGVydHkoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cdFx0dGhpcy5jYW52YXMuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgwcHgsMHB4KWA7XG5cdFx0Ly8gdGhpcy5jYW52YXMuc3R5bGUuc2V0UHJvcGVydHkoXCJ3aWxsLWNoYW5nZVwiLCBcInRyYW5zZm9ybVwiKTsgLy8gcGVyZm9ybWFuY2Ugc2VlbXMgdG8gYmUgZXZlbiB3b3JzZSB3aXRoIHRoaXMgdW5jb21tZW50ZWRcblxuXHRcdHRoaXMuZnBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG5cdFx0dGhpcy5mcHMuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XG5cdFx0dGhpcy5mcHMuc3R5bGUudG9wID0gXCIwXCI7XG5cdFx0dGhpcy5mcHMuc3R5bGUubGVmdCA9IFwiMFwiO1xuXG5cdFx0Y29uc3QgY29udGV4dCA9IG5ldyBNYW5hZ2VkV2ViR0xSZW5kZXJpbmdDb250ZXh0KHRoaXMuY2FudmFzLCB7IGFscGhhOiB0cnVlIH0pO1xuXHRcdHRoaXMucmVuZGVyZXIgPSBuZXcgU2NlbmVSZW5kZXJlcih0aGlzLmNhbnZhcywgY29udGV4dCk7XG5cblx0XHR0aGlzLmFzc2V0TWFuYWdlciA9IG5ldyBBc3NldE1hbmFnZXIoY29udGV4dCk7XG5cdH1cblxuXHRjb25uZWN0ZWRDYWxsYmFjayAoKTogdm9pZCB7XG5cdFx0dGhpcy5hcHBlbmRlZFRvQm9keSA9IHRoaXMucGFyZW50RWxlbWVudCA9PT0gZG9jdW1lbnQuYm9keTtcblxuXHRcdGxldCBvdmVybGF5SWQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnb3ZlcmxheS1pZCcpO1xuXHRcdGlmICghb3ZlcmxheUlkKSB7XG5cdFx0XHRvdmVybGF5SWQgPSBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkuT1ZFUkxBWV9JRDtcblx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKCdvdmVybGF5LWlkJywgb3ZlcmxheUlkKTtcblx0XHR9XG5cblx0XHR0aGlzLmFzc2V0TWFuYWdlci5zZXRDYWNoZShBc3NldENhY2hlLmdldENhY2hlKG92ZXJsYXlJZCkpO1xuXG5cdFx0Y29uc3QgZXhpc3RpbmdPdmVybGF5ID0gU3BpbmVXZWJDb21wb25lbnRPdmVybGF5Lk9WRVJMQVlfTElTVC5nZXQob3ZlcmxheUlkKTtcblx0XHRpZiAoZXhpc3RpbmdPdmVybGF5ICYmIGV4aXN0aW5nT3ZlcmxheSAhPT0gdGhpcykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBcIlNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheSAtIFlvdSBjYW5ub3QgaGF2ZSB0d28gc3BpbmUtb3ZlcmxheSB3aXRoIHRoZSBzYW1lIG92ZXJsYXktaWQ6ICR7b3ZlcmxheUlkfVwiYCk7XG5cdFx0fVxuXHRcdFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS5PVkVSTEFZX0xJU1Quc2V0KG92ZXJsYXlJZCwgdGhpcyk7XG5cdFx0Ly8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgdGhpcy5zY3JvbGxlZENhbGxiYWNrKTtcblxuXHRcdGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9PSBcImNvbXBsZXRlXCIpIHtcblx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCB0aGlzLmxvYWRlZENhbGxiYWNrKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5sb2FkZWRDYWxsYmFjaygpO1xuXHRcdH1cblxuXHRcdHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24uYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5vcmllbnRhdGlvbkNoYW5nZWRDYWxsYmFjayk7XG5cblx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKCh3aWRnZXRzKSA9PiB7XG5cdFx0XHRmb3IgKGNvbnN0IGVsZW0gb2Ygd2lkZ2V0cykge1xuXHRcdFx0XHRjb25zdCB7IHRhcmdldCwgaW50ZXJzZWN0aW9uUmF0aW8gfSA9IGVsZW07XG5cdFx0XHRcdGxldCB7IGlzSW50ZXJzZWN0aW5nIH0gPSBlbGVtO1xuXHRcdFx0XHRmb3IgKGNvbnN0IHdpZGdldCBvZiB0aGlzLndpZGdldHMpIHtcblx0XHRcdFx0XHRpZiAod2lkZ2V0LmdldEhvc3RFbGVtZW50KCkgIT0gdGFyZ2V0KSBjb250aW51ZTtcblxuXHRcdFx0XHRcdC8vIG9sZCBicm93c2VycyBkbyBub3QgaGF2ZSBpc0ludGVyc2VjdGluZ1xuXHRcdFx0XHRcdGlmIChpc0ludGVyc2VjdGluZyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRpc0ludGVyc2VjdGluZyA9IGludGVyc2VjdGlvblJhdGlvID4gMDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3aWRnZXQub25TY3JlZW4gPSBpc0ludGVyc2VjdGluZztcblx0XHRcdFx0XHRpZiAoaXNJbnRlcnNlY3RpbmcpIHtcblx0XHRcdFx0XHRcdHdpZGdldC5vblNjcmVlbkZ1bmN0aW9uKHdpZGdldCk7XG5cdFx0XHRcdFx0XHR3aWRnZXQub25TY3JlZW5BdExlYXN0T25jZSA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSwgeyByb290TWFyZ2luOiBcIjMwcHggMjBweCAzMHB4IDIwcHhcIiB9KTtcblxuXHRcdC8vIGlmIHRoZSBlbGVtZW50IGlzIG5vdCBhcHBlbmRlZFRvQm9keSwgdGhlIHVzZXIgZG9lcyBub3QgZGlzYWJsZSB0cmFuc2xhdGUgdHdlYWssIGFuZCB0aGUgcGFyZW50IGRpZCBub3QgaGF2ZSBhbHJlYWR5IGEgdHJhbnNmb3JtLCBhZGQgdGhlIHR3ZWFrXG5cdFx0aWYgKCF0aGlzLmFwcGVuZGVkVG9Cb2R5KSB7XG5cdFx0XHRpZiAodGhpcy5oYXNDc3NUd2Vha09mZigpKSB7XG5cdFx0XHRcdHRoaXMuaGFzUGFyZW50VHJhbnNmb3JtID0gZmFsc2U7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnBhcmVudEVsZW1lbnQhLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGVaKDApYDtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgdGhpcy53aW5kb3dSZXNpemVDYWxsYmFjayk7XG5cdFx0fVxuXHRcdHRoaXMucmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKCkgPT4gdGhpcy5yZXNpemVkQ2FsbGJhY2soKSk7XG5cdFx0dGhpcy5yZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMucGFyZW50RWxlbWVudCEpO1xuXG5cdFx0Zm9yIChjb25zdCB3aWRnZXQgb2YgdGhpcy53aWRnZXRzKSB7XG5cdFx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyPy5vYnNlcnZlKHdpZGdldC5nZXRIb3N0RWxlbWVudCgpKTtcblx0XHR9XG5cdFx0dGhpcy5pbnB1dCA9IHRoaXMuc2V0dXBEcmFnVXRpbGl0eSgpO1xuXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIHRoaXMudmlzaWJpbGl0eUNoYW5nZUNhbGxiYWNrKTtcblxuXHRcdHRoaXMuc3RhcnRSZW5kZXJpbmdMb29wKCk7XG5cdH1cblxuXHRkaXNjb25uZWN0ZWRDYWxsYmFjayAoKTogdm9pZCB7XG5cdFx0Y29uc3QgaWQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnb3ZlcmxheS1pZCcpO1xuXHRcdGlmIChpZCkgU3BpbmVXZWJDb21wb25lbnRPdmVybGF5Lk9WRVJMQVlfTElTVC5kZWxldGUoaWQpO1xuXHRcdC8vIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIHRoaXMuc2Nyb2xsZWRDYWxsYmFjayk7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHRoaXMubG9hZGVkQ2FsbGJhY2spO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIHRoaXMud2luZG93UmVzaXplQ2FsbGJhY2spO1xuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCB0aGlzLnZpc2liaWxpdHlDaGFuZ2VDYWxsYmFjayk7XG5cdFx0d2luZG93LnNjcmVlbi5vcmllbnRhdGlvbi5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9yaWVudGF0aW9uQ2hhbmdlZENhbGxiYWNrKTtcblx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyPy5kaXNjb25uZWN0KCk7XG5cdFx0dGhpcy5yZXNpemVPYnNlcnZlcj8uZGlzY29ubmVjdCgpO1xuXHRcdHRoaXMuaW5wdXQ/LmRpc3Bvc2UoKTtcblx0fVxuXG5cdHN0YXRpYyBhdHRyaWJ1dGVzRGVzY3JpcHRpb246IFJlY29yZDxzdHJpbmcsIHsgcHJvcGVydHlOYW1lOiBrZXlvZiBPdmVybGF5QXR0cmlidXRlcywgdHlwZTogQXR0cmlidXRlVHlwZXMsIGRlZmF1bHRWYWx1ZT86IGFueSB9PiA9IHtcblx0XHRcIm92ZXJsYXktaWRcIjogeyBwcm9wZXJ0eU5hbWU6IFwib3ZlcmxheUlkXCIsIHR5cGU6IFwic3RyaW5nXCIgfSxcblx0XHRcIm5vLWF1dG8tcGFyZW50LXRyYW5zZm9ybVwiOiB7IHByb3BlcnR5TmFtZTogXCJub0F1dG9QYXJlbnRUcmFuc2Zvcm1cIiwgdHlwZTogXCJib29sZWFuXCIgfSxcblx0XHRcIm92ZXJmbG93LXRvcFwiOiB7IHByb3BlcnR5TmFtZTogXCJvdmVyZmxvd1RvcFwiLCB0eXBlOiBcIm51bWJlclwiIH0sXG5cdFx0XCJvdmVyZmxvdy1ib3R0b21cIjogeyBwcm9wZXJ0eU5hbWU6IFwib3ZlcmZsb3dCb3R0b21cIiwgdHlwZTogXCJudW1iZXJcIiB9LFxuXHRcdFwib3ZlcmZsb3ctbGVmdFwiOiB7IHByb3BlcnR5TmFtZTogXCJvdmVyZmxvd0xlZnRcIiwgdHlwZTogXCJudW1iZXJcIiB9LFxuXHRcdFwib3ZlcmZsb3ctcmlnaHRcIjogeyBwcm9wZXJ0eU5hbWU6IFwib3ZlcmZsb3dSaWdodFwiLCB0eXBlOiBcIm51bWJlclwiIH0sXG5cdH1cblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKTogc3RyaW5nW10ge1xuXHRcdHJldHVybiBPYmplY3Qua2V5cyhTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkuYXR0cmlidXRlc0Rlc2NyaXB0aW9uKTtcblx0fVxuXG5cdGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayAobmFtZTogc3RyaW5nLCBvbGRWYWx1ZTogc3RyaW5nIHwgbnVsbCwgbmV3VmFsdWU6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcblx0XHRjb25zdCB7IHR5cGUsIHByb3BlcnR5TmFtZSwgZGVmYXVsdFZhbHVlIH0gPSBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkuYXR0cmlidXRlc0Rlc2NyaXB0aW9uW25hbWVdO1xuXHRcdGNvbnN0IHZhbCA9IGNhc3RWYWx1ZSh0eXBlLCBuZXdWYWx1ZSwgZGVmYXVsdFZhbHVlKTtcblx0XHQodGhpcyBhcyBhbnkpW3Byb3BlcnR5TmFtZV0gPSB2YWw7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0cHJpdmF0ZSB2aXNpYmlsaXR5Q2hhbmdlQ2FsbGJhY2sgPSAoKSA9PiB7XG5cdFx0aWYgKGRvY3VtZW50LmhpZGRlbikge1xuXHRcdFx0dGhpcy52aXNpYmxlID0gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMudmlzaWJsZSA9IHRydWU7XG5cdFx0XHR0aGlzLnN0YXJ0UmVuZGVyaW5nTG9vcCgpO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgd2luZG93UmVzaXplQ2FsbGJhY2sgPSAoKSA9PiB0aGlzLnJlc2l6ZWRDYWxsYmFjayh0cnVlKTtcblxuXHRwcml2YXRlIHJlc2l6ZWRDYWxsYmFjayA9IChvbmx5RGl2ID0gZmFsc2UpID0+IHtcblx0XHR0aGlzLnVwZGF0ZUNhbnZhc1NpemUob25seURpdik7XG5cdH1cblxuXHRwcml2YXRlIG9yaWVudGF0aW9uQ2hhbmdlZENhbGxiYWNrID0gKCkgPT4ge1xuXHRcdHRoaXMudXBkYXRlQ2FudmFzU2l6ZSgpO1xuXHRcdC8vIGFmdGVyIGFuIG9yaWVudGF0aW9uIGNoYW5nZSB0aGUgc2Nyb2xsaW5nIGNoYW5nZXMsIGJ1dCB0aGUgc2Nyb2xsIGV2ZW50IGRvZXMgbm90IGZpcmVcblx0XHR0aGlzLnNjcm9sbGVkQ2FsbGJhY2soKTtcblx0fVxuXG5cdC8vIHJpZ2h0IG5vdywgd2Ugc2Nyb2xsIHRoZSBjYW52YXMgZWFjaCBmcmFtZSBiZWZvcmUgcmVuZGVyaW5nIGxvb3AsIHRoYXQgbWFrZXMgc2Nyb2xsaW5nIG9uIG1vYmlsZSB3YWFheSBtb3JlIHNtb290aGVyXG5cdC8vIHRoaXMgaXMgd2F5IHNjcm9sbCBoYW5kbGVyIGRvIG5vdGhpbmdcblx0cHJpdmF0ZSBzY3JvbGxlZENhbGxiYWNrID0gKCkgPT4ge1xuXHRcdC8vIHRoaXMudHJhbnNsYXRlQ2FudmFzKCk7XG5cdH1cblxuXHRwcml2YXRlIGxvYWRlZENhbGxiYWNrID0gKCkgPT4ge1xuXHRcdHRoaXMudXBkYXRlQ2FudmFzU2l6ZSgpO1xuXHRcdHRoaXMuc2Nyb2xsZWRDYWxsYmFjaygpO1xuXHRcdGlmICghdGhpcy5sb2FkZWQpIHtcblx0XHRcdHRoaXMubG9hZGVkID0gdHJ1ZTtcblx0XHRcdHRoaXMucGFyZW50RWxlbWVudCEuYXBwZW5kQ2hpbGQodGhpcyk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBoYXNDc3NUd2Vha09mZiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMubm9BdXRvUGFyZW50VHJhbnNmb3JtICYmIGdldENvbXB1dGVkU3R5bGUodGhpcy5wYXJlbnRFbGVtZW50ISkudHJhbnNmb3JtID09PSBcIm5vbmVcIjtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZW1vdmUgdGhlIG92ZXJsYXkgZnJvbSB0aGUgRE9NLCBkaXNwb3NlIGFsbCB0aGUgY29udGFpbmVkIHdpZGdldHMsIGFuZCBkaXNwb3NlIHRoZSByZW5kZXJlci5cblx0ICovXG5cdGRpc3Bvc2UgKCk6IHZvaWQge1xuXHRcdGZvciAoY29uc3Qgd2lkZ2V0IG9mIFsuLi50aGlzLndpZGdldHNdKSB3aWRnZXQuZGlzcG9zZSgpO1xuXG5cdFx0dGhpcy5yZW1vdmUoKTtcblx0XHR0aGlzLndpZGdldHMubGVuZ3RoID0gMDtcblx0XHR0aGlzLnJlbmRlcmVyLmRpc3Bvc2UoKTtcblx0XHR0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcblx0XHR0aGlzLmFzc2V0TWFuYWdlci5kaXNwb3NlKCk7XG5cdH1cblxuXHQvKipcblx0ICogQWRkIHRoZSB3aWRnZXQgdG8gdGhlIG92ZXJsYXkuXG5cdCAqIElmIHRoZSB3aWRnZXQgaXMgYWZ0ZXIgdGhlIG92ZXJsYXkgaW4gdGhlIERPTSwgdGhlIG92ZXJsYXkgaXMgYXBwZW5kZWQgYWZ0ZXIgdGhlIHdpZGdldC5cblx0ICogQHBhcmFtIHdpZGdldCBUaGUgd2lkZ2V0IHRvIGFkZCB0byB0aGUgb3ZlcmxheVxuXHQgKi9cblx0YWRkV2lkZ2V0ICh3aWRnZXQ6IFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24pIHtcblx0XHR0aGlzLndpZGdldHMucHVzaCh3aWRnZXQpO1xuXHRcdHRoaXMuaW50ZXJzZWN0aW9uT2JzZXJ2ZXI/Lm9ic2VydmUod2lkZ2V0LmdldEhvc3RFbGVtZW50KCkpO1xuXHRcdGlmICh0aGlzLmxvYWRlZCkge1xuXHRcdFx0Y29uc3QgY29tcGFyaXNvbiA9IHRoaXMuY29tcGFyZURvY3VtZW50UG9zaXRpb24od2lkZ2V0KTtcblx0XHRcdC8vIERPQ1VNRU5UX1BPU0lUSU9OX0RJU0NPTk5FQ1RFRCBpcyBuZWVkZWQgd2hlbiBhIHdpZGdldCBpcyBpbnNpZGUgdGhlIG92ZXJsYXkgKGR1ZSB0byBmb2xsb3dCb25lKVxuXHRcdFx0aWYgKChjb21wYXJpc29uICYgTm9kZS5ET0NVTUVOVF9QT1NJVElPTl9GT0xMT1dJTkcpICYmICEoY29tcGFyaXNvbiAmIE5vZGUuRE9DVU1FTlRfUE9TSVRJT05fRElTQ09OTkVDVEVEKSkge1xuXHRcdFx0XHR0aGlzLnBhcmVudEVsZW1lbnQhLmFwcGVuZENoaWxkKHRoaXMpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMudXBkYXRlWkluZGV4SWZOZWNlc3Nhcnkod2lkZ2V0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZW1vdmUgdGhlIHdpZGdldCBmcm9tIHRoZSBvdmVybGF5LlxuXHQgKiBAcGFyYW0gd2lkZ2V0IFRoZSB3aWRnZXQgdG8gcmVtb3ZlIGZyb20gdGhlIG92ZXJsYXlcblx0ICovXG5cdHJlbW92ZVdpZGdldCAod2lkZ2V0OiBTcGluZVdlYkNvbXBvbmVudFNrZWxldG9uKSB7XG5cdFx0Y29uc3QgaW5kZXggPSB0aGlzLndpZGdldHMuZmluZEluZGV4KHcgPT4gdyA9PT0gd2lkZ2V0KTtcblx0XHRpZiAoaW5kZXggPT09IC0xKSByZXR1cm4gZmFsc2U7XG5cblx0XHR0aGlzLndpZGdldHMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyPy51bm9ic2VydmUod2lkZ2V0LmdldEhvc3RFbGVtZW50KCkpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0YWRkU2xvdEZvbGxvd2VyRWxlbWVudCAoZWxlbWVudDogSFRNTEVsZW1lbnQpIHtcblx0XHR0aGlzLmJvbmVGb2xsb3dlcnNQYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cdFx0dGhpcy5yZXNpemVkQ2FsbGJhY2soKTtcblx0fVxuXG5cdHByaXZhdGUgdGVtcEZvbGxvd0JvbmVWZWN0b3IgPSBuZXcgVmVjdG9yMygpO1xuXHRwcml2YXRlIHN0YXJ0UmVuZGVyaW5nTG9vcCAoKSB7XG5cdFx0aWYgKHRoaXMucnVubmluZykgcmV0dXJuO1xuXG5cdFx0Y29uc3QgdXBkYXRlV2lkZ2V0cyA9ICgpID0+IHtcblx0XHRcdGNvbnN0IGRlbHRhID0gdGhpcy50aW1lLmRlbHRhO1xuXHRcdFx0Zm9yIChjb25zdCB7IHNrZWxldG9uLCBzdGF0ZSwgdXBkYXRlLCBvblNjcmVlbiwgb2ZmU2NyZWVuVXBkYXRlQmVoYXZpb3VyLCBiZWZvcmVVcGRhdGVXb3JsZFRyYW5zZm9ybXMsIGFmdGVyVXBkYXRlV29ybGRUcmFuc2Zvcm1zIH0gb2YgdGhpcy53aWRnZXRzKSB7XG5cdFx0XHRcdGlmICghc2tlbGV0b24gfHwgIXN0YXRlKSBjb250aW51ZTtcblx0XHRcdFx0aWYgKCFvblNjcmVlbiAmJiBvZmZTY3JlZW5VcGRhdGVCZWhhdmlvdXIgPT09IFwicGF1c2VcIikgY29udGludWU7XG5cdFx0XHRcdGlmICh1cGRhdGUpIHVwZGF0ZShkZWx0YSwgc2tlbGV0b24sIHN0YXRlKVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHQvLyBkZWx0YSA9IDBcblx0XHRcdFx0XHRzdGF0ZS51cGRhdGUoZGVsdGEpO1xuXHRcdFx0XHRcdHNrZWxldG9uLnVwZGF0ZShkZWx0YSk7XG5cblx0XHRcdFx0XHRpZiAob25TY3JlZW4gfHwgKCFvblNjcmVlbiAmJiBvZmZTY3JlZW5VcGRhdGVCZWhhdmlvdXIgPT09IFwicG9zZVwiKSkge1xuXHRcdFx0XHRcdFx0c3RhdGUuYXBwbHkoc2tlbGV0b24pO1xuXHRcdFx0XHRcdFx0YmVmb3JlVXBkYXRlV29ybGRUcmFuc2Zvcm1zKGRlbHRhLCBza2VsZXRvbiwgc3RhdGUpO1xuXHRcdFx0XHRcdFx0c2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oUGh5c2ljcy51cGRhdGUpO1xuXHRcdFx0XHRcdFx0YWZ0ZXJVcGRhdGVXb3JsZFRyYW5zZm9ybXMoZGVsdGEsIHNrZWxldG9uLCBzdGF0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIGZwcyB0b3AtbGVmdCBzcGFuXG5cdFx0XHRpZiAoU3BpbmVXZWJDb21wb25lbnRPdmVybGF5LlNIT1dfRlBTKSB7XG5cdFx0XHRcdGlmICghdGhpcy5mcHNBcHBlbmRlZCkge1xuXHRcdFx0XHRcdHRoaXMuZGl2LmFwcGVuZENoaWxkKHRoaXMuZnBzKTtcblx0XHRcdFx0XHR0aGlzLmZwc0FwcGVuZGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmZwcy5pbm5lclRleHQgPSB0aGlzLnRpbWUuZnJhbWVzUGVyU2Vjb25kLnRvRml4ZWQoMikgKyBcIiBmcHNcIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aGlzLmZwc0FwcGVuZGVkKSB7XG5cdFx0XHRcdFx0dGhpcy5kaXYucmVtb3ZlQ2hpbGQodGhpcy5mcHMpO1xuXHRcdFx0XHRcdHRoaXMuZnBzQXBwZW5kZWQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRjb25zdCBjbGVhciA9IChyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyLCBhOiBudW1iZXIpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyZXIuY29udGV4dC5nbC5jbGVhckNvbG9yKHIsIGcsIGIsIGEpO1xuXHRcdFx0dGhpcy5yZW5kZXJlci5jb250ZXh0LmdsLmNsZWFyKHRoaXMucmVuZGVyZXIuY29udGV4dC5nbC5DT0xPUl9CVUZGRVJfQklUKTtcblx0XHR9XG5cblx0XHRjb25zdCBzdGFydFNjaXNzb3IgPSAoZGl2Qm91bmRzOiBSZWN0YW5nbGUpID0+IHtcblx0XHRcdHRoaXMucmVuZGVyZXIuZW5kKCk7XG5cdFx0XHR0aGlzLnJlbmRlcmVyLmJlZ2luKCk7XG5cdFx0XHR0aGlzLnJlbmRlcmVyLmNvbnRleHQuZ2wuZW5hYmxlKHRoaXMucmVuZGVyZXIuY29udGV4dC5nbC5TQ0lTU09SX1RFU1QpO1xuXHRcdFx0dGhpcy5yZW5kZXJlci5jb250ZXh0LmdsLnNjaXNzb3IoXG5cdFx0XHRcdHRoaXMuc2NyZWVuVG9Xb3JsZExlbmd0aChkaXZCb3VuZHMueCksXG5cdFx0XHRcdHRoaXMuY2FudmFzLmhlaWdodCAtIHRoaXMuc2NyZWVuVG9Xb3JsZExlbmd0aChkaXZCb3VuZHMueSArIGRpdkJvdW5kcy5oZWlnaHQpLFxuXHRcdFx0XHR0aGlzLnNjcmVlblRvV29ybGRMZW5ndGgoZGl2Qm91bmRzLndpZHRoKSxcblx0XHRcdFx0dGhpcy5zY3JlZW5Ub1dvcmxkTGVuZ3RoKGRpdkJvdW5kcy5oZWlnaHQpXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGVuZFNjaXNzb3IgPSAoKSA9PiB7XG5cdFx0XHR0aGlzLnJlbmRlcmVyLmVuZCgpO1xuXHRcdFx0dGhpcy5yZW5kZXJlci5jb250ZXh0LmdsLmRpc2FibGUodGhpcy5yZW5kZXJlci5jb250ZXh0LmdsLlNDSVNTT1JfVEVTVCk7XG5cdFx0XHR0aGlzLnJlbmRlcmVyLmJlZ2luKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVuZGVyV2lkZ2V0cyA9ICgpID0+IHtcblx0XHRcdGNsZWFyKDAsIDAsIDAsIDApO1xuXHRcdFx0bGV0IHJlbmRlcmVyID0gdGhpcy5yZW5kZXJlcjtcblx0XHRcdHJlbmRlcmVyLmJlZ2luKCk7XG5cblx0XHRcdGxldCByZWY6IERPTVJlY3Q7XG5cdFx0XHRsZXQgb2Zmc2V0TGVmdEZvck9ldnJsYXkgPSAwO1xuXHRcdFx0bGV0IG9mZnNldFRvcEZvck92ZXJsYXkgPSAwO1xuXHRcdFx0aWYgKCF0aGlzLmFwcGVuZGVkVG9Cb2R5KSB7XG5cdFx0XHRcdHJlZiA9IHRoaXMucGFyZW50RWxlbWVudCEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRcdGNvbnN0IGNvbXB1dGVkU3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKHRoaXMucGFyZW50RWxlbWVudCEpO1xuXHRcdFx0XHRvZmZzZXRMZWZ0Rm9yT2V2cmxheSA9IHJlZi5sZWZ0ICsgcGFyc2VGbG9hdChjb21wdXRlZFN0eWxlLmJvcmRlckxlZnRXaWR0aCk7XG5cdFx0XHRcdG9mZnNldFRvcEZvck92ZXJsYXkgPSByZWYudG9wICsgcGFyc2VGbG9hdChjb21wdXRlZFN0eWxlLmJvcmRlclRvcFdpZHRoKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdGVtcFZlY3RvciA9IG5ldyBWZWN0b3IzKCk7XG5cdFx0XHRmb3IgKGNvbnN0IHdpZGdldCBvZiB0aGlzLndpZGdldHMpIHtcblx0XHRcdFx0Y29uc3QgeyBza2VsZXRvbiwgcG1hLCBib3VuZHMsIGRlYnVnLCBvZmZzZXRYLCBvZmZzZXRZLCBkcmFnWCwgZHJhZ1ksIGZpdCwgc3Bpbm5lciwgbG9hZGluZywgY2xpcCwgZHJhZyB9ID0gd2lkZ2V0O1xuXG5cdFx0XHRcdGlmICh3aWRnZXQuaXNPZmZTY3JlZW5BbmRXYXNNb3ZlZCgpKSBjb250aW51ZTtcblx0XHRcdFx0Y29uc3QgZWxlbWVudFJlZiA9IHdpZGdldC5nZXRIb3N0RWxlbWVudCgpO1xuXHRcdFx0XHRjb25zdCBkaXZCb3VuZHMgPSBlbGVtZW50UmVmLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdFx0XHQvLyBuZWVkIHRvIHVzZSBsZWZ0IGFuZCB0b3AsIGJlY2F1c2UgeCBhbmQgeSBhcmUgbm90IGF2YWlsYWJsZSBvbiBvbGRlciBicm93c2VyXG5cdFx0XHRcdGRpdkJvdW5kcy54ID0gZGl2Qm91bmRzLmxlZnQgKyB0aGlzLm92ZXJmbG93TGVmdFNpemU7XG5cdFx0XHRcdGRpdkJvdW5kcy55ID0gZGl2Qm91bmRzLnRvcCArIHRoaXMub3ZlcmZsb3dUb3BTaXplO1xuXG5cdFx0XHRcdGlmICghdGhpcy5hcHBlbmRlZFRvQm9keSkge1xuXHRcdFx0XHRcdGRpdkJvdW5kcy54IC09IG9mZnNldExlZnRGb3JPZXZybGF5O1xuXHRcdFx0XHRcdGRpdkJvdW5kcy55IC09IG9mZnNldFRvcEZvck92ZXJsYXk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCB7IHBhZExlZnQsIHBhZFJpZ2h0LCBwYWRUb3AsIHBhZEJvdHRvbSwgeEF4aXMsIHlBeGlzIH0gPSB3aWRnZXRcblx0XHRcdFx0Y29uc3QgcGFkZGluZ1NoaWZ0SG9yaXpvbnRhbCA9IChwYWRMZWZ0IC0gcGFkUmlnaHQpIC8gMjtcblx0XHRcdFx0Y29uc3QgcGFkZGluZ1NoaWZ0VmVydGljYWwgPSAocGFkVG9wIC0gcGFkQm90dG9tKSAvIDI7XG5cblx0XHRcdFx0Ly8gZ2V0IHRoZSBkZXNpcmVkIHBvaW50IGludG8gdGhlIHRoZSBkaXYgKGNlbnRlciBieSBkZWZhdWx0KSBpbiB3b3JsZCBjb29yZGluYXRlXG5cdFx0XHRcdGNvbnN0IGRpdlggPSBkaXZCb3VuZHMueCArIGRpdkJvdW5kcy53aWR0aCAqICgoeEF4aXMgKyAuNSkgKyBwYWRkaW5nU2hpZnRIb3Jpem9udGFsKTtcblx0XHRcdFx0Y29uc3QgZGl2WSA9IGRpdkJvdW5kcy55ICsgZGl2Qm91bmRzLmhlaWdodCAqICgoLXlBeGlzICsgLjUpICsgcGFkZGluZ1NoaWZ0VmVydGljYWwpIC0gMTtcblx0XHRcdFx0dGhpcy5zY3JlZW5Ub1dvcmxkKHRlbXBWZWN0b3IsIGRpdlgsIGRpdlkpO1xuXHRcdFx0XHRsZXQgZGl2T3JpZ2luWCA9IHRlbXBWZWN0b3IueDtcblx0XHRcdFx0bGV0IGRpdk9yaWdpblkgPSB0ZW1wVmVjdG9yLnk7XG5cblx0XHRcdFx0Y29uc3QgcGFkZGluZ1Nocmlua1dpZHRoID0gMSAtIChwYWRMZWZ0ICsgcGFkUmlnaHQpO1xuXHRcdFx0XHRjb25zdCBwYWRkaW5nU2hyaW5rSGVpZ2h0ID0gMSAtIChwYWRUb3AgKyBwYWRCb3R0b20pO1xuXHRcdFx0XHRjb25zdCBkaXZXaWR0aFdvcmxkID0gdGhpcy5zY3JlZW5Ub1dvcmxkTGVuZ3RoKGRpdkJvdW5kcy53aWR0aCAqIHBhZGRpbmdTaHJpbmtXaWR0aCk7XG5cdFx0XHRcdGNvbnN0IGRpdkhlaWdodFdvcmxkID0gdGhpcy5zY3JlZW5Ub1dvcmxkTGVuZ3RoKGRpdkJvdW5kcy5oZWlnaHQgKiBwYWRkaW5nU2hyaW5rSGVpZ2h0KTtcblxuXHRcdFx0XHRpZiAoY2xpcCkgc3RhcnRTY2lzc29yKGRpdkJvdW5kcyk7XG5cblx0XHRcdFx0aWYgKGxvYWRpbmcpIHtcblx0XHRcdFx0XHRpZiAoc3Bpbm5lcikge1xuXHRcdFx0XHRcdFx0aWYgKCF3aWRnZXQubG9hZGluZ1NjcmVlbikgd2lkZ2V0LmxvYWRpbmdTY3JlZW4gPSBuZXcgTG9hZGluZ1NjcmVlbihyZW5kZXJlcik7XG5cdFx0XHRcdFx0XHR3aWRnZXQubG9hZGluZ1NjcmVlbiEuZHJhd0luQ29vcmRpbmF0ZXMoZGl2T3JpZ2luWCwgZGl2T3JpZ2luWSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjbGlwKSBlbmRTY2lzc29yKCk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoc2tlbGV0b24pIHtcblx0XHRcdFx0XHRpZiAoZml0ICE9PSBcIm9yaWdpblwiKSB7XG5cdFx0XHRcdFx0XHRsZXQgeyB4OiBheCwgeTogYXksIHdpZHRoOiBhdywgaGVpZ2h0OiBhaCB9ID0gYm91bmRzO1xuXHRcdFx0XHRcdFx0aWYgKGF3IDw9IDAgfHwgYWggPD0gMCkgY29udGludWU7XG5cblx0XHRcdFx0XHRcdC8vIHNjYWxlIHJhdGlvXG5cdFx0XHRcdFx0XHRjb25zdCBzY2FsZVdpZHRoID0gZGl2V2lkdGhXb3JsZCAvIGF3O1xuXHRcdFx0XHRcdFx0Y29uc3Qgc2NhbGVIZWlnaHQgPSBkaXZIZWlnaHRXb3JsZCAvIGFoO1xuXG5cdFx0XHRcdFx0XHQvLyBkZWZhdWx0IHZhbHVlIGlzIHVzZWQgZm9yIGZpdCA9IG5vbmVcblx0XHRcdFx0XHRcdGxldCByYXRpb1cgPSBza2VsZXRvbi5zY2FsZVg7XG5cdFx0XHRcdFx0XHRsZXQgcmF0aW9IID0gc2tlbGV0b24uc2NhbGVZO1xuXG5cdFx0XHRcdFx0XHRpZiAoZml0ID09PSBcImZpbGxcIikgeyAvLyBGaWxsIHRoZSB0YXJnZXQgYm94IGJ5IGRpc3RvcnRpbmcgdGhlIHNvdXJjZSdzIGFzcGVjdCByYXRpby5cblx0XHRcdFx0XHRcdFx0cmF0aW9XID0gc2NhbGVXaWR0aDtcblx0XHRcdFx0XHRcdFx0cmF0aW9IID0gc2NhbGVIZWlnaHQ7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZpdCA9PT0gXCJ3aWR0aFwiKSB7XG5cdFx0XHRcdFx0XHRcdHJhdGlvVyA9IHNjYWxlV2lkdGg7XG5cdFx0XHRcdFx0XHRcdHJhdGlvSCA9IHNjYWxlV2lkdGg7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZpdCA9PT0gXCJoZWlnaHRcIikge1xuXHRcdFx0XHRcdFx0XHRyYXRpb1cgPSBzY2FsZUhlaWdodDtcblx0XHRcdFx0XHRcdFx0cmF0aW9IID0gc2NhbGVIZWlnaHQ7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZpdCA9PT0gXCJjb250YWluXCIpIHtcblx0XHRcdFx0XHRcdFx0Ly8gaWYgc2NhbGVkIGhlaWdodCBpcyBiaWdnZXIgdGhhbiBkaXYgaGVpZ2h0LCB1c2UgaGVpZ2h0IHJhdGlvIGluc3RlYWRcblx0XHRcdFx0XHRcdFx0aWYgKGFoICogc2NhbGVXaWR0aCA+IGRpdkhlaWdodFdvcmxkKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmF0aW9XID0gc2NhbGVIZWlnaHQ7XG5cdFx0XHRcdFx0XHRcdFx0cmF0aW9IID0gc2NhbGVIZWlnaHQ7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cmF0aW9XID0gc2NhbGVXaWR0aDtcblx0XHRcdFx0XHRcdFx0XHRyYXRpb0ggPSBzY2FsZVdpZHRoO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZpdCA9PT0gXCJjb3ZlclwiKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChhaCAqIHNjYWxlV2lkdGggPCBkaXZIZWlnaHRXb3JsZCkge1xuXHRcdFx0XHRcdFx0XHRcdHJhdGlvVyA9IHNjYWxlSGVpZ2h0O1xuXHRcdFx0XHRcdFx0XHRcdHJhdGlvSCA9IHNjYWxlSGVpZ2h0O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJhdGlvVyA9IHNjYWxlV2lkdGg7XG5cdFx0XHRcdFx0XHRcdFx0cmF0aW9IID0gc2NhbGVXaWR0aDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChmaXQgPT09IFwic2NhbGVEb3duXCIpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGF3ID4gZGl2V2lkdGhXb3JsZCB8fCBhaCA+IGRpdkhlaWdodFdvcmxkKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGFoICogc2NhbGVXaWR0aCA+IGRpdkhlaWdodFdvcmxkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyYXRpb1cgPSBzY2FsZUhlaWdodDtcblx0XHRcdFx0XHRcdFx0XHRcdHJhdGlvSCA9IHNjYWxlSGVpZ2h0O1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyYXRpb1cgPSBzY2FsZVdpZHRoO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmF0aW9IID0gc2NhbGVXaWR0aDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gZ2V0IHRoZSBjZW50ZXIgb2YgdGhlIGJvdW5kc1xuXHRcdFx0XHRcdFx0Y29uc3QgYm91bmRzWCA9IChheCArIGF3IC8gMikgKiByYXRpb1c7XG5cdFx0XHRcdFx0XHRjb25zdCBib3VuZHNZID0gKGF5ICsgYWggLyAyKSAqIHJhdGlvSDtcblxuXHRcdFx0XHRcdFx0Ly8gZ2V0IHZlcnRpY2VzIG9mZnNldDogY2FsY3VsYXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIGRpdiBjZW50ZXIgYW5kIGJvdW5kcyBjZW50ZXJcblx0XHRcdFx0XHRcdGRpdk9yaWdpblggPSBkaXZPcmlnaW5YIC0gYm91bmRzWDtcblx0XHRcdFx0XHRcdGRpdk9yaWdpblkgPSBkaXZPcmlnaW5ZIC0gYm91bmRzWTtcblxuXHRcdFx0XHRcdFx0Ly8gc2NhbGUgdGhlIHNrZWxldG9uXG5cdFx0XHRcdFx0XHRpZiAoZml0ICE9PSBcIm5vbmVcIiAmJiAoc2tlbGV0b24uc2NhbGVYICE9PSByYXRpb1cgfHwgc2tlbGV0b24uc2NhbGVZICE9PSByYXRpb0gpKSB7XG5cdFx0XHRcdFx0XHRcdHNrZWxldG9uLnNjYWxlWCA9IHJhdGlvVztcblx0XHRcdFx0XHRcdFx0c2tlbGV0b24uc2NhbGVZID0gcmF0aW9IO1xuXHRcdFx0XHRcdFx0XHRza2VsZXRvbi51cGRhdGVXb3JsZFRyYW5zZm9ybShQaHlzaWNzLnVwZGF0ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gY29uc3Qgd29ybGRPZmZzZXRYID0gZGl2T3JpZ2luWCArIG9mZnNldFggKyBkcmFnWDtcblx0XHRcdFx0XHRjb25zdCB3b3JsZE9mZnNldFggPSBkaXZPcmlnaW5YICsgb2Zmc2V0WCAqIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvICsgZHJhZ1g7XG5cdFx0XHRcdFx0Y29uc3Qgd29ybGRPZmZzZXRZID0gZGl2T3JpZ2luWSArIG9mZnNldFkgKiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyArIGRyYWdZO1xuXG5cdFx0XHRcdFx0d2lkZ2V0LndvcmxkWCA9IHdvcmxkT2Zmc2V0WDtcblx0XHRcdFx0XHR3aWRnZXQud29ybGRZID0gd29ybGRPZmZzZXRZO1xuXG5cdFx0XHRcdFx0cmVuZGVyZXIuZHJhd1NrZWxldG9uKHNrZWxldG9uLCBwbWEsIC0xLCAtMSwgKHZlcnRpY2VzLCBzaXplLCB2ZXJ0ZXhTaXplKSA9PiB7XG5cdFx0XHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkgKz0gdmVydGV4U2l6ZSkge1xuXHRcdFx0XHRcdFx0XHR2ZXJ0aWNlc1tpXSA9IHZlcnRpY2VzW2ldICsgd29ybGRPZmZzZXRYO1xuXHRcdFx0XHRcdFx0XHR2ZXJ0aWNlc1tpICsgMV0gPSB2ZXJ0aWNlc1tpICsgMV0gKyB3b3JsZE9mZnNldFk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBkcmF3aW5nIGRlYnVnIHN0dWZmXG5cdFx0XHRcdFx0aWYgKGRlYnVnKSB7XG5cdFx0XHRcdFx0XHQvLyBpZiAodHJ1ZSkge1xuXHRcdFx0XHRcdFx0bGV0IHsgeDogYXgsIHk6IGF5LCB3aWR0aDogYXcsIGhlaWdodDogYWggfSA9IGJvdW5kcztcblxuXHRcdFx0XHRcdFx0Ly8gc2hvdyBib3VuZHMgYW5kIGl0cyBjZW50ZXJcblx0XHRcdFx0XHRcdGlmIChkcmFnKSB7XG5cdFx0XHRcdFx0XHRcdHJlbmRlcmVyLnJlY3QodHJ1ZSxcblx0XHRcdFx0XHRcdFx0XHRheCAqIHNrZWxldG9uLnNjYWxlWCArIHdvcmxkT2Zmc2V0WCxcblx0XHRcdFx0XHRcdFx0XHRheSAqIHNrZWxldG9uLnNjYWxlWSArIHdvcmxkT2Zmc2V0WSxcblx0XHRcdFx0XHRcdFx0XHRhdyAqIHNrZWxldG9uLnNjYWxlWCxcblx0XHRcdFx0XHRcdFx0XHRhaCAqIHNrZWxldG9uLnNjYWxlWSxcblx0XHRcdFx0XHRcdFx0XHR0cmFuc3BhcmVudFJlZCk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHJlbmRlcmVyLnJlY3QoZmFsc2UsXG5cdFx0XHRcdFx0XHRcdGF4ICogc2tlbGV0b24uc2NhbGVYICsgd29ybGRPZmZzZXRYLFxuXHRcdFx0XHRcdFx0XHRheSAqIHNrZWxldG9uLnNjYWxlWSArIHdvcmxkT2Zmc2V0WSxcblx0XHRcdFx0XHRcdFx0YXcgKiBza2VsZXRvbi5zY2FsZVgsXG5cdFx0XHRcdFx0XHRcdGFoICogc2tlbGV0b24uc2NhbGVZLFxuXHRcdFx0XHRcdFx0XHRibHVlKTtcblx0XHRcdFx0XHRcdGNvbnN0IGJiQ2VudGVyWCA9IChheCArIGF3IC8gMikgKiBza2VsZXRvbi5zY2FsZVggKyB3b3JsZE9mZnNldFg7XG5cdFx0XHRcdFx0XHRjb25zdCBiYkNlbnRlclkgPSAoYXkgKyBhaCAvIDIpICogc2tlbGV0b24uc2NhbGVZICsgd29ybGRPZmZzZXRZO1xuXHRcdFx0XHRcdFx0cmVuZGVyZXIuY2lyY2xlKHRydWUsIGJiQ2VudGVyWCwgYmJDZW50ZXJZLCAxMCwgYmx1ZSk7XG5cblx0XHRcdFx0XHRcdC8vIHNob3cgc2tlbGV0b24gcm9vdFxuXHRcdFx0XHRcdFx0Y29uc3Qgcm9vdCA9IHNrZWxldG9uLmdldFJvb3RCb25lKCkhO1xuXHRcdFx0XHRcdFx0cmVuZGVyZXIuY2lyY2xlKHRydWUsIHJvb3QueCArIHdvcmxkT2Zmc2V0WCwgcm9vdC55ICsgd29ybGRPZmZzZXRZLCAxMCwgcmVkKTtcblxuXHRcdFx0XHRcdFx0Ly8gc2hvdyBzaGlmdGVkIG9yaWdpblxuXHRcdFx0XHRcdFx0cmVuZGVyZXIuY2lyY2xlKHRydWUsIGRpdk9yaWdpblgsIGRpdk9yaWdpblksIDEwLCBncmVlbik7XG5cblx0XHRcdFx0XHRcdC8vIHNob3cgbGluZSBmcm9tIG9yaWdpbiB0byBib3VuZHMgY2VudGVyXG5cdFx0XHRcdFx0XHRyZW5kZXJlci5saW5lKGRpdk9yaWdpblgsIGRpdk9yaWdpblksIGJiQ2VudGVyWCwgYmJDZW50ZXJZLCBncmVlbik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGNsaXApIGVuZFNjaXNzb3IoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZW5kZXJlci5lbmQoKTtcblx0XHR9XG5cblx0XHRjb25zdCB1cGRhdGVCb25lRm9sbG93ZXJzID0gKCkgPT4ge1xuXHRcdFx0Zm9yIChjb25zdCB3aWRnZXQgb2YgdGhpcy53aWRnZXRzKSB7XG5cdFx0XHRcdGlmICh3aWRnZXQuaXNPZmZTY3JlZW5BbmRXYXNNb3ZlZCgpIHx8ICF3aWRnZXQuc2tlbGV0b24pIGNvbnRpbnVlO1xuXG5cdFx0XHRcdGZvciAoY29uc3QgYm9uZUZvbGxvd2VyIG9mIHdpZGdldC5ib25lRm9sbG93ZXJMaXN0KSB7XG5cdFx0XHRcdFx0Y29uc3QgeyBzbG90LCBib25lLCBlbGVtZW50LCBmb2xsb3dWaXNpYmlsaXR5LCBmb2xsb3dSb3RhdGlvbiwgZm9sbG93T3BhY2l0eSwgZm9sbG93U2NhbGUgfSA9IGJvbmVGb2xsb3dlcjtcblx0XHRcdFx0XHRjb25zdCB7IHdvcmxkWCwgd29ybGRZIH0gPSB3aWRnZXQ7XG5cdFx0XHRcdFx0dGhpcy53b3JsZFRvU2NyZWVuKHRoaXMudGVtcEZvbGxvd0JvbmVWZWN0b3IsIGJvbmUud29ybGRYICsgd29ybGRYLCBib25lLndvcmxkWSArIHdvcmxkWSk7XG5cblx0XHRcdFx0XHRpZiAoTnVtYmVyLmlzTmFOKHRoaXMudGVtcEZvbGxvd0JvbmVWZWN0b3IueCkpIGNvbnRpbnVlO1xuXG5cdFx0XHRcdFx0bGV0IHggPSB0aGlzLnRlbXBGb2xsb3dCb25lVmVjdG9yLnggLSB0aGlzLm92ZXJmbG93TGVmdFNpemU7XG5cdFx0XHRcdFx0bGV0IHkgPSB0aGlzLnRlbXBGb2xsb3dCb25lVmVjdG9yLnkgLSB0aGlzLm92ZXJmbG93VG9wU2l6ZTtcblxuXHRcdFx0XHRcdGlmICh0aGlzLmFwcGVuZGVkVG9Cb2R5KSB7XG5cdFx0XHRcdFx0XHR4ICs9IHdpbmRvdy5zY3JvbGxYO1xuXHRcdFx0XHRcdFx0eSArPSB3aW5kb3cuc2Nyb2xsWTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlbGVtZW50LnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoY2FsYygtNTAlICsgJHt4LnRvRml4ZWQoMil9cHgpLGNhbGMoLTUwJSArICR7eS50b0ZpeGVkKDIpfXB4KSlgXG5cdFx0XHRcdFx0XHQrIChmb2xsb3dSb3RhdGlvbiA/IGAgcm90YXRlKCR7LWJvbmUuZ2V0V29ybGRSb3RhdGlvblgoKX1kZWcpYCA6IFwiXCIpXG5cdFx0XHRcdFx0XHQrIChmb2xsb3dTY2FsZSA/IGAgc2NhbGUoJHtib25lLmdldFdvcmxkU2NhbGVYKCl9LCAke2JvbmUuZ2V0V29ybGRTY2FsZVkoKX0pYCA6IFwiXCIpXG5cdFx0XHRcdFx0XHQ7XG5cblx0XHRcdFx0XHRlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIlwiXG5cblx0XHRcdFx0XHRpZiAoZm9sbG93VmlzaWJpbGl0eSAmJiAhc2xvdC5hdHRhY2htZW50KSB7XG5cdFx0XHRcdFx0XHRlbGVtZW50LnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGZvbGxvd09wYWNpdHkpIHtcblx0XHRcdFx0XHRcdGVsZW1lbnQuc3R5bGUub3BhY2l0eSA9IGAke3Nsb3QuY29sb3IuYX1gO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgbG9vcCA9ICgpID0+IHtcblx0XHRcdGlmICh0aGlzLmRpc3Bvc2VkIHx8ICF0aGlzLmlzQ29ubmVjdGVkIHx8ICF0aGlzLnZpc2libGUpIHtcblx0XHRcdFx0dGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH07XG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG5cdFx0XHRpZiAoIXRoaXMubG9hZGVkKSByZXR1cm47XG5cdFx0XHR0aGlzLnRpbWUudXBkYXRlKCk7XG5cdFx0XHR0aGlzLnRyYW5zbGF0ZUNhbnZhcygpO1xuXHRcdFx0dXBkYXRlV2lkZ2V0cygpO1xuXHRcdFx0cmVuZGVyV2lkZ2V0cygpO1xuXHRcdFx0dXBkYXRlQm9uZUZvbGxvd2VycygpO1xuXHRcdH1cblxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKTtcblx0XHR0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuXG5cdFx0Y29uc3QgcmVkID0gbmV3IENvbG9yKDEsIDAsIDAsIDEpO1xuXHRcdGNvbnN0IGdyZWVuID0gbmV3IENvbG9yKDAsIDEsIDAsIDEpO1xuXHRcdGNvbnN0IGJsdWUgPSBuZXcgQ29sb3IoMCwgMCwgMSwgMSk7XG5cdFx0Y29uc3QgdHJhbnNwYXJlbnRXaGl0ZSA9IG5ldyBDb2xvcigxLCAxLCAxLCAuMyk7XG5cdFx0Y29uc3QgdHJhbnNwYXJlbnRSZWQgPSBuZXcgQ29sb3IoMSwgMCwgMCwgLjMpO1xuXHR9XG5cblx0cHVibGljIHBvaW50ZXJDYW52YXNYID0gMTtcblx0cHVibGljIHBvaW50ZXJDYW52YXNZID0gMTtcblx0cHVibGljIHBvaW50ZXJXb3JsZFggPSAxO1xuXHRwdWJsaWMgcG9pbnRlcldvcmxkWSA9IDE7XG5cblx0cHJpdmF0ZSB0ZW1wVmVjdG9yID0gbmV3IFZlY3RvcjMoKTtcblx0cHJpdmF0ZSB1cGRhdGVQb2ludGVyIChpbnB1dDogUG9pbnQpIHtcblx0XHR0aGlzLnBvaW50ZXJDYW52YXNYID0gaW5wdXQueCAtIHdpbmRvdy5zY3JvbGxYO1xuXHRcdHRoaXMucG9pbnRlckNhbnZhc1kgPSBpbnB1dC55IC0gd2luZG93LnNjcm9sbFk7XG5cblx0XHRpZiAoIXRoaXMuYXBwZW5kZWRUb0JvZHkpIHtcblx0XHRcdGNvbnN0IHJlZiA9IHRoaXMucGFyZW50RWxlbWVudCEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHR0aGlzLnBvaW50ZXJDYW52YXNYIC09IHJlZi5sZWZ0O1xuXHRcdFx0dGhpcy5wb2ludGVyQ2FudmFzWSAtPSByZWYudG9wO1xuXHRcdH1cblxuXHRcdGxldCB0ZW1wVmVjdG9yID0gdGhpcy50ZW1wVmVjdG9yO1xuXHRcdHRlbXBWZWN0b3Iuc2V0KHRoaXMucG9pbnRlckNhbnZhc1gsIHRoaXMucG9pbnRlckNhbnZhc1ksIDApO1xuXHRcdHRoaXMucmVuZGVyZXIuY2FtZXJhLnNjcmVlblRvV29ybGQodGVtcFZlY3RvciwgdGhpcy5jYW52YXMuY2xpZW50V2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCk7XG5cblx0XHRpZiAoTnVtYmVyLmlzTmFOKHRlbXBWZWN0b3IueCkgfHwgTnVtYmVyLmlzTmFOKHRlbXBWZWN0b3IueSkpIHJldHVybjtcblx0XHR0aGlzLnBvaW50ZXJXb3JsZFggPSB0ZW1wVmVjdG9yLng7XG5cdFx0dGhpcy5wb2ludGVyV29ybGRZID0gdGVtcFZlY3Rvci55O1xuXHR9XG5cblx0cHJpdmF0ZSB1cGRhdGVXaWRnZXRQb2ludGVyICh3aWRnZXQ6IFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24pOiBib29sZWFuIHtcblx0XHRpZiAod2lkZ2V0LndvcmxkWCA9PT0gSW5maW5pdHkpIHJldHVybiBmYWxzZTtcblxuXHRcdHdpZGdldC5wb2ludGVyV29ybGRYID0gdGhpcy5wb2ludGVyV29ybGRYIC0gd2lkZ2V0LndvcmxkWDtcblx0XHR3aWRnZXQucG9pbnRlcldvcmxkWSA9IHRoaXMucG9pbnRlcldvcmxkWSAtIHdpZGdldC53b3JsZFk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHByaXZhdGUgc2V0dXBEcmFnVXRpbGl0eSAoKTogSW5wdXQge1xuXHRcdC8vIFRPRE86IHdlIHNob3VsZCB1c2UgZG9jdW1lbnQgLSBib2R5IG1pZ2h0IGhhdmUgc29tZSBtYXJnaW4gdGhhdCBvZmZzZXQgdGhlIGNsaWNrIGV2ZW50cyAtIE1lYW53aGlsZSBJIHRha2UgZXZlbnQgcGFnZVgvWVxuXHRcdGNvbnN0IGlucHV0TWFuYWdlciA9IG5ldyBJbnB1dChkb2N1bWVudC5ib2R5LCBmYWxzZSlcblx0XHRjb25zdCBpbnB1dFBvaW50VGVtcDogUG9pbnQgPSBuZXcgVmVjdG9yMigpO1xuXG5cdFx0Y29uc3QgZ2V0SW5wdXQgPSAoZXY/OiBNb3VzZUV2ZW50IHwgVG91Y2hFdmVudCk6IFBvaW50ID0+IHtcblx0XHRcdGNvbnN0IG9yaWdpbmFsRXZlbnQgPSBldiBpbnN0YW5jZW9mIE1vdXNlRXZlbnQgPyBldiA6IGV2IS5jaGFuZ2VkVG91Y2hlc1swXTtcblx0XHRcdGlucHV0UG9pbnRUZW1wLnggPSBvcmlnaW5hbEV2ZW50LnBhZ2VYICsgdGhpcy5vdmVyZmxvd0xlZnRTaXplO1xuXHRcdFx0aW5wdXRQb2ludFRlbXAueSA9IG9yaWdpbmFsRXZlbnQucGFnZVkgKyB0aGlzLm92ZXJmbG93VG9wU2l6ZTtcblx0XHRcdHJldHVybiBpbnB1dFBvaW50VGVtcDtcblx0XHR9XG5cblx0XHRsZXQgbGFzdFggPSAwO1xuXHRcdGxldCBsYXN0WSA9IDA7XG5cdFx0aW5wdXRNYW5hZ2VyLmFkZExpc3RlbmVyKHtcblx0XHRcdC8vIG1vdmVkIGlzIHVzZWQgdG8gcGFzcyBwb2ludGVyIHBvc2l0aW9uIHdydCB0byBjYW52YXMgYW5kIHdpZGdldCBwb3NpdGlvbiBhbmQgY3VycmVudGx5IGlzIEVYUEVSSU1FTlRBTFxuXHRcdFx0bW92ZWQ6ICh4LCB5LCBldikgPT4ge1xuXHRcdFx0XHRjb25zdCBpbnB1dCA9IGdldElucHV0KGV2KTtcblx0XHRcdFx0dGhpcy51cGRhdGVQb2ludGVyKGlucHV0KTtcblxuXHRcdFx0XHRmb3IgKGNvbnN0IHdpZGdldCBvZiB0aGlzLndpZGdldHMpIHtcblx0XHRcdFx0XHRpZiAoIXRoaXMudXBkYXRlV2lkZ2V0UG9pbnRlcih3aWRnZXQpIHx8ICF3aWRnZXQub25TY3JlZW4pIGNvbnRpbnVlO1xuXG5cdFx0XHRcdFx0d2lkZ2V0LnBvaW50ZXJFdmVudFVwZGF0ZShcIm1vdmVcIiwgZXYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZG93bjogKHgsIHksIGV2KSA9PiB7XG5cdFx0XHRcdGNvbnN0IGlucHV0ID0gZ2V0SW5wdXQoZXYpO1xuXG5cdFx0XHRcdHRoaXMudXBkYXRlUG9pbnRlcihpbnB1dCk7XG5cblx0XHRcdFx0Zm9yIChjb25zdCB3aWRnZXQgb2YgdGhpcy53aWRnZXRzKSB7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLnVwZGF0ZVdpZGdldFBvaW50ZXIod2lkZ2V0KSB8fCB3aWRnZXQuaXNPZmZTY3JlZW5BbmRXYXNNb3ZlZCgpKSBjb250aW51ZTtcblxuXHRcdFx0XHRcdHdpZGdldC5wb2ludGVyRXZlbnRVcGRhdGUoXCJkb3duXCIsIGV2KTtcblxuXHRcdFx0XHRcdGlmICgod2lkZ2V0LmludGVyYWN0aXZlICYmIHdpZGdldC5wb2ludGVySW5zaWRlQm91bmRzKSB8fCAoIXdpZGdldC5pbnRlcmFjdGl2ZSAmJiB3aWRnZXQuaXNQb2ludGVySW5zaWRlQm91bmRzKCkpKSB7XG5cdFx0XHRcdFx0XHRpZiAoIXdpZGdldC5kcmFnKSBjb250aW51ZTtcblxuXHRcdFx0XHRcdFx0d2lkZ2V0LmRyYWdnaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGV2Py5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHRcdGxhc3RYID0gaW5wdXQueDtcblx0XHRcdFx0bGFzdFkgPSBpbnB1dC55O1xuXHRcdFx0fSxcblx0XHRcdGRyYWdnZWQ6ICh4LCB5LCBldikgPT4ge1xuXHRcdFx0XHRjb25zdCBpbnB1dCA9IGdldElucHV0KGV2KTtcblxuXHRcdFx0XHRsZXQgZHJhZ1ggPSBpbnB1dC54IC0gbGFzdFg7XG5cdFx0XHRcdGxldCBkcmFnWSA9IGlucHV0LnkgLSBsYXN0WTtcblxuXHRcdFx0XHR0aGlzLnVwZGF0ZVBvaW50ZXIoaW5wdXQpO1xuXG5cdFx0XHRcdGZvciAoY29uc3Qgd2lkZ2V0IG9mIHRoaXMud2lkZ2V0cykge1xuXHRcdFx0XHRcdGlmICghdGhpcy51cGRhdGVXaWRnZXRQb2ludGVyKHdpZGdldCkgfHwgd2lkZ2V0LmlzT2ZmU2NyZWVuQW5kV2FzTW92ZWQoKSkgY29udGludWU7XG5cblx0XHRcdFx0XHR3aWRnZXQucG9pbnRlckV2ZW50VXBkYXRlKFwiZHJhZ1wiLCBldik7XG5cblx0XHRcdFx0XHRpZiAoIXdpZGdldC5kcmFnZ2luZykgY29udGludWU7XG5cblx0XHRcdFx0XHRjb25zdCBza2VsZXRvbiA9IHdpZGdldC5za2VsZXRvbiE7XG5cdFx0XHRcdFx0d2lkZ2V0LmRyYWdYICs9IHRoaXMuc2NyZWVuVG9Xb3JsZExlbmd0aChkcmFnWCk7XG5cdFx0XHRcdFx0d2lkZ2V0LmRyYWdZIC09IHRoaXMuc2NyZWVuVG9Xb3JsZExlbmd0aChkcmFnWSk7XG5cdFx0XHRcdFx0c2tlbGV0b24ucGh5c2ljc1RyYW5zbGF0ZShkcmFnWCwgLWRyYWdZKTtcblx0XHRcdFx0XHRldj8ucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRldj8uc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGFzdFggPSBpbnB1dC54O1xuXHRcdFx0XHRsYXN0WSA9IGlucHV0Lnk7XG5cdFx0XHR9LFxuXHRcdFx0dXA6ICh4LCB5LCBldikgPT4ge1xuXHRcdFx0XHRmb3IgKGNvbnN0IHdpZGdldCBvZiB0aGlzLndpZGdldHMpIHtcblx0XHRcdFx0XHR3aWRnZXQuZHJhZ2dpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRcdGlmICh3aWRnZXQucG9pbnRlckluc2lkZUJvdW5kcykge1xuXHRcdFx0XHRcdFx0d2lkZ2V0LnBvaW50ZXJFdmVudFVwZGF0ZShcInVwXCIsIGV2KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHJldHVybiBpbnB1dE1hbmFnZXI7XG5cdH1cblxuXHQvKlxuXHQqIFJlc2l6ZS9zY3JvbGwgdXRpbGl0aWVzXG5cdCovXG5cblx0cHJpdmF0ZSB1cGRhdGVDYW52YXNTaXplIChvbmx5RGl2ID0gZmFsc2UpIHtcblx0XHRjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IHRoaXMuZ2V0Vmlld3BvcnRTaXplKCk7XG5cblx0XHQvLyBpZiB0aGUgdGFyZ2V0IHdpZHRoL2hlaWdodCBjaGFuZ2VzLCByZXNpemUgdGhlIGNhbnZhcy5cblx0XHRpZiAoIW9ubHlEaXYgJiYgdGhpcy5sYXN0Q2FudmFzQmFzZVdpZHRoICE9PSB3aWR0aCB8fCB0aGlzLmxhc3RDYW52YXNCYXNlSGVpZ2h0ICE9PSBoZWlnaHQpIHtcblx0XHRcdHRoaXMubGFzdENhbnZhc0Jhc2VXaWR0aCA9IHdpZHRoO1xuXHRcdFx0dGhpcy5sYXN0Q2FudmFzQmFzZUhlaWdodCA9IGhlaWdodDtcblx0XHRcdHRoaXMub3ZlcmZsb3dMZWZ0U2l6ZSA9IHRoaXMub3ZlcmZsb3dMZWZ0ICogd2lkdGg7XG5cdFx0XHR0aGlzLm92ZXJmbG93VG9wU2l6ZSA9IHRoaXMub3ZlcmZsb3dUb3AgKiBoZWlnaHQ7XG5cblx0XHRcdGNvbnN0IHRvdGFsV2lkdGggPSB3aWR0aCAqICgxICsgKHRoaXMub3ZlcmZsb3dMZWZ0ICsgdGhpcy5vdmVyZmxvd1JpZ2h0KSk7XG5cdFx0XHRjb25zdCB0b3RhbEhlaWdodCA9IGhlaWdodCAqICgxICsgKHRoaXMub3ZlcmZsb3dUb3AgKyB0aGlzLm92ZXJmbG93Qm90dG9tKSk7XG5cblx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLndpZHRoID0gdG90YWxXaWR0aCArIFwicHhcIjtcblx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLmhlaWdodCA9IHRvdGFsSGVpZ2h0ICsgXCJweFwiO1xuXHRcdFx0dGhpcy5yZXNpemUodG90YWxXaWR0aCwgdG90YWxIZWlnaHQpO1xuXHRcdH1cblxuXHRcdC8vIHRlbXBvcmFyZWx5IHJlbW92ZSB0aGUgZGl2IHRvIGdldCB0aGUgcGFnZSBzaXplIHdpdGhvdXQgY29uc2lkZXJpbmcgdGhlIGRpdlxuXHRcdC8vIHRoaXMgaXMgbmVjZXNzYXJ5IG90aGVyd2lzZSBpZiB0aGUgYmlnZ2VyIGVsZW1lbnQgaW4gdGhlIHBhZ2UgaXMgcmVtb3ZlIGFuZCB0aGUgZGl2XG5cdFx0Ly8gd2FzIHRoZSBzZWNvbmQgYmlnZ2VyIGVsZW1lbnQsIG5vdyBpdCB3b3VsZCBiZSB0aGUgZGl2IHRvIGRldGVybWluZSB0aGUgcGFnZSBzaXplXG5cdFx0Ly8gdGhpcy5kaXY/LnJlbW92ZSgpOyBpcyBpdCBiZXR0ZXIgd2lkdGgvaGVpZ2h0IHRvIHplcm8/XG5cdFx0Ly8gdGhpcy5kaXYhLnN0eWxlLndpZHRoID0gMCArIFwicHhcIjtcblx0XHQvLyB0aGlzLmRpdiEuc3R5bGUuaGVpZ2h0ID0gMCArIFwicHhcIjtcblx0XHR0aGlzLmRpdiEuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuXHRcdGlmICh0aGlzLmFwcGVuZGVkVG9Cb2R5KSB7XG5cdFx0XHRjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IHRoaXMuZ2V0UGFnZVNpemUoKTtcblx0XHRcdHRoaXMuZGl2IS5zdHlsZS53aWR0aCA9IHdpZHRoICsgXCJweFwiO1xuXHRcdFx0dGhpcy5kaXYhLnN0eWxlLmhlaWdodCA9IGhlaWdodCArIFwicHhcIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHRoaXMuaGFzQ3NzVHdlYWtPZmYoKSkge1xuXHRcdFx0XHQvLyB0aGlzIGNhc2UgbGFncyBpZiBzY3JvbGxzIG9yIHBvc2l0aW9uIGZpeGVkLiBVc2VycyBzaG91bGQgbmV2ZXIgdXNlIHR3ZWFrIG9mZlxuXHRcdFx0XHR0aGlzLmRpdiEuc3R5bGUud2lkdGggPSB0aGlzLnBhcmVudEVsZW1lbnQhLmNsaWVudFdpZHRoICsgXCJweFwiO1xuXHRcdFx0XHR0aGlzLmRpdiEuc3R5bGUuaGVpZ2h0ID0gdGhpcy5wYXJlbnRFbGVtZW50IS5jbGllbnRIZWlnaHQgKyBcInB4XCI7XG5cdFx0XHRcdHRoaXMuY2FudmFzLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHstdGhpcy5vdmVyZmxvd0xlZnRTaXplfXB4LCR7LXRoaXMub3ZlcmZsb3dUb3BTaXplfXB4KWA7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLmRpdiEuc3R5bGUud2lkdGggPSB0aGlzLnBhcmVudEVsZW1lbnQhLnNjcm9sbFdpZHRoICsgXCJweFwiO1xuXHRcdFx0XHR0aGlzLmRpdiEuc3R5bGUuaGVpZ2h0ID0gdGhpcy5wYXJlbnRFbGVtZW50IS5zY3JvbGxIZWlnaHQgKyBcInB4XCI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuZGl2IS5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcblx0XHQvLyB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGhpcy5kaXYhKTtcblx0fVxuXG5cdHByaXZhdGUgcmVzaXplICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikge1xuXHRcdGxldCBjYW52YXMgPSB0aGlzLmNhbnZhcztcblx0XHRjYW52YXMud2lkdGggPSBNYXRoLnJvdW5kKHRoaXMuc2NyZWVuVG9Xb3JsZExlbmd0aCh3aWR0aCkpO1xuXHRcdGNhbnZhcy5oZWlnaHQgPSBNYXRoLnJvdW5kKHRoaXMuc2NyZWVuVG9Xb3JsZExlbmd0aChoZWlnaHQpKTtcblx0XHR0aGlzLnJlbmRlcmVyLmNvbnRleHQuZ2wudmlld3BvcnQoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblx0XHR0aGlzLnJlbmRlcmVyLmNhbWVyYS5zZXRWaWV3cG9ydChjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuXHRcdHRoaXMucmVuZGVyZXIuY2FtZXJhLnVwZGF0ZSgpO1xuXHR9XG5cblx0Ly8gd2UgbmVlZCB0aGUgYm91bmRpbmcgY2xpZW50IHJlY3Qgb3RoZXJ3aXNlIGRlY2ltYWxzIHdvbid0IGJlIHJldHVybmVkXG5cdC8vIHRoaXMgbWVhbnMgdGhhdCBkdXJpbmcgem9vbSBpdCBtaWdodCBvY2N1cnMgdGhhdCB0aGUgZGl2IHdvdWxkIGJlIHJlc2l6ZWRcblx0Ly8gcm91bmRlZCAxcHggbW9yZSBtYWtpbmcgYSBzY3JvbGxiYXIgYXBwZWFyXG5cdHByaXZhdGUgZ2V0UGFnZVNpemUgKCkge1xuXHRcdHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdH1cblxuXHRwcml2YXRlIGxhc3RWaWV3cG9ydFdpZHRoID0gMDtcblx0cHJpdmF0ZSBsYXN0Vmlld3BvcnRIZWlnaHQgPSAwO1xuXHRwcml2YXRlIGxhc3REUFIgPSAwO1xuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBXSURUSF9JTkNSRU1FTlQgPSAxLjE1O1xuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBIRUlHSFRfSU5DUkVNRU5UID0gMS4yO1xuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ0FOVkFTX1dJRFRIID0gNzAwMDtcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX0NBTlZBU19IRUlHSFQgPSA3MDAwO1xuXG5cdC8vIGRldGVybWluZSB0aGUgdGFyZ2V0IHZpZXdwb3J0IHdpZHRoIGFuZCBoZWlnaHQuXG5cdC8vIFRoZSB0YXJnZXQgd2lkdGgvaGVpZ2h0IHdvbid0IGNoYW5nZSBpZiB0aGUgdmlld3BvcnQgc2hyaW5rIHRvIGF2b2lkIHVzZWxlc3MgcmUgcmVuZGVyIChlc3BlY2lhbGx5IHJlIHJlbmRlciBidXJzdHMgb24gbW9iaWxlKVxuXHRwcml2YXRlIGdldFZpZXdwb3J0U2l6ZSAoKTogeyB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciB9IHtcblx0XHRpZiAoIXRoaXMuYXBwZW5kZWRUb0JvZHkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHdpZHRoOiB0aGlzLnBhcmVudEVsZW1lbnQhLmNsaWVudFdpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IHRoaXMucGFyZW50RWxlbWVudCEuY2xpZW50SGVpZ2h0LFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGxldCB3aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuXHRcdGxldCBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cblx0XHRjb25zdCBkcHIgPSB0aGlzLmdldERldmljZVBpeGVsUmF0aW8oKTtcblx0XHRpZiAoZHByICE9PSB0aGlzLmxhc3REUFIpIHtcblx0XHRcdHRoaXMubGFzdERQUiA9IGRwcjtcblx0XHRcdHRoaXMubGFzdFZpZXdwb3J0V2lkdGggPSB0aGlzLmxhc3RWaWV3cG9ydFdpZHRoID09PSAwID8gd2lkdGggOiB3aWR0aCAqIFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS5XSURUSF9JTkNSRU1FTlQ7XG5cdFx0XHR0aGlzLmxhc3RWaWV3cG9ydEhlaWdodCA9IGhlaWdodCAqIFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS5IRUlHSFRfSU5DUkVNRU5UO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZVdpZGdldFNjYWxlcygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAod2lkdGggPiB0aGlzLmxhc3RWaWV3cG9ydFdpZHRoKSB0aGlzLmxhc3RWaWV3cG9ydFdpZHRoID0gd2lkdGggKiBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkuV0lEVEhfSU5DUkVNRU5UO1xuXHRcdFx0aWYgKGhlaWdodCA+IHRoaXMubGFzdFZpZXdwb3J0SGVpZ2h0KSB0aGlzLmxhc3RWaWV3cG9ydEhlaWdodCA9IGhlaWdodCAqIFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS5IRUlHSFRfSU5DUkVNRU5UO1xuXHRcdH1cblxuXHRcdC8vIGlmIHRoZSByZXN1bHRpbmcgY2FudmFzIHdpZHRoL2hlaWdodCBpcyB0b28gaGlnaCwgc2NhbGUgdGhlIERQSVxuXHRcdGlmICh0aGlzLmxhc3RWaWV3cG9ydEhlaWdodCAqICgxICsgdGhpcy5vdmVyZmxvd1RvcCArIHRoaXMub3ZlcmZsb3dCb3R0b20pICogZHByID4gU3BpbmVXZWJDb21wb25lbnRPdmVybGF5Lk1BWF9DQU5WQVNfSEVJR0hUIHx8XG5cdFx0XHR0aGlzLmxhc3RWaWV3cG9ydFdpZHRoICogKDEgKyB0aGlzLm92ZXJmbG93TGVmdCArIHRoaXMub3ZlcmZsb3dSaWdodCkgKiBkcHIgPiBTcGluZVdlYkNvbXBvbmVudE92ZXJsYXkuTUFYX0NBTlZBU19XSURUSCkge1xuXHRcdFx0dGhpcy5kcHJTY2FsZSArPSAuNTtcblx0XHRcdHJldHVybiB0aGlzLmdldFZpZXdwb3J0U2l6ZSgpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR3aWR0aDogdGhpcy5sYXN0Vmlld3BvcnRXaWR0aCxcblx0XHRcdGhlaWdodDogdGhpcy5sYXN0Vmlld3BvcnRIZWlnaHQsXG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKi9cblx0cHVibGljIGdldERldmljZVBpeGVsUmF0aW8gKCkge1xuXHRcdHJldHVybiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyAvIHRoaXMuZHByU2NhbGU7XG5cdH1cblx0cHJpdmF0ZSBkcHJTY2FsZSA9IDE7XG5cblx0cHJpdmF0ZSB1cGRhdGVXaWRnZXRTY2FsZXMgKCkge1xuXHRcdGZvciAoY29uc3Qgd2lkZ2V0IG9mIHRoaXMud2lkZ2V0cykge1xuXHRcdFx0Ly8gaW5zaWRlIG1vZGUgc2NhbGUgYXV0b21hdGljYWxseSB0byBmaXQgdGhlIHNrZWxldG9uIHdpdGhpbiBpdHMgcGFyZW50XG5cdFx0XHRpZiAod2lkZ2V0LmZpdCAhPT0gXCJvcmlnaW5cIiAmJiB3aWRnZXQuZml0ICE9PSBcIm5vbmVcIikgY29udGludWU7XG5cblx0XHRcdGNvbnN0IHNrZWxldG9uID0gd2lkZ2V0LnNrZWxldG9uO1xuXHRcdFx0aWYgKCFza2VsZXRvbikgY29udGludWU7XG5cblx0XHRcdC8vIEknbSBub3Qgc3VyZSBhYm91dCB0aGlzLiBXaXRoIG1vZGUgb3JpZ2luIGFuZCBmaXQgbm9uZTpcblx0XHRcdC8vIGNhc2UgMSkgSWYgSSBjb21tZW50IHRoaXMgc2NhbGUgY29kZSwgdGhlIHNrZWxldG9uIGlzIG5ldmVyIHNjYWxlZCBhbmQgd2lsbCBiZSBhbHdheXMgYXQgdGhlIHNhbWUgc2l6ZSBhbmQgd29uJ3QgY2hhbmdlIHNpemUgd2hpbGUgem9vbWluZ1xuXHRcdFx0Ly8gY2FzZSAyKSBPdGhlcndpc2UsIHRoZSBza2VsZXRvbiBpcyBsb2FkZWQgYWx3YXlzIGF0IHRoZSBzYW1lIHNpemUsIGJ1dCBjaGFuZ2VzIHNpemUgd2hpbGUgem9vbWluZ1xuXHRcdFx0Y29uc3Qgc2NhbGUgPSB0aGlzLmdldERldmljZVBpeGVsUmF0aW8oKTtcblx0XHRcdHNrZWxldG9uLnNjYWxlWCA9IHNrZWxldG9uLnNjYWxlWCAvIHdpZGdldC5kcHJTY2FsZSAqIHNjYWxlO1xuXHRcdFx0c2tlbGV0b24uc2NhbGVZID0gc2tlbGV0b24uc2NhbGVZIC8gd2lkZ2V0LmRwclNjYWxlICogc2NhbGU7XG5cdFx0XHR3aWRnZXQuZHByU2NhbGUgPSBzY2FsZTtcblx0XHR9XG5cdH1cblxuXHQvLyB0aGlzIGZ1bmN0aW9uIGlzIGludm9rZWQgZWFjaCBmcmFtZSAtIHBheSBhdHRlbnRpb24gdG8gd2hhdCB5b3UgYWRkIGhlcmVcblx0cHJpdmF0ZSB0cmFuc2xhdGVDYW52YXMgKCkge1xuXHRcdGxldCBzY3JvbGxQb3NpdGlvblggPSAtdGhpcy5vdmVyZmxvd0xlZnRTaXplO1xuXHRcdGxldCBzY3JvbGxQb3NpdGlvblkgPSAtdGhpcy5vdmVyZmxvd1RvcFNpemU7XG5cblx0XHRpZiAodGhpcy5hcHBlbmRlZFRvQm9keSkge1xuXHRcdFx0c2Nyb2xsUG9zaXRpb25YICs9IHdpbmRvdy5zY3JvbGxYO1xuXHRcdFx0c2Nyb2xsUG9zaXRpb25ZICs9IHdpbmRvdy5zY3JvbGxZO1xuXHRcdH0gZWxzZSB7XG5cblx0XHRcdC8vIElkZWFsbHkgdGhpcyBzaG91bGQgYmUgdGhlIG9ubHkgYXBwZW5kZWRUb0JvZHkgY2FzZSAobm8tYXV0by1wYXJlbnQtdHJhbnNmb3JtIG5vdCBlbmFibGVkIG9yIGF0IGxlYXN0IGFuIGFuY2VzdG9yIGhhcyB0cmFuc2Zvcm0pXG5cdFx0XHQvLyBJJ2QgbGlrZSB0byBnZXQgcmlkIG9mIHRoZSBlbHNlIGNhc2Vcblx0XHRcdGlmICh0aGlzLmhhc1BhcmVudFRyYW5zZm9ybSkge1xuXHRcdFx0XHRzY3JvbGxQb3NpdGlvblggKz0gdGhpcy5wYXJlbnRFbGVtZW50IS5zY3JvbGxMZWZ0O1xuXHRcdFx0XHRzY3JvbGxQb3NpdGlvblkgKz0gdGhpcy5wYXJlbnRFbGVtZW50IS5zY3JvbGxUb3A7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCB7IGxlZnQsIHRvcCB9ID0gdGhpcy5wYXJlbnRFbGVtZW50IS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRcdFx0c2Nyb2xsUG9zaXRpb25YICs9IGxlZnQgKyB3aW5kb3cuc2Nyb2xsWDtcblx0XHRcdFx0c2Nyb2xsUG9zaXRpb25ZICs9IHRvcCArIHdpbmRvdy5zY3JvbGxZO1xuXG5cdFx0XHRcdGxldCBvZmZzZXRQYXJlbnQgPSB0aGlzLm9mZnNldFBhcmVudDtcblx0XHRcdFx0ZG8ge1xuXHRcdFx0XHRcdGlmIChvZmZzZXRQYXJlbnQgPT09IG51bGwgfHwgb2Zmc2V0UGFyZW50ID09PSBkb2N1bWVudC5ib2R5KSBicmVhaztcblxuXHRcdFx0XHRcdGNvbnN0IGh0bWxPZmZzZXRQYXJlbnRFbGVtZW50ID0gb2Zmc2V0UGFyZW50IGFzIEhUTUxFbGVtZW50O1xuXHRcdFx0XHRcdGlmIChodG1sT2Zmc2V0UGFyZW50RWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9PT0gXCJmaXhlZFwiIHx8IGh0bWxPZmZzZXRQYXJlbnRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID09PSBcInN0aWNreVwiIHx8IGh0bWxPZmZzZXRQYXJlbnRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID09PSBcImFic29sdXRlXCIpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBhcmVudFJlY3QgPSBodG1sT2Zmc2V0UGFyZW50RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRcdFx0XHRcdHRoaXMuZGl2LnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHtsZWZ0IC0gcGFyZW50UmVjdC5sZWZ0fXB4LCR7dG9wIC0gcGFyZW50UmVjdC50b3B9cHgpYDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvZmZzZXRQYXJlbnQgPSBodG1sT2Zmc2V0UGFyZW50RWxlbWVudC5vZmZzZXRQYXJlbnQ7XG5cdFx0XHRcdH0gd2hpbGUgKG9mZnNldFBhcmVudCk7XG5cblx0XHRcdFx0dGhpcy5kaXYuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke3Njcm9sbFBvc2l0aW9uWCArIHRoaXMub3ZlcmZsb3dMZWZ0U2l6ZX1weCwke3Njcm9sbFBvc2l0aW9uWSArIHRoaXMub3ZlcmZsb3dUb3BTaXplfXB4KWA7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHRoaXMuY2FudmFzLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHtzY3JvbGxQb3NpdGlvblh9cHgsJHtzY3JvbGxQb3NpdGlvbll9cHgpYDtcblx0fVxuXG5cdHByaXZhdGUgdXBkYXRlWkluZGV4SWZOZWNlc3NhcnkgKGVsZW1lbnQ6IEhUTUxFbGVtZW50KSB7XG5cdFx0bGV0IHBhcmVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gZWxlbWVudDtcblx0XHRsZXQgekluZGV4OiB1bmRlZmluZWQgfCBudW1iZXI7XG5cdFx0ZG8ge1xuXHRcdFx0bGV0IGN1cnJlbnRaSW5kZXggPSBwYXJzZUludChnZXRDb21wdXRlZFN0eWxlKHBhcmVudCkuekluZGV4KTtcblxuXHRcdFx0Ly8gc2VhcmNoaW5nIHRoZSBzaGFsbG93ZXN0IHotaW5kZXhcblx0XHRcdGlmICghaXNOYU4oY3VycmVudFpJbmRleCkpIHpJbmRleCA9IGN1cnJlbnRaSW5kZXg7XG5cdFx0XHRwYXJlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudDtcblx0XHR9IHdoaWxlIChwYXJlbnQgJiYgcGFyZW50ICE9PSBkb2N1bWVudC5ib2R5KVxuXG5cdFx0aWYgKHpJbmRleCAmJiAoIXRoaXMuekluZGV4IHx8IHRoaXMuekluZGV4IDwgekluZGV4KSkge1xuXHRcdFx0dGhpcy56SW5kZXggPSB6SW5kZXg7XG5cdFx0XHR0aGlzLmRpdi5zdHlsZS56SW5kZXggPSBgJHt0aGlzLnpJbmRleH1gO1xuXHRcdH1cblx0fVxuXG5cdC8qXG5cdCogT3RoZXIgdXRpbGl0aWVzXG5cdCovXG5cdHB1YmxpYyBzY3JlZW5Ub1dvcmxkICh2ZWM6IFZlY3RvcjMsIHg6IG51bWJlciwgeTogbnVtYmVyKSB7XG5cdFx0dmVjLnNldCh4LCB5LCAwKTtcblx0XHQvLyBwYXkgYXR0ZW50aW9uIHRoYXQgY2xpZW50V2lkdGgvSGVpZ2h0IHJvdW5kcyB0aGUgc2l6ZSAtIGlmIHdlIGRvbid0IGxpa2UgaXQsIHdlIHNob3VsZCB1c2UgZ2V0Qm91bmRpbmdDbGllbnRSZWN0IGFzIGluIGdldFBhZ1NpemVcblx0XHR0aGlzLnJlbmRlcmVyLmNhbWVyYS5zY3JlZW5Ub1dvcmxkKHZlYywgdGhpcy5jYW52YXMuY2xpZW50V2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCk7XG5cdH1cblx0cHVibGljIHdvcmxkVG9TY3JlZW4gKHZlYzogVmVjdG9yMywgeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcblx0XHR2ZWMuc2V0KHgsIC15LCAwKTtcblx0XHQvLyBwYXkgYXR0ZW50aW9uIHRoYXQgY2xpZW50V2lkdGgvSGVpZ2h0IHJvdW5kcyB0aGUgc2l6ZSAtIGlmIHdlIGRvbid0IGxpa2UgaXQsIHdlIHNob3VsZCB1c2UgZ2V0Qm91bmRpbmdDbGllbnRSZWN0IGFzIGluIGdldFBhZ1NpemVcblx0XHQvLyB0aGlzLnJlbmRlcmVyLmNhbWVyYS53b3JsZFRvU2NyZWVuKHZlYywgdGhpcy5jYW52YXMuY2xpZW50V2lkdGgsIHRoaXMuY2FudmFzLmNsaWVudEhlaWdodCk7XG5cdFx0dGhpcy5yZW5kZXJlci5jYW1lcmEud29ybGRUb1NjcmVlbih2ZWMsIHRoaXMud29ybGRUb1NjcmVlbkxlbmd0aCh0aGlzLnJlbmRlcmVyLmNhbWVyYS52aWV3cG9ydFdpZHRoKSwgdGhpcy53b3JsZFRvU2NyZWVuTGVuZ3RoKHRoaXMucmVuZGVyZXIuY2FtZXJhLnZpZXdwb3J0SGVpZ2h0KSk7XG5cdH1cblx0cHVibGljIHNjcmVlblRvV29ybGRMZW5ndGggKGxlbmd0aDogbnVtYmVyKSB7XG5cdFx0cmV0dXJuIGxlbmd0aCAqIHRoaXMuZ2V0RGV2aWNlUGl4ZWxSYXRpbygpO1xuXHR9XG5cdHB1YmxpYyB3b3JsZFRvU2NyZWVuTGVuZ3RoIChsZW5ndGg6IG51bWJlcikge1xuXHRcdHJldHVybiBsZW5ndGggLyB0aGlzLmdldERldmljZVBpeGVsUmF0aW8oKTtcblx0fVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJzcGluZS1vdmVybGF5XCIsIFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheSk7XG4iXX0=