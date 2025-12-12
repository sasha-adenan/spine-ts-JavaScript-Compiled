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
import { AnimationState, Bone, Disposable, LoadingScreen, Skeleton, SkeletonData, Slot, TextureAtlas } from "@esotericsoftware/spine-webgl";
import { AttributeTypes, Rectangle } from "./wcUtils.js";
type UpdateSpineWidgetFunction = (delta: number, skeleton: Skeleton, state: AnimationState) => void;
export type OffScreenUpdateBehaviourType = "pause" | "update" | "pose";
export type FitType = "fill" | "width" | "height" | "contain" | "cover" | "none" | "scaleDown" | "origin";
export type AnimationsInfo = Record<string, {
    cycle?: boolean;
    repeatDelay?: number;
    animations: Array<AnimationsType>;
}>;
export type AnimationsType = {
    animationName: string | "#EMPTY#";
    loop?: boolean;
    delay?: number;
    mixDuration?: number;
};
export type PointerEventType = "down" | "up" | "enter" | "leave" | "move" | "drag";
export type PointerEventTypesInput = Exclude<PointerEventType, "enter" | "leave">;
interface WidgetAttributes {
    atlasPath?: string;
    skeletonPath?: string;
    rawData?: Record<string, string>;
    jsonSkeletonKey?: string;
    scale: number;
    animation?: string;
    animations?: AnimationsInfo;
    defaultMix?: number;
    skin?: string[];
    fit: FitType;
    xAxis: number;
    yAxis: number;
    offsetX: number;
    offsetY: number;
    padLeft: number;
    padRight: number;
    padTop: number;
    padBottom: number;
    animationsBound?: string[];
    boundsX: number;
    boundsY: number;
    boundsWidth: number;
    boundsHeight: number;
    autoCalculateBounds: boolean;
    width: number;
    height: number;
    drag: boolean;
    interactive: boolean;
    debug: boolean;
    identifier: string;
    manualStart: boolean;
    startWhenVisible: boolean;
    pages?: Array<number>;
    clip: boolean;
    offScreenUpdateBehaviour: OffScreenUpdateBehaviourType;
    spinner: boolean;
}
interface WidgetOverridableMethods {
    update?: UpdateSpineWidgetFunction;
    beforeUpdateWorldTransforms: UpdateSpineWidgetFunction;
    afterUpdateWorldTransforms: UpdateSpineWidgetFunction;
    onScreenFunction: (widget: SpineWebComponentSkeleton) => void;
}
interface WidgetPublicProperties {
    skeleton: Skeleton;
    state: AnimationState;
    bounds: Rectangle;
    onScreen: boolean;
    onScreenAtLeastOnce: boolean;
    whenReady: Promise<SpineWebComponentSkeleton>;
    loading: boolean;
    started: boolean;
    textureAtlas: TextureAtlas;
    disposed: boolean;
}
interface WidgetInternalProperties {
    pma: boolean;
    dprScale: number;
    dragging: boolean;
    dragX: number;
    dragY: number;
}
export declare class SpineWebComponentSkeleton extends HTMLElement implements Disposable, WidgetAttributes, WidgetOverridableMethods, WidgetInternalProperties, Partial<WidgetPublicProperties> {
    /**
     * The URL of the skeleton atlas file (.atlas)
     * Connected to `atlas` attribute.
     */
    atlasPath?: string;
    /**
     * The URL of the skeleton JSON (.json) or binary (.skel) file
     * Connected to `skeleton` attribute.
     */
    skeletonPath?: string;
    /**
     * Holds the assets in base64 format.
     * Connected to `raw-data` attribute.
     */
    rawData?: Record<string, string>;
    /**
     * The name of the skeleton when the skeleton file is a JSON and contains multiple skeletons.
     * Connected to `json-skeleton-key` attribute.
     */
    jsonSkeletonKey?: string;
    /**
     * The scale passed to the Skeleton Loader. SkeletonData values will be scaled accordingly.
     * Default: 1
     * Connected to `scale` attribute.
     */
    scale: number;
    /**
     * Optional: The name of the animation to be played. When set, the widget is reinitialized.
     * Connected to `animation` attribute.
     */
    get animation(): string | undefined;
    set animation(value: string | undefined);
    private _animation?;
    /**
     * An {@link AnimationsInfo} that describes a sequence of animations on different tracks.
     * Connected to `animations` attribute, but since attributes are string, there's a different form to pass it.
     * It is a string composed of groups surrounded by square brackets. Each group has 5 parameters, the firsts 2 mandatory. They corresponds to: track, animation name, loop, delay, mix time.
     * For the first group on a track {@link AnimationState.setAnimation} is used, while {@link AnimationState.addAnimation} is used for the others.
     * If you use the special token #EMPTY# as animation name {@link AnimationState.setEmptyAnimation} and {@link AnimationState.addEmptyAnimation} iare used respectively.
     * Use the special group [loop, trackNumber], to allow the animation of the track on the given trackNumber to restart from the beginning once finished.
     */
    get animations(): AnimationsInfo | undefined;
    set animations(value: AnimationsInfo | undefined);
    _animations?: AnimationsInfo;
    /**
     * Optional: The default mix set to the {@link AnimationStateData.defaultMix}.
     * Connected to `default-mix` attribute.
     */
    get defaultMix(): number;
    set defaultMix(value: number | undefined);
    _defaultMix: number;
    /**
     * Optional: The name of the skin to be set
     * Connected to `skin` attribute.
     */
    get skin(): string[] | undefined;
    set skin(value: string[] | undefined);
    private _skin?;
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
    fit: FitType;
    /**
     * The x offset of the skeleton world origin x axis as a percentage of the element container width
     * Connected to `x-axis` attribute.
     */
    xAxis: number;
    /**
     * The y offset of the skeleton world origin x axis as a percentage of the element container height
     * Connected to `y-axis` attribute.
     */
    yAxis: number;
    /**
     * The x offset of the root in pixels wrt to the skeleton world origin
     * Connected to `offset-x` attribute.
     */
    offsetX: number;
    /**
     * The y offset of the root in pixels wrt to the skeleton world origin
     * Connected to `offset-y` attribute.
     */
    offsetY: number;
    /**
     * A padding that shrink the element container virtually from left as a percentage of the element container width
     * Connected to `pad-left` attribute.
     */
    padLeft: number;
    /**
     * A padding that shrink the element container virtually from right as a percentage of the element container width
     * Connected to `pad-right` attribute.
     */
    padRight: number;
    /**
     * A padding that shrink the element container virtually from the top as a percentage of the element container height
     * Connected to `pad-top` attribute.
     */
    padTop: number;
    /**
     * A padding that shrink the element container virtually from the bottom as a percentage of the element container height
     * Connected to `pad-bottom` attribute.
     */
    padBottom: number;
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
    bounds: Rectangle;
    /**
     * The x of the bounds in Spine world coordinates
     * Connected to `bound-x` attribute.
     */
    get boundsX(): number;
    set boundsX(value: number);
    /**
     * The y of the bounds in Spine world coordinates
     * Connected to `bound-y` attribute.
     */
    get boundsY(): number;
    set boundsY(value: number);
    /**
     * The width of the bounds in Spine world coordinates
     * Connected to `bound-width` attribute.
     */
    get boundsWidth(): number;
    set boundsWidth(value: number);
    /**
     * The height of the bounds in Spine world coordinates
     * Connected to `bound-height` attribute.
     */
    get boundsHeight(): number;
    set boundsHeight(value: number);
    /**
     * Optional: an array of animation names that are used to calculate the bounds of the skeleton.
     * Connected to `animations-bound` attribute.
     */
    animationsBound?: string[];
    /**
     * Whether or not the bounds are recalculated when an animation or a skin is changed. `false` by default.
     * Connected to `auto-calculate-bounds` attribute.
     */
    autoCalculateBounds: boolean;
    /**
     * Specify a fixed width for the widget. If at least one of `width` and `height` is > 0,
     * the widget will have an actual size and the element container reference is the widget itself, not the element container parent.
     * Connected to `width` attribute.
     */
    get width(): number;
    set width(value: number);
    private _width;
    /**
     * Specify a fixed height for the widget. If at least one of `width` and `height` is > 0,
     * the widget will have an actual size and the element container reference is the widget itself, not the element container parent.
     * Connected to `height` attribute.
     */
    get height(): number;
    set height(value: number);
    private _height;
    /**
     * If true, the widget is draggable
     * Connected to `drag` attribute.
     */
    drag: boolean;
    /**
     * The x of the root relative to the canvas/webgl context center in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    worldX: number;
    /**
     * The y of the root relative to the canvas/webgl context center in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    worldY: number;
    /**
     * The x coordinate of the pointer relative to the pointer relative to the skeleton root in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    pointerWorldX: number;
    /**
     * The x coordinate of the pointer relative to the pointer relative to the skeleton root in spine world coordinates.
     * This is an experimental property and might be removed in the future.
     */
    pointerWorldY: number;
    /**
     * If true, the widget is interactive
     * Connected to `interactive` attribute.
     * This is an experimental property and might be removed in the future.
     */
    interactive: boolean;
    /**
     * If the widget is interactive, this method is invoked with a {@link PointerEventType} when the pointer
     * performs actions within the widget bounds (for example, it enter or leaves the bounds).
     * By default, the function does nothing.
     * This is an experimental property and might be removed in the future.
     */
    pointerEventCallback: (event: PointerEventType, originalEvent?: UIEvent) => void;
    /**
     * This methods allows to associate to a Slot a callback. For these slots, if the widget is interactive,
     * when the pointer performs actions within the slot's attachment the associated callback is invoked with
     * a {@link PointerEventType} (for example, it enter or leaves the slot's attachment bounds).
     * This is an experimental property and might be removed in the future.
     */
    addPointerSlotEventCallback(slot: number | string | Slot, slotFunction: (slot: Slot, event: PointerEventType) => void): void;
    /**
     * Remove callbacks added through {@link addPointerSlotEventCallback}.
     * @param slot: the slot reference to which remove the associated callback
     */
    removePointerSlotEventCallbacks(slot: number | string | Slot): void;
    private getSlotFromRef;
    /**
     * If true, some convenience elements are drawn to show the skeleton world origin (green),
     * the root (red), and the bounds rectangle (blue)
     * Connected to `debug` attribute.
     */
    debug: boolean;
    /**
     * An identifier to obtain this widget using the {@link getSkeleton} function.
     * This is useful when you need to interact with the widget using js.
     * Connected to `identifier` attribute.
     */
    identifier: string;
    /**
     * If false, assets loading are loaded immediately and the skeleton shown as soon as the assets are loaded
     * If true, it is necessary to invoke the start method to start the widget and the loading process
     * Connected to `manual-start` attribute.
     */
    manualStart: boolean;
    /**
     * If true, automatically sets manualStart to true to pervent widget to start immediately.
     * Then, in combination with the default {@link onScreenFunction}, the widget {@link start}
     * the first time it enters the viewport.
     * This is useful when you want to load the assets only when the widget is revealed.
     * By default, is false.
     * Connected to `start-when-visible` attribute.
     */
    set startWhenVisible(value: boolean);
    get startWhenVisible(): boolean;
    _startWhenVisible: boolean;
    /**
     * An array of indexes indicating the atlas pages indexes to be loaded.
     * If undefined, all pages are loaded. If empty (default), no page is loaded;
     * in this case the user can add later the indexes of the pages they want to load
     * and call the loadTexturesInPagesAttribute, to lazily load them.
     * Connected to `pages` attribute.
     */
    pages?: Array<number>;
    /**
     * If `true`, the skeleton is clipped to the element container bounds.
     * Be careful on using this feature because it breaks batching!
     * Connected to `clip` attribute.
     */
    clip: boolean;
    /**
     * The widget update/apply behaviour when the skeleton element container is offscreen:
     * - `pause`: the state is not updated, neither applied (Default)
     * - `update`: the state is updated, but not applied
     * - `pose`: the state is updated and applied
     * Connected to `offscreen` attribute.
     */
    offScreenUpdateBehaviour: OffScreenUpdateBehaviourType;
    /**
     * If true, a Spine loading spinner is shown during asset loading. Default to false.
     * Connected to `spinner` attribute.
     */
    spinner: boolean;
    /**
     * Replace the default state and skeleton update logic for this widget.
     * @param delta - The milliseconds elapsed since the last update.
     * @param skeleton - The widget's skeleton
     * @param state - The widget's state
     */
    update?: UpdateSpineWidgetFunction;
    /**
     * This callback is invoked before the world transforms are computed allows to execute additional logic.
     */
    beforeUpdateWorldTransforms: UpdateSpineWidgetFunction;
    /**
     * This callback is invoked after the world transforms are computed allows to execute additional logic.
     */
    afterUpdateWorldTransforms: UpdateSpineWidgetFunction;
    /**
     * A callback invoked each time the element container enters the screen viewport.
     * By default, the callback call the {@link start} method the first time the widget
     * enters the screen viewport and {@link startWhenVisible} is `true`.
     */
    onScreenFunction: (widget: SpineWebComponentSkeleton) => void;
    /**
     * The skeleton hosted by this widget. It's ready once assets are loaded.
     * Safely acces this property by using {@link whenReady}.
     */
    skeleton?: Skeleton;
    /**
     * The animation state hosted by this widget. It's ready once assets are loaded.
     * Safely acces this property by using {@link whenReady}.
     */
    state?: AnimationState;
    /**
     * The textureAtlas used by this widget to reference attachments. It's ready once assets are loaded.
     * Safely acces this property by using {@link whenReady}.
     */
    textureAtlas?: TextureAtlas;
    /**
     * A Promise that resolve to the widget itself once assets loading is terminated.
     * Useful to safely access {@link skeleton} and {@link state} after a new widget has been just created.
     */
    get whenReady(): Promise<this>;
    private _whenReady;
    /**
     * If true, the widget is in the assets loading process.
     */
    loading: boolean;
    /**
     * The {@link LoadingScreenWidget} of this widget.
     * This is instantiated only if it is really necessary.
     * For example, if {@link spinner} is `false`, this property value is null
     */
    loadingScreen: LoadingScreen | null;
    /**
     * If true, the widget is in the assets loading process.
     */
    started: boolean;
    /**
     * True, when the element container enters the screen viewport. It uses an IntersectionObserver internally.
     */
    onScreen: boolean;
    /**
     * True, when the element container enters the screen viewport at least once.
     * It uses an IntersectionObserver internally.
     */
    onScreenAtLeastOnce: boolean;
    /**
     * @internal
     * Holds the dpr (devicePixelRatio) currently used to calculate the scale for this skeleton
     * Do not rely on this properties. It might be made private in the future.
     */
    dprScale: number;
    /**
     * @internal
     * The accumulated offset on the x axis due to dragging
     * Do not rely on this properties. It might be made private in the future.
     */
    dragX: number;
    /**
     * @internal
     * The accumulated offset on the y axis due to dragging
     * Do not rely on this properties. It might be made private in the future.
     */
    dragY: number;
    /**
     * @internal
     * If true, the widget is currently being dragged
     * Do not rely on this properties. It might be made private in the future.
     */
    dragging: boolean;
    /**
     * @internal
     * If true, the widget has texture with premultiplied alpha
     * Do not rely on this properties. It might be made private in the future.
     */
    pma: boolean;
    /**
     * If true, indicate {@link dispose} has been called and the widget cannot be used anymore
     */
    disposed: boolean;
    /**
     * Optional: Pass a `SkeletonData`, if you want to avoid creating a new one
     */
    skeletonData?: SkeletonData;
    private root;
    private overlay;
    private resolveLoadingPromise;
    private resolveOverlayAssignedPromise;
    private overlayAssignedPromise;
    static attributesDescription: Record<string, {
        propertyName: keyof WidgetAttributes;
        type: AttributeTypes;
        defaultValue?: any;
    }>;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    private initAfterConnect;
    private DOMContentLoadedCallback;
    disconnectedCallback(): void;
    /**
     * Remove the widget from the overlay and the DOM.
     */
    dispose(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    /**
     * Starts the widget. Starting the widget means to load the assets currently set into
     * {@link atlasPath} and {@link skeletonPath}. If start is invoked when the widget is already started,
     * the skeleton and the state are reset. Bounds are recalculated only if {@link autoCalculateBounds} is true.
     */
    start(): void;
    /**
     * Loads the texture pages in the given `atlas` corresponding to the indexes set into {@link pages}.
     * This method is automatically called during asset loading. When `pages` is undefined (default),
     * all pages are loaded. This method is useful when you want to load a subset of pages programmatically.
     * In that case, set `pages` to an empty array at the beginning.
     * Then set the pages you want to load and invoke this method.
     * @param atlas the `TextureAtlas` from which to get the `TextureAtlasPage`s
     * @returns The list of loaded assets
     */
    loadTexturesInPagesAttribute(): Promise<Array<any>>;
    /**
     * @returns The `HTMLElement` where the widget is hosted.
     */
    getHostElement(): HTMLElement;
    /**
     * Append the widget to the given `HTMLElement`.
     * @param atlas the `HTMLElement` to append this widget to.
     */
    appendTo(element: HTMLElement): Promise<void>;
    /**
     * Calculates and sets the bounds of the current animation on track 0.
     * Useful when animations or skins are set programmatically.
     * @returns void
     */
    calculateBounds(forcedRecalculate?: boolean): void;
    private lastSkelPath;
    private lastAtlasPath;
    private lastTexturePaths;
    private loadSkeleton;
    private initWidget;
    private render;
    /**
     * @internal
     */
    pointerInsideBounds: boolean;
    private verticesTemp;
    /**
     * @internal
     */
    pointerSlotEventCallbacks: Map<Slot, {
        slotFunction: (slot: Slot, event: PointerEventType, originalEvent?: UIEvent) => void;
        inside: boolean;
    }>;
    /**
     * @internal
     */
    pointerEventUpdate(type: PointerEventTypesInput, originalEvent?: UIEvent): void;
    private checkBoundsInteraction;
    /**
     * @internal
     */
    isPointerInsideBounds(): boolean;
    private checkSlotInteraction;
    private isPointInPolygon;
    boneFollowerList: Array<{
        slot: Slot;
        bone: Bone;
        element: HTMLElement;
        followVisibility: boolean;
        followRotation: boolean;
        followOpacity: boolean;
        followScale: boolean;
        hideAttachment: boolean;
    }>;
    followSlot(slotName: string | Slot, element: HTMLElement, options?: {
        followVisibility?: boolean;
        followRotation?: boolean;
        followOpacity?: boolean;
        followScale?: boolean;
        hideAttachment?: boolean;
    }): void;
    unfollowSlot(element: HTMLElement): HTMLElement | undefined;
    isOffScreenAndWasMoved(): boolean;
    private calculateAnimationViewport;
    private disposeGLResources;
}
/**
 * Return the first {@link SpineWebComponentSkeleton} with the given {@link SpineWebComponentSkeleton.identifier}
 * @param identifier The {@link SpineWebComponentSkeleton.identifier} to search on the DOM
 * @returns A skeleton web component instance with the given identifier
 */
export declare function getSkeleton(identifier: string): SpineWebComponentSkeleton;
/**
 * Create a {@link SpineWebComponentSkeleton} with the given {@link WidgetAttributes}.
 * @param parameters The options to pass to the {@link SpineWebComponentSkeleton}
 * @returns The skeleton web component instance created
 */
export declare function createSkeleton(parameters: WidgetAttributes): SpineWebComponentSkeleton;
export {};
