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
import * as THREE from "three";
import { AnimationState, Color, Skeleton, SkeletonData, Vector2 } from "@esotericsoftware/spine-core";
import { MaterialWithMap } from "./MeshBatcher.js";
type SkeletonMeshMaterialParametersCustomizer = (materialParameters: THREE.MaterialParameters) => void;
type SkeletonMeshConfiguration = {
    /** The skeleton data object loaded by using {@link SkeletonJson} or {@link SkeletonBinary} */
    skeletonData: SkeletonData;
    /** Set it to true to enable tint black rendering */
    twoColorTint?: boolean;
    /**
     * The function used to create the materials for the meshes composing this Object3D.
     * The material used must have the `map` property.
     * By default a MeshStandardMaterial is used, so no light and shadows are available.
     * Use a MeshStandardMaterial
     *
     * @param parameters The default parameters with which this function is invoked.
     * You should pass this parameters, once personalized, to the costructor of the material you want to use.
     * Default values are defined in {@link SkeletonMesh.DEFAULT_MATERIAL_PARAMETERS}.
     *
     * @returns An instance of the material you want to be used for the meshes of this Object3D. The material must have the `map` property.
     */
    materialFactory?: (parameters: THREE.MaterialParameters) => MaterialWithMap;
};
export declare class SkeletonMesh extends THREE.Object3D {
    static readonly DEFAULT_MATERIAL_PARAMETERS: THREE.MaterialParameters;
    tempPos: Vector2;
    tempUv: Vector2;
    tempLight: Color;
    tempDark: Color;
    skeleton: Skeleton;
    state: AnimationState;
    zOffset: number;
    private batches;
    private materialFactory;
    private nextBatchIndex;
    private clipper;
    static QUAD_TRIANGLES: number[];
    static VERTEX_SIZE: number;
    private vertexSize;
    private twoColorTint;
    private vertices;
    private tempColor;
    private tempDarkColor;
    private _castShadow;
    private _receiveShadow;
    /**
     * Create an Object3D containing meshes representing your Spine animation.
     * Personalize your material providing a {@link SkeletonMeshConfiguration}
     * @param skeletonData
     */
    constructor(configuration: SkeletonMeshConfiguration);
    /**
     * @deprecated This signature is deprecated, please use the one with a single {@link SkeletonMeshConfiguration} parameter
     */
    constructor(skeletonData: SkeletonData, materialCustomizer: SkeletonMeshMaterialParametersCustomizer);
    update(deltaTime: number): void;
    dispose(): void;
    private clearBatches;
    private nextBatch;
    private updateGeometry;
}
export {};
