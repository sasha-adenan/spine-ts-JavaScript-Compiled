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
import { AnimationState, AnimationStateData, AtlasAttachmentLoader, MeshAttachment, MixBlend, MixDirection, Physics, RegionAttachment, Skeleton, SkeletonBinary, SkeletonJson, Skin, Utils, Vector2, } from "@esotericsoftware/spine-webgl";
import { SpineWebComponentOverlay } from "./SpineWebComponentOverlay.js";
import { castValue, isBase64 } from "./wcUtils.js";
export class SpineWebComponentSkeleton extends HTMLElement {
    /**
     * The URL of the skeleton atlas file (.atlas)
     * Connected to `atlas` attribute.
     */
    atlasPath;
    /**
     * The URL of the skeleton JSON (.json) or binary (.skel) file
     * Connected to `skeleton` attribute.
     */
    skeletonPath;
    /**
     * Holds the assets in base64 format.
     * Connected to `raw-data` attribute.
     */
    rawData;
    /**
     * The name of the skeleton when the skeleton file is a JSON and contains multiple skeletons.
     * Connected to `json-skeleton-key` attribute.
     */
    jsonSkeletonKey;
    /**
     * The scale passed to the Skeleton Loader. SkeletonData values will be scaled accordingly.
     * Default: 1
     * Connected to `scale` attribute.
     */
    scale = 1;
    /**
     * Optional: The name of the animation to be played. When set, the widget is reinitialized.
     * Connected to `animation` attribute.
     */
    get animation() {
        return this._animation;
    }
    set animation(value) {
        if (value === "")
            value = undefined;
        this._animation = value;
        this.initWidget();
    }
    _animation;
    /**
     * An {@link AnimationsInfo} that describes a sequence of animations on different tracks.
     * Connected to `animations` attribute, but since attributes are string, there's a different form to pass it.
     * It is a string composed of groups surrounded by square brackets. Each group has 5 parameters, the firsts 2 mandatory. They corresponds to: track, animation name, loop, delay, mix time.
     * For the first group on a track {@link AnimationState.setAnimation} is used, while {@link AnimationState.addAnimation} is used for the others.
     * If you use the special token #EMPTY# as animation name {@link AnimationState.setEmptyAnimation} and {@link AnimationState.addEmptyAnimation} iare used respectively.
     * Use the special group [loop, trackNumber], to allow the animation of the track on the given trackNumber to restart from the beginning once finished.
     */
    get animations() {
        return this._animations;
    }
    set animations(value) {
        if (value === undefined)
            value = undefined;
        this._animations = value;
        this.initWidget();
    }
    _animations;
    /**
     * Optional: The default mix set to the {@link AnimationStateData.defaultMix}.
     * Connected to `default-mix` attribute.
     */
    get defaultMix() {
        return this._defaultMix;
    }
    set defaultMix(value) {
        if (value === undefined)
            value = 0;
        this._defaultMix = value;
    }
    _defaultMix = 0;
    /**
     * Optional: The name of the skin to be set
     * Connected to `skin` attribute.
     */
    get skin() {
        return this._skin;
    }
    set skin(value) {
        this._skin = value;
        this.initWidget();
    }
    _skin;
    /**
     * Specify the way the skeleton is sized within the element automatically changing its `scaleX` and `scaleY`.
     * It works only with {@link mode} `inside`. Possible values are:
     * - `contain`: as large as possible while still containing the skeleton entirely within the element container (Default).
     * - `fill`: fill the element container by distorting the skeleton's aspect ratio.
     * - `width`: make sure the full width of the source is shown, regardless of whether this means the skeleton overflows the element container vertically.
     * - `height`: make sure the full height of the source is shown, regardless of whether this means the skeleton overflows the element container horizontally.
     * - `cover`: as small as possible while still covering the entire element container.
     * - `scaleDown`: scale the skeleton down to ensure that the skeleton fits within the element container.
     * - `none`: display the skeleton without autoscaling it.
     * - `origin`: the skeleton origin is centered with the element container regardless of the bounds.
     * Connected to `fit` attribute.
     */
    fit = "contain";
    /**
     * The x offset of the skeleton world origin x axis as a percentage of the element container width
     * Connected to `x-axis` attribute.
     */
    xAxis = 0;
    /**
     * The y offset of the skeleton world origin x axis as a percentage of the element container height
     * Connected to `y-axis` attribute.
     */
    yAxis = 0;
    /**
     * The x offset of the root in pixels wrt to the skeleton world origin
     * Connected to `offset-x` attribute.
     */
    offsetX = 0;
    /**
     * The y offset of the root in pixels wrt to the skeleton world origin
     * Connected to `offset-y` attribute.
     */
    offsetY = 0;
    /**
     * A padding that shrink the element container virtually from left as a percentage of the element container width
     * Connected to `pad-left` attribute.
     */
    padLeft = 0;
    /**
     * A padding that shrink the element container virtually from right as a percentage of the element container width
     * Connected to `pad-right` attribute.
     */
    padRight = 0;
    /**
     * A padding that shrink the element container virtually from the top as a percentage of the element container height
     * Connected to `pad-top` attribute.
     */
    padTop = 0;
    /**
     * A padding that shrink the element container virtually from the bottom as a percentage of the element container height
     * Connected to `pad-bottom` attribute.
     */
    padBottom = 0;
    /**
     * A rectangle representing the bounds used to fit the skeleton within the element container.
     * The rectangle coordinates and size are expressed in the Spine world space, not the screen space.
     * It is automatically calculated using the `skin` and `animation` provided by the user during loading.
     * If no skin is provided, it is used the default skin.
     * If no animation is provided, it is used the setup pose.
     * Bounds are not automatically recalculated.when the animation or skin change.
     * Invoke {@link calculateBounds} to recalculate them, or set {@link autoCalculateBounds} to true.
     * Use `setBounds` to set you desired bounds. Bounding Box might be useful to determine the bounds to be used.
     * If the skeleton overflow the element container consider setting {@link clip} to `true`.
     */
    bounds = { x: 0, y: 0, width: -1, height: -1 };
    /**
     * The x of the bounds in Spine world coordinates
     * Connected to `bound-x` attribute.
     */
    get boundsX() {
        return this.bounds.x;
    }
    set boundsX(value) {
        this.bounds.x = value;
    }
    /**
     * The y of the bounds in Spine world coordinates
     * Connected to `bound-y` attribute.
     */
    get boundsY() {
        return this.bounds.y;
    }
    set boundsY(value) {
        this.bounds.y = value;
    }
    /**
     * The width of the bounds in Spine world coordinates
     * Connected to `bound-width` attribute.
     */
    get boundsWidth() {
        return this.bounds.width;
    }
    set boundsWidth(value) {
        this.bounds.width = value;
        if (value <= 0)
            this.initWidget(true);
    }
    /**
     * The height of the bounds in Spine world coordinates
     * Connected to `bound-height` attribute.
     */
    get boundsHeight() {
        return this.bounds.height;
    }
    set boundsHeight(value) {
        this.bounds.height = value;
        if (value <= 0)
            this.initWidget(true);
    }
    /**
     * Optional: an array of animation names that are used to calculate the bounds of the skeleton.
     * Connected to `animations-bound` attribute.
     */
    animationsBound;
    /**
     * Whether or not the bounds are recalculated when an animation or a skin is changed. `false` by default.
     * Connected to `auto-calculate-bounds` attribute.
     */
    autoCalculateBounds = false;
    /**
     * Specify a fixed width for the widget. If at least one of `width` and `height` is > 0,
     * the widget will have an actual size and the element container reference is the widget itself, not the element container parent.
     * Connected to `width` attribute.
     */
    get width() {
        return this._width;
    }
    set width(value) {
        this._width = value;
        this.render();
    }
    _width = -1;
    /**
     * Specify a fixed height for the widget. If at least one of `width` and `height` is > 0,
     * the widget will have an actual size and the element container reference is the widget itself, not the element container parent.
     * Connected to `height` attribute.
     */
    get height() {
        return this._height;
    }
    set height(value) {
        this._height = value;
        this.render();
    }
    _height = -1;
    /**
     * If true, the widget is draggable
     * Connected to `drag` attribute.
     */
    drag = false;
    /**
     * The x of the root relative to the canvas/webgl context center in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    worldX = Infinity;
    /**
     * The y of the root relative to the canvas/webgl context center in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    worldY = Infinity;
    /**
     * The x coordinate of the pointer relative to the pointer relative to the skeleton root in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    pointerWorldX = 1;
    /**
     * The x coordinate of the pointer relative to the pointer relative to the skeleton root in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    pointerWorldY = 1;
    /**
     * If true, the widget is interactive
     * Connected to `interactive` attribute.
     * This is an experimental property and might be removed in the future.
     */
    interactive = false;
    /**
     * If the widget is interactive, this method is invoked with a {@link PointerEventType} when the pointer
     * performs actions within the widget bounds (for example, it enter or leaves the bounds).
     * By default, the function does nothing.
     * This is an experimental property and might be removed in the future.
     */
    pointerEventCallback = (event, originalEvent) => { };
    // TODO: probably it makes sense to associate a single callback to a groups of slots to avoid the same callback to be called for each slot of the group
    /**
     * This methods allows to associate to a Slot a callback. For these slots, if the widget is interactive,
     * when the pointer performs actions within the slot's attachment the associated callback is invoked with
     * a {@link PointerEventType} (for example, it enter or leaves the slot's attachment bounds).
     * This is an experimental property and might be removed in the future.
     */
    addPointerSlotEventCallback(slot, slotFunction) {
        this.pointerSlotEventCallbacks.set(this.getSlotFromRef(slot), { slotFunction, inside: false });
    }
    /**
     * Remove callbacks added through {@link addPointerSlotEventCallback}.
     * @param slot: the slot reference to which remove the associated callback
     */
    removePointerSlotEventCallbacks(slot) {
        this.pointerSlotEventCallbacks.delete(this.getSlotFromRef(slot));
    }
    getSlotFromRef(slotRef) {
        let slot;
        if (typeof slotRef === 'number')
            slot = this.skeleton.slots[slotRef];
        else if (typeof slotRef === 'string')
            slot = this.skeleton.findSlot(slotRef);
        else
            slot = slotRef;
        if (!slot)
            throw new Error(`No slot found with the given slot reference: ${slotRef}`);
        return slot;
    }
    /**
     * If true, some convenience elements are drawn to show the skeleton world origin (green),
     * the root (red), and the bounds rectangle (blue)
     * Connected to `debug` attribute.
     */
    debug = false;
    /**
     * An identifier to obtain this widget using the {@link getSkeleton} function.
     * This is useful when you need to interact with the widget using js.
     * Connected to `identifier` attribute.
     */
    identifier = "";
    /**
     * If false, assets loading are loaded immediately and the skeleton shown as soon as the assets are loaded
     * If true, it is necessary to invoke the start method to start the widget and the loading process
     * Connected to `manual-start` attribute.
     */
    manualStart = false;
    /**
     * If true, automatically sets manualStart to true to pervent widget to start immediately.
     * Then, in combination with the default {@link onScreenFunction}, the widget {@link start}
     * the first time it enters the viewport.
     * This is useful when you want to load the assets only when the widget is revealed.
     * By default, is false.
     * Connected to `start-when-visible` attribute.
     */
    set startWhenVisible(value) {
        this.manualStart = true;
        this._startWhenVisible = value;
    }
    get startWhenVisible() {
        return this._startWhenVisible;
    }
    _startWhenVisible = false;
    /**
     * An array of indexes indicating the atlas pages indexes to be loaded.
     * If undefined, all pages are loaded. If empty (default), no page is loaded;
     * in this case the user can add later the indexes of the pages they want to load
     * and call the loadTexturesInPagesAttribute, to lazily load them.
     * Connected to `pages` attribute.
     */
    pages;
    /**
     * If `true`, the skeleton is clipped to the element container bounds.
     * Be careful on using this feature because it breaks batching!
     * Connected to `clip` attribute.
     */
    clip = false;
    /**
     * The widget update/apply behaviour when the skeleton element container is offscreen:
     * - `pause`: the state is not updated, neither applied (Default)
     * - `update`: the state is updated, but not applied
     * - `pose`: the state is updated and applied
     * Connected to `offscreen` attribute.
     */
    offScreenUpdateBehaviour = "pause";
    /**
     * If true, a Spine loading spinner is shown during asset loading. Default to false.
     * Connected to `spinner` attribute.
     */
    spinner = false;
    /**
     * Replace the default state and skeleton update logic for this widget.
     * @param delta - The milliseconds elapsed since the last update.
     * @param skeleton - The widget's skeleton
     * @param state - The widget's state
     */
    update;
    /**
     * This callback is invoked before the world transforms are computed allows to execute additional logic.
     */
    beforeUpdateWorldTransforms = () => { };
    /**
     * This callback is invoked after the world transforms are computed allows to execute additional logic.
     */
    afterUpdateWorldTransforms = () => { };
    /**
     * A callback invoked each time the element container enters the screen viewport.
     * By default, the callback call the {@link start} method the first time the widget
     * enters the screen viewport and {@link startWhenVisible} is `true`.
     */
    onScreenFunction = async (widget) => {
        if (widget.loading && !widget.onScreenAtLeastOnce && widget.manualStart && widget.startWhenVisible)
            widget.start();
    };
    /**
     * The skeleton hosted by this widget. It's ready once assets are loaded.
     * Safely acces this property by using {@link whenReady}.
     */
    skeleton;
    /**
     * The animation state hosted by this widget. It's ready once assets are loaded.
     * Safely acces this property by using {@link whenReady}.
     */
    state;
    /**
     * The textureAtlas used by this widget to reference attachments. It's ready once assets are loaded.
     * Safely acces this property by using {@link whenReady}.
     */
    textureAtlas;
    /**
     * A Promise that resolve to the widget itself once assets loading is terminated.
     * Useful to safely access {@link skeleton} and {@link state} after a new widget has been just created.
     */
    get whenReady() {
        return this._whenReady;
    }
    ;
    _whenReady;
    /**
     * If true, the widget is in the assets loading process.
     */
    loading = true;
    /**
     * The {@link LoadingScreenWidget} of this widget.
     * This is instantiated only if it is really necessary.
     * For example, if {@link spinner} is `false`, this property value is null
     */
    loadingScreen = null;
    /**
     * If true, the widget is in the assets loading process.
     */
    started = false;
    /**
     * True, when the element container enters the screen viewport. It uses an IntersectionObserver internally.
     */
    onScreen = false;
    /**
     * True, when the element container enters the screen viewport at least once.
     * It uses an IntersectionObserver internally.
     */
    onScreenAtLeastOnce = false;
    /**
     * @internal
     * Holds the dpr (devicePixelRatio) currently used to calculate the scale for this skeleton
     * Do not rely on this properties. It might be made private in the future.
     */
    dprScale = 1;
    /**
     * @internal
     * The accumulated offset on the x axis due to dragging
     * Do not rely on this properties. It might be made private in the future.
     */
    dragX = 0;
    /**
     * @internal
     * The accumulated offset on the y axis due to dragging
     * Do not rely on this properties. It might be made private in the future.
     */
    dragY = 0;
    /**
     * @internal
     * If true, the widget is currently being dragged
     * Do not rely on this properties. It might be made private in the future.
     */
    dragging = false;
    /**
     * @internal
     * If true, the widget has texture with premultiplied alpha
     * Do not rely on this properties. It might be made private in the future.
     */
    pma = false;
    /**
     * If true, indicate {@link dispose} has been called and the widget cannot be used anymore
     */
    disposed = false;
    /**
     * Optional: Pass a `SkeletonData`, if you want to avoid creating a new one
     */
    skeletonData;
    // Reference to the webcomponent shadow root
    root;
    // Reference to the overlay webcomponent
    overlay;
    // Invoked when widget is ready
    resolveLoadingPromise;
    // Invoked when widget has an overlay assigned
    resolveOverlayAssignedPromise;
    // this promise in necessary only for manual start. Before calling manual start is necessary that the overlay has been assigned to the widget.
    // overlay assignment is asynchronous due to webcomponent promotion and dom load termination.
    // When manual start is false, loadSkeleton is invoked after the overlay is assigned. loadSkeleton needs the assetManager that is owned by the overlay.
    // the overlay owns the assetManager because the overly owns the gl context.
    // if it wasn't for the gl context with which textures are created, we could:
    // - have a unique asset manager independent from the overlay (we literally reload the same assets in two different overlays)
    // - remove overlayAssignedPromise and the needs to wait for its resolving
    // - remove appendTo that is just to avoid the user to use the overlayAssignedPromise when the widget is created using js
    overlayAssignedPromise;
    static attributesDescription = {
        atlas: { propertyName: "atlasPath", type: "string" },
        skeleton: { propertyName: "skeletonPath", type: "string" },
        "raw-data": { propertyName: "rawData", type: "object" },
        "json-skeleton-key": { propertyName: "jsonSkeletonKey", type: "string" },
        scale: { propertyName: "scale", type: "number" },
        animation: { propertyName: "animation", type: "string", defaultValue: undefined },
        animations: { propertyName: "animations", type: "animationsInfo", defaultValue: undefined },
        "animation-bounds": { propertyName: "animationsBound", type: "array-string", defaultValue: undefined },
        "default-mix": { propertyName: "defaultMix", type: "number", defaultValue: 0 },
        skin: { propertyName: "skin", type: "array-string" },
        width: { propertyName: "width", type: "number", defaultValue: -1 },
        height: { propertyName: "height", type: "number", defaultValue: -1 },
        drag: { propertyName: "drag", type: "boolean" },
        interactive: { propertyName: "interactive", type: "boolean" },
        "x-axis": { propertyName: "xAxis", type: "number" },
        "y-axis": { propertyName: "yAxis", type: "number" },
        "offset-x": { propertyName: "offsetX", type: "number" },
        "offset-y": { propertyName: "offsetY", type: "number" },
        "pad-left": { propertyName: "padLeft", type: "number" },
        "pad-right": { propertyName: "padRight", type: "number" },
        "pad-top": { propertyName: "padTop", type: "number" },
        "pad-bottom": { propertyName: "padBottom", type: "number" },
        "bounds-x": { propertyName: "boundsX", type: "number" },
        "bounds-y": { propertyName: "boundsY", type: "number" },
        "bounds-width": { propertyName: "boundsWidth", type: "number", defaultValue: -1 },
        "bounds-height": { propertyName: "boundsHeight", type: "number", defaultValue: -1 },
        "auto-calculate-bounds": { propertyName: "autoCalculateBounds", type: "boolean" },
        identifier: { propertyName: "identifier", type: "string" },
        debug: { propertyName: "debug", type: "boolean" },
        "manual-start": { propertyName: "manualStart", type: "boolean" },
        "start-when-visible": { propertyName: "startWhenVisible", type: "boolean" },
        "spinner": { propertyName: "spinner", type: "boolean" },
        clip: { propertyName: "clip", type: "boolean" },
        pages: { propertyName: "pages", type: "array-number" },
        fit: { propertyName: "fit", type: "fitType", defaultValue: "contain" },
        offscreen: { propertyName: "offScreenUpdateBehaviour", type: "offScreenUpdateBehaviourType", defaultValue: "pause" },
    };
    static get observedAttributes() {
        return Object.keys(SpineWebComponentSkeleton.attributesDescription);
    }
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "closed" });
        // these two are terrible code smells
        this._whenReady = new Promise((resolve) => {
            this.resolveLoadingPromise = resolve;
        });
        this.overlayAssignedPromise = new Promise((resolve) => {
            this.resolveOverlayAssignedPromise = resolve;
        });
    }
    connectedCallback() {
        if (this.disposed) {
            throw new Error("You cannot attach a disposed widget");
        }
        ;
        if (this.overlay) {
            this.initAfterConnect();
        }
        else {
            if (document.readyState === "loading")
                window.addEventListener("DOMContentLoaded", this.DOMContentLoadedCallback);
            else
                this.DOMContentLoadedCallback();
        }
        this.render();
    }
    initAfterConnect() {
        this.overlay.addWidget(this);
        if (!this.manualStart && !this.started) {
            this.start();
        }
    }
    DOMContentLoadedCallback = () => {
        customElements.whenDefined("spine-overlay").then(async () => {
            this.overlay = SpineWebComponentOverlay.getOrCreateOverlay(this.getAttribute("overlay-id"));
            this.resolveOverlayAssignedPromise();
            this.initAfterConnect();
        });
    };
    disconnectedCallback() {
        window.removeEventListener("DOMContentLoaded", this.DOMContentLoadedCallback);
        const index = this.overlay?.widgets.indexOf(this);
        if (index > 0) {
            this.overlay.widgets.splice(index, 1);
        }
    }
    /**
     * Remove the widget from the overlay and the DOM.
     */
    dispose() {
        this.disposed = true;
        this.disposeGLResources();
        this.loadingScreen?.dispose();
        this.overlay.removeWidget(this);
        this.remove();
        this.skeletonData = undefined;
        this.skeleton = undefined;
        this.state = undefined;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        const { type, propertyName, defaultValue } = SpineWebComponentSkeleton.attributesDescription[name];
        const val = castValue(type, newValue, defaultValue);
        this[propertyName] = val;
        return;
    }
    /**
     * Starts the widget. Starting the widget means to load the assets currently set into
     * {@link atlasPath} and {@link skeletonPath}. If start is invoked when the widget is already started,
     * the skeleton and the state are reset. Bounds are recalculated only if {@link autoCalculateBounds} is true.
     */
    start() {
        if (this.started) {
            this.skeleton = undefined;
            this.state = undefined;
            this._whenReady = new Promise((resolve) => {
                this.resolveLoadingPromise = resolve;
            });
        }
        this.started = true;
        customElements.whenDefined("spine-overlay").then(() => {
            this.resolveLoadingPromise(this.loadSkeleton());
        });
    }
    /**
     * Loads the texture pages in the given `atlas` corresponding to the indexes set into {@link pages}.
     * This method is automatically called during asset loading. When `pages` is undefined (default),
     * all pages are loaded. This method is useful when you want to load a subset of pages programmatically.
     * In that case, set `pages` to an empty array at the beginning.
     * Then set the pages you want to load and invoke this method.
     * @param atlas the `TextureAtlas` from which to get the `TextureAtlasPage`s
     * @returns The list of loaded assets
     */
    async loadTexturesInPagesAttribute() {
        const atlas = this.overlay.assetManager.require(this.atlasPath);
        const pagesIndexToLoad = this.pages ?? atlas.pages.map((_, i) => i); // if no pages provided, loads all
        const atlasPath = this.atlasPath?.includes("/") ? this.atlasPath.substring(0, this.atlasPath.lastIndexOf("/") + 1) : "";
        const promisePageList = [];
        const texturePaths = [];
        for (const index of pagesIndexToLoad) {
            const page = atlas.pages[index];
            const texturePath = `${atlasPath}${page.name}`;
            texturePaths.push(texturePath);
            const promiseTextureLoad = this.lastTexturePaths.includes(texturePath)
                ? Promise.resolve(texturePath)
                : this.overlay.assetManager.loadTextureAsync(texturePath).then(texture => {
                    this.lastTexturePaths.push(texturePath);
                    page.setTexture(texture);
                    return texturePath;
                });
            promisePageList.push(promiseTextureLoad);
        }
        // dispose textures no longer used
        for (const lastTexturePath of this.lastTexturePaths) {
            if (!texturePaths.includes(lastTexturePath))
                this.overlay.assetManager.disposeAsset(lastTexturePath);
        }
        return Promise.all(promisePageList);
    }
    /**
     * @returns The `HTMLElement` where the widget is hosted.
     */
    getHostElement() {
        return (this.width <= 0 || this.width <= 0) && !this.getAttribute("style") && !this.getAttribute("class")
            ? this.parentElement
            : this;
    }
    /**
     * Append the widget to the given `HTMLElement`.
     * @param atlas the `HTMLElement` to append this widget to.
     */
    async appendTo(element) {
        element.appendChild(this);
        await this.overlayAssignedPromise;
    }
    /**
     * Calculates and sets the bounds of the current animation on track 0.
     * Useful when animations or skins are set programmatically.
     * @returns void
     */
    calculateBounds(forcedRecalculate = false) {
        const { skeleton, state } = this;
        if (!skeleton || !state)
            return;
        let bounds;
        if (this.animationsBound && forcedRecalculate) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const animationName of this.animationsBound) {
                const animation = this.skeleton?.data.animations.find(({ name }) => animationName === name);
                const { x, y, width, height } = this.calculateAnimationViewport(animation);
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
            }
            bounds = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
        else {
            bounds = this.calculateAnimationViewport(state.getCurrent(0)?.animation);
        }
        bounds.x /= skeleton.scaleX;
        bounds.y /= skeleton.scaleY;
        bounds.width /= skeleton.scaleX;
        bounds.height /= skeleton.scaleY;
        this.bounds = bounds;
    }
    lastSkelPath = "";
    lastAtlasPath = "";
    lastTexturePaths = [];
    // add a skeleton to the overlay and set the bounds to the given animation or to the setup pose
    async loadSkeleton() {
        this.loading = true;
        const { atlasPath, skeletonPath, scale, skeletonData: skeletonDataInput, rawData } = this;
        if (!atlasPath || !skeletonPath) {
            throw new Error(`Missing atlas path or skeleton path. Assets cannot be loaded: atlas: ${atlasPath}, skeleton: ${skeletonPath}`);
        }
        const isBinary = skeletonPath.endsWith(".skel");
        if (rawData) {
            for (let [key, value] of Object.entries(rawData)) {
                this.overlay.assetManager.setRawDataURI(key, isBase64(value) ? `data:application/octet-stream;base64,${value}` : value);
            }
        }
        // this ensure there is an overlay assigned because the overlay owns the asset manager used to load assets below
        await this.overlayAssignedPromise;
        if (this.lastSkelPath && this.lastSkelPath !== skeletonPath) {
            this.overlay.assetManager.disposeAsset(this.lastSkelPath);
            this.lastSkelPath = "";
        }
        if (this.lastAtlasPath && this.lastAtlasPath !== atlasPath) {
            this.overlay.assetManager.disposeAsset(this.lastAtlasPath);
            this.lastAtlasPath = "";
        }
        // skeleton and atlas txt are loaded immeaditely
        // textures are loaeded depending on the 'pages' param:
        // - [0,2]: only pages at index 0 and 2 are loaded
        // - []: no page is loaded
        // - undefined: all pages are loaded (default)
        await Promise.all([
            this.lastSkelPath
                ? Promise.resolve()
                : (isBinary ? this.overlay.assetManager.loadBinaryAsync(skeletonPath) : this.overlay.assetManager.loadJsonAsync(skeletonPath))
                    .then(() => this.lastSkelPath = skeletonPath),
            this.lastAtlasPath
                ? Promise.resolve()
                : this.overlay.assetManager.loadTextureAtlasButNoTexturesAsync(atlasPath).then(() => {
                    this.lastAtlasPath = atlasPath;
                    return this.loadTexturesInPagesAttribute();
                }),
        ]);
        const atlas = this.overlay.assetManager.require(atlasPath);
        this.pma = atlas.pages[0]?.pma;
        const atlasLoader = new AtlasAttachmentLoader(atlas);
        const skeletonLoader = isBinary ? new SkeletonBinary(atlasLoader) : new SkeletonJson(atlasLoader);
        skeletonLoader.scale = scale;
        const skeletonFileAsset = this.overlay.assetManager.require(skeletonPath);
        const skeletonFile = this.jsonSkeletonKey ? skeletonFileAsset[this.jsonSkeletonKey] : skeletonFileAsset;
        const skeletonData = (skeletonDataInput || this.skeleton?.data) ?? skeletonLoader.readSkeletonData(skeletonFile);
        const skeleton = new Skeleton(skeletonData);
        const animationStateData = new AnimationStateData(skeletonData);
        const state = new AnimationState(animationStateData);
        this.skeleton = skeleton;
        this.state = state;
        this.textureAtlas = atlas;
        // ideally we would know the dpi and the zoom, however they are combined
        // to simplify we just assume that the user wants to load the skeleton at scale 1
        // at the current browser zoom level
        // this might be problematic for free-scale modes (origin and inside+none)
        this.dprScale = this.overlay.getDevicePixelRatio();
        // skeleton.scaleX = this.dprScale;
        // skeleton.scaleY = this.dprScale;
        this.loading = false;
        // the bounds are calculated the first time, if no custom bound is provided
        this.initWidget(this.bounds.width <= 0 || this.bounds.height <= 0);
        return this;
    }
    initWidget(forceRecalculate = false) {
        if (this.loading)
            return;
        const { skeleton, state, animation, animations: animationsInfo, skin, defaultMix } = this;
        if (skin) {
            if (skin.length === 1) {
                skeleton?.setSkinByName(skin[0]);
            }
            else {
                const customSkin = new Skin("custom");
                for (const s of skin)
                    customSkin.addSkin(skeleton?.data.findSkin(s));
                skeleton?.setSkin(customSkin);
            }
            skeleton?.setSlotsToSetupPose();
        }
        if (state) {
            state.data.defaultMix = defaultMix;
            if (animationsInfo) {
                for (const [trackIndexString, { cycle, animations, repeatDelay }] of Object.entries(animationsInfo)) {
                    const cycleFn = () => {
                        const trackIndex = Number(trackIndexString);
                        for (const [index, { animationName, delay, loop, mixDuration }] of animations.entries()) {
                            let track;
                            if (index === 0) {
                                if (animationName === "#EMPTY#") {
                                    track = state.setEmptyAnimation(trackIndex, mixDuration);
                                }
                                else {
                                    track = state.setAnimation(trackIndex, animationName, loop);
                                }
                            }
                            else {
                                if (animationName === "#EMPTY#") {
                                    track = state.addEmptyAnimation(trackIndex, mixDuration, delay);
                                }
                                else {
                                    track = state.addAnimation(trackIndex, animationName, loop, delay);
                                }
                            }
                            if (mixDuration)
                                track.mixDuration = mixDuration;
                            if (cycle && index === animations.length - 1) {
                                track.listener = {
                                    complete: () => {
                                        if (repeatDelay)
                                            setTimeout(() => cycleFn(), 1000 * repeatDelay);
                                        else
                                            cycleFn();
                                        delete track.listener?.complete;
                                    }
                                };
                            }
                            ;
                        }
                    };
                    cycleFn();
                }
            }
            else if (animation) {
                state.setAnimation(0, animation, true);
            }
            else {
                state.setEmptyAnimation(0);
            }
        }
        if (forceRecalculate || this.autoCalculateBounds)
            this.calculateBounds(forceRecalculate);
    }
    render() {
        let noSize = (!this.getAttribute("style") && !this.getAttribute("class"));
        this.root.innerHTML = `
        <style>
            :host {
                position: relative;
                display: inline-block;
				${noSize ? "width: 0; height: 0;" : ""}
            }
        </style>
        `;
    }
    /*
    * Interaction utilities
    */
    /**
     * @internal
     */
    pointerInsideBounds = false;
    verticesTemp = Utils.newFloatArray(2 * 1024);
    /**
     * @internal
     */
    pointerSlotEventCallbacks = new Map();
    /**
     * @internal
     */
    pointerEventUpdate(type, originalEvent) {
        if (!this.interactive)
            return;
        this.checkBoundsInteraction(type, originalEvent);
        this.checkSlotInteraction(type, originalEvent);
    }
    checkBoundsInteraction(type, originalEvent) {
        if (this.isPointerInsideBounds()) {
            if (!this.pointerInsideBounds) {
                this.pointerEventCallback("enter", originalEvent);
            }
            this.pointerInsideBounds = true;
            this.pointerEventCallback(type, originalEvent);
        }
        else {
            if (this.pointerInsideBounds) {
                this.pointerEventCallback("leave", originalEvent);
            }
            this.pointerInsideBounds = false;
        }
    }
    /**
     * @internal
     */
    isPointerInsideBounds() {
        if (this.isOffScreenAndWasMoved() || !this.skeleton)
            return false;
        const x = this.pointerWorldX / this.skeleton.scaleX;
        const y = this.pointerWorldY / this.skeleton.scaleY;
        return (x >= this.bounds.x &&
            x <= this.bounds.x + this.bounds.width &&
            y >= this.bounds.y &&
            y <= this.bounds.y + this.bounds.height);
    }
    checkSlotInteraction(type, originalEvent) {
        for (let [slot, interactionState] of this.pointerSlotEventCallbacks) {
            if (!slot.bone.active)
                continue;
            let attachment = slot.getAttachment();
            if (!(attachment instanceof RegionAttachment || attachment instanceof MeshAttachment))
                continue;
            const { slotFunction, inside } = interactionState;
            let vertices = this.verticesTemp;
            let hullLength = 8;
            // we could probably cache the vertices from rendering if interaction with this slot is enabled
            if (attachment instanceof RegionAttachment) {
                let regionAttachment = attachment;
                regionAttachment.computeWorldVertices(slot, vertices, 0, 2);
            }
            else if (attachment instanceof MeshAttachment) {
                let mesh = attachment;
                mesh.computeWorldVertices(slot, 0, mesh.worldVerticesLength, vertices, 0, 2);
                hullLength = mesh.hullLength;
            }
            // here we have only "move" and "drag" events
            if (this.isPointInPolygon(vertices, hullLength, [this.pointerWorldX, this.pointerWorldY])) {
                if (!inside) {
                    interactionState.inside = true;
                    slotFunction(slot, "enter", originalEvent);
                }
                if (type === "down" || type === "up") {
                    if (interactionState.inside) {
                        slotFunction(slot, type, originalEvent);
                    }
                    continue;
                }
                slotFunction(slot, type, originalEvent);
            }
            else {
                if (inside) {
                    interactionState.inside = false;
                    slotFunction(slot, "leave", originalEvent);
                }
            }
        }
    }
    isPointInPolygon(vertices, hullLength, point) {
        const [px, py] = point;
        if (hullLength < 6) {
            throw new Error("A polygon must have at least 3 vertices (6 numbers in the array). ");
        }
        let isInside = false;
        for (let i = 0, j = hullLength - 2; i < hullLength; i += 2) {
            const xi = vertices[i], yi = vertices[i + 1];
            const xj = vertices[j], yj = vertices[j + 1];
            const intersects = ((yi > py) !== (yj > py)) &&
                (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
            if (intersects)
                isInside = !isInside;
            j = i;
        }
        return isInside;
    }
    /*
    * Other utilities
    */
    boneFollowerList = [];
    followSlot(slotName, element, options = {}) {
        const { followVisibility = false, followRotation = true, followOpacity = true, followScale = true, hideAttachment = false, } = options;
        const slot = typeof slotName === 'string' ? this.skeleton?.findSlot(slotName) : slotName;
        if (!slot)
            return;
        if (hideAttachment) {
            slot.setAttachment(null);
        }
        element.style.position = 'absolute';
        element.style.top = '0px';
        element.style.left = '0px';
        element.style.display = 'none';
        this.boneFollowerList.push({ slot, bone: slot.bone, element, followVisibility, followRotation, followOpacity, followScale, hideAttachment });
        this.overlay.addSlotFollowerElement(element);
    }
    unfollowSlot(element) {
        const index = this.boneFollowerList.findIndex(e => e.element === element);
        if (index > -1) {
            return this.boneFollowerList.splice(index, 1)[0].element;
        }
    }
    isOffScreenAndWasMoved() {
        return !this.onScreen && this.dragX === 0 && this.dragY === 0;
    }
    calculateAnimationViewport(animation) {
        const renderer = this.overlay.renderer;
        const { skeleton } = this;
        if (!skeleton)
            return { x: 0, y: 0, width: 0, height: 0 };
        skeleton.setToSetupPose();
        let offset = new Vector2(), size = new Vector2();
        const tempArray = new Array(2);
        if (!animation) {
            skeleton.updateWorldTransform(Physics.update);
            skeleton.getBounds(offset, size, tempArray, renderer.skeletonRenderer.getSkeletonClipping());
            return {
                x: offset.x,
                y: offset.y,
                width: size.x,
                height: size.y,
            };
        }
        let steps = 100, stepTime = animation.duration ? animation.duration / steps : 0, time = 0;
        let minX = 100000000, maxX = -100000000, minY = 100000000, maxY = -100000000;
        for (let i = 0; i < steps; i++, time += stepTime) {
            animation.apply(skeleton, time, time, false, [], 1, MixBlend.setup, MixDirection.mixIn);
            skeleton.updateWorldTransform(Physics.update);
            skeleton.getBounds(offset, size, tempArray, renderer.skeletonRenderer.getSkeletonClipping());
            if (!isNaN(offset.x) && !isNaN(offset.y) && !isNaN(size.x) && !isNaN(size.y) &&
                !isNaN(minX) && !isNaN(minY) && !isNaN(maxX) && !isNaN(maxY)) {
                minX = Math.min(offset.x, minX);
                maxX = Math.max(offset.x + size.x, maxX);
                minY = Math.min(offset.y, minY);
                maxY = Math.max(offset.y + size.y, maxY);
            }
            else {
                return { x: 0, y: 0, width: -1, height: -1 };
            }
        }
        skeleton.setToSetupPose();
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
    disposeGLResources() {
        const { assetManager } = this.overlay;
        if (this.lastAtlasPath)
            assetManager.disposeAsset(this.lastAtlasPath);
        if (this.lastSkelPath)
            assetManager.disposeAsset(this.lastSkelPath);
    }
}
customElements.define("spine-skeleton", SpineWebComponentSkeleton);
/**
 * Return the first {@link SpineWebComponentSkeleton} with the given {@link SpineWebComponentSkeleton.identifier}
 * @param identifier The {@link SpineWebComponentSkeleton.identifier} to search on the DOM
 * @returns A skeleton web component instance with the given identifier
 */
export function getSkeleton(identifier) {
    return document.querySelector(`spine-skeleton[identifier=${identifier}]`);
}
/**
 * Create a {@link SpineWebComponentSkeleton} with the given {@link WidgetAttributes}.
 * @param parameters The options to pass to the {@link SpineWebComponentSkeleton}
 * @returns The skeleton web component instance created
 */
export function createSkeleton(parameters) {
    const widget = document.createElement("spine-skeleton");
    Object.entries(SpineWebComponentSkeleton.attributesDescription).forEach(entry => {
        const [key, { propertyName }] = entry;
        const value = parameters[propertyName];
        if (value)
            widget.setAttribute(key, value);
    });
    return widget;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9TcGluZVdlYkNvbXBvbmVudFNrZWxldG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUUvRSxPQUFPLEVBRU4sY0FBYyxFQUNkLGtCQUFrQixFQUNsQixxQkFBcUIsRUFJckIsY0FBYyxFQUNkLFFBQVEsRUFDUixZQUFZLEVBRVosT0FBTyxFQUNQLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsY0FBYyxFQUVkLFlBQVksRUFDWixJQUFJLEVBR0osS0FBSyxFQUNMLE9BQU8sR0FDUCxNQUFNLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBa0IsU0FBUyxFQUFFLFFBQVEsRUFBYSxNQUFNLGNBQWMsQ0FBQztBQXNGOUUsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFdBQVc7SUFFekQ7OztPQUdHO0lBQ0ksU0FBUyxDQUFVO0lBRTFCOzs7T0FHRztJQUNJLFlBQVksQ0FBVTtJQUU3Qjs7O09BR0c7SUFDSSxPQUFPLENBQTBCO0lBRXhDOzs7T0FHRztJQUNJLGVBQWUsQ0FBVTtJQUVoQzs7OztPQUlHO0lBQ0ksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUVqQjs7O09BR0c7SUFDSCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFDRCxJQUFXLFNBQVMsQ0FBRSxLQUF5QjtRQUM5QyxJQUFJLEtBQUssS0FBSyxFQUFFO1lBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQztRQUNwQyxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUNPLFVBQVUsQ0FBUztJQUUzQjs7Ozs7OztPQU9H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Q0YsQ0FBQztRQUVELElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRSxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQzFGLElBQUksSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxHQUFHLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUM7UUFDN0UsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7WUFDbEQsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4RixRQUFRLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztZQUU3RixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzNFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2hDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDekMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxDQUFDO1FBQ0YsQ0FBQztRQUVELFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUUxQixPQUFPO1lBQ04sQ0FBQyxFQUFFLElBQUk7WUFDUCxDQUFDLEVBQUUsSUFBSTtZQUNQLEtBQUssRUFBRSxJQUFJLEdBQUcsSUFBSTtZQUNsQixNQUFNLEVBQUUsSUFBSSxHQUFHLElBQUk7U0FDbkIsQ0FBQTtJQUNGLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdEMsSUFBSSxJQUFJLENBQUMsYUFBYTtZQUFFLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3RFLElBQUksSUFBSSxDQUFDLFlBQVk7WUFBRSxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNyRSxDQUFDOztBQUlGLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUVuRTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBRSxVQUFrQjtJQUM5QyxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUMsNkJBQTZCLFVBQVUsR0FBRyxDQUE4QixDQUFDO0FBQ3hHLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBRSxVQUE0QjtJQUMzRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUE4QixDQUFDO0lBRXJGLE1BQU0sQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDL0UsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLFlBQVksRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QyxJQUFJLEtBQUs7WUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxLQUFZLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIFNwaW5lIFJ1bnRpbWVzIExpY2Vuc2UgQWdyZWVtZW50XG4gKiBMYXN0IHVwZGF0ZWQgSnVseSAyOCwgMjAyMy4gUmVwbGFjZXMgYWxsIHByaW9yIHZlcnNpb25zLlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMy0yMDIzLCBFc290ZXJpYyBTb2Z0d2FyZSBMTENcbiAqXG4gKiBJbnRlZ3JhdGlvbiBvZiB0aGUgU3BpbmUgUnVudGltZXMgaW50byBzb2Z0d2FyZSBvciBvdGhlcndpc2UgY3JlYXRpbmdcbiAqIGRlcml2YXRpdmUgd29ya3Mgb2YgdGhlIFNwaW5lIFJ1bnRpbWVzIGlzIHBlcm1pdHRlZCB1bmRlciB0aGUgdGVybXMgYW5kXG4gKiBjb25kaXRpb25zIG9mIFNlY3Rpb24gMiBvZiB0aGUgU3BpbmUgRWRpdG9yIExpY2Vuc2UgQWdyZWVtZW50OlxuICogaHR0cDovL2Vzb3Rlcmljc29mdHdhcmUuY29tL3NwaW5lLWVkaXRvci1saWNlbnNlXG4gKlxuICogT3RoZXJ3aXNlLCBpdCBpcyBwZXJtaXR0ZWQgdG8gaW50ZWdyYXRlIHRoZSBTcGluZSBSdW50aW1lcyBpbnRvIHNvZnR3YXJlIG9yXG4gKiBvdGhlcndpc2UgY3JlYXRlIGRlcml2YXRpdmUgd29ya3Mgb2YgdGhlIFNwaW5lIFJ1bnRpbWVzIChjb2xsZWN0aXZlbHksXG4gKiBcIlByb2R1Y3RzXCIpLCBwcm92aWRlZCB0aGF0IGVhY2ggdXNlciBvZiB0aGUgUHJvZHVjdHMgbXVzdCBvYnRhaW4gdGhlaXIgb3duXG4gKiBTcGluZSBFZGl0b3IgbGljZW5zZSBhbmQgcmVkaXN0cmlidXRpb24gb2YgdGhlIFByb2R1Y3RzIGluIGFueSBmb3JtIG11c3RcbiAqIGluY2x1ZGUgdGhpcyBsaWNlbnNlIGFuZCBjb3B5cmlnaHQgbm90aWNlLlxuICpcbiAqIFRIRSBTUElORSBSVU5USU1FUyBBUkUgUFJPVklERUQgQlkgRVNPVEVSSUMgU09GVFdBUkUgTExDIFwiQVMgSVNcIiBBTkQgQU5ZXG4gKiBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEXG4gKiBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQVJFXG4gKiBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCBFU09URVJJQyBTT0ZUV0FSRSBMTEMgQkUgTElBQkxFIEZPUiBBTllcbiAqIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gKiAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVMsXG4gKiBCVVNJTkVTUyBJTlRFUlJVUFRJT04sIE9SIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTKSBIT1dFVkVSIENBVVNFRCBBTkRcbiAqIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gKiAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0YgVEhFXG4gKiBTUElORSBSVU5USU1FUywgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHtcblx0QW5pbWF0aW9uLFxuXHRBbmltYXRpb25TdGF0ZSxcblx0QW5pbWF0aW9uU3RhdGVEYXRhLFxuXHRBdGxhc0F0dGFjaG1lbnRMb2FkZXIsXG5cdEJvbmUsXG5cdERpc3Bvc2FibGUsXG5cdExvYWRpbmdTY3JlZW4sXG5cdE1lc2hBdHRhY2htZW50LFxuXHRNaXhCbGVuZCxcblx0TWl4RGlyZWN0aW9uLFxuXHROdW1iZXJBcnJheUxpa2UsXG5cdFBoeXNpY3MsXG5cdFJlZ2lvbkF0dGFjaG1lbnQsXG5cdFNrZWxldG9uLFxuXHRTa2VsZXRvbkJpbmFyeSxcblx0U2tlbGV0b25EYXRhLFxuXHRTa2VsZXRvbkpzb24sXG5cdFNraW4sXG5cdFNsb3QsXG5cdFRleHR1cmVBdGxhcyxcblx0VXRpbHMsXG5cdFZlY3RvcjIsXG59IGZyb20gXCJAZXNvdGVyaWNzb2Z0d2FyZS9zcGluZS13ZWJnbFwiO1xuaW1wb3J0IHsgU3BpbmVXZWJDb21wb25lbnRPdmVybGF5IH0gZnJvbSBcIi4vU3BpbmVXZWJDb21wb25lbnRPdmVybGF5LmpzXCI7XG5pbXBvcnQgeyBBdHRyaWJ1dGVUeXBlcywgY2FzdFZhbHVlLCBpc0Jhc2U2NCwgUmVjdGFuZ2xlIH0gZnJvbSBcIi4vd2NVdGlscy5qc1wiO1xuXG50eXBlIFVwZGF0ZVNwaW5lV2lkZ2V0RnVuY3Rpb24gPSAoZGVsdGE6IG51bWJlciwgc2tlbGV0b246IFNrZWxldG9uLCBzdGF0ZTogQW5pbWF0aW9uU3RhdGUpID0+IHZvaWQ7XG5cbmV4cG9ydCB0eXBlIE9mZlNjcmVlblVwZGF0ZUJlaGF2aW91clR5cGUgPSBcInBhdXNlXCIgfCBcInVwZGF0ZVwiIHwgXCJwb3NlXCI7XG5leHBvcnQgdHlwZSBGaXRUeXBlID0gXCJmaWxsXCIgfCBcIndpZHRoXCIgfCBcImhlaWdodFwiIHwgXCJjb250YWluXCIgfCBcImNvdmVyXCIgfCBcIm5vbmVcIiB8IFwic2NhbGVEb3duXCIgfCBcIm9yaWdpblwiO1xuZXhwb3J0IHR5cGUgQW5pbWF0aW9uc0luZm8gPSBSZWNvcmQ8c3RyaW5nLCB7XG5cdGN5Y2xlPzogYm9vbGVhbixcblx0cmVwZWF0RGVsYXk/OiBudW1iZXI7XG5cdGFuaW1hdGlvbnM6IEFycmF5PEFuaW1hdGlvbnNUeXBlPlxufT47XG5leHBvcnQgdHlwZSBBbmltYXRpb25zVHlwZSA9IHsgYW5pbWF0aW9uTmFtZTogc3RyaW5nIHwgXCIjRU1QVFkjXCIsIGxvb3A/OiBib29sZWFuLCBkZWxheT86IG51bWJlciwgbWl4RHVyYXRpb24/OiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIFBvaW50ZXJFdmVudFR5cGUgPSBcImRvd25cIiB8IFwidXBcIiB8IFwiZW50ZXJcIiB8IFwibGVhdmVcIiB8IFwibW92ZVwiIHwgXCJkcmFnXCI7XG5leHBvcnQgdHlwZSBQb2ludGVyRXZlbnRUeXBlc0lucHV0ID0gRXhjbHVkZTxQb2ludGVyRXZlbnRUeXBlLCBcImVudGVyXCIgfCBcImxlYXZlXCI+O1xuXG4vLyBUaGUgcHJvcGVydGllcyB0aGF0IG1hcCB0byB3aWRnZXQgYXR0cmlidXRlc1xuaW50ZXJmYWNlIFdpZGdldEF0dHJpYnV0ZXMge1xuXHRhdGxhc1BhdGg/OiBzdHJpbmdcblx0c2tlbGV0b25QYXRoPzogc3RyaW5nXG5cdHJhd0RhdGE/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5cdGpzb25Ta2VsZXRvbktleT86IHN0cmluZ1xuXHRzY2FsZTogbnVtYmVyXG5cdGFuaW1hdGlvbj86IHN0cmluZ1xuXHRhbmltYXRpb25zPzogQW5pbWF0aW9uc0luZm9cblx0ZGVmYXVsdE1peD86IG51bWJlclxuXHRza2luPzogc3RyaW5nW11cblx0Zml0OiBGaXRUeXBlXG5cdHhBeGlzOiBudW1iZXJcblx0eUF4aXM6IG51bWJlclxuXHRvZmZzZXRYOiBudW1iZXJcblx0b2Zmc2V0WTogbnVtYmVyXG5cdHBhZExlZnQ6IG51bWJlclxuXHRwYWRSaWdodDogbnVtYmVyXG5cdHBhZFRvcDogbnVtYmVyXG5cdHBhZEJvdHRvbTogbnVtYmVyXG5cdGFuaW1hdGlvbnNCb3VuZD86IHN0cmluZ1tdXG5cdGJvdW5kc1g6IG51bWJlclxuXHRib3VuZHNZOiBudW1iZXJcblx0Ym91bmRzV2lkdGg6IG51bWJlclxuXHRib3VuZHNIZWlnaHQ6IG51bWJlclxuXHRhdXRvQ2FsY3VsYXRlQm91bmRzOiBib29sZWFuXG5cdHdpZHRoOiBudW1iZXJcblx0aGVpZ2h0OiBudW1iZXJcblx0ZHJhZzogYm9vbGVhblxuXHRpbnRlcmFjdGl2ZTogYm9vbGVhblxuXHRkZWJ1ZzogYm9vbGVhblxuXHRpZGVudGlmaWVyOiBzdHJpbmdcblx0bWFudWFsU3RhcnQ6IGJvb2xlYW5cblx0c3RhcnRXaGVuVmlzaWJsZTogYm9vbGVhblxuXHRwYWdlcz86IEFycmF5PG51bWJlcj5cblx0Y2xpcDogYm9vbGVhblxuXHRvZmZTY3JlZW5VcGRhdGVCZWhhdmlvdXI6IE9mZlNjcmVlblVwZGF0ZUJlaGF2aW91clR5cGVcblx0c3Bpbm5lcjogYm9vbGVhblxufVxuXG4vLyBUaGUgbWV0aG9kcyB1c2VyIGNhbiBvdmVycmlkZSB0byBoYXZlIGN1c3RvbSBiZWhhdmlvdXJcbmludGVyZmFjZSBXaWRnZXRPdmVycmlkYWJsZU1ldGhvZHMge1xuXHR1cGRhdGU/OiBVcGRhdGVTcGluZVdpZGdldEZ1bmN0aW9uO1xuXHRiZWZvcmVVcGRhdGVXb3JsZFRyYW5zZm9ybXM6IFVwZGF0ZVNwaW5lV2lkZ2V0RnVuY3Rpb247XG5cdGFmdGVyVXBkYXRlV29ybGRUcmFuc2Zvcm1zOiBVcGRhdGVTcGluZVdpZGdldEZ1bmN0aW9uO1xuXHRvblNjcmVlbkZ1bmN0aW9uOiAod2lkZ2V0OiBTcGluZVdlYkNvbXBvbmVudFNrZWxldG9uKSA9PiB2b2lkXG59XG5cbi8vIFByb3BlcnRpZXMgdGhhdCBkb2VzIG5vdCBtYXAgdG8gYW55IHdpZGdldCBhdHRyaWJ1dGUsIGJ1dCB0aGF0IG1pZ2h0IGJlIHVzZWZ1bFxuaW50ZXJmYWNlIFdpZGdldFB1YmxpY1Byb3BlcnRpZXMge1xuXHRza2VsZXRvbjogU2tlbGV0b25cblx0c3RhdGU6IEFuaW1hdGlvblN0YXRlXG5cdGJvdW5kczogUmVjdGFuZ2xlXG5cdG9uU2NyZWVuOiBib29sZWFuXG5cdG9uU2NyZWVuQXRMZWFzdE9uY2U6IGJvb2xlYW5cblx0d2hlblJlYWR5OiBQcm9taXNlPFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24+XG5cdGxvYWRpbmc6IGJvb2xlYW5cblx0c3RhcnRlZDogYm9vbGVhblxuXHR0ZXh0dXJlQXRsYXM6IFRleHR1cmVBdGxhc1xuXHRkaXNwb3NlZDogYm9vbGVhblxufVxuXG4vLyBVc2FnZSBvZiB0aGlzIHByb3BlcnRpZXMgaXMgZGlzY291cmFnZWQgYmVjYXVzZSB0aGV5IGNhbiBiZSBtYWRlIHByaXZhdGUgaW4gdGhlIGZ1dHVyZVxuaW50ZXJmYWNlIFdpZGdldEludGVybmFsUHJvcGVydGllcyB7XG5cdHBtYTogYm9vbGVhblxuXHRkcHJTY2FsZTogbnVtYmVyXG5cdGRyYWdnaW5nOiBib29sZWFuXG5cdGRyYWdYOiBudW1iZXJcblx0ZHJhZ1k6IG51bWJlclxufVxuXG5leHBvcnQgY2xhc3MgU3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbiBleHRlbmRzIEhUTUxFbGVtZW50IGltcGxlbWVudHMgRGlzcG9zYWJsZSwgV2lkZ2V0QXR0cmlidXRlcywgV2lkZ2V0T3ZlcnJpZGFibGVNZXRob2RzLCBXaWRnZXRJbnRlcm5hbFByb3BlcnRpZXMsIFBhcnRpYWw8V2lkZ2V0UHVibGljUHJvcGVydGllcz4ge1xuXG5cdC8qKlxuXHQgKiBUaGUgVVJMIG9mIHRoZSBza2VsZXRvbiBhdGxhcyBmaWxlICguYXRsYXMpXG5cdCAqIENvbm5lY3RlZCB0byBgYXRsYXNgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBhdGxhc1BhdGg/OiBzdHJpbmc7XG5cblx0LyoqXG5cdCAqIFRoZSBVUkwgb2YgdGhlIHNrZWxldG9uIEpTT04gKC5qc29uKSBvciBiaW5hcnkgKC5za2VsKSBmaWxlXG5cdCAqIENvbm5lY3RlZCB0byBgc2tlbGV0b25gIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBza2VsZXRvblBhdGg/OiBzdHJpbmc7XG5cblx0LyoqXG5cdCAqIEhvbGRzIHRoZSBhc3NldHMgaW4gYmFzZTY0IGZvcm1hdC5cblx0ICogQ29ubmVjdGVkIHRvIGByYXctZGF0YWAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIHJhd0RhdGE/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG5cdC8qKlxuXHQgKiBUaGUgbmFtZSBvZiB0aGUgc2tlbGV0b24gd2hlbiB0aGUgc2tlbGV0b24gZmlsZSBpcyBhIEpTT04gYW5kIGNvbnRhaW5zIG11bHRpcGxlIHNrZWxldG9ucy5cblx0ICogQ29ubmVjdGVkIHRvIGBqc29uLXNrZWxldG9uLWtleWAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIGpzb25Ta2VsZXRvbktleT86IHN0cmluZztcblxuXHQvKipcblx0ICogVGhlIHNjYWxlIHBhc3NlZCB0byB0aGUgU2tlbGV0b24gTG9hZGVyLiBTa2VsZXRvbkRhdGEgdmFsdWVzIHdpbGwgYmUgc2NhbGVkIGFjY29yZGluZ2x5LlxuXHQgKiBEZWZhdWx0OiAxXG5cdCAqIENvbm5lY3RlZCB0byBgc2NhbGVgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBzY2FsZSA9IDE7XG5cblx0LyoqXG5cdCAqIE9wdGlvbmFsOiBUaGUgbmFtZSBvZiB0aGUgYW5pbWF0aW9uIHRvIGJlIHBsYXllZC4gV2hlbiBzZXQsIHRoZSB3aWRnZXQgaXMgcmVpbml0aWFsaXplZC5cblx0ICogQ29ubmVjdGVkIHRvIGBhbmltYXRpb25gIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBnZXQgYW5pbWF0aW9uICgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb247XG5cdH1cblx0cHVibGljIHNldCBhbmltYXRpb24gKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcblx0XHRpZiAodmFsdWUgPT09IFwiXCIpIHZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdHRoaXMuX2FuaW1hdGlvbiA9IHZhbHVlO1xuXHRcdHRoaXMuaW5pdFdpZGdldCgpO1xuXHR9XG5cdHByaXZhdGUgX2FuaW1hdGlvbj86IHN0cmluZ1xuXG5cdC8qKlxuXHQgKiBBbiB7QGxpbmsgQW5pbWF0aW9uc0luZm99IHRoYXQgZGVzY3JpYmVzIGEgc2VxdWVuY2Ugb2YgYW5pbWF0aW9ucyBvbiBkaWZmZXJlbnQgdHJhY2tzLlxuXHQgKiBDb25uZWN0ZWQgdG8gYGFuaW1hdGlvbnNgIGF0dHJpYnV0ZSwgYnV0IHNpbmNlIGF0dHJpYnV0ZXMgYXJlIHN0cmluZywgdGhlcmUncyBhIGRpZmZlcmVudCBmb3JtIHRvIHBhc3MgaXQuXG5cdCAqIEl0IGlzIGEgc3RyaW5nIGNvbXBvc2VkIG9mIGdyb3VwcyBzdXJyb3VuZGVkIGJ5IHNxdWFyZSBicmFja2V0cy4gRWFjaCBncm91cCBoYXMgNSBwYXJhbWV0ZXJzLCB0aGUgZmlyc3RzIDIgbWFuZGF0b3J5LiBUaGV5IGNvcnJlc3BvbmRzIHRvOiB0cmFjaywgYW5pbWF0aW9uIG5hbWUsIGxvb3AsIGRlbGF5LCBtaXggdGltZS5cblx0ICogRm9yIHRoZSBmaXJzdCBncm91cCBvbiBhIHRyYWNrIHtAbGluayBBbmltYXRpb25TdGF0ZS5zZXRBbmltYXRpb259IGlzIHVzZWQsIHdoaWxlIHtAbGluayBBbmltYXRpb25TdGF0ZS5hZGRBbmltYXRpb259IGlzIHVzZWQgZm9yIHRoZSBvdGhlcnMuXG5cdCAqIElmIHlvdSB1c2UgdGhlIHNwZWNpYWwgdG9rZW4gI0VNUFRZIyBhcyBhbmltYXRpb24gbmFtZSB7QGxpbmsgQW5pbWF0aW9uU3RhdGUuc2V0RW1wdHlBbmltYXRpb259IGFuZCB7QGxpbmsgQW5pbWF0aW9uU3RhdGUuYWRkRW1wdHlBbmltYXRpb259IGlhcmUgdXNlZCByZXNwZWN0aXZlbHkuXG5cdCAqIFVzZSB0aGUgc3BlY2lhbCBncm91cCBbbG9vcCwgdHJhY2tOdW1iZXJdLCB0byBhbGxvdyB0aGUgYW5pbWF0aW9uIG9mIHRoZSB0cmFjayBvbiB0aGUgZ2l2ZW4gdHJhY2tOdW1iZXIgdG8gcmVzdGFydCBmcm9tIHRoZSBiZWdpbm5pbmcgb25jZSBmaW5pc2hlZC5cblx0ICovXG5cdHB1YmxpYyBnZXQgYW5pbWF0aW9ucyAoKTogQW5pbWF0aW9uc0luZm8gfCB1bmRlZmluZWQge1xuXHRcdHJldHVybiB0aGlzLl9hbmltYXRpb25zO1xuXHR9XG5cdHB1YmxpYyBzZXQgYW5pbWF0aW9ucyAodmFsdWU6IEFuaW1hdGlvbnNJbmZvIHwgdW5kZWZpbmVkKSB7XG5cdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdHRoaXMuX2FuaW1hdGlvbnMgPSB2YWx1ZTtcblx0XHR0aGlzLmluaXRXaWRnZXQoKTtcblx0fVxuXHRwdWJsaWMgX2FuaW1hdGlvbnM/OiBBbmltYXRpb25zSW5mb1xuXG5cdC8qKlxuXHQgKiBPcHRpb25hbDogVGhlIGRlZmF1bHQgbWl4IHNldCB0byB0aGUge0BsaW5rIEFuaW1hdGlvblN0YXRlRGF0YS5kZWZhdWx0TWl4fS5cblx0ICogQ29ubmVjdGVkIHRvIGBkZWZhdWx0LW1peGAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIGdldCBkZWZhdWx0TWl4ICgpOiBudW1iZXIge1xuXHRcdHJldHVybiB0aGlzLl9kZWZhdWx0TWl4O1xuXHR9XG5cdHB1YmxpYyBzZXQgZGVmYXVsdE1peCAodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuXHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IDA7XG5cdFx0dGhpcy5fZGVmYXVsdE1peCA9IHZhbHVlO1xuXHR9XG5cdHB1YmxpYyBfZGVmYXVsdE1peCA9IDA7XG5cblx0LyoqXG5cdCAqIE9wdGlvbmFsOiBUaGUgbmFtZSBvZiB0aGUgc2tpbiB0byBiZSBzZXRcblx0ICogQ29ubmVjdGVkIHRvIGBza2luYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgZ2V0IHNraW4gKCk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcblx0XHRyZXR1cm4gdGhpcy5fc2tpbjtcblx0fVxuXHRwdWJsaWMgc2V0IHNraW4gKHZhbHVlOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3NraW4gPSB2YWx1ZTtcblx0XHR0aGlzLmluaXRXaWRnZXQoKTtcblx0fVxuXHRwcml2YXRlIF9za2luPzogc3RyaW5nW11cblxuXHQvKipcblx0ICogU3BlY2lmeSB0aGUgd2F5IHRoZSBza2VsZXRvbiBpcyBzaXplZCB3aXRoaW4gdGhlIGVsZW1lbnQgYXV0b21hdGljYWxseSBjaGFuZ2luZyBpdHMgYHNjYWxlWGAgYW5kIGBzY2FsZVlgLlxuXHQgKiBJdCB3b3JrcyBvbmx5IHdpdGgge0BsaW5rIG1vZGV9IGBpbnNpZGVgLiBQb3NzaWJsZSB2YWx1ZXMgYXJlOlxuXHQgKiAtIGBjb250YWluYDogYXMgbGFyZ2UgYXMgcG9zc2libGUgd2hpbGUgc3RpbGwgY29udGFpbmluZyB0aGUgc2tlbGV0b24gZW50aXJlbHkgd2l0aGluIHRoZSBlbGVtZW50IGNvbnRhaW5lciAoRGVmYXVsdCkuXG5cdCAqIC0gYGZpbGxgOiBmaWxsIHRoZSBlbGVtZW50IGNvbnRhaW5lciBieSBkaXN0b3J0aW5nIHRoZSBza2VsZXRvbidzIGFzcGVjdCByYXRpby5cblx0ICogLSBgd2lkdGhgOiBtYWtlIHN1cmUgdGhlIGZ1bGwgd2lkdGggb2YgdGhlIHNvdXJjZSBpcyBzaG93biwgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoaXMgbWVhbnMgdGhlIHNrZWxldG9uIG92ZXJmbG93cyB0aGUgZWxlbWVudCBjb250YWluZXIgdmVydGljYWxseS5cblx0ICogLSBgaGVpZ2h0YDogbWFrZSBzdXJlIHRoZSBmdWxsIGhlaWdodCBvZiB0aGUgc291cmNlIGlzIHNob3duLCByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhpcyBtZWFucyB0aGUgc2tlbGV0b24gb3ZlcmZsb3dzIHRoZSBlbGVtZW50IGNvbnRhaW5lciBob3Jpem9udGFsbHkuXG5cdCAqIC0gYGNvdmVyYDogYXMgc21hbGwgYXMgcG9zc2libGUgd2hpbGUgc3RpbGwgY292ZXJpbmcgdGhlIGVudGlyZSBlbGVtZW50IGNvbnRhaW5lci5cblx0ICogLSBgc2NhbGVEb3duYDogc2NhbGUgdGhlIHNrZWxldG9uIGRvd24gdG8gZW5zdXJlIHRoYXQgdGhlIHNrZWxldG9uIGZpdHMgd2l0aGluIHRoZSBlbGVtZW50IGNvbnRhaW5lci5cblx0ICogLSBgbm9uZWA6IGRpc3BsYXkgdGhlIHNrZWxldG9uIHdpdGhvdXQgYXV0b3NjYWxpbmcgaXQuXG5cdCAqIC0gYG9yaWdpbmA6IHRoZSBza2VsZXRvbiBvcmlnaW4gaXMgY2VudGVyZWQgd2l0aCB0aGUgZWxlbWVudCBjb250YWluZXIgcmVnYXJkbGVzcyBvZiB0aGUgYm91bmRzLlxuXHQgKiBDb25uZWN0ZWQgdG8gYGZpdGAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIGZpdDogRml0VHlwZSA9IFwiY29udGFpblwiO1xuXG5cdC8qKlxuXHQgKiBUaGUgeCBvZmZzZXQgb2YgdGhlIHNrZWxldG9uIHdvcmxkIG9yaWdpbiB4IGF4aXMgYXMgYSBwZXJjZW50YWdlIG9mIHRoZSBlbGVtZW50IGNvbnRhaW5lciB3aWR0aFxuXHQgKiBDb25uZWN0ZWQgdG8gYHgtYXhpc2AgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIHhBeGlzID0gMDtcblxuXHQvKipcblx0ICogVGhlIHkgb2Zmc2V0IG9mIHRoZSBza2VsZXRvbiB3b3JsZCBvcmlnaW4geCBheGlzIGFzIGEgcGVyY2VudGFnZSBvZiB0aGUgZWxlbWVudCBjb250YWluZXIgaGVpZ2h0XG5cdCAqIENvbm5lY3RlZCB0byBgeS1heGlzYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgeUF4aXMgPSAwO1xuXG5cdC8qKlxuXHQgKiBUaGUgeCBvZmZzZXQgb2YgdGhlIHJvb3QgaW4gcGl4ZWxzIHdydCB0byB0aGUgc2tlbGV0b24gd29ybGQgb3JpZ2luXG5cdCAqIENvbm5lY3RlZCB0byBgb2Zmc2V0LXhgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBvZmZzZXRYID0gMDtcblxuXHQvKipcblx0ICogVGhlIHkgb2Zmc2V0IG9mIHRoZSByb290IGluIHBpeGVscyB3cnQgdG8gdGhlIHNrZWxldG9uIHdvcmxkIG9yaWdpblxuXHQgKiBDb25uZWN0ZWQgdG8gYG9mZnNldC15YCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgb2Zmc2V0WSA9IDA7XG5cblx0LyoqXG5cdCAqIEEgcGFkZGluZyB0aGF0IHNocmluayB0aGUgZWxlbWVudCBjb250YWluZXIgdmlydHVhbGx5IGZyb20gbGVmdCBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIGVsZW1lbnQgY29udGFpbmVyIHdpZHRoXG5cdCAqIENvbm5lY3RlZCB0byBgcGFkLWxlZnRgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBwYWRMZWZ0ID0gMDtcblxuXHQvKipcblx0ICogQSBwYWRkaW5nIHRoYXQgc2hyaW5rIHRoZSBlbGVtZW50IGNvbnRhaW5lciB2aXJ0dWFsbHkgZnJvbSByaWdodCBhcyBhIHBlcmNlbnRhZ2Ugb2YgdGhlIGVsZW1lbnQgY29udGFpbmVyIHdpZHRoXG5cdCAqIENvbm5lY3RlZCB0byBgcGFkLXJpZ2h0YCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgcGFkUmlnaHQgPSAwO1xuXG5cdC8qKlxuXHQgKiBBIHBhZGRpbmcgdGhhdCBzaHJpbmsgdGhlIGVsZW1lbnQgY29udGFpbmVyIHZpcnR1YWxseSBmcm9tIHRoZSB0b3AgYXMgYSBwZXJjZW50YWdlIG9mIHRoZSBlbGVtZW50IGNvbnRhaW5lciBoZWlnaHRcblx0ICogQ29ubmVjdGVkIHRvIGBwYWQtdG9wYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgcGFkVG9wID0gMDtcblxuXHQvKipcblx0ICogQSBwYWRkaW5nIHRoYXQgc2hyaW5rIHRoZSBlbGVtZW50IGNvbnRhaW5lciB2aXJ0dWFsbHkgZnJvbSB0aGUgYm90dG9tIGFzIGEgcGVyY2VudGFnZSBvZiB0aGUgZWxlbWVudCBjb250YWluZXIgaGVpZ2h0XG5cdCAqIENvbm5lY3RlZCB0byBgcGFkLWJvdHRvbWAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIHBhZEJvdHRvbSA9IDA7XG5cblx0LyoqXG5cdCAqIEEgcmVjdGFuZ2xlIHJlcHJlc2VudGluZyB0aGUgYm91bmRzIHVzZWQgdG8gZml0IHRoZSBza2VsZXRvbiB3aXRoaW4gdGhlIGVsZW1lbnQgY29udGFpbmVyLlxuXHQgKiBUaGUgcmVjdGFuZ2xlIGNvb3JkaW5hdGVzIGFuZCBzaXplIGFyZSBleHByZXNzZWQgaW4gdGhlIFNwaW5lIHdvcmxkIHNwYWNlLCBub3QgdGhlIHNjcmVlbiBzcGFjZS5cblx0ICogSXQgaXMgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIHVzaW5nIHRoZSBgc2tpbmAgYW5kIGBhbmltYXRpb25gIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGR1cmluZyBsb2FkaW5nLlxuXHQgKiBJZiBubyBza2luIGlzIHByb3ZpZGVkLCBpdCBpcyB1c2VkIHRoZSBkZWZhdWx0IHNraW4uXG5cdCAqIElmIG5vIGFuaW1hdGlvbiBpcyBwcm92aWRlZCwgaXQgaXMgdXNlZCB0aGUgc2V0dXAgcG9zZS5cblx0ICogQm91bmRzIGFyZSBub3QgYXV0b21hdGljYWxseSByZWNhbGN1bGF0ZWQud2hlbiB0aGUgYW5pbWF0aW9uIG9yIHNraW4gY2hhbmdlLlxuXHQgKiBJbnZva2Uge0BsaW5rIGNhbGN1bGF0ZUJvdW5kc30gdG8gcmVjYWxjdWxhdGUgdGhlbSwgb3Igc2V0IHtAbGluayBhdXRvQ2FsY3VsYXRlQm91bmRzfSB0byB0cnVlLlxuXHQgKiBVc2UgYHNldEJvdW5kc2AgdG8gc2V0IHlvdSBkZXNpcmVkIGJvdW5kcy4gQm91bmRpbmcgQm94IG1pZ2h0IGJlIHVzZWZ1bCB0byBkZXRlcm1pbmUgdGhlIGJvdW5kcyB0byBiZSB1c2VkLlxuXHQgKiBJZiB0aGUgc2tlbGV0b24gb3ZlcmZsb3cgdGhlIGVsZW1lbnQgY29udGFpbmVyIGNvbnNpZGVyIHNldHRpbmcge0BsaW5rIGNsaXB9IHRvIGB0cnVlYC5cblx0ICovXG5cdHB1YmxpYyBib3VuZHM6IFJlY3RhbmdsZSA9IHsgeDogMCwgeTogMCwgd2lkdGg6IC0xLCBoZWlnaHQ6IC0xIH07XG5cblx0LyoqXG5cdCAqIFRoZSB4IG9mIHRoZSBib3VuZHMgaW4gU3BpbmUgd29ybGQgY29vcmRpbmF0ZXNcblx0ICogQ29ubmVjdGVkIHRvIGBib3VuZC14YCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRnZXQgYm91bmRzWCAoKTogbnVtYmVyIHtcblx0XHRyZXR1cm4gdGhpcy5ib3VuZHMueDtcblx0fVxuXHRzZXQgYm91bmRzWCAodmFsdWU6IG51bWJlcikge1xuXHRcdHRoaXMuYm91bmRzLnggPSB2YWx1ZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgeSBvZiB0aGUgYm91bmRzIGluIFNwaW5lIHdvcmxkIGNvb3JkaW5hdGVzXG5cdCAqIENvbm5lY3RlZCB0byBgYm91bmQteWAgYXR0cmlidXRlLlxuXHQgKi9cblx0Z2V0IGJvdW5kc1kgKCk6IG51bWJlciB7XG5cdFx0cmV0dXJuIHRoaXMuYm91bmRzLnk7XG5cdH1cblx0c2V0IGJvdW5kc1kgKHZhbHVlOiBudW1iZXIpIHtcblx0XHR0aGlzLmJvdW5kcy55ID0gdmFsdWU7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIHdpZHRoIG9mIHRoZSBib3VuZHMgaW4gU3BpbmUgd29ybGQgY29vcmRpbmF0ZXNcblx0ICogQ29ubmVjdGVkIHRvIGBib3VuZC13aWR0aGAgYXR0cmlidXRlLlxuXHQgKi9cblx0Z2V0IGJvdW5kc1dpZHRoICgpOiBudW1iZXIge1xuXHRcdHJldHVybiB0aGlzLmJvdW5kcy53aWR0aDtcblx0fVxuXHRzZXQgYm91bmRzV2lkdGggKHZhbHVlOiBudW1iZXIpIHtcblx0XHR0aGlzLmJvdW5kcy53aWR0aCA9IHZhbHVlO1xuXHRcdGlmICh2YWx1ZSA8PSAwKSB0aGlzLmluaXRXaWRnZXQodHJ1ZSk7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGhlaWdodCBvZiB0aGUgYm91bmRzIGluIFNwaW5lIHdvcmxkIGNvb3JkaW5hdGVzXG5cdCAqIENvbm5lY3RlZCB0byBgYm91bmQtaGVpZ2h0YCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRnZXQgYm91bmRzSGVpZ2h0ICgpOiBudW1iZXIge1xuXHRcdHJldHVybiB0aGlzLmJvdW5kcy5oZWlnaHQ7XG5cdH1cblx0c2V0IGJvdW5kc0hlaWdodCAodmFsdWU6IG51bWJlcikge1xuXHRcdHRoaXMuYm91bmRzLmhlaWdodCA9IHZhbHVlO1xuXHRcdGlmICh2YWx1ZSA8PSAwKSB0aGlzLmluaXRXaWRnZXQodHJ1ZSk7XG5cdH1cblxuXHQvKipcblx0ICogT3B0aW9uYWw6IGFuIGFycmF5IG9mIGFuaW1hdGlvbiBuYW1lcyB0aGF0IGFyZSB1c2VkIHRvIGNhbGN1bGF0ZSB0aGUgYm91bmRzIG9mIHRoZSBza2VsZXRvbi5cblx0ICogQ29ubmVjdGVkIHRvIGBhbmltYXRpb25zLWJvdW5kYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgYW5pbWF0aW9uc0JvdW5kPzogc3RyaW5nW107XG5cblx0LyoqXG5cdCAqIFdoZXRoZXIgb3Igbm90IHRoZSBib3VuZHMgYXJlIHJlY2FsY3VsYXRlZCB3aGVuIGFuIGFuaW1hdGlvbiBvciBhIHNraW4gaXMgY2hhbmdlZC4gYGZhbHNlYCBieSBkZWZhdWx0LlxuXHQgKiBDb25uZWN0ZWQgdG8gYGF1dG8tY2FsY3VsYXRlLWJvdW5kc2AgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIGF1dG9DYWxjdWxhdGVCb3VuZHMgPSBmYWxzZTtcblxuXHQvKipcblx0ICogU3BlY2lmeSBhIGZpeGVkIHdpZHRoIGZvciB0aGUgd2lkZ2V0LiBJZiBhdCBsZWFzdCBvbmUgb2YgYHdpZHRoYCBhbmQgYGhlaWdodGAgaXMgPiAwLFxuXHQgKiB0aGUgd2lkZ2V0IHdpbGwgaGF2ZSBhbiBhY3R1YWwgc2l6ZSBhbmQgdGhlIGVsZW1lbnQgY29udGFpbmVyIHJlZmVyZW5jZSBpcyB0aGUgd2lkZ2V0IGl0c2VsZiwgbm90IHRoZSBlbGVtZW50IGNvbnRhaW5lciBwYXJlbnQuXG5cdCAqIENvbm5lY3RlZCB0byBgd2lkdGhgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBnZXQgd2lkdGggKCk6IG51bWJlciB7XG5cdFx0cmV0dXJuIHRoaXMuX3dpZHRoO1xuXHR9XG5cdHB1YmxpYyBzZXQgd2lkdGggKHZhbHVlOiBudW1iZXIpIHtcblx0XHR0aGlzLl93aWR0aCA9IHZhbHVlO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH1cblx0cHJpdmF0ZSBfd2lkdGggPSAtMVxuXG5cdC8qKlxuXHQgKiBTcGVjaWZ5IGEgZml4ZWQgaGVpZ2h0IGZvciB0aGUgd2lkZ2V0LiBJZiBhdCBsZWFzdCBvbmUgb2YgYHdpZHRoYCBhbmQgYGhlaWdodGAgaXMgPiAwLFxuXHQgKiB0aGUgd2lkZ2V0IHdpbGwgaGF2ZSBhbiBhY3R1YWwgc2l6ZSBhbmQgdGhlIGVsZW1lbnQgY29udGFpbmVyIHJlZmVyZW5jZSBpcyB0aGUgd2lkZ2V0IGl0c2VsZiwgbm90IHRoZSBlbGVtZW50IGNvbnRhaW5lciBwYXJlbnQuXG5cdCAqIENvbm5lY3RlZCB0byBgaGVpZ2h0YCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgZ2V0IGhlaWdodCAoKTogbnVtYmVyIHtcblx0XHRyZXR1cm4gdGhpcy5faGVpZ2h0O1xuXHR9XG5cdHB1YmxpYyBzZXQgaGVpZ2h0ICh2YWx1ZTogbnVtYmVyKSB7XG5cdFx0dGhpcy5faGVpZ2h0ID0gdmFsdWU7XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXHRwcml2YXRlIF9oZWlnaHQgPSAtMVxuXG5cdC8qKlxuXHQgKiBJZiB0cnVlLCB0aGUgd2lkZ2V0IGlzIGRyYWdnYWJsZVxuXHQgKiBDb25uZWN0ZWQgdG8gYGRyYWdgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBkcmFnID0gZmFsc2U7XG5cblx0LyoqXG5cdCAqIFRoZSB4IG9mIHRoZSByb290IHJlbGF0aXZlIHRvIHRoZSBjYW52YXMvd2ViZ2wgY29udGV4dCBjZW50ZXIgaW4gc3BpbmUgd29ybGQgY29vcmRpbmF0ZXMuXG5cdCAqIFRoaXMgaXMgYW4gZXhwZXJpbWVudGFsIHByb3BlcnR5IGFuZCBtaWdodCBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUuXG5cdCAqL1xuXHRwdWJsaWMgd29ybGRYID0gSW5maW5pdHk7XG5cblx0LyoqXG5cdCAqIFRoZSB5IG9mIHRoZSByb290IHJlbGF0aXZlIHRvIHRoZSBjYW52YXMvd2ViZ2wgY29udGV4dCBjZW50ZXIgaW4gc3BpbmUgd29ybGQgY29vcmRpbmF0ZXMuXG5cdCAqIFRoaXMgaXMgYW4gZXhwZXJpbWVudGFsIHByb3BlcnR5IGFuZCBtaWdodCBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUuXG5cdCAqL1xuXHRwdWJsaWMgd29ybGRZID0gSW5maW5pdHk7XG5cblx0LyoqXG5cdCAqIFRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIHBvaW50ZXIgcmVsYXRpdmUgdG8gdGhlIHBvaW50ZXIgcmVsYXRpdmUgdG8gdGhlIHNrZWxldG9uIHJvb3QgaW4gc3BpbmUgd29ybGQgY29vcmRpbmF0ZXMuXG5cdCAqIFRoaXMgaXMgYW4gZXhwZXJpbWVudGFsIHByb3BlcnR5IGFuZCBtaWdodCBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUuXG5cdCAqL1xuXHRwdWJsaWMgcG9pbnRlcldvcmxkWCA9IDE7XG5cblx0LyoqXG5cdCAqIFRoZSB4IGNvb3JkaW5hdGUgb2YgdGhlIHBvaW50ZXIgcmVsYXRpdmUgdG8gdGhlIHBvaW50ZXIgcmVsYXRpdmUgdG8gdGhlIHNrZWxldG9uIHJvb3QgaW4gc3BpbmUgd29ybGQgY29vcmRpbmF0ZXMuXG5cdCAqIFRoaXMgaXMgYW4gZXhwZXJpbWVudGFsIHByb3BlcnR5IGFuZCBtaWdodCBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUuXG5cdCAqL1xuXHRwdWJsaWMgcG9pbnRlcldvcmxkWSA9IDE7XG5cblx0LyoqXG5cdCAqIElmIHRydWUsIHRoZSB3aWRnZXQgaXMgaW50ZXJhY3RpdmVcblx0ICogQ29ubmVjdGVkIHRvIGBpbnRlcmFjdGl2ZWAgYXR0cmlidXRlLlxuXHQgKiBUaGlzIGlzIGFuIGV4cGVyaW1lbnRhbCBwcm9wZXJ0eSBhbmQgbWlnaHQgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLlxuXHQgKi9cblx0cHVibGljIGludGVyYWN0aXZlID0gZmFsc2U7XG5cblx0LyoqXG5cdCAqIElmIHRoZSB3aWRnZXQgaXMgaW50ZXJhY3RpdmUsIHRoaXMgbWV0aG9kIGlzIGludm9rZWQgd2l0aCBhIHtAbGluayBQb2ludGVyRXZlbnRUeXBlfSB3aGVuIHRoZSBwb2ludGVyXG5cdCAqIHBlcmZvcm1zIGFjdGlvbnMgd2l0aGluIHRoZSB3aWRnZXQgYm91bmRzIChmb3IgZXhhbXBsZSwgaXQgZW50ZXIgb3IgbGVhdmVzIHRoZSBib3VuZHMpLlxuXHQgKiBCeSBkZWZhdWx0LCB0aGUgZnVuY3Rpb24gZG9lcyBub3RoaW5nLlxuXHQgKiBUaGlzIGlzIGFuIGV4cGVyaW1lbnRhbCBwcm9wZXJ0eSBhbmQgbWlnaHQgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLlxuXHQgKi9cblx0cHVibGljIHBvaW50ZXJFdmVudENhbGxiYWNrID0gKGV2ZW50OiBQb2ludGVyRXZlbnRUeXBlLCBvcmlnaW5hbEV2ZW50PzogVUlFdmVudCkgPT4geyB9XG5cblx0Ly8gVE9ETzogcHJvYmFibHkgaXQgbWFrZXMgc2Vuc2UgdG8gYXNzb2NpYXRlIGEgc2luZ2xlIGNhbGxiYWNrIHRvIGEgZ3JvdXBzIG9mIHNsb3RzIHRvIGF2b2lkIHRoZSBzYW1lIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBmb3IgZWFjaCBzbG90IG9mIHRoZSBncm91cFxuXHQvKipcblx0ICogVGhpcyBtZXRob2RzIGFsbG93cyB0byBhc3NvY2lhdGUgdG8gYSBTbG90IGEgY2FsbGJhY2suIEZvciB0aGVzZSBzbG90cywgaWYgdGhlIHdpZGdldCBpcyBpbnRlcmFjdGl2ZSxcblx0ICogd2hlbiB0aGUgcG9pbnRlciBwZXJmb3JtcyBhY3Rpb25zIHdpdGhpbiB0aGUgc2xvdCdzIGF0dGFjaG1lbnQgdGhlIGFzc29jaWF0ZWQgY2FsbGJhY2sgaXMgaW52b2tlZCB3aXRoXG5cdCAqIGEge0BsaW5rIFBvaW50ZXJFdmVudFR5cGV9IChmb3IgZXhhbXBsZSwgaXQgZW50ZXIgb3IgbGVhdmVzIHRoZSBzbG90J3MgYXR0YWNobWVudCBib3VuZHMpLlxuXHQgKiBUaGlzIGlzIGFuIGV4cGVyaW1lbnRhbCBwcm9wZXJ0eSBhbmQgbWlnaHQgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLlxuXHQgKi9cblx0cHVibGljIGFkZFBvaW50ZXJTbG90RXZlbnRDYWxsYmFjayAoc2xvdDogbnVtYmVyIHwgc3RyaW5nIHwgU2xvdCwgc2xvdEZ1bmN0aW9uOiAoc2xvdDogU2xvdCwgZXZlbnQ6IFBvaW50ZXJFdmVudFR5cGUpID0+IHZvaWQpIHtcblx0XHR0aGlzLnBvaW50ZXJTbG90RXZlbnRDYWxsYmFja3Muc2V0KHRoaXMuZ2V0U2xvdEZyb21SZWYoc2xvdCksIHsgc2xvdEZ1bmN0aW9uLCBpbnNpZGU6IGZhbHNlIH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlbW92ZSBjYWxsYmFja3MgYWRkZWQgdGhyb3VnaCB7QGxpbmsgYWRkUG9pbnRlclNsb3RFdmVudENhbGxiYWNrfS5cblx0ICogQHBhcmFtIHNsb3Q6IHRoZSBzbG90IHJlZmVyZW5jZSB0byB3aGljaCByZW1vdmUgdGhlIGFzc29jaWF0ZWQgY2FsbGJhY2tcblx0ICovXG5cdHB1YmxpYyByZW1vdmVQb2ludGVyU2xvdEV2ZW50Q2FsbGJhY2tzIChzbG90OiBudW1iZXIgfCBzdHJpbmcgfCBTbG90KSB7XG5cdFx0dGhpcy5wb2ludGVyU2xvdEV2ZW50Q2FsbGJhY2tzLmRlbGV0ZSh0aGlzLmdldFNsb3RGcm9tUmVmKHNsb3QpKTtcblx0fVxuXG5cdHByaXZhdGUgZ2V0U2xvdEZyb21SZWYgKHNsb3RSZWY6IG51bWJlciB8IHN0cmluZyB8IFNsb3QpOiBTbG90IHtcblx0XHRsZXQgc2xvdDogU2xvdCB8IG51bGw7XG5cblx0XHRpZiAodHlwZW9mIHNsb3RSZWYgPT09ICdudW1iZXInKSBzbG90ID0gdGhpcy5za2VsZXRvbiEuc2xvdHNbc2xvdFJlZl07XG5cdFx0ZWxzZSBpZiAodHlwZW9mIHNsb3RSZWYgPT09ICdzdHJpbmcnKSBzbG90ID0gdGhpcy5za2VsZXRvbiEuZmluZFNsb3Qoc2xvdFJlZik7XG5cdFx0ZWxzZSBzbG90ID0gc2xvdFJlZjtcblxuXHRcdGlmICghc2xvdCkgdGhyb3cgbmV3IEVycm9yKGBObyBzbG90IGZvdW5kIHdpdGggdGhlIGdpdmVuIHNsb3QgcmVmZXJlbmNlOiAke3Nsb3RSZWZ9YCk7XG5cblx0XHRyZXR1cm4gc2xvdDtcblx0fVxuXG5cdC8qKlxuXHQgKiBJZiB0cnVlLCBzb21lIGNvbnZlbmllbmNlIGVsZW1lbnRzIGFyZSBkcmF3biB0byBzaG93IHRoZSBza2VsZXRvbiB3b3JsZCBvcmlnaW4gKGdyZWVuKSxcblx0ICogdGhlIHJvb3QgKHJlZCksIGFuZCB0aGUgYm91bmRzIHJlY3RhbmdsZSAoYmx1ZSlcblx0ICogQ29ubmVjdGVkIHRvIGBkZWJ1Z2AgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIGRlYnVnID0gZmFsc2U7XG5cblx0LyoqXG5cdCAqIEFuIGlkZW50aWZpZXIgdG8gb2J0YWluIHRoaXMgd2lkZ2V0IHVzaW5nIHRoZSB7QGxpbmsgZ2V0U2tlbGV0b259IGZ1bmN0aW9uLlxuXHQgKiBUaGlzIGlzIHVzZWZ1bCB3aGVuIHlvdSBuZWVkIHRvIGludGVyYWN0IHdpdGggdGhlIHdpZGdldCB1c2luZyBqcy5cblx0ICogQ29ubmVjdGVkIHRvIGBpZGVudGlmaWVyYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgaWRlbnRpZmllciA9IFwiXCI7XG5cblx0LyoqXG5cdCAqIElmIGZhbHNlLCBhc3NldHMgbG9hZGluZyBhcmUgbG9hZGVkIGltbWVkaWF0ZWx5IGFuZCB0aGUgc2tlbGV0b24gc2hvd24gYXMgc29vbiBhcyB0aGUgYXNzZXRzIGFyZSBsb2FkZWRcblx0ICogSWYgdHJ1ZSwgaXQgaXMgbmVjZXNzYXJ5IHRvIGludm9rZSB0aGUgc3RhcnQgbWV0aG9kIHRvIHN0YXJ0IHRoZSB3aWRnZXQgYW5kIHRoZSBsb2FkaW5nIHByb2Nlc3Ncblx0ICogQ29ubmVjdGVkIHRvIGBtYW51YWwtc3RhcnRgIGF0dHJpYnV0ZS5cblx0ICovXG5cdHB1YmxpYyBtYW51YWxTdGFydCA9IGZhbHNlO1xuXG5cdC8qKlxuXHQgKiBJZiB0cnVlLCBhdXRvbWF0aWNhbGx5IHNldHMgbWFudWFsU3RhcnQgdG8gdHJ1ZSB0byBwZXJ2ZW50IHdpZGdldCB0byBzdGFydCBpbW1lZGlhdGVseS5cblx0ICogVGhlbiwgaW4gY29tYmluYXRpb24gd2l0aCB0aGUgZGVmYXVsdCB7QGxpbmsgb25TY3JlZW5GdW5jdGlvbn0sIHRoZSB3aWRnZXQge0BsaW5rIHN0YXJ0fVxuXHQgKiB0aGUgZmlyc3QgdGltZSBpdCBlbnRlcnMgdGhlIHZpZXdwb3J0LlxuXHQgKiBUaGlzIGlzIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvIGxvYWQgdGhlIGFzc2V0cyBvbmx5IHdoZW4gdGhlIHdpZGdldCBpcyByZXZlYWxlZC5cblx0ICogQnkgZGVmYXVsdCwgaXMgZmFsc2UuXG5cdCAqIENvbm5lY3RlZCB0byBgc3RhcnQtd2hlbi12aXNpYmxlYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgc2V0IHN0YXJ0V2hlblZpc2libGUgKHZhbHVlOiBib29sZWFuKSB7XG5cdFx0dGhpcy5tYW51YWxTdGFydCA9IHRydWU7XG5cdFx0dGhpcy5fc3RhcnRXaGVuVmlzaWJsZSA9IHZhbHVlO1xuXHR9XG5cdHB1YmxpYyBnZXQgc3RhcnRXaGVuVmlzaWJsZSAoKTogYm9vbGVhbiB7XG5cdFx0cmV0dXJuIHRoaXMuX3N0YXJ0V2hlblZpc2libGU7XG5cdH1cblx0cHVibGljIF9zdGFydFdoZW5WaXNpYmxlID0gZmFsc2U7XG5cblx0LyoqXG5cdCAqIEFuIGFycmF5IG9mIGluZGV4ZXMgaW5kaWNhdGluZyB0aGUgYXRsYXMgcGFnZXMgaW5kZXhlcyB0byBiZSBsb2FkZWQuXG5cdCAqIElmIHVuZGVmaW5lZCwgYWxsIHBhZ2VzIGFyZSBsb2FkZWQuIElmIGVtcHR5IChkZWZhdWx0KSwgbm8gcGFnZSBpcyBsb2FkZWQ7XG5cdCAqIGluIHRoaXMgY2FzZSB0aGUgdXNlciBjYW4gYWRkIGxhdGVyIHRoZSBpbmRleGVzIG9mIHRoZSBwYWdlcyB0aGV5IHdhbnQgdG8gbG9hZFxuXHQgKiBhbmQgY2FsbCB0aGUgbG9hZFRleHR1cmVzSW5QYWdlc0F0dHJpYnV0ZSwgdG8gbGF6aWx5IGxvYWQgdGhlbS5cblx0ICogQ29ubmVjdGVkIHRvIGBwYWdlc2AgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIHBhZ2VzPzogQXJyYXk8bnVtYmVyPjtcblxuXHQvKipcblx0ICogSWYgYHRydWVgLCB0aGUgc2tlbGV0b24gaXMgY2xpcHBlZCB0byB0aGUgZWxlbWVudCBjb250YWluZXIgYm91bmRzLlxuXHQgKiBCZSBjYXJlZnVsIG9uIHVzaW5nIHRoaXMgZmVhdHVyZSBiZWNhdXNlIGl0IGJyZWFrcyBiYXRjaGluZyFcblx0ICogQ29ubmVjdGVkIHRvIGBjbGlwYCBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRwdWJsaWMgY2xpcCA9IGZhbHNlO1xuXG5cdC8qKlxuXHQgKiBUaGUgd2lkZ2V0IHVwZGF0ZS9hcHBseSBiZWhhdmlvdXIgd2hlbiB0aGUgc2tlbGV0b24gZWxlbWVudCBjb250YWluZXIgaXMgb2Zmc2NyZWVuOlxuXHQgKiAtIGBwYXVzZWA6IHRoZSBzdGF0ZSBpcyBub3QgdXBkYXRlZCwgbmVpdGhlciBhcHBsaWVkIChEZWZhdWx0KVxuXHQgKiAtIGB1cGRhdGVgOiB0aGUgc3RhdGUgaXMgdXBkYXRlZCwgYnV0IG5vdCBhcHBsaWVkXG5cdCAqIC0gYHBvc2VgOiB0aGUgc3RhdGUgaXMgdXBkYXRlZCBhbmQgYXBwbGllZFxuXHQgKiBDb25uZWN0ZWQgdG8gYG9mZnNjcmVlbmAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIG9mZlNjcmVlblVwZGF0ZUJlaGF2aW91cjogT2ZmU2NyZWVuVXBkYXRlQmVoYXZpb3VyVHlwZSA9IFwicGF1c2VcIjtcblxuXHQvKipcblx0ICogSWYgdHJ1ZSwgYSBTcGluZSBsb2FkaW5nIHNwaW5uZXIgaXMgc2hvd24gZHVyaW5nIGFzc2V0IGxvYWRpbmcuIERlZmF1bHQgdG8gZmFsc2UuXG5cdCAqIENvbm5lY3RlZCB0byBgc3Bpbm5lcmAgYXR0cmlidXRlLlxuXHQgKi9cblx0cHVibGljIHNwaW5uZXIgPSBmYWxzZTtcblxuXHQvKipcblx0ICogUmVwbGFjZSB0aGUgZGVmYXVsdCBzdGF0ZSBhbmQgc2tlbGV0b24gdXBkYXRlIGxvZ2ljIGZvciB0aGlzIHdpZGdldC5cblx0ICogQHBhcmFtIGRlbHRhIC0gVGhlIG1pbGxpc2Vjb25kcyBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHVwZGF0ZS5cblx0ICogQHBhcmFtIHNrZWxldG9uIC0gVGhlIHdpZGdldCdzIHNrZWxldG9uXG5cdCAqIEBwYXJhbSBzdGF0ZSAtIFRoZSB3aWRnZXQncyBzdGF0ZVxuXHQgKi9cblx0cHVibGljIHVwZGF0ZT86IFVwZGF0ZVNwaW5lV2lkZ2V0RnVuY3Rpb247XG5cblx0LyoqXG5cdCAqIFRoaXMgY2FsbGJhY2sgaXMgaW52b2tlZCBiZWZvcmUgdGhlIHdvcmxkIHRyYW5zZm9ybXMgYXJlIGNvbXB1dGVkIGFsbG93cyB0byBleGVjdXRlIGFkZGl0aW9uYWwgbG9naWMuXG5cdCAqL1xuXHRwdWJsaWMgYmVmb3JlVXBkYXRlV29ybGRUcmFuc2Zvcm1zOiBVcGRhdGVTcGluZVdpZGdldEZ1bmN0aW9uID0gKCkgPT4geyB9O1xuXG5cdC8qKlxuXHQgKiBUaGlzIGNhbGxiYWNrIGlzIGludm9rZWQgYWZ0ZXIgdGhlIHdvcmxkIHRyYW5zZm9ybXMgYXJlIGNvbXB1dGVkIGFsbG93cyB0byBleGVjdXRlIGFkZGl0aW9uYWwgbG9naWMuXG5cdCAqL1xuXHRwdWJsaWMgYWZ0ZXJVcGRhdGVXb3JsZFRyYW5zZm9ybXM6IFVwZGF0ZVNwaW5lV2lkZ2V0RnVuY3Rpb24gPSAoKSA9PiB7IH07XG5cblx0LyoqXG5cdCAqIEEgY2FsbGJhY2sgaW52b2tlZCBlYWNoIHRpbWUgdGhlIGVsZW1lbnQgY29udGFpbmVyIGVudGVycyB0aGUgc2NyZWVuIHZpZXdwb3J0LlxuXHQgKiBCeSBkZWZhdWx0LCB0aGUgY2FsbGJhY2sgY2FsbCB0aGUge0BsaW5rIHN0YXJ0fSBtZXRob2QgdGhlIGZpcnN0IHRpbWUgdGhlIHdpZGdldFxuXHQgKiBlbnRlcnMgdGhlIHNjcmVlbiB2aWV3cG9ydCBhbmQge0BsaW5rIHN0YXJ0V2hlblZpc2libGV9IGlzIGB0cnVlYC5cblx0ICovXG5cdHB1YmxpYyBvblNjcmVlbkZ1bmN0aW9uOiAod2lkZ2V0OiBTcGluZVdlYkNvbXBvbmVudFNrZWxldG9uKSA9PiB2b2lkID0gYXN5bmMgKHdpZGdldCkgPT4ge1xuXHRcdGlmICh3aWRnZXQubG9hZGluZyAmJiAhd2lkZ2V0Lm9uU2NyZWVuQXRMZWFzdE9uY2UgJiYgd2lkZ2V0Lm1hbnVhbFN0YXJ0ICYmIHdpZGdldC5zdGFydFdoZW5WaXNpYmxlKVxuXHRcdFx0d2lkZ2V0LnN0YXJ0KClcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgc2tlbGV0b24gaG9zdGVkIGJ5IHRoaXMgd2lkZ2V0LiBJdCdzIHJlYWR5IG9uY2UgYXNzZXRzIGFyZSBsb2FkZWQuXG5cdCAqIFNhZmVseSBhY2NlcyB0aGlzIHByb3BlcnR5IGJ5IHVzaW5nIHtAbGluayB3aGVuUmVhZHl9LlxuXHQgKi9cblx0cHVibGljIHNrZWxldG9uPzogU2tlbGV0b247XG5cblx0LyoqXG5cdCAqIFRoZSBhbmltYXRpb24gc3RhdGUgaG9zdGVkIGJ5IHRoaXMgd2lkZ2V0LiBJdCdzIHJlYWR5IG9uY2UgYXNzZXRzIGFyZSBsb2FkZWQuXG5cdCAqIFNhZmVseSBhY2NlcyB0aGlzIHByb3BlcnR5IGJ5IHVzaW5nIHtAbGluayB3aGVuUmVhZHl9LlxuXHQgKi9cblx0cHVibGljIHN0YXRlPzogQW5pbWF0aW9uU3RhdGU7XG5cblx0LyoqXG5cdCAqIFRoZSB0ZXh0dXJlQXRsYXMgdXNlZCBieSB0aGlzIHdpZGdldCB0byByZWZlcmVuY2UgYXR0YWNobWVudHMuIEl0J3MgcmVhZHkgb25jZSBhc3NldHMgYXJlIGxvYWRlZC5cblx0ICogU2FmZWx5IGFjY2VzIHRoaXMgcHJvcGVydHkgYnkgdXNpbmcge0BsaW5rIHdoZW5SZWFkeX0uXG5cdCAqL1xuXHRwdWJsaWMgdGV4dHVyZUF0bGFzPzogVGV4dHVyZUF0bGFzO1xuXG5cdC8qKlxuXHQgKiBBIFByb21pc2UgdGhhdCByZXNvbHZlIHRvIHRoZSB3aWRnZXQgaXRzZWxmIG9uY2UgYXNzZXRzIGxvYWRpbmcgaXMgdGVybWluYXRlZC5cblx0ICogVXNlZnVsIHRvIHNhZmVseSBhY2Nlc3Mge0BsaW5rIHNrZWxldG9ufSBhbmQge0BsaW5rIHN0YXRlfSBhZnRlciBhIG5ldyB3aWRnZXQgaGFzIGJlZW4ganVzdCBjcmVhdGVkLlxuXHQgKi9cblx0cHVibGljIGdldCB3aGVuUmVhZHkgKCk6IFByb21pc2U8dGhpcz4ge1xuXHRcdHJldHVybiB0aGlzLl93aGVuUmVhZHk7XG5cdH07XG5cdHByaXZhdGUgX3doZW5SZWFkeTogUHJvbWlzZTx0aGlzPjtcblxuXHQvKipcblx0ICogSWYgdHJ1ZSwgdGhlIHdpZGdldCBpcyBpbiB0aGUgYXNzZXRzIGxvYWRpbmcgcHJvY2Vzcy5cblx0ICovXG5cdHB1YmxpYyBsb2FkaW5nID0gdHJ1ZTtcblxuXHQvKipcblx0ICogVGhlIHtAbGluayBMb2FkaW5nU2NyZWVuV2lkZ2V0fSBvZiB0aGlzIHdpZGdldC5cblx0ICogVGhpcyBpcyBpbnN0YW50aWF0ZWQgb25seSBpZiBpdCBpcyByZWFsbHkgbmVjZXNzYXJ5LlxuXHQgKiBGb3IgZXhhbXBsZSwgaWYge0BsaW5rIHNwaW5uZXJ9IGlzIGBmYWxzZWAsIHRoaXMgcHJvcGVydHkgdmFsdWUgaXMgbnVsbFxuXHQgKi9cblx0cHVibGljIGxvYWRpbmdTY3JlZW46IExvYWRpbmdTY3JlZW4gfCBudWxsID0gbnVsbDtcblxuXHQvKipcblx0ICogSWYgdHJ1ZSwgdGhlIHdpZGdldCBpcyBpbiB0aGUgYXNzZXRzIGxvYWRpbmcgcHJvY2Vzcy5cblx0ICovXG5cdHB1YmxpYyBzdGFydGVkID0gZmFsc2U7XG5cblx0LyoqXG5cdCAqIFRydWUsIHdoZW4gdGhlIGVsZW1lbnQgY29udGFpbmVyIGVudGVycyB0aGUgc2NyZWVuIHZpZXdwb3J0LiBJdCB1c2VzIGFuIEludGVyc2VjdGlvbk9ic2VydmVyIGludGVybmFsbHkuXG5cdCAqL1xuXHRwdWJsaWMgb25TY3JlZW4gPSBmYWxzZTtcblxuXHQvKipcblx0ICogVHJ1ZSwgd2hlbiB0aGUgZWxlbWVudCBjb250YWluZXIgZW50ZXJzIHRoZSBzY3JlZW4gdmlld3BvcnQgYXQgbGVhc3Qgb25jZS5cblx0ICogSXQgdXNlcyBhbiBJbnRlcnNlY3Rpb25PYnNlcnZlciBpbnRlcm5hbGx5LlxuXHQgKi9cblx0cHVibGljIG9uU2NyZWVuQXRMZWFzdE9uY2UgPSBmYWxzZTtcblxuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIEhvbGRzIHRoZSBkcHIgKGRldmljZVBpeGVsUmF0aW8pIGN1cnJlbnRseSB1c2VkIHRvIGNhbGN1bGF0ZSB0aGUgc2NhbGUgZm9yIHRoaXMgc2tlbGV0b25cblx0ICogRG8gbm90IHJlbHkgb24gdGhpcyBwcm9wZXJ0aWVzLiBJdCBtaWdodCBiZSBtYWRlIHByaXZhdGUgaW4gdGhlIGZ1dHVyZS5cblx0ICovXG5cdHB1YmxpYyBkcHJTY2FsZSA9IDE7XG5cblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKiBUaGUgYWNjdW11bGF0ZWQgb2Zmc2V0IG9uIHRoZSB4IGF4aXMgZHVlIHRvIGRyYWdnaW5nXG5cdCAqIERvIG5vdCByZWx5IG9uIHRoaXMgcHJvcGVydGllcy4gSXQgbWlnaHQgYmUgbWFkZSBwcml2YXRlIGluIHRoZSBmdXR1cmUuXG5cdCAqL1xuXHRwdWJsaWMgZHJhZ1ggPSAwO1xuXG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogVGhlIGFjY3VtdWxhdGVkIG9mZnNldCBvbiB0aGUgeSBheGlzIGR1ZSB0byBkcmFnZ2luZ1xuXHQgKiBEbyBub3QgcmVseSBvbiB0aGlzIHByb3BlcnRpZXMuIEl0IG1pZ2h0IGJlIG1hZGUgcHJpdmF0ZSBpbiB0aGUgZnV0dXJlLlxuXHQgKi9cblx0cHVibGljIGRyYWdZID0gMDtcblxuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIElmIHRydWUsIHRoZSB3aWRnZXQgaXMgY3VycmVudGx5IGJlaW5nIGRyYWdnZWRcblx0ICogRG8gbm90IHJlbHkgb24gdGhpcyBwcm9wZXJ0aWVzLiBJdCBtaWdodCBiZSBtYWRlIHByaXZhdGUgaW4gdGhlIGZ1dHVyZS5cblx0ICovXG5cdHB1YmxpYyBkcmFnZ2luZyA9IGZhbHNlO1xuXG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogSWYgdHJ1ZSwgdGhlIHdpZGdldCBoYXMgdGV4dHVyZSB3aXRoIHByZW11bHRpcGxpZWQgYWxwaGFcblx0ICogRG8gbm90IHJlbHkgb24gdGhpcyBwcm9wZXJ0aWVzLiBJdCBtaWdodCBiZSBtYWRlIHByaXZhdGUgaW4gdGhlIGZ1dHVyZS5cblx0ICovXG5cdHB1YmxpYyBwbWEgPSBmYWxzZTtcblxuXHQvKipcblx0ICogSWYgdHJ1ZSwgaW5kaWNhdGUge0BsaW5rIGRpc3Bvc2V9IGhhcyBiZWVuIGNhbGxlZCBhbmQgdGhlIHdpZGdldCBjYW5ub3QgYmUgdXNlZCBhbnltb3JlXG5cdCAqL1xuXHRwdWJsaWMgZGlzcG9zZWQgPSBmYWxzZTtcblxuXHQvKipcblx0ICogT3B0aW9uYWw6IFBhc3MgYSBgU2tlbGV0b25EYXRhYCwgaWYgeW91IHdhbnQgdG8gYXZvaWQgY3JlYXRpbmcgYSBuZXcgb25lXG5cdCAqL1xuXHRwdWJsaWMgc2tlbGV0b25EYXRhPzogU2tlbGV0b25EYXRhO1xuXG5cdC8vIFJlZmVyZW5jZSB0byB0aGUgd2ViY29tcG9uZW50IHNoYWRvdyByb290XG5cdHByaXZhdGUgcm9vdDogU2hhZG93Um9vdDtcblxuXHQvLyBSZWZlcmVuY2UgdG8gdGhlIG92ZXJsYXkgd2ViY29tcG9uZW50XG5cdHByaXZhdGUgb3ZlcmxheSE6IFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheTtcblxuXHQvLyBJbnZva2VkIHdoZW4gd2lkZ2V0IGlzIHJlYWR5XG5cdHByaXZhdGUgcmVzb2x2ZUxvYWRpbmdQcm9taXNlITogKHZhbHVlOiB0aGlzIHwgUHJvbWlzZUxpa2U8dGhpcz4pID0+IHZvaWQ7XG5cblx0Ly8gSW52b2tlZCB3aGVuIHdpZGdldCBoYXMgYW4gb3ZlcmxheSBhc3NpZ25lZFxuXHRwcml2YXRlIHJlc29sdmVPdmVybGF5QXNzaWduZWRQcm9taXNlITogKCkgPT4gdm9pZDtcblxuXHQvLyB0aGlzIHByb21pc2UgaW4gbmVjZXNzYXJ5IG9ubHkgZm9yIG1hbnVhbCBzdGFydC4gQmVmb3JlIGNhbGxpbmcgbWFudWFsIHN0YXJ0IGlzIG5lY2Vzc2FyeSB0aGF0IHRoZSBvdmVybGF5IGhhcyBiZWVuIGFzc2lnbmVkIHRvIHRoZSB3aWRnZXQuXG5cdC8vIG92ZXJsYXkgYXNzaWdubWVudCBpcyBhc3luY2hyb25vdXMgZHVlIHRvIHdlYmNvbXBvbmVudCBwcm9tb3Rpb24gYW5kIGRvbSBsb2FkIHRlcm1pbmF0aW9uLlxuXHQvLyBXaGVuIG1hbnVhbCBzdGFydCBpcyBmYWxzZSwgbG9hZFNrZWxldG9uIGlzIGludm9rZWQgYWZ0ZXIgdGhlIG92ZXJsYXkgaXMgYXNzaWduZWQuIGxvYWRTa2VsZXRvbiBuZWVkcyB0aGUgYXNzZXRNYW5hZ2VyIHRoYXQgaXMgb3duZWQgYnkgdGhlIG92ZXJsYXkuXG5cdC8vIHRoZSBvdmVybGF5IG93bnMgdGhlIGFzc2V0TWFuYWdlciBiZWNhdXNlIHRoZSBvdmVybHkgb3ducyB0aGUgZ2wgY29udGV4dC5cblx0Ly8gaWYgaXQgd2Fzbid0IGZvciB0aGUgZ2wgY29udGV4dCB3aXRoIHdoaWNoIHRleHR1cmVzIGFyZSBjcmVhdGVkLCB3ZSBjb3VsZDpcblx0Ly8gLSBoYXZlIGEgdW5pcXVlIGFzc2V0IG1hbmFnZXIgaW5kZXBlbmRlbnQgZnJvbSB0aGUgb3ZlcmxheSAod2UgbGl0ZXJhbGx5IHJlbG9hZCB0aGUgc2FtZSBhc3NldHMgaW4gdHdvIGRpZmZlcmVudCBvdmVybGF5cylcblx0Ly8gLSByZW1vdmUgb3ZlcmxheUFzc2lnbmVkUHJvbWlzZSBhbmQgdGhlIG5lZWRzIHRvIHdhaXQgZm9yIGl0cyByZXNvbHZpbmdcblx0Ly8gLSByZW1vdmUgYXBwZW5kVG8gdGhhdCBpcyBqdXN0IHRvIGF2b2lkIHRoZSB1c2VyIHRvIHVzZSB0aGUgb3ZlcmxheUFzc2lnbmVkUHJvbWlzZSB3aGVuIHRoZSB3aWRnZXQgaXMgY3JlYXRlZCB1c2luZyBqc1xuXHRwcml2YXRlIG92ZXJsYXlBc3NpZ25lZFByb21pc2U6IFByb21pc2U8dm9pZD47XG5cblx0c3RhdGljIGF0dHJpYnV0ZXNEZXNjcmlwdGlvbjogUmVjb3JkPHN0cmluZywgeyBwcm9wZXJ0eU5hbWU6IGtleW9mIFdpZGdldEF0dHJpYnV0ZXMsIHR5cGU6IEF0dHJpYnV0ZVR5cGVzLCBkZWZhdWx0VmFsdWU/OiBhbnkgfT4gPSB7XG5cdFx0YXRsYXM6IHsgcHJvcGVydHlOYW1lOiBcImF0bGFzUGF0aFwiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG5cdFx0c2tlbGV0b246IHsgcHJvcGVydHlOYW1lOiBcInNrZWxldG9uUGF0aFwiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG5cdFx0XCJyYXctZGF0YVwiOiB7IHByb3BlcnR5TmFtZTogXCJyYXdEYXRhXCIsIHR5cGU6IFwib2JqZWN0XCIgfSxcblx0XHRcImpzb24tc2tlbGV0b24ta2V5XCI6IHsgcHJvcGVydHlOYW1lOiBcImpzb25Ta2VsZXRvbktleVwiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG5cdFx0c2NhbGU6IHsgcHJvcGVydHlOYW1lOiBcInNjYWxlXCIsIHR5cGU6IFwibnVtYmVyXCIgfSxcblx0XHRhbmltYXRpb246IHsgcHJvcGVydHlOYW1lOiBcImFuaW1hdGlvblwiLCB0eXBlOiBcInN0cmluZ1wiLCBkZWZhdWx0VmFsdWU6IHVuZGVmaW5lZCB9LFxuXHRcdGFuaW1hdGlvbnM6IHsgcHJvcGVydHlOYW1lOiBcImFuaW1hdGlvbnNcIiwgdHlwZTogXCJhbmltYXRpb25zSW5mb1wiLCBkZWZhdWx0VmFsdWU6IHVuZGVmaW5lZCB9LFxuXHRcdFwiYW5pbWF0aW9uLWJvdW5kc1wiOiB7IHByb3BlcnR5TmFtZTogXCJhbmltYXRpb25zQm91bmRcIiwgdHlwZTogXCJhcnJheS1zdHJpbmdcIiwgZGVmYXVsdFZhbHVlOiB1bmRlZmluZWQgfSxcblx0XHRcImRlZmF1bHQtbWl4XCI6IHsgcHJvcGVydHlOYW1lOiBcImRlZmF1bHRNaXhcIiwgdHlwZTogXCJudW1iZXJcIiwgZGVmYXVsdFZhbHVlOiAwIH0sXG5cdFx0c2tpbjogeyBwcm9wZXJ0eU5hbWU6IFwic2tpblwiLCB0eXBlOiBcImFycmF5LXN0cmluZ1wiIH0sXG5cdFx0d2lkdGg6IHsgcHJvcGVydHlOYW1lOiBcIndpZHRoXCIsIHR5cGU6IFwibnVtYmVyXCIsIGRlZmF1bHRWYWx1ZTogLTEgfSxcblx0XHRoZWlnaHQ6IHsgcHJvcGVydHlOYW1lOiBcImhlaWdodFwiLCB0eXBlOiBcIm51bWJlclwiLCBkZWZhdWx0VmFsdWU6IC0xIH0sXG5cdFx0ZHJhZzogeyBwcm9wZXJ0eU5hbWU6IFwiZHJhZ1wiLCB0eXBlOiBcImJvb2xlYW5cIiB9LFxuXHRcdGludGVyYWN0aXZlOiB7IHByb3BlcnR5TmFtZTogXCJpbnRlcmFjdGl2ZVwiLCB0eXBlOiBcImJvb2xlYW5cIiB9LFxuXHRcdFwieC1heGlzXCI6IHsgcHJvcGVydHlOYW1lOiBcInhBeGlzXCIsIHR5cGU6IFwibnVtYmVyXCIgfSxcblx0XHRcInktYXhpc1wiOiB7IHByb3BlcnR5TmFtZTogXCJ5QXhpc1wiLCB0eXBlOiBcIm51bWJlclwiIH0sXG5cdFx0XCJvZmZzZXQteFwiOiB7IHByb3BlcnR5TmFtZTogXCJvZmZzZXRYXCIsIHR5cGU6IFwibnVtYmVyXCIgfSxcblx0XHRcIm9mZnNldC15XCI6IHsgcHJvcGVydHlOYW1lOiBcIm9mZnNldFlcIiwgdHlwZTogXCJudW1iZXJcIiB9LFxuXHRcdFwicGFkLWxlZnRcIjogeyBwcm9wZXJ0eU5hbWU6IFwicGFkTGVmdFwiLCB0eXBlOiBcIm51bWJlclwiIH0sXG5cdFx0XCJwYWQtcmlnaHRcIjogeyBwcm9wZXJ0eU5hbWU6IFwicGFkUmlnaHRcIiwgdHlwZTogXCJudW1iZXJcIiB9LFxuXHRcdFwicGFkLXRvcFwiOiB7IHByb3BlcnR5TmFtZTogXCJwYWRUb3BcIiwgdHlwZTogXCJudW1iZXJcIiB9LFxuXHRcdFwicGFkLWJvdHRvbVwiOiB7IHByb3BlcnR5TmFtZTogXCJwYWRCb3R0b21cIiwgdHlwZTogXCJudW1iZXJcIiB9LFxuXHRcdFwiYm91bmRzLXhcIjogeyBwcm9wZXJ0eU5hbWU6IFwiYm91bmRzWFwiLCB0eXBlOiBcIm51bWJlclwiIH0sXG5cdFx0XCJib3VuZHMteVwiOiB7IHByb3BlcnR5TmFtZTogXCJib3VuZHNZXCIsIHR5cGU6IFwibnVtYmVyXCIgfSxcblx0XHRcImJvdW5kcy13aWR0aFwiOiB7IHByb3BlcnR5TmFtZTogXCJib3VuZHNXaWR0aFwiLCB0eXBlOiBcIm51bWJlclwiLCBkZWZhdWx0VmFsdWU6IC0xIH0sXG5cdFx0XCJib3VuZHMtaGVpZ2h0XCI6IHsgcHJvcGVydHlOYW1lOiBcImJvdW5kc0hlaWdodFwiLCB0eXBlOiBcIm51bWJlclwiLCBkZWZhdWx0VmFsdWU6IC0xIH0sXG5cdFx0XCJhdXRvLWNhbGN1bGF0ZS1ib3VuZHNcIjogeyBwcm9wZXJ0eU5hbWU6IFwiYXV0b0NhbGN1bGF0ZUJvdW5kc1wiLCB0eXBlOiBcImJvb2xlYW5cIiB9LFxuXHRcdGlkZW50aWZpZXI6IHsgcHJvcGVydHlOYW1lOiBcImlkZW50aWZpZXJcIiwgdHlwZTogXCJzdHJpbmdcIiB9LFxuXHRcdGRlYnVnOiB7IHByb3BlcnR5TmFtZTogXCJkZWJ1Z1wiLCB0eXBlOiBcImJvb2xlYW5cIiB9LFxuXHRcdFwibWFudWFsLXN0YXJ0XCI6IHsgcHJvcGVydHlOYW1lOiBcIm1hbnVhbFN0YXJ0XCIsIHR5cGU6IFwiYm9vbGVhblwiIH0sXG5cdFx0XCJzdGFydC13aGVuLXZpc2libGVcIjogeyBwcm9wZXJ0eU5hbWU6IFwic3RhcnRXaGVuVmlzaWJsZVwiLCB0eXBlOiBcImJvb2xlYW5cIiB9LFxuXHRcdFwic3Bpbm5lclwiOiB7IHByb3BlcnR5TmFtZTogXCJzcGlubmVyXCIsIHR5cGU6IFwiYm9vbGVhblwiIH0sXG5cdFx0Y2xpcDogeyBwcm9wZXJ0eU5hbWU6IFwiY2xpcFwiLCB0eXBlOiBcImJvb2xlYW5cIiB9LFxuXHRcdHBhZ2VzOiB7IHByb3BlcnR5TmFtZTogXCJwYWdlc1wiLCB0eXBlOiBcImFycmF5LW51bWJlclwiIH0sXG5cdFx0Zml0OiB7IHByb3BlcnR5TmFtZTogXCJmaXRcIiwgdHlwZTogXCJmaXRUeXBlXCIsIGRlZmF1bHRWYWx1ZTogXCJjb250YWluXCIgfSxcblx0XHRvZmZzY3JlZW46IHsgcHJvcGVydHlOYW1lOiBcIm9mZlNjcmVlblVwZGF0ZUJlaGF2aW91clwiLCB0eXBlOiBcIm9mZlNjcmVlblVwZGF0ZUJlaGF2aW91clR5cGVcIiwgZGVmYXVsdFZhbHVlOiBcInBhdXNlXCIgfSxcblx0fVxuXG5cdHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzICgpOiBzdHJpbmdbXSB7XG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24uYXR0cmlidXRlc0Rlc2NyaXB0aW9uKTtcblx0fVxuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMucm9vdCA9IHRoaXMuYXR0YWNoU2hhZG93KHsgbW9kZTogXCJjbG9zZWRcIiB9KTtcblxuXHRcdC8vIHRoZXNlIHR3byBhcmUgdGVycmlibGUgY29kZSBzbWVsbHNcblx0XHR0aGlzLl93aGVuUmVhZHkgPSBuZXcgUHJvbWlzZTx0aGlzPigocmVzb2x2ZSkgPT4ge1xuXHRcdFx0dGhpcy5yZXNvbHZlTG9hZGluZ1Byb21pc2UgPSByZXNvbHZlO1xuXHRcdH0pO1xuXHRcdHRoaXMub3ZlcmxheUFzc2lnbmVkUHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG5cdFx0XHR0aGlzLnJlc29sdmVPdmVybGF5QXNzaWduZWRQcm9taXNlID0gcmVzb2x2ZTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbm5lY3RlZENhbGxiYWNrICgpOiB2b2lkIHtcblx0XHRpZiAodGhpcy5kaXNwb3NlZCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiWW91IGNhbm5vdCBhdHRhY2ggYSBkaXNwb3NlZCB3aWRnZXRcIik7XG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLm92ZXJsYXkpIHtcblx0XHRcdHRoaXMuaW5pdEFmdGVyQ29ubmVjdCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJsb2FkaW5nXCIpIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCB0aGlzLkRPTUNvbnRlbnRMb2FkZWRDYWxsYmFjayk7XG5cdFx0XHRlbHNlIHRoaXMuRE9NQ29udGVudExvYWRlZENhbGxiYWNrKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fVxuXG5cdHByaXZhdGUgaW5pdEFmdGVyQ29ubmVjdCAoKSB7XG5cdFx0dGhpcy5vdmVybGF5LmFkZFdpZGdldCh0aGlzKTtcblx0XHRpZiAoIXRoaXMubWFudWFsU3RhcnQgJiYgIXRoaXMuc3RhcnRlZCkge1xuXHRcdFx0dGhpcy5zdGFydCgpO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgRE9NQ29udGVudExvYWRlZENhbGxiYWNrID0gKCkgPT4ge1xuXHRcdGN1c3RvbUVsZW1lbnRzLndoZW5EZWZpbmVkKFwic3BpbmUtb3ZlcmxheVwiKS50aGVuKGFzeW5jICgpID0+IHtcblx0XHRcdHRoaXMub3ZlcmxheSA9IFNwaW5lV2ViQ29tcG9uZW50T3ZlcmxheS5nZXRPckNyZWF0ZU92ZXJsYXkodGhpcy5nZXRBdHRyaWJ1dGUoXCJvdmVybGF5LWlkXCIpKTtcblx0XHRcdHRoaXMucmVzb2x2ZU92ZXJsYXlBc3NpZ25lZFByb21pc2UoKTtcblx0XHRcdHRoaXMuaW5pdEFmdGVyQ29ubmVjdCgpO1xuXHRcdH0pO1xuXHR9XG5cblx0ZGlzY29ubmVjdGVkQ2FsbGJhY2sgKCk6IHZvaWQge1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCB0aGlzLkRPTUNvbnRlbnRMb2FkZWRDYWxsYmFjayk7XG5cdFx0Y29uc3QgaW5kZXggPSB0aGlzLm92ZXJsYXk/LndpZGdldHMuaW5kZXhPZih0aGlzKTtcblx0XHRpZiAoaW5kZXggPiAwKSB7XG5cdFx0XHR0aGlzLm92ZXJsYXkhLndpZGdldHMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogUmVtb3ZlIHRoZSB3aWRnZXQgZnJvbSB0aGUgb3ZlcmxheSBhbmQgdGhlIERPTS5cblx0ICovXG5cdGRpc3Bvc2UgKCkge1xuXHRcdHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuXHRcdHRoaXMuZGlzcG9zZUdMUmVzb3VyY2VzKCk7XG5cdFx0dGhpcy5sb2FkaW5nU2NyZWVuPy5kaXNwb3NlKCk7XG5cdFx0dGhpcy5vdmVybGF5LnJlbW92ZVdpZGdldCh0aGlzKTtcblx0XHR0aGlzLnJlbW92ZSgpO1xuXHRcdHRoaXMuc2tlbGV0b25EYXRhID0gdW5kZWZpbmVkO1xuXHRcdHRoaXMuc2tlbGV0b24gPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5zdGF0ZSA9IHVuZGVmaW5lZDtcblx0fVxuXG5cdGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayAobmFtZTogc3RyaW5nLCBvbGRWYWx1ZTogc3RyaW5nIHwgbnVsbCwgbmV3VmFsdWU6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcblx0XHRjb25zdCB7IHR5cGUsIHByb3BlcnR5TmFtZSwgZGVmYXVsdFZhbHVlIH0gPSBTcGluZVdlYkNvbXBvbmVudFNrZWxldG9uLmF0dHJpYnV0ZXNEZXNjcmlwdGlvbltuYW1lXTtcblx0XHRjb25zdCB2YWwgPSBjYXN0VmFsdWUodHlwZSwgbmV3VmFsdWUsIGRlZmF1bHRWYWx1ZSk7XG5cdFx0KHRoaXMgYXMgYW55KVtwcm9wZXJ0eU5hbWVdID0gdmFsO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8qKlxuXHQgKiBTdGFydHMgdGhlIHdpZGdldC4gU3RhcnRpbmcgdGhlIHdpZGdldCBtZWFucyB0byBsb2FkIHRoZSBhc3NldHMgY3VycmVudGx5IHNldCBpbnRvXG5cdCAqIHtAbGluayBhdGxhc1BhdGh9IGFuZCB7QGxpbmsgc2tlbGV0b25QYXRofS4gSWYgc3RhcnQgaXMgaW52b2tlZCB3aGVuIHRoZSB3aWRnZXQgaXMgYWxyZWFkeSBzdGFydGVkLFxuXHQgKiB0aGUgc2tlbGV0b24gYW5kIHRoZSBzdGF0ZSBhcmUgcmVzZXQuIEJvdW5kcyBhcmUgcmVjYWxjdWxhdGVkIG9ubHkgaWYge0BsaW5rIGF1dG9DYWxjdWxhdGVCb3VuZHN9IGlzIHRydWUuXG5cdCAqL1xuXHRwdWJsaWMgc3RhcnQgKCkge1xuXHRcdGlmICh0aGlzLnN0YXJ0ZWQpIHtcblx0XHRcdHRoaXMuc2tlbGV0b24gPSB1bmRlZmluZWQ7XG5cdFx0XHR0aGlzLnN0YXRlID0gdW5kZWZpbmVkO1xuXHRcdFx0dGhpcy5fd2hlblJlYWR5ID0gbmV3IFByb21pc2U8dGhpcz4oKHJlc29sdmUpID0+IHtcblx0XHRcdFx0dGhpcy5yZXNvbHZlTG9hZGluZ1Byb21pc2UgPSByZXNvbHZlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHRoaXMuc3RhcnRlZCA9IHRydWU7XG5cblx0XHRjdXN0b21FbGVtZW50cy53aGVuRGVmaW5lZChcInNwaW5lLW92ZXJsYXlcIikudGhlbigoKSA9PiB7XG5cdFx0XHR0aGlzLnJlc29sdmVMb2FkaW5nUHJvbWlzZSh0aGlzLmxvYWRTa2VsZXRvbigpKTtcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBMb2FkcyB0aGUgdGV4dHVyZSBwYWdlcyBpbiB0aGUgZ2l2ZW4gYGF0bGFzYCBjb3JyZXNwb25kaW5nIHRvIHRoZSBpbmRleGVzIHNldCBpbnRvIHtAbGluayBwYWdlc30uXG5cdCAqIFRoaXMgbWV0aG9kIGlzIGF1dG9tYXRpY2FsbHkgY2FsbGVkIGR1cmluZyBhc3NldCBsb2FkaW5nLiBXaGVuIGBwYWdlc2AgaXMgdW5kZWZpbmVkIChkZWZhdWx0KSxcblx0ICogYWxsIHBhZ2VzIGFyZSBsb2FkZWQuIFRoaXMgbWV0aG9kIGlzIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvIGxvYWQgYSBzdWJzZXQgb2YgcGFnZXMgcHJvZ3JhbW1hdGljYWxseS5cblx0ICogSW4gdGhhdCBjYXNlLCBzZXQgYHBhZ2VzYCB0byBhbiBlbXB0eSBhcnJheSBhdCB0aGUgYmVnaW5uaW5nLlxuXHQgKiBUaGVuIHNldCB0aGUgcGFnZXMgeW91IHdhbnQgdG8gbG9hZCBhbmQgaW52b2tlIHRoaXMgbWV0aG9kLlxuXHQgKiBAcGFyYW0gYXRsYXMgdGhlIGBUZXh0dXJlQXRsYXNgIGZyb20gd2hpY2ggdG8gZ2V0IHRoZSBgVGV4dHVyZUF0bGFzUGFnZWBzXG5cdCAqIEByZXR1cm5zIFRoZSBsaXN0IG9mIGxvYWRlZCBhc3NldHNcblx0ICovXG5cdHB1YmxpYyBhc3luYyBsb2FkVGV4dHVyZXNJblBhZ2VzQXR0cmlidXRlICgpOiBQcm9taXNlPEFycmF5PGFueT4+IHtcblx0XHRjb25zdCBhdGxhcyA9IHRoaXMub3ZlcmxheS5hc3NldE1hbmFnZXIucmVxdWlyZSh0aGlzLmF0bGFzUGF0aCEpIGFzIFRleHR1cmVBdGxhcztcblx0XHRjb25zdCBwYWdlc0luZGV4VG9Mb2FkID0gdGhpcy5wYWdlcyA/PyBhdGxhcy5wYWdlcy5tYXAoKF8sIGkpID0+IGkpOyAvLyBpZiBubyBwYWdlcyBwcm92aWRlZCwgbG9hZHMgYWxsXG5cdFx0Y29uc3QgYXRsYXNQYXRoID0gdGhpcy5hdGxhc1BhdGg/LmluY2x1ZGVzKFwiL1wiKSA/IHRoaXMuYXRsYXNQYXRoLnN1YnN0cmluZygwLCB0aGlzLmF0bGFzUGF0aC5sYXN0SW5kZXhPZihcIi9cIikgKyAxKSA6IFwiXCI7XG5cdFx0Y29uc3QgcHJvbWlzZVBhZ2VMaXN0OiBBcnJheTxQcm9taXNlPGFueT4+ID0gW107XG5cdFx0Y29uc3QgdGV4dHVyZVBhdGhzID0gW107XG5cblx0XHRmb3IgKGNvbnN0IGluZGV4IG9mIHBhZ2VzSW5kZXhUb0xvYWQpIHtcblx0XHRcdGNvbnN0IHBhZ2UgPSBhdGxhcy5wYWdlc1tpbmRleF07XG5cdFx0XHRjb25zdCB0ZXh0dXJlUGF0aCA9IGAke2F0bGFzUGF0aH0ke3BhZ2UubmFtZX1gO1xuXHRcdFx0dGV4dHVyZVBhdGhzLnB1c2godGV4dHVyZVBhdGgpO1xuXG5cdFx0XHRjb25zdCBwcm9taXNlVGV4dHVyZUxvYWQgPSB0aGlzLmxhc3RUZXh0dXJlUGF0aHMuaW5jbHVkZXModGV4dHVyZVBhdGgpXG5cdFx0XHRcdD8gUHJvbWlzZS5yZXNvbHZlKHRleHR1cmVQYXRoKVxuXHRcdFx0XHQ6IHRoaXMub3ZlcmxheS5hc3NldE1hbmFnZXIubG9hZFRleHR1cmVBc3luYyh0ZXh0dXJlUGF0aCkudGhlbih0ZXh0dXJlID0+IHtcblx0XHRcdFx0XHR0aGlzLmxhc3RUZXh0dXJlUGF0aHMucHVzaCh0ZXh0dXJlUGF0aCk7XG5cdFx0XHRcdFx0cGFnZS5zZXRUZXh0dXJlKHRleHR1cmUpO1xuXHRcdFx0XHRcdHJldHVybiB0ZXh0dXJlUGF0aDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdHByb21pc2VQYWdlTGlzdC5wdXNoKHByb21pc2VUZXh0dXJlTG9hZCk7XG5cdFx0fVxuXG5cdFx0Ly8gZGlzcG9zZSB0ZXh0dXJlcyBubyBsb25nZXIgdXNlZFxuXHRcdGZvciAoY29uc3QgbGFzdFRleHR1cmVQYXRoIG9mIHRoaXMubGFzdFRleHR1cmVQYXRocykge1xuXHRcdFx0aWYgKCF0ZXh0dXJlUGF0aHMuaW5jbHVkZXMobGFzdFRleHR1cmVQYXRoKSkgdGhpcy5vdmVybGF5LmFzc2V0TWFuYWdlci5kaXNwb3NlQXNzZXQobGFzdFRleHR1cmVQYXRoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZVBhZ2VMaXN0KVxuXHR9XG5cblx0LyoqXG5cdCAqIEByZXR1cm5zIFRoZSBgSFRNTEVsZW1lbnRgIHdoZXJlIHRoZSB3aWRnZXQgaXMgaG9zdGVkLlxuXHQgKi9cblx0cHVibGljIGdldEhvc3RFbGVtZW50ICgpOiBIVE1MRWxlbWVudCB7XG5cdFx0cmV0dXJuICh0aGlzLndpZHRoIDw9IDAgfHwgdGhpcy53aWR0aCA8PSAwKSAmJiAhdGhpcy5nZXRBdHRyaWJ1dGUoXCJzdHlsZVwiKSAmJiAhdGhpcy5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKVxuXHRcdFx0PyB0aGlzLnBhcmVudEVsZW1lbnQhXG5cdFx0XHQ6IHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogQXBwZW5kIHRoZSB3aWRnZXQgdG8gdGhlIGdpdmVuIGBIVE1MRWxlbWVudGAuXG5cdCAqIEBwYXJhbSBhdGxhcyB0aGUgYEhUTUxFbGVtZW50YCB0byBhcHBlbmQgdGhpcyB3aWRnZXQgdG8uXG5cdCAqL1xuXHRwdWJsaWMgYXN5bmMgYXBwZW5kVG8gKGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0ZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzKTtcblx0XHRhd2FpdCB0aGlzLm92ZXJsYXlBc3NpZ25lZFByb21pc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ2FsY3VsYXRlcyBhbmQgc2V0cyB0aGUgYm91bmRzIG9mIHRoZSBjdXJyZW50IGFuaW1hdGlvbiBvbiB0cmFjayAwLlxuXHQgKiBVc2VmdWwgd2hlbiBhbmltYXRpb25zIG9yIHNraW5zIGFyZSBzZXQgcHJvZ3JhbW1hdGljYWxseS5cblx0ICogQHJldHVybnMgdm9pZFxuXHQgKi9cblx0cHVibGljIGNhbGN1bGF0ZUJvdW5kcyAoZm9yY2VkUmVjYWxjdWxhdGUgPSBmYWxzZSk6IHZvaWQge1xuXHRcdGNvbnN0IHsgc2tlbGV0b24sIHN0YXRlIH0gPSB0aGlzO1xuXHRcdGlmICghc2tlbGV0b24gfHwgIXN0YXRlKSByZXR1cm47XG5cblx0XHRsZXQgYm91bmRzOiBSZWN0YW5nbGU7XG5cblx0XHRpZiAodGhpcy5hbmltYXRpb25zQm91bmQgJiYgZm9yY2VkUmVjYWxjdWxhdGUpIHtcblx0XHRcdGxldCBtaW5YID0gSW5maW5pdHksIG1heFggPSAtSW5maW5pdHksIG1pblkgPSBJbmZpbml0eSwgbWF4WSA9IC1JbmZpbml0eTtcblxuXHRcdFx0Zm9yIChjb25zdCBhbmltYXRpb25OYW1lIG9mIHRoaXMuYW5pbWF0aW9uc0JvdW5kKSB7XG5cdFx0XHRcdGNvbnN0IGFuaW1hdGlvbiA9IHRoaXMuc2tlbGV0b24/LmRhdGEuYW5pbWF0aW9ucy5maW5kKCh7IG5hbWUgfSkgPT4gYW5pbWF0aW9uTmFtZSA9PT0gbmFtZSlcblx0XHRcdFx0Y29uc3QgeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0gPSB0aGlzLmNhbGN1bGF0ZUFuaW1hdGlvblZpZXdwb3J0KGFuaW1hdGlvbik7XG5cblx0XHRcdFx0bWluWCA9IE1hdGgubWluKG1pblgsIHgpO1xuXHRcdFx0XHRtaW5ZID0gTWF0aC5taW4obWluWSwgeSk7XG5cdFx0XHRcdG1heFggPSBNYXRoLm1heChtYXhYLCB4ICsgd2lkdGgpO1xuXHRcdFx0XHRtYXhZID0gTWF0aC5tYXgobWF4WSwgeSArIGhlaWdodCk7XG5cdFx0XHR9XG5cblx0XHRcdGJvdW5kcyA9IHtcblx0XHRcdFx0eDogbWluWCxcblx0XHRcdFx0eTogbWluWSxcblx0XHRcdFx0d2lkdGg6IG1heFggLSBtaW5YLFxuXHRcdFx0XHRoZWlnaHQ6IG1heFkgLSBtaW5ZXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRib3VuZHMgPSB0aGlzLmNhbGN1bGF0ZUFuaW1hdGlvblZpZXdwb3J0KHN0YXRlLmdldEN1cnJlbnQoMCk/LmFuaW1hdGlvbiBhcyAoQW5pbWF0aW9uIHwgdW5kZWZpbmVkKSk7XG5cdFx0fVxuXG5cdFx0Ym91bmRzLnggLz0gc2tlbGV0b24uc2NhbGVYO1xuXHRcdGJvdW5kcy55IC89IHNrZWxldG9uLnNjYWxlWTtcblx0XHRib3VuZHMud2lkdGggLz0gc2tlbGV0b24uc2NhbGVYO1xuXHRcdGJvdW5kcy5oZWlnaHQgLz0gc2tlbGV0b24uc2NhbGVZO1xuXHRcdHRoaXMuYm91bmRzID0gYm91bmRzO1xuXHR9XG5cblx0cHJpdmF0ZSBsYXN0U2tlbFBhdGggPSBcIlwiO1xuXHRwcml2YXRlIGxhc3RBdGxhc1BhdGggPSBcIlwiO1xuXHRwcml2YXRlIGxhc3RUZXh0dXJlUGF0aHM6IHN0cmluZ1tdID0gW107XG5cdC8vIGFkZCBhIHNrZWxldG9uIHRvIHRoZSBvdmVybGF5IGFuZCBzZXQgdGhlIGJvdW5kcyB0byB0aGUgZ2l2ZW4gYW5pbWF0aW9uIG9yIHRvIHRoZSBzZXR1cCBwb3NlXG5cdHByaXZhdGUgYXN5bmMgbG9hZFNrZWxldG9uICgpIHtcblx0XHR0aGlzLmxvYWRpbmcgPSB0cnVlO1xuXG5cdFx0Y29uc3QgeyBhdGxhc1BhdGgsIHNrZWxldG9uUGF0aCwgc2NhbGUsIHNrZWxldG9uRGF0YTogc2tlbGV0b25EYXRhSW5wdXQsIHJhd0RhdGEgfSA9IHRoaXM7XG5cdFx0aWYgKCFhdGxhc1BhdGggfHwgIXNrZWxldG9uUGF0aCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGF0bGFzIHBhdGggb3Igc2tlbGV0b24gcGF0aC4gQXNzZXRzIGNhbm5vdCBiZSBsb2FkZWQ6IGF0bGFzOiAke2F0bGFzUGF0aH0sIHNrZWxldG9uOiAke3NrZWxldG9uUGF0aH1gKTtcblx0XHR9XG5cdFx0Y29uc3QgaXNCaW5hcnkgPSBza2VsZXRvblBhdGguZW5kc1dpdGgoXCIuc2tlbFwiKTtcblxuXHRcdGlmIChyYXdEYXRhKSB7XG5cdFx0XHRmb3IgKGxldCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocmF3RGF0YSkpIHtcblx0XHRcdFx0dGhpcy5vdmVybGF5LmFzc2V0TWFuYWdlci5zZXRSYXdEYXRhVVJJKGtleSwgaXNCYXNlNjQodmFsdWUpID8gYGRhdGE6YXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtO2Jhc2U2NCwke3ZhbHVlfWAgOiB2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gdGhpcyBlbnN1cmUgdGhlcmUgaXMgYW4gb3ZlcmxheSBhc3NpZ25lZCBiZWNhdXNlIHRoZSBvdmVybGF5IG93bnMgdGhlIGFzc2V0IG1hbmFnZXIgdXNlZCB0byBsb2FkIGFzc2V0cyBiZWxvd1xuXHRcdGF3YWl0IHRoaXMub3ZlcmxheUFzc2lnbmVkUHJvbWlzZTtcblxuXHRcdGlmICh0aGlzLmxhc3RTa2VsUGF0aCAmJiB0aGlzLmxhc3RTa2VsUGF0aCAhPT0gc2tlbGV0b25QYXRoKSB7XG5cdFx0XHR0aGlzLm92ZXJsYXkuYXNzZXRNYW5hZ2VyLmRpc3Bvc2VBc3NldCh0aGlzLmxhc3RTa2VsUGF0aCk7XG5cdFx0XHR0aGlzLmxhc3RTa2VsUGF0aCA9IFwiXCI7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMubGFzdEF0bGFzUGF0aCAmJiB0aGlzLmxhc3RBdGxhc1BhdGggIT09IGF0bGFzUGF0aCkge1xuXHRcdFx0dGhpcy5vdmVybGF5LmFzc2V0TWFuYWdlci5kaXNwb3NlQXNzZXQodGhpcy5sYXN0QXRsYXNQYXRoKTtcblx0XHRcdHRoaXMubGFzdEF0bGFzUGF0aCA9IFwiXCI7XG5cdFx0fVxuXG5cdFx0Ly8gc2tlbGV0b24gYW5kIGF0bGFzIHR4dCBhcmUgbG9hZGVkIGltbWVhZGl0ZWx5XG5cdFx0Ly8gdGV4dHVyZXMgYXJlIGxvYWVkZWQgZGVwZW5kaW5nIG9uIHRoZSAncGFnZXMnIHBhcmFtOlxuXHRcdC8vIC0gWzAsMl06IG9ubHkgcGFnZXMgYXQgaW5kZXggMCBhbmQgMiBhcmUgbG9hZGVkXG5cdFx0Ly8gLSBbXTogbm8gcGFnZSBpcyBsb2FkZWRcblx0XHQvLyAtIHVuZGVmaW5lZDogYWxsIHBhZ2VzIGFyZSBsb2FkZWQgKGRlZmF1bHQpXG5cdFx0YXdhaXQgUHJvbWlzZS5hbGwoW1xuXHRcdFx0dGhpcy5sYXN0U2tlbFBhdGhcblx0XHRcdFx0PyBQcm9taXNlLnJlc29sdmUoKVxuXHRcdFx0XHQ6IChpc0JpbmFyeSA/IHRoaXMub3ZlcmxheS5hc3NldE1hbmFnZXIubG9hZEJpbmFyeUFzeW5jKHNrZWxldG9uUGF0aCkgOiB0aGlzLm92ZXJsYXkuYXNzZXRNYW5hZ2VyLmxvYWRKc29uQXN5bmMoc2tlbGV0b25QYXRoKSlcblx0XHRcdFx0XHQudGhlbigoKSA9PiB0aGlzLmxhc3RTa2VsUGF0aCA9IHNrZWxldG9uUGF0aCksXG5cdFx0XHR0aGlzLmxhc3RBdGxhc1BhdGhcblx0XHRcdFx0PyBQcm9taXNlLnJlc29sdmUoKVxuXHRcdFx0XHQ6IHRoaXMub3ZlcmxheS5hc3NldE1hbmFnZXIubG9hZFRleHR1cmVBdGxhc0J1dE5vVGV4dHVyZXNBc3luYyhhdGxhc1BhdGgpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMubGFzdEF0bGFzUGF0aCA9IGF0bGFzUGF0aDtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5sb2FkVGV4dHVyZXNJblBhZ2VzQXR0cmlidXRlKCk7XG5cdFx0XHRcdH0pLFxuXHRcdF0pO1xuXG5cdFx0Y29uc3QgYXRsYXMgPSB0aGlzLm92ZXJsYXkuYXNzZXRNYW5hZ2VyLnJlcXVpcmUoYXRsYXNQYXRoKSBhcyBUZXh0dXJlQXRsYXM7XG5cdFx0dGhpcy5wbWEgPSBhdGxhcy5wYWdlc1swXT8ucG1hXG5cblx0XHRjb25zdCBhdGxhc0xvYWRlciA9IG5ldyBBdGxhc0F0dGFjaG1lbnRMb2FkZXIoYXRsYXMpO1xuXG5cdFx0Y29uc3Qgc2tlbGV0b25Mb2FkZXIgPSBpc0JpbmFyeSA/IG5ldyBTa2VsZXRvbkJpbmFyeShhdGxhc0xvYWRlcikgOiBuZXcgU2tlbGV0b25Kc29uKGF0bGFzTG9hZGVyKTtcblx0XHRza2VsZXRvbkxvYWRlci5zY2FsZSA9IHNjYWxlO1xuXG5cdFx0Y29uc3Qgc2tlbGV0b25GaWxlQXNzZXQgPSB0aGlzLm92ZXJsYXkuYXNzZXRNYW5hZ2VyLnJlcXVpcmUoc2tlbGV0b25QYXRoKTtcblx0XHRjb25zdCBza2VsZXRvbkZpbGUgPSB0aGlzLmpzb25Ta2VsZXRvbktleSA/IHNrZWxldG9uRmlsZUFzc2V0W3RoaXMuanNvblNrZWxldG9uS2V5XSA6IHNrZWxldG9uRmlsZUFzc2V0O1xuXHRcdGNvbnN0IHNrZWxldG9uRGF0YSA9IChza2VsZXRvbkRhdGFJbnB1dCB8fCB0aGlzLnNrZWxldG9uPy5kYXRhKSA/PyBza2VsZXRvbkxvYWRlci5yZWFkU2tlbGV0b25EYXRhKHNrZWxldG9uRmlsZSk7XG5cblx0XHRjb25zdCBza2VsZXRvbiA9IG5ldyBTa2VsZXRvbihza2VsZXRvbkRhdGEpO1xuXHRcdGNvbnN0IGFuaW1hdGlvblN0YXRlRGF0YSA9IG5ldyBBbmltYXRpb25TdGF0ZURhdGEoc2tlbGV0b25EYXRhKTtcblx0XHRjb25zdCBzdGF0ZSA9IG5ldyBBbmltYXRpb25TdGF0ZShhbmltYXRpb25TdGF0ZURhdGEpO1xuXG5cdFx0dGhpcy5za2VsZXRvbiA9IHNrZWxldG9uO1xuXHRcdHRoaXMuc3RhdGUgPSBzdGF0ZTtcblx0XHR0aGlzLnRleHR1cmVBdGxhcyA9IGF0bGFzO1xuXG5cdFx0Ly8gaWRlYWxseSB3ZSB3b3VsZCBrbm93IHRoZSBkcGkgYW5kIHRoZSB6b29tLCBob3dldmVyIHRoZXkgYXJlIGNvbWJpbmVkXG5cdFx0Ly8gdG8gc2ltcGxpZnkgd2UganVzdCBhc3N1bWUgdGhhdCB0aGUgdXNlciB3YW50cyB0byBsb2FkIHRoZSBza2VsZXRvbiBhdCBzY2FsZSAxXG5cdFx0Ly8gYXQgdGhlIGN1cnJlbnQgYnJvd3NlciB6b29tIGxldmVsXG5cdFx0Ly8gdGhpcyBtaWdodCBiZSBwcm9ibGVtYXRpYyBmb3IgZnJlZS1zY2FsZSBtb2RlcyAob3JpZ2luIGFuZCBpbnNpZGUrbm9uZSlcblx0XHR0aGlzLmRwclNjYWxlID0gdGhpcy5vdmVybGF5LmdldERldmljZVBpeGVsUmF0aW8oKTtcblx0XHQvLyBza2VsZXRvbi5zY2FsZVggPSB0aGlzLmRwclNjYWxlO1xuXHRcdC8vIHNrZWxldG9uLnNjYWxlWSA9IHRoaXMuZHByU2NhbGU7XG5cblx0XHR0aGlzLmxvYWRpbmcgPSBmYWxzZTtcblxuXHRcdC8vIHRoZSBib3VuZHMgYXJlIGNhbGN1bGF0ZWQgdGhlIGZpcnN0IHRpbWUsIGlmIG5vIGN1c3RvbSBib3VuZCBpcyBwcm92aWRlZFxuXHRcdHRoaXMuaW5pdFdpZGdldCh0aGlzLmJvdW5kcy53aWR0aCA8PSAwIHx8IHRoaXMuYm91bmRzLmhlaWdodCA8PSAwKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cHJpdmF0ZSBpbml0V2lkZ2V0IChmb3JjZVJlY2FsY3VsYXRlID0gZmFsc2UpIHtcblx0XHRpZiAodGhpcy5sb2FkaW5nKSByZXR1cm47XG5cblx0XHRjb25zdCB7IHNrZWxldG9uLCBzdGF0ZSwgYW5pbWF0aW9uLCBhbmltYXRpb25zOiBhbmltYXRpb25zSW5mbywgc2tpbiwgZGVmYXVsdE1peCB9ID0gdGhpcztcblxuXHRcdGlmIChza2luKSB7XG5cdFx0XHRpZiAoc2tpbi5sZW5ndGggPT09IDEpIHtcblx0XHRcdFx0c2tlbGV0b24/LnNldFNraW5CeU5hbWUoc2tpblswXSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCBjdXN0b21Ta2luID0gbmV3IFNraW4oXCJjdXN0b21cIik7XG5cdFx0XHRcdGZvciAoY29uc3QgcyBvZiBza2luKSBjdXN0b21Ta2luLmFkZFNraW4oc2tlbGV0b24/LmRhdGEuZmluZFNraW4ocykgYXMgU2tpbik7XG5cdFx0XHRcdHNrZWxldG9uPy5zZXRTa2luKGN1c3RvbVNraW4pO1xuXHRcdFx0fVxuXG5cdFx0XHRza2VsZXRvbj8uc2V0U2xvdHNUb1NldHVwUG9zZSgpO1xuXHRcdH1cblxuXHRcdGlmIChzdGF0ZSkge1xuXHRcdFx0c3RhdGUuZGF0YS5kZWZhdWx0TWl4ID0gZGVmYXVsdE1peDtcblxuXHRcdFx0aWYgKGFuaW1hdGlvbnNJbmZvKSB7XG5cdFx0XHRcdGZvciAoY29uc3QgW3RyYWNrSW5kZXhTdHJpbmcsIHsgY3ljbGUsIGFuaW1hdGlvbnMsIHJlcGVhdERlbGF5IH1dIG9mIE9iamVjdC5lbnRyaWVzKGFuaW1hdGlvbnNJbmZvKSkge1xuXHRcdFx0XHRcdGNvbnN0IGN5Y2xlRm4gPSAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCB0cmFja0luZGV4ID0gTnVtYmVyKHRyYWNrSW5kZXhTdHJpbmcpO1xuXHRcdFx0XHRcdFx0Zm9yIChjb25zdCBbaW5kZXgsIHsgYW5pbWF0aW9uTmFtZSwgZGVsYXksIGxvb3AsIG1peER1cmF0aW9uIH1dIG9mIGFuaW1hdGlvbnMuZW50cmllcygpKSB7XG5cdFx0XHRcdFx0XHRcdGxldCB0cmFjaztcblx0XHRcdFx0XHRcdFx0aWYgKGluZGV4ID09PSAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGFuaW1hdGlvbk5hbWUgPT09IFwiI0VNUFRZI1wiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0cmFjayA9IHN0YXRlLnNldEVtcHR5QW5pbWF0aW9uKHRyYWNrSW5kZXgsIG1peER1cmF0aW9uKTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0dHJhY2sgPSBzdGF0ZS5zZXRBbmltYXRpb24odHJhY2tJbmRleCwgYW5pbWF0aW9uTmFtZSwgbG9vcCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChhbmltYXRpb25OYW1lID09PSBcIiNFTVBUWSNcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0dHJhY2sgPSBzdGF0ZS5hZGRFbXB0eUFuaW1hdGlvbih0cmFja0luZGV4LCBtaXhEdXJhdGlvbiwgZGVsYXkpO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0cmFjayA9IHN0YXRlLmFkZEFuaW1hdGlvbih0cmFja0luZGV4LCBhbmltYXRpb25OYW1lLCBsb29wLCBkZWxheSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0aWYgKG1peER1cmF0aW9uKSB0cmFjay5taXhEdXJhdGlvbiA9IG1peER1cmF0aW9uO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChjeWNsZSAmJiBpbmRleCA9PT0gYW5pbWF0aW9ucy5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0dHJhY2subGlzdGVuZXIgPSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb21wbGV0ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAocmVwZWF0RGVsYXkpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiBjeWNsZUZuKCksIDEwMDAgKiByZXBlYXREZWxheSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjeWNsZUZuKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSB0cmFjay5saXN0ZW5lcj8uY29tcGxldGU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjeWNsZUZuKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoYW5pbWF0aW9uKSB7XG5cdFx0XHRcdHN0YXRlLnNldEFuaW1hdGlvbigwLCBhbmltYXRpb24sIHRydWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c3RhdGUuc2V0RW1wdHlBbmltYXRpb24oMCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGZvcmNlUmVjYWxjdWxhdGUgfHwgdGhpcy5hdXRvQ2FsY3VsYXRlQm91bmRzKSB0aGlzLmNhbGN1bGF0ZUJvdW5kcyhmb3JjZVJlY2FsY3VsYXRlKTtcblx0fVxuXG5cdHByaXZhdGUgcmVuZGVyICgpOiB2b2lkIHtcblx0XHRsZXQgbm9TaXplID0gKCF0aGlzLmdldEF0dHJpYnV0ZShcInN0eWxlXCIpICYmICF0aGlzLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpKTtcblx0XHR0aGlzLnJvb3QuaW5uZXJIVE1MID0gYFxuICAgICAgICA8c3R5bGU+XG4gICAgICAgICAgICA6aG9zdCB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgICAgICAgICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcblx0XHRcdFx0JHtub1NpemUgPyBcIndpZHRoOiAwOyBoZWlnaHQ6IDA7XCIgOiBcIlwifVxuICAgICAgICAgICAgfVxuICAgICAgICA8L3N0eWxlPlxuICAgICAgICBgO1xuXHR9XG5cblx0Lypcblx0KiBJbnRlcmFjdGlvbiB1dGlsaXRpZXNcblx0Ki9cblxuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqL1xuXHRwdWJsaWMgcG9pbnRlckluc2lkZUJvdW5kcyA9IGZhbHNlO1xuXG5cdHByaXZhdGUgdmVydGljZXNUZW1wID0gVXRpbHMubmV3RmxvYXRBcnJheSgyICogMTAyNCk7XG5cblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKi9cblx0cHVibGljIHBvaW50ZXJTbG90RXZlbnRDYWxsYmFja3M6IE1hcDxTbG90LCB7XG5cdFx0c2xvdEZ1bmN0aW9uOiAoc2xvdDogU2xvdCwgZXZlbnQ6IFBvaW50ZXJFdmVudFR5cGUsIG9yaWdpbmFsRXZlbnQ/OiBVSUV2ZW50KSA9PiB2b2lkLFxuXHRcdGluc2lkZTogYm9vbGVhbixcblx0fT4gPSBuZXcgTWFwKCk7XG5cblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKi9cblx0cHVibGljIHBvaW50ZXJFdmVudFVwZGF0ZSAodHlwZTogUG9pbnRlckV2ZW50VHlwZXNJbnB1dCwgb3JpZ2luYWxFdmVudD86IFVJRXZlbnQpIHtcblx0XHRpZiAoIXRoaXMuaW50ZXJhY3RpdmUpIHJldHVybjtcblxuXHRcdHRoaXMuY2hlY2tCb3VuZHNJbnRlcmFjdGlvbih0eXBlLCBvcmlnaW5hbEV2ZW50KTtcblx0XHR0aGlzLmNoZWNrU2xvdEludGVyYWN0aW9uKHR5cGUsIG9yaWdpbmFsRXZlbnQpO1xuXHR9XG5cblx0cHJpdmF0ZSBjaGVja0JvdW5kc0ludGVyYWN0aW9uICh0eXBlOiBQb2ludGVyRXZlbnRUeXBlc0lucHV0LCBvcmlnaW5hbEV2ZW50PzogVUlFdmVudCkge1xuXHRcdGlmICh0aGlzLmlzUG9pbnRlckluc2lkZUJvdW5kcygpKSB7XG5cblx0XHRcdGlmICghdGhpcy5wb2ludGVySW5zaWRlQm91bmRzKSB7XG5cdFx0XHRcdHRoaXMucG9pbnRlckV2ZW50Q2FsbGJhY2soXCJlbnRlclwiLCBvcmlnaW5hbEV2ZW50KTtcblx0XHRcdH1cblx0XHRcdHRoaXMucG9pbnRlckluc2lkZUJvdW5kcyA9IHRydWU7XG5cblx0XHRcdHRoaXMucG9pbnRlckV2ZW50Q2FsbGJhY2sodHlwZSwgb3JpZ2luYWxFdmVudCk7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRpZiAodGhpcy5wb2ludGVySW5zaWRlQm91bmRzKSB7XG5cdFx0XHRcdHRoaXMucG9pbnRlckV2ZW50Q2FsbGJhY2soXCJsZWF2ZVwiLCBvcmlnaW5hbEV2ZW50KTtcblx0XHRcdH1cblx0XHRcdHRoaXMucG9pbnRlckluc2lkZUJvdW5kcyA9IGZhbHNlO1xuXG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKi9cblx0cHVibGljIGlzUG9pbnRlckluc2lkZUJvdW5kcyAoKTogYm9vbGVhbiB7XG5cdFx0aWYgKHRoaXMuaXNPZmZTY3JlZW5BbmRXYXNNb3ZlZCgpIHx8ICF0aGlzLnNrZWxldG9uKSByZXR1cm4gZmFsc2U7XG5cblx0XHRjb25zdCB4ID0gdGhpcy5wb2ludGVyV29ybGRYIC8gdGhpcy5za2VsZXRvbi5zY2FsZVg7XG5cdFx0Y29uc3QgeSA9IHRoaXMucG9pbnRlcldvcmxkWSAvIHRoaXMuc2tlbGV0b24uc2NhbGVZO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdHggPj0gdGhpcy5ib3VuZHMueCAmJlxuXHRcdFx0eCA8PSB0aGlzLmJvdW5kcy54ICsgdGhpcy5ib3VuZHMud2lkdGggJiZcblx0XHRcdHkgPj0gdGhpcy5ib3VuZHMueSAmJlxuXHRcdFx0eSA8PSB0aGlzLmJvdW5kcy55ICsgdGhpcy5ib3VuZHMuaGVpZ2h0XG5cdFx0KTtcblx0fVxuXG5cdHByaXZhdGUgY2hlY2tTbG90SW50ZXJhY3Rpb24gKHR5cGU6IFBvaW50ZXJFdmVudFR5cGVzSW5wdXQsIG9yaWdpbmFsRXZlbnQ/OiBVSUV2ZW50KSB7XG5cdFx0Zm9yIChsZXQgW3Nsb3QsIGludGVyYWN0aW9uU3RhdGVdIG9mIHRoaXMucG9pbnRlclNsb3RFdmVudENhbGxiYWNrcykge1xuXHRcdFx0aWYgKCFzbG90LmJvbmUuYWN0aXZlKSBjb250aW51ZTtcblx0XHRcdGxldCBhdHRhY2htZW50ID0gc2xvdC5nZXRBdHRhY2htZW50KCk7XG5cblx0XHRcdGlmICghKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBSZWdpb25BdHRhY2htZW50IHx8IGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBNZXNoQXR0YWNobWVudCkpIGNvbnRpbnVlO1xuXG5cdFx0XHRjb25zdCB7IHNsb3RGdW5jdGlvbiwgaW5zaWRlIH0gPSBpbnRlcmFjdGlvblN0YXRlXG5cblx0XHRcdGxldCB2ZXJ0aWNlcyA9IHRoaXMudmVydGljZXNUZW1wO1xuXHRcdFx0bGV0IGh1bGxMZW5ndGggPSA4O1xuXG5cdFx0XHQvLyB3ZSBjb3VsZCBwcm9iYWJseSBjYWNoZSB0aGUgdmVydGljZXMgZnJvbSByZW5kZXJpbmcgaWYgaW50ZXJhY3Rpb24gd2l0aCB0aGlzIHNsb3QgaXMgZW5hYmxlZFxuXHRcdFx0aWYgKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBSZWdpb25BdHRhY2htZW50KSB7XG5cdFx0XHRcdGxldCByZWdpb25BdHRhY2htZW50ID0gPFJlZ2lvbkF0dGFjaG1lbnQ+YXR0YWNobWVudDtcblx0XHRcdFx0cmVnaW9uQXR0YWNobWVudC5jb21wdXRlV29ybGRWZXJ0aWNlcyhzbG90LCB2ZXJ0aWNlcywgMCwgMik7XG5cdFx0XHR9IGVsc2UgaWYgKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBNZXNoQXR0YWNobWVudCkge1xuXHRcdFx0XHRsZXQgbWVzaCA9IDxNZXNoQXR0YWNobWVudD5hdHRhY2htZW50O1xuXHRcdFx0XHRtZXNoLmNvbXB1dGVXb3JsZFZlcnRpY2VzKHNsb3QsIDAsIG1lc2gud29ybGRWZXJ0aWNlc0xlbmd0aCwgdmVydGljZXMsIDAsIDIpO1xuXHRcdFx0XHRodWxsTGVuZ3RoID0gbWVzaC5odWxsTGVuZ3RoO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBoZXJlIHdlIGhhdmUgb25seSBcIm1vdmVcIiBhbmQgXCJkcmFnXCIgZXZlbnRzXG5cdFx0XHRpZiAodGhpcy5pc1BvaW50SW5Qb2x5Z29uKHZlcnRpY2VzLCBodWxsTGVuZ3RoLCBbdGhpcy5wb2ludGVyV29ybGRYLCB0aGlzLnBvaW50ZXJXb3JsZFldKSkge1xuXG5cdFx0XHRcdGlmICghaW5zaWRlKSB7XG5cdFx0XHRcdFx0aW50ZXJhY3Rpb25TdGF0ZS5pbnNpZGUgPSB0cnVlO1xuXHRcdFx0XHRcdHNsb3RGdW5jdGlvbihzbG90LCBcImVudGVyXCIsIG9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHR5cGUgPT09IFwiZG93blwiIHx8IHR5cGUgPT09IFwidXBcIikge1xuXHRcdFx0XHRcdGlmIChpbnRlcmFjdGlvblN0YXRlLmluc2lkZSkge1xuXHRcdFx0XHRcdFx0c2xvdEZ1bmN0aW9uKHNsb3QsIHR5cGUsIG9yaWdpbmFsRXZlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNsb3RGdW5jdGlvbihzbG90LCB0eXBlLCBvcmlnaW5hbEV2ZW50KTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoaW5zaWRlKSB7XG5cdFx0XHRcdFx0aW50ZXJhY3Rpb25TdGF0ZS5pbnNpZGUgPSBmYWxzZTtcblx0XHRcdFx0XHRzbG90RnVuY3Rpb24oc2xvdCwgXCJsZWF2ZVwiLCBvcmlnaW5hbEV2ZW50KTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBpc1BvaW50SW5Qb2x5Z29uICh2ZXJ0aWNlczogTnVtYmVyQXJyYXlMaWtlLCBodWxsTGVuZ3RoOiBudW1iZXIsIHBvaW50OiBudW1iZXJbXSkge1xuXHRcdGNvbnN0IFtweCwgcHldID0gcG9pbnQ7XG5cblx0XHRpZiAoaHVsbExlbmd0aCA8IDYpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkEgcG9seWdvbiBtdXN0IGhhdmUgYXQgbGVhc3QgMyB2ZXJ0aWNlcyAoNiBudW1iZXJzIGluIHRoZSBhcnJheSkuIFwiKTtcblx0XHR9XG5cblx0XHRsZXQgaXNJbnNpZGUgPSBmYWxzZTtcblxuXHRcdGZvciAobGV0IGkgPSAwLCBqID0gaHVsbExlbmd0aCAtIDI7IGkgPCBodWxsTGVuZ3RoOyBpICs9IDIpIHtcblx0XHRcdGNvbnN0IHhpID0gdmVydGljZXNbaV0sIHlpID0gdmVydGljZXNbaSArIDFdO1xuXHRcdFx0Y29uc3QgeGogPSB2ZXJ0aWNlc1tqXSwgeWogPSB2ZXJ0aWNlc1tqICsgMV07XG5cblx0XHRcdGNvbnN0IGludGVyc2VjdHMgPSAoKHlpID4gcHkpICE9PSAoeWogPiBweSkpICYmXG5cdFx0XHRcdChweCA8ICgoeGogLSB4aSkgKiAocHkgLSB5aSkpIC8gKHlqIC0geWkpICsgeGkpO1xuXG5cdFx0XHRpZiAoaW50ZXJzZWN0cykgaXNJbnNpZGUgPSAhaXNJbnNpZGU7XG5cblx0XHRcdGogPSBpO1xuXHRcdH1cblxuXHRcdHJldHVybiBpc0luc2lkZTtcblx0fVxuXG5cdC8qXG5cdCogT3RoZXIgdXRpbGl0aWVzXG5cdCovXG5cblx0cHVibGljIGJvbmVGb2xsb3dlckxpc3Q6IEFycmF5PHsgc2xvdDogU2xvdCwgYm9uZTogQm9uZSwgZWxlbWVudDogSFRNTEVsZW1lbnQsIGZvbGxvd1Zpc2liaWxpdHk6IGJvb2xlYW4sIGZvbGxvd1JvdGF0aW9uOiBib29sZWFuLCBmb2xsb3dPcGFjaXR5OiBib29sZWFuLCBmb2xsb3dTY2FsZTogYm9vbGVhbiwgaGlkZUF0dGFjaG1lbnQ6IGJvb2xlYW4gfT4gPSBbXTtcblx0cHVibGljIGZvbGxvd1Nsb3QgKHNsb3ROYW1lOiBzdHJpbmcgfCBTbG90LCBlbGVtZW50OiBIVE1MRWxlbWVudCwgb3B0aW9uczogeyBmb2xsb3dWaXNpYmlsaXR5PzogYm9vbGVhbiwgZm9sbG93Um90YXRpb24/OiBib29sZWFuLCBmb2xsb3dPcGFjaXR5PzogYm9vbGVhbiwgZm9sbG93U2NhbGU/OiBib29sZWFuLCBoaWRlQXR0YWNobWVudD86IGJvb2xlYW4gfSA9IHt9KSB7XG5cdFx0Y29uc3Qge1xuXHRcdFx0Zm9sbG93VmlzaWJpbGl0eSA9IGZhbHNlLFxuXHRcdFx0Zm9sbG93Um90YXRpb24gPSB0cnVlLFxuXHRcdFx0Zm9sbG93T3BhY2l0eSA9IHRydWUsXG5cdFx0XHRmb2xsb3dTY2FsZSA9IHRydWUsXG5cdFx0XHRoaWRlQXR0YWNobWVudCA9IGZhbHNlLFxuXHRcdH0gPSBvcHRpb25zO1xuXG5cdFx0Y29uc3Qgc2xvdCA9IHR5cGVvZiBzbG90TmFtZSA9PT0gJ3N0cmluZycgPyB0aGlzLnNrZWxldG9uPy5maW5kU2xvdChzbG90TmFtZSkgOiBzbG90TmFtZTtcblx0XHRpZiAoIXNsb3QpIHJldHVybjtcblxuXHRcdGlmIChoaWRlQXR0YWNobWVudCkge1xuXHRcdFx0c2xvdC5zZXRBdHRhY2htZW50KG51bGwpO1xuXHRcdH1cblxuXHRcdGVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuXHRcdGVsZW1lbnQuc3R5bGUudG9wID0gJzBweCc7XG5cdFx0ZWxlbWVudC5zdHlsZS5sZWZ0ID0gJzBweCc7XG5cdFx0ZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG5cdFx0dGhpcy5ib25lRm9sbG93ZXJMaXN0LnB1c2goeyBzbG90LCBib25lOiBzbG90LmJvbmUsIGVsZW1lbnQsIGZvbGxvd1Zpc2liaWxpdHksIGZvbGxvd1JvdGF0aW9uLCBmb2xsb3dPcGFjaXR5LCBmb2xsb3dTY2FsZSwgaGlkZUF0dGFjaG1lbnQgfSk7XG5cdFx0dGhpcy5vdmVybGF5LmFkZFNsb3RGb2xsb3dlckVsZW1lbnQoZWxlbWVudCk7XG5cdH1cblx0cHVibGljIHVuZm9sbG93U2xvdCAoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCB7XG5cdFx0Y29uc3QgaW5kZXggPSB0aGlzLmJvbmVGb2xsb3dlckxpc3QuZmluZEluZGV4KGUgPT4gZS5lbGVtZW50ID09PSBlbGVtZW50KTtcblx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuYm9uZUZvbGxvd2VyTGlzdC5zcGxpY2UoaW5kZXgsIDEpWzBdLmVsZW1lbnQ7XG5cdFx0fVxuXHR9XG5cblx0cHVibGljIGlzT2ZmU2NyZWVuQW5kV2FzTW92ZWQgKCk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiAhdGhpcy5vblNjcmVlbiAmJiB0aGlzLmRyYWdYID09PSAwICYmIHRoaXMuZHJhZ1kgPT09IDA7XG5cdH1cblxuXHRwcml2YXRlIGNhbGN1bGF0ZUFuaW1hdGlvblZpZXdwb3J0IChhbmltYXRpb24/OiBBbmltYXRpb24pOiBSZWN0YW5nbGUge1xuXHRcdGNvbnN0IHJlbmRlcmVyID0gdGhpcy5vdmVybGF5LnJlbmRlcmVyO1xuXHRcdGNvbnN0IHsgc2tlbGV0b24gfSA9IHRoaXM7XG5cdFx0aWYgKCFza2VsZXRvbikgcmV0dXJuIHsgeDogMCwgeTogMCwgd2lkdGg6IDAsIGhlaWdodDogMCB9O1xuXHRcdHNrZWxldG9uLnNldFRvU2V0dXBQb3NlKCk7XG5cblx0XHRsZXQgb2Zmc2V0ID0gbmV3IFZlY3RvcjIoKSwgc2l6ZSA9IG5ldyBWZWN0b3IyKCk7XG5cdFx0Y29uc3QgdGVtcEFycmF5ID0gbmV3IEFycmF5PG51bWJlcj4oMik7XG5cdFx0aWYgKCFhbmltYXRpb24pIHtcblx0XHRcdHNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKFBoeXNpY3MudXBkYXRlKTtcblx0XHRcdHNrZWxldG9uLmdldEJvdW5kcyhvZmZzZXQsIHNpemUsIHRlbXBBcnJheSwgcmVuZGVyZXIuc2tlbGV0b25SZW5kZXJlci5nZXRTa2VsZXRvbkNsaXBwaW5nKCkpO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogb2Zmc2V0LngsXG5cdFx0XHRcdHk6IG9mZnNldC55LFxuXHRcdFx0XHR3aWR0aDogc2l6ZS54LFxuXHRcdFx0XHRoZWlnaHQ6IHNpemUueSxcblx0XHRcdH1cblx0XHR9XG5cblx0XHRsZXQgc3RlcHMgPSAxMDAsIHN0ZXBUaW1lID0gYW5pbWF0aW9uLmR1cmF0aW9uID8gYW5pbWF0aW9uLmR1cmF0aW9uIC8gc3RlcHMgOiAwLCB0aW1lID0gMDtcblx0XHRsZXQgbWluWCA9IDEwMDAwMDAwMCwgbWF4WCA9IC0xMDAwMDAwMDAsIG1pblkgPSAxMDAwMDAwMDAsIG1heFkgPSAtMTAwMDAwMDAwO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgc3RlcHM7IGkrKywgdGltZSArPSBzdGVwVGltZSkge1xuXHRcdFx0YW5pbWF0aW9uLmFwcGx5KHNrZWxldG9uLCB0aW1lLCB0aW1lLCBmYWxzZSwgW10sIDEsIE1peEJsZW5kLnNldHVwLCBNaXhEaXJlY3Rpb24ubWl4SW4pO1xuXHRcdFx0c2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oUGh5c2ljcy51cGRhdGUpO1xuXHRcdFx0c2tlbGV0b24uZ2V0Qm91bmRzKG9mZnNldCwgc2l6ZSwgdGVtcEFycmF5LCByZW5kZXJlci5za2VsZXRvblJlbmRlcmVyLmdldFNrZWxldG9uQ2xpcHBpbmcoKSk7XG5cblx0XHRcdGlmICghaXNOYU4ob2Zmc2V0LngpICYmICFpc05hTihvZmZzZXQueSkgJiYgIWlzTmFOKHNpemUueCkgJiYgIWlzTmFOKHNpemUueSkgJiZcblx0XHRcdFx0IWlzTmFOKG1pblgpICYmICFpc05hTihtaW5ZKSAmJiAhaXNOYU4obWF4WCkgJiYgIWlzTmFOKG1heFkpKSB7XG5cdFx0XHRcdG1pblggPSBNYXRoLm1pbihvZmZzZXQueCwgbWluWCk7XG5cdFx0XHRcdG1heFggPSBNYXRoLm1heChvZmZzZXQueCArIHNpemUueCwgbWF4WCk7XG5cdFx0XHRcdG1pblkgPSBNYXRoLm1pbihvZmZzZXQueSwgbWluWSk7XG5cdFx0XHRcdG1heFkgPSBNYXRoLm1heChvZmZzZXQueSArIHNpemUueSwgbWF4WSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4geyB4OiAwLCB5OiAwLCB3aWR0aDogLTEsIGhlaWdodDogLTEgfTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRza2VsZXRvbi5zZXRUb1NldHVwUG9zZSgpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHg6IG1pblgsXG5cdFx0XHR5OiBtaW5ZLFxuXHRcdFx0d2lkdGg6IG1heFggLSBtaW5YLFxuXHRcdFx0aGVpZ2h0OiBtYXhZIC0gbWluWSxcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGRpc3Bvc2VHTFJlc291cmNlcyAoKSB7XG5cdFx0Y29uc3QgeyBhc3NldE1hbmFnZXIgfSA9IHRoaXMub3ZlcmxheTtcblx0XHRpZiAodGhpcy5sYXN0QXRsYXNQYXRoKSBhc3NldE1hbmFnZXIuZGlzcG9zZUFzc2V0KHRoaXMubGFzdEF0bGFzUGF0aCk7XG5cdFx0aWYgKHRoaXMubGFzdFNrZWxQYXRoKSBhc3NldE1hbmFnZXIuZGlzcG9zZUFzc2V0KHRoaXMubGFzdFNrZWxQYXRoKTtcblx0fVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcInNwaW5lLXNrZWxldG9uXCIsIFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24pO1xuXG4vKipcbiAqIFJldHVybiB0aGUgZmlyc3Qge0BsaW5rIFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b259IHdpdGggdGhlIGdpdmVuIHtAbGluayBTcGluZVdlYkNvbXBvbmVudFNrZWxldG9uLmlkZW50aWZpZXJ9XG4gKiBAcGFyYW0gaWRlbnRpZmllciBUaGUge0BsaW5rIFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24uaWRlbnRpZmllcn0gdG8gc2VhcmNoIG9uIHRoZSBET01cbiAqIEByZXR1cm5zIEEgc2tlbGV0b24gd2ViIGNvbXBvbmVudCBpbnN0YW5jZSB3aXRoIHRoZSBnaXZlbiBpZGVudGlmaWVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTa2VsZXRvbiAoaWRlbnRpZmllcjogc3RyaW5nKTogU3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbiB7XG5cdHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBzcGluZS1za2VsZXRvbltpZGVudGlmaWVyPSR7aWRlbnRpZmllcn1dYCkgYXMgU3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbjtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSB7QGxpbmsgU3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbn0gd2l0aCB0aGUgZ2l2ZW4ge0BsaW5rIFdpZGdldEF0dHJpYnV0ZXN9LlxuICogQHBhcmFtIHBhcmFtZXRlcnMgVGhlIG9wdGlvbnMgdG8gcGFzcyB0byB0aGUge0BsaW5rIFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b259XG4gKiBAcmV0dXJucyBUaGUgc2tlbGV0b24gd2ViIGNvbXBvbmVudCBpbnN0YW5jZSBjcmVhdGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTa2VsZXRvbiAocGFyYW1ldGVyczogV2lkZ2V0QXR0cmlidXRlcyk6IFNwaW5lV2ViQ29tcG9uZW50U2tlbGV0b24ge1xuXHRjb25zdCB3aWRnZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BpbmUtc2tlbGV0b25cIikgYXMgU3BpbmVXZWJDb21wb25lbnRTa2VsZXRvbjtcblxuXHRPYmplY3QuZW50cmllcyhTcGluZVdlYkNvbXBvbmVudFNrZWxldG9uLmF0dHJpYnV0ZXNEZXNjcmlwdGlvbikuZm9yRWFjaChlbnRyeSA9PiB7XG5cdFx0Y29uc3QgW2tleSwgeyBwcm9wZXJ0eU5hbWUgfV0gPSBlbnRyeTtcblx0XHRjb25zdCB2YWx1ZSA9IHBhcmFtZXRlcnNbcHJvcGVydHlOYW1lXTtcblx0XHRpZiAodmFsdWUpIHdpZGdldC5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSBhcyBhbnkpO1xuXHR9KTtcblxuXHRyZXR1cm4gd2lkZ2V0O1xufVxuIl19