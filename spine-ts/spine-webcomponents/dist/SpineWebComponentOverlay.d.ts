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
import { AssetManager, Disposable, SceneRenderer, TimeKeeper, Vector3 } from "@esotericsoftware/spine-webgl";
import { SpineWebComponentSkeleton } from "./SpineWebComponentSkeleton.js";
import { AttributeTypes } from "./wcUtils.js";
interface OverlayAttributes {
    overlayId?: string;
    noAutoParentTransform: boolean;
    overflowTop: number;
    overflowBottom: number;
    overflowLeft: number;
    overflowRight: number;
}
export declare class SpineWebComponentOverlay extends HTMLElement implements OverlayAttributes, Disposable {
    private static OVERLAY_ID;
    private static OVERLAY_LIST;
    /**
     * @internal
     */
    static getOrCreateOverlay(overlayId: string | null): SpineWebComponentOverlay;
    /**
     * If true, enables a top-left span showing FPS (it has black text)
     */
    static SHOW_FPS: boolean;
    /**
     * A list holding the widgets added to this overlay.
     */
    widgets: SpineWebComponentSkeleton[];
    /**
     * The {@link SceneRenderer} used by this overlay.
     */
    renderer: SceneRenderer;
    /**
     * The {@link AssetManager} used by this overlay.
     */
    assetManager: AssetManager;
    /**
     * The identifier of this overlay. This is necessary when multiply overlay are created.
       * Connected to `overlay-id` attribute.
     */
    overlayId?: string;
    /**
     * If `false` (default value), the overlay container style will be affected adding `transform: translateZ(0);` to it.
     * The `transform` is not affected if it already exists on the container.
     * This is necessary to make the scrolling works with containers that scroll in a different way with respect to the page, as explained in {@link appendedToBody}.
     * Connected to `no-auto-parent-transform` attribute.
     */
    noAutoParentTransform: boolean;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport height, the pixels to add to the top of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.2.
     * Connected to `overflow-top` attribute.
     */
    overflowTop: number;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport height, the pixels to add to the bottom of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.
     * Connected to `overflow-bottom` attribute.
     */
    overflowBottom: number;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport width, the pixels to add to the left of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.
     * Connected to `overflow-left` attribute.
     */
    overflowLeft: number;
    /**
     * The canvas is continuously translated so that it covers the viewport. This translation might be slightly slower during fast scrolling.
     * If the canvas has the same size as the viewport, while scrolling it might be slighlty misaligned with the viewport.
     * This parameter defines, as percentage of the viewport width, the pixels to add to the right of the canvas to prevent this effect.
     * Making the canvas too big might reduce performance.
     * Default value: 0.
     * Connected to `overflow-right` attribute.
     */
    overflowRight: number;
    private root;
    private div;
    private boneFollowersParent;
    private canvas;
    private fps;
    private fpsAppended;
    private intersectionObserver?;
    private resizeObserver?;
    private input?;
    private overflowLeftSize;
    private overflowTopSize;
    private lastCanvasBaseWidth;
    private lastCanvasBaseHeight;
    private zIndex?;
    private disposed;
    private loaded;
    private running;
    private visible;
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
    private appendedToBody;
    private hasParentTransform;
    readonly time: TimeKeeper;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    static attributesDescription: Record<string, {
        propertyName: keyof OverlayAttributes;
        type: AttributeTypes;
        defaultValue?: any;
    }>;
    static get observedAttributes(): string[];
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    private visibilityChangeCallback;
    private windowResizeCallback;
    private resizedCallback;
    private orientationChangedCallback;
    private scrolledCallback;
    private loadedCallback;
    private hasCssTweakOff;
    /**
     * Remove the overlay from the DOM, dispose all the contained widgets, and dispose the renderer.
     */
    dispose(): void;
    /**
     * Add the widget to the overlay.
     * If the widget is after the overlay in the DOM, the overlay is appended after the widget.
     * @param widget The widget to add to the overlay
     */
    addWidget(widget: SpineWebComponentSkeleton): void;
    /**
     * Remove the widget from the overlay.
     * @param widget The widget to remove from the overlay
     */
    removeWidget(widget: SpineWebComponentSkeleton): boolean;
    addSlotFollowerElement(element: HTMLElement): void;
    private tempFollowBoneVector;
    private startRenderingLoop;
    pointerCanvasX: number;
    pointerCanvasY: number;
    pointerWorldX: number;
    pointerWorldY: number;
    private tempVector;
    private updatePointer;
    private updateWidgetPointer;
    private setupDragUtility;
    private updateCanvasSize;
    private resize;
    private getPageSize;
    private lastViewportWidth;
    private lastViewportHeight;
    private lastDPR;
    private static readonly WIDTH_INCREMENT;
    private static readonly HEIGHT_INCREMENT;
    private static readonly MAX_CANVAS_WIDTH;
    private static readonly MAX_CANVAS_HEIGHT;
    private getViewportSize;
    /**
     * @internal
     */
    getDevicePixelRatio(): number;
    private dprScale;
    private updateWidgetScales;
    private translateCanvas;
    private updateZIndexIfNecessary;
    screenToWorld(vec: Vector3, x: number, y: number): void;
    worldToScreen(vec: Vector3, x: number, y: number): void;
    screenToWorldLength(length: number): number;
    worldToScreenLength(length: number): number;
}
export {};
