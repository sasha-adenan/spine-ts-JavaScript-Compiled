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
import { Container } from "@pixi/display";
import { Graphics } from "@pixi/graphics";
import { Text } from "@pixi/text";
import { ClippingAttachment, MeshAttachment, PathAttachment, RegionAttachment, SkeletonBounds } from "@esotericsoftware/spine-core";
/**
 * This is a debug renderer that uses PixiJS Graphics under the hood.
 * @public
 */
export class SpineDebugRenderer {
    registeredSpines = new Map();
    drawMeshHull = true;
    drawMeshTriangles = true;
    drawBones = true;
    drawPaths = true;
    drawBoundingBoxes = true;
    drawClipping = true;
    drawRegionAttachments = true;
    drawEvents = true;
    lineWidth = 1;
    regionAttachmentsColor = 0x0078ff;
    meshHullColor = 0x0078ff;
    meshTrianglesColor = 0xffcc00;
    clippingPolygonColor = 0xff00ff;
    boundingBoxesRectColor = 0x00ff00;
    boundingBoxesPolygonColor = 0x00ff00;
    boundingBoxesCircleColor = 0x00ff00;
    pathsCurveColor = 0xff0000;
    pathsLineColor = 0xff00ff;
    skeletonXYColor = 0xff0000;
    bonesColor = 0x00eecc;
    eventFontSize = 24;
    eventFontColor = 0x0;
    /**
     * The debug is attached by force to each spine object. So we need to create it inside the spine when we get the first update
     */
    registerSpine(spine) {
        if (this.registeredSpines.has(spine)) {
            console.warn("SpineDebugRenderer.registerSpine() - this spine is already registered!", spine);
            return;
        }
        const debugDisplayObjects = {
            parentDebugContainer: new Container(),
            bones: new Container(),
            skeletonXY: new Graphics(),
            regionAttachmentsShape: new Graphics(),
            meshTrianglesLine: new Graphics(),
            meshHullLine: new Graphics(),
            clippingPolygon: new Graphics(),
            boundingBoxesRect: new Graphics(),
            boundingBoxesCircle: new Graphics(),
            boundingBoxesPolygon: new Graphics(),
            pathsCurve: new Graphics(),
            pathsLine: new Graphics(),
            eventText: new Container(),
            eventCallback: {
                event: (_, event) => {
                    if (this.drawEvents) {
                        const scale = Math.abs(spine.scale.x || spine.scale.y || 1);
                        const text = new Text(event.data.name, { fontSize: this.eventFontSize / scale, fill: this.eventFontColor, fontFamily: "monospace" });
                        text.scale.x = Math.sign(spine.scale.x);
                        text.anchor.set(0.5);
                        debugDisplayObjects.eventText.addChild(text);
                        setTimeout(() => {
                            if (!text.destroyed) {
                                text.destroy();
                            }
                        }, 250);
                    }
                },
            },
        };
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.bones);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.skeletonXY);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.regionAttachmentsShape);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.meshTrianglesLine);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.meshHullLine);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.clippingPolygon);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.boundingBoxesRect);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.boundingBoxesCircle);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.boundingBoxesPolygon);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.pathsCurve);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.pathsLine);
        debugDisplayObjects.parentDebugContainer.addChild(debugDisplayObjects.eventText);
        debugDisplayObjects.parentDebugContainer.zIndex = 9999999;
        // Disable screen reader and mouse input on debug objects.
        debugDisplayObjects.parentDebugContainer.accessibleChildren = false;
        debugDisplayObjects.parentDebugContainer.eventMode = "none";
        debugDisplayObjects.parentDebugContainer.interactiveChildren = false;
        spine.addChild(debugDisplayObjects.parentDebugContainer);
        spine.state.addListener(debugDisplayObjects.eventCallback);
        this.registeredSpines.set(spine, debugDisplayObjects);
    }
    renderDebug(spine) {
        if (!this.registeredSpines.has(spine)) {
            // This should never happen. Spines are registered when you assign spine.debug
            this.registerSpine(spine);
        }
        const debugDisplayObjects = this.registeredSpines.get(spine);
        if (!debugDisplayObjects) {
            return;
        }
        spine.addChild(debugDisplayObjects.parentDebugContainer);
        debugDisplayObjects.skeletonXY.clear();
        debugDisplayObjects.regionAttachmentsShape.clear();
        debugDisplayObjects.meshTrianglesLine.clear();
        debugDisplayObjects.meshHullLine.clear();
        debugDisplayObjects.clippingPolygon.clear();
        debugDisplayObjects.boundingBoxesRect.clear();
        debugDisplayObjects.boundingBoxesCircle.clear();
        debugDisplayObjects.boundingBoxesPolygon.clear();
        debugDisplayObjects.pathsCurve.clear();
        debugDisplayObjects.pathsLine.clear();
        for (let len = debugDisplayObjects.bones.children.length; len > 0; len--) {
            debugDisplayObjects.bones.children[len - 1].destroy({ children: true, texture: true, baseTexture: true });
        }
        const scale = Math.abs(spine.scale.x || spine.scale.y || 1);
        const lineWidth = this.lineWidth / scale;
        if (this.drawBones) {
            this.drawBonesFunc(spine, debugDisplayObjects, lineWidth, scale);
        }
        if (this.drawPaths) {
            this.drawPathsFunc(spine, debugDisplayObjects, lineWidth);
        }
        if (this.drawBoundingBoxes) {
            this.drawBoundingBoxesFunc(spine, debugDisplayObjects, lineWidth);
        }
        if (this.drawClipping) {
            this.drawClippingFunc(spine, debugDisplayObjects, lineWidth);
        }
        if (this.drawMeshHull || this.drawMeshTriangles) {
            this.drawMeshHullAndMeshTriangles(spine, debugDisplayObjects, lineWidth);
        }
        if (this.drawRegionAttachments) {
            this.drawRegionAttachmentsFunc(spine, debugDisplayObjects, lineWidth);
        }
        if (this.drawEvents) {
            for (const child of debugDisplayObjects.eventText.children) {
                child.alpha -= 0.05;
                child.y -= 2;
            }
        }
    }
    drawBonesFunc(spine, debugDisplayObjects, lineWidth, scale) {
        const skeleton = spine.skeleton;
        const skeletonX = skeleton.x;
        const skeletonY = skeleton.y;
        const bones = skeleton.bones;
        debugDisplayObjects.skeletonXY.lineStyle(lineWidth, this.skeletonXYColor, 1);
        for (let i = 0, len = bones.length; i < len; i++) {
            const bone = bones[i];
            const boneLen = bone.data.length;
            const starX = skeletonX + bone.worldX;
            const starY = skeletonY + bone.worldY;
            const endX = skeletonX + boneLen * bone.a + bone.worldX;
            const endY = skeletonY + boneLen * bone.b + bone.worldY;
            if (bone.data.name === "root" || bone.data.parent === null) {
                continue;
            }
            const w = Math.abs(starX - endX);
            const h = Math.abs(starY - endY);
            // a = w, // side length a
            const a2 = Math.pow(w, 2); // square root of side length a
            const b = h; // side length b
            const b2 = Math.pow(h, 2); // square root of side length b
            const c = Math.sqrt(a2 + b2); // side length c
            const c2 = Math.pow(c, 2); // square root of side length c
            const rad = Math.PI / 180;
            // A = Math.acos([a2 + c2 - b2] / [2 * a * c]) || 0, // Angle A
            // C = Math.acos([a2 + b2 - c2] / [2 * a * b]) || 0, // C angle
            const B = Math.acos((c2 + b2 - a2) / (2 * b * c)) || 0; // angle of corner B
            if (c === 0) {
                continue;
            }
            const gp = new Graphics();
            debugDisplayObjects.bones.addChild(gp);
            // draw bone
            const refRation = c / 50 / scale;
            gp.beginFill(this.bonesColor, 1);
            gp.drawPolygon(0, 0, 0 - refRation, c - refRation * 3, 0, c - refRation, 0 + refRation, c - refRation * 3);
            gp.endFill();
            gp.x = starX;
            gp.y = starY;
            gp.pivot.y = c;
            // Calculate bone rotation angle
            let rotation = 0;
            if (starX < endX && starY < endY) {
                // bottom right
                rotation = -B + 180 * rad;
            }
            else if (starX > endX && starY < endY) {
                // bottom left
                rotation = 180 * rad + B;
            }
            else if (starX > endX && starY > endY) {
                // top left
                rotation = -B;
            }
            else if (starX < endX && starY > endY) {
                // bottom left
                rotation = B;
            }
            else if (starY === endY && starX < endX) {
                // To the right
                rotation = 90 * rad;
            }
            else if (starY === endY && starX > endX) {
                // go left
                rotation = -90 * rad;
            }
            else if (starX === endX && starY < endY) {
                // down
                rotation = 180 * rad;
            }
            else if (starX === endX && starY > endY) {
                // up
                rotation = 0;
            }
            gp.rotation = rotation;
            // Draw the starting rotation point of the bone
            gp.lineStyle(lineWidth + refRation / 2.4, this.bonesColor, 1);
            gp.beginFill(0x000000, 0.6);
            gp.drawCircle(0, c, refRation * 1.2);
            gp.endFill();
        }
        // Draw the skeleton starting point "X" form
        const startDotSize = lineWidth * 3;
        debugDisplayObjects.skeletonXY.moveTo(skeletonX - startDotSize, skeletonY - startDotSize);
        debugDisplayObjects.skeletonXY.lineTo(skeletonX + startDotSize, skeletonY + startDotSize);
        debugDisplayObjects.skeletonXY.moveTo(skeletonX + startDotSize, skeletonY - startDotSize);
        debugDisplayObjects.skeletonXY.lineTo(skeletonX - startDotSize, skeletonY + startDotSize);
    }
    drawRegionAttachmentsFunc(spine, debugDisplayObjects, lineWidth) {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;
        debugDisplayObjects.regionAttachmentsShape.lineStyle(lineWidth, this.regionAttachmentsColor, 1);
        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            const attachment = slot.getAttachment();
            if (attachment == null || !(attachment instanceof RegionAttachment)) {
                continue;
            }
            const regionAttachment = attachment;
            const vertices = new Float32Array(8);
            regionAttachment.computeWorldVertices(slot, vertices, 0, 2);
            debugDisplayObjects.regionAttachmentsShape.drawPolygon(Array.from(vertices.slice(0, 8)));
        }
    }
    drawMeshHullAndMeshTriangles(spine, debugDisplayObjects, lineWidth) {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;
        debugDisplayObjects.meshHullLine.lineStyle(lineWidth, this.meshHullColor, 1);
        debugDisplayObjects.meshTrianglesLine.lineStyle(lineWidth, this.meshTrianglesColor, 1);
        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            if (!slot.bone.active) {
                continue;
            }
            const attachment = slot.getAttachment();
            if (attachment == null || !(attachment instanceof MeshAttachment)) {
                continue;
            }
            const meshAttachment = attachment;
            const vertices = new Float32Array(meshAttachment.worldVerticesLength);
            const triangles = meshAttachment.triangles;
            let hullLength = meshAttachment.hullLength;
            meshAttachment.computeWorldVertices(slot, 0, meshAttachment.worldVerticesLength, vertices, 0, 2);
            // draw the skinned mesh (triangle)
            if (this.drawMeshTriangles) {
                for (let i = 0, len = triangles.length; i < len; i += 3) {
                    const v1 = triangles[i] * 2;
                    const v2 = triangles[i + 1] * 2;
                    const v3 = triangles[i + 2] * 2;
                    debugDisplayObjects.meshTrianglesLine.moveTo(vertices[v1], vertices[v1 + 1]);
                    debugDisplayObjects.meshTrianglesLine.lineTo(vertices[v2], vertices[v2 + 1]);
                    debugDisplayObjects.meshTrianglesLine.lineTo(vertices[v3], vertices[v3 + 1]);
                }
            }
            // draw skin border
            if (this.drawMeshHull && hullLength > 0) {
                hullLength = (hullLength >> 1) * 2;
                let lastX = vertices[hullLength - 2];
                let lastY = vertices[hullLength - 1];
                for (let i = 0, len = hullLength; i < len; i += 2) {
                    const x = vertices[i];
                    const y = vertices[i + 1];
                    debugDisplayObjects.meshHullLine.moveTo(x, y);
                    debugDisplayObjects.meshHullLine.lineTo(lastX, lastY);
                    lastX = x;
                    lastY = y;
                }
            }
        }
    }
    drawClippingFunc(spine, debugDisplayObjects, lineWidth) {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;
        debugDisplayObjects.clippingPolygon.lineStyle(lineWidth, this.clippingPolygonColor, 1);
        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            if (!slot.bone.active) {
                continue;
            }
            const attachment = slot.getAttachment();
            if (attachment == null || !(attachment instanceof ClippingAttachment)) {
                continue;
            }
            const clippingAttachment = attachment;
            const nn = clippingAttachment.worldVerticesLength;
            const world = new Float32Array(nn);
            clippingAttachment.computeWorldVertices(slot, 0, nn, world, 0, 2);
            debugDisplayObjects.clippingPolygon.drawPolygon(Array.from(world));
        }
    }
    drawBoundingBoxesFunc(spine, debugDisplayObjects, lineWidth) {
        // draw the total outline of the bounding box
        debugDisplayObjects.boundingBoxesRect.lineStyle(lineWidth, this.boundingBoxesRectColor, 5);
        const bounds = new SkeletonBounds();
        bounds.update(spine.skeleton, true);
        if (bounds.minX !== Infinity) {
            debugDisplayObjects.boundingBoxesRect.drawRect(bounds.minX, bounds.minY, bounds.getWidth(), bounds.getHeight());
        }
        const polygons = bounds.polygons;
        const drawPolygon = (polygonVertices, _offset, count) => {
            debugDisplayObjects.boundingBoxesPolygon.lineStyle(lineWidth, this.boundingBoxesPolygonColor, 1);
            debugDisplayObjects.boundingBoxesPolygon.beginFill(this.boundingBoxesPolygonColor, 0.1);
            if (count < 3) {
                throw new Error("Polygon must contain at least 3 vertices");
            }
            const paths = [];
            const dotSize = lineWidth * 2;
            for (let i = 0, len = polygonVertices.length; i < len; i += 2) {
                const x1 = polygonVertices[i];
                const y1 = polygonVertices[i + 1];
                // draw the bounding box node
                debugDisplayObjects.boundingBoxesCircle.lineStyle(0);
                debugDisplayObjects.boundingBoxesCircle.beginFill(this.boundingBoxesCircleColor);
                debugDisplayObjects.boundingBoxesCircle.drawCircle(x1, y1, dotSize);
                debugDisplayObjects.boundingBoxesCircle.endFill();
                paths.push(x1, y1);
            }
            // draw the bounding box area
            debugDisplayObjects.boundingBoxesPolygon.drawPolygon(paths);
            debugDisplayObjects.boundingBoxesPolygon.endFill();
        };
        for (let i = 0, len = polygons.length; i < len; i++) {
            const polygon = polygons[i];
            drawPolygon(polygon, 0, polygon.length);
        }
    }
    drawPathsFunc(spine, debugDisplayObjects, lineWidth) {
        const skeleton = spine.skeleton;
        const slots = skeleton.slots;
        debugDisplayObjects.pathsCurve.lineStyle(lineWidth, this.pathsCurveColor, 1);
        debugDisplayObjects.pathsLine.lineStyle(lineWidth, this.pathsLineColor, 1);
        for (let i = 0, len = slots.length; i < len; i++) {
            const slot = slots[i];
            if (!slot.bone.active) {
                continue;
            }
            const attachment = slot.getAttachment();
            if (attachment == null || !(attachment instanceof PathAttachment)) {
                continue;
            }
            const pathAttachment = attachment;
            let nn = pathAttachment.worldVerticesLength;
            const world = new Float32Array(nn);
            pathAttachment.computeWorldVertices(slot, 0, nn, world, 0, 2);
            let x1 = world[2];
            let y1 = world[3];
            let x2 = 0;
            let y2 = 0;
            if (pathAttachment.closed) {
                const cx1 = world[0];
                const cy1 = world[1];
                const cx2 = world[nn - 2];
                const cy2 = world[nn - 1];
                x2 = world[nn - 4];
                y2 = world[nn - 3];
                // curve
                debugDisplayObjects.pathsCurve.moveTo(x1, y1);
                debugDisplayObjects.pathsCurve.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
                // handle
                debugDisplayObjects.pathsLine.moveTo(x1, y1);
                debugDisplayObjects.pathsLine.lineTo(cx1, cy1);
                debugDisplayObjects.pathsLine.moveTo(x2, y2);
                debugDisplayObjects.pathsLine.lineTo(cx2, cy2);
            }
            nn -= 4;
            for (let ii = 4; ii < nn; ii += 6) {
                const cx1 = world[ii];
                const cy1 = world[ii + 1];
                const cx2 = world[ii + 2];
                const cy2 = world[ii + 3];
                x2 = world[ii + 4];
                y2 = world[ii + 5];
                // curve
                debugDisplayObjects.pathsCurve.moveTo(x1, y1);
                debugDisplayObjects.pathsCurve.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
                // handle
                debugDisplayObjects.pathsLine.moveTo(x1, y1);
                debugDisplayObjects.pathsLine.lineTo(cx1, cy1);
                debugDisplayObjects.pathsLine.moveTo(x2, y2);
                debugDisplayObjects.pathsLine.lineTo(cx2, cy2);
                x1 = x2;
                y1 = y2;
            }
        }
    }
    unregisterSpine(spine) {
        if (!this.registeredSpines.has(spine)) {
            console.warn("SpineDebugRenderer.unregisterSpine() - spine is not registered, can't unregister!", spine);
        }
        const debugDisplayObjects = this.registeredSpines.get(spine);
        if (!debugDisplayObjects) {
            return;
        }
        spine.state.removeListener(debugDisplayObjects.eventCallback);
        debugDisplayObjects.parentDebugContainer.destroy({ baseTexture: true, children: true, texture: true });
        this.registeredSpines.delete(spine);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BpbmVEZWJ1Z1JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NwaW5lRGVidWdSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFFL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUdsQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQXdDcEk7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUN0QixnQkFBZ0IsR0FBb0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUUvRCxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLGlCQUFpQixHQUFHLElBQUksQ0FBQztJQUN6QixTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDakIsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLFlBQVksR0FBRyxJQUFJLENBQUM7SUFDcEIscUJBQXFCLEdBQUcsSUFBSSxDQUFDO0lBQzdCLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFFbEIsU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNkLHNCQUFzQixHQUFHLFFBQVEsQ0FBQztJQUNsQyxhQUFhLEdBQUcsUUFBUSxDQUFDO0lBQ3pCLGtCQUFrQixHQUFHLFFBQVEsQ0FBQztJQUM5QixvQkFBb0IsR0FBRyxRQUFRLENBQUM7SUFDaEMsc0JBQXNCLEdBQUcsUUFBUSxDQUFDO0lBQ2xDLHlCQUF5QixHQUFHLFFBQVEsQ0FBQztJQUNyQyx3QkFBd0IsR0FBRyxRQUFRLENBQUM7SUFDcEMsZUFBZSxHQUFH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QyxNQUFNLEtBQUssR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxTQUFTLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUN4RCxNQUFNLElBQUksR0FBRyxTQUFTLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUV4RCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDNUQsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNqQywwQkFBMEI7WUFDMUIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQywrQkFBK0I7WUFDMUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1lBQzdCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsK0JBQStCO1lBQzFELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1lBQzlDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsK0JBQStCO1lBQzFELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDO1lBQzFCLCtEQUErRDtZQUMvRCwrREFB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RSxFQUFFLENBQUMsQ0FBQztnQkFDN0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQy9DLEVBQUUsR0FBRyxFQUFFLENBQUM7Z0JBQ1IsRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUNULENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLGVBQWUsQ0FBRSxLQUFZO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxtRkFBbUYsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxRyxDQUFDO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFCLE9BQU87UUFDUixDQUFDO1FBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFOUQsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogU3BpbmUgUnVudGltZXMgTGljZW5zZSBBZ3JlZW1lbnRcbiAqIExhc3QgdXBkYXRlZCBBcHJpbCA1LCAyMDI1LiBSZXBsYWNlcyBhbGwgcHJpb3IgdmVyc2lvbnMuXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLTIwMjUsIEVzb3RlcmljIFNvZnR3YXJlIExMQ1xuICpcbiAqIEludGVncmF0aW9uIG9mIHRoZSBTcGluZSBSdW50aW1lcyBpbnRvIHNvZnR3YXJlIG9yIG90aGVyd2lzZSBjcmVhdGluZ1xuICogZGVyaXZhdGl2ZSB3b3JrcyBvZiB0aGUgU3BpbmUgUnVudGltZXMgaXMgcGVybWl0dGVkIHVuZGVyIHRoZSB0ZXJtcyBhbmRcbiAqIGNvbmRpdGlvbnMgb2YgU2VjdGlvbiAyIG9mIHRoZSBTcGluZSBFZGl0b3IgTGljZW5zZSBBZ3JlZW1lbnQ6XG4gKiBodHRwOi8vZXNvdGVyaWNzb2Z0d2FyZS5jb20vc3BpbmUtZWRpdG9yLWxpY2Vuc2VcbiAqXG4gKiBPdGhlcndpc2UsIGl0IGlzIHBlcm1pdHRlZCB0byBpbnRlZ3JhdGUgdGhlIFNwaW5lIFJ1bnRpbWVzIGludG8gc29mdHdhcmVcbiAqIG9yIG90aGVyd2lzZSBjcmVhdGUgZGVyaXZhdGl2ZSB3b3JrcyBvZiB0aGUgU3BpbmUgUnVudGltZXMgKGNvbGxlY3RpdmVseSxcbiAqIFwiUHJvZHVjdHNcIiksIHByb3ZpZGVkIHRoYXQgZWFjaCB1c2VyIG9mIHRoZSBQcm9kdWN0cyBtdXN0IG9idGFpbiB0aGVpciBvd25cbiAqIFNwaW5lIEVkaXRvciBsaWNlbnNlIGFuZCByZWRpc3RyaWJ1dGlvbiBvZiB0aGUgUHJvZHVjdHMgaW4gYW55IGZvcm0gbXVzdFxuICogaW5jbHVkZSB0aGlzIGxpY2Vuc2UgYW5kIGNvcHlyaWdodCBub3RpY2UuXG4gKlxuICogVEhFIFNQSU5FIFJVTlRJTUVTIEFSRSBQUk9WSURFRCBCWSBFU09URVJJQyBTT0ZUV0FSRSBMTEMgXCJBUyBJU1wiIEFORCBBTllcbiAqIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRURcbiAqIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkVcbiAqIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIEVTT1RFUklDIFNPRlRXQVJFIExMQyBCRSBMSUFCTEUgRk9SIEFOWVxuICogRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAqIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUyxcbiAqIEJVU0lORVNTIElOVEVSUlVQVElPTiwgT1IgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFMpIEhPV0VWRVIgQ0FVU0VEIEFORFxuICogT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAqIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICogVEhFIFNQSU5FIFJVTlRJTUVTLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5pbXBvcnQgeyBDb250YWluZXIgfSBmcm9tIFwiQHBpeGkvZGlzcGxheVwiO1xuaW1wb3J0IHsgR3JhcGhpY3MgfSBmcm9tIFwiQHBpeGkvZ3JhcGhpY3NcIjtcbmltcG9ydCB7IFRleHQgfSBmcm9tIFwiQHBpeGkvdGV4dFwiO1xuaW1wb3J0IHR5cGUgeyBTcGluZSB9IGZyb20gXCIuL1NwaW5lLmpzXCI7XG5pbXBvcnQgdHlwZSB7IEFuaW1hdGlvblN0YXRlTGlzdGVuZXIgfSBmcm9tIFwiQGVzb3Rlcmljc29mdHdhcmUvc3BpbmUtY29yZVwiO1xuaW1wb3J0IHsgQ2xpcHBpbmdBdHRhY2htZW50LCBNZXNoQXR0YWNobWVudCwgUGF0aEF0dGFjaG1lbnQsIFJlZ2lvbkF0dGFjaG1lbnQsIFNrZWxldG9uQm91bmRzIH0gZnJvbSBcIkBlc290ZXJpY3NvZnR3YXJlL3NwaW5lLWNvcmVcIjtcblxuLyoqXG4gKiBNYWtlIGEgY2xhc3MgdGhhdCBleHRlbmRzIGZyb20gdGhpcyBpbnRlcmZhY2UgdG8gY3JlYXRlIHlvdXIgb3duIGRlYnVnIHJlbmRlcmVyLlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgaW50ZXJmYWNlIElTcGluZURlYnVnUmVuZGVyZXIge1xuXHQvKipcblx0ICogVGhpcyB3aWxsIGJlIGNhbGxlZCBldmVyeSBmcmFtZSwgYWZ0ZXIgdGhlIHNwaW5lIGhhcyBiZWVuIHVwZGF0ZWQuXG5cdCAqL1xuXHRyZW5kZXJEZWJ1ZyAoc3BpbmU6IFNwaW5lKTogdm9pZDtcblxuXHQvKipcblx0ICogIFRoaXMgaXMgY2FsbGVkIHdoZW4gdGhlIGBzcGluZS5kZWJ1Z2Agb2JqZWN0IGlzIHNldCB0byBudWxsIG9yIHdoZW4gdGhlIHNwaW5lIGlzIGRlc3Ryb3llZC5cblx0ICovXG5cdHVucmVnaXN0ZXJTcGluZSAoc3BpbmU6IFNwaW5lKTogdm9pZDtcblxuXHQvKipcblx0ICogVGhpcyBpcyBjYWxsZWQgd2hlbiB0aGUgYHNwaW5lLmRlYnVnYCBvYmplY3QgaXMgc2V0IHRvIGEgbmV3IGluc3RhbmNlIG9mIGEgZGVidWcgcmVuZGVyZXIuXG5cdCAqL1xuXHRyZWdpc3RlclNwaW5lIChzcGluZTogU3BpbmUpOiB2b2lkO1xufVxuXG50eXBlIERlYnVnRGlzcGxheU9iamVjdHMgPSB7XG5cdGJvbmVzOiBDb250YWluZXI7XG5cdHNrZWxldG9uWFk6IEdyYXBoaWNzO1xuXHRyZWdpb25BdHRhY2htZW50c1NoYXBlOiBHcmFwaGljcztcblx0bWVzaFRyaWFuZ2xlc0xpbmU6IEdyYXBoaWNzO1xuXHRtZXNoSHVsbExpbmU6IEdyYXBoaWNzO1xuXHRjbGlwcGluZ1BvbHlnb246IEdyYXBoaWNzO1xuXHRib3VuZGluZ0JveGVzUmVjdDogR3JhcGhpY3M7XG5cdGJvdW5kaW5nQm94ZXNDaXJjbGU6IEdyYXBoaWNzO1xuXHRib3VuZGluZ0JveGVzUG9seWdvbjogR3JhcGhpY3M7XG5cdHBhdGhzQ3VydmU6IEdyYXBoaWNzO1xuXHRwYXRoc0xpbmU6IEdyYXBoaWNzO1xuXHRwYXJlbnREZWJ1Z0NvbnRhaW5lcjogQ29udGFpbmVyO1xuXHRldmVudFRleHQ6IENvbnRhaW5lcjtcblx0ZXZlbnRDYWxsYmFjazogQW5pbWF0aW9uU3RhdGVMaXN0ZW5lcjtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIGRlYnVnIHJlbmRlcmVyIHRoYXQgdXNlcyBQaXhpSlMgR3JhcGhpY3MgdW5kZXIgdGhlIGhvb2QuXG4gKiBAcHVibGljXG4gKi9cbmV4cG9ydCBjbGFzcyBTcGluZURlYnVnUmVuZGVyZXIgaW1wbGVtZW50cyBJU3BpbmVEZWJ1Z1JlbmRlcmVyIHtcblx0cHJpdmF0ZSByZWdpc3RlcmVkU3BpbmVzOiBNYXA8U3BpbmUsIERlYnVnRGlzcGxheU9iamVjdHM+ID0gbmV3IE1hcCgpO1xuXG5cdHB1YmxpYyBkcmF3TWVzaEh1bGwgPSB0cnVlO1xuXHRwdWJsaWMgZHJhd01lc2hUcmlhbmdsZXMgPSB0cnVlO1xuXHRwdWJsaWMgZHJhd0JvbmVzID0gdHJ1ZTtcblx0cHVibGljIGRyYXdQYXRocyA9IHRydWU7XG5cdHB1YmxpYyBkcmF3Qm91bmRpbmdCb3hlcyA9IHRydWU7XG5cdHB1YmxpYyBkcmF3Q2xpcHBpbmcgPSB0cnVlO1xuXHRwdWJsaWMgZHJhd1JlZ2lvbkF0dGFjaG1lbnRzID0gdHJ1ZTtcblx0cHVibGljIGRyYXdFdmVudHMgPSB0cnVlO1xuXG5cdHB1YmxpYyBsaW5lV2lkdGggPSAxO1xuXHRwdWJsaWMgcmVnaW9uQXR0YWNobWVudHNDb2xvciA9IDB4MDA3OGZmO1xuXHRwdWJsaWMgbWVzaEh1bGxDb2xvciA9IDB4MDA3OGZmO1xuXHRwdWJsaWMgbWVzaFRyaWFuZ2xlc0NvbG9yID0gMHhmZmNjMDA7XG5cdHB1YmxpYyBjbGlwcGluZ1BvbHlnb25Db2xvciA9IDB4ZmYwMGZmO1xuXHRwdWJsaWMgYm91bmRpbmdCb3hlc1JlY3RDb2xvciA9IDB4MDBmZjAwO1xuXHRwdWJsaWMgYm91bmRpbmdCb3hlc1BvbHlnb25Db2xvciA9IDB4MDBmZjAwO1xuXHRwdWJsaWMgYm91bmRpbmdCb3hlc0NpcmNsZUNvbG9yID0gMHgwMGZmMDA7XG5cdHB1YmxpYyBwYXRoc0N1cnZlQ29sb3IgPSAweGZmMDAwMDtcblx0cHVibGljIHBhdGhzTGluZUNvbG9yID0gMHhmZjAwZmY7XG5cdHB1YmxpYyBza2VsZXRvblhZQ29sb3IgPSAweGZmMDAwMDtcblx0cHVibGljIGJvbmVzQ29sb3IgPSAweDAwZWVjYztcblx0cHVibGljIGV2ZW50Rm9udFNpemU6IG51bWJlciA9IDI0O1xuXHRwdWJsaWMgZXZlbnRGb250Q29sb3I6IG51bWJlciA9IDB4MDtcblxuXHQvKipcblx0ICogVGhlIGRlYnVnIGlzIGF0dGFjaGVkIGJ5IGZvcmNlIHRvIGVhY2ggc3BpbmUgb2JqZWN0LiBTbyB3ZSBuZWVkIHRvIGNyZWF0ZSBpdCBpbnNpZGUgdGhlIHNwaW5lIHdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB1cGRhdGVcblx0ICovXG5cdHB1YmxpYyByZWdpc3RlclNwaW5lIChzcGluZTogU3BpbmUpOiB2b2lkIHtcblx0XHRpZiAodGhpcy5yZWdpc3RlcmVkU3BpbmVzLmhhcyhzcGluZSkpIHtcblx0XHRcdGNvbnNvbGUud2FybihcIlNwaW5lRGVidWdSZW5kZXJlci5yZWdpc3RlclNwaW5lKCkgLSB0aGlzIHNwaW5lIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCFcIiwgc3BpbmUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBkZWJ1Z0Rpc3BsYXlPYmplY3RzOiBEZWJ1Z0Rpc3BsYXlPYmplY3RzID0ge1xuXHRcdFx0cGFyZW50RGVidWdDb250YWluZXI6IG5ldyBDb250YWluZXIoKSxcblx0XHRcdGJvbmVzOiBuZXcgQ29udGFpbmVyKCksXG5cdFx0XHRza2VsZXRvblhZOiBuZXcgR3JhcGhpY3MoKSxcblx0XHRcdHJlZ2lvbkF0dGFjaG1lbnRzU2hhcGU6IG5ldyBHcmFwaGljcygpLFxuXHRcdFx0bWVzaFRyaWFuZ2xlc0xpbmU6IG5ldyBHcmFwaGljcygpLFxuXHRcdFx0bWVzaEh1bGxMaW5lOiBuZXcgR3JhcGhpY3MoKSxcblx0XHRcdGNsaXBwaW5nUG9seWdvbjogbmV3IEdyYXBoaWNzKCksXG5cdFx0XHRib3VuZGluZ0JveGVzUmVjdDogbmV3IEdyYXBoaWNzKCksXG5cdFx0XHRib3VuZGluZ0JveGVzQ2lyY2xlOiBuZXcgR3JhcGhpY3MoKSxcblx0XHRcdGJvdW5kaW5nQm94ZXNQb2x5Z29uOiBuZXcgR3JhcGhpY3MoKSxcblx0XHRcdHBhdGhzQ3VydmU6IG5ldyBHcmFwaGljcygpLFxuXHRcdFx0cGF0aHNMaW5lOiBuZXcgR3JhcGhpY3MoKSxcblx0XHRcdGV2ZW50VGV4dDogbmV3IENvbnRhaW5lcigpLFxuXHRcdFx0ZXZlbnRDYWxsYmFjazoge1xuXHRcdFx0XHRldmVudDogKF8sIGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuZHJhd0V2ZW50cykge1xuXHRcdFx0XHRcdFx0Y29uc3Qgc2NhbGUgPSBNYXRoLmFicyhzcGluZS5zY2FsZS54IHx8IHNwaW5lLnNjYWxlLnkgfHwgMSk7XG5cdFx0XHRcdFx0XHRjb25zdCB0ZXh0ID0gbmV3IFRleHQoZXZlbnQuZGF0YS5uYW1lLCB7IGZvbnRTaXplOiB0aGlzLmV2ZW50Rm9udFNpemUgLyBzY2FsZSwgZmlsbDogdGhpcy5ldmVudEZvbnRDb2xvciwgZm9udEZhbWlseTogXCJtb25vc3BhY2VcIiB9KTtcblx0XHRcdFx0XHRcdHRleHQuc2NhbGUueCA9IE1hdGguc2lnbihzcGluZS5zY2FsZS54KTtcblx0XHRcdFx0XHRcdHRleHQuYW5jaG9yLnNldCgwLjUpO1xuXHRcdFx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ldmVudFRleHQuYWRkQ2hpbGQodGV4dCk7XG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKCF0ZXh0LmRlc3Ryb3llZCkge1xuXHRcdFx0XHRcdFx0XHRcdHRleHQuZGVzdHJveSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LCAyNTApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5ib25lcyk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXJlbnREZWJ1Z0NvbnRhaW5lci5hZGRDaGlsZChkZWJ1Z0Rpc3BsYXlPYmplY3RzLnNrZWxldG9uWFkpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5yZWdpb25BdHRhY2htZW50c1NoYXBlKTtcblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhcmVudERlYnVnQ29udGFpbmVyLmFkZENoaWxkKGRlYnVnRGlzcGxheU9iamVjdHMubWVzaFRyaWFuZ2xlc0xpbmUpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5tZXNoSHVsbExpbmUpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5jbGlwcGluZ1BvbHlnb24pO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzUmVjdCk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXJlbnREZWJ1Z0NvbnRhaW5lci5hZGRDaGlsZChkZWJ1Z0Rpc3BsYXlPYmplY3RzLmJvdW5kaW5nQm94ZXNDaXJjbGUpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzUG9seWdvbik7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXJlbnREZWJ1Z0NvbnRhaW5lci5hZGRDaGlsZChkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzQ3VydmUpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0xpbmUpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIuYWRkQ2hpbGQoZGVidWdEaXNwbGF5T2JqZWN0cy5ldmVudFRleHQpO1xuXG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXJlbnREZWJ1Z0NvbnRhaW5lci56SW5kZXggPSA5OTk5OTk5O1xuXG5cdFx0Ly8gRGlzYWJsZSBzY3JlZW4gcmVhZGVyIGFuZCBtb3VzZSBpbnB1dCBvbiBkZWJ1ZyBvYmplY3RzLlxuXHRcdChkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhcmVudERlYnVnQ29udGFpbmVyIGFzIGFueSkuYWNjZXNzaWJsZUNoaWxkcmVuID0gZmFsc2U7XG5cdFx0KGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIgYXMgYW55KS5ldmVudE1vZGUgPSBcIm5vbmVcIjtcblx0XHQoZGVidWdEaXNwbGF5T2JqZWN0cy5wYXJlbnREZWJ1Z0NvbnRhaW5lciBhcyBhbnkpLmludGVyYWN0aXZlQ2hpbGRyZW4gPSBmYWxzZTtcblxuXHRcdHNwaW5lLmFkZENoaWxkKGRlYnVnRGlzcGxheU9iamVjdHMucGFyZW50RGVidWdDb250YWluZXIpO1xuXG5cdFx0c3BpbmUuc3RhdGUuYWRkTGlzdGVuZXIoZGVidWdEaXNwbGF5T2JqZWN0cy5ldmVudENhbGxiYWNrKTtcblxuXHRcdHRoaXMucmVnaXN0ZXJlZFNwaW5lcy5zZXQoc3BpbmUsIGRlYnVnRGlzcGxheU9iamVjdHMpO1xuXHR9XG5cdHB1YmxpYyByZW5kZXJEZWJ1ZyAoc3BpbmU6IFNwaW5lKTogdm9pZCB7XG5cdFx0aWYgKCF0aGlzLnJlZ2lzdGVyZWRTcGluZXMuaGFzKHNwaW5lKSkge1xuXHRcdFx0Ly8gVGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuLiBTcGluZXMgYXJlIHJlZ2lzdGVyZWQgd2hlbiB5b3UgYXNzaWduIHNwaW5lLmRlYnVnXG5cdFx0XHR0aGlzLnJlZ2lzdGVyU3BpbmUoc3BpbmUpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGRlYnVnRGlzcGxheU9iamVjdHMgPSB0aGlzLnJlZ2lzdGVyZWRTcGluZXMuZ2V0KHNwaW5lKTtcblxuXHRcdGlmICghZGVidWdEaXNwbGF5T2JqZWN0cykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRzcGluZS5hZGRDaGlsZChkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhcmVudERlYnVnQ29udGFpbmVyKTtcblxuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMuc2tlbGV0b25YWS5jbGVhcigpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucmVnaW9uQXR0YWNobWVudHNTaGFwZS5jbGVhcigpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMubWVzaFRyaWFuZ2xlc0xpbmUuY2xlYXIoKTtcblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLm1lc2hIdWxsTGluZS5jbGVhcigpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMuY2xpcHBpbmdQb2x5Z29uLmNsZWFyKCk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzUmVjdC5jbGVhcigpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMuYm91bmRpbmdCb3hlc0NpcmNsZS5jbGVhcigpO1xuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMuYm91bmRpbmdCb3hlc1BvbHlnb24uY2xlYXIoKTtcblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzQ3VydmUuY2xlYXIoKTtcblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzTGluZS5jbGVhcigpO1xuXG5cdFx0Zm9yIChsZXQgbGVuID0gZGVidWdEaXNwbGF5T2JqZWN0cy5ib25lcy5jaGlsZHJlbi5sZW5ndGg7IGxlbiA+IDA7IGxlbi0tKSB7XG5cdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLmJvbmVzLmNoaWxkcmVuW2xlbiAtIDFdLmRlc3Ryb3koeyBjaGlsZHJlbjogdHJ1ZSwgdGV4dHVyZTogdHJ1ZSwgYmFzZVRleHR1cmU6IHRydWUgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2NhbGUgPSBNYXRoLmFicyhzcGluZS5zY2FsZS54IHx8IHNwaW5lLnNjYWxlLnkgfHwgMSk7XG5cdFx0Y29uc3QgbGluZVdpZHRoID0gdGhpcy5saW5lV2lkdGggLyBzY2FsZTtcblxuXHRcdGlmICh0aGlzLmRyYXdCb25lcykge1xuXHRcdFx0dGhpcy5kcmF3Qm9uZXNGdW5jKHNwaW5lLCBkZWJ1Z0Rpc3BsYXlPYmplY3RzLCBsaW5lV2lkdGgsIHNjYWxlKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5kcmF3UGF0aHMpIHtcblx0XHRcdHRoaXMuZHJhd1BhdGhzRnVuYyhzcGluZSwgZGVidWdEaXNwbGF5T2JqZWN0cywgbGluZVdpZHRoKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5kcmF3Qm91bmRpbmdCb3hlcykge1xuXHRcdFx0dGhpcy5kcmF3Qm91bmRpbmdCb3hlc0Z1bmMoc3BpbmUsIGRlYnVnRGlzcGxheU9iamVjdHMsIGxpbmVXaWR0aCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZHJhd0NsaXBwaW5nKSB7XG5cdFx0XHR0aGlzLmRyYXdDbGlwcGluZ0Z1bmMoc3BpbmUsIGRlYnVnRGlzcGxheU9iamVjdHMsIGxpbmVXaWR0aCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZHJhd01lc2hIdWxsIHx8IHRoaXMuZHJhd01lc2hUcmlhbmdsZXMpIHtcblx0XHRcdHRoaXMuZHJhd01lc2hIdWxsQW5kTWVzaFRyaWFuZ2xlcyhzcGluZSwgZGVidWdEaXNwbGF5T2JqZWN0cywgbGluZVdpZHRoKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5kcmF3UmVnaW9uQXR0YWNobWVudHMpIHtcblx0XHRcdHRoaXMuZHJhd1JlZ2lvbkF0dGFjaG1lbnRzRnVuYyhzcGluZSwgZGVidWdEaXNwbGF5T2JqZWN0cywgbGluZVdpZHRoKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5kcmF3RXZlbnRzKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIGRlYnVnRGlzcGxheU9iamVjdHMuZXZlbnRUZXh0LmNoaWxkcmVuKSB7XG5cdFx0XHRcdGNoaWxkLmFscGhhIC09IDAuMDU7XG5cdFx0XHRcdGNoaWxkLnkgLT0gMjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRwcml2YXRlIGRyYXdCb25lc0Z1bmMgKHNwaW5lOiBTcGluZSwgZGVidWdEaXNwbGF5T2JqZWN0czogRGVidWdEaXNwbGF5T2JqZWN0cywgbGluZVdpZHRoOiBudW1iZXIsIHNjYWxlOiBudW1iZXIpOiB2b2lkIHtcblx0XHRjb25zdCBza2VsZXRvbiA9IHNwaW5lLnNrZWxldG9uO1xuXHRcdGNvbnN0IHNrZWxldG9uWCA9IHNrZWxldG9uLng7XG5cdFx0Y29uc3Qgc2tlbGV0b25ZID0gc2tlbGV0b24ueTtcblx0XHRjb25zdCBib25lcyA9IHNrZWxldG9uLmJvbmVzO1xuXG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5za2VsZXRvblhZLmxpbmVTdHlsZShsaW5lV2lkdGgsIHRoaXMuc2tlbGV0b25YWUNvbG9yLCAxKTtcblxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBib25lcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0Y29uc3QgYm9uZSA9IGJvbmVzW2ldO1xuXHRcdFx0Y29uc3QgYm9uZUxlbiA9IGJvbmUuZGF0YS5sZW5ndGg7XG5cdFx0XHRjb25zdCBzdGFyWCA9IHNrZWxldG9uWCArIGJvbmUud29ybGRYO1xuXHRcdFx0Y29uc3Qgc3RhclkgPSBza2VsZXRvblkgKyBib25lLndvcmxkWTtcblx0XHRcdGNvbnN0IGVuZFggPSBza2VsZXRvblggKyBib25lTGVuICogYm9uZS5hICsgYm9uZS53b3JsZFg7XG5cdFx0XHRjb25zdCBlbmRZID0gc2tlbGV0b25ZICsgYm9uZUxlbiAqIGJvbmUuYiArIGJvbmUud29ybGRZO1xuXG5cdFx0XHRpZiAoYm9uZS5kYXRhLm5hbWUgPT09IFwicm9vdFwiIHx8IGJvbmUuZGF0YS5wYXJlbnQgPT09IG51bGwpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IHcgPSBNYXRoLmFicyhzdGFyWCAtIGVuZFgpO1xuXHRcdFx0Y29uc3QgaCA9IE1hdGguYWJzKHN0YXJZIC0gZW5kWSk7XG5cdFx0XHQvLyBhID0gdywgLy8gc2lkZSBsZW5ndGggYVxuXHRcdFx0Y29uc3QgYTIgPSBNYXRoLnBvdyh3LCAyKTsgLy8gc3F1YXJlIHJvb3Qgb2Ygc2lkZSBsZW5ndGggYVxuXHRcdFx0Y29uc3QgYiA9IGg7IC8vIHNpZGUgbGVuZ3RoIGJcblx0XHRcdGNvbnN0IGIyID0gTWF0aC5wb3coaCwgMik7IC8vIHNxdWFyZSByb290IG9mIHNpZGUgbGVuZ3RoIGJcblx0XHRcdGNvbnN0IGMgPSBNYXRoLnNxcnQoYTIgKyBiMik7IC8vIHNpZGUgbGVuZ3RoIGNcblx0XHRcdGNvbnN0IGMyID0gTWF0aC5wb3coYywgMik7IC8vIHNxdWFyZSByb290IG9mIHNpZGUgbGVuZ3RoIGNcblx0XHRcdGNvbnN0IHJhZCA9IE1hdGguUEkgLyAxODA7XG5cdFx0XHQvLyBBID0gTWF0aC5hY29zKFthMiArIGMyIC0gYjJdIC8gWzIgKiBhICogY10pIHx8IDAsIC8vIEFuZ2xlIEFcblx0XHRcdC8vIEMgPSBNYXRoLmFjb3MoW2EyICsgYjIgLSBjMl0gLyBbMiAqIGEgKiBiXSkgfHwgMCwgLy8gQyBhbmdsZVxuXHRcdFx0Y29uc3QgQiA9IE1hdGguYWNvcygoYzIgKyBiMiAtIGEyKSAvICgyICogYiAqIGMpKSB8fCAwOyAvLyBhbmdsZSBvZiBjb3JuZXIgQlxuXG5cdFx0XHRpZiAoYyA9PT0gMCkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZ3AgPSBuZXcgR3JhcGhpY3MoKTtcblxuXHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ib25lcy5hZGRDaGlsZChncCk7XG5cblx0XHRcdC8vIGRyYXcgYm9uZVxuXHRcdFx0Y29uc3QgcmVmUmF0aW9uID0gYyAvIDUwIC8gc2NhbGU7XG5cblx0XHRcdGdwLmJlZ2luRmlsbCh0aGlzLmJvbmVzQ29sb3IsIDEpO1xuXHRcdFx0Z3AuZHJhd1BvbHlnb24oMCwgMCwgMCAtIHJlZlJhdGlvbiwgYyAtIHJlZlJhdGlvbiAqIDMsIDAsIGMgLSByZWZSYXRpb24sIDAgKyByZWZSYXRpb24sIGMgLSByZWZSYXRpb24gKiAzKTtcblx0XHRcdGdwLmVuZEZpbGwoKTtcblx0XHRcdGdwLnggPSBzdGFyWDtcblx0XHRcdGdwLnkgPSBzdGFyWTtcblx0XHRcdGdwLnBpdm90LnkgPSBjO1xuXG5cdFx0XHQvLyBDYWxjdWxhdGUgYm9uZSByb3RhdGlvbiBhbmdsZVxuXHRcdFx0bGV0IHJvdGF0aW9uID0gMDtcblxuXHRcdFx0aWYgKHN0YXJYIDwgZW5kWCAmJiBzdGFyWSA8IGVuZFkpIHtcblx0XHRcdFx0Ly8gYm90dG9tIHJpZ2h0XG5cdFx0XHRcdHJvdGF0aW9uID0gLUIgKyAxODAgKiByYWQ7XG5cdFx0XHR9IGVsc2UgaWYgKHN0YXJYID4gZW5kWCAmJiBzdGFyWSA8IGVuZFkpIHtcblx0XHRcdFx0Ly8gYm90dG9tIGxlZnRcblx0XHRcdFx0cm90YXRpb24gPSAxODAgKiByYWQgKyBCO1xuXHRcdFx0fSBlbHNlIGlmIChzdGFyWCA+IGVuZFggJiYgc3RhclkgPiBlbmRZKSB7XG5cdFx0XHRcdC8vIHRvcCBsZWZ0XG5cdFx0XHRcdHJvdGF0aW9uID0gLUI7XG5cdFx0XHR9IGVsc2UgaWYgKHN0YXJYIDwgZW5kWCAmJiBzdGFyWSA+IGVuZFkpIHtcblx0XHRcdFx0Ly8gYm90dG9tIGxlZnRcblx0XHRcdFx0cm90YXRpb24gPSBCO1xuXHRcdFx0fSBlbHNlIGlmIChzdGFyWSA9PT0gZW5kWSAmJiBzdGFyWCA8IGVuZFgpIHtcblx0XHRcdFx0Ly8gVG8gdGhlIHJpZ2h0XG5cdFx0XHRcdHJvdGF0aW9uID0gOTAgKiByYWQ7XG5cdFx0XHR9IGVsc2UgaWYgKHN0YXJZID09PSBlbmRZICYmIHN0YXJYID4gZW5kWCkge1xuXHRcdFx0XHQvLyBnbyBsZWZ0XG5cdFx0XHRcdHJvdGF0aW9uID0gLTkwICogcmFkO1xuXHRcdFx0fSBlbHNlIGlmIChzdGFyWCA9PT0gZW5kWCAmJiBzdGFyWSA8IGVuZFkpIHtcblx0XHRcdFx0Ly8gZG93blxuXHRcdFx0XHRyb3RhdGlvbiA9IDE4MCAqIHJhZDtcblx0XHRcdH0gZWxzZSBpZiAoc3RhclggPT09IGVuZFggJiYgc3RhclkgPiBlbmRZKSB7XG5cdFx0XHRcdC8vIHVwXG5cdFx0XHRcdHJvdGF0aW9uID0gMDtcblx0XHRcdH1cblx0XHRcdGdwLnJvdGF0aW9uID0gcm90YXRpb247XG5cblx0XHRcdC8vIERyYXcgdGhlIHN0YXJ0aW5nIHJvdGF0aW9uIHBvaW50IG9mIHRoZSBib25lXG5cdFx0XHRncC5saW5lU3R5bGUobGluZVdpZHRoICsgcmVmUmF0aW9uIC8gMi40LCB0aGlzLmJvbmVzQ29sb3IsIDEpO1xuXHRcdFx0Z3AuYmVnaW5GaWxsKDB4MDAwMDAwLCAwLjYpO1xuXHRcdFx0Z3AuZHJhd0NpcmNsZSgwLCBjLCByZWZSYXRpb24gKiAxLjIpO1xuXHRcdFx0Z3AuZW5kRmlsbCgpO1xuXHRcdH1cblxuXHRcdC8vIERyYXcgdGhlIHNrZWxldG9uIHN0YXJ0aW5nIHBvaW50IFwiWFwiIGZvcm1cblx0XHRjb25zdCBzdGFydERvdFNpemUgPSBsaW5lV2lkdGggKiAzO1xuXG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5za2VsZXRvblhZLm1vdmVUbyhza2VsZXRvblggLSBzdGFydERvdFNpemUsIHNrZWxldG9uWSAtIHN0YXJ0RG90U2l6ZSk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5za2VsZXRvblhZLmxpbmVUbyhza2VsZXRvblggKyBzdGFydERvdFNpemUsIHNrZWxldG9uWSArIHN0YXJ0RG90U2l6ZSk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5za2VsZXRvblhZLm1vdmVUbyhza2VsZXRvblggKyBzdGFydERvdFNpemUsIHNrZWxldG9uWSAtIHN0YXJ0RG90U2l6ZSk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5za2VsZXRvblhZLmxpbmVUbyhza2VsZXRvblggLSBzdGFydERvdFNpemUsIHNrZWxldG9uWSArIHN0YXJ0RG90U2l6ZSk7XG5cdH1cblxuXHRwcml2YXRlIGRyYXdSZWdpb25BdHRhY2htZW50c0Z1bmMgKHNwaW5lOiBTcGluZSwgZGVidWdEaXNwbGF5T2JqZWN0czogRGVidWdEaXNwbGF5T2JqZWN0cywgbGluZVdpZHRoOiBudW1iZXIpOiB2b2lkIHtcblx0XHRjb25zdCBza2VsZXRvbiA9IHNwaW5lLnNrZWxldG9uO1xuXHRcdGNvbnN0IHNsb3RzID0gc2tlbGV0b24uc2xvdHM7XG5cblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnJlZ2lvbkF0dGFjaG1lbnRzU2hhcGUubGluZVN0eWxlKGxpbmVXaWR0aCwgdGhpcy5yZWdpb25BdHRhY2htZW50c0NvbG9yLCAxKTtcblxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBzbG90cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0Y29uc3Qgc2xvdCA9IHNsb3RzW2ldO1xuXHRcdFx0Y29uc3QgYXR0YWNobWVudCA9IHNsb3QuZ2V0QXR0YWNobWVudCgpO1xuXG5cdFx0XHRpZiAoYXR0YWNobWVudCA9PSBudWxsIHx8ICEoYXR0YWNobWVudCBpbnN0YW5jZW9mIFJlZ2lvbkF0dGFjaG1lbnQpKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByZWdpb25BdHRhY2htZW50ID0gYXR0YWNobWVudDtcblxuXHRcdFx0Y29uc3QgdmVydGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KDgpO1xuXG5cdFx0XHRyZWdpb25BdHRhY2htZW50LmNvbXB1dGVXb3JsZFZlcnRpY2VzKHNsb3QsIHZlcnRpY2VzLCAwLCAyKTtcblx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMucmVnaW9uQXR0YWNobWVudHNTaGFwZS5kcmF3UG9seWdvbihBcnJheS5mcm9tKHZlcnRpY2VzLnNsaWNlKDAsIDgpKSk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBkcmF3TWVzaEh1bGxBbmRNZXNoVHJpYW5nbGVzIChzcGluZTogU3BpbmUsIGRlYnVnRGlzcGxheU9iamVjdHM6IERlYnVnRGlzcGxheU9iamVjdHMsIGxpbmVXaWR0aDogbnVtYmVyKTogdm9pZCB7XG5cdFx0Y29uc3Qgc2tlbGV0b24gPSBzcGluZS5za2VsZXRvbjtcblx0XHRjb25zdCBzbG90cyA9IHNrZWxldG9uLnNsb3RzO1xuXG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5tZXNoSHVsbExpbmUubGluZVN0eWxlKGxpbmVXaWR0aCwgdGhpcy5tZXNoSHVsbENvbG9yLCAxKTtcblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLm1lc2hUcmlhbmdsZXNMaW5lLmxpbmVTdHlsZShsaW5lV2lkdGgsIHRoaXMubWVzaFRyaWFuZ2xlc0NvbG9yLCAxKTtcblxuXHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBzbG90cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0Y29uc3Qgc2xvdCA9IHNsb3RzW2ldO1xuXG5cdFx0XHRpZiAoIXNsb3QuYm9uZS5hY3RpdmUpIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBhdHRhY2htZW50ID0gc2xvdC5nZXRBdHRhY2htZW50KCk7XG5cblx0XHRcdGlmIChhdHRhY2htZW50ID09IG51bGwgfHwgIShhdHRhY2htZW50IGluc3RhbmNlb2YgTWVzaEF0dGFjaG1lbnQpKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBtZXNoQXR0YWNobWVudCA9IGF0dGFjaG1lbnQ7XG5cblx0XHRcdGNvbnN0IHZlcnRpY2VzID0gbmV3IEZsb2F0MzJBcnJheShtZXNoQXR0YWNobWVudC53b3JsZFZlcnRpY2VzTGVuZ3RoKTtcblx0XHRcdGNvbnN0IHRyaWFuZ2xlcyA9IG1lc2hBdHRhY2htZW50LnRyaWFuZ2xlcztcblx0XHRcdGxldCBodWxsTGVuZ3RoID0gbWVzaEF0dGFjaG1lbnQuaHVsbExlbmd0aDtcblxuXHRcdFx0bWVzaEF0dGFjaG1lbnQuY29tcHV0ZVdvcmxkVmVydGljZXMoc2xvdCwgMCwgbWVzaEF0dGFjaG1lbnQud29ybGRWZXJ0aWNlc0xlbmd0aCwgdmVydGljZXMsIDAsIDIpO1xuXHRcdFx0Ly8gZHJhdyB0aGUgc2tpbm5lZCBtZXNoICh0cmlhbmdsZSlcblx0XHRcdGlmICh0aGlzLmRyYXdNZXNoVHJpYW5nbGVzKSB7XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSB0cmlhbmdsZXMubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDMpIHtcblx0XHRcdFx0XHRjb25zdCB2MSA9IHRyaWFuZ2xlc1tpXSAqIDI7XG5cdFx0XHRcdFx0Y29uc3QgdjIgPSB0cmlhbmdsZXNbaSArIDFdICogMjtcblx0XHRcdFx0XHRjb25zdCB2MyA9IHRyaWFuZ2xlc1tpICsgMl0gKiAyO1xuXG5cdFx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5tZXNoVHJpYW5nbGVzTGluZS5tb3ZlVG8odmVydGljZXNbdjFdLCB2ZXJ0aWNlc1t2MSArIDFdKTtcblx0XHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLm1lc2hUcmlhbmdsZXNMaW5lLmxpbmVUbyh2ZXJ0aWNlc1t2Ml0sIHZlcnRpY2VzW3YyICsgMV0pO1xuXHRcdFx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMubWVzaFRyaWFuZ2xlc0xpbmUubGluZVRvKHZlcnRpY2VzW3YzXSwgdmVydGljZXNbdjMgKyAxXSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gZHJhdyBza2luIGJvcmRlclxuXHRcdFx0aWYgKHRoaXMuZHJhd01lc2hIdWxsICYmIGh1bGxMZW5ndGggPiAwKSB7XG5cdFx0XHRcdGh1bGxMZW5ndGggPSAoaHVsbExlbmd0aCA+PiAxKSAqIDI7XG5cdFx0XHRcdGxldCBsYXN0WCA9IHZlcnRpY2VzW2h1bGxMZW5ndGggLSAyXTtcblx0XHRcdFx0bGV0IGxhc3RZID0gdmVydGljZXNbaHVsbExlbmd0aCAtIDFdO1xuXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBodWxsTGVuZ3RoOyBpIDwgbGVuOyBpICs9IDIpIHtcblx0XHRcdFx0XHRjb25zdCB4ID0gdmVydGljZXNbaV07XG5cdFx0XHRcdFx0Y29uc3QgeSA9IHZlcnRpY2VzW2kgKyAxXTtcblxuXHRcdFx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMubWVzaEh1bGxMaW5lLm1vdmVUbyh4LCB5KTtcblx0XHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLm1lc2hIdWxsTGluZS5saW5lVG8obGFzdFgsIGxhc3RZKTtcblx0XHRcdFx0XHRsYXN0WCA9IHg7XG5cdFx0XHRcdFx0bGFzdFkgPSB5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBkcmF3Q2xpcHBpbmdGdW5jIChzcGluZTogU3BpbmUsIGRlYnVnRGlzcGxheU9iamVjdHM6IERlYnVnRGlzcGxheU9iamVjdHMsIGxpbmVXaWR0aDogbnVtYmVyKTogdm9pZCB7XG5cdFx0Y29uc3Qgc2tlbGV0b24gPSBzcGluZS5za2VsZXRvbjtcblx0XHRjb25zdCBzbG90cyA9IHNrZWxldG9uLnNsb3RzO1xuXG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5jbGlwcGluZ1BvbHlnb24ubGluZVN0eWxlKGxpbmVXaWR0aCwgdGhpcy5jbGlwcGluZ1BvbHlnb25Db2xvciwgMSk7XG5cdFx0Zm9yIChsZXQgaSA9IDAsIGxlbiA9IHNsb3RzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0XHRjb25zdCBzbG90ID0gc2xvdHNbaV07XG5cblx0XHRcdGlmICghc2xvdC5ib25lLmFjdGl2ZSkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGF0dGFjaG1lbnQgPSBzbG90LmdldEF0dGFjaG1lbnQoKTtcblxuXHRcdFx0aWYgKGF0dGFjaG1lbnQgPT0gbnVsbCB8fCAhKGF0dGFjaG1lbnQgaW5zdGFuY2VvZiBDbGlwcGluZ0F0dGFjaG1lbnQpKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBjbGlwcGluZ0F0dGFjaG1lbnQgPSBhdHRhY2htZW50O1xuXG5cdFx0XHRjb25zdCBubiA9IGNsaXBwaW5nQXR0YWNobWVudC53b3JsZFZlcnRpY2VzTGVuZ3RoO1xuXHRcdFx0Y29uc3Qgd29ybGQgPSBuZXcgRmxvYXQzMkFycmF5KG5uKTtcblxuXHRcdFx0Y2xpcHBpbmdBdHRhY2htZW50LmNvbXB1dGVXb3JsZFZlcnRpY2VzKHNsb3QsIDAsIG5uLCB3b3JsZCwgMCwgMik7XG5cdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLmNsaXBwaW5nUG9seWdvbi5kcmF3UG9seWdvbihBcnJheS5mcm9tKHdvcmxkKSk7XG5cdFx0fVxuXHR9XG5cblx0cHJpdmF0ZSBkcmF3Qm91bmRpbmdCb3hlc0Z1bmMgKHNwaW5lOiBTcGluZSwgZGVidWdEaXNwbGF5T2JqZWN0czogRGVidWdEaXNwbGF5T2JqZWN0cywgbGluZVdpZHRoOiBudW1iZXIpOiB2b2lkIHtcblx0XHQvLyBkcmF3IHRoZSB0b3RhbCBvdXRsaW5lIG9mIHRoZSBib3VuZGluZyBib3hcblx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLmJvdW5kaW5nQm94ZXNSZWN0LmxpbmVTdHlsZShsaW5lV2lkdGgsIHRoaXMuYm91bmRpbmdCb3hlc1JlY3RDb2xvciwgNSk7XG5cblx0XHRjb25zdCBib3VuZHMgPSBuZXcgU2tlbGV0b25Cb3VuZHMoKTtcblxuXHRcdGJvdW5kcy51cGRhdGUoc3BpbmUuc2tlbGV0b24sIHRydWUpO1xuXHRcdGlmIChib3VuZHMubWluWCAhPT0gSW5maW5pdHkpIHtcblx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMuYm91bmRpbmdCb3hlc1JlY3QuZHJhd1JlY3QoYm91bmRzLm1pblgsIGJvdW5kcy5taW5ZLCBib3VuZHMuZ2V0V2lkdGgoKSwgYm91bmRzLmdldEhlaWdodCgpKTtcblx0XHR9XG5cdFx0Y29uc3QgcG9seWdvbnMgPSBib3VuZHMucG9seWdvbnM7XG5cdFx0Y29uc3QgZHJhd1BvbHlnb24gPSAocG9seWdvblZlcnRpY2VzOiBBcnJheUxpa2U8bnVtYmVyPiwgX29mZnNldDogdW5rbm93biwgY291bnQ6IG51bWJlcik6IHZvaWQgPT4ge1xuXHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzUG9seWdvbi5saW5lU3R5bGUobGluZVdpZHRoLCB0aGlzLmJvdW5kaW5nQm94ZXNQb2x5Z29uQ29sb3IsIDEpO1xuXHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzUG9seWdvbi5iZWdpbkZpbGwodGhpcy5ib3VuZGluZ0JveGVzUG9seWdvbkNvbG9yLCAwLjEpO1xuXG5cdFx0XHRpZiAoY291bnQgPCAzKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlBvbHlnb24gbXVzdCBjb250YWluIGF0IGxlYXN0IDMgdmVydGljZXNcIik7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBwYXRocyA9IFtdO1xuXHRcdFx0Y29uc3QgZG90U2l6ZSA9IGxpbmVXaWR0aCAqIDI7XG5cblx0XHRcdGZvciAobGV0IGkgPSAwLCBsZW4gPSBwb2x5Z29uVmVydGljZXMubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDIpIHtcblx0XHRcdFx0Y29uc3QgeDEgPSBwb2x5Z29uVmVydGljZXNbaV07XG5cdFx0XHRcdGNvbnN0IHkxID0gcG9seWdvblZlcnRpY2VzW2kgKyAxXTtcblxuXHRcdFx0XHQvLyBkcmF3IHRoZSBib3VuZGluZyBib3ggbm9kZVxuXHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLmJvdW5kaW5nQm94ZXNDaXJjbGUubGluZVN0eWxlKDApO1xuXHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLmJvdW5kaW5nQm94ZXNDaXJjbGUuYmVnaW5GaWxsKHRoaXMuYm91bmRpbmdCb3hlc0NpcmNsZUNvbG9yKTtcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzQ2lyY2xlLmRyYXdDaXJjbGUoeDEsIHkxLCBkb3RTaXplKTtcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5ib3VuZGluZ0JveGVzQ2lyY2xlLmVuZEZpbGwoKTtcblxuXHRcdFx0XHRwYXRocy5wdXNoKHgxLCB5MSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRyYXcgdGhlIGJvdW5kaW5nIGJveCBhcmVhXG5cdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLmJvdW5kaW5nQm94ZXNQb2x5Z29uLmRyYXdQb2x5Z29uKHBhdGhzKTtcblx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMuYm91bmRpbmdCb3hlc1BvbHlnb24uZW5kRmlsbCgpO1xuXHRcdH07XG5cblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gcG9seWdvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdGNvbnN0IHBvbHlnb24gPSBwb2x5Z29uc1tpXTtcblxuXHRcdFx0ZHJhd1BvbHlnb24ocG9seWdvbiwgMCwgcG9seWdvbi5sZW5ndGgpO1xuXHRcdH1cblx0fVxuXG5cdHByaXZhdGUgZHJhd1BhdGhzRnVuYyAoc3BpbmU6IFNwaW5lLCBkZWJ1Z0Rpc3BsYXlPYmplY3RzOiBEZWJ1Z0Rpc3BsYXlPYmplY3RzLCBsaW5lV2lkdGg6IG51bWJlcik6IHZvaWQge1xuXHRcdGNvbnN0IHNrZWxldG9uID0gc3BpbmUuc2tlbGV0b247XG5cdFx0Y29uc3Qgc2xvdHMgPSBza2VsZXRvbi5zbG90cztcblxuXHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGF0aHNDdXJ2ZS5saW5lU3R5bGUobGluZVdpZHRoLCB0aGlzLnBhdGhzQ3VydmVDb2xvciwgMSk7XG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0xpbmUubGluZVN0eWxlKGxpbmVXaWR0aCwgdGhpcy5wYXRoc0xpbmVDb2xvciwgMSk7XG5cblx0XHRmb3IgKGxldCBpID0gMCwgbGVuID0gc2xvdHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdGNvbnN0IHNsb3QgPSBzbG90c1tpXTtcblxuXHRcdFx0aWYgKCFzbG90LmJvbmUuYWN0aXZlKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgYXR0YWNobWVudCA9IHNsb3QuZ2V0QXR0YWNobWVudCgpO1xuXG5cdFx0XHRpZiAoYXR0YWNobWVudCA9PSBudWxsIHx8ICEoYXR0YWNobWVudCBpbnN0YW5jZW9mIFBhdGhBdHRhY2htZW50KSkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgcGF0aEF0dGFjaG1lbnQgPSBhdHRhY2htZW50O1xuXHRcdFx0bGV0IG5uID0gcGF0aEF0dGFjaG1lbnQud29ybGRWZXJ0aWNlc0xlbmd0aDtcblx0XHRcdGNvbnN0IHdvcmxkID0gbmV3IEZsb2F0MzJBcnJheShubik7XG5cblx0XHRcdHBhdGhBdHRhY2htZW50LmNvbXB1dGVXb3JsZFZlcnRpY2VzKHNsb3QsIDAsIG5uLCB3b3JsZCwgMCwgMik7XG5cdFx0XHRsZXQgeDEgPSB3b3JsZFsyXTtcblx0XHRcdGxldCB5MSA9IHdvcmxkWzNdO1xuXHRcdFx0bGV0IHgyID0gMDtcblx0XHRcdGxldCB5MiA9IDA7XG5cblx0XHRcdGlmIChwYXRoQXR0YWNobWVudC5jbG9zZWQpIHtcblx0XHRcdFx0Y29uc3QgY3gxID0gd29ybGRbMF07XG5cdFx0XHRcdGNvbnN0IGN5MSA9IHdvcmxkWzFdO1xuXHRcdFx0XHRjb25zdCBjeDIgPSB3b3JsZFtubiAtIDJdO1xuXHRcdFx0XHRjb25zdCBjeTIgPSB3b3JsZFtubiAtIDFdO1xuXG5cdFx0XHRcdHgyID0gd29ybGRbbm4gLSA0XTtcblx0XHRcdFx0eTIgPSB3b3JsZFtubiAtIDNdO1xuXG5cdFx0XHRcdC8vIGN1cnZlXG5cdFx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGF0aHNDdXJ2ZS5tb3ZlVG8oeDEsIHkxKTtcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0N1cnZlLmJlemllckN1cnZlVG8oY3gxLCBjeTEsIGN4MiwgY3kyLCB4MiwgeTIpO1xuXG5cdFx0XHRcdC8vIGhhbmRsZVxuXHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzTGluZS5tb3ZlVG8oeDEsIHkxKTtcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0xpbmUubGluZVRvKGN4MSwgY3kxKTtcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0xpbmUubW92ZVRvKHgyLCB5Mik7XG5cdFx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGF0aHNMaW5lLmxpbmVUbyhjeDIsIGN5Mik7XG5cdFx0XHR9XG5cdFx0XHRubiAtPSA0O1xuXHRcdFx0Zm9yIChsZXQgaWkgPSA0OyBpaSA8IG5uOyBpaSArPSA2KSB7XG5cdFx0XHRcdGNvbnN0IGN4MSA9IHdvcmxkW2lpXTtcblx0XHRcdFx0Y29uc3QgY3kxID0gd29ybGRbaWkgKyAxXTtcblx0XHRcdFx0Y29uc3QgY3gyID0gd29ybGRbaWkgKyAyXTtcblx0XHRcdFx0Y29uc3QgY3kyID0gd29ybGRbaWkgKyAzXTtcblxuXHRcdFx0XHR4MiA9IHdvcmxkW2lpICsgNF07XG5cdFx0XHRcdHkyID0gd29ybGRbaWkgKyA1XTtcblx0XHRcdFx0Ly8gY3VydmVcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0N1cnZlLm1vdmVUbyh4MSwgeTEpO1xuXHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzQ3VydmUuYmV6aWVyQ3VydmVUbyhjeDEsIGN5MSwgY3gyLCBjeTIsIHgyLCB5Mik7XG5cblx0XHRcdFx0Ly8gaGFuZGxlXG5cdFx0XHRcdGRlYnVnRGlzcGxheU9iamVjdHMucGF0aHNMaW5lLm1vdmVUbyh4MSwgeTEpO1xuXHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzTGluZS5saW5lVG8oY3gxLCBjeTEpO1xuXHRcdFx0XHRkZWJ1Z0Rpc3BsYXlPYmplY3RzLnBhdGhzTGluZS5tb3ZlVG8oeDIsIHkyKTtcblx0XHRcdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXRoc0xpbmUubGluZVRvKGN4MiwgY3kyKTtcblx0XHRcdFx0eDEgPSB4Mjtcblx0XHRcdFx0eTEgPSB5Mjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRwdWJsaWMgdW5yZWdpc3RlclNwaW5lIChzcGluZTogU3BpbmUpOiB2b2lkIHtcblx0XHRpZiAoIXRoaXMucmVnaXN0ZXJlZFNwaW5lcy5oYXMoc3BpbmUpKSB7XG5cdFx0XHRjb25zb2xlLndhcm4oXCJTcGluZURlYnVnUmVuZGVyZXIudW5yZWdpc3RlclNwaW5lKCkgLSBzcGluZSBpcyBub3QgcmVnaXN0ZXJlZCwgY2FuJ3QgdW5yZWdpc3RlciFcIiwgc3BpbmUpO1xuXHRcdH1cblx0XHRjb25zdCBkZWJ1Z0Rpc3BsYXlPYmplY3RzID0gdGhpcy5yZWdpc3RlcmVkU3BpbmVzLmdldChzcGluZSk7XG5cblx0XHRpZiAoIWRlYnVnRGlzcGxheU9iamVjdHMpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzcGluZS5zdGF0ZS5yZW1vdmVMaXN0ZW5lcihkZWJ1Z0Rpc3BsYXlPYmplY3RzLmV2ZW50Q2FsbGJhY2spO1xuXG5cdFx0ZGVidWdEaXNwbGF5T2JqZWN0cy5wYXJlbnREZWJ1Z0NvbnRhaW5lci5kZXN0cm95KHsgYmFzZVRleHR1cmU6IHRydWUsIGNoaWxkcmVuOiB0cnVlLCB0ZXh0dXJlOiB0cnVlIH0pO1xuXHRcdHRoaXMucmVnaXN0ZXJlZFNwaW5lcy5kZWxldGUoc3BpbmUpO1xuXHR9XG59XG4iXX0=