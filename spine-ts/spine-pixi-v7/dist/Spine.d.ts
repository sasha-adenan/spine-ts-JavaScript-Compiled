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
import type { BlendMode, Bone, Event, NumberArrayLike, Slot, TrackEntry } from "@esotericsoftware/spine-core";
import { AnimationState, Skeleton, SkeletonData } from "@esotericsoftware/spine-core";
import type { SpineTexture } from "./SpineTexture.js";
import type { ISpineDebugRenderer } from "./SpineDebugRenderer.js";
import { IPointData } from "@pixi/core";
import type { IDestroyOptions, DisplayObject } from "@pixi/display";
import { Container } from "@pixi/display";
import "@pixi/events";
/**
 * @deprecated Use SpineFromOptions and SpineOptions.
 * Options to configure a {@link Spine} game object.
 */
export interface ISpineOptions {
    /**  Set the {@link Spine.autoUpdate} value. If omitted, it is set to `true`. */
    autoUpdate?: boolean;
    /**  The value passed to the skeleton reader. If omitted, 1 is passed. See {@link SkeletonBinary.scale} for details. */
    scale?: number;
    /**
     * @deprecated Use darkTint option instead.
     * A factory to override the default ones to render Spine meshes ({@link DarkSlotMesh} or {@link SlotMesh}).
     * If omitted, a factory returning a ({@link DarkSlotMesh} or {@link SlotMesh}) will be used depending on the presence of
     * a dark tint mesh in the skeleton.
     * */
    slotMeshFactory?: () => ISlotMesh;
}
/**
 * Options to create a {@link Spine} using {@link Spine.from}.
 */
export interface SpineFromOptions {
    /** the asset name for the skeleton `.skel` or `.json` file previously loaded into the Assets */
    skeleton: string;
    /** the asset name for the atlas file previously loaded into the Assets */
    atlas: string;
    /**  The value passed to the skeleton reader. If omitted, 1 is passed. See {@link SkeletonBinary.scale} for details. */
    scale?: number;
    /**  Set the {@link Spine.autoUpdate} value. If omitted, it is set to `true`. */
    autoUpdate?: boolean;
    /**
     * If `true`, use the dark tint renderer to render the skeleton
     * If `false`, use the default pixi renderer to render the skeleton
     * If `undefined`, use the dark tint renderer if at least one slot has tint black
     */
    darkTint?: boolean;
    /** The bounds provider to use. If undefined the bounds will be dynamic, calculated when requested and based on the current frame. */
    boundsProvider?: SpineBoundsProvider;
}
export interface SpineOptions {
    /** the {@link SkeletonData} used to instantiate the skeleton */
    skeletonData: SkeletonData;
    /**  See {@link SpineFromOptions.autoUpdate}. */
    autoUpdate?: boolean;
    /**  See {@link SpineFromOptions.darkTint}. */
    darkTint?: boolean;
    /**  See {@link SpineFromOptions.boundsProvider}. */
    boundsProvider?: SpineBoundsProvider;
}
/**
 * AnimationStateListener {@link https://en.esotericsoftware.com/spine-api-reference#AnimationStateListener events} exposed for Pixi.
 */
export interface SpineEvents {
    complete: [trackEntry: TrackEntry];
    dispose: [trackEntry: TrackEntry];
    end: [trackEntry: TrackEntry];
    event: [trackEntry: TrackEntry, event: Event];
    interrupt: [trackEntry: TrackEntry];
    start: [trackEntry: TrackEntry];
}
/** A bounds provider calculates the bounding box for a skeleton, which is then assigned as the size of the SpineGameObject. */
export interface SpineBoundsProvider {
    /** Returns the bounding box for the skeleton, in skeleton space. */
    calculateBounds(gameObject: Spine): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/** A bounds provider that provides a fixed size given by the user. */
export declare class AABBRectangleBoundsProvider implements SpineBoundsProvider {
    private x;
    private y;
    private width;
    private height;
    constructor(x: number, y: number, width: number, height: number);
    calculateBounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/** A bounds provider that calculates the bounding box from the setup pose. */
export declare class SetupPoseBoundsProvider implements SpineBoundsProvider {
    private clipping;
    /**
     * @param clipping If true, clipping attachments are used to compute the bounds. False, by default.
     */
    constructor(clipping?: boolean);
    calculateBounds(gameObject: Spine): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/** A bounds provider that calculates the bounding box by taking the maximumg bounding box for a combination of skins and specific animation. */
export declare class SkinsAndAnimationBoundsProvider implements SpineBoundsProvider {
    private animation;
    private skins;
    private timeStep;
    private clipping;
    /**
     * @param animation The animation to use for calculating the bounds. If null, the setup pose is used.
     * @param skins The skins to use for calculating the bounds. If empty, the default skin is used.
     * @param timeStep The time step to use for calculating the bounds. A smaller time step means more precision, but slower calculation.
     * @param clipping If true, clipping attachments are used to compute the bounds. False, by default.
     */
    constructor(animation: string | null, skins?: string[], timeStep?: number, clipping?: boolean);
    calculateBounds(gameObject: Spine): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/**
 * The class to instantiate a {@link Spine} game object in Pixi.
 * The static method {@link Spine.from} should be used to instantiate a Spine game object.
 */
export declare class Spine extends Container {
    /** The skeleton for this Spine game object. */
    skeleton: Skeleton;
    /** The animation state for this Spine game object. */
    state: AnimationState;
    private darkTint;
    private hasNeverUpdated;
    private _debug?;
    get debug(): ISpineDebugRenderer | undefined;
    /** Pass a {@link SpineDebugRenderer} or create your own {@link ISpineDebugRenderer} to render bones, meshes, ...
     * @example spineGO.debug = new SpineDebugRenderer();
     */
    set debug(value: ISpineDebugRenderer | undefined);
    protected slotMeshFactory: () => ISlotMesh;
    beforeUpdateWorldTransforms: (object: Spine) => void;
    afterUpdateWorldTransforms: (object: Spine) => void;
    private _autoUpdate;
    get autoUpdate(): boolean;
    /** When `true`, the Spine AnimationState and the Skeleton will be automatically updated using the {@link Ticker.shared} instance. */
    set autoUpdate(value: boolean);
    private meshesCache;
    private static vectorAux;
    private static clipper;
    private static QUAD_TRIANGLES;
    private static VERTEX_SIZE;
    private static DARK_VERTEX_SIZE;
    private lightColor;
    private darkColor;
    private _boundsProvider?;
    /** The bounds provider to use. If undefined the bounds will be dynamic, calculated when requested and based on the current frame. */
    get boundsProvider(): SpineBoundsProvider | undefined;
    set boundsProvider(value: SpineBoundsProvider | undefined);
    private _boundsPoint;
    private _boundsSpineID;
    private _boundsSpineDirty;
    constructor(options: SpineOptions | SkeletonData, oldOptions?: ISpineOptions);
    private initializeMeshFactory;
    /** If {@link Spine.autoUpdate} is `false`, this method allows to update the AnimationState and the Skeleton with the given delta. */
    update(deltaSeconds: number): void;
    protected internalUpdate(_deltaFrame: number, deltaSeconds?: number): void;
    /** Render the meshes based on the current skeleton state, render debug information, then call {@link Container.updateTransform}. */
    updateTransform(): void;
    /** Destroy Spine game object elements, then call the {@link Container.destroy} with the given options */
    destroy(options?: boolean | IDestroyOptions | undefined): void;
    private resetMeshes;
    protected _calculateBounds(): void;
    /**
     * Check the existence of a mesh for the given slot.
     * If you want to manually handle which meshes go on which slot and how you cache, overwrite this method.
     */
    protected hasMeshForSlot(slot: Slot): boolean;
    /**
     * Search the mesh corresponding to the given slot or create it, if it does not exists.
     * If you want to manually handle which meshes go on which slot and how you cache, overwrite this method.
     */
    protected getMeshForSlot(slot: Slot): ISlotMesh;
    slotsObject: Map<Slot, {
        container: Container;
        followAttachmentTimeline: boolean;
    }>;
    private getSlotFromRef;
    /**
     * Add a pixi Container as a child of the Spine object.
     * The Container will be rendered coherently with the draw order of the slot.
     * If an attachment is active on the slot, the pixi Container will be rendered on top of it.
     * If the Container is already attached to the given slot, nothing will happen.
     * If the Container is already attached to another slot, it will be removed from that slot
     * before adding it to the given one.
     * If another Container is already attached to this slot, the old one will be removed from this
     * slot before adding it to the current one.
     * @param slotRef - The slot index, or the slot name, or the Slot where the pixi object will be added to.
     * @param pixiObject - The pixi Container to add.
     * @param options - Optional settings for the attachment.
     * @param options.followAttachmentTimeline - If true, the attachment will follow the slot's attachment timeline.
     */
    addSlotObject(slotRef: number | string | Slot, pixiObject: Container, options?: {
        followAttachmentTimeline?: boolean;
    }): void;
    /**
     * Return the Container connected to the given slot, if any.
     * Otherwise return undefined
     * @param pixiObject - The slot index, or the slot name, or the Slot to get the Container from.
     * @returns a Container if any, undefined otherwise.
     */
    getSlotObject(slotRef: number | string | Slot): Container | undefined;
    /**
     * Remove a slot object from the given slot.
     * If `pixiObject` is passed and attached to the given slot, remove it from the slot.
     * If `pixiObject` is not passed and the given slot has an attached Container, remove it from the slot.
     * @param slotRef - The slot index, or the slot name, or the Slot where the pixi object will be remove from.
     * @param pixiObject - Optional, The pixi Container to remove.
     */
    removeSlotObject(slotRef: number | string | Slot, pixiObject?: Container): void;
    /**
     * Removes all PixiJS containers attached to any slot.
     */
    removeSlotObjects(): void;
    private verticesCache;
    private clippingSlotToPixiMasks;
    private updateSlotObject;
    private currentClippingSlot;
    private updateAndSetPixiMask;
    private renderMeshes;
    calculateBounds(): void;
    updateBounds(): void;
    /**
     * Set the position of the bone given in input through a {@link IPointData}.
     * @param bone: the bone name or the bone instance to set the position
     * @param outPos: the new position of the bone.
     * @throws {Error}: if the given bone is not found in the skeleton, an error is thrown
     */
    setBonePosition(bone: string | Bone, position: IPointData): void;
    /**
     * Return the position of the bone given in input into an {@link IPointData}.
     * @param bone: the bone name or the bone instance to get the position from
     * @param outPos: an optional {@link IPointData} to use to return the bone position, rathern than instantiating a new object.
     * @returns {IPointData | undefined}: the position of the bone, or undefined if no matching bone is found in the skeleton
     */
    getBonePosition(bone: string | Bone, outPos?: IPointData): IPointData | undefined;
    /** Converts a point from the skeleton coordinate system to the Pixi world coordinate system. */
    skeletonToPixiWorldCoordinates(point: {
        x: number;
        y: number;
    }): void;
    /** Converts a point from the Pixi world coordinate system to the skeleton coordinate system. */
    pixiWorldCoordinatesToSkeleton(point: {
        x: number;
        y: number;
    }): void;
    /** Converts a point from the Pixi world coordinate system to the bone's local coordinate system. */
    pixiWorldCoordinatesToBone(point: {
        x: number;
        y: number;
    }, bone: Bone): void;
    /** A cache containing skeleton data and atlases already loaded by {@link Spine.from}. */
    static readonly skeletonCache: Record<string, SkeletonData>;
    /**
     * Use this method to instantiate a Spine game object.
     * Before instantiating a Spine game object, the skeleton (`.skel` or `.json`) and the atlas text files must be loaded into the Assets. For example:
     * ```
     * PIXI.Assets.add("sackData", "/assets/sack-pro.skel");
     * PIXI.Assets.add("sackAtlas", "/assets/sack-pma.atlas");
     * await PIXI.Assets.load(["sackData", "sackAtlas"]);
     * ```
     * Once a Spine game object is created, its skeleton data is cached into {@link Spine.skeletonCache} using the key:
     * `${skeletonAssetName}-${atlasAssetName}-${options?.scale ?? 1}`
     *
     * @param options - Options to configure the Spine game object. See {@link SpineFromOptions}
     * @returns {Spine} The Spine game object instantiated
     */
    static from(options: SpineFromOptions): Spine;
    /**
     * @deprecated use the `from(options: SpineFromOptions)` version.
     * Use this method to instantiate a Spine game object.
     * Before instantiating a Spine game object, the skeleton (`.skel` or `.json`) and the atlas text files must be loaded into the Assets. For example:
     * ```
     * PIXI.Assets.add("sackData", "/assets/sack-pro.skel");
     * PIXI.Assets.add("sackAtlas", "/assets/sack-pma.atlas");
     * await PIXI.Assets.load(["sackData", "sackAtlas"]);
     * ```
     * Once a Spine game object is created, its skeleton data is cached into {@link Spine.skeletonCache} using the key:
     * `${skeletonAssetName}-${atlasAssetName}-${options?.scale ?? 1}`
     *
     * @param skeletonAssetName - the asset name for the skeleton `.skel` or `.json` file previously loaded into the Assets
     * @param atlasAssetName - the asset name for the atlas file previously loaded into the Assets
     * @param options - Options to configure the Spine game object
     * @returns {Spine} The Spine game object instantiated
     */
    static from(skeletonAssetName: string, atlasAssetName: string, options?: ISpineOptions): Spine;
    private static oldFrom;
    get tint(): number;
    set tint(value: number);
}
/**
 * Represents the mesh type used in a Spine objects. Available implementations are {@link DarkSlotMesh} and {@link SlotMesh}.
 */
export interface ISlotMesh extends DisplayObject {
    name: string;
    updateFromSpineData(slotTexture: SpineTexture, slotBlendMode: BlendMode, slotName: string, finalVertices: NumberArrayLike, finalVerticesLength: number, finalIndices: NumberArrayLike, finalIndicesLength: number, darkTint: boolean): void;
}
