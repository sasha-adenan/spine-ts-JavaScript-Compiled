/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated September 24, 2021. Replaces all prior versions.
 *
 * Copyright (c) 2013-2021, Esoteric Software LLC
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
export * from './require-shim.js';
export * from './Spine.js';
export * from './SpineDebugRenderer.js';
export * from './SpineTexture.js';
export * from './SlotMesh.js';
export * from './DarkSlotMesh.js';
export * from './assets/atlasLoader.js';
export * from './assets/skeletonLoader.js';
export * from './darkTintMesh/DarkTintBatchGeom.js';
export * from './darkTintMesh/DarkTintGeom.js';
export * from './darkTintMesh/DarkTintMaterial.js';
export * from './darkTintMesh/DarkTintMesh.js';
export * from './darkTintMesh/DarkTintRenderer.js';
export * from "@esotericsoftware/spine-core";
import './assets/atlasLoader.js'; // Side effects install the loaders into pixi
import './assets/skeletonLoader.js'; // Side effects install the loaders into pixi
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRS9FLGNBQWMsbUJBQW1CLENBQUM7QUFDbEMsY0FBYyxZQUFZLENBQUM7QUFDM0IsY0FBYyx5QkFBeUIsQ0FBQztBQUN4QyxjQUFjLG1CQUFtQixDQUFDO0FBQ2xDLGNBQWMsZUFBZSxDQUFDO0FBQzlCLGNBQWMsbUJBQW1CLENBQUM7QUFDbEMsY0FBYyx5QkFBeUIsQ0FBQztBQUN4QyxjQUFjLDRCQUE0QixDQUFDO0FBQzNDLGNBQWMscUNBQXFDLENBQUM7QUFDcEQsY0FBYyxnQ0FBZ0MsQ0FBQztBQUMvQyxjQUFjLG9DQUFvQyxDQUFDO0FBQ25ELGNBQWMsZ0NBQWdDLENBQUM7QUFDL0MsY0FBYyxvQ0FBb0MsQ0FBQztBQUNuRCxjQUFjLDhCQUE4QixDQUFDO0FBRzdDLE9BQU8seUJBQXlCLENBQUMsQ0FBQyw2Q0FBNkM7QUFDL0UsT0FBTyw0QkFBNEIsQ0FBQyxDQUFDLDZDQUE2QyIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIFNwaW5lIFJ1bnRpbWVzIExpY2Vuc2UgQWdyZWVtZW50XG4gKiBMYXN0IHVwZGF0ZWQgU2VwdGVtYmVyIDI0LCAyMDIxLiBSZXBsYWNlcyBhbGwgcHJpb3IgdmVyc2lvbnMuXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEzLTIwMjEsIEVzb3RlcmljIFNvZnR3YXJlIExMQ1xuICpcbiAqIEludGVncmF0aW9uIG9mIHRoZSBTcGluZSBSdW50aW1lcyBpbnRvIHNvZnR3YXJlIG9yIG90aGVyd2lzZSBjcmVhdGluZ1xuICogZGVyaXZhdGl2ZSB3b3JrcyBvZiB0aGUgU3BpbmUgUnVudGltZXMgaXMgcGVybWl0dGVkIHVuZGVyIHRoZSB0ZXJtcyBhbmRcbiAqIGNvbmRpdGlvbnMgb2YgU2VjdGlvbiAyIG9mIHRoZSBTcGluZSBFZGl0b3IgTGljZW5zZSBBZ3JlZW1lbnQ6XG4gKiBodHRwOi8vZXNvdGVyaWNzb2Z0d2FyZS5jb20vc3BpbmUtZWRpdG9yLWxpY2Vuc2VcbiAqXG4gKiBPdGhlcndpc2UsIGl0IGlzIHBlcm1pdHRlZCB0byBpbnRlZ3JhdGUgdGhlIFNwaW5lIFJ1bnRpbWVzIGludG8gc29mdHdhcmVcbiAqIG9yIG90aGVyd2lzZSBjcmVhdGUgZGVyaXZhdGl2ZSB3b3JrcyBvZiB0aGUgU3BpbmUgUnVudGltZXMgKGNvbGxlY3RpdmVseSxcbiAqIFwiUHJvZHVjdHNcIiksIHByb3ZpZGVkIHRoYXQgZWFjaCB1c2VyIG9mIHRoZSBQcm9kdWN0cyBtdXN0IG9idGFpbiB0aGVpciBvd25cbiAqIFNwaW5lIEVkaXRvciBsaWNlbnNlIGFuZCByZWRpc3RyaWJ1dGlvbiBvZiB0aGUgUHJvZHVjdHMgaW4gYW55IGZvcm0gbXVzdFxuICogaW5jbHVkZSB0aGlzIGxpY2Vuc2UgYW5kIGNvcHlyaWdodCBub3RpY2UuXG4gKlxuICogVEhFIFNQSU5FIFJVTlRJTUVTIEFSRSBQUk9WSURFRCBCWSBFU09URVJJQyBTT0ZUV0FSRSBMTEMgXCJBUyBJU1wiIEFORCBBTllcbiAqIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRURcbiAqIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBUkVcbiAqIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIEVTT1RFUklDIFNPRlRXQVJFIExMQyBCRSBMSUFCTEUgRk9SIEFOWVxuICogRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAqIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUyxcbiAqIEJVU0lORVNTIElOVEVSUlVQVElPTiwgT1IgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFMpIEhPV0VWRVIgQ0FVU0VEIEFORFxuICogT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAqIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICogVEhFIFNQSU5FIFJVTlRJTUVTLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5leHBvcnQgKiBmcm9tICcuL3JlcXVpcmUtc2hpbS5qcyc7XG5leHBvcnQgKiBmcm9tICcuL1NwaW5lLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vU3BpbmVEZWJ1Z1JlbmRlcmVyLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vU3BpbmVUZXh0dXJlLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vU2xvdE1lc2guanMnO1xuZXhwb3J0ICogZnJvbSAnLi9EYXJrU2xvdE1lc2guanMnO1xuZXhwb3J0ICogZnJvbSAnLi9hc3NldHMvYXRsYXNMb2FkZXIuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9hc3NldHMvc2tlbGV0b25Mb2FkZXIuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9kYXJrVGludE1lc2gvRGFya1RpbnRCYXRjaEdlb20uanMnO1xuZXhwb3J0ICogZnJvbSAnLi9kYXJrVGludE1lc2gvRGFya1RpbnRHZW9tLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vZGFya1RpbnRNZXNoL0RhcmtUaW50TWF0ZXJpYWwuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9kYXJrVGludE1lc2gvRGFya1RpbnRNZXNoLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vZGFya1RpbnRNZXNoL0RhcmtUaW50UmVuZGVyZXIuanMnO1xuZXhwb3J0ICogZnJvbSBcIkBlc290ZXJpY3NvZnR3YXJlL3NwaW5lLWNvcmVcIjtcblxuXG5pbXBvcnQgJy4vYXNzZXRzL2F0bGFzTG9hZGVyLmpzJzsgLy8gU2lkZSBlZmZlY3RzIGluc3RhbGwgdGhlIGxvYWRlcnMgaW50byBwaXhpXG5pbXBvcnQgJy4vYXNzZXRzL3NrZWxldG9uTG9hZGVyLmpzJzsgLy8gU2lkZSBlZmZlY3RzIGluc3RhbGwgdGhlIGxvYWRlcnMgaW50byBwaXhpXG4iXX0=