document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const gridSize = 60;
    let activeBlock = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Palette interaction state
    let paletteInteractState = null; // 'pending', 'scrolling', 'dragging', null
    let interactStartX = 0;
    let interactStartY = 0;
    let activePaletteBlock = null;
    let paletteScrollStart = 0;

    const palette = document.getElementById('palette');

    // Handle initial pointer down on palette blocks to create clones
    document.querySelectorAll('.palette-block').forEach(block => {
        block.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary) return;
            
            paletteInteractState = 'pending';
            interactStartX = e.clientX;
            interactStartY = e.clientY;
            activePaletteBlock = block;
            paletteScrollStart = palette.scrollLeft;
            
            block.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        
        block.addEventListener('pointermove', (e) => {
            if (!e.isPrimary || !activePaletteBlock || activePaletteBlock !== block) return;
            
            if (paletteInteractState === 'pending') {
                const dx = e.clientX - interactStartX;
                const dy = e.clientY - interactStartY;
                
                // If moving UP by at least 8 pixels, prioritize dragging out a block
                if (dy < -8) {
                    paletteInteractState = 'dragging';
                    
                    // Create clone
                    const clone = activePaletteBlock.cloneNode(true);
                    clone.classList.remove('palette-block');
                    
                    const rect = activePaletteBlock.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();
                    
                    let startX = rect.left - canvasRect.left;
                    let startY = rect.top - canvasRect.top;
                    
                    clone.style.left = `${startX}px`;
                    clone.style.top = `${startY}px`;
                    
                    canvas.appendChild(clone);
                    
                    activePaletteBlock.releasePointerCapture(e.pointerId);
                    
                    startDrag(clone, interactStartX, interactStartY);
                    onDrag(e); // Instantly catch up to current pointer
                    
                    paletteInteractState = null;
                    activePaletteBlock = null;
                } 
                // If moving side-to-side by at least 15 pixels, treat as scroll
                else if (Math.abs(dx) > 15) {
                    paletteInteractState = 'scrolling';
                }
            } else if (paletteInteractState === 'scrolling') {
                const dx = e.clientX - interactStartX;
                palette.scrollLeft = paletteScrollStart - dx;
            }
        });
        
        const endInteraction = (e) => {
            if (activePaletteBlock === block) {
                try {
                    block.releasePointerCapture(e.pointerId);
                } catch(err) {}
                paletteInteractState = null;
                activePaletteBlock = null;
            }
        };
        
        block.addEventListener('pointerup', endInteraction);
        block.addEventListener('pointercancel', endInteraction);
    });

    // Handle grabbing blocks already on the canvas
    canvas.addEventListener('pointerdown', (e) => {
        const block = e.target.closest('.block');
        if (block && !block.classList.contains('palette-block')) {
            e.preventDefault();
            startDrag(block, e.clientX, e.clientY);
        }
    });

    function startDrag(block, clientX, clientY) {
        activeBlock = block;
        activeBlock.classList.add('dragging');
        
        // Calculate offset between pointer and block top-left
        const rect = activeBlock.getBoundingClientRect();
        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;
        
        // Bring to front
        const highestZIndex = Array.from(canvas.children).reduce((max, el) => {
            if (el === activeBlock) return max;
            return Math.max(max, parseInt(getComputedStyle(el).zIndex) || 1);
        }, 1);
        activeBlock.style.zIndex = highestZIndex + 1;

        // Capture pointer events on the window to ensure we don't lose drag if moving fast
        window.addEventListener('pointermove', onDrag);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
    }

    function onDrag(e) {
        if (!activeBlock) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate new position relative to canvas
        let newX = e.clientX - canvasRect.left - dragOffsetX;
        let newY = e.clientY - canvasRect.top - dragOffsetY;
        
        activeBlock.style.left = `${newX}px`;
        activeBlock.style.top = `${newY}px`;
    }

    function endDrag(e) {
        if (!activeBlock) return;
        
        window.removeEventListener('pointermove', onDrag);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);

        // Check if dropped outside canvas or over palette
        const palette = document.getElementById('palette');
        const paletteRect = palette.getBoundingClientRect();
        
        // If the center of the block is over the palette, delete it
        const rect = activeBlock.getBoundingClientRect();
        const blockCenterY = rect.top + rect.height / 2;
        
        if (blockCenterY > paletteRect.top) {
            // Dropped on palette, delete the block
            activeBlock.remove();
            activeBlock = null;
            return;
        }

        // Remove dragging class to re-enable CSS transitions
        activeBlock.classList.remove('dragging');
        
        // Snap to grid
        const currentX = parseFloat(activeBlock.style.left);
        const currentY = parseFloat(activeBlock.style.top);
        
        let snappedX = Math.round(currentX / gridSize) * gridSize;
        let snappedY = Math.round(currentY / gridSize) * gridSize;
        
        activeBlock.style.left = `${snappedX}px`;
        activeBlock.style.top = `${snappedY}px`;
        
        activeBlock = null;
    }

    // Fullscreen logic
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const fullscreenIcon = document.getElementById('fullscreen-icon');
    const exitFullscreenIcon = document.getElementById('exit-fullscreen-icon');

    fullscreenBtn.addEventListener('click', () => {
        const docEl = document.documentElement;
        
        const requestFullscreen = docEl.requestFullscreen || 
                                  docEl.webkitRequestFullscreen || 
                                  docEl.mozRequestFullScreen || 
                                  docEl.msRequestFullscreen;

        const exitFullscreen = document.exitFullscreen || 
                               document.webkitExitFullscreen || 
                               document.mozCancelFullScreen || 
                               document.msExitFullscreen;
                               
        const isFullscreen = document.fullscreenElement || 
                             document.webkitFullscreenElement || 
                             document.mozFullScreenElement || 
                             document.msFullscreenElement;

        if (!isFullscreen) {
            if (requestFullscreen) {
                requestFullscreen.call(docEl).catch(err => {
                    console.warn(`Error attempting to enable fullscreen: ${err?.message}`);
                });
            }
        } else {
            if (exitFullscreen) {
                exitFullscreen.call(document);
            }
        }
    });

    const handleFullscreenChange = () => {
        const isFullscreen = document.fullscreenElement || 
                             document.webkitFullscreenElement || 
                             document.mozFullScreenElement || 
                             document.msFullscreenElement;
                             
        if (isFullscreen) {
            fullscreenIcon.style.display = 'none';
            exitFullscreenIcon.style.display = 'block';
        } else {
            fullscreenIcon.style.display = 'block';
            exitFullscreenIcon.style.display = 'none';
        }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Clear Canvas logic
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your castle?')) {
            const canvasBlocks = canvas.querySelectorAll('.block');
            canvasBlocks.forEach(block => block.remove());
        }
    });
});
