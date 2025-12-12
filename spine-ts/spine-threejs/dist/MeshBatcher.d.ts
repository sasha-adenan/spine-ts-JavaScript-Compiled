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
import { BlendMode } from "@esotericsoftware/spine-core";
import * as THREE from "three";
export type MaterialWithMap = THREE.Material & {
    map: THREE.Texture | null;
};
export declare class MeshBatcher extends THREE.Mesh {
    private materialFactory;
    private twoColorTint;
    static MAX_VERTICES: number;
    private vertexSize;
    private vertexBuffer;
    private vertices;
    private verticesLength;
    private indices;
    private indicesLength;
    private materialGroups;
    constructor(maxVertices: number | undefined, materialFactory: (parameters: THREE.MaterialParameters) => MaterialWithMap, twoColorTint?: boolean);
    dispose(): void;
    clear(): this;
    begin(): void;
    canBatch(numVertices: number, numIndices: number): boolean;
    batch(vertices: ArrayLike<number>, verticesLength: number, indices: ArrayLike<number>, indicesLength: number, z?: number): void;
    end(): void;
    addMaterialGroup(indicesLength: number, materialGroup: number): void;
    private closeMaterialGroups;
    findMaterialGroup(slotTexture: THREE.Texture, slotBlendMode: BlendMode): number;
    private newMaterial;
}
export declare class SkeletonMeshMaterial extends THREE.ShaderMaterial {
    get map(): THREE.Texture | null;
    set map(value: THREE.Texture | null);
    constructor(parameters: THREE.ShaderMaterialParameters);
}
