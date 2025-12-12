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
import type { ColorSource } from "@pixi/core";
import { Shader, TextureMatrix, Texture } from "@pixi/core";
export interface IDarkTintMaterialOptions {
    alpha?: number;
    tint?: ColorSource;
    darkTint?: ColorSource;
    pluginName?: string;
    uniforms?: Record<string, unknown>;
}
export declare class DarkTintMaterial extends Shader {
    readonly uvMatrix: TextureMatrix;
    batchable: boolean;
    pluginName: string;
    _tintRGB: number;
    _darkTintRGB: number;
    /**
     * Only do update if tint or alpha changes.
     * @private
     * @default false
     */
    private _colorDirty;
    private _alpha;
    private _tintColor;
    private _darkTintColor;
    constructor(texture?: Texture);
    get texture(): Texture;
    set texture(value: Texture);
    set alpha(value: number);
    get alpha(): number;
    set tint(value: ColorSource);
    get tint(): ColorSource;
    set darkTint(value: ColorSource);
    get darkTint(): ColorSource;
    get tintValue(): number;
    get darkTintValue(): number;
    /** Gets called automatically by the Mesh. Intended to be overridden for custom {@link PIXI.MeshMaterial} objects. */
    update(): void;
}
