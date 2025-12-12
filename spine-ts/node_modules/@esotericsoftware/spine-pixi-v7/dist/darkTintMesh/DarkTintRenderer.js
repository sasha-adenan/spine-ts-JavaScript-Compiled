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
import { DarkTintBatchGeometry } from "./DarkTintBatchGeom.js";
import { extensions, BatchRenderer, ExtensionType, BatchShaderGenerator, Color } from "@pixi/core";
const vertex = `
precision highp float;
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aColor;
attribute vec4 aDarkColor;
attribute float aTextureId;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying vec2 vTextureCoord;
varying vec4 vColor;
varying vec4 vDarkColor;
varying float vTextureId;

void main(void){
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = aTextureCoord;
    vTextureId = aTextureId;
    vColor = aColor * tint;
    vDarkColor = aDarkColor * tint;

}
`;
const fragment = `
varying vec2 vTextureCoord;
varying vec4 vColor;
varying vec4 vDarkColor;
varying float vTextureId;
uniform sampler2D uSamplers[%count%];

void main(void){
    vec4 color;
    %forloop%


    gl_FragColor.a = color.a * vColor.a;
    gl_FragColor.rgb = ((color.a - 1.0) * vDarkColor.a + 1.0 - color.rgb) * vDarkColor.rgb + color.rgb * vColor.rgb;
}
`;
export class DarkTintRenderer extends BatchRenderer {
    static extension = {
        name: "darkTintBatch",
        type: ExtensionType.RendererPlugin,
    };
    constructor(renderer) {
        super(renderer);
        this.shaderGenerator = new BatchShaderGenerator(vertex, fragment);
        this.geometryClass = DarkTintBatchGeometry;
        // Pixi's default 6 + 1 for uDarkTint. (this is size in _floats_. color is 4 bytes which roughly equals one float :P )
        this.vertexSize = 7;
    }
    packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex) {
        const { uint32View, float32View } = attributeBuffer;
        const packedVertices = aIndex / this.vertexSize;
        const uvs = element.uvs;
        const indicies = element.indices;
        const vertexData = element.vertexData;
        const textureId = element._texture.baseTexture._batchLocation;
        const worldAlpha = Math.min(element.worldAlpha, 1.0);
        const argb = Color.shared.setValue(element._tintRGB).toPremultiplied(worldAlpha, true);
        const darkargb = Color.shared.setValue(element._darkTintRGB).premultiply(worldAlpha, true).toPremultiplied(1, false);
        // lets not worry about tint! for now..
        for (let i = 0; i < vertexData.length; i += 2) {
            float32View[aIndex++] = vertexData[i];
            float32View[aIndex++] = vertexData[i + 1];
            float32View[aIndex++] = uvs[i];
            float32View[aIndex++] = uvs[i + 1];
            uint32View[aIndex++] = argb;
            uint32View[aIndex++] = darkargb;
            float32View[aIndex++] = textureId;
        }
        for (let i = 0; i < indicies.length; i++) {
            indexBuffer[iIndex++] = packedVertices + indicies[i];
        }
    }
}
extensions.add(DarkTintRenderer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGFya1RpbnRSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kYXJrVGludE1lc2gvRGFya1RpbnRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFHL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVuRyxNQUFNLE1BQU0sR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0EwQmQsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Q0FlaEIsQ0FBQztBQUVGLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxhQUFhO0lBQzNDLE1BQU0sQ0FBVSxTQUFTLEdBQXNCO1FBQ3JELElBQUksRUFBRSxlQUFlO1FBQ3JCLElBQUksRUFBRSxhQUFhLENBQUMsY0FBYztLQUNsQyxDQUFDO0lBRUYsWUFBWSxRQUFrQjtRQUM3QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsYUFBYSxHQUFHLHFCQUFxQixDQUFDO1FBQzNDLHNIQUFzSDtRQUN0SCxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztJQUNyQixDQUFDO0lBRWUsdUJBQXVCLENBQUMsT0FBeUIsRUFBRSxlQUErQixFQUFFLFdBQXdCLEVBQUUsTUFBYyxFQUFFLE1BQWM7UUFDM0osTUFBTSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsR0FBRyxlQUFlLENBQUM7UUFDcEQsTUFBTSxjQUFjLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDaEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN4QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQ2pDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDO1FBQzlELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXJILHVDQUF1QztRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0MsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQzVCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQztZQUNoQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUM7UUFDbkMsQ0FBQztRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsY0FBYyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDO0lBQ0YsQ0FBQzs7QUFHRixVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBTcGluZSBSdW50aW1lcyBMaWNlbnNlIEFncmVlbWVudFxuICogTGFzdCB1cGRhdGVkIEFwcmlsIDUsIDIwMjUuIFJlcGxhY2VzIGFsbCBwcmlvciB2ZXJzaW9ucy5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAyNSwgRXNvdGVyaWMgU29mdHdhcmUgTExDXG4gKlxuICogSW50ZWdyYXRpb24gb2YgdGhlIFNwaW5lIFJ1bnRpbWVzIGludG8gc29mdHdhcmUgb3Igb3RoZXJ3aXNlIGNyZWF0aW5nXG4gKiBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyBpcyBwZXJtaXR0ZWQgdW5kZXIgdGhlIHRlcm1zIGFuZFxuICogY29uZGl0aW9ucyBvZiBTZWN0aW9uIDIgb2YgdGhlIFNwaW5lIEVkaXRvciBMaWNlbnNlIEFncmVlbWVudDpcbiAqIGh0dHA6Ly9lc290ZXJpY3NvZnR3YXJlLmNvbS9zcGluZS1lZGl0b3ItbGljZW5zZVxuICpcbiAqIE90aGVyd2lzZSwgaXQgaXMgcGVybWl0dGVkIHRvIGludGVncmF0ZSB0aGUgU3BpbmUgUnVudGltZXMgaW50byBzb2Z0d2FyZVxuICogb3Igb3RoZXJ3aXNlIGNyZWF0ZSBkZXJpdmF0aXZlIHdvcmtzIG9mIHRoZSBTcGluZSBSdW50aW1lcyAoY29sbGVjdGl2ZWx5LFxuICogXCJQcm9kdWN0c1wiKSwgcHJvdmlkZWQgdGhhdCBlYWNoIHVzZXIgb2YgdGhlIFByb2R1Y3RzIG11c3Qgb2J0YWluIHRoZWlyIG93blxuICogU3BpbmUgRWRpdG9yIGxpY2Vuc2UgYW5kIHJlZGlzdHJpYnV0aW9uIG9mIHRoZSBQcm9kdWN0cyBpbiBhbnkgZm9ybSBtdXN0XG4gKiBpbmNsdWRlIHRoaXMgbGljZW5zZSBhbmQgY29weXJpZ2h0IG5vdGljZS5cbiAqXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMgQVJFIFBST1ZJREVEIEJZIEVTT1RFUklDIFNPRlRXQVJFIExMQyBcIkFTIElTXCIgQU5EIEFOWVxuICogRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRFxuICogV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRVxuICogRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgRVNPVEVSSUMgU09GVFdBUkUgTExDIEJFIExJQUJMRSBGT1IgQU5ZXG4gKiBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICogKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTLFxuICogQlVTSU5FU1MgSU5URVJSVVBUSU9OLCBPUiBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUykgSE9XRVZFUiBDQVVTRUQgQU5EXG4gKiBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICogKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gKiBUSEUgU1BJTkUgUlVOVElNRVMsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB0eXBlIHsgSURhcmtUaW50RWxlbWVudCB9IGZyb20gXCIuL0RhcmtUaW50TWVzaC5qc1wiO1xuaW1wb3J0IHsgRGFya1RpbnRCYXRjaEdlb21ldHJ5IH0gZnJvbSBcIi4vRGFya1RpbnRCYXRjaEdlb20uanNcIjtcbmltcG9ydCB0eXBlIHsgRXh0ZW5zaW9uTWV0YWRhdGEsIFJlbmRlcmVyLCBWaWV3YWJsZUJ1ZmZlciB9IGZyb20gXCJAcGl4aS9jb3JlXCI7XG5pbXBvcnQgeyBleHRlbnNpb25zLCBCYXRjaFJlbmRlcmVyLCBFeHRlbnNpb25UeXBlLCBCYXRjaFNoYWRlckdlbmVyYXRvciwgQ29sb3IgfSBmcm9tIFwiQHBpeGkvY29yZVwiO1xuXG5jb25zdCB2ZXJ0ZXggPSBgXG5wcmVjaXNpb24gaGlnaHAgZmxvYXQ7XG5hdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XG5hdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1xuYXR0cmlidXRlIHZlYzQgYUNvbG9yO1xuYXR0cmlidXRlIHZlYzQgYURhcmtDb2xvcjtcbmF0dHJpYnV0ZSBmbG9hdCBhVGV4dHVyZUlkO1xuXG51bmlmb3JtIG1hdDMgcHJvamVjdGlvbk1hdHJpeDtcbnVuaWZvcm0gbWF0MyB0cmFuc2xhdGlvbk1hdHJpeDtcbnVuaWZvcm0gdmVjNCB0aW50O1xuXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcbnZhcnlpbmcgdmVjNCB2Q29sb3I7XG52YXJ5aW5nIHZlYzQgdkRhcmtDb2xvcjtcbnZhcnlpbmcgZmxvYXQgdlRleHR1cmVJZDtcblxudm9pZCBtYWluKHZvaWQpe1xuICAgIGdsX1Bvc2l0aW9uID0gdmVjNCgocHJvamVjdGlvbk1hdHJpeCAqIHRyYW5zbGF0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24sIDEuMCkpLnh5LCAwLjAsIDEuMCk7XG5cbiAgICB2VGV4dHVyZUNvb3JkID0gYVRleHR1cmVDb29yZDtcbiAgICB2VGV4dHVyZUlkID0gYVRleHR1cmVJZDtcbiAgICB2Q29sb3IgPSBhQ29sb3IgKiB0aW50O1xuICAgIHZEYXJrQ29sb3IgPSBhRGFya0NvbG9yICogdGludDtcblxufVxuYDtcblxuY29uc3QgZnJhZ21lbnQgPSBgXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcbnZhcnlpbmcgdmVjNCB2Q29sb3I7XG52YXJ5aW5nIHZlYzQgdkRhcmtDb2xvcjtcbnZhcnlpbmcgZmxvYXQgdlRleHR1cmVJZDtcbnVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyc1slY291bnQlXTtcblxudm9pZCBtYWluKHZvaWQpe1xuICAgIHZlYzQgY29sb3I7XG4gICAgJWZvcmxvb3AlXG5cblxuICAgIGdsX0ZyYWdDb2xvci5hID0gY29sb3IuYSAqIHZDb2xvci5hO1xuICAgIGdsX0ZyYWdDb2xvci5yZ2IgPSAoKGNvbG9yLmEgLSAxLjApICogdkRhcmtDb2xvci5hICsgMS4wIC0gY29sb3IucmdiKSAqIHZEYXJrQ29sb3IucmdiICsgY29sb3IucmdiICogdkNvbG9yLnJnYjtcbn1cbmA7XG5cbmV4cG9ydCBjbGFzcyBEYXJrVGludFJlbmRlcmVyIGV4dGVuZHMgQmF0Y2hSZW5kZXJlciB7XG5cdHB1YmxpYyBzdGF0aWMgb3ZlcnJpZGUgZXh0ZW5zaW9uOiBFeHRlbnNpb25NZXRhZGF0YSA9IHtcblx0XHRuYW1lOiBcImRhcmtUaW50QmF0Y2hcIixcblx0XHR0eXBlOiBFeHRlbnNpb25UeXBlLlJlbmRlcmVyUGx1Z2luLFxuXHR9O1xuXG5cdGNvbnN0cnVjdG9yKHJlbmRlcmVyOiBSZW5kZXJlcikge1xuXHRcdHN1cGVyKHJlbmRlcmVyKTtcblx0XHR0aGlzLnNoYWRlckdlbmVyYXRvciA9IG5ldyBCYXRjaFNoYWRlckdlbmVyYXRvcih2ZXJ0ZXgsIGZyYWdtZW50KTtcblx0XHR0aGlzLmdlb21ldHJ5Q2xhc3MgPSBEYXJrVGludEJhdGNoR2VvbWV0cnk7XG5cdFx0Ly8gUGl4aSdzIGRlZmF1bHQgNiArIDEgZm9yIHVEYXJrVGludC4gKHRoaXMgaXMgc2l6ZSBpbiBfZmxvYXRzXy4gY29sb3IgaXMgNCBieXRlcyB3aGljaCByb3VnaGx5IGVxdWFscyBvbmUgZmxvYXQgOlAgKVxuXHRcdHRoaXMudmVydGV4U2l6ZSA9IDc7XG5cdH1cblxuXHRwdWJsaWMgb3ZlcnJpZGUgcGFja0ludGVybGVhdmVkR2VvbWV0cnkoZWxlbWVudDogSURhcmtUaW50RWxlbWVudCwgYXR0cmlidXRlQnVmZmVyOiBWaWV3YWJsZUJ1ZmZlciwgaW5kZXhCdWZmZXI6IFVpbnQxNkFycmF5LCBhSW5kZXg6IG51bWJlciwgaUluZGV4OiBudW1iZXIpOiB2b2lkIHtcblx0XHRjb25zdCB7IHVpbnQzMlZpZXcsIGZsb2F0MzJWaWV3IH0gPSBhdHRyaWJ1dGVCdWZmZXI7XG5cdFx0Y29uc3QgcGFja2VkVmVydGljZXMgPSBhSW5kZXggLyB0aGlzLnZlcnRleFNpemU7XG5cdFx0Y29uc3QgdXZzID0gZWxlbWVudC51dnM7XG5cdFx0Y29uc3QgaW5kaWNpZXMgPSBlbGVtZW50LmluZGljZXM7XG5cdFx0Y29uc3QgdmVydGV4RGF0YSA9IGVsZW1lbnQudmVydGV4RGF0YTtcblx0XHRjb25zdCB0ZXh0dXJlSWQgPSBlbGVtZW50Ll90ZXh0dXJlLmJhc2VUZXh0dXJlLl9iYXRjaExvY2F0aW9uO1xuXHRcdGNvbnN0IHdvcmxkQWxwaGEgPSBNYXRoLm1pbihlbGVtZW50LndvcmxkQWxwaGEsIDEuMCk7XG5cdFx0Y29uc3QgYXJnYiA9IENvbG9yLnNoYXJlZC5zZXRWYWx1ZShlbGVtZW50Ll90aW50UkdCKS50b1ByZW11bHRpcGxpZWQod29ybGRBbHBoYSwgdHJ1ZSk7XG5cdFx0Y29uc3QgZGFya2FyZ2IgPSBDb2xvci5zaGFyZWQuc2V0VmFsdWUoZWxlbWVudC5fZGFya1RpbnRSR0IpLnByZW11bHRpcGx5KHdvcmxkQWxwaGEsIHRydWUpLnRvUHJlbXVsdGlwbGllZCgxLCBmYWxzZSk7XG5cblx0XHQvLyBsZXRzIG5vdCB3b3JyeSBhYm91dCB0aW50ISBmb3Igbm93Li5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRleERhdGEubGVuZ3RoOyBpICs9IDIpIHtcblx0XHRcdGZsb2F0MzJWaWV3W2FJbmRleCsrXSA9IHZlcnRleERhdGFbaV07XG5cdFx0XHRmbG9hdDMyVmlld1thSW5kZXgrK10gPSB2ZXJ0ZXhEYXRhW2kgKyAxXTtcblx0XHRcdGZsb2F0MzJWaWV3W2FJbmRleCsrXSA9IHV2c1tpXTtcblx0XHRcdGZsb2F0MzJWaWV3W2FJbmRleCsrXSA9IHV2c1tpICsgMV07XG5cdFx0XHR1aW50MzJWaWV3W2FJbmRleCsrXSA9IGFyZ2I7XG5cdFx0XHR1aW50MzJWaWV3W2FJbmRleCsrXSA9IGRhcmthcmdiO1xuXHRcdFx0ZmxvYXQzMlZpZXdbYUluZGV4KytdID0gdGV4dHVyZUlkO1xuXHRcdH1cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGluZGljaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpbmRleEJ1ZmZlcltpSW5kZXgrK10gPSBwYWNrZWRWZXJ0aWNlcyArIGluZGljaWVzW2ldO1xuXHRcdH1cblx0fVxufVxuXG5leHRlbnNpb25zLmFkZChEYXJrVGludFJlbmRlcmVyKTtcbiJdfQ==