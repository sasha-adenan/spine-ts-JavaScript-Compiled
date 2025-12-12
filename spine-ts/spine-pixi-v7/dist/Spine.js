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
import { AnimationState, AnimationStateData, AtlasAttachmentLoader, ClippingAttachment, Color, MeshAttachment, Physics, Pool, RegionAttachment, Skeleton, SkeletonBinary, SkeletonClipping, SkeletonData, SkeletonJson, Skin, Utils, Vector2, } from "@esotericsoftware/spine-core";
import { SlotMesh } from "./SlotMesh.js";
import { DarkSlotMesh } from "./DarkSlotMesh.js";
import { Assets } from "@pixi/assets";
import { Point } from "@pixi/core";
import { Ticker } from "@pixi/core";
import { Bounds, Container } from "@pixi/display";
import { Graphics } from "@pixi/graphics";
import "@pixi/events";
;
/** A bounds provider that provides a fixed size given by the user. */
export class AABBRectangleBoundsProvider {
    x;
    y;
    width;
    height;
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    calculateBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
/** A bounds provider that calculates the bounding box from the setup pose. */
export class SetupPoseBoundsProvider {
    clipping;
    /**
     * @param clipping If true, clipping attachments are used to compute the bounds. False, by default.
     */
    constructor(clipping = false) {
        this.clipping = clipping;
    }
    calculateBounds(gameObject) {
        if (!gameObject.skeleton)
            return { x: 0, y: 0, width: 0, height: 0 };
        // Make a copy of animation state and skeleton as this might be called while
        // the skeleton in the GameObject has already been heavily modified. We can not
        // reconstruct that state.
        const skeleton = new Skeleton(gameObject.skeleton.data);
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform(Physics.update);
        const bounds = skeleton.getBoundsRect(this.clipping ? new SkeletonClipping() : undefined);
        return bounds.width == Number.NEGATIVE_INFINITY
            ? { x: 0, y: 0, width: 0, height: 0 }
            : bounds;
    }
}
/** A bounds provider that calculates the bounding box by taking the maximumg bounding box for a combination of skins and specific animation. */
export class SkinsAndAnimationBoundsProvider {
    animation;
    skins;
    timeStep;
    clipping;
    /**
     * @param animation The animation to use for calculating the bounds. If null, the setup pose is used.
     * @param skins The skins to use for calculating the bounds. If empty, the default skin is used.
     * @param timeStep The time step to use for calculating the bounds. A smaller time step means more precision, but slower calculation.
     * @param clipping If true, clipping attachments are used to compute the bounds. False, by default.
     */
    constructor(animation, skins = [], timeStep = 0.05, clipping = false) {
        this.animation = animation;
        this.skins = skins;
        this.timeStep = timeStep;
        this.clipping = clipping;
    }
    calculateBounds(gameObject) {
        if (!gameObject.skeleton || !gameObject.state)
            return { x: 0, y: 0, width: 0, height: 0 };
        // Make a copy of animation state and skeleton as this might be called while
        // the skeleton in the GameObject has already been heavily modified. We can not
        // reconstruct that state.
        const animationState = new AnimationState(gameObject.state.data);
        const skeleton = new Skeleton(gameObject.skeleton.data);
        const clipper = this.clipping ? new SkeletonClipping() : undefined;
        const data = skeleton.data;
        if (this.skins.length > 0) {
            let customSkin = new Skin("custom-skin");
            for (const skinName of this.skins) {
                const skin = data.findSkin(skinName);
                if (skin == null)
                    continue;
                customSkin.addSkin(skin);
            }
            skeleton.setSkin(customSkin);
        }
        skeleton.setToSetupPose();
        const animation = this.animation != null ? data.findAnimation(this.animation) : null;
        if (animation == null) {
            skeleton.updateWorldTransform(Physics.update);
            const bounds = skeleton.getBoundsRect(clipper);
            return bounds.width == Number.NEGATIVE_INFINITY
                ? { x: 0, y: 0, width: 0, height: 0 }
                : bounds;
        }
        else {
            let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
            animationState.clearTracks();
            animationState.setAnimationWith(0, animation, false);
            const steps = Math.max(animation.duration / this.timeStep, 1.0);
            for (let i = 0; i < steps; i++) {
                const delta = i > 0 ? this.timeStep : 0;
                animationState.update(delta);
                animationState.apply(skeleton);
                skeleton.update(delta);
                skeleton.updateWorldTransform(Physics.update);
                const bounds = skeleton.getBoundsRect(clipper);
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, bounds.x + bounds.width);
                maxY = Math.max(maxY, bounds.y + bounds.height);
            }
            const bounds = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
            };
            return bounds.width == Number.NEGATIVE_INFINITY
                ? { x: 0, y: 0, width: 0, height: 0 }
                : bounds;
        }
    }
}
/**
 * The class to instantiate a {@link Spine} game object in Pixi.
 * The static method {@link Spine.from} should be used to instantiate a Spine game object.
 */
export class Spine extends Container {
    /** The skeleton for this Spine game object. */
    skeleton;
    /** The animation state for this Spine game object. */
    state;
    darkTint = false;
    hasNeverUpdated = true;
    _debug = undefined;
    get debug() {
        return this._debug;
    }
    /** Pass a {@link SpineDebugRenderer} or create your own {@link ISpineDebugRenderer} to render bones, meshes, ...
     * @example spineGO.debug = new SpineDebugRenderer();
     */
    set debug(value) {
        if (this._debug) {
            this._debug.unregisterSpine(this);
        }
        if (value) {
            value.registerSpine(this);
        }
        this._debug = value;
    }
    slotMeshFactory = () => new SlotMesh();
    beforeUpdateWorldTransforms = () => { };
    afterUpdateWorldTransforms = () => { };
    _autoUpdate = false;
    get autoUpdate() {
        return this._autoUpdate;
    }
    /** When `true`, the Spine AnimationState and the Skeleton will be automatically updated using the {@link Ticker.shared} instance. */
    set autoUpdate(value) {
        if (value && !this._autoUpdate) {
            Ticker.shared.add(this.internalUpdate, this);
        }
        else if (!value && this._autoUpdate) {
            Ticker.shared.remove(this.internalUpdate, this);
        }
        this._autoUpdate = value;
    }
    meshesCache = new Map();
    static vectorAux = new Vector2();
    static clipper = new SkeletonClipping();
    static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];
    static VERTEX_SIZE = 2 + 2 + 4;
    static DARK_VERTEX_SIZE = 2 + 2 + 4 + 4;
    lightColor = new Color();
    darkColor = new Color();
    _boundsProvider;
    /** The bounds provider to use. If undefined the bounds will be dynamic, calculated when requested and based on the current frame. */
    get boundsProvider() {
        return this._boundsProvider;
    }
    set boundsProvider(value) {
        this._boundsProvider = value;
        if (value) {
            this._boundsSpineID = -1;
            this._boundsSpineDirty = true;
            this.interactiveChildren = false;
        }
        else {
            this.interactiveChildren = true;
            this.hitArea = null;
        }
        this.calculateBounds();
    }
    _boundsPoint = new Point();
    _boundsSpineID = -1;
    _boundsSpineDirty = true;
    constructor(options, oldOptions) {
        if (options instanceof SkeletonData) {
            options = {
                ...oldOptions,
                skeletonData: options,
            };
        }
        else if (oldOptions) {
            throw new Error("You cannot use options and oldOptions together.");
        }
        super();
        const skeletonData = options instanceof SkeletonData ? options : options.skeletonData;
        this.skeleton = new Skeleton(skeletonData);
        const animData = new AnimationStateData(skeletonData);
        this.state = new AnimationState(animData);
        // dark tint can be enabled by options, otherwise is enable if at least one slot has tint black
        if (options?.darkTint !== undefined || oldOptions?.slotMeshFactory === undefined) {
            this.darkTint = options?.darkTint === undefined
                ? this.skeleton.slots.some(slot => !!slot.data.darkColor)
                : options?.darkTint;
            if (this.darkTint)
                this.slotMeshFactory = () => new DarkSlotMesh();
        }
        else {
            this.initializeMeshFactory(oldOptions?.slotMeshFactory);
        }
        this.autoUpdate = options?.autoUpdate ?? true;
        this.boundsProvider = options.boundsProvider;
    }
    /*
    * @deprecated Remove when slotMeshFactory options is removed
    */
    initializeMeshFactory(slotMeshFactory) {
        if (slotMeshFactory) {
            this.slotMeshFactory = slotMeshFactory;
            const tempSlotMeshFactory = this.slotMeshFactory();
            if (tempSlotMeshFactory instanceof DarkSlotMesh)
                this.darkTint = true;
            tempSlotMeshFactory.destroy();
        }
        else {
            for (let i = 0; i < this.skeleton.slots.length; i++) {
                if (this.skeleton.slots[i].data.darkColor) {
                    this.slotMeshFactory = () => new DarkSlotMesh();
                    this.darkTint = true;
                    break;
                }
            }
        }
    }
    /** If {@link Spine.autoUpdate} is `false`, this method allows to update the AnimationState and the Skeleton with the given delta. */
    update(deltaSeconds) {
        this.internalUpdate(0, deltaSeconds);
    }
    internalUpdate(_deltaFrame, deltaSeconds) {
        this.hasNeverUpdated = false;
        // Because reasons, pixi uses deltaFrames at 60fps. We ignore the default deltaFrames and use the deltaSeconds from pixi ticker.
        const delta = deltaSeconds ?? Ticker.shared.deltaMS / 1000;
        this.state.update(delta);
        this.state.apply(this.skeleton);
        this.beforeUpdateWorldTransforms(this);
        this.skeleton.update(delta);
        this.skeleton.updateWorldTransform(Physics.update);
        this.afterUpdateWorldTransforms(this);
    }
    /** Render the meshes based on the current skeleton state, render debug information, then call {@link Container.updateTransform}. */
    updateTransform() {
        this.renderMeshes();
        this.sortChildren();
        this.debug?.renderDebug(this);
        super.updateTransform();
    }
    /** Destroy Spine game object elements, then call the {@link Container.destroy} with the given options */
    destroy(options) {
        if (this.autoUpdate)
            this.autoUpdate = false;
        for (const [, mesh] of this.meshesCache) {
            mesh?.destroy();
        }
        this.state.clearListeners();
        this.debug = undefined;
        this.meshesCache.clear();
        this.slotsObject.clear();
        for (let maskKey in this.clippingSlotToPixiMasks) {
            const maskObj = this.clippingSlotToPixiMasks[maskKey];
            maskObj.mask?.destroy();
            delete this.clippingSlotToPixiMasks[maskKey];
        }
        super.destroy(options);
    }
    resetMeshes() {
        for (const [, mesh] of this.meshesCache) {
            mesh.zIndex = -1;
            mesh.visible = false;
        }
    }
    _calculateBounds() {
        if (this.hasNeverUpdated) {
            this.internalUpdate(0, 0);
            this.renderMeshes();
        }
    }
    /**
     * Check the existence of a mesh for the given slot.
     * If you want to manually handle which meshes go on which slot and how you cache, overwrite this method.
     */
    hasMeshForSlot(slot) {
        return this.meshesCache.has(slot);
    }
    /**
     * Search the mesh corresponding to the given slot or create it, if it does not exists.
     * If you want to manually handle which meshes go on which slot and how you cache, overwrite this method.
     */
    getMeshForSlot(slot) {
        if (!this.hasMeshForSlot(slot)) {
            let mesh = this.slotMeshFactory();
            this.addChild(mesh);
            this.meshesCache.set(slot, mesh);
            return mesh;
        }
        else {
            let mesh = this.meshesCache.get(slot);
            mesh.visible = true;
            return mesh;
        }
    }
    slotsObject = new Map();
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
    addSlotObject(slotRef, pixiObject, options) {
        let slot = this.getSlotFromRef(slotRef);
        const oldPixiObject = this.slotsObject.get(slot)?.container;
        if (oldPixiObject && oldPixiObject === pixiObject)
            return;
        // search if the pixiObject was already in another slotObject
        for (const [otherSlot, { container: oldPixiObjectAnotherSlot }] of this.slotsObject) {
            if (otherSlot !== slot && oldPixiObjectAnotherSlot === pixiObject) {
                this.removeSlotObject(otherSlot, pixiObject);
                break;
            }
        }
        if (oldPixiObject)
            this.removeChild(oldPixiObject);
        this.slotsObject.set(slot, {
            container: pixiObject,
            followAttachmentTimeline: options?.followAttachmentTimeline || false,
        });
        this.addChild(pixiObject);
    }
    /**
     * Return the Container connected to the given slot, if any.
     * Otherwise return undefined
     * @param pixiObject - The slot index, or the slot name, or the Slot to get the Container from.
     * @returns a Container if any, undefined otherwise.
     */
    getSlotObject(slotRef) {
        const element = this.slotsObject.get(this.getSlotFromRef(slotRef));
        return element ? element.container : undefined;
    }
    /**
     * Remove a slot object from the given slot.
     * If `pixiObject` is passed and attached to the given slot, remove it from the slot.
     * If `pixiObject` is not passed and the given slot has an attached Container, remove it from the slot.
     * @param slotRef - The slot index, or the slot name, or the Slot where the pixi object will be remove from.
     * @param pixiObject - Optional, The pixi Container to remove.
     */
    removeSlotObject(slotRef, pixiObject) {
        let slot = this.getSlotFromRef(slotRef);
        let slotObject = this.slotsObject.get(slot)?.container;
        if (!slotObject)
            return;
        // if pixiObject is passed, remove only if it is equal to the given one
        if (pixiObject && pixiObject !== slotObject)
            return;
        this.removeChild(slotObject);
        this.slotsObject.delete(slot);
    }
    /**
     * Removes all PixiJS containers attached to any slot.
     */
    removeSlotObjects() {
        for (const [, slotObject] of this.slotsObject) {
            slotObject.container.removeFromParent();
        }
        this.slotsObject.clear();
    }
    verticesCache = Utils.newFloatArray(1024);
    clippingSlotToPixiMasks = {};
    updateSlotObject(element, slot, zIndex) {
        const { container: slotObject, followAttachmentTimeline } = element;
        const followAttachmentValue = followAttachmentTimeline ? Boolean(slot.attachment) : true;
        slotObject.visible = this.skeleton.drawOrder.includes(slot) && followAttachmentValue;
        if (slotObject.visible) {
            slotObject.position.set(slot.bone.worldX, slot.bone.worldY);
            slotObject.angle = slot.bone.getWorldRotationX();
            let bone = slot.bone;
            let cumulativeScaleX = 1;
            let cumulativeScaleY = 1;
            while (bone) {
                cumulativeScaleX *= bone.scaleX;
                cumulativeScaleY *= bone.scaleY;
                bone = bone.parent;
            }
            ;
            if (cumulativeScaleX < 0)
                slotObject.angle -= 180;
            slotObject.scale.set(slot.bone.getWorldScaleX() * Math.sign(cumulativeScaleX), slot.bone.getWorldScaleY() * Math.sign(cumulativeScaleY));
            slotObject.zIndex = zIndex + 1;
            slotObject.alpha = this.skeleton.color.a * slot.color.a;
        }
    }
    currentClippingSlot;
    updateAndSetPixiMask(slot, last) {
        // assign/create the currentClippingSlot
        const attachment = slot.attachment;
        if (attachment && attachment instanceof ClippingAttachment) {
            const clip = (this.clippingSlotToPixiMasks[slot.data.name] ||= { slot, vertices: new Array() });
            clip.maskComputed = false;
            this.currentClippingSlot = clip;
            return;
        }
        // assign the currentClippingSlot mask to the slot object
        let currentClippingSlot = this.currentClippingSlot;
        const slotObject = this.slotsObject.get(slot);
        if (currentClippingSlot && slotObject) {
            // create the pixi mask, only the first time and if the clipped slot is the first one clipped by this currentClippingSlot
            let mask = currentClippingSlot.mask;
            if (!mask) {
                mask = maskPool.obtain();
                currentClippingSlot.mask = mask;
                this.addChild(mask);
            }
            // compute the pixi mask polygon, if the clipped slot is the first one clipped by this currentClippingSlot
            if (!currentClippingSlot.maskComputed) {
                let slotClipping = currentClippingSlot.slot;
                let clippingAttachment = slotClipping.attachment;
                currentClippingSlot.maskComputed = true;
                const worldVerticesLength = clippingAttachment.worldVerticesLength;
                const vertices = currentClippingSlot.vertices;
                clippingAttachment.computeWorldVertices(slotClipping, 0, worldVerticesLength, vertices, 0, 2);
                mask.clear().lineStyle(0).beginFill(0x000000).drawPolygon(vertices).endFill();
            }
            slotObject.container.mask = mask;
        }
        else if (slotObject?.container.mask) {
            // remove the mask, if slot object has a mask, but currentClippingSlot is undefined
            slotObject.container.mask = null;
        }
        // if current slot is the ending one of the currentClippingSlot mask, set currentClippingSlot to undefined
        if (currentClippingSlot && currentClippingSlot.slot.attachment.endSlot == slot.data) {
            this.currentClippingSlot = undefined;
        }
        // clean up unused masks
        if (last) {
            for (const key in this.clippingSlotToPixiMasks) {
                const clippingSlotToPixiMask = this.clippingSlotToPixiMasks[key];
                if ((!(clippingSlotToPixiMask.slot.attachment instanceof ClippingAttachment) || !clippingSlotToPixiMask.maskComputed) && clippingSlotToPixiMask.mask) {
                    this.removeChild(clippingSlotToPixiMask.mask);
                    maskPool.free(clippingSlotToPixiMask.mask);
                    clippingSlotToPixiMask.mask = undefined;
                }
            }
            this.currentClippingSlot = undefined;
        }
    }
    /*
    * Colors in pixi are premultiplied.
    * Pixi blending modes are modified to work with premultiplied colors. We cannot create custom blending modes.
    * Textures are loaded as premultiplied (see assers/atlasLoader.ts: alphaMode: `page.pma ? ALPHA_MODES.PMA : ALPHA_MODES.UNPACK`):
    * - textures non premultiplied are premultiplied on GPU on upload
    * - textures premultiplied are uploaded on GPU as is since they are already premultiplied
    *
    * We need to take this into consideration and calculates final colors for both light and dark color as if textures were always premultiplied.
    * This implies for example that alpha for dark tint is always 1. This is way in DarkTintRenderer we have only the alpha of the light color.
    * If we ever want to load texture as non premultiplied on GPU, we must add a new dark alpha parameter to the TintMaterial and set the alpha.
    */
    renderMeshes() {
        this.resetMeshes();
        let triangles = null;
        let uvs = null;
        const drawOrder = this.skeleton.drawOrder;
        for (let i = 0, n = drawOrder.length, slotObjectsCounter = 0; i < n; i++) {
            const slot = drawOrder[i];
            // render pixi object on the current slot on top of the slot attachment
            let pixiObject = this.slotsObject.get(slot);
            let zIndex = i + slotObjectsCounter;
            if (pixiObject) {
                this.updateSlotObject(pixiObject, slot, zIndex + 1);
                slotObjectsCounter++;
            }
            this.updateAndSetPixiMask(slot, i === drawOrder.length - 1);
            const useDarkColor = slot.darkColor != null;
            const vertexSize = Spine.clipper.isClipping() ? 2 : useDarkColor ? Spine.DARK_VERTEX_SIZE : Spine.VERTEX_SIZE;
            if (!slot.bone.active) {
                Spine.clipper.clipEndWithSlot(slot);
                continue;
            }
            const attachment = slot.getAttachment();
            let attachmentColor;
            let texture;
            let numFloats = 0;
            if (attachment instanceof RegionAttachment) {
                const region = attachment;
                attachmentColor = region.color;
                numFloats = vertexSize * 4;
                region.computeWorldVertices(slot, this.verticesCache, 0, vertexSize);
                triangles = Spine.QUAD_TRIANGLES;
                uvs = region.uvs;
                texture = region.region?.texture;
            }
            else if (attachment instanceof MeshAttachment) {
                const mesh = attachment;
                attachmentColor = mesh.color;
                numFloats = (mesh.worldVerticesLength >> 1) * vertexSize;
                if (numFloats > this.verticesCache.length) {
                    this.verticesCache = Utils.newFloatArray(numFloats);
                }
                mesh.computeWorldVertices(slot, 0, mesh.worldVerticesLength, this.verticesCache, 0, vertexSize);
                triangles = mesh.triangles;
                uvs = mesh.uvs;
                texture = mesh.region?.texture;
            }
            else if (attachment instanceof ClippingAttachment) {
                Spine.clipper.clipStart(slot, attachment);
                continue;
            }
            else {
                if (this.hasMeshForSlot(slot)) {
                    this.getMeshForSlot(slot).visible = false;
                }
                Spine.clipper.clipEndWithSlot(slot);
                continue;
            }
            if (texture != null) {
                const skeleton = slot.bone.skeleton;
                const skeletonColor = skeleton.color;
                const slotColor = slot.color;
                const alpha = skeletonColor.a * slotColor.a * attachmentColor.a;
                // cannot premultiply the colors because the default mesh renderer already does that
                this.lightColor.set(skeletonColor.r * slotColor.r * attachmentColor.r, skeletonColor.g * slotColor.g * attachmentColor.g, skeletonColor.b * slotColor.b * attachmentColor.b, alpha);
                if (slot.darkColor != null) {
                    this.darkColor.set(slot.darkColor.r, slot.darkColor.g, slot.darkColor.b, 1);
                }
                else {
                    this.darkColor.set(0, 0, 0, 1);
                }
                let finalVertices;
                let finalVerticesLength;
                let finalIndices;
                let finalIndicesLength;
                if (Spine.clipper.isClipping()) {
                    Spine.clipper.clipTriangles(this.verticesCache, triangles, triangles.length, uvs, this.lightColor, this.darkColor, useDarkColor);
                    finalVertices = Spine.clipper.clippedVertices;
                    finalVerticesLength = finalVertices.length;
                    finalIndices = Spine.clipper.clippedTriangles;
                    finalIndicesLength = finalIndices.length;
                }
                else {
                    const verts = this.verticesCache;
                    for (let v = 2, u = 0, n = numFloats; v < n; v += vertexSize, u += 2) {
                        let tempV = v;
                        verts[tempV++] = this.lightColor.r;
                        verts[tempV++] = this.lightColor.g;
                        verts[tempV++] = this.lightColor.b;
                        verts[tempV++] = this.lightColor.a;
                        verts[tempV++] = uvs[u];
                        verts[tempV++] = uvs[u + 1];
                        if (useDarkColor) {
                            verts[tempV++] = this.darkColor.r;
                            verts[tempV++] = this.darkColor.g;
                            verts[tempV++] = this.darkColor.b;
                            verts[tempV++] = this.darkColor.a;
                        }
                    }
                    finalVertices = this.verticesCache;
                    finalVerticesLength = numFloats;
                    finalIndices = triangles;
                    finalIndicesLength = triangles.length;
                }
                if (finalVerticesLength == 0 || finalIndicesLength == 0) {
                    Spine.clipper.clipEndWithSlot(slot);
                    continue;
                }
                const mesh = this.getMeshForSlot(slot);
                mesh.renderable = true;
                mesh.zIndex = zIndex;
                mesh.updateFromSpineData(texture, slot.data.blendMode, slot.data.name, finalVertices, finalVerticesLength, finalIndices, finalIndicesLength, useDarkColor);
            }
            Spine.clipper.clipEndWithSlot(slot);
        }
        Spine.clipper.clipEnd();
    }
    calculateBounds() {
        if (!this._boundsProvider) {
            super.calculateBounds();
            return;
        }
        const transform = this.transform;
        if (this._boundsSpineID === transform._worldID)
            return;
        this.updateBounds();
        const bounds = this._localBounds;
        const p = this._boundsPoint;
        p.set(bounds.minX, bounds.minY);
        transform.worldTransform.apply(p, p);
        this._bounds.minX = p.x;
        this._bounds.minY = p.y;
        p.set(bounds.maxX, bounds.maxY);
        transform.worldTransform.apply(p, p);
        this._bounds.maxX = p.x;
        this._bounds.maxY = p.y;
    }
    updateBounds() {
        if (!this._boundsProvider || !this._boundsSpineDirty)
            return;
        this._boundsSpineDirty = false;
        if (!this._localBounds) {
            this._localBounds = new Bounds();
        }
        const boundsSpine = this._boundsProvider.calculateBounds(this);
        const bounds = this._localBounds;
        bounds.clear();
        bounds.minX = boundsSpine.x;
        bounds.minY = boundsSpine.y;
        bounds.maxX = boundsSpine.x + boundsSpine.width;
        bounds.maxY = boundsSpine.y + boundsSpine.height;
        this.hitArea = this._localBounds.getRectangle();
    }
    /**
     * Set the position of the bone given in input through a {@link IPointData}.
     * @param bone: the bone name or the bone instance to set the position
     * @param outPos: the new position of the bone.
     * @throws {Error}: if the given bone is not found in the skeleton, an error is thrown
     */
    setBonePosition(bone, position) {
        const boneAux = bone;
        if (typeof bone === "string") {
            bone = this.skeleton.findBone(bone);
        }
        if (!bone)
            throw Error(`Cannot set bone position, bone ${String(boneAux)} not found`);
        Spine.vectorAux.set(position.x, position.y);
        if (bone.parent) {
            const aux = bone.parent.worldToLocal(Spine.vectorAux);
            bone.x = aux.x;
            bone.y = aux.y;
        }
        else {
            bone.x = Spine.vectorAux.x;
            bone.y = Spine.vectorAux.y;
        }
    }
    /**
     * Return the position of the bone given in input into an {@link IPointData}.
     * @param bone: the bone name or the bone instance to get the position from
     * @param outPos: an optional {@link IPointData} to use to return the bone position, rathern than instantiating a new object.
     * @returns {IPointData | undefined}: the position of the bone, or undefined if no matching bone is found in the skeleton
     */
    getBonePosition(bone, outPos) {
        const boneAux = bone;
        if (typeof bone === "string") {
            bone = this.skeleton.findBone(bone);
        }
        if (!bone) {
            console.error(`Cannot get bone position! Bone ${String(boneAux)} not found`);
            return outPos;
        }
        if (!outPos) {
            outPos = { x: 0, y: 0 };
        }
        outPos.x = bone.worldX;
        outPos.y = bone.worldY;
        return outPos;
    }
    /** Converts a point from the skeleton coordinate system to the Pixi world coordinate system. */
    skeletonToPixiWorldCoordinates(point) {
        this.worldTransform.apply(point, point);
    }
    /** Converts a point from the Pixi world coordinate system to the skeleton coordinate system. */
    pixiWorldCoordinatesToSkeleton(point) {
        this.worldTransform.applyInverse(point, point);
    }
    /** Converts a point from the Pixi world coordinate system to the bone's local coordinate system. */
    pixiWorldCoordinatesToBone(point, bone) {
        this.pixiWorldCoordinatesToSkeleton(point);
        if (bone.parent) {
            bone.parent.worldToLocal(point);
        }
        else {
            bone.worldToLocal(point);
        }
    }
    /** A cache containing skeleton data and atlases already loaded by {@link Spine.from}. */
    static skeletonCache = Object.create(null);
    static from(paramOne, atlasAssetName, options) {
        if (typeof paramOne === "string") {
            return Spine.oldFrom(paramOne, atlasAssetName, options);
        }
        const { skeleton, atlas, scale = 1, darkTint, autoUpdate, boundsProvider } = paramOne;
        const cacheKey = `${skeleton}-${atlas}-${scale}`;
        let skeletonData = Spine.skeletonCache[cacheKey];
        if (!skeletonData) {
            const skeletonAsset = Assets.get(skeleton);
            const atlasAsset = Assets.get(atlas);
            const attachmentLoader = new AtlasAttachmentLoader(atlasAsset);
            let parser = skeletonAsset instanceof Uint8Array ? new SkeletonBinary(attachmentLoader) : new SkeletonJson(attachmentLoader);
            parser.scale = scale;
            skeletonData = parser.readSkeletonData(skeletonAsset);
            Spine.skeletonCache[cacheKey] = skeletonData;
        }
        return new Spine({ skeletonData, darkTint, autoUpdate, boundsProvider });
    }
    static oldFrom(skeletonAssetName, atlasAssetName, options) {
        const cacheKey = `${skeletonAssetName}-${atlasAssetName}-${options?.scale ?? 1}`;
        let skeletonData = Spine.skeletonCache[cacheKey];
        if (skeletonData) {
            return new Spine(skeletonData, options);
        }
        const skeletonAsset = Assets.get(skeletonAssetName);
        const atlasAsset = Assets.get(atlasAssetName);
        const attachmentLoader = new AtlasAttachmentLoader(atlasAsset);
        let parser = skeletonAsset instanceof Uint8Array ? new SkeletonBinary(attachmentLoader) : new SkeletonJson(attachmentLoader);
        parser.scale = options?.scale ?? 1;
        skeletonData = parser.readSkeletonData(skeletonAsset);
        Spine.skeletonCache[cacheKey] = skeletonData;
        return new this(skeletonData, options);
    }
    get tint() {
        return this.skeleton.color.toRgb888();
    }
    set tint(value) {
        Color.rgb888ToColor(this.skeleton.color, value);
    }
}
;
const maskPool = new Pool(() => new Graphics);
Skeleton.yDown = true;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvU3BpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRy9FLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsS0FBSyxFQUNMLGNBQWMsRUFDZCxPQUFPLEVBQ1AsSUFBSSxFQUNKLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osWUFBWSxFQUNaLElBQUksRUFDSixLQUFLLEVBQ0wsT0FBTyxHQUNQLE1BQU0sOEJBQThCLENBQUM7QUFFdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFakQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN0QyxPQUFPLEVBQWMsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFcEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzFDLE9BQU8sY0FBYyxDQUFDO0FBNkNyQixDQUFDO0FBdUNGLHNFQUFzRTtBQUN0RSxNQUFNLE9BQU8sMkJBQTJCO0lBRTlCO0lBQ0E7SUFDQTtJQUNBO0lBSlQsWUFDUyxDQUFTLEVBQ1QsQ0FBUyxFQUNULEtBQWEsRUFDYixNQUFjO1FBSGQsTUFBQyxHQUFELENBQUMsQ0FBUTtRQUNULE1BQUMsR0FBRCxDQUFDLENBQVE7UUFDVCxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQUNuQixD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QVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzdILE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDbkMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0RCxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFlBQVksQ0FBQztRQUM3QyxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBQ0QsSUFBVyxJQUFJLENBQUUsS0FBYTtRQUM3QixLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pELENBQUM7O0FBUUQsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFXLEdBQUcsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUM7QUFFeEQsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBTcGluZSBSdW50aW1lcyBMaWNlbnNlIEFncmVlbWVudFxuICogTGFzdCB1cGRhdGVkIEFwcmlsIDUsIDIwMjUuIFJlcGxhY2VzIGFsbCBwcmlvciB2ZXJzaW9ucy5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAyNSwgRXNvdGVyaWMgU29mdHdhcmUgTExDXG4gKlxuICogSW50ZWdyYXRpb24gb2YgdGhlIFNwaW5lIFJ1bnRpbWVzIGludG8gc29mdHdhcmUgb3Igb3RoZXJ3aXNlIGNyZWF0aW5nXG4gKiBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyBpcyBwZXJtaXR0ZWQgdW5kZXIgdGhlIHRlcm1zIGFuZFxuICogY29uZGl0aW9ucyBvZiBTZWN0aW9uIDIgb2YgdGhlIFNwaW5lIEVkaXRvciBMaWNlbnNlIEFncmVlbWVudDpcbiAqIGh0dHA6Ly9lc290ZXJpY3NvZnR3YXJlLmNvbS9zcGluZS1lZGl0b3ItbGljZW5zZVxuICpcbiAqIE90aGVyd2lzZSwgaXQgaXMgcGVybWl0dGVkIHRvIGludGVncmF0ZSB0aGUgU3BpbmUgUnVudGltZXMgaW50byBzb2Z0d2FyZVxuICogb3Igb3RoZXJ3aXNlIGNyZWF0ZSBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyAoY29sbGVjdGl2ZWx5LFxuICogXCJQcm9kdWN0c1wiKSwgcHJvdmlkZWQgdGhhdCBlYWNoIHVzZXIgb2YgdGhlIFByb2R1Y3RzIG11c3Qgb2J0YWluIHRoZWlyIG93blxuICogU3BpbmUgRWRpdG9yIGxpY2Vuc2UgYW5kIHJlZGlzdHJpYnV0aW9uIG9mIHRoZSBQcm9kdWN0cyBpbiBhbnkgZm9ybSBtdXN0XG4gKiBpbmNsdWRlIHRoaXMgbGljZW5zZSBhbmQgY29weXJpZ2h0IG5vdGljZS5cbiAqXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMgQVJFIFBST1ZJREVEIEJZIEVTT1RFUklDIFNPRlRXQVJFIExMQyBcIkFTIElTXCIgQU5EIEFOWVxuICogRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRFxuICogV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRVxuICogRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgRVNPVEVSSUMgU09GVFdBUkUgTExDIEJFIExJQUJMRSBGT1IgQU5ZXG4gKiBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICogKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTLFxuICogQlVTSU5FU1MgSU5URVJSVVBUSU9OLCBPUiBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUykgSE9XRVZFUiBDQVVTRUQgQU5EXG4gKiBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICogKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB0eXBlIHsgQmxlbmRNb2RlLCBCb25lLCBFdmVudCwgTnVtYmVyQXJyYXlMaWtlLCBTbG90LCBUZXh0dXJlQXRsYXMsIFRyYWNrRW50cnkgfSBmcm9tIFwiQGVzb3Rlcmljc29mdHdhcmUvc3BpbmUtY29yZVwiO1xuaW1wb3J0IHtcblx0QW5pbWF0aW9uU3RhdGUsXG5cdEFuaW1hdGlvblN0YXRlRGF0YSxcblx0QXRsYXNBdHRhY2htZW50TG9hZGVyLFxuXHRDbGlwcGluZ0F0dGFjaG1lbnQsXG5cdENvbG9yLFxuXHRNZXNoQXR0YWNobWVudCxcblx0UGh5c2ljcyxcblx0UG9vbCxcblx0UmVnaW9uQXR0YWNobWVudCxcblx0U2tlbGV0b24sXG5cdFNrZWxldG9uQmluYXJ5LFxuXHRTa2VsZXRvbkNsaXBwaW5nLFxuXHRTa2VsZXRvbkRhdGEsXG5cdFNrZWxldG9uSnNvbixcblx0U2tpbixcblx0VXRpbHMsXG5cdFZlY3RvcjIsXG59IGZyb20gXCJAZXNvdGVyaWNzb2Z0d2FyZS9zcGluZS1jb3JlXCI7XG5pbXBvcnQgdHlwZSB7IFNwaW5lVGV4dHVyZSB9IGZyb20gXCIuL1NwaW5lVGV4dHVyZS5qc1wiO1xuaW1wb3J0IHsgU2xvdE1lc2ggfSBmcm9tIFwiLi9TbG90TWVzaC5qc1wiO1xuaW1wb3J0IHsgRGFya1Nsb3RNZXNoIH0gZnJvbSBcIi4vRGFya1Nsb3RNZXNoLmpzXCI7XG5pbXBvcnQgdHlwZSB7IElTcGluZURlYnVnUmVuZGVyZXIsIFNwaW5lRGVidWdSZW5kZXJlciB9IGZyb20gXCIuL1NwaW5lRGVidWdSZW5kZXJlci5qc1wiO1xuaW1wb3J0IHsgQXNzZXRzIH0gZnJvbSBcIkBwaXhpL2Fzc2V0c1wiO1xuaW1wb3J0IHsgSVBvaW50RGF0YSwgUG9pbnQgfSBmcm9tIFwiQHBpeGkvY29yZVwiO1xuaW1wb3J0IHsgVGlja2VyIH0gZnJvbSBcIkBwaXhpL2NvcmVcIjtcbmltcG9ydCB0eXBlIHsgSURlc3Ryb3lPcHRpb25zLCBEaXNwbGF5T2JqZWN0IH0gZnJvbSBcIkBwaXhpL2Rpc3BsYXlcIjtcbmltcG9ydCB7IEJvdW5kcywgQ29udGFpbmVyIH0gZnJvbSBcIkBwaXhpL2Rpc3BsYXlcIjtcbmltcG9ydCB7IEdyYXBoaWNzIH0gZnJvbSBcIkBwaXhpL2dyYXBoaWNzXCI7XG5pbXBvcnQgXCJAcGl4aS9ldmVudHNcIjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBVc2UgU3BpbmVGcm9tT3B0aW9ucyBhbmQgU3BpbmVPcHRpb25zLlxuICogT3B0aW9ucyB0byBjb25maWd1cmUgYSB7QGxpbmsgU3BpbmV9IGdhbWUgb2JqZWN0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTcGluZU9wdGlvbnMge1xuXHQvKiogIFNldCB0aGUge0BsaW5rIFNwaW5lLmF1dG9VcGRhdGV9IHZhbHVlLiBJZiBvbWl0dGVkLCBpdCBpcyBzZXQgdG8gYHRydWVgLiAqL1xuXHRhdXRvVXBkYXRlPzogYm9vbGVhbjtcblx0LyoqICBUaGUgdmFsdWUgcGFzc2VkIHRvIHRoZSBza2VsZXRvbiByZWFkZXIuIElmIG9taXR0ZWQsIDEgaXMgcGFzc2VkLiBTZWUge0BsaW5rIFNrZWxldG9uQmluYXJ5LnNjYWxlfSBmb3IgZGV0YWlscy4gKi9cblx0c2NhbGU/OiBudW1iZXI7XG5cdC8qKlxuXHQgKiBAZGVwcmVjYXRlZCBVc2UgZGFya1RpbnQgb3B0aW9uIGluc3RlYWQuXG5cdCAqIEEgZmFjdG9yeSB0byBvdmVycmlkZSB0aGUgZGVmYXVsdCBvbmVzIHRvIHJlbmRlciBTcGluZSBtZXNoZXMgKHtAbGluayBEYXJrU2xvdE1lc2h9IG9yIHtAbGluayBTbG90TWVzaH0pLlxuXHQgKiBJZiBvbWl0dGVkLCBhIGZhY3RvcnkgcmV0dXJuaW5nIGEgKHtAbGluayBEYXJrU2xvdE1lc2h9IG9yIHtAbGluayBTbG90TWVzaH0pIHdpbGwgYmUgdXNlZCBkZXBlbmRpbmcgb24gdGhlIHByZXNlbmNlIG9mXG5cdCAqIGEgZGFyayB0aW50IG1lc2ggaW4gdGhlIHNrZWxldG9uLlxuXHQgKiAqL1xuXHRzbG90TWVzaEZhY3Rvcnk/OiAoKSA9PiBJU2xvdE1lc2g7XG59XG5cbi8qKlxuICogT3B0aW9ucyB0byBjcmVhdGUgYSB7QGxpbmsgU3BpbmV9IHVzaW5nIHtAbGluayBTcGluZS5mcm9tfS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTcGluZUZyb21PcHRpb25zIHtcblx0LyoqIHRoZSBhc3NldCBuYW1lIGZvciB0aGUgc2tlbGV0b24gYC5za2VsYCBvciBgLmpzb25gIGZpbGUgcHJldmlvdXNseSBsb2FkZWQgaW50byB0aGUgQXNzZXRzICovXG5cdHNrZWxldG9uOiBzdHJpbmc7XG5cblx0LyoqIHRoZSBhc3NldCBuYW1lIGZvciB0aGUgYXRsYXMgZmlsZSBwcmV2aW91c2x5IGxvYWRlZCBpbnRvIHRoZSBBc3NldHMgKi9cblx0YXRsYXM6IHN0cmluZztcblxuXHQvKiogIFRoZSB2YWx1ZSBwYXNzZWQgdG8gdGhlIHNrZWxldG9uIHJlYWRlci4gSWYgb21pdHRlZCwgMSBpcyBwYXNzZWQuIFNlZSB7QGxpbmsgU2tlbGV0b25CaW5hcnkuc2NhbGV9IGZvciBkZXRhaWxzLiAqL1xuXHRzY2FsZT86IG51bWJlcjtcblxuXHQvKiogIFNldCB0aGUge0BsaW5rIFNwaW5lLmF1dG9VcGRhdGV9IHZhbHVlLiBJZiBvbWl0dGVkLCBpdCBpcyBzZXQgdG8gYHRydWVgLiAqL1xuXHRhdXRvVXBkYXRlPzogYm9vbGVhbjtcblxuXHQvKipcblx0ICogSWYgYHRydWVgLCB1c2UgdGhlIGRhcmsgdGludCByZW5kZXJlciB0byByZW5kZXIgdGhlIHNrZWxldG9uXG5cdCAqIElmIGBmYWxzZWAsIHVzZSB0aGUgZGVmYXVsdCBwaXhpIHJlbmRlcmVyIHRvIHJlbmRlciB0aGUgc2tlbGV0b25cblx0ICogSWYgYHVuZGVmaW5lZGAsIHVzZSB0aGUgZGFyayB0aW50IHJlbmRlcmVyIGlmIGF0IGxlYXN0IG9uZSBzbG90IGhhcyB0aW50IGJsYWNrXG5cdCAqL1xuXHRkYXJrVGludD86IGJvb2xlYW47XG5cblx0LyoqIFRoZSBib3VuZHMgcHJvdmlkZXIgdG8gdXNlLiBJZiB1bmRlZmluZWQgdGhlIGJvdW5kcyB3aWxsIGJlIGR5bmFtaWMsIGNhbGN1bGF0ZWQgd2hlbiByZXF1ZXN0ZWQgYW5kIGJhc2VkIG9uIHRoZSBjdXJyZW50IGZyYW1lLiAqL1xuXHRib3VuZHNQcm92aWRlcj86IFNwaW5lQm91bmRzUHJvdmlkZXIsXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNwaW5lT3B0aW9ucyB7XG5cdC8qKiB0aGUge0BsaW5rIFNrZWxldG9uRGF0YX0gdXNlZCB0byBpbnN0YW50aWF0ZSB0aGUgc2tlbGV0b24gKi9cblx0c2tlbGV0b25EYXRhOiBTa2VsZXRvbkRhdGE7XG5cblx0LyoqICBTZWUge0BsaW5rIFNwaW5lRnJvbU9wdGlvbnMuYXV0b1VwZGF0ZX0uICovXG5cdGF1dG9VcGRhdGU/OiBib29sZWFuO1xuXG5cdC8qKiAgU2VlIHtAbGluayBTcGluZUZyb21PcHRpb25zLmRhcmtUaW50fS4gKi9cblx0ZGFya1RpbnQ/OiBib29sZWFuO1xuXG5cdC8qKiAgU2VlIHtAbGluayBTcGluZUZyb21PcHRpb25zLmJvdW5kc1Byb3ZpZGVyfS4gKi9cblx0Ym91bmRzUHJvdmlkZXI/OiBTcGluZUJvdW5kc1Byb3ZpZGVyLFxufVxuXG4vKipcbiAqIEFuaW1hdGlvblN0YXRlTGlzdGVuZXIge0BsaW5rIGh0dHBzOi8vZW4uZXNvdGVyaWNzb2Z0d2FyZS5jb20vc3BpbmUtYXBpLXJlZmVyZW5jZSNBbmltYXRpb25TdGF0ZUxpc3RlbmVyIGV2ZW50c30gZXhwb3NlZCBmb3IgUGl4aS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTcGluZUV2ZW50cyB7XG5cdGNvbXBsZXRlOiBbdHJhY2tFbnRyeTogVHJhY2tFbnRyeV07XG5cdGRpc3Bvc2U6IFt0cmFja0VudHJ5OiBUcmFja0VudHJ5XTtcblx0ZW5kOiBbdHJhY2tFbnRyeTogVHJhY2tFbnRyeV07XG5cdGV2ZW50OiBbdHJhY2tFbnRyeTogVHJhY2tFbnRyeSwgZXZlbnQ6IEV2ZW50XTtcblx0aW50ZXJydXB0OiBbdHJhY2tFbnRyeTogVHJhY2tFbnRyeV07XG5cdHN0YXJ0OiBbdHJhY2tFbnRyeTogVHJhY2tFbnRyeV07XG59XG5cbi8qKiBBIGJvdW5kcyBwcm92aWRlciBjYWxjdWxhdGVzIHRoZSBib3VuZGluZyBib3ggZm9yIGEgc2tlbGV0b24sIHdoaWNoIGlzIHRoZW4gYXNzaWduZWQgYXMgdGhlIHNpemUgb2YgdGhlIFNwaW5lR2FtZU9iamVjdC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVCb3VuZHNQcm92aWRlciB7XG5cdC8qKiBSZXR1cm5zIHRoZSBib3VuZGluZyBib3ggZm9yIHRoZSBza2VsZXRvbiwgaW4gc2tlbGV0b24gc3BhY2UuICovXG5cdGNhbGN1bGF0ZUJvdW5kcyAoZ2FtZU9iamVjdDogU3BpbmUpOiB7XG5cdFx0eDogbnVtYmVyO1xuXHRcdHk6IG51bWJlcjtcblx0XHR3aWR0aDogbnVtYmVyO1xuXHRcdGhlaWdodDogbnVtYmVyO1xuXHR9O1xufVxuXG4vKiogQSBib3VuZHMgcHJvdmlkZXIgdGhhdCBwcm92aWRlcyBhIGZpeGVkIHNpemUgZ2l2ZW4gYnkgdGhlIHVzZXIuICovXG5leHBvcnQgY2xhc3MgQUFCQlJlY3RhbmdsZUJvdW5kc1Byb3ZpZGVyIGltcGxlbWVudHMgU3BpbmVCb3VuZHNQcm92aWRlciB7XG5cdGNvbnN0cnVjdG9yIChcblx0XHRwcml2YXRlIHg6IG51bWJlcixcblx0XHRwcml2YXRlIHk6IG51bWJlcixcblx0XHRwcml2YXRlIHdpZHRoOiBudW1iZXIsXG5cdFx0cHJpdmF0ZSBoZWlnaHQ6IG51bWJlcixcblx0KSB7IH1cblx0Y2FsY3VsYXRlQm91bmRzICgpIHtcblx0XHRyZXR1cm4geyB4OiB0aGlzLngsIHk6IHRoaXMueSwgd2lkdGg6IHRoaXMud2lkdGgsIGhlaWdodDogdGhpcy5oZWlnaHQgfTtcblx0fVxufVxuXG4vKiogQSBib3VuZHMgcHJvdmlkZXIgdGhhdCBjYWxjdWxhdGVzIHRoZSBib3VuZGluZyBib3ggZnJvbSB0aGUgc2V0dXAgcG9zZS4gKi9cbmV4cG9ydCBjbGFzcyBTZXR1cFBvc2VCb3VuZHNQcm92aWRlciBpbXBsZW1lbnRzIFNwaW5lQm91bmRzUHJvdmlkZXIge1xuXHQvKipcblx0ICogQHBhcmFtIGNsaXBwaW5nIElmIHRydWUsIGNsaXBwaW5nIGF0dGFjaG1lbnRzIGFyZSB1c2VkIHRvIGNvbXB1dGUgdGhlIGJvdW5kcy4gRmFsc2UsIGJ5IGRlZmF1bHQuXG5cdCAqL1xuXHRjb25zdHJ1Y3RvciAoXG5cdFx0cHJpdmF0ZSBjbGlwcGluZyA9IGZhbHNlLFxuXHQpIHsgfVxuXG5cdGNhbGN1bGF0ZUJvdW5kcyAoZ2FtZU9iamVjdDogU3BpbmUpIHtcblx0XHRpZiAoIWdhbWVPYmplY3Quc2tlbGV0b24pIHJldHVybiB7IHg6IDAsIHk6IDAsIHdpZHRoOiAwLCBoZWlnaHQ6IDAgfTtcblx0XHQvLyBNYWtlIGEgY29weSBvZiBhbmltYXRpb24gc3RhdGUgYW5kIHNrZWxldG9uIGFzIHRoaXMgbWlnaHQgYmUgY2FsbGVkIHdoaWxlXG5cdFx0Ly8gdGhlIHNrZWxldG9uIGluIHRoZSBHYW1lT2JqZWN0IGhhcyBhbHJlYWR5IGJlZW4gaGVhdmlseSBtb2RpZmllZC4gV2UgY2FuIG5vdFxuXHRcdC8vIHJlY29uc3RydWN0IHRoYXQgc3RhdGUuXG5cdFx0Y29uc3Qgc2tlbGV0b24gPSBuZXcgU2tlbGV0b24oZ2FtZU9iamVjdC5za2VsZXRvbi5kYXRhKTtcblx0XHRza2VsZXRvbi5zZXRUb1NldHVwUG9zZSgpO1xuXHRcdHNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKFBoeXNpY3MudXBkYXRlKTtcblx0XHRjb25zdCBib3VuZHMgPSBza2VsZXRvbi5nZXRCb3VuZHNSZWN0KHRoaXMuY2xpcHBpbmcgPyBuZXcgU2tlbGV0b25DbGlwcGluZygpIDogdW5kZWZpbmVkKTtcblx0XHRyZXR1cm4gYm91bmRzLndpZHRoID09IE51bWJlci5ORUdBVElWRV9JTkZJTklUWVxuXHRcdFx0PyB7IHg6IDAsIHk6IDAsIHdpZHRoOiAwLCBoZWlnaHQ6IDAgfVxuXHRcdFx0OiBib3VuZHM7XG5cdH1cbn1cblxuLyoqIEEgYm91bmRzIHByb3ZpZGVyIHRoYXQgY2FsY3VsYXRlcyB0aGUgYm91bmRpbmcgYm94IGJ5IHRha2luZyB0aGUgbWF4aW11bWcgYm91bmRpbmcgYm94IGZvciBhIGNvbWJpbmF0aW9uIG9mIHNraW5zIGFuZCBzcGVjaWZpYyBhbmltYXRpb24uICovXG5leHBvcnQgY2xhc3MgU2tpbnNBbmRBbmltYXRpb25Cb3VuZHNQcm92aWRlclxuXHRpbXBsZW1lbnRzIFNwaW5lQm91bmRzUHJvdmlkZXIge1xuXHQvKipcblx0ICogQHBhcmFtIGFuaW1hdGlvbiBUaGUgYW5pbWF0aW9uIHRvIHVzZSBmb3IgY2FsY3VsYXRpbmcgdGhlIGJvdW5kcy4gSWYgbnVsbCwgdGhlIHNldHVwIHBvc2UgaXMgdXNlZC5cblx0ICogQHBhcmFtIHNraW5zIFRoZSBza2lucyB0byB1c2UgZm9yIGNhbGN1bGF0aW5nIHRoZSBib3VuZHMuIElmIGVtcHR5LCB0aGUgZGVmYXVsdCBza2luIGlzIHVzZWQuXG5cdCAqIEBwYXJhbSB0aW1lU3RlcCBUaGUgdGltZSBzdGVwIHRvIHVzZSBmb3IgY2FsY3VsYXRpbmcgdGhlIGJvdW5kcy4gQSBzbWFsbGVyIHRpbWUgc3RlcCBtZWFucyBtb3JlIHByZWNpc2lvbiwgYnV0IHNsb3dlciBjYWxjdWxhdGlvbi5cblx0ICogQHBhcmFtIGNsaXBwaW5nIElmIHRydWUsIGNsaXBwaW5nIGF0dGFjaG1lbnRzIGFyZSB1c2VkIHRvIGNvbXB1dGUgdGhlIGJvdW5kcy4gRmFsc2UsIGJ5IGRlZmF1bHQuXG5cdCAqL1xuXHRjb25zdHJ1Y3RvciAoXG5cdFx0cHJpdmF0ZSBhbmltYXRpb246IHN0cmluZyB8IG51bGwsXG5cdFx0cHJpdmF0ZSBza2luczogc3RyaW5nW10gPSBbXSxcblx0XHRwcml2YXRlIHRpbWVTdGVwOiBudW1iZXIgPSAwLjA1LFxuXHRcdHByaXZhdGUgY2xpcHBpbmcgPSBmYWxzZSxcblx0KSB7IH1cblxuXHRjYWxjdWxhdGVCb3VuZHMgKGdhbWVPYmplY3Q6IFNwaW5lKToge1xuXHRcdHg6IG51bWJlcjtcblx0XHR5OiBudW1iZXI7XG5cdFx0d2lkdGg6IG51bWJlcjtcblx0XHRoZWlnaHQ6IG51bWJlcjtcblx0fSB7XG5cdFx0aWYgKCFnYW1lT2JqZWN0LnNrZWxldG9uIHx8ICFnYW1lT2JqZWN0LnN0YXRlKVxuXHRcdFx0cmV0dXJuIHsgeDogMCwgeTogMCwgd2lkdGg6IDAsIGhlaWdodDogMCB9O1xuXHRcdC8vIE1ha2UgYSBjb3B5IG9mIGFuaW1hdGlvbiBzdGF0ZSBhbmQgc2tlbGV0b24gYXMgdGhpcyBtaWdodCBiZSBjYWxsZWQgd2hpbGVcblx0XHQvLyB0aGUgc2tlbGV0b24gaW4gdGhlIEdhbWVPYmplY3QgaGFzIGFscmVhZHkgYmVlbiBoZWF2aWx5IG1vZGlmaWVkLiBXZSBjYW4gbm90XG5cdFx0Ly8gcmVjb25zdHJ1Y3QgdGhhdCBzdGF0ZS5cblx0XHRjb25zdCBhbmltYXRpb25TdGF0ZSA9IG5ldyBBbmltYXRpb25TdGF0ZShnYW1lT2JqZWN0LnN0YXRlLmRhdGEpO1xuXHRcdGNvbnN0IHNrZWxldG9uID0gbmV3IFNrZWxldG9uKGdhbWVPYmplY3Quc2tlbGV0b24uZGF0YSk7XG5cdFx0Y29uc3QgY2xpcHBlciA9IHRoaXMuY2xpcHBpbmcgPyBuZXcgU2tlbGV0b25DbGlwcGluZygpIDogdW5kZWZpbmVkO1xuXHRcdGNvbnN0IGRhdGEgPSBza2VsZXRvbi5kYXRhO1xuXHRcdGlmICh0aGlzLnNraW5zLmxlbmd0aCA+IDApIHtcblx0XHRcdGxldCBjdXN0b21Ta2luID0gbmV3IFNraW4oXCJjdXN0b20tc2tpblwiKTtcblx0XHRcdGZvciAoY29uc3Qgc2tpbk5hbWUgb2YgdGhpcy5za2lucykge1xuXHRcdFx0XHRjb25zdCBza2luID0gZGF0YS5maW5kU2tpbihza2luTmFtZSk7XG5cdFx0XHRcdGlmIChza2luID09IG51bGwpIGNvbnRpbnVlO1xuXHRcdFx0XHRjdXN0b21Ta2luLmFkZFNraW4oc2tpbik7XG5cdFx0XHR9XG5cdFx0XHRza2VsZXRvbi5zZXRTa2luKGN1c3RvbVNraW4pO1xuXHRcdH1cblx0XHRza2VsZXRvbi5zZXRUb1NldHVwUG9zZSgpO1xuXG5cdFx0Y29uc3QgYW5pbWF0aW9uID0gdGhpcy5hbmltYXRpb24gIT0gbnVsbCA/IGRhdGEuZmluZEFuaW1hdGlvbih0aGlzLmFuaW1hdGlvbiEpIDogbnVsbDtcblxuXHRcdGlmIChhbmltYXRpb24gPT0gbnVsbCkge1xuXHRcdFx0c2tlbGV0b24udXBkYXRlV29ybGRUcmFuc2Zvcm0oUGh5c2ljcy51cGRhdGUpO1xuXHRcdFx0Y29uc3QgYm91bmRzID0gc2tlbGV0b24uZ2V0Qm91bmRzUmVjdChjbGlwcGVyKTtcblx0XHRcdHJldHVybiBib3VuZHMud2lkdGggPT0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZXG5cdFx0XHRcdD8geyB4OiAwLCB5OiAwLCB3aWR0aDogMCwgaGVpZ2h0OiAwIH1cblx0XHRcdFx0OiBib3VuZHM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxldCBtaW5YID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuXHRcdFx0XHRtaW5ZID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuXHRcdFx0XHRtYXhYID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZLFxuXHRcdFx0XHRtYXhZID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xuXHRcdFx0YW5pbWF0aW9uU3RhdGUuY2xlYXJUcmFja3MoKTtcblx0XHRcdGFuaW1hdGlvblN0YXRlLnNldEFuaW1hdGlvbldpdGgoMCwgYW5pbWF0aW9uLCBmYWxzZSk7XG5cdFx0XHRjb25zdCBzdGVwcyA9IE1hdGgubWF4KGFuaW1hdGlvbi5kdXJhdGlvbiAvIHRoaXMudGltZVN0ZXAsIDEuMCk7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHN0ZXBzOyBpKyspIHtcblx0XHRcdFx0Y29uc3QgZGVsdGEgPSBpID4gMCA/IHRoaXMudGltZVN0ZXAgOiAwO1xuXHRcdFx0XHRhbmltYXRpb25TdGF0ZS51cGRhdGUoZGVsdGEpO1xuXHRcdFx0XHRhbmltYXRpb25TdGF0ZS5hcHBseShza2VsZXRvbik7XG5cdFx0XHRcdHNrZWxldG9uLnVwZGF0ZShkZWx0YSk7XG5cdFx0XHRcdHNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKFBoeXNpY3MudXBkYXRlKTtcblxuXHRcdFx0XHRjb25zdCBib3VuZHMgPSBza2VsZXRvbi5nZXRCb3VuZHNSZWN0KGNsaXBwZXIpO1xuXHRcdFx0XHRtaW5YID0gTWF0aC5taW4obWluWCwgYm91bmRzLngpO1xuXHRcdFx0XHRtaW5ZID0gTWF0aC5taW4obWluWSwgYm91bmRzLnkpO1xuXHRcdFx0XHRtYXhYID0gTWF0aC5tYXgobWF4WCwgYm91bmRzLnggKyBib3VuZHMud2lkdGgpO1xuXHRcdFx0XHRtYXhZID0gTWF0aC5tYXgobWF4WSwgYm91bmRzLnkgKyBib3VuZHMuaGVpZ2h0KTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGJvdW5kcyA9IHtcblx0XHRcdFx0eDogbWluWCxcblx0XHRcdFx0eTogbWluWSxcblx0XHRcdFx0d2lkdGg6IG1heFggLSBtaW5YLFxuXHRcdFx0XHRoZWlnaHQ6IG1heFkgLSBtaW5ZLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBib3VuZHMud2lkdGggPT0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZXG5cdFx0XHRcdD8geyB4OiAwLCB5OiAwLCB3aWR0aDogMCwgaGVpZ2h0OiAwIH1cblx0XHRcdFx0OiBib3VuZHM7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogVGhlIGNsYXNzIHRvIGluc3RhbnRpYXRlIGEge0BsaW5rIFNwaW5lfSBnYW1lIG9iamVjdCBpbiBQaXhpLlxuICogVGhlIHN0YXRpYyBtZXRob2Qge0BsaW5rIFNwaW5lLmZyb219IHNob3VsZCBiZSB1c2VkIHRvIGluc3RhbnRpYXRlIGEgU3BpbmUgZ2FtZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBTcGluZSBleHRlbmRzIENvbnRhaW5lciB7XG5cdC8qKiBUaGUgc2tlbGV0b24gZm9yIHRoaXMgU3BpbmUgZ2FtZSBvYmplY3QuICovXG5cdHB1YmxpYyBza2VsZXRvbjogU2tlbGV0b247XG5cdC8qKiBUaGUgYW5pbWF0aW9uIHN0YXRlIGZvciB0aGlzIFNwaW5lIGdhbWUgb2JqZWN0LiAqL1xuXHRwdWJsaWMgc3RhdGU6IEFuaW1hdGlvblN0YXRlO1xuXG5cdHByaXZhdGUgZGFya1RpbnQgPSBmYWxzZTtcblx0cHJpdmF0ZSBoYXNOZXZlclVwZGF0ZWQgPSB0cnVlO1xuXG5cdHByaXZhdGUgX2RlYnVnPzogSVNwaW5lRGVidWdSZW5kZXJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblx0cHVibGljIGdldCBkZWJ1ZyAoKTogSVNwaW5lRGVidWdSZW5kZXJlciB8IHVuZGVmaW5lZCB7XG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnO1xuXHR9XG5cdC8qKiBQYXNzIGEge0BsaW5rIFNwaW5lRGVidWdSZW5kZXJlcn0gb3IgY3JlYXRlIHlvdXIgb3duIHtAbGluayBJU3BpbmVEZWJ1Z1JlbmRlcmVyfSB0byByZW5kZXIgYm9uZXMsIG1lc2hlcywgLi4uXG5cdCAqIEBleGFtcGxlIHNwaW5lR08uZGVidWcgPSBuZXcgU3BpbmVEZWJ1Z1JlbmRlcmVyKCk7XG5cdCAqL1xuXHRwdWJsaWMgc2V0IGRlYnVnICh2YWx1ZTogSVNwaW5lRGVidWdSZW5kZXJlciB8IHVuZGVmaW5lZCkge1xuXHRcdGlmICh0aGlzLl9kZWJ1Zykge1xuXHRcdFx0dGhpcy5fZGVidWcudW5yZWdpc3RlclNwaW5lKHRoaXMpO1xuXHRcdH1cblx0XHRpZiAodmFsdWUpIHtcblx0XHRcdHZhbHVlLnJlZ2lzdGVyU3BpbmUodGhpcyk7XG5cdFx0fVxuXHRcdHRoaXMuX2RlYnVnID0gdmFsdWU7XG5cdH1cblxuXHRwcm90ZWN0ZWQgc2xvdE1lc2hGYWN0b3J5OiAoKSA9PiBJU2xvdE1lc2ggPSAoKSA9PiBuZXcgU2xvdE1lc2goKTtcblxuXHRiZWZvcmVVcGRhdGVXb3JsZFRyYW5zZm9ybXM6IChvYmplY3Q6IFNwaW5lKSA9PiB2b2lkID0gKCkgPT4geyB9O1xuXHRhZnRlclVwZGF0ZVdvcmxkVHJhbnNmb3JtczogKG9iamVjdDogU3BpbmUpID0+IHZvaWQgPSAoKSA9PiB7IH07XG5cblx0cHJpdmF0ZSBfYXV0b1VwZGF0ZTogYm9vbGVhbiA9IGZhbHNlO1xuXHRwdWJsaWMgZ2V0IGF1dG9VcGRhdGUgKCk6IGJvb2xlYW4ge1xuXHRcdHJldHVybiB0aGlzLl9hdXRvVXBkYXRlO1xuXHR9XG5cdC8qKiBXaGVuIGB0cnVlYCwgdGhlIFNwaW5lIEFuaW1hdGlvblN0YXRlIGFuZCB0aGUgU2tlbGV0b24gd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQgdXNpbmcgdGhlIHtAbGluayBUaWNrZXIuc2hhcmVkfSBpbnN0YW5jZS4gKi9cblx0cHVibGljIHNldCBhdXRvVXBkYXRlICh2YWx1ZTogYm9vbGVhbikge1xuXHRcdGlmICh2YWx1ZSAmJiAhdGhpcy5fYXV0b1VwZGF0ZSkge1xuXHRcdFx0VGlja2VyLnNoYXJlZC5hZGQodGhpcy5pbnRlcm5hbFVwZGF0ZSwgdGhpcyk7XG5cdFx0fSBlbHNlIGlmICghdmFsdWUgJiYgdGhpcy5fYXV0b1VwZGF0ZSkge1xuXHRcdFx0VGlja2VyLnNoYXJlZC5yZW1vdmUodGhpcy5pbnRlcm5hbFVwZGF0ZSwgdGhpcyk7XG5cdFx0fVxuXHRcdHRoaXMuX2F1dG9VcGRhdGUgPSB2YWx1ZTtcblx0fVxuXG5cdHByaXZhdGUgbWVzaGVzQ2FjaGUgPSBuZXcgTWFwPFNsb3QsIElTbG90TWVzaD4oKTtcblxuXHRwcml2YXRlIHN0YXRpYyB2ZWN0b3JBdXg6IFZlY3RvcjIgPSBuZXcgVmVjdG9yMigpO1xuXHRwcml2YXRlIHN0YXRpYyBjbGlwcGVyOiBTa2VsZXRvbkNsaXBwaW5nID0gbmV3IFNrZWxldG9uQ2xpcHBpbmcoKTtcblxuXHRwcml2YXRlIHN0YXRpYyBRVUFEX1RSSUFOR0xFUyA9IFswLCAxLCAyLCAyLCAzLCAwXTtcblx0cHJpdmF0ZSBzdGF0aWMgVkVSVEVYX1NJWkUgPSAyICsgMiArIDQ7XG5cdHByaXZhdGUgc3RhdGljIERBUktfVkVSVEVYX1NJWkUgPSAyICsgMiArIDQgKyA0O1xuXG5cdHByaXZhdGUgbGlnaHRDb2xvciA9IG5ldyBDb2xvcigpO1xuXHRwcml2YXRlIGRhcmtDb2xvciA9IG5ldyBDb2xvcigpO1xuXG5cdHByaXZhdGUgX2JvdW5kc1Byb3ZpZGVyPzogU3BpbmVCb3VuZHNQcm92aWRlcjtcblx0LyoqIFRoZSBib3VuZHMgcHJvdmlkZXIgdG8gdXNlLiBJZiB1bmRlZmluZWQgdGhlIGJvdW5kcyB3aWxsIGJlIGR5bmFtaWMsIGNhbGN1bGF0ZWQgd2hlbiByZXF1ZXN0ZWQgYW5kIGJhc2VkIG9uIHRoZSBjdXJyZW50IGZyYW1lLiAqL1xuXHRwdWJsaWMgZ2V0IGJvdW5kc1Byb3ZpZGVyICgpOiBTcGluZUJvdW5kc1Byb3ZpZGVyIHwgdW5kZWZpbmVkIHtcblx0XHRyZXR1cm4gdGhpcy5fYm91bmRzUHJvdmlkZXI7XG5cdH1cblx0cHVibGljIHNldCBib3VuZHNQcm92aWRlciAodmFsdWU6IFNwaW5lQm91bmRzUHJvdmlkZXIgfCB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9ib3VuZHNQcm92aWRlciA9IHZhbHVlO1xuXHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5fYm91bmRzU3BpbmVJRCA9IC0xO1xuXHRcdFx0dGhpcy5fYm91bmRzU3BpbmVEaXJ0eSA9IHRydWU7XG5cdFx0XHR0aGlzLmludGVyYWN0aXZlQ2hpbGRyZW4gPSBmYWxzZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5pbnRlcmFjdGl2ZUNoaWxkcmVuID0gdHJ1ZTtcblx0XHRcdHRoaXMuaGl0QXJlYSA9IG51bGw7XG5cdFx0fVxuXHRcdHRoaXMuY2FsY3VsYXRlQm91bmRzKCk7XG5cdH1cblx0cHJpdmF0ZSBfYm91bmRzUG9pbnQgPSBuZXcgUG9pbnQoKTtcblx0cHJpdmF0ZSBfYm91bmRzU3BpbmVJRCA9IC0xO1xuXHRwcml2YXRlIF9ib3VuZHNTcGluZURpcnR5ID0gdHJ1ZTtcblxuXHRjb25zdHJ1Y3RvciAob3B0aW9uczogU3BpbmVPcHRpb25zIHwgU2tlbGV0b25EYXRhLCBvbGRPcHRpb25zPzogSVNwaW5lT3B0aW9ucykge1xuXHRcdGlmIChvcHRpb25zIGluc3RhbmNlb2YgU2tlbGV0b25EYXRhKSB7XG5cdFx0XHRvcHRpb25zID0ge1xuXHRcdFx0XHQuLi5vbGRPcHRpb25zLFxuXHRcdFx0XHRza2VsZXRvbkRhdGE6IG9wdGlvbnMsXG5cdFx0XHR9O1xuXHRcdH0gZWxzZSBpZiAob2xkT3B0aW9ucykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiWW91IGNhbm5vdCB1c2Ugb3B0aW9ucyBhbmQgb2xkT3B0aW9ucyB0b2dldGhlci5cIik7XG5cdFx0fVxuXG5cdFx0c3VwZXIoKTtcblxuXHRcdGNvbnN0IHNrZWxldG9uRGF0YSA9IG9wdGlvbnMgaW5zdGFuY2VvZiBTa2VsZXRvbkRhdGEgPyBvcHRpb25zIDogb3B0aW9ucy5za2VsZXRvbkRhdGE7XG5cblx0XHR0aGlzLnNrZWxldG9uID0gbmV3IFNrZWxldG9uKHNrZWxldG9uRGF0YSk7XG5cdFx0Y29uc3QgYW5pbURhdGEgPSBuZXcgQW5pbWF0aW9uU3RhdGVEYXRhKHNrZWxldG9uRGF0YSk7XG5cdFx0dGhpcy5zdGF0ZSA9IG5ldyBBbmltYXRpb25TdGF0ZShhbmltRGF0YSk7XG5cblx0XHQvLyBkYXJrIHRpbnQgY2FuIGJlIGVuYWJsZWQgYnkgb3B0aW9ucywgb3RoZXJ3aXNlIGlzIGVuYWJsZSBpZiBhdCBsZWFzdCBvbmUgc2xvdCBoYXMgdGludCBibGFja1xuXHRcdGlmIChvcHRpb25zPy5kYXJrVGludCAhPT0gdW5kZWZpbmVkIHx8IG9sZE9wdGlvbnM/LnNsb3RNZXNoRmFjdG9yeSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLmRhcmtUaW50ID0gb3B0aW9ucz8uZGFya1RpbnQgPT09IHVuZGVmaW5lZFxuXHRcdFx0XHQ/IHRoaXMuc2tlbGV0b24uc2xvdHMuc29tZShzbG90ID0+ICEhc2xvdC5kYXRhLmRhcmtDb2xvcilcblx0XHRcdFx0OiBvcHRpb25zPy5kYXJrVGludDtcblx0XHRcdGlmICh0aGlzLmRhcmtUaW50KSB0aGlzLnNsb3RNZXNoRmFjdG9yeSA9ICgpID0+IG5ldyBEYXJrU2xvdE1lc2goKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5pbml0aWFsaXplTWVzaEZhY3Rvcnkob2xkT3B0aW9ucz8uc2xvdE1lc2hGYWN0b3J5KTtcblx0XHR9XG5cblx0XHR0aGlzLmF1dG9VcGRhdGUgPSBvcHRpb25zPy5hdXRvVXBkYXRlID8/IHRydWU7XG5cblx0XHR0aGlzLmJvdW5kc1Byb3ZpZGVyID0gb3B0aW9ucy5ib3VuZHNQcm92aWRlcjtcblx0fVxuXG5cdC8qXG5cdCogQGRlcHJlY2F0ZWQgUmVtb3ZlIHdoZW4gc2xvdE1lc2hGYWN0b3J5IG9wdGlvbnMgaXMgcmVtb3ZlZFxuXHQqL1xuXHRwcml2YXRlIGluaXRpYWxpemVNZXNoRmFjdG9yeTxUIGV4dGVuZHMgKCkgPT4gSVNsb3RNZXNoPiAoc2xvdE1lc2hGYWN0b3J5PzogVCkge1xuXHRcdGlmIChzbG90TWVzaEZhY3RvcnkpIHtcblx0XHRcdHRoaXMuc2xvdE1lc2hGYWN0b3J5ID0gc2xvdE1lc2hGYWN0b3J5O1xuXHRcdFx0Y29uc3QgdGVtcFNsb3RNZXNoRmFjdG9yeSA9IHRoaXMuc2xvdE1lc2hGYWN0b3J5KCk7XG5cdFx0XHRpZiAodGVtcFNsb3RNZXNoRmFjdG9yeSBpbnN0YW5jZW9mIERhcmtTbG90TWVzaCkgdGhpcy5kYXJrVGludCA9IHRydWU7XG5cdFx0XHR0ZW1wU2xvdE1lc2hGYWN0b3J5LmRlc3Ryb3koKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNrZWxldG9uLnNsb3RzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmICh0aGlzLnNrZWxldG9uLnNsb3RzW2ldLmRhdGEuZGFya0NvbG9yKSB7XG5cdFx0XHRcdFx0dGhpcy5zbG90TWVzaEZhY3RvcnkgPSAoKSA9PiBuZXcgRGFya1Nsb3RNZXNoKCk7XG5cdFx0XHRcdFx0dGhpcy5kYXJrVGludCA9IHRydWU7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKiogSWYge0BsaW5rIFNwaW5lLmF1dG9VcGRhdGV9IGlzIGBmYWxzZWAsIHRoaXMgbWV0aG9kIGFsbG93cyB0byB1cGRhdGUgdGhlIEFuaW1hdGlvblN0YXRlIGFuZCB0aGUgU2tlbGV0b24gd2l0aCB0aGUgZ2l2ZW4gZGVsdGEuICovXG5cdHB1YmxpYyB1cGRhdGUgKGRlbHRhU2Vjb25kczogbnVtYmVyKTogdm9pZCB7XG5cdFx0dGhpcy5pbnRlcm5hbFVwZGF0ZSgwLCBkZWx0YVNlY29uZHMpO1xuXHR9XG5cblx0cHJvdGVjdGVkIGludGVybmFsVXBkYXRlIChfZGVsdGFGcmFtZTogbnVtYmVyLCBkZWx0YVNlY29uZHM/OiBudW1iZXIpOiB2b2lkIHtcblx0XHR0aGlzLmhhc05ldmVyVXBkYXRlZCA9IGZhbHNlO1xuXG5cdFx0Ly8gQmVjYXVzZSByZWFzb25zLCBwaXhpIHVzZXMgZGVsdGFGcmFtZXMgYXQgNjBmcHMuIFdlIGlnbm9yZSB0aGUgZGVmYXVsdCBkZWx0YUZyYW1lcyBhbmQgdXNlIHRoZSBkZWx0YVNlY29uZHMgZnJvbSBwaXhpIHRpY2tlci5cblx0XHRjb25zdCBkZWx0YSA9IGRlbHRhU2Vjb25kcyA/PyBUaWNrZXIuc2hhcmVkLmRlbHRhTVMgLyAxMDAwO1xuXHRcdHRoaXMuc3RhdGUudXBkYXRlKGRlbHRhKTtcblx0XHR0aGlzLnN0YXRlLmFwcGx5KHRoaXMuc2tlbGV0b24pO1xuXHRcdHRoaXMuYmVmb3JlVXBkYXRlV29ybGRUcmFuc2Zvcm1zKHRoaXMpO1xuXHRcdHRoaXMuc2tlbGV0b24udXBkYXRlKGRlbHRhKTtcblx0XHR0aGlzLnNrZWxldG9uLnVwZGF0ZVdvcmxkVHJhbnNmb3JtKFBoeXNpY3MudXBkYXRlKTtcblx0XHR0aGlzLmFmdGVyVXBkYXRlV29ybGRUcmFuc2Zvcm1zKHRoaXMpO1xuXHR9XG5cblx0LyoqIFJlbmRlciB0aGUgbWVzaGVzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHNrZWxldG9uIHN0YXRlLCByZW5kZXIgZGVidWcgaW5mb3JtYXRpb24sIHRoZW4gY2FsbCB7QGxpbmsgQ29udGFpbmVyLnVwZGF0ZVRyYW5zZm9ybX0uICovXG5cdHB1YmxpYyBvdmVycmlkZSB1cGRhdGVUcmFuc2Zvcm0gKCk6IHZvaWQge1xuXHRcdHRoaXMucmVuZGVyTWVzaGVzKCk7XG5cdFx0dGhpcy5zb3J0Q2hpbGRyZW4oKTtcblx0XHR0aGlzLmRlYnVnPy5yZW5kZXJEZWJ1Zyh0aGlzKTtcblx0XHRzdXBlci51cGRhdGVUcmFuc2Zvcm0oKTtcblx0fVxuXG5cdC8qKiBEZXN0cm95IFNwaW5lIGdhbWUgb2JqZWN0IGVsZW1lbnRzLCB0aGVuIGNhbGwgdGhlIHtAbGluayBDb250YWluZXIuZGVzdHJveX0gd2l0aCB0aGUgZ2l2ZW4gb3B0aW9ucyAqL1xuXHRwdWJsaWMgb3ZlcnJpZGUgZGVzdHJveSAob3B0aW9ucz86IGJvb2xlYW4gfCBJRGVzdHJveU9wdGlvbnMgfCB1bmRlZmluZWQpOiB2b2lkIHtcblx0XHRpZiAodGhpcy5hdXRvVXBkYXRlKSB0aGlzLmF1dG9VcGRhdGUgPSBmYWxzZTtcblx0XHRmb3IgKGNvbnN0IFssIG1lc2hdIG9mIHRoaXMubWVzaGVzQ2FjaGUpIHtcblx0XHRcdG1lc2g/LmRlc3Ryb3koKTtcblx0XHR9XG5cdFx0dGhpcy5zdGF0ZS5jbGVhckxpc3RlbmVycygpO1xuXHRcdHRoaXMuZGVidWcgPSB1bmRlZmluZWQ7XG5cdFx0dGhpcy5tZXNoZXNDYWNoZS5jbGVhcigpO1xuXHRcdHRoaXMuc2xvdHNPYmplY3QuY2xlYXIoKTtcblxuXHRcdGZvciAobGV0IG1hc2tLZXkgaW4gdGhpcy5jbGlwcGluZ1Nsb3RUb1BpeGlNYXNrcykge1xuXHRcdFx0Y29uc3QgbWFza09iaiA9IHRoaXMuY2xpcHBpbmdTbG90VG9QaXhpTWFza3NbbWFza0tleV07XG5cdFx0XHRtYXNrT2JqLm1hc2s/LmRlc3Ryb3koKTtcblx0XHRcdGRlbGV0ZSB0aGlzLmNsaXBwaW5nU2xvdFRvUGl4aU1hc2tzW21hc2tLZXldO1xuXHRcdH1cblxuXHRcdHN1cGVyLmRlc3Ryb3kob3B0aW9ucyk7XG5cdH1cblxuXHRwcml2YXRlIHJlc2V0TWVzaGVzICgpOiB2b2lkIHtcblx0XHRmb3IgKGNvbnN0IFssIG1lc2hdIG9mIHRoaXMubWVzaGVzQ2FjaGUpIHtcblx0XHRcdG1lc2guekluZGV4ID0gLTE7XG5cdFx0XHRtZXNoLnZpc2libGUgPSBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRwcm90ZWN0ZWQgX2NhbGN1bGF0ZUJvdW5kcyAoKTogdm9pZCB7XG5cdFx0aWYgKHRoaXMuaGFzTmV2ZXJVcGRhdGVkKSB7XG5cdFx0XHR0aGlzLmludGVybmFsVXBkYXRlKDAsIDApO1xuXHRcdFx0dGhpcy5yZW5kZXJNZXNoZXMoKTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQ2hlY2sgdGhlIGV4aXN0ZW5jZSBvZiBhIG1lc2ggZm9yIHRoZSBnaXZlbiBzbG90LlxuXHQgKiBJZiB5b3Ugd2FudCB0byBtYW51YWxseSBoYW5kbGUgd2hpY2ggbWVzaGVzIGdvIG9uIHdoaWNoIHNsb3QgYW5kIGhvdyB5b3UgY2FjaGUsIG92ZXJ3cml0ZSB0aGlzIG1ldGhvZC5cblx0ICovXG5cdHByb3RlY3RlZCBoYXNNZXNoRm9yU2xvdCAoc2xvdDogU2xvdCkge1xuXHRcdHJldHVybiB0aGlzLm1lc2hlc0NhY2hlLmhhcyhzbG90KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBTZWFyY2ggdGhlIG1lc2ggY29ycmVzcG9uZGluZyB0byB0aGUgZ2l2ZW4gc2xvdCBvciBjcmVhdGUgaXQsIGlmIGl0IGRvZXMgbm90IGV4aXN0cy5cblx0ICogSWYgeW91IHdhbnQgdG8gbWFudWFsbHkgaGFuZGxlIHdoaWNoIG1lc2hlcyBnbyBvbiB3aGljaCBzbG90IGFuZCBob3cgeW91IGNhY2hlLCBvdmVyd3JpdGUgdGhpcyBtZXRob2QuXG5cdCAqL1xuXHRwcm90ZWN0ZWQgZ2V0TWVzaEZvclNsb3QgKHNsb3Q6IFNsb3QpOiBJU2xvdE1lc2gge1xuXHRcdGlmICghdGhpcy5oYXNNZXNoRm9yU2xvdChzbG90KSkge1xuXHRcdFx0bGV0IG1lc2ggPSB0aGlzLnNsb3RNZXNoRmFjdG9yeSgpO1xuXHRcdFx0dGhpcy5hZGRDaGlsZChtZXNoKTtcblx0XHRcdHRoaXMubWVzaGVzQ2FjaGUuc2V0KHNsb3QsIG1lc2gpO1xuXHRcdFx0cmV0dXJuIG1lc2g7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxldCBtZXNoID0gdGhpcy5tZXNoZXNDYWNoZS5nZXQoc2xvdCkhO1xuXHRcdFx0bWVzaC52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdHJldHVybiBtZXNoO1xuXHRcdH1cblx0fVxuXG5cdHB1YmxpYyBzbG90c09iamVjdCA9IG5ldyBNYXA8U2xvdCwgeyBjb250YWluZXI6IENvbnRhaW5lciwgZm9sbG93QXR0YWNobWVudFRpbWVsaW5lOiBib29sZWFuIH0+KCk7XG5cdHByaXZhdGUgZ2V0U2xvdEZyb21SZWYgKHNsb3RSZWY6IG51bWJlciB8IHN0cmluZyB8IFNsb3QpOiBTbG90IHtcblx0XHRsZXQgc2xvdDogU2xvdCB8IG51bGw7XG5cdFx0aWYgKHR5cGVvZiBzbG90UmVmID09PSAnbnVtYmVyJykgc2xvdCA9IHRoaXMuc2tlbGV0b24uc2xvdHNbc2xvdFJlZl07XG5cdFx0ZWxzZSBpZiAodHlwZW9mIHNsb3RSZWYgPT09ICdzdHJpbmcnKSBzbG90ID0gdGhpcy5za2VsZXRvbi5maW5kU2xvdChzbG90UmVmKTtcblx0XHRlbHNlIHNsb3QgPSBzbG90UmVmO1xuXG5cdFx0aWYgKCFzbG90KSB0aHJvdyBuZXcgRXJyb3IoYE5vIHNsb3QgZm91bmQgd2l0aCB0aGUgZ2l2ZW4gc2xvdCByZWZlcmVuY2U6ICR7c2xvdFJlZn1gKTtcblxuXHRcdHJldHVybiBzbG90O1xuXHR9XG5cdC8qKlxuXHQgKiBBZGQgYSBwaXhpIENvbnRhaW5lciBhcyBhIGNoaWxkIG9mIHRoZSBTcGluZSBvYmplY3QuXG5cdCAqIFRoZSBDb250YWluZXIgd2lsbCBiZSByZW5kZXJlZCBjb2hlcmVudGx5IHdpdGggdGhlIGRyYXcgb3JkZXIgb2YgdGhlIHNsb3QuXG5cdCAqIElmIGFuIGF0dGFjaG1lbnQgaXMgYWN0aXZlIG9uIHRoZSBzbG90LCB0aGUgcGl4aSBDb250YWluZXIgd2lsbCBiZSByZW5kZXJlZCBvbiB0b3Agb2YgaXQuXG5cdCAqIElmIHRoZSBDb250YWluZXIgaXMgYWxyZWFkeSBhdHRhY2hlZCB0byB0aGUgZ2l2ZW4gc2xvdCwgbm90aGluZyB3aWxsIGhhcHBlbi5cblx0ICogSWYgdGhlIENvbnRhaW5lciBpcyBhbHJlYWR5IGF0dGFjaGVkIHRvIGFub3RoZXIgc2xvdCwgaXQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhhdCBzbG90XG5cdCAqIGJlZm9yZSBhZGRpbmcgaXQgdG8gdGhlIGdpdmVuIG9uZS5cblx0ICogSWYgYW5vdGhlciBDb250YWluZXIgaXMgYWxyZWFkeSBhdHRhY2hlZCB0byB0aGlzIHNsb3QsIHRoZSBvbGQgb25lIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoaXNcblx0ICogc2xvdCBiZWZvcmUgYWRkaW5nIGl0IHRvIHRoZSBjdXJyZW50IG9uZS5cblx0ICogQHBhcmFtIHNsb3RSZWYgLSBUaGUgc2xvdCBpbmRleCwgb3IgdGhlIHNsb3QgbmFtZSwgb3IgdGhlIFNsb3Qgd2hlcmUgdGhlIHBpeGkgb2JqZWN0IHdpbGwgYmUgYWRkZWQgdG8uXG5cdCAqIEBwYXJhbSBwaXhpT2JqZWN0IC0gVGhlIHBpeGkgQ29udGFpbmVyIHRvIGFkZC5cblx0ICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBzZXR0aW5ncyBmb3IgdGhlIGF0dGFjaG1lbnQuXG5cdCAqIEBwYXJhbSBvcHRpb25zLmZvbGxvd0F0dGFjaG1lbnRUaW1lbGluZSAtIElmIHRydWUsIHRoZSBhdHRhY2htZW50IHdpbGwgZm9sbG93IHRoZSBzbG90J3MgYXR0YWNobWVudCB0aW1lbGluZS5cblx0ICovXG5cdGFkZFNsb3RPYmplY3QgKHNsb3RSZWY6IG51bWJlciB8IHN0cmluZyB8IFNsb3QsIHBpeGlPYmplY3Q6IENvbnRhaW5lciwgb3B0aW9ucz86IHsgZm9sbG93QXR0YWNobWVudFRpbWVsaW5lPzogYm9vbGVhbiB9KTogdm9pZCB7XG5cdFx0bGV0IHNsb3QgPSB0aGlzLmdldFNsb3RGcm9tUmVmKHNsb3RSZWYpO1xuXHRcdGNvbnN0IG9sZFBpeGlPYmplY3QgPSB0aGlzLnNsb3RzT2JqZWN0LmdldChzbG90KT8uY29udGFpbmVyO1xuXHRcdGlmIChvbGRQaXhpT2JqZWN0ICYmIG9sZFBpeGlPYmplY3QgPT09IHBpeGlPYmplY3QpIHJldHVybjtcblxuXHRcdC8vIHNlYXJjaCBpZiB0aGUgcGl4aU9iamVjdCB3YXMgYWxyZWFkeSBpbiBhbm90aGVyIHNsb3RPYmplY3Rcblx0XHRmb3IgKGNvbnN0IFtvdGhlclNsb3QsIHsgY29udGFpbmVyOiBvbGRQaXhpT2JqZWN0QW5vdGhlclNsb3QgfV0gb2YgdGhpcy5zbG90c09iamVjdCkge1xuXHRcdFx0aWYgKG90aGVyU2xvdCAhPT0gc2xvdCAmJiBvbGRQaXhpT2JqZWN0QW5vdGhlclNsb3QgPT09IHBpeGlPYmplY3QpIHtcblx0XHRcdFx0dGhpcy5yZW1vdmVTbG90T2JqZWN0KG90aGVyU2xvdCwgcGl4aU9iamVjdCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChvbGRQaXhpT2JqZWN0KSB0aGlzLnJlbW92ZUNoaWxkKG9sZFBpeGlPYmplY3QpO1xuXG5cdFx0dGhpcy5zbG90c09iamVjdC5zZXQoc2xvdCwge1xuXHRcdFx0Y29udGFpbmVyOiBwaXhpT2JqZWN0LFxuXHRcdFx0Zm9sbG93QXR0YWNobWVudFRpbWVsaW5lOiBvcHRpb25zPy5mb2xsb3dBdHRhY2htZW50VGltZWxpbmUgfHwgZmFsc2UsXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGRDaGlsZChwaXhpT2JqZWN0KTtcblx0fVxuXHQvKipcblx0ICogUmV0dXJuIHRoZSBDb250YWluZXIgY29ubmVjdGVkIHRvIHRoZSBnaXZlbiBzbG90LCBpZiBhbnkuXG5cdCAqIE90aGVyd2lzZSByZXR1cm4gdW5kZWZpbmVkXG5cdCAqIEBwYXJhbSBwaXhpT2JqZWN0IC0gVGhlIHNsb3QgaW5kZXgsIG9yIHRoZSBzbG90IG5hbWUsIG9yIHRoZSBTbG90IHRvIGdldCB0aGUgQ29udGFpbmVyIGZyb20uXG5cdCAqIEByZXR1cm5zIGEgQ29udGFpbmVyIGlmIGFueSwgdW5kZWZpbmVkIG90aGVyd2lzZS5cblx0ICovXG5cdGdldFNsb3RPYmplY3QgKHNsb3RSZWY6IG51bWJlciB8IHN0cmluZyB8IFNsb3QpOiBDb250YWluZXIgfCB1bmRlZmluZWQge1xuXHRcdGNvbnN0IGVsZW1lbnQgPSB0aGlzLnNsb3RzT2JqZWN0LmdldCh0aGlzLmdldFNsb3RGcm9tUmVmKHNsb3RSZWYpKTtcblx0XHRyZXR1cm4gZWxlbWVudCA/IGVsZW1lbnQuY29udGFpbmVyIDogdW5kZWZpbmVkO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlbW92ZSBhIHNsb3Qgb2JqZWN0IGZyb20gdGhlIGdpdmVuIHNsb3QuXG5cdCAqIElmIGBwaXhpT2JqZWN0YCBpcyBwYXNzZWQgYW5kIGF0dGFjaGVkIHRvIHRoZSBnaXZlbiBzbG90LCByZW1vdmUgaXQgZnJvbSB0aGUgc2xvdC5cblx0ICogSWYgYHBpeGlPYmplY3RgIGlzIG5vdCBwYXNzZWQgYW5kIHRoZSBnaXZlbiBzbG90IGhhcyBhbiBhdHRhY2hlZCBDb250YWluZXIsIHJlbW92ZSBpdCBmcm9tIHRoZSBzbG90LlxuXHQgKiBAcGFyYW0gc2xvdFJlZiAtIFRoZSBzbG90IGluZGV4LCBvciB0aGUgc2xvdCBuYW1lLCBvciB0aGUgU2xvdCB3aGVyZSB0aGUgcGl4aSBvYmplY3Qgd2lsbCBiZSByZW1vdmUgZnJvbS5cblx0ICogQHBhcmFtIHBpeGlPYmplY3QgLSBPcHRpb25hbCwgVGhlIHBpeGkgQ29udGFpbmVyIHRvIHJlbW92ZS5cblx0ICovXG5cdHJlbW92ZVNsb3RPYmplY3QgKHNsb3RSZWY6IG51bWJlciB8IHN0cmluZyB8IFNsb3QsIHBpeGlPYmplY3Q/OiBDb250YWluZXIpOiB2b2lkIHtcblx0XHRsZXQgc2xvdCA9IHRoaXMuZ2V0U2xvdEZyb21SZWYoc2xvdFJlZik7XG5cdFx0bGV0IHNsb3RPYmplY3QgPSB0aGlzLnNsb3RzT2JqZWN0LmdldChzbG90KT8uY29udGFpbmVyO1xuXHRcdGlmICghc2xvdE9iamVjdCkgcmV0dXJuO1xuXG5cdFx0Ly8gaWYgcGl4aU9iamVjdCBpcyBwYXNzZWQsIHJlbW92ZSBvbmx5IGlmIGl0IGlzIGVxdWFsIHRvIHRoZSBnaXZlbiBvbmVcblx0XHRpZiAocGl4aU9iamVjdCAmJiBwaXhpT2JqZWN0ICE9PSBzbG90T2JqZWN0KSByZXR1cm47XG5cblx0XHR0aGlzLnJlbW92ZUNoaWxkKHNsb3RPYmplY3QpO1xuXHRcdHRoaXMuc2xvdHNPYmplY3QuZGVsZXRlKHNsb3QpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgYWxsIFBpeGlKUyBjb250YWluZXJzIGF0dGFjaGVkIHRvIGFueSBzbG90LlxuXHQgKi9cblx0cHVibGljIHJlbW92ZVNsb3RPYmplY3RzICgpIHtcblx0XHRmb3IgKGNvbnN0IFssIHNsb3RPYmplY3RdIG9mIHRoaXMuc2xvdHNPYmplY3QpIHtcblx0XHRcdHNsb3RPYmplY3QuY29udGFpbmVyLnJlbW92ZUZyb21QYXJlbnQoKTtcblx0XHR9XG5cdFx0dGhpcy5zbG90c09iamVjdC5jbGVhcigpO1xuXHR9XG5cblx0cHJpdmF0ZSB2ZXJ0aWNlc0NhY2hlOiBOdW1iZXJBcnJheUxpa2UgPSBVdGlscy5uZXdGbG9hdEFycmF5KDEwMjQpO1xuXHRwcml2YXRlIGNsaXBwaW5nU2xvdFRvUGl4aU1hc2tzOiBSZWNvcmQ8c3RyaW5nLCBTbG90c1RvQ2xpcHBpbmc+ID0ge307XG5cblx0cHJpdmF0ZSB1cGRhdGVTbG90T2JqZWN0IChlbGVtZW50OiB7IGNvbnRhaW5lcjogQ29udGFpbmVyLCBmb2xsb3dBdHRhY2htZW50VGltZWxpbmU6IGJvb2xlYW4gfSwgc2xvdDogU2xvdCwgekluZGV4OiBudW1iZXIpIHtcblx0XHRjb25zdCB7IGNvbnRhaW5lcjogc2xvdE9iamVjdCwgZm9sbG93QXR0YWNobWVudFRpbWVsaW5lIH0gPSBlbGVtZW50XG5cblx0XHRjb25zdCBmb2xsb3dBdHRhY2htZW50VmFsdWUgPSBmb2xsb3dBdHRhY2htZW50VGltZWxpbmUgPyBCb29sZWFuKHNsb3QuYXR0YWNobWVudCkgOiB0cnVlO1xuXHRcdHNsb3RPYmplY3QudmlzaWJsZSA9IHRoaXMuc2tlbGV0b24uZHJhd09yZGVyLmluY2x1ZGVzKHNsb3QpICYmIGZvbGxvd0F0dGFjaG1lbnRWYWx1ZTtcblxuXHRcdGlmIChzbG90T2JqZWN0LnZpc2libGUpIHtcblx0XHRcdHNsb3RPYmplY3QucG9zaXRpb24uc2V0KHNsb3QuYm9uZS53b3JsZFgsIHNsb3QuYm9uZS53b3JsZFkpO1xuXHRcdFx0c2xvdE9iamVjdC5hbmdsZSA9IHNsb3QuYm9uZS5nZXRXb3JsZFJvdGF0aW9uWCgpO1xuXG5cdFx0XHRsZXQgYm9uZTogQm9uZSB8IG51bGwgPSBzbG90LmJvbmU7XG5cdFx0XHRsZXQgY3VtdWxhdGl2ZVNjYWxlWCA9IDE7XG5cdFx0XHRsZXQgY3VtdWxhdGl2ZVNjYWxlWSA9IDE7XG5cdFx0XHR3aGlsZSAoYm9uZSkge1xuXHRcdFx0XHRjdW11bGF0aXZlU2NhbGVYICo9IGJvbmUuc2NhbGVYO1xuXHRcdFx0XHRjdW11bGF0aXZlU2NhbGVZICo9IGJvbmUuc2NhbGVZO1xuXHRcdFx0XHRib25lID0gYm9uZS5wYXJlbnQ7XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoY3VtdWxhdGl2ZVNjYWxlWCA8IDApIHNsb3RPYmplY3QuYW5nbGUgLT0gMTgwO1xuXG5cdFx0XHRzbG90T2JqZWN0LnNjYWxlLnNldChcblx0XHRcdFx0c2xvdC5ib25lLmdldFdvcmxkU2NhbGVYKCkgKiBNYXRoLnNpZ24oY3VtdWxhdGl2ZVNjYWxlWCksXG5cdFx0XHRcdHNsb3QuYm9uZS5nZXRXb3JsZFNjYWxlWSgpICogTWF0aC5zaWduKGN1bXVsYXRpdmVTY2FsZVkpLFxuXHRcdFx0KTtcblxuXHRcdFx0c2xvdE9iamVjdC56SW5kZXggPSB6SW5kZXggKyAxO1xuXHRcdFx0c2xvdE9iamVjdC5hbHBoYSA9IHRoaXMuc2tlbGV0b24uY29sb3IuYSAqIHNsb3QuY29sb3IuYTtcblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGN1cnJlbnRDbGlwcGluZ1Nsb3Q6IFNsb3RzVG9DbGlwcGluZyB8IHVuZGVmaW5lZDtcblx0cHJpdmF0ZSB1cGRhdGVBbmRTZXRQaXhpTWFzayAoc2xvdDogU2xvdCwgbGFzdDogYm9vbGVhbikge1xuXHRcdC8vIGFzc2lnbi9jcmVhdGUgdGhlIGN1cnJlbnRDbGlwcGluZ1Nsb3Rcblx0XHRjb25zdCBhdHRhY2htZW50ID0gc2xvdC5hdHRhY2htZW50O1xuXHRcdGlmIChhdHRhY2htZW50ICYmIGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBDbGlwcGluZ0F0dGFjaG1lbnQpIHtcblx0XHRcdGNvbnN0IGNsaXAgPSAodGhpcy5jbGlwcGluZ1Nsb3RUb1BpeGlNYXNrc1tzbG90LmRhdGEubmFtZV0gfHw9IHsgc2xvdCwgdmVydGljZXM6IG5ldyBBcnJheTxudW1iZXI+KCkgfSk7XG5cdFx0XHRjbGlwLm1hc2tDb21wdXRlZCA9IGZhbHNlO1xuXHRcdFx0dGhpcy5jdXJyZW50Q2xpcHBpbmdTbG90ID0gY2xpcDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBhc3NpZ24gdGhlIGN1cnJlbnRDbGlwcGluZ1Nsb3QgbWFzayB0byB0aGUgc2xvdCBvYmplY3Rcblx0XHRsZXQgY3VycmVudENsaXBwaW5nU2xvdCA9IHRoaXMuY3VycmVudENsaXBwaW5nU2xvdDtcblx0XHRjb25zdCBzbG90T2JqZWN0ID0gdGhpcy5zbG90c09iamVjdC5nZXQoc2xvdCk7XG5cdFx0aWYgKGN1cnJlbnRDbGlwcGluZ1Nsb3QgJiYgc2xvdE9iamVjdCkge1xuXHRcdFx0Ly8gY3JlYXRlIHRoZSBwaXhpIG1hc2ssIG9ubHkgdGhlIGZpcnN0IHRpbWUgYW5kIGlmIHRoZSBjbGlwcGVkIHNsb3QgaXMgdGhlIGZpcnN0IG9uZSBjbGlwcGVkIGJ5IHRoaXMgY3VycmVudENsaXBwaW5nU2xvdFxuXHRcdFx0bGV0IG1hc2sgPSBjdXJyZW50Q2xpcHBpbmdTbG90Lm1hc2s7XG5cdFx0XHRpZiAoIW1hc2spIHtcblx0XHRcdFx0bWFzayA9IG1hc2tQb29sLm9idGFpbigpO1xuXHRcdFx0XHRjdXJyZW50Q2xpcHBpbmdTbG90Lm1hc2sgPSBtYXNrO1xuXHRcdFx0XHR0aGlzLmFkZENoaWxkKG1hc2spO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjb21wdXRlIHRoZSBwaXhpIG1hc2sgcG9seWdvbiwgaWYgdGhlIGNsaXBwZWQgc2xvdCBpcyB0aGUgZmlyc3Qgb25lIGNsaXBwZWQgYnkgdGhpcyBjdXJyZW50Q2xpcHBpbmdTbG90XG5cdFx0XHRpZiAoIWN1cnJlbnRDbGlwcGluZ1Nsb3QubWFza0NvbXB1dGVkKSB7XG5cdFx0XHRcdGxldCBzbG90Q2xpcHBpbmcgPSBjdXJyZW50Q2xpcHBpbmdTbG90LnNsb3Q7XG5cdFx0XHRcdGxldCBjbGlwcGluZ0F0dGFjaG1lbnQgPSBzbG90Q2xpcHBpbmcuYXR0YWNobWVudCBhcyBDbGlwcGluZ0F0dGFjaG1lbnQ7XG5cdFx0XHRcdGN1cnJlbnRDbGlwcGluZ1Nsb3QubWFza0NvbXB1dGVkID0gdHJ1ZTtcblx0XHRcdFx0Y29uc3Qgd29ybGRWZXJ0aWNlc0xlbmd0aCA9IGNsaXBwaW5nQXR0YWNobWVudC53b3JsZFZlcnRpY2VzTGVuZ3RoO1xuXHRcdFx0XHRjb25zdCB2ZXJ0aWNlcyA9IGN1cnJlbnRDbGlwcGluZ1Nsb3QudmVydGljZXM7XG5cdFx0XHRcdGNsaXBwaW5nQXR0YWNobWVudC5jb21wdXRlV29ybGRWZXJ0aWNlcyhzbG90Q2xpcHBpbmcsIDAsIHdvcmxkVmVydGljZXNMZW5ndGgsIHZlcnRpY2VzLCAwLCAyKTtcblx0XHRcdFx0bWFzay5jbGVhcigpLmxpbmVTdHlsZSgwKS5iZWdpbkZpbGwoMHgwMDAwMDApLmRyYXdQb2x5Z29uKHZlcnRpY2VzKS5lbmRGaWxsKCk7XG5cdFx0XHR9XG5cblx0XHRcdHNsb3RPYmplY3QuY29udGFpbmVyLm1hc2sgPSBtYXNrO1xuXHRcdH0gZWxzZSBpZiAoc2xvdE9iamVjdD8uY29udGFpbmVyLm1hc2spIHtcblx0XHRcdC8vIHJlbW92ZSB0aGUgbWFzaywgaWYgc2xvdCBvYmplY3QgaGFzIGEgbWFzaywgYnV0IGN1cnJlbnRDbGlwcGluZ1Nsb3QgaXMgdW5kZWZpbmVkXG5cdFx0XHRzbG90T2JqZWN0LmNvbnRhaW5lci5tYXNrID0gbnVsbDtcblx0XHR9XG5cblx0XHQvLyBpZiBjdXJyZW50IHNsb3QgaXMgdGhlIGVuZGluZyBvbmUgb2YgdGhlIGN1cnJlbnRDbGlwcGluZ1Nsb3QgbWFzaywgc2V0IGN1cnJlbnRDbGlwcGluZ1Nsb3QgdG8gdW5kZWZpbmVkXG5cdFx0aWYgKGN1cnJlbnRDbGlwcGluZ1Nsb3QgJiYgKGN1cnJlbnRDbGlwcGluZ1Nsb3Quc2xvdC5hdHRhY2htZW50IGFzIENsaXBwaW5nQXR0YWNobWVudCkuZW5kU2xvdCA9PSBzbG90LmRhdGEpIHtcblx0XHRcdHRoaXMuY3VycmVudENsaXBwaW5nU2xvdCA9IHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHQvLyBjbGVhbiB1cCB1bnVzZWQgbWFza3Ncblx0XHRpZiAobGFzdCkge1xuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gdGhpcy5jbGlwcGluZ1Nsb3RUb1BpeGlNYXNrcykge1xuXHRcdFx0XHRjb25zdCBjbGlwcGluZ1Nsb3RUb1BpeGlNYXNrID0gdGhpcy5jbGlwcGluZ1Nsb3RUb1BpeGlNYXNrc1trZXldO1xuXHRcdFx0XHRpZiAoKCEoY2xpcHBpbmdTbG90VG9QaXhpTWFzay5zbG90LmF0dGFjaG1lbnQgaW5zdGFuY2VvZiBDbGlwcGluZ0F0dGFjaG1lbnQpIHx8ICFjbGlwcGluZ1Nsb3RUb1BpeGlNYXNrLm1hc2tDb21wdXRlZCkgJiYgY2xpcHBpbmdTbG90VG9QaXhpTWFzay5tYXNrKSB7XG5cdFx0XHRcdFx0dGhpcy5yZW1vdmVDaGlsZChjbGlwcGluZ1Nsb3RUb1BpeGlNYXNrLm1hc2spO1xuXHRcdFx0XHRcdG1hc2tQb29sLmZyZWUoY2xpcHBpbmdTbG90VG9QaXhpTWFzay5tYXNrKTtcblx0XHRcdFx0XHRjbGlwcGluZ1Nsb3RUb1BpeGlNYXNrLm1hc2sgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRoaXMuY3VycmVudENsaXBwaW5nU2xvdCA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdH1cblxuXHQvKlxuXHQqIENvbG9ycyBpbiBwaXhpIGFyZSBwcmVtdWx0aXBsaWVkLlxuXHQqIFBpeGkgYmxlbmRpbmcgbW9kZXMgYXJlIG1vZGlmaWVkIHRvIHdvcmsgd2l0aCBwcmVtdWx0aXBsaWVkIGNvbG9ycy4gV2UgY2Fubm90IGNyZWF0ZSBjdXN0b20gYmxlbmRpbmcgbW9kZXMuXG5cdCogVGV4dHVyZXMgYXJlIGxvYWRlZCBhcyBwcmVtdWx0aXBsaWVkIChzZWUgYXNzZXJzL2F0bGFzTG9hZGVyLnRzOiBhbHBoYU1vZGU6IGBwYWdlLnBtYSA/IEFMUEhBX01PREVTLlBNQSA6IEFMUEhBX01PREVTLlVOUEFDS2ApOlxuXHQqIC0gdGV4dHVyZXMgbm9uIHByZW11bHRpcGxpZWQgYXJlIHByZW11bHRpcGxpZWQgb24gR1BVIG9uIHVwbG9hZFxuXHQqIC0gdGV4dHVyZXMgcHJlbXVsdGlwbGllZCBhcmUgdXBsb2FkZWQgb24gR1BVIGFzIGlzIHNpbmNlIHRoZXkgYXJlIGFscmVhZHkgcHJlbXVsdGlwbGllZFxuXHQqXG5cdCogV2UgbmVlZCB0byB0YWtlIHRoaXMgaW50byBjb25zaWRlcmF0aW9uIGFuZCBjYWxjdWxhdGVzIGZpbmFsIGNvbG9ycyBmb3IgYm90aCBsaWdodCBhbmQgZGFyayBjb2xvciBhcyBpZiB0ZXh0dXJlcyB3ZXJlIGFsd2F5cyBwcmVtdWx0aXBsaWVkLlxuXHQqIFRoaXMgaW1wbGllcyBmb3IgZXhhbXBsZSB0aGF0IGFscGhhIGZvciBkYXJrIHRpbnQgaXMgYWx3YXlzIDEuIFRoaXMgaXMgd2F5IGluIERhcmtUaW50UmVuZGVyZXIgd2UgaGF2ZSBvbmx5IHRoZSBhbHBoYSBvZiB0aGUgbGlnaHQgY29sb3IuXG5cdCogSWYgd2UgZXZlciB3YW50IHRvIGxvYWQgdGV4dHVyZSBhcyBub24gcHJlbXVsdGlwbGllZCBvbiBHUFUsIHdlIG11c3QgYWRkIGEgbmV3IGRhcmsgYWxwaGEgcGFyYW1ldGVyIHRvIHRoZSBUaW50TWF0ZXJpYWwgYW5kIHNldCB0aGUgYWxwaGEuXG5cdCovXG5cdHByaXZhdGUgcmVuZGVyTWVzaGVzICgpOiB2b2lkIHtcblx0XHR0aGlzLnJlc2V0TWVzaGVzKCk7XG5cblx0XHRsZXQgdHJpYW5nbGVzOiBBcnJheTxudW1iZXI+IHwgbnVsbCA9IG51bGw7XG5cdFx0bGV0IHV2czogTnVtYmVyQXJyYXlMaWtlIHwgbnVsbCA9IG51bGw7XG5cblx0XHRjb25zdCBkcmF3T3JkZXIgPSB0aGlzLnNrZWxldG9uLmRyYXdPcmRlcjtcblxuXHRcdGZvciAobGV0IGkgPSAwLCBuID0gZHJhd09yZGVyLmxlbmd0aCwgc2xvdE9iamVjdHNDb3VudGVyID0gMDsgaSA8IG47IGkrKykge1xuXHRcdFx0Y29uc3Qgc2xvdCA9IGRyYXdPcmRlcltpXTtcblxuXHRcdFx0Ly8gcmVuZGVyIHBpeGkgb2JqZWN0IG9uIHRoZSBjdXJyZW50IHNsb3Qgb24gdG9wIG9mIHRoZSBzbG90IGF0dGFjaG1lbnRcblx0XHRcdGxldCBwaXhpT2JqZWN0ID0gdGhpcy5zbG90c09iamVjdC5nZXQoc2xvdCk7XG5cdFx0XHRsZXQgekluZGV4ID0gaSArIHNsb3RPYmplY3RzQ291bnRlcjtcblx0XHRcdGlmIChwaXhpT2JqZWN0KSB7XG5cdFx0XHRcdHRoaXMudXBkYXRlU2xvdE9iamVjdChwaXhpT2JqZWN0LCBzbG90LCB6SW5kZXggKyAxKTtcblx0XHRcdFx0c2xvdE9iamVjdHNDb3VudGVyKys7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnVwZGF0ZUFuZFNldFBpeGlNYXNrKHNsb3QsIGkgPT09IGRyYXdPcmRlci5sZW5ndGggLSAxKTtcblxuXHRcdFx0Y29uc3QgdXNlRGFya0NvbG9yID0gc2xvdC5kYXJrQ29sb3IgIT0gbnVsbDtcblx0XHRcdGNvbnN0IHZlcnRleFNpemUgPSBTcGluZS5jbGlwcGVyLmlzQ2xpcHBpbmcoKSA/IDIgOiB1c2VEYXJrQ29sb3IgPyBTcGluZS5EQVJLX1ZFUlRFWF9TSVpFIDogU3BpbmUuVkVSVEVYX1NJWkU7XG5cdFx0XHRpZiAoIXNsb3QuYm9uZS5hY3RpdmUpIHtcblx0XHRcdFx0U3BpbmUuY2xpcHBlci5jbGlwRW5kV2l0aFNsb3Qoc2xvdCk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgYXR0YWNobWVudCA9IHNsb3QuZ2V0QXR0YWNobWVudCgpO1xuXHRcdFx0bGV0IGF0dGFjaG1lbnRDb2xvcjogQ29sb3IgfCBudWxsO1xuXHRcdFx0bGV0IHRleHR1cmU6IFNwaW5lVGV4dHVyZSB8IG51bGw7XG5cdFx0XHRsZXQgbnVtRmxvYXRzID0gMDtcblx0XHRcdGlmIChhdHRhY2htZW50IGluc3RhbmNlb2YgUmVnaW9uQXR0YWNobWVudCkge1xuXHRcdFx0XHRjb25zdCByZWdpb24gPSBhdHRhY2htZW50O1xuXHRcdFx0XHRhdHRhY2htZW50Q29sb3IgPSByZWdpb24uY29sb3I7XG5cdFx0XHRcdG51bUZsb2F0cyA9IHZlcnRleFNpemUgKiA0O1xuXHRcdFx0XHRyZWdpb24uY29tcHV0ZVdvcmxkVmVydGljZXMoc2xvdCwgdGhpcy52ZXJ0aWNlc0NhY2hlLCAwLCB2ZXJ0ZXhTaXplKTtcblx0XHRcdFx0dHJpYW5nbGVzID0gU3BpbmUuUVVBRF9UUklBTkdMRVM7XG5cdFx0XHRcdHV2cyA9IHJlZ2lvbi51dnM7XG5cdFx0XHRcdHRleHR1cmUgPSA8U3BpbmVUZXh0dXJlPnJlZ2lvbi5yZWdpb24/LnRleHR1cmU7XG5cdFx0XHR9IGVsc2UgaWYgKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBNZXNoQXR0YWNobWVudCkge1xuXHRcdFx0XHRjb25zdCBtZXNoID0gYXR0YWNobWVudDtcblx0XHRcdFx0YXR0YWNobWVudENvbG9yID0gbWVzaC5jb2xvcjtcblx0XHRcdFx0bnVtRmxvYXRzID0gKG1lc2gud29ybGRWZXJ0aWNlc0xlbmd0aCA+PiAxKSAqIHZlcnRleFNpemU7XG5cdFx0XHRcdGlmIChudW1GbG9hdHMgPiB0aGlzLnZlcnRpY2VzQ2FjaGUubGVuZ3RoKSB7XG5cdFx0XHRcdFx0dGhpcy52ZXJ0aWNlc0NhY2hlID0gVXRpbHMubmV3RmxvYXRBcnJheShudW1GbG9hdHMpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG1lc2guY29tcHV0ZVdvcmxkVmVydGljZXMoc2xvdCwgMCwgbWVzaC53b3JsZFZlcnRpY2VzTGVuZ3RoLCB0aGlzLnZlcnRpY2VzQ2FjaGUsIDAsIHZlcnRleFNpemUpO1xuXHRcdFx0XHR0cmlhbmdsZXMgPSBtZXNoLnRyaWFuZ2xlcztcblx0XHRcdFx0dXZzID0gbWVzaC51dnM7XG5cdFx0XHRcdHRleHR1cmUgPSA8U3BpbmVUZXh0dXJlPm1lc2gucmVnaW9uPy50ZXh0dXJlO1xuXHRcdFx0fSBlbHNlIGlmIChhdHRhY2htZW50IGluc3RhbmNlb2YgQ2xpcHBpbmdBdHRhY2htZW50KSB7XG5cdFx0XHRcdFNwaW5lLmNsaXBwZXIuY2xpcFN0YXJ0KHNsb3QsIGF0dGFjaG1lbnQpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aGlzLmhhc01lc2hGb3JTbG90KHNsb3QpKSB7XG5cdFx0XHRcdFx0dGhpcy5nZXRNZXNoRm9yU2xvdChzbG90KS52aXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0U3BpbmUuY2xpcHBlci5jbGlwRW5kV2l0aFNsb3Qoc2xvdCk7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRleHR1cmUgIT0gbnVsbCkge1xuXHRcdFx0XHRjb25zdCBza2VsZXRvbiA9IHNsb3QuYm9uZS5za2VsZXRvbjtcblx0XHRcdFx0Y29uc3Qgc2tlbGV0b25Db2xvciA9IHNrZWxldG9uLmNvbG9yO1xuXHRcdFx0XHRjb25zdCBzbG90Q29sb3IgPSBzbG90LmNvbG9yO1xuXHRcdFx0XHRjb25zdCBhbHBoYSA9IHNrZWxldG9uQ29sb3IuYSAqIHNsb3RDb2xvci5hICogYXR0YWNobWVudENvbG9yLmE7XG5cdFx0XHRcdC8vIGNhbm5vdCBwcmVtdWx0aXBseSB0aGUgY29sb3JzIGJlY2F1c2UgdGhlIGRlZmF1bHQgbWVzaCByZW5kZXJlciBhbHJlYWR5IGRvZXMgdGhhdFxuXHRcdFx0XHR0aGlzLmxpZ2h0Q29sb3Iuc2V0KFxuXHRcdFx0XHRcdHNrZWxldG9uQ29sb3IuciAqIHNsb3RDb2xvci5yICogYXR0YWNobWVudENvbG9yLnIsXG5cdFx0XHRcdFx0c2tlbGV0b25Db2xvci5nICogc2xvdENvbG9yLmcgKiBhdHRhY2htZW50Q29sb3IuZyxcblx0XHRcdFx0XHRza2VsZXRvbkNvbG9yLmIgKiBzbG90Q29sb3IuYiAqIGF0dGFjaG1lbnRDb2xvci5iLFxuXHRcdFx0XHRcdGFscGhhXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGlmIChzbG90LmRhcmtDb2xvciAhPSBudWxsKSB7XG5cdFx0XHRcdFx0dGhpcy5kYXJrQ29sb3Iuc2V0KFxuXHRcdFx0XHRcdFx0c2xvdC5kYXJrQ29sb3Iucixcblx0XHRcdFx0XHRcdHNsb3QuZGFya0NvbG9yLmcsXG5cdFx0XHRcdFx0XHRzbG90LmRhcmtDb2xvci5iLFxuXHRcdFx0XHRcdFx0MSxcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuZGFya0NvbG9yLnNldCgwLCAwLCAwLCAxKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGxldCBmaW5hbFZlcnRpY2VzOiBOdW1iZXJBcnJheUxpa2U7XG5cdFx0XHRcdGxldCBmaW5hbFZlcnRpY2VzTGVuZ3RoOiBudW1iZXI7XG5cdFx0XHRcdGxldCBmaW5hbEluZGljZXM6IE51bWJlckFycmF5TGlrZTtcblx0XHRcdFx0bGV0IGZpbmFsSW5kaWNlc0xlbmd0aDogbnVtYmVyO1xuXG5cdFx0XHRcdGlmIChTcGluZS5jbGlwcGVyLmlzQ2xpcHBpbmcoKSkge1xuXHRcdFx0XHRcdFNwaW5lLmNsaXBwZXIuY2xpcFRyaWFuZ2xlcyh0aGlzLnZlcnRpY2VzQ2FjaGUsIHRyaWFuZ2xlcywgdHJpYW5nbGVzLmxlbmd0aCwgdXZzLCB0aGlzLmxpZ2h0Q29sb3IsIHRoaXMuZGFya0NvbG9yLCB1c2VEYXJrQ29sb3IpO1xuXG5cdFx0XHRcdFx0ZmluYWxWZXJ0aWNlcyA9IFNwaW5lLmNsaXBwZXIuY2xpcHBlZFZlcnRpY2VzO1xuXHRcdFx0XHRcdGZpbmFsVmVydGljZXNMZW5ndGggPSBmaW5hbFZlcnRpY2VzLmxlbmd0aDtcblxuXHRcdFx0XHRcdGZpbmFsSW5kaWNlcyA9IFNwaW5lLmNsaXBwZXIuY2xpcHBlZFRyaWFuZ2xlcztcblx0XHRcdFx0XHRmaW5hbEluZGljZXNMZW5ndGggPSBmaW5hbEluZGljZXMubGVuZ3RoO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnRzID0gdGhpcy52ZXJ0aWNlc0NhY2hlO1xuXHRcdFx0XHRcdGZvciAobGV0IHYgPSAyLCB1ID0gMCwgbiA9IG51bUZsb2F0czsgdiA8IG47IHYgKz0gdmVydGV4U2l6ZSwgdSArPSAyKSB7XG5cdFx0XHRcdFx0XHRsZXQgdGVtcFYgPSB2O1xuXHRcdFx0XHRcdFx0dmVydHNbdGVtcFYrK10gPSB0aGlzLmxpZ2h0Q29sb3Iucjtcblx0XHRcdFx0XHRcdHZlcnRzW3RlbXBWKytdID0gdGhpcy5saWdodENvbG9yLmc7XG5cdFx0XHRcdFx0XHR2ZXJ0c1t0ZW1wVisrXSA9IHRoaXMubGlnaHRDb2xvci5iO1xuXHRcdFx0XHRcdFx0dmVydHNbdGVtcFYrK10gPSB0aGlzLmxpZ2h0Q29sb3IuYTtcblxuXHRcdFx0XHRcdFx0dmVydHNbdGVtcFYrK10gPSB1dnNbdV07XG5cdFx0XHRcdFx0XHR2ZXJ0c1t0ZW1wVisrXSA9IHV2c1t1ICsgMV07XG5cblx0XHRcdFx0XHRcdGlmICh1c2VEYXJrQ29sb3IpIHtcblx0XHRcdFx0XHRcdFx0dmVydHNbdGVtcFYrK10gPSB0aGlzLmRhcmtDb2xvci5yO1xuXHRcdFx0XHRcdFx0XHR2ZXJ0c1t0ZW1wVisrXSA9IHRoaXMuZGFya0NvbG9yLmc7XG5cdFx0XHRcdFx0XHRcdHZlcnRzW3RlbXBWKytdID0gdGhpcy5kYXJrQ29sb3IuYjtcblx0XHRcdFx0XHRcdFx0dmVydHNbdGVtcFYrK10gPSB0aGlzLmRhcmtDb2xvci5hO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaW5hbFZlcnRpY2VzID0gdGhpcy52ZXJ0aWNlc0NhY2hlO1xuXHRcdFx0XHRcdGZpbmFsVmVydGljZXNMZW5ndGggPSBudW1GbG9hdHM7XG5cdFx0XHRcdFx0ZmluYWxJbmRpY2VzID0gdHJpYW5nbGVzO1xuXHRcdFx0XHRcdGZpbmFsSW5kaWNlc0xlbmd0aCA9IHRyaWFuZ2xlcy5sZW5ndGg7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZmluYWxWZXJ0aWNlc0xlbmd0aCA9PSAwIHx8IGZpbmFsSW5kaWNlc0xlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0U3BpbmUuY2xpcHBlci5jbGlwRW5kV2l0aFNsb3Qoc2xvdCk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBtZXNoID0gdGhpcy5nZXRNZXNoRm9yU2xvdChzbG90KTtcblx0XHRcdFx0bWVzaC5yZW5kZXJhYmxlID0gdHJ1ZTtcblx0XHRcdFx0bWVzaC56SW5kZXggPSB6SW5kZXg7XG5cdFx0XHRcdG1lc2gudXBkYXRlRnJvbVNwaW5lRGF0YSh0ZXh0dXJlLCBzbG90LmRhdGEuYmxlbmRNb2RlLCBzbG90LmRhdGEubmFtZSwgZmluYWxWZXJ0aWNlcywgZmluYWxWZXJ0aWNlc0xlbmd0aCwgZmluYWxJbmRpY2VzLCBmaW5hbEluZGljZXNMZW5ndGgsIHVzZURhcmtDb2xvcik7XG5cdFx0XHR9XG5cblx0XHRcdFNwaW5lLmNsaXBwZXIuY2xpcEVuZFdpdGhTbG90KHNsb3QpO1xuXHRcdH1cblx0XHRTcGluZS5jbGlwcGVyLmNsaXBFbmQoKTtcblx0fVxuXG5cdGNhbGN1bGF0ZUJvdW5kcyAoKSB7XG5cdFx0aWYgKCF0aGlzLl9ib3VuZHNQcm92aWRlcikge1xuXHRcdFx0c3VwZXIuY2FsY3VsYXRlQm91bmRzKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgdHJhbnNmb3JtID0gdGhpcy50cmFuc2Zvcm07XG5cdFx0aWYgKHRoaXMuX2JvdW5kc1NwaW5lSUQgPT09IHRyYW5zZm9ybS5fd29ybGRJRCkgcmV0dXJuO1xuXG5cdFx0dGhpcy51cGRhdGVCb3VuZHMoKTtcblxuXHRcdGNvbnN0IGJvdW5kcyA9IHRoaXMuX2xvY2FsQm91bmRzO1xuXHRcdGNvbnN0IHAgPSB0aGlzLl9ib3VuZHNQb2ludDtcblxuXHRcdHAuc2V0KGJvdW5kcy5taW5YLCBib3VuZHMubWluWSk7XG5cdFx0dHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xuXHRcdHRoaXMuX2JvdW5kcy5taW5YID0gcC54XG5cdFx0dGhpcy5fYm91bmRzLm1pblkgPSBwLnk7XG5cblx0XHRwLnNldChib3VuZHMubWF4WCwgYm91bmRzLm1heFkpXG5cdFx0dHJhbnNmb3JtLndvcmxkVHJhbnNmb3JtLmFwcGx5KHAsIHApO1xuXHRcdHRoaXMuX2JvdW5kcy5tYXhYID0gcC54XG5cdFx0dGhpcy5fYm91bmRzLm1heFkgPSBwLnk7XG5cdH1cblxuXHR1cGRhdGVCb3VuZHMgKCkge1xuXHRcdGlmICghdGhpcy5fYm91bmRzUHJvdmlkZXIgfHwgIXRoaXMuX2JvdW5kc1NwaW5lRGlydHkpIHJldHVybjtcblxuXHRcdHRoaXMuX2JvdW5kc1NwaW5lRGlydHkgPSBmYWxzZTtcblxuXHRcdGlmICghdGhpcy5fbG9jYWxCb3VuZHMpIHtcblx0XHRcdHRoaXMuX2xvY2FsQm91bmRzID0gbmV3IEJvdW5kcygpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJvdW5kc1NwaW5lID0gdGhpcy5fYm91bmRzUHJvdmlkZXIuY2FsY3VsYXRlQm91bmRzKHRoaXMpO1xuXG5cdFx0Y29uc3QgYm91bmRzID0gdGhpcy5fbG9jYWxCb3VuZHM7XG5cdFx0Ym91bmRzLmNsZWFyKCk7XG5cdFx0Ym91bmRzLm1pblggPSBib3VuZHNTcGluZS54O1xuXHRcdGJvdW5kcy5taW5ZID0gYm91bmRzU3BpbmUueTtcblx0XHRib3VuZHMubWF4WCA9IGJvdW5kc1NwaW5lLnggKyBib3VuZHNTcGluZS53aWR0aDtcblx0XHRib3VuZHMubWF4WSA9IGJvdW5kc1NwaW5lLnkgKyBib3VuZHNTcGluZS5oZWlnaHQ7XG5cblx0XHR0aGlzLmhpdEFyZWEgPSB0aGlzLl9sb2NhbEJvdW5kcy5nZXRSZWN0YW5nbGUoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBTZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBib25lIGdpdmVuIGluIGlucHV0IHRocm91Z2ggYSB7QGxpbmsgSVBvaW50RGF0YX0uXG5cdCAqIEBwYXJhbSBib25lOiB0aGUgYm9uZSBuYW1lIG9yIHRoZSBib25lIGluc3RhbmNlIHRvIHNldCB0aGUgcG9zaXRpb25cblx0ICogQHBhcmFtIG91dFBvczogdGhlIG5ldyBwb3NpdGlvbiBvZiB0aGUgYm9uZS5cblx0ICogQHRocm93cyB7RXJyb3J9OiBpZiB0aGUgZ2l2ZW4gYm9uZSBpcyBub3QgZm91bmQgaW4gdGhlIHNrZWxldG9uLCBhbiBlcnJvciBpcyB0aHJvd25cblx0ICovXG5cdHB1YmxpYyBzZXRCb25lUG9zaXRpb24gKGJvbmU6IHN0cmluZyB8IEJvbmUsIHBvc2l0aW9uOiBJUG9pbnREYXRhKTogdm9pZCB7XG5cdFx0Y29uc3QgYm9uZUF1eCA9IGJvbmU7XG5cdFx0aWYgKHR5cGVvZiBib25lID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRib25lID0gdGhpcy5za2VsZXRvbi5maW5kQm9uZShib25lKSE7XG5cdFx0fVxuXG5cdFx0aWYgKCFib25lKSB0aHJvdyBFcnJvcihgQ2Fubm90IHNldCBib25lIHBvc2l0aW9uLCBib25lICR7U3RyaW5nKGJvbmVBdXgpfSBub3QgZm91bmRgKTtcblx0XHRTcGluZS52ZWN0b3JBdXguc2V0KHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xuXG5cdFx0aWYgKGJvbmUucGFyZW50KSB7XG5cdFx0XHRjb25zdCBhdXggPSBib25lLnBhcmVudC53b3JsZFRvTG9jYWwoU3BpbmUudmVjdG9yQXV4KTtcblx0XHRcdGJvbmUueCA9IGF1eC54O1xuXHRcdFx0Ym9uZS55ID0gYXV4Lnk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0Ym9uZS54ID0gU3BpbmUudmVjdG9yQXV4Lng7XG5cdFx0XHRib25lLnkgPSBTcGluZS52ZWN0b3JBdXgueTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgYm9uZSBnaXZlbiBpbiBpbnB1dCBpbnRvIGFuIHtAbGluayBJUG9pbnREYXRhfS5cblx0ICogQHBhcmFtIGJvbmU6IHRoZSBib25lIG5hbWUgb3IgdGhlIGJvbmUgaW5zdGFuY2UgdG8gZ2V0IHRoZSBwb3NpdGlvbiBmcm9tXG5cdCAqIEBwYXJhbSBvdXRQb3M6IGFuIG9wdGlvbmFsIHtAbGluayBJUG9pbnREYXRhfSB0byB1c2UgdG8gcmV0dXJuIHRoZSBib25lIHBvc2l0aW9uLCByYXRoZXJuIHRoYW4gaW5zdGFudGlhdGluZyBhIG5ldyBvYmplY3QuXG5cdCAqIEByZXR1cm5zIHtJUG9pbnREYXRhIHwgdW5kZWZpbmVkfTogdGhlIHBvc2l0aW9uIG9mIHRoZSBib25lLCBvciB1bmRlZmluZWQgaWYgbm8gbWF0Y2hpbmcgYm9uZSBpcyBmb3VuZCBpbiB0aGUgc2tlbGV0b25cblx0ICovXG5cdHB1YmxpYyBnZXRCb25lUG9zaXRpb24gKGJvbmU6IHN0cmluZyB8IEJvbmUsIG91dFBvcz86IElQb2ludERhdGEpOiBJUG9pbnREYXRhIHwgdW5kZWZpbmVkIHtcblx0XHRjb25zdCBib25lQXV4ID0gYm9uZTtcblx0XHRpZiAodHlwZW9mIGJvbmUgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdGJvbmUgPSB0aGlzLnNrZWxldG9uLmZpbmRCb25lKGJvbmUpITtcblx0XHR9XG5cblx0XHRpZiAoIWJvbmUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoYENhbm5vdCBnZXQgYm9uZSBwb3NpdGlvbiEgQm9uZSAke1N0cmluZyhib25lQXV4KX0gbm90IGZvdW5kYCk7XG5cdFx0XHRyZXR1cm4gb3V0UG9zO1xuXHRcdH1cblxuXHRcdGlmICghb3V0UG9zKSB7XG5cdFx0XHRvdXRQb3MgPSB7IHg6IDAsIHk6IDAgfTtcblx0XHR9XG5cblx0XHRvdXRQb3MueCA9IGJvbmUud29ybGRYO1xuXHRcdG91dFBvcy55ID0gYm9uZS53b3JsZFk7XG5cdFx0cmV0dXJuIG91dFBvcztcblx0fVxuXG5cdC8qKiBDb252ZXJ0cyBhIHBvaW50IGZyb20gdGhlIHNrZWxldG9uIGNvb3JkaW5hdGUgc3lzdGVtIHRvIHRoZSBQaXhpIHdvcmxkIGNvb3JkaW5hdGUgc3lzdGVtLiAqL1xuXHRza2VsZXRvblRvUGl4aVdvcmxkQ29vcmRpbmF0ZXMgKHBvaW50OiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pIHtcblx0XHR0aGlzLndvcmxkVHJhbnNmb3JtLmFwcGx5KHBvaW50LCBwb2ludCk7XG5cdH1cblxuXHQvKiogQ29udmVydHMgYSBwb2ludCBmcm9tIHRoZSBQaXhpIHdvcmxkIGNvb3JkaW5hdGUgc3lzdGVtIHRvIHRoZSBza2VsZXRvbiBjb29yZGluYXRlIHN5c3RlbS4gKi9cblx0cGl4aVdvcmxkQ29vcmRpbmF0ZXNUb1NrZWxldG9uIChwb2ludDogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9KSB7XG5cdFx0dGhpcy53b3JsZFRyYW5zZm9ybS5hcHBseUludmVyc2UocG9pbnQsIHBvaW50KTtcblx0fVxuXG5cdC8qKiBDb252ZXJ0cyBhIHBvaW50IGZyb20gdGhlIFBpeGkgd29ybGQgY29vcmRpbmF0ZSBzeXN0ZW0gdG8gdGhlIGJvbmUncyBsb2NhbCBjb29yZGluYXRlIHN5c3RlbS4gKi9cblx0cGl4aVdvcmxkQ29vcmRpbmF0ZXNUb0JvbmUgKHBvaW50OiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0sIGJvbmU6IEJvbmUpIHtcblx0XHR0aGlzLnBpeGlXb3JsZENvb3JkaW5hdGVzVG9Ta2VsZXRvbihwb2ludCk7XG5cdFx0aWYgKGJvbmUucGFyZW50KSB7XG5cdFx0XHRib25lLnBhcmVudC53b3JsZFRvTG9jYWwocG9pbnQgYXMgVmVjdG9yMik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGJvbmUud29ybGRUb0xvY2FsKHBvaW50IGFzIFZlY3RvcjIpO1xuXHRcdH1cblx0fVxuXG5cdC8qKiBBIGNhY2hlIGNvbnRhaW5pbmcgc2tlbGV0b24gZGF0YSBhbmQgYXRsYXNlcyBhbHJlYWR5IGxvYWRlZCBieSB7QGxpbmsgU3BpbmUuZnJvbX0uICovXG5cdHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgc2tlbGV0b25DYWNoZTogUmVjb3JkPHN0cmluZywgU2tlbGV0b25EYXRhPiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cblx0LyoqXG5cdCAqIFVzZSB0aGlzIG1ldGhvZCB0byBpbnN0YW50aWF0ZSBhIFNwaW5lIGdhbWUgb2JqZWN0LlxuXHQgKiBCZWZvcmUgaW5zdGFudGlhdGluZyBhIFNwaW5lIGdhbWUgb2JqZWN0LCB0aGUgc2tlbGV0b24gKGAuc2tlbGAgb3IgYC5qc29uYCkgYW5kIHRoZSBhdGxhcyB0ZXh0IGZpbGVzIG11c3QgYmUgbG9hZGVkIGludG8gdGhlIEFzc2V0cy4gRm9yIGV4YW1wbGU6XG5cdCAqIGBgYFxuXHQgKiBQSVhJLkFzc2V0cy5hZGQoXCJzYWNrRGF0YVwiLCBcIi9hc3NldHMvc2Fjay1wcm8uc2tlbFwiKTtcblx0ICogUElYSS5Bc3NldHMuYWRkKFwic2Fja0F0bGFzXCIsIFwiL2Fzc2V0cy9zYWNrLXBtYS5hdGxhc1wiKTtcblx0ICogYXdhaXQgUElYSS5Bc3NldHMubG9hZChbXCJzYWNrRGF0YVwiLCBcInNhY2tBdGxhc1wiXSk7XG5cdCAqIGBgYFxuXHQgKiBPbmNlIGEgU3BpbmUgZ2FtZSBvYmplY3QgaXMgY3JlYXRlZCwgaXRzIHNrZWxldG9uIGRhdGEgaXMgY2FjaGVkIGludG8ge0BsaW5rIFNwaW5lLnNrZWxldG9uQ2FjaGV9IHVzaW5nIHRoZSBrZXk6XG5cdCAqIGAke3NrZWxldG9uQXNzZXROYW1lfS0ke2F0bGFzQXNzZXROYW1lfS0ke29wdGlvbnM/LnNjYWxlID8/IDF9YFxuXHQgKlxuXHQgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBTcGluZSBnYW1lIG9iamVjdC4gU2VlIHtAbGluayBTcGluZUZyb21PcHRpb25zfVxuXHQgKiBAcmV0dXJucyB7U3BpbmV9IFRoZSBTcGluZSBnYW1lIG9iamVjdCBpbnN0YW50aWF0ZWRcblx0ICovXG5cdHB1YmxpYyBzdGF0aWMgZnJvbSAob3B0aW9uczogU3BpbmVGcm9tT3B0aW9ucyk6IFNwaW5lO1xuXG5cdC8qKlxuXHQgKiBAZGVwcmVjYXRlZCB1c2UgdGhlIGBmcm9tKG9wdGlvbnM6IFNwaW5lRnJvbU9wdGlvbnMpYCB2ZXJzaW9uLlxuXHQgKiBVc2UgdGhpcyBtZXRob2QgdG8gaW5zdGFudGlhdGUgYSBTcGluZSBnYW1lIG9iamVjdC5cblx0ICogQmVmb3JlIGluc3RhbnRpYXRpbmcgYSBTcGluZSBnYW1lIG9iamVjdCwgdGhlIHNrZWxldG9uIChgLnNrZWxgIG9yIGAuanNvbmApIGFuZCB0aGUgYXRsYXMgdGV4dCBmaWxlcyBtdXN0IGJlIGxvYWRlZCBpbnRvIHRoZSBBc3NldHMuIEZvciBleGFtcGxlOlxuXHQgKiBgYGBcblx0ICogUElYSS5Bc3NldHMuYWRkKFwic2Fja0RhdGFcIiwgXCIvYXNzZXRzL3NhY2stcHJvLnNrZWxcIik7XG5cdCAqIFBJWEkuQXNzZXRzLmFkZChcInNhY2tBdGxhc1wiLCBcIi9hc3NldHMvc2Fjay1wbWEuYXRsYXNcIik7XG5cdCAqIGF3YWl0IFBJWEkuQXNzZXRzLmxvYWQoW1wic2Fja0RhdGFcIiwgXCJzYWNrQXRsYXNcIl0pO1xuXHQgKiBgYGBcblx0ICogT25jZSBhIFNwaW5lIGdhbWUgb2JqZWN0IGlzIGNyZWF0ZWQsIGl0cyBza2VsZXRvbiBkYXRhIGlzIGNhY2hlZCBpbnRvIHtAbGluayBTcGluZS5za2VsZXRvbkNhY2hlfSB1c2luZyB0aGUga2V5OlxuXHQgKiBgJHtza2VsZXRvbkFzc2V0TmFtZX0tJHthdGxhc0Fzc2V0TmFtZX0tJHtvcHRpb25zPy5zY2FsZSA/PyAxfWBcblx0ICpcblx0ICogQHBhcmFtIHNrZWxldG9uQXNzZXROYW1lIC0gdGhlIGFzc2V0IG5hbWUgZm9yIHRoZSBza2VsZXRvbiBgLnNrZWxgIG9yIGAuanNvbmAgZmlsZSBwcmV2aW91c2x5IGxvYWRlZCBpbnRvIHRoZSBBc3NldHNcblx0ICogQHBhcmFtIGF0bGFzQXNzZXROYW1lIC0gdGhlIGFzc2V0IG5hbWUgZm9yIHRoZSBhdGxhcyBmaWxlIHByZXZpb3VzbHkgbG9hZGVkIGludG8gdGhlIEFzc2V0c1xuXHQgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBTcGluZSBnYW1lIG9iamVjdFxuXHQgKiBAcmV0dXJucyB7U3BpbmV9IFRoZSBTcGluZSBnYW1lIG9iamVjdCBpbnN0YW50aWF0ZWRcblx0ICovXG5cdHB1YmxpYyBzdGF0aWMgZnJvbSAoc2tlbGV0b25Bc3NldE5hbWU6IHN0cmluZywgYXRsYXNBc3NldE5hbWU6IHN0cmluZywgb3B0aW9ucz86IElTcGluZU9wdGlvbnMpOiBTcGluZTtcblx0cHVibGljIHN0YXRpYyBmcm9tIChcblx0XHRwYXJhbU9uZTogc3RyaW5nIHwgU3BpbmVGcm9tT3B0aW9ucyxcblx0XHRhdGxhc0Fzc2V0TmFtZT86IHN0cmluZyxcblx0XHRvcHRpb25zPzogSVNwaW5lT3B0aW9ucylcblx0XHQ6IFNwaW5lIHtcblx0XHRpZiAodHlwZW9mIHBhcmFtT25lID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRyZXR1cm4gU3BpbmUub2xkRnJvbShwYXJhbU9uZSwgYXRsYXNBc3NldE5hbWUhLCBvcHRpb25zKTtcblx0XHR9XG5cblx0XHRjb25zdCB7IHNrZWxldG9uLCBhdGxhcywgc2NhbGUgPSAxLCBkYXJrVGludCwgYXV0b1VwZGF0ZSwgYm91bmRzUHJvdmlkZXIgfSA9IHBhcmFtT25lO1xuXHRcdGNvbnN0IGNhY2hlS2V5ID0gYCR7c2tlbGV0b259LSR7YXRsYXN9LSR7c2NhbGV9YDtcblx0XHRsZXQgc2tlbGV0b25EYXRhID0gU3BpbmUuc2tlbGV0b25DYWNoZVtjYWNoZUtleV07XG5cdFx0aWYgKCFza2VsZXRvbkRhdGEpIHtcblx0XHRcdGNvbnN0IHNrZWxldG9uQXNzZXQgPSBBc3NldHMuZ2V0PGFueSB8IFVpbnQ4QXJyYXk+KHNrZWxldG9uKTtcblx0XHRcdGNvbnN0IGF0bGFzQXNzZXQgPSBBc3NldHMuZ2V0PFRleHR1cmVBdGxhcz4oYXRsYXMpO1xuXHRcdFx0Y29uc3QgYXR0YWNobWVudExvYWRlciA9IG5ldyBBdGxhc0F0dGFjaG1lbnRMb2FkZXIoYXRsYXNBc3NldCk7XG5cdFx0XHRsZXQgcGFyc2VyID0gc2tlbGV0b25Bc3NldCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgPyBuZXcgU2tlbGV0b25CaW5hcnkoYXR0YWNobWVudExvYWRlcikgOiBuZXcgU2tlbGV0b25Kc29uKGF0dGFjaG1lbnRMb2FkZXIpO1xuXHRcdFx0cGFyc2VyLnNjYWxlID0gc2NhbGU7XG5cdFx0XHRza2VsZXRvbkRhdGEgPSBwYXJzZXIucmVhZFNrZWxldG9uRGF0YShza2VsZXRvbkFzc2V0KTtcblx0XHRcdFNwaW5lLnNrZWxldG9uQ2FjaGVbY2FjaGVLZXldID0gc2tlbGV0b25EYXRhO1xuXHRcdH1cblx0XHRyZXR1cm4gbmV3IFNwaW5lKHsgc2tlbGV0b25EYXRhLCBkYXJrVGludCwgYXV0b1VwZGF0ZSwgYm91bmRzUHJvdmlkZXIgfSk7XG5cdH1cblxuXG5cdHByaXZhdGUgc3RhdGljIG9sZEZyb20gKHNrZWxldG9uQXNzZXROYW1lOiBzdHJpbmcsIGF0bGFzQXNzZXROYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiBJU3BpbmVPcHRpb25zKTogU3BpbmUge1xuXHRcdGNvbnN0IGNhY2hlS2V5ID0gYCR7c2tlbGV0b25Bc3NldE5hbWV9LSR7YXRsYXNBc3NldE5hbWV9LSR7b3B0aW9ucz8uc2NhbGUgPz8gMX1gO1xuXHRcdGxldCBza2VsZXRvbkRhdGEgPSBTcGluZS5za2VsZXRvbkNhY2hlW2NhY2hlS2V5XTtcblx0XHRpZiAoc2tlbGV0b25EYXRhKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFNwaW5lKHNrZWxldG9uRGF0YSwgb3B0aW9ucyk7XG5cdFx0fVxuXHRcdGNvbnN0IHNrZWxldG9uQXNzZXQgPSBBc3NldHMuZ2V0PGFueSB8IFVpbnQ4QXJyYXk+KHNrZWxldG9uQXNzZXROYW1lKTtcblx0XHRjb25zdCBhdGxhc0Fzc2V0ID0gQXNzZXRzLmdldDxUZXh0dXJlQXRsYXM+KGF0bGFzQXNzZXROYW1lKTtcblx0XHRjb25zdCBhdHRhY2htZW50TG9hZGVyID0gbmV3IEF0bGFzQXR0YWNobWVudExvYWRlcihhdGxhc0Fzc2V0KTtcblx0XHRsZXQgcGFyc2VyID0gc2tlbGV0b25Bc3NldCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgPyBuZXcgU2tlbGV0b25CaW5hcnkoYXR0YWNobWVudExvYWRlcikgOiBuZXcgU2tlbGV0b25Kc29uKGF0dGFjaG1lbnRMb2FkZXIpO1xuXHRcdHBhcnNlci5zY2FsZSA9IG9wdGlvbnM/LnNjYWxlID8/IDE7XG5cdFx0c2tlbGV0b25EYXRhID0gcGFyc2VyLnJlYWRTa2VsZXRvbkRhdGEoc2tlbGV0b25Bc3NldCk7XG5cdFx0U3BpbmUuc2tlbGV0b25DYWNoZVtjYWNoZUtleV0gPSBza2VsZXRvbkRhdGE7XG5cdFx0cmV0dXJuIG5ldyB0aGlzKHNrZWxldG9uRGF0YSwgb3B0aW9ucyk7XG5cdH1cblxuXHRwdWJsaWMgZ2V0IHRpbnQgKCk6IG51bWJlciB7XG5cdFx0cmV0dXJuIHRoaXMuc2tlbGV0b24uY29sb3IudG9SZ2I4ODgoKTtcblx0fVxuXHRwdWJsaWMgc2V0IHRpbnQgKHZhbHVlOiBudW1iZXIpIHtcblx0XHRDb2xvci5yZ2I4ODhUb0NvbG9yKHRoaXMuc2tlbGV0b24uY29sb3IsIHZhbHVlKTtcblx0fVxufVxuXG5pbnRlcmZhY2UgU2xvdHNUb0NsaXBwaW5nIHtcblx0c2xvdDogU2xvdCxcblx0bWFzaz86IEdyYXBoaWNzLFxuXHRtYXNrQ29tcHV0ZWQ/OiBib29sZWFuLFxuXHR2ZXJ0aWNlczogQXJyYXk8bnVtYmVyPixcbn07XG5cbmNvbnN0IG1hc2tQb29sID0gbmV3IFBvb2w8R3JhcGhpY3M+KCgpID0+IG5ldyBHcmFwaGljcyk7XG5cblNrZWxldG9uLnlEb3duID0gdHJ1ZTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBtZXNoIHR5cGUgdXNlZCBpbiBhIFNwaW5lIG9iamVjdHMuIEF2YWlsYWJsZSBpbXBsZW1lbnRhdGlvbnMgYXJlIHtAbGluayBEYXJrU2xvdE1lc2h9IGFuZCB7QGxpbmsgU2xvdE1lc2h9LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElTbG90TWVzaCBleHRlbmRzIERpc3BsYXlPYmplY3Qge1xuXHRuYW1lOiBzdHJpbmc7XG5cdHVwZGF0ZUZyb21TcGluZURhdGEgKFxuXHRcdHNsb3RUZXh0dXJlOiBTcGluZVRleHR1cmUsXG5cdFx0c2xvdEJsZW5kTW9kZTogQmxlbmRNb2RlLFxuXHRcdHNsb3ROYW1lOiBzdHJpbmcsXG5cdFx0ZmluYWxWZXJ0aWNlczogTnVtYmVyQXJyYXlMaWtlLFxuXHRcdGZpbmFsVmVydGljZXNMZW5ndGg6IG51bWJlcixcblx0XHRmaW5hbEluZGljZXM6IE51bWJlckFycmF5TGlrZSxcblx0XHRmaW5hbEluZGljZXNMZW5ndGg6IG51bWJlcixcblx0XHRkYXJrVGludDogYm9vbGVhblxuXHQpOiB2b2lkO1xufVxuIl19